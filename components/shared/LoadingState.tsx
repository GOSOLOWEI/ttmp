"use client";

import { Loader2 } from "lucide-react";

interface LoadingStateProps {
  message?: string;
}

export function LoadingState({ message = "加载中..." }: LoadingStateProps) {
  return (
    <div className="text-center py-12">
      <Loader2 className="size-6 animate-spin mx-auto text-zinc-400 mb-2" />
      <p className="text-zinc-500">{message}</p>
    </div>
  );
}
