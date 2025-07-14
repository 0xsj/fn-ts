// src/infrastructure/database/migrations/001752388709_remove_incident_id_columns.ts
import { Kysely, sql } from 'kysely';

export async function up(db: Kysely<any>): Promise<void> {
  console.log('Starting removal of incident_id columns...');

  try {
    // ============================================
    // 1. REMOVE incident_id FROM THREADS TABLE
    // ============================================
    console.log('Removing incident_id from threads table...');

    // First, drop the foreign key constraint if it exists
    try {
      await db.schema.alterTable('threads').dropConstraint('fk_threads_incident').execute();
      console.log('Dropped fk_threads_incident constraint');
    } catch (error) {
      console.log('No fk_threads_incident constraint found (or already dropped)');
    }

    // Drop the index if it exists
    try {
      await db.schema.dropIndex('idx_threads_incident_id').execute();
      console.log('Dropped idx_threads_incident_id index');
    } catch (error) {
      console.log('No idx_threads_incident_id index found (or already dropped)');
    }

    // Remove the incident_id column
    await db.schema.alterTable('threads').dropColumn('incident_id').execute();
    console.log('Removed incident_id column from threads table');

    // ============================================
    // 2. CHECK AND REMOVE incident_id FROM NOTIFICATIONS TABLE (if exists)
    // ============================================
    console.log('Checking for incident_id in notifications table...');

    // Get table info to check if notifications table and incident_id column exist
    const tables = await db.introspection.getTables();
    const notificationsTable = tables.find((table) => table.name === 'notifications');

    if (notificationsTable) {
      console.log('Found notifications table, checking for incident_id column...');

      // Check if incident_id column exists in notifications
      try {
        const columns = await db.introspection.getMetadata({ withInternalKyselyTables: false });
        const notificationColumns =
          columns.tables.find((t) => t.name === 'notifications')?.columns || [];
        const hasIncidentIdColumn = notificationColumns.some((col) => col.name === 'incident_id');

        if (hasIncidentIdColumn) {
          console.log('Found incident_id column in notifications table, removing...');

          // Drop foreign key constraint if it exists
          try {
            await db.schema
              .alterTable('notifications')
              .dropConstraint('fk_notifications_incident')
              .execute();
            console.log('Dropped fk_notifications_incident constraint');
          } catch (error) {
            console.log('No fk_notifications_incident constraint found');
          }

          // Drop index if it exists
          try {
            await db.schema.dropIndex('idx_notifications_incident_id').execute();
            console.log('Dropped idx_notifications_incident_id index');
          } catch (error) {
            console.log('No idx_notifications_incident_id index found');
          }

          // Remove the incident_id column
          await db.schema.alterTable('notifications').dropColumn('incident_id').execute();
          console.log('Removed incident_id column from notifications table');
        } else {
          console.log('No incident_id column found in notifications table');
        }
      } catch (error) {
        console.log('Could not check notifications columns, assuming no incident_id column exists');
      }
    } else {
      console.log('No notifications table found');
    }

    // ============================================
    // 3. CHECK AND REMOVE incident_id FROM MESSAGES TABLE (if exists)
    // ============================================
    console.log('Checking for incident_id in messages table...');

    const messagesTable = tables.find((table) => table.name === 'messages');

    if (messagesTable) {
      console.log('Found messages table, checking for incident_id column...');

      try {
        const columns = await db.introspection.getMetadata({ withInternalKyselyTables: false });
        const messageColumns = columns.tables.find((t) => t.name === 'messages')?.columns || [];
        const hasIncidentIdColumn = messageColumns.some((col) => col.name === 'incident_id');

        if (hasIncidentIdColumn) {
          console.log('Found incident_id column in messages table, removing...');

          // Drop foreign key constraint if it exists
          try {
            await db.schema.alterTable('messages').dropConstraint('fk_messages_incident').execute();
            console.log('Dropped fk_messages_incident constraint');
          } catch (error) {
            console.log('No fk_messages_incident constraint found');
          }

          // Drop index if it exists
          try {
            await db.schema.dropIndex('idx_messages_incident_id').execute();
            console.log('Dropped idx_messages_incident_id index');
          } catch (error) {
            console.log('No idx_messages_incident_id index found');
          }

          // Remove the incident_id column
          await db.schema.alterTable('messages').dropColumn('incident_id').execute();
          console.log('Removed incident_id column from messages table');
        } else {
          console.log('No incident_id column found in messages table');
        }
      } catch (error) {
        console.log('Could not check messages columns, assuming no incident_id column exists');
      }
    } else {
      console.log('No messages table found');
    }

    // ============================================
    // 4. ADD collection_id TO THREADS (to replace incident_id functionality)
    // ============================================
    console.log('Adding collection_id to threads table...');

    await db.schema.alterTable('threads').addColumn('collection_id', 'varchar(36)').execute();
    console.log('Added collection_id column to threads table');

    // Add foreign key constraint to collections
    await db.schema
      .alterTable('threads')
      .addForeignKeyConstraint('fk_threads_collection', ['collection_id'], 'collections', ['id'])
      .onDelete('set null')
      .execute();
    console.log('Added foreign key constraint for threads.collection_id');

    // Add index for performance
    await db.schema
      .createIndex('idx_threads_collection_id')
      .on('threads')
      .column('collection_id')
      .execute();
    console.log('Added index for threads.collection_id');

    // ============================================
    // 5. ADD collection_id TO NOTIFICATIONS (if table exists)
    // ============================================
    if (notificationsTable) {
      console.log('Adding collection_id to notifications table...');

      await db.schema
        .alterTable('notifications')
        .addColumn('collection_id', 'varchar(36)')
        .execute();
      console.log('Added collection_id column to notifications table');

      // Add foreign key constraint to collections
      await db.schema
        .alterTable('notifications')
        .addForeignKeyConstraint('fk_notifications_collection', ['collection_id'], 'collections', [
          'id',
        ])
        .onDelete('set null')
        .execute();
      console.log('Added foreign key constraint for notifications.collection_id');

      // Add index for performance
      await db.schema
        .createIndex('idx_notifications_collection_id')
        .on('notifications')
        .column('collection_id')
        .execute();
      console.log('Added index for notifications.collection_id');
    }

    console.log('Successfully removed incident_id columns and added collection_id columns!');
  } catch (error) {
    console.error('Migration failed with error:', error);
    throw error;
  }
}

export async function down(db: Kysely<any>): Promise<void> {
  console.log('Rolling back incident_id removal migration...');

  try {
    // ============================================
    // REVERSE: Add incident_id back to threads
    // ============================================
    console.log('Adding incident_id back to threads table...');

    // Drop collection_id constraint and column
    try {
      await db.schema.alterTable('threads').dropConstraint('fk_threads_collection').execute();
    } catch (error) {
      console.log('No collection constraint to drop');
    }

    try {
      await db.schema.dropIndex('idx_threads_collection_id').execute();
    } catch (error) {
      console.log('No collection index to drop');
    }

    await db.schema.alterTable('threads').dropColumn('collection_id').execute();

    // Add incident_id back
    await db.schema.alterTable('threads').addColumn('incident_id', 'varchar(36)').execute();

    // Add index back
    await db.schema
      .createIndex('idx_threads_incident_id')
      .on('threads')
      .column('incident_id')
      .execute();

    console.log('Restored incident_id to threads table');

    // ============================================
    // REVERSE: Add incident_id back to notifications (if table exists)
    // ============================================
    const tables = await db.introspection.getTables();
    const notificationsTable = tables.find((table) => table.name === 'notifications');

    if (notificationsTable) {
      console.log('Adding incident_id back to notifications table...');

      // Drop collection_id constraint and column
      try {
        await db.schema
          .alterTable('notifications')
          .dropConstraint('fk_notifications_collection')
          .execute();
      } catch (error) {
        console.log('No collection constraint to drop');
      }

      try {
        await db.schema.dropIndex('idx_notifications_collection_id').execute();
      } catch (error) {
        console.log('No collection index to drop');
      }

      await db.schema.alterTable('notifications').dropColumn('collection_id').execute();

      // Add incident_id back
      await db.schema.alterTable('notifications').addColumn('incident_id', 'varchar(36)').execute();

      // Add index back
      await db.schema
        .createIndex('idx_notifications_incident_id')
        .on('notifications')
        .column('incident_id')
        .execute();

      console.log('Restored incident_id to notifications table');
    }

    console.log('Successfully rolled back incident_id removal migration!');
  } catch (error) {
    console.error('Rollback failed:', error);
    throw error;
  }
}
