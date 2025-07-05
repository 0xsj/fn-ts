// src/infrastructure/database/repositories/types.ts

// Import the concrete implementations with aliases
import { UserRepository as UserRepositoryImpl } from './user.repository';
import { AuthRepository as AuthRepositoryImpl } from './auth.repository';
import { OrganizationRepository as OrganizationRepositoryImpl } from './organization.repository';
import { AccessControlRepository as AccessControlRepositoryImpl } from './access-control.repository';
import { AnalyticsRepository as AnalyticsRepositoryImpl } from './analytics.repository';
import { CommunicationRepository as CommunicationRepositoryImpl } from './communication.repository';
import { FileRepository as FileRepositoryImpl } from './file.repository';
import { LocationRepository as LocationRepositoryImpl } from './location.repository';
import { NotificationRepository as NotificationRepositoryImpl } from './notification.repository';
import { OperationsRepository as OperationsRepositoryImpl } from './operations.repository';

// Re-export implementations with Impl suffix
export {
  UserRepositoryImpl,
  AuthRepositoryImpl,
  OrganizationRepositoryImpl,
  AccessControlRepositoryImpl,
  AnalyticsRepositoryImpl,
  CommunicationRepositoryImpl,
  FileRepositoryImpl,
  LocationRepositoryImpl,
  NotificationRepositoryImpl,
  OperationsRepositoryImpl,
};

// Create clean type aliases for use with @Inject()
export type UserRepository = UserRepositoryImpl;
export type AuthRepository = AuthRepositoryImpl;
export type OrganizationRepository = OrganizationRepositoryImpl;
export type AccessControlRepository = AccessControlRepositoryImpl;
export type AnalyticsRepository = AnalyticsRepositoryImpl;
export type CommunicationRepository = CommunicationRepositoryImpl;
export type FileRepository = FileRepositoryImpl;
export type LocationRepository = LocationRepositoryImpl;
export type NotificationRepository = NotificationRepositoryImpl;
export type OperationsRepository = OperationsRepositoryImpl;