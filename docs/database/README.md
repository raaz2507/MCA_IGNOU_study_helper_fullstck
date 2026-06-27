# Database Documentation

The initial PostgreSQL data model is defined in
`backend/prisma/schema.prisma`.

## Email verification fields

Email verification state is stored on `User`:

| Field | Type | Purpose |
| --- | --- | --- |
| `emailVerifiedAt` | nullable timestamp | Time the current email was verified |
| `emailVerificationRequired` | boolean | Whether login requires verification |
| `emailVerificationTokenHash` | nullable unique string | SHA-256 hash of the active token |
| `emailVerificationExpiresAt` | nullable timestamp | Token expiry time |

Raw verification tokens are never stored. Successful verification clears the
hash and expiry. Existing users default to `emailVerificationRequired = false`,
so enabling the feature affects new registrations and later email changes
without unexpectedly locking established accounts.

The Admin toggle is stored in `AppSetting` under the key
`email-verification` as `{ "enabled": boolean }`. Setting changes are also
written to `AuditLog`.

Migration: `20260627120000_email_verification`.
