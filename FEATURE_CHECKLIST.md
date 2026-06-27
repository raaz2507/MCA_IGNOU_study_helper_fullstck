# MCA Study Helper - Feature Checklist

This file tracks implemented, partially implemented and planned features.
Update the checkbox and status whenever a feature is completed.

## Status Legend

- `[x]` Completed
- `[ ]` Not started
- `[-]` Partially completed or prototype only

## Current Summary

- Current stage: Core web application running on Node.js, Express and PostgreSQL
- Final architecture: Express + TypeScript Modular Monolith
- Frontend status: Modular pages, shared components and API clients completed
- Backend status: Core APIs, authentication, persistence and static serving completed
- Database status: Local Windows PostgreSQL connected through Prisma
- Next milestone: Account recovery and remaining Admin content CRUD
- Last updated: June 27, 2026

---

## 1. Existing Study Resources

- [x] Home page
- [x] Semester-wise subject sections
- [x] Theory subject cards
- [x] Practical subject cards
- [x] Previous-year question papers
- [x] Study-material PDF collection
- [x] Automatic resource-card generation
- [x] PDF gallery
- [x] PDF gallery search
- [x] PDF cover previews
- [x] Dedicated PDF viewer
- [-] English/Hindi PDF switching
- [x] About page
- [x] User guide page

## 2. Theme and Interface

- [x] Responsive page layouts
- [x] Light theme
- [x] Dark theme
- [x] Sepia theme
- [x] Pink theme
- [x] Sky Blue theme
- [x] Save selected theme in localStorage
- [x] Collapsible study-material blocks
- [x] Reusable shared header component
- [x] Reusable shared footer component
- [x] Reusable subject-card component
- [x] Reusable paper-card component
- [x] Reusable question-card component
- [ ] Final accessibility audit
- [ ] Keyboard navigation audit
- [ ] Screen-reader labels audit
- [ ] Fix all broken links
- [ ] Fix remaining text/emoji encoding issues

## 3. Question Bank

- [x] Subject-based question loading
- [x] Question list and detail view
- [x] Question search
- [x] Marks filter
- [x] Difficulty filter
- [x] Most-repeated questions view
- [x] Sort by repetition
- [x] Sort by marks
- [x] Sort by latest paper
- [x] Sort by oldest paper
- [x] Previous-paper appearance history
- [x] Related questions
- [x] English answers
- [x] Hinglish answers
- [x] Short answer mode
- [x] Exam answer mode
- [x] Detailed answer mode
- [x] Question images and diagrams
- [x] Tables and code blocks
- [x] Bookmark questions using localStorage
- [x] Revision list using localStorage
- [x] Mark questions as completed
- [x] Completion progress
- [-] Question data available for selected subjects only
- [ ] Add question banks for all subjects
- [ ] Move bookmarks and progress to student accounts

## 4. Authentication and Users

- [x] Server-side login
- [x] Admin, Editor and User roles
- [x] Protected pages backed by the API
- [x] Logout action
- [x] Access-denied page
- [-] Remove demo credentials displayed on the login page
- [x] Create secure backend registration
- [x] Create secure backend login
- [x] Password hashing
- [x] JWT access tokens
- [x] Refresh-token flow
- [ ] Forgot-password flow
- [x] Resend email delivery integration
- [x] Email verification with hashed, 24-hour tokens
- [x] Block login until a required email is verified
- [x] Resend-verification flow with generic response for unknown/ineligible addresses
- [x] Re-verify email after a profile email change
- [x] Role-based backend authorization
- [x] Student profile view and edit page
- [ ] Profile photo
- [ ] Semester and enrolled-subject settings
- [ ] Blocked-users list
- [ ] Cloud-synced preferences

## 5. Backend Foundation

- [x] Create the `backend` project
- [x] Add Node.js and TypeScript configuration
- [x] Add environment-variable validation
- [x] Create modular backend structure
- [x] Add request validation
- [x] Add centralized error handling
- [x] Serve frontend pages and assets through Node.js
- [x] Subject catalog API
- [x] Question-paper API
- [x] Question-bank API
- [x] Server-side authentication and cookie sessions
- [x] Server-side progress, bookmark and revision persistence
- [x] Server-side banner, lecture and contributor persistence
- [x] Protected Admin/Editor write APIs
- [ ] Add API response conventions
- [-] Add API documentation
- [x] Add application logging
- [x] Add unit-test setup
- [x] Add integration-test setup
- [x] Remove Docker setup and target local Windows PostgreSQL
- [x] Add development and production configuration

## 6. Database and Storage

- [x] Set up PostgreSQL
- [x] Set up Prisma ORM
- [x] Create Prisma schema
- [x] Create migrations
- [x] Create seed data
- [x] Users table
- [x] Subjects table
- [x] Questions and answers tables
- [x] Papers and study-material tables
- [x] Bookmark state in progress table
- [x] Notes table
- [x] Progress table
- [x] Discussions and comments tables
- [x] Email-verification state and hashed token fields on users
- [ ] Chat and messages tables
- [ ] Notifications table
- [ ] Moderation and reports tables
- [ ] File-upload metadata
- [ ] Cloud file storage
- [ ] Database backup plan

## 7. Real Admin Panel

- [x] Super Admin overview page
- [x] Live PostgreSQL statistics
- [x] User list and search
- [x] User role filtering
- [x] Admin role management
- [x] Self-demotion and last-admin protection
- [x] System-status overview
- [-] Local contributor-management prototype
- [x] Admin dashboard statistics
- [x] Add/edit/delete semesters
- [ ] Add/edit/delete subjects
- [ ] Add/edit/delete study materials
- [ ] Upload and manage PDFs
- [ ] Add/edit/delete questions
- [ ] Add/edit/delete answers
- [x] Manage assignments
- [x] Manage students and roles
- [x] Review reports
- [x] Suspend or ban accounts
- [ ] Content publishing workflow
- [x] Audit log
- [x] Email-verification on/off setting and Resend configuration status

## 8. Discussion and Doubt Board

- [-] Discussion page and database-schema foundation
- [ ] Subject-wise discussion rooms
- [ ] Create a discussion post
- [ ] Question-specific discussion threads
- [ ] PDF-specific discussion threads
- [ ] Comments and replies
- [ ] Nested replies
- [ ] Answer upvotes
- [ ] Mark a doubt as solved
- [ ] Mention students using `@username`
- [ ] Reactions
- [ ] Anonymous academic doubts
- [ ] Sort discussions by latest/popular/unanswered
- [ ] Search discussions
- [ ] Edit and delete own posts
- [ ] Report a post or comment

## 9. Real-Time Chat

- [-] Chat page and frontend API-client foundation
- [-] Configure Socket.IO foundation
- [ ] One-to-one chat
- [ ] Group chat
- [ ] Subject chat rooms
- [ ] Study-group chat rooms
- [ ] Typing indicators
- [ ] Online/offline status
- [ ] Last-seen status
- [ ] Message delivery status
- [ ] Message read status
- [ ] Unread-message count
- [ ] Edit/delete own messages
- [ ] Share images, notes and PDFs
- [ ] Block and mute chat users
- [ ] Chat rate limiting

## 10. Notifications

- [ ] In-app notifications
- [ ] Reply notifications
- [ ] Mention notifications
- [ ] Upvote notifications
- [ ] Solved-doubt notifications
- [ ] Group invitation notifications
- [ ] Study-session reminders
- [ ] Unread-notification count
- [ ] Mark notifications as read
- [ ] Real-time notification delivery
- [ ] Email notifications
- [ ] Notification preferences

## 11. Study Groups and Peer Learning

- [ ] Create public study groups
- [ ] Create private study groups
- [ ] Invite students
- [ ] Join-request approval
- [ ] Owner, moderator and member roles
- [ ] Group resource sharing
- [ ] Group announcements
- [ ] Schedule peer study sessions
- [ ] Add meeting links
- [ ] Session reminders
- [ ] Leave or remove group members

## 12. Learning and Progress Features

- [ ] Mock Test Mode
- [ ] Random question selection
- [ ] Test timer
- [ ] Automatic scoring
- [ ] Final score and answer review
- [ ] Test-attempt history
- [ ] Topic-wise performance
- [ ] Topic-wise completion progress
- [ ] Study Planner
- [ ] Exam-date-based daily targets
- [ ] Daily task completion
- [ ] Study streak
- [ ] Smart Revision
- [ ] Weak-topic suggestions
- [ ] Frequently-asked-question suggestions
- [ ] Flashcards
- [ ] MCQ quizzes
- [ ] Personal notes
- [ ] Notes attached to questions
- [ ] Notes attached to PDFs
- [ ] Continue Reading
- [ ] Last-opened question tracking
- [ ] Last-opened PDF/page tracking

## 13. Search

- [ ] Global search
- [ ] Search subjects
- [ ] Search questions
- [ ] Search question papers
- [ ] Search study-material PDFs
- [ ] Search personal notes
- [ ] Search discussions
- [ ] Search students and groups
- [ ] Search filters and sorting
- [ ] Search-history suggestions

## 14. PDF and Export Features

- [x] Basic PDF viewing
- [x] PDF gallery and preview
- [ ] PDF page bookmarks
- [ ] PDF text highlights
- [ ] PDF annotations
- [ ] Save the last-read page
- [ ] Search text inside PDFs
- [ ] Export selected questions and answers
- [ ] Generate printable study PDFs
- [ ] Print-friendly question layouts
- [ ] Background PDF processing queue

## 15. Assignments

- [ ] Assignment section
- [ ] Subject-wise assignments
- [ ] Submission dates
- [ ] Assignment status
- [ ] Available solutions
- [ ] Assignment reminders
- [ ] Admin assignment management
- [ ] Student submission support
- [ ] Submission review and feedback

## 16. PWA and Offline Mode

- [ ] Web app manifest
- [ ] Service worker
- [ ] Installable mobile experience
- [ ] Offline application shell
- [ ] Download selected study materials
- [ ] Offline question-bank access
- [ ] Offline progress queue
- [ ] Sync offline changes when online
- [ ] Cache-version management

## 17. AI Study Assistant

- [ ] Explain a selected question
- [ ] Generate a short explanation
- [ ] Generate an exam-style answer
- [ ] Summarize study material
- [ ] Generate practice questions
- [ ] Generate flashcards
- [ ] Suggest revision topics
- [ ] Add AI usage limits
- [ ] Add safety controls
- [ ] Prevent answers from being treated as official without review

## 18. Moderation and Safety

- [ ] Community rules
- [ ] Report users
- [ ] Report posts, comments and messages
- [ ] Block users
- [ ] Mute users and groups
- [ ] Spam detection
- [x] API rate limiting
- [ ] Profanity/abuse filtering
- [ ] Moderator review queue
- [ ] Warning, suspension and ban actions
- [ ] Appeal process
- [ ] Moderation audit log

## 19. Performance and Scaling

- [-] Configure optional Redis connection
- [ ] Cache frequently requested data
- [ ] Store online presence in Redis
- [ ] Configure Socket.IO Redis adapter
- [-] Configure BullMQ foundation
- [-] Notification queue foundation
- [-] Email queue foundation
- [-] PDF-processing queue foundation
- [ ] Image optimization
- [ ] API pagination
- [ ] Database indexing
- [-] Monitoring and health checks
- [ ] Error tracking

## 20. Future Mobile Application

- [ ] Finalize reusable REST APIs
- [ ] Finalize reusable Socket.IO events
- [ ] Create React Native project
- [ ] Mobile authentication
- [ ] Mobile study resources
- [ ] Mobile question bank
- [ ] Mobile discussions and chat
- [ ] Push notifications
- [ ] Mobile offline access

---

## Recommended Implementation Order

1. Fix broken links, encoding and accessibility issues
2. Remove displayed demo credentials and add registration/recovery
3. Complete CRUD operations in the Admin Panel
4. Build discussion rooms and the doubt board
5. Add notifications and moderation
6. Add real-time chat
7. Add learning, progress and PDF tools
8. Add PWA/offline support
9. Add the AI Study Assistant

## Update Record

| Date | Feature/Area | Status | Notes |
| --- | --- | --- | --- |
| June 22, 2026 | Initial checklist | Completed | Recorded existing and planned features |
| June 22, 2026 | Architecture migration | Completed | Moved frontend into pages/assets, added reusable UI components and created backend scaffold |
| June 22, 2026 | Full Node.js port | Completed | Node now serves the app and owns catalog, questions, auth, progress and admin content APIs |
| June 23, 2026 | Express/PostgreSQL port | Completed | Added Express, TypeScript, Prisma migrations/seed, PostgreSQL persistence, JWT refresh auth, tests and browser verification |
| June 23, 2026 | Checklist verification | Completed | Reconciled frontend, profile, discussion, chat, API-documentation and health-check statuses with the current codebase |
| June 23, 2026 | Admin operations | Completed | Added semester and assignment management, account restrictions, report review, audit history and corresponding Admin APIs/UI |
| June 27, 2026 | Resend email verification | Completed | Added hashed expiring tokens, verification/resend APIs, login enforcement, email-change re-verification and an Admin on/off toggle |
