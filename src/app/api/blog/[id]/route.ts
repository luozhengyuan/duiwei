import { NextRequest, NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { db } from '@/storage/database';
import { blogPosts } from '@/storage/database/shared/schema';

// 文章详情 API
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const postId = Number.parseInt(id, 10);

    if (Number.isNaN(postId)) {
      return NextResponse.json({ error: 'Invalid post id' }, { status: 400 });
    }

    const rows = await db
      .select({
        id: blogPosts.id,
        title: blogPosts.title,
        summary: blogPosts.summary,
        content: blogPosts.content,
        createdAt: blogPosts.created_at,
      })
      .from(blogPosts)
      .where(eq(blogPosts.id, postId))
      .limit(1);

    const data = rows[0];

    if (!data) {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 });
    }

    const post = {
      id: data.id,
      title: data.title,
      summary: data.summary,
      content: data.content,
      readTime: Math.ceil((data.content?.length || 0) / 400),
      createdAt: data.createdAt,
    };

    return NextResponse.json({ post });
  } catch (err) {
    console.error('Failed to fetch post:', err);
    return NextResponse.json({ error: 'Failed to fetch post' }, { status: 500 });
  }
}
