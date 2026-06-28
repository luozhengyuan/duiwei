'use client';

import Link from 'next/link';
import { ArrowLeft, Trophy, Medal, Crown, User } from 'lucide-react';
import { useAuth } from '@/contexts/auth-context';
import { useEffect, useState } from 'react';

interface LeaderboardEntry {
  rank: number;
  userId: number | null;
  username: string;
  maxScore: number;
  achievedAt: string;
}

export default function LeaderboardPage() {
  const { user } = useAuth();
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLeaderboard();
  }, []);

  const fetchLeaderboard = async () => {
    try {
      const res = await fetch('/api/leaderboard');
      const data = await res.json();
      setLeaderboard(data.leaderboard || []);
    } catch (error) {
      console.error('获取排行榜失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    return date.toLocaleDateString('zh-CN', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getRankIcon = (rank: number) => {
    if (rank === 1) return <Crown className="w-6 h-6 text-yellow-500" />;
    if (rank === 2) return <Medal className="w-6 h-6 text-gray-400" />;
    if (rank === 3) return <Medal className="w-6 h-6 text-amber-600" />;
    return <span className="w-6 text-center font-bold text-[#6B7280]">{rank}</span>;
  };

  const getRankBgColor = (rank: number) => {
    if (rank === 1) return 'from-yellow-100 to-yellow-50';
    if (rank === 2) return 'from-gray-100 to-gray-50';
    if (rank === 3) return 'from-amber-100 to-amber-50';
    return '';
  };

  return (
    <div className="min-h-screen bg-[#FAFAFA]">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-white border-b border-gray-100">
        <div className="max-w-lg mx-auto px-4 h-14 flex items-center justify-between">
          <Link
            href="/"
            className="flex items-center gap-2 text-[#6B7280] hover:text-[#1A1A2E] transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            <span className="text-sm">返回</span>
          </Link>
          <h1 className="font-semibold text-[#1A1A2E]">排行榜</h1>
          <div className="w-16" />
        </div>
      </header>

      {/* Content */}
      <main className="max-w-lg mx-auto px-4 py-6">
        {/* Title */}
        <div className="flex flex-col items-center mb-6">
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[#FFE66D] to-[#FFA500] flex items-center justify-center mb-3">
            <Trophy className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-xl font-bold text-[#1A1A2E]">好感度排行榜</h2>
          <p className="text-sm text-[#6B7280]">TOP 20</p>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin w-8 h-8 border-4 border-[#FF6B6B] border-t-transparent rounded-full" />
          </div>
        ) : leaderboard.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4">
              <User className="w-8 h-8 text-gray-400" />
            </div>
            <p className="text-[#6B7280]">暂无排行榜数据</p>
            <p className="text-sm text-[#9CA3AF] mt-1">快去练习，成为榜上第一人吧！</p>
          </div>
        ) : (
          <div className="space-y-2">
            {leaderboard.map((entry) => {
              const isCurrentUser = user && entry.userId === user.id;
              return (
                <div
                  key={`${entry.userId}-${entry.rank}`}
                  className={`
                    flex items-center gap-3 p-4 rounded-xl
                    ${isCurrentUser ? 'bg-gradient-to-r from-[#FF6B6B]/10 to-[#FFE66D]/10 border-2 border-[#FF6B6B]' : 'bg-white'}
                    ${getRankBgColor(entry.rank) ? `bg-gradient-to-r ${getRankBgColor(entry.rank)}` : ''}
                  `}
                >
                  {/* Rank */}
                  <div className="w-10 flex justify-center">
                    {getRankIcon(entry.rank)}
                  </div>

                  {/* Avatar */}
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#FF6B6B] to-[#FF8E8E] flex items-center justify-center text-white font-bold">
                    {entry.username.charAt(0).toUpperCase()}
                  </div>

                  {/* Info */}
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-[#1A1A2E]">{entry.username}</span>
                      {isCurrentUser && (
                        <span className="px-2 py-0.5 text-xs bg-[#FF6B6B] text-white rounded-full">
                          你
                        </span>
                      )}
                    </div>
                    <span className="text-xs text-[#9CA3AF]">
                      {formatDate(entry.achievedAt)}
                    </span>
                  </div>

                  {/* Score */}
                  <div className="text-right">
                    <div className="text-xl font-bold text-[#FF6B6B]">{entry.maxScore}</div>
                    <div className="text-xs text-[#9CA3AF]">好感度</div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Tip */}
        <div className="mt-6 p-4 bg-[#FFE66D]/20 rounded-xl">
          <p className="text-sm text-[#1A1A2E] text-center">
            只有登录用户的成绩才会登上排行榜哦~
          </p>
        </div>
      </main>
    </div>
  );
}
