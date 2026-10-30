-- Seed data for Phase 2 Acceptance Verification
-- Two distinct organizations with seeded projects and analyses

-- Ensure organizations exist
INSERT INTO public.organizations (id, name, created_at)
VALUES
  ('org_3KdmmumqScslfMmWuoQkc9mKsHG', 'Yacenn''s Team', now() - interval '2 days'),
  ('org_3KdoeRCYhtwiJVe6Fq8gaO8Deq9', 'fdvbdf', now() - interval '2 days')
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name;

-- 1. Seed for Organization 1: Yacenn's Team (org_3KdmmumqScslfMmWuoQkc9mKsHG)
DO $$
DECLARE
  v_org_id text := 'org_3KdmmumqScslfMmWuoQkc9mKsHG';
  v_proj_id uuid;
  v_analysis_comp uuid;
  v_analysis_run uuid;
  v_analysis_fail uuid;
  v_file_page uuid;
  v_file_builder uuid;
  v_file_parser uuid;
BEGIN
  -- Project
  INSERT INTO public.projects (id, organization_id, name, repo_url, created_at)
  VALUES (gen_random_uuid(), v_org_id, 'cartograph', 'https://github.com/yacenne/code-graph', now() - interval '2 days')
  RETURNING id INTO v_proj_id;

  -- Analysis 1: Completed
  INSERT INTO public.analyses (id, organization_id, project_id, status, commit_hash, branch, file_count, edge_count, coverage_percent, created_at, updated_at)
  VALUES (gen_random_uuid(), v_org_id, v_proj_id, 'completed', '735f414', 'main', 61, 184, 95.20, now() - interval '2 hours', now() - interval '2 hours')
  RETURNING id INTO v_analysis_comp;

  -- Analysis 2: Analyzing (Running)
  INSERT INTO public.analyses (id, organization_id, project_id, status, commit_hash, branch, file_count, edge_count, coverage_percent, created_at, updated_at)
  VALUES (gen_random_uuid(), v_org_id, v_proj_id, 'analyzing', '8a12d9f', 'feat/ast-indexer', 45, 110, 72.00, now() - interval '15 minutes', now() - interval '15 minutes')
  RETURNING id INTO v_analysis_run;

  -- Analysis 3: Failed
  INSERT INTO public.analyses (id, organization_id, project_id, status, commit_hash, branch, file_count, edge_count, coverage_percent, error_message, created_at, updated_at)
  VALUES (gen_random_uuid(), v_org_id, v_proj_id, 'failed', 'c39fa01', 'exp/wasm-tree-sitter', 12, 4, 14.50, 'Native binding tree-sitter.node incompatible with host architecture', now() - interval '1 day', now() - interval '1 day')
  RETURNING id INTO v_analysis_fail;

  -- Seed files for completed analysis
  INSERT INTO public.files (id, organization_id, analysis_id, path, fan_in, fan_out, created_at)
  VALUES (gen_random_uuid(), v_org_id, v_analysis_comp, 'app/page.tsx', 0, 6, now() - interval '2 hours')
  RETURNING id INTO v_file_page;

  INSERT INTO public.files (id, organization_id, analysis_id, path, fan_in, fan_out, created_at)
  VALUES (gen_random_uuid(), v_org_id, v_analysis_comp, 'lib/graph/builder.ts', 2, 8, now() - interval '2 hours')
  RETURNING id INTO v_file_builder;

  INSERT INTO public.files (id, organization_id, analysis_id, path, fan_in, fan_out, created_at)
  VALUES (gen_random_uuid(), v_org_id, v_analysis_comp, 'lib/parser/index.ts', 4, 12, now() - interval '2 hours')
  RETURNING id INTO v_file_parser;

  -- Seed edges
  INSERT INTO public.edges (id, organization_id, analysis_id, source_file_id, target_file_id, kind, created_at)
  VALUES
    (gen_random_uuid(), v_org_id, v_analysis_comp, v_file_page, v_file_builder, 'import', now() - interval '2 hours'),
    (gen_random_uuid(), v_org_id, v_analysis_comp, v_file_builder, v_file_parser, 'import', now() - interval '2 hours');

  -- Seed routes
  INSERT INTO public.routes (id, organization_id, analysis_id, file_id, path, method, created_at)
  VALUES (gen_random_uuid(), v_org_id, v_analysis_comp, v_file_page, '/', 'GET', now() - interval '2 hours');

  -- Seed explanations
  INSERT INTO public.explanations (id, organization_id, analysis_id, file_id, content, created_at)
  VALUES (gen_random_uuid(), v_org_id, v_analysis_comp, v_file_builder, 'Constructs dependency graph from syntax imports without guessing.', now() - interval '2 hours');

  -- Seed file roles
  INSERT INTO public.file_roles (id, organization_id, analysis_id, file_id, role, created_at)
  VALUES
    (gen_random_uuid(), v_org_id, v_analysis_comp, v_file_page, 'page', now() - interval '2 hours'),
    (gen_random_uuid(), v_org_id, v_analysis_comp, v_file_parser, 'parser-core', now() - interval '2 hours');

  -- Seed insights
  INSERT INTO public.insights (id, organization_id, analysis_id, kind, title, description, created_at)
  VALUES (gen_random_uuid(), v_org_id, v_analysis_comp, 'fanout', 'Central parser module', 'lib/parser/index.ts resolves syntax imports across 12 downstream dependencies.', now() - interval '2 hours');
END $$;

-- 2. Seed for Organization 2: fdvbdf (org_3KdoeRCYhtwiJVe6Fq8gaO8Deq9)
DO $$
DECLARE
  v_org_id text := 'org_3KdoeRCYhtwiJVe6Fq8gaO8Deq9';
  v_proj_id uuid;
  v_analysis_comp uuid;
  v_analysis_pend uuid;
  v_file_server uuid;
  v_file_config uuid;
BEGIN
  -- Project
  INSERT INTO public.projects (id, organization_id, name, repo_url, created_at)
  VALUES (gen_random_uuid(), v_org_id, 'next.js', 'https://github.com/vercel/next.js', now() - interval '1 day')
  RETURNING id INTO v_proj_id;

  -- Analysis 1: Completed
  INSERT INTO public.analyses (id, organization_id, project_id, status, commit_hash, branch, file_count, edge_count, coverage_percent, created_at, updated_at)
  VALUES (gen_random_uuid(), v_org_id, v_proj_id, 'completed', 'd5e891a', 'v16.3-canary', 320, 890, 98.40, now() - interval '5 hours', now() - interval '5 hours')
  RETURNING id INTO v_analysis_comp;

  -- Analysis 2: Pending
  INSERT INTO public.analyses (id, organization_id, project_id, status, commit_hash, branch, file_count, edge_count, coverage_percent, created_at, updated_at)
  VALUES (gen_random_uuid(), v_org_id, v_proj_id, 'pending', 'f04b321', 'staging', 0, 0, 0.00, now() - interval '10 minutes', now() - interval '10 minutes')
  RETURNING id INTO v_analysis_pend;

  -- Files
  INSERT INTO public.files (id, organization_id, analysis_id, path, fan_in, fan_out, created_at)
  VALUES (gen_random_uuid(), v_org_id, v_analysis_comp, 'packages/next/server/base-server.ts', 18, 25, now() - interval '5 hours')
  RETURNING id INTO v_file_server;

  INSERT INTO public.files (id, organization_id, analysis_id, path, fan_in, fan_out, created_at)
  VALUES (gen_random_uuid(), v_org_id, v_analysis_comp, 'packages/next/server/config.ts', 25, 4, now() - interval '5 hours')
  RETURNING id INTO v_file_config;

  -- Edges
  INSERT INTO public.edges (id, organization_id, analysis_id, source_file_id, target_file_id, kind, created_at)
  VALUES (gen_random_uuid(), v_org_id, v_analysis_comp, v_file_server, v_file_config, 'import', now() - interval '5 hours');

  -- Routes
  INSERT INTO public.routes (id, organization_id, analysis_id, file_id, path, method, created_at)
  VALUES (gen_random_uuid(), v_org_id, v_analysis_comp, v_file_server, '/_next/image', 'GET', now() - interval '5 hours');

  -- Explanations
  INSERT INTO public.explanations (id, organization_id, analysis_id, file_id, content, created_at)
  VALUES (gen_random_uuid(), v_org_id, v_analysis_comp, v_file_server, 'Core HTTP request server handling Next.js rendering lifecycle.', now() - interval '5 hours');

  -- File roles
  INSERT INTO public.file_roles (id, organization_id, analysis_id, file_id, role, created_at)
  VALUES (gen_random_uuid(), v_org_id, v_analysis_comp, v_file_server, 'server-core', now() - interval '5 hours');

  -- Insights
  INSERT INTO public.insights (id, organization_id, analysis_id, kind, title, description, created_at)
  VALUES (gen_random_uuid(), v_org_id, v_analysis_comp, 'blast_radius', 'Core server entrypoint', 'base-server.ts has 18 incoming dependencies across the framework runtime.', now() - interval '5 hours');
END $$;
