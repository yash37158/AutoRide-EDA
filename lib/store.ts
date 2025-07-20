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
    // Initialize with sample vehicles
    const sampleVehicles: Record<string, VehicleLocation> = {};

    for (let i = 1; i <= 50; i++) {
      const taxiId = `taxi-${i.toString().padStart(3, "0")}`;
      const statuses = ["IDLE", "ASSIGNED", "ENROUTE"];
      const status = statuses[Math.floor(Math.random() * statuses.length)];

      sampleVehicles[taxiId] = {
        taxiId,
        lat: 40.7589 + (Math.random() - 0.5) * 0.02, // Around NYC
        lon: -73.9851 + (Math.random() - 0.5) * 0.02,
        speedKph: Math.random() * 50,
        status: status as any,
        seq: Date.now(),
      };
    }

    set({
      vehicles: sampleVehicles,
      metrics: {
        activeRides: Math.floor(Math.random() * 15) + 5,
        avgEta: Math.floor(Math.random() * 10) + 3,
        assignmentP95: Math.floor(Math.random() * 200) + 150,
        surgeMultiplier: 1.0,
        eventsPerSec: Math.floor(Math.random() * 20) + 10,
      },
    });
  },
}));
