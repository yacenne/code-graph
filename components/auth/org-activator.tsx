"use client";

import { useClerk } from "@clerk/nextjs";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

interface OrgActivatorProps {
  organizationId: string;
}

/**
 * Activates the assigned organization into the current session and refreshes
 * so subsequent server renders and token claims carry the active organization.
 */
export function OrgActivator({ organizationId }: OrgActivatorProps) {
  const { setActive, loaded } = useClerk();
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!loaded || !setActive) return;

    let mounted = true;

    setActive({ organization: organizationId })
      .then(() => {
        if (mounted) {
          router.refresh();
        }
      })
      .catch((err) => {
        console.error("Failed to activate organization:", err);
        if (mounted) {
          setError("Failed to initialize organization session.");
        }
      });

    return () => {
      mounted = false;
    };
  }, [loaded, setActive, organizationId, router]);

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-950 p-4 text-zinc-100">
        <div className="rounded border border-red-800 bg-red-950/40 p-4 font-mono text-xs text-red-300">
          {error}
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-950 p-4 text-zinc-400">
      <div className="flex items-center gap-2 font-mono text-xs">
        <span className="inline-block h-2 w-2 rounded-full bg-blue-500 animate-pulse" />
        <span>Initializing organization workspace...</span>
      </div>
    </div>
  );
}
