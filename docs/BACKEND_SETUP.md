# Login, approval, mail and database setup (Neon + Vercel)

What this adds: anyone opening the planner must **register** (name, company, email, contact, purpose, password), **verify an email OTP**, then wait for the **Ultraplast super admin to approve** before they can log in. Admins get a **Settings** panel (users, mail, rules, database, audit).

The website (GitHub Pages) stays as it is. A small API in the `backend/` folder runs on Vercel and stores data in a Neon Postgres database. Everything is free-tier friendly.

Until you finish these steps and set the address in `config.js`, the planner opens normally with **no login** - nothing breaks.

## Step 1 - Create the Neon database
1. Go to https://neon.tech and sign up (Google or email).
2. Create a **Project** (name: `ultraplast-planner`, region: the nearest, e.g. Singapore / Mumbai if offered).
3. On the project dashboard press **Connect**, choose the **pooled** connection, and **copy the connection string** (starts with `postgresql://...`). Keep it secret.
4. (Optional) Open **SQL Editor**, paste the content of `backend/schema.sql`, press Run. If you skip this, the **Run database setup** button in Settings does it later.

## Step 2 - Put the backend on Vercel
1. Upload the `backend` folder to a GitHub repository (a **separate** repo, e.g. `ultraplast-planner-api`, files at the root: `api/`, `lib/`, `package.json`, `vercel.json`, `schema.sql`). If you keep it inside the planner repo, set **Root Directory = backend** in Vercel.
2. Go to https://vercel.com, sign in with GitHub, **Add New > Project**, import that repository.
3. Before pressing Deploy, open **Environment Variables** and add:

| Name | Value |
|---|---|
| `DATABASE_URL` | the Neon connection string from Step 1 |
| `AUTH_SECRET` | any long random text, 32+ characters (type random letters/numbers) |
| `SETTINGS_KEY` | another long random text, 32+ characters (encrypts the saved mail password) |
| `SUPERADMIN_EMAIL` | your admin login email, e.g. `dme@ultraplastindia.in` |
| `SUPERADMIN_PASSWORD` | a strong password for that admin (8+ characters, letters and numbers) |
| `ALLOWED_ORIGIN` | your website address, e.g. `https://YOURNAME.github.io` (no trailing slash; comma-separate several) |

4. Press **Deploy**. Open `https://YOUR-PROJECT.vercel.app/api/health` - it should show `"ok": true` and `"db": true`.
   Do **not** change `AUTH_SECRET` or `SETTINGS_KEY` later: changing them logs everyone out / makes the saved mail password unreadable (you would just paste it again).

## Step 3 - Connect the website
1. In the planner's `config.js` set: `auth: { endpoint: 'https://YOUR-PROJECT.vercel.app/api', timeoutMs: 20000 }`.
2. Upload `config.js` to GitHub Pages. Open the site: the login screen appears.
3. Log in with `SUPERADMIN_EMAIL` / `SUPERADMIN_PASSWORD`. You see a gold **Settings** button (only admins see it).

## Step 4 - Connect the mail (OTP and approval emails)
Settings > **Mail**: type the mail id, paste its **App Password**, press **Save & connect**. It works with any mail id: the server finds the right mail server itself (Gmail, Outlook/Microsoft 365, Zoho, Yahoo, Google Workspace / company domains; for others open *Advanced* and type host and port). The login is checked before saving. Then press **Send test**.

- **Gmail / Google Workspace**: Google Account > Security > turn on **2-Step Verification** > **App passwords** > create one (16 letters) > paste it (spaces are ignored).
- **Outlook / Microsoft 365**: needs an app password (account must have two-step verification) or SMTP AUTH enabled by the tenant admin.
- **Zoho**: Accounts > Security > App Passwords.
- The password is encrypted on the server and never shown again. To change the mail id, paste the new id and its password.

## Step 5 - Try it
1. Open the site in a private window > **Register** > enter the details > you get a 6-digit email code > enter it > "Request submitted".
2. As super admin: Settings > **Users & approvals** > pending > **Approve** (the user also gets an email).
3. The user logs in. In the same panel you can reject, revoke, restore, make admin, reset a password or delete.

## Troubleshooting
- *Network error on the login screen*: `ALLOWED_ORIGIN` must exactly match the site address; `endpoint` must end with `/api`.
- */api/health shows db false*: re-copy `DATABASE_URL`; then Settings > Database > **Run database setup**.
- *Mail login fails*: use an App Password, not the normal password; check 2-Step Verification is on; try *Advanced* host/port (465 SSL or 587 STARTTLS).
- *Forgot the admin password*: change `SUPERADMIN_PASSWORD` in Vercel and redeploy only if that user does not exist yet; otherwise another admin can use **Reset password**.

## Honest limits
- Not tested here against a real Neon database, real Gmail/Outlook/Zoho mail, or Vercel (no access from the build environment). The logic was tested with a local test database and a fake mail sender; the Neon driver and nodemailer packages must be installed by Vercel during deploy. Do Step 5 once before relying on it.
- The login is a gate on a static website: it controls who sees the planner screens; it does not make files on the public site secret. The planner holds no prices or customer files.
- The login token is kept in the browser tab session only (cleared when the tab closes). Opening another tab asks for login again. No customer data is stored in the browser.
- No "forgot password" self-service yet; an admin resets it.
