/**
 * Platform-owner authorization.
 *
 * The "platform owner" is YOU — the person who runs Hyve as a SaaS for
 * other businesses. Only they should see the platform admin panel
 * (access requests, all tenants, service-bot health, etc.) — not the
 * regular workspace owners who log in as clients.
 *
 * Configured via env: PLATFORM_OWNER_EMAILS (comma-separated). If not
 * set we fall back to a hardcoded default so the production deploy
 * works out of the box for the original installer.
 */

const FALLBACK_OWNERS = ["adamax.you@gmail.com", "adamax140@outlook.com"];

function getOwnerSet(): Set<string> {
  const env = process.env.PLATFORM_OWNER_EMAILS ?? "";
  const list = env
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
  if (list.length === 0) {
    return new Set(FALLBACK_OWNERS.map((e) => e.toLowerCase()));
  }
  return new Set(list);
}

export function isPlatformOwner(email?: string | null): boolean {
  if (!email) return false;
  return getOwnerSet().has(email.toLowerCase());
}

/**
 * Login-key form — the auth.email field can hold either a real email
 * (legacy users) or a generated login (e.g. `hyve_xxxxxxxx`). For
 * platform-owner detection we just match against either.
 */
