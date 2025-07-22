"use client";

import { create } from "zustand";
import type { VehicleLocation, RideRequest, Metrics, GeoPoint } from "./types";

interface AutoRideState {
  // Vehicle state
  vehicles: Record<string, VehicleLocation>;

  // Ride state
  currentRide: RideRequest | null;
  pickupLocation: GeoPoint | null;
  dropoffLocation: GeoPoint | null;

  // Metrics
  metrics: Metrics;
  surgeMultiplier: number;

  // UI state
  networkStatus: "connected" | "disconnected" | "reconnecting";

  // Actions
  setVehicles: (vehicles: VehicleLocation[]) => void;
  updateVehicleLocation: (vehicle: VehicleLocation) => void;
  requestRide: (pickup: GeoPoint, dropoff: GeoPoint) => void;
  assignRide: (rideId: string, taxiId: string, etaSeconds: number) => void;
  updateRideStatus: (rideId: string, status: string) => void;
  cancelRide: (rideId: string) => void;
  setPickupLocation: (location: GeoPoint) => void;
  setDropoffLocation: (location: GeoPoint) => void;
  setSurgeMultiplier: (multiplier: number) => void;
  updateMetrics: (metrics: Partial<Metrics>) => void;
  initializeSimulation: () => void;
}

export const useAutoRideStore = create<AutoRideState>((set, get) => ({
  // Initial state
  vehicles: {},
  currentRide: null,
  pickupLocation: null,
  dropoffLocation: null,
  metrics: {
    activeRides: 0,
    avgEta: 5,
    assignmentP95: 250,
    surgeMultiplier: 1.0,
    eventsPerSec: 12,
  },
  surgeMultiplier: 1.0,
  networkStatus: "connected",

  // Actions
  setVehicles: (vehicles) => {
    const vehiclesRecord = vehicles.reduce((acc, vehicle) => {
      acc[vehicle.taxiId] = vehicle;
      return acc;
    }, {} as Record<string, VehicleLocation>);
    set({ vehicles: vehiclesRecord });
  },

  updateVehicleLocation: (vehicle) =>
    set((state) => ({
      vehicles: {
        ...state.vehicles,
        [vehicle.taxiId]: vehicle,
      },
    })),

  requestRide: (pickup, dropoff) => {
    const rideId = "ride-" + Date.now();
    const ride: RideRequest = {
      rideId,
      userId: "user-demo",
      pickup,
      dropoff,
      status: "REQUESTED",
      ts: Date.now(),
      etaSeconds: 0,
      surgeMultiplier: get().surgeMultiplier,
    };

    set({
      currentRide: ride,
      pickupLocation: pickup,
      dropoffLocation: dropoff,
    });

    // Update metrics
    const currentMetrics = get().metrics;
    set({
      metrics: {
        ...currentMetrics,
        activeRides: currentMetrics.activeRides + 1,
      },
    });
  },

  assignRide: (rideId, taxiId, etaSeconds) =>
    set((state) => {
      if (state.currentRide?.rideId === rideId) {
        return {
          currentRide: {
            ...state.currentRide,
            status: "ASSIGNED",
            taxiId,
            etaSeconds,
            ts: Date.now(),
          },
        };
      }
      return state;
    }),

  updateRideStatus: (rideId, status) =>
    set((state) => {
      if (state.currentRide?.rideId === rideId) {
        const updatedRide = {
          ...state.currentRide,
          status,
          ts: Date.now(),
        };

        // If ride is completed or cancelled, clear current ride
        if (status === "COMPLETED" || status === "CANCELLED") {
          const currentMetrics = state.metrics;
          return {
            currentRide: null,
            pickupLocation: null,
            dropoffLocation: null,
            metrics: {
              ...currentMetrics,
              activeRides: Math.max(0, currentMetrics.activeRides - 1),
            },
          };
        }

        return { currentRide: updatedRide };
      }
      return state;
    }),

  cancelRide: (rideId) =>
    set((state) => {
      if (state.currentRide?.rideId === rideId) {
        const currentMetrics = state.metrics;
        return {
          currentRide: null,
          pickupLocation: null,
          dropoffLocation: null,
          metrics: {
            ...currentMetrics,
            activeRides: Math.max(0, currentMetrics.activeRides - 1),
          },
        };
      }
      return state;
    }),

  setPickupLocation: (location) => set({ pickupLocation: location }),

  setDropoffLocation: (location) => set({ dropoffLocation: location }),

  setSurgeMultiplier: (multiplier) => set({ surgeMultiplier: multiplier }),

  updateMetrics: (newMetrics) =>
    set((state) => ({
      metrics: { ...state.metrics, ...newMetrics },
    })),

  initializeSimulation: () => {
    // This function previously created mock vehicle data for development.
    // It is now modified to clear the state, ensuring that only real-time
    // data from the backend WebSocket is displayed on the map.
    set({
      vehicles: {},
      metrics: {
        activeRides: 0,
        avgEta: 0,
        assignmentP95: 0,
        surgeMultiplier: 1.0,
        eventsPerSec: 0,
      },
    });
  },
}));
