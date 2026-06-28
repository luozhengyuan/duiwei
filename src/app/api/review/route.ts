import { NextRequest, NextResponse } from 'next/server';
import { LLMClient, HeaderUtils } from 'coze-coding-dev-sdk';
import {
  buildLocalReview,
  createCozeConfig,
  hasCozeCredentials,
  isCozeAuthError,
} from '@/lib/coze-runtime';

export const runtime = 'nodejs';
export const maxDuration = 60;

export async function POST(request: NextRequest) {
  let messages: { role: string; content: string }[] = [];
  let roleId = '';

  try {
    const body = await request.json();
    messages = Array.isArray(body?.messages) ? body.messages : [];
    roleId = typeof body?.roleId === 'string' ? body.roleId : '';

    if (!hasCozeCredentials()) {
      return NextResponse.json({ report: buildLocalReview(messages, roleId) });
    }

    const customHeaders = HeaderUtils.extractForwardHeaders(request.headers);
    const config = createCozeConfig();
    const client = new LLMClient(config, customHeaders);

    // 生成复盘报告的 Prompt
    const reviewPrompt = `
你是一个专业的社交技能教练。请分析以下对话并生成一份复盘报告。

## 角色扮演场景
${roleId} 角色扮演的是一个特定的女生类型。

## 对话记录
${messages.map((m: { role: string; content: string }, i: number) => 
  `${i + 1}. ${m.role === 'user' ? '用户' : 'AI角色'}: ${m.content}`
).join('\n')}

## 输出格式
请严格按照以下 JSON 格式输出，不要添加任何其他内容：

{
  "overallScore": 评分(0-100的整数),
  "keyHighlights": [
    {"message": "原消息", "analysis": "分析", "why": "为什么好"}
  ],
  "keyMistakes": [
    {"message": "原消息", "analysis": "分析", "suggestion": "改进建议"}
  ],
  "improvement": ["改进建议1", "改进建议2", "改进建议3"],
  "psychologyInsight": "心理学解读：分析对方的心理和意图",
  "tips": ["话术技巧1", "话术技巧2"]
}

注意事项：
1. overallScore 根据整体表现给出一个合理的分数
2. keyHighlights 选取对话中最成功的2-3个回复
3. keyMistakes 选取需要改进的1-2个回复
4. improvement 给出3个具体的改进方向
5. psychologyInsight 解读对方的心理和回复背后的含义
6. tips 给出2-3个可复用的社交话术
7. 输出必须是合法的 JSON 格式
`;

    const response = await client.invoke(
      [{ role: 'user', content: reviewPrompt }],
      { temperature: 0.7 }
    );

    // 尝试解析 JSON
    let report;
    try {
      // 提取 JSON（可能在代码块中）
      const jsonMatch = response.content.match(/```json\n?([\s\S]*?)\n?```/) ||
                       response.content.match(/\{[\s\S]*\}/);
      const jsonStr = jsonMatch ? jsonMatch[1] || jsonMatch[0] : response.content;
      report = JSON.parse(jsonStr);
    } catch {
      report = buildLocalReview(messages, roleId);
    }

    return NextResponse.json({ report });
  } catch (error) {
    if (isCozeAuthError(error)) {
      return NextResponse.json({ report: buildLocalReview(messages, roleId) });
    }
    console.error('Review API Error:', error);
    return NextResponse.json(
      { error: 'Failed to generate review' },
      { status: 500 }
    );
  }
}
