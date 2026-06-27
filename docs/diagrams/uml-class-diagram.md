# UML Class Diagram

## Explanation

This class diagram summarizes the main persistent domain classes from the Prisma schema and their relationships. It is intentionally simplified for MCA project documentation.

```mermaid
classDiagram
    class User {
        String id
        String username
        String email
        String displayName
        UserRole role
        UserStatus status
        DateTime emailVerifiedAt
        Boolean emailVerificationRequired
        String emailVerificationTokenHash
        DateTime emailVerificationExpiresAt
    }

    class Session {
        String id
        String tokenHash
        DateTime expiresAt
    }

    class Subject {
        String id
        String code
        String title
        Int semester
        String type
        Boolean questionBank
    }

    class StudyMaterial {
        String id
        String groupName
        String title
        String filePath
        PublishStatus status
    }

    class Paper {
        String id
        String title
        String session
        String englishPath
        String hindiPath
        PublishStatus status
    }

    class Question {
        String id
        String title
        String category
        String difficulty
        Int marks
        QuestionStatus contentStatus
    }

    class Answer {
        String id
        String language
        String mode
        String content
    }

    class Progress {
        Boolean completed
        Boolean revision
        Boolean bookmarked
    }

    class Note {
        String id
        String content
    }

    class Banner {
        String id
        String title
        String category
        Boolean active
    }

    class Lecture {
        String id
        String title
        String url
        String teacher
        Boolean active
    }

    class Contributor {
        String id
        String name
        Json contributions
        Boolean active
    }

    class Discussion {
        String id
        String title
        String content
        Boolean solved
        Boolean anonymous
    }

    class Comment {
        String id
        String content
    }

    class Assignment {
        String id
        String title
        DateTime dueDate
        PublishStatus status
    }

    class Report {
        String id
        String targetType
        String reason
        ReportStatus status
    }

    class AuditLog {
        String id
        String action
        String entityType
        Json details
    }

    class AnalyticsVisit {
        String id
        String pagePath
        String deviceType
        Boolean loggedIn
    }

    User "1" --> "0..*" Session
    User "1" --> "0..*" Progress
    User "1" --> "0..*" Note
    User "1" --> "0..*" Discussion
    User "1" --> "0..*" Comment
    User "1" --> "0..*" Assignment : creates
    User "1" --> "0..*" Report : reports
    User "1" --> "0..*" AuditLog : acts in

    Subject "1" --> "0..*" StudyMaterial
    Subject "1" --> "0..*" Paper
    Subject "1" --> "0..*" Question
    Subject "1" --> "0..*" Lecture
    Subject "1" --> "0..*" Discussion
    Subject "1" --> "0..*" Assignment

    Question "1" --> "0..*" Answer
    Question "1" --> "0..*" Progress
    Question "1" --> "0..*" Note

    Discussion "1" --> "0..*" Comment
    Comment "1" --> "0..*" Comment : replies
```

## Notes / Assumptions

- This diagram is based on `backend/prisma/schema.prisma`.
- Supporting models such as `Semester`, `AppSetting` and `FileAsset` are not expanded to keep the diagram readable.
- `AppSetting` stores the Admin email-verification toggle; sensitive Resend credentials remain environment variables rather than database fields.
- `emailVerificationTokenHash` contains SHA-256 output, never the raw token sent to the user.
- `Discussion` and `Comment` are present in the database schema, although backend discussion routes were not registered in the current Express app.
