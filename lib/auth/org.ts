import { clerkClient } from "@clerk/nextjs/server";

export interface OrganizationSummary {
  id: string;
  name: string;
  slug: string | null;
  membersCount?: number;
}

/**
 * Ensures that a signed-in user has an organization to land in.
 *
 * If the user belongs to one or more organizations, returns the primary organization ID.
 * If the user is brand new and has no organizations, automatically creates one for them
 * so they land inside an organization workspace without having to manually create one.
 */
export async function ensureUserOrganization(userId: string): Promise<string> {
  const client = await clerkClient();
  const memberships = await client.users.getOrganizationMembershipList({
    userId,
    limit: 10,
  });

  if (memberships.data && memberships.data.length > 0) {
    return memberships.data[0].organization.id;
  }

  // Brand new account with no organization: create one automatically
  const user = await client.users.getUser(userId);
  const primaryEmail = user.emailAddresses?.[0]?.emailAddress;
  const emailPrefix = primaryEmail ? primaryEmail.split("@")[0] : null;
  const nameBase =
    user.firstName ||
    user.username ||
    emailPrefix ||
    "Workspace";

  const newOrg = await client.organizations.createOrganization({
    name: `${nameBase}'s Team`,
    createdBy: userId,
  });

  return newOrg.id;
}

/**
 * Reads organization details during server rendering.
 */
export async function getOrganizationDetails(
  organizationId: string
): Promise<OrganizationSummary | null> {
  try {
    const client = await clerkClient();
    const org = await client.organizations.getOrganization({ organizationId });
    return {
      id: org.id,
      name: org.name,
      slug: org.slug,
      membersCount: org.membersCount,
    };
  } catch (error) {
    console.error("Failed to fetch organization details for", organizationId, error);
    return {
      id: organizationId,
      name: "Team Workspace",
      slug: null,
    };
  }
}
