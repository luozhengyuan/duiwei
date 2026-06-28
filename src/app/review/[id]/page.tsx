'use client';

import { use, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { scenes } from '@/lib/scenes';
import { ReviewReport } from '@/lib/chat-types';
import {
  ChevronLeft,
  Home,
  RotateCcw,
  Star,
  ThumbsUp,
  AlertCircle,
  Lightbulb,
  Brain,
  MessageSquare,
} from 'lucide-react';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function ReviewPage({ params }: PageProps) {
  const { id: sessionId } = use(params);
  const router = useRouter();
  const searchParams = useSearchParams();
  const [report, setReport] = useState<ReviewReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [messages, setMessages] = useState<Array<{ role: string; content: string }>>([]);
  const [roleId, setRoleId] = useState('');
  const [sceneId, setSceneId] = useState('');

  useEffect(() => {
    // 从 URL 参数获取消息和角色信息
    const messagesParam = searchParams.get('messages');
    const roleParam = searchParams.get('roleId');
    const sceneParam = searchParams.get('sceneId');

    if (messagesParam && roleParam && sceneParam) {
      try {
        const parsedMessages = JSON.parse(decodeURIComponent(messagesParam));
        setMessages(parsedMessages);
        setRoleId(roleParam);
        setSceneId(sceneParam);
      } catch (error) {
        console.error('Failed to parse messages:', error);
      }
    }
  }, [searchParams]);

  useEffect(() => {
    if (messages.length > 0 && roleId) {
      fetchReview();
    }
  }, [messages, roleId]);

  const fetchReview = async () => {
    try {
      const response = await fetch('/api/review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages, roleId }),
      });
      const data = await response.json();
      if (data.report) {
        setReport(data.report);
      }
    } catch (error) {
      console.error('Failed to fetch review:', error);
    } finally {
      setLoading(false);
    }
  };

  const scene = scenes.find((s) => s.id === sceneId);
  const role = scene?.roles.find((r) => r.id === roleId);

  // 评分颜色
  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-emerald-500';
    if (score >= 60) return 'text-amber-500';
    return 'text-rose-500';
  };

  const getScoreBg = (score: number) => {
    if (score >= 80) return 'bg-emerald-50';
    if (score >= 60) return 'bg-amber-50';
    return 'bg-rose-50';
  };

  return (
    <div className="min-h-screen bg-[#FAFAFA] pb-24">
      {/* Header */}
      <header className="bg-white border-b border-gray-100 sticky top-0 z-10">
        <div className="max-w-lg mx-auto px-4 py-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push('/')}
              className="w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center"
            >
              <ChevronLeft className="w-5 h-5 text-[#1A1A2E]" />
            </button>
            <div>
              <h1 className="text-lg font-semibold text-[#1A1A2E]">复盘报告</h1>
              <p className="text-sm text-[#6B7280]">
                {role?.name || '练习完成'}
              </p>
            </div>
          </div>
        </div>
      </header>

      {loading ? (
        <div className="max-w-lg mx-auto px-4 py-12">
          <div className="text-center">
            <div className="w-12 h-12 mx-auto mb-4 border-4 border-[#FF6B6B] border-t-transparent rounded-full animate-spin" />
            <p className="text-[#6B7280]">正在生成复盘报告...</p>
          </div>
        </div>
      ) : report ? (
        <main className="max-w-lg mx-auto px-4 py-6 space-y-6">
          {/* Score Card */}
          <div
            className={`${getScoreBg(
              report.overallScore
            )} rounded-2xl p-6 text-center`}
          >
            <div className="w-24 h-24 mx-auto mb-4 relative">
              <svg className="w-full h-full transform -rotate-90">
                <circle
                  cx="48"
                  cy="48"
                  r="40"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="8"
                  className="text-gray-200"
                />
                <circle
                  cx="48"
                  cy="48"
                  r="40"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="8"
                  strokeLinecap="round"
                  strokeDasharray={`${(report.overallScore / 100) * 251.2} 251.2`}
                  className={getScoreColor(report.overallScore)}
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span
                  className={`text-3xl font-bold ${getScoreColor(
                    report.overallScore
                  )}`}
                >
                  {report.overallScore}
                </span>
              </div>
            </div>
            <h2 className="text-lg font-semibold text-[#1A1A2E] mb-1">
              {report.overallScore >= 80
                ? '表现出色！'
                : report.overallScore >= 60
                ? '不错的开始！'
                : '继续加油！'}
            </h2>
            <p className="text-sm text-[#6B7280]">
              {role?.personality || '社交练习'}
            </p>
          </div>

          {/* Key Highlights */}
          {report.keyHighlights.length > 0 && (
            <div className="bg-white rounded-xl p-4 shadow-sm">
              <div className="flex items-center gap-2 mb-4">
                <ThumbsUp className="w-5 h-5 text-emerald-500" />
                <h3 className="font-semibold text-[#1A1A2E]">加分时刻</h3>
              </div>
              <div className="space-y-4">
                {report.keyHighlights.map((item, index) => (
                  <div key={index} className="border-l-4 border-emerald-500 pl-4">
                    <p className="text-sm text-[#1A1A2E] mb-2">"{item.message}"</p>
                    <p className="text-sm text-emerald-600">{item.analysis}</p>
                    <p className="text-xs text-[#6B7280] mt-1">
                      原因：{item.why}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Key Mistakes */}
          {report.keyMistakes.length > 0 && (
            <div className="bg-white rounded-xl p-4 shadow-sm">
              <div className="flex items-center gap-2 mb-4">
                <AlertCircle className="w-5 h-5 text-amber-500" />
                <h3 className="font-semibold text-[#1A1A2E]">需要注意</h3>
              </div>
              <div className="space-y-4">
                {report.keyMistakes.map((item, index) => (
                  <div key={index} className="border-l-4 border-amber-500 pl-4">
                    <p className="text-sm text-[#1A1A2E] mb-2">"{item.message}"</p>
                    <p className="text-sm text-amber-600">{item.analysis}</p>
                    <p className="text-xs text-[#6B7280] mt-1">
                      建议：{item.suggestion}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Improvement */}
          {report.improvement.length > 0 && (
            <div className="bg-white rounded-xl p-4 shadow-sm">
              <div className="flex items-center gap-2 mb-4">
                <Lightbulb className="w-5 h-5 text-[#4ECDC4]" />
                <h3 className="font-semibold text-[#1A1A2E]">改进方向</h3>
              </div>
              <ul className="space-y-2">
                {report.improvement.map((item, index) => (
                  <li key={index} className="flex items-start gap-2 text-sm">
                    <span className="text-[#4ECDC4] font-bold">{index + 1}.</span>
                    <span className="text-[#1A1A2E]">{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Psychology Insight */}
          {report.psychologyInsight && (
            <div className="bg-white rounded-xl p-4 shadow-sm">
              <div className="flex items-center gap-2 mb-4">
                <Brain className="w-5 h-5 text-[#FF6B6B]" />
                <h3 className="font-semibold text-[#1A1A2E]">心理洞察</h3>
              </div>
              <p className="text-sm text-[#6B7280] leading-relaxed">
                {report.psychologyInsight}
              </p>
            </div>
          )}

          {/* Tips */}
          {report.tips.length > 0 && (
            <div className="bg-gradient-to-br from-[#FF6B6B]/5 to-[#4ECDC4]/5 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-4">
                <MessageSquare className="w-5 h-5 text-[#FF6B6B]" />
                <h3 className="font-semibold text-[#1A1A2E]">可复用话术</h3>
              </div>
              <ul className="space-y-2">
                {report.tips.map((item, index) => (
                  <li
                    key={index}
                    className="text-sm text-[#1A1A2E] bg-white px-3 py-2 rounded-lg"
                  >
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </main>
      ) : (
        <div className="max-w-lg mx-auto px-4 py-12">
          <div className="text-center">
            <p className="text-[#6B7280] mb-4">无法生成复盘报告</p>
            <Link href="/" className="text-[#FF6B6B] font-medium">
              返回首页
            </Link>
          </div>
        </div>
      )}

      {/* Bottom Actions */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100">
        <div className="max-w-lg mx-auto px-4 py-4">
          <div className="flex gap-3">
            <Link
              href={`/chat/${sceneId}/${roleId}`}
              className="flex-1 flex items-center justify-center gap-2 py-3 bg-[#FF6B6B] text-white font-medium rounded-full"
            >
              <RotateCcw className="w-5 h-5" />
              再练一次
            </Link>
            <Link
              href="/"
              className="flex-1 flex items-center justify-center gap-2 py-3 bg-gray-100 text-[#1A1A2E] font-medium rounded-full"
            >
              <Home className="w-5 h-5" />
              返回首页
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
