'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Heart, ArrowLeft, Clock, Sparkles } from 'lucide-react';

export default function BlogPage() {
  const [articles, setArticles] = useState<Array<{
    id: string;
    title: string;
    summary: string;
    readTime: number;
  }>>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/blog')
      .then((res) => res.json())
      .then((data) => {
        setArticles(data.posts || []);
        setLoading(false);
      })
      .catch(() => {
        setLoading(false);
      });
  }, []);

  return (
    <div className="min-h-screen bg-[#FAFAFA]">
      {/* Header */}
      <header className="bg-white border-b border-gray-100 sticky top-0 z-10">
        <div className="max-w-lg mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Link
              href="/"
              className="inline-flex items-center gap-2 text-[#6B7280] hover:text-[#FF6B6B] transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
              <span>返回</span>
            </Link>
            <div className="flex items-center gap-2 text-[#FF6B6B]">
              <Sparkles className="w-5 h-5" />
              <span className="font-semibold">恋爱攻略</span>
            </div>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-lg mx-auto px-4 py-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-[#1A1A2E] mb-2">恋爱攻略</h1>
          <p className="text-[#6B7280]">让 AI 帮你读懂她的小心思</p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="w-10 h-10 border-4 border-[#FF6B6B] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <div className="space-y-4">
            {articles.map((article) => (
              <Link
                key={article.id}
                href={`/blog/${article.id}`}
                className="block bg-white rounded-2xl p-5 shadow-sm hover:shadow-md transition-all hover:-translate-y-0.5 active:scale-[0.98]"
              >
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#FF6B6B] to-[#FF8E8E] flex items-center justify-center flex-shrink-0">
                    <Heart className="w-6 h-6 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-[#1A1A2E] mb-1 line-clamp-2">
                      {article.title}
                    </h3>
                    <p className="text-sm text-[#6B7280] line-clamp-2 mb-2">
                      {article.summary}
                    </p>
                    <span className="inline-flex items-center gap-1 text-xs text-[#6B7280]">
                      <Clock className="w-3 h-3" />
                      {article.readTime} 分钟阅读
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
