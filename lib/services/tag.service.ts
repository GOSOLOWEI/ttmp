import { prisma } from '../prisma';
import { TagType } from '@/generated/prisma/client';

/**
 * 标签管理服务 (Tag Service)
 * 职责：处理标签的原子化计数更新、新标签的管控创建以及 AI 上下文提取
 */
export const tagService = {
  /**
   * 批量处理交易关联的标签
   * 逻辑：
   * 1. 标准化标签名称（去空格、限长）
   * 2. 原子化增加现有标签计数
   * 3. 如果标签不存在且符合管控规则，则静默创建
   */
  async processTransactionTags(tagNames: string[]) {
    if (!tagNames || tagNames.length === 0) return;

    // 去重并标准化
    const uniqueTags = Array.from(new Set(tagNames.map(n => n.trim()).filter(n => n.length >= 2)));

    for (const name of uniqueTags) {
      const sanitizedName = name.slice(0, 10); // 标签限长 10 字符

      try {
        // 1. 尝试更新现有标签计数
        // 使用 updateMany 是为了避免记录不存在时抛出异常
        const updateResult = await prisma.tag.updateMany({
          where: { tagName: sanitizedName },
          data: {
            usageCount: { increment: 1 },
            lastUsedAt: new Date()
          }
        });

        // 2. 如果没有任何记录被更新，说明是新标签，尝试创建
        if (updateResult.count === 0) {
          // 管控规则：
          // - 标签必须是 2-6 个汉字（简化为长度校验）
          // - 这里的逻辑可以根据需要增加非法字符过滤
          if (sanitizedName.length <= 6) {
            await prisma.tag.create({
              data: {
                tagId: `TAG${Date.now()}${Math.floor(Math.random() * 1000)}`,
                tagName: sanitizedName,
                tagType: TagType.psychological, // AI 自动创建的默认为心理主观类
                usageCount: 1,
                lastUsedAt: new Date(),
                isActive: true
              }
            }).catch(e => {
              // 容错：处理并发下的唯一索引冲突
              console.warn(`[TagService] 并发创建标签冲突: ${sanitizedName}`, e.message);
            });
          }
        }
      } catch (err: any) {
        console.error(`[TagService] 处理标签失败: ${sanitizedName}`, err.message);
      }
    }
  },

  /**
   * 获取最常用的标签列表作为 AI 上下文参考
   */
  async getCommonTags(limit: number = 30) {
    return await prisma.tag.findMany({
      where: { isActive: true },
      orderBy: { usageCount: 'desc' },
      take: limit,
      select: { tagName: true }
    });
  }
};
