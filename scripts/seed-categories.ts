// 加载环境变量（必须在导入 prisma 之前）
import { config } from 'dotenv';

// 加载 .env.local 文件，如果不存在则加载 .env
config({ path: '.env.local' });
if (!process.env.DATABASE_URL) {
  config({ path: '.env' });
}

// 验证 DATABASE_URL
if (!process.env.DATABASE_URL) {
  console.error('❌ DATABASE_URL 未设置');
  console.error('💡 请在 .env.local 或 .env 文件中设置 DATABASE_URL');
  process.exit(1);
}

// 在种子脚本中直接创建 Prisma Client，避免模块加载时的初始化问题
import { PrismaClient } from '@/generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

// 获取并修复 DATABASE_URL 格式
function fixDatabaseUrl(url: string): string {
  if (!url || !url.includes('://')) {
    return url;
  }
  
  let connectionString = url.trim();
  const fullMatch = connectionString.match(/postgresql:\/\/([^:]+):([^@]+)@([^\/:]+)(?::(\d+))?(?:\/(?::(\d+))?\/)?([^\/\s?]+)/);
  
  if (fullMatch) {
    const [, user, pass, host, port1, port2, db] = fullMatch;
    const port = port2 || port1 || '5432';
    const needsFix = connectionString.includes('/:') || 
                     connectionString.match(/:\d+\/:(\d+)\//) ||
                     !port1 && port2 ||
                     connectionString !== `postgresql://${user}:${pass}@${host}:${port}/${db}`;
    
    if (needsFix && user && pass && host && db) {
      return `postgresql://${user}:${pass}@${host}:${port}/${db}`;
    }
  } else {
    // 宽松匹配：处理没有端口号的情况
    const looseMatch = connectionString.match(/postgresql:\/\/([^:]+):([^@]+)@([^\/]+)\/([^\/\s?]+)/);
    if (looseMatch) {
      const [, user, pass, hostAndPort, db] = looseMatch;
      const hostPortMatch = hostAndPort.match(/^([^:]+)(?::(\d+))?$/);
      if (hostPortMatch) {
        const [, host, port = '5432'] = hostPortMatch;
        return `postgresql://${user}:${pass}@${host}:${port}/${db}`;
      }
    }
  }
  
  return connectionString;
}

const connectionString = fixDatabaseUrl(process.env.DATABASE_URL!.trim());

const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

/**
 * 完整的分类体系种子数据
 * 包含收入分类和支出分类
 */

// 定义分类数据类型
interface CategoryData {
  level1Category: string;
  level2Category: string;
  defaultType: 'income' | 'expense' | 'asset_change';
  defaultIsAnalysis?: boolean;
  remark?: string;
}

// 收入分类数据
const incomeCategories: CategoryData[] = [
  // 1.1 工资与薪金
  {
    level1Category: '工资与薪金',
    level2Category: '基本工资',
    defaultType: 'income' as const,
    remark: '主要的固定收入来源'
  },
  {
    level1Category: '工资与薪金',
    level2Category: '奖金与津贴',
    defaultType: 'income' as const,
    remark: '包括年终奖金、绩效奖金、岗位津贴等'
  },

  // 1.2 投资收入
  {
    level1Category: '投资收入',
    level2Category: '股票分红',
    defaultType: 'income' as const,
    remark: '从股票投资中获得的分红收入'
  },
  {
    level1Category: '投资收入',
    level2Category: '债券利息',
    defaultType: 'income' as const,
    remark: '持有债券获得的利息收入'
  },
  {
    level1Category: '投资收入',
    level2Category: '基金分红',
    defaultType: 'income' as const,
    remark: '来自于基金的分红收入'
  },
  {
    level1Category: '投资收入',
    level2Category: '房地产出租收入',
    defaultType: 'income' as const,
    remark: '出租物业所得的租金收入'
  },
  {
    level1Category: '投资收入',
    level2Category: '其他投资收入',
    defaultType: 'income' as const,
    remark: '例如P2P、虚拟货币等投资收益'
  },

  // 1.3 副业收入
  {
    level1Category: '副业收入',
    level2Category: '兼职收入',
    defaultType: 'income' as const,
    remark: '例如做自由职业、网络工作、外卖等的收入'
  },
  {
    level1Category: '副业收入',
    level2Category: '平台收入',
    defaultType: 'income' as const,
    remark: '例如通过短视频平台、电子商务平台、知识分享平台获得的收入'
  },
  {
    level1Category: '副业收入',
    level2Category: '创作收入',
    defaultType: 'income' as const,
    remark: '例如写书、出专辑等创作类副业收入'
  },

  // 1.4 礼物与赠与
  {
    level1Category: '礼物与赠与',
    level2Category: '家庭或朋友赠与',
    defaultType: 'income' as const,
    remark: '父母、亲戚朋友赠送的资金'
  },
  {
    level1Category: '礼物与赠与',
    level2Category: '奖金与奖励',
    defaultType: 'income' as const,
    remark: '公司或其他机构发放的奖品、现金奖励等'
  },

  // 1.5 其他收入
  {
    level1Category: '其他收入',
    level2Category: '退款与退税',
    defaultType: 'income' as const,
    remark: '例如税务返还、退还商品款项等'
  },
  {
    level1Category: '其他收入',
    level2Category: '保险赔偿',
    defaultType: 'income' as const,
    remark: '例如健康保险、车险赔偿等'
  },
  {
    level1Category: '其他收入',
    level2Category: '偶发性收入',
    defaultType: 'income' as const,
    remark: '例如出售二手物品获得的收入，偶然的兼职等'
  },
];

// 支出分类数据
const expenseCategories: CategoryData[] = [
  // 2.1 生活支出
  {
    level1Category: '生活支出',
    level2Category: '餐饮',
    defaultType: 'expense' as const,
    remark: '包括日常饮食支出，如外出就餐、零食、外卖等'
  },
  {
    level1Category: '生活支出',
    level2Category: '住房',
    defaultType: 'expense' as const,
    remark: '租金、房贷、物业管理费、房屋维修等'
  },
  {
    level1Category: '生活支出',
    level2Category: '交通',
    defaultType: 'expense' as const,
    remark: '包括公共交通（地铁、公交）、私家车（油费、停车费、车险等）以及打车等交通费用'
  },
  {
    level1Category: '生活支出',
    level2Category: '通讯',
    defaultType: 'expense' as const,
    remark: '手机话费、互联网费用、固定电话费等'
  },
  {
    level1Category: '生活支出',
    level2Category: '水电煤气',
    defaultType: 'expense' as const,
    remark: '水费、电费、燃气费等日常生活必需费用'
  },

  // 2.2 娱乐与休闲
  {
    level1Category: '娱乐与休闲',
    level2Category: '娱乐活动',
    defaultType: 'expense' as const,
    remark: '包括电影、演出、音乐会、体育赛事等费用'
  },
  {
    level1Category: '娱乐与休闲',
    level2Category: '旅行与度假',
    defaultType: 'expense' as const,
    remark: '包括机票、酒店、景点门票等旅游相关费用'
  },
  {
    level1Category: '娱乐与休闲',
    level2Category: '健身与兴趣爱好',
    defaultType: 'expense' as const,
    remark: '如健身房会员费、瑜伽课、游泳等费用'
  },
  {
    level1Category: '娱乐与休闲',
    level2Category: '书籍与课程',
    defaultType: 'expense' as const,
    remark: '阅读材料、在线课程、培训等自我提升相关费用'
  },

  // 2.3 日常消费
  {
    level1Category: '日常消费',
    level2Category: '服饰',
    defaultType: 'expense' as const,
    remark: '购买衣物、鞋帽等个人用品'
  },
  {
    level1Category: '日常消费',
    level2Category: '化妆与个人护理',
    defaultType: 'expense' as const,
    remark: '护肤品、化妆品、理发、美甲等费用'
  },
  {
    level1Category: '日常消费',
    level2Category: '家居用品',
    defaultType: 'expense' as const,
    remark: '家具、家电、装饰品、日常用品等'
  },
  {
    level1Category: '日常消费',
    level2Category: '电子产品',
    defaultType: 'expense' as const,
    remark: '手机、电脑、电视、耳机等消费性电子产品'
  },

  // 2.4 教育与培训
  {
    level1Category: '教育与培训',
    level2Category: '学费',
    defaultType: 'expense' as const,
    remark: '子女或个人的学费、培训班学费等'
  },
  {
    level1Category: '教育与培训',
    level2Category: '教材与资料费',
    defaultType: 'expense' as const,
    remark: '学习资料、书籍购买费用等'
  },
  {
    level1Category: '教育与培训',
    level2Category: '考试与认证',
    defaultType: 'expense' as const,
    remark: '包括职业资格认证考试、英语考试、驾驶考试等费用'
  },

  // 2.5 医疗与健康
  {
    level1Category: '医疗与健康',
    level2Category: '医疗支出',
    defaultType: 'expense' as const,
    remark: '包括看病、检查、手术、药品等医疗费用'
  },
  {
    level1Category: '医疗与健康',
    level2Category: '健康保险',
    defaultType: 'expense' as const,
    remark: '包括购买的健康保险、医疗险等费用'
  },
  {
    level1Category: '医疗与健康',
    level2Category: '保健与营养品',
    defaultType: 'expense' as const,
    remark: '如补品、保健食品、体检等支出'
  },

  // 2.6 金融支出
  {
    level1Category: '金融支出',
    level2Category: '信用卡还款',
    defaultType: 'expense' as const,
    remark: '信用卡的月度账单及利息费用'
  },
  {
    level1Category: '金融支出',
    level2Category: '贷款偿还',
    defaultType: 'expense' as const,
    remark: '个人贷款（如房贷、车贷等）的还款'
  },
  {
    level1Category: '金融支出',
    level2Category: '投资支出',
    defaultType: 'expense' as const,
    remark: '如股票、基金等投资的本金和费用（例如交易手续费）'
  },

  // 2.7 家庭支出
  {
    level1Category: '家庭支出',
    level2Category: '子女教育',
    defaultType: 'expense' as const,
    remark: '子女的课外活动费、兴趣班、学前教育等费用'
  },
  {
    level1Category: '家庭支出',
    level2Category: '家庭日常用品',
    defaultType: 'expense' as const,
    remark: '购买家庭日用品、清洁用品、厨房用品等'
  },
  {
    level1Category: '家庭支出',
    level2Category: '老人赡养费',
    defaultType: 'expense' as const,
    remark: '如果有赡养父母或老人的支出'
  },

  // 2.8 社交与人际关系
  {
    level1Category: '社交与人际关系',
    level2Category: '礼物与馈赠',
    defaultType: 'expense' as const,
    remark: '送给亲友的生日礼物、节日礼品等'
  },
  {
    level1Category: '社交与人际关系',
    level2Category: '社交娱乐',
    defaultType: 'expense' as const,
    remark: '聚会、朋友聚餐、商务应酬等社交费用'
  },

  // 2.9 突发支出
  {
    level1Category: '突发支出',
    level2Category: '意外事故支出',
    defaultType: 'expense' as const,
    remark: '如车祸、突发健康问题、事故处理费用等'
  },
  {
    level1Category: '突发支出',
    level2Category: '维修与修理',
    defaultType: 'expense' as const,
    remark: '家庭或个人物品（如家电、汽车等）的维修费用'
  },
  {
    level1Category: '突发支出',
    level2Category: '法律费用',
    defaultType: 'expense' as const,
    remark: '如果涉及诉讼或法律纠纷时的律师费、诉讼费等'
  },

  // 2.10 储蓄与投资
  {
    level1Category: '储蓄与投资',
    level2Category: '储蓄',
    defaultType: 'expense' as const,
    remark: '每月定期存入的存款',
    defaultIsAnalysis: false // 储蓄不计入消费分析
  },
  {
    level1Category: '储蓄与投资',
    level2Category: '保险费用',
    defaultType: 'expense' as const,
    remark: '定期支付的寿险、意外险、养老险等'
  },
  {
    level1Category: '储蓄与投资',
    level2Category: '投资',
    defaultType: 'expense' as const,
    remark: '股票、基金、房地产等投资的支出',
    defaultIsAnalysis: false // 投资不计入消费分析
  },
];

async function seed() {
  console.log('🌱 开始创建分类数据...\n');

  // 测试数据库连接
  try {
    console.log('🔌 正在测试数据库连接...');
    await prisma.$connect();
    console.log('✅ 数据库连接成功\n');
  } catch (error: any) {
    console.error('❌ 数据库连接失败:', error.message);
    console.error('\n💡 请检查:');
    console.error('   1. DATABASE_URL 是否正确配置');
    console.error('   2. 数据库是否已创建');
    console.error('   3. 网络连接是否正常');
    console.error('\n📋 当前 DATABASE_URL 格式:', process.env.DATABASE_URL ? '已设置' : '未设置');
    process.exit(1);
  }

  const allCategories = [...incomeCategories, ...expenseCategories];
  let successCount = 0;
  let errorCount = 0;
  let skipCount = 0;

  for (const cat of allCategories) {
    try {
      // 使用类型断言，因为 Prisma Client 类型可能还未完全加载
      // 在 Prisma 7 中，模型名 Category 会被转换为小写的 category
      await (prisma as any).category.upsert({
        where: {
          level1Category_level2Category: {
            level1Category: cat.level1Category,
            level2Category: cat.level2Category
          }
        },
        create: {
          level1Category: cat.level1Category,
          level2Category: cat.level2Category,
          defaultType: cat.defaultType,
          defaultIsAnalysis: cat.defaultIsAnalysis ?? true,
          remark: cat.remark,
          isActive: true,
          usageCount: 0
        },
        update: {
          defaultType: cat.defaultType,
          defaultIsAnalysis: cat.defaultIsAnalysis ?? true,
          remark: cat.remark,
          isActive: true
        }
      });

      // 查询记录以判断是创建还是更新（用于统计显示）
      const existing = await (prisma as any).category.findUnique({
        where: {
          level1Category_level2Category: {
            level1Category: cat.level1Category,
            level2Category: cat.level2Category
          }
        }
      });

      // 如果记录已存在且有使用记录，视为更新；否则视为创建
      if (existing?.usageCount > 0) {
        console.log(`🔄 更新: ${cat.level1Category}/${cat.level2Category}`);
        skipCount++;
      } else {
        console.log(`✅ 创建: ${cat.level1Category}/${cat.level2Category}`);
        successCount++;
      }
    } catch (error: any) {
      console.error(`❌ 失败: ${cat.level1Category}/${cat.level2Category}`, error.message);
      errorCount++;
    }
  }

  console.log('\n📊 统计信息:');
  console.log(`✅ 成功创建: ${successCount} 个分类`);
  console.log(`🔄 已存在（已更新）: ${skipCount} 个分类`);
  console.log(`❌ 失败: ${errorCount} 个分类`);
  console.log(`📦 总计: ${allCategories.length} 个分类`);
  console.log('\n✅ 分类数据创建完成！');
}

seed()
  .catch((error) => {
    console.error('❌ 种子脚本执行失败:', error);
    if (error.message?.includes('does not exist')) {
      console.error('\n💡 数据库不存在，请先创建数据库:');
      console.error('   1. 连接到 PostgreSQL: psql -h <host> -U <user> -d postgres');
      console.error('   2. 创建数据库: CREATE DATABASE personal_finance_test;');
      console.error('   3. 运行: pnpm db:push');
    }
    process.exit(1);
  })
  .finally(async () => {
    try {
      await prisma.$disconnect();
    } catch (e) {
      // 忽略断开连接时的错误
    }
  });
