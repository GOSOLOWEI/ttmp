// 共享配置常量

import type {
  TransactionType,
  PrepaidStatus,
  BillingCycle,
  UsageLevel,
  SubscriptionDecision,
  TagType,
  PaymentChannel,
} from "@/lib/types/manage";

// 交易类型配置
export const TYPE_CONFIG: Record<TransactionType, { label: string; color: string }> = {
  income: {
    label: "收入",
    color: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  },
  expense: {
    label: "支出",
    color: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
  },
  asset_change: {
    label: "资产变动",
    color: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  },
};

// 预付费用状态配置
export const PREPAID_STATUS_CONFIG: Record<PrepaidStatus, { label: string; color: string }> = {
  in_progress: {
    label: "进行中",
    color: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  },
  completed: {
    label: "已完成",
    color: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  },
};

// 计费周期配置
export const BILLING_CYCLE_CONFIG: Record<BillingCycle, { label: string }> = {
  monthly: { label: "月付" },
  yearly: { label: "年付" },
};

// 使用频率配置
export const USAGE_LEVEL_CONFIG: Record<UsageLevel, { label: string; color: string }> = {
  low: {
    label: "低",
    color: "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400",
  },
  medium: {
    label: "中",
    color: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  },
  high: {
    label: "高",
    color: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  },
};

// 决策配置
export const DECISION_CONFIG: Record<SubscriptionDecision, { label: string; color: string }> = {
  keep: {
    label: "保留",
    color: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  },
  watch: {
    label: "观察",
    color: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
  },
  cancel: {
    label: "取消",
    color: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
  },
};

// 标签类型配置
export const TAG_TYPE_CONFIG: Record<TagType, { label: string; color: string }> = {
  psychological: {
    label: "心理",
    color: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400",
  },
  goal: {
    label: "目标",
    color: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  },
  risk: {
    label: "风险",
    color: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
  },
};

// 支付渠道配置
export const PAYMENT_CHANNEL_CONFIG: Record<PaymentChannel, { label: string }> = {
  cash: { label: "现金" },
  wechat: { label: "微信" },
  alipay: { label: "支付宝" },
  bank_card: { label: "银行卡" },
  credit_card: { label: "信用卡" },
  huabei: { label: "花呗" },
  other: { label: "其他" },
};
