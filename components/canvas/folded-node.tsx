"use client";

import React, { memo } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import type { FoldedNodeType } from "@/lib/canvas/layout";

export const FoldedNode = memo(function FoldedNode({
  data,
}: NodeProps<FoldedNodeType>) {
  const { nodeData, isSelected, isDimmed, isHovered, onToggleOpen, onSelectNode, onHoverNode } = data;

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onSelectNode?.(nodeData.id);
  };

  const handleDoubleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onToggleOpen?.(nodeData.id);
  };

  return (
    <div
      onClick={handleClick}
      onDoubleClick={handleDoubleClick}
      onMouseEnter={() => onHoverNode?.(nodeData.id)}
      onMouseLeave={() => onHoverNode?.(null)}
      title={`${nodeData.dir}\n${nodeData.fileCount} files\nin: ${nodeData.fanIn} · out: ${nodeData.fanOut}\n(Click to select, double-click or click + to expand)`}
      style={{
        width: nodeData.width,
        height: nodeData.height,
        opacity: isHovered ? 1 : isDimmed ? 0.18 : 1,
      }}
      className={`group relative rounded border bg-surface px-2.5 py-1.5 flex flex-col justify-between select-none cursor-pointer transition-all duration-150 ${
        isSelected
          ? "border-accent ring-1 ring-accent shadow-sm"
          : isHovered
          ? "border-accent ring-2 ring-accent/60 shadow-md"
          : "border-surface-border hover:border-foreground/40 shadow-xs"
      }`}
    >
      {/* Target Handle (Left) */}
      <Handle
        type="target"
        position={Position.Left}
        className="!w-2 !h-2 !bg-surface-border group-hover:!bg-foreground/60 transition-colors"
      />

      {/* Top: Shortest Unique Label & Expand Action */}
      <div className="flex items-center justify-between gap-1.5 w-full">
        <span
          className={`font-mono text-xs font-semibold truncate ${
            isSelected ? "text-accent" : "text-foreground"
          }`}
        >
          {nodeData.label}
        </span>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onToggleOpen?.(nodeData.id);
          }}
          className="h-4 w-4 rounded flex items-center justify-center font-mono text-[10px] text-muted-text hover:text-foreground hover:bg-surface-subtle transition-colors shrink-0"
          title="Open folder into panel"
          aria-label={`Open folder ${nodeData.label}`}
        >
          +
        </button>
      </div>

      {/* Bottom: Metrics & File Count */}
      <div className="flex items-center justify-between font-mono text-[10px] text-muted-text mt-0.5">
        <span className="tabular-nums">{nodeData.fileCount} files</span>
        <span className="tabular-nums opacity-75">
          {nodeData.fanIn > 0 ? `←${nodeData.fanIn}` : ""}
          {nodeData.fanOut > 0 ? ` →${nodeData.fanOut}` : ""}
        </span>
      </div>

      {/* Source Handle (Right) */}
      <Handle
        type="source"
        position={Position.Right}
        className="!w-2 !h-2 !bg-surface-border group-hover:!bg-foreground/60 transition-colors"
      />
    </div>
  );
});
