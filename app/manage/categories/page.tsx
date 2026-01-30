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

// 分类类型
type TransactionType = "income" | "expense" | "asset_change";

// 分类数据接口
interface Category {
  level1Category: string;
  level2Category: string;
  defaultType: TransactionType;
  defaultIsAnalysis: boolean;
  usageCount: number;
  lastUsedAt: string | null;
  isActive: boolean;
  remark: string | null;
}

// 表单验证 schema
const categorySchema = z.object({
  level1Category: z.string().min(1, "一级分类不能为空").max(50, "一级分类不能超过50个字符"),
  level2Category: z.string().min(1, "二级分类不能为空").max(50, "二级分类不能超过50个字符"),
  defaultType: z.enum(["income", "expense", "asset_change"]),
  defaultIsAnalysis: z.boolean(),
  remark: z.string().max(200, "备注不能超过200个字符").optional().nullable(),
  isActive: z.boolean(),
});

type CategoryFormValues = z.infer<typeof categorySchema>;

// 类型配置常量
const TYPE_CONFIG: Record<TransactionType, { label: string; color: string }> = {
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

export default function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [activeFilter, setActiveFilter] = useState<string>("all");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<Category | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const form = useForm<CategoryFormValues>({
    resolver: zodResolver(categorySchema),
    defaultValues: {
      level1Category: "",
      level2Category: "",
      defaultType: "expense",
      defaultIsAnalysis: true,
      remark: "",
      isActive: true,
    },
  });

  // 获取分类列表（使用 useCallback 优化）
  const fetchCategories = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const params = new URLSearchParams();
      if (typeFilter !== "all") {
        params.append("type", typeFilter);
      }
      if (activeFilter !== "all") {
        params.append("isActive", activeFilter === "active" ? "true" : "false");
      }

      const response = await fetch(`/api/categories?${params.toString()}`);
      const result = await response.json();
      
      if (result.success) {
        setCategories(result.data);
      } else {
        setError(result.error || "获取分类失败");
        console.error("获取分类失败:", result.error);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "获取分类失败";
      setError(errorMessage);
      console.error("获取分类失败:", error);
    } finally {
      setLoading(false);
    }
  }, [typeFilter, activeFilter]);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  // 搜索防抖（使用 useMemo 优化过滤逻辑）
  const filteredCategories = useMemo(() => {
    if (!searchQuery.trim()) {
      return categories;
    }
    const query = searchQuery.toLowerCase();
    return categories.filter((cat) => {
      return (
        cat.level1Category.toLowerCase().includes(query) ||
        cat.level2Category.toLowerCase().includes(query) ||
        (cat.remark && cat.remark.toLowerCase().includes(query))
      );
    });
  }, [categories, searchQuery]);

  // 按一级分类分组（使用 useMemo 优化）
  const groupedCategories = useMemo(() => {
    return filteredCategories.reduce((acc, cat) => {
      if (!acc[cat.level1Category]) {
        acc[cat.level1Category] = [];
      }
      acc[cat.level1Category].push(cat);
      return acc;
    }, {} as Record<string, Category[]>);
  }, [filteredCategories]);

  // 打开创建对话框
  const handleCreate = useCallback((presetLevel1?: string) => {
    setEditingCategory(null);
    form.reset({
      level1Category: presetLevel1 || "",
      level2Category: "",
      defaultType: "expense",
      defaultIsAnalysis: true,
      remark: "",
      isActive: true,
    });
    setIsDialogOpen(true);
  }, [form]);

  // 打开编辑对话框
  const handleEdit = useCallback((category: Category) => {
    setEditingCategory(category);
    form.reset({
      level1Category: category.level1Category,
      level2Category: category.level2Category,
      defaultType: category.defaultType,
      defaultIsAnalysis: category.defaultIsAnalysis,
      remark: category.remark || "",
      isActive: category.isActive,
    });
    setIsDialogOpen(true);
  }, [form]);

  // 提交表单
  const onSubmit: SubmitHandler<CategoryFormValues> = async (values) => {
    try {
      setIsSubmitting(true);
      let response;
      let result;

      if (editingCategory) {
        // 编辑模式
        // 如果修改了一级或二级分类名称，需要先删除旧分类再创建新分类
        if (
          editingCategory.level1Category !== values.level1Category ||
          editingCategory.level2Category !== values.level2Category
        ) {
          // 先检查新分类是否已存在
          const checkResponse = await fetch(
            `/api/categories/${encodeURIComponent(values.level1Category)}/${encodeURIComponent(values.level2Category)}`
          );
          const checkResult = await checkResponse.json();
          
          if (checkResult.success && checkResult.data) {
            setError("该分类已存在，无法重命名");
            setIsSubmitting(false);
            return;
          }

          // 先删除旧分类
          const deleteResponse = await fetch(
            `/api/categories/${encodeURIComponent(editingCategory.level1Category)}/${encodeURIComponent(editingCategory.level2Category)}`,
            { method: "DELETE" }
          );
          const deleteResult = await deleteResponse.json();
          
          if (!deleteResult.success) {
            setError(deleteResult.error || "删除旧分类失败");
            setIsSubmitting(false);
            return;
          }

          // 然后创建新分类
          response = await fetch("/api/categories", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(values),
          });
        } else {
          // 只更新其他字段
          response = await fetch(
            `/api/categories/${encodeURIComponent(values.level1Category)}/${encodeURIComponent(values.level2Category)}`,
            {
              method: "PUT",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                defaultType: values.defaultType,
                defaultIsAnalysis: values.defaultIsAnalysis,
                remark: values.remark || null,
                isActive: values.isActive,
              }),
            }
          );
        }
      } else {
        // 创建模式
        response = await fetch("/api/categories", {
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
      setEditingCategory(null);
      setError(null);
      await fetchCategories();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "保存失败，请重试";
      setError(errorMessage);
      console.error("保存分类失败:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  // 删除分类（乐观更新）
  const handleDelete = useCallback(async (category: Category) => {
    try {
      setIsDeleting(true);
      setError(null);
      
      // 乐观更新：立即从列表中移除
      setCategories((prev) =>
        prev.filter(
          (cat) =>
            !(
              cat.level1Category === category.level1Category &&
              cat.level2Category === category.level2Category
            )
        )
      );

      const response = await fetch(
        `/api/categories/${encodeURIComponent(category.level1Category)}/${encodeURIComponent(category.level2Category)}`,
        { method: "DELETE" }
      );
      const result = await response.json();
      
      if (result.success) {
        setDeleteConfirm(null);
        // 如果删除成功，重新获取以确保数据同步
        setTimeout(() => {
          fetchCategories();
        }, 100);
      } else {
        // 如果删除失败，恢复列表
        await fetchCategories();
        setError(result.error || "删除失败");
      }
    } catch (error) {
      // 如果出错，恢复列表
      await fetchCategories();
      const errorMessage = error instanceof Error ? error.message : "删除失败，请重试";
      setError(errorMessage);
      console.error("删除分类失败:", error);
    } finally {
      setIsDeleting(false);
    }
  }, [fetchCategories]);

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-black p-3 sm:p-4 pb-20">
      <div className="max-w-4xl mx-auto">
        {/* 头部 */}
        <div className="mb-4 sm:mb-6">
          <h1 className="text-xl sm:text-2xl font-bold text-zinc-900 dark:text-zinc-50 mb-1 sm:mb-2">
            分类管理
          </h1>
          <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400">
            管理您的收入、支出和资产变动分类
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
                  placeholder="搜索分类..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>

              {/* 筛选器 */}
              <div className="flex flex-wrap gap-2">
                <Select value={typeFilter} onValueChange={setTypeFilter}>
                  <SelectTrigger className="w-full sm:w-[140px]">
                    <Filter className="size-4 mr-2" />
                    <SelectValue placeholder="类型" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">全部类型</SelectItem>
                    <SelectItem value="income">收入</SelectItem>
                    <SelectItem value="expense">支出</SelectItem>
                    <SelectItem value="asset_change">资产变动</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={activeFilter} onValueChange={setActiveFilter}>
                  <SelectTrigger className="w-full sm:w-[140px]">
                    <SelectValue placeholder="状态" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">全部状态</SelectItem>
                    <SelectItem value="active">启用</SelectItem>
                    <SelectItem value="inactive">禁用</SelectItem>
                  </SelectContent>
                </Select>

                <Button
                  type="button"
                  onClick={() => handleCreate()}
                  className="w-full sm:w-auto sm:ml-auto"
                  size="sm"
                >
                  <Plus className="size-4 mr-2" />
                  新建分类
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 分类列表 */}
        {loading ? (
          <div className="text-center py-12">
            <Loader2 className="size-6 animate-spin mx-auto text-zinc-400 mb-2" />
            <p className="text-zinc-500">加载中...</p>
          </div>
        ) : error && categories.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-red-600 dark:text-red-400 mb-4">{error}</p>
              <Button type="button" onClick={fetchCategories} variant="outline">
                重试
              </Button>
            </CardContent>
          </Card>
        ) : Object.keys(groupedCategories).length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-zinc-500">
              {searchQuery ? "未找到匹配的分类" : "暂无分类数据"}
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {Object.entries(groupedCategories).map(([level1, cats]) => (
              <Card key={level1}>
                <CardHeader>
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <CardTitle className="text-lg flex-1 min-w-0">{level1}</CardTitle>
                    <Button
                      type="button"
                      variant="outline"
                      size="xs"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        handleCreate(level1);
                      }}
                      className="shrink-0 text-xs"
                    >
                      <Plus className="size-3 mr-1" />
                      <span className="hidden sm:inline">添加子分类</span>
                      <span className="sm:hidden">添加</span>
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {cats.map((cat) => (
                      <div
                        key={`${cat.level1Category}-${cat.level2Category}`}
                        className={`flex items-start justify-between gap-4 p-3 rounded-lg border transition-colors ${
                          !cat.isActive
                            ? "bg-zinc-100 dark:bg-zinc-800/50 border-zinc-200 dark:border-zinc-700 opacity-60"
                            : "bg-white dark:bg-zinc-900 hover:bg-zinc-50 dark:hover:bg-zinc-800"
                        }`}
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <span
                              className={`font-medium ${
                                !cat.isActive
                                  ? "text-zinc-400 dark:text-zinc-500 line-through"
                                  : "text-zinc-900 dark:text-zinc-50"
                              }`}
                            >
                              {cat.level2Category}
                            </span>
                            <Badge
                              className={`text-xs ${
                                !cat.isActive
                                  ? "bg-zinc-200 text-zinc-500 dark:bg-zinc-700 dark:text-zinc-400"
                                  : TYPE_CONFIG[cat.defaultType].color
                              }`}
                            >
                              {TYPE_CONFIG[cat.defaultType].label}
                            </Badge>
                            {!cat.isActive && (
                              <Badge variant="outline" className="text-xs border-zinc-300 dark:border-zinc-600">
                                已禁用
                              </Badge>
                            )}
                          </div>
                          {cat.remark && (
                            <p
                              className={`text-sm line-clamp-1 ${
                                !cat.isActive
                                  ? "text-zinc-400 dark:text-zinc-500"
                                  : "text-zinc-500 dark:text-zinc-400"
                              }`}
                            >
                              {cat.remark}
                            </p>
                          )}
                          <div
                            className={`flex items-center gap-4 mt-2 text-xs ${
                              !cat.isActive
                                ? "text-zinc-400 dark:text-zinc-500"
                                : "text-zinc-400"
                            }`}
                          >
                            <span>使用 {cat.usageCount} 次</span>
                            {cat.defaultIsAnalysis && !cat.isActive && (
                              <span className="text-zinc-400 dark:text-zinc-500 line-through">
                                计入分析
                              </span>
                            )}
                            {cat.defaultIsAnalysis && cat.isActive && (
                              <span className="text-green-600 dark:text-green-400">
                                计入分析
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon-xs"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              handleEdit(cat);
                            }}
                            disabled={isDeleting}
                          >
                            <Edit2 className="size-4" />
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon-xs"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              setDeleteConfirm(cat);
                            }}
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
          <DialogContent className="max-w-[calc(100vw-2rem)] sm:max-w-md max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingCategory ? "编辑分类" : "新建分类"}
              </DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="level1Category"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>一级分类 *</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="例如：生活支出"
                          {...field}
                          disabled={isSubmitting}
                        />
                      </FormControl>
                      {editingCategory && (
                        <FormDescription className="text-amber-600 dark:text-amber-400">
                          修改一级分类名称将创建新分类，原分类将被删除
                        </FormDescription>
                      )}
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
                      <FormControl>
                        <Input
                          placeholder="例如：餐饮"
                          {...field}
                          disabled={isSubmitting}
                        />
                      </FormControl>
                      {editingCategory && (
                        <FormDescription className="text-amber-600 dark:text-amber-400">
                          修改二级分类名称将创建新分类，原分类将被删除
                        </FormDescription>
                      )}
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="defaultType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>默认类型 *</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                        value={field.value}
                        disabled={isSubmitting}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="选择类型" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="income">收入</SelectItem>
                          <SelectItem value="expense">支出</SelectItem>
                          <SelectItem value="asset_change">资产变动</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="defaultIsAnalysis"
                  render={({ field }) => (
                    <FormItem className="flex items-center justify-between rounded-lg border p-4">
                      <div className="space-y-0.5">
                        <FormLabel>计入分析</FormLabel>
                        <FormDescription>
                          是否计入消费分析和预算执行
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

                <FormField
                  control={form.control}
                  name="isActive"
                  render={({ field }) => (
                    <FormItem className="flex items-center justify-between rounded-lg border p-4">
                      <div className="space-y-0.5">
                        <FormLabel>启用状态</FormLabel>
                        <FormDescription>
                          禁用后新流水将不推荐此分类
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

                <FormField
                  control={form.control}
                  name="remark"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>备注</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="分类说明（可选）"
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
                    ) : editingCategory ? (
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
                  确定要删除分类 <strong>{deleteConfirm.level1Category} / {deleteConfirm.level2Category}</strong> 吗？
                </p>
                {deleteConfirm.usageCount > 0 && (
                  <p className="text-sm text-amber-600 dark:text-amber-400">
                    此分类已被使用 {deleteConfirm.usageCount} 次，删除后将标记为不活跃。
                  </p>
                )}
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={(e) => {
                      e.preventDefault();
                      setDeleteConfirm(null);
                    }}
                    className="flex-1"
                    disabled={isDeleting}
                  >
                    取消
                  </Button>
                  <Button
                    type="button"
                    variant="destructive"
                    onClick={(e) => {
                      e.preventDefault();
                      handleDelete(deleteConfirm);
                    }}
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
