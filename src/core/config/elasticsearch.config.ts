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
    numberOfShards: z.number().default(1),
    numberOfReplicas: z.number().default(0),
    
    // Specific indices
    incidents: z.string().default('incidents'),
    users: z.string().default('users'),
    notifications: z.string().default('notifications'),
    logs: z.string().default('logs'),
  }),
  
  // Search settings
  search: z.object({
    defaultSize: z.number().default(20),
    maxSize: z.number().default(100),
    scrollTimeout: z.string().default('1m'),
  }),
  
  // Bulk operations
  bulk: z.object({
    size: z.number().default(1000),
    flushInterval: z.number().default(5000), // ms
    concurrency: z.number().default(2),
  }),
});

type ElasticsearchConfig = z.infer<typeof ElasticsearchConfigSchema>;

export const elasticsearchConfig: ElasticsearchConfig = ElasticsearchConfigSchema.parse({
  node: process.env.ELASTICSEARCH_URL,
  auth: process.env.ELASTICSEARCH_USERNAME ? {
    username: process.env.ELASTICSEARCH_USERNAME,
    password: process.env.ELASTICSEARCH_PASSWORD,
  } : undefined,
  
  indices: {
    prefix: process.env.ES_INDEX_PREFIX,
    numberOfShards: process.env.ES_NUMBER_OF_SHARDS,
    numberOfReplicas: process.env.ES_NUMBER_OF_REPLICAS,
  },
});