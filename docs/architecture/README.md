# Architecture

GyanPath uses a modular monolith backend and a separate modular JavaScript
frontend. Shared UI is rendered through client-side components.

## Email verification flow

```text
Signup / profile email change
        |
Auth service checks AppSetting
        |
Generate random token -> store SHA-256 hash and 24-hour expiry
        |
Resend HTTPS API sends SITE_URL verification link
        |
Frontend consumes token through POST /api/auth/verify-email
        |
User is marked verified and token fields are cleared
```

Resend is called directly from the backend with `fetch`; no provider secret is
stored in PostgreSQL or sent to the frontend. The Admin UI reads only
`enabled`, `configured` and the sender address. Disabling the setting bypasses
verification enforcement while preserving pending state for accounts that were
created while it was enabled.
