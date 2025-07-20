"use client"

import { Badge } from "@/components/ui/badge"
import { TrendingUp } from "lucide-react"
import { useAutoRideStore } from "@/lib/store"

export function SurgeBadge() {
  const { surgeMultiplier } = useAutoRideStore()

  if (surgeMultiplier <= 1) {
    return (
      <Badge variant="secondary" className="flex items-center gap-1">
        <TrendingUp className="h-3 w-3" />
        Normal Pricing
      </Badge>
    )
  }

  return (
    <Badge variant="destructive" className="flex items-center gap-1">
      <TrendingUp className="h-3 w-3" />
      {surgeMultiplier}x Surge
    </Badge>
  )
}
