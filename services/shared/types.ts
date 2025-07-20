// Shared TypeScript types across all services

export interface GeoLocation {
  lat: number
  lng: number
}

export interface RideRequest {
  id: string
  userId: string
  pickup: GeoLocation
  dropoff: GeoLocation
  timestamp: number
}

export interface RideAssignment {
  rideId: string
  taxiId: string
  etaSeconds: number
  surgeMultiplier: number
  timestamp: number
}

export interface VehicleLocation {
  taxiId: string
  location: GeoLocation
  status: "IDLE" | "ASSIGNED" | "ENROUTE" | "OFFLINE"
  speedKph: number
  timestamp: number
}

export interface PricingUpdate {
  zoneId?: string
  rideId?: string
  surgeMultiplier: number
  baseFare: number
  reason: string
  timestamp: number
}

export interface KafkaEvent<T = any> {
  topic: string
  key?: string
  value: T
  timestamp: number
}

export interface Anomaly {
  id: string
  type: "LONG_WAIT" | "HIGH_SURGE" | "TAXI_OFFLINE" | "SYSTEM_ERROR"
  description: string
  severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL"
  data: any
  timestamp: number
}

export interface ChatQuery {
  id: string
  question: string
  userId?: string
  timestamp: number
}

export interface ChatResponse {
  id: string
  question: string
  answer: string
  sourceContext: Record<string, any>
  fallback: boolean
  timestamp: number
}
