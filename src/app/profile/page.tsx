'use client';

import { useAuth } from '@/contexts/auth-context';
import Link from 'next/link';
import { useEffect, useState } from 'react';

interface GameRecord {
  id: number;
  scenario: string;
  finalScore: number;
  result: string;
  playedAt: string;
}

export default function ProfilePage() {
  const { user, loading } = useAuth();
  const [records, setRecords] = useState<GameRecord[]>([]);
  const [recordsLoading, setRecordsLoading] = useState(false);

  useEffect(() => {
    if (user) {
      fetchRecords();
    }
  }, [user]);

  const fetchRecords = async () => {
    if (!user) return;
    setRecordsLoading(true);
    try {
      const res = await fetch(`/api/game-records?userId=${user.id}`);
      const data = await res.json();
      setRecords(data.records || []);
    } catch (error) {
      console.error('Failed to fetch records:', error);
    } finally {
      setRecordsLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-pink-50 to-white">
        <div className="animate-pulse text-gray-500">加载中...</div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-pink-50 to-white">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-800 mb-4">请先登录</h1>
          <Link
            href="/login"
            className="inline-block px-6 py-3 bg-gradient-to-r from-pink-500 to-rose-500 text-white rounded-full font-medium hover:opacity-90 transition-opacity"
          >
            去登录
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 to-white">
      {/* Header */}
      <div className="bg-white shadow-sm">
        <div className="max-w-lg mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </Link>
          <h1 className="text-lg font-bold text-gray-800">个人中心</h1>
          <div className="w-10" />
        </div>
      </div>

      {/* User Info */}
      <div className="max-w-lg mx-auto px-4 py-8">
        <div className="bg-white rounded-2xl shadow-sm p-6 mb-6">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-pink-400 to-rose-500 flex items-center justify-center text-white text-2xl font-bold">
              {user.username.charAt(0).toUpperCase()}
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-800">{user.username}</h2>
            </div>
          </div>
        </div>

        {/* Game Records */}
        <div className="bg-white rounded-2xl shadow-sm p-6">
          <h3 className="text-lg font-bold text-gray-800 mb-4">游戏记录</h3>
          
          {recordsLoading ? (
            <div className="text-center py-8 text-gray-500">加载中...</div>
          ) : records.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-500 mb-4">暂无游戏记录</p>
              <Link
                href="/"
                className="inline-block px-4 py-2 bg-gradient-to-r from-pink-500 to-rose-500 text-white rounded-full text-sm font-medium hover:opacity-90 transition-opacity"
              >
                开始练习
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {records.map((record) => (
                <div
                  key={record.id}
                  className="flex items-center justify-between p-4 bg-gray-50 rounded-xl"
                >
                  <div>
                    <p className="font-medium text-gray-800">{record.scenario}</p>
                    <p className="text-sm text-gray-500">
                      {new Date(record.playedAt).toLocaleDateString('zh-CN')}
                    </p>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-bold text-pink-500">{record.finalScore}分</div>
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full ${
                        record.result === 'completed'
                          ? 'bg-green-100 text-green-600'
                          : record.result === 'failed'
                          ? 'bg-red-100 text-red-600'
                          : 'bg-gray-100 text-gray-600'
                      }`}
                    >
                      {record.result === 'completed' ? '通关' : record.result === 'failed' ? '失败' : '进行中'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
