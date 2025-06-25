// src/domain/entities/schemas/communication.schema.ts
import { z } from 'zod';
import { BaseEntitySchema, BaseEntityDBSchema } from './entity.schema';

// ============================================
// Thread Schema (Conversations)
// ============================================
export const ThreadDBSchema = BaseEntityDBSchema.extend({
  // Thread identification
  title: z.string(),
  type: z.enum(['incident', 'direct', 'group', 'support', 'broadcast']),
  
  // Related entities
  incident_id: z.string().uuid().nullable(), 
  organization_id: z.string().uuid().nullable(),
  
  // Creator
  created_by: z.string().uuid(),
  
  // Thread status
  status: z.enum(['active', 'resolved', 'archived', 'locked']).default('active'),
  resolved_at: z.date().nullable(),
  resolved_by: z.string().uuid().nullable(),
  archived_at: z.date().nullable(),
  archived_by: z.string().uuid().nullable(),
  
  // Thread properties
  is_urgent: z.boolean().default(false),
  is_pinned: z.boolean().default(false),
  is_muted: z.boolean().default(false),
  
  // Activity tracking
  last_message_at: z.date().nullable(),
  last_message_id: z.string().uuid().nullable(),
  message_count: z.number().int().default(0),
  participant_count: z.number().int().default(0),
  
  // Settings
  settings: z.object({
    allowed_actions: z.array(z.enum(['message', 'upload', 'invite', 'leave'])).default(['message', 'upload']),
    max_participants: z.number().int().nullable(),
    auto_archive_hours: z.number().int().nullable(),
  }).default({
    allowed_actions: ['message', 'upload'],
    max_participants: null,
    auto_archive_hours: null,
  }),
});

export const ThreadSchema = BaseEntitySchema.extend({
  title: z.string(),
  type: z.enum(['incident', 'direct', 'group', 'support', 'broadcast']),
  
  incidentId: z.string().uuid().nullable(),
  organizationId: z.string().uuid().nullable(),
  
  createdBy: z.string().uuid(),
  
  status: z.enum(['active', 'resolved', 'archived', 'locked']).default('active'),
  resolvedAt: z.date().nullable(),
  resolvedBy: z.string().uuid().nullable(),
  archivedAt: z.date().nullable(),
  archivedBy: z.string().uuid().nullable(),
  
  isUrgent: z.boolean().default(false),
  isPinned: z.boolean().default(false),
  isMuted: z.boolean().default(false),
  
  lastMessageAt: z.date().nullable(),
  lastMessageId: z.string().uuid().nullable(),
  messageCount: z.number().int().default(0),
  participantCount: z.number().int().default(0),
  
  settings: z.object({
    allowedActions: z.array(z.enum(['message', 'upload', 'invite', 'leave'])).default(['message', 'upload']),
    maxParticipants: z.number().int().nullable(),
    autoArchiveHours: z.number().int().nullable(),
  }).default({
    allowedActions: ['message', 'upload'],
    maxParticipants: null,
    autoArchiveHours: null,
  }),
});

// ============================================
// Thread Participant Schema
// ============================================
export const ThreadParticipantDBSchema = z.object({
  thread_id: z.string().uuid(),
  user_id: z.string().uuid(),
  
  // Role in thread
  role: z.enum(['owner', 'admin', 'member', 'observer']).default('member'),
  
  // Join/leave tracking
  joined_at: z.date(),
  joined_by: z.string().uuid().nullable(),
  left_at: z.date().nullable(),
  removed_by: z.string().uuid().nullable(),
  
  // Read tracking
  last_read_at: z.date().nullable(),
  last_read_message_id: z.string().uuid().nullable(),
  unread_count: z.number().int().default(0),
  
  // Notifications
  notification_preference: z.enum(['all', 'mentions', 'none']).default('all'),
  is_muted: z.boolean().default(false),
  muted_until: z.date().nullable(),
  
  // Permissions (override thread defaults)
  can_message: z.boolean().default(true),
  can_upload: z.boolean().default(true),
  can_invite: z.boolean().default(false),
});

export const ThreadParticipantSchema = z.object({
  threadId: z.string().uuid(),
  userId: z.string().uuid(),
  
  role: z.enum(['owner', 'admin', 'member', 'observer']).default('member'),
  
  joinedAt: z.date(),
  joinedBy: z.string().uuid().nullable(),
  leftAt: z.date().nullable(),
  removedBy: z.string().uuid().nullable(),
  
  lastReadAt: z.date().nullable(),
  lastReadMessageId: z.string().uuid().nullable(),
  unreadCount: z.number().int().default(0),
  
  notificationPreference: z.enum(['all', 'mentions', 'none']).default('all'),
  isMuted: z.boolean().default(false),
  mutedUntil: z.date().nullable(),
  
  canMessage: z.boolean().default(true),
  canUpload: z.boolean().default(true),
  canInvite: z.boolean().default(false),
});

// ============================================
// Message Schema
// ============================================
export const MessageDBSchema = BaseEntityDBSchema.extend({
  thread_id: z.string().uuid(),
  author_id: z.string().uuid(),
  
  // Message content
  content: z.string().max(5000),
  content_type: z.enum(['text', 'html', 'markdown']).default('text'),
  
  // Message type
  type: z.enum([
    'user',
    'system',
    'bot',
    'status_change',
    'user_joined',
    'user_left',
    'incident_update'
  ]).default('user'),
  
  // Rich content
  mentions: z.array(z.string().uuid()).default([]),
  attachments: z.array(z.object({
    id: z.string().uuid(),
    file_id: z.string().uuid(),
    filename: z.string(),
    mime_type: z.string(),
    size: z.number(),
    url: z.string().url(),
    thumbnail_url: z.string().url().nullable(),
    type: z.enum(['image', 'video', 'audio', 'document', 'other']),
  })).default([]),
  
  // Location sharing
  location: z.object({
    latitude: z.number().min(-90).max(90),
    longitude: z.number().min(-180).max(180),
    accuracy: z.number().nullable(),
    address: z.string().nullable(),
  }).nullable(),
  
  // Threading
  reply_to_id: z.string().uuid().nullable(),
  reply_count: z.number().int().default(0),
  
  // Edit history
  is_edited: z.boolean().default(false),
  edited_at: z.date().nullable(),
  edit_history: z.array(z.object({
    content: z.string(),
    edited_at: z.date(),
    edited_by: z.string().uuid(),
  })).default([]),
  
  // Deletion
  is_deleted: z.boolean().default(false),
  deleted_at: z.date().nullable(),
  deleted_by: z.string().uuid().nullable(),
  
  // Reactions
  reactions: z.record(z.array(z.string().uuid())).default({}),
  
  // System message metadata
  system_metadata: z.record(z.unknown()).nullable(),
});

export const MessageSchema = BaseEntitySchema.extend({
  threadId: z.string().uuid(),
  authorId: z.string().uuid(),
  
  content: z.string().max(5000),
  contentType: z.enum(['text', 'html', 'markdown']).default('text'),
  
  type: z.enum([
    'user',
    'system',
    'bot',
    'status_change',
    'user_joined',
    'user_left',
    'incident_update'
  ]).default('user'),
  
  mentions: z.array(z.string().uuid()).default([]),
  attachments: z.array(z.object({
    id: z.string().uuid(),
    fileId: z.string().uuid(),
    filename: z.string(),
    mimeType: z.string(),
    size: z.number(),
    url: z.string().url(),
    thumbnailUrl: z.string().url().nullable(),
    type: z.enum(['image', 'video', 'audio', 'document', 'other']),
  })).default([]),
  
  location: z.object({
    latitude: z.number().min(-90).max(90),
    longitude: z.number().min(-180).max(180),
    accuracy: z.number().nullable(),
    address: z.string().nullable(),
  }).nullable(),
  
  replyToId: z.string().uuid().nullable(),
  replyCount: z.number().int().default(0),
  
  isEdited: z.boolean().default(false),
  editedAt: z.date().nullable(),
  editHistory: z.array(z.object({
    content: z.string(),
    editedAt: z.date(),
    editedBy: z.string().uuid(),
  })).default([]),
  
  isDeleted: z.boolean().default(false),
  deletedAt: z.date().nullable(),
  deletedBy: z.string().uuid().nullable(),
  
  reactions: z.record(z.array(z.string().uuid())).default({}),
  
  systemMetadata: z.record(z.unknown()).nullable(),
});

// ============================================
// Message Read Receipt Schema
// ============================================
export const MessageReadReceiptDBSchema = z.object({
  message_id: z.string().uuid(),
  user_id: z.string().uuid(),
  thread_id: z.string().uuid(),
  read_at: z.date(),
});

export const MessageReadReceiptSchema = z.object({
  messageId: z.string().uuid(),
  userId: z.string().uuid(),
  threadId: z.string().uuid(),
  readAt: z.date(),
});

// ============================================
// Presence Schema (Who's online)
// ============================================
export const PresenceDBSchema = z.object({
  user_id: z.string().uuid(),
  status: z.enum(['online', 'away', 'busy', 'offline']).default('offline'),
  status_message: z.string().nullable(),
  
  // Activity
  last_seen_at: z.date(),
  last_activity_at: z.date(),
  
  // Current context
  current_thread_id: z.string().uuid().nullable(),
  active_threads: z.array(z.string().uuid()).default([]),
  
  // Device/location
  device_type: z.enum(['web', 'mobile', 'desktop']).nullable(),
  location: z.object({
    latitude: z.number(),
    longitude: z.number(),
  }).nullable(),
});

export const PresenceSchema = z.object({
  userId: z.string().uuid(),
  status: z.enum(['online', 'away', 'busy', 'offline']).default('offline'),
  statusMessage: z.string().nullable(),
  
  lastSeenAt: z.date(),
  lastActivityAt: z.date(),
  
  currentThreadId: z.string().uuid().nullable(),
  activeThreads: z.array(z.string().uuid()).default([]),
  
  deviceType: z.enum(['web', 'mobile', 'desktop']).nullable(),
  location: z.object({
    latitude: z.number(),
    longitude: z.number(),
  }).nullable(),
});

// ============================================
// Typing Indicator Schema
// ============================================
export const TypingIndicatorSchema = z.object({
  threadId: z.string().uuid(),
  userId: z.string().uuid(),
  startedAt: z.date(),
  expiresAt: z.date(), // Auto-expire after 10 seconds
});

// ============================================
// Input Schemas (for API)
// ============================================
export const CreateThreadSchema = z.object({
  title: z.string().min(1).max(255),
  type: z.enum(['incident', 'direct', 'group', 'support']),
  incidentId: z.string().uuid().optional(),
  participantIds: z.array(z.string().uuid()).min(1),
  isUrgent: z.boolean().optional(),
});

export const SendMessageSchema = z.object({
  threadId: z.string().uuid(),
  content: z.string().min(1).max(5000),
  contentType: z.enum(['text', 'html', 'markdown']).optional(),
  mentions: z.array(z.string().uuid()).optional(),
  attachmentIds: z.array(z.string().uuid()).optional(),
  replyToId: z.string().uuid().optional(),
  location: z.object({
    latitude: z.number(),
    longitude: z.number(),
  }).optional(),
});

export const UpdateMessageSchema = z.object({
  content: z.string().min(1).max(5000),
});

export const AddReactionSchema = z.object({
  messageId: z.string().uuid(),
  emoji: z.string().max(2), // Single emoji
});

export const MarkThreadReadSchema = z.object({
  threadId: z.string().uuid(),
  lastReadMessageId: z.string().uuid(),
});

export const UpdateThreadSchema = z.object({
  title: z.string().min(1).max(255).optional(),
  status: z.enum(['active', 'resolved', 'archived']).optional(),
  isUrgent: z.boolean().optional(),
  isPinned: z.boolean().optional(),
});

export const UpdateThreadParticipantSchema = z.object({
  role: z.enum(['owner', 'admin', 'member', 'observer']).optional(),
  notificationPreference: z.enum(['all', 'mentions', 'none']).optional(),
  canMessage: z.boolean().optional(),
  canUpload: z.boolean().optional(),
  canInvite: z.boolean().optional(),
});

export const AddThreadParticipantsSchema = z.object({
  threadId: z.string().uuid(),
  userIds: z.array(z.string().uuid()).min(1),
  role: z.enum(['member', 'observer']).default('member'),
});

// ============================================
// Type Exports
// ============================================
export type Thread = z.infer<typeof ThreadSchema>;
export type ThreadDB = z.infer<typeof ThreadDBSchema>;
export type ThreadParticipant = z.infer<typeof ThreadParticipantSchema>;
export type ThreadParticipantDB = z.infer<typeof ThreadParticipantDBSchema>;
export type Message = z.infer<typeof MessageSchema>;
export type MessageDB = z.infer<typeof MessageDBSchema>;
export type MessageReadReceipt = z.infer<typeof MessageReadReceiptSchema>;
export type MessageReadReceiptDB = z.infer<typeof MessageReadReceiptDBSchema>;
export type Presence = z.infer<typeof PresenceSchema>;
export type PresenceDB = z.infer<typeof PresenceDBSchema>;
export type TypingIndicator = z.infer<typeof TypingIndicatorSchema>;
export type CreateThreadInput = z.infer<typeof CreateThreadSchema>;
export type SendMessageInput = z.infer<typeof SendMessageSchema>;
export type UpdateMessageInput = z.infer<typeof UpdateMessageSchema>;
export type AddReactionInput = z.infer<typeof AddReactionSchema>;
export type MarkThreadReadInput = z.infer<typeof MarkThreadReadSchema>;
export type UpdateThreadInput = z.infer<typeof UpdateThreadSchema>;
export type UpdateThreadParticipantInput = z.infer<typeof UpdateThreadParticipantSchema>;
export type AddThreadParticipantsInput = z.infer<typeof AddThreadParticipantsSchema>;