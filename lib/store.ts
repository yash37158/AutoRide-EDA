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
  pickupAddress: string;
  dropoffAddress: string;
  selectedTaxi: VehicleLocation | null;
  etaToPickup: number; // in seconds
  etaToDestination: number; // in seconds
  taxiRoute: GeoPoint[]; // path from taxi to pickup
  rideRoute: GeoPoint[]; // path from pickup to dropoff
  taxiProgress: number; // 0 to 1, progress along route
  rideProgress: number; // 0 to 1, progress along ride route
  taxiStatus: "EN_ROUTE_TO_PICKUP" | "ARRIVED_AT_PICKUP" | "EN_ROUTE_TO_DESTINATION" | "COMPLETED" | "IDLE";
  currentPhase: "SELECTING_TAXI" | "GOING_TO_PICKUP" | "PICKUP_WAIT" | "GOING_TO_DESTINATION" | "COMPLETED";

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
  setPickupAddress: (address: string) => void;
  setDropoffAddress: (address: string) => void;
  setSurgeMultiplier: (multiplier: number) => void;
  updateMetrics: (metrics: Partial<Metrics>) => void;
  initializeSimulation: () => void;
  selectNearestTaxi: (pickup: GeoPoint) => Promise<void>;
  calculateTaxiRoute: (taxi: VehicleLocation, pickup: GeoPoint) => Promise<{ distance: number; coordinates: GeoPoint[]; }>;
  calculateRoute: (pickup: GeoPoint, dropoff: GeoPoint) => Promise<void>;
  clearTaxiSelection: () => void;
  startTaxiMovement: () => void;
  updateTaxiProgress: () => void;
  startRideJourney: () => void;
  updateRideProgress: () => void;
  completeRide: () => void;
}

export const useAutoRideStore = create<AutoRideState>((set, get) => ({
  // Initial state
  vehicles: {},
  currentRide: null,
  pickupLocation: null,
  dropoffLocation: null,
  pickupAddress: "",
  dropoffAddress: "",
  selectedTaxi: null,
  etaToPickup: 0,
  etaToDestination: 0,
  taxiRoute: [],
  rideRoute: [],
  taxiProgress: 0,
  rideProgress: 0,
  taxiStatus: "IDLE",
  currentPhase: "SELECTING_TAXI",
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
    set((state) => {
      // Don't update intelligent taxis from external sources
      if (state.selectedTaxi && vehicle.taxiId === state.selectedTaxi.taxiId) {
        // This is our intelligent taxi - ignore external updates
        return state;
      }
      
      return {
        vehicles: {
          ...state.vehicles,
          [vehicle.taxiId]: vehicle,
        },
      };
    }),

  selectNearestTaxi: async (pickup) => {
    const state = get();
    console.log("🤖 Intelligent taxi selection started...");
    
    // Consider taxis that are IDLE or can be reassigned
    const availableTaxis = Object.values(state.vehicles).filter(
      taxi => taxi.status === "IDLE" || taxi.status === "ENROUTE"
    );

    if (availableTaxis.length === 0) {
      console.log("❌ No available taxis found");
      set({ selectedTaxi: null, etaToPickup: 0, taxiRoute: [] });
      return;
    }

    console.log(`🔍 Found ${availableTaxis.length} available taxis`);

    // Intelligent selection algorithm
    let bestTaxi = availableTaxis[0];
    let bestScore = -Infinity;
    let bestRoute: GeoPoint[] = [];

    for (const taxi of availableTaxis) {
      // Calculate multiple factors for intelligent selection
      const directDistance = calculateDistance(
        pickup.lat, pickup.lng,
        taxi.lat, taxi.lon
      );
      
      // Factor 1: Distance (closer is better)
      const distanceScore = Math.max(0, 10 - directDistance);
      
      // Factor 2: Current speed (faster is better)
      const speedScore = Math.min(taxi.speedKph / 50, 1);
      
      // Factor 3: Status preference (IDLE > ENROUTE)
      const statusScore = taxi.status === "IDLE" ? 2 : 1;
      
      // Factor 4: Route efficiency
      const route = await calculateTaxiRouteDistance(taxi, pickup);
      const routeEfficiency = Math.max(0, 5 - route.distance);
      
      // Calculate total score
      const totalScore = distanceScore + speedScore + statusScore + routeEfficiency;
      
      console.log(`🤖 Taxi ${taxi.taxiId}: Distance=${directDistance.toFixed(2)}km, Speed=${taxi.speedKph}km/h, Score=${totalScore.toFixed(2)}`);
      
      if (totalScore > bestScore) {
        bestScore = totalScore;
        bestTaxi = taxi;
        bestRoute = route.coordinates;
      }
    }

    console.log(`🏆 Selected taxi ${bestTaxi.taxiId} with score ${bestScore.toFixed(2)}`);
    
    const etaSeconds = Math.round((bestRoute.length > 0 ? calculateRouteDistance(bestRoute) : calculateDistance(bestTaxi.lat, bestTaxi.lon, pickup.lat, pickup.lng)) / 30 * 3600);
    
    set({ 
      selectedTaxi: bestTaxi,
      etaToPickup: etaSeconds,
      taxiRoute: bestRoute,
      taxiProgress: 0,
      taxiStatus: "EN_ROUTE_TO_PICKUP",
      currentPhase: "GOING_TO_PICKUP"
    });

    // Store in localStorage for persistence
    const currentState = get();
    localStorage.setItem('autoride-selected-taxi', JSON.stringify({
      taxi: currentState.selectedTaxi,
      eta: currentState.etaToPickup,
      route: currentState.taxiRoute,
      timestamp: Date.now()
    }));
  },

  calculateTaxiRoute: async (taxi, pickup) => {
    const route = await calculateTaxiRouteDistance(taxi, pickup);
    set({ taxiRoute: route.coordinates });
    return route;
  },

  calculateRoute: async (pickup, dropoff) => {
    const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
    
    if (!MAPBOX_TOKEN) {
      const distance = calculateDistance(pickup.lat, pickup.lng, dropoff.lat, dropoff.lng);
      const etaSeconds = Math.round((distance / 30) * 3600);
      set({ etaToDestination: etaSeconds });
      return;
    }

    try {
      const response = await fetch(
        `https://api.mapbox.com/directions/v5/mapbox/driving/${pickup.lng},${pickup.lat};${dropoff.lng},${dropoff.lat}?geometries=geojson&access_token=${MAPBOX_TOKEN}&overview=full&steps=true`
      );
      const data = await response.json();
      
      if (data.routes && data.routes.length > 0) {
        const route = data.routes[0];
        const coordinates = route.geometry.coordinates.map((coord: number[]) => ({
          lng: coord[0],
          lat: coord[1]
        }));
        
        const etaSeconds = Math.round(route.duration);
        set({ 
          etaToDestination: etaSeconds,
          rideRoute: coordinates
        });
      }
    } catch (error) {
      console.error("Routing error:", error);
      const distance = calculateDistance(pickup.lat, pickup.lng, dropoff.lat, dropoff.lng);
      const etaSeconds = Math.round((distance / 30) * 3600);
      set({ etaToDestination: etaSeconds });
    }
  },

  startTaxiMovement: () => {
    const state = get();
    if (!state.selectedTaxi || !state.taxiRoute.length) return;

    console.log("🚗 Starting intelligent taxi movement to pickup...");
    
    const movementInterval = setInterval(() => {
      state.updateTaxiProgress();
    }, 1000);

    localStorage.setItem('autoride-movement-interval', movementInterval.toString());
  },

  updateTaxiProgress: () => {
    const state = get();
    if (!state.selectedTaxi || !state.taxiRoute.length) return;

    const currentProgress = state.taxiProgress;
    const newProgress = Math.min(currentProgress + 0.02, 1);
    
    if (newProgress >= 1) {
      // Taxi has arrived at pickup
      const pickupLocation = state.pickupLocation;
      if (pickupLocation) {
        const updatedVehicles = { ...state.vehicles };
        if (updatedVehicles[state.selectedTaxi.taxiId]) {
          updatedVehicles[state.selectedTaxi.taxiId] = {
            ...updatedVehicles[state.selectedTaxi.taxiId],
            lat: pickupLocation.lat,
            lon: pickupLocation.lng,
            status: "ASSIGNED"
          };
        }
        set({ 
          vehicles: updatedVehicles,
          taxiProgress: 1, 
          taxiStatus: "ARRIVED_AT_PICKUP",
          currentPhase: "PICKUP_WAIT"
        });
      }
      
      // Show notification
      if (typeof window !== 'undefined' && 'Notification' in window) {
        if (Notification.permission === 'granted') {
          new Notification('🚕 Taxi Arrived!', {
            body: `Your intelligent taxi ${state.selectedTaxi?.taxiId} has arrived at the pickup location.`,
            icon: '/placeholder-logo.png'
          });
        }
      }
      
      // Clear movement interval
      const intervalId = localStorage.getItem('autoride-movement-interval');
      if (intervalId) {
        clearInterval(parseInt(intervalId));
        localStorage.removeItem('autoride-movement-interval');
      }
      
      console.log("✅ Taxi has arrived at pickup! Starting ride journey...");
      
      // Start the ride journey after a short delay
      setTimeout(() => {
        state.startRideJourney();
      }, 3000); // 3 second wait at pickup
      
    } else {
      // Update taxi position along the route
      if (state.taxiRoute.length > 1) {
        const currentIndex = Math.floor(newProgress * (state.taxiRoute.length - 1));
        const currentPosition = state.taxiRoute[currentIndex];
        
        if (currentPosition) {
          const updatedVehicles = { ...state.vehicles };
          if (updatedVehicles[state.selectedTaxi.taxiId]) {
            updatedVehicles[state.selectedTaxi.taxiId] = {
              ...updatedVehicles[state.selectedTaxi.taxiId],
              lat: currentPosition.lat,
              lon: currentPosition.lng,
              status: "EN_ROUTE_TO_PICKUP"
            };
          }
          set({ 
            vehicles: updatedVehicles,
            taxiProgress: newProgress 
          });
        }
      } else {
        set({ taxiProgress: newProgress });
      }
    }
  },

  startRideJourney: () => {
    const state = get();
    if (!state.rideRoute.length) return;

    console.log("🚗 Starting ride journey to destination...");
    
    set({
      taxiStatus: "EN_ROUTE_TO_DESTINATION",
      currentPhase: "GOING_TO_DESTINATION",
      rideProgress: 0
    });

    const rideInterval = setInterval(() => {
      state.updateRideProgress();
    }, 1000);

    localStorage.setItem('autoride-ride-interval', rideInterval.toString());
  },

  updateRideProgress: () => {
    const state = get();
    if (!state.rideRoute.length || !state.selectedTaxi) return;

    const currentProgress = state.rideProgress;
    const newProgress = Math.min(currentProgress + 0.02, 1);
    
    if (newProgress >= 1) {
      // Ride completed
      const dropoffLocation = state.dropoffLocation;
      if (dropoffLocation && state.selectedTaxi) {
        const updatedVehicles = { ...state.vehicles };
        if (updatedVehicles[state.selectedTaxi.taxiId]) {
          updatedVehicles[state.selectedTaxi.taxiId] = {
            ...updatedVehicles[state.selectedTaxi.taxiId],
            lat: dropoffLocation.lat,
            lon: dropoffLocation.lng,
            status: "IDLE" // Taxi becomes available again
          };
        }
        set({ 
          vehicles: updatedVehicles,
          rideProgress: 1, 
          taxiStatus: "COMPLETED",
          currentPhase: "COMPLETED"
        });
      }
      
      // Show completion notification
      if (typeof window !== 'undefined' && 'Notification' in window) {
        if (Notification.permission === 'granted') {
          new Notification('🎉 Ride Completed!', {
            body: `Your intelligent taxi ${state.selectedTaxi?.taxiId} has reached your destination.`,
            icon: '/placeholder-logo.png'
          });
        }
      }
      
      // Clear ride interval
      const intervalId = localStorage.getItem('autoride-ride-interval');
      if (intervalId) {
        clearInterval(parseInt(intervalId));
        localStorage.removeItem('autoride-ride-interval');
      }
      
      console.log("🎉 Ride completed successfully!");
      
      // Complete the ride after a delay
      setTimeout(() => {
        state.completeRide();
      }, 2000);
      
    } else {
      // Update taxi position along the ride route
      if (state.rideRoute.length > 1) {
        const currentIndex = Math.floor(newProgress * (state.rideRoute.length - 1));
        const currentPosition = state.rideRoute[currentIndex];
        
        if (currentPosition) {
          const updatedVehicles = { ...state.vehicles };
          if (updatedVehicles[state.selectedTaxi.taxiId]) {
            updatedVehicles[state.selectedTaxi.taxiId] = {
              ...updatedVehicles[state.selectedTaxi.taxiId],
              lat: currentPosition.lat,
              lon: currentPosition.lng,
              status: "EN_ROUTE_TO_DESTINATION"
            };
          }
          set({ 
            vehicles: updatedVehicles,
            rideProgress: newProgress 
          });
        }
      } else {
        set({ rideProgress: newProgress });
      }
    }
  },

  completeRide: () => {
    const state = get();
    const currentMetrics = state.metrics;
    
    set({
      currentRide: null,
      pickupLocation: null,
      dropoffLocation: null,
      pickupAddress: "",
      dropoffAddress: "",
      selectedTaxi: null,
      etaToPickup: 0,
      etaToDestination: 0,
      taxiRoute: [],
      rideRoute: [],
      taxiProgress: 0,
      rideProgress: 0,
      taxiStatus: "IDLE",
      currentPhase: "SELECTING_TAXI",
      metrics: {
        ...currentMetrics,
        activeRides: Math.max(0, currentMetrics.activeRides - 1),
      },
    });
    
    // Clear all intervals
    const movementInterval = localStorage.getItem('autoride-movement-interval');
    const rideInterval = localStorage.getItem('autoride-ride-interval');
    if (movementInterval) {
      clearInterval(parseInt(movementInterval));
      localStorage.removeItem('autoride-movement-interval');
    }
    if (rideInterval) {
      clearInterval(parseInt(rideInterval));
      localStorage.removeItem('autoride-ride-interval');
    }
    
    localStorage.removeItem('autoride-selected-taxi');
  },

  requestRide: async (pickup, dropoff) => {
    console.log("🚀 Intelligent ride request initiated...");
    const state = get();
    
    // Select nearest taxi with intelligent algorithm
    console.log("🤖 Selecting most suitable taxi...");
    await state.selectNearestTaxi(pickup);
    
    // Calculate route from pickup to dropoff
    console.log("🗺️ Calculating optimal route...");
    await state.calculateRoute(pickup, dropoff);
    
    const rideId = "ride-" + Date.now();
    const ride: RideRequest = {
      rideId,
      userId: "user-demo",
      pickup,
      dropoff,
      status: "REQUESTED",
      ts: Date.now(),
      etaSeconds: state.etaToPickup + state.etaToDestination,
      surgeMultiplier: state.surgeMultiplier,
    };

    console.log("📋 Creating intelligent ride:", ride);

    set({
      currentRide: ride,
      pickupLocation: pickup,
      dropoffLocation: dropoff,
    });

    // Publish to Kafka for AI processing
    try {
      await fetch('http://localhost:3001/ride-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: "user-demo",
          pickup,
          dropoff,
          timestamp: Date.now()
        })
      });
    } catch (error) {
      console.error('Failed to publish ride request to Kafka:', error);
    }

    // Start intelligent taxi movement
    state.startTaxiMovement();

    // Update metrics
    const currentMetrics = state.metrics;
    set({
      metrics: {
        ...currentMetrics,
        activeRides: currentMetrics.activeRides + 1,
      },
    });

    console.log("✅ Intelligent ride created successfully!");
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
          status: status as "REQUESTED" | "ASSIGNED" | "ENROUTE" | "COMPLETED" | "CANCELLED",
          ts: Date.now(),
        };

        // If ride is completed or cancelled, clear current ride
        if (status === "COMPLETED" || status === "CANCELLED") {
          const currentMetrics = state.metrics;
          return {
            currentRide: null,
            pickupLocation: null,
            dropoffLocation: null,
            pickupAddress: "",
            dropoffAddress: "",
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
          pickupAddress: "",
          dropoffAddress: "",
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

  setPickupAddress: (address) => set({ pickupAddress: address }),

  setDropoffAddress: (address) => set({ dropoffAddress: address }),

  setSurgeMultiplier: (multiplier) => set({ surgeMultiplier: multiplier }),

  updateMetrics: (newMetrics) =>
    set((state) => ({
      metrics: { ...state.metrics, ...newMetrics },
    })),

  initializeSimulation: () => {
    // Try to restore selected taxi from localStorage
    let restoredTaxi = null;
    let restoredEta = 0;
    let restoredRoute: GeoPoint[] = [];
    
    try {
      const stored = localStorage.getItem('autoride-selected-taxi');
      if (stored) {
        const data = JSON.parse(stored);
        if (Date.now() - data.timestamp < 5 * 60 * 1000) {
          restoredTaxi = data.taxi;
          restoredEta = data.eta;
          restoredRoute = data.route;
        } else {
          localStorage.removeItem('autoride-selected-taxi');
        }
      }
    } catch (error) {
      console.error('Error restoring taxi data:', error);
      localStorage.removeItem('autoride-selected-taxi');
    }

    set({
      vehicles: {},
      pickupLocation: null,
      dropoffLocation: null,
      pickupAddress: "",
      dropoffAddress: "",
      selectedTaxi: restoredTaxi,
      etaToPickup: restoredEta,
      etaToDestination: 0,
      taxiRoute: restoredRoute,
      rideRoute: [],
      taxiProgress: 0,
      rideProgress: 0,
      taxiStatus: "IDLE",
      currentPhase: "SELECTING_TAXI",
      metrics: {
        activeRides: 0,
        avgEta: 0,
        assignmentP95: 0,
        surgeMultiplier: 1.0,
        eventsPerSec: 0,
      },
    });
  },

  clearTaxiSelection: () => {
    set({ 
      selectedTaxi: null, 
      etaToPickup: 0, 
      taxiRoute: [],
      rideRoute: [],
      taxiProgress: 0,
      rideProgress: 0,
      taxiStatus: "IDLE",
      currentPhase: "SELECTING_TAXI"
    });
    localStorage.removeItem('autoride-selected-taxi');
    
    // Clear all intervals
    const movementInterval = localStorage.getItem('autoride-movement-interval');
    const rideInterval = localStorage.getItem('autoride-ride-interval');
    if (movementInterval) {
      clearInterval(parseInt(movementInterval));
      localStorage.removeItem('autoride-movement-interval');
    }
    if (rideInterval) {
      clearInterval(parseInt(rideInterval));
      localStorage.removeItem('autoride-ride-interval');
    }
  },
}));

// Helper function to calculate distance between two points (Haversine formula)
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth's radius in kilometers
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

// Helper function to calculate taxi route distance using Mapbox
async function calculateTaxiRouteDistance(taxi: VehicleLocation, pickup: GeoPoint): Promise<{
  distance: number;
  coordinates: GeoPoint[];
}> {
  const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
  
  if (!MAPBOX_TOKEN) {
    // Fallback: direct line distance
    const distance = calculateDistance(taxi.lat, taxi.lon, pickup.lat, pickup.lng);
    return {
      distance,
      coordinates: [
        { lat: taxi.lat, lng: taxi.lon },
        { lat: pickup.lat, lng: pickup.lng }
      ]
    };
  }

  try {
    const response = await fetch(
      `https://api.mapbox.com/directions/v5/mapbox/driving/${taxi.lon},${taxi.lat};${pickup.lng},${pickup.lat}?geometries=geojson&access_token=${MAPBOX_TOKEN}&overview=full&steps=true`
    );
    const data = await response.json();
    
    if (data.routes && data.routes.length > 0) {
      const route = data.routes[0];
      const coordinates = route.geometry.coordinates.map((coord: number[]) => ({
        lng: coord[0],
        lat: coord[1]
      }));
      
      // Ensure we have enough waypoints for smooth movement
      if (coordinates.length < 10) {
        // Interpolate additional points for smoother movement
        const interpolatedCoordinates = [];
        for (let i = 0; i < coordinates.length - 1; i++) {
          interpolatedCoordinates.push(coordinates[i]);
          // Add 2 intermediate points between each coordinate
          for (let j = 1; j <= 2; j++) {
            const ratio = j / 3;
            const lat = coordinates[i].lat + (coordinates[i + 1].lat - coordinates[i].lat) * ratio;
            const lng = coordinates[i].lng + (coordinates[i + 1].lng - coordinates[i].lng) * ratio;
            interpolatedCoordinates.push({ lat, lng });
          }
        }
        interpolatedCoordinates.push(coordinates[coordinates.length - 1]);
        
        return {
          distance: route.distance / 1000, // Convert meters to kilometers
          coordinates: interpolatedCoordinates
        };
      }
      
      return {
        distance: route.distance / 1000, // Convert meters to kilometers
        coordinates
      };
    }
  } catch (error) {
    console.error("Taxi route calculation error:", error);
  }
  
  // Fallback: direct line distance
  const distance = calculateDistance(taxi.lat, taxi.lon, pickup.lat, pickup.lng);
  return {
    distance,
    coordinates: [
      { lat: taxi.lat, lng: taxi.lon },
      { lat: pickup.lat, lng: pickup.lng }
    ]
  };
}

// Helper function to calculate total route distance
function calculateRouteDistance(route: GeoPoint[]): number {
  if (route.length < 2) return 0;
  
  let totalDistance = 0;
  for (let i = 0; i < route.length - 1; i++) {
    totalDistance += calculateDistance(
      route[i].lat, route[i].lng,
      route[i + 1].lat, route[i + 1].lng
    );
  }
  return totalDistance;
}
