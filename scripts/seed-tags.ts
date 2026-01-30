import { prisma } from '../lib/prisma';
import { TagType } from '../generated/prisma/client';

async function seedTags() {
  const initialTags = [
    { name: '刚需', type: TagType.psychological, desc: '生活必须支出' },
    { name: '欲望', type: TagType.psychological, desc: '改善生活质量的非必须支出' },
    { name: '奖励自己', type: TagType.psychological, desc: '完成目标后的自我激励' },
    { name: '冲动消费', type: TagType.psychological, desc: '未经过深思熟虑的购买' },
    { name: '工作', type: TagType.psychological, desc: '与职业相关的支出' },
    { name: '社交', type: TagType.psychological, desc: '聚会、随礼等社交活动' },
    { name: '自我提升', type: TagType.psychological, desc: '学习、健身等投资自己的支出' },
    { name: '加班', type: TagType.psychological, desc: '因加班产生的额外支出' },
    { name: '大额', type: TagType.risk, desc: '超出单笔平均水平的支出' },
    { name: '高频', type: TagType.risk, desc: '短时间内重复发生的支出' },
    { name: '超支风险', type: TagType.risk, desc: '可能导致月度预算透支的支出' },
  ];

  console.log('🌱 开始预置标签数据...');

  for (const tag of initialTags) {
    await prisma.tag.upsert({
      where: { tagName: tag.name },
      update: {},
      create: {
        tagId: `TAG_INIT_${Math.random().toString(36).slice(2, 7)}`,
        tagName: tag.name,
        tagType: tag.type,
        description: tag.desc,
        isActive: true,
        usageCount: 0
      }
    });
  }

  console.log('✅ 标签预置完成！');
}

seedTags()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
