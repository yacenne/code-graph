import * as fs from 'node:fs';
import * as path from 'node:path';
import { ts } from 'ts-morph';
import type { EdgeKind, ImportResolutionStatus } from './types';
import { toPosix } from './walker';

const ASSET_EXTENSIONS = new Set([
  '.css',
  '.scss',
  '.sass',
  '.less',
  '.svg',
  '.png',
  '.jpg',
  '.jpeg',
  '.gif',
  '.webp',
  '.ico',
  '.woff',
  '.woff2',
  '.ttf',
  '.eot',
  '.bmp',
]);

const NODE_BUILTINS = new Set([
  'assert',
  'async_hooks',
  'buffer',
  'child_process',
  'cluster',
  'console',
  'constants',
  'crypto',
  'dgram',
  'diagnostics_channel',
  'dns',
  'domain',
  'events',
  'fs',
  'fs/promises',
  'http',
  'http2',
  'https',
  'inspector',
  'module',
  'net',
  'os',
  'path',
  'path/posix',
  'path/win32',
  'perf_hooks',
  'process',
  'punycode',
  'querystring',
  'readline',
  'repl',
  'stream',
  'stream/promises',
  'stream/web',
  'string_decoder',
  'timers',
  'timers/promises',
  'tls',
  'trace_events',
  'tty',
  'url',
  'util',
  'util/types',
  'v8',
  'vm',
  'wasi',
  'worker_threads',
  'zlib',
]);

const RESOLUTION_EXTENSIONS = [
  '',
  '.ts',
  '.tsx',
  '.js',
  '.jsx',
  '.mjs',
  '.cjs',
  '.mts',
  '.cts',
];

const INDEX_EXTENSIONS = [
  '/index.ts',
  '/index.tsx',
  '/index.js',
  '/index.jsx',
  '/index.mjs',
  '/index.cjs',
  '/index.mts',
  '/index.cts',
];

export interface ResolvedImport {
  sourceFile: string;
  specifier: string;
  kind: EdgeKind;
  status: ImportResolutionStatus;
  targetFile?: string;
  externalPackage?: string;
  reason?: string;
  line?: number;
}

export interface PathMapping {
  pattern: string;
  prefix: string;
  suffix: string;
  hasWildcard: boolean;
  targets: string[];
}

export class ModuleResolver {
  private readonly repoRoot: string;
  private readonly baseUrl: string;
  private readonly pathMappings: PathMapping[] = [];

  constructor(repoRoot: string) {
    this.repoRoot = path.resolve(repoRoot);
    const { baseUrl, paths } = this.loadTsConfig();
    this.baseUrl = baseUrl;
    this.pathMappings = this.compilePathMappings(paths);
  }

  private loadTsConfig(): { baseUrl: string; paths: Record<string, string[]> } {
    const configCandidates = ['tsconfig.json', 'jsconfig.json'];
    for (const name of configCandidates) {
      const configPath = path.join(this.repoRoot, name);
      if (fs.existsSync(configPath)) {
        const readResult = ts.readConfigFile(configPath, ts.sys.readFile);
        if (!readResult.error && readResult.config) {
          const compilerOptions = readResult.config.compilerOptions || {};
          const baseUrlRel = compilerOptions.baseUrl || '.';
          const baseUrl = path.resolve(this.repoRoot, baseUrlRel);
          const paths = compilerOptions.paths || {};
          return { baseUrl, paths };
        }
      }
    }
    return { baseUrl: this.repoRoot, paths: {} };
  }

  private compilePathMappings(paths: Record<string, string[]>): PathMapping[] {
    const mappings: PathMapping[] = [];
    for (const [pattern, targets] of Object.entries(paths)) {
      const starIndex = pattern.indexOf('*');
      if (starIndex !== -1) {
        mappings.push({
          pattern,
          prefix: pattern.slice(0, starIndex),
          suffix: pattern.slice(starIndex + 1),
          hasWildcard: true,
          targets,
        });
      } else {
        mappings.push({
          pattern,
          prefix: pattern,
          suffix: '',
          hasWildcard: false,
          targets,
        });
      }
    }
    return mappings;
  }

  /**
   * Tries to find a concrete file on disk for a base candidate path.
   */
  private tryResolveFile(candidatePath: string): string | null {
    // 1. Direct file check if extension already present
    if (fs.existsSync(candidatePath)) {
      try {
        const stat = fs.statSync(candidatePath);
        if (stat.isFile()) {
          return candidatePath;
        }
      } catch {
        // Continue if stat fails
      }
    }

    // 2. Try adding code extensions
    for (const ext of RESOLUTION_EXTENSIONS) {
      if (ext === '') continue;
      const withExt = candidatePath + ext;
      if (fs.existsSync(withExt)) {
        try {
          if (fs.statSync(withExt).isFile()) {
            return withExt;
          }
        } catch {
          // Continue
        }
      }
    }

    // 3. Try directory index files
    for (const idx of INDEX_EXTENSIONS) {
      const withIndex = candidatePath + idx;
      if (fs.existsSync(withIndex)) {
        try {
          if (fs.statSync(withIndex).isFile()) {
            return withIndex;
          }
        } catch {
          // Continue
        }
      }
    }

    // 4. TS/ESM extension replacement (.js -> .ts/.tsx, .mjs -> .mts, etc.)
    const lower = candidatePath.toLowerCase();
    if (lower.endsWith('.js')) {
      const base = candidatePath.slice(0, -3);
      for (const rep of ['.ts', '.tsx', '.jsx']) {
        const repPath = base + rep;
        if (fs.existsSync(repPath) && fs.statSync(repPath).isFile()) {
          return repPath;
        }
      }
    } else if (lower.endsWith('.mjs')) {
      const repPath = candidatePath.slice(0, -4) + '.mts';
      if (fs.existsSync(repPath) && fs.statSync(repPath).isFile()) {
        return repPath;
      }
    } else if (lower.endsWith('.cjs')) {
      const repPath = candidatePath.slice(0, -4) + '.cts';
      if (fs.existsSync(repPath) && fs.statSync(repPath).isFile()) {
        return repPath;
      }
    }

    return null;
  }

  /**
   * Resolves a raw import specifier.
   */
  public resolve(
    sourceFile: string,
    specifier: string,
    kind: EdgeKind,
    line?: number
  ): ResolvedImport {
    // 1. Excluded: Asset or stylesheet
    const ext = path.extname(specifier).toLowerCase();
    if (ASSET_EXTENSIONS.has(ext)) {
      return {
        sourceFile,
        specifier,
        kind,
        status: 'excluded',
        reason: `Asset or stylesheet import (${ext})`,
        line,
      };
    }

    // 2. External: Node built-in
    if (specifier.startsWith('node:')) {
      return {
        sourceFile,
        specifier,
        kind,
        status: 'external',
        externalPackage: specifier,
        line,
      };
    }
    if (NODE_BUILTINS.has(specifier)) {
      return {
        sourceFile,
        specifier,
        kind,
        status: 'external',
        externalPackage: specifier,
        line,
      };
    }

    // 3. Relative import (starts with ./ or ../)
    if (specifier.startsWith('./') || specifier.startsWith('../')) {
      const sourceDir = path.dirname(path.resolve(this.repoRoot, sourceFile));
      const candidatePath = path.resolve(sourceDir, specifier);
      const resolved = this.tryResolveFile(candidatePath);

      if (resolved) {
        const rel = toPosix(path.relative(this.repoRoot, resolved));
        if (rel.startsWith('..')) {
          return {
            sourceFile,
            specifier,
            kind,
            status: 'external',
            reason: `Relative import points outside repository root: ${rel}`,
            line,
          };
        }
        return {
          sourceFile,
          specifier,
          kind,
          status: 'internal',
          targetFile: rel,
          line,
        };
      }

      return {
        sourceFile,
        specifier,
        kind,
        status: 'unresolved',
        reason: `File not found on disk for relative import "${specifier}" from "${sourceFile}"`,
        line,
      };
    }

    // 4. Path alias matching (tsconfig.json paths)
    let aliasMatchedPattern: string | null = null;
    let aliasAttemptedTarget: string | null = null;

    for (const mapping of this.pathMappings) {
      if (mapping.hasWildcard) {
        if (
          specifier.startsWith(mapping.prefix) &&
          specifier.endsWith(mapping.suffix)
        ) {
          aliasMatchedPattern = mapping.pattern;
          const wildcard = specifier.slice(
            mapping.prefix.length,
            specifier.length - mapping.suffix.length
          );

          for (const target of mapping.targets) {
            const candidateTarget = target.replace('*', wildcard);
            const candidateAbs = path.resolve(this.baseUrl, candidateTarget);
            aliasAttemptedTarget = candidateTarget;
            const resolved = this.tryResolveFile(candidateAbs);

            if (resolved) {
              const rel = toPosix(path.relative(this.repoRoot, resolved));
              if (!rel.startsWith('..')) {
                return {
                  sourceFile,
                  specifier,
                  kind,
                  status: 'internal',
                  targetFile: rel,
                  line,
                };
              }
            }
          }
        }
      } else {
        if (specifier === mapping.pattern) {
          aliasMatchedPattern = mapping.pattern;
          for (const target of mapping.targets) {
            const candidateAbs = path.resolve(this.baseUrl, target);
            aliasAttemptedTarget = target;
            const resolved = this.tryResolveFile(candidateAbs);

            if (resolved) {
              const rel = toPosix(path.relative(this.repoRoot, resolved));
              if (!rel.startsWith('..')) {
                return {
                  sourceFile,
                  specifier,
                  kind,
                  status: 'internal',
                  targetFile: rel,
                  line,
                };
              }
            }
          }
        }
      }
    }

    if (aliasMatchedPattern) {
      return {
        sourceFile,
        specifier,
        kind,
        status: 'unresolved',
        reason: `Alias "${specifier}" matched path pattern "${aliasMatchedPattern}" -> "${aliasAttemptedTarget}", but target file does not exist on disk`,
        line,
      };
    }

    // 5. Specifiers starting with alias-like symbols (@/ or ~/) with no mapping
    if (specifier.startsWith('@/') || specifier.startsWith('~/')) {
      return {
        sourceFile,
        specifier,
        kind,
        status: 'unresolved',
        reason: `Alias prefix in "${specifier}" has no matching path mapping in tsconfig.json`,
        line,
      };
    }

    // 6. External package specifiers (npm packages)
    const packageName = this.extractPackageName(specifier);
    return {
      sourceFile,
      specifier,
      kind,
      status: 'external',
      externalPackage: packageName,
      line,
    };
  }

  private extractPackageName(specifier: string): string {
    if (specifier.startsWith('@')) {
      const parts = specifier.split('/');
      return parts.length >= 2 ? `${parts[0]}/${parts[1]}` : specifier;
    }
    return specifier.split('/')[0];
  }
}
