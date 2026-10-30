import { createServerClient } from "@/lib/supabase/server";

export interface AnalysisItem {
  id: string;
  organization_id: string;
  project_id: string;
  status: "pending" | "analyzing" | "completed" | "failed" | string;
  commit_hash: string | null;
  branch: string | null;
  file_count: number;
  edge_count: number;
  coverage_percent: number;
  error_message: string | null;
  created_at: string;
  updated_at: string;
  projects: {
    id: string;
    name: string;
    repo_url: string;
  } | null;
}

/**
 * Reads all analyses visible to the active session.
 * 
 * Strict Constraint (Phase 2):
 * The application query does NOT filter by organization.
 * Postgres Row-Level Security reads the active organization claim
 * off the auth token and guarantees tenant isolation at the database layer.
 */
export async function getAnalyses(): Promise<AnalysisItem[]> {
  const supabase = await createServerClient();

  const { data, error } = await supabase
    .from("analyses")
    .select(`
      id,
      organization_id,
      project_id,
      status,
      commit_hash,
      branch,
      file_count,
      edge_count,
      coverage_percent,
      error_message,
      created_at,
      updated_at,
      projects (
        id,
        name,
        repo_url
      )
    `)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[Cartograph] Failed to fetch analyses via Supabase client:", error);
    return [];
  }

  return (data as unknown as AnalysisItem[]) ?? [];
}
