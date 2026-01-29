"use client";

import { useFeishu } from "@/components/FeishuProvider";
import Image from "next/image";

export default function Home() {
  const { user, isLark, isReady } = useFeishu();

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 font-sans dark:bg-black p-4">
      <main className="flex flex-col items-center gap-6 text-center max-w-md w-full bg-white dark:bg-zinc-900 p-8 rounded-2xl shadow-sm">
        <h1 className="text-3xl font-bold tracking-tight text-black dark:text-zinc-50">
          Agent Modal
        </h1>

        <div className="space-y-4 w-full">
          {!isLark ? (
            <p className="text-orange-500 bg-orange-50 dark:bg-orange-900/20 p-3 rounded-lg text-sm">
              请在飞书客户端内打开以体验免登功能
            </p>
          ) : !isReady ? (
            <p className="text-zinc-500">飞书环境初始化中...</p>
          ) : user ? (
            <div className="flex flex-col items-center gap-4">
              {user.avatar_url && (
                <div className="relative w-20 h-20 rounded-full overflow-hidden border-2 border-blue-500 mx-auto">
                  <Image
                    src={user.avatar_url}
                    alt={user.name}
                    fill
                    className="object-cover"
                  />
                </div>
              )}
              <div>
                <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">
                  你好, {user.name}
                </h2>
                <p className="text-sm text-zinc-500">欢迎回来</p>
              </div>
              <div className="w-full pt-4 border-t border-zinc-100 dark:border-zinc-800">
                <p className="text-xs text-zinc-400">OpenID: {user.open_id}</p>
              </div>
            </div>
          ) : (
            <p className="text-zinc-500">正在尝试免登录...</p>
          )}
        </div>

        <p className="text-sm text-zinc-400 mt-4">
          AI Agent Infrastructure Platform
        </p>
      </main>
    </div>
  );
}
