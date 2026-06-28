import { NextRequest, NextResponse } from 'next/server';
import {
  HeaderUtils,
  ImageGenerationClient,
  VideoGenerationClient,
} from 'coze-coding-dev-sdk';
import { createCozeConfig, hasCozeCredentials, isCozeAuthError } from '@/lib/coze-runtime';
import { scenes } from '@/lib/scenes';

export const runtime = 'nodejs';
export const maxDuration = 300;

type MediaKind = 'image' | 'video';

const DEFAULT_IMAGE_PROMPTS: Record<string, string> = {
  lisa: '手机自拍风格，活泼开朗的年轻女生，微笑看向镜头，日常生活感，光线自然，真实感，高质量人像照片',
  sophia: '文艺清新风格的年轻女生，在书店或咖啡馆中安静看书，胶片感，自然柔和光线，高质量人像照片',
  maria: '高冷神秘风格的年轻女生，时尚摄影棚氛围，冷调光影，目光克制，高级感人像照片',
  emma: '温柔治愈风格的年轻女生，暖色自然光，轻松微笑，亲和力强，高质量生活感照片',
  olivia: '傲娇可爱风格的年轻女生，轻微害羞又嘴硬的表情，清新日常风，高质量人像照片',
  anna: '独立自信的职业女性，利落穿搭，都市环境，自然直视镜头，高质量商业感人像照片',
};

const DEFAULT_VIDEO_PROMPTS: Record<string, string> = {
  lisa: '活泼开朗的年轻女生，对镜头轻轻挥手然后笑起来，像随手发来的日常短视频，真实自然',
  sophia: '文艺清新的年轻女生，在安静的书店里抬头看向镜头，露出温柔浅笑，氛围安静自然',
  maria: '高冷神秘的年轻女生，站在光影交错的空间里看向镜头，轻微转身，氛围高级克制',
  emma: '温柔体贴的年轻女生，对镜头轻声打招呼并露出温暖微笑，生活感短视频',
  olivia: '傲娇可爱的年轻女生，先假装不在意地看向别处，再忍不住对镜头轻轻笑一下',
  anna: '独立自信的职业女性，在城市街景中停下脚步看向镜头，神态从容，短视频真实自然',
};

function getRoleName(roleId: string): string {
  return scenes.flatMap((scene) => scene.roles).find((role) => role.id === roleId)?.name ?? '她';
}

function buildMediaPrompt(kind: MediaKind, roleId: string, userPrompt?: string): string {
  const roleName = getRoleName(roleId);
  const basePrompt =
    kind === 'image'
      ? DEFAULT_IMAGE_PROMPTS[roleId] ?? '真实自然的年轻女性日常照片，高质量人像'
      : DEFAULT_VIDEO_PROMPTS[roleId] ?? '真实自然的年轻女性对镜头打招呼的短视频';

  if (userPrompt?.trim()) {
    return `请生成符合 ${roleName} 人设的${kind === 'image' ? '照片' : '短视频'}。基础风格：${basePrompt}。用户额外要求：${userPrompt.trim()}。`;
  }

  return `请生成符合 ${roleName} 人设的${kind === 'image' ? '照片' : '短视频'}。要求：${basePrompt}。`;
}

function getMediaErrorResponse(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);

  if (message.includes('status code 429')) {
    return NextResponse.json(
      { error: '视频生成请求过于频繁或额度已用尽，请稍后再试。' },
      { status: 429 }
    );
  }

  if (message.includes('视频生成超时')) {
    return NextResponse.json(
      { error: message },
      { status: 408 }
    );
  }

  return NextResponse.json(
    { error: message || 'Failed to generate media' },
    { status: 500 }
  );
}

function createVideoClient(request: NextRequest) {
  const customHeaders = HeaderUtils.extractForwardHeaders(request.headers);
  const config = createCozeConfig();
  return new VideoGenerationClient(config, customHeaders);
}

function getVideoTaskBaseUrl(client: VideoGenerationClient): string {
  const runtimeClient = client as any;
  return runtimeClient.baseUrl || process.env.COZE_INTEGRATION_BASE_URL || 'https://integration.coze.cn';
}

async function requestVideoTask<T>(
  client: VideoGenerationClient,
  method: 'GET' | 'POST',
  url: string,
  data?: unknown
): Promise<T> {
  const runtimeClient = client as any;

  return runtimeClient.request(method, url, data);
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const taskId = searchParams.get('taskId');

    if (!taskId) {
      return NextResponse.json({ error: 'taskId is required' }, { status: 400 });
    }

    if (!hasCozeCredentials()) {
      return NextResponse.json({ error: 'Media generation is unavailable in the current runtime.' }, { status: 503 });
    }

    const client = createVideoClient(request);
    const baseUrl = getVideoTaskBaseUrl(client);
    const task = await requestVideoTask<{
      status: 'queued' | 'running' | 'succeeded' | 'failed' | 'cancelled';
      content?: { video_url?: string; last_frame_url?: string };
      error_message?: string;
    }>(client, 'GET', `${baseUrl}/api/v3/contents/generations/tasks/${taskId}`);

    if (task.status === 'succeeded') {
      return NextResponse.json({
        mediaType: 'video',
        status: 'completed',
        taskId,
        url: task.content?.video_url ?? null,
        posterUrl: task.content?.last_frame_url ?? null,
        text: '视频生成完成了。',
      });
    }

    if (task.status === 'failed' || task.status === 'cancelled') {
      return NextResponse.json({
        mediaType: 'video',
        status: 'failed',
        taskId,
        error: task.error_message || '视频生成失败了。',
      });
    }

    return NextResponse.json({
      mediaType: 'video',
      status: 'pending',
      taskId,
    });
  } catch (error) {
    if (isCozeAuthError(error)) {
      return NextResponse.json(
        { error: 'Media generation failed because Coze authentication is invalid.' },
        { status: 503 }
      );
    }

    return getMediaErrorResponse(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const kind = body?.kind as MediaKind;
    const roleId = typeof body?.roleId === 'string' ? body.roleId : '';
    const prompt = typeof body?.prompt === 'string' ? body.prompt : '';

    if (kind !== 'image' && kind !== 'video') {
      return NextResponse.json({ error: 'Invalid media kind' }, { status: 400 });
    }

    if (!roleId) {
      return NextResponse.json({ error: 'Role is required' }, { status: 400 });
    }

    if (!hasCozeCredentials()) {
      return NextResponse.json({ error: 'Media generation is unavailable in the current runtime.' }, { status: 503 });
    }

    const config = createCozeConfig();
    const customHeaders = HeaderUtils.extractForwardHeaders(request.headers);

    if (kind === 'image') {
      const client = new ImageGenerationClient(config, customHeaders);
      const response = await client.generate({
        prompt: buildMediaPrompt('image', roleId, prompt),
        size: '2K',
        watermark: false,
      });
      const helper = client.getResponseHelper(response);
      const imageUrl = helper.imageUrls[0];

      if (!imageUrl) {
        return NextResponse.json({ error: helper.errorMessages[0] ?? 'Image generation failed' }, { status: 502 });
      }

      return NextResponse.json({
        mediaType: 'image',
        url: imageUrl,
        text: `${getRoleName(roleId)} 给你发来了一张照片。`,
      });
    }

    const client = createVideoClient(request);
    const baseUrl = getVideoTaskBaseUrl(client);
    const response = await requestVideoTask<{ id: string }>(
      client,
      'POST',
      `${baseUrl}/api/v3/contents/generations/tasks`,
      {
        model: 'doubao-seedance-2-0-260128',
        content: [{ type: 'text', text: buildMediaPrompt('video', roleId, prompt) }],
        resolution: '720p',
        ratio: '9:16',
        duration: 5,
        watermark: false,
        camerafixed: true,
        generate_audio: false,
      }
    );

    return NextResponse.json({
      mediaType: 'video',
      status: 'pending',
      taskId: response.id,
      text: `${getRoleName(roleId)} 正在给你生成一段视频，稍等一下。`,
    });
  } catch (error) {
    if (isCozeAuthError(error)) {
      return NextResponse.json(
        { error: 'Media generation failed because Coze authentication is invalid.' },
        { status: 503 }
      );
    }

    console.error('Media API Error:', error);
    return getMediaErrorResponse(error);
  }
}
