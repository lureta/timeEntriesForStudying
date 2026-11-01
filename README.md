# Studyday

Studyday is a weekly study calendar with click-to-add time slots, a focus timer, course analytics, and optional Google Calendar integration.

## Run locally

```bash
npm install
npm run dev
```

## Calendar and submission

Click any hour in the weekly calendar to create a study entry. New entries are drafts. **Submit hours** on a study block confirms its hours as actual. Use **Save & submit hours** in the entry editor, or **Submit all draft hours** in the weekly timesheet header for bulk submission. Drafts remain projected time. Analytics distinguishes your manually set goal, projected hours (draft plus submitted), and actual hours (submitted only); submitting does not shrink the projection. Submission status saves to Supabase for the signed-in user. It does not send hours to Workday. Entries can be edited or deleted; edits return a submitted entry to draft.

Manage categories to create, rename, delete, and choose a color for each category. Use **Appearance** to choose a wallpaper theme, upload a wallpaper, set its tint, and customize the sidebar color. These choices sync to your signed-in account, including saved uploaded wallpapers and banner colors.

## Google Calendar setup

1. Create a project in [Google Cloud Console](https://console.cloud.google.com/).
2. Enable **Google Calendar API**.
3. Configure the **Google Auth Platform / OAuth consent screen**. If in Testing mode, add your Google account as a test user.
4. Create an **OAuth client ID** of type **Web application**. Add `http://localhost:5173` and your eventual deployed HTTPS origin to **Authorized JavaScript origins**.
5. Copy `.env.example` to `.env.local`, set `VITE_GOOGLE_CLIENT_ID` to your web OAuth client ID, and restart the dev server.
6. Click **Connect Google Calendar**. The app requests `calendar.readonly` and `calendar.events` permissions and reads events for the selected week from every calendar visible to your account, including all-day events. Click a Google event to edit its title and start/end times; saving updates Google Calendar and notifies guests. Only calendars with edit access can be changed. For recurring events, edits affect only the selected occurrence.

The Google access token is kept in memory, so reconnect after refreshing. Only the current selected week is fetched; the schedule scrolls through the full 24-hour day.

## Supabase session sync

1. For a new Supabase project, run [`supabase/schema.sql`](supabase/schema.sql) in the SQL Editor. If your `study_sessions` table and per-user RLS policies already exist, leave them intact. Run the migrations below before using the updated app; no Realtime publication is required.
2. In **Authentication → Providers**, enable Google and configure the OAuth client. Add the callback URL shown by Supabase to the Google OAuth client's authorized redirect URIs.
3. In **Authentication → URL Configuration**, allow `http://localhost:5173/` and `https://lureta.github.io/timeEntriesForStudying/` as redirect URLs.
4. Copy `.env.example` to `.env.local` and set `VITE_SUPABASE_URL` plus `VITE_SUPABASE_PUBLISHABLE_KEY`. Never put a service-role key in the browser app.
5. In GitHub repository **Settings → Secrets and variables → Actions**, add `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY`. Add `VITE_GOOGLE_CLIENT_ID` too if the deployed app should show Google Calendar events.
6. Use **Sign in with Google** in Studyday. Supabase login is separate from the optional Google Calendar connection.

Legacy local sessions are retained in browser storage but are not moved into Supabase automatically. Import and CSV export controls have been removed. Run `supabase/migrations/20261101_workspace_sync.sql` to add the account-scoped `user_settings` table and its RLS policy. This syncs goals, categories, category colors, notes, tasks, event-color overrides, saved color themes, timer preferences, and appearance settings/files. Submission status syncs with each session. For an existing project, run `supabase/migrations/20261101_session_status.sql` once before using this version; it adds the status column without replacing tables or policies. Existing cloud sessions start as drafts because their prior submission state was never stored.

## Deploy with GitHub Pages

1. In the repository settings, open **Pages** and set the source to **GitHub Actions**.
2. Push to `main`; `.github/workflows/deploy.yml` builds and deploys the site automatically.
3. To enable Google Calendar on the deployed site, add a repository Actions secret named `VITE_GOOGLE_CLIENT_ID` and add the GitHub Pages origin to the OAuth client's authorized JavaScript origins. Add the Supabase secrets listed above for cloud sessions.

Study sessions and account settings are available across devices after signing into the same account. Existing cloud settings take precedence during sign-in. The first account on a browser receives its legacy local settings when no corresponding cloud value exists; existing local copies are retained. Each setting syncs independently, so updating a note does not overwrite a goal changed on another device. Simultaneous changes to the same setting (such as the same task list) use the last successful save.

While signed in, sessions refresh every 30 seconds while the page is visible, and when returning to the app or reconnecting. Submission status survives refresh, logout, and signing in on another device. Editing a submitted session returns it to draft. Google Calendar uses its own authorization, separate from Supabase sign-in. Reconnect existing Calendar connections to grant event-editing permission. For Calendar on GitHub Pages, add `https://lureta.github.io` to the Google OAuth client's authorized JavaScript origins (without the repository path).

To verify an existing setup, sign in locally, create a uniquely named session, and check its row in Supabase's Table Editor. Refresh the app, then sign into the deployed app on another device using the same Google account. The session should appear; edits and deletions should appear on the other device within 30 seconds or when returning to its tab. Connect Google Calendar separately and confirm the selected week's events appear.

## Deploy with AWS Amplify

1. Push this project to GitHub (do not commit `.env.local`).
2. In AWS Amplify Hosting, select **Deploy an app** > **GitHub** and select this repository and `main` branch.
3. Set build command to `npm run build` and output directory to `dist` if not autodetected.
4. In Amplify's environment variables, set `VITE_GOOGLE_CLIENT_ID` to your public OAuth web client ID and redeploy.
5. Add your Amplify HTTPS domain to Google Cloud's **Authorized JavaScript origins**.

## Important storage limitation

When Supabase is configured, study sessions are saved in the authenticated user's `study_sessions` rows. Without Supabase configuration or while signed out, new cloud writes are unavailable; existing local sessions remain untouched in browser storage. Without Supabase, settings remain browser-local. Active focus timers, unsaved form drafts, and Google Calendar access tokens do not sync. Wait for “Account data synced” before leaving; failed saves show an error and retry control.

## Before deploying this update

1. Apply `supabase/migrations/20261101_session_status.sql` if the status column is not present.
2. Apply `supabase/migrations/20261101_workspace_sync.sql`. It adds a new table and policy without recreating existing sessions or their policies.
3. Open the new local build in two independent browser sessions and sign into the same account. Verify a submitted session, task completion/deletion, note, goal, category rename/color, saved color theme, uploaded wallpaper, and banner color. Changes should appear within 30 seconds or when returning to the other tab.
4. Sign into a different account to verify isolation. Check Google Calendar separately after reconnecting; its OAuth token and active timer remain device-local.
5. Confirm “Account data synced” and no sync errors before deploying. Local automated tests cover sync behavior with a simulated backend, not the live project's RLS or authenticated database access.

Run sync checks with `node --experimental-strip-types --test tests/workspaceData.test.mjs tests/workspaceSync.test.mjs` (Node 22 or newer).
