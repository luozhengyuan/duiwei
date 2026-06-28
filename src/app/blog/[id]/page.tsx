'use client';

import { useEffect, useState, use } from 'react';
import Link from 'next/link';
import { Heart, ArrowLeft, Clock } from 'lucide-react';

interface Article {
  id: string;
  title: string;
  summary: string;
  content: string;
  readTime: number;
}

export default function BlogDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [article, setArticle] = useState<Article | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/blog/${id}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.post) {
          setArticle(data.post);
        }
        setLoading(false);
      })
      .catch(() => {
        setLoading(false);
      });
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FAFAFA] flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-[#FF6B6B] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-[#6B7280]">加载中...</p>
        </div>
      </div>
    );
  }

  if (!article) {
    return (
      <div className="min-h-screen bg-[#FAFAFA] flex items-center justify-center">
        <div className="text-center">
          <Heart className="w-16 h-16 text-[#FF6B6B] mx-auto mb-4 opacity-50" />
          <h2 className="text-xl font-semibold text-[#1A1A2E] mb-2">文章不存在</h2>
          <Link
            href="/blog"
            className="text-[#FF6B6B] hover:underline"
          >
            返回博客
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FAFAFA]">
      {/* Header */}
      <header className="bg-white border-b border-gray-100 sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-4">
          <Link
            href="/blog"
            className="inline-flex items-center gap-2 text-[#6B7280] hover:text-[#FF6B6B] transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            <span>返回</span>
          </Link>
        </div>
      </header>

      {/* Article Content */}
      <main className="max-w-2xl mx-auto px-4 py-8">
        <article className="bg-white rounded-2xl shadow-sm overflow-hidden">
          {/* Hero Image Placeholder */}
          <div className="bg-gradient-to-br from-[#FF6B6B] to-[#FF8E8E] h-48 flex items-center justify-center">
            <Heart className="w-16 h-16 text-white opacity-50" />
          </div>

          <div className="p-6">
            {/* Title */}
            <h1 className="text-2xl font-bold text-[#1A1A2E] mb-4 leading-tight">
              {article.title}
            </h1>

            {/* Meta */}
            <div className="flex items-center gap-4 text-sm text-[#6B7280] mb-6 pb-6 border-b border-gray-100">
              <span className="flex items-center gap-1">
                <Clock className="w-4 h-4" />
                {article.readTime} 分钟阅读
              </span>
            </div>

            {/* Content */}
            <div className="prose prose-lg max-w-none">
              {article.content.split('\n').map((paragraph, index) => (
                <p
                  key={index}
                  className={`text-[#1A1A2E] leading-relaxed mb-4 ${
                    paragraph.startsWith('#') ? 'font-bold text-xl mt-6 mb-4' : ''
                  }`}
                >
                  {paragraph}
                </p>
              ))}
            </div>
          </div>
        </article>

        {/* Back to List */}
        <div className="mt-6 text-center">
          <Link
            href="/blog"
            className="inline-flex items-center gap-2 text-[#FF6B6B] hover:underline"
          >
            <ArrowLeft className="w-4 h-4" />
            返回博客列表
          </Link>
        </div>
      </main>
    </div>
  );
}
