/**
 * 飞书多维表格（Bitable）数据源
 */

import { getFeishuClient } from '../../feishu/client';
import { handleResponse } from '../../feishu/utils';
import type { BitableOptions, BitableFormatterType } from '../../feishu/types';
import type { DataSource, DataSourceResult } from '../datasource';

export class BitableDataSource implements DataSource {
  id = 'feishu-bitable';

  constructor(private options: BitableOptions & { formatter?: BitableFormatterType }) {}

  /**
   * 格式化记录字段
   */
  private formatFields(fields: Record<string, any>, formatter?: BitableFormatterType): string {
    const type = formatter || 'json';

    if (typeof type === 'function') {
      return type(fields);
    }

    switch (type) {
      case 'markdown':
        return Object.entries(fields)
          .map(([k, v]) => `**${k}**: ${typeof v === 'object' ? JSON.stringify(v) : v}`)
          .join('\n');
      case 'text':
        return Object.entries(fields)
          .map(([k, v]) => `${k}: ${typeof v === 'object' ? JSON.stringify(v) : v}`)
          .join('\n');
      case 'json':
      default:
        return JSON.stringify(fields);
    }
  }

  async fetch(query: string, fetchOptions?: Record<string, any>): Promise<DataSourceResult[]> {
    const client = getFeishuClient();
    const { appToken, tableId, viewId, filter, fieldNames, formatter } = this.options;

    const finalFilter = fetchOptions?.filter || filter;
    const limit = fetchOptions?.limit || 20;
    
    let allItems: any[] = [];
    let pageToken: string | undefined = undefined;

    // 自动分页逻辑
    do {
      const response = await client.bitable.appTableRecord.list({
        path: {
          app_token: appToken,
          table_id: tableId,
        },
        params: {
          view_id: viewId,
          filter: finalFilter,
          page_size: Math.min(limit - allItems.length, 100),
          page_token: pageToken,
          field_names: fieldNames?.join(','), // 优化：直接在 API 侧过滤字段
        },
      });

      const data = handleResponse(response);
      if (data.items) {
        allItems = allItems.concat(data.items);
      }
      pageToken = data.page_token;
    } while (pageToken && allItems.length < limit);

    return allItems.map((item) => {
      return {
        content: this.formatFields(item.fields, formatter),
        metadata: {
          recordId: item.record_id,
          appToken,
          tableId,
          rawFields: item.fields,
        },
      };
    });
  }
}
