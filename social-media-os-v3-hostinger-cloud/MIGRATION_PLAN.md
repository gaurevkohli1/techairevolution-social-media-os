# V2 → V3 Migration Plan

V2 remains the behavioral reference. V3 replaces the Mac/Python execution environment.

| V2 responsibility | V3 module |
|---|---|
| OpenAI reasoner | `src/ai/openai.ts` |
| reference DNA | `brand/creative-dna.json` + creative prompt |
| creative director | `src/workflows/creative.ts` |
| fal image generation | `src/ai/fal.ts` + `src/workflows/generation.ts` |
| visual critic | `src/workflows/visualQa.ts` |
| compositor | `src/workflows/compose.ts` |
| caption | `src/workflows/caption.ts` |
| campaign binding | `src/workflows/bind.ts` |
| Meta ship scripts | `src/publish/meta.ts` |
| launchd | Hostinger Cron + `src/cron.ts` |
| output folders | MySQL + Cloudinary |
| run lock | MySQL `GET_LOCK()` |
| receipts | `publish_receipts` table |
| analytics/learning | future V3 iteration on same state machine |

Critical V2 invariant retained:
**No stale content/creative/caption mixing.** V3 binds the approved content, creative plan, final assets and caption by SHA-256 before any Meta write.

Critical Meta invariant retained:
**No blind retry after an ambiguous external write.**
