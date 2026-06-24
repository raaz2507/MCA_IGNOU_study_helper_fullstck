# MCA Study Helper

## Live Website

🌐 **IGNOU MCA Study Helper:**

https://mcaignoustudyhelperfullstck-production.up.railway.app/

Share the website with MCA students:

> 🎓 IGNOU MCA Study Helper
>
> 📚 Question papers, study material, question banks and video lectures in one place.
>
> 🔗 https://mcaignoustudyhelperfullstck-production.up.railway.app/

## Run the Node.js Application

Node.js `^26.0.0`, npm and a local PostgreSQL server are required.

```text
npm.cmd install
npm.cmd run prisma:generate
npm.cmd run prisma:migrate
npm.cmd run prisma:seed
npm.cmd run dev
```

Open `http://127.0.0.1:3000`.

For a production-style run:

```text
npm.cmd run build
npm.cmd start
```

Copy `backend/.env.example` to `backend/.env` and set `DATABASE_URL` before
running Prisma commands. The Express server serves the frontend and owns
application data, authentication, progress and admin APIs. Opening HTML files
directly is no longer the primary application mode.

For local PDF testing, clone or copy the resource repository into:

```text
local-resources/MCA_new
```

This folder is ignored by Git and is only for local/offline testing. In hosted
environments, set `PDF_RESOURCE_BASE_URL` to the raw GitHub resource URL, for
example:

```text
https://raw.githubusercontent.com/raaz2507/MCA_IGNOU_Study_matarial/main/MCA_new
```

Feature implementation progress is tracked in
[`FEATURE_CHECKLIST.md`](./FEATURE_CHECKLIST.md).

## Existing Features

- Question bank dashboard
- Search and filters
- Most repeated sorting
- Marks and difficulty filters
- English/Hinglish answer switch
- Short/Exam answer mode
- PostgreSQL-backed bookmarks, revision list and completed progress for signed-in users
- Previous-year question papers
- Study material and PDF viewer
- Light, dark and sepia themes
- Secure JWT access/refresh login with Admin, Editor and User roles
- PostgreSQL-backed subjects, papers, questions, answers and admin content

## Planned Learning Features

- **Mock Test Mode:** Random questions, timer, marks and final score
- **Study Planner:** Daily study targets based on the student's exam date
- **Topic-wise Progress:** Completion and performance tracking for every subject and topic
- **Personal Notes:** Notes attached to questions, PDFs and study material
- **Flashcards and Quizzes:** Practice for definitions, concepts and MCQs
- **Smart Revision:** Suggestions based on weak topics and frequently asked questions
- **Global Search:** Search across subjects, questions, papers, PDFs and notes
- **Continue Reading:** Resume the last opened PDF, page or question
- **PDF Highlights and Annotations:** Highlight text, bookmark pages and add annotations
- **Export and Print:** Create a printable PDF from selected questions and answers
- **Assignment Section:** Assignments, submission dates, status and available solutions
- **Real Admin Panel:** Add, edit and delete subjects, PDFs, questions and answers
- **Student Accounts and Cloud Sync:** Save progress and preferences across devices
- **PWA and Offline Mode:** Install the platform on mobile and use downloaded content offline
- **AI Study Assistant:** Explain questions, summarize content and generate practice questions

## Planned Student Communication Features

- **Subject-wise Discussion Rooms:** A separate discussion area for every subject
- **Question Discussion Threads:** Comments, replies and doubt discussions under questions and PDFs
- **Study Groups:** Public and private groups with member invitations and roles
- **Real-time Chat:** One-to-one and group messaging with typing indicators and online status
- **Doubt Board:** Post doubts, answer questions, upvote answers and mark doubts as solved
- **Resource Sharing:** Share notes, useful links, images and PDFs
- **Peer Study Sessions:** Schedule sessions and share reminders and meeting links
- **Notifications:** Alerts for replies, mentions, invitations and solved doubts
- **Student Profiles:** Name, semester, subjects, skills and contribution score
- **Mentions and Reactions:** `@student` mentions, likes, useful reactions and replies
- **Moderation and Safety:** Reporting, blocking, muting, spam control and community rules
- **Anonymous Doubts:** Ask academic questions without displaying the student's name

## Recommended First Release

The first useful communication release should include:

1. Secure student accounts
2. Subject-wise discussion rooms
3. Doubt posts with comments and replies
4. Answer upvotes and solved status
5. In-app notifications
6. Report and block options

After this foundation is stable, real-time chat, study groups and resource
sharing can be added.

## Implementation Plan

### Phase 1: Foundation

- Replace hardcoded browser login with secure backend authentication
- Add student registration and login
- Add JWT access and refresh tokens
- Add role-based permissions for students, moderators and admins
- Create the PostgreSQL database and Prisma schema
- Add student profiles and cloud-synced preferences
- Add the real admin panel

### Phase 2: Discussion System

- Add subject-wise discussion boards
- Add doubt posts, comments and replies
- Add answer upvotes and solved status
- Add discussion threads to questions and PDFs
- Add mentions and reactions
- Add anonymous doubt posting
- Add reporting and moderation tools

### Phase 3: Real-Time Communication

- Add personal and group chat using Socket.IO
- Add subject and study-group chat rooms
- Add typing indicators, online status and unread message counts
- Add real-time notifications

### Phase 4: Learning and Progress

- Add mock tests, scores and performance history
- Add topic-wise progress and smart revision
- Add study planner, assignments and reminders
- Add personal notes, flashcards and quizzes
- Add global search and continue-reading history

### Phase 5: Study Groups and Sharing

- Add public and private study groups
- Add group invitations and member roles
- Add resource and notes sharing
- Add peer study-session scheduling and reminders

### Phase 6: Documents and Offline Access

- Add PDF highlights, bookmarks and annotations
- Add selected-question export and printing
- Add PWA installation and offline access
- Add safe cloud file storage

### Phase 7: AI, Scaling and Safety

- Add the AI study assistant with usage and safety controls
- Add Redis for caching, online presence and Socket.IO scaling
- Add BullMQ for background notifications and file processing
- Add rate limiting, spam detection and content moderation
- Add tests, logs, backups and deployment configuration

## Final Architecture

The project follows an **Express + TypeScript Modular Monolith** architecture
with a separate modular frontend and backend.

Recommended stack:

- HTML, CSS and modular JavaScript frontend
- Node.js 26, Express 5 and TypeScript backend
- PostgreSQL 18 with Prisma ORM
- REST API
- Socket.IO foundation for real-time features
- Optional Redis and BullMQ foundation for presence and background jobs
- JWT access and refresh authentication using secure cookies
- Local Windows PostgreSQL installation
- React Native mobile application in the future

Feature logic is isolated into controller, service and repository layers. The
frontend communicates with Express through REST APIs; PostgreSQL is the
application data source.

## Final Project Structure

```text
mca-study-helper/
|
|-- frontend/
|   |
|   |-- pages/
|   |   |-- index.html
|   |   |-- login.html
|   |   |-- question-bank.html
|   |   |-- paper-gallery.html
|   |   |-- discussion.html
|   |   |-- chat.html
|   |   |-- profile.html
|   |   `-- admin.html
|   |
|   |-- assets/
|   |   |-- css/
|   |   |   |-- base.css
|   |   |   |-- layout.css
|   |   |   |-- components.css
|   |   |   `-- pages/
|   |   |       |-- home.css
|   |   |       |-- question-bank.css
|   |   |       |-- discussion.css
|   |   |       `-- chat.css
|   |   |
|   |   |-- js/
|   |   |   |-- api/
|   |   |   |   |-- auth.api.js
|   |   |   |   |-- subjects.api.js
|   |   |   |   |-- questions.api.js
|   |   |   |   |-- papers.api.js
|   |   |   |   |-- discussion.api.js
|   |   |   |   |-- chat.api.js
|   |   |   |   `-- progress.api.js
|   |   |   |
|   |   |   |-- components/
|   |   |   |   |-- header.js
|   |   |   |   |-- footer.js
|   |   |   |   |-- site-shell.js
|   |   |   |   |-- sidebar.js
|   |   |   |   |-- modal.js
|   |   |   |   |-- subject-card.js
|   |   |   |   |-- question-card.js
|   |   |   |   `-- paper-card.js
|   |   |   |
|   |   |   |-- pages/
|   |   |   |   |-- home.js
|   |   |   |   |-- question-bank.js
|   |   |   |   |-- paper-gallery.js
|   |   |   |   |-- discussion.js
|   |   |   |   |-- chat.js
|   |   |   |   `-- profile.js
|   |   |   |
|   |   |   `-- utils/
|   |   |       |-- storage.js
|   |   |       |-- theme.js
|   |   |       |-- auth.js
|   |   |       `-- helpers.js
|   |   |
|   |   `-- images/
|   |
|   |-- tools/
|   |-- resource-paths.json
|   `-- manifest.json
|
|-- backend/
|   |
|   |-- src/
|   |   |-- app.ts
|   |   |-- server.ts
|   |   |
|   |   |-- config/
|   |   |   |-- env.ts
|   |   |   |-- prisma.ts
|   |   |   |-- redis.ts
|   |   |   `-- socket.ts
|   |   |
|   |   |-- modules/
|   |   |   |-- auth/
|   |   |   |-- catalog/
|   |   |   |-- questions/
|   |   |   |-- progress/
|   |   |   `-- content/
|   |   |
|   |   |-- queues/
|   |   |-- shared/
|   |   |-- socket/
|   |   `-- tests/
|   |
|   |-- prisma/
|   |   |-- schema.prisma
|   |   |-- migrations/
|   |   `-- seed.ts
|   |
|   |-- uploads/
|   |   |-- pdfs/
|   |   |-- images/
|   |   `-- exports/
|   |
|   |-- .env.example
|   `-- README.md
|
|-- mobile-app/
|   `-- (Future React Native App)
|
|-- docs/
|   |-- api-docs/
|   |-- database/
|   `-- architecture/
|
|-- package.json
|-- package-lock.json
|-- tsconfig.json
|-- README.md
`-- .gitignore
```

> Important: `backend/.env` will contain local secrets and must not be
> committed. A safe `backend/.env.example` file should be committed instead.

Shared headers, footers and cards are rendered by reusable client-side
components. Page files contain placeholders and page-specific content instead
of repeating the same layout markup.

Request flow:

```text
Frontend
   |
Express REST API / Socket.IO
   |
Controller
   |
Service
   |
Repository
   |
Prisma ORM
   |
PostgreSQL
```

Redis is optional during current development. If it is unavailable, the main
Express/PostgreSQL application continues running while Redis-backed queues and
presence remain disabled.

## Question Bank Data

Question-bank data is stored inside each subject's `data` directory. For
example:

`frontend/assets/resources/MCA_new/Semester_1/MCS_211/data/`

To add real answers, edit each question's `answers.english` and
`answers.hinglish` fields.
