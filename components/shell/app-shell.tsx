"use client";

import React, { useState } from "react";
import { Header } from "./header";
import { AnalysesDashboard } from "@/components/dashboard/analyses-dashboard";
import type { OrganizationSummary } from "@/lib/auth/org";
import type { AnalysisItem } from "@/lib/supabase/analyses";

interface AppShellProps {
  organization: OrganizationSummary | null;
  orgRole?: string | null;
  analyses?: AnalysisItem[];
}

export function AppShell({
  organization,
  orgRole,
  analyses = [],
}: AppShellProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // Derive selected analysis during render (React 19 pattern: no setState inside useEffect)
  const selectedAnalysis =
    analyses.find((a) => a.id === selectedId) ?? analyses[0] ?? null;

  return (
    <div className="flex h-screen w-screen flex-col bg-background text-foreground overflow-hidden font-sans">
      {/* Shell Header */}
      <Header organization={organization} orgRole={orgRole} />

      {/* Main Workspace Workspace Grid */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left Panel: Files & Coverage Explorer */}
        <aside
          aria-label="File explorer and coverage"
          className="w-64 border-r border-surface-border bg-surface flex flex-col shrink-0"
        >
          <div className="flex h-8 items-center justify-between border-b border-surface-border px-3 text-[11px] font-mono uppercase tracking-wider text-muted-text">
            <span>Explorer</span>
            <span className="text-[10px]">
              {selectedAnalysis ? `${selectedAnalysis.file_count} files` : "0 files"}
            </span>
          </div>

          <div className="flex-1 overflow-y-auto p-3 font-mono text-xs text-muted-text">
            {selectedAnalysis ? (
              <div className="space-y-3">
                <div className="space-y-1">
                  <div className="text-[10px] uppercase tracking-wider text-muted-text">
                    Active Target
                  </div>
                  <div className="font-semibold text-foreground truncate">
                    {selectedAnalysis.projects?.name ?? "unnamed-project"}
                  </div>
                  <div className="text-[11px] text-muted-text truncate">
                    {selectedAnalysis.projects?.repo_url ?? "—"}
                  </div>
                </div>

                <div className="border-t border-surface-border pt-2 space-y-1">
                  <div className="text-[10px] uppercase tracking-wider text-muted-text">
                    Revision
                  </div>
                  <div className="text-[11px] text-foreground">
                    {selectedAnalysis.branch ?? "main"} @{" "}
                    <span className="text-muted-text">
                      {selectedAnalysis.commit_hash?.slice(0, 7) ?? "—"}
                    </span>
                  </div>
                </div>

                <div className="border-t border-surface-border pt-2 space-y-1">
                  <div className="text-[10px] uppercase tracking-wider text-muted-text">
                    Structure
                  </div>
                  <div className="text-[11px] text-muted-text">
                    {selectedAnalysis.status === "completed"
                      ? `${selectedAnalysis.file_count} files parsed, ${selectedAnalysis.edge_count} dependency edges resolved.`
                      : selectedAnalysis.status === "analyzing"
                      ? "AST parsing and import resolution in progress..."
                      : selectedAnalysis.status === "failed"
                      ? "Analysis halted on error."
                      : "Queued for processing."}
                  </div>
                </div>
              </div>
            ) : (
              <p className="leading-relaxed">
                No analysis selected. When an analysis is recorded, repository structure and import resolution appear here.
              </p>
            )}
          </div>

          <div className="border-t border-surface-border p-2 bg-surface-subtle font-mono text-[11px] text-muted-text flex items-center justify-between">
            <span>Coverage</span>
            <span className="font-semibold text-foreground">
              {selectedAnalysis
                ? `${Number(selectedAnalysis.coverage_percent).toFixed(1)}%`
                : "0%"}
            </span>
          </div>
        </aside>

        {/* Center Canvas: Dashboard & Analyses List */}
        <main
          aria-label="Workspace dashboard and analyses canvas"
          className="flex-1 relative flex flex-col bg-background overflow-hidden"
        >
          <div className="flex h-8 items-center justify-between border-b border-surface-border px-3 text-[11px] font-mono uppercase tracking-wider text-muted-text bg-surface/50">
            <span>Analyses</span>
            <span className="text-[10px]">
              {analyses.length} {analyses.length === 1 ? "run" : "runs"}
            </span>
          </div>

          {/* Analyses Dashboard view */}
          <AnalysesDashboard
            analyses={analyses}
            selectedId={selectedAnalysis?.id}
            onSelectAnalysis={(item) => setSelectedId(item.id)}
          />
        </main>

        {/* Right Panel: Inspector and Chat Panels */}
        <aside
          aria-label="Inspector and Assistant panels"
          className="w-80 border-l border-surface-border bg-surface flex flex-col shrink-0"
        >
          {/* Top Half: Detail / Inspector Panel */}
          <section className="flex-1 border-b border-surface-border flex flex-col overflow-hidden">
            <div className="flex h-8 items-center justify-between border-b border-surface-border px-3 text-[11px] font-mono uppercase tracking-wider text-muted-text">
              <span>Inspector</span>
              <span className="text-[10px]">
                {selectedAnalysis ? selectedAnalysis.status : "Metrics"}
              </span>
            </div>
            <div className="flex-1 overflow-y-auto p-3 font-mono text-xs text-muted-text">
              {selectedAnalysis ? (
                <div className="space-y-3">
                  <div className="flex items-center justify-between border-b border-surface-border pb-2">
                    <span className="text-muted-text">State</span>
                    <span className="font-semibold text-foreground uppercase text-[10px]">
                      {selectedAnalysis.status}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-muted-text">Files</span>
                    <span className="text-foreground">
                      {selectedAnalysis.file_count.toLocaleString()}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-muted-text">Edges</span>
                    <span className="text-foreground">
                      {selectedAnalysis.edge_count.toLocaleString()}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-muted-text">Coverage</span>
                    <span className="text-foreground">
                      {Number(selectedAnalysis.coverage_percent).toFixed(1)}%
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-muted-text">Branch</span>
                    <span className="text-foreground">
                      {selectedAnalysis.branch ?? "main"}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-muted-text">Commit</span>
                    <span className="text-foreground">
                      {selectedAnalysis.commit_hash?.slice(0, 7) ?? "—"}
                    </span>
                  </div>

                  {selectedAnalysis.error_message && (
                    <div className="rounded border border-rose-500/20 bg-rose-500/10 p-2 text-[10px] text-rose-500">
                      <div className="font-bold mb-0.5">Failure Reason</div>
                      <div>{selectedAnalysis.error_message}</div>
                    </div>
                  )}
                </div>
              ) : (
                <p className="leading-relaxed">
                  Select an analysis on the dashboard to inspect repository metrics, revision details, and blast radius.
                </p>
              )}
            </div>
          </section>

          {/* Bottom Half: Chat / Assistant Panel */}
          <section className="flex-1 flex flex-col overflow-hidden">
            <div className="flex h-8 items-center justify-between border-b border-surface-border px-3 text-[11px] font-mono uppercase tracking-wider text-muted-text">
              <span>Assistant</span>
              <span className="text-[10px]">Graph Q&amp;A</span>
            </div>
            <div className="flex-1 overflow-y-auto p-3 font-mono text-xs text-muted-text">
              <p className="leading-relaxed">
                Ask structural questions about the codebase. Answers will be grounded exclusively in parsed dependencies.
              </p>
            </div>
            <div className="border-t border-surface-border p-2 bg-surface-subtle">
              <input
                type="text"
                disabled
                placeholder="Ask repository question..."
                className="w-full rounded border border-surface-border bg-surface px-2 py-1 text-xs font-mono text-muted-text cursor-not-allowed"
              />
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
}
