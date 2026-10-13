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
  organization: OrganizationSummary | null;
  orgRole?: string | null;
}

export function Header({ organization, orgRole }: HeaderProps) {
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
                  "h-6 px-2 text-xs font-mono rounded border border-surface-border bg-surface-subtle text-foreground hover:bg-surface transition-colors cursor-pointer",
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
      </div>

      {/* Target Repository Input (Toolbar placeholder for Phase 2) */}
      <div className="flex-1 max-w-md hidden md:flex items-center">
        <div className="w-full flex items-center rounded border border-surface-border bg-surface-subtle px-2 py-0.5 text-xs font-mono text-muted-text">
          <span className="text-muted-text mr-2 select-none">repo:</span>
          <span className="truncate select-all text-muted-text">
            github.com/owner/repository
          </span>
        </div>
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
