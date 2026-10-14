# ADR 0001: Next.js App Router, Full-Stack Architecture & Design System

## Status
Accepted

## Context
The Snappy gifting platform serves four distinct user roles (`CORPORATE`, `VENDOR`, `RECIPIENT`, `ADMIN`) with interactive dashboards, public/semi-public magic gift claim links (`/claim/[token]`), and transactional mutations (wallet funding, escrow locking, gift claiming, vendor shipping updates, admin governance).

We need a cohesive, maintainable, type-safe architecture that supports server-rendered performance, RESTful JSON API routes for programmatic and testable domain operations, and a modern, high-craft UI.

## Decision
1. **Framework**: Use **Next.js (App Router)** with **TypeScript** (`strict: true`).
2. **Domain Service Layer**: Encapsulate core business logic in `src/lib/services/` so both Next.js API Route Handlers (`src/app/api/...`) and automated integration tests can invoke deterministic domain functions with database transactions.
3. **API Layer**: Expose structured REST endpoints under `/api/auth/*`, `/api/corporate/*`, `/api/vendor/*`, `/api/recipient/*`, `/api/claim/*`, and `/api/admin/*` with role-based access control and Zod input validation.
4. **UI Philosophy**: Follow an iOS-inspired, modern GenAI/SaaS aesthetic:
   - Task-focused workspaces per role with progressive disclosure rather than cluttered multi-modal popups.
   - Bright, high-contrast surfaces, crisp typography, clear status pills, and smooth inline workflows.

## Consequences
- **Positive**: Single deployable unit for UI and API; shared TypeScript types from Prisma schema through API to React components; straightforward testing of domain services and API endpoints.
- **Negative**: Requires careful separation between Server Components, Client Components, and server-only Prisma utilities.
