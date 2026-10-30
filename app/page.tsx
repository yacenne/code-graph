import { auth } from "@clerk/nextjs/server";
import { ensureUserOrganization, getOrganizationDetails } from "@/lib/auth/org";
import { OrgActivator } from "@/components/auth/org-activator";
import { AppShell } from "@/components/shell/app-shell";
import { getAnalyses } from "@/lib/supabase/analyses";

/**
 * Root Application Workspace & Dashboard (Server Component).
 * 
 * - Organization is resolved from session claims during server rendering.
 * - If user has no active organization selected, auto-activates their organization.
 * - Analyses list is fetched directly from Supabase carrying the session token.
 * - CRITICAL CONSTRAINT: Application code does NOT filter by organization.
 *   Database Row-Level Security policies filter rows by organization claim on the token.
 */
export default async function Page() {
  const { userId, orgId, orgRole } = await auth();

  if (userId && !orgId) {
    const targetOrgId = await ensureUserOrganization(userId);
    return <OrgActivator organizationId={targetOrgId} />;
  }

  const [organization, analyses] = await Promise.all([
    orgId ? getOrganizationDetails(orgId) : Promise.resolve(null),
    orgId ? getAnalyses() : Promise.resolve([]),
  ]);

  return (
    <AppShell
      organization={organization}
      orgRole={orgRole}
      analyses={analyses}
    />
  );
}
