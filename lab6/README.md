# Lab 6 - Kvadrat Studio Planner

Kvadrat Studio Planner is a client-side React app for managing acting academy rehearsal sessions. It continues the Kvadrat acting academy topic from the previous labs, but changes the experience from a static/CMS site into an interactive front-end dashboard.

Live URL after GitHub Pages deploy:

- https://maxroenco.github.io/Lab2/lab6/

Repository URL:

- https://github.com/MaxRoenco/Lab2

## App Description

The app manages acting studio sessions as entities. A session has a title, course, level, date, time, mentor, capacity, status, notes, favorite state, and creation timestamp.

Users can:

- Add a new rehearsal or class session.
- Edit existing session details.
- Remove sessions.
- Like or unlike sessions as favorites.
- Search by title, mentor, notes, or course.
- Filter by course, level, status, and favorites.
- Sort by upcoming date or newest created.
- Switch between light and dark themes.
- Reset the seeded demo data.

## User Flows

1. Add session flow
   - Fill in title, course, level, date, time, mentor, capacity, status, and notes.
   - Submit the form.
   - The new session appears in the calendar list and is saved in the browser.

2. Edit session flow
   - Press `Edit` on a session card.
   - The form loads that session.
   - Change the fields and save.
   - The updated card remains persisted after refresh.

3. Favorite flow
   - Press `Like` on a session card.
   - The card is marked as liked.
   - Enable `Favorites only` to see only liked sessions.

4. Filter flow
   - Type in search or choose course, level, status, favorites, and sort options.
   - The visible session list updates immediately.
   - If nothing matches, the app shows an empty state with a clear filters action.

5. Theme flow
   - Press the theme toggle in the header.
   - The app switches between light and dark mode.
   - The selected theme is saved in `localStorage`.

## Requirements Checklist

- Front-end framework/library: React + Vite + TypeScript.
- Client-side only app: no backend and no server-rendered pages.
- Manipulable entities: sessions can be added, edited, removed, liked, filtered, and sorted.
- Runtime state: React state stores the active app data.
- Browser storage: `localStorage` persists sessions, filters, and theme.
- Custom style: Kvadrat-inspired dashboard theme with responsive layout.
- Light/dark version: theme toggle with persistence.
- Public link: GitHub Pages deployment target is `/Lab2/lab6/`.
- README includes description and flows.

## Browser Storage Keys

- `kvadrat_lab6_sessions`
- `kvadrat_lab6_theme`
- `kvadrat_lab6_filters`

## Run Locally

From the `lab6` folder on Windows PowerShell:

```powershell
npm.cmd install
npm.cmd run dev
```

Local app URL:

- http://localhost:5173

Build locally:

```powershell
npm.cmd run build
```

Preview the production build:

```powershell
npm.cmd run preview
```

## Deployment

The Vite app is configured with:

```ts
base: "/Lab2/lab6/"
```

The GitHub Actions workflow builds `lab6`, copies the current root static site into the Pages artifact, copies the Lab 6 build into `public/lab6`, and deploys the result to GitHub Pages.

Expected live URL:

- https://maxroenco.github.io/Lab2/lab6/

## Suggested Git History

Recommended commits for grading:

1. `chore(lab6): scaffold react vite app`
2. `feat(lab6): add session planner state and persistence`
3. `feat(lab6): add filtering theme and responsive UI`
4. `docs(lab6): document app flows and deployment`
5. `ci(lab6): add github pages deployment`

Recommended pull requests:

- PR 1: scaffold + README skeleton.
- PR 2: session CRUD and persistence.
- PR 3: filters, theme, responsive UI, and deployment workflow.
