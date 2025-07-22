// hooks/useTaxiLocations.ts
import { useCallback } from 'react';
import { useWebSocket } from './websocket';
import { useAutoRideStore } from '@/lib/store';
import type { VehicleLocation } from '@/lib/types';

export function useTaxiLocations() {
  // Use the action designed for single vehicle updates
  const updateVehicleLocation = useAutoRideStore(
    (state) => state.updateVehicleLocation,
  );

  const handleMessage = useCallback((vehicle: VehicleLocation) => {
    // When a single vehicle update comes from the WebSocket,
    // call the appropriate action to update it in the store.
    updateVehicleLocation(vehicle);
  }, [updateVehicleLocation]);

  // Connect to the WebSocket and pass the handler
  useWebSocket('ws://localhost:3002', handleMessage);

  // This hook no longer needs to return anything
}
