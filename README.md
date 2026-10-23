# Snappy Atelier

Corporate gifting with recipient choice, vendor-managed fulfillment, and auditable company wallets.

**Stack:** Next.js 16.4.2, React 19.3.1, stable NextAuth 4.24.15, Prisma 7.10.1, TypeScript, Tailwind CSS. Prisma 8 and NextAuth 5 are prereleases and are intentionally not used.

There are no seeded accounts, products, gifts, balances, demo sign-ins, or sample shipping scans. New installations start empty.

## Local development

Use Node.js 24 LTS (minimum 22.12).

```bash
npm ci
cp .env.example .env
openssl rand -hex 32
# Put the generated value in AUTH_SECRET in .env.
npm run setup
npm run dev
```

`DATABASE_URL="file:./prisma/dev.db"` uses SQLite. File paths are relative to the repository root, including Prisma CLI and runtime adapters. Setup applies versioned migrations; it never seeds or resets data.

For local email capture, run Mailpit:

```bash
docker run --rm --name snappy-mailpit \
  -p 127.0.0.1:1025:1025 -p 127.0.0.1:8025:8025 axllent/mailpit
npm run mail:deliver
```

Mailpit's inbox is at http://localhost:8025. Run `mail:deliver` periodically while developing. Registration, verification, password reset, and gift dispatch enqueue email transactionally; successful enqueue does not mean SMTP delivery. Delivery failures remain in `EmailMessage` for retry and produce nonzero worker exit status.

## First administrator

Administrators can only be bootstrapped using the deployment CLI, never an HTTP endpoint. Set these environment variables securely:

```text
BOOTSTRAP_ADMIN_EMAIL=<operator email>
BOOTSTRAP_ADMIN_NAME=<operator name>
BOOTSTRAP_ADMIN_PASSWORD=<unique password of at least 16 characters>
```

```bash
npm run bootstrap:admin
```

Remove the bootstrap variables immediately afterward. The command refuses to overwrite users or run when an administrator already exists. Sign in at `/auth/admin`.

## Real workflows

1. Corporate customers register at `/auth/corporate` and verify their email. Their wallet starts at zero.
2. Vendors register at `/auth/vendor`, verify their email, and create products using their own HTTPS-hosted photography. Vendors start **PENDING**; an administrator approves them before their products become eligible.
3. Administrators curate categories and collections, then reconcile **funds already received** using a company, amount, and unique bank/payment settlement reference. Retrying a reference cannot credit the wallet twice.
4. Senders create campaigns and enter real recipient emails. Gift budgets are reserved atomically and invitation emails are queued. Launch requests use an idempotency key so retries cannot send or charge twice. Direct links are available in the sender dashboard for manual distribution.
5. Recipients open a high-entropy bearer invitation or look up a code with its matching email. They choose an eligible gift and enter delivery details. Recipient accounts require email verification before existing gifts and addresses are linked.
6. Vendors record actual carrier/tracking information and fulfillment checkpoints. No carrier API integration or fabricated tracking is provided. Dispatch locks recipient edits; delivered orders cannot move backward.
7. Unused gift budget and expired invitations return to the company ledger. Pre-dispatch swaps reconcile inventory and earnings and cannot overdraw the sender's wallet.

Charity selections are **pending settlement**, not completed donations. An administrator arranges an actual transfer externally and records its unique reference under the logistics tab before totals show a completed donation. Vendor earnings are accrued obligations, not proof of an executed payout.

**External operations:** bank/payment collection, vendor payouts, tax/KYB checks, carrier shipping, and charity transfers are operator-managed. This app does not pretend these external services have run. Automated HRIS triggers and the former environment-specific AI image generator are not exposed.

## Authentication and privacy

NextAuth manages CSRF-protected credential sign-in, encrypted JWT sessions, secure production cookies, and sign-out. Passwords use asynchronous scrypt with independent random salts. Verification/reset links are expiring, single-use tokens stored as hashes. Password reset revokes existing sessions using a database-backed session version. Authorization loads the current user and role on every protected request.

Sensitive APIs are uncached, cross-origin mutations are rejected, and login/account-email/claim lookups have shared database-backed rate limits. Put an additional rate limiter and request-body limit at the trusted ingress for Internet deployment. Claim links are bearer credentials: share only with the intended recipient, avoid logging full claim URLs, and do not include third-party analytics on claim pages. A bearer link does not grant access to the recipient's saved address book.

NextAuth v4's optional Nodemailer peer is overridden to patched Nodemailer 10.2.1; only the Credentials provider is enabled. The app's mail worker uses Nodemailer directly.

## SQLite and PostgreSQL migrations

`prisma/schema.prisma` is the canonical portable SQLite schema. `npm run db:generate` synchronizes `prisma/postgresql/schema.prisma`, then generates the client for `DATABASE_URL`. It does **not** rewrite the canonical provider. `prisma.config.ts` chooses the matching schema and migration history:

| Environment | URL | Adapter | Migrations |
|---|---|---|---|
| Development | `file:./prisma/dev.db` | better-sqlite3 | `prisma/migrations` |
| Production | `postgresql://.../snappy?schema=public` | node-postgres | `prisma/postgresql/migrations` |

Production runtime refuses SQLite. There is no destructive `db push`, reset, or production seeding command.

After a model change, create and review a migration for **each** database provider, synchronize schemas, and commit both migration histories. `npm run db:validate:all` detects schema drift; CI exercises migrations against real SQLite and PostgreSQL.

For an old sandbox database, keep a backup and choose a new empty database for this release. It does not automatically delete or migrate sandbox users or balances into a production instance. Existing nonempty databases require a separately reviewed data migration/baseline rather than a destructive reset.

## Production deployment

Provision PostgreSQL, an HTTPS hostname/reverse proxy, a transactional SMTP service, and a verified sender. Supply:

```text
DATABASE_URL=postgresql://USER:PASSWORD@HOST:5432/snappy?schema=public
AUTH_SECRET=<at least 32 random characters>
NEXTAUTH_URL=https://gifts.example.com
SMTP_URL=smtps://USER:PASSWORD@SMTP_HOST:465
EMAIL_FROM=Snappy <gifts@example.com>
```

```bash
npm ci
npm run db:generate
npm run db:deploy
npm run build
npm start
```

Run `npm run mail:deliver` at least once a minute, or use the Compose mail worker. Multiple workers claim messages with a database lease; retries use a stable Message-ID. SMTP is at-least-once delivery, so a crash after acceptance may cause a duplicate email, not duplicate financial activity. Monitor worker failures, pending/old `EmailMessage` rows, and application logs.

Docker deployment:

```bash
# Also set POSTGRES_PASSWORD; DATABASE_URL must use the Compose host "postgres".
docker compose -f docker-compose.postgres.yml up --build -d
docker compose -f docker-compose.postgres.yml exec \
  -e BOOTSTRAP_ADMIN_EMAIL -e BOOTSTRAP_ADMIN_NAME -e BOOTSTRAP_ADMIN_PASSWORD \
  app npm run bootstrap:admin
```

Compose waits for PostgreSQL and a successful migration job before starting the unprivileged app and mail worker. Only loopback port 3000 is published; terminate TLS at your reverse proxy. The container image contains no `.env` or local database. The release workflow publishes a GHCR image; it does not silently modify a live database or claim to deploy infrastructure.

`GET /api/health` performs a database query and returns 200 or 503 without revealing counts or database errors. Back up PostgreSQL, rehearse restores, configure TLS/backups/monitoring, and reconcile real payment references before launch.

## Verification

```bash
npm run lint
npm run db:validate:all
npm test
npx playwright install chromium
npm run test:e2e
TEST_DATABASE_URL="postgresql://USER:PASSWORD@localhost:5432/snappy_test" npm test
npm run build
npm run typecheck
```

Tests use temporary SQLite databases or a random PostgreSQL schema, never `DATABASE_URL` from your working environment. PostgreSQL test database names must start with `snappy_test`. Test schemas are removed afterward; there is no test-only HTTP account or session bypass. Browser tests exercise actual enrollment, verification, NextAuth sessions, sign-out, tenant/role protection, and the complete vendor/payment/campaign/claim/fulfillment lifecycle. Set `TEST_SMTP_URL` to a local capture server to exercise actual SMTP delivery as well.
