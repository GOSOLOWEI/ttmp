/**
 * 飞书资源管理工具
 * 负责处理消息附件（图片、文件、语音等）的下载与格式转换
 */

import { getFeishuClient } from './client';
import { Readable } from 'stream';

/**
 * 获取飞书消息资源并转换为 Buffer
 * 自动处理 SDK 返回的多种格式 (writeFile, getReadableStream, Buffer, etc.)
 */
export async function getFeishuResourceBuffer(messageId: string, fileKey: string, type: 'image' | 'file'): Promise<Buffer> {
  const client = getFeishuClient();

  const response: any = await client.im.messageResource.get({
    params: { type },
    path: { message_id: messageId, file_key: fileKey },
  });

  if (response.code && response.code !== 0) {
    throw new Error(`飞书资源接口报错: [${response.code}] ${response.msg}`);
  }

  // 1. 优先尝试通过 getReadableStream 获取流 (常见于较新版本 SDK)
  let stream: Readable | null = null;
  if (typeof response.getReadableStream === 'function') {
    stream = response.getReadableStream();
  } else if (response instanceof Readable || typeof response.pipe === 'function') {
    stream = response;
  } else if (response.data && (response.data instanceof Readable || response.data.pipe)) {
    stream = response.data;
  }

  // 2. 如果成功获取到流，聚合为 Buffer
  if (stream) {
    const chunks: any[] = [];
    for await (const chunk of stream) {
      chunks.push(chunk);
    }
    return Buffer.concat(chunks);
  }

  // 3. 检查是否直接返回了 Buffer
  if (Buffer.isBuffer(response)) {
    return response;
  } 
  
  if (response.data && Buffer.isBuffer(response.data)) {
    return response.data;
  }

  throw new Error('无法解析飞书返回的资源数据格式，未匹配到流或 Buffer');
}
