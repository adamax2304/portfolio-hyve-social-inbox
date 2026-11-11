import type { NextAuthConfig } from "next-auth";

// Edge-safe auth config: no Prisma, no Node.js-only modules.
// Used by the proxy (middleware) to verify JWT tokens without a DB round-trip.
export const authConfig: NextAuthConfig = {
  pages: {
    signIn: "/",
  },
  callbacks: {
    authorized({ auth }) {
      return !!auth?.user;
    },
  },
  providers: [],
};
