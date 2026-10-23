# ADR 0001: Application architecture

Accepted. Use stable Next.js App Router, React, TypeScript, NextAuth, and Prisma.

Route handlers enforce authorization using the current database user. Domain services implement catalog, funding, escrow, redemption, and fulfillment. Shared serializable transactions protect financial and inventory updates. Client workspaces display persisted data and real empty states, never fabricated records.

Use the versions, setup, and deployment instructions in the root README. Prerelease framework versions are not selected just because an npm `latest` tag points to one.
