/**
 * 意图分拣定义 (Router Tools)
 * 核心目标：将用户请求快速分流到不同的业务处理逻辑
 */

export const routerTools = [
  {
    type: 'function',
    function: {
      name: 'route_to_task_manager',
      description: '当用户想要创建任务、安排日程、提醒事项或管理待办时，分拣到此路径。',
      parameters: {
        type: 'object',
        properties: {
          raw_request: { type: 'string', description: '原始需求简述' }
        },
        required: ['raw_request']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'route_to_knowledge_base',
      description: '当用户询问公司制度、技术百科、查找资料或寻求答案时，分拣到此路径。',
      parameters: {
        type: 'object',
        properties: {
          search_query: { type: 'string', description: '搜索关键词' }
        },
        required: ['search_query']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'route_to_chat',
      description: '当用户仅仅是打招呼、闲聊、或者上述分类都不匹配时，分拣到此路径。',
      parameters: {
        type: 'object',
        properties: {
          reply_tone: { type: 'string', enum: ['professional', 'friendly'], description: '回复语调建议' }
        }
      }
    }
  }
];
