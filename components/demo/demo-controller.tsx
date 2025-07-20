"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Play, RotateCcw, Sparkles, CheckCircle } from "lucide-react"
import { useAutoRideStore } from "@/lib/store"

export function DemoController() {
  const [currentStep, setCurrentStep] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const { requestRide, assignRide, updateRideStatus, setSurgeMultiplier, setPickupLocation, setDropoffLocation } =
    useAutoRideStore()

  const demoSteps = [
    {
      title: "Initialize Demo Locations",
      description: "Setting up pickup and dropoff points in Manhattan",
      action: () => {
        setPickupLocation({ lat: 40.7589, lng: -73.9851 })
        setDropoffLocation({ lat: 40.7614, lng: -73.9776 })
      },
    },
    {
      title: "Request Ride",
      description: "Passenger requests autonomous taxi service",
      action: () => {
        const pickup = { lat: 40.7589, lng: -73.9851 }
        const dropoff = { lat: 40.7614, lng: -73.9776 }
        requestRide(pickup, dropoff)
      },
    },
    {
      title: "AI Assignment",
      description: "System assigns nearest available autonomous taxi",
      action: () => {
        setTimeout(() => assignRide("ride-demo", "taxi-001", 180), 1000)
      },
    },
    {
      title: "Journey Begins",
      description: "Taxi starts autonomous navigation to pickup",
      action: () => {
        setTimeout(() => updateRideStatus("ride-demo", "ENROUTE"), 2000)
      },
    },
    {
      title: "Dynamic Pricing",
      description: "Surge pricing activated due to high demand",
      action: () => setSurgeMultiplier(1.8),
    },
    {
      title: "Ride Completion",
      description: "Passenger safely delivered to destination",
      action: () => {
        setTimeout(() => updateRideStatus("ride-demo", "COMPLETED"), 3000)
      },
    },
  ]

  const playDemo = () => {
    setIsPlaying(true)
    setCurrentStep(0)

    demoSteps.forEach((step, index) => {
      setTimeout(() => {
        step.action()
        setCurrentStep(index + 1)
        if (index === demoSteps.length - 1) {
          setIsPlaying(false)
        }
      }, index * 3000)
    })
  }

  const resetDemo = () => {
    setIsPlaying(false)
    setCurrentStep(0)
    setSurgeMultiplier(1.0)
  }

  const progress = (currentStep / demoSteps.length) * 100

  return (
    <Card className="border-0 shadow-lg bg-gradient-to-br from-white to-slate-50">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-3 text-xl">
          <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-emerald-600 rounded-lg flex items-center justify-center">
            <Play className="h-6 w-6 text-white" />
          </div>
          Demo Showcase
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Enhanced Progress */}
        <div className="space-y-3">
          <div className="flex justify-between text-sm font-medium">
            <span className="text-slate-600">Demo Progress</span>
            <span className="text-slate-900">
              {currentStep}/{demoSteps.length} steps
            </span>
          </div>
          <div className="relative">
            <Progress value={progress} className="h-3 bg-slate-200" />
            <div
              className="absolute inset-0 bg-gradient-to-r from-green-500 to-emerald-500 rounded-full opacity-80"
              style={{ width: `${progress}%` }}
            ></div>
          </div>
        </div>

        {/* Enhanced Controls */}
        <div className="flex gap-3">
          <Button
            onClick={playDemo}
            disabled={isPlaying}
            className="flex-1 h-12 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all duration-200"
          >
            <div className="flex items-center gap-2">
              {isPlaying ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Running Demo...
                </>
              ) : (
                <>
                  <Sparkles className="h-5 w-5" />
                  Start Demo
                </>
              )}
            </div>
          </Button>
          <Button
            onClick={resetDemo}
            variant="outline"
            className="h-12 px-4 border-2 border-slate-200 hover:border-green-300 hover:bg-green-50 rounded-xl transition-all duration-200 bg-transparent"
          >
            <RotateCcw className="h-5 w-5" />
          </Button>
        </div>

        {/* Current Step Highlight */}
        {currentStep > 0 && currentStep <= demoSteps.length && (
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-4 border border-blue-200">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                <span className="text-white font-bold text-sm">{currentStep}</span>
              </div>
              <div>
                <p className="font-semibold text-blue-900">{demoSteps[currentStep - 1]?.title}</p>
                <p className="text-sm text-blue-700">{demoSteps[currentStep - 1]?.description}</p>
              </div>
            </div>
          </div>
        )}

        {/* Enhanced Step List */}
        <div className="space-y-3 max-h-64 overflow-y-auto">
          {demoSteps.map((step, index) => (
            <div
              key={index}
              className={`p-4 rounded-xl border transition-all duration-300 ${
                index < currentStep
                  ? "bg-gradient-to-r from-green-50 to-emerald-50 border-green-200"
                  : index === currentStep && isPlaying
                    ? "bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200 shadow-sm"
                    : "bg-slate-50 border-slate-200"
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${
                      index < currentStep
                        ? "bg-green-500 text-white"
                        : index === currentStep && isPlaying
                          ? "bg-blue-500 text-white"
                          : "bg-slate-300 text-slate-600"
                    }`}
                  >
                    {index < currentStep ? <CheckCircle className="h-4 w-4" /> : index + 1}
                  </div>
                  <div>
                    <span
                      className={`font-semibold ${
                        index < currentStep
                          ? "text-green-900"
                          : index === currentStep && isPlaying
                            ? "text-blue-900"
                            : "text-slate-700"
                      }`}
                    >
                      {step.title}
                    </span>
                    <p
                      className={`text-sm ${
                        index < currentStep
                          ? "text-green-700"
                          : index === currentStep && isPlaying
                            ? "text-blue-700"
                            : "text-slate-500"
                      }`}
                    >
                      {step.description}
                    </p>
                  </div>
                </div>
                {index < currentStep && <CheckCircle className="h-5 w-5 text-green-600" />}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
