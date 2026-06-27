import { desc } from 'drizzle-orm';
import { NextResponse } from 'next/server';
import { db } from '@/storage/database';
import { blogPosts } from '@/storage/database/shared/schema';

// 博客列表 API
export async function GET() {
  try {
    const rows = await db
      .select({
        id: blogPosts.id,
        title: blogPosts.title,
        summary: blogPosts.summary,
        createdAt: blogPosts.created_at,
      })
      .from(blogPosts)
      .orderBy(desc(blogPosts.created_at));

    const posts = rows.map((post) => ({
      id: post.id,
      title: post.title,
      summary: post.summary,
      readTime: Math.ceil((post.summary?.length || 0) / 400) + 2,
      createdAt: post.createdAt,
    }));

    return NextResponse.json({ posts });
  } catch (err) {
    console.error('Failed to fetch posts:', err);
    return NextResponse.json({ error: 'Failed to fetch posts' }, { status: 500 });
  }
}
