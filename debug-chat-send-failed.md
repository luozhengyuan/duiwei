# Debug Session: chat-send-failed [OPEN]

## Summary
- Symptom: chat page sending a message fails in browser with `TypeError: Failed to fetch`.
- Expected: user message should be sent successfully and AI response should stream back.
- Scope: local dev at `http://localhost:5000`, chat UI.

## Hypotheses
1. The frontend is calling the wrong API path or building an invalid request URL.
2. The chat API route is throwing before it can return a valid HTTP response, causing fetch to fail at network level.
3. The request depends on missing environment variables or external service credentials in local dev.
4. The custom `src/server.ts` dev entry is not wiring Next/API handling correctly for this route.
5. The request payload shape sent by the chat page does not match what `src/app/api/chat/route.ts` expects, causing an uncaught runtime error.

## Evidence Log
- Pre-fix runtime evidence:
  - `chat-route-stream-catch` captured `code=190000007 ... token validation failed ... unexpected signing method: HS256`.
  - This falsified the frontend URL hypothesis and confirmed the failure was inside the Coze SDK call path.
- Mid-fix evidence:
  - `chat-route-local-fallback-auth-error` appeared for normal chat requests after the fallback stream logic was added.
  - `chat-route-top-level-fallback-auth-error` appeared for `action='candidates'`, proving the candidates branch still fell through the top-level catch and needed a response-shape-specific fallback.
- Post-fix verification:
  - `pnpm exec tsc --noEmit` passed.
  - `POST /api/chat` returned a text response successfully.
  - `POST /api/chat` with `action='candidates'` returned valid JSON candidates.
  - `POST /api/review` returned a valid `report` JSON payload.
  - `POST /api/tts` returned fallback audio JSON with `mocked: true`.
  - Local roleplay fallback was refined and verified with sample inputs:
    - `你在干嘛` -> in-character Lisa reply about what she is doing now.
    - `说说你在干嘛` -> in-character Lisa reply, no coaching/meta-analysis tone.
- Final verification with explicit Coze credentials:
  - Added `.env.local` with explicit `COZE_WORKLOAD_IDENTITY_API_KEY`, `COZE_INTEGRATION_BASE_URL`, and `COZE_INTEGRATION_MODEL_BASE_URL`.
  - Started a clean dev instance and verified `/api/runtime-status` switched to `chatMode='coze'` and `ttsMode='coze'`.
  - `POST /api/chat` returned a real Coze-style roleplay response instead of fallback text.
  - `POST /api/tts` returned a real remote mp3 URL and non-zero `audioSize`.
  - Added `/api/media` and verified:
    - `POST /api/media` for image returned `200` with a real image URL.
    - The original video implementation waited synchronously and could time out after ~303 seconds.
    - The SDK README mentioned `checkTask`, but the installed runtime only exposes `constructor`, `videoGeneration`, and `videoGenerationAsync`; `videoGenerationAsync` is just an alias of the same synchronous flow.
    - The media route was updated to call the underlying task creation endpoint directly and query task status via `GET /api/v3/contents/generations/tasks/{taskId}`.
    - Verified new async flow:
      - `POST /api/media` now returns `200` immediately with `status='pending'` and a real `taskId`.
      - `GET /api/media?taskId=...` now returns `200` with `status='pending'` for the created task.
      - Upstream `429` rate-limit errors are surfaced as user-readable messages instead of raw SDK failures.

## Findings
- Confirmed: the root cause of `Failed to fetch` was Coze authentication failure in local dev.
- Confirmed: the current environment is not simply "missing API key"; Coze-related variables are present, but runtime auth is invalid, so requests still degrade to local fallback.
- Confirmed: the original local-dev fallback was incomplete for the `candidates` path.
- Confirmed: the first fallback copy for `/api/chat` was functionally available but behaviorally wrong because it produced coach-style guidance instead of roleplay dialogue.
- Confirmed: once explicit valid Coze credentials were provided via `.env.local`, both chat and TTS worked on the default local server.
- Confirmed: media generation support was missing entirely in the original chat page; after adding `/api/media` plus chat UI buttons, image generation works and video generation is available but significantly slower than text/TTS.
- Rejected: wrong frontend path, broken custom Next server wiring, and malformed request shape as the primary root cause.

## Plan
1. Reproduce with runtime evidence.
2. Add instrumentation only.
3. Compare evidence against hypotheses.
4. Apply minimal fix.
5. Verify with post-fix evidence.
6. Wait for user confirmation before cleanup.
