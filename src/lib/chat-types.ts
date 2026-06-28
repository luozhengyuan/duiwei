// 消息类型定义
export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
  mediaType?: 'image' | 'video';
  mediaUrl?: string;
  mediaPosterUrl?: string;
  mediaStatus?: 'pending' | 'completed' | 'failed';
  mediaTaskId?: string;
}

export interface ChatSession {
  id: string;
  sceneId: string;
  roleId: string;
  messages: Message[];
  createdAt: number;
  status: 'active' | 'completed';
}

// 复盘报告类型
export interface ReviewReport {
  overallScore: number;
  keyHighlights: Highlight[];
  keyMistakes: Mistake[];
  improvement: string[];
  psychologyInsight: string;
  tips: string[];
}

export interface Highlight {
  message: string;
  analysis: string;
  why: string;
}

export interface Mistake {
  message: string;
  analysis: string;
  suggestion: string;
}

// 生成唯一 ID
export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

// 格式化时间戳
export function formatTime(timestamp: number): string {
  const date = new Date(timestamp);
  return date.toLocaleTimeString('zh-CN', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

// 生成候选回复
export function generateCandidateReplies(
  context: Message[],
  rolePersonality: string
): string[] {
  // 这个函数用于生成候选回复选项
  // 实际实现会调用 AI API
  return [
    '最近有什么好看的电影推荐吗？',
    '周末有什么计划呀？',
    '你平时喜欢做什么？',
  ];
}
