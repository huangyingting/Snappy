# Product requirements

Provide four authenticated workspaces: corporate sender, vendor partner, recipient, and platform administrator.

The application starts empty and supports verified account creation, vendor review, catalog curation, manually reconciled funding, campaign invitations, choice-driven claims, recipient delivery management, and vendor-recorded fulfillment. Financial activity must be auditable and transactional; external payments, payouts, charity transfers, and carrier activity must never be simulated.

Development uses SQLite. Production uses PostgreSQL, HTTPS, strong secrets, real SMTP, versioned migrations, an email delivery worker, and operator-managed backups and monitoring. See the root README for the supported operational contract and verification commands.
