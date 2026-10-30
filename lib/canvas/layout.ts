import dagre from 'dagre';
import type { Node, Edge } from '@xyflow/react';
import type { FoldedNodeData, FoldingResult } from './folding';
import { classifyFileCategory } from './categories';

export const MAX_VISIBLE_ROWS = 10;
export const OPEN_PANEL_WIDTH = 290;
export const ROW_HEIGHT = 28;
export const PANEL_HEADER_HEIGHT = 44;
export const PANEL_FOOTER_HEIGHT = 28;

export type HoverTarget =
  | { type: 'node'; id: string }
  | { type: 'file'; path: string; nodeId?: string };

export interface FoldedNodePropsData {
  nodeData: FoldedNodeData;
  isOpen: boolean;
  isSelected: boolean;
  isDimmed: boolean;
  isHovered: boolean;
  categoryMatchCount?: number;
  selectedCategoryId?: string | null;
  onToggleOpen: (nodeId: string) => void;
  onSelectNode: (nodeId: string) => void;
  onHoverNode?: (nodeId: string | null) => void;
  [key: string]: unknown;
}

export interface OpenPanelPropsData {
  nodeData: FoldedNodeData;
  isOpen: boolean;
  isSelected: boolean;
  isDimmed: boolean;
  isHovered: boolean;
  selectedFilePath: string | null;
  hoveredFilePath: string | null;
  activeFilePaths: Set<string>;
  categoryMatchCount?: number;
  selectedCategoryId?: string | null;
  onClose: (nodeId: string) => void;
  onSelectNode: (nodeId: string) => void;
  onSelectFile: (filePath: string, nodeId: string) => void;
  onHoverNode?: (nodeId: string | null) => void;
  onHoverFile?: (filePath: string | null, nodeId?: string) => void;
  [key: string]: unknown;
}

export type FoldedNodeType = Node<FoldedNodePropsData, 'folded'>;
export type OpenPanelNodeType = Node<OpenPanelPropsData, 'openPanel'>;
export type CanvasNode = FoldedNodeType | OpenPanelNodeType;

export interface SelectionState {
  type: 'node' | 'file';
  id?: string;
  path?: string;
  nodeId?: string;
}

/**
 * Calculates deterministic layout coordinates using Dagre and constructs
 * React Flow nodes and edges with selection, hover, and dimming states applied.
 */
export function computeGraphLayout(
  folding: FoldingResult,
  openNodeIds: Set<string>,
  selection: SelectionState | null,
  hoveredTarget?: HoverTarget | null,
  selectedCategoryId?: string | null
): {
  nodes: CanvasNode[];
  edges: Edge[];
  nodeDimensions: Map<string, { width: number; height: number }>;
} {
  const g = new dagre.graphlib.Graph();
  g.setDefaultEdgeLabel(() => ({}));
  g.setGraph({
    rankdir: 'LR',
    nodesep: 48,
    ranksep: 90,
    marginx: 40,
    marginy: 40,
  });

  const nodeDimensions = new Map<string, { width: number; height: number }>();

  // Determine dimension for each node based on open/folded state
  for (const n of folding.nodes) {
    const isOpen = openNodeIds.has(n.id);
    let width = n.width;
    let height = n.height;

    if (isOpen) {
      width = OPEN_PANEL_WIDTH;
      const visibleRowCount = Math.min(MAX_VISIBLE_ROWS, n.files.length);
      const hasMore = n.files.length > MAX_VISIBLE_ROWS;
      height =
        PANEL_HEADER_HEIGHT +
        visibleRowCount * ROW_HEIGHT +
        (hasMore ? PANEL_FOOTER_HEIGHT : 0) +
        12;
    }

    nodeDimensions.set(n.id, { width, height });
    g.setNode(n.id, { width, height });
  }

  // Deduplicate and register edges in Dagre for layout
  const dagreEdges = new Set<string>();
  for (const edge of folding.edges) {
    const key = `${edge.source}->${edge.target}`;
    if (!dagreEdges.has(key)) {
      dagreEdges.add(key);
      g.setEdge(edge.source, edge.target);
    }
  }

  // Layout calculation
  dagre.layout(g);

  // Compute active highlight sets for selection and dimming
  const activeNodeIds = new Set<string>();
  const activeEdgeIds = new Set<string>();
  const activeFilePaths = new Set<string>();

  if (selection) {
    if (selection.type === 'node' && selection.id) {
      activeNodeIds.add(selection.id);

      for (const e of folding.edges) {
        if (e.source === selection.id || e.target === selection.id) {
          activeEdgeIds.add(e.id);
          activeNodeIds.add(e.source);
          activeNodeIds.add(e.target);
          activeFilePaths.add(e.sourceFile);
          activeFilePaths.add(e.targetFile);
        }
      }
    } else if (selection.type === 'file' && selection.path && selection.nodeId) {
      activeFilePaths.add(selection.path);
      activeNodeIds.add(selection.nodeId);

      for (const e of folding.edges) {
        if (e.sourceFile === selection.path || e.targetFile === selection.path) {
          activeEdgeIds.add(e.id);
          activeNodeIds.add(e.source);
          activeNodeIds.add(e.target);
          activeFilePaths.add(e.sourceFile);
          activeFilePaths.add(e.targetFile);
        }
      }
    }
  }

  const isAnySelected = selection !== null;

  // Construct React Flow Nodes
  const nodes: CanvasNode[] = folding.nodes.map((n) => {
    const dagrePos = g.node(n.id);
    const dims = nodeDimensions.get(n.id)!;
    const isOpen = openNodeIds.has(n.id);

    const isSelected =
      selection?.type === 'node'
        ? selection.id === n.id
        : selection?.type === 'file'
        ? selection.nodeId === n.id
        : false;

    const isHovered =
      hoveredTarget?.type === 'node'
        ? hoveredTarget.id === n.id
        : hoveredTarget?.type === 'file'
        ? hoveredTarget.nodeId === n.id || n.files.some((f) => f.path === hoveredTarget.path)
        : false;

    const categoryMatchCount = selectedCategoryId
      ? n.files.filter((f) => classifyFileCategory(f.path) === selectedCategoryId).length
      : undefined;

    let isDimmed = false;
    if (isAnySelected) {
      isDimmed = !activeNodeIds.has(n.id) && !isHovered;
    } else if (selectedCategoryId) {
      isDimmed = categoryMatchCount === 0 && !isHovered;
    }

    const position = {
      x: dagrePos.x - dims.width / 2,
      y: dagrePos.y - dims.height / 2,
    };

    if (isOpen) {
      return {
        id: n.id,
        type: 'openPanel',
        position,
        width: dims.width,
        height: dims.height,
        data: {
          nodeData: n,
          isOpen: true,
          isSelected,
          isDimmed,
          isHovered,
          categoryMatchCount,
          selectedCategoryId,
          selectedFilePath:
            selection?.type === 'file' && selection.nodeId === n.id
              ? selection.path ?? null
              : null,
          hoveredFilePath: hoveredTarget?.type === 'file' ? hoveredTarget.path : null,
          activeFilePaths,
          onClose: () => {},
          onSelectNode: () => {},
          onSelectFile: () => {},
        },
      };
    }

    return {
      id: n.id,
      type: 'folded',
      position,
      width: dims.width,
      height: dims.height,
      data: {
        nodeData: n,
        isOpen: false,
        isSelected,
        isDimmed,
        isHovered,
        categoryMatchCount,
        selectedCategoryId,
        onToggleOpen: () => {},
        onSelectNode: () => {},
      },
    };
  });

  // Construct React Flow Edges
  // When both endpoints are folded nodes, we group edges between the same two folders
  // into a single representative edge. When an endpoint is open, edges fan out to
  // specific file handles in the visible rows.
  const edges: Edge[] = [];
  const foldedPairsMap = new Map<string, typeof folding.edges>();

  for (const e of folding.edges) {
    const isSourceOpen = openNodeIds.has(e.source);
    const isTargetOpen = openNodeIds.has(e.target);

    if (!isSourceOpen && !isTargetOpen) {
      const pairKey = `${e.source}->${e.target}`;
      let list = foldedPairsMap.get(pairKey);
      if (!list) {
        list = [];
        foldedPairsMap.set(pairKey, list);
      }
      list.push(e);
    } else {
      // At least one endpoint is open: fan out to row-specific handles
      const sourceNode = folding.nodeMap.get(e.source);
      const targetNode = folding.nodeMap.get(e.target);

      const sourceVisibleFiles = sourceNode?.files.slice(0, MAX_VISIBLE_ROWS) ?? [];
      const targetVisibleFiles = targetNode?.files.slice(0, MAX_VISIBLE_ROWS) ?? [];

      const isSourceFileVisible = sourceVisibleFiles.some((f) => f.path === e.sourceFile);
      const isTargetFileVisible = targetVisibleFiles.some((f) => f.path === e.targetFile);

      const sourceHandle = isSourceOpen && isSourceFileVisible
        ? `handle_source_${e.sourceFile}`
        : undefined;

      const targetHandle = isTargetOpen && isTargetFileVisible
        ? `handle_target_${e.targetFile}`
        : undefined;

      const isEdgeActive = activeEdgeIds.has(e.id);

      let isEdgeHovered = false;
      if (hoveredTarget) {
        if (hoveredTarget.type === 'file') {
          if (e.sourceFile === hoveredTarget.path || e.targetFile === hoveredTarget.path) {
            isEdgeHovered = true;
          }
        } else if (hoveredTarget.type === 'node') {
          if (e.source === hoveredTarget.id || e.target === hoveredTarget.id) {
            isEdgeHovered = true;
          }
        }
      }

      let isEdgeMatchingCategory = true;
      if (selectedCategoryId) {
        isEdgeMatchingCategory =
          classifyFileCategory(e.sourceFile) === selectedCategoryId ||
          classifyFileCategory(e.targetFile) === selectedCategoryId;
      }

      let isDimmed = false;
      if (isAnySelected) {
        isDimmed = !isEdgeActive && !isEdgeHovered;
      } else if (selectedCategoryId) {
        isDimmed = !isEdgeMatchingCategory && !isEdgeHovered;
      }

      let strokeColor = '#52525b';
      let strokeWidth = 1.25;

      if (selection) {
        if (isEdgeActive) {
          if (
            (selection.type === 'node' && e.target === selection.id) ||
            (selection.type === 'file' && e.targetFile === selection.path)
          ) {
            strokeColor = '#16a34a'; // incoming (green)
            strokeWidth = 2;
          } else if (
            (selection.type === 'node' && e.source === selection.id) ||
            (selection.type === 'file' && e.sourceFile === selection.path)
          ) {
            strokeColor = '#d97706'; // outgoing (amber)
            strokeWidth = 2;
          }
        }
      }

      if (isEdgeHovered) {
        strokeWidth = 2.5;
        if (
          (hoveredTarget?.type === 'file' && e.targetFile === hoveredTarget.path) ||
          (hoveredTarget?.type === 'node' && e.target === hoveredTarget.id)
        ) {
          strokeColor = '#16a34a';
        } else if (
          (hoveredTarget?.type === 'file' && e.sourceFile === hoveredTarget.path) ||
          (hoveredTarget?.type === 'node' && e.source === hoveredTarget.id)
        ) {
          strokeColor = '#d97706';
        } else {
          strokeColor = '#0284c7';
        }
      }

      edges.push({
        id: e.id,
        source: e.source,
        target: e.target,
        sourceHandle,
        targetHandle,
        type: 'smoothstep',
        animated: false,
        style: {
          stroke: strokeColor,
          strokeWidth,
          opacity: isEdgeHovered ? 1 : isDimmed ? 0.12 : 0.85,
          zIndex: isEdgeHovered ? 10 : 0,
          transition: 'opacity 150ms ease, stroke 150ms ease',
        },
      });
    }
  }

  // Add the grouped folded-to-folded edges
  for (const [pairKey, edgeGroup] of foldedPairsMap.entries()) {
    const first = edgeGroup[0];
    const isEdgeActive = edgeGroup.some((e) => activeEdgeIds.has(e.id));

    let isEdgeHovered = false;
    if (hoveredTarget) {
      if (hoveredTarget.type === 'file') {
        isEdgeHovered = edgeGroup.some(
          (e) => e.sourceFile === hoveredTarget.path || e.targetFile === hoveredTarget.path
        );
      } else if (hoveredTarget.type === 'node') {
        isEdgeHovered = first.source === hoveredTarget.id || first.target === hoveredTarget.id;
      }
    }

    let isEdgeMatchingCategory = true;
    if (selectedCategoryId) {
      isEdgeMatchingCategory = edgeGroup.some(
        (e) =>
          classifyFileCategory(e.sourceFile) === selectedCategoryId ||
          classifyFileCategory(e.targetFile) === selectedCategoryId
      );
    }

    let isDimmed = false;
    if (isAnySelected) {
      isDimmed = !isEdgeActive && !isEdgeHovered;
    } else if (selectedCategoryId) {
      isDimmed = !isEdgeMatchingCategory && !isEdgeHovered;
    }

    let strokeColor = '#52525b';
    let strokeWidth = 1.25;

    if (selection) {
      if (isEdgeActive) {
        if (
          (selection.type === 'node' && first.target === selection.id) ||
          (selection.type === 'file' && edgeGroup.some((e) => e.targetFile === selection.path))
        ) {
          strokeColor = '#16a34a'; // incoming (green)
          strokeWidth = 2;
        } else if (
          (selection.type === 'node' && first.source === selection.id) ||
          (selection.type === 'file' && edgeGroup.some((e) => e.sourceFile === selection.path))
        ) {
          strokeColor = '#d97706'; // outgoing (amber)
          strokeWidth = 2;
        }
      }
    }

    if (isEdgeHovered) {
      strokeWidth = 2.5;
      if (
        (hoveredTarget?.type === 'file' && edgeGroup.some((e) => e.targetFile === hoveredTarget.path)) ||
        (hoveredTarget?.type === 'node' && first.target === hoveredTarget.id)
      ) {
        strokeColor = '#16a34a';
      } else if (
        (hoveredTarget?.type === 'file' && edgeGroup.some((e) => e.sourceFile === hoveredTarget.path)) ||
        (hoveredTarget?.type === 'node' && first.source === hoveredTarget.id)
      ) {
        strokeColor = '#d97706';
      } else {
        strokeColor = '#0284c7';
      }
    }

    edges.push({
      id: `edge_group_${pairKey}`,
      source: first.source,
      target: first.target,
      type: 'smoothstep',
      animated: false,
      style: {
        stroke: strokeColor,
        strokeWidth,
        opacity: isEdgeHovered ? 1 : isDimmed ? 0.12 : 0.85,
        zIndex: isEdgeHovered ? 10 : 0,
        transition: 'opacity 150ms ease, stroke 150ms ease',
      },
    });
  }

  return { nodes, edges, nodeDimensions };
}
