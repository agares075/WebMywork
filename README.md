# Daily Work Log

A private, mobile-first Thai website for freelance work, expenses, payments, teammates, and withholding certificates. Next.js App Router + TypeScript + Tailwind; Google Sheets stores records, Calendar stores job events, and Drive stores private certificates. Currency is THB and all work/payment dates use Asia/Bangkok.

This is a normal browser website. It has no service worker, installable manifest, or Add to Home Screen setup.

## Requirements and local run

Use Node.js 22 or newer; Node.js 24 is recommended.

```sh
npm ci
```

Copy `.env.example` to `.env.local`:

```powershell
Copy-Item .env.example .env.local
```

On macOS/Linux, use `cp .env.example .env.local` instead. Generate a secret:

```sh
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

Fill in the six required values, following the Google setup below:

```dotenv
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=YOUR_GENERATED_SECRET
GOOGLE_CLIENT_ID=YOUR_CLIENT_ID.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=YOUR_CLIENT_SECRET
ALLOWED_EMAIL=your-own-google-account@gmail.com
GOOGLE_SPREADSHEET_ID=YOUR_SPREADSHEET_ID
# Optional, use with a separate test spreadsheet:
ENABLE_DEMO_SEED=false
```

`NEXTAUTH_SECRET` must be at least 32 characters. Use only the spreadsheet ID, not its full URL. Keep `.env.local` private. No `NEXT_PUBLIC_` secrets or service-account key is needed.

```sh
npm run dev
```

Open [localhost:3000](http://localhost:3000), then sign in with the exact allowed Google account. Restart the server after environment changes. Missing/invalid configuration is listed on the login screen without exposing secret values.

## Google Cloud setup

1. Open [Google Cloud Console](https://console.cloud.google.com/), then create/select one project.
2. Under **APIs & Services → Library**, enable **Google Sheets API**, **Google Calendar API**, and **Google Drive API**.
3. Open **Google Auth Platform** / **OAuth consent screen**. Set the app name and support/contact email. Use an External audience for personal Gmail; while in Testing, add your allowed account as a test user. Internal audience is available for eligible Workspace organizations.
4. In **Data Access**, request these scopes:
   - `openid`
   - `email`
   - `profile`
   - `https://www.googleapis.com/auth/spreadsheets`
   - `https://www.googleapis.com/auth/calendar.events`
   - `https://www.googleapis.com/auth/drive.file`
5. Create an OAuth client with application type **Web application**. Add authorized JavaScript origin `http://localhost:3000` and this exact authorized redirect URI:

   ```text
   http://localhost:3000/api/auth/callback/google
   ```

6. Copy the client ID and secret into `.env.local`.
7. As the allowed account, create a blank Google spreadsheet. From `https://docs.google.com/spreadsheets/d/SPREADSHEET_ID/edit`, copy its ID into `GOOGLE_SPREADSHEET_ID`. The account must have editor access; keep the spreadsheet private.
8. Sign in and grant all requested permissions. For an existing connection that lacks Calendar/Drive permissions, use **การเชื่อมต่อ → เชื่อมต่อ Google ใหม่**.

Google Testing-mode refresh tokens can expire; reconnect when prompted. See [Google web-server OAuth](https://developers.google.com/identity/protocols/oauth2/web-server), [token expiration](https://developers.google.com/identity/protocols/oauth2#expiration), and [Drive per-file scopes](https://developers.google.com/workspace/drive/api/guides/api-specific-auth).

## Google data initialization

The first authenticated visit creates missing tabs and exact header rows: **Jobs**, **Expenses**, **Contacts**, **Files**, **Summary**. Existing unrelated tabs remain. Stable UUIDs link rows. Schema definitions are in `src/lib/sheets/schema.ts`; conflicting existing headers stop initialization before overwriting data. Older 24-column Jobs and 5-column Summary headers receive append-only migrations.

Summary columns A:E contain monthly income, expenses, net profit, and unpaid totals; F:G contain job counts by client. Formula anchors A2:G2 spill down the columns, so keep manual notes outside A:G. Move existing manual content before initialization; cells below an anchor can block a formula spill. Summary uses all records independently of dashboard filters and the spreadsheet timezone is set to Asia/Bangkok.

Job events use your **primary** Google Calendar. End time at/before start means the next day; check-in/out include explicit dates. Optional payment reminders are all-day events. App edits update Calendar; external Calendar edits are not imported into Sheets. A failed Calendar operation leaves a retryable pending status.

The first certificate upload creates a private **Daily Work Log – ใบทวิ 50** folder in My Drive. Reuse the same spreadsheet ID and OAuth client to find that folder again. Files rows store the stable record ID, job ID, Drive file ID, name, MIME type, private URL, and creation time. Replacing preserves the Drive link; deleting moves the file to Trash and removes its row. Job deletion also cleans up its certificates.

## Offline recovery and sync

- Keep the page open if the connection drops. Job, contact, and payment drafts are saved locally. Clicking Save while offline queues the operation; incomplete forms are retained as drafts until you save them.
- Drafts and the ordered sync queue use account-scoped **local storage**. Certificate bytes and unsaved file selections use **IndexedDB**, which avoids local-storage file-size limits. OAuth credentials are never stored in either location.
- Saved job/payment/contact changes, deletions, Calendar retries, and certificate changes replay in order when the website is visible and online. The page checks on reconnect/focus and periodically while open. Closing the browser pauses replay; reopening the site online resumes it. First-time loading and navigation to uncached pages require a connection.
- The connection banner shows pending operations. Successful requests are removed only after a server response. Stable record IDs and Drive upload markers support retries. Locally chained edits advance their server versions together. A stale version is refreshed only when the original edited fields still match the server; actual conflicts or expired permissions remain blocked for review.
- For a blocked request, inspect the error and latest record, reconnect Google if necessary, then use **ลองส่งอีกครั้ง**. Keep draft information before explicitly clearing pending operations. Clearing browser site data or using a storage-restricted/private session can remove local work; storage failures show an error and do not claim a successful queued save.

There is no background worker, offline page installation, or automatic submission of unfinished drafts.

## Certificates and image compression

Select multiple PDFs/images or use the phone camera. Images are resized in the browser to a maximum 2200-pixel long edge and compressed toward 1 MB as JPEG when needed, retaining orientation. Small suitable images are kept as-is. File processing completes before uploads or local persistence. See [canvas encoding](https://developer.mozilla.org/en-US/docs/Web/API/HTMLCanvasElement/toBlob).

Uploads remain limited to **4 MB per file and 20 files per job**, sent one at a time to stay within default [Vercel request limits](https://vercel.com/docs/functions/limitations). PDFs are preserved and must already be under the limit. HEIC/HEIF conversion depends on browser decoding support: unsupported files under 4 MB can upload as originals; larger unsupported files need JPEG/PNG conversion on the phone first. Original image inputs are limited to 32 MB for mobile memory use.

PDF/image previews require your authenticated app session. Phone PDF/HEIC viewers can use **เปิดไฟล์ต้นฉบับ** / **เปิดใน Google Drive** as a fallback. No public Drive permission is created. Server validation checks file signatures, size, ownership links, and supported MIME types.

## Display, payments, and reports

Choose **การเชื่อมต่อ → รูปแบบการแสดงผล** for System/Light/Dark mode. Theme preference is retained locally, with accessible input/focus colors, reduced-motion support, loading skeletons, and dismissible error toasts.

Payment statuses, paid amount, and paid date can be edited from job cards and saved job forms. Positive receipts require a paid date; Paid fills the full income and today's date. Unpaid jobs become Overdue after their expected Bangkok payment date; Paid/Cancelled jobs are exempt. Automatic overdue changes persist during authenticated reads, and visible pages revalidate every 30 seconds when online. No scheduled server task is installed.

The dashboard defaults to this work month. Month/client/payment-status/outfit filters affect totals, unpaid lists, and CSV. Choose **ทุกเดือน** to include older unpaid jobs. The six-month chart ends at the selected month. Income is the recorded job amount; receipts are tracked separately. Cancelled jobs contribute no income/unpaid balance, while their expenses remain. Pending deletions are excluded. Currency arithmetic uses integer cents.

CSV includes job fields, expense items/totals, reporting income, net, and unpaid amounts. UTF-8 BOM supports Thai text in Excel; quoted values preserve multiline text and formula-leading free text is neutralized. **เปิด Google Sheets** opens the private spreadsheet directly.

## Optional demo data

Use a separate blank test spreadsheet, set `ENABLE_DEMO_SEED=true`, and restart/redeploy. In **การเชื่อมต่อ → ข้อมูลตัวอย่าง**, confirm adding 1 teammate and 3 sample jobs. Stable sample IDs prevent duplicates and existing sample rows are preserved on repeat runs. Names have a `[ตัวอย่าง]` prefix. Sample rows exercise expenses, partial/paid payments, and the monthly chart.

Seeding writes Sheets only; it does not create Calendar events or Drive files. Sample jobs have a pending Calendar status and can be synced manually. Delete samples with normal job/contact controls. Set the flag back to `false` to hide/disable seeding. The seed endpoint still requires the allowed Google session and same-origin POST.

## Final checks and production run

```sh
npm run check
```

This runs lint, TypeScript route generation/type-check, and the production build once. The existing two critical payment-date/totals tests remain available with `npm test`. After building, use `npm start` for a local production server. HTTP is accepted only for localhost/127.0.0.1; deployed URLs use HTTPS.

Phone camera behavior, offline/reconnect replay, browser image compression, and live Sheets/Calendar/Drive changes need a signed-in browser/device check. The build does not exercise a real Google transaction.

## Deploy to Vercel

1. Push the project to your Git repository and import it in [Vercel](https://vercel.com/new).
2. Choose **Next.js**, project root `./`, Node.js **24**, build command `npm run build`, and the default output directory.
3. Add all six required environment variables to Production in **Settings → Environment Variables**. Add the optional seed flag only for a test deployment. Never use `NEXT_PUBLIC_` for secrets.
4. Set `NEXTAUTH_URL` to your stable HTTPS production origin, e.g. `https://daily-work-log.vercel.app`.
5. In the Google OAuth client, add that origin and its exact production redirect URI:

   ```text
   https://daily-work-log.vercel.app/api/auth/callback/google
   ```

6. Deploy, then sign in on that stable domain and verify the connection, a job save, a payment change, and a certificate upload. Redeploy after environment changes. Preview domains need their own matching URL/settings and registered redirect URI.

Vercel supplies the Next.js server runtime. No Vercel database or writable server filesystem is required. See [Next.js on Vercel](https://vercel.com/docs/frameworks/full-stack/nextjs) and [environment variables](https://vercel.com/docs/environment-variables).

## Access and project structure

Only the verified Google email matching `ALLOWED_EMAIL` is allowed. Protected routes/APIs recheck the session; mutations check request origin and server schemas. OAuth and Google API calls run server-side. NextAuth stores credentials in an encrypted HttpOnly session cookie; browser JavaScript/session JSON/React props do not receive raw OAuth tokens. Changing the auth secret invalidates sessions.

Routes/pages are in `src/app`, feature UI in `src/components`, shared Google/storage/calculation/validation utilities in `src/lib`, and TypeScript types in `src/types`. The project uses no installable web-app assets or service worker dependencies.
