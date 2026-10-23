# ADR 0003: Authentication and enrollment

Accepted. NextAuth's stable Credentials provider owns sign-in, CSRF protection, JWT cookies, and sign-out. Prisma stores accounts with random-salt scrypt hashes and verified email ownership. Verification/reset tokens expire, are single-use, and are stored as hashes. Password resets increment a session version checked against the database.

Corporate and recipient enrollment never creates money or grants privileged roles. Vendor enrollment always requires approval. Existing recipient data is linked only after email verification. Administrators are provisioned by `npm run bootstrap:admin`; there is no public bootstrap or persona-switch endpoint.

Authorization must use the current database role and tenant IDs rather than trusting mutable request data or stale token claims.
