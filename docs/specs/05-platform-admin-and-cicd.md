# Platform operations and release

Administrators review vendors, curate categories/collections, reconcile settled funding and charitable transfers, review audit logs, and reclaim expired escrow. Accounts are created only through the deployment bootstrap script.

CI verifies lint, schemas, SQLite/PostgreSQL migrations, domain tests, types, and production builds. The release workflow publishes a container image. Deployment applies reviewed PostgreSQL migrations before starting the app and email worker. See the root README for environment variables and operational requirements.
