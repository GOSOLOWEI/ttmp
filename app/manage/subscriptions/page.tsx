"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { Plus, Search, Edit2, Trash2, Filter, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { useForm, type SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";

// 订阅数据接口
interface Subscription {
  subscriptionId: string;
  subscriptionName: string;
  level1Category: string;
  level2Category: string;
  billingCycle: "monthly" | "yearly";
  amount: number;
  paymentChannel: string;
  startDate: string;
  renewalRule: string | null;
  isActive: boolean;
  usageLevel: "low" | "medium" | "high";
  decision: "keep" | "watch" | "cancel";
}

// 分类数据接口（用于下拉选择）
interface Category {
  level1Category: string;
  level2Category: string;
}

// 表单验证 schema
const subscriptionSchema = z.object({
  subscriptionId: z.string().min(1, "订阅 ID 不能为空").max(50, "ID 不能超过50个字符"),
  subscriptionName: z.string().min(1, "服务名称不能为空").max(100, "名称不能超过100个字符"),
  level1Category: z.string().min(1, "一级分类不能为空"),
  level2Category: z.string().min(1, "二级分类不能为空"),
  billingCycle: z.enum(["monthly", "yearly"]),
  amount: z.string().min(1, "金额不能为空").refine((val) => !isNaN(parseFloat(val)) && parseFloat(val) > 0, "金额必须大于0"),
  paymentChannel: z.enum(["cash", "wechat", "alipay", "bank_card", "credit_card", "huabei", "other"]),
  startDate: z.string().min(1, "开始日期不能为空"),
  renewalRule: z.string().max(100, "续费规则不能超过100个字符").optional().nullable(),
  isActive: z.boolean(),
  usageLevel: z.enum(["low", "medium", "high"]),
  decision: z.enum(["keep", "watch", "cancel"]),
});

type SubscriptionFormValues = z.infer<typeof subscriptionSchema>;

// 计费周期配置
const BILLING_CYCLE_CONFIG: Record<"monthly" | "yearly", { label: string }> = {
  monthly: { label: "月付" },
  yearly: { label: "年付" },
};

// 使用频率配置
const USAGE_LEVEL_CONFIG: Record<"low" | "medium" | "high", { label: string; color: string }> = {
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
const DECISION_CONFIG: Record<"keep" | "watch" | "cancel", { label: string; color: string }> = {
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

// 支付渠道配置
const PAYMENT_CHANNEL_CONFIG: Record<string, { label: string }> = {
  cash: { label: "现金" },
  wechat: { label: "微信" },
  alipay: { label: "支付宝" },
  bank_card: { label: "银行卡" },
  credit_card: { label: "信用卡" },
  huabei: { label: "花呗" },
  other: { label: "其他" },
};

export default function SubscriptionsPage() {
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState<string>("all");
  const [decisionFilter, setDecisionFilter] = useState<string>("all");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingSubscription, setEditingSubscription] = useState<Subscription | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<Subscription | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const form = useForm<SubscriptionFormValues>({
    resolver: zodResolver(subscriptionSchema),
    defaultValues: {
      subscriptionId: "",
      subscriptionName: "",
      level1Category: "",
      level2Category: "",
      billingCycle: "monthly",
      amount: "",
      paymentChannel: "alipay",
      startDate: "",
      renewalRule: "",
      isActive: true,
      usageLevel: "medium",
      decision: "watch",
    },
  });

  // 获取分类列表
  const fetchCategories = useCallback(async () => {
    try {
      const response = await fetch("/api/categories");
      const result = await response.json();
      if (result.success) {
        setCategories(result.data);
      }
    } catch (error) {
      console.error("获取分类失败:", error);
    }
  }, []);

  // 获取订阅列表
  const fetchSubscriptions = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const params = new URLSearchParams();
      if (activeFilter !== "all") {
        params.append("isActive", activeFilter === "active" ? "true" : "false");
      }
      if (decisionFilter !== "all") {
        params.append("decision", decisionFilter);
      }

      const response = await fetch(`/api/subscriptions?${params.toString()}`);
      const result = await response.json();
      
      if (result.success) {
        setSubscriptions(result.data);
      } else {
        setError(result.error || "获取订阅失败");
        console.error("获取订阅失败:", result.error);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "获取订阅失败";
      setError(errorMessage);
      console.error("获取订阅失败:", error);
    } finally {
      setLoading(false);
    }
  }, [activeFilter, decisionFilter]);

  useEffect(() => {
    fetchCategories();
    fetchSubscriptions();
  }, [fetchSubscriptions, fetchCategories]);

  // 搜索过滤
  const filteredSubscriptions = useMemo(() => {
    if (!searchQuery.trim()) {
      return subscriptions;
    }
    const query = searchQuery.toLowerCase();
    return subscriptions.filter((sub) => {
      return (
        sub.subscriptionName.toLowerCase().includes(query) ||
        sub.subscriptionId.toLowerCase().includes(query) ||
        sub.level1Category.toLowerCase().includes(query) ||
        sub.level2Category.toLowerCase().includes(query) ||
        (sub.renewalRule && sub.renewalRule.toLowerCase().includes(query))
      );
    });
  }, [subscriptions, searchQuery]);

  // 按一级分类分组
  const groupedSubscriptions = useMemo(() => {
    return filteredSubscriptions.reduce((acc, sub) => {
      if (!acc[sub.level1Category]) {
        acc[sub.level1Category] = [];
      }
      acc[sub.level1Category].push(sub);
      return acc;
    }, {} as Record<string, Subscription[]>);
  }, [filteredSubscriptions]);

  // 获取一级分类列表
  const level1Categories = useMemo(() => {
    const unique = new Set(categories.map((c) => c.level1Category));
    return Array.from(unique).sort();
  }, [categories]);

  // 根据一级分类获取二级分类
  const getLevel2Categories = useCallback((level1: string) => {
    return categories
      .filter((c) => c.level1Category === level1)
      .map((c) => c.level2Category)
      .sort();
  }, [categories]);

  // 打开创建对话框
  const handleCreate = useCallback(() => {
    setEditingSubscription(null);
    form.reset({
      subscriptionId: `SUB${String(Math.floor(Math.random() * 10000)).padStart(4, "0")}`,
      subscriptionName: "",
      level1Category: "",
      level2Category: "",
      billingCycle: "monthly",
      amount: "",
      paymentChannel: "alipay",
      startDate: new Date().toISOString().split("T")[0],
      renewalRule: "",
      isActive: true,
      usageLevel: "medium",
      decision: "watch",
    });
    setIsDialogOpen(true);
  }, [form]);

  // 打开编辑对话框
  const handleEdit = useCallback((subscription: Subscription) => {
    setEditingSubscription(subscription);
    form.reset({
      subscriptionId: subscription.subscriptionId,
      subscriptionName: subscription.subscriptionName,
      level1Category: subscription.level1Category,
      level2Category: subscription.level2Category,
      billingCycle: subscription.billingCycle,
      amount: subscription.amount.toString(),
      paymentChannel: subscription.paymentChannel as any,
      startDate: subscription.startDate.split("T")[0],
      renewalRule: subscription.renewalRule || "",
      isActive: subscription.isActive,
      usageLevel: subscription.usageLevel,
      decision: subscription.decision,
    });
    setIsDialogOpen(true);
  }, [form]);

  // 提交表单
  const onSubmit: SubmitHandler<SubscriptionFormValues> = async (values) => {
    try {
      setIsSubmitting(true);
      let response;
      let result;

      if (editingSubscription) {
        // 编辑模式
        response = await fetch(`/api/subscriptions/${encodeURIComponent(values.subscriptionId)}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(values),
        });
      } else {
        // 创建模式
        response = await fetch("/api/subscriptions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(values),
        });
      }

      result = await response.json();
      
      if (!result.success) {
        setError(result.error || "操作失败");
        setIsSubmitting(false);
        return;
      }

      setIsDialogOpen(false);
      form.reset();
      setEditingSubscription(null);
      setError(null);
      await fetchSubscriptions();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "保存失败，请重试";
      setError(errorMessage);
      console.error("保存订阅失败:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  // 删除订阅
  const handleDelete = useCallback(async (subscription: Subscription) => {
    try {
      setIsDeleting(true);
      setError(null);
      
      setSubscriptions((prev) => prev.filter((s) => s.subscriptionId !== subscription.subscriptionId));

      const response = await fetch(
        `/api/subscriptions/${encodeURIComponent(subscription.subscriptionId)}`,
        { method: "DELETE" }
      );
      const result = await response.json();
      
      if (result.success) {
        setDeleteConfirm(null);
        setTimeout(() => {
          fetchSubscriptions();
        }, 100);
      } else {
        await fetchSubscriptions();
        setError(result.error || "删除失败");
      }
    } catch (error) {
      await fetchSubscriptions();
      const errorMessage = error instanceof Error ? error.message : "删除失败，请重试";
      setError(errorMessage);
      console.error("删除订阅失败:", error);
    } finally {
      setIsDeleting(false);
    }
  }, [fetchSubscriptions]);

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-black p-3 sm:p-4 pb-20">
      <div className="max-w-4xl mx-auto">
        {/* 头部 */}
        <div className="mb-4 sm:mb-6">
          <h1 className="text-xl sm:text-2xl font-bold text-zinc-900 dark:text-zinc-50 mb-1 sm:mb-2">
            订阅管理
          </h1>
          <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400">
            管理您的订阅服务和自动扣款
          </p>
        </div>

        {/* 错误提示 */}
        {error && (
          <Card className="mb-4 border-red-200 bg-red-50 dark:bg-red-900/20 dark:border-red-800">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
                <Button
                  type="button"
                  variant="ghost"
                  size="xs"
                  onClick={() => setError(null)}
                >
                  关闭
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* 搜索和筛选栏 */}
        <Card className="mb-4">
          <CardContent className="pt-6">
            <div className="space-y-4">
              {/* 搜索框 */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-zinc-400" />
                <Input
                  placeholder="搜索订阅..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>

              {/* 筛选器 */}
              <div className="flex flex-wrap gap-2">
                <Select value={activeFilter} onValueChange={setActiveFilter}>
                  <SelectTrigger className="w-full sm:w-[140px]">
                    <Filter className="size-4 mr-2" />
                    <SelectValue placeholder="状态" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">全部状态</SelectItem>
                    <SelectItem value="active">启用</SelectItem>
                    <SelectItem value="inactive">禁用</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={decisionFilter} onValueChange={setDecisionFilter}>
                  <SelectTrigger className="w-full sm:w-[140px]">
                    <SelectValue placeholder="决策" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">全部决策</SelectItem>
                    <SelectItem value="keep">保留</SelectItem>
                    <SelectItem value="watch">观察</SelectItem>
                    <SelectItem value="cancel">取消</SelectItem>
                  </SelectContent>
                </Select>

                <Button
                  type="button"
                  onClick={() => handleCreate()}
                  className="w-full sm:w-auto sm:ml-auto"
                  size="sm"
                >
                  <Plus className="size-4 mr-2" />
                  新建订阅
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 订阅列表 */}
        {loading ? (
          <div className="text-center py-12">
            <Loader2 className="size-6 animate-spin mx-auto text-zinc-400 mb-2" />
            <p className="text-zinc-500">加载中...</p>
          </div>
        ) : error && subscriptions.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-red-600 dark:text-red-400 mb-4">{error}</p>
              <Button type="button" onClick={fetchSubscriptions} variant="outline">
                重试
              </Button>
            </CardContent>
          </Card>
        ) : Object.keys(groupedSubscriptions).length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-zinc-500">
              {searchQuery ? "未找到匹配的订阅" : "暂无订阅数据"}
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {Object.entries(groupedSubscriptions).map(([level1, subs]) => (
              <Card key={level1}>
                <CardHeader>
                  <CardTitle className="text-lg">{level1}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {subs.map((sub) => (
                      <div
                        key={sub.subscriptionId}
                        className={`flex items-start justify-between gap-4 p-3 rounded-lg border transition-colors ${
                          !sub.isActive
                            ? "bg-zinc-100 dark:bg-zinc-800/50 border-zinc-200 dark:border-zinc-700 opacity-60"
                            : "bg-white dark:bg-zinc-900 hover:bg-zinc-50 dark:hover:bg-zinc-800"
                        }`}
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <span
                              className={`font-medium ${
                                !sub.isActive
                                  ? "text-zinc-400 dark:text-zinc-500 line-through"
                                  : "text-zinc-900 dark:text-zinc-50"
                              }`}
                            >
                              {sub.subscriptionName}
                            </span>
                            <Badge className={`text-xs ${USAGE_LEVEL_CONFIG[sub.usageLevel].color}`}>
                              {USAGE_LEVEL_CONFIG[sub.usageLevel].label}
                            </Badge>
                            <Badge className={`text-xs ${DECISION_CONFIG[sub.decision].color}`}>
                              {DECISION_CONFIG[sub.decision].label}
                            </Badge>
                            <Badge variant="outline" className="text-xs">
                              {sub.level2Category}
                            </Badge>
                            {!sub.isActive && (
                              <Badge variant="outline" className="text-xs border-zinc-300 dark:border-zinc-600">
                                已禁用
                              </Badge>
                            )}
                          </div>
                          <div className="text-sm text-zinc-500 dark:text-zinc-400 space-y-1">
                            <p>
                              ¥{sub.amount.toFixed(2)} / {BILLING_CYCLE_CONFIG[sub.billingCycle].label}
                            </p>
                            <p>
                              支付渠道: {PAYMENT_CHANNEL_CONFIG[sub.paymentChannel]?.label || sub.paymentChannel} | 
                              开始日期: {sub.startDate.split("T")[0]}
                            </p>
                            {sub.renewalRule && (
                              <p className="text-blue-600 dark:text-blue-400">续费规则: {sub.renewalRule}</p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon-xs"
                            onClick={() => handleEdit(sub)}
                            disabled={isDeleting}
                          >
                            <Edit2 className="size-4" />
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon-xs"
                            onClick={() => setDeleteConfirm(sub)}
                            disabled={isDeleting}
                          >
                            <Trash2 className="size-4 text-red-500" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* 创建/编辑对话框 */}
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="max-w-[calc(100vw-2rem)] sm:max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingSubscription ? "编辑订阅" : "新建订阅"}
              </DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="subscriptionId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>订阅 ID *</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="例如：SUB001"
                            {...field}
                            disabled={isSubmitting || !!editingSubscription}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="subscriptionName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>服务名称 *</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="例如：Spotify"
                            {...field}
                            disabled={isSubmitting}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="level1Category"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>一级分类 *</FormLabel>
                        <Select
                          onValueChange={(value) => {
                            field.onChange(value);
                            form.setValue("level2Category", "");
                          }}
                          value={field.value}
                          disabled={isSubmitting}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="选择一级分类" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {level1Categories.map((level1) => (
                              <SelectItem key={level1} value={level1}>
                                {level1}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="level2Category"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>二级分类 *</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          value={field.value}
                          disabled={isSubmitting || !form.watch("level1Category")}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="选择二级分类" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {getLevel2Categories(form.watch("level1Category")).map((level2) => (
                              <SelectItem key={level2} value={level2}>
                                {level2}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <FormField
                    control={form.control}
                    name="billingCycle"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>计费周期 *</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          value={field.value}
                          disabled={isSubmitting}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="选择计费周期" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {Object.entries(BILLING_CYCLE_CONFIG).map(([value, config]) => (
                              <SelectItem key={value} value={value}>
                                {config.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="amount"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>单期金额 *</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            step="0.01"
                            placeholder="0.00"
                            {...field}
                            disabled={isSubmitting}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="paymentChannel"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>支付渠道 *</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          value={field.value}
                          disabled={isSubmitting}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="选择支付渠道" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {Object.entries(PAYMENT_CHANNEL_CONFIG).map(([value, config]) => (
                              <SelectItem key={value} value={value}>
                                {config.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="startDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>开始日期 *</FormLabel>
                        <FormControl>
                          <Input
                            type="date"
                            {...field}
                            disabled={isSubmitting}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="renewalRule"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>续费规则</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="例如：每月 10 号"
                            {...field}
                            value={field.value || ""}
                            disabled={isSubmitting}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="usageLevel"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>使用频率 *</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          value={field.value}
                          disabled={isSubmitting}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="选择使用频率" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {Object.entries(USAGE_LEVEL_CONFIG).map(([value, config]) => (
                              <SelectItem key={value} value={value}>
                                {config.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="decision"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>决策 *</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          value={field.value}
                          disabled={isSubmitting}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="选择决策" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {Object.entries(DECISION_CONFIG).map(([value, config]) => (
                              <SelectItem key={value} value={value}>
                                {config.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="isActive"
                  render={({ field }) => (
                    <FormItem className="flex items-center justify-between rounded-lg border p-4">
                      <div className="space-y-0.5">
                        <FormLabel>启用状态</FormLabel>
                        <FormDescription>
                          禁用后将不再自动生成扣款流水
                        </FormDescription>
                      </div>
                      <FormControl>
                        <input
                          type="checkbox"
                          checked={field.value}
                          onChange={field.onChange}
                          disabled={isSubmitting}
                          className="size-4 rounded border-zinc-300"
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />

                <div className="flex gap-2 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsDialogOpen(false)}
                    className="flex-1"
                    disabled={isSubmitting}
                  >
                    取消
                  </Button>
                  <Button type="submit" className="flex-1" disabled={isSubmitting}>
                    {isSubmitting ? (
                      <>
                        <Loader2 className="size-4 mr-2 animate-spin" />
                        处理中...
                      </>
                    ) : editingSubscription ? (
                      "更新"
                    ) : (
                      "创建"
                    )}
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>

        {/* 删除确认对话框 */}
        <Dialog open={!!deleteConfirm} onOpenChange={(open) => !open && setDeleteConfirm(null)}>
          <DialogContent className="max-w-[calc(100vw-2rem)] sm:max-w-md">
            <DialogHeader>
              <DialogTitle>确认删除</DialogTitle>
            </DialogHeader>
            {deleteConfirm && (
              <div className="space-y-4">
                <p className="text-sm text-zinc-600 dark:text-zinc-400">
                  确定要删除订阅 <strong>{deleteConfirm.subscriptionName}</strong> 吗？
                </p>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setDeleteConfirm(null)}
                    className="flex-1"
                    disabled={isDeleting}
                  >
                    取消
                  </Button>
                  <Button
                    type="button"
                    variant="destructive"
                    onClick={() => handleDelete(deleteConfirm)}
                    className="flex-1"
                    disabled={isDeleting}
                  >
                    {isDeleting ? (
                      <>
                        <Loader2 className="size-4 mr-2 animate-spin" />
                        删除中...
                      </>
                    ) : (
                      "删除"
                    )}
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
