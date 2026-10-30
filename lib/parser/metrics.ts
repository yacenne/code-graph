import type { Edge, FileNode } from './types';

/**
 * Deduplicates edges by source, target, and kind.
 * Pure function.
 */
export function deduplicateEdges(edges: Edge[]): Edge[] {
  const seen = new Set<string>();
  const uniqueEdges: Edge[] = [];

  for (const edge of edges) {
    const key = `${edge.source}-->${edge.target}::${edge.kind}`;
    if (!seen.has(key)) {
      seen.add(key);
      uniqueEdges.push(edge);
    }
  }

  return uniqueEdges;
}

/**
 * Computes fan-in and fan-out for each file node.
 * Fan-in: number of distinct files importing this file.
 * Fan-out: number of distinct files this file imports.
 *
 * Graph calculations are pure functions over a file list and an edge list.
 */
export function computeFanMetrics(
  files: readonly FileNode[],
  edges: readonly Edge[]
): FileNode[] {
  // Use Sets of distinct connected file paths to guarantee unique count
  const incomingMap = new Map<string, Set<string>>();
  const outgoingMap = new Map<string, Set<string>>();

  for (const file of files) {
    incomingMap.set(file.path, new Set());
    outgoingMap.set(file.path, new Set());
  }

  for (const edge of edges) {
    // Only count internal edges where both files exist
    const outgoing = outgoingMap.get(edge.source);
    if (outgoing) {
      outgoing.add(edge.target);
    }

    const incoming = incomingMap.get(edge.target);
    if (incoming) {
      incoming.add(edge.source);
    }
  }

  return files.map((file) => {
    const fanIn = incomingMap.get(file.path)?.size ?? 0;
    const fanOut = outgoingMap.get(file.path)?.size ?? 0;

    return {
      ...file,
      fanIn,
      fanOut,
    };
  });
}

/**
 * Extracts a sorted list of unique folders from the file list.
 * Pure function.
 */
export function extractDistinctFolders(files: readonly FileNode[]): string[] {
  const folders = new Set<string>();
  for (const file of files) {
    folders.add(file.folder);
  }
  return Array.from(folders).sort();
}
