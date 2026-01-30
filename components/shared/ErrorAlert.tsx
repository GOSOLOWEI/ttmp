"use client";

import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

interface ErrorAlertProps {
  error: string | null;
  onDismiss?: () => void;
}

export function ErrorAlert({ error, onDismiss }: ErrorAlertProps) {
  if (!error) return null;

  return (
    <Card className="mb-4 border-red-200 bg-red-50 dark:bg-red-900/20 dark:border-red-800">
      <CardContent className="pt-6">
        <div className="flex items-center justify-between">
          <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          {onDismiss && (
            <Button
              type="button"
              variant="ghost"
              size="xs"
              onClick={onDismiss}
            >
              <X className="size-4" />
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
