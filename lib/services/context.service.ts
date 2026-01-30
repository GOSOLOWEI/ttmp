import { prisma } from '../prisma';
import { tagService } from './tag.service';

export interface AccountingContext {
  categoriesPrompt: string;
  rulesPrompt: string;
  tagsPrompt: string;
}

export const contextService = {
  /**
   * 聚合记账所需的上下文知识
   */
  async getAccountingContext(userId?: string): Promise<AccountingContext> {
    const [categories, rules, commonTags] = await Promise.all([
      this._getRankedCategories(),
      this._getActiveRules(userId),
      tagService.getCommonTags(30)
    ]);

    return {
      categoriesPrompt: this._formatCategories(categories),
      rulesPrompt: this._formatRules(rules),
      tagsPrompt: commonTags.map(t => t.tagName).join('、')
    };
  },

  /**
   * 获取按频率排序的分类
   */
  async _getRankedCategories() {
    return await prisma.category.findMany({
      where: { isActive: true },
      orderBy: { usageCount: 'desc' }
    });
  },

  /**
   * 获取激活的个人规则库
   */
  async _getActiveRules(userId?: string) {
    return await prisma.taggingRule.findMany({
      where: { 
        status: 'enabled',
      },
      orderBy: { priority: 'desc' }
    });
  },

  /**
   * 格式化分类为 Prompt 字符串
   */
  _formatCategories(categories: any[]) {
    if (categories.length === 0) return '无可用分类';
    return categories
      .map(c => `- ${c.level1Category}/${c.level2Category} [${c.defaultType === 'income' ? '收入' : '支出'}]${c.remark ? ` : ${c.remark}` : ''}`)
      .join('\n');
  },

  /**
   * 格式化个人规则为 Prompt 字符串
   */
  _formatRules(rules: any[]) {
    if (rules.length === 0) return '暂无个人偏好规则';
    return rules
      .map(r => `- [RuleID: ${r.ruleId}] 当命中条件 "${r.conditionText}" 时：建议标签为 [${r.suggestedTags}]${r.suggestedLevel2 ? `，建议分类为 ${r.suggestedLevel2}` : ''}`)
      .join('\n');
  }
};
