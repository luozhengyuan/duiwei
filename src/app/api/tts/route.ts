import { NextRequest, NextResponse } from 'next/server';
import { TTSClient, HeaderUtils } from 'coze-coding-dev-sdk';
import {
  createCozeConfig,
  getFallbackTtsAudioUri,
  hasCozeCredentials,
  isCozeAuthError,
} from '@/lib/coze-runtime';

export const runtime = 'nodejs';
export const maxDuration = 30;

// 角色对应的声音
const roleVoices: Record<string, string> = {
  lisa: 'zh_female_meilinvyou_saturn_bigtts',      // 活泼开朗 -> 魅力女友
  sophia: 'saturn_zh_female_keainvsheng_tob',      // 文艺清新 -> 可爱女孩
  maria: 'zh_female_xiaohe_uranus_bigtts',        // 高冷神秘 -> 默认女声
  emma: 'zh_female_vv_uranus_bigtts',             // 温柔体贴 -> 温柔女声
  olivia: 'saturn_zh_female_tiaopigongzhu_tob',   // 傲娇可爱 -> 调皮公主
  anna: 'zh_female_xiaohe_uranus_bigtts',         // 独立自主 -> 默认女声
};

export async function POST(request: NextRequest) {
  try {
    const { text, roleId } = await request.json();

    if (!text) {
      return NextResponse.json(
        { error: 'Text is required' },
        { status: 400 }
      );
    }

    // 获取角色对应的声音
    const speaker = roleVoices[roleId] || roleVoices.lisa;

    if (!hasCozeCredentials()) {
      return NextResponse.json({
        audioUri: getFallbackTtsAudioUri(),
        audioSize: 0,
        mocked: true,
      });
    }

    // 提取转发 headers
    const customHeaders = HeaderUtils.extractForwardHeaders(request.headers);

    // 创建 TTS 客户端
    const config = createCozeConfig();
    const client = new TTSClient(config, customHeaders);

    // 生成语音
    const response = await client.synthesize({
      uid: `tts-${Date.now()}`,
      text,
      speaker,
      audioFormat: 'mp3',
      sampleRate: 24000,
    });

    return NextResponse.json({
      audioUri: response.audioUri,
      audioSize: response.audioSize,
    });
  } catch (error) {
    if (isCozeAuthError(error)) {
      return NextResponse.json({
        audioUri: getFallbackTtsAudioUri(),
        audioSize: 0,
        mocked: true,
      });
    }
    console.error('TTS API Error:', error);
    return NextResponse.json(
      { error: 'Failed to synthesize speech' },
      { status: 500 }
    );
  }
}
