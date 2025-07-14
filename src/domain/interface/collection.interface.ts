// src/domain/interface/collection.interface.ts
import { AsyncResult } from '../../shared/response';
import {
  Collection,
  CollectionDB,
  CollectionItem,
  CollectionItemDB,
  CollectionTypeConfig,
  CollectionTypeConfigDB,
  CreateCollectionInput,
  UpdateCollectionInput,
  CreateCollectionItemInput,
  CreateCollectionTypeConfigInput,
  CollectionSearchInput,
  CollectionStatus,
  CollectionPriority,
  ItemSource,
} from '../entities';

export interface ICollection {
  // ============================================
  // COLLECTION TYPE CONFIGURATION
  // ============================================
  createCollectionTypeConfig(
    input: CreateCollectionTypeConfigInput & { organizationId: string; createdBy: string },
    correlationId?: string,
  ): AsyncResult<CollectionTypeConfig>;

  findCollectionTypeConfigById(
    id: string,
    correlationId?: string,
  ): AsyncResult<CollectionTypeConfig | null>;

  findCollectionTypeConfigByKey(
    organizationId: string,
    typeKey: string,
    correlationId?: string,
  ): AsyncResult<CollectionTypeConfig | null>;

  findCollectionTypeConfigsByOrganization(
    organizationId: string,
    includeInactive?: boolean,
  ): AsyncResult<CollectionTypeConfig[]>;

  updateCollectionTypeConfig(
    id: string,
    updates: Partial<CreateCollectionTypeConfigInput>,
    correlationId?: string,
  ): AsyncResult<CollectionTypeConfig | null>;

  deactivateCollectionTypeConfig(id: string): AsyncResult<boolean>;

  activateCollectionTypeConfig(id: string): AsyncResult<boolean>;

  validateCollectionTypeConfigKey(
    organizationId: string,
    typeKey: string,
    excludeId?: string,
  ): AsyncResult<boolean>;

  // ============================================
  // COLLECTION OPERATIONS
  // ============================================
  createCollection(
    input: CreateCollectionInput & {
      organizationId: string;
      createdByUserId: string;
    },
    correlationId?: string,
  ): AsyncResult<Collection>;

  findCollectionById(
    id: string,
    includeDeleted?: boolean,
    correlationId?: string,
  ): AsyncResult<Collection | null>;

  findCollectionByNumber(
    collectionNumber: string,
    organizationId: string,
    correlationId?: string,
  ): AsyncResult<Collection | null>;

  findCollectionsByIds(ids: string[], includeDeleted?: boolean): AsyncResult<Collection[]>;

  updateCollection(
    id: string,
    updates: UpdateCollectionInput,
    updatedBy: string,
    correlationId?: string,
  ): AsyncResult<Collection | null>;

  deleteCollection(
    id: string,
    deletedBy: string,
    hard?: boolean,
    correlationId?: string,
  ): AsyncResult<boolean>;

  restoreCollection(id: string, correlationId?: string): AsyncResult<boolean>;

  // ============================================
  // COLLECTION STATUS & WORKFLOW
  // ============================================
  updateCollectionStatus(
    id: string,
    status: string,
    updatedBy: string,
    notes?: string,
    correlationId?: string,
  ): AsyncResult<boolean>;

  updateCollectionPriority(
    id: string,
    priority: string,
    updatedBy: string,
    correlationId?: string,
  ): AsyncResult<boolean>;

  assignCollection(
    id: string,
    assignedToUserId: string,
    assignedBy: string,
    correlationId?: string,
  ): AsyncResult<boolean>;

  unassignCollection(
    id: string,
    unassignedBy: string,
    correlationId?: string,
  ): AsyncResult<boolean>;

  updateCollectionWorkflowState(
    id: string,
    workflowState: Record<string, unknown>,
    updatedBy: string,
    correlationId?: string,
  ): AsyncResult<boolean>;

  // ============================================
  // COLLECTION SEARCH & FILTERING
  // ============================================
  searchCollections(
    search: CollectionSearchInput & { organizationId: string },
    correlationId?: string,
  ): AsyncResult<{ collections: Collection[]; total: number }>;

  findCollectionsByType(
    organizationId: string,
    collectionType: string,
    options?: {
      status?: string[];
      priority?: string[];
      assignedTo?: string;
      limit?: number;
      offset?: number;
    },
  ): AsyncResult<Collection[]>;

  findCollectionsByUser(
    userId: string,
    options?: {
      role?: 'assigned' | 'created' | 'owner' | 'any';
      collectionType?: string[];
      status?: string[];
      includeDeleted?: boolean;
      limit?: number;
      offset?: number;
    },
  ): AsyncResult<Collection[]>;

  findCollectionsByOrganization(
    organizationId: string,
    options?: {
      collectionType?: string[];
      status?: string[];
      priority?: string[];
      includeDeleted?: boolean;
      limit?: number;
      offset?: number;
    },
  ): AsyncResult<Collection[]>;

  findRelatedCollections(
    collectionId: string,
    includeParent?: boolean,
    includeChildren?: boolean,
  ): AsyncResult<{
    parent: Collection | null;
    children: Collection[];
    related: Collection[];
  }>;

  // ============================================
  // COLLECTION CUSTOM FIELDS
  // ============================================
  updateCollectionCustomFields(
    id: string,
    customFields: Record<string, unknown>,
    updatedBy: string,
    correlationId?: string,
  ): AsyncResult<boolean>;

  validateCollectionCustomFields(
    collectionType: string,
    organizationId: string,
    customFields: Record<string, unknown>,
  ): AsyncResult<{
    isValid: boolean;
    errors: Array<{ field: string; message: string }>;
  }>;

  // ============================================
  // COLLECTION ITEMS
  // ============================================
  createCollectionItem(
    collectionId: string,
    input: CreateCollectionItemInput & { createdByUserId: string },
    correlationId?: string,
  ): AsyncResult<CollectionItem>;

  findCollectionItemById(id: string, correlationId?: string): AsyncResult<CollectionItem | null>;

  findCollectionItems(
    collectionId: string,
    options?: {
      itemType?: string;
      status?: string;
      visibility?: string;
      userId?: string; // For access control
      limit?: number;
      offset?: number;
      sortBy?: 'created_at' | 'order_index' | 'priority';
      sortOrder?: 'asc' | 'desc';
    },
  ): AsyncResult<CollectionItem[]>;

  updateCollectionItem(
    id: string,
    updates: Partial<CreateCollectionItemInput>,
    updatedBy: string,
    correlationId?: string,
  ): AsyncResult<CollectionItem | null>;

  deleteCollectionItem(id: string, deletedBy: string, correlationId?: string): AsyncResult<boolean>;

  reorderCollectionItems(
    collectionId: string,
    itemIds: string[],
    updatedBy: string,
    correlationId?: string,
  ): AsyncResult<boolean>;

  updateCollectionItemStatus(
    id: string,
    status: 'active' | 'resolved' | 'archived' | 'superseded',
    updatedBy: string,
    correlationId?: string,
  ): AsyncResult<boolean>;

  // ============================================
  // COLLECTION METRICS & ANALYTICS
  // ============================================
  updateCollectionMetrics(
    id: string,
    metrics: Partial<Collection['metrics']>,
    correlationId?: string,
  ): AsyncResult<boolean>;

  incrementCollectionViewCount(id: string): AsyncResult<boolean>;

  getCollectionMetrics(
    id: string,
    correlationId?: string,
  ): AsyncResult<Collection['metrics'] | null>;

  getCollectionTypeMetrics(
    organizationId: string,
    collectionType: string,
    dateRange?: { from: Date; to: Date },
  ): AsyncResult<{
    totalCollections: number;
    statusBreakdown: Record<string, number>;
    priorityBreakdown: Record<string, number>;
    averageResolutionTime: number | null;
    activeCollections: number;
  }>;

  // ============================================
  // COLLECTION APPROVAL WORKFLOW
  // ============================================
  submitCollectionForApproval(
    id: string,
    submittedBy: string,
    notes?: string,
    correlationId?: string,
  ): AsyncResult<boolean>;

  approveCollection(
    id: string,
    approvedBy: string,
    notes?: string,
    correlationId?: string,
  ): AsyncResult<boolean>;

  rejectCollection(
    id: string,
    rejectedBy: string,
    reason: string,
    correlationId?: string,
  ): AsyncResult<boolean>;

  findCollectionsPendingApproval(
    organizationId: string,
    collectionType?: string,
    limit?: number,
  ): AsyncResult<Collection[]>;

  // ============================================
  // COLLECTION TAGS & CATEGORIZATION
  // ============================================
  addCollectionTags(
    id: string,
    tags: string[],
    addedBy: string,
    correlationId?: string,
  ): AsyncResult<boolean>;

  removeCollectionTags(
    id: string,
    tags: string[],
    removedBy: string,
    correlationId?: string,
  ): AsyncResult<boolean>;

  findCollectionsByTags(
    organizationId: string,
    tags: string[],
    matchAll?: boolean,
    collectionType?: string,
  ): AsyncResult<Collection[]>;

  getPopularTags(
    organizationId: string,
    collectionType?: string,
    limit?: number,
  ): AsyncResult<Array<{ tag: string; count: number }>>;

  // ============================================
  // COLLECTION FLAGS & PROPERTIES
  // ============================================
  updateCollectionFlags(
    id: string,
    flags: Partial<Collection['flags']>,
    updatedBy: string,
    correlationId?: string,
  ): AsyncResult<boolean>;

  pinCollection(id: string, pinnedBy: string, correlationId?: string): AsyncResult<boolean>;

  unpinCollection(id: string, unpinnedBy: string, correlationId?: string): AsyncResult<boolean>;

  lockCollection(
    id: string,
    lockedBy: string,
    reason?: string,
    correlationId?: string,
  ): AsyncResult<boolean>;

  unlockCollection(id: string, unlockedBy: string, correlationId?: string): AsyncResult<boolean>;

  // ============================================
  // COLLECTION TEMPLATES
  // ============================================
  createCollectionTemplate(
    input: CreateCollectionInput & {
      organizationId: string;
      createdByUserId: string;
      templateName: string;
      templateDescription?: string;
    },
    correlationId?: string,
  ): AsyncResult<Collection>;

  findCollectionTemplates(
    organizationId: string,
    collectionType?: string,
  ): AsyncResult<Collection[]>;

  createCollectionFromTemplate(
    templateId: string,
    input: Partial<CreateCollectionInput> & {
      createdByUserId: string;
      title: string;
    },
    correlationId?: string,
  ): AsyncResult<Collection>;

  // ============================================
  // COLLECTION NUMBERING
  // ============================================
  generateCollectionNumber(
    organizationId: string,
    collectionType: string,
    correlationId?: string,
  ): AsyncResult<string>;

  validateCollectionNumber(
    organizationId: string,
    collectionNumber: string,
    excludeId?: string,
  ): AsyncResult<boolean>;

  // ============================================
  // BULK OPERATIONS
  // ============================================
  bulkUpdateCollections(
    ids: string[],
    updates: {
      status?: string;
      priority?: string;
      assignedToUserId?: string;
      tags?: { add?: string[]; remove?: string[] };
      flags?: Partial<Collection['flags']>;
    },
    updatedBy: string,
    correlationId?: string,
  ): AsyncResult<{ updated: number; failed: Array<{ id: string; error: string }> }>;

  bulkDeleteCollections(
    ids: string[],
    deletedBy: string,
    hard?: boolean,
    correlationId?: string,
  ): AsyncResult<{ deleted: number; failed: Array<{ id: string; error: string }> }>;

  bulkCreateCollections(
    collections: Array<
      CreateCollectionInput & {
        organizationId: string;
        createdByUserId: string;
      }
    >,
    correlationId?: string,
  ): AsyncResult<{
    created: Collection[];
    failed: Array<{ index: number; error: string }>;
  }>;

  // ============================================
  // EXTERNAL INTEGRATION
  // ============================================
  findCollectionByExternalId(
    organizationId: string,
    externalId: string,
    source: ItemSource,
  ): AsyncResult<Collection | null>;

  syncCollectionWithExternal(
    id: string,
    externalData: Record<string, unknown>,
    source: ItemSource,
    correlationId?: string,
  ): AsyncResult<boolean>;

  findCollectionsForSync(
    organizationId: string,
    source: ItemSource,
    lastSyncAfter?: Date,
    limit?: number,
  ): AsyncResult<Collection[]>;

  // ============================================
  // COLLECTION ACTIVITY & AUDIT
  // ============================================
  recordCollectionActivity(
    collectionId: string,
    activityType: string,
    userId: string,
    details?: Record<string, unknown>,
    correlationId?: string,
  ): AsyncResult<boolean>;

  getCollectionActivity(
    collectionId: string,
    options?: {
      activityType?: string;
      userId?: string;
      from?: Date;
      to?: Date;
      limit?: number;
      offset?: number;
    },
  ): AsyncResult<
    Array<{
      id: string;
      activityType: string;
      userId: string;
      details: Record<string, unknown>;
      createdAt: Date;
    }>
  >;

  updateLastActivity(
    collectionId: string,
    activityType: string,
    userId: string,
    correlationId?: string,
  ): AsyncResult<boolean>;

  // ============================================
  // VALIDATION & UTILITIES
  // ============================================
  validateCollectionAccess(
    collectionId: string,
    userId: string,
    action: 'read' | 'write' | 'delete' | 'assign',
  ): AsyncResult<boolean>;

  checkCollectionConstraints(
    collectionId: string,
    correlationId?: string,
  ): AsyncResult<{
    canEdit: boolean;
    canDelete: boolean;
    canAssign: boolean;
    constraints: string[];
  }>;

  getCollectionStatistics(
    organizationId: string,
    options?: {
      collectionType?: string[];
      dateRange?: { from: Date; to: Date };
      groupBy?: 'type' | 'status' | 'priority' | 'assignee';
    },
  ): AsyncResult<Record<string, number>>;

  // ============================================
  // CLEANUP & MAINTENANCE
  // ============================================
  archiveOldCollections(
    organizationId: string,
    collectionType: string,
    olderThan: Date,
    dryRun?: boolean,
  ): AsyncResult<{ archived: number; collections: string[] }>;

  cleanupDeletedCollections(
    organizationId: string,
    deletedBefore: Date,
    dryRun?: boolean,
  ): AsyncResult<{ cleaned: number; collections: string[] }>;

  reindexCollectionSearch(
    organizationId: string,
    collectionType?: string,
  ): AsyncResult<{ reindexed: number }>;
}
