# Studyday

Studyday is a spin on Workday. Instead of tracking your work hours, you track your study hours.

Just like employees clock in their hours at work, students can log their time studying, preparing for interviews, working on personal projects, etc.

Plan your hours, submit your timesheet, and see where your time actually goes.

## Tech Stack
Frontend: React, TypeScript, Vite
Backend / Database: Supabase, PostgreSQL
Authentication: Supabase Auth, Google OAuth 2.0
External APIs: Google Calendar API
Cloud Hosting: GitHub Pages
CI/CD: GitHub Actions
Features

Timesheet Management

Create and manage study sessions through an interactive weekly calendar.

Schedule projected study hours by selecting or dragging across time blocks.

Submit completed sessions individually or submit an entire week's timesheet.

Categorize study sessions by coursework, interview preparation, personal projects, or custom activities.

Edit session details, including time, category, name, and notes.

Track projected hours separately from actual completed hours.

Google Calendar Integration

Connect Google Calendar using OAuth 2.0.

Display events from multiple Google calendars alongside study sessions.

View existing commitments to better plan available study time.

Edit Google Calendar event titles and times directly from Studyday when authorized.

Support individual occurrences of recurring Google Calendar events.

Productivity Analytics

Track daily and weekly study hours.

Compare projected hours against actual completed hours.

Set personalized study goals with custom hour targets.

Create category-specific goals for different activities.

Visualize how study time is distributed across categories.

Track progress toward multiple goals without double-counting sessions.

Recurring Schedules and Goals

Schedule repeating study sessions daily, weekly, or on selected weekdays.

Create recurring daily, weekly, and category-specific goals.

Configure recurrence end dates.

Edit or delete individual study sessions without modifying other occurrences.

Prevent duplicate sessions when generating recurring schedules.

Cloud Synchronization

Sign in securely with Google using Supabase Authentication.

Persist study sessions and account settings in PostgreSQL.

Access saved study data across devices.

Synchronize goals, categories, tasks, notes, and appearance preferences.

Use PostgreSQL Row Level Security (RLS) to restrict users to their own data.

Refresh sessions periodically and when returning to the application.

Workspace Customization

Create and manage custom study categories.

Assign colors to activities for easier calendar visualization.

Manage personal notes and tasks.

Customize themes, wallpapers, and workspace appearance.

Save preferences to the authenticated account.

System Architecture

Studyday is a React single-page application that integrates Supabase for authentication and persistent storage and the Google Calendar API for external calendar functionality.

                   User
                     |
                     v
             React + TypeScript
                Vite Frontend
                     |
          +----------+-----------+
          |                      |
          v                      v
    Supabase Client        Google Calendar API
          |                      ^
          |                      |
          v                Google OAuth 2.0
     Supabase Auth
          |
          v
      PostgreSQL
          |
    +-----+----------+
    |                |
    v                v
study_sessions   user_settings
    |                |
    +-------+--------+
            |
            v
     Row Level Security

Deployment:
GitHub -> GitHub Actions -> GitHub Pages

Architecture Overview

Frontend: React and TypeScript power the interactive calendar, study session management, productivity dashboards, and workspace settings. Vite handles development and production builds.

Authentication: Supabase Auth manages user sign-in and authenticated application sessions. Google Calendar uses a separate OAuth authorization flow to request calendar permissions.

Database: Supabase PostgreSQL stores study sessions and account-specific settings. Row Level Security ensures users can only access their own records.

External API: The Google Calendar API retrieves events for the selected week and supports authorized event updates.

Synchronization: Session data is refreshed every 30 seconds while the application is visible, as well as when users return to the application or reconnect. Settings are saved independently to reduce unrelated update conflicts.

Deployment: GitHub Actions automatically builds and deploys the application to GitHub Pages when changes are pushed to the main branch.

Engineering Highlights

Projected vs. Actual Time Tracking

Implemented a timesheet submission system that distinguishes between planned and completed study hours.

Study sessions can remain projected or be submitted as actual hours. Submitting a session updates completed-time analytics without removing those hours from the original projection.

This allows students to compare their planned workload against actual study activity.

Cross-Device Data Synchronization

Integrated Supabase PostgreSQL to persist study sessions and account preferences across devices.

Account settings are stored independently using JSONB key-value records, allowing updates to different settings without overwriting unrelated data.

The synchronization system includes periodic refreshes, reconnect handling, save-error feedback, and last-successful-save behavior for concurrent updates to the same setting.

Authentication and Data Security

Implemented Google sign-in through Supabase Auth with PostgreSQL Row Level Security policies for account-level data isolation.

Separated application authentication from Google Calendar authorization, allowing users to access Studyday without granting calendar permissions.

Google Calendar access tokens remain in browser memory rather than being persisted in the application database.

Recurring Scheduling Logic

Developed recurrence functionality supporting daily, weekly, and selected-weekday schedules with configurable end dates.

Recurring sessions are generated as individual records, allowing independent edits and submissions.

The recurrence logic also handles duplicate prevention and daylight-saving time boundaries.

Automated Testing and Deployment

Added automated tests for recurring schedules, category goal matching, synchronization logic, and daylight-saving time behavior.

Configured GitHub Actions to automate production builds and deployment to GitHub Pages.

Database Design

Studyday uses two primary PostgreSQL tables.

Table

Purpose

study_sessions

Stores study sessions, timestamps, categories, names, and submission status

user_settings

Stores account-specific goals, categories, tasks, notes, and workspace preferences using JSONB

Both use account-scoped access controls through PostgreSQL Row Level Security.

Database migrations are maintained in supabase/migrations/.

Getting Started

Prerequisites

Node.js 22+

npm

Supabase project

Google Cloud project (for Google Calendar integration)

Installation

1. Clone the repository

git clone https://github.com/lureta/timeEntriesForStudying.git
cd timeEntriesForStudying

2. Install dependencies

npm install

3. Configure environment variables

Create a local environment file:

cp .env.example .env.local

Add your credentials:

VITE_SUPABASE_URL=
VITE_SUPABASE_PUBLISHABLE_KEY=
VITE_GOOGLE_CLIENT_ID=

The Google Calendar client ID is only required if enabling Calendar integration.

4. Set up Supabase

Run supabase/schema.sql in the Supabase SQL Editor for a new project.

Apply the relevant migrations in supabase/migrations/ for session status, session names, and workspace synchronization.

Enable Google authentication in Supabase and configure the appropriate OAuth redirect URLs.

5. Start the development server

npm run dev

Open http://localhost:5173 in your browser.

Testing

Run the automated test suite:

node --experimental-strip-types --test tests/*.test.mjs

Create a production build:

npm run build

Automated tests cover recurrence logic and simulated synchronization behavior. Live authentication, Row Level Security, and cross-device synchronization should also be verified against a configured Supabase project.

Deployment

Studyday is hosted on GitHub Pages and deployed automatically using GitHub Actions.

The deployment workflow:

Triggers when changes are pushed to main.

Installs dependencies and builds the Vite application.

Publishes the production build to GitHub Pages.

The application can also be deployed through AWS Amplify Hosting.

Current Limitations

Cross-device updates use periodic refreshes rather than real-time database subscriptions.

Active timers, unsaved drafts, and Google Calendar access tokens remain device-local.

Google Calendar requires separate authorization and reconnection after refreshing.

Concurrent changes to the same settings record use the last successful save.

Legacy browser-local study sessions are not automatically migrated to Supabase.

Future Improvements

Real-time synchronization using Supabase Realtime.

Expanded productivity analytics and long-term study trends.

Improved offline support and synchronization conflict resolution.

Additional integration tests for authentication and database access.

Study streaks and more detailed progress reporting.

Studyday — Plan your hours. Submit your timesheet. Track your progress.rgets remain attached to the original default daily/weekly goal.
