# API Documentation

All routes use the `/api` prefix. Request and response bodies are JSON unless
noted otherwise. Authentication uses HTTP-only access and refresh cookies.

## Email verification endpoints

### `POST /api/auth/register`

Creates a user and, when verification is enabled, sends a Resend email.

```json
{
  "displayName": "Student Name",
  "username": "student_name",
  "email": "student@example.com",
  "password": "minimum-eight-characters"
}
```

The `201` response includes `status`, `verificationRequired` and `emailSent`.
Account creation is retained if email delivery fails, allowing the user to use
the resend endpoint.

### `POST /api/auth/verify-email`

Consumes a single-use token from the verification link.

```json
{ "token": "64-character-token" }
```

Returns `{ "success": true }`. Invalid or expired tokens return `400` with
code `INVALID_VERIFICATION_TOKEN`.

### `POST /api/auth/resend-verification`

Requests a fresh 24-hour link.

```json
{ "email": "student@example.com" }
```

Returns `{ "accepted": true }` for unknown, already verified and eligible
addresses to avoid exposing whether an account exists. The route is limited to
five requests per IP per hour.

### `POST /api/auth/login`

Returns `403` with code `EMAIL_NOT_VERIFIED` when verification is enabled and
the account has a pending verification requirement. Account status restrictions
are evaluated before email verification.

## Admin setting endpoints

Both routes require the `ADMIN` role.

### `GET /api/admin/settings/email-verification`

Returns:

```json
{
  "enabled": false,
  "configured": true,
  "fromEmail": "GyanPath <verify@example.com>"
}
```

The Resend API key is never included.

### `PUT /api/admin/settings/email-verification`

```json
{ "enabled": true }
```

Enabling returns `400` with code `EMAIL_PROVIDER_NOT_CONFIGURED` unless
`RESEND_API_KEY` and `RESEND_FROM_EMAIL` are available to the server. Changes
are written to `AppSetting` and recorded in `AuditLog`.

## Rate limits

- Register: 10 requests per IP per hour
- Verify token: 20 requests per IP per 15 minutes
- Resend verification: 5 requests per IP per hour
- Login: 20 requests per IP per 15 minutes
