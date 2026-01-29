/**
 * 数据源实现导出
 */

export { PrismaDataSource } from './postgres-prisma';
export type { PrismaDataSourceOptions, PrismaClientLike } from './postgres-prisma';

// 示例数据源（供参考）
export {
  MemoryVectorSource,
  MemoryHistorySource,
  WeatherAPISource,
  DatabaseSource,
} from './examples';
