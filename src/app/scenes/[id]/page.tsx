'use client';

import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { scenes } from '@/lib/scenes';
import { ChevronLeft, Users } from 'lucide-react';

export default function ScenePage() {
  const params = useParams();
  const router = useRouter();
  const sceneId = params.id as string;
  const scene = scenes.find((s) => s.id === sceneId);

  if (!scene) {
    return (
      <div className="min-h-screen bg-[#FAFAFA] flex items-center justify-center">
        <div className="text-center">
          <p className="text-[#6B7280] mb-4">场景不存在</p>
          <Link href="/" className="text-[#FF6B6B] font-medium">
            返回首页
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FAFAFA]">
      {/* Header */}
      <header className="bg-white border-b border-gray-100 sticky top-0 z-10">
        <div className="max-w-lg mx-auto px-4 py-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.back()}
              className="w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center"
            >
              <ChevronLeft className="w-5 h-5 text-[#1A1A2E]" />
            </button>
            <div>
              <h1 className="text-lg font-semibold text-[#1A1A2E]">
                {scene.name}
              </h1>
              <p className="text-sm text-[#6B7280]">{scene.description}</p>
            </div>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-lg mx-auto px-4 py-6 pb-24">
        <div className="flex items-center gap-2 mb-4">
          <Users className="w-5 h-5 text-[#6B7280]" />
          <span className="text-sm font-medium text-[#6B7280]">
            选择练习对象
          </span>
        </div>

        <div className="space-y-3">
          {scene.roles.map((role) => (
            <Link
              key={role.id}
              href={`/chat/${scene.id}/${role.id}`}
              className="block bg-white rounded-xl p-4 shadow-sm border border-gray-50 hover:shadow-md hover:-translate-y-0.5 transition-all"
            >
              <div className="flex items-center gap-4">
                <div className="relative">
                  <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[#FF6B6B]/20 to-[#4ECDC4]/20 flex items-center justify-center">
                    <span className="text-2xl font-semibold text-[#FF6B6B]">
                      {role.name.charAt(0)}
                    </span>
                  </div>
                  <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-emerald-500 rounded-full border-2 border-white" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold text-[#1A1A2E]">{role.name}</h3>
                  </div>
                  <p className="text-sm text-[#6B7280] mb-2">
                    {role.personality}
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {role.tags.map((tag) => (
                      <span
                        key={tag}
                        className="text-xs px-2 py-0.5 bg-gray-100 text-[#6B7280] rounded-full"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>

        <div className="mt-6 p-4 bg-blue-50 rounded-xl">
          <p className="text-sm text-blue-700">
            <strong>小贴士：</strong>
            每个角色都有独特的性格和聊天风格。选择你想练习面对的类型，开始你的社交训练吧！
          </p>
        </div>
      </main>
    </div>
  );
}
