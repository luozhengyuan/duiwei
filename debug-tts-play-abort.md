# Debug Session: tts-play-abort [OPEN]

## Summary
- Symptom: browser console shows `AbortError: The play() request was interrupted by a call to pause()`.
- Expected: clicking or auto-playing TTS should play audio once without being interrupted by another pause path.
- Scope: local chat page at `http://localhost:5000`, TTS playback in `src/app/chat/[id]/[roleId]/page.tsx`.

## Hypotheses
1. `playTTS()` is invoked twice for the same message, and the second invocation pauses the first audio instance.
2. Auto-play after assistant reply races with a manual click on the play button, causing a `pause()` before the original `play()` promise resolves.
3. Message-send or media-send flow always pauses `audioRef.current`, and this path is firing while a fresh TTS playback is still starting.
4. React state transitions or cleanup logic are nulling `audioRef.current` during playback startup.

## Evidence Log
- Instrumentation was added around:
  - `playTTS()` entry
  - audio creation
  - `audio.play()` before/after
  - pause events
  - all explicit stop paths (`sendMessage`, `sendMedia`, `endConversation`)
- Static code evidence showed multiple competing pause sources shared the same `audioRef` and could interrupt an in-flight `audio.play()` promise.
- A defensive fix was applied:
  - introduced a TTS play token to invalidate stale play attempts
  - centralized stop logic for audio + autoplay timeout cleanup
  - swallowed expected browser `AbortError` races instead of surfacing them as noisy console errors

## Plan
1. Add instrumentation only around TTS play/pause lifecycle.
2. Reproduce once and collect logs.
3. Confirm which path issues the interrupting `pause()`.
4. Apply the minimal fix.
5. Verify with post-fix evidence.
6. Wait for user confirmation before cleanup.
