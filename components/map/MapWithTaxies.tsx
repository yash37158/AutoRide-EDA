import React from 'react';
import { MapViewport } from './map-viewport';
import { TaxiMarker } from './taxi-marker';
import { useTaxiLocations } from '@/hooks/useTaxiLocations';
import { useAutoRideStore } from '@/lib/store'; // Import your store

export default function MapWithTaxis() {
  // 1. Get the live taxi data from the central store
  const taxis = useAutoRideStore((state) => Object.values(state.vehicles));

  // 2. Call the hook to start the WebSocket connection and data flow
  useTaxiLocations();

  return (
    <MapViewport>
      {taxis.map((taxi) => (
        <TaxiMarker key={taxi.taxiId} vehicle={taxi} />
      ))}
    </MapViewport>
  );
}
