"use client";

import { Clock, TrendingUp, Users, Zap } from "lucide-react";
import { useAutoRideStore } from "@/lib/store";

export function MetricsPanel() {
  const { metrics } = useAutoRideStore();

  return (
    <div className="bg-white/95 backdrop-blur-sm border-b border-slate-200/60 px-6 py-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-8">
          <div className="flex items-center gap-3 px-3 py-2 bg-blue-50 rounded-lg">
            <Users className="h-4 w-4 text-blue-600" />
            <div>
              <p className="text-xs text-blue-600 font-medium">Active Rides</p>
              <span className="text-xl font-bold text-blue-900">{metrics.activeRides}</span>
            </div>
          </div>

          <div className="flex items-center gap-3 px-3 py-2 bg-emerald-50 rounded-lg ml-8">
            <Clock className="h-4 w-4 text-emerald-600" />
            <div>
              <p className="text-xs text-emerald-600 font-medium">Avg ETA</p>
              <span className="text-xl font-bold text-emerald-900">
                {metrics.avgEta > 0 ? `${Math.round(metrics.avgEta / 60)}m` : '0m'}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3 px-3 py-2 bg-purple-50 rounded-lg">
            <TrendingUp className="h-4 w-4 text-purple-600" />
            <div>
              <p className="text-xs text-purple-600 font-medium">Events/sec</p>
              <span className="text-xl font-bold text-purple-900">{metrics.eventsPerSec}</span>
            </div>
          </div>
        </div>
        
        {/* Surge Pricing Indicator */}
        <div className="flex items-center gap-2 px-3 py-2 bg-orange-50 rounded-lg">
          <Zap className="h-4 w-4 text-orange-600" />
          <div className="text-right">
            <p className="text-xs text-orange-600 font-medium">Surge Pricing</p>
            <span className="text-xl font-bold text-orange-900">{metrics.surgeMultiplier}x</span>
          </div>
        </div>
      </div>
    </div>
  );
}
