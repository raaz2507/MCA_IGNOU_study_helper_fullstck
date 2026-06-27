# DFD Level-0

## Explanation

This Level-0 Data Flow Diagram shows the system as one main process and highlights the major external actors, data stores and high-level data movements.

```mermaid
flowchart LR
    Student["Student / Learner"]
    Editor["Editor"]
    Admin["Administrator"]
    P0(("0. GyanPath MCA Study Helper System"))
    DB[("D1 PostgreSQL Database")]
    Assets[("D2 Static Resource Files<br/>PDFs, images, HTML/CSS/JS")]
    External["External Metadata Service<br/>YouTube oEmbed"]
    EmailProvider["Resend Email API"]

    Student -->|"Registration, email verification, login, profile and progress requests"| P0
    Student -->|"Catalog, question bank, paper and material requests"| P0
    P0 -->|"Pages, study data, questions, papers and progress state"| Student

    Editor -->|"Banner, lecture and contributor updates"| P0
    P0 -->|"Content lists and save results"| Editor

    Admin -->|"User, subject, semester, assignment, report and setting changes"| P0
    P0 -->|"Admin overview, analytics summary, audit logs and system status"| Admin

    P0 <-->|"Users, sessions, subjects, papers, questions, answers, progress, content, admin records"| DB
    P0 -->|"Read and serve resource files"| Assets
    P0 <-->|"Lecture URL metadata request/response"| External
    P0 -->|"Verification email payload"| EmailProvider
    EmailProvider -->|"Verification link delivery"| Student
```

## Notes / Assumptions

- `D1 PostgreSQL Database` represents the Prisma-managed database models in `backend/prisma/schema.prisma`.
- `D2 Static Resource Files` represents files under the frontend assets/resources folders, including PDFs and cached images.
- YouTube metadata fetching occurs only for the implemented lecture metadata endpoint used by Admin/Editor content management.
- Resend receives the recipient, subject and email content; its API key stays in server environment variables and is not stored in the database.
