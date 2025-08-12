import React from 'react';
import { MapViewport } from './map-viewport';
import { useTaxiLocations } from '@/hooks/useTaxiLocations';

export default function MapWithTaxis() {
  // Connect to backend realtime updates; no local mock rendering
  useTaxiLocations();

  // All taxi markers are rendered by MapViewport (Mapbox Markers)
  return <MapViewport>{null}</MapViewport>;
}