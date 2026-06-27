import { NextRequest, NextResponse } from 'next/server';
import { rawDb } from '@/storage/database';

export async function GET(request: NextRequest) {
  const token = request.headers.get('x-session');
  
  if (!token) {
    return NextResponse.json({ error: '请先登录' }, { status: 401 });
  }

  try {
    const userResponse = await fetch(`${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:5000'}/api/auth/me`, {
      headers: {
        'x-session': token
      }
    });

    if (!userResponse.ok) {
      return NextResponse.json({ error: '无效的登录状态' }, { status: 401 });
    }

    const userData = await userResponse.json();
    
    // 查询用户的游戏记录
    const records = await rawDb`
      SELECT id, scenario, final_score, result, played_at 
      FROM game_records 
      WHERE user_id = ${userData.user.id}
      ORDER BY played_at DESC
      LIMIT 50
    `;

    return NextResponse.json({ records: records });
  } catch (error) {
    console.error('Error fetching game records:', error);
    return NextResponse.json({ error: '获取记录失败' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const token = request.headers.get('x-session');
  
  if (!token) {
    return NextResponse.json({ error: '请先登录' }, { status: 401 });
  }

  try {
    const userResponse = await fetch(`${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:5000'}/api/auth/me`, {
      headers: {
        'x-session': token
      }
    });

    if (!userResponse.ok) {
      return NextResponse.json({ error: '无效的登录状态' }, { status: 401 });
    }

    const userData = await userResponse.json();
    const body = await request.json();
    const { scenario, finalScore, result } = body;

    if (!scenario || finalScore === undefined) {
      return NextResponse.json({ error: '缺少必要参数' }, { status: 400 });
    }

    // 插入游戏记录
    const insertResult = await rawDb`
      INSERT INTO game_records (user_id, scenario, final_score, result)
      VALUES (${userData.user.id}, ${scenario}, ${finalScore}, ${result || 'completed'})
      RETURNING id, scenario, final_score, result, played_at
    `;

    return NextResponse.json({ 
      success: true, 
      record: insertResult[0] 
    });
  } catch (error) {
    console.error('Error saving game record:', error);
    return NextResponse.json({ error: '保存记录失败' }, { status: 500 });
  }
}
