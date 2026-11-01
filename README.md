# Studyday

Studyday is a weekly study calendar with click-to-add time slots, a focus timer, course analytics, CSV export, and optional Google Calendar read-only integration.

## Run locally

```bash
npm install
npm run dev
```

## Calendar and submission

Click any hour in the weekly calendar to create a study entry. New entries are drafts. **Submit week** marks all draft entries in the selected week as submitted in this browser; submitted entries are read-only. This is a local workflow only and does not send hours to Workday. Entries can be edited or deleted; edits return a submitted entry to draft.

Manage categories to create, rename, delete, and choose a color for each category. Use **Appearance** to choose a wallpaper theme, upload a wallpaper, set its tint, and customize the sidebar color. These choices are saved in local browser storage.

## Google Calendar setup

1. Create a project in [Google Cloud Console](https://console.cloud.google.com/).
2. Enable **Google Calendar API**.
3. Configure the **Google Auth Platform / OAuth consent screen**. If in Testing mode, add your Google account as a test user.
4. Create an **OAuth client ID** of type **Web application**. Add `http://localhost:5173` and your eventual deployed HTTPS origin to **Authorized JavaScript origins**.
5. Copy `.env.example` to `.env.local`, set `VITE_GOOGLE_CLIENT_ID` to your web OAuth client ID, and restart the dev server.
6. Click **Connect Google Calendar**. The app requests `calendar.readonly` permission and reads events for the selected week from every calendar visible to your account, including all-day events. It does not modify Google Calendar events.

The Google access token is kept in memory, so reconnect after refreshing. Only the current selected week is fetched; the schedule scrolls through the full 24-hour day.

## Supabase session sync

1. For a new Supabase project, run [`supabase/schema.sql`](supabase/schema.sql) in the SQL Editor. If your `study_sessions` table and per-user RLS policies already exist, skip this step; this integration requires no additional SQL or Realtime publication.
2. In **Authentication → Providers**, enable Google and configure the OAuth client. Add the callback URL shown by Supabase to the Google OAuth client's authorized redirect URIs.
3. In **Authentication → URL Configuration**, allow `http://localhost:5173/` and `https://lureta.github.io/timeEntriesForStudying/` as redirect URLs.
4. Copy `.env.example` to `.env.local` and set `VITE_SUPABASE_URL` plus `VITE_SUPABASE_PUBLISHABLE_KEY`. Never put a service-role key in the browser app.
5. In GitHub repository **Settings → Secrets and variables → Actions**, add `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY`. Add `VITE_GOOGLE_CLIENT_ID` too if the deployed app should show Google Calendar events.
6. Use **Sign in with Google** in Studyday. Supabase login is separate from the optional Google Calendar connection.

Legacy local sessions are not moved automatically. After sign-in, choose **Import local sessions** to review and import them; duplicates are skipped and the local copy is retained. The app does not sync goals, categories, category colors, or appearance settings because the provided schema has no corresponding tables. Submission status is also local-only because `study_sessions` has no status column.

## Deploy with GitHub Pages

1. In the repository settings, open **Pages** and set the source to **GitHub Actions**.
2. Push to `main`; `.github/workflows/deploy.yml` builds and deploys the site automatically.
3. To enable Google Calendar on the deployed site, add a repository Actions secret named `VITE_GOOGLE_CLIENT_ID` and add the GitHub Pages origin to the OAuth client's authorized JavaScript origins. Add the Supabase secrets listed above for cloud sessions.

Appearance, goals, categories, and category colors remain in browser storage. They are scoped to the site origin and do not sync across devices. Supabase study sessions are available across devices after signing into the same account.

While signed in, sessions refresh every 30 seconds while the page is visible, and when returning to the app or reconnecting. Submission status stays in memory for cloud sessions and resets on a full page reload. Google Calendar uses its own read-only authorization, separate from Supabase sign-in. For Calendar on GitHub Pages, add `https://lureta.github.io` to the Google OAuth client's authorized JavaScript origins (without the repository path).

To verify an existing setup, sign in locally, create a uniquely named session, and check its row in Supabase's Table Editor. Refresh the app, then sign into the deployed app on another device using the same Google account. The session should appear; edits and deletions should appear on the other device within 30 seconds or when returning to its tab. Connect Google Calendar separately and confirm the selected week's events appear.

## Deploy with AWS Amplify

1. Push this project to GitHub (do not commit `.env.local`).
2. In AWS Amplify Hosting, select **Deploy an app** > **GitHub** and select this repository and `main` branch.
3. Set build command to `npm run build` and output directory to `dist` if not autodetected.
4. In Amplify's environment variables, set `VITE_GOOGLE_CLIENT_ID` to your public OAuth web client ID and redeploy.
5. Add your Amplify HTTPS domain to Google Cloud's **Authorized JavaScript origins**.

## Important storage limitation

When Supabase is configured, study sessions are saved in the authenticated user's `study_sessions` rows. Without Supabase configuration or while signed out, new cloud writes are unavailable; existing local sessions remain available for the explicit import flow. Browser-local goals, categories, and appearance settings can be lost if browser storage is cleared.

Use **Export CSV** to keep an independent backup of your entries.
