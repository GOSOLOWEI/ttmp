import { prisma } from '../lib/prisma';
import { TaggingRuleScope, TaggingRuleStatus, TaggingRuleSource } from '@/generated/prisma/client';

async function seedTaggingRules() {
  console.log('🌱 开始创建个人规则库种子数据...');

  const rules = [
    {
      ruleId: 'RULE_001',
      ruleName: '咖啡品牌自动分类',
      conditionText: '关键词包含 "瑞幸" 或 "Luckin" 或 "星巴克" 或 "Starbucks"',
      suggestedTags: JSON.stringify(['日常', '提神']),
      suggestedLevel2: '餐饮', // 假设餐饮下有更细的分类可以后续调整
      priority: 100,
      scope: TaggingRuleScope.tagging_only,
      status: TaggingRuleStatus.enabled,
      source: TaggingRuleSource.manual,
    },
    {
      ruleId: 'RULE_002',
      ruleName: '深夜餐饮冲动判定',
      conditionText: '时间在 22:00 - 04:00 之间 且 分类为 "餐饮"',
      suggestedTags: JSON.stringify(['冲动消费', '宵夜', '健康风险']),
      priority: 90,
      scope: TaggingRuleScope.both,
      status: TaggingRuleStatus.enabled,
      source: TaggingRuleSource.manual,
    },
    {
      ruleId: 'RULE_003',
      ruleName: '大额支出强提醒',
      conditionText: '单笔金额超过 1000 元',
      suggestedTags: JSON.stringify(['大额', '需核对']),
      priority: 80,
      scope: TaggingRuleScope.tagging_only,
      status: TaggingRuleStatus.enabled,
      source: TaggingRuleSource.manual,
    },
    {
      ruleId: 'RULE_004',
      ruleName: '打车加班属性判定',
      conditionText: '工作日 关键词包含 "滴滴" 或 "打车" 且 时间在 21:00 之后',
      suggestedTags: JSON.stringify(['加班', '交通', '可报销']),
      priority: 95,
      scope: TaggingRuleScope.tagging_only,
      status: TaggingRuleStatus.enabled,
      source: TaggingRuleSource.manual,
    }
  ];

  for (const rule of rules) {
    try {
      await (prisma as any).taggingRule.upsert({
        where: { ruleId: rule.ruleId },
        update: rule,
        create: rule,
      });
      console.log(`✅ 已同步规则: ${rule.ruleName}`);
    } catch (error: any) {
      console.error(`❌ 同步规则失败 ${rule.ruleName}:`, error.message);
    }
  }

  console.log('✨ 个人规则库种子数据创建完成！');
}

seedTaggingRules()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });