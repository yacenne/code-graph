"use client";

import React, { useState, useMemo, useCallback } from "react";
import { Header } from "./header";
import { CanvasView } from "@/components/canvas/canvas-view";
import { DetailPane } from "./detail-pane";
import type { ParserResult } from "@/lib/parser/types";
import type { FileCategory } from "@/lib/canvas/categories";
import { foldRepository } from "@/lib/canvas/folding";
import type { SelectionState, HoverTarget } from "@/lib/canvas/layout";

interface CanvasShellProps {
  data: ParserResult;
  categories: FileCategory[];
  repositoryName?: string;
}

export function CanvasShell({
  data,
  categories,
  repositoryName = "trpc/packages",
}: CanvasShellProps) {
  const totalFiles = data.files.length;
  const totalEdges = data.edges.length;

  // 1. Pure folding computed once over files and edges
  const folding = useMemo(() => {
    return foldRepository(data.files, data.edges, 24);
  }, [data.files, data.edges]);

  // 2. Interaction state lifted for synchronization across canvas and detail pane
  const [openNodeIds, setOpenNodeIds] = useState<Set<string>>(new Set());
  const [selection, setSelection] = useState<SelectionState | null>(null);
  const [hoveredTarget, setHoveredTarget] = useState<HoverTarget | null>(null);
  const [activeTab, setActiveTab] = useState<"structure" | "explanation">("structure");
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);

  const handleCategoryClick = useCallback((categoryId: string) => {
    setSelectedCategoryId((prev) => (prev === categoryId ? null : categoryId));
  }, []);

  // Clicking a file path in the detail pane selects it and opens its containing panel if needed
  const handleSelectFile = useCallback(
    (filePath: string) => {
      const nodeId = folding.fileToNodeId.get(filePath);
      if (nodeId) {
        setOpenNodeIds((prev) => {
          if (!prev.has(nodeId)) {
            const next = new Set(prev);
            next.add(nodeId);
            return next;
          }
          return prev;
        });
      }
      setSelection({
        type: "file",
        path: filePath,
        nodeId,
      });
    },
    [folding.fileToNodeId]
  );

  const handleSelectNode = useCallback((nodeId: string) => {
    setSelection((prev) => {
      if (prev?.type === "node" && prev.id === nodeId) {
        return null;
      }
      return { type: "node", id: nodeId };
    });
  }, []);

  const handleDeselect = useCallback(() => {
    setSelection(null);
  }, []);

  const handleHoverTargetChange = useCallback((target: HoverTarget | null) => {
    setHoveredTarget(target);
  }, []);

  const handleTabChange = useCallback((tab: "structure" | "explanation") => {
    setActiveTab(tab);
  }, []);

  return (
    <div className="flex h-screen w-screen flex-col bg-background text-foreground overflow-hidden font-sans select-none">
      {/* Shell Header */}
      <Header
        repositoryName={repositoryName}
        isScaffoldPreview={true}
      />

      {/* Main Three-Column Workspace */}
      <div className="flex flex-1 overflow-hidden">
        {/* Column 1: Left Rail (File Categories) */}
        <aside
          aria-label="File categories"
          className="w-56 border-r border-surface-border bg-surface flex flex-col shrink-0"
        >
          {/* Header */}
          <div className="flex h-8 items-center justify-between border-b border-surface-border px-3 text-[11px] font-mono uppercase tracking-wider text-muted-text">
            <span>Categories</span>
            {selectedCategoryId ? (
              <button
                type="button"
                onClick={() => setSelectedCategoryId(null)}
                className="text-[10px] text-accent hover:underline lowercase cursor-pointer"
                title="Reset category filter"
              >
                reset
              </button>
            ) : (
              <span className="text-[10px] tabular-nums">
                {categories.length}
              </span>
            )}
          </div>

          {/* Categories List */}
          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {categories.map((category) => {
              const isCategorySelected = selectedCategoryId === category.id;
              const isOtherCategorySelected = selectedCategoryId !== null && !isCategorySelected;

              return (
                <button
                  type="button"
                  key={category.id}
                  onClick={() => handleCategoryClick(category.id)}
                  className={`w-full flex items-center justify-between px-2 py-1.5 rounded text-xs font-mono transition-all cursor-pointer text-left border ${
                    isCategorySelected
                      ? "bg-accent/15 border-accent text-foreground font-semibold shadow-xs"
                      : isOtherCategorySelected
                      ? "border-transparent opacity-40 hover:opacity-100 hover:bg-surface-subtle text-muted-text"
                      : "border-transparent text-foreground hover:bg-surface-subtle hover:border-surface-border"
                  }`}
                  title={`${category.name}: ${category.count} files (Click to dim other categories)`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span
                      className="h-2.5 w-2.5 rounded-xs shrink-0"
                      style={{ backgroundColor: category.color }}
                      aria-hidden="true"
                    />
                    <span className="truncate text-[12px]">{category.name}</span>
                  </div>
                  <span className="text-[11px] text-muted-text tabular-nums ml-2">
                    {category.count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Left Rail Summary Footer */}
          <div className="border-t border-surface-border p-2 bg-surface-subtle font-mono text-[11px] text-muted-text flex items-center justify-between">
            <span>Total Parsed</span>
            <span className="font-semibold text-foreground tabular-nums">
              {totalFiles} files
            </span>
          </div>
        </aside>

        {/* Column 2: Center Map Canvas */}
        <main
          aria-label="Map canvas"
          className="flex-1 relative bg-background overflow-hidden flex flex-col"
        >
          {/* Canvas Subheader / Status Bar */}
          <div className="flex h-8 items-center justify-between border-b border-surface-border px-3 text-[11px] font-mono uppercase tracking-wider text-muted-text bg-surface/40">
            <div className="flex items-center gap-2">
              <span>Canvas</span>
              <span className="text-surface-border">/</span>
              <span className="text-foreground lowercase font-semibold">
                {repositoryName}
              </span>
            </div>
            <div className="flex items-center gap-3 text-[10px] tabular-nums">
              <span>{totalFiles} files</span>
              <span className="text-surface-border">•</span>
              <span>{totalEdges} edges</span>
              <span className="text-surface-border">•</span>
              <span>{data.folders.length} folders</span>
            </div>
          </div>

          {/* Canvas Viewport */}
          <div className="flex-1 relative overflow-hidden">
            <CanvasView
              data={data}
              folding={folding}
              selection={selection}
              onSelectionChange={setSelection}
              openNodeIds={openNodeIds}
              onOpenNodeIdsChange={setOpenNodeIds}
              hoveredTarget={hoveredTarget}
              onHoverTargetChange={handleHoverTargetChange}
              selectedCategoryId={selectedCategoryId}
              onSelectFile={handleSelectFile}
              onSelectNode={handleSelectNode}
            />
          </div>
        </main>

        {/* Column 3: Right Detail Pane */}
        <DetailPane
          data={data}
          folding={folding}
          repositoryName={repositoryName}
          selection={selection}
          onSelectFile={handleSelectFile}
          onSelectNode={handleSelectNode}
          onDeselect={handleDeselect}
          hoveredTarget={hoveredTarget}
          onHoverTargetChange={handleHoverTargetChange}
          activeTab={activeTab}
          onTabChange={handleTabChange}
        />
      </div>
    </div>
  );
}
