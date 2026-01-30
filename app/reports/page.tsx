"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function ReportsPage() {
  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-black p-3 sm:p-4 pb-20">
      <div className="max-w-4xl mx-auto">
        {/* 头部 */}
        <div className="mb-4 sm:mb-6">
          <h1 className="text-xl sm:text-2xl font-bold text-zinc-900 dark:text-zinc-50 mb-1 sm:mb-2">
            报表中心
          </h1>
          <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400">
            查看您的财务指标和分析报表
          </p>
        </div>

        {/* 占位内容 */}
        <Card>
          <CardContent className="py-12 text-center text-zinc-500">
            <p>报表功能开发中...</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
