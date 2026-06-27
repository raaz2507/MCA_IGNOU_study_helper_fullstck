# Backend Modules

Each feature folder owns its routes, service logic, validation and persistence
code. Modules communicate through explicit service interfaces instead of
accessing each other's internals.

## Authentication module

`auth/` owns registration, login, refresh sessions, profile/password updates
and email verification. Verification tokens are generated as random values,
stored only as SHA-256 hashes, expire after 24 hours and are cleared after use.
Resend delivery is isolated in `email-verification.service.ts`; routes and
controllers never expose `RESEND_API_KEY`.

Public verification endpoints are rate limited. Unknown and ineligible resend
requests return the same accepted response, reducing account-enumeration
leakage.
