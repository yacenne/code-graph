"use client";

import React from "react";
import { Header } from "./header";
import type { OrganizationSummary } from "@/lib/auth/org";

interface AppShellProps {
  organization: OrganizationSummary | null;
  orgRole?: string | null;
}

export function AppShell({ organization, orgRole }: AppShellProps) {
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
            <span className="text-[10px]">0 files</span>
          </div>

          <div className="flex-1 overflow-y-auto p-3 font-mono text-xs text-muted-text">
            <p className="leading-relaxed">
              No repository parsed yet. In Phase 2, repository structure and import resolution will appear here.
            </p>
          </div>

          <div className="border-t border-surface-border p-2 bg-surface-subtle font-mono text-[11px] text-muted-text flex items-center justify-between">
            <span>Coverage</span>
            <span className="font-semibold text-foreground">0%</span>
          </div>
        </aside>

        {/* Center Canvas: Dependency Graph */}
        <main
          aria-label="Dependency graph canvas"
          className="flex-1 relative flex flex-col bg-background overflow-hidden"
        >
          <div className="flex h-8 items-center justify-between border-b border-surface-border px-3 text-[11px] font-mono uppercase tracking-wider text-muted-text bg-surface/50">
            <span>Dependency Map</span>
            <span className="text-[10px]">Canvas</span>
          </div>

          <div className="flex-1 flex items-center justify-center p-6 text-center select-none">
            <div className="max-w-md space-y-2 font-mono text-xs text-muted-text">
              <div className="inline-block rounded border border-surface-border bg-surface px-2.5 py-1 text-foreground font-medium">
                Workspace Canvas Ready
              </div>
              <p className="text-[11px]">
                Dependency parsing engine and interactive React Flow graph canvas integrate here in subsequent phases.
              </p>
            </div>
          </div>
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
              <span className="text-[10px]">Metrics</span>
            </div>
            <div className="flex-1 overflow-y-auto p-3 font-mono text-xs text-muted-text">
              <p className="leading-relaxed">
                Select a file or module on the map to inspect incoming imports (green), outgoing imports (amber), and blast radius.
              </p>
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
