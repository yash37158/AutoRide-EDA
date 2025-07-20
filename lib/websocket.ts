"use client";

import { useEffect, useRef } from "react";
import { useAutoRideStore } from "./store";
import type { VehicleLocation } from "./types";

export function useWebSocket() {
  const wsRef = useRef<WebSocket | null>(null);
  const { updateVehicleLocation, updateMetrics, vehicles } = useAutoRideStore();

  useEffect(() => {
    // Simulate WebSocket connection with periodic updates
    const interval = setInterval(() => {
      // Simulate vehicle location updates
      Object.values(vehicles).forEach((vehicle) => {
        if (Math.random() < 0.3) {
          // 30% chance to update each vehicle
          const updatedVehicle: VehicleLocation = {
            ...vehicle,
            lat: vehicle.lat + (Math.random() - 0.5) * 0.0001, // Small movement
            lon: vehicle.lon + (Math.random() - 0.5) * 0.0001,
            speedKph: Math.max(0, vehicle.speedKph + (Math.random() - 0.5) * 5),
            seq: Date.now(),
          };
          updateVehicleLocation(updatedVehicle);
        }
      });

      // Simulate metrics updates
      if (Math.random() < 0.1) {
        // 10% chance to update metrics
        updateMetrics({
          avgEta: Math.floor(Math.random() * 10) + 3,
          assignmentP95: Math.floor(Math.random() * 200) + 150,
          eventsPerSec: Math.floor(Math.random() * 20) + 10,
        });
      }
    }, 500); // Update every 500ms

    return () => {
      clearInterval(interval);
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [updateVehicleLocation, updateMetrics, vehicles]);

  return wsRef.current;
}
