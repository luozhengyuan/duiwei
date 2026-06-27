import { NextRequest, NextResponse } from 'next/server';
import { LLMClient, HeaderUtils } from 'coze-coding-dev-sdk';
import { roleSystemPrompts } from '@/lib/scenes';
import {
  buildLocalCandidates,
  buildLocalChatReply,
  createCozeConfig,
  hasCozeCredentials,
  isCozeAuthError,
} from '@/lib/coze-runtime';

export const runtime = 'nodejs';
export const maxDuration = 60;

function createTextStreamResponse(content: string) {
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    start(controller) {
      controller.enqueue(encoder.encode(content));
      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Transfer-Encoding': 'chunked',
    },
  });
}

export async function POST(request: NextRequest) {
  let messages: { role: string; content: string }[] = [];
  let roleId = '';
  let action: string | undefined;

  try {
    const body = await request.json();
    messages = Array.isArray(body?.messages) ? body.messages : [];
    roleId = typeof body?.roleId === 'string' ? body.roleId : '';
    action = typeof body?.action === 'string' ? body.action : undefined;

    // #region debug-point chat-route-enter
    void fetch('http://127.0.0.1:8765/log', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        scope: 'server',
        point: 'chat-route-enter',
        roleId,
        action: action ?? 'default',
        messageCount: Array.isArray(messages) ? messages.length : -1,
      }),
    }).catch(() => {});
    // #endregion

    // 获取角色对应的 System Prompt
    const systemPrompt = roleSystemPrompts[roleId];
    if (!systemPrompt) {
      // #region debug-point chat-route-role-missing
      void fetch('http://127.0.0.1:8765/log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          scope: 'server',
          point: 'chat-route-role-missing',
          roleId,
        }),
      }).catch(() => {});
      // #endregion
      return NextResponse.json(
        { error: 'Role not found' },
        { status: 404 }
      );
    }

    // 构建完整的消息列表
    const fullMessages = [
      { role: 'system' as const, content: systemPrompt },
      ...messages.map((msg: { role: string; content: string }) => ({
        role: msg.role as 'user' | 'assistant',
        content: msg.content,
      })),
    ];

    // 提取转发 headers
    const customHeaders = HeaderUtils.extractForwardHeaders(request.headers);

    if (!hasCozeCredentials()) {
      // #region debug-point chat-route-local-fallback-no-credentials
      void fetch('http://127.0.0.1:8765/log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          scope: 'server',
          point: 'chat-route-local-fallback-no-credentials',
          action: action ?? 'default',
        }),
      }).catch(() => {});
      // #endregion
      if (action === 'candidates') {
        return NextResponse.json({ candidates: buildLocalCandidates(messages, roleId) });
      }
      return createTextStreamResponse(buildLocalChatReply(messages, roleId));
    }

    // 创建客户端
    const config = createCozeConfig();
    const client = new LLMClient(config, customHeaders);

    // #region debug-point chat-route-client-ready
    void fetch('http://127.0.0.1:8765/log', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        scope: 'server',
        point: 'chat-route-client-ready',
        action: action ?? 'default',
        hasForwardHeaders: Object.keys(customHeaders ?? {}).length > 0,
      }),
    }).catch(() => {});
    // #endregion

    // 根据 action 决定是普通对话还是生成候选回复
    if (action === 'candidates') {
      // 生成候选回复
      const candidatesPrompt = `
根据对话历史，为用户生成3个合适的候选回复选项。
要求：
1. 每个选项长度控制在15字以内
2. 选项要多样化，覆盖不同风格
3. 选项要符合当前对话情境
4. 直接返回选项，用换行分隔，不要编号

当前对话：
${messages.map((m: { role: string; content: string }) => 
  `${m.role === 'user' ? '用户' : '对方'}: ${m.content}`
).join('\n')}
`;
      const candidatesResponse = await client.invoke(
        [{ role: 'user', content: candidatesPrompt }],
        { temperature: 0.8 }
      );
      const candidateText =
        typeof candidatesResponse.content === 'string'
          ? candidatesResponse.content
          : JSON.stringify(candidatesResponse.content);
      const candidates = candidateText
        .split('\n')
        .map((s: string) => s.trim())
        .filter((s: string) => s.length > 0)
        .slice(0, 4);
      
      return NextResponse.json({ candidates });
    } else {
      // 普通对话 - 流式响应
      // #region debug-point chat-route-before-stream
      void fetch('http://127.0.0.1:8765/log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          scope: 'server',
          point: 'chat-route-before-stream',
          fullMessageCount: fullMessages.length,
        }),
      }).catch(() => {});
      // #endregion
      const stream = client.stream(fullMessages, { temperature: 0.8 });

      // 创建 SSE 流
      const encoder = new TextEncoder();
      const stream2 = new ReadableStream({
        async start(controller) {
          try {
            for await (const chunk of stream) {
              if (chunk.content) {
                // #region debug-point chat-route-stream-chunk
                void fetch('http://127.0.0.1:8765/log', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    scope: 'server',
                    point: 'chat-route-stream-chunk',
                    chunkType: typeof chunk.content,
                  }),
                }).catch(() => {});
                // #endregion
                const content = typeof chunk.content === 'string' 
                  ? chunk.content 
                  : JSON.stringify(chunk.content);
                controller.enqueue(encoder.encode(content));
              }
            }
            controller.close();
          } catch (error) {
            if (isCozeAuthError(error)) {
              // #region debug-point chat-route-local-fallback-auth-error
              void fetch('http://127.0.0.1:8765/log', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  scope: 'server',
                  point: 'chat-route-local-fallback-auth-error',
                  errorName: error instanceof Error ? error.name : 'unknown',
                  errorMessage: error instanceof Error ? error.message : String(error),
                }),
              }).catch(() => {});
              // #endregion
              controller.enqueue(encoder.encode(buildLocalChatReply(messages, roleId)));
              controller.close();
              return;
            }
            // #region debug-point chat-route-stream-catch
            void fetch('http://127.0.0.1:8765/log', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                scope: 'server',
                point: 'chat-route-stream-catch',
                errorName: error instanceof Error ? error.name : 'unknown',
                errorMessage: error instanceof Error ? error.message : String(error),
              }),
            }).catch(() => {});
            // #endregion
            controller.error(error);
          }
        },
      });

      return new Response(stream2, {
        headers: {
          'Content-Type': 'text/plain; charset=utf-8',
          'Transfer-Encoding': 'chunked',
        },
      });
    }
  } catch (error) {
    if (isCozeAuthError(error)) {
      // #region debug-point chat-route-top-level-fallback-auth-error
      void fetch('http://127.0.0.1:8765/log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          scope: 'server',
          point: 'chat-route-top-level-fallback-auth-error',
          action: 'unknown',
          errorName: error instanceof Error ? error.name : 'unknown',
          errorMessage: error instanceof Error ? error.message : String(error),
        }),
      }).catch(() => {});
      // #endregion
      if (action === 'candidates') {
        return NextResponse.json({ candidates: buildLocalCandidates(messages, roleId) });
      }
      return createTextStreamResponse(buildLocalChatReply(messages, roleId));
    }
    // #region debug-point chat-route-catch
    void fetch('http://127.0.0.1:8765/log', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        scope: 'server',
        point: 'chat-route-catch',
        errorName: error instanceof Error ? error.name : 'unknown',
        errorMessage: error instanceof Error ? error.message : String(error),
      }),
    }).catch(() => {});
    // #endregion
    console.error('Chat API Error:', error);
    return NextResponse.json(
      { error: 'Failed to generate response' },
      { status: 500 }
    );
  }
}
