/**
 * 环境配置管理
 * 使用 Zod 进行运行时类型校验，确保所有必要的环境变量均已正确配置。
 */

import { z } from 'zod';

const envSchema = z.object({
  // 飞书基础配置
  FEISHU_APP_ID: z.string().min(1, "缺少 FEISHU_APP_ID"),
  FEISHU_APP_SECRET: z.string().min(1, "缺少 FEISHU_APP_SECRET"),
  
  // 飞书安全配置（可选，但在生产环境建议配置）
  FEISHU_ENCRYPT_KEY: z.string().optional(),
  FEISHU_VERIFICATION_TOKEN: z.string().optional(),
  
  // 飞书域名配置，默认为飞书官网域名
  FEISHU_DOMAIN: z.string().default("https://open.feishu.cn"),

  // 运行环境
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
});

// 解析环境变量
const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error("❌ 环境变量校验失败:");
  parsed.error.issues.forEach((issue) => {
    console.error(`   - [${issue.path.join(".")}] ${issue.message}`);
  });
  // 在非生产环境下，我们抛出错误以提醒开发者
  if (process.env.NODE_ENV !== 'production') {
    throw new Error("Invalid environment variables");
  }
}

/**
 * 导出经过校验且具有类型提示的环境变量对象
 */
export const env = parsed.success ? parsed.data : (process.env as unknown as z.infer<typeof envSchema>);
