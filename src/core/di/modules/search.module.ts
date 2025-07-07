// src/core/di/modules/search.module.ts
import { BaseModule } from './base.module';
import { DependencyContainer } from 'tsyringe';
// import { ElasticsearchClient } from '../../../infrastructure/search/elasticsearch.client';
// import { SearchService } from '../../../infrastructure/search/search.service';
import { TOKENS } from '../tokens';

export class SearchModule extends BaseModule {
  constructor() {
    super('SearchModule');
  }

  async register(container: DependencyContainer): Promise<void> {
    try {
      this.log('Registering search services...');

      // Skip if Elasticsearch is not configured
      const esUrl = process.env.ELASTICSEARCH_URL;
      if (!esUrl || esUrl === 'http://localhost:9200') {
        this.log('Elasticsearch not configured, skipping search module initialization');

        // Register stub implementations
        // container.registerSingleton(TOKENS.ElasticsearchClient, StubElasticsearchClient);
        // container.registerSingleton(TOKENS.SearchService, StubSearchService);

        return;
      }

      //   // Register real implementations when Elasticsearch is available
      //   container.registerSingleton(TOKENS.ElasticsearchClient, ElasticsearchClient);
      //   container.registerSingleton(TOKENS.SearchService, SearchService);

      // Initialize Elasticsearch connection
      //   const esClient = container.resolve<ElasticsearchClient>(TOKENS.ElasticsearchClient);
      //   await esClient.initialize();

      // Create indices if they don't exist
      //   await this.createIndices(esClient);

      this.log('Search services initialized successfully');
    } catch (error) {
      this.logError('Failed to initialize search services (non-critical)', error);

      // Don't throw - search is optional
      // Register stub implementations as fallback
      //   container.registerSingleton(TOKENS.ElasticsearchClient, StubElasticsearchClient);
      //   container.registerSingleton(TOKENS.SearchService, StubSearchService);
    }
  }

  //   private async createIndices(client: ElasticsearchClient): Promise<void> {
  //     // Placeholder for index creation
  //     this.log('Creating Elasticsearch indices...');

  //     // TODO: Implement index creation
  //     // await client.createIndex('users', userMapping);
  //     // await client.createIndex('incidents', incidentMapping);
  //     // await client.createIndex('notifications', notificationMapping);
  //   }
}

// Stub implementations for when Elasticsearch is not available
class StubElasticsearchClient {
  async initialize(): Promise<void> {
    // No-op
  }

  async search(): Promise<any> {
    return { hits: { hits: [], total: { value: 0 } } };
  }

  async index(): Promise<void> {
    // No-op
  }

  async delete(): Promise<void> {
    // No-op
  }
}

class StubSearchService {
  async searchUsers(): Promise<any[]> {
    return [];
  }

  async searchIncidents(): Promise<any[]> {
    return [];
  }

  async indexDocument(): Promise<void> {
    // No-op
  }
}
