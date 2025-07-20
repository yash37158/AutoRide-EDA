"use client";

import { Car } from "lucide-react";
import type { VehicleLocation } from "@/lib/types";
import { cn } from "@/lib/utils";

interface TaxiMarkerProps {
  vehicle: VehicleLocation;
}

export function TaxiMarker({ vehicle }: TaxiMarkerProps) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case "IDLE":
        return "bg-blue-500";
      case "ASSIGNED":
        return "bg-yellow-500";
      case "ENROUTE":
        return "bg-green-500";
      default:
        return "bg-gray-500";
    }
  };

  const isEnroute = vehicle.status === "ENROUTE";

  return (
    <div
      className="absolute transform -translate-x-1/2 -translate-y-1/2 z-10 transition-all duration-300"
      style={{
        left: `${50 + (vehicle.lon + 73.9851) * 1000}%`,
        top: `${50 + (vehicle.lat - 40.7589) * -1000}%`,
      }}
    >
      {/* Pulse animation for enroute vehicles */}
      {isEnroute && (
        <div className="absolute inset-0 rounded-full bg-green-400 animate-ping opacity-75" />
      )}

      {/* Taxi marker */}
      <div
        className={cn(
          "flex items-center justify-center w-6 h-6 rounded-full shadow-lg transition-colors",
          getStatusColor(vehicle.status),
        )}
        title={`Taxi ${vehicle.taxiId} - ${vehicle.status}`}
      >
        <Car className="h-3 w-3 text-white" />
      </div>

      {/* Status indicator */}
      <div className="absolute -bottom-6 left-1/2 transform -translate-x-1/2">
        <div className="px-1 py-0.5 text-xs bg-black/75 text-white rounded text-center whitespace-nowrap">
          {vehicle.taxiId}
        </div>
      </div>
    </div>
  );
}
