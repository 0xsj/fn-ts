// src/domain/repositories/location.repository.interface.ts
import { AsyncResult } from '../../shared/response';
import {
  Location,
  LocationHistory,
  Geofence,
  Coordinates,
  CreateLocationInput,
  SearchLocationInput,
  NearbySearchInput,
  GeocodeRequest,
  ReverseGeocodeRequest
} from '../entities';

export interface ILocationRepository {
  // ============================================
  // LOCATION OPERATIONS
  // ============================================
  createLocation(input: CreateLocationInput & { createdBy?: string }): AsyncResult<Location>;
  findLocationById(id: string): AsyncResult<Location | null>;
  findLocationsByIds(ids: string[]): AsyncResult<Location[]>;
  updateLocation(id: string, updates: Partial<Location>): AsyncResult<Location | null>;
  deleteLocation(id: string): AsyncResult<boolean>;
  verifyLocation(id: string, verifiedBy: string): AsyncResult<boolean>;
  
  // ============================================
  // LOCATION SEARCH
  // ============================================
  searchLocations(search: SearchLocationInput): AsyncResult<Location[]>;
  findNearbyLocations(search: NearbySearchInput): AsyncResult<Location[]>;
  findLocationsWithinBounds(
    southwest: Coordinates,
    northeast: Coordinates,
    types?: Location['type'][]
  ): AsyncResult<Location[]>;
  findLocationsByType(type: Location['type'], limit?: number): AsyncResult<Location[]>;
  findLocationsByParent(parentLocationId: string): AsyncResult<Location[]>;
  
  // ============================================
  // GEOCODING
  // ============================================
  geocodeAddress(request: GeocodeRequest): AsyncResult<Location[]>;
  reverseGeocode(request: ReverseGeocodeRequest): AsyncResult<Location | null>;
  batchGeocode(addresses: string[]): AsyncResult<Array<{ address: string; location: Location | null }>>;
  
  // ============================================
  // ADMINISTRATIVE LOOKUPS
  // ============================================
  findByFipsCode(fipsCode: string): AsyncResult<Location | null>;
  findByAdministrativeCode(code: string, codeType: string): AsyncResult<Location | null>;
  findByPostalCode(postalCode: string, countryCode?: string): AsyncResult<Location[]>;
  findCitiesInState(stateCode: string): AsyncResult<Location[]>;
  findCountiesInState(stateCode: string): AsyncResult<Location[]>;
  getLocationHierarchy(locationId: string): AsyncResult<Location[]>;
  
  // ============================================
  // LOCATION HISTORY
  // ============================================
  recordLocationHistory(history: Omit<LocationHistory, 'id' | 'createdAt'>): AsyncResult<LocationHistory>;
  findUserLocationHistory(
    userId: string,
    options?: {
      from?: Date;
      to?: Date;
      limit?: number;
      activityType?: LocationHistory['activityType'];
    }
  ): AsyncResult<LocationHistory[]>;
  findLastUserLocation(userId: string): AsyncResult<LocationHistory | null>;
  deleteUserLocationHistory(userId: string, beforeDate?: Date): AsyncResult<number>;
  
  // ============================================
  // GEOFENCES
  // ============================================
  createGeofence(input: Omit<Geofence, 'id' | 'createdAt' | 'updatedAt'>): AsyncResult<Geofence>;
  findGeofenceById(id: string): AsyncResult<Geofence | null>;
  findActiveGeofences(organizationId?: string): AsyncResult<Geofence[]>;
  updateGeofence(id: string, updates: Partial<Geofence>): AsyncResult<Geofence | null>;
  deleteGeofence(id: string): AsyncResult<boolean>;
  checkGeofenceEntry(coordinates: Coordinates, geofenceId: string): AsyncResult<boolean>;
  findGeofencesContainingPoint(coordinates: Coordinates): AsyncResult<Geofence[]>;
  
  // ============================================
  // EMERGENCY SERVICES
  // ============================================
  findNearestEmergencyServices(
    coordinates: Coordinates,
    serviceType: 'fire' | 'police' | 'hospital' | 'all'
  ): AsyncResult<Location[]>;
  updateEmergencyServices(locationId: string, services: Location['emergencyServices']): AsyncResult<boolean>;
  findLocationsByDispatchZone(dispatchZone: string): AsyncResult<Location[]>;
  findLocationsByPSAP(psapId: string): AsyncResult<Location[]>;
  
  // ============================================
  // STATISTICS & ANALYTICS
  // ============================================
  updateLocationStatistics(locationId: string, statistics: Location['statistics']): AsyncResult<boolean>;
  getLocationUsageStats(locationId: string): AsyncResult<{
    usageCount: number;
    lastUsedAt: Date | null;
    topUsers: Array<{ userId: string; count: number }>;
  }>;
  incrementLocationUsage(locationId: string): AsyncResult<boolean>;
  getMostUsedLocations(limit?: number, type?: Location['type']): AsyncResult<Location[]>;
  
  // ============================================
  // BULK OPERATIONS
  // ============================================
  bulkCreateLocations(locations: Array<CreateLocationInput & { createdBy?: string }>): AsyncResult<Location[]>;
  bulkUpdateLocations(updates: Array<{ id: string; updates: Partial<Location> }>): AsyncResult<number>;
  importLocationsFromSource(source: Location['source'], data: any[]): AsyncResult<{
    imported: number;
    failed: number;
    errors: Array<{ index: number; error: string }>;
  }>;
  
  // ============================================
  // VALIDATION & NORMALIZATION
  // ============================================
  validateCoordinates(coordinates: Coordinates): AsyncResult<boolean>;
  normalizeAddress(address: Location['address']): AsyncResult<Location['address']>;
  deduplicateLocations(threshold: number): AsyncResult<{
    merged: number;
    duplicates: Array<{ kept: string; removed: string[] }>;
  }>;
}