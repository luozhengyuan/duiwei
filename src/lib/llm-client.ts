import { LLMClient, Config, HeaderUtils } from 'coze-coding-dev-sdk';
import { NextRequest } from 'next/server';

export function createLLMClient() {
  const config = new Config();
  const client = new LLMClient(config, {});
  return client;
}

export function extractHeaders(request: NextRequest) {
  return HeaderUtils.extractForwardHeaders(request.headers);
}
