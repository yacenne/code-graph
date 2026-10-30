import * as fs from 'node:fs';
import * as path from 'node:path';
import * as crypto from 'node:crypto';
import type { FileNode, SkippedFile } from './types';

/** Directories excluded from the repository walk */
const IGNORED_DIRECTORIES = new Set([
  '.git',
  'node_modules',
  '.next',
  'dist',
  'build',
  'out',
  '.turbo',
  '.vscode',
  '.idea',
  'coverage',
  '.pnpm-store',
]);

/** Extensions treated as executable code modules */
const CODE_EXTENSIONS = new Set([
  '.ts',
  '.tsx',
  '.js',
  '.jsx',
  '.mjs',
  '.cjs',
  '.mts',
  '.cts',
]);

/**
 * Normalizes any filesystem path to POSIX forward slashes.
 */
export function toPosix(p: string): string {
  return p.replace(/\\/g, '/');
}

/**
 * Returns an explicit, human-readable skip reason for a non-module file.
 */
export function getSkipReason(fileName: string): string {
  const lowerName = fileName.toLowerCase();

  if (lowerName.endsWith('.d.ts') || lowerName.endsWith('.d.mts') || lowerName.endsWith('.d.cts')) {
    return 'TypeScript declaration file (.d.ts)';
  }

  const ext = path.extname(fileName).toLowerCase();

  switch (ext) {
    case '.md':
    case '.markdown':
    case '.mdx':
      return `Documentation file (${ext})`;
    case '.json':
    case '.jsonc':
      return `JSON data or configuration file (${ext})`;
    case '.css':
    case '.scss':
    case '.sass':
    case '.less':
      return `Stylesheet (${ext})`;
    case '.svg':
    case '.ico':
    case '.png':
    case '.jpg':
    case '.jpeg':
    case '.webp':
    case '.gif':
    case '.bmp':
    case '.woff':
    case '.woff2':
    case '.ttf':
    case '.eot':
      return `Static asset (${ext})`;
    case '.sql':
      return 'SQL database script (.sql)';
    case '.yaml':
    case '.yml':
      return `YAML configuration file (${ext})`;
    case '.tsbuildinfo':
      return 'TypeScript build cache (.tsbuildinfo)';
    case '.map':
      return 'Source map file (.map)';
    case '.lock':
      return 'Package manager lockfile (.lock)';
    default:
      break;
  }

  if (lowerName === 'pnpm-lock.yaml' || lowerName === 'package-lock.json' || lowerName === 'yarn.lock') {
    return 'Package manager lockfile';
  }
  if (lowerName.startsWith('.env') || lowerName.endsWith('.local')) {
    return 'Environment configuration file';
  }
  if (lowerName.includes('ignore')) {
    return 'VCS or linter ignore file';
  }

  return `Non-code file (${ext || 'no extension'})`;
}

export interface WalkResult {
  /** Total files encountered */
  totalFound: number;
  /** Files identified as source code modules to parse */
  parsedNodes: FileNode[];
  /** File contents mapped by relative path for AST parsing */
  fileContents: Map<string, string>;
  /** Files skipped with reasons */
  skippedFiles: SkippedFile[];
}

/**
 * Walks a repository directory on disk.
 *
 * Enforces structural file selection: whole repository directories are walked
 * (excluding build and dependency artifacts like node_modules and .git).
 * Never selects files by line count.
 */
export function walkRepository(repoPath: string): WalkResult {
  const absoluteRoot = path.resolve(repoPath);
  const parsedNodes: FileNode[] = [];
  const fileContents = new Map<string, string>();
  const skippedFiles: SkippedFile[] = [];

  function traverse(currentDir: string): void {
    const entries = fs.readdirSync(currentDir, { withFileTypes: true });

    for (const entry of entries) {
      const entryName = entry.name;
      const fullPath = path.join(currentDir, entryName);

      if (entry.isDirectory()) {
        if (IGNORED_DIRECTORIES.has(entryName)) {
          continue;
        }
        traverse(fullPath);
      } else if (entry.isFile()) {
        const relativePath = toPosix(path.relative(absoluteRoot, fullPath));
        const ext = path.extname(entryName).toLowerCase();
        const isDeclaration =
          entryName.endsWith('.d.ts') ||
          entryName.endsWith('.d.mts') ||
          entryName.endsWith('.d.cts');

        if (CODE_EXTENSIONS.has(ext) && !isDeclaration) {
          const content = fs.readFileSync(fullPath, 'utf-8');
          const lines = content.length === 0 ? 0 : content.split(/\r?\n/).length;
          const hash = crypto.createHash('sha256').update(content).digest('hex');
          const folder = toPosix(path.dirname(relativePath));

          parsedNodes.push({
            path: relativePath,
            folder: folder === '' ? '.' : folder,
            extension: ext,
            lines,
            hash,
            fanIn: 0,
            fanOut: 0,
          });

          fileContents.set(relativePath, content);
        } else {
          const reason = getSkipReason(entryName);
          skippedFiles.push({
            path: relativePath,
            reason,
          });
        }
      }
    }
  }

  traverse(absoluteRoot);

  return {
    totalFound: parsedNodes.length + skippedFiles.length,
    parsedNodes,
    fileContents,
    skippedFiles,
  };
}
