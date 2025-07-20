"use client"

import { useAutoRideStore } from "@/lib/store"
import { Car, Clock, TrendingUp, Zap } from "lucide-react"

export function MetricsBar() {
  const { metrics } = useAutoRideStore()

  return (
    <div className="flex items-center gap-4 text-sm">
      <div className="flex items-center gap-1">
        <Car className="h-4 w-4 text-blue-600" />
        <span className="font-medium">{metrics.activeRides}</span>
        <span className="text-muted-foreground">rides</span>
      </div>

      <div className="flex items-center gap-1">
        <Clock className="h-4 w-4 text-green-600" />
        <span className="font-medium">{metrics.avgEta}m</span>
        <span className="text-muted-foreground">avg ETA</span>
      </div>

      <div className="flex items-center gap-1">
        <TrendingUp className="h-4 w-4 text-orange-600" />
        <span className="font-medium">{metrics.assignmentP95}ms</span>
        <span className="text-muted-foreground">p95</span>
      </div>

      <div className="flex items-center gap-1">
        <Zap className="h-4 w-4 text-purple-600" />
        <span className="font-medium">{metrics.eventsPerSec}</span>
        <span className="text-muted-foreground">events/s</span>
      </div>
    </div>
  )
}
