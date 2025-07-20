"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { RideRequestForm } from "@/components/ride/ride-request-form"
import { RideStatusDisplay } from "@/components/ride/ride-status-display"
import { ChatAssistant } from "@/components/chat/chat-assistant"
import { DemoController } from "@/components/demo/demo-controller"
import { useAutoRideStore } from "@/lib/store"
import { Car, MessageSquare, Play, BarChart3, Sparkles } from "lucide-react"

export function ControlPanel() {
  const { currentRide } = useAutoRideStore()
  const [activeTab, setActiveTab] = useState("ride")

  return (
    <div className="h-full flex flex-col">
      {/* Enhanced Header */}
      <div className="p-6 border-b border-slate-200/60 bg-gradient-to-r from-blue-600 to-indigo-600">
        <div className="flex items-center gap-4">
          <div className="relative">
            <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center border border-white/30">
              <Car className="h-7 w-7 text-white" />
            </div>
            <div className="absolute -top-1 -right-1 w-4 h-4 bg-green-400 rounded-full border-2 border-white animate-pulse"></div>
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">AutoRide</h1>
            <p className="text-blue-100 text-sm font-medium">Autonomous Fleet Management</p>
          </div>
        </div>
      </div>

      {/* Enhanced Tabs */}
      <div className="flex-1 p-6 overflow-hidden">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col">
          <TabsList className="grid w-full grid-cols-4 mb-6 bg-slate-100/80 backdrop-blur-sm p-1 rounded-xl">
            <TabsTrigger
              value="ride"
              className="text-xs font-medium data-[state=active]:bg-white data-[state=active]:shadow-sm rounded-lg transition-all duration-200"
            >
              <Car className="h-4 w-4 mr-2" />
              <span className="hidden sm:inline">Ride</span>
            </TabsTrigger>
            <TabsTrigger
              value="chat"
              className="text-xs font-medium data-[state=active]:bg-white data-[state=active]:shadow-sm rounded-lg transition-all duration-200"
            >
              <MessageSquare className="h-4 w-4 mr-2" />
              <span className="hidden sm:inline">AI</span>
            </TabsTrigger>
            <TabsTrigger
              value="demo"
              className="text-xs font-medium data-[state=active]:bg-white data-[state=active]:shadow-sm rounded-lg transition-all duration-200"
            >
              <Play className="h-4 w-4 mr-2" />
              <span className="hidden sm:inline">Demo</span>
            </TabsTrigger>
            <TabsTrigger
              value="fleet"
              className="text-xs font-medium data-[state=active]:bg-white data-[state=active]:shadow-sm rounded-lg transition-all duration-200"
            >
              <BarChart3 className="h-4 w-4 mr-2" />
              <span className="hidden sm:inline">Fleet</span>
            </TabsTrigger>
          </TabsList>

          <div className="flex-1 overflow-hidden">
            <TabsContent value="ride" className="h-full overflow-y-auto">
              {currentRide ? <RideStatusDisplay /> : <RideRequestForm />}
            </TabsContent>

            <TabsContent value="chat" className="h-full overflow-y-auto">
              <ChatAssistant />
            </TabsContent>

            <TabsContent value="demo" className="h-full overflow-y-auto">
              <DemoController />
            </TabsContent>

            <TabsContent value="fleet" className="h-full overflow-y-auto">
              <FleetOverview />
            </TabsContent>
          </div>
        </Tabs>
      </div>
    </div>
  )
}

function FleetOverview() {
  const { vehicles, metrics } = useAutoRideStore()

  const vehiclesByStatus = Object.values(vehicles).reduce(
    (acc, vehicle) => {
      acc[vehicle.status] = (acc[vehicle.status] || 0) + 1
      return acc
    },
    {} as Record<string, number>,
  )

  return (
    <div className="space-y-6">
      {/* Fleet Status Cards */}
      <div className="grid grid-cols-3 gap-4">
        <Card className="border-0 bg-gradient-to-br from-blue-50 to-blue-100 shadow-sm hover:shadow-md transition-shadow">
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-blue-700">{vehiclesByStatus.IDLE || 0}</div>
            <div className="text-sm font-medium text-blue-600">Idle</div>
            <div className="w-full bg-blue-200 rounded-full h-1 mt-2">
              <div
                className="bg-blue-600 h-1 rounded-full transition-all duration-300"
                style={{ width: `${((vehiclesByStatus.IDLE || 0) / Object.keys(vehicles).length) * 100}%` }}
              ></div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 bg-gradient-to-br from-amber-50 to-amber-100 shadow-sm hover:shadow-md transition-shadow">
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-amber-700">{vehiclesByStatus.ASSIGNED || 0}</div>
            <div className="text-sm font-medium text-amber-600">Assigned</div>
            <div className="w-full bg-amber-200 rounded-full h-1 mt-2">
              <div
                className="bg-amber-600 h-1 rounded-full transition-all duration-300"
                style={{ width: `${((vehiclesByStatus.ASSIGNED || 0) / Object.keys(vehicles).length) * 100}%` }}
              ></div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 bg-gradient-to-br from-emerald-50 to-emerald-100 shadow-sm hover:shadow-md transition-shadow">
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-emerald-700">{vehiclesByStatus.ENROUTE || 0}</div>
            <div className="text-sm font-medium text-emerald-600">En Route</div>
            <div className="w-full bg-emerald-200 rounded-full h-1 mt-2">
              <div
                className="bg-emerald-600 h-1 rounded-full transition-all duration-300"
                style={{ width: `${((vehiclesByStatus.ENROUTE || 0) / Object.keys(vehicles).length) * 100}%` }}
              ></div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Performance Metrics */}
      <Card className="border-0 bg-gradient-to-br from-slate-50 to-slate-100 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-purple-600" />
            Performance Metrics
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex justify-between items-center p-3 bg-white rounded-lg shadow-sm">
            <span className="text-sm font-medium text-slate-600">Average ETA</span>
            <div className="text-right">
              <span className="font-bold text-lg text-slate-900">{metrics.avgEta}</span>
              <span className="text-sm text-slate-500 ml-1">min</span>
            </div>
          </div>

          <div className="flex justify-between items-center p-3 bg-white rounded-lg shadow-sm">
            <span className="text-sm font-medium text-slate-600">Assignment P95</span>
            <div className="text-right">
              <span className="font-bold text-lg text-slate-900">{metrics.assignmentP95}</span>
              <span className="text-sm text-slate-500 ml-1">ms</span>
            </div>
          </div>

          <div className="flex justify-between items-center p-3 bg-white rounded-lg shadow-sm">
            <span className="text-sm font-medium text-slate-600">Events/sec</span>
            <div className="text-right">
              <span className="font-bold text-lg text-slate-900">{metrics.eventsPerSec}</span>
              <span className="text-sm text-slate-500 ml-1">eps</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
