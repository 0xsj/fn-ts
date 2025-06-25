// src/domain/entities/schemas/location.schema.ts
import { z } from 'zod';
import { BaseEntitySchema, BaseEntityDBSchema } from './entity.schema';

// ============================================
// Coordinate Schema (Reusable)
// ============================================
export const CoordinatesSchema = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  altitude: z.number().nullable().optional(),
  accuracy: z.number().nullable().optional(),
});

export type Coordinates = z.infer<typeof CoordinatesSchema>;

// ============================================
// Location Schema
// ============================================
export const LocationDBSchema = BaseEntityDBSchema.extend({
  // Basic info
  name: z.string(),
  display_name: z.string(),
  type: z.enum([
    'address',
    'building',
    'poi',
    'intersection',
    'area',
    'city',
    'county',
    'state',
    'country',
  ]),
  
  // Coordinates
  coordinates: CoordinatesSchema,
  
  // Bounding box for areas (min_lon, min_lat, max_lon, max_lat)
  bounding_box: z.tuple([z.number(), z.number(), z.number(), z.number()]).nullable(),
  
  // Address components
  address: z.object({
    street_number: z.string().nullable(),
    street_name: z.string().nullable(),
    unit: z.string().nullable(),
    floor: z.string().nullable(),
    building_name: z.string().nullable(),
    
    // Administrative divisions
    neighborhood: z.string().nullable(),
    district: z.string().nullable(),
    city: z.string().nullable(),
    county: z.string().nullable(),
    state: z.string().nullable(),
    state_code: z.string().nullable(), // e.g., "CA"
    country: z.string().nullable(),
    country_code: z.string().nullable(), // ISO 3166-1 alpha-2
    postal_code: z.string().nullable(),
    
    // Additional
    cross_street: z.string().nullable(),
    formatted: z.string(),
  }),
  
  // Administrative codes
  administrative_codes: z.object({
    // US-specific codes
    fips_code: z.string().nullable(), // 5-digit FIPS for counties (e.g., "06037" for LA County)
    fips_state: z.string().nullable(), // 2-digit state FIPS (e.g., "06" for California)
    fips_county: z.string().nullable(), // 3-digit county code (e.g., "037")
    fips_place: z.string().nullable(), // 5-digit place code for cities
    
    // International codes
    iso_3166_1: z.string().nullable(), // Country code (e.g., "US")
    iso_3166_2: z.string().nullable(), // Subdivision code (e.g., "US-CA")
    
    // Other administrative codes
    gnis_id: z.string().nullable(), // Geographic Names Information System ID
    census_tract: z.string().nullable(), // Census tract code
    census_block: z.string().nullable(), // Census block code
    metro_area_code: z.string().nullable(), // Metropolitan Statistical Area
    
    // International equivalents
    nuts_code: z.string().nullable(), // EU Nomenclature of Territorial Units
    lau_code: z.string().nullable(), // EU Local Administrative Units
    insee_code: z.string().nullable(), // French INSEE code
    ons_code: z.string().nullable(), // UK Office for National Statistics
    
    // Generic code field for other countries
    administrative_code: z.string().nullable(),
    administrative_level: z.number().nullable(), // 1=country, 2=state/province, 3=county/district
  }).default({
    fips_code: null,
    fips_state: null,
    fips_county: null,
    fips_place: null,
    iso_3166_1: null,
    iso_3166_2: null,
    gnis_id: null,
    census_tract: null,
    census_block: null,
    metro_area_code: null,
    nuts_code: null,
    lau_code: null,
    insee_code: null,
    ons_code: null,
    administrative_code: null,
    administrative_level: null,
  }),
  
  // Hierarchical relationship
  parent_location_id: z.string().uuid().nullable(),
  
  // Geographic data
  timezone: z.string().nullable(),
  geohash: z.string().nullable(),
  plus_code: z.string().nullable(),
  what3words: z.string().nullable(),
  
  // Source/Provider
  source: z.enum(['manual', 'google', 'osm', 'mapbox', 'gps', 'user', 'census']).default('manual'),
  source_id: z.string().nullable(),
  place_id: z.string().nullable(),
  
  // Metadata
  is_verified: z.boolean().default(false),
  verified_at: z.date().nullable(),
  verified_by: z.string().uuid().nullable(),
  
  // Emergency services data
  emergency_services: z.object({
    fire_station_id: z.string().nullable(),
    police_station_id: z.string().nullable(),
    hospital_id: z.string().nullable(),
    dispatch_zone: z.string().nullable(),
    response_time_minutes: z.number().nullable(),
    
    // Emergency service codes
    psap_id: z.string().nullable(), // Public Safety Answering Point ID
    ems_zone: z.string().nullable(), // Emergency Medical Services zone
    fire_district: z.string().nullable(),
    police_precinct: z.string().nullable(),
  }).nullable(),
  
  // Statistics (for cities/counties/states)
  statistics: z.object({
    population: z.number().nullable(),
    area_sq_km: z.number().nullable(),
    density_per_sq_km: z.number().nullable(),
    elevation_meters: z.number().nullable(),
    
    // Additional statistics
    households: z.number().nullable(),
    median_income: z.number().nullable(),
    population_updated_at: z.date().nullable(),
  }).nullable(),
  
  // Usage tracking
  usage_count: z.number().int().default(0),
  last_used_at: z.date().nullable(),
});

export const LocationSchema = BaseEntitySchema.extend({
  name: z.string(),
  displayName: z.string(),
  type: z.enum([
    'address',
    'building',
    'poi',
    'intersection',
    'area',
    'city',
    'county',
    'state',
    'country',
  ]),
  
  coordinates: CoordinatesSchema,
  boundingBox: z.tuple([z.number(), z.number(), z.number(), z.number()]).nullable(),
  
  address: z.object({
    streetNumber: z.string().nullable(),
    streetName: z.string().nullable(),
    unit: z.string().nullable(),
    floor: z.string().nullable(),
    buildingName: z.string().nullable(),
    
    neighborhood: z.string().nullable(),
    district: z.string().nullable(),
    city: z.string().nullable(),
    county: z.string().nullable(),
    state: z.string().nullable(),
    stateCode: z.string().nullable(),
    country: z.string().nullable(),
    countryCode: z.string().nullable(),
    postalCode: z.string().nullable(),
    
    crossStreet: z.string().nullable(),
    formatted: z.string(),
  }),
  
  administrativeCodes: z.object({
    fipsCode: z.string().nullable(),
    fipsState: z.string().nullable(),
    fipsCounty: z.string().nullable(),
    fipsPlace: z.string().nullable(),
    
    iso3166_1: z.string().nullable(),
    iso3166_2: z.string().nullable(),
    
    gnisId: z.string().nullable(),
    censusTract: z.string().nullable(),
    censusBlock: z.string().nullable(),
    metroAreaCode: z.string().nullable(),
    
    nutsCode: z.string().nullable(),
    lauCode: z.string().nullable(),
    inseeCode: z.string().nullable(),
    onsCode: z.string().nullable(),
    
    administrativeCode: z.string().nullable(),
    administrativeLevel: z.number().nullable(),
  }).default({
    fipsCode: null,
    fipsState: null,
    fipsCounty: null,
    fipsPlace: null,
    iso3166_1: null,
    iso3166_2: null,
    gnisId: null,
    censusTract: null,
    censusBlock: null,
    metroAreaCode: null,
    nutsCode: null,
    lauCode: null,
    inseeCode: null,
    onsCode: null,
    administrativeCode: null,
    administrativeLevel: null,
  }),
  
  parentLocationId: z.string().uuid().nullable(),
  
  timezone: z.string().nullable(),
  geohash: z.string().nullable(),
  plusCode: z.string().nullable(),
  what3words: z.string().nullable(),
  
  source: z.enum(['manual', 'google', 'osm', 'mapbox', 'gps', 'user', 'census']).default('manual'),
  sourceId: z.string().nullable(),
  placeId: z.string().nullable(),
  
  isVerified: z.boolean().default(false),
  verifiedAt: z.date().nullable(),
  verifiedBy: z.string().uuid().nullable(),
  
  emergencyServices: z.object({
    fireStationId: z.string().nullable(),
    policeStationId: z.string().nullable(),
    hospitalId: z.string().nullable(),
    dispatchZone: z.string().nullable(),
    responseTimeMinutes: z.number().nullable(),
    
    psapId: z.string().nullable(),
    emsZone: z.string().nullable(),
    fireDistrict: z.string().nullable(),
    policePrecinct: z.string().nullable(),
  }).nullable(),
  
  statistics: z.object({
    population: z.number().nullable(),
    areaSqKm: z.number().nullable(),
    densityPerSqKm: z.number().nullable(),
    elevationMeters: z.number().nullable(),
    
    households: z.number().nullable(),
    medianIncome: z.number().nullable(),
    populationUpdatedAt: z.date().nullable(),
  }).nullable(),
  
  usageCount: z.number().int().default(0),
  lastUsedAt: z.date().nullable(),
});

// ============================================
// Location History Schema (for tracking)
// ============================================
export const LocationHistoryDBSchema = z.object({
  id: z.string().uuid(),
  user_id: z.string().uuid(),
  location_id: z.string().uuid().nullable(),
  
  coordinates: CoordinatesSchema,
  
  // Movement data
  speed: z.number().nullable(), // m/s
  heading: z.number().nullable(), // degrees (0-360)
  
  // Context
  activity_type: z.enum(['stationary', 'walking', 'running', 'cycling', 'driving', 'unknown']).nullable(),
  
  // Device info
  device_id: z.string().nullable(),
  battery_level: z.number().nullable(),
  
  recorded_at: z.date(),
  created_at: z.date(),
});

export const LocationHistorySchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  locationId: z.string().uuid().nullable(),
  
  coordinates: CoordinatesSchema,
  
  speed: z.number().nullable(),
  heading: z.number().nullable(),
  
  activityType: z.enum(['stationary', 'walking', 'running', 'cycling', 'driving', 'unknown']).nullable(),
  
  deviceId: z.string().nullable(),
  batteryLevel: z.number().nullable(),
  
  recordedAt: z.date(),
  createdAt: z.date(),
});

// ============================================
// Geofence Schema
// ============================================
export const GeofenceDBSchema = BaseEntityDBSchema.extend({
  name: z.string(),
  description: z.string().nullable(),
  
  // Shape definition
  type: z.enum(['circle', 'polygon', 'rectangle']),
  
  // For circle
  center: CoordinatesSchema.nullable(),
  radius_meters: z.number().nullable(),
  
  // For polygon/rectangle (array of coordinates)
  vertices: z.array(CoordinatesSchema).nullable(),
  
  // Triggers
  trigger_on_enter: z.boolean().default(true),
  trigger_on_exit: z.boolean().default(true),
  trigger_on_dwell: z.boolean().default(false),
  dwell_time_seconds: z.number().nullable(),
  
  // Status
  is_active: z.boolean().default(true),
  
  // Associations
  organization_id: z.string().uuid().nullable(),
  created_by: z.string().uuid(),
});

export const GeofenceSchema = BaseEntitySchema.extend({
  name: z.string(),
  description: z.string().nullable(),
  
  type: z.enum(['circle', 'polygon', 'rectangle']),
  
  center: CoordinatesSchema.nullable(),
  radiusMeters: z.number().nullable(),
  
  vertices: z.array(CoordinatesSchema).nullable(),
  
  triggerOnEnter: z.boolean().default(true),
  triggerOnExit: z.boolean().default(true),
  triggerOnDwell: z.boolean().default(false),
  dwellTimeSeconds: z.number().nullable(),
  
  isActive: z.boolean().default(true),
  
  organizationId: z.string().uuid().nullable(),
  createdBy: z.string().uuid(),
});

// ============================================
// Input Schemas
// ============================================
export const CreateLocationSchema = z.object({
  name: z.string().min(1),
  type: z.enum(['address', 'building', 'poi', 'area']),
  coordinates: CoordinatesSchema,
  address: z.object({
    streetNumber: z.string().optional(),
    streetName: z.string().optional(),
    unit: z.string().optional(),
    city: z.string(),
    state: z.string(),
    country: z.string(),
    postalCode: z.string().optional(),
  }),
});

export const SearchLocationSchema = z.object({
  query: z.string().min(3),
  near: CoordinatesSchema.optional(),
  radius: z.number().optional(),
  types: z.array(z.string()).optional(),
  limit: z.number().max(50).default(10),
});

export const NearbySearchSchema = z.object({
  coordinates: CoordinatesSchema,
  radius: z.number().min(1).max(50000), // meters (max 50km)
  types: z.array(z.enum(['hospital', 'fire_station', 'police', 'all'])).optional(),
  limit: z.number().max(50).default(10),
});

export const GeocodeRequestSchema = z.object({
  address: z.string().min(3),
  bounds: z.object({
    southwest: CoordinatesSchema,
    northeast: CoordinatesSchema,
  }).optional(),
});

export const ReverseGeocodeRequestSchema = z.object({
  coordinates: CoordinatesSchema,
  includeNearby: z.boolean().default(false),
});

// ============================================
// Helper Functions
// ============================================
export const isValidCoordinate = (lat: number, lng: number): boolean => {
  return lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180;
};

export const calculateDistance = (from: Coordinates, to: Coordinates): number => {
  const R = 6371e3; // Earth's radius in meters
  const φ1 = (from.latitude * Math.PI) / 180;
  const φ2 = (to.latitude * Math.PI) / 180;
  const Δφ = ((to.latitude - from.latitude) * Math.PI) / 180;
  const Δλ = ((to.longitude - from.longitude) * Math.PI) / 180;

  const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) *
    Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c; // Distance in meters
};

export const parseFipsCode = (fipsCode: string): { state: string; county: string } | null => {
  if (fipsCode.length !== 5) return null;
  return {
    state: fipsCode.substring(0, 2),
    county: fipsCode.substring(2, 5),
  };
};

export const buildFipsCode = (stateCode: string, countyCode: string): string => {
  return `${stateCode.padStart(2, '0')}${countyCode.padStart(3, '0')}`;
};

// Common FIPS state codes for reference
export const FIPS_STATE_CODES = {
  'AL': '01', 'AK': '02', 'AZ': '04', 'AR': '05', 'CA': '06',
  'CO': '08', 'CT': '09', 'DE': '10', 'FL': '12', 'GA': '13',
  'HI': '15', 'ID': '16', 'IL': '17', 'IN': '18', 'IA': '19',
  'KS': '20', 'KY': '21', 'LA': '22', 'ME': '23', 'MD': '24',
  'MA': '25', 'MI': '26', 'MN': '27', 'MS': '28', 'MO': '29',
  'MT': '30', 'NE': '31', 'NV': '32', 'NH': '33', 'NJ': '34',
  'NM': '35', 'NY': '36', 'NC': '37', 'ND': '38', 'OH': '39',
  'OK': '40', 'OR': '41', 'PA': '42', 'RI': '44', 'SC': '45',
  'SD': '46', 'TN': '47', 'TX': '48', 'UT': '49', 'VT': '50',
  'VA': '51', 'WA': '53', 'WV': '54', 'WI': '55', 'WY': '56',
} as const;

// ============================================
// Type Exports
// ============================================
export type Location = z.infer<typeof LocationSchema>;
export type LocationDB = z.infer<typeof LocationDBSchema>;
export type LocationHistory = z.infer<typeof LocationHistorySchema>;
export type LocationHistoryDB = z.infer<typeof LocationHistoryDBSchema>;
export type Geofence = z.infer<typeof GeofenceSchema>;
export type GeofenceDB = z.infer<typeof GeofenceDBSchema>;
export type CreateLocationInput = z.infer<typeof CreateLocationSchema>;
export type SearchLocationInput = z.infer<typeof SearchLocationSchema>;
export type NearbySearchInput = z.infer<typeof NearbySearchSchema>;
export type GeocodeRequest = z.infer<typeof GeocodeRequestSchema>;
export type ReverseGeocodeRequest = z.infer<typeof ReverseGeocodeRequestSchema>;