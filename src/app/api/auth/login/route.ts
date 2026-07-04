import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { db } from '@/storage/database';
import { users } from '@/storage/database/shared/schema';
import { eq } from 'drizzle-orm';

type TurnstileVerifyResult = {
  success: boolean;
  'error-codes'?: string[];
};

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as {
      username?: string;
      password?: string;
      turnstileToken?: string;
    };
    const { username, password, turnstileToken } = body;
    const turnstileSecretKey = process.env.TURNSTILE_SECRET_KEY;
    const isDev = process.env.NODE_ENV === 'development';
    const turnstileRequired = !!turnstileSecretKey && !isDev;

    // 验证输入
    if (!username || !password) {
      return NextResponse.json(
        { error: '用户名和密码不能为空' },
        { status: 400 }
      );
    }

    if (turnstileRequired && !turnstileToken) {
      return NextResponse.json(
        { error: '请先完成人机验证' },
        { status: 400 }
      );
    }

    // 校验 Turnstile token（仅在配置了密钥且非开发环境时）
    if (turnstileRequired && turnstileToken) {
      const verifyBody = new URLSearchParams({
        secret: turnstileSecretKey,
        response: turnstileToken,
      });

      const verifyResponse = await fetch(
        'https://challenges.cloudflare.com/turnstile/v0/siteverify',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: verifyBody.toString(),
        }
      );

      if (!verifyResponse.ok) {
        console.error('Turnstile 校验请求失败:', verifyResponse.status);
        return NextResponse.json(
          { error: '人机验证服务异常，请稍后重试' },
          { status: 502 }
        );
      }

      const verifyResult = (await verifyResponse.json()) as TurnstileVerifyResult;

      if (!verifyResult.success) {
        return NextResponse.json(
          { error: '人机验证失败，请重试' },
          { status: 403 }
        );
      }
    }

    // 查找用户
    const existingUsers = await db
      .select()
      .from(users)
      .where(eq(users.username, username))
      .limit(1);

    if (existingUsers.length === 0) {
      return NextResponse.json(
        { error: '用户名或密码错误' },
        { status: 401 }
      );
    }

    const user = existingUsers[0];

    // 验证密码
    const isValidPassword = await bcrypt.compare(password, user.password);

    if (!isValidPassword) {
      return NextResponse.json(
        { error: '用户名或密码错误' },
        { status: 401 }
      );
    }

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        username: user.username,
        createdAt: user.createdAt,
      },
    });
  } catch (error) {
    console.error('登录错误:', error);
    return NextResponse.json(
      { error: '登录失败，请稍后重试' },
      { status: 500 }
    );
  }
}
