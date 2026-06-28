'use client';

import { use, useEffect, useState, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { scenes } from '@/lib/scenes';
import { Message, generateId } from '@/lib/chat-types';
import { useAuth } from '@/contexts/auth-context';
import { Badge } from '@/components/ui/badge';
import {
  ChevronLeft,
  Send,
  MoreHorizontal,
  Sparkles,
  ImagePlus,
  Clapperboard,
  Volume2,
  VolumeX,
  Pause,
  Play,
  X,
} from 'lucide-react';

interface PageProps {
  params: Promise<{ id: string; roleId: string }>;
}

type RuntimeStatus = {
  chatMode: 'coze' | 'fallback';
  ttsMode: 'coze' | 'mocked';
  configStatus: 'configured' | 'missing' | 'invalid';
  authStatus: 'invalid' | 'unknown' | 'missing';
  credentialReason: 'valid' | 'missing' | 'jwt-like-token' | 'invalid-jwt-hs256';
  mediaSupported: boolean;
  missingEnv: string[];
};

export default function ChatPage({ params }: PageProps) {
  const { id: sceneId, roleId } = use(params);
  const router = useRouter();
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [candidates, setCandidates] = useState<string[]>([]);
  const [showCandidates, setShowCandidates] = useState(false);
  const [ttsEnabled, setTtsEnabled] = useState(true);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [isGeneratingMedia, setIsGeneratingMedia] = useState(false);
  const [runtimeStatus, setRuntimeStatus] = useState<RuntimeStatus | null>(null);
  const [sessionId] = useState(generateId());
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const autoplayTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const ttsPlayTokenRef = useRef(0);

  const scene = scenes.find((s) => s.id === sceneId);
  const role = scene?.roles.find((r) => r.id === roleId);

  // 滚动到底部
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    const loadRuntimeStatus = async () => {
      try {
        const response = await fetch('/api/runtime-status');
        if (!response.ok) return;
        const data: RuntimeStatus = await response.json();
        setRuntimeStatus(data);
        if (data.ttsMode !== 'coze') {
          setTtsEnabled(false);
        }
      } catch {
        // Ignore status fetch failures and keep the chat usable.
      }
    };

    loadRuntimeStatus();
  }, []);

  // 清理音频
  useEffect(() => {
    return () => {
      if (autoplayTimeoutRef.current) {
        clearTimeout(autoplayTimeoutRef.current);
        autoplayTimeoutRef.current = null;
      }
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  const stopCurrentAudio = useCallback(
    (reason: string, invalidateToken = true) => {
      if (autoplayTimeoutRef.current) {
        clearTimeout(autoplayTimeoutRef.current);
        autoplayTimeoutRef.current = null;
      }

      if (invalidateToken) {
        ttsPlayTokenRef.current += 1;
      }

      if (audioRef.current) {
        // #region debug-point tts-stop-current-audio
        void fetch('http://127.0.0.1:8766/log', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            scope: 'client',
            point: 'tts-stop-current-audio',
            reason,
            playingId,
          }),
        }).catch(() => {});
        // #endregion
        audioRef.current.pause();
        audioRef.current = null;
      }

      setPlayingId(null);
    },
    [playingId]
  );

  // 获取候选回复
  const fetchCandidates = async () => {
    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages,
          roleId,
          action: 'candidates',
        }),
      });
      const data = await response.json();
      if (data.candidates) {
        setCandidates(data.candidates);
      }
    } catch (error) {
      console.error('Failed to fetch candidates:', error);
    }
  };

  // 播放 TTS 语音
  const playTTS = async (messageId: string, text: string) => {
    // #region debug-point tts-play-enter
    void fetch('http://127.0.0.1:8766/log', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        scope: 'client',
        point: 'tts-play-enter',
        messageId,
        textLength: text.length,
        playingId,
        hasAudioRef: Boolean(audioRef.current),
      }),
    }).catch(() => {});
    // #endregion
    if (runtimeStatus?.ttsMode !== 'coze') {
      alert('当前本地环境未接入真实 TTS，缺少 Coze 凭证，语音功能已禁用。');
      return;
    }

    const playToken = ttsPlayTokenRef.current + 1;
    ttsPlayTokenRef.current = playToken;

    // 如果正在播放同一消息，则暂停
    if (playingId === messageId) {
      // #region debug-point tts-play-toggle-pause-same-message
      void fetch('http://127.0.0.1:8766/log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          scope: 'client',
          point: 'tts-play-toggle-pause-same-message',
          messageId,
        }),
      }).catch(() => {});
      // #endregion
      stopCurrentAudio('toggle-same-message', false);
      return;
    }

    // 停止之前的播放
    if (audioRef.current) {
      // #region debug-point tts-play-pause-previous-audio
      void fetch('http://127.0.0.1:8766/log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          scope: 'client',
          point: 'tts-play-pause-previous-audio',
          messageId,
          previousPlayingId: playingId,
        }),
      }).catch(() => {});
      // #endregion
      stopCurrentAudio('play-new-message', false);
    }

    try {
      setPlayingId(messageId);

      // 调用 TTS API
      const response = await fetch('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, roleId }),
      });

      if (!response.ok) throw new Error('TTS failed');

      const data = await response.json();
      
      // 创建音频并播放
      // #region debug-point tts-audio-created
      void fetch('http://127.0.0.1:8766/log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          scope: 'client',
          point: 'tts-audio-created',
          messageId,
          audioUriPresent: Boolean(data.audioUri),
        }),
      }).catch(() => {});
      // #endregion
      const audio = new Audio(data.audioUri);
      if (playToken !== ttsPlayTokenRef.current) {
        return;
      }
      audioRef.current = audio;

      audio.onended = () => {
        // #region debug-point tts-audio-ended
        void fetch('http://127.0.0.1:8766/log', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            scope: 'client',
            point: 'tts-audio-ended',
            messageId,
          }),
        }).catch(() => {});
        // #endregion
        setPlayingId(null);
        audioRef.current = null;
      };

      audio.onpause = () => {
        // #region debug-point tts-audio-pause-event
        void fetch('http://127.0.0.1:8766/log', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            scope: 'client',
            point: 'tts-audio-pause-event',
            messageId,
            isCurrentToken: playToken === ttsPlayTokenRef.current,
          }),
        }).catch(() => {});
        // #endregion
      };

      audio.onerror = () => {
        // #region debug-point tts-audio-error
        void fetch('http://127.0.0.1:8766/log', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            scope: 'client',
            point: 'tts-audio-error',
            messageId,
          }),
        }).catch(() => {});
        // #endregion
        setPlayingId(null);
        audioRef.current = null;
      };

      // #region debug-point tts-play-before-audio-play
      void fetch('http://127.0.0.1:8766/log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          scope: 'client',
          point: 'tts-play-before-audio-play',
          messageId,
        }),
      }).catch(() => {});
      // #endregion
      if (playToken !== ttsPlayTokenRef.current) {
        return;
      }
      await audio.play();
      if (playToken !== ttsPlayTokenRef.current) {
        audio.pause();
        return;
      }
      // #region debug-point tts-play-resolved
      void fetch('http://127.0.0.1:8766/log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          scope: 'client',
          point: 'tts-play-resolved',
          messageId,
        }),
      }).catch(() => {});
      // #endregion
    } catch (error) {
      // #region debug-point tts-play-catch
      void fetch('http://127.0.0.1:8766/log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          scope: 'client',
          point: 'tts-play-catch',
          messageId,
          errorName: error instanceof Error ? error.name : 'unknown',
          errorMessage: error instanceof Error ? error.message : String(error),
        }),
      }).catch(() => {});
      // #endregion
      if (error instanceof Error && error.name === 'AbortError') {
        if (playToken === ttsPlayTokenRef.current) {
          setPlayingId(null);
        }
        return;
      }
      console.error('Failed to play TTS:', error);
      if (playToken === ttsPlayTokenRef.current) {
        setPlayingId(null);
      }
    }
  };

  const pollVideoTask = useCallback(async (messageId: string, taskId: string) => {
    const startedAt = Date.now();
    const maxPollingMs = 8 * 60 * 1000;
    const pollIntervalMs = 5000;

    while (Date.now() - startedAt < maxPollingMs) {
      try {
        const response = await fetch(`/api/media?taskId=${encodeURIComponent(taskId)}`);
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || '视频状态查询失败');
        }

        if (data.status === 'completed') {
          setMessages((prev) =>
            prev.map((msg) =>
              msg.id === messageId
                ? {
                    ...msg,
                    content: data.text || '视频生成完成了。',
                    mediaType: 'video',
                    mediaUrl: data.url,
                    mediaPosterUrl: data.posterUrl,
                    mediaStatus: 'completed',
                  }
                : msg
            )
          );
          return;
        }

        if (data.status === 'failed') {
          setMessages((prev) =>
            prev.map((msg) =>
              msg.id === messageId
                ? {
                    ...msg,
                    content: `抱歉，视频生成失败了：${data.error || '未知错误'}`,
                    mediaStatus: 'failed',
                  }
                : msg
            )
          );
          return;
        }
      } catch (error) {
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === messageId
              ? {
                  ...msg,
                  content:
                    error instanceof Error
                      ? `抱歉，视频状态查询失败了：${error.message}`
                      : '抱歉，视频状态查询失败了。',
                  mediaStatus: 'failed',
                }
              : msg
          )
        );
        return;
      }

      await new Promise((resolve) => setTimeout(resolve, pollIntervalMs));
    }

    setMessages((prev) =>
      prev.map((msg) =>
        msg.id === messageId
          ? {
              ...msg,
              content: '视频生成等待时间过长，当前上游队列可能拥堵。请稍后重试，或等这条任务结束后再发起新的请求。',
              mediaStatus: 'failed',
            }
          : msg
      )
    );
  }, []);

  const sendMedia = async (
    kind: 'image' | 'video',
    triggerText?: string,
    customPrompt?: string
  ) => {
    if (
      kind === 'video' &&
      messages.some((message) => message.mediaType === 'video' && message.mediaStatus === 'pending')
    ) {
      setMessages((prev) => [
        ...prev,
        {
          id: generateId(),
          role: 'assistant',
          content: '上一条视频还在生成中，先等这一条完成或失败后再发新的，不然会越来越慢。',
          timestamp: Date.now(),
        },
      ]);
      return;
    }

    const userText =
      triggerText?.trim() ||
      (kind === 'image' ? '发一张你的照片给我' : '发一段你的视频给我');

    const userMessage: Message = {
      id: generateId(),
      role: 'user',
      content: userText,
      timestamp: Date.now(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputValue('');
    setShowCandidates(false);
    setIsTyping(true);
    setIsGeneratingMedia(true);
    stopCurrentAudio('send-media');

    try {
      const response = await fetch('/api/media', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          kind,
          roleId,
          prompt: customPrompt ?? userText,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Media generation failed');
      }

      if (kind === 'video' && data.status === 'pending') {
        const assistantMessage: Message = {
          id: generateId(),
          role: 'assistant',
          content: data.text || '视频正在生成中，请稍等一下。',
          timestamp: Date.now(),
          mediaType: 'video',
          mediaStatus: 'pending',
          mediaTaskId: data.taskId,
        };

        setMessages((prev) => [...prev, assistantMessage]);
        void pollVideoTask(assistantMessage.id, data.taskId);
        return;
      }

      const assistantMessage: Message = {
        id: generateId(),
        role: 'assistant',
        content: data.text || (kind === 'image' ? '我给你发了一张照片。' : '我给你发了一段视频。'),
        timestamp: Date.now(),
        mediaType: data.mediaType,
        mediaUrl: data.url,
        mediaPosterUrl: data.posterUrl,
        mediaStatus: 'completed',
      };

      setMessages((prev) => [...prev, assistantMessage]);

      if (ttsEnabled && assistantMessage.content.trim()) {
        if (autoplayTimeoutRef.current) {
          clearTimeout(autoplayTimeoutRef.current);
        }
        autoplayTimeoutRef.current = setTimeout(() => {
          autoplayTimeoutRef.current = null;
          playTTS(assistantMessage.id, assistantMessage.content);
        }, 300);
      }
    } catch (error) {
      console.error('Failed to generate media:', error);
      setMessages((prev) => [
        ...prev,
        {
          id: generateId(),
          role: 'assistant',
          content:
            error instanceof Error
              ? `抱歉，${kind === 'image' ? '照片' : '视频'}生成失败了：${error.message}`
              : `抱歉，${kind === 'image' ? '照片' : '视频'}生成失败了。`,
          timestamp: Date.now(),
        },
      ]);
    } finally {
      setIsTyping(false);
      setIsGeneratingMedia(false);
      fetchCandidates();
    }
  };

  // 发送消息
  const sendMessage = async (text: string) => {
    if (!text.trim()) return;

    if (/照片|图片|自拍|发图|发照片|看看你|露脸/.test(text)) {
      await sendMedia('image', text, text);
      return;
    }

    if (/视频|发视频|拍个视频|录个视频|视频通话/.test(text)) {
      await sendMedia('video', text, text);
      return;
    }

    // #region debug-point send-message-enter
    void fetch('http://127.0.0.1:8765/log', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        scope: 'client',
        point: 'send-message-enter',
        roleId,
        routeId: sceneId,
        textLength: text.trim().length,
        currentMessageCount: messages.length,
      }),
    }).catch(() => {});
    // #endregion

    const userMessage: Message = {
      id: generateId(),
      role: 'user',
      content: text.trim(),
      timestamp: Date.now(),
    };

    // 添加用户消息
    setMessages((prev) => [...prev, userMessage]);
    setInputValue('');
    setIsTyping(true);
    setShowCandidates(false);

    // #region debug-point send-message-pause-current-audio
    void fetch('http://127.0.0.1:8766/log', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        scope: 'client',
        point: 'send-message-pause-current-audio',
        playingId,
      }),
    }).catch(() => {});
    // #endregion
    stopCurrentAudio('send-message');

    try {
      // 调用流式 API
      // #region debug-point send-message-before-fetch
      void fetch('http://127.0.0.1:8765/log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          scope: 'client',
          point: 'send-message-before-fetch',
          url: '/api/chat',
          payloadMessageCount: [...messages, userMessage].length,
          roleId,
        }),
      }).catch(() => {});
      // #endregion
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [...messages, userMessage],
          roleId,
        }),
      });

      // #region debug-point send-message-after-fetch
      void fetch('http://127.0.0.1:8765/log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          scope: 'client',
          point: 'send-message-after-fetch',
          ok: response.ok,
          status: response.status,
          hasBody: Boolean(response.body),
        }),
      }).catch(() => {});
      // #endregion

      if (!response.ok) throw new Error('Failed to get response');

      // 处理流式响应
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let assistantContent = '';

      const assistantMessage: Message = {
        id: generateId(),
        role: 'assistant',
        content: '',
        timestamp: Date.now(),
      };
      setMessages((prev) => [...prev, assistantMessage]);

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value, { stream: true });
          assistantContent += chunk;

          // 更新消息内容
          setMessages((prev) =>
            prev.map((msg) =>
              msg.id === assistantMessage.id
                ? { ...msg, content: assistantContent }
                : msg
            )
          );
        }
      }

      // AI 回复完成后，如果开启了 TTS，自动播放
      if (ttsEnabled && assistantContent.trim()) {
        // #region debug-point tts-autoplay-scheduled
        void fetch('http://127.0.0.1:8766/log', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            scope: 'client',
            point: 'tts-autoplay-scheduled',
            messageId: assistantMessage.id,
            contentLength: assistantContent.length,
          }),
        }).catch(() => {});
        // #endregion
        if (autoplayTimeoutRef.current) {
          clearTimeout(autoplayTimeoutRef.current);
        }
        autoplayTimeoutRef.current = setTimeout(() => {
          autoplayTimeoutRef.current = null;
          // #region debug-point tts-autoplay-fired
          void fetch('http://127.0.0.1:8766/log', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              scope: 'client',
              point: 'tts-autoplay-fired',
              messageId: assistantMessage.id,
            }),
          }).catch(() => {});
          // #endregion
          playTTS(assistantMessage.id, assistantContent);
        }, 300);
      }
    } catch (error) {
      // #region debug-point send-message-catch
      void fetch('http://127.0.0.1:8765/log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          scope: 'client',
          point: 'send-message-catch',
          errorName: error instanceof Error ? error.name : 'unknown',
          errorMessage: error instanceof Error ? error.message : String(error),
        }),
      }).catch(() => {});
      // #endregion
      console.error('Failed to send message:', error);
      // 添加一个错误消息
      setMessages((prev) => [
        ...prev,
        {
          id: generateId(),
          role: 'assistant',
          content: '抱歉，消息发送失败了。请重试一下。',
          timestamp: Date.now(),
        },
      ]);
    } finally {
      setIsTyping(false);
      // 获取新的候选回复
      fetchCandidates();
    }
  };

  // 结束对话并生成复盘
  const endConversation = async () => {
    if (messages.length < 2) {
      alert('请至少发送一条消息后再结束对话');
      return;
    }
    
    // #region debug-point end-conversation-pause-current-audio
    void fetch('http://127.0.0.1:8766/log', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        scope: 'client',
        point: 'end-conversation-pause-current-audio',
        playingId,
      }),
    }).catch(() => {});
    // #endregion
    stopCurrentAudio('end-conversation');

    // 如果已登录，保存游戏记录
    if (user) {
      try {
        if (user && scene) {
          await fetch('/api/game-records', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              userId: user.id,
              scenario: scene.name,
              finalScore: 75,
              result: 'completed',
            }),
          });
          alert('您的游戏记录已经保存');
        }
      } catch {
        // 保存失败不影响跳转
      }
    } else {
      alert('登录后可保存你的游戏记录');
    }

    router.push(`/review/${sessionId}?messages=${encodeURIComponent(JSON.stringify(messages))}&roleId=${roleId}&sceneId=${sceneId}`);
  };

  if (!scene || !role) {
    return (
      <div className="min-h-screen bg-[#FAFAFA] flex items-center justify-center">
        <div className="text-center">
          <p className="text-[#6B7280] mb-4">页面不存在</p>
          <button
            onClick={() => router.push('/')}
            className="text-[#FF6B6B] font-medium"
          >
            返回首页
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FAFAFA] flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-gray-100 sticky top-0 z-10">
        <div className="max-w-lg mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                onClick={() => router.push(`/scenes/${sceneId}`)}
                className="w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center"
              >
                <ChevronLeft className="w-5 h-5 text-[#1A1A2E]" />
              </button>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#FF6B6B]/20 to-[#4ECDC4]/20 flex items-center justify-center">
                  <span className="text-lg font-semibold text-[#FF6B6B]">
                    {role.name.charAt(0)}
                  </span>
                </div>
                <div>
                  <h1 className="font-semibold text-[#1A1A2E]">{role.name}</h1>
                  <div className="flex items-center gap-2">
                    <p className="text-xs text-[#6B7280]">
                      {isGeneratingMedia ? '生成媒体中...' : isTyping ? '正在输入...' : playingId ? '播放中...' : '在线'}
                    </p>
                    {runtimeStatus?.chatMode === 'fallback' && (
                      <Badge variant="outline" className="border-amber-200 bg-amber-50 text-amber-700">
                        本地模拟
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {/* TTS 开关 */}
              <button
                onClick={() => setTtsEnabled(!ttsEnabled)}
                disabled={runtimeStatus?.ttsMode !== 'coze'}
                className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors ${
                  ttsEnabled && runtimeStatus?.ttsMode === 'coze'
                    ? 'bg-[#4ECDC4]/10 text-[#4ECDC4]' 
                    : 'bg-gray-100 text-gray-400'
                }`}
                title={
                  runtimeStatus?.ttsMode !== 'coze'
                    ? '当前未接入真实 TTS'
                    : ttsEnabled
                    ? '关闭语音'
                    : '开启语音'
                }
              >
                {ttsEnabled ? (
                  <Volume2 className="w-5 h-5" />
                ) : (
                  <VolumeX className="w-5 h-5" />
                )}
              </button>
              <button
                onClick={endConversation}
                className="px-3 py-1.5 bg-[#4ECDC4] text-white text-sm font-medium rounded-full"
              >
                结束对话
              </button>
              <button className="w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center">
                <MoreHorizontal className="w-5 h-5 text-[#1A1A2E]" />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Messages */}
      <main className="flex-1 max-w-lg mx-auto w-full overflow-auto">
        <div className="p-4 space-y-4">
          {runtimeStatus?.chatMode === 'fallback' && (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
              当前是本地模拟聊天，尚未稳定接上真实 Coze 模型。
              {runtimeStatus.credentialReason === 'invalid-jwt-hs256'
                ? ' 已检测到宿主注入的是 HS256 JWT，不是可直接用于 Coze SDK 的 workload identity key，所以聊天会自动降级。'
                : runtimeStatus.authStatus === 'invalid'
                ? ' 已检测到 Coze 凭证，但运行时鉴权失败，所以聊天会自动降级。'
                : runtimeStatus.missingEnv.length > 0
                ? ` 缺少环境变量：${runtimeStatus.missingEnv.join('、')}。`
                : ''}
              当前 `TTS` 已禁用，图片/视频发送也未实现。
            </div>
          )}

          {/* Welcome message */}
          {messages.length === 0 && (
            <div className="text-center py-8">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-[#FF6B6B]/20 to-[#4ECDC4]/20 flex items-center justify-center">
                <span className="text-3xl font-semibold text-[#FF6B6B]">
                  {role.name.charAt(0)}
                </span>
              </div>
              <h2 className="text-lg font-semibold text-[#1A1A2E] mb-2">
                和 {role.name} 开始聊天
              </h2>
              <p className="text-sm text-[#6B7280] mb-4">
                {role.personality} · {role.tags.join('、')}
              </p>
              <div className="flex items-center justify-center gap-2 text-xs text-[#6B7280]">
                <Volume2 className="w-4 h-4" />
                <span>
                  {runtimeStatus?.ttsMode === 'coze'
                    ? `开启 TTS 可听到 ${role.name} 的声音`
                    : '当前本地环境未接入真实 TTS'}
                </span>
              </div>
              {runtimeStatus?.mediaSupported && (
                <p className="mt-2 text-xs text-[#6B7280]">
                  也可以点下方的照片或视频按钮，让 {role.name} 直接发媒体内容。
                </p>
              )}
            </div>
          )}

          {/* Message bubbles */}
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${
                message.role === 'user' ? 'justify-end' : 'justify-start'
              }`}
            >
              <div className="relative group">
                <div
                  className={`max-w-[80%] px-4 py-2.5 rounded-2xl ${
                    message.role === 'user'
                      ? 'bg-[#FF6B6B] text-white rounded-br-md'
                      : 'bg-white text-[#1A1A2E] rounded-bl-md shadow-sm'
                  }`}
                >
                  <p className="text-sm leading-relaxed whitespace-pre-wrap">
                    {message.content}
                  </p>
                  {message.mediaType === 'image' && message.mediaUrl && (
                    <img
                      src={message.mediaUrl}
                      alt="generated"
                      className="mt-3 w-full rounded-2xl object-cover"
                    />
                  )}
                  {message.mediaType === 'video' && message.mediaUrl && (
                    <video
                      src={message.mediaUrl}
                      poster={message.mediaPosterUrl}
                      controls
                      playsInline
                      className="mt-3 w-full rounded-2xl bg-black"
                    />
                  )}
                  {message.mediaType === 'video' && message.mediaStatus === 'pending' && !message.mediaUrl && (
                    <div className="mt-3 rounded-2xl border border-dashed border-[#4ECDC4]/40 bg-[#4ECDC4]/5 px-4 py-6 text-center text-sm text-[#4ECDC4]">
                      视频生成中，通常需要几十秒到几分钟。
                    </div>
                  )}
                  <p
                    className={`text-xs mt-1 ${
                      message.role === 'user'
                        ? 'text-white/70'
                        : 'text-[#6B7280]'
                    }`}
                  >
                    {new Date(message.timestamp).toLocaleTimeString('zh-CN', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </p>
                </div>
                {/* 语音播放按钮 - 仅 AI 消息显示 */}
                {message.role === 'assistant' &&
                  message.content.trim() &&
                  runtimeStatus?.ttsMode === 'coze' && (
                  <button
                    onClick={() => playTTS(message.id, message.content)}
                    className={`absolute -right-2 -bottom-2 w-8 h-8 rounded-full flex items-center justify-center shadow-md transition-all ${
                      playingId === message.id
                        ? 'bg-[#4ECDC4] text-white'
                        : 'bg-white text-[#4ECDC4] opacity-0 group-hover:opacity-100'
                    }`}
                    title={playingId === message.id ? '暂停' : '播放语音'}
                  >
                    {playingId === message.id ? (
                      <Pause className="w-4 h-4" />
                    ) : (
                      <Play className="w-4 h-4" />
                    )}
                  </button>
                )}
              </div>
            </div>
          ))}

          {/* Typing indicator */}
          {isTyping && (
            <div className="flex justify-start">
              <div className="bg-white rounded-2xl rounded-bl-md shadow-sm px-4 py-3">
                <div className="flex gap-1">
                  <span className="w-2 h-2 bg-[#6B7280] rounded-full animate-bounce" />
                  <span
                    className="w-2 h-2 bg-[#6B7280] rounded-full animate-bounce"
                    style={{ animationDelay: '0.15s' }}
                  />
                  <span
                    className="w-2 h-2 bg-[#6B7280] rounded-full animate-bounce"
                    style={{ animationDelay: '0.3s' }}
                  />
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </main>

      {/* Candidate replies */}
      {showCandidates && candidates.length > 0 && (
        <div className="max-w-lg mx-auto w-full px-4 pb-2">
          <div className="bg-white rounded-xl p-3 shadow-lg border border-gray-100">
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="w-4 h-4 text-[#4ECDC4]" />
              <span className="text-xs font-medium text-[#6B7280]">
                推荐回复
              </span>
              <button
                onClick={() => setShowCandidates(false)}
                className="ml-auto"
              >
                <X className="w-4 h-4 text-[#6B7280]" />
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {candidates.map((candidate, index) => (
                <button
                  key={index}
                  onClick={() => {
                    setInputValue(candidate);
                    setShowCandidates(false);
                    inputRef.current?.focus();
                  }}
                  className="text-sm px-3 py-1.5 bg-gray-50 hover:bg-gray-100 rounded-full text-[#1A1A2E] transition-colors"
                >
                  {candidate}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Input area */}
      <div className="bg-white border-t border-gray-100">
        <div className="max-w-lg mx-auto px-4 py-3">
          <div className="flex items-center gap-3">
            <button
              onClick={() => sendMedia('image')}
              disabled={isTyping || isGeneratingMedia || !runtimeStatus?.mediaSupported}
              className="w-10 h-10 rounded-full bg-[#FF6B6B]/10 text-[#FF6B6B] flex items-center justify-center disabled:bg-gray-100 disabled:text-gray-400"
              title={runtimeStatus?.mediaSupported ? '让她发照片' : '当前未接入照片/视频能力'}
            >
              <ImagePlus className="w-5 h-5 text-current" />
            </button>
            <button
              onClick={() => sendMedia('video')}
              disabled={isTyping || isGeneratingMedia || !runtimeStatus?.mediaSupported}
              className="w-10 h-10 rounded-full bg-[#FF6B6B]/10 text-[#FF6B6B] flex items-center justify-center disabled:bg-gray-100 disabled:text-gray-400"
              title={runtimeStatus?.mediaSupported ? '让她发视频' : '当前未接入照片/视频能力'}
            >
              <Clapperboard className="w-5 h-5 text-current" />
            </button>
            <button
              onClick={() => setShowCandidates(!showCandidates)}
              className="w-10 h-10 rounded-full bg-[#4ECDC4]/10 flex items-center justify-center"
            >
              <Sparkles className="w-5 h-5 text-[#4ECDC4]" />
            </button>
            <input
              ref={inputRef}
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey && !isGeneratingMedia) {
                  e.preventDefault();
                  sendMessage(inputValue);
                }
              }}
              placeholder="输入消息，或让她发照片/视频..."
              className="flex-1 px-4 py-2.5 bg-gray-50 rounded-full text-sm outline-none focus:ring-2 focus:ring-[#FF6B6B]/30"
            />
            <button
              onClick={() => sendMessage(inputValue)}
              disabled={!inputValue.trim() || isTyping || isGeneratingMedia}
              className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors ${
                inputValue.trim() && !isTyping
                  ? 'bg-[#FF6B6B] text-white'
                  : 'bg-gray-100 text-gray-400'
              }`}
            >
              <Send className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
