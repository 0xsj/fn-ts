// src/core/config/elasticsearch.config.ts
import { z } from 'zod';

const ElasticsearchConfigSchema = z.object({
  node: z.string().default('http://localhost:9200'),
  auth: z.object({
    username: z.string().optional(),
    password: z.string().optional(),
    apiKey: z.string().optional(),
  }).optional(),
  
  // Index settings
  indices: z.object({
    prefix: z.string().default('fn_'),
    numberOfShards: z.coerce.number().default(1),
    numberOfReplicas: z.coerce.number().default(0),
    
    // Specific indices
    incidents: z.string().default('incidents'),
    users: z.string().default('users'),
    notifications: z.string().default('notifications'),
    logs: z.string().default('logs'),
  }),
  
  // Search settings
  search: z.object({
    defaultSize: z.coerce.number().default(20),
    maxSize: z.coerce.number().default(100),
    scrollTimeout: z.string().default('1m'),
  }),
  
  // Bulk operations
  bulk: z.object({
    size: z.coerce.number().default(1000),
    flushInterval: z.coerce.number().default(5000), // ms
    concurrency: z.coerce.number().default(2),
  }),
});

type ElasticsearchConfig = z.infer<typeof ElasticsearchConfigSchema>;

export const elasticsearchConfig: ElasticsearchConfig = ElasticsearchConfigSchema.parse({
  node: process.env.ELASTICSEARCH_URL || 'http://localhost:9200',
  auth: process.env.ELASTICSEARCH_USERNAME ? {
    username: process.env.ELASTICSEARCH_USERNAME,
    password: process.env.ELASTICSEARCH_PASSWORD,
    apiKey: process.env.ELASTICSEARCH_API_KEY,
  } : undefined,
  
  indices: {
    prefix: process.env.ES_INDEX_PREFIX,
    numberOfShards: process.env.ES_NUMBER_OF_SHARDS,
    numberOfReplicas: process.env.ES_NUMBER_OF_REPLICAS,
    incidents: process.env.ES_INDEX_INCIDENTS,
    users: process.env.ES_INDEX_USERS,
    notifications: process.env.ES_INDEX_NOTIFICATIONS,
    logs: process.env.ES_INDEX_LOGS,
  },
  
  search: {
    defaultSize: process.env.ES_SEARCH_DEFAULT_SIZE,
    maxSize: process.env.ES_SEARCH_MAX_SIZE,
    scrollTimeout: process.env.ES_SEARCH_SCROLL_TIMEOUT,
  },
  
  bulk: {
    size: process.env.ES_BULK_SIZE,
    flushInterval: process.env.ES_BULK_FLUSH_INTERVAL,
    concurrency: process.env.ES_BULK_CONCURRENCY,
  },
});