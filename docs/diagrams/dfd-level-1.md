# DFD Level-1

## Explanation

This Level-1 DFD decomposes the main system into implemented backend processes: authentication, catalog/resource browsing, question bank access, progress tracking, content management, analytics and admin management.

```mermaid
flowchart TB
    Student["Student / Learner"]
    Editor["Editor"]
    Admin["Administrator"]

    P1(("1. Authentication<br/>and Profile"))
    P2(("2. Catalog and<br/>Resource Browsing"))
    P3(("3. Question Bank<br/>Access"))
    P4(("4. Progress<br/>Tracking"))
    P5(("5. Content<br/>Management"))
    P6(("6. Analytics<br/>Tracking"))
    P7(("7. Admin<br/>Management"))

    Users[("D1 Users and Sessions")]
    Learning[("D2 Subjects, Papers,<br/>Study Materials, Questions, Answers")]
    Progress[("D3 Progress and Notes")]
    Content[("D4 Banners, Lectures,<br/>Contributors")]
    AdminData[("D5 Semesters, Assignments,<br/>Reports, Settings, Audit Logs")]
    Analytics[("D6 Analytics Visits")]
    Files[("D7 Static PDFs and Assets")]
    YouTube["YouTube oEmbed"]
    Resend["Resend Email API"]

    Student -->|"Register, verify/resend email, login, refresh, logout, update profile/password"| P1
    P1 <-->|"User, hashed verification token and refresh session data"| Users
    P1 -->|"Verification email request"| Resend
    Resend -->|"Verification link"| Student
    P1 -->|"Authenticated session details"| Student

    Student -->|"Browse catalog, subjects, papers, materials"| P2
    P2 -->|"Read subjects, papers and material metadata"| Learning
    P2 -->|"Serve linked files"| Files
    P2 -->|"Catalog and resource results"| Student

    Student -->|"Request question manifest or question item"| P3
    P3 -->|"Read questions and answers"| Learning
    P3 -->|"Question bank data"| Student

    Student -->|"Save or load completed, bookmark and revision state"| P4
    P4 -->|"Validate authenticated user"| Users
    P4 <-->|"Progress records"| Progress
    P4 -->|"Saved progress state"| Student

    Editor -->|"Create/update banners, lectures, contributors"| P5
    Admin -->|"Delete content or manage content"| P5
    P5 <-->|"Content records"| Content
    P5 <-->|"Lecture metadata fetch"| YouTube
    P5 -->|"Content management result"| Editor

    Student -->|"Visit event"| P6
    P6 -->|"Store page visit details"| Analytics
    Admin -->|"Request analytics summary"| P6
    P6 -->|"Analytics summary"| Admin

    Admin -->|"Manage users, roles, statuses, subjects, semesters, assignments, reports and settings"| P7
    P7 <-->|"User and role data"| Users
    P7 <-->|"Learning catalog records"| Learning
    P7 <-->|"Admin records and audit logs"| AdminData
    P7 -->|"Admin dashboard data and save results"| Admin
```

## Notes / Assumptions

- The DFD focuses on implemented backend APIs registered in `backend/src/app.ts`.
- Progress is protected by authentication and stores completed, bookmarked and revision states.
- Authentication checks the `email-verification` application setting. Raw verification tokens are emailed but only their SHA-256 hashes and expiry times are stored.
- The Admin process controls whether verification is enforced and exposes provider configuration status without exposing the Resend API key.
- Discussion and chat pages are excluded from the main DFD processes because the visible backend route registration does not include active `/api/discussions` or `/api/chat` routers.
- `Note` exists in the Prisma schema, but implemented note APIs were not found in the current route list.
