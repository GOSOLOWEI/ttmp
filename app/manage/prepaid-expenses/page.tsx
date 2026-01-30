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

// 预付费用数据接口
interface PrepaidExpense {
  prepaidId: string;
  expenseName: string;
  level1Category: string;
  level2Category: string;
  totalAmount: number;
  startMonth: string;
  endMonth: string;
  months: number;
  monthlyAmount: number;
  paymentChannel: string;
  accountName: string | null;
  paymentTransactionId: string | null;
  lastAmortizedMonth: string | null;
  status: "in_progress" | "completed";
  remark: string | null;
}

// 分类数据接口（用于下拉选择）
interface Category {
  level1Category: string;
  level2Category: string;
}

// 表单验证 schema
const prepaidExpenseSchema = z.object({
  prepaidId: z.string().min(1, "预付费用 ID 不能为空").max(50, "ID 不能超过50个字符"),
  expenseName: z.string().min(1, "费用名称不能为空").max(100, "名称不能超过100个字符"),
  level1Category: z.string().min(1, "一级分类不能为空"),
  level2Category: z.string().min(1, "二级分类不能为空"),
  totalAmount: z.string().min(1, "总金额不能为空").refine((val) => !isNaN(parseFloat(val)) && parseFloat(val) > 0, "总金额必须大于0"),
  startMonth: z.string().regex(/^\d{4}-\d{2}$/, "开始月份格式应为 YYYY-MM"),
  endMonth: z.string().regex(/^\d{4}-\d{2}$/, "结束月份格式应为 YYYY-MM"),
  months: z.string().refine((val) => !isNaN(parseInt(val)) && parseInt(val) > 0, "月数必须大于0"),
  monthlyAmount: z.string().refine((val) => !isNaN(parseFloat(val)) && parseFloat(val) > 0, "月摊销金额必须大于0"),
  paymentChannel: z.enum(["cash", "wechat", "alipay", "bank_card", "credit_card", "huabei", "other"]),
  accountName: z.string().optional().nullable(),
  paymentTransactionId: z.string().optional().nullable(),
  remark: z.string().max(200, "备注不能超过200个字符").optional().nullable(),
});

type PrepaidExpenseFormValues = z.infer<typeof prepaidExpenseSchema>;

// 状态配置常量
const STATUS_CONFIG: Record<"in_progress" | "completed", { label: string; color: string }> = {
  in_progress: {
    label: "进行中",
    color: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  },
  completed: {
    label: "已完成",
    color: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
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

export default function PrepaidExpensesPage() {
  const [prepaidExpenses, setPrepaidExpenses] = useState<PrepaidExpense[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<PrepaidExpense | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<PrepaidExpense | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const form = useForm<PrepaidExpenseFormValues>({
    resolver: zodResolver(prepaidExpenseSchema),
    defaultValues: {
      prepaidId: "",
      expenseName: "",
      level1Category: "",
      level2Category: "",
      totalAmount: "",
      startMonth: "",
      endMonth: "",
      months: "",
      monthlyAmount: "",
      paymentChannel: "alipay",
      accountName: "",
      paymentTransactionId: "",
      remark: "",
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

  // 获取预付费用列表
  const fetchPrepaidExpenses = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const params = new URLSearchParams();
      if (statusFilter !== "all") {
        params.append("status", statusFilter);
      }

      const response = await fetch(`/api/prepaid-expenses?${params.toString()}`);
      const result = await response.json();
      
      if (result.success) {
        setPrepaidExpenses(result.data);
      } else {
        setError(result.error || "获取预付费用失败");
        console.error("获取预付费用失败:", result.error);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "获取预付费用失败";
      setError(errorMessage);
      console.error("获取预付费用失败:", error);
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    fetchCategories();
    fetchPrepaidExpenses();
  }, [fetchPrepaidExpenses, fetchCategories]);

  // 搜索过滤
  const filteredExpenses = useMemo(() => {
    if (!searchQuery.trim()) {
      return prepaidExpenses;
    }
    const query = searchQuery.toLowerCase();
    return prepaidExpenses.filter((expense) => {
      return (
        expense.expenseName.toLowerCase().includes(query) ||
        expense.prepaidId.toLowerCase().includes(query) ||
        expense.level1Category.toLowerCase().includes(query) ||
        expense.level2Category.toLowerCase().includes(query) ||
        (expense.remark && expense.remark.toLowerCase().includes(query))
      );
    });
  }, [prepaidExpenses, searchQuery]);

  // 按一级分类分组
  const groupedExpenses = useMemo(() => {
    return filteredExpenses.reduce((acc, expense) => {
      if (!acc[expense.level1Category]) {
        acc[expense.level1Category] = [];
      }
      acc[expense.level1Category].push(expense);
      return acc;
    }, {} as Record<string, PrepaidExpense[]>);
  }, [filteredExpenses]);

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
    setEditingExpense(null);
    form.reset({
      prepaidId: `PRE${new Date().getFullYear()}${String(new Date().getMonth() + 1).padStart(2, "0")}${String(Math.floor(Math.random() * 1000)).padStart(3, "0")}`,
      expenseName: "",
      level1Category: "",
      level2Category: "",
      totalAmount: "",
      startMonth: "",
      endMonth: "",
      months: "",
      monthlyAmount: "",
      paymentChannel: "alipay",
      accountName: "",
      paymentTransactionId: "",
      remark: "",
    });
    setIsDialogOpen(true);
  }, [form]);

  // 打开编辑对话框
  const handleEdit = useCallback((expense: PrepaidExpense) => {
    setEditingExpense(expense);
    form.reset({
      prepaidId: expense.prepaidId,
      expenseName: expense.expenseName,
      level1Category: expense.level1Category,
      level2Category: expense.level2Category,
      totalAmount: expense.totalAmount.toString(),
      startMonth: expense.startMonth,
      endMonth: expense.endMonth,
      months: expense.months.toString(),
      monthlyAmount: expense.monthlyAmount.toString(),
      paymentChannel: expense.paymentChannel as any,
      accountName: expense.accountName || "",
      paymentTransactionId: expense.paymentTransactionId || "",
      remark: expense.remark || "",
    });
    setIsDialogOpen(true);
  }, [form]);

  // 计算月数和月摊销金额
  const calculateMonths = useCallback((startMonth: string, endMonth: string) => {
    if (!startMonth || !endMonth) return { months: 0, monthlyAmount: 0 };
    const start = new Date(startMonth + "-01");
    const end = new Date(endMonth + "-01");
    const months = (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth()) + 1;
    return months;
  }, []);

  // 监听开始和结束月份变化，自动计算月数
  const startMonth = form.watch("startMonth");
  const endMonth = form.watch("endMonth");
  const totalAmount = form.watch("totalAmount");

  useEffect(() => {
    if (startMonth && endMonth) {
      const months = calculateMonths(startMonth, endMonth);
      if (months > 0) {
        form.setValue("months", months.toString());
        if (totalAmount && !isNaN(parseFloat(totalAmount))) {
          const monthlyAmount = parseFloat(totalAmount) / months;
          form.setValue("monthlyAmount", monthlyAmount.toFixed(2));
        }
      }
    }
  }, [startMonth, endMonth, totalAmount, calculateMonths, form]);

  // 提交表单
  const onSubmit: SubmitHandler<PrepaidExpenseFormValues> = async (values) => {
    try {
      setIsSubmitting(true);
      let response;
      let result;

      if (editingExpense) {
        // 编辑模式
        response = await fetch(`/api/prepaid-expenses/${encodeURIComponent(values.prepaidId)}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(values),
        });
      } else {
        // 创建模式
        response = await fetch("/api/prepaid-expenses", {
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
      setEditingExpense(null);
      setError(null);
      await fetchPrepaidExpenses();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "保存失败，请重试";
      setError(errorMessage);
      console.error("保存预付费用失败:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  // 删除预付费用
  const handleDelete = useCallback(async (expense: PrepaidExpense) => {
    try {
      setIsDeleting(true);
      setError(null);
      
      setPrepaidExpenses((prev) => prev.filter((e) => e.prepaidId !== expense.prepaidId));

      const response = await fetch(
        `/api/prepaid-expenses/${encodeURIComponent(expense.prepaidId)}`,
        { method: "DELETE" }
      );
      const result = await response.json();
      
      if (result.success) {
        setDeleteConfirm(null);
        setTimeout(() => {
          fetchPrepaidExpenses();
        }, 100);
      } else {
        await fetchPrepaidExpenses();
        setError(result.error || "删除失败");
      }
    } catch (error) {
      await fetchPrepaidExpenses();
      const errorMessage = error instanceof Error ? error.message : "删除失败，请重试";
      setError(errorMessage);
      console.error("删除预付费用失败:", error);
    } finally {
      setIsDeleting(false);
    }
  }, [fetchPrepaidExpenses]);

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-black p-3 sm:p-4 pb-20">
      <div className="max-w-4xl mx-auto">
        {/* 头部 */}
        <div className="mb-4 sm:mb-6">
          <h1 className="text-xl sm:text-2xl font-bold text-zinc-900 dark:text-zinc-50 mb-1 sm:mb-2">
            预付费用管理
          </h1>
          <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400">
            管理您的预付费用和摊销计划
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
                  placeholder="搜索预付费用..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>

              {/* 筛选器 */}
              <div className="flex flex-wrap gap-2">
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-full sm:w-[140px]">
                    <Filter className="size-4 mr-2" />
                    <SelectValue placeholder="状态" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">全部状态</SelectItem>
                    <SelectItem value="in_progress">进行中</SelectItem>
                    <SelectItem value="completed">已完成</SelectItem>
                  </SelectContent>
                </Select>

                <Button
                  type="button"
                  onClick={() => handleCreate()}
                  className="w-full sm:w-auto sm:ml-auto"
                  size="sm"
                >
                  <Plus className="size-4 mr-2" />
                  新建预付费用
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 预付费用列表 */}
        {loading ? (
          <div className="text-center py-12">
            <Loader2 className="size-6 animate-spin mx-auto text-zinc-400 mb-2" />
            <p className="text-zinc-500">加载中...</p>
          </div>
        ) : error && prepaidExpenses.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-red-600 dark:text-red-400 mb-4">{error}</p>
              <Button type="button" onClick={fetchPrepaidExpenses} variant="outline">
                重试
              </Button>
            </CardContent>
          </Card>
        ) : Object.keys(groupedExpenses).length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-zinc-500">
              {searchQuery ? "未找到匹配的预付费用" : "暂无预付费用数据"}
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {Object.entries(groupedExpenses).map(([level1, expenses]) => (
              <Card key={level1}>
                <CardHeader>
                  <CardTitle className="text-lg">{level1}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {expenses.map((expense) => (
                      <div
                        key={expense.prepaidId}
                        className="flex items-start justify-between gap-4 p-3 rounded-lg border bg-white dark:bg-zinc-900 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <span className="font-medium text-zinc-900 dark:text-zinc-50">
                              {expense.expenseName}
                            </span>
                            <Badge className={`text-xs ${STATUS_CONFIG[expense.status].color}`}>
                              {STATUS_CONFIG[expense.status].label}
                            </Badge>
                            <Badge variant="outline" className="text-xs">
                              {expense.level2Category}
                            </Badge>
                          </div>
                          <div className="text-sm text-zinc-500 dark:text-zinc-400 space-y-1">
                            <p>总金额: ¥{expense.totalAmount.toFixed(2)} | 月摊销: ¥{expense.monthlyAmount.toFixed(2)}</p>
                            <p>期间: {expense.startMonth} 至 {expense.endMonth} ({expense.months} 个月)</p>
                            <p>支付渠道: {PAYMENT_CHANNEL_CONFIG[expense.paymentChannel]?.label || expense.paymentChannel}</p>
                            {expense.lastAmortizedMonth && (
                              <p className="text-blue-600 dark:text-blue-400">已摊销至: {expense.lastAmortizedMonth}</p>
                            )}
                          </div>
                          {expense.remark && (
                            <p className="text-sm text-zinc-400 dark:text-zinc-500 mt-1 line-clamp-1">
                              {expense.remark}
                            </p>
                          )}
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon-xs"
                            onClick={() => handleEdit(expense)}
                            disabled={isDeleting}
                          >
                            <Edit2 className="size-4" />
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon-xs"
                            onClick={() => setDeleteConfirm(expense)}
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
                {editingExpense ? "编辑预付费用" : "新建预付费用"}
              </DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="prepaidId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>预付费用 ID *</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="例如：PRE202401"
                            {...field}
                            disabled={isSubmitting || !!editingExpense}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="expenseName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>费用名称 *</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="例如：2024 年房租"
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
                    name="totalAmount"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>总金额 *</FormLabel>
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
                    name="startMonth"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>开始月份 *</FormLabel>
                        <FormControl>
                          <Input
                            type="month"
                            placeholder="YYYY-MM"
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
                    name="endMonth"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>结束月份 *</FormLabel>
                        <FormControl>
                          <Input
                            type="month"
                            placeholder="YYYY-MM"
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
                    name="months"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>总月数 *</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            placeholder="自动计算"
                            {...field}
                            disabled={isSubmitting}
                          />
                        </FormControl>
                        <FormDescription>根据开始和结束月份自动计算</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="monthlyAmount"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>月摊销金额 *</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            step="0.01"
                            placeholder="自动计算"
                            {...field}
                            disabled={isSubmitting}
                          />
                        </FormControl>
                        <FormDescription>根据总金额和月数自动计算</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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

                  <FormField
                    control={form.control}
                    name="accountName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>付款账户</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="可选"
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

                <FormField
                  control={form.control}
                  name="paymentTransactionId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>付款流水 ID</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="可选，关联的付款流水 ID"
                          {...field}
                          value={field.value || ""}
                          disabled={isSubmitting}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="remark"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>备注</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="备注说明（可选）"
                          {...field}
                          value={field.value || ""}
                          disabled={isSubmitting}
                        />
                      </FormControl>
                      <FormMessage />
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
                    ) : editingExpense ? (
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
                  确定要删除预付费用 <strong>{deleteConfirm.expenseName}</strong> 吗？
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
