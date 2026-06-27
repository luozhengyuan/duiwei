'use client';

import Link from 'next/link';
import { useAuth } from '@/contexts/auth-context';
import { scenes } from '@/lib/scenes';
import {
  MessageCircle,
  Zap,
  Heart,
  ChevronRight,
  Sparkles,
  BookOpen,
  User,
  LogOut,
  Trophy,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useRouter } from 'next/navigation';

const iconMap: Record<string, React.ReactNode> = {
  MessageCircle: <MessageCircle className="w-8 h-8" />,
  Zap: <Zap className="w-8 h-8" />,
  Heart: <Heart className="w-8 h-8" />,
};

const difficultyColors = {
  easy: 'bg-emerald-100 text-emerald-700',
  medium: 'bg-amber-100 text-amber-700',
  hard: 'bg-rose-100 text-rose-700',
};

const difficultyText = {
  easy: '简单',
  medium: '中等',
  hard: '困难',
};

export default function HomePage() {
  const { user, logout, loading } = useAuth();
  const router = useRouter();

  const handleLogout = async () => {
    await logout();
    router.push('/');
  };

  return (
    <div className="min-h-screen bg-[#FAFAFA]">
      {/* Header */}
      <header className="bg-white border-b border-gray-100">
        <div className="max-w-lg mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-[#1A1A2E]">对味</h1>
              <p className="text-sm text-[#6B7280]">聊出对的味道</p>
            </div>
            <div className="flex items-center gap-3">
              {loading ? (
                <div className="w-8 h-8 rounded-full bg-gray-100 animate-pulse" />
              ) : user ? (
                <Link href="/profile" className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#4ECDC4] to-[#44A08D] flex items-center justify-center">
                    <User className="w-4 h-4 text-white" />
                  </div>
                  <span className="text-sm font-medium text-[#1A1A2E]">{user.username}</span>
                </Link>
              ) : (
                <div className="flex items-center gap-2">
                  <Link
                    href="/login"
                    className="text-sm font-medium text-[#4ECDC4] hover:text-[#44A08D] transition-colors"
                  >
                    登录
                  </Link>
                  <span className="text-gray-300">|</span>
                  <Link
                    href="/register"
                    className="text-sm font-medium text-[#FF6B6B] hover:text-[#ff5252] transition-colors"
                  >
                    注册
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="max-w-lg mx-auto px-4 py-8">
        <div className="bg-gradient-to-br from-[#FF6B6B] to-[#FF8E8E] rounded-2xl p-6 text-white">
          <h2 className="text-xl font-semibold mb-2">今日推荐</h2>
          <p className="text-white/90 text-sm mb-4">
            从开场白开始，练习每一次对话
          </p>
          <Link
            href={`/scenes/${scenes[0].id}`}
            className="inline-flex items-center gap-2 bg-white text-[#FF6B6B] px-4 py-2 rounded-full font-medium text-sm hover:bg-white/90 transition-colors"
          >
            开始练习
            <ChevronRight className="w-4 h-4" />
          </Link>
        </div>
      </section>

      {/* Blog Entry */}
      <section className="max-w-lg mx-auto px-4 pb-4">
        <Link
          href="/blog"
          className="block bg-white rounded-xl p-4 shadow-sm border border-gray-50 hover:shadow-md hover:-translate-y-0.5 transition-all"
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#FFE66D] to-[#FFA500] flex items-center justify-center flex-shrink-0">
              <BookOpen className="w-6 h-6 text-white" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-[#1A1A2E]">恋爱攻略</h3>
                <Sparkles className="w-4 h-4 text-[#FFE66D]" />
              </div>
              <p className="text-sm text-[#6B7280]">
                让 AI 帮你读懂她的小心思
              </p>
            </div>
            <ChevronRight className="w-5 h-5 text-[#6B7280]" />
          </div>
        </Link>
      </section>

      {/* Leaderboard Entry */}
      <section className="max-w-lg mx-auto px-4 pb-4">
        <Link
          href="/leaderboard"
          className="block bg-white rounded-xl p-4 shadow-sm border border-gray-50 hover:shadow-md hover:-translate-y-0.5 transition-all"
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#FF6B6B] to-[#FF8E8E] flex items-center justify-center flex-shrink-0">
              <Trophy className="w-6 h-6 text-white" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-[#1A1A2E]">排行榜</h3>
                <Sparkles className="w-4 h-4 text-[#FF6B6B]" />
              </div>
              <p className="text-sm text-[#6B7280]">
                查看谁的社交技能最强
              </p>
            </div>
            <ChevronRight className="w-5 h-5 text-[#6B7280]" />
          </div>
        </Link>
      </section>

      {/* Scenes Section */}
      <section className="max-w-lg mx-auto px-4 pb-24">
        <h2 className="text-lg font-semibold text-[#1A1A2E] mb-4">训练场景</h2>
        <div className="space-y-4">
          {scenes.map((scene) => (
            <Link
              key={scene.id}
              href={`/scenes/${scene.id}`}
              className="block bg-white rounded-xl p-4 shadow-sm border border-gray-50 hover:shadow-md hover:-translate-y-0.5 transition-all"
            >
              <div className="flex items-start gap-4">
                <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-[#FF6B6B]/10 to-[#4ECDC4]/10 flex items-center justify-center text-[#FF6B6B]">
                  {iconMap[scene.icon] || <MessageCircle className="w-8 h-8" />}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold text-[#1A1A2E]">{scene.name}</h3>
                    <span
                      className={cn(
                        'text-xs px-2 py-0.5 rounded-full font-medium',
                        difficultyColors[scene.difficulty]
                      )}
                    >
                      {difficultyText[scene.difficulty]}
                    </span>
                  </div>
                  <p className="text-sm text-[#6B7280] mb-2">
                    {scene.description}
                  </p>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-[#6B7280]">
                      {scene.roles.length} 个角色可练习
                    </span>
                    <ChevronRight className="w-4 h-4 text-[#6B7280]" />
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100">
        <div className="max-w-lg mx-auto flex">
          <button className="flex-1 py-3 flex flex-col items-center gap-1 text-[#FF6B6B]">
            <MessageCircle className="w-5 h-5" />
            <span className="text-xs font-medium">首页</span>
          </button>
          <button className="flex-1 py-3 flex flex-col items-center gap-1 text-[#6B7280]">
            <Zap className="w-5 h-5" />
            <span className="text-xs">练习记录</span>
          </button>
          <button className="flex-1 py-3 flex flex-col items-center gap-1 text-[#6B7280]">
            <Heart className="w-5 h-5" />
            <span className="text-xs">我的</span>
          </button>
        </div>
      </nav>
    </div>
  );
}
