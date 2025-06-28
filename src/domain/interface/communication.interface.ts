// src/domain/repositories/communication.repository.interface.ts
import { AsyncResult } from '../../shared/response';
import {
  Thread,
  ThreadParticipant,
  Message,
  MessageReadReceipt,
  Presence,
  TypingIndicator,
  CreateThreadInput,
  SendMessageInput,
  UpdateMessageInput,
  UpdateThreadInput,
  UpdateThreadParticipantInput,
  AddReactionInput,
  MarkThreadReadInput,
  AddThreadParticipantsInput,
} from '../entities';

export interface ICommunication {
  // ============================================
  // THREADS
  // ============================================
  createThread(input: CreateThreadInput & { createdBy: string }): AsyncResult<Thread>;
  findThreadById(id: string): AsyncResult<Thread | null>;
  findUserThreads(userId: string, status?: Thread['status']): AsyncResult<Thread[]>;
  findDirectThread(userIds: string[]): AsyncResult<Thread | null>;
  findThreadsByIncident(incidentId: string): AsyncResult<Thread[]>;
  findThreadsByOrganization(organizationId: string): AsyncResult<Thread[]>;
  updateThread(id: string, updates: UpdateThreadInput): AsyncResult<Thread | null>;
  resolveThread(id: string, resolvedBy: string): AsyncResult<boolean>;
  archiveThread(id: string, archivedBy: string): AsyncResult<boolean>;
  deleteThread(id: string): AsyncResult<boolean>;
  incrementMessageCount(threadId: string): AsyncResult<boolean>;
  updateLastMessage(threadId: string, messageId: string): AsyncResult<boolean>;
  searchThreads(query: string, userId: string): AsyncResult<Thread[]>;

  // ============================================
  // THREAD PARTICIPANTS
  // ============================================
  addParticipants(input: AddThreadParticipantsInput & { joinedBy: string }): AsyncResult<boolean>;
  removeParticipant(threadId: string, userId: string, removedBy?: string): AsyncResult<boolean>;
  findThreadParticipants(threadId: string): AsyncResult<ThreadParticipant[]>;
  findUserParticipation(userId: string): AsyncResult<ThreadParticipant[]>;
  updateParticipant(
    threadId: string,
    userId: string,
    updates: UpdateThreadParticipantInput,
  ): AsyncResult<boolean>;
  isUserInThread(threadId: string, userId: string): AsyncResult<boolean>;
  getUnreadCounts(userId: string): AsyncResult<Array<{ threadId: string; count: number }>>;
  markThreadAsRead(input: MarkThreadReadInput & { userId: string }): AsyncResult<boolean>;
  muteThread(threadId: string, userId: string, until?: Date): AsyncResult<boolean>;
  unmuteThread(threadId: string, userId: string): AsyncResult<boolean>;

  // ============================================
  // MESSAGES
  // ============================================
  createMessage(input: SendMessageInput & { authorId: string }): AsyncResult<Message>;
  findMessageById(id: string): AsyncResult<Message | null>;
  findThreadMessages(
    threadId: string,
    options?: {
      limit?: number;
      before?: Date;
      after?: Date;
      includeDeleted?: boolean;
    },
  ): AsyncResult<Message[]>;
  findMessageReplies(messageId: string): AsyncResult<Message[]>;
  updateMessage(
    id: string,
    authorId: string,
    update: UpdateMessageInput,
  ): AsyncResult<Message | null>;
  deleteMessage(id: string, deletedBy: string, hard?: boolean): AsyncResult<boolean>;
  searchMessages(threadId: string, query: string): AsyncResult<Message[]>;
  findMessagesByUser(userId: string, threadId?: string): AsyncResult<Message[]>;
  findMentions(userId: string): AsyncResult<Message[]>;

  // ============================================
  // REACTIONS
  // ============================================
  addReaction(input: AddReactionInput & { userId: string }): AsyncResult<boolean>;
  removeReaction(messageId: string, emoji: string, userId: string): AsyncResult<boolean>;
  getMessageReactions(messageId: string): AsyncResult<Record<string, string[]>>;
  getUserReactions(
    userId: string,
    threadId?: string,
  ): AsyncResult<
    Array<{
      messageId: string;
      emoji: string;
    }>
  >;

  // ============================================
  // READ RECEIPTS
  // ============================================
  createReadReceipt(receipt: Omit<MessageReadReceipt, 'readAt'>): AsyncResult<boolean>;
  createBatchReadReceipts(
    receipts: Array<Omit<MessageReadReceipt, 'readAt'>>,
  ): AsyncResult<boolean>;
  findMessageReadReceipts(messageId: string): AsyncResult<MessageReadReceipt[]>;
  findThreadReadReceipts(threadId: string, userId: string): AsyncResult<MessageReadReceipt[]>;
  getLastReadMessage(threadId: string, userId: string): AsyncResult<string | null>;
  countUnreadMessages(threadId: string, userId: string): AsyncResult<number>;

  // ============================================
  // PRESENCE
  // ============================================
  updatePresence(
    userId: string,
    status: Presence['status'],
    metadata?: {
      statusMessage?: string;
      currentThreadId?: string;
      deviceType?: Presence['deviceType'];
      location?: { latitude: number; longitude: number };
    },
  ): AsyncResult<boolean>;
  getPresence(userId: string): AsyncResult<Presence | null>;
  getBulkPresence(userIds: string[]): AsyncResult<Presence[]>;
  getThreadPresence(threadId: string): AsyncResult<Presence[]>;
  updateLastSeen(userId: string): AsyncResult<boolean>;
  cleanupStalePresence(beforeDate: Date): AsyncResult<number>;

  // ============================================
  // TYPING INDICATORS
  // ============================================
  setTypingIndicator(
    indicator: Omit<TypingIndicator, 'startedAt' | 'expiresAt'>,
  ): AsyncResult<boolean>;
  removeTypingIndicator(threadId: string, userId: string): AsyncResult<boolean>;
  getTypingIndicators(threadId: string): AsyncResult<TypingIndicator[]>;
  cleanupExpiredTypingIndicators(): AsyncResult<number>;

  // ============================================
  // ATTACHMENTS
  // ============================================
  addMessageAttachments(
    messageId: string,
    attachments: Message['attachments'],
  ): AsyncResult<boolean>;
  removeMessageAttachment(messageId: string, attachmentId: string): AsyncResult<boolean>;
  findThreadAttachments(
    threadId: string,
    type?: 'image' | 'video' | 'audio' | 'document',
  ): AsyncResult<
    Array<{
      messageId: string;
      attachment: Message['attachments'][0];
    }>
  >;

  // ============================================
  // ANALYTICS & STATS
  // ============================================
  getThreadStats(threadId: string): AsyncResult<{
    messageCount: number;
    participantCount: number;
    activeParticipants: number;
    lastActivity: Date | null;
    avgResponseTime: number;
  }>;
  getUserCommunicationStats(
    userId: string,
    from?: Date,
    to?: Date,
  ): AsyncResult<{
    messagesSent: number;
    messagesReceived: number;
    threadsParticipated: number;
    avgResponseTime: number;
    mostActiveHours: number[];
  }>;

  // ============================================
  // BULK OPERATIONS & CLEANUP
  // ============================================
  archiveInactiveThreads(inactiveDays: number): AsyncResult<number>;
  deleteOldMessages(beforeDate: Date, threadId?: string): AsyncResult<number>;
  exportThreadMessages(threadId: string): AsyncResult<Message[]>;
  purgeUserCommunicationData(userId: string): AsyncResult<{
    threadsDeleted: number;
    messagesDeleted: number;
    participationsRemoved: number;
  }>;
}
