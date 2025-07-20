"use client"

import { Badge } from "@/components/ui/badge"
import { useAutoRideStore } from "@/lib/store"
import { TrendingUp, Clock, Car, Zap, Activity } from "lucide-react"

export function MetricsPanel() {
  const { metrics, surgeMultiplier } = useAutoRideStore()

  return (
    <div className="bg-white/95 backdrop-blur-md border-b border-slate-200/60 shadow-sm">
      <div className="px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-3 px-3 py-2 bg-blue-50 rounded-lg">
              <Car className="h-5 w-5 text-blue-600" />
              <div>
                <span className="text-xl font-bold text-blue-900">{metrics.activeRides}</span>
                <span className="text-sm text-blue-600 ml-2">Active Rides</span>
              </div>
            </div>

            <div className="flex items-center gap-3 px-3 py-2 bg-emerald-50 rounded-lg">
              <Clock className="h-5 w-5 text-emerald-600" />
              <div>
                <span className="text-xl font-bold text-emerald-900">{metrics.avgEta}</span>
                <span className="text-sm text-emerald-600 ml-1">min ETA</span>
              </div>
            </div>

            <div className="flex items-center gap-3 px-3 py-2 bg-purple-50 rounded-lg">
              <Zap className="h-5 w-5 text-purple-600" />
              <div>
                <span className="text-xl font-bold text-purple-900">{metrics.eventsPerSec}</span>
                <span className="text-sm text-purple-600 ml-1">events/s</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {surgeMultiplier > 1 ? (
              <Badge className="bg-gradient-to-r from-red-500 to-orange-500 text-white border-0 px-3 py-1 shadow-sm">
                <TrendingUp className="h-4 w-4 mr-1" />
                {surgeMultiplier}x Surge Active
              </Badge>
            ) : (
              <Badge className="bg-gradient-to-r from-green-500 to-emerald-500 text-white border-0 px-3 py-1 shadow-sm">
                <TrendingUp className="h-4 w-4 mr-1" />
                Normal Pricing
              </Badge>
            )}

            <div className="flex items-center gap-2 px-3 py-2 bg-green-50 rounded-lg">
              <div className="relative">
                <Activity className="h-4 w-4 text-green-600" />
                <div className="absolute -top-1 -right-1 w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              </div>
              <span className="text-sm font-medium text-green-700">Live</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
