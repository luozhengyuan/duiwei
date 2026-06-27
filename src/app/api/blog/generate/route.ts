import { NextRequest, NextResponse } from 'next/server';
import { createLLMClient } from '@/lib/llm-client';
import { db } from '@/storage/database';
import { blogPosts } from '@/storage/database/shared/schema';

const BLOG_TOPICS = [
  "如何自然地要女生微信",
  "约会时话题枯竭怎么办",
  "暧昧期如何升级关系",
  "第一次约会去哪里比较好",
  "如何判断女生对你有没有意思",
  "聊天时如何避免冷场",
  "约会结束后怎么发消息",
  "如何优雅地结束聊天",
  "第一次约会应该谁付钱",
  "如何让聊天更有趣",
  "怎么夸女生不会被当成油腻",
  "如何优雅地表达好感",
  "被发好人卡后怎么办",
  "如何应对女生的各种测试",
  "约会时的小细节加分项",
  "如何让女生对你印象深刻",
  "聊天节奏怎么把控",
  "如何优雅地索取而不卑微",
  "怎么判断她是真忙还是不想理你",
  "如何让约会更自然不尴尬"
];

function getRandomTopic(): string {
  const index = Math.floor(Math.random() * BLOG_TOPICS.length);
  return BLOG_TOPICS[index];
}

export async function POST(request: NextRequest) {
  try {
    const { topic } = await request.json().catch(() => ({}));
    
    // 使用指定的主题或随机选择
    const articleTopic = topic || getRandomTopic();
    
    const llm = createLLMClient();
    
    const prompt = `你是一位专注于恋爱沟通技巧的作家。请为"对味"恋爱聊天训练平台写一篇博客文章。

主题：${articleTopic}

要求：
1. 风格轻松幽默，像在跟朋友聊天
2. 300-500字
3. 有明确的观点和实用建议
4. 可以用emoji增加趣味性
5. 结构：开头引入 → 核心观点 → 实用技巧 → 总结

请直接输出文章内容，不要加标题（标题由系统自动生成），也不要加任何格式前缀。`;

    // 调用 LLM 生成文章
    const response = await llm.invoke([{
      role: 'user',
      content: prompt
    }]);
    
    const content = typeof response.content === 'string' 
      ? response.content 
      : (response.content as Array<{ type: string; text: string }>)[0]?.text || '';
    
    // 生成标题（基于主题或从内容提取）
    const titlePrompt = `根据以下文章内容，生成一个吸引人的标题（15字以内）：

${content.slice(0, 200)}

直接输出标题，不要任何前缀。`;
    
    const titleResponse = await llm.invoke([{
      role: 'user',
      content: titlePrompt
    }]);
    
    const title = typeof titleResponse.content === 'string'
      ? titleResponse.content.trim()
      : (titleResponse.content as Array<{ type: string; text: string }>)[0]?.text?.trim() || articleTopic;
    
    // 生成摘要
    const summary = content.slice(0, 100).replace(/\n/g, ' ').trim() + '...';
    
    // 保存到数据库
    const insertedPosts = await db
      .insert(blogPosts)
      .values({
        title,
        summary,
        content,
      })
      .returning({
        id: blogPosts.id,
        title: blogPosts.title,
        summary: blogPosts.summary,
        createdAt: blogPosts.created_at,
      });

    const data = insertedPosts[0];

    return NextResponse.json({
      success: true,
      post: {
        id: data.id,
        title: data.title,
        summary: data.summary,
        createdAt: data.createdAt,
      },
    });
  } catch (err) {
    console.error('Error generating article:', err);
    return NextResponse.json({ error: 'Failed to generate article' }, { status: 500 });
  }
}
