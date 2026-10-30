import type { FileNode, ParserResult } from '@/lib/parser/types';
import type { FoldingResult, FoldedNodeData } from './folding';
import { classifyFileCategory, CATEGORY_TOKENS, type FileCategory } from './categories';

export interface FileKindInfo {
  categoryId: string;
  name: string;
  color: string;
  isConvention: boolean;
}

export interface ConnectedFileItem {
  path: string;
  fileName: string;
  file?: FileNode;
  kind: FileKindInfo;
  nodeId?: string;
  folder?: string;
}

export interface FileDetailData {
  file: FileNode;
  kind: FileKindInfo;
  nodeId: string;
  dependencies: ConnectedFileItem[];
  dependents: ConnectedFileItem[];
}

export interface FolderCategoryGroup {
  category: FileCategory;
  count: number;
  files: FileNode[];
}

export interface FolderDetailData {
  node: FoldedNodeData;
  groups: FolderCategoryGroup[];
}

export interface RepoSummaryData {
  name: string;
  framework: string;
  fileCount: number;
  importCount: number;
  routeCount: number;
  unidentifiedCount: number;
  mostDependedFiles: FileNode[];
  readingStartFiles: FileNode[];
}

/**
 * Identifies the kind of a file and whether it was matched by a recognized convention.
 * Pure function.
 */
export function identifyFileKind(filePath: string): FileKindInfo {
  const categoryId = classifyFileCategory(filePath);
  const token = CATEGORY_TOKENS[categoryId];
  const isConvention = categoryId !== 'core';

  return {
    categoryId,
    name: token?.name ?? (isConvention ? categoryId : 'Core Logic (No convention)'),
    color: token?.color ?? '#71717a',
    isConvention,
  };
}

/**
 * Detects framework from repository files and external package dependencies.
 * Follows principle: Absent beats approximate.
 */
export function detectFramework(
  files: readonly FileNode[],
  externalPackages: readonly string[] = []
): string {
  // Check explicit Next.js dependencies or standard app/pages directory layouts
  const hasNextPackage = externalPackages.some(
    (pkg) => pkg === 'next' || pkg.startsWith('@next/') || pkg.startsWith('@trpc/next')
  );
  const hasNextAppOrPages = files.some(
    (f) =>
      f.path.startsWith('app/') ||
      f.path.startsWith('pages/') ||
      f.path.includes('/app-dir/') ||
      f.path.endsWith('next.config.js') ||
      f.path.endsWith('next.config.mjs') ||
      f.path.endsWith('next.config.ts')
  );

  if (hasNextPackage || hasNextAppOrPages) {
    return 'Next.js';
  }

  // Check Remix
  if (
    externalPackages.some((pkg) => pkg.includes('remix')) ||
    files.some((f) => f.path.includes('remix.config'))
  ) {
    return 'Remix';
  }

  // Check Astro
  if (
    externalPackages.some((pkg) => pkg.includes('astro')) ||
    files.some((f) => f.path.includes('astro.config'))
  ) {
    return 'Astro';
  }

  // Check React without meta-framework
  if (externalPackages.some((pkg) => pkg === 'react' || pkg === 'react-dom')) {
    return 'React';
  }

  return 'None (Library)';
}

/**
 * Computes repository summary data for the detail pane's resting state.
 * Pure function over ParserResult.
 */
export function computeRepoSummary(
  data: ParserResult,
  repositoryName = 'Repository'
): RepoSummaryData {
  const fileCount = data.files.length;
  // Total import declarations recorded during AST extraction
  const importCount = data.coverage?.imports?.total ?? data.edges.length;

  // Approximate routes are refused per project rules: show 0 if not fully recoverable
  const routeCount = 0;

  // Count files where no architectural convention matched (classified into core)
  let unidentifiedCount = 0;
  for (const f of data.files) {
    if (!identifyFileKind(f.path).isConvention) {
      unidentifiedCount++;
    }
  }

  const framework = detectFramework(
    data.files,
    data.coverage?.externalPackages ?? []
  );

  // Ranked list 1: What the rest of the repository leans on most (fanIn > 0, highest first)
  const mostDependedFiles = data.files
    .filter((f) => f.fanIn > 0)
    .sort((a, b) => b.fanIn - a.fanIn || b.fanOut - a.fanOut || a.path.localeCompare(b.path));

  // Ranked list 2: Files nothing imports at all, where reading starts (fanIn === 0)
  const readingStartFiles = data.files
    .filter((f) => f.fanIn === 0)
    .sort((a, b) => b.fanOut - a.fanOut || a.path.localeCompare(b.path));

  return {
    name: repositoryName,
    framework,
    fileCount,
    importCount,
    routeCount,
    unidentifiedCount,
    mostDependedFiles,
    readingStartFiles,
  };
}

/**
 * Derives detailed connectivity and metadata for a selected file.
 * Guaranteed: dependencies.length === file.fanOut, dependents.length === file.fanIn.
 * Pure function.
 */
export function computeFileDetail(
  filePath: string,
  data: ParserResult,
  folding: FoldingResult
): FileDetailData | null {
  const file = data.files.find((f) => f.path === filePath);
  if (!file) {
    return null;
  }

  const fileMap = new Map<string, FileNode>();
  for (const f of data.files) {
    fileMap.set(f.path, f);
  }

  // Dependencies: files this file imports (outgoing edges)
  const dependencyTargetPaths = Array.from(
    new Set(
      data.edges
        .filter((e) => e.source === filePath)
        .map((e) => e.target)
    )
  ).sort();

  const dependencies: ConnectedFileItem[] = dependencyTargetPaths.map((targetPath) => {
    const targetFile = fileMap.get(targetPath);
    const kind = identifyFileKind(targetPath);
    const nodeId = folding.fileToNodeId.get(targetPath);
    const fileName = targetPath.includes('/')
      ? targetPath.slice(targetPath.lastIndexOf('/') + 1)
      : targetPath;

    return {
      path: targetPath,
      fileName,
      file: targetFile,
      kind,
      nodeId,
      folder: targetFile?.folder,
    };
  });

  // Dependents: files that import this file (incoming edges)
  const dependentSourcePaths = Array.from(
    new Set(
      data.edges
        .filter((e) => e.target === filePath)
        .map((e) => e.source)
    )
  ).sort();

  const dependents: ConnectedFileItem[] = dependentSourcePaths.map((sourcePath) => {
    const sourceFile = fileMap.get(sourcePath);
    const kind = identifyFileKind(sourcePath);
    const nodeId = folding.fileToNodeId.get(sourcePath);
    const fileName = sourcePath.includes('/')
      ? sourcePath.slice(sourcePath.lastIndexOf('/') + 1)
      : sourcePath;

    return {
      path: sourcePath,
      fileName,
      file: sourceFile,
      kind,
      nodeId,
      folder: sourceFile?.folder,
    };
  });

  return {
    file,
    kind: identifyFileKind(file.path),
    nodeId: folding.fileToNodeId.get(filePath) ?? '',
    dependencies,
    dependents,
  };
}

/**
 * Derives category breakdown and file list for a selected folder node.
 * Pure function.
 */
export function computeFolderDetail(
  nodeId: string,
  folding: FoldingResult
): FolderDetailData | null {
  const node = folding.nodeMap.get(nodeId);
  if (!node) {
    return null;
  }

  const categoryGroupsMap = new Map<string, FileNode[]>();
  for (const f of node.files) {
    const catId = classifyFileCategory(f.path);
    const existing = categoryGroupsMap.get(catId);
    if (existing) {
      existing.push(f);
    } else {
      categoryGroupsMap.set(catId, [f]);
    }
  }

  const standardOrder = ['components', 'adapters', 'core', 'types', 'tests'];
  const groups: FolderCategoryGroup[] = [];

  for (const catId of standardOrder) {
    const files = categoryGroupsMap.get(catId);
    if (files && files.length > 0) {
      const token = CATEGORY_TOKENS[catId];
      groups.push({
        category: {
          id: catId,
          name: token?.name ?? catId,
          color: token?.color ?? '#71717a',
          count: files.length,
        },
        count: files.length,
        files: files.sort((a, b) => a.path.localeCompare(b.path)),
      });
    }
  }

  // Any remaining categories
  for (const [catId, files] of categoryGroupsMap.entries()) {
    if (!standardOrder.includes(catId) && files.length > 0) {
      groups.push({
        category: {
          id: catId,
          name: catId,
          color: '#71717a',
          count: files.length,
        },
        count: files.length,
        files: files.sort((a, b) => a.path.localeCompare(b.path)),
      });
    }
  }

  return {
    node,
    groups,
  };
}
