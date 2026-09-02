# Hostinger Cloud Startup Setup — later deployment stage

Do not enable Meta writes during the first deployment.

## 1. GitHub

Create a **private** repository named:

`techairevolution-social-media-os`

Push this package without `.env`.

## 2. Hostinger Node.js Web App

hPanel → Websites → Add Website → Node.js Web App.

Use Node.js 22.

Connect the private GitHub repository.

Build command:

`npm ci && npm run build`

Start command:

`npm start`

## 3. MySQL

Create one MySQL database in Hostinger and run:

`database/schema.sql`

Add its credentials to the Node.js application environment.

## 4. Environment variables

Copy the keys from `.env.example` into Hostinger's environment-variable interface.

For the first cloud test:

`AUTOPILOT_ENABLED=false`
`META_WRITE_ENABLED=false`

Do not paste secrets into GitHub or source files.

## 5. Private font installation

Font binaries are deliberately excluded from this package.

Privately upload your licensed font files to a non-public application folder matching the filenames in:

`brand/typography/font-manifest.json`

Then set/confirm the runtime font folder used by the compositor.

## 6. First test

Open:

`https://YOUR-DOMAIN/health`

Then run the application self-test.

Do not configure live Meta cron yet.

## 7. Cron after produce-only validation

Preferred:

Hostinger Custom Cron every five minutes:

`node /ABSOLUTE/PATH/TO/APP/dist/cron.js`

If Hostinger's managed Node application path cannot be invoked directly, use:

`curl -fsS -X POST -H "X-Cron-Secret: YOUR_CRON_SECRET" https://YOUR-DOMAIN/internal/tick`

Hostinger cron uses UTC, but the V3 controller calculates the actual target schedule using `APP_TIMEZONE`, so the wake-up cron can remain every five minutes.

## 8. Live activation — only after supervised cloud pilot

Set:

`AUTOPILOT_ENABLED=true`
`META_WRITE_ENABLED=true`

Only after:
- research/factual QA passes
- creative QA passes
- final carousel is visually accepted
- Meta preflight is verified
- duplicate protection is verified
- one supervised cloud publication succeeds
