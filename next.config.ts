import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  // Force Next.js / Vercel serverless trace to include the Prisma query
  // engine binary (which lives in our custom output path src/generated/prisma).
  // Without this, the engine isn't packaged with the function and we get
  // "Prisma Client could not locate the Query Engine for runtime" at runtime.
  outputFileTracingIncludes: {
    "/api/**": [
      path.join(process.cwd(), "src/generated/prisma/**/*"),
      "./node_modules/.prisma/client/**/*",
    ],
    "/**": [
      path.join(process.cwd(), "src/generated/prisma/**/*"),
      "./node_modules/.prisma/client/**/*",
    ],
  },

  // Treat Prisma adapter / libsql as external — they are CommonJS
  // and shouldn't be bundled by webpack (we lazy-require them).
  serverExternalPackages: [
    "@prisma/client",
    "@prisma/adapter-libsql",
    "@libsql/client",
  ],
};

export default nextConfig;
