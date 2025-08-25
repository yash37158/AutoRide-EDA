"use client";

import { TrendingUp, Users, Zap, Clock } from "lucide-react";
import { useAutoRideStore } from "@/lib/store";

export function MetricsPanel() {
  const { 
    metrics, 
    etaToPickup, 
    etaToDestination, 
    taxiStatus, 
    selectedTaxi 
  } = useAutoRideStore();

  // Calculate dynamic values based on current state
  const getAvgETA = () => {
    if (etaToPickup > 0) {
      return Math.round(etaToPickup / 60); // Convert seconds to minutes
    }
    if (etaToDestination > 0) {
      return Math.round(etaToDestination / 60);
    }
    return metrics.avgEta || 0;
  };

  const getEventsPerSec = () => {
    // Count active events: taxi movements, ride updates, etc.
    let eventCount = 0;
    if (selectedTaxi) eventCount++;
    if (etaToPickup > 0) eventCount++;
    if (etaToDestination > 0) eventCount++;
    
    return Math.max(eventCount, metrics.eventsPerSec || 0);
  };

  return (
    <div className="bg-white/95 backdrop-blur-sm border-b border-slate-200/60 px-6 py-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-8">
          <div className="flex items-center gap-3 px-3 py-2 bg-blue-50 rounded-lg">
            <Users className="h-4 w-4 text-blue-600" />
            <div>
              <p className="text-xs text-blue-600 font-medium">Active Rides</p>
              <p className="text-xl font-bold text-blue-900">{metrics.activeRides || 0}</p>
            </div>
          </div>

          <div className="flex items-center gap-3 px-3 py-2 bg-green-50 rounded-lg">
            <Clock className="h-4 w-4 text-green-600" />
            <div>
              <p className="text-xs text-green-600 font-medium">Avg ETA</p>
              <p className="text-xl font-bold text-green-900">{getAvgETA()}m</p>
            </div>
          </div>

          <div className="flex items-center gap-3 px-3 py-2 bg-purple-50 rounded-lg">
            <TrendingUp className="h-4 w-4 text-purple-600" />
            <div>
              <p className="text-xs text-purple-600 font-medium">Events/sec</p>
              <p className="text-xl font-bold text-purple-900">{getEventsPerSec()}</p>
            </div>
          </div>

          <div className="flex items-center gap-3 px-3 py-2 bg-amber-50 rounded-lg">
            <Zap className="h-4 w-4 text-amber-600" />
            <div>
              <p className="text-xs text-amber-600 font-medium">Surge</p>
              <p className="text-xl font-bold text-amber-900">{metrics.surgeMultiplier || 1.0}x</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
