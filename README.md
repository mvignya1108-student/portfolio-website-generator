# Portfolio Website Generator

A full-stack web application that helps students build a professional personal portfolio without manually creating every section. Users can register, sign in, enter their profile, skills, education and projects, preview changes, and publish a shareable public page. An administrator can review platform totals and publish/unpublish portfolios.

## 1. Problem and objectives

Many first-year students have projects and skills but do not know how to build a portfolio website from scratch. This application gives them a guided form and a live preview, then generates a public portfolio page from saved database records.

**Objectives**
- Make portfolio creation accessible to beginners.
- Keep portfolio data persistent in Supabase PostgreSQL.
- Provide signup, signin, ownership protection and an admin role.
- Let a user preview, save, publish and unpublish a portfolio.
- Demonstrate a clear HTML/CSS/JavaScript → Express REST API → PostgreSQL architecture.

## 2. Users and features

- **Visitor:** view a published portfolio using its public URL.
- **Registered user:** create an account, sign in, edit profile/skills/education, manage up to eight projects, preview, publish and copy a public link.
- **Administrator:** view counts and recent portfolios; publish or unpublish portfolios.

The app intentionally does not include custom domains, file uploads, analytics, password reset, email verification, or a drag-and-drop theme editor.

## 3. Technology stack

- HTML5, CSS3, Vanilla JavaScript
- Node.js 20+ and Express 5
- Supabase PostgreSQL
- `@supabase/supabase-js` for database access
- `bcryptjs` for password hashing, `jsonwebtoken` for signed sessions, `helmet`, `compression`, and `express-rate-limit` for baseline security

## 4. Folder structure

```text
portfolio-website-generator/
├── frontend/
│   ├── index.html
│   ├── styles.css
│   └── app.js
├── backend/
│   ├── middleware/auth.js
│   ├── routes/
│   │   ├── admin.js
│   │   ├── auth.js
│   │   ├── portfolio.js
│   │   └── public.js
│   ├── utils/validation.js
│   ├── server.js
│   ├── supabase.js
│   ├── package.json
│   ├── .env.example
│   ├── .gitignore
│   └── .env                 # create locally; never commit
├── database/schema.sql
├── .gitignore
└── README.md
```

## 5. Prerequisites

Install:
- [Visual Studio Code](https://code.visualstudio.com/)
- [Node.js LTS](https://nodejs.org/) (includes npm; use Node 20 or newer)
- [Git](https://git-scm.com/downloads)
- A free [Supabase account](https://supabase.com/)

Check installation in a new terminal:
```bash
node --version
npm --version
git --version
```
Node should be v20 or newer. If a command is not recognized, install the software and reopen the terminal.

## 6. Supabase setup

1. Sign in to Supabase and create a new project.
2. Set and safely store the database password requested by Supabase. This project uses the Supabase API, so the database password itself is not placed in `.env`.
3. Open **SQL Editor → New query**.
4. Copy the complete `database/schema.sql` file into the editor and click **Run**.
5. Open **Table Editor** and confirm `app_users`, `portfolios`, and `portfolio_projects` exist.
6. Open **Project Settings → API** (the label may vary slightly). Copy the Project URL and the server-side `service_role` key. The key is privileged and must remain only in `backend/.env`.

RLS is enabled on all application tables, with no direct browser policies. All data requests go through Express. The server uses the service-role key, which bypasses RLS, so authorization checks in backend routes are essential. Do not expose this key to the browser.

## 7. Environment configuration

From the `backend` directory, copy `.env.example` to `.env` (on Windows PowerShell: `Copy-Item .env.example .env`). Edit `backend/.env`:

```dotenv
PORT=3000
NODE_ENV=development
SUPABASE_URL=https://YOUR-PROJECT-REF.supabase.co
SUPABASE_SERVICE_ROLE_KEY=YOUR_PRIVATE_SERVICE_ROLE_KEY
JWT_SECRET=PASTE_A_RANDOM_SECRET_HERE
ADMIN_EMAIL=mrec@gmail.com
ADMIN_PASSWORD=CHANGE_TO_A_PRIVATE_PASSWORD
```

- `SUPABASE_URL`: URL of your own Supabase project.
- `SUPABASE_SERVICE_ROLE_KEY`: server-only privileged key. Never use it in frontend code or GitHub.
- `JWT_SECRET`: signs login tokens. Generate a random value from the `backend` folder:
  ```bash
  node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
  ```
  Paste the output into `.env`.
- `ADMIN_EMAIL` / `ADMIN_PASSWORD`: credentials used to bootstrap the administrator. For the requested classroom demo, set the email to `mrec@gmail.com` and password to `MREC@123` **only in your private local `.env`**. This is a known demo password: change it before any real deployment. Do not commit `.env`. On startup, if that account does not exist it is created as admin; if it exists as a regular user, the configured email is promoted and its password is reset to the configured value.

Never use placeholder Supabase values and expect the app to connect. The `.env.example` is a template, not working credentials.

## 8. Install and run

Open the project root in VS Code. Open **Terminal → New Terminal** and run:

```bash
cd backend
npm install
npm start
```

Expected output:
```text
Bootstrapped administrator account: mrec@gmail.com
Portfolio Website Generator running at http://localhost:3000
```
The bootstrap line appears only when the admin account is first created or promoted. If the admin already exists as admin, that line may not appear.

Open [http://localhost:3000](http://localhost:3000). Express serves the `frontend/` directory. Keep the terminal running while you use the site. For auto-restart during development, run `npm run dev` instead of `npm start`.

## 9. Architecture and authentication

1. Browser forms use `fetch()` to call `/api/...`.
2. Express validates requests and verifies a signed bearer token.
3. Express uses the private Supabase service-role key to query PostgreSQL.
4. Passwords are stored as bcrypt hashes, never as plaintext.
5. JWTs expire after eight hours. This beginner MVP keeps the token in page memory, not `localStorage`; refreshing the page signs the user out. Sign in again after a refresh.
6. Ownership is determined from the verified token's `sub` claim, never from a browser-supplied user ID.
7. The admin role is assigned only by the server's environment-configured bootstrap process. Signup always creates a normal user.

This is a teaching MVP, not a security audit. Before production use, add HTTPS, secure refresh/session handling, password reset and email verification, stronger monitoring, and review the complete deployment configuration.

## 10. REST API reference

All request bodies are JSON. Protected routes require `Authorization: Bearer <token>`. Success/error responses are JSON.

| Method | Path | Purpose | Access |
|---|---|---|---|
| GET | `/api/health` | Check server and DB connection | Public |
| POST | `/api/auth/signup` | Create account and empty portfolio; body `{ "name", "email", "password" }` | Public, rate-limited |
| POST | `/api/auth/signin` | Verify credentials; body `{ "email", "password" }` | Public, rate-limited |
| GET | `/api/portfolio/me` | Fetch current user's portfolio and projects | Signed-in user |
| PUT | `/api/portfolio/me` | Validate and save profile and project list | Signed-in owner |
| POST | `/api/portfolio/me/publish` | Publish current portfolio and create public slug | Signed-in owner |
| POST | `/api/portfolio/me/unpublish` | Make current portfolio private | Signed-in owner |
| GET | `/api/public/:slug` | Read a published portfolio | Public |
| GET | `/api/admin/overview` | Counts and latest 100 portfolios | Admin only |
| PATCH | `/api/admin/portfolios/:id/visibility` | Body `{ "published": true }` or false | Admin only |

Typical errors: `400` invalid input, `401` missing/invalid login, `403` insufficient role, `404` missing resource, `409` duplicate email, `429` too many login attempts, `503` database health check failure, `500` unexpected server error. Error messages are intentionally generic for server failures.

## 11. Use the application

1. Choose **Get started**, enter a name, email and password (at least eight characters).
2. Add a headline, bio, location, contact email, skills, education and projects.
3. Watch the live preview update.
4. Select **Save changes**.
5. Select **Publish portfolio** and copy the generated link. Open the link in a private/incognito window to confirm it is public.
6. To test admin controls, sign in with the configured admin account. The administrator dashboard shows account and portfolio totals and can publish/unpublish portfolio visibility.

A published page is public and may expose the profile and contact details you entered. Do not add private information.

## 12. Manual testing

- [ ] `http://localhost:3000/api/health` returns `{"status":"ok","database":"connected"}` when configuration and schema are correct.
- [ ] Sign up with valid details; account is added to `app_users`.
- [ ] Reusing the same email returns a duplicate-account message.
- [ ] Wrong password is rejected.
- [ ] Save profile and projects; refresh/sign in again and confirm values persist.
- [ ] Blank/too-short display name is rejected.
- [ ] Invalid contact email and invalid project URL are rejected.
- [ ] Add a project without a title; save should be blocked by browser validation or backend validation.
- [ ] Add more than eight projects; the UI prevents extra projects and backend rejects oversized lists.
- [ ] A user cannot request another user's portfolio by changing a user ID; API derives ownership from the token.
- [ ] A request to `/api/admin/overview` without a token returns 401; a normal user gets 403.
- [ ] Publish a portfolio and open its public URL in a signed-out browser.
- [ ] Unpublish from admin; the public URL should no longer return the portfolio.
- [ ] Test layout at desktop and mobile widths.
- [ ] Stop the Supabase connection or use invalid credentials and confirm health check reports an error without leaking secrets.

No remote database or browser execution is claimed by this source package; run these checks in your own configured environment.

## 13. Troubleshooting

- **`SUPABASE_URL... must be configured`:** check that `backend/.env` exists and has real values.
- **Health returns 503:** rerun `database/schema.sql`, check project URL/key, and check the terminal's server log.
- **`Invalid API key` / `401` from Supabase:** copy the server-side service-role key for the correct project; do not paste it into frontend files.
- **Port already in use:** change `PORT=3001` in `.env`, restart, and open `http://localhost:3001`.
- **Admin cannot sign in:** verify `ADMIN_EMAIL` and `ADMIN_PASSWORD` in `.env`, restart the server, and check the startup log. If a normal account already used that email, startup promotes it and resets the password to the configured value.
- **`JWT_SECRET` error:** generate a random secret using the command above; use at least 32 characters.
- **CSS or JavaScript missing:** start the server from `backend/`; use the local URL, not `file:///...`.
- **Changes do not appear:** hard refresh with Ctrl+F5 and check the browser developer console.
- **Git tries to add `.env`:** confirm root `.gitignore` is present. If already tracked, `git rm --cached backend/.env` removes it from tracking, but rotate any exposed credentials immediately.

## 14. GitHub upload

Create an empty repository on [GitHub](https://github.com/new), without adding a README if you already have one. Run these commands from the **project root**:

```bash
git init
git status
git add .
git status
git commit -m "Build portfolio website generator"
git branch -M main
git remote add origin YOUR_GITHUB_REPOSITORY_URL
git push -u origin main
```

Replace `YOUR_GITHUB_REPOSITORY_URL` with your actual repository URL. Before `git add .`, verify that `backend/.env` is ignored, `.env.example` is included, and `node_modules/` is excluded. `git status` must not list secrets. If a secret was already committed, `.gitignore` does not erase Git history: rotate it immediately and clean repository history before sharing.

## 15. Future improvements

- Email verification and password reset.
- Secure server-managed sessions/refresh-token flow.
- Portfolio themes and accessible color choices.
- Profile image uploads with file validation.
- Custom slugs and optional custom domains.
- Automated integration tests and deployment guide.

## License

For educational use. Review and adapt the code with your instructor before public deployment.
