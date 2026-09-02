# TechAIrevolution Social Media OS V3 — Hostinger Cloud Edition

This is the Hostinger-native production foundation for the autonomous TechAIrevolution social media system.

## End state

A Hostinger cron task wakes the controller every few minutes. The controller stores durable state in MySQL and advances only the next safe step:

discover → research → content → creative direction → image generation → visual QA → repair → composition → caption → campaign binding → wait for target time → Instagram → Facebook → analytics → learning.

The Mac and ChatGPT UI are not required after deployment.

## Current release

**V3 0.1 Foundation**

Included now:
- Hostinger-compatible Node.js/TypeScript runtime
- MySQL state/control plane
- resumable cron controller
- OpenAI Responses API adapter
- OpenAI web-search research adapter
- fal.ai asynchronous GPT Image 2 adapter
- Cloudinary asset adapter
- deterministic Sharp/SVG compositor foundation
- real-image OpenAI vision QA foundation
- cryptographic campaign binding
- Meta Instagram/Facebook write primitives
- no-blind-retry external write guard
- basic private dashboard/status API
- brand/reference asset folders
- deployment and migration plan

Publishing is intentionally **OFF by default** until the cloud produce-only pilot passes.

## Security defaults

`AUTOPILOT_ENABLED=false`
`META_WRITE_ENABLED=false`

Never commit `.env`.

## Hostinger

Target runtime: Hostinger Cloud Startup Node.js Web App.

Build:
`npm ci && npm run build`

Start:
`npm start`

Cron after deployment:
run `node dist/cron.js` every 5 minutes using Hostinger Custom Cron, or use the protected `/internal/tick` endpoint if direct Node cron execution is unavailable.

See `HOSTINGER_SETUP.md`.
