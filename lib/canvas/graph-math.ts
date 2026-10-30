import type { FileNode, Edge, ParserResult } from '@/lib/parser/types';

export type WalkDirection = 'dependencies' | 'blastRadius';

export interface TransitiveWalkItem {
  path: string;
  depth: number;
}

/**
 * Pure function performing a transitive BFS walk over the edge list.
 *
 * - 'dependencies' (downstream): files this file needs (outgoing edges).
 *   depth 1 = directly imported by startPath
 *   depth 2 = imported by depth 1 files
 *
 * - 'blastRadius' (upstream): files that break if this file changes (incoming edges).
 *   depth 1 = files that directly import startPath
 *   depth 2 = files that import depth 1 files
 *
 * Both directions are the exact same iterative walk with a direction argument and depth limit.
 * Guaranteed: iterative BFS with visited set avoids infinite loops and call stack issues.
 */
export function transitiveWalk(
  edges: readonly Edge[],
  startPath: string,
  direction: WalkDirection,
  maxDepth = 2
): TransitiveWalkItem[] {
  // Build directed adjacency map based on requested direction
  const adjacency = new Map<string, string[]>();

  for (const edge of edges) {
    // In edges: source imports target
    // For dependencies: move along source -> target
    // For blastRadius: move along target -> source
    const from = direction === 'dependencies' ? edge.source : edge.target;
    const to = direction === 'dependencies' ? edge.target : edge.source;

    let neighbors = adjacency.get(from);
    if (!neighbors) {
      neighbors = [];
      adjacency.set(from, neighbors);
    }
    neighbors.push(to);
  }

  const results: TransitiveWalkItem[] = [];
  const visited = new Set<string>([startPath]);
  const queue: Array<{ path: string; depth: number }> = [{ path: startPath, depth: 0 }];

  while (queue.length > 0) {
    const current = queue.shift()!;
    if (current.depth >= maxDepth) {
      continue;
    }

    const nextDepth = current.depth + 1;
    const neighbors = adjacency.get(current.path) ?? [];

    for (const neighbor of neighbors) {
      if (!visited.has(neighbor)) {
        visited.add(neighbor);
        results.push({ path: neighbor, depth: nextDepth });
        queue.push({ path: neighbor, depth: nextDepth });
      }
    }
  }

  // Sort by depth ascending, then alphabetically by path for deterministic presentation
  return results.sort((a, b) => a.depth - b.depth || a.path.localeCompare(b.path));
}

/**
 * Checks whether a file path corresponds to a framework-reached entry point or configuration file.
 *
 * "A file nothing imports is not automatically an orphan. Pages, routes, layouts,
 * middleware and config are reached by the framework, and the import graph was never
 * going to show that. Reporting them as unused would be the parser describing the limits
 * of its own view as a finding about the code."
 */
export function isFrameworkReachable(filePath: string): boolean {
  const normalized = filePath.replace(/\\/g, '/').toLowerCase();
  const segments = normalized.split('/');
  const fileName = segments[segments.length - 1];
  const baseName = fileName.replace(/\.[^.]+$/, '');

  // 1. Pages and routes (Next.js App Router, Remix, SvelteKit, Astro)
  if (baseName === 'page' || baseName === 'route') {
    return true;
  }

  // 2. Layouts and templates
  if (baseName === 'layout' || baseName === 'template') {
    return true;
  }

  // 3. Framework routing special files
  if (['error', 'global-error', 'loading', 'not-found', 'default'].includes(baseName)) {
    return true;
  }

  // 4. Pages router directory convention (pages/* or src/pages/*)
  if (segments.includes('pages')) {
    return true;
  }

  // 5. Middleware, proxy, and instrumentation entrypoints
  if (['middleware', 'proxy', 'instrumentation'].includes(baseName)) {
    return true;
  }

  // 6. Configuration files (*.config.* or standard root configs)
  if (fileName.includes('.config.')) {
    return true;
  }
  if (
    fileName.startsWith('next.config') ||
    fileName.startsWith('vite.config') ||
    fileName.startsWith('tailwind.config') ||
    fileName.startsWith('postcss.config') ||
    fileName.startsWith('eslint.config') ||
    fileName.startsWith('prettier.config') ||
    fileName.startsWith('tsconfig') ||
    fileName.startsWith('jest.config') ||
    fileName.startsWith('vitest.config') ||
    fileName.startsWith('webpack.config') ||
    fileName.startsWith('rollup.config') ||
    fileName.startsWith('babel.config')
  ) {
    return true;
  }

  return false;
}

/**
 * Helper to canonicalize a cycle path so identical cycles rotated differently deduplicate cleanly.
 * e.g. [A, B, C, A] is rotated so the lexicographically smallest element appears first.
 */
function getCanonicalCycleKey(cycle: string[]): string {
  // Omit the trailing duplicate element which closes the cycle
  const nodes = cycle.slice(0, cycle.length - 1);
  if (nodes.length === 0) return '';

  let minIndex = 0;
  for (let i = 1; i < nodes.length; i++) {
    if (nodes[i].localeCompare(nodes[minIndex]) < 0) {
      minIndex = i;
    }
  }

  const rotated: string[] = [];
  for (let i = 0; i < nodes.length; i++) {
    rotated.push(nodes[(minIndex + i) % nodes.length]);
  }

  return rotated.join(' -> ');
}

/**
 * Detects import cycles iteratively using an explicit frame stack.
 *
 * "Cycle detection is iterative, not recursive. A real repository will blow a call stack."
 *
 * Guaranteed: Zero recursion, pure iterative DFS with explicit stack and canonical cycle deduplication.
 */
export function detectImportCyclesIterative(
  files: readonly FileNode[],
  edges: readonly Edge[]
): string[][] {
  const filePaths = new Set(files.map((f) => f.path));

  // Build adjacency list for internal files only
  const adjacency = new Map<string, string[]>();
  for (const edge of edges) {
    if (filePaths.has(edge.source) && filePaths.has(edge.target)) {
      let neighbors = adjacency.get(edge.source);
      if (!neighbors) {
        neighbors = [];
        adjacency.set(edge.source, neighbors);
      }
      neighbors.push(edge.target);
    }
  }

  const foundCycles: string[][] = [];
  const seenCycleKeys = new Set<string>();
  const visited = new Set<string>();
  const inPathIndex = new Map<string, number>();

  interface Frame {
    node: string;
    neighborIdx: number;
  }

  for (const file of files) {
    if (visited.has(file.path)) {
      continue;
    }

    const currentPath: string[] = [file.path];
    inPathIndex.set(file.path, 0);

    const stack: Frame[] = [{ node: file.path, neighborIdx: 0 }];

    while (stack.length > 0) {
      const top = stack[stack.length - 1];
      const neighbors = adjacency.get(top.node) ?? [];

      if (top.neighborIdx < neighbors.length) {
        const nextNeighbor = neighbors[top.neighborIdx];
        top.neighborIdx++;

        if (inPathIndex.has(nextNeighbor)) {
          // Cycle detected!
          const cycleStart = inPathIndex.get(nextNeighbor)!;
          const cycle = currentPath.slice(cycleStart);
          cycle.push(nextNeighbor);

          const canonicalKey = getCanonicalCycleKey(cycle);
          if (canonicalKey && !seenCycleKeys.has(canonicalKey)) {
            seenCycleKeys.add(canonicalKey);
            foundCycles.push(cycle);
          }
        } else if (!visited.has(nextNeighbor)) {
          visited.add(nextNeighbor);
          inPathIndex.set(nextNeighbor, currentPath.length);
          currentPath.push(nextNeighbor);
          stack.push({ node: nextNeighbor, neighborIdx: 0 });
        }
      } else {
        visited.add(top.node);
        inPathIndex.delete(top.node);
        currentPath.pop();
        stack.pop();
      }
    }
  }

  // Sort cycles by length, then by canonical key
  return foundCycles.sort((a, b) => a.length - b.length || a[0].localeCompare(b[0]));
}

export type InsightKind = 'unimported' | 'high-fan-in' | 'cycle' | 'oversized';

export const INSIGHT_SENTENCES = {
  unimported: 'Nothing in this repository imports this file.',
  'high-fan-in': 'An unusually high number of files in the repository depend on this file.',
  cycle: 'This file is involved in an import dependency cycle.',
  oversized: 'This file contains an unusually high number of lines.',
} as const;

export interface FileInsightItem {
  path: string;
  lines: number;
  fanIn: number;
  fanOut: number;
  detail?: string;
}

export interface CycleInsightItem {
  cycle: string[];
  key: string;
}

export interface InsightSection {
  kind: InsightKind;
  title: string;
  sentence: string;
  count: number;
  fileItems?: FileInsightItem[];
  cycleItems?: CycleInsightItem[];
}

export interface RepositoryInsights {
  totalFacts: number;
  sections: InsightSection[];
}

/**
 * Computes the four kinds of architectural insights over the edge and file lists.
 *
 * Four kinds, all facts about the edge list:
 * 1. files nothing imports (excluding framework-reachable entry points and config)
 * 2. files an unusual number of things import (statistical outliers)
 * 3. import cycles (iterative detection)
 * 4. files that are simply too long (lines >= 500)
 *
 * Constraint: "Files-nothing-imports leads the list. That one is explanatory for the person
 * this is built for. Cycles and oversized read closer to a verdict, so they go underneath."
 * Each insight's sentence is strictly one of four fixed strings.
 * Pure function with zero network requests or model calls.
 */
export function computeRepositoryInsights(data: ParserResult): RepositoryInsights {
  const { files, edges } = data;

  // -------------------------------------------------------------
  // Kind 1: Files nothing imports (fanIn === 0, NOT framework reachable)
  // Leads the list per spec constraint
  // -------------------------------------------------------------
  const unimportedFiles = files
    .filter((f) => f.fanIn === 0 && !isFrameworkReachable(f.path))
    .sort((a, b) => b.fanOut - a.fanOut || a.path.localeCompare(b.path))
    .map((f) => ({
      path: f.path,
      lines: f.lines,
      fanIn: f.fanIn,
      fanOut: f.fanOut,
      detail: `${f.fanOut} outgoing imports`,
    }));

  // -------------------------------------------------------------
  // Kind 2: Files an unusual number of things import
  // Statistical outlier threshold: mean + 2*stdDev (with floor of 10)
  // -------------------------------------------------------------
  const fanIns = files.map((f) => f.fanIn);
  const meanFanIn = fanIns.length > 0 ? fanIns.reduce((a, b) => a + b, 0) / fanIns.length : 0;
  const variance =
    fanIns.length > 0
      ? fanIns.reduce((a, b) => a + Math.pow(b - meanFanIn, 2), 0) / fanIns.length
      : 0;
  const stdDevFanIn = Math.sqrt(variance);
  const unusualThreshold = Math.max(10, Math.round(meanFanIn + 2 * stdDevFanIn));

  const highFanInFiles = files
    .filter((f) => f.fanIn >= unusualThreshold)
    .sort((a, b) => b.fanIn - a.fanIn || a.path.localeCompare(b.path))
    .map((f) => ({
      path: f.path,
      lines: f.lines,
      fanIn: f.fanIn,
      fanOut: f.fanOut,
      detail: `${f.fanIn} incoming dependents (threshold: ≥${unusualThreshold})`,
    }));

  // -------------------------------------------------------------
  // Kind 3: Import cycles (iterative detection)
  // -------------------------------------------------------------
  const detectedCycles = detectImportCyclesIterative(files, edges);
  const cycleItems: CycleInsightItem[] = detectedCycles.map((c) => ({
    cycle: c,
    key: c.join(' -> '),
  }));

  // -------------------------------------------------------------
  // Kind 4: Files that are simply too long (lines >= 500)
  // -------------------------------------------------------------
  const oversizedThreshold = 500;
  const oversizedFiles = files
    .filter((f) => f.lines >= oversizedThreshold)
    .sort((a, b) => b.lines - a.lines || a.path.localeCompare(b.path))
    .map((f) => ({
      path: f.path,
      lines: f.lines,
      fanIn: f.fanIn,
      fanOut: f.fanOut,
      detail: `${f.lines} lines (threshold: ≥${oversizedThreshold})`,
    }));

  // Exact required order:
  // 1. Files nothing imports (leads the list)
  // 2. Files an unusual number of things import
  // 3. Import cycles
  // 4. Files that are simply too long
  const sections: InsightSection[] = [
    {
      kind: 'unimported',
      title: 'Files nothing imports',
      sentence: INSIGHT_SENTENCES.unimported,
      count: unimportedFiles.length,
      fileItems: unimportedFiles,
    },
    {
      kind: 'high-fan-in',
      title: 'Files an unusual number of things import',
      sentence: INSIGHT_SENTENCES['high-fan-in'],
      count: highFanInFiles.length,
      fileItems: highFanInFiles,
    },
    {
      kind: 'cycle',
      title: 'Import cycles',
      sentence: INSIGHT_SENTENCES.cycle,
      count: cycleItems.length,
      cycleItems,
    },
    {
      kind: 'oversized',
      title: 'Files that are simply too long',
      sentence: INSIGHT_SENTENCES.oversized,
      count: oversizedFiles.length,
      fileItems: oversizedFiles,
    },
  ];

  const totalFacts =
    unimportedFiles.length + highFanInFiles.length + cycleItems.length + oversizedFiles.length;

  return {
    totalFacts,
    sections,
  };
}

