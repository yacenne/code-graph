"use client";

import React, { useMemo } from "react";
import type { ParserResult } from "@/lib/parser/types";
import type { FoldingResult } from "@/lib/canvas/folding";
import type { SelectionState, HoverTarget } from "@/lib/canvas/layout";
import {
  computeRepoSummary,
  computeFileDetail,
  computeFolderDetail,
  identifyFileKind,
} from "@/lib/canvas/detail";

export interface DetailPaneProps {
  data: ParserResult;
  folding: FoldingResult;
  repositoryName?: string;
  selection: SelectionState | null;
  onSelectFile: (filePath: string) => void;
  onSelectNode: (nodeId: string) => void;
  onDeselect: () => void;
  hoveredTarget?: HoverTarget | null;
  onHoverTargetChange?: (target: HoverTarget | null) => void;
  activeTab: "structure" | "explanation";
  onTabChange: (tab: "structure" | "explanation") => void;
}

export function DetailPane({
  data,
  folding,
  repositoryName = "trpc/packages",
  selection,
  onSelectFile,
  onSelectNode,
  onDeselect,
  hoveredTarget,
  onHoverTargetChange,
  activeTab,
  onTabChange,
}: DetailPaneProps) {
  // 1. Repository summary (resting state)
  const repoSummary = useMemo(() => {
    return computeRepoSummary(data, repositoryName);
  }, [data, repositoryName]);

  // 2. File detail when file is selected
  const fileDetail = useMemo(() => {
    if (selection?.type === "file" && selection.path) {
      return computeFileDetail(selection.path, data, folding);
    }
    return null;
  }, [selection, data, folding]);

  // 3. Folder detail when node (folder) is selected
  const folderDetail = useMemo(() => {
    if (selection?.type === "node" && selection.id) {
      return computeFolderDetail(selection.id, folding);
    }
    return null;
  }, [selection, folding]);

  // Helper to check whether a path or node is currently hovered
  const isFileHovered = (path: string) =>
    hoveredTarget?.type === "file" && hoveredTarget.path === path;

  const isNodeHovered = (id: string) =>
    hoveredTarget?.type === "node" && hoveredTarget.id === id;

  return (
    <aside
      aria-label="Detail inspector"
      className="w-80 border-l border-surface-border bg-surface flex flex-col shrink-0 overflow-hidden font-mono text-xs select-none"
    >
      {/* Pane Top Header & Tab Switcher */}
      <div className="border-b border-surface-border bg-surface-subtle shrink-0">
        <div className="flex h-8 items-center justify-between px-3 text-[11px] uppercase tracking-wider text-muted-text border-b border-surface-border/60">
          <div className="flex items-center gap-1.5 truncate">
            <span className="font-semibold text-foreground">
              {selection?.type === "file"
                ? "File Detail"
                : selection?.type === "node"
                ? "Folder Detail"
                : "Repository"}
            </span>
          </div>

          {selection ? (
            <button
              type="button"
              onClick={onDeselect}
              className="text-[10px] text-muted-text hover:text-foreground flex items-center gap-1 px-1.5 py-0.5 rounded border border-surface-border hover:bg-surface transition-colors cursor-pointer"
              title="Return to repository summary"
            >
              <span>✕</span>
              <span>Deselect</span>
            </button>
          ) : (
            <span className="text-[10px] text-muted-text/70 lowercase">
              summary
            </span>
          )}
        </div>

        {/* Tabs: Structure & Explanation */}
        {/* "Which tab is open survives changing the selection." */}
        <div className="flex h-8 border-b border-surface-border text-xs">
          <button
            type="button"
            onClick={() => onTabChange("structure")}
            className={`flex-1 flex items-center justify-center font-medium transition-colors cursor-pointer border-r border-surface-border ${
              activeTab === "structure"
                ? "bg-surface text-foreground font-semibold border-b-2 border-b-accent"
                : "bg-surface-subtle/50 text-muted-text hover:text-foreground hover:bg-surface-subtle"
            }`}
          >
            Structure
          </button>
          <button
            type="button"
            onClick={() => onTabChange("explanation")}
            className={`flex-1 flex items-center justify-center font-medium transition-colors cursor-pointer ${
              activeTab === "explanation"
                ? "bg-surface text-foreground font-semibold border-b-2 border-b-accent"
                : "bg-surface-subtle/50 text-muted-text hover:text-foreground hover:bg-surface-subtle"
            }`}
          >
            Explanation
          </button>
        </div>
      </div>

      {/* Pane Body Area */}
      <div className="flex-1 overflow-y-auto">
        {/* ========================================================= */}
        {/* TAB: EXPLANATION (Empty state until model call fills it)   */}
        {/* ========================================================= */}
        {activeTab === "explanation" && (
          <div className="p-4 space-y-4">
            {fileDetail ? (
              <div className="space-y-3">
                <div className="border border-surface-border rounded p-2.5 bg-surface-subtle/40 space-y-1">
                  <div className="text-[10px] uppercase text-muted-text">
                    Target File
                  </div>
                  <div className="font-semibold text-foreground text-[11px] break-all">
                    {fileDetail.file.path}
                  </div>
                  <div className="text-[10px] text-muted-text flex items-center gap-3 pt-1">
                    <span>{fileDetail.file.lines} lines</span>
                    <span>•</span>
                    <span className="text-emerald-500 font-medium">
                      ← {fileDetail.file.fanIn} in
                    </span>
                    <span>•</span>
                    <span className="text-amber-500 font-medium">
                      → {fileDetail.file.fanOut} out
                    </span>
                  </div>
                </div>

                <div className="rounded border border-dashed border-surface-border p-4 text-center space-y-2 bg-surface-subtle/20">
                  <div className="text-xs font-semibold text-foreground">
                    No explanation generated
                  </div>
                  <p className="text-[11px] text-muted-text leading-relaxed font-sans">
                    AI explanations will be generated from this file and its real
                    neighbours using model tracing. This feature will be
                    connected in a subsequent phase.
                  </p>
                </div>
              </div>
            ) : folderDetail ? (
              <div className="space-y-3">
                <div className="border border-surface-border rounded p-2.5 bg-surface-subtle/40 space-y-1">
                  <div className="text-[10px] uppercase text-muted-text">
                    Target Folder
                  </div>
                  <div className="font-semibold text-foreground text-[11px] truncate">
                    {folderDetail.node.dir}
                  </div>
                  <div className="text-[10px] text-muted-text">
                    {folderDetail.node.fileCount} files inside
                  </div>
                </div>

                <div className="rounded border border-dashed border-surface-border p-4 text-center space-y-2 bg-surface-subtle/20">
                  <div className="text-xs font-semibold text-foreground">
                    No explanation available
                  </div>
                  <p className="text-[11px] text-muted-text leading-relaxed font-sans">
                    Explanations are generated for individual files. Select a file
                    inside this folder to view its explanation.
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="border border-surface-border rounded p-2.5 bg-surface-subtle/40 space-y-1">
                  <div className="text-[10px] uppercase text-muted-text">
                    Repository
                  </div>
                  <div className="font-semibold text-foreground text-[11px]">
                    {repoSummary.name}
                  </div>
                </div>

                <div className="rounded border border-dashed border-surface-border p-4 text-center space-y-2 bg-surface-subtle/20">
                  <div className="text-xs font-semibold text-foreground">
                    No explanation generated
                  </div>
                  <p className="text-[11px] text-muted-text leading-relaxed font-sans">
                    Select any file on the map to inspect its structure and
                    generate an explanation.
                  </p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB: STRUCTURE                                            */}
        {/* ========================================================= */}
        {activeTab === "structure" && (
          <div>
            {/* ----------------------------------------------------- */}
            {/* 1. RESTING STATE: Nothing is selected                 */}
            {/* ----------------------------------------------------- */}
            {!selection && (
              <div className="divide-y divide-surface-border">
                {/* Repository Summary Block */}
                <div className="p-3 space-y-2.5 bg-surface">
                  <div className="space-y-1">
                    <div className="text-[10px] uppercase tracking-wider text-muted-text">
                      Repository
                    </div>
                    <div className="text-sm font-bold text-foreground truncate">
                      {repoSummary.name}
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-[11px] pt-1">
                    <span className="text-muted-text">Framework detected</span>
                    <span className="font-semibold text-foreground bg-surface-subtle px-1.5 py-0.5 rounded border border-surface-border">
                      {repoSummary.framework}
                    </span>
                  </div>

                  {/* Counts Grid */}
                  <div className="grid grid-cols-3 gap-2 pt-1 font-mono text-[11px]">
                    <div className="border border-surface-border rounded p-2 bg-surface-subtle/50 text-center">
                      <div className="text-[10px] uppercase text-muted-text">
                        Files
                      </div>
                      <div className="text-xs font-bold text-foreground tabular-nums mt-0.5">
                        {repoSummary.fileCount}
                      </div>
                    </div>
                    <div className="border border-surface-border rounded p-2 bg-surface-subtle/50 text-center">
                      <div className="text-[10px] uppercase text-muted-text">
                        Imports
                      </div>
                      <div className="text-xs font-bold text-foreground tabular-nums mt-0.5">
                        {repoSummary.importCount}
                      </div>
                    </div>
                    <div className="border border-surface-border rounded p-2 bg-surface-subtle/50 text-center">
                      <div className="text-[10px] uppercase text-muted-text">
                        Routes
                      </div>
                      <div className="text-xs font-bold text-foreground tabular-nums mt-0.5">
                        {repoSummary.routeCount}
                      </div>
                    </div>
                  </div>

                  {/* Files without convention count */}
                  <div className="text-[11px] text-muted-text flex items-center justify-between pt-1">
                    <span>Unidentified by convention</span>
                    <span className="font-semibold text-foreground tabular-nums">
                      {repoSummary.unidentifiedCount} files
                    </span>
                  </div>
                </div>

                {/* Ranked List 1: Most Depended On */}
                <div className="p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="text-[11px] font-semibold text-foreground uppercase tracking-wider">
                      Most Depended On
                    </div>
                    <span className="text-[10px] text-muted-text tabular-nums">
                      top {Math.min(10, repoSummary.mostDependedFiles.length)}
                    </span>
                  </div>
                  <div className="text-[10px] text-muted-text">
                    What the rest of the repo leans on most (by incoming imports):
                  </div>

                  <div className="space-y-1 pt-1">
                    {repoSummary.mostDependedFiles.slice(0, 10).map((file) => {
                      const kind = identifyFileKind(file.path);
                      const isHovered = isFileHovered(file.path);
                      const nodeId = folding.fileToNodeId.get(file.path);

                      return (
                        <div
                          key={file.path}
                          onClick={() => onSelectFile(file.path)}
                          onMouseEnter={() =>
                            onHoverTargetChange?.({
                              type: "file",
                              path: file.path,
                              nodeId,
                            })
                          }
                          onMouseLeave={() => onHoverTargetChange?.(null)}
                          className={`flex items-center justify-between px-2 py-1.5 rounded text-[11px] cursor-pointer transition-colors border ${
                            isHovered
                              ? "bg-accent/20 border-accent text-foreground"
                              : "border-transparent hover:bg-surface-subtle hover:border-surface-border text-foreground"
                          }`}
                          title={`${file.path}\n← ${file.fanIn} incoming imports\n(Click to select on map)`}
                        >
                          <div className="flex items-center gap-1.5 min-w-0 pr-1">
                            <span
                              className="h-2 w-2 rounded-xs shrink-0"
                              style={{ backgroundColor: kind.color }}
                              aria-hidden="true"
                            />
                            <span className="truncate">{file.path}</span>
                          </div>
                          <span className="text-[10px] text-emerald-500 font-semibold tabular-nums shrink-0 ml-1">
                            ← {file.fanIn}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Ranked List 2: Where Reading Starts */}
                <div className="p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="text-[11px] font-semibold text-foreground uppercase tracking-wider">
                      Where Reading Starts
                    </div>
                    <span className="text-[10px] text-muted-text tabular-nums">
                      top {Math.min(10, repoSummary.readingStartFiles.length)}
                    </span>
                  </div>
                  <div className="text-[10px] text-muted-text">
                    Files nothing imports at all (fan-in: 0):
                  </div>

                  <div className="space-y-1 pt-1">
                    {repoSummary.readingStartFiles.slice(0, 10).map((file) => {
                      const kind = identifyFileKind(file.path);
                      const isHovered = isFileHovered(file.path);
                      const nodeId = folding.fileToNodeId.get(file.path);

                      return (
                        <div
                          key={file.path}
                          onClick={() => onSelectFile(file.path)}
                          onMouseEnter={() =>
                            onHoverTargetChange?.({
                              type: "file",
                              path: file.path,
                              nodeId,
                            })
                          }
                          onMouseLeave={() => onHoverTargetChange?.(null)}
                          className={`flex items-center justify-between px-2 py-1.5 rounded text-[11px] cursor-pointer transition-colors border ${
                            isHovered
                              ? "bg-accent/20 border-accent text-foreground"
                              : "border-transparent hover:bg-surface-subtle hover:border-surface-border text-foreground"
                          }`}
                          title={`${file.path}\n→ ${file.fanOut} outgoing imports\n(Click to select on map)`}
                        >
                          <div className="flex items-center gap-1.5 min-w-0 pr-1">
                            <span
                              className="h-2 w-2 rounded-xs shrink-0"
                              style={{ backgroundColor: kind.color }}
                              aria-hidden="true"
                            />
                            <span className="truncate">{file.path}</span>
                          </div>
                          <span className="text-[10px] text-amber-500 font-semibold tabular-nums shrink-0 ml-1">
                            → {file.fanOut}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* ----------------------------------------------------- */}
            {/* 2. FILE SELECTED                                      */}
            {/* ----------------------------------------------------- */}
            {selection?.type === "file" && fileDetail && (
              <div className="divide-y divide-surface-border">
                {/* File Header & Attributes */}
                <div className="p-3 space-y-2.5 bg-surface">
                  <div className="space-y-1">
                    <div className="text-[10px] uppercase tracking-wider text-muted-text">
                      Selected File
                    </div>
                    <div className="text-xs font-bold text-foreground break-all leading-tight">
                      {fileDetail.file.path}
                    </div>
                  </div>

                  {/* Kind & Metrics */}
                  <div className="space-y-1.5 text-[11px] pt-1">
                    <div className="flex items-center justify-between">
                      <span className="text-muted-text">Kind</span>
                      <div className="flex items-center gap-1.5">
                        <span
                          className="h-2 w-2 rounded-xs shrink-0"
                          style={{ backgroundColor: fileDetail.kind.color }}
                          aria-hidden="true"
                        />
                        <span className="font-semibold text-foreground">
                          {fileDetail.kind.name}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-muted-text">Length</span>
                      <span className="font-semibold text-foreground tabular-nums">
                        {fileDetail.file.lines} lines
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-muted-text">Folder</span>
                      <button
                        type="button"
                        onClick={() => fileDetail.nodeId && onSelectNode(fileDetail.nodeId)}
                        className="text-foreground hover:text-accent truncate max-w-[170px] cursor-pointer text-left underline-offset-2 hover:underline"
                        title={`Folder: ${fileDetail.file.folder} (click to view folder)`}
                      >
                        {fileDetail.file.folder}
                      </button>
                    </div>
                  </div>

                  {/* Fan-in / Fan-out Summary */}
                  <div className="grid grid-cols-2 gap-2 pt-1 font-mono text-[11px]">
                    <div className="border border-surface-border rounded p-2 bg-surface-subtle/40 text-center">
                      <div className="text-[10px] uppercase text-muted-text">
                        Depended On By
                      </div>
                      <div className="text-xs font-bold text-emerald-500 tabular-nums mt-0.5">
                        ← {fileDetail.file.fanIn}
                      </div>
                    </div>
                    <div className="border border-surface-border rounded p-2 bg-surface-subtle/40 text-center">
                      <div className="text-[10px] uppercase text-muted-text">
                        Depends On
                      </div>
                      <div className="text-xs font-bold text-amber-500 tabular-nums mt-0.5">
                        → {fileDetail.file.fanOut}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Section: Depends On (Dependencies) */}
                {/* "how many things it depends on ... then the full list" */}
                {/* Acceptance check 3: "The import and dependent counts in the pane match the number of rows listed underneath them." */}
                <div className="p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="text-[11px] font-semibold text-foreground uppercase tracking-wider flex items-center gap-1.5">
                      <span className="text-amber-500">→</span>
                      <span>Depends On ({fileDetail.dependencies.length})</span>
                    </div>
                  </div>

                  {fileDetail.dependencies.length === 0 ? (
                    <div className="text-[10px] text-muted-text/80 italic py-1">
                      This file imports nothing within the repository.
                    </div>
                  ) : (
                    <div className="space-y-1">
                      {fileDetail.dependencies.map((item) => {
                        const isHovered = isFileHovered(item.path);

                        return (
                          <div
                            key={item.path}
                            onClick={() => onSelectFile(item.path)}
                            onMouseEnter={() =>
                              onHoverTargetChange?.({
                                type: "file",
                                path: item.path,
                                nodeId: item.nodeId,
                              })
                            }
                            onMouseLeave={() => onHoverTargetChange?.(null)}
                            className={`flex items-center justify-between px-2 py-1.5 rounded text-[11px] cursor-pointer transition-colors border ${
                              isHovered
                                ? "bg-accent/20 border-accent text-foreground"
                                : "border-transparent hover:bg-surface-subtle hover:border-surface-border text-foreground"
                            }`}
                            title={`${item.path}\nKind: ${item.kind.name}\n(Click to select on map)`}
                          >
                            <div className="flex items-center gap-1.5 min-w-0 pr-1">
                              <span
                                className="h-2 w-2 rounded-xs shrink-0"
                                style={{ backgroundColor: item.kind.color }}
                                aria-hidden="true"
                              />
                              <span className="truncate">{item.path}</span>
                            </div>
                            <span className="text-[10px] text-muted-text/70 tabular-nums shrink-0 ml-1">
                              {item.file ? `${item.file.lines}L` : ""}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Section: Depended On By (Dependents) */}
                {/* "how many depend on it, then the full list of each" */}
                {/* Acceptance check 3: "The import and dependent counts in the pane match the number of rows listed underneath them." */}
                <div className="p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="text-[11px] font-semibold text-foreground uppercase tracking-wider flex items-center gap-1.5">
                      <span className="text-emerald-500">←</span>
                      <span>
                        Depended On By ({fileDetail.dependents.length})
                      </span>
                    </div>
                  </div>

                  {fileDetail.dependents.length === 0 ? (
                    <div className="text-[10px] text-muted-text/80 italic py-1">
                      No internal files depend on this file.
                    </div>
                  ) : (
                    <div className="space-y-1">
                      {fileDetail.dependents.map((item) => {
                        const isHovered = isFileHovered(item.path);

                        return (
                          <div
                            key={item.path}
                            onClick={() => onSelectFile(item.path)}
                            onMouseEnter={() =>
                              onHoverTargetChange?.({
                                type: "file",
                                path: item.path,
                                nodeId: item.nodeId,
                              })
                            }
                            onMouseLeave={() => onHoverTargetChange?.(null)}
                            className={`flex items-center justify-between px-2 py-1.5 rounded text-[11px] cursor-pointer transition-colors border ${
                              isHovered
                                ? "bg-accent/20 border-accent text-foreground"
                                : "border-transparent hover:bg-surface-subtle hover:border-surface-border text-foreground"
                            }`}
                            title={`${item.path}\nKind: ${item.kind.name}\n(Click to select on map)`}
                          >
                            <div className="flex items-center gap-1.5 min-w-0 pr-1">
                              <span
                                className="h-2 w-2 rounded-xs shrink-0"
                                style={{ backgroundColor: item.kind.color }}
                                aria-hidden="true"
                              />
                              <span className="truncate">{item.path}</span>
                            </div>
                            <span className="text-[10px] text-muted-text/70 tabular-nums shrink-0 ml-1">
                              {item.file ? `${item.file.lines}L` : ""}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ----------------------------------------------------- */}
            {/* 3. FOLDER (NODE) SELECTED                             */}
            {/* ----------------------------------------------------- */}
            {selection?.type === "node" && folderDetail && (
              <div className="divide-y divide-surface-border">
                {/* Folder Header */}
                <div className="p-3 space-y-2.5 bg-surface">
                  <div className="space-y-1">
                    <div className="text-[10px] uppercase tracking-wider text-muted-text">
                      Selected Folder
                    </div>
                    <div
                      className={`text-sm font-bold truncate ${
                        isNodeHovered(folderDetail.node.id)
                          ? "text-accent"
                          : "text-foreground"
                      }`}
                    >
                      {folderDetail.node.label}
                    </div>
                    <div className="text-[10px] text-muted-text truncate" title={folderDetail.node.dir}>
                      {folderDetail.node.dir}
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-[11px] pt-1">
                    <span className="text-muted-text">Files inside</span>
                    <span className="font-semibold text-foreground tabular-nums">
                      {folderDetail.node.fileCount} files
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 pt-1 font-mono text-[11px]">
                    <div className="border border-surface-border rounded p-2 bg-surface-subtle/40 text-center">
                      <div className="text-[10px] uppercase text-muted-text">
                        Incoming
                      </div>
                      <div className="text-xs font-bold text-emerald-500 tabular-nums mt-0.5">
                        ← {folderDetail.node.fanIn}
                      </div>
                    </div>
                    <div className="border border-surface-border rounded p-2 bg-surface-subtle/40 text-center">
                      <div className="text-[10px] uppercase text-muted-text">
                        Outgoing
                      </div>
                      <div className="text-xs font-bold text-amber-500 tabular-nums mt-0.5">
                        → {folderDetail.node.fanOut}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Category Breakdown */}
                {/* "with Structure listing what kind of files are inside it and how many of each" */}
                <div className="p-3 space-y-2">
                  <div className="text-[11px] font-semibold text-foreground uppercase tracking-wider">
                    Kinds of Files Inside
                  </div>

                  <div className="space-y-1.5 pt-1">
                    {folderDetail.groups.map((group) => (
                      <div
                        key={group.category.id}
                        className="flex items-center justify-between text-[11px] px-2 py-1 rounded bg-surface-subtle/60 border border-surface-border/40"
                      >
                        <div className="flex items-center gap-2">
                          <span
                            className="h-2.5 w-2.5 rounded-xs shrink-0"
                            style={{ backgroundColor: group.category.color }}
                            aria-hidden="true"
                          />
                          <span className="text-foreground font-medium">
                            {group.category.name}
                          </span>
                        </div>
                        <span className="font-semibold text-muted-text tabular-nums">
                          {group.count}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Files inside this folder */}
                <div className="p-3 space-y-2">
                  <div className="text-[11px] font-semibold text-foreground uppercase tracking-wider">
                    Files ({folderDetail.node.files.length})
                  </div>

                  <div className="space-y-1">
                    {folderDetail.node.files.map((file) => {
                      const kind = identifyFileKind(file.path);
                      const isHovered = isFileHovered(file.path);

                      return (
                        <div
                          key={file.path}
                          onClick={() => onSelectFile(file.path)}
                          onMouseEnter={() =>
                            onHoverTargetChange?.({
                              type: "file",
                              path: file.path,
                              nodeId: folderDetail.node.id,
                            })
                          }
                          onMouseLeave={() => onHoverTargetChange?.(null)}
                          className={`flex items-center justify-between px-2 py-1.5 rounded text-[11px] cursor-pointer transition-colors border ${
                            isHovered
                              ? "bg-accent/20 border-accent text-foreground"
                              : "border-transparent hover:bg-surface-subtle hover:border-surface-border text-foreground"
                          }`}
                          title={`${file.path}\n${file.lines} lines\nin: ${file.fanIn} · out: ${file.fanOut}\n(Click to select on map)`}
                        >
                          <div className="flex items-center gap-1.5 min-w-0 pr-1">
                            <span
                              className="h-2 w-2 rounded-xs shrink-0"
                              style={{ backgroundColor: kind.color }}
                              aria-hidden="true"
                            />
                            <span className="truncate">{file.path}</span>
                          </div>
                          <span className="text-[10px] text-muted-text tabular-nums shrink-0 ml-1">
                            {file.lines}L
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </aside>
  );
}
