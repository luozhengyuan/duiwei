import fs from 'fs';
import path from 'path';
import { NextResponse } from 'next/server';
import { getCozeCredentialState } from '@/lib/coze-runtime';

export const runtime = 'nodejs';

const REQUIRED_COZE_ENV_KEYS = [
  'COZE_WORKLOAD_IDENTITY_API_KEY',
  'COZE_INTEGRATION_BASE_URL',
  'COZE_INTEGRATION_MODEL_BASE_URL',
] as const;

function hasRecentAuthFailure(): boolean {
  const logFile = path.join(process.cwd(), '.dbg', 'trae-debug-log-chat-send-failed.ndjson');
  if (!fs.existsSync(logFile)) {
    return false;
  }

  const content = fs.readFileSync(logFile, 'utf8');
  const lines = content.split('\n').filter(Boolean).slice(-200);
  let latestAuthFailureTs = 0;
  let latestSuccessTs = 0;

  for (const line of lines) {
    try {
      const entry = JSON.parse(line) as { ts?: string; point?: string; errorMessage?: string };
      const ts = entry.ts ? new Date(entry.ts).getTime() : 0;

      if (
        entry.point === 'chat-route-local-fallback-auth-error' ||
        (entry.point === 'chat-route-stream-catch' &&
          typeof entry.errorMessage === 'string' &&
          entry.errorMessage.includes('token validation failed'))
      ) {
        latestAuthFailureTs = Math.max(latestAuthFailureTs, ts);
      }

      if (entry.point === 'chat-route-stream-chunk') {
        latestSuccessTs = Math.max(latestSuccessTs, ts);
      }
    } catch {
      // Ignore malformed log lines.
    }
  }

  return latestAuthFailureTs > 0 && latestAuthFailureTs >= latestSuccessTs;
}

export async function GET() {
  const credentialState = getCozeCredentialState();
  const authFailed = hasRecentAuthFailure();
  const missingEnv = REQUIRED_COZE_ENV_KEYS.filter((key) => !process.env[key]);

  return NextResponse.json({
    chatMode: credentialState.available && !authFailed ? 'coze' : 'fallback',
    ttsMode: credentialState.available && !authFailed ? 'coze' : 'mocked',
    configStatus: credentialState.reason === 'missing' ? 'missing' : credentialState.available ? 'configured' : 'invalid',
    authStatus: authFailed ? 'invalid' : credentialState.available ? 'unknown' : 'missing',
    credentialReason: credentialState.reason,
    apiKeyFormat: credentialState.apiKeyFormat,
    apiKeyLength: credentialState.apiKeyLength,
    jwtAlg: credentialState.jwtAlg,
    mediaSupported: credentialState.available && !authFailed,
    missingEnv,
  });
}
