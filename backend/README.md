# GyanPath Node.js Backend

The backend uses Node.js 26, Express 5, TypeScript, Prisma and PostgreSQL in a
modular-monolith architecture.

## Run

From the repository root:

```text
npm.cmd install
npm.cmd run prisma:generate
npm.cmd run prisma:migrate
npm.cmd run prisma:seed
npm.cmd run dev
```

Open `http://127.0.0.1:3000`.

Production-style commands:

```text
npm.cmd run build
npm.cmd start
```

## Backend-owned features

- Frontend page and static-asset serving
- Subject and paper catalog APIs
- Question-bank manifest and question APIs
- Bcrypt password hashing
- JWT access and refresh tokens in cookies
- Refresh sessions stored in PostgreSQL
- Role-based authorization
- Resend email verification with hashed, single-use, 24-hour tokens
- Login enforcement and verification-email resend endpoint
- Admin-controlled email-verification setting
- Student progress, bookmarks and revision persistence
- Banner, lecture and contributor persistence
- Protected Admin/Editor content operations
- Socket.IO and optional Redis/BullMQ foundation
- Validation, rate limiting, security headers, logging and centralized errors

The application uses the locally installed Windows PostgreSQL server through
Prisma. Docker is not used by this project. Configure the connection in
`backend/.env` using `backend/.env.example` as the safe template.

## Email verification configuration

Set the following server-side environment variables:

```text
SITE_URL=https://your-public-domain.example
RESEND_API_KEY=re_your_api_key
RESEND_FROM_EMAIL=GyanPath <verify@your-verified-domain.example>
```

`RESEND_FROM_EMAIL` must use a domain verified in Resend. The Admin setting
cannot be enabled until both Resend values are configured. The API key is read
only by the backend and must never be committed or exposed to frontend code.

Apply migrations after pulling schema changes:

```text
npm.cmd run prisma:generate
npx prisma migrate deploy --schema backend/prisma/schema.prisma
```
