# UML Sequence Diagram

## Explanation

This sequence diagram shows registration, Resend email verification, login, question-bank browsing and progress saving across the frontend, Express modules, Prisma and PostgreSQL.

```mermaid
sequenceDiagram
    actor Student as Student / Learner
    participant Browser as Frontend Page
    participant API as Express REST API
    participant Auth as Auth Module
    participant Questions as Questions Module
    participant Progress as Progress Module
    participant Resend as Resend Email API
    participant Prisma as Prisma ORM
    participant DB as PostgreSQL

    Student->>Browser: Submit registration details
    Browser->>API: POST /api/auth/register
    API->>Auth: Validate input and create account
    Auth->>Prisma: Read email-verification AppSetting
    Prisma->>DB: Read setting and check unique user fields
    alt Email verification enabled
        Auth->>Auth: Generate token and SHA-256 hash
        Auth->>Prisma: Store hash, required flag and 24-hour expiry
        Prisma->>DB: Write verification state
        Auth->>Resend: POST /emails with verification link
        Resend-->>Student: Deliver verification email
        Student->>Browser: Open verification link
        Browser->>API: POST /api/auth/verify-email
        API->>Auth: Hash and validate token
        Auth->>Prisma: Mark verified and clear token fields
        Prisma->>DB: Update User
        API-->>Browser: Email verified
    else Email verification disabled
        Auth->>Prisma: Create account without verification requirement
    end

    Student->>Browser: Enter username and password
    Browser->>API: POST /api/auth/login
    API->>Auth: Validate credentials, account status and email state
    Auth->>Prisma: Find user and create refresh session
    Prisma->>DB: Read User and write Session
    DB-->>Prisma: User and session data
    Prisma-->>Auth: Authenticated user
    Auth-->>API: Access and refresh tokens
    API-->>Browser: Set secure cookies and return user

    Student->>Browser: Open question bank for a subject
    Browser->>API: GET /api/questions/manifest?subject=code
    API->>Questions: Load question manifest
    Questions->>Prisma: Query questions for subject
    Prisma->>DB: Read Subject and Question records
    DB-->>Prisma: Question list
    Prisma-->>Questions: Manifest data
    Questions-->>API: Question manifest
    API-->>Browser: Display question list

    Student->>Browser: Select a question
    Browser->>API: GET /api/questions/item?subject=code&file=id
    API->>Questions: Load question item
    Questions->>Prisma: Query question and answers
    Prisma->>DB: Read Question and Answer records
    DB-->>Prisma: Question details
    Prisma-->>Questions: Question data
    Questions-->>API: Question with answer modes
    API-->>Browser: Display question and answer

    Student->>Browser: Mark completed, bookmark or revision
    Browser->>API: PUT /api/progress?subject=code
    API->>Progress: Verify authenticated user and save state
    Progress->>Prisma: Upsert Progress records
    Prisma->>DB: Write progress state
    DB-->>Prisma: Saved records
    Prisma-->>Progress: Saved progress
    Progress-->>API: Updated state
    API-->>Browser: Show saved progress
```

## Notes / Assumptions

- Authentication uses HTTP-only cookies named by the backend for access and refresh tokens.
- Verification links are single-use, expire after 24 hours and contain the raw token only in transit; PostgreSQL stores its SHA-256 hash.
- `POST /api/auth/resend-verification` rotates the token and returns a generic accepted response to reduce account enumeration.
- If Resend delivery fails during registration, the account remains created and the user can request another link.
- The frontend API client retries once through `/api/auth/refresh` when an authenticated request receives `401`.
- The diagram shows the database-backed flow; static resource pages and PDF viewing use served frontend assets in addition to API data.
