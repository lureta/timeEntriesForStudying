
# Studyday

**Studyday** is a spin on Workday. Instead of tracking your work hours, you track your study hours.

Just like employees submit timesheets at work, students can log time spent studying, preparing for technical interviews, completing coursework, and building personal projects.

Plan your hours, submit your timesheet, and see where your time actually goes.

### [Deployed Website](https://lureta.github.io/timeEntriesForStudying/)

---

## Overview

Studyday is a full-stack productivity web application that brings workplace-style time tracking to academic life.

Instead of simply starting and stopping a timer, students can plan their schedules, log completed study hours, submit weekly timesheets, and analyze their productivity.

The application combines **interactive scheduling, recurring sessions, goal tracking, Google Calendar integration, cloud synchronization, and productivity analytics** in one customizable workspace.

### What makes Studyday different?

- **Workday-inspired timesheets:** Treat study sessions like work hours, with projected and submitted entries.
- **Planned vs. actual tracking:** Compare the time you intended to study against the time you completed.
- **Google Calendar integration:** View existing commitments alongside your study schedule.
- **Personalized analytics:** Track productivity by category, day, week, and goal.
- **Cloud synchronization:** Access study data and preferences across devices.
- **Recurring schedules:** Automate repeating study sessions and goals.

---

## Tech Stack

| Category | Technologies |
|---|---|
| **Frontend** | React, TypeScript, Vite |
| **Backend & Database** | Supabase, PostgreSQL |
| **Authentication** | Supabase Auth, Google OAuth 2.0 |
| **External APIs** | Google Calendar API |
| **Cloud Hosting** | GitHub Pages |
| **CI/CD** | GitHub Actions |
| **Testing** | Node.js Test Runner |

---

## Features

### 1. Interactive Calendar & Timesheets

Studyday uses a weekly calendar to help students plan and record their study hours.

- **Create sessions:** Click an hour or drag across a time range to schedule study blocks.
- **Projected hours:** Save sessions as planned study time.
- **Actual hours:** Submit completed sessions to record actual study time.
- **Weekly submission:** Submit all projected sessions for the week at once.
- **Session management:** Edit categories, names, times, and notes.
- **Custom categories:** Organize sessions by coursework, LeetCode, personal projects, or other activities.

Submitting a session updates actual hours while preserving its contribution to projected hours.

This allows students to compare their original schedule against completed work.

### 2. Google Calendar Integration

Studyday connects to Google Calendar through **OAuth 2.0** and the **Google Calendar API**.

- Display events from multiple Google calendars.
- View existing commitments alongside Studyday sessions.
- Display all-day events and events from the selected week.
- Edit event titles and start/end times when authorized.
- Modify individual occurrences of recurring Google Calendar events.
- Keep Google Calendar authorization separate from Studyday authentication.

Calendar access is optional, so students can use Studyday without connecting Google Calendar.

### 3. Productivity Analytics

The analytics dashboard provides insights into how students allocate their study time.

- Compare **projected hours, actual hours, and study goals**.
- Track daily and weekly productivity.
- View completed study time by category.
- Create personalized goals with custom hour and minute targets.
- Set category-specific targets.
- Track multiple goals with different category filters.
- Visualize progress toward selected goals.

Sessions can contribute to multiple goals without being double-counted in overall study totals.

### 4. Recurring Study Sessions

Students can automate repetitive schedules instead of manually creating each session.

Supported recurrence options include:

- Every day
- Every week
- Selected weekdays
- Custom recurrence end dates, up to one year

Recurring sessions are generated as individual records.

This allows students to edit, submit, or delete one occurrence without affecting other sessions.

The scheduling logic also prevents duplicate entries and accounts for daylight-saving time boundaries.

### 5. Recurring Goals

Studyday supports recurring productivity goals at multiple levels.

**Daily goals**
- Set one-day targets or recurring daily goals.
- Repeat goals weekly or on selected weekdays.
- Stop future recurrence while preserving previous goals.

**Category goals**
- Create daily or weekly targets for specific categories.
- Repeat goals on selected schedules.
- Override individual occurrences without deleting the recurring rule.
- Copy targets to another day or week.

**Additional goals**
- Create multiple named goals.
- Select which categories contribute to each goal.
- Track actual and projected progress independently.
- Switch between goals in the analytics dashboard.

Goals and recurrence settings are persisted through Supabase.

### 6. Cloud Synchronization & User Accounts

Studyday uses **Supabase Auth** and **PostgreSQL** to support persistent, account-specific data.

- Authenticate using Google.
- Store study sessions in PostgreSQL.
- Synchronize goals, categories, tasks, notes, and appearance preferences.
- Access saved data across devices.
- Refresh sessions every 30 seconds while the application is visible.
- Refresh when returning to the application or reconnecting.
- Use Row Level Security to restrict database access to the authenticated user.

Settings are synchronized independently to reduce conflicts between unrelated changes.

### 7. Workspace Customization

Students can personalize their Studyday workspace.

- Create, rename, and delete study categories.
- Assign custom category colors.
- Manage personal notes and tasks.
- Select wallpaper themes or upload custom backgrounds.
- Adjust wallpaper overlays and banner colors.
- Synchronize preferences across signed-in devices.

---

## System Architecture

Studyday is a **React single-page application** with a Supabase backend and an external Google Calendar integration.

```text
                        User
                          |
                          v
                  React + TypeScript
                     Vite Frontend
                          |
              +-----------+-----------+
              |                       |
              v                       v
        Supabase Client        Google Calendar API
              |                       ^
              |                       |
              v                 Google OAuth 2.0
         Supabase Auth
              |
              v
          PostgreSQL
              |
        +-----+----------+
        |                |
        v                v
  study_sessions    user_settings
        |                |
        +-------+--------+
                |
                v
        Row Level Security


Deployment Pipeline:

GitHub Repository
       |
       v
  GitHub Actions
       |
       v
   Vite Build
       |
       v
   GitHub Pages
```

### Architecture Components

| Component | Responsibility |
|---|---|
| **React Frontend** | Calendar UI, timesheet management, analytics, and workspace customization |
| **Supabase Auth** | Google sign-in and authenticated user sessions |
| **PostgreSQL** | Persistent storage for study sessions and user settings |
| **Row Level Security** | Account-level database access control |
| **Google Calendar API** | External calendar event retrieval and authorized editing |
| **GitHub Actions** | Automated production builds and deployment |
| **GitHub Pages** | Static frontend hosting |

---

## Technical Implementation

### Timesheet State Management

Studyday distinguishes between **projected** and **submitted** sessions.

Projected hours represent the full scheduled workload, including sessions that have already been submitted.

Actual hours represent only submitted sessions.

This separation allows the analytics dashboard to compare planned and completed study time without losing the original projection.

Editing a submitted session returns it to draft status.

### Authentication & Authorization

Studyday uses two separate Google authorization flows.

**Supabase Authentication**
- Identifies users and manages application sessions.
- Enables account-specific cloud storage.
- Works with PostgreSQL Row Level Security policies.

**Google Calendar OAuth**
- Requests permission to read and edit calendar events.
- Operates independently from Supabase sign-in.
- Stores access tokens in browser memory rather than the application database.

This separation allows the core application to function without Google Calendar permissions.

### Database Design

Studyday uses two primary PostgreSQL tables.

| Table | Description |
|---|---|
| `study_sessions` | Stores study session data, including time, category, name, and submission status |
| `user_settings` | Stores account-specific settings using JSONB key-value records |

The `user_settings` table stores data such as:

- Productivity goals and recurrence rules
- Categories and category colors
- Tasks and notes
- Timer preferences
- Event color overrides
- Appearance settings and saved wallpapers

**Security:** PostgreSQL Row Level Security policies restrict access to each authenticated user's data.

Database schema and migrations are maintained in [`supabase/`](supabase/).

### Cross-Device Synchronization

Studyday uses Supabase as its persistent data store.

When signed in:

1. Study sessions and account settings are loaded from Supabase.
2. Changes are saved to the appropriate database records.
3. Sessions refresh every 30 seconds while the application is visible.
4. Data refreshes when users return to the app or reconnect.
5. Save failures display an error and retry option.

Settings are stored independently, so changing a note does not overwrite an unrelated goal.

Simultaneous changes to the same setting use the last successful save.

### Recurrence Logic

Recurring sessions are generated as separate study session records rather than being stored as one continuously repeating event.

The recurrence system supports:

- Weekday selection
- Recurrence end dates
- Duplicate prevention
- Independent occurrence editing
- Daylight-saving time boundaries

Recurring goals use stored rules and period-specific overrides to support flexible scheduling.

---

## Engineering Highlights

### Full-Stack Application Development

Built a React and TypeScript frontend integrated with Supabase PostgreSQL for persistent user data.

The application combines interactive scheduling, state management, authentication, database operations, and analytics.

### Third-Party API Integration

Integrated the Google Calendar API using OAuth 2.0 authorization.

The application retrieves external events and supports authorized updates while keeping calendar permissions separate from application authentication.

### Secure Multi-User Data Storage

Implemented account-scoped data persistence using PostgreSQL Row Level Security.

User sessions, goals, and workspace preferences are associated with authenticated accounts.

### Synchronization & Data Consistency

Implemented periodic cloud synchronization, reconnect handling, independently persisted settings, and save-error feedback.

The design reduces conflicts between unrelated settings while preserving local drafts and active timers.

### Scheduling Algorithms & Edge Cases

Implemented recurring sessions and goals with weekday selection, end dates, duplicate prevention, and daylight-saving time handling.

### CI/CD & Automated Testing

Configured GitHub Actions for automated deployment and added tests for scheduling and synchronization logic.


## Future Improvements

- **AI-Powered Study Planner:** Automatically generate personalized study schedules based on deadlines, priorities, available time, and historical productivity.
- **ELMS Integration:** Connect to ELMS (Canvas) to automatically import course schedules, assignments, quizzes, exams, and deadlines, allowing students to plan study sessions around their academic workload.
- **Advanced Productivity Analytics:** Build interactive dashboards with study trends, productivity predictions, weekly reports, and personalized recommendations.
- **Collaborative Study Workspaces:** Allow students to create study groups, schedule shared sessions, set team goals, and track progress with friends in real time.

---

## Project Links

- **Live Application:** [Studyday](https://lureta.github.io/timeEntriesForStudying/)
- **Source Code:** [GitHub Repository](https://github.com/lureta/timeEntriesForStudying)
