"use client";

import React, { useState } from "react";
import type { AnalysisItem } from "@/lib/supabase/analyses";

interface AnalysesDashboardProps {
  analyses: AnalysisItem[];
  selectedId?: string;
  onSelectAnalysis?: (analysis: AnalysisItem) => void;
}

export function AnalysesDashboard({
  analyses,
  selectedId,
  onSelectAnalysis,
}: AnalysesDashboardProps) {
  const [activeId, setActiveId] = useState<string | undefined>(
    selectedId ?? analyses[0]?.id
  );

  const handleSelect = (analysis: AnalysisItem) => {
    setActiveId(analysis.id);
    onSelectAnalysis?.(analysis);
  };

  const getStatusBadge = (status: string) => {
    switch (status.toLowerCase()) {
      case "completed":
        return (
          <span className="inline-flex items-center gap-1.5 rounded border border-emerald-500/20 bg-emerald-500/10 px-1.5 py-0.5 text-[10px] font-mono font-medium text-emerald-600 dark:text-emerald-400">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            completed
          </span>
        );
      case "analyzing":
      case "running":
        return (
          <span className="inline-flex items-center gap-1.5 rounded border border-blue-500/20 bg-blue-500/10 px-1.5 py-0.5 text-[10px] font-mono font-medium text-blue-600 dark:text-blue-400">
            <span className="h-1.5 w-1.5 rounded-full bg-blue-500" />
            analyzing
          </span>
        );
      case "failed":
        return (
          <span className="inline-flex items-center gap-1.5 rounded border border-rose-500/20 bg-rose-500/10 px-1.5 py-0.5 text-[10px] font-mono font-medium text-rose-600 dark:text-rose-400">
            <span className="h-1.5 w-1.5 rounded-full bg-rose-500" />
            failed
          </span>
        );
      case "pending":
      default:
        return (
          <span className="inline-flex items-center gap-1.5 rounded border border-surface-border bg-surface-subtle px-1.5 py-0.5 text-[10px] font-mono font-medium text-muted-text">
            <span className="h-1.5 w-1.5 rounded-full bg-muted-text" />
            pending
          </span>
        );
    }
  };

  const formatDate = (isoString: string) => {
    try {
      const date = new Date(isoString);
      return date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      });
    } catch {
      return isoString;
    }
  };

  if (analyses.length === 0) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center p-8 text-center select-none bg-background">
        <div className="max-w-sm rounded border border-surface-border bg-surface p-6 font-mono text-xs">
          <div className="mb-2 text-foreground font-semibold uppercase tracking-wider text-[11px]">
            No Analyses Found
          </div>
          <p className="text-muted-text text-[11px] leading-relaxed">
            This organization has not run any repository analyses yet. Analyses will be listed here once recorded.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col overflow-hidden bg-background">
      {/* Analyses Table View */}
      <div className="flex-1 overflow-y-auto">
        <table className="w-full border-collapse text-left font-mono text-xs">
          <thead>
            <tr className="border-b border-surface-border bg-surface-subtle text-[10px] uppercase tracking-wider text-muted-text">
              <th className="py-2 px-3 font-medium">Repository / Project</th>
              <th className="py-2 px-3 font-medium">Branch &amp; Commit</th>
              <th className="py-2 px-3 font-medium">State</th>
              <th className="py-2 px-3 font-medium text-right">Files</th>
              <th className="py-2 px-3 font-medium text-right">Edges</th>
              <th className="py-2 px-3 font-medium text-right">Coverage</th>
              <th className="py-2 px-3 font-medium text-right">Timestamp</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-surface-border">
            {analyses.map((analysis) => {
              const isSelected = analysis.id === activeId;
              const projectName = analysis.projects?.name ?? "unnamed-project";
              const commitShort = analysis.commit_hash
                ? analysis.commit_hash.slice(0, 7)
                : "—";

              return (
                <tr
                  key={analysis.id}
                  onClick={() => handleSelect(analysis)}
                  className={`group cursor-pointer transition-colors ${
                    isSelected
                      ? "bg-accent/10 border-l-2 border-l-accent"
                      : "hover:bg-surface-subtle/70"
                  }`}
                >
                  {/* Project name / repository */}
                  <td className="py-2.5 px-3">
                    <div className="font-semibold text-foreground flex items-center gap-1.5">
                      <span>{projectName}</span>
                      {analysis.projects?.repo_url && (
                        <span className="text-[10px] text-muted-text font-normal truncate max-w-[140px]">
                          {analysis.projects.repo_url.replace("https://github.com/", "")}
                        </span>
                      )}
                    </div>
                  </td>

                  {/* Branch & Commit */}
                  <td className="py-2.5 px-3">
                    <div className="flex items-center gap-1.5 text-foreground text-[11px]">
                      <span className="rounded bg-surface-subtle px-1 py-0.2 text-[10px] text-muted-text">
                        {analysis.branch ?? "main"}
                      </span>
                      <span className="text-muted-text">@</span>
                      <span className="text-foreground">{commitShort}</span>
                    </div>
                  </td>

                  {/* Status */}
                  <td className="py-2.5 px-3">
                    <div className="flex flex-col items-start gap-1">
                      {getStatusBadge(analysis.status)}
                      {analysis.status === "failed" && analysis.error_message && (
                        <span className="text-[10px] text-rose-500 max-w-[200px] truncate" title={analysis.error_message}>
                          {analysis.error_message}
                        </span>
                      )}
                    </div>
                  </td>

                  {/* File Count */}
                  <td className="py-2.5 px-3 text-right text-foreground">
                    {analysis.file_count.toLocaleString()}
                  </td>

                  {/* Edge Count */}
                  <td className="py-2.5 px-3 text-right text-foreground">
                    {analysis.edge_count.toLocaleString()}
                  </td>

                  {/* Coverage */}
                  <td className="py-2.5 px-3 text-right">
                    <span className="font-medium text-foreground">
                      {Number(analysis.coverage_percent).toFixed(1)}%
                    </span>
                  </td>

                  {/* Timestamp */}
                  <td className="py-2.5 px-3 text-right text-[11px] text-muted-text">
                    {formatDate(analysis.created_at)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
