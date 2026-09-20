# QR Campus Hunt --- Project Requirements

## 1. Project Overview

**QR Campus Hunt** is a mobile-first campus event system where teams
move around the campus, scan QR codes placed at different locations,
solve questions, and receive hints for the next location.

The event has **3 rounds**. Each team has one account. Admins can
configure rounds, tasks, locations, QR codes, qualification rules,
teams, and live progress.

The system must be production-ready and designed for real event usage.

------------------------------------------------------------------------

# 2. Main Technology Stack

## Frontend

-   Next.js
-   React
-   Tailwind CSS
-   Responsive mobile-first UI
-   PWA-friendly design where practical

## Backend

-   Express.js
-   REST API architecture
-   Node.js

## Database

-   Neon PostgreSQL
-   Use a proper relational database structure
-   Use database transactions where multiple related records are changed
    together

## Hosting

-   Frontend: Vercel
-   Express.js API: Vercel-compatible deployment
-   Database: Neon PostgreSQL

## Authentication

-   Team login using Team ID and Password
-   Admin login with admin privileges
-   Secure password hashing
-   Session/JWT-based authentication
-   Role-based access control

------------------------------------------------------------------------

# 3. User Types

The system will have two main user types.

## Team

Teams can:

-   Log in
-   View their current round
-   Scan QR codes
-   Open assigned tasks
-   Answer questions
-   Receive hints after correct answers
-   View their progress
-   View qualification status
-   Access the next round only after qualification

## Admin

Admins can:

-   Manage the event
-   Manage teams
-   Manage rounds
-   Manage tasks
-   Manage locations
-   Generate QR codes
-   Configure qualification rules
-   Monitor live progress
-   View results
-   Export reports

------------------------------------------------------------------------

# 4. Team Account System

Each team must have exactly **one login account**.

Example:

``` text
Team Name: Team Alpha
Team ID: TEAM001
Password: ********
```

All members of Team Alpha use the same account.

Admin can:

-   Create teams
-   Generate Team IDs
-   Generate/reset passwords
-   Edit team details
-   Disable a team
-   View team activity
-   View complete team progress

A team must never be able to access another team's data.

------------------------------------------------------------------------

# 5. Event Structure

The event contains exactly three rounds by default:

``` text
Round 1
   ↓
Qualification
   ↓
Round 2
   ↓
Qualification
   ↓
Round 3
   ↓
Final Result
```

The system should be designed so the admin can configure the rules
instead of hard-coding them.

------------------------------------------------------------------------

# 6. Round Management

Admin can create and configure each round.

Each round should contain:

-   Round name
-   Round number
-   Description
-   Start status
-   End status
-   Tasks
-   Qualification rule
-   Maximum number of qualifying teams
-   Scoring rules
-   Time limit if required

Example:

``` text
Round 1
10 Tasks
Top 20 Teams Qualify

Round 2
8 Tasks
Top 10 Teams Qualify

Round 3
5 Tasks
Final Round
```

------------------------------------------------------------------------

# 7. Task Management

Every task belongs to one round and one location.

Admin can configure:

-   Task title
-   Question
-   Correct answer
-   Location
-   Location hint
-   QR code
-   Task order
-   Points
-   Maximum attempts
-   Active/inactive status

Example:

``` text
Round: 1
Task: 03
Location: Library
Question: What year was the university established?
Correct Answer: 2017
Hint: Find the place where students borrow books.
Points: 10
```

------------------------------------------------------------------------

# 8. QR Code System

Each task can have its own QR code.

The QR code should contain a secure task identifier rather than exposing
sensitive information.

Example:

``` text
QR Code
   ↓
Secure Task Identifier
   ↓
Backend Verification
   ↓
Task Page
```

When a team scans the QR code:

1.  The system identifies the task.
2.  The system identifies the logged-in team.
3.  The system checks whether the task is currently available.
4.  The system checks the round status.
5.  The task page opens.
6.  The team can submit its answer.

Admin can:

-   Generate QR code
-   View QR code
-   Download QR code
-   Print QR code
-   Regenerate QR code

------------------------------------------------------------------------

# 9. Task Access Rules

Teams must not be able to skip tasks unless the admin configuration
allows it.

The system should support sequential tasks.

Example:

``` text
Task 1 → Task 2 → Task 3 → Task 4
```

If Task 2 has not been completed:

``` text
Task 3 = Locked
```

After Task 2 is correctly completed:

``` text
Task 3 = Unlocked
```

The exact task flow should be configurable.

------------------------------------------------------------------------

# 10. Answer System

The task page should display:

-   Round name
-   Task number
-   Question
-   Answer input
-   Submit button
-   Current progress

After submission:

### Correct Answer

Show:

``` text
✓ Correct Answer!

Task Completed.

Your next location hint:
"Go to the place where..."
```

Then unlock the next task.

### Wrong Answer

Show:

``` text
✕ Incorrect Answer

Try again.
```

Do not reveal the next location hint.

The admin should be able to configure:

-   Unlimited attempts
-   Limited attempts
-   Points per task
-   Case-sensitive or case-insensitive answers

------------------------------------------------------------------------

# 11. Location Hint System

Each completed task can reveal a hint for the next location.

Example:

``` text
Current Task:
Find the correct answer.

Correct Answer:
✓

Next Location Hint:
"Go where you can see many books."
```

The hint must remain hidden until the required task is successfully
completed.

------------------------------------------------------------------------

# 12. Qualification System

Qualification must be configurable by the admin.

Admin can select how many teams qualify from each round.

Example:

``` text
Round 1:
50 Teams Participate
20 Teams Qualify

Round 2:
20 Teams Participate
10 Teams Qualify

Round 3:
10 Teams Participate
Final Round
```

Qualification can be based on configurable event rules such as:

-   Score
-   Number of completed tasks
-   Correct answers
-   Completion time
-   Combined score and time

The system must clearly show the qualification status.

------------------------------------------------------------------------

# 13. Team Dashboard

The team dashboard must be designed primarily for mobile phones.

It should show:

-   Team name
-   Current round
-   Current score
-   Tasks completed
-   Total tasks
-   Progress bar
-   Qualification status
-   Current task
-   Event announcements if required

Example:

``` text
TEAM ALPHA

Round 1

████████░░ 8 / 10

Score: 80

✓ Task 1
✓ Task 2
✓ Task 3
✓ Task 4
✓ Task 5
✓ Task 6
✓ Task 7
✓ Task 8
🔒 Task 9
🔒 Task 10
```

------------------------------------------------------------------------

# 14. Qualification Screen

When a team qualifies:

``` text
🎉 ROUND COMPLETED

Congratulations Team Alpha!

You have qualified for Round 2.

Round 2 will be available when the
admin starts the round.
```

When a team does not qualify:

``` text
Round 1 Completed

Your team did not qualify for Round 2.

Thank you for participating.
```

The exact wording should be configurable by admin if required.

------------------------------------------------------------------------

# 15. Admin Dashboard

The admin dashboard must work properly on:

-   Mobile
-   Tablet
-   Laptop
-   Desktop

Desktop should provide a more detailed dashboard while mobile should use
cards, tabs, and compact layouts.

Admin dashboard should include:

### Overview

-   Total teams
-   Active teams
-   Teams completed
-   Teams qualified
-   Current round
-   Total tasks
-   Completed tasks
-   Event status

### Live Team Progress

Admin can see:

  Team         Round   Progress     Score Status
  ------------ ------- ---------- ------- -------------
  Team Alpha   1       8/10            80 In Progress
  Team Beta    1       10/10          100 Qualified
  Team Gamma   1       5/10            50 In Progress

The dashboard should update quickly without requiring constant manual
page refreshes.

------------------------------------------------------------------------

# 16. Team Monitoring

Admin can open a specific team and see:

-   Team name
-   Team ID
-   Current round
-   Qualification status
-   Score
-   Tasks completed
-   Tasks remaining
-   Correct answers
-   Wrong answers
-   Attempt count
-   Task completion times
-   Last activity
-   Round history

Example:

``` text
Team Alpha

Round 1
8 / 10 Tasks
80 Points
12 Correct
3 Wrong

Last Activity:
10:42 AM
```

------------------------------------------------------------------------

# 17. Event Control

Admin can control the complete event.

Controls:

-   Start event
-   Pause event
-   Resume event
-   End event
-   Start round
-   Pause round
-   End round
-   Lock/unlock tasks
-   Enable/disable teams

The system must clearly show the current event state.

------------------------------------------------------------------------

# 18. Admin Team Management

Admin can:

-   Add team
-   Edit team
-   Delete/disable team
-   Generate Team ID
-   Generate password
-   Reset password
-   Search teams
-   Filter teams
-   View team progress

Admin should be able to generate multiple team accounts efficiently.

------------------------------------------------------------------------

# 19. Reports

Admin should be able to generate/export:

-   Team list
-   Round-wise results
-   Task-wise results
-   Correct answers
-   Wrong answers
-   Scores
-   Completion times
-   Qualification results
-   Final results
-   Full event report

CSV export should be supported.

------------------------------------------------------------------------

# 20. Database Design

Suggested main tables:

``` text
users
teams
events
rounds
locations
tasks
qr_codes
team_rounds
team_tasks
task_attempts
qualifications
event_results
admin_logs
```

Important relationships:

``` text
Event
 ├── Rounds
 │    ├── Tasks
 │    │    ├── Location
 │    │    └── QR Code
 │    └── Qualification Rules
 │
 └── Teams
      ├── Team Progress
      ├── Task Attempts
      └── Results
```

Use foreign keys and indexes for commonly searched fields.

------------------------------------------------------------------------

# 21. Security Requirements

Security is important because the event is based on physical locations.

The system should:

-   Hash passwords
-   Use secure authentication
-   Validate all API requests
-   Check team ownership on every team-specific API
-   Prevent direct access to locked tasks
-   Prevent access to future rounds
-   Prevent submitting another team's task
-   Prevent duplicate task completion
-   Validate QR code identifiers
-   Rate-limit sensitive APIs
-   Store important activity logs
-   Never store plain-text passwords
-   Never trust frontend-only checks

All important permission checks must happen on the backend.

------------------------------------------------------------------------

# 22. Anti-Cheating Rules

The system should reduce easy cheating.

Recommended controls:

-   QR codes use secure random identifiers.
-   Teams cannot manually access future tasks.
-   Task order can be enforced.
-   A task can only be completed once.
-   Backend verifies team, round, and task status.
-   Completion timestamps are recorded.
-   Admin can see unusual activity.
-   Admin can disable a team if required.

Optional future feature:

-   QR codes can expire or be regenerated.
-   Location verification can be added later if required.

------------------------------------------------------------------------

# 23. Mobile-First Design

The team application is **mobile-only in normal usage**.

The UI must be designed for phones first.

Important requirements:

-   Large buttons
-   Easy QR scanning flow
-   Large answer input
-   Clear task information
-   Minimal typing
-   Simple navigation
-   Fast loading
-   Good touch targets
-   No unnecessary desktop-style sidebars
-   Works well on small Android phones
-   Responsive on iPhone-sized screens

The primary team flow should feel like a mobile event app, not a desktop
website squeezed into a phone.

------------------------------------------------------------------------

# 24. Professional Design System

The design should look like a professional event/product application
rather than a basic college project.

### Design Style

Use:

-   Clean modern interface
-   Premium but simple visual style
-   Strong typography
-   Rounded cards
-   Subtle shadows
-   Clean spacing
-   Smooth micro-animations
-   Clear status indicators
-   Professional icons
-   Light theme as the primary theme

Avoid:

-   Generic AI-looking gradients
-   Excessive glassmorphism
-   Too many colors
-   Neon colors
-   Huge unnecessary illustrations
-   Crowded dashboards
-   Over-animation

### Color Direction

Use a professional neutral base with one strong event accent color.

Suggested direction:

``` text
Background: Off-white / very light gray
Primary: Deep charcoal
Accent: Emerald / orange / violet
Success: Green
Warning: Amber
Error: Red
```

The final palette should maintain strong contrast and accessibility.

------------------------------------------------------------------------

# 25. Team Mobile Navigation

Use a simple mobile navigation structure.

Suggested:

``` text
Home
Tasks
Progress
Profile
```

The main action should always be easy to access.

The QR scanning action can be a prominent button:

``` text
[ Scan QR Code ]
```

After scanning, immediately open the task page.

------------------------------------------------------------------------

# 26. Mobile Task Screen

The task screen should be the most important screen in the application.

Suggested structure:

``` text
← Round 1

TASK 03
━━━━━━━━━━━━━━

QUESTION

What year was the university established?

[ Enter your answer ]

[ SUBMIT ANSWER ]

Progress
3 / 10
```

After a correct answer:

``` text
✓ CORRECT!

Task completed successfully.

NEXT LOCATION

"Go to the place where students
read and borrow books."

[ CONTINUE ]
```

------------------------------------------------------------------------

# 27. Admin Design

Admin can use the same application but gets a separate admin interface.

Admin interface must work on:

-   Laptop
-   Desktop
-   Tablet
-   Mobile

### Desktop Admin

Use:

``` text
Sidebar
    Dashboard
    Teams
    Rounds
    Tasks
    Locations
    QR Codes
    Results
    Reports
    Settings
```

Main area:

``` text
Top Statistics
        ↓
Live Event Status
        ↓
Team Progress
        ↓
Recent Activity
```

### Mobile Admin

Use:

-   Bottom navigation or compact menu
-   Cards
-   Tabs
-   Search
-   Filter drawers
-   Full-screen forms

Avoid forcing desktop tables onto small screens.

------------------------------------------------------------------------

# 28. Live Event Dashboard

Admin should have a live event screen.

Show:

``` text
EVENT LIVE

Round 1

Teams Active: 32
Teams Completed: 18
Qualified: 15

Tasks Completed: 247

Recent Activity
--------------------------------
Team Alpha completed Task 8
Team Beta completed Task 10
Team Delta submitted an answer
```

The live dashboard should update using polling or a real-time method
where appropriate.

------------------------------------------------------------------------

# 29. API Structure

Use a clean REST API.

Example:

``` text
/api/auth
/api/teams
/api/events
/api/rounds
/api/tasks
/api/locations
/api/qr
/api/progress
/api/attempts
/api/qualifications
/api/results
/api/reports
```

Example endpoints:

``` text
POST   /api/auth/login
POST   /api/admin/teams
GET    /api/admin/teams
GET    /api/admin/teams/:id

POST   /api/admin/rounds
GET    /api/admin/rounds
PATCH  /api/admin/rounds/:id

POST   /api/admin/tasks
PATCH  /api/admin/tasks/:id

GET    /api/team/progress
GET    /api/team/tasks/:id
POST   /api/team/tasks/:id/answer

GET    /api/admin/live-progress
GET    /api/admin/results
```

Keep API validation and authorization on the backend.

------------------------------------------------------------------------

# 30. Vercel and Production Requirements

The application will be deployed for real event usage.

Therefore:

-   Use production environment variables.
-   Never commit secrets.
-   Keep database credentials in environment variables.
-   Configure CORS correctly.
-   Use HTTPS.
-   Use proper error handling.
-   Do not expose database credentials.
-   Add database indexes.
-   Avoid unnecessary database queries.
-   Use pagination for large admin lists.
-   Avoid loading every team's complete history at once.
-   Add proper loading and error states.
-   Log server errors safely.
-   Do not expose sensitive error details to users.

Suggested environment variables:

``` text
DATABASE_URL=
JWT_SECRET=
NEXT_PUBLIC_API_URL=
CORS_ORIGIN=
```

------------------------------------------------------------------------

# 31. Error Handling

Every important action should have a clear user-friendly message.

Examples:

``` text
QR Code Invalid
This QR code is not valid.

Task Locked
Complete the previous task first.

Round Not Started
This round has not started yet.

Already Completed
You have already completed this task.

Session Expired
Please log in again.

Network Error
Please check your internet connection and try again.
```

Do not show raw server/database errors to users.

------------------------------------------------------------------------

# 32. Performance Requirements

The system should remain fast during the event when many teams are
active.

Important requirements:

-   Efficient PostgreSQL queries
-   Proper indexes
-   Avoid N+1 queries
-   Pagination for admin data
-   Cache only where useful
-   Minimize API response size
-   Optimize QR/task loading
-   Prevent duplicate submissions
-   Use database transactions for critical operations

Critical actions such as answering a task and completing a task must be
safe even if a user double-clicks the submit button.

------------------------------------------------------------------------

# 33. Important Task Completion Logic

When a team submits an answer:

``` text
Receive answer
      ↓
Authenticate team
      ↓
Validate task
      ↓
Check round status
      ↓
Check task status
      ↓
Check previous task requirement
      ↓
Check answer
      ↓
Create attempt record
      ↓
If correct:
    Mark task completed
    Calculate score
    Unlock next task
    Generate/show next hint
      ↓
Return result
```

This logic must be handled safely on the backend.

------------------------------------------------------------------------

# 34. Admin Task Creation Flow

Admin should be able to create a task using a simple form:

``` text
Round
↓
Task Number
↓
Task Question
↓
Correct Answer
↓
Location
↓
Next Location Hint
↓
Points
↓
Maximum Attempts
↓
Task Order
↓
Generate QR Code
↓
Save
```

After saving, admin should see the generated QR code.

------------------------------------------------------------------------

# 35. Event Setup Flow

Admin setup should follow:

``` text
Create Event
      ↓
Create/Configure Rounds
      ↓
Create Locations
      ↓
Create Tasks
      ↓
Add Questions + Answers
      ↓
Add Hints
      ↓
Generate QR Codes
      ↓
Create Teams
      ↓
Configure Qualification Rules
      ↓
Review Event
      ↓
Start Event
```

Add an optional **Pre-Event Validation** screen that checks whether:

-   Every task has a question.
-   Every task has a correct answer.
-   Every task has a location.
-   Every required task has a QR code.
-   Every round has a qualification rule.
-   Team accounts exist.
-   No duplicate task order exists.

Admin should be warned about missing configuration before starting the
event.

------------------------------------------------------------------------

# 36. Recommended Project Structure

``` text
qr-campus-hunt/
│
├── frontend/
│   ├── app/
│   ├── components/
│   ├── hooks/
│   ├── lib/
│   ├── services/
│   └── styles/
│
├── backend/
│   ├── src/
│   │   ├── controllers/
│   │   ├── routes/
│   │   ├── middleware/
│   │   ├── services/
│   │   ├── models/
│   │   ├── validators/
│   │   └── utils/
│   └── package.json
│
├── docs/
│
├── .env.example
├── README.md
└── project.md
```

------------------------------------------------------------------------

# 37. Development Rules

When implementing the project:

1.  Do not hard-code event data.
2.  Keep round/task logic configurable.
3.  Keep admin and team permissions separate.
4.  Validate important operations on the backend.
5.  Use simple and reusable components.
6.  Keep mobile UX as the first priority.
7.  Make admin responsive.
8.  Do not change unrelated features when fixing a bug.
9.  Test critical event flows before deployment.
10. Use production-safe database operations.

------------------------------------------------------------------------

# 38. Core MVP

The first working version must include:

-   Admin login
-   Team login
-   Team management
-   Round management
-   Task management
-   Location management
-   QR code generation
-   QR scanning
-   Question display
-   Answer submission
-   Correct/incorrect validation
-   Location hints
-   Task progress
-   Qualification system
-   Admin live progress
-   Event start/stop
-   Results
-   Responsive mobile UI
-   Responsive admin dashboard
-   Neon PostgreSQL
-   Express.js API
-   Vercel deployment support

------------------------------------------------------------------------

# 39. Future Features

Possible future additions:

-   GPS verification
-   Dynamic QR codes
-   Push notifications
-   Team chat
-   Event announcements
-   Live leaderboard
-   Automatic winner declaration
-   Advanced anti-cheating system
-   QR scan analytics
-   Multiple simultaneous events
-   Event templates
-   Custom branding
-   PWA installation
-   Offline support for selected screens

These should not be implemented in the MVP unless specifically
requested.

------------------------------------------------------------------------

# 40. Final Product Goal

The final product should feel like a **professional campus event
platform**.

A team should be able to:

``` text
Login
  ↓
See Round
  ↓
Reach Campus Location
  ↓
Scan QR
  ↓
Solve Question
  ↓
Get Hint
  ↓
Move to Next Location
  ↓
Complete Round
  ↓
Get Qualification Status
  ↓
Continue to Next Round
```

At the same time, the admin should be able to control and monitor the
entire event from a laptop, desktop, tablet, or mobile phone.

The most important priorities are:

1.  **Simple team experience**
2.  **Mobile-first design**
3.  **Fast QR → Task flow**
4.  **Secure task access**
5.  **Flexible round configuration**
6.  **Live admin monitoring**
7.  **Reliable qualification logic**
8.  **Production-safe database and API**
9.  **Professional visual design**
10. **Easy event setup and management**
