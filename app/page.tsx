import { auth } from "@clerk/nextjs/server";
import { ensureUserOrganization, getOrganizationDetails } from "@/lib/auth/org";
import { OrgActivator } from "@/components/auth/org-activator";
import { AppShell } from "@/components/shell/app-shell";

/**
 * Root Application Workspace (Server Component).
 * 
 * - The active organization is read directly from the session claims during server rendering.
 * - If a user is signing in for the first time without an active organization,
 *   ensureUserOrganization provisions/locates one automatically and activates it into the session.
 * - The organization name and ID are rendered into the initial HTML payload (first paint).
 */
export default async function Page() {
  const { userId, orgId, orgRole } = await auth();

  if (userId && !orgId) {
    const targetOrgId = await ensureUserOrganization(userId);
    return <OrgActivator organizationId={targetOrgId} />;
  }

  const organization = orgId ? await getOrganizationDetails(orgId) : null;

  return <AppShell organization={organization} orgRole={orgRole} />;
}
