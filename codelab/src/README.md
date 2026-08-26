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
  App.jsx               route map
  index.css             brand palette as CSS variables, reset, .btn/.badge
  config/
    navigation.js       roles, post-login routes, sidebar links per role
  mock/
    data.js             fake data — delete when the backend exists
  utils/
    format.js           formatDate, dueLabel, initials
  components/           reusable building blocks, each with its own .css
    DashboardLayout.jsx topbar + sidebar + <Outlet/> shell for all roles
    Sidebar.jsx
    Topbar.jsx
    StatCard.jsx
    ClassCard.jsx
    DataTable.jsx
    Icon.jsx            small inline-SVG icon set
  pages/                one folder per role, one file (+ .css) per screen
    Login.jsx
    Placeholder.jsx     stand-in for sidebar links that are not built yet
    admin/AdminDashboard.jsx
    teacher/TeacherDashboard.jsx
    student/StudentDashboard.jsx
```

Pages are added as they are built. A page file is created when its route
is created in `App.jsx`, not before, so there are no empty files.
The planned screens are:

- `pages/admin/` — Teachers, Students, Classes, Settings
- `pages/teacher/` — Classes, ClassDetails, Assignments, Students, Settings
- `pages/student/` — Classes, Assignments, Grades, Settings

## Conventions

- **Colours:** use the CSS variables in `src/index.css` (`--cl-primary`,
  `--cl-accent`, …). Do not add new saturated colours.
- **CSS:** one `.css` file next to each component or page, containing only
  that component's rules. Global rules live in `src/index.css` only.
- **Data:** components receive data through props; pages are the only place
  that import from `mock/` (later: call the API).
- **Routes:** every sidebar link in `config/navigation.js` must have a
  matching `<Route>` in `App.jsx` (or fall through to `Placeholder`).

## Roadmap

1. Admin: Teachers page (list, add, remove)
2. Teacher: Classes page, class details, add students
3. Auth context + login state (still frontend-only)
4. Express backend: auth, users, classes, invitations
5. Assignments, submissions, grades
