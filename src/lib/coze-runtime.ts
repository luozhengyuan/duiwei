import { Config } from 'coze-coding-dev-sdk';
import { generateCandidateReplies, ReviewReport } from '@/lib/chat-types';
import { scenes } from '@/lib/scenes';

type ChatMessage = {
  role: string;
  content: string;
};

const FALLBACK_TTS_AUDIO_URI =
  'data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQAAAAA=';

export type CozeCredentialState = {
  available: boolean;
  reason: 'valid' | 'missing' | 'jwt-like-token' | 'invalid-jwt-hs256';
  apiKeyFormat: 'missing' | 'plain' | 'jwt-like';
  apiKeyLength: number;
  jwtAlg: string | null;
};

type RoleProfile = {
  greeting: string;
  doing: string;
  weekend: string;
  hobbies: string;
  food: string;
  workStudy: string;
  media: string;
  fallback: string;
};

const ROLE_REPLY_STYLES: Record<string, RoleProfile> = {
  lisa: {
    greeting: '哈喽呀，我在呢，刚好摸鱼看了会儿吃的，差点把自己看饿了。你今天怎么样呀？',
    doing: '我刚在想下班后去吃什么，最近有点馋火锅和小蛋糕，哈哈。你呢，你现在在忙什么？',
    weekend: '如果是周末的话，我大概率会约朋友探店、拍照，或者临时起意去附近逛一逛。你周末一般喜欢宅着还是出去玩呀？',
    hobbies: '我平时还挺喜欢美食、旅行和拍照的，看到有意思的小店就很想去打卡。你有没有最近特别上头的爱好？',
    food: '美食这种话题我可太能聊了，我最近很想吃火锅，甜品也完全拒绝不了。你最常去吃哪一类呀？',
    workStudy: '我平时做运营，工作节奏有时候还挺快的，不过也挺有意思，总能碰到新鲜事。你是上班党还是学生呀？',
    media: '哈哈，你这是在为难我呀。这个本地版本现在还不能真的发照片或视频给你，我只能先陪你聊天。要不你先说说，你平时拍照会更喜欢自拍还是拍风景？',
    fallback: '哈哈，这个话题我能接。我一般会先说说自己的想法，再反过来问问你。那你自己怎么看呀？',
  },
  sophia: {
    greeting: '你好呀，我刚在整理书单，今天节奏还算安静。你这会儿在忙什么？',
    doing: '我刚刚在看一本散文集，顺手记了几句挺喜欢的话。你呢，今天过得还顺利吗？',
    weekend: '周末我一般会去书店待一会儿，或者找一家安静的咖啡馆发呆。你会更喜欢热闹一点，还是安静一点的安排？',
    hobbies: '阅读、电影和慢慢观察生活里的小细节，都会让我很放松。你平时最容易沉浸在哪类事情里？',
    food: '如果只是吃东西，我会更在意氛围，喜欢那种不吵、可以慢慢聊天的小店。你最近有遇到让你印象很好的店吗？',
    workStudy: '我平时会在书店帮忙，也会写点东西，所以我还挺享受安静专注的状态。你平常的生活节奏快吗？',
    media: '如果是照片或视频，这个本地版本暂时还发不了呢。我倒是可以先跟你形容一下我会喜欢什么样的画面，你想听吗？',
    fallback: '这个话题还不错，我想慢一点聊。你可以多说一点，我会更想了解你在意的部分。',
  },
  maria: {
    greeting: '你好。我在，刚忙完一点事。你找我聊什么？',
    doing: '在修片。今天拍的东西还行，就是后期有点费时间。你呢？',
    weekend: '周末不一定，看状态。有时候拍照，有时候就一个人待着。你通常怎么安排？',
    hobbies: '摄影、看展，还有一些不那么吵的地方。太无聊的话题我一般不太聊。你有什么真正喜欢的东西？',
    food: '吃的我不挑，但环境要过得去。比起排队网红店，我更看重值不值得。你最近吃到过不错的吗？',
    workStudy: '我做摄影，时间不算固定。忙的时候会很忙，闲下来也会想一个人静静。你的工作节奏呢？',
    media: '照片和视频现在发不了，这个版本没这个功能。你如果真想聊影像，我们可以聊你喜欢什么风格。',
    fallback: '这个可以聊，不过我更喜欢具体一点的内容。你直接说重点吧。',
  },
  emma: {
    greeting: '你好呀，我刚好在呢。今天过得怎么样，会不会有点累呀？',
    doing: '我刚忙完一点事情，正想让自己放松一下呢。你这会儿是在休息，还是还在忙呀？',
    weekend: '周末我会想让自己慢下来一点，可能散散步、喝点好喝的，或者见见朋友。你周末最喜欢怎么过呢？',
    hobbies: '我挺喜欢温柔一点的事情，比如散步、聊天、看些轻松的内容。你平时靠什么给自己充电呀？',
    food: '如果是吃的，我会偏爱让人心情变好的那种，甜品和热乎乎的东西都很加分。你有没有自己的安慰食物呀？',
    workStudy: '我平时做幼师，和小朋友待在一起会很热闹，也会很治愈。你平常是不是也挺忙的呀？',
    media: '照片和视频功能现在还不能真的用呢，所以我暂时发不了给你。不过你要是愿意，我们可以先聊聊你喜欢什么样的照片风格呀。',
    fallback: '我觉得这个话题可以慢慢聊呀。你如果愿意多说一点，我会很想认真听。',
  },
  olivia: {
    greeting: '你怎么突然来找我聊天呀……不过我刚好在线就是了。你今天还行吧？',
    doing: '我、我才没有特地在等谁消息呢，只是刚好在刷东西而已。你呢，在干嘛？',
    weekend: '周末看心情吧，可能出去逛逛，也可能窝着追点东西。你问这个干嘛，想约我啊？',
    hobbies: '我也有自己的兴趣啊，追剧、逛街、看点有意思的东西之类的。你呢，总不会只有工作吧？',
    food: '甜的我还挺喜欢的，不过你别误会，我可不是因为嘴馋。你平时更喜欢吃正餐还是小零食？',
    workStudy: '我平时也挺忙的，不是每天都有空随便聊天。你呢，最近是不是也被事情追着跑？',
    media: '你想看照片或者视频啊……可这个版本现在还发不了，别多想，我不是故意吊着你。你先说说你平时会拍什么好了。',
    fallback: '这个话题嘛……也不是不能聊。你要是认真一点说，我就勉强继续听听。',
  },
  anna: {
    greeting: '你好，我在。今天行程有点满，不过现在可以聊几句。你想聊什么？',
    doing: '我刚处理完手上的事，正准备让自己切换一下节奏。你现在是在工作，还是已经下班了？',
    weekend: '周末我通常会留一点时间给自己，健身、看展，或者把生活重新整理一下。你会怎么安排自己的周末？',
    hobbies: '我更喜欢有效率、也有质量的事情，比如运动、阅读，或者能让我真正放松下来的活动。你平时有什么长期坚持的爱好吗？',
    food: '吃东西对我来说更像放松的一部分，环境和陪的人都挺重要。你平时会专门去找好吃的地方吗？',
    workStudy: '我平时工作节奏比较紧，所以会更珍惜能认真聊天的时间。你最近的状态怎么样？',
    media: '图片和视频现在不能直接发，这个本地版本还没接上对应能力。如果你愿意，我们可以先聊聊你为什么想看这些内容。',
    fallback: '这个话题可以继续，不过我更想听真实一点的表达。你可以说说你自己的看法。',
  },
};

export function hasCozeCredentials(): boolean {
  return getCozeCredentialState().available;
}

export function createCozeConfig(): Config {
  const state = getCozeCredentialState();
  if (!state.available) {
    throw new Error(`Invalid Coze credentials: ${state.reason}`);
  }

  return new Config({
    apiKey: process.env.COZE_WORKLOAD_IDENTITY_API_KEY,
    baseUrl: process.env.COZE_INTEGRATION_BASE_URL,
    modelBaseUrl: process.env.COZE_INTEGRATION_MODEL_BASE_URL,
  });
}

export function isCozeAuthError(error: unknown): boolean {
  const message =
    error instanceof Error
      ? error.message
      : typeof error === 'string'
      ? error
      : JSON.stringify(error);

  return (
    message.includes('190000007') ||
    message.includes('no permission') ||
    message.includes('token validation failed') ||
    message.includes('unexpected signing method')
  );
}

function decodeJwtHeader(token: string | undefined): Record<string, unknown> | null {
  if (!token) {
    return null;
  }

  const parts = token.split('.');
  if (parts.length < 2) {
    return null;
  }

  try {
    const normalized = parts[0].replace(/-/g, '+').replace(/_/g, '/');
    const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=');
    const json = Buffer.from(padded, 'base64').toString('utf8');
    return JSON.parse(json) as Record<string, unknown>;
  } catch {
    return null;
  }
}

export function getCozeCredentialState(): CozeCredentialState {
  const apiKey = process.env.COZE_WORKLOAD_IDENTITY_API_KEY;
  const baseUrl = process.env.COZE_INTEGRATION_BASE_URL;
  const modelBaseUrl = process.env.COZE_INTEGRATION_MODEL_BASE_URL;

  if (!apiKey || !baseUrl || !modelBaseUrl) {
    return {
      available: false,
      reason: 'missing',
      apiKeyFormat: apiKey ? (apiKey.includes('.') ? 'jwt-like' : 'plain') : 'missing',
      apiKeyLength: apiKey?.length ?? 0,
      jwtAlg: null,
    };
  }

  const jwtHeader = decodeJwtHeader(apiKey);
  if (!jwtHeader) {
    return {
      available: true,
      reason: 'valid',
      apiKeyFormat: 'plain',
      apiKeyLength: apiKey.length,
      jwtAlg: null,
    };
  }

  const jwtAlg = typeof jwtHeader.alg === 'string' ? jwtHeader.alg : null;
  if (jwtAlg === 'HS256') {
    return {
      available: false,
      reason: 'invalid-jwt-hs256',
      apiKeyFormat: 'jwt-like',
      apiKeyLength: apiKey.length,
      jwtAlg,
    };
  }

  return {
    available: false,
    reason: 'jwt-like-token',
    apiKeyFormat: 'jwt-like',
    apiKeyLength: apiKey.length,
    jwtAlg,
  };
}

function getRoleName(roleId: string): string {
  return (
    scenes.flatMap((scene) => scene.roles).find((role) => role.id === roleId)?.name ??
    '对方'
  );
}

function getLastUserMessage(messages: ChatMessage[]): string {
  const lastUser = [...messages].reverse().find((message) => message.role === 'user');
  return lastUser?.content.trim() ?? '';
}

function inferContextReply(input: string, roleId: string): string {
  const style = ROLE_REPLY_STYLES[roleId] ?? ROLE_REPLY_STYLES.lisa;

  if (!input) {
    return style.greeting;
  }
  if (/你好|嗨|哈喽|hello/i.test(input)) {
    return style.greeting;
  }
  if (/干嘛|干吗|在忙|在做什么|在干什么/.test(input)) {
    return style.doing;
  }
  if (/周末|假期|放假/.test(input)) {
    return style.weekend;
  }
  if (/照片|图片|自拍|视频|发图|发照片|发视频|看看你|露脸|语音通话|视频通话/.test(input)) {
    return style.media;
  }
  if (/电影|音乐|书|旅行|拍照|爱好|兴趣|喜欢做什么|平时喜欢/.test(input)) {
    return style.hobbies;
  }
  if (/吃|美食|火锅|咖啡|奶茶|甜品|餐厅/.test(input)) {
    return style.food;
  }
  if (/上班|工作|职业|学生|上学|专业|公司/.test(input)) {
    return style.workStudy;
  }
  if (input.length <= 4) {
    return style.fallback;
  }
  return style.fallback;
}

export function buildLocalChatReply(messages: ChatMessage[], roleId: string): string {
  const lastUserMessage = getLastUserMessage(messages);
  return inferContextReply(lastUserMessage, roleId);
}

export function buildLocalCandidates(messages: ChatMessage[], roleId: string): string[] {
  const roleName = getRoleName(roleId);
  const genericCandidates = generateCandidateReplies(
    messages.map((message, index) => ({
      id: `candidate-${index}`,
      role: message.role === 'assistant' ? 'assistant' : 'user',
      content: message.content,
      timestamp: Date.now(),
    })),
    roleName
  );

  return [
    ...genericCandidates,
    '你最近都在忙什么呀？',
    '这个话题你平时会感兴趣吗？',
  ].slice(0, 4);
}

export function buildLocalReview(messages: ChatMessage[], roleId: string): ReviewReport {
  const userMessages = messages.filter((message) => message.role === 'user');
  const averageLength =
    userMessages.length > 0
      ? Math.round(
          userMessages.reduce((sum, message) => sum + message.content.trim().length, 0) /
            userMessages.length
        )
      : 0;

  const overallScore = Math.max(68, Math.min(88, 70 + userMessages.length * 4 + Math.min(averageLength, 12)));

  const keyHighlights =
    userMessages.length > 0
      ? [
          {
            message: userMessages[0].content,
            analysis: '你愿意主动开场，这是推进关系最关键的一步。',
            why: '很多聊天失败并不是说错话，而是根本没有迈出第一步。',
          },
        ]
      : [];

  const shortMessage = userMessages.find((message) => message.content.trim().length <= 4);
  const keyMistakes = shortMessage
    ? [
        {
          message: shortMessage.content,
          analysis: '这句信息量偏少，容易让对方不知道怎么接。',
          suggestion: '可以补一个具体点的观察、兴趣点，或者轻量提问。',
        },
      ]
    : [];

  return {
    overallScore,
    keyHighlights,
    keyMistakes,
    improvement: [
      '每次开场都尽量带一个具体话题，不要只停留在寒暄。',
      '多用开放式问题，让对方更容易展开表达。',
      '先关注轻松、安全的话题，再慢慢推进关系。',
    ],
    psychologyInsight: `${getRoleName(roleId)} 这类角色更容易对“自然、轻松、带一点好奇心”的表达产生正向反馈。`,
    tips: [
      '先共情，再提问。',
      '少问审问式问题，多聊共同兴趣。',
      '一句话里最好同时包含态度和信息量。',
    ],
  };
}

export function getFallbackTtsAudioUri(): string {
  return FALLBACK_TTS_AUDIO_URI;
}
