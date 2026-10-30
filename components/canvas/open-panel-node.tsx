"use client";

import React, { memo } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import type { OpenPanelNodeType } from "@/lib/canvas/layout";
import { MAX_VISIBLE_ROWS, OPEN_PANEL_WIDTH } from "@/lib/canvas/layout";
import { classifyFileCategory, CATEGORY_TOKENS } from "@/lib/canvas/categories";
import type { FileNode } from "@/lib/parser/types";

export const OpenPanelNode = memo(function OpenPanelNode({
  data,
}: NodeProps<OpenPanelNodeType>) {
  const {
    nodeData,
    isSelected,
    isDimmed,
    isHovered,
    selectedFilePath,
    hoveredFilePath,
    activeFilePaths,
    onClose,
    onSelectNode,
    onSelectFile,
    onHoverNode,
    onHoverFile,
  } = data;

  const visibleFiles = nodeData.files.slice(0, MAX_VISIBLE_ROWS);
  const remainingCount = nodeData.files.length - MAX_VISIBLE_ROWS;

  const handleHeaderClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onClose?.(nodeData.id);
  };

  const handlePanelClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onSelectNode?.(nodeData.id);
  };

  return (
    <div
      onClick={handlePanelClick}
      onMouseEnter={() => onHoverNode?.(nodeData.id)}
      onMouseLeave={() => onHoverNode?.(null)}
      style={{
        width: OPEN_PANEL_WIDTH,
        opacity: isHovered ? 1 : isDimmed ? 0.18 : 1,
      }}
      className={`group relative rounded-md border bg-surface flex flex-col select-none shadow-md transition-all duration-150 ${
        isSelected
          ? "border-accent ring-1 ring-accent"
          : isHovered
          ? "border-accent ring-2 ring-accent/60"
          : "border-surface-border hover:border-foreground/40"
      }`}
    >
      {/* Panel Fallback Target Handle */}
      <Handle
        type="target"
        position={Position.Left}
        id="handle_target_panel"
        className="!w-2 !h-2 !bg-surface-border"
      />

      {/* Panel Header */}
      {/* "bordered box with a header carrying the folder's name, how many files are in it, and its fan-in and fan-out" */}
      {/* "Clicking an open panel's header closes it back to a single node." */}
      <div
        onClick={handleHeaderClick}
        className="flex h-10 items-center justify-between border-b border-surface-border bg-surface-subtle px-3 cursor-pointer hover:bg-surface transition-colors rounded-t-md"
        title="Click header to close folder panel"
      >
        <div className="flex flex-col min-w-0 pr-2">
          <div className="flex items-center gap-1.5">
            <span className="font-mono text-xs font-bold text-foreground truncate">
              {nodeData.label}
            </span>
            <span className="font-mono text-[10px] text-muted-text tabular-nums shrink-0">
              ({nodeData.fileCount})
            </span>
          </div>
          <div className="font-mono text-[9px] text-muted-text truncate">
            in: {nodeData.fanIn} · out: {nodeData.fanOut}
          </div>
        </div>

        <button
          type="button"
          onClick={handleHeaderClick}
          className="h-5 w-5 rounded flex items-center justify-center font-mono text-xs text-muted-text hover:text-foreground hover:bg-surface-border/50 transition-colors shrink-0"
          title="Close panel"
          aria-label={`Close panel ${nodeData.label}`}
        >
          ×
        </button>
      </div>

      {/* Files List as Rows */}
      {/* "the files appear as rows inside that box. When there are more rows than fit, the panel says how many more rather than growing without limit. Edges connect to the rows." */}
      <div className="flex flex-col divide-y divide-surface-border/50 py-0.5">
        {visibleFiles.map((file: FileNode) => {
          const isFileSelected = selectedFilePath === file.path;
          const isFileHovered = hoveredFilePath === file.path;
          const isFileActive = activeFilePaths.has(file.path);
          const categoryId = classifyFileCategory(file.path);
          const color = CATEGORY_TOKENS[categoryId]?.color ?? "#71717a";

          // Short file name display
          const fileName = file.path.includes("/")
            ? file.path.slice(file.path.lastIndexOf("/") + 1)
            : file.path;

          return (
            <div
              key={file.path}
              onClick={(e) => {
                e.stopPropagation();
                onSelectFile?.(file.path, nodeData.id);
              }}
              onMouseEnter={(e) => {
                e.stopPropagation();
                onHoverFile?.(file.path, nodeData.id);
              }}
              onMouseLeave={(e) => {
                e.stopPropagation();
                onHoverFile?.(null);
              }}
              className={`relative h-7 px-3 flex items-center justify-between font-mono text-[11px] cursor-pointer transition-colors ${
                isFileSelected
                  ? "bg-accent/15 text-foreground font-semibold ring-1 ring-accent/30"
                  : isFileHovered
                  ? "bg-accent/25 text-foreground font-semibold ring-1 ring-accent/60"
                  : isFileActive
                  ? "bg-surface-subtle text-foreground font-medium"
                  : "text-muted-text hover:text-foreground hover:bg-surface-subtle"
              }`}
              title={`${file.path}\nfan-in: ${file.fanIn} · fan-out: ${file.fanOut} · lines: ${file.lines}`}
            >
              {/* Row Target Handle (Left) */}
              <Handle
                type="target"
                position={Position.Left}
                id={`handle_target_${file.path}`}
                className="!w-1.5 !h-1.5 !bg-surface-border group-hover:!bg-foreground/50 -ml-1"
              />

              {/* File Swatch and Name */}
              <div className="flex items-center gap-2 min-w-0 pr-1">
                <span
                  className="h-2 w-2 rounded-xs shrink-0"
                  style={{ backgroundColor: color }}
                  aria-hidden="true"
                />
                <span className="truncate">{fileName}</span>
              </div>

              {/* Row metrics */}
              <span className="text-[10px] text-muted-text/80 tabular-nums shrink-0 ml-1">
                {file.fanIn > 0 ? `←${file.fanIn}` : ""}
              </span>

              {/* Row Source Handle (Right) */}
              <Handle
                type="source"
                position={Position.Right}
                id={`handle_source_${file.path}`}
                className="!w-1.5 !h-1.5 !bg-surface-border group-hover:!bg-foreground/50 -mr-1"
              />
            </div>
          );
        })}

        {/* Overflow Row */}
        {remainingCount > 0 && (
          <div className="h-7 px-3 flex items-center justify-center font-mono text-[10px] text-muted-text bg-surface-subtle/40 italic">
            + {remainingCount} more files
          </div>
        )}
      </div>

      {/* Panel Fallback Source Handle */}
      <Handle
        type="source"
        position={Position.Right}
        id="handle_source_panel"
        className="!w-2 !h-2 !bg-surface-border"
      />
    </div>
  );
});
