"use client";

import React from "react";
import Link from "next/link";
import {
  OrganizationSwitcher,
  InviteMembersButton,
  UserButton,
} from "@clerk/nextjs";
import { ThemeControl } from "@/components/theme/theme-control";
import type { OrganizationSummary } from "@/lib/auth/org";

interface HeaderProps {
  organization?: OrganizationSummary | null;
  orgRole?: string | null;
  repositoryName?: string;
  isScaffoldPreview?: boolean;
}

export function Header({
  organization,
  orgRole,
  repositoryName,
  isScaffoldPreview,
}: HeaderProps) {
  return (
    <header className="h-11 border-b border-surface-border bg-surface px-3 flex items-center justify-between gap-4 select-none">
      {/* Brand & Team Context */}
      <div className="flex items-center gap-3">
        <Link
          href="/"
          className="flex items-center gap-1.5 font-mono text-xs font-bold tracking-tight text-foreground"
        >
          <span className="flex h-5 w-5 items-center justify-center rounded bg-foreground text-background font-black text-[10px]">
            C
          </span>
          <span>Cartograph</span>
        </Link>

        <span className="text-surface-border">/</span>

        {isScaffoldPreview ? (
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2 rounded border border-surface-border bg-surface-subtle px-2 py-0.5 text-xs font-mono">
              <span className="font-semibold text-foreground">
                {repositoryName ?? "repository"}
              </span>
              <span className="text-[10px] text-muted-text uppercase tracking-wider">
                [preview]
              </span>
            </div>
            <Link
              href="/"
              className="h-6 px-2 text-xs font-mono rounded border border-surface-border bg-surface-subtle text-muted-text hover:text-foreground hover:bg-surface transition-colors flex items-center gap-1"
            >
              <span>← Dashboard</span>
            </Link>
          </div>
        ) : (
          <>
            {/* Server-rendered Organization Badge */}
            {organization ? (
              <div
                data-testid="server-org-badge"
                className="flex items-center gap-2 rounded border border-surface-border bg-surface-subtle px-2 py-0.5 text-xs font-mono"
              >
                <span className="font-semibold text-foreground">
                  {organization.name}
                </span>
                {orgRole && (
                  <span className="text-[10px] text-muted-text uppercase tracking-wider">
                    [{orgRole.replace("org:", "")}]
                  </span>
                )}
              </div>
            ) : (
              <span className="text-xs font-mono text-muted-text">
                No active team
              </span>
            )}

            {/* Clerk Organization Switcher & Member Invitation */}
            <div className="flex items-center gap-1.5">
              <OrganizationSwitcher
                hidePersonal={true}
                afterSelectOrganizationUrl="/"
            afterCreateOrganizationUrl="/"
            afterLeaveOrganizationUrl="/"
            appearance={{
              elements: {
                rootBox: "flex items-center",
                organizationSwitcherTrigger:
                  "h-7 px-2.5 text-xs font-mono rounded border border-surface-border bg-surface-subtle text-foreground hover:bg-surface hover:text-foreground transition-colors cursor-pointer flex items-center gap-1.5 shadow-none",
                organizationPreview: "flex items-center gap-1.5",
                organizationPreviewTextContainer: "flex items-center",
                organizationPreviewMainIdentifier:
                  "text-foreground text-xs font-mono font-medium",
                organizationSwitcherTriggerIcon:
                  "text-foreground opacity-80",
                organizationSwitcherPopoverCard:
                  "bg-surface border border-surface-border text-foreground shadow-lg font-mono text-xs",
                organizationSwitcherPopoverActions:
                  "text-foreground",
                organizationSwitcherPopoverActionButton:
                  "text-foreground hover:bg-surface-subtle font-mono text-xs",
                organizationListItem:
                  "text-foreground hover:bg-surface-subtle font-mono text-xs",
                organizationPreviewSecondaryIdentifier:
                  "text-muted-text text-[11px]",
              },
            }}
          />

          <InviteMembersButton>
            <button
              type="button"
              className="h-6 px-2 text-xs font-mono rounded border border-surface-border bg-surface-subtle text-muted-text hover:text-foreground hover:bg-surface transition-colors cursor-pointer flex items-center gap-1"
              title="Invite members to this organization"
            >
              <span>+</span>
              <span>Invite</span>
            </button>
          </InviteMembersButton>
        </div>
      </>
    )}
  </div>

      {/* Target Repository Input and Navigation */}
      <div className="flex-1 max-w-md hidden md:flex items-center gap-2">
        <div className="flex-1 flex items-center rounded border border-surface-border bg-surface-subtle px-2 py-0.5 text-xs font-mono text-muted-text">
          <span className="text-muted-text mr-2 select-none">repo:</span>
          <span className="truncate select-all text-muted-text">
            {repositoryName ?? "github.com/owner/repository"}
          </span>
        </div>
        {!isScaffoldPreview && (
          <Link
            href="/preview"
            className="h-6 px-2 text-xs font-mono rounded border border-surface-border bg-surface-subtle text-muted-text hover:text-foreground hover:bg-surface transition-colors flex items-center shrink-0"
            title="Open canvas preview with parsed scaffolding data"
          >
            <span>Canvas Preview →</span>
          </Link>
        )}
      </div>

      {/* Controls: Theme & User Session */}
      <div className="flex items-center gap-3">
        <ThemeControl />
        <div className="flex items-center">
          <UserButton
            appearance={{
              elements: {
                userButtonAvatarBox: "h-6 w-6 rounded",
              },
            }}
          />
        </div>
      </div>
    </header>
  );
}
