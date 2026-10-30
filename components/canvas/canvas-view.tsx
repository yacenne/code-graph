"use client";

import React, { useState, useMemo, useCallback, useRef, useEffect } from "react";
import {
  ReactFlow,
  ReactFlowProvider,
  Background,
  BackgroundVariant,
  useReactFlow,
  type NodeTypes,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";

import type { ParserResult } from "@/lib/parser/types";
import { foldRepository, type FoldingResult } from "@/lib/canvas/folding";
import {
  computeGraphLayout,
  type CanvasNode,
  type SelectionState,
  type HoverTarget,
} from "@/lib/canvas/layout";
import { FoldedNode } from "./folded-node";
import { OpenPanelNode } from "./open-panel-node";

const nodeTypes: NodeTypes = {
  folded: FoldedNode,
  openPanel: OpenPanelNode,
};

export interface CanvasViewProps {
  data: ParserResult;
  folding?: FoldingResult;
  selection?: SelectionState | null;
  onSelectionChange?: (selection: SelectionState | null) => void;
  openNodeIds?: Set<string>;
  onOpenNodeIdsChange?: React.Dispatch<React.SetStateAction<Set<string>>>;
  hoveredTarget?: HoverTarget | null;
  onHoverTargetChange?: (target: HoverTarget | null) => void;
}

function CanvasViewInner({
  data,
  folding: propFolding,
  selection: propSelection,
  onSelectionChange,
  openNodeIds: propOpenNodeIds,
  onOpenNodeIdsChange,
  hoveredTarget,
  onHoverTargetChange,
}: CanvasViewProps) {
  const { getViewport, setViewport, fitView } = useReactFlow();

  // 1. Compute pure folding over data files and edges if not provided
  const internalFolding = useMemo(() => {
    return foldRepository(data.files, data.edges, 24);
  }, [data.files, data.edges]);

  const folding = propFolding ?? internalFolding;

  // 2. Interaction state: open nodes and selected item (controlled or fallback local)
  const [localOpenNodeIds, setLocalOpenNodeIds] = useState<Set<string>>(new Set());
  const [localSelection, setLocalSelection] = useState<SelectionState | null>(null);

  const openNodeIds = propOpenNodeIds ?? localOpenNodeIds;
  const setOpenNodeIds = onOpenNodeIdsChange ?? setLocalOpenNodeIds;

  const selection = propSelection !== undefined ? propSelection : localSelection;
  const setSelection = onSelectionChange ?? setLocalSelection;

  // Track newly opened node to trigger zoom-out-only refit
  const lastOpenedNodeIdRef = useRef<string | null>(null);

  // 3. Compute deterministic layout and node/edge models
  const { nodes: rawNodes, edges: rawEdges } = useMemo(() => {
    return computeGraphLayout(folding, openNodeIds, selection, hoveredTarget);
  }, [folding, openNodeIds, selection, hoveredTarget]);

  // Refit constraint: "Opening a folder refits the view so the new panel is visible.
  // Refitting on open may only ever zoom out, never in."
  useEffect(() => {
    if (lastOpenedNodeIdRef.current) {
      lastOpenedNodeIdRef.current = null;

      // Small delay to ensure DOM and dimensions have painted
      const timer = setTimeout(() => {
        const { zoom: currentZoom } = getViewport();

        // Fit view with maxZoom clamped strictly to currentZoom (ZOOM OUT ONLY, NEVER IN)
        fitView({
          duration: 250,
          padding: 0.18,
          maxZoom: currentZoom,
        });
      }, 50);

      return () => clearTimeout(timer);
    }
  }, [openNodeIds, fitView, getViewport]);

  // Initial fit on mount or whenever repository folding changes
  const lastFittedKeyRef = useRef<string | null>(null);
  useEffect(() => {
    const key = `${folding.nodes.length}-${rawNodes.length}`;
    if (rawNodes.length > 0 && lastFittedKeyRef.current !== key) {
      const timer = setTimeout(() => {
        lastFittedKeyRef.current = key;
        fitView({ padding: 0.15, duration: 200 });
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [folding.nodes.length, rawNodes.length, fitView]);

  // Handlers
  const handleToggleOpen = useCallback((nodeId: string) => {
    setOpenNodeIds((prev) => {
      const next = new Set(prev);
      if (next.has(nodeId)) {
        next.delete(nodeId);
      } else {
        next.add(nodeId);
        lastOpenedNodeIdRef.current = nodeId;
      }
      return next;
    });
  }, [setOpenNodeIds]);

  const handleClose = useCallback((nodeId: string) => {
    setOpenNodeIds((prev) => {
      const next = new Set(prev);
      next.delete(nodeId);
      return next;
    });
  }, [setOpenNodeIds]);

  const handleSelectNode = useCallback(
    (nodeId: string) => {
      if (selection?.type === "node" && selection.id === nodeId) {
        setSelection(null);
      } else {
        setSelection({ type: "node", id: nodeId });
      }
    },
    [selection, setSelection]
  );

  const handleSelectFile = useCallback(
    (filePath: string, nodeId: string) => {
      if (selection?.type === "file" && selection.path === filePath) {
        setSelection(null);
      } else {
        setSelection({ type: "file", path: filePath, nodeId });
      }
    },
    [selection, setSelection]
  );

  const handlePaneClick = useCallback(() => {
    setSelection(null);
  }, [setSelection]);

  const handleHoverNode = useCallback((nodeId: string | null) => {
    onHoverTargetChange?.(nodeId ? { type: "node", id: nodeId } : null);
  }, [onHoverTargetChange]);

  const handleHoverFile = useCallback((filePath: string | null, nodeId?: string) => {
    onHoverTargetChange?.(filePath ? { type: "file", path: filePath, nodeId } : null);
  }, [onHoverTargetChange]);

  // Attach callbacks into node data
  const nodesWithCallbacks: CanvasNode[] = useMemo(() => {
    return rawNodes.map((n) => {
      if (n.type === "openPanel") {
        return {
          ...n,
          data: {
            ...n.data,
            onClose: handleClose,
            onSelectNode: handleSelectNode,
            onSelectFile: handleSelectFile,
            onHoverNode: handleHoverNode,
            onHoverFile: handleHoverFile,
          },
        };
      }
      return {
        ...n,
        data: {
          ...n.data,
          onToggleOpen: handleToggleOpen,
          onSelectNode: handleSelectNode,
          onHoverNode: handleHoverNode,
        },
      };
    });
  }, [rawNodes, handleClose, handleSelectNode, handleSelectFile, handleToggleOpen, handleHoverNode, handleHoverFile]);

  // Manual zoom controls
  const handleZoomIn = () => {
    const { x, y, zoom } = getViewport();
    setViewport({ x, y, zoom: Math.min(2.5, zoom * 1.25) }, { duration: 150 });
  };

  const handleZoomOut = () => {
    const { x, y, zoom } = getViewport();
    setViewport({ x, y, zoom: Math.max(0.1, zoom / 1.25) }, { duration: 150 });
  };

  const handleResetFit = () => {
    fitView({ padding: 0.12, duration: 250 });
  };

  return (
    <div className="relative w-full h-full flex-1 overflow-hidden bg-background">
      <ReactFlow
        nodes={nodesWithCallbacks}
        edges={rawEdges}
        nodeTypes={nodeTypes}
        onPaneClick={handlePaneClick}
        fitView
        fitViewOptions={{ padding: 0.15 }}
        onInit={(instance) => {
          instance.fitView({ padding: 0.15 });
        }}
        minZoom={0.02}
        maxZoom={2.5}
        defaultEdgeOptions={{
          type: "smoothstep",
        }}
        proOptions={{ hideAttribution: true }}
      >
        <Background
          variant={BackgroundVariant.Dots}
          gap={24}
          size={1}
          className="opacity-30 dark:opacity-20"
        />
      </ReactFlow>

      {/* Floating Canvas Toolbar Controls (Bottom-Right, Dense Tool Style) */}
      <div className="absolute bottom-3 right-3 z-20 flex items-center gap-1 rounded border border-surface-border bg-surface/90 px-1.5 py-1 backdrop-blur-xs font-mono text-xs shadow-sm">
        <button
          type="button"
          onClick={handleZoomIn}
          className="h-6 w-6 rounded border border-surface-border bg-surface-subtle text-foreground hover:bg-surface flex items-center justify-center font-bold"
          title="Zoom In"
          aria-label="Zoom In"
        >
          +
        </button>
        <button
          type="button"
          onClick={handleZoomOut}
          className="h-6 w-6 rounded border border-surface-border bg-surface-subtle text-foreground hover:bg-surface flex items-center justify-center font-bold"
          title="Zoom Out"
          aria-label="Zoom Out"
        >
          −
        </button>
        <button
          type="button"
          onClick={handleResetFit}
          className="h-6 px-2 rounded border border-surface-border bg-surface-subtle text-foreground hover:bg-surface flex items-center justify-center text-[10px]"
          title="Fit entire map to canvas"
          aria-label="Fit View"
        >
          Fit
        </button>
      </div>

      {/* Status Bar / Legend (Bottom-Left) */}
      <div className="absolute bottom-3 left-3 z-20 flex items-center gap-3 rounded border border-surface-border bg-surface/90 px-2.5 py-1 backdrop-blur-xs font-mono text-[10px] text-muted-text shadow-sm pointer-events-none">
        <div className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-emerald-500" />
          <span>incoming (in)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-amber-500" />
          <span>outgoing (out)</span>
        </div>
        <div className="border-l border-surface-border pl-2 text-foreground font-semibold">
          {openNodeIds.size > 0
            ? `${openNodeIds.size} open`
            : "all folded"}
        </div>
      </div>
    </div>
  );
}

export function CanvasView(props: CanvasViewProps) {
  return (
    <ReactFlowProvider>
      <CanvasViewInner {...props} />
    </ReactFlowProvider>
  );
}
