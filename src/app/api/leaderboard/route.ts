import { db } from '@/storage/database';
import { sql } from 'drizzle-orm';
import { users, gameRecords } from '@/storage/database/shared/schema';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    // 获取前20名用户的最高分数
    const topPlayers = await db
      .select({
        userId: gameRecords.userId,
        username: users.username,
        maxScore: sql<number>`MAX(${gameRecords.finalScore})`.as('max_score'),
        achievedAt: sql<string>`MAX(${gameRecords.playedAt})::text`.as('achieved_at'),
      })
      .from(gameRecords)
      .leftJoin(users, sql`${gameRecords.userId} = ${users.id}`)
      .groupBy(gameRecords.userId, users.username)
      .orderBy(sql`MAX(${gameRecords.finalScore}) DESC`)
      .limit(20);

    // 添加排名
    const leaderboard = topPlayers.map((player, index) => ({
      rank: index + 1,
      userId: player.userId,
      username: player.username || '匿名用户',
      maxScore: Number(player.maxScore) || 0,
      achievedAt: player.achievedAt,
    }));

    return NextResponse.json({ leaderboard });
  } catch (error) {
    console.error('获取排行榜失败:', error);
    return NextResponse.json(
      { error: '获取排行榜失败' },
      { status: 500 }
    );
  }
}
