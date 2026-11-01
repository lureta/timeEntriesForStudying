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

## Deploy with GitHub Pages

1. In the repository settings, open **Pages** and set the source to **GitHub Actions**.
2. Push to `main`; `.github/workflows/deploy.yml` builds and deploys the site automatically.
3. To enable Google Calendar on the deployed site, add a repository Actions secret named `VITE_GOOGLE_CLIENT_ID` and add the GitHub Pages origin to the OAuth client's authorized JavaScript origins.

Browser storage is scoped to the site origin. Entries saved on localhost will not automatically appear on the GitHub Pages origin, but entries created there persist in that browser across visits. Storage does not sync across devices.

## Deploy with AWS Amplify

1. Push this project to GitHub (do not commit `.env.local`).
2. In AWS Amplify Hosting, select **Deploy an app** > **GitHub** and select this repository and `main` branch.
3. Set build command to `npm run build` and output directory to `dist` if not autodetected.
4. In Amplify's environment variables, set `VITE_GOOGLE_CLIENT_ID` to your public OAuth web client ID and redeploy.
5. Add your Amplify HTTPS domain to Google Cloud's **Authorized JavaScript origins**.

## Important storage limitation

Study entries are saved to **localStorage in the current browser only**. This means they survive page refreshes on that browser but **do not sync between your phone and laptop**, and can be lost if browser storage is cleared. The app is deployable as-is, but cross-device persistence requires an authenticated backend/database (such as Cognito + API Gateway/Lambda + DynamoDB). Do not mistake hosting for cloud data storage.

Use **Export CSV** to back up entries until cloud storage is implemented.
