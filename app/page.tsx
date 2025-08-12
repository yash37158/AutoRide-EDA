"use client";

import { useEffect } from "react";
import MapWithTaxies from "@/components/map/MapWithTaxies";
import { ControlPanel } from "@/components/panels/control-panel";
import { MetricsPanel } from "@/components/panels/metrics-panel";
import { useAutoRideStore } from "@/lib/store";

export default function AutoRideEDA() {
  const { initializeSimulation } = useAutoRideStore();

  // Initialize state (no mock websocket)
  useEffect(() => {
    initializeSimulation();
  }, [initializeSimulation]);

  return (
    <div className="h-screen w-full bg-gradient-to-br from-slate-50 to-blue-50 flex overflow-hidden">
      {/* Left Control Panel - Responsive */}
      <div className="w-full md:w-96 lg:w-80 xl:w-96 bg-white/95 backdrop-blur-sm border-r border-slate-200/60 flex flex-col shadow-xl md:shadow-none">
        <ControlPanel />
      </div>

      {/* Main Map Area - Hidden on mobile when panel is open */}
      <div className="hidden md:flex flex-1 relative">
        <MapWithTaxies />

        {/* Top Metrics Bar */}
        <div className="absolute top-0 left-0 right-0 z-10">
          <MetricsPanel />
        </div>
      </div>
    </div>
  );
}