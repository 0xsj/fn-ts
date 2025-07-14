// src/domain/entities/schemas/collection.schema.ts
import { z } from 'zod';
import {
  BaseEntitySchema,
  BaseEntityDBSchema,
  SoftDeletableDBSchema,
  SoftDeletableSchema,
} from './entity.schema';

// ============================================
// Universal Collection System
// ============================================

// Universal status framework - organizations can map their statuses to these
export const CollectionStatus = z.enum([
  'draft',
  'active',
  'pending',
  'in_progress',
  'on_hold',
  'review',
  'approved',
  'completed',
  'resolved',
  'closed',
  'cancelled',
  'archived',
]);

export const CollectionPriority = z.enum([
  'lowest',
  'low',
  'normal',
  'high',
  'highest',
  'urgent',
  'critical',
]);

export const ItemSource = z.enum([
  'manual',
  'automated',
  'imported',
  'api',
  'integration',
  'system',
]);

// ============================================
// Collection Type Configuration Schema
// ============================================
export const CollectionTypeConfigDBSchema = BaseEntityDBSchema.extend({
  // Type identification
  type_key: z.string(), // e.g., "incident", "ticket", "case", "project"
  display_name: z.string(), // e.g., "Support Ticket", "Legal Case"
  display_name_plural: z.string(), // e.g., "Support Tickets", "Legal Cases"
  description: z.string().nullable(),
  icon: z.string().nullable(),
  color: z.string().nullable(),

  // Organization this config belongs to
  organization_id: z.string().uuid(),

  // Workflow configuration
  statuses: z.array(
    z.object({
      key: z.string(),
      label: z.string(),
      color: z.string().nullable(),
      description: z.string().nullable(),
      is_initial: z.boolean().default(false),
      is_final: z.boolean().default(false),
      order: z.number(),
    }),
  ),

  priorities: z.array(
    z.object({
      key: z.string(),
      label: z.string(),
      color: z.string().nullable(),
      description: z.string().nullable(),
      order: z.number(),
    }),
  ),

  // Custom field definitions
  field_definitions: z.array(
    z.object({
      key: z.string(),
      label: z.string(),
      type: z.enum([
        'text',
        'textarea',
        'rich_text',
        'number',
        'decimal',
        'currency',
        'date',
        'datetime',
        'time',
        'boolean',
        'select',
        'multi_select',
        'checkbox_group',
        'radio_group',
        'file',
        'files',
        'user',
        'users',
        'email',
        'phone',
        'url',
        'json',
        'calculated',
      ]),
      required: z.boolean().default(false),
      options: z
        .array(
          z.object({
            value: z.string(),
            label: z.string(),
            color: z.string().nullable(),
            description: z.string().nullable(),
          }),
        )
        .nullable(), // For select fields
      validation: z
        .object({
          min: z.number().nullable(),
          max: z.number().nullable(),
          pattern: z.string().nullable(),
          custom: z.string().nullable(), // Custom validation rule
        })
        .nullable(),
      default_value: z.unknown().nullable(),
      help_text: z.string().nullable(),
      placeholder: z.string().nullable(),
      order: z.number(),
      section: z.string().nullable(), // Group fields into sections
      is_searchable: z.boolean().default(false),
      is_required_for_completion: z.boolean().default(false),
    }),
  ),

  // Item type definitions (sub-types within collections)
  item_types: z
    .array(
      z.object({
        key: z.string(),
        label: z.string(),
        description: z.string().nullable(),
        icon: z.string().nullable(),
        color: z.string().nullable(),
        field_definitions: z.array(
          z.object({
            key: z.string(),
            label: z.string(),
            type: z.enum([
              'text',
              'textarea',
              'rich_text',
              'number',
              'date',
              'datetime',
              'boolean',
              'select',
              'multi_select',
              'file',
              'json',
            ]),
            required: z.boolean().default(false),
            options: z
              .array(
                z.object({
                  value: z.string(),
                  label: z.string(),
                }),
              )
              .nullable(),
            validation: z.record(z.unknown()).nullable(),
            order: z.number(),
            help_text: z.string().nullable(),
          }),
        ),
      }),
    )
    .default([]),

  // Permissions & access control
  permissions: z
    .object({
      create: z.array(z.string()), // Role slugs or user IDs
      read: z.array(z.string()),
      update: z.array(z.string()),
      delete: z.array(z.string()),
      assign: z.array(z.string()),
      close: z.array(z.string()),
    })
    .default({
      create: [],
      read: [],
      update: [],
      delete: [],
      assign: [],
      close: [],
    }),

  // UI configuration
  ui_config: z
    .object({
      list_view: z.object({
        fields: z.array(z.string()),
        default_sort: z
          .object({
            field: z.string(),
            direction: z.enum(['asc', 'desc']),
          })
          .nullable(),
        filters: z.array(z.string()),
        bulk_actions: z.array(z.string()),
      }),
      detail_view: z.object({
        sections: z.array(
          z.object({
            title: z.string(),
            fields: z.array(z.string()),
            collapsible: z.boolean().default(false),
            columns: z.number().default(1),
          }),
        ),
        tabs: z
          .array(
            z.object({
              key: z.string(),
              label: z.string(),
              content_type: z.enum(['fields', 'items', 'activity', 'custom']),
              fields: z.array(z.string()).nullable(),
            }),
          )
          .default([]),
      }),
      quick_actions: z
        .array(
          z.object({
            key: z.string(),
            label: z.string(),
            action: z.string(),
            icon: z.string().nullable(),
            requires_permission: z.string().nullable(),
          }),
        )
        .default([]),
    })
    .default({
      list_view: {
        fields: [],
        default_sort: null,
        filters: [],
        bulk_actions: [],
      },
      detail_view: {
        sections: [],
        tabs: [],
      },
      quick_actions: [],
    }),

  // Integration settings
  integrations: z
    .object({
      external_id_field: z.string().nullable(),
      webhook_events: z.array(z.string()).default([]),
      api_endpoints: z.record(z.unknown()).default({}),
      sync_settings: z.record(z.unknown()).default({}),
    })
    .default({
      external_id_field: null,
      webhook_events: [],
      api_endpoints: {},
      sync_settings: {},
    }),

  // Behavior settings
  settings: z
    .object({
      auto_number_format: z.string().nullable(), // e.g., "TKT-{YYYY}-{######}"
      auto_number_counter: z.number().default(1),
      allows_attachments: z.boolean().default(true),
      allows_comments: z.boolean().default(true),
      allows_items: z.boolean().default(true),
      tracks_time: z.boolean().default(false),
      requires_approval: z.boolean().default(false),
      auto_assign: z.boolean().default(false),
      auto_archive_days: z.number().nullable(),
      notification_settings: z
        .object({
          on_create: z.boolean().default(true),
          on_update: z.boolean().default(true),
          on_assign: z.boolean().default(true),
          on_complete: z.boolean().default(true),
        })
        .default({
          on_create: true,
          on_update: true,
          on_assign: true,
          on_complete: true,
        }),
    })
    .default({
      auto_number_format: null,
      auto_number_counter: 1,
      allows_attachments: true,
      allows_comments: true,
      allows_items: true,
      tracks_time: false,
      requires_approval: false,
      auto_assign: false,
      auto_archive_days: null,
      notification_settings: {
        on_create: true,
        on_update: true,
        on_assign: true,
        on_complete: true,
      },
    }),

  // Status
  is_active: z.boolean().default(true),
  created_by: z.string().uuid(),
});

// ============================================
// Core Collection Schema (DB)
// ============================================
export const CollectionDBSchema = SoftDeletableDBSchema.extend({
  // Basic identification
  collection_number: z.string(), // Auto-generated based on type config
  title: z.string(),
  description: z.string().nullable(),

  // Type system
  collection_type: z.string(), // References CollectionTypeConfig.type_key
  sub_type: z.string().nullable(),

  // Status & Priority (using configured values)
  status: z.string(), // Must match configured status keys
  priority: z.string(), // Must match configured priority keys

  // Assignment & ownership
  assigned_to_user_id: z.string().uuid().nullable(),
  assigned_to_team: z.string().nullable(),
  owner_user_id: z.string().uuid().nullable(),
  created_by_user_id: z.string().uuid(),

  // Organization
  organization_id: z.string().uuid(),

  // Timing
  due_at: z.date().nullable(),
  started_at: z.date().nullable(),
  completed_at: z.date().nullable(),
  closed_at: z.date().nullable(),

  // External integration
  source: ItemSource.default('manual'),
  external_id: z.string().nullable(),
  external_data: z.record(z.unknown()).nullable(),

  // Custom fields (defined by collection type)
  custom_fields: z.record(z.unknown()).default({}),

  // Relationships
  parent_collection_id: z.string().uuid().nullable(),
  related_collection_ids: z.array(z.string().uuid()).default([]),

  // Communication
  primary_thread_id: z.string().uuid().nullable(),

  // Tracking & metrics
  metrics: z
    .object({
      view_count: z.number().default(0),
      item_count: z.number().default(0),
      comment_count: z.number().default(0),
      attachment_count: z.number().default(0),
      time_spent_minutes: z.number().default(0),
      edit_count: z.number().default(0),
    })
    .default({
      view_count: 0,
      item_count: 0,
      comment_count: 0,
      attachment_count: 0,
      time_spent_minutes: 0,
      edit_count: 0,
    }),

  // Universal flags
  flags: z
    .object({
      is_pinned: z.boolean().default(false),
      is_confidential: z.boolean().default(false),
      requires_attention: z.boolean().default(false),
      is_template: z.boolean().default(false),
      is_public: z.boolean().default(false),
      is_locked: z.boolean().default(false),
    })
    .default({
      is_pinned: false,
      is_confidential: false,
      requires_attention: false,
      is_template: false,
      is_public: false,
      is_locked: false,
    }),

  // Flexible tagging
  tags: z.array(z.string()).default([]),

  // Workflow state (for complex workflows)
  workflow_state: z.record(z.unknown()).nullable(),

  // Approval system
  approval_status: z.enum(['pending', 'approved', 'rejected']).nullable(),
  approved_by: z.string().uuid().nullable(),
  approved_at: z.date().nullable(),
  approval_notes: z.string().nullable(),

  // Activity tracking
  last_activity_at: z.date().nullable(),
  last_activity_type: z.string().nullable(),
  last_activity_user_id: z.string().uuid().nullable(),
});

// ============================================
// Collection Items Schema (things within collections)
// ============================================
export const CollectionItemDBSchema = BaseEntityDBSchema.extend({
  collection_id: z.string().uuid(),

  // Item classification
  item_type: z.string(), // References configured item types
  title: z.string().nullable(),
  content: z.string(),

  // Structured data based on item type
  structured_data: z.record(z.unknown()).nullable(),

  // Authorship
  created_by_user_id: z.string().uuid(),

  // Visibility & access
  visibility: z.enum(['public', 'internal', 'restricted', 'private']).default('internal'),
  access_control: z
    .object({
      users: z.array(z.string().uuid()).default([]),
      teams: z.array(z.string()).default([]),
      roles: z.array(z.string()).default([]),
    })
    .default({
      users: [],
      teams: [],
      roles: [],
    }),

  // Attachments
  file_ids: z.array(z.string().uuid()).default([]),

  // Timing
  occurred_at: z.date().nullable(),
  valid_from: z.date().nullable(),
  valid_until: z.date().nullable(),

  // Priority & actions
  priority: z.enum(['low', 'normal', 'high', 'urgent']).default('normal'),
  requires_action: z.boolean().default(false),
  action_due_at: z.date().nullable(),
  action_assigned_to: z.string().uuid().nullable(),

  // Status
  status: z.enum(['active', 'resolved', 'archived', 'superseded']).default('active'),
  resolved_at: z.date().nullable(),
  resolved_by: z.string().uuid().nullable(),

  // Relationships
  parent_item_id: z.string().uuid().nullable(),
  thread_id: z.string().uuid().nullable(),

  // Flexible properties
  properties: z.record(z.unknown()).default({}),
  tags: z.array(z.string()).default([]),

  // Order within collection
  order_index: z.number().default(0),
});

// ============================================
// Application Schemas (camelCase)
// ============================================
export const CollectionTypeConfigSchema = BaseEntitySchema.extend({
  typeKey: z.string(),
  displayName: z.string(),
  displayNamePlural: z.string(),
  description: z.string().nullable(),
  icon: z.string().nullable(),
  color: z.string().nullable(),

  organizationId: z.string().uuid(),

  statuses: z.array(
    z.object({
      key: z.string(),
      label: z.string(),
      color: z.string().nullable(),
      description: z.string().nullable(),
      isInitial: z.boolean(),
      isFinal: z.boolean(),
      order: z.number(),
    }),
  ),

  priorities: z.array(
    z.object({
      key: z.string(),
      label: z.string(),
      color: z.string().nullable(),
      description: z.string().nullable(),
      order: z.number(),
    }),
  ),

  fieldDefinitions: z.array(
    z.object({
      key: z.string(),
      label: z.string(),
      type: z.enum([
        'text',
        'textarea',
        'rich_text',
        'number',
        'decimal',
        'currency',
        'date',
        'datetime',
        'time',
        'boolean',
        'select',
        'multi_select',
        'checkbox_group',
        'radio_group',
        'file',
        'files',
        'user',
        'users',
        'email',
        'phone',
        'url',
        'json',
        'calculated',
      ]),
      required: z.boolean(),
      options: z
        .array(
          z.object({
            value: z.string(),
            label: z.string(),
            color: z.string().nullable(),
            description: z.string().nullable(),
          }),
        )
        .nullable(),
      validation: z
        .object({
          min: z.number().nullable(),
          max: z.number().nullable(),
          pattern: z.string().nullable(),
          custom: z.string().nullable(),
        })
        .nullable(),
      defaultValue: z.unknown().nullable(),
      helpText: z.string().nullable(),
      placeholder: z.string().nullable(),
      order: z.number(),
      section: z.string().nullable(),
      isSearchable: z.boolean(),
      isRequiredForCompletion: z.boolean(),
    }),
  ),

  itemTypes: z.array(
    z.object({
      key: z.string(),
      label: z.string(),
      description: z.string().nullable(),
      icon: z.string().nullable(),
      color: z.string().nullable(),
      fieldDefinitions: z.array(
        z.object({
          key: z.string(),
          label: z.string(),
          type: z.enum([
            'text',
            'textarea',
            'rich_text',
            'number',
            'date',
            'datetime',
            'boolean',
            'select',
            'multi_select',
            'file',
            'json',
          ]),
          required: z.boolean(),
          options: z
            .array(
              z.object({
                value: z.string(),
                label: z.string(),
              }),
            )
            .nullable(),
          validation: z.record(z.unknown()).nullable(),
          order: z.number(),
          helpText: z.string().nullable(),
        }),
      ),
    }),
  ),

  permissions: z.object({
    create: z.array(z.string()),
    read: z.array(z.string()),
    update: z.array(z.string()),
    delete: z.array(z.string()),
    assign: z.array(z.string()),
    close: z.array(z.string()),
  }),

  uiConfig: z.object({
    listView: z.object({
      fields: z.array(z.string()),
      defaultSort: z
        .object({
          field: z.string(),
          direction: z.enum(['asc', 'desc']),
        })
        .nullable(),
      filters: z.array(z.string()),
      bulkActions: z.array(z.string()),
    }),
    detailView: z.object({
      sections: z.array(
        z.object({
          title: z.string(),
          fields: z.array(z.string()),
          collapsible: z.boolean(),
          columns: z.number(),
        }),
      ),
      tabs: z.array(
        z.object({
          key: z.string(),
          label: z.string(),
          contentType: z.enum(['fields', 'items', 'activity', 'custom']),
          fields: z.array(z.string()).nullable(),
        }),
      ),
    }),
    quickActions: z.array(
      z.object({
        key: z.string(),
        label: z.string(),
        action: z.string(),
        icon: z.string().nullable(),
        requiresPermission: z.string().nullable(),
      }),
    ),
  }),

  integrations: z.object({
    externalIdField: z.string().nullable(),
    webhookEvents: z.array(z.string()),
    apiEndpoints: z.record(z.unknown()),
    syncSettings: z.record(z.unknown()),
  }),

  settings: z.object({
    autoNumberFormat: z.string().nullable(),
    autoNumberCounter: z.number(),
    allowsAttachments: z.boolean(),
    allowsComments: z.boolean(),
    allowsItems: z.boolean(),
    tracksTime: z.boolean(),
    requiresApproval: z.boolean(),
    autoAssign: z.boolean(),
    autoArchiveDays: z.number().nullable(),
    notificationSettings: z.object({
      onCreate: z.boolean(),
      onUpdate: z.boolean(),
      onAssign: z.boolean(),
      onComplete: z.boolean(),
    }),
  }),

  isActive: z.boolean(),
  createdBy: z.string().uuid(),
});

export const CollectionSchema = SoftDeletableSchema.extend({
  collectionNumber: z.string(),
  title: z.string(),
  description: z.string().nullable(),

  collectionType: z.string(),
  subType: z.string().nullable(),

  status: z.string(),
  priority: z.string(),

  assignedToUserId: z.string().uuid().nullable(),
  assignedToTeam: z.string().nullable(),
  ownerUserId: z.string().uuid().nullable(),
  createdByUserId: z.string().uuid(),

  organizationId: z.string().uuid(),

  dueAt: z.date().nullable(),
  startedAt: z.date().nullable(),
  completedAt: z.date().nullable(),
  closedAt: z.date().nullable(),

  source: ItemSource,
  externalId: z.string().nullable(),
  externalData: z.record(z.unknown()).nullable(),

  customFields: z.record(z.unknown()),

  parentCollectionId: z.string().uuid().nullable(),
  relatedCollectionIds: z.array(z.string().uuid()),

  primaryThreadId: z.string().uuid().nullable(),

  metrics: z.object({
    viewCount: z.number(),
    itemCount: z.number(),
    commentCount: z.number(),
    attachmentCount: z.number(),
    timeSpentMinutes: z.number(),
    editCount: z.number(),
  }),

  flags: z.object({
    isPinned: z.boolean(),
    isConfidential: z.boolean(),
    requiresAttention: z.boolean(),
    isTemplate: z.boolean(),
    isPublic: z.boolean(),
    isLocked: z.boolean(),
  }),

  tags: z.array(z.string()),

  workflowState: z.record(z.unknown()).nullable(),

  approvalStatus: z.enum(['pending', 'approved', 'rejected']).nullable(),
  approvedBy: z.string().uuid().nullable(),
  approvedAt: z.date().nullable(),
  approvalNotes: z.string().nullable(),

  lastActivityAt: z.date().nullable(),
  lastActivityType: z.string().nullable(),
  lastActivityUserId: z.string().uuid().nullable(),
});

export const CollectionItemSchema = BaseEntitySchema.extend({
  collectionId: z.string().uuid(),

  itemType: z.string(),
  title: z.string().nullable(),
  content: z.string(),

  structuredData: z.record(z.unknown()).nullable(),

  createdByUserId: z.string().uuid(),

  visibility: z.enum(['public', 'internal', 'restricted', 'private']),
  accessControl: z.object({
    users: z.array(z.string().uuid()),
    teams: z.array(z.string()),
    roles: z.array(z.string()),
  }),

  fileIds: z.array(z.string().uuid()),

  occurredAt: z.date().nullable(),
  validFrom: z.date().nullable(),
  validUntil: z.date().nullable(),

  priority: z.enum(['low', 'normal', 'high', 'urgent']),
  requiresAction: z.boolean(),
  actionDueAt: z.date().nullable(),
  actionAssignedTo: z.string().uuid().nullable(),

  status: z.enum(['active', 'resolved', 'archived', 'superseded']),
  resolvedAt: z.date().nullable(),
  resolvedBy: z.string().uuid().nullable(),

  parentItemId: z.string().uuid().nullable(),
  threadId: z.string().uuid().nullable(),

  properties: z.record(z.unknown()),
  tags: z.array(z.string()),

  orderIndex: z.number(),
});

// ============================================
// Input Schemas
// ============================================
export const CreateCollectionTypeConfigSchema = z.object({
  typeKey: z
    .string()
    .min(1)
    .regex(/^[a-z_]+$/),
  displayName: z.string().min(1),
  displayNamePlural: z.string().min(1),
  description: z.string().optional(),
  icon: z.string().optional(),
  color: z.string().optional(),

  statuses: z
    .array(
      z.object({
        key: z.string().min(1),
        label: z.string().min(1),
        color: z.string().optional(),
        description: z.string().optional(),
        isInitial: z.boolean().default(false),
        isFinal: z.boolean().default(false),
        order: z.number(),
      }),
    )
    .min(1),

  priorities: z
    .array(
      z.object({
        key: z.string().min(1),
        label: z.string().min(1),
        color: z.string().optional(),
        description: z.string().optional(),
        order: z.number(),
      }),
    )
    .min(1),

  fieldDefinitions: z
    .array(
      z.object({
        key: z.string().min(1),
        label: z.string().min(1),
        type: z.enum([
          'text',
          'textarea',
          'rich_text',
          'number',
          'decimal',
          'currency',
          'date',
          'datetime',
          'time',
          'boolean',
          'select',
          'multi_select',
          'checkbox_group',
          'radio_group',
          'file',
          'files',
          'user',
          'users',
          'email',
          'phone',
          'url',
          'json',
          'calculated',
        ]),
        required: z.boolean().default(false),
        options: z
          .array(
            z.object({
              value: z.string(),
              label: z.string(),
              color: z.string().optional(),
              description: z.string().optional(),
            }),
          )
          .optional(),
        validation: z
          .object({
            min: z.number().optional(),
            max: z.number().optional(),
            pattern: z.string().optional(),
            custom: z.string().optional(),
          })
          .optional(),
        defaultValue: z.unknown().optional(),
        helpText: z.string().optional(),
        placeholder: z.string().optional(),
        order: z.number(),
        section: z.string().optional(),
        isSearchable: z.boolean().default(false),
        isRequiredForCompletion: z.boolean().default(false),
      }),
    )
    .default([]),

  settings: z
    .object({
      autoNumberFormat: z.string().optional(),
      allowsAttachments: z.boolean().default(true),
      allowsComments: z.boolean().default(true),
      allowsItems: z.boolean().default(true),
      tracksTime: z.boolean().default(false),
      requiresApproval: z.boolean().default(false),
      autoAssign: z.boolean().default(false),
      autoArchiveDays: z.number().optional(),
    })
    .default({}),
});

export const CreateCollectionSchema = z.object({
  title: z.string().min(1).max(255),
  description: z.string().optional(),

  collectionType: z.string().min(1),
  subType: z.string().optional(),

  priority: z.string().default('normal'),

  assignedToUserId: z.string().uuid().optional(),
  assignedToTeam: z.string().optional(),

  dueAt: z.date().optional(),

  customFields: z.record(z.unknown()).default({}),
  tags: z.array(z.string()).default([]),

  source: ItemSource.default('manual'),
  externalId: z.string().optional(),
  externalData: z.record(z.unknown()).optional(),

  parentCollectionId: z.string().uuid().optional(),
});

export const UpdateCollectionSchema = z.object({
  title: z.string().min(1).max(255).optional(),
  description: z.string().optional(),

  status: z.string().optional(),
  priority: z.string().optional(),

  assignedToUserId: z.string().uuid().optional(),
  assignedToTeam: z.string().optional(),

  dueAt: z.date().optional(),

  customFields: z.record(z.unknown()).optional(),
  tags: z.array(z.string()).optional(),

  flags: z
    .object({
      isPinned: z.boolean().optional(),
      isConfidential: z.boolean().optional(),
      requiresAttention: z.boolean().optional(),
      isPublic: z.boolean().optional(),
      isLocked: z.boolean().optional(),
    })
    .optional(),

  workflowState: z.record(z.unknown()).optional(),
  approvalNotes: z.string().optional(),
});

export const CreateCollectionItemSchema = z.object({
  itemType: z.string().min(1),
  title: z.string().max(255).optional(),
  content: z.string().min(1),

  structuredData: z.record(z.unknown()).optional(),

  visibility: z.enum(['public', 'internal', 'restricted', 'private']).default('internal'),

  fileIds: z.array(z.string().uuid()).default([]),

  occurredAt: z.date().optional(),
  validFrom: z.date().optional(),
  validUntil: z.date().optional(),

  priority: z.enum(['low', 'normal', 'high', 'urgent']).default('normal'),
  requiresAction: z.boolean().default(false),
  actionDueAt: z.date().optional(),
  actionAssignedTo: z.string().uuid().optional(),

  parentItemId: z.string().uuid().optional(),

  properties: z.record(z.unknown()).default({}),
  tags: z.array(z.string()).default([]),
});

// ============================================
// Search Schemas
// ============================================
export const CollectionSearchSchema = z.object({
  query: z.string().optional(),

  collectionType: z.array(z.string()).optional(),
  status: z.array(z.string()).optional(),
  priority: z.array(z.string()).optional(),

  assignedTo: z.string().uuid().optional(),
  owner: z.string().uuid().optional(),
  createdBy: z.string().uuid().optional(),
  team: z.string().optional(),

  dateRange: z
    .object({
      from: z.date(),
      to: z.date(),
      field: z.enum(['created_at', 'updated_at', 'due_at', 'completed_at']).default('created_at'),
    })
    .optional(),

  tags: z.array(z.string()).optional(),
  customFilters: z.record(z.unknown()).optional(),

  flags: z
    .object({
      isPinned: z.boolean().optional(),
      isConfidential: z.boolean().optional(),
      requiresAttention: z.boolean().optional(),
      isTemplate: z.boolean().optional(),
      isPublic: z.boolean().optional(),
      isLocked: z.boolean().optional(),
    })
    .optional(),

  includeDeleted: z.boolean().default(false),

  sortBy: z
    .enum(['created_at', 'updated_at', 'due_at', 'priority', 'status', 'title'])
    .default('updated_at'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),

  limit: z.number().min(1).max(100).default(20),
  offset: z.number().min(0).default(0),
});

// ============================================
// Type Exports
// ============================================
export type CollectionTypeConfig = z.infer<typeof CollectionTypeConfigSchema>;
export type CollectionTypeConfigDB = z.infer<typeof CollectionTypeConfigDBSchema>;
export type Collection = z.infer<typeof CollectionSchema>;
export type CollectionDB = z.infer<typeof CollectionDBSchema>;
export type CollectionItem = z.infer<typeof CollectionItemSchema>;
export type CollectionItemDB = z.infer<typeof CollectionItemDBSchema>;

export type CreateCollectionTypeConfigInput = z.infer<typeof CreateCollectionTypeConfigSchema>;
export type CreateCollectionInput = z.infer<typeof CreateCollectionSchema>;
export type UpdateCollectionInput = z.infer<typeof UpdateCollectionSchema>;
export type CreateCollectionItemInput = z.infer<typeof CreateCollectionItemSchema>;
export type CollectionSearchInput = z.infer<typeof CollectionSearchSchema>;

export type CollectionStatus = z.infer<typeof CollectionStatus>;
export type CollectionPriority = z.infer<typeof CollectionPriority>;
export type ItemSource = z.infer<typeof ItemSource>;
