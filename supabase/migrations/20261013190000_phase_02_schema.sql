-- Phase 2 — Schema and RLS
-- Eight tables: projects, analyses, files, edges, routes, explanations, file_roles, insights
-- Parent table: organizations
-- Every table owns its rows through a foreign key to organizations(id), ON DELETE CASCADE.

-- Revoke execute from public on existing helper if present
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'rls_auto_enable') THEN
    REVOKE EXECUTE ON FUNCTION public.rls_auto_enable() FROM PUBLIC, anon, authenticated;
  END IF;
END $$;

-- 1. Organizations
CREATE TABLE IF NOT EXISTS public.organizations (
  id text PRIMARY KEY,
  name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 2. Projects
CREATE TABLE IF NOT EXISTS public.projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id text NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name text NOT NULL,
  repo_url text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 3. Analyses
CREATE TABLE IF NOT EXISTS public.analyses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id text NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pending',
  commit_hash text,
  branch text,
  file_count integer NOT NULL DEFAULT 0,
  edge_count integer NOT NULL DEFAULT 0,
  coverage_percent numeric(5, 2) NOT NULL DEFAULT 0.00,
  error_message text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 4. Files
CREATE TABLE IF NOT EXISTS public.files (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id text NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  analysis_id uuid NOT NULL REFERENCES public.analyses(id) ON DELETE CASCADE,
  path text NOT NULL,
  fan_in integer NOT NULL DEFAULT 0,
  fan_out integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 5. Edges
CREATE TABLE IF NOT EXISTS public.edges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id text NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  analysis_id uuid NOT NULL REFERENCES public.analyses(id) ON DELETE CASCADE,
  source_file_id uuid NOT NULL REFERENCES public.files(id) ON DELETE CASCADE,
  target_file_id uuid NOT NULL REFERENCES public.files(id) ON DELETE CASCADE,
  kind text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 6. Routes
CREATE TABLE IF NOT EXISTS public.routes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id text NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  analysis_id uuid NOT NULL REFERENCES public.analyses(id) ON DELETE CASCADE,
  file_id uuid NOT NULL REFERENCES public.files(id) ON DELETE CASCADE,
  path text NOT NULL,
  method text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 7. Explanations
CREATE TABLE IF NOT EXISTS public.explanations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id text NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  analysis_id uuid NOT NULL REFERENCES public.analyses(id) ON DELETE CASCADE,
  file_id uuid NOT NULL REFERENCES public.files(id) ON DELETE CASCADE,
  content text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 8. File Roles
CREATE TABLE IF NOT EXISTS public.file_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id text NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  analysis_id uuid NOT NULL REFERENCES public.analyses(id) ON DELETE CASCADE,
  file_id uuid NOT NULL REFERENCES public.files(id) ON DELETE CASCADE,
  role text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 9. Insights
CREATE TABLE IF NOT EXISTS public.insights (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id text NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  analysis_id uuid NOT NULL REFERENCES public.analyses(id) ON DELETE CASCADE,
  kind text NOT NULL,
  title text NOT NULL,
  description text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Foreign Key Indexes
CREATE INDEX IF NOT EXISTS projects_organization_id_idx ON public.projects (organization_id);
CREATE INDEX IF NOT EXISTS analyses_organization_id_idx ON public.analyses (organization_id);
CREATE INDEX IF NOT EXISTS analyses_project_id_idx ON public.analyses (project_id);
CREATE INDEX IF NOT EXISTS files_organization_id_idx ON public.files (organization_id);
CREATE INDEX IF NOT EXISTS files_analysis_id_idx ON public.files (analysis_id);
CREATE INDEX IF NOT EXISTS edges_organization_id_idx ON public.edges (organization_id);
CREATE INDEX IF NOT EXISTS edges_analysis_id_idx ON public.edges (analysis_id);
CREATE INDEX IF NOT EXISTS edges_source_file_id_idx ON public.edges (source_file_id);
CREATE INDEX IF NOT EXISTS edges_target_file_id_idx ON public.edges (target_file_id);
CREATE INDEX IF NOT EXISTS routes_organization_id_idx ON public.routes (organization_id);
CREATE INDEX IF NOT EXISTS routes_analysis_id_idx ON public.routes (analysis_id);
CREATE INDEX IF NOT EXISTS routes_file_id_idx ON public.routes (file_id);
CREATE INDEX IF NOT EXISTS explanations_organization_id_idx ON public.explanations (organization_id);
CREATE INDEX IF NOT EXISTS explanations_analysis_id_idx ON public.explanations (analysis_id);
CREATE INDEX IF NOT EXISTS explanations_file_id_idx ON public.explanations (file_id);
CREATE INDEX IF NOT EXISTS file_roles_organization_id_idx ON public.file_roles (organization_id);
CREATE INDEX IF NOT EXISTS file_roles_analysis_id_idx ON public.file_roles (analysis_id);
CREATE INDEX IF NOT EXISTS file_roles_file_id_idx ON public.file_roles (file_id);
CREATE INDEX IF NOT EXISTS insights_organization_id_idx ON public.insights (organization_id);
CREATE INDEX IF NOT EXISTS insights_analysis_id_idx ON public.insights (analysis_id);

-- Enable Row Level Security on all 9 tables
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.analyses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.files ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.edges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.routes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.explanations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.file_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.insights ENABLE ROW LEVEL SECURITY;

-- Helper function to extract organization claim safely from JWT
CREATE OR REPLACE FUNCTION public.current_org_id()
RETURNS text
LANGUAGE sql
STABLE
SET search_path = ''
AS $$
  SELECT coalesce(
    nullif(auth.jwt()->>'org_id', ''),
    nullif(auth.jwt()->'o'->>'id', ''),
    nullif(auth.jwt()->'app_metadata'->>'org_id', '')
  );
$$;

GRANT EXECUTE ON FUNCTION public.current_org_id() TO authenticated, anon;

-- Database policies reading organization claim off the auth token
CREATE POLICY "organizations_isolation" ON public.organizations
  FOR ALL TO authenticated
  USING (id = (SELECT public.current_org_id()))
  WITH CHECK (id = (SELECT public.current_org_id()));

CREATE POLICY "projects_isolation" ON public.projects
  FOR ALL TO authenticated
  USING (organization_id = (SELECT public.current_org_id()))
  WITH CHECK (organization_id = (SELECT public.current_org_id()));

CREATE POLICY "analyses_isolation" ON public.analyses
  FOR ALL TO authenticated
  USING (organization_id = (SELECT public.current_org_id()))
  WITH CHECK (organization_id = (SELECT public.current_org_id()));

CREATE POLICY "files_isolation" ON public.files
  FOR ALL TO authenticated
  USING (organization_id = (SELECT public.current_org_id()))
  WITH CHECK (organization_id = (SELECT public.current_org_id()));

CREATE POLICY "edges_isolation" ON public.edges
  FOR ALL TO authenticated
  USING (organization_id = (SELECT public.current_org_id()))
  WITH CHECK (organization_id = (SELECT public.current_org_id()));

CREATE POLICY "routes_isolation" ON public.routes
  FOR ALL TO authenticated
  USING (organization_id = (SELECT public.current_org_id()))
  WITH CHECK (organization_id = (SELECT public.current_org_id()));

CREATE POLICY "explanations_isolation" ON public.explanations
  FOR ALL TO authenticated
  USING (organization_id = (SELECT public.current_org_id()))
  WITH CHECK (organization_id = (SELECT public.current_org_id()));

CREATE POLICY "file_roles_isolation" ON public.file_roles
  FOR ALL TO authenticated
  USING (organization_id = (SELECT public.current_org_id()))
  WITH CHECK (organization_id = (SELECT public.current_org_id()));

CREATE POLICY "insights_isolation" ON public.insights
  FOR ALL TO authenticated
  USING (organization_id = (SELECT public.current_org_id()))
  WITH CHECK (organization_id = (SELECT public.current_org_id()));

-- Grants for API roles
GRANT USAGE ON SCHEMA public TO authenticated, anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO anon;
