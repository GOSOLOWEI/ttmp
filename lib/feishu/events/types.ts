/**
 * 飞书事件处理器类型定义
 */

export interface EventHandler {
  /**
   * 飞书事件类型标识，例如 'im.chat.member.bot.added_v1'
   */
  type: string;
  
  /**
   * 处理函数
   * @param data 飞书推送的事件数据
   */
  handler: (data: any) => Promise<any>;
}
