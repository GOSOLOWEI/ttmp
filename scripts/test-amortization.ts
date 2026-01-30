/**
 * 增强版：预付分摊逻辑多场景测试脚本
 * 运行方式: pnpm dlx tsx --env-file=.env.local scripts/test-amortization.ts
 */

import { accountingService } from '../lib/services/accounting.service';
import { prisma } from '../lib/prisma';
import { PaymentChannel, PrepaidStatus } from '@/generated/prisma/client';

async function clearTestData(prefix: string) {
  await prisma.transaction.deleteMany({ where: { sourceId: { startsWith: prefix } } });
  await prisma.prepaidExpense.deleteMany({ where: { prepaidId: { startsWith: prefix } } });
}

async function runTestScenario(name: string, fn: () => Promise<void>) {
  console.log(`\n🚀 场景: ${name}`);
  try {
    await fn();
    console.log(`✅ [${name}] 测试通过`);
  } catch (e: any) {
    console.error(`❌ [${name}] 测试失败: ${e.message}`);
  }
}

async function main() {
  const PREFIX = 'TC-';
  await clearTestData(PREFIX);

  // --- 场景 1: 标准分摊 ---
  await runTestScenario('TC-01 标准分摊', async () => {
    const id = 'TC-01-STD';
    await prisma.prepaidExpense.create({
      data: {
        prepaidId: id,
        expenseName: '标准测试',
        level1Category: '生活支出',
        level2Category: '餐饮',
        totalAmount: 100,
        startMonth: '2026-01',
        endMonth: '2026-02',
        months: 2,
        monthlyAmount: 50,
        paymentChannel: PaymentChannel.wechat,
        status: PrepaidStatus.in_progress,
      }
    });

    await accountingService.runAmortization('2026-01');
    const tx = await prisma.transaction.findFirst({ where: { sourceId: id } });
    if (!tx || Number(tx.amount) !== -50) throw new Error('金额或流水生成错误');
  });

  // --- 场景 2: 尾差自动补齐 (100 / 3 = 33.33... ) ---
  await runTestScenario('TC-02 尾差补齐', async () => {
    const id = 'TC-02-EDGE';
    await prisma.prepaidExpense.create({
      data: {
        prepaidId: id,
        expenseName: '尾差测试',
        level1Category: '生活支出',
        level2Category: '其他',
        totalAmount: 100.00,
        startMonth: '2026-01',
        endMonth: '2026-03',
        months: 3,
        monthlyAmount: 33.33,
        paymentChannel: PaymentChannel.wechat,
        status: PrepaidStatus.in_progress,
      }
    });

    await accountingService.runAmortization('2026-01'); // 33.33
    await accountingService.runAmortization('2026-02'); // 33.33
    await accountingService.runAmortization('2026-03'); // 33.34 (100 - 66.66)

    const lastTx = await prisma.transaction.findFirst({ 
      where: { sourceId: id, description: { contains: '(2026-03)' } } 
    });
    
    const amount = Math.abs(Number(lastTx?.amount));
    console.log(`   - 第三期金额: ${amount}`);
    if (amount !== 33.34) throw new Error(`最后一笔应为 33.34，实为 ${amount}`);
    
    const prepaid = await prisma.prepaidExpense.findUnique({ where: { prepaidId: id } });
    if (prepaid?.status !== PrepaidStatus.completed) throw new Error('状态未正确变为已完成');
  });

  // --- 场景 3: 幂等性 (防重复) ---
  await runTestScenario('TC-03 幂等防重', async () => {
    const id = 'TC-03-IDEM';
    await prisma.prepaidExpense.create({
      data: {
        prepaidId: id,
        expenseName: '重复执行测试',
        level1Category: '生活支出',
        level2Category: '交通',
        totalAmount: 100,
        startMonth: '2026-01',
        endMonth: '2026-01',
        months: 1,
        monthlyAmount: 100,
        paymentChannel: PaymentChannel.wechat,
        status: PrepaidStatus.in_progress,
      }
    });

    // 连续执行两次
    await accountingService.runAmortization('2026-01');
    await accountingService.runAmortization('2026-01');

    const count = await prisma.transaction.count({ where: { sourceId: id } });
    if (count !== 1) throw new Error(`流水重复生成：期望 1 笔，实际 ${count} 笔`);
  });

  // --- 场景 4: 跨年分摊 ---
  await runTestScenario('TC-04 跨年分摊', async () => {
    const id = 'TC-04-YEAR';
    await prisma.prepaidExpense.create({
      data: {
        prepaidId: id,
        expenseName: '跨年测试',
        level1Category: '生活支出',
        level2Category: '住房',
        totalAmount: 200,
        startMonth: '2025-12',
        endMonth: '2026-01',
        months: 2,
        monthlyAmount: 100,
        paymentChannel: PaymentChannel.bank_card,
        status: PrepaidStatus.in_progress,
      }
    });

    await accountingService.runAmortization('2025-12');
    await accountingService.runAmortization('2026-01');

    const count = await prisma.transaction.count({ where: { sourceId: id } });
    if (count !== 2) throw new Error('跨年流水生成笔数不正确');
  });

}

main()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect());
