// 管理页面共享类型定义

export type TransactionType = "income" | "expense" | "asset_change";

export type PrepaidStatus = "in_progress" | "completed";

export type BillingCycle = "monthly" | "yearly";

export type UsageLevel = "low" | "medium" | "high";

export type SubscriptionDecision = "keep" | "watch" | "cancel";

export type TagType = "psychological" | "goal" | "risk";

export type PaymentChannel = "cash" | "wechat" | "alipay" | "bank_card" | "credit_card" | "huabei" | "other";

// 分类接口
export interface Category {
  level1Category: string;
  level2Category: string;
  defaultType: TransactionType;
  defaultIsAnalysis: boolean;
  usageCount: number;
  lastUsedAt: string | null;
  isActive: boolean;
  remark: string | null;
}

// 预付费用接口
export interface PrepaidExpense {
  prepaidId: string;
  expenseName: string;
  level1Category: string;
  level2Category: string;
  totalAmount: number;
  startMonth: string;
  endMonth: string;
  months: number;
  monthlyAmount: number;
  paymentChannel: PaymentChannel;
  accountName: string | null;
  paymentTransactionId: string | null;
  lastAmortizedMonth: string | null;
  status: PrepaidStatus;
  remark: string | null;
}

// 订阅接口
export interface Subscription {
  subscriptionId: string;
  subscriptionName: string;
  level1Category: string;
  level2Category: string;
  billingCycle: BillingCycle;
  amount: number;
  paymentChannel: PaymentChannel;
  startDate: string;
  renewalRule: string | null;
  isActive: boolean;
  usageLevel: UsageLevel;
  decision: SubscriptionDecision;
}

// 标签接口
export interface Tag {
  tagId: string;
  tagName: string;
  tagType: TagType;
  description: string | null;
  usageCount: number;
  lastUsedAt: string | null;
  isActive: boolean;
}

// API 响应类型
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}
