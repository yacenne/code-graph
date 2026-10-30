import type { FileNode, Edge } from '@/lib/parser/types';

export interface FoldedNodeData {
  id: string;
  dir: string;
  label: string;
  files: FileNode[];
  fileCount: number;
  fanIn: number;
  fanOut: number;
  width: number;
  height: number;
}

export interface FoldedEdgeData {
  id: string;
  source: string;
  target: string;
  sourceFile: string;
  targetFile: string;
  count?: number;
}

export interface FoldingResult {
  threshold: number;
  nodes: FoldedNodeData[];
  edges: FoldedEdgeData[];
  nodeMap: Map<string, FoldedNodeData>;
  fileToNodeId: Map<string, string>;
  folderToNodeId: Map<string, string>;
  acceptanceCheck: {
    nodeCount: number;
    minFilesPerNode: number;
    allNodesMoreThanOneFile: boolean;
    edgesChecked: number;
    terminatedEdgesCount: number;
    allEdgesTerminate: boolean;
  };
}

/**
 * Computes shortest unique labels for a set of POSIX directory paths.
 * "Labels are the shortest thing that is still unique among what's on screen."
 */
export function computeShortestUniqueLabels(paths: string[]): Map<string, string> {
  const result = new Map<string, string>();

  for (const p of paths) {
    if (p === '.') {
      result.set(p, 'root');
      continue;
    }

    const segments = p.split('/');
    let uniqueLabel = p;

    for (let len = 1; len <= segments.length; len++) {
      const candidate = segments.slice(segments.length - len).join('/');
      const matches = paths.filter((other) => {
        if (other === '.') return false;
        return (
          other === candidate ||
          other.endsWith('/' + candidate)
        );
      });

      if (matches.length === 1) {
        uniqueLabel = candidate;
        break;
      }
    }

    result.set(p, uniqueLabel);
  }

  return result;
}

/**
 * Pure folding calculation over a repository's file list and edge list.
 * 
 * Rules:
 * - Every directory starts as its own node.
 * - Deepest directory upward: directories holding fewer than `threshold` files merge into parent.
 * - Deepest-first: each pass is computed fresh, so no merge at one depth changes what another merge at that depth sees.
 * - Lowest threshold landing under roughly two dozen (<= 24).
 * - Height carries fan-in; width comes from the label.
 */
export function foldRepository(
  files: FileNode[],
  edges: Edge[],
  targetMaxNodes: number = 24
): FoldingResult {
  // 1. Group direct files by folder
  const dirFiles = new Map<string, FileNode[]>();
  for (const f of files) {
    if (!dirFiles.has(f.folder)) dirFiles.set(f.folder, []);
    dirFiles.get(f.folder)!.push(f);
  }

  // Ensure all intermediate ancestor directories exist
  const allDirs = new Set<string>(dirFiles.keys());
  for (const d of Array.from(allDirs)) {
    let cur = d;
    while (cur && cur !== '.') {
      const parent = cur.includes('/') ? cur.slice(0, cur.lastIndexOf('/')) : '.';
      allDirs.add(parent);
      if (!dirFiles.has(parent)) dirFiles.set(parent, []);
      cur = parent;
    }
  }

  const getDepth = (dir: string): number => (dir === '.' ? 0 : dir.split('/').length);
  const dirsByDepth = Array.from(allDirs).sort((a, b) => getDepth(b) - getDepth(a));
  const maxDepth = dirsByDepth.length > 0 ? getDepth(dirsByDepth[0]) : 0;

  // Function to execute a single fresh pass at a given threshold
  function runFreshPass(threshold: number) {
    const currentFiles = new Map<string, FileNode[]>();
    const folderToMerged = new Map<string, string>();

    for (const [d, flist] of dirFiles.entries()) {
      currentFiles.set(d, [...flist]);
      folderToMerged.set(d, d);
    }

    for (let depth = maxDepth; depth >= 1; depth--) {
      const dirsAtDepth = Array.from(allDirs).filter((d) => getDepth(d) === depth);
      const toMerge: string[] = [];

      // Evaluate all directories at this depth using state at start of depth
      for (const d of dirsAtDepth) {
        const flist = currentFiles.get(d) || [];
        if (flist.length < threshold) {
          toMerge.push(d);
        }
      }

      // Merge into parents
      for (const d of toMerge) {
        const parent = d.includes('/') ? d.slice(0, d.lastIndexOf('/')) : '.';
        const flist = currentFiles.get(d) || [];
        const parentFiles = currentFiles.get(parent) || [];
        parentFiles.push(...flist);
        currentFiles.set(parent, parentFiles);
        currentFiles.delete(d);
        folderToMerged.set(d, parent);
      }
    }

    // Resolve transitive merges
    for (const [d, target] of folderToMerged.entries()) {
      let cur = target;
      while (
        folderToMerged.has(cur) &&
        folderToMerged.get(cur) !== cur &&
        !currentFiles.has(cur)
      ) {
        cur = folderToMerged.get(cur)!;
      }
      folderToMerged.set(d, cur);
    }

    const survivingDirs: string[] = [];
    for (const [dir, flist] of currentFiles.entries()) {
      if (flist.length > 0) {
        survivingDirs.push(dir);
      }
    }

    return { survivingDirs, currentFiles, folderToMerged };
  }

  // 2. Find the lowest threshold landing under roughly two dozen
  let threshold = 2;
  let passResult = runFreshPass(threshold);

  while (passResult.survivingDirs.length > targetMaxNodes && threshold < 100) {
    threshold++;
    passResult = runFreshPass(threshold);
  }

  const { survivingDirs, currentFiles, folderToMerged } = passResult;

  // 3. Labels: shortest unique among what's on screen
  const labelMap = computeShortestUniqueLabels(survivingDirs);

  // 4. Map file paths to node IDs
  const fileToNodeId = new Map<string, string>();
  for (const dir of survivingDirs) {
    const dirFilesList = currentFiles.get(dir) || [];
    for (const f of dirFilesList) {
      fileToNodeId.set(f.path, dir);
    }
  }

  // 5. Compute fan-in and fan-out per folded node
  const nodeFanIn = new Map<string, number>();
  const nodeFanOut = new Map<string, number>();

  for (const dir of survivingDirs) {
    nodeFanIn.set(dir, 0);
    nodeFanOut.set(dir, 0);
  }

  let edgesChecked = 0;
  let terminatedEdgesCount = 0;
  const rawFoldedEdges: FoldedEdgeData[] = [];
  const edgeDedupe = new Set<string>();

  for (const edge of edges) {
    edgesChecked++;

    // Resolve source and target folder to surviving node
    const sFolder = edge.source.includes('/')
      ? edge.source.slice(0, edge.source.lastIndexOf('/'))
      : '.';
    const tFolder = edge.target.includes('/')
      ? edge.target.slice(0, edge.target.lastIndexOf('/'))
      : '.';

    const sNode = fileToNodeId.get(edge.source) ?? folderToMerged.get(sFolder);
    const tNode = fileToNodeId.get(edge.target) ?? folderToMerged.get(tFolder);

    if (sNode && tNode && currentFiles.has(sNode) && currentFiles.has(tNode)) {
      terminatedEdgesCount++;

      if (sNode !== tNode) {
        nodeFanOut.set(sNode, (nodeFanOut.get(sNode) || 0) + 1);
        nodeFanIn.set(tNode, (nodeFanIn.get(tNode) || 0) + 1);

        const edgeKey = `${sNode}->${tNode}:${edge.source}->${edge.target}`;
        if (!edgeDedupe.has(edgeKey)) {
          edgeDedupe.add(edgeKey);
          rawFoldedEdges.push({
            id: `edge_${sNode}_to_${tNode}_${rawFoldedEdges.length}`,
            source: sNode,
            target: tNode,
            sourceFile: edge.source,
            targetFile: edge.target,
          });
        }
      }
    }
  }

  // 6. Assemble FoldedNodeData
  // "A node's height carries how many things depend on it. Width comes from the label, so a long name doesn't read as an important file."
  const nodes: FoldedNodeData[] = survivingDirs.map((dir) => {
    const dirFilesList = currentFiles.get(dir) || [];
    const label = labelMap.get(dir) || dir;
    const fanIn = nodeFanIn.get(dir) || 0;
    const fanOut = nodeFanOut.get(dir) || 0;

    // Height carries fanIn: base 44px + proportional fanIn scaling (clamped)
    const baseHeight = 44;
    const height = Math.min(140, Math.round(baseHeight + Math.min(96, Math.log2(fanIn + 1) * 16)));

    // Width comes strictly from the label string length
    const width = Math.max(140, Math.round(label.length * 8.5) + 48);

    return {
      id: dir,
      dir,
      label,
      files: dirFilesList,
      fileCount: dirFilesList.length,
      fanIn,
      fanOut,
      width,
      height,
    };
  });

  const nodeMap = new Map<string, FoldedNodeData>();
  for (const n of nodes) {
    nodeMap.set(n.id, n);
  }

  const minFiles = Math.min(...nodes.map((n) => n.fileCount));

  return {
    threshold,
    nodes,
    edges: rawFoldedEdges,
    nodeMap,
    fileToNodeId,
    folderToNodeId: folderToMerged,
    acceptanceCheck: {
      nodeCount: nodes.length,
      minFilesPerNode: minFiles,
      allNodesMoreThanOneFile: minFiles > 1,
      edgesChecked,
      terminatedEdgesCount,
      allEdgesTerminate: edgesChecked === terminatedEdgesCount,
    },
  };
}
