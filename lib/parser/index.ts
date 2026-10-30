import * as path from 'node:path';
import type {
  CoverageReport,
  Edge,
  ImportCoverage,
  ParserOptions,
  ParserResult,
  ReExportCoverage,
  UnresolvedImport,
} from './types';
import { fallbackAdapter } from './adapter';
import { walkRepository } from './walker';
import { extractRepositoryImports } from './extractor';
import { ModuleResolver } from './resolver';
import {
  computeFanMetrics,
  deduplicateEdges,
  extractDistinctFolders,
} from './metrics';

export * from './types';
export * from './adapter';
export * from './walker';
export * from './extractor';
export * from './resolver';
export * from './metrics';

/**
 * Parses a repository on disk into files, edges, and comprehensive coverage.
 *
 * Standalone: imports no web framework, UI library, or database client.
 * Runs against any directory on disk with nothing else started.
 */
export async function parseRepository(
  repoPath: string,
  options?: ParserOptions
): Promise<ParserResult> {
  const absoluteRoot = path.resolve(repoPath);
  const adapter = options?.adapter ?? fallbackAdapter;

  // Adapter can optionally inspect or validate repository
  if (adapter.matches) {
    const isMatched = await adapter.matches(absoluteRoot);
    if (!isMatched) {
      // Still proceeds with fallback behavior
    }
  }

  // 1. Walk repository structurally
  const { totalFound, parsedNodes, fileContents, skippedFiles } =
    walkRepository(absoluteRoot);

  const parsedFilePathsSet = new Set(parsedNodes.map((n) => n.path));

  // 2. Extract AST imports, re-exports, and dynamic imports
  const rawImports = extractRepositoryImports(fileContents);

  // 3. Resolve imports
  const resolver = new ModuleResolver(absoluteRoot);

  const rawEdges: Edge[] = [];
  const unresolvedImports: UnresolvedImport[] = [];
  const externalPackagesSet = new Set<string>();

  let internalCount = 0;
  let externalCount = 0;
  let excludedCount = 0;
  let unresolvedCount = 0;

  let reExportsFound = 0;
  let reExportsResolved = 0;
  let reExportsUnresolved = 0;
  const reExportGaps: ReExportCoverage['gaps'] = [];

  for (const raw of rawImports) {
    if (raw.kind === 're-export') {
      reExportsFound++;
    }

    const resolved = resolver.resolve(
      raw.sourceFile,
      raw.specifier,
      raw.kind,
      raw.line
    );

    switch (resolved.status) {
      case 'internal': {
        if (resolved.targetFile && parsedFilePathsSet.has(resolved.targetFile)) {
          internalCount++;
          rawEdges.push({
            source: raw.sourceFile,
            target: resolved.targetFile,
            kind: raw.kind,
            specifier: raw.specifier,
          });
        } else {
          // Target was skipped from code modules (e.g. data JSON, declaration .d.ts, static asset)
          excludedCount++;
        }
        if (raw.kind === 're-export') {
          reExportsResolved++;
        }
        break;
      }
      case 'external': {
        externalCount++;
        if (resolved.externalPackage) {
          externalPackagesSet.add(resolved.externalPackage);
        }
        if (raw.kind === 're-export') {
          // A re-export of an external package resolved successfully
          reExportsResolved++;
        }
        break;
      }
      case 'excluded': {
        excludedCount++;
        if (raw.kind === 're-export') {
          reExportsResolved++;
        }
        break;
      }
      case 'unresolved': {
        unresolvedCount++;
        const reason = resolved.reason ?? 'Unknown resolution failure';
        unresolvedImports.push({
          sourceFile: raw.sourceFile,
          specifier: raw.specifier,
          kind: raw.kind,
          reason,
          line: raw.line,
        });
        if (raw.kind === 're-export') {
          reExportsUnresolved++;
          reExportGaps.push({
            sourceFile: raw.sourceFile,
            specifier: raw.specifier,
            reason,
            line: raw.line,
          });
        }
        break;
      }
    }
  }

  // 4. Deduplicate edges
  const edges = deduplicateEdges(rawEdges);

  // 5. Compute graph fan-in and fan-out pure metrics
  const filesWithMetrics = computeFanMetrics(parsedNodes, edges);

  // 6. Distinct folders
  const folders = extractDistinctFolders(filesWithMetrics);

  // 7. Aggregate skip reasons summary
  const skipReasonsSummary: Record<string, number> = {};
  for (const skipped of skippedFiles) {
    skipReasonsSummary[skipped.reason] =
      (skipReasonsSummary[skipped.reason] || 0) + 1;
  }

  // 8. Coverage report
  const importCoverage: ImportCoverage = {
    total: rawImports.length,
    internal: internalCount,
    external: externalCount,
    excluded: excludedCount,
    unresolved: unresolvedCount,
  };

  const reExportCoverage: ReExportCoverage = {
    found: reExportsFound,
    resolved: reExportsResolved,
    unresolved: reExportsUnresolved,
    gaps: reExportGaps,
  };

  const coverage: CoverageReport = {
    filesFound: totalFound,
    filesParsed: filesWithMetrics.length,
    filesSkipped: skippedFiles.length,
    skippedFiles,
    skipReasonsSummary,
    imports: importCoverage,
    reExports: reExportCoverage,
    unresolvedImports,
    externalPackages: Array.from(externalPackagesSet).sort(),
  };

  return {
    repoPath: absoluteRoot,
    files: filesWithMetrics,
    edges,
    coverage,
    folders,
  };
}
