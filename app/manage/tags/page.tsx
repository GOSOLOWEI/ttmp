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

// 标签数据接口
interface Tag {
  tagId: string;
  tagName: string;
  tagType: "psychological" | "goal" | "risk";
  description: string | null;
  usageCount: number;
  lastUsedAt: string | null;
  isActive: boolean;
}

// 表单验证 schema
const tagSchema = z.object({
  tagId: z.string().min(1, "标签 ID 不能为空").max(50, "ID 不能超过50个字符"),
  tagName: z.string().min(1, "标签名称不能为空").max(50, "名称不能超过50个字符"),
  tagType: z.enum(["psychological", "goal", "risk"]),
  description: z.string().max(200, "说明不能超过200个字符").optional().nullable(),
  isActive: z.boolean(),
});

type TagFormValues = z.infer<typeof tagSchema>;

// 标签类型配置常量
const TAG_TYPE_CONFIG: Record<"psychological" | "goal" | "risk", { label: string; color: string }> = {
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

export default function TagsPage() {
  const [tags, setTags] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [activeFilter, setActiveFilter] = useState<string>("all");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingTag, setEditingTag] = useState<Tag | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<Tag | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const form = useForm<TagFormValues>({
    resolver: zodResolver(tagSchema),
    defaultValues: {
      tagId: "",
      tagName: "",
      tagType: "psychological",
      description: "",
      isActive: true,
    },
  });

  // 获取标签列表
  const fetchTags = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const params = new URLSearchParams();
      if (typeFilter !== "all") {
        params.append("tagType", typeFilter);
      }
      if (activeFilter !== "all") {
        params.append("isActive", activeFilter === "active" ? "true" : "false");
      }

      const response = await fetch(`/api/tags?${params.toString()}`);
      const result = await response.json();
      
      if (result.success) {
        setTags(result.data);
      } else {
        setError(result.error || "获取标签失败");
        console.error("获取标签失败:", result.error);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "获取标签失败";
      setError(errorMessage);
      console.error("获取标签失败:", error);
    } finally {
      setLoading(false);
    }
  }, [typeFilter, activeFilter]);

  useEffect(() => {
    fetchTags();
  }, [fetchTags]);

  // 搜索过滤
  const filteredTags = useMemo(() => {
    if (!searchQuery.trim()) {
      return tags;
    }
    const query = searchQuery.toLowerCase();
    return tags.filter((tag) => {
      return (
        tag.tagName.toLowerCase().includes(query) ||
        tag.tagId.toLowerCase().includes(query) ||
        (tag.description && tag.description.toLowerCase().includes(query))
      );
    });
  }, [tags, searchQuery]);

  // 按标签类型分组
  const groupedTags = useMemo(() => {
    return filteredTags.reduce((acc, tag) => {
      if (!acc[tag.tagType]) {
        acc[tag.tagType] = [];
      }
      acc[tag.tagType].push(tag);
      return acc;
    }, {} as Record<string, Tag[]>);
  }, [filteredTags]);

  // 打开创建对话框
  const handleCreate = useCallback(() => {
    setEditingTag(null);
    form.reset({
      tagId: `TAG${String(Math.floor(Math.random() * 10000)).padStart(4, "0")}`,
      tagName: "",
      tagType: "psychological",
      description: "",
      isActive: true,
    });
    setIsDialogOpen(true);
  }, [form]);

  // 打开编辑对话框
  const handleEdit = useCallback((tag: Tag) => {
    setEditingTag(tag);
    form.reset({
      tagId: tag.tagId,
      tagName: tag.tagName,
      tagType: tag.tagType,
      description: tag.description || "",
      isActive: tag.isActive,
    });
    setIsDialogOpen(true);
  }, [form]);

  // 提交表单
  const onSubmit: SubmitHandler<TagFormValues> = async (values) => {
    try {
      setIsSubmitting(true);
      let response;
      let result;

      if (editingTag) {
        // 编辑模式
        // 如果修改了标签 ID，需要先删除旧标签再创建新标签
        if (editingTag.tagId !== values.tagId) {
          // 先检查新标签 ID 是否已存在
          const checkResponse = await fetch(
            `/api/tags/${encodeURIComponent(values.tagId)}`
          );
          const checkResult = await checkResponse.json();
          
          if (checkResult.success && checkResult.data) {
            setError("该标签 ID 已存在，无法重命名");
            setIsSubmitting(false);
            return;
          }

          // 先删除旧标签
          const deleteResponse = await fetch(
            `/api/tags/${encodeURIComponent(editingTag.tagId)}`,
            { method: "DELETE" }
          );
          const deleteResult = await deleteResponse.json();
          
          if (!deleteResult.success) {
            setError(deleteResult.error || "删除旧标签失败");
            setIsSubmitting(false);
            return;
          }

          // 然后创建新标签
          response = await fetch("/api/tags", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(values),
          });
        } else {
          // 只更新其他字段
          response = await fetch(
            `/api/tags/${encodeURIComponent(values.tagId)}`,
            {
              method: "PUT",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                tagName: values.tagName,
                tagType: values.tagType,
                description: values.description || null,
                isActive: values.isActive,
              }),
            }
          );
        }
      } else {
        // 创建模式
        response = await fetch("/api/tags", {
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
      setEditingTag(null);
      setError(null);
      await fetchTags();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "保存失败，请重试";
      setError(errorMessage);
      console.error("保存标签失败:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  // 删除标签（乐观更新）
  const handleDelete = useCallback(async (tag: Tag) => {
    try {
      setIsDeleting(true);
      setError(null);
      
      // 乐观更新：立即从列表中移除
      setTags((prev) => prev.filter((t) => t.tagId !== tag.tagId));

      const response = await fetch(
        `/api/tags/${encodeURIComponent(tag.tagId)}`,
        { method: "DELETE" }
      );
      const result = await response.json();
      
      if (result.success) {
        setDeleteConfirm(null);
        // 如果删除成功，重新获取以确保数据同步
        setTimeout(() => {
          fetchTags();
        }, 100);
      } else {
        // 如果删除失败，恢复列表
        await fetchTags();
        setError(result.error || "删除失败");
      }
    } catch (error) {
      // 如果出错，恢复列表
      await fetchTags();
      const errorMessage = error instanceof Error ? error.message : "删除失败，请重试";
      setError(errorMessage);
      console.error("删除标签失败:", error);
    } finally {
      setIsDeleting(false);
    }
  }, [fetchTags]);

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-black p-3 sm:p-4 pb-20">
      <div className="max-w-4xl mx-auto">
        {/* 头部 */}
        <div className="mb-4 sm:mb-6">
          <h1 className="text-xl sm:text-2xl font-bold text-zinc-900 dark:text-zinc-50 mb-1 sm:mb-2">
            标签管理
          </h1>
          <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400">
            管理您的心理、目标和风险标签
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
                  placeholder="搜索标签..."
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
                    <SelectItem value="psychological">心理</SelectItem>
                    <SelectItem value="goal">目标</SelectItem>
                    <SelectItem value="risk">风险</SelectItem>
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
                  新建标签
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 标签列表 */}
        {loading ? (
          <div className="text-center py-12">
            <Loader2 className="size-6 animate-spin mx-auto text-zinc-400 mb-2" />
            <p className="text-zinc-500">加载中...</p>
          </div>
        ) : error && tags.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-red-600 dark:text-red-400 mb-4">{error}</p>
              <Button type="button" onClick={fetchTags} variant="outline">
                重试
              </Button>
            </CardContent>
          </Card>
        ) : Object.keys(groupedTags).length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-zinc-500">
              {searchQuery ? "未找到匹配的标签" : "暂无标签数据"}
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {Object.entries(groupedTags).map(([tagType, tagList]) => (
              <Card key={tagType}>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Badge className={TAG_TYPE_CONFIG[tagType as keyof typeof TAG_TYPE_CONFIG].color}>
                      {TAG_TYPE_CONFIG[tagType as keyof typeof TAG_TYPE_CONFIG].label}
                    </Badge>
                    <span className="text-zinc-500 dark:text-zinc-400 text-sm font-normal">
                      ({tagList.length} 个标签)
                    </span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {tagList.map((tag) => (
                      <div
                        key={tag.tagId}
                        className={`flex items-start justify-between gap-4 p-3 rounded-lg border transition-colors ${
                          !tag.isActive
                            ? "bg-zinc-100 dark:bg-zinc-800/50 border-zinc-200 dark:border-zinc-700 opacity-60"
                            : "bg-white dark:bg-zinc-900 hover:bg-zinc-50 dark:hover:bg-zinc-800"
                        }`}
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <span
                              className={`font-medium ${
                                !tag.isActive
                                  ? "text-zinc-400 dark:text-zinc-500 line-through"
                                  : "text-zinc-900 dark:text-zinc-50"
                              }`}
                            >
                              {tag.tagName}
                            </span>
                            {!tag.isActive && (
                              <Badge variant="outline" className="text-xs border-zinc-300 dark:border-zinc-600">
                                已禁用
                              </Badge>
                            )}
                          </div>
                          {tag.description && (
                            <p
                              className={`text-sm line-clamp-1 ${
                                !tag.isActive
                                  ? "text-zinc-400 dark:text-zinc-500"
                                  : "text-zinc-500 dark:text-zinc-400"
                              }`}
                            >
                              {tag.description}
                            </p>
                          )}
                          <div
                            className={`flex items-center gap-4 mt-2 text-xs ${
                              !tag.isActive
                                ? "text-zinc-400 dark:text-zinc-500"
                                : "text-zinc-400"
                            }`}
                          >
                            <span>使用 {tag.usageCount} 次</span>
                            {tag.lastUsedAt && (
                              <span>最后使用: {new Date(tag.lastUsedAt).toLocaleDateString("zh-CN")}</span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon-xs"
                            onClick={() => handleEdit(tag)}
                            disabled={isDeleting}
                          >
                            <Edit2 className="size-4" />
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon-xs"
                            onClick={() => setDeleteConfirm(tag)}
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
                {editingTag ? "编辑标签" : "新建标签"}
              </DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="tagId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>标签 ID *</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="例如：TAG001"
                          {...field}
                          disabled={isSubmitting || !!editingTag}
                        />
                      </FormControl>
                      {editingTag && (
                        <FormDescription className="text-amber-600 dark:text-amber-400">
                          修改标签 ID 将创建新标签，原标签将被删除
                        </FormDescription>
                      )}
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="tagName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>标签名称 *</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="例如：冲动消费"
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
                  name="tagType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>标签类型 *</FormLabel>
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
                          {Object.entries(TAG_TYPE_CONFIG).map(([value, config]) => (
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
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>标签说明</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="标签说明（可选）"
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
                  name="isActive"
                  render={({ field }) => (
                    <FormItem className="flex items-center justify-between rounded-lg border p-4">
                      <div className="space-y-0.5">
                        <FormLabel>启用状态</FormLabel>
                        <FormDescription>
                          禁用后新流水将不推荐此标签
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
                    ) : editingTag ? (
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
                  确定要删除标签 <strong>{deleteConfirm.tagName}</strong> 吗？
                </p>
                {deleteConfirm.usageCount > 0 && (
                  <p className="text-sm text-amber-600 dark:text-amber-400">
                    此标签已被使用 {deleteConfirm.usageCount} 次，删除后将标记为不活跃。
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
