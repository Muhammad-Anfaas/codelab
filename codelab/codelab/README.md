# Codelab

An educational coding platform with three kinds of users: one root **admin**,
**teachers** (created by the admin), and **students** (invited by teachers).

Frontend: React + Vite (JavaScript, plain CSS).
Backend (planned): Node.js + Express + PostgreSQL.

## Run it

```bash
git clone <repository>
cd codelab
npm install
npm run dev
```

Then open the URL Vite prints (normally http://localhost:5173).

Other scripts: `npm run build` (production build into `dist/`),
`npm run preview` (serve that build), `npm run lint`.

## Current state: frontend with mock data

There is no backend yet. The login page accepts these emails with **any**
password and only decides which dashboard to show:

| Email                 | Lands on   |
| --------------------- | ---------- |
| `admin@codelab.dev`   | `/admin`   |
| `teacher@codelab.dev` | `/teacher` |
| `student@codelab.dev` | `/student` |

Everything the dashboards display comes from `src/mock/data.js`. That file
is shaped like the JSON the API will return, so each page can later swap one
`import` for one `fetch()`.

Nothing in the frontend is a security boundary. Anyone can type `/admin`
into the address bar. Authorization will be enforced by the backend, which
will refuse to return data a session is not allowed to see.

## Folder structure

```
public/
  background.jpg        login background
  logo.svg              brand mark (also used as the favicon)
src/
  main.jsx              entry point (unchanged Vite default)
  App.jsx               route map; wraps everything in DataProvider
  index.css             design tokens (light + dark), reset, .btn/.badge/forms
  config/
    navigation.js       roles, post-login routes, sidebar links per role
  data/                 in-memory "database" for the frontend-only phase
    context.js          the React context object
    DataProvider.jsx    holds the state; each action is named after its future API call
    useData.js          hook pages call to read state / get actions
    selectors.js        pure helpers that join the raw arrays (students in a class, …)
  hooks/
    useTheme.js         light/dark theme, remembered in localStorage
  mock/
    data.js             seed rows + still-static data — delete when the backend exists
  utils/
    format.js           formatDate, dueLabel, initials
    validate.js         isValidEmail
  components/           reusable building blocks, each with its own .css
    DashboardLayout.jsx topbar + sidebar + <Outlet/> shell for all roles
    Sidebar.jsx  Topbar.jsx
    StatCard.jsx  ClassCard.jsx  DataTable.jsx
    Modal.jsx  ConfirmDialog.jsx  Notice.jsx
    InviteForm.jsx      name + email form (invite teacher / add student)
    Icon.jsx            small inline-SVG icon set
  pages/                one folder per role, one file (+ .css) per screen
    Login.jsx
    Placeholder.jsx     stand-in for sidebar links that are not built yet
    admin/    AdminDashboard.jsx  Teachers.jsx
    teacher/  TeacherDashboard.jsx  Classes.jsx  ClassForm.jsx  ClassDetails.jsx
    student/  StudentDashboard.jsx
```

### How a screen gets on the page

1. `index.html` loads `src/main.jsx`, which renders `<App/>`.
2. `App.jsx` matches the URL to a route. `/teacher/classes/3` matches the
   `/teacher` layout route, so `DashboardLayout` renders (topbar, sidebar)
   and puts `ClassDetails` in its `<Outlet/>`.
3. The page calls `useData()` for state and actions, and `useOutletContext()`
   for the logged-in user.
4. It passes plain props to components (`DataTable`, `ClassCard`, …), which
   know nothing about the store.

### How data changes

Pages never mutate state directly. They call an action from `useData()`
(`addTeacher`, `createClass`, `addStudentToClass`, …). The action updates
React state inside `DataProvider`, and every page reading that state
re-renders — that's why the dashboard count changes when a teacher is
added. Each action is a stand-in for one API endpoint; the backend step
replaces its body with a `fetch()`.

Pages that are still static (assignments, grades, activity feeds) read
from `mock/data.js` directly and are marked with a comment.

Planned screens not built yet:

- `pages/admin/` — Students, Classes, Settings
- `pages/teacher/` — Assignments, Students, Settings
- `pages/student/` — Classes, Assignments, Grades, Settings

## Conventions

- **Colours:** use the CSS variables in `src/index.css` (`--cl-primary`,
  `--cl-accent`, …). Do not add new saturated colours.
- **CSS:** one `.css` file next to each component or page, containing only
  that component's rules. Global rules live in `src/index.css` only.
- **Data:** pages read/write through `useData()`; components only receive
  props. Nothing outside `src/data/` and `src/mock/` knows how data is stored.
- **Theme:** every colour in component CSS is a semantic token
  (`--cl-surface`, `--cl-emphasis`, …) defined once for light and once for
  dark in `index.css`. Never hard-code a hex in a component.
- **Routes:** every sidebar link in `config/navigation.js` must have a
  matching `<Route>` in `App.jsx` (or fall through to `Placeholder`).

## Roadmap

1. ~~Admin: Teachers page (list, add, remove)~~ done
2. ~~Teacher: Classes page, class details, add students~~ done
3. Admin: Students and Classes pages; teacher: Students page
4. Auth context + login state (still frontend-only)
5. Express backend: auth, users, classes, invitations
6. Assignments, submissions, grades
