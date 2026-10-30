"use client";

import React, { useMemo, useState } from "react";
import type { ParserResult } from "@/lib/parser/types";
import {
  computeRepositoryInsights,
  type InsightSection,
  type CycleInsightItem,
} from "@/lib/canvas/graph-math";
import { classifyFileCategory, CATEGORY_TOKENS } from "@/lib/canvas/categories";

export interface InsightsPanelProps {
  data: ParserResult;
  onSelectFile: (filePath: string) => void;
  onHoverFile?: (filePath: string | null) => void;
}

export function InsightsPanel({
  data,
  onSelectFile,
  onHoverFile,
}: InsightsPanelProps) {
  // Pure calculation over edge and file lists
  const insights = useMemo(() => {
    return computeRepositoryInsights(data);
  }, [data]);

  // Collapsible state for each section inside insights (start open so when insights panel is opened, sections are clear)
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    unimported: true,
    "high-fan-in": true,
    cycle: true,
    oversized: true,
  });

  const toggleSection = (kind: string) => {
    setExpandedSections((prev) => ({
      ...prev,
      [kind]: !prev[kind],
    }));
  };

  return (
    <div className="space-y-3 font-mono text-xs">
      {insights.sections.map((section: InsightSection) => {
        const isExpanded = expandedSections[section.kind] ?? true;

        return (
          <div
            key={section.kind}
            className="rounded border border-surface-border bg-surface overflow-hidden"
          >
            {/* Section Header */}
            <button
              type="button"
              onClick={() => toggleSection(section.kind)}
              className="w-full flex items-center justify-between p-2.5 bg-surface-subtle/60 hover:bg-surface-subtle transition-colors cursor-pointer text-left select-none"
            >
              <div className="flex items-center gap-2 min-w-0 pr-2">
                <span className="text-[10px] text-muted-text">
                  {isExpanded ? "▼" : "▶"}
                </span>
                <span className="font-semibold text-foreground text-[11px] truncate">
                  {section.title}
                </span>
              </div>
              <span className="text-[10px] text-muted-text tabular-nums shrink-0 bg-surface px-1.5 py-0.5 rounded border border-surface-border">
                {section.count} {section.count === 1 ? "fact" : "facts"}
              </span>
            </button>

            {isExpanded && (
              <div className="p-2.5 space-y-2 border-t border-surface-border/60 bg-surface">
                {/* One of four fixed strings per spec constraint */}
                <p className="text-[11px] text-muted-text italic font-sans leading-relaxed">
                  {section.sentence}
                </p>

                {/* Items List */}
                {section.count === 0 ? (
                  <div className="text-[10px] text-muted-text/70 italic py-1">
                    None detected.
                  </div>
                ) : section.kind === "cycle" && section.cycleItems ? (
                  <div className="space-y-1.5 pt-1">
                    {section.cycleItems.slice(0, 15).map((item: CycleInsightItem, idx: number) => (
                      <div
                        key={item.key}
                        className="rounded border border-surface-border/80 bg-surface-subtle/30 p-2 space-y-1.5"
                      >
                        <div className="flex items-center justify-between text-[10px] text-muted-text">
                          <span className="font-semibold text-foreground">
                            Cycle #{idx + 1}
                          </span>
                          <span>{item.cycle.length - 1} hops</span>
                        </div>
                        {/* Interactive cycle chain: click any node to select and walk it */}
                        <div className="flex flex-wrap items-center gap-1 text-[10px]">
                          {item.cycle.map((nodePath, hopIdx) => {
                            const isLast = hopIdx === item.cycle.length - 1;
                            const categoryId = classifyFileCategory(nodePath);
                            const color = CATEGORY_TOKENS[categoryId]?.color ?? "#71717a";

                            return (
                              <React.Fragment key={`${item.key}-${hopIdx}-${nodePath}`}>
                                <button
                                  type="button"
                                  onClick={() => onSelectFile(nodePath)}
                                  onMouseEnter={() => onHoverFile?.(nodePath)}
                                  onMouseLeave={() => onHoverFile?.(null)}
                                  className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-surface hover:bg-accent/20 border border-surface-border hover:border-accent text-foreground transition-colors cursor-pointer max-w-[200px]"
                                  title={`${nodePath}\n(Click to select on map)`}
                                >
                                  <span
                                    className="h-1.5 w-1.5 rounded-xs shrink-0"
                                    style={{ backgroundColor: color }}
                                    aria-hidden="true"
                                  />
                                  <span className="truncate">
                                    {nodePath.includes("/")
                                      ? nodePath.slice(nodePath.lastIndexOf("/") + 1)
                                      : nodePath}
                                  </span>
                                </button>
                                {!isLast && (
                                  <span className="text-muted-text/80 text-[10px] font-bold">
                                    →
                                  </span>
                                )}
                              </React.Fragment>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                    {section.cycleItems.length > 15 && (
                      <div className="text-[10px] text-muted-text text-center pt-1 italic">
                        + {section.cycleItems.length - 15} more cycles in repository
                      </div>
                    )}
                  </div>
                ) : section.fileItems ? (
                  <div className="space-y-1 pt-1 max-h-56 overflow-y-auto">
                    {section.fileItems.slice(0, 30).map((item) => {
                      const categoryId = classifyFileCategory(item.path);
                      const color = CATEGORY_TOKENS[categoryId]?.color ?? "#71717a";

                      return (
                        <div
                          key={item.path}
                          onClick={() => onSelectFile(item.path)}
                          onMouseEnter={() => onHoverFile?.(item.path)}
                          onMouseLeave={() => onHoverFile?.(null)}
                          className="flex items-center justify-between px-2 py-1.5 rounded text-[11px] cursor-pointer hover:bg-surface-subtle border border-transparent hover:border-surface-border text-foreground transition-colors"
                          title={`${item.path}\n${item.detail ?? ""}\n(Click to select on map)`}
                        >
                          <div className="flex items-center gap-1.5 min-w-0 pr-1">
                            <span
                              className="h-2 w-2 rounded-xs shrink-0"
                              style={{ backgroundColor: color }}
                              aria-hidden="true"
                            />
                            <span className="truncate">{item.path}</span>
                          </div>
                          <span className="text-[10px] text-muted-text tabular-nums shrink-0 ml-1">
                            {item.lines ? `${item.lines}L` : item.fanIn ? `←${item.fanIn}` : ""}
                          </span>
                        </div>
                      );
                    })}
                    {section.fileItems.length > 30 && (
                      <div className="text-[10px] text-muted-text text-center pt-1 italic">
                        + {section.fileItems.length - 30} more matching files
                      </div>
                    )}
                  </div>
                ) : null}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

