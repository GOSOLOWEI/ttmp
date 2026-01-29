/**
 * 视觉 AI 服务
 * 负责多模态图像分析逻辑
 */

import { modelManager } from '../models/manager';

export const visionService = {
  /**
   * 使用豆包模型分析图片内容
   * @param imageBuffer 图片二进制数据
   * @param prompt 提示词
   */
  async analyzeImage(imageBuffer: Buffer, prompt: string = '请详细描述这张图片的内容。'): Promise<string> {
    const base64Image = imageBuffer.toString('base64');

    // 目前暂时硬编码为 png，飞书大部分图片资源都兼容此处理
    const dataUrl = `data:image/png;base64,${base64Image}`;

    const result = await modelManager.chat('doubao', [
      {
        role: 'user',
        content: [
          { type: 'text', text: prompt },
          {
            type: 'image_url',
            image_url: { url: dataUrl }
          }
        ]
      }
    ]);

    return result.choices[0].message.content as string;
  }
};
