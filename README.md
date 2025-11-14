# Team Task and Workflow Management System (SaaS-style)

A full‑stack MERN application for team task and workflow management with projects, labels, time tracking, file attachments, notifications, role‑based access, and CSV/PDF/XLSX exports.

## Features
- **Projects & Tasks** with statuses (todo/doing/done), labels, priorities, due dates
- **Kanban-style interactions** and reordering
- **Time tracking** on tasks
- **File uploads & attachments**
- **Comments & Activity feed**
- **Notifications** with unread counts and scheduled due alerts
- **Admin** user management
- **Exports**: CSV, PDF, XLSX

## Tech Stack
- **Client**: React (Vite), React Router, Zustand, Tailwind CSS, lucide-react, dnd-kit
- **Server**: Node.js, Express, Mongoose (MongoDB), JWT, Nodemailer, node-cron, helmet, cors, express-validator, pdfkit, xlsx

## Monorepo Structure
```
/ (repo root)
├─ taskmate-client/     # React + Vite frontend
└─ server/              # Express + MongoDB backend
```

## Prerequisites
- Node.js 18+
- MongoDB (local or remote)
- Git

## Environment Variables
Create a `.env` file under `server/` using the example below.

`server/.env.example` (copy to `server/.env` and fill values):
```
PORT=4000
MONGO_URI=mongodb://127.0.0.1:27017/taskmate
JWT_SECRET=replace_with_a_long_random_string
CLIENT_URL=http://localhost:5173

# SMTP (for email notifications)
SMTP_HOST=smtp.example.com
SMTP_PORT=465
SMTP_SECURE=true
SMTP_USER=your_smtp_username
SMTP_PASS=your_smtp_password_or_app_password
MAIL_FROM="Taskmate <no-reply@example.com>"
```

Client development server can be configured to talk to your API by setting:

`taskmate-client/.env` (optional):
```
VITE_API_URL=http://localhost:4000
```
If not set, the client defaults to `http://localhost:4000`.

## Install & Run (Local)
- Server
  - **Install**: `npm install` (in `server/`)
  - **Run (dev)**: `npm run dev`
  - Default: http://localhost:4000
- Client
  - **Install**: `npm install` (in `taskmate-client/`)
  - **Run (dev)**: `npm run dev`
  - Default: http://localhost:5173

## Scripts
- Server (`server/package.json`)
  - `npm run dev` – start with nodemon
  - `npm start` – start production server
- Client (`taskmate-client/package.json`)
  - `npm run dev` – Vite dev server
  - `npm run build` – production build
  - `npm run preview` – preview built client

## Build & Deploy Notes
- Build the client: `npm run build` in `taskmate-client/` (outputs to `dist/`)
  - Serve `dist/` via any static host. The API must be reachable at `VITE_API_URL` used at build/runtime.
  - Ensure server `.env` never gets committed. Use CI/CD secrets for production SMTP/JWT/Mongo.

## License
MIT or your preferred license.

## Screenshots
Place screenshots under `docs/screenshots/` and the README will render them here.

- **Auth · Login**
  
  ![Auth Login](docs/screenshots/auth-login.png)

- **Dashboard**
  
  ![Dashboard](docs/screenshots/dashboard.png)

- **Tasks Board**
  
  ![Tasks Board](docs/screenshots/tasks-board.png)

- **Project Details**
  
  ![Project Details](docs/screenshots/project-details.png)

- **Exports (CSV/PDF/XLSX)**
  
  ![Exports](docs/screenshots/exports.png)

- **Admin · Users**
  
  ![Admin Users](docs/screenshots/admin-users.png)

Tip: Capture with consistent window size and light theme for visual consistency.

## Usage Flows

- **Sign up / Sign in**
  - Register via `/auth/register` or sign in at `/auth/login`.
  - A JWT is stored in localStorage and used for subsequent API calls.

- **Create a Project**
  - Open Projects → New Project → fill title, description, status.
  - Select project in the sidebar Project picker to scope your work.

- **Manage Tasks**
  - Create tasks within a selected project.
  - Set status (todo/doing/done), priority, due date, labels, assignees.
  - Reorder tasks and manage dependencies; track time entries.

- **Comments & Activity**
  - Add comments to tasks, view activity feed for changes.

- **Files & Attachments**
  - Upload files and attach them to tasks. Remove when not needed.

- **Notifications**
  - Bell icon shows unread count; open to view latest notifications.
  - A scheduler can generate due-date reminders.

- **Exports**
  - Use Import/Export menu on the page header to export CSV, PDF, or XLSX filtered by current view.

- **Admin · Users**
  - Admin role can manage users (create/update/status, reset password).

## Adding Your Own Screenshots
1. Create folder `docs/screenshots/` if it does not exist.
2. Save PNGs with descriptive names (e.g., `tasks-board.png`, `admin-users.png`).
3. The README already references common scenes; rename or add more as needed.
