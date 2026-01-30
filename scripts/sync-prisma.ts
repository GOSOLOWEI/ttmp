import { execSync } from 'child_process';

/**
 * 同步 Prisma 模型与数据库脚本
 * 职责：
 * 1. 执行 prisma generate 重新生成客户端代码和类型
 * 2. 验证 Prisma 客户端是否能识别新字段
 */
async function syncPrisma() {
  console.log('🚀 开始生成 Prisma Client...');
  
  try {
    // 1. 执行生成命令
    execSync('npx prisma generate', { stdio: 'inherit' });
    console.log('✅ Prisma Client 生成成功！');

    // 2. 动态加载并验证字段
    // 由于 Prisma Client 是生成的，且路径在 ../generated/prisma，我们使用 require 避免编译时错误
    console.log('🔍 验证模型字段...');
    const path = require('path');
    const clientPath = path.resolve(process.cwd(), 'generated/prisma');
    const { PrismaClient } = require(clientPath);
    const { PrismaPg } = require('@prisma/adapter-pg');
    
    const connectionString = process.env.DATABASE_URL;
    
    if (!connectionString) {
      throw new Error('DATABASE_URL is not set');
    }
    const adapter = new PrismaPg({ connectionString });
    const prisma = new PrismaClient({ adapter });
    
    // 验证连接
    const count = await prisma.subscription.count();
    console.log(`✅ 数据库连接正常，当前订阅总数: ${count}`);
    
    console.log('💡 同步完成！请重启开发服务器以加载最新的类型定义。');
    
    await prisma.$disconnect();
  } catch (error) {
    console.error('❌ 同步失败:', error);
    process.exit(1);
  }
}

syncPrisma();
