export interface GeoPoint {
  lat: number
  lng: number
}

export interface VehicleLocation {
  taxiId: string
  lat: number
  lon: number
  speedKph: number
  status: "IDLE" | "ASSIGNED" | "ENROUTE"
  seq: number
}

export interface RideRequest {
  rideId: string
  userId: string
  pickup: GeoPoint
  dropoff: GeoPoint
  status: "REQUESTED" | "ASSIGNED" | "ENROUTE" | "COMPLETED" | "CANCELLED"
  ts: number
  taxiId?: string
  etaSeconds: number
  surgeMultiplier: number
}

export interface Metrics {
  activeRides: number
  avgEta: number
  assignmentP95: number
  surgeMultiplier: number
  eventsPerSec: number
}

export interface EventEnvelope<T> {
  topic: string
  ts: number
  payload: T
}
