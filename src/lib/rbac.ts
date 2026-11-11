import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { MembershipRole } from "@prisma/client";

const roleHierarchy: MembershipRole[] = [
  MembershipRole.VIEWER,
  MembershipRole.AGENT,
  MembershipRole.ADMIN,
  MembershipRole.OWNER,
];

function roleLevel(role: MembershipRole): number {
  return roleHierarchy.indexOf(role);
}

export async function requireAuth() {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("Unauthorized");
  }
  return session.user as { id: string; name: string; email: string };
}

export async function requireTenantMember(
  tenantSlug: string,
  minRole: MembershipRole = MembershipRole.VIEWER,
) {
  const user = await requireAuth();

  const membership = await prisma.tenantMembership.findFirst({
    where: {
      userId: user.id,
      tenant: { slug: tenantSlug },
    },
    include: { tenant: true },
  });

  if (!membership) {
    throw new Error("Forbidden: not a member of this workspace");
  }

  if (roleLevel(membership.role) < roleLevel(minRole)) {
    throw new Error(
      `Forbidden: this action requires ${minRole} role or higher`,
    );
  }

  return { user, membership, tenant: membership.tenant };
}
