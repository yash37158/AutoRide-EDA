"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Car, Clock, MapPin, Navigation, X, CheckCircle } from "lucide-react";
import { useAutoRideStore } from "@/lib/store";

export function RideStatusDisplay() {
  const { currentRide, cancelRide } = useAutoRideStore();
  const [timeRemaining, setTimeRemaining] = useState("");

  useEffect(() => {
    if (!currentRide?.etaSeconds) return;

    const interval = setInterval(() => {
      const now = Date.now();
      const rideTime = new Date(currentRide.ts).getTime();
      const elapsed = Math.floor((now - rideTime) / 1000);
      const remaining = Math.max(0, currentRide.etaSeconds - elapsed);

      const minutes = Math.floor(remaining / 60);
      const seconds = remaining % 60;
      setTimeRemaining(`${minutes}:${seconds.toString().padStart(2, "0")}`);
    }, 1000);

    return () => clearInterval(interval);
  }, [currentRide]);

  if (!currentRide) return null;

  const statusSteps = ["REQUESTED", "ASSIGNED", "ENROUTE", "COMPLETED"];
  const currentStepIndex = statusSteps.indexOf(currentRide.status);
  const progress = ((currentStepIndex + 1) / statusSteps.length) * 100;

  const getStatusConfig = (status: string) => {
    switch (status) {
      case "REQUESTED":
        return {
          color: "bg-blue-100 text-blue-800 border-blue-200",
          gradient: "from-blue-500 to-blue-600",
          bgGradient: "from-blue-50 to-blue-100",
        };
      case "ASSIGNED":
        return {
          color: "bg-amber-100 text-amber-800 border-amber-200",
          gradient: "from-amber-500 to-amber-600",
          bgGradient: "from-amber-50 to-amber-100",
        };
      case "ENROUTE":
        return {
          color: "bg-emerald-100 text-emerald-800 border-emerald-200",
          gradient: "from-emerald-500 to-emerald-600",
          bgGradient: "from-emerald-50 to-emerald-100",
        };
      case "COMPLETED":
        return {
          color: "bg-green-100 text-green-800 border-green-200",
          gradient: "from-green-500 to-green-600",
          bgGradient: "from-green-50 to-green-100",
        };
      default:
        return {
          color: "bg-slate-100 text-slate-800 border-slate-200",
          gradient: "from-slate-500 to-slate-600",
          bgGradient: "from-slate-50 to-slate-100",
        };
    }
  };

  const statusConfig = getStatusConfig(currentRide.status);

  return (
    <Card className="border-0 shadow-lg bg-gradient-to-br from-white to-slate-50">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center justify-between text-xl">
          <div className="flex items-center gap-3">
            <div
              className={`w-10 h-10 bg-gradient-to-br ${statusConfig.gradient} rounded-lg flex items-center justify-center`}
            >
              <Car className="h-6 w-6 text-white" />
            </div>
            <span>Your Ride</span>
          </div>
          <Badge
            className={`${statusConfig.color} border font-semibold px-3 py-1`}
          >
            {currentRide.status}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Enhanced Progress Bar */}
        <div className="space-y-3">
          <div className="flex justify-between text-sm font-medium">
            <span className="text-slate-600">Journey Progress</span>
            <span className="text-slate-900">{Math.round(progress)}%</span>
          </div>
          <div className="relative">
            <Progress value={progress} className="h-3 bg-slate-200" />
            <div
              className="absolute inset-0 bg-gradient-to-r from-blue-500 to-emerald-500 rounded-full opacity-80"
              style={{ width: `${progress}%` }}
            ></div>
          </div>
        </div>

        {/* ETA Display */}
        {(currentRide.status === "ASSIGNED" ||
          currentRide.status === "ENROUTE") && (
          <div
            className={`bg-gradient-to-br ${statusConfig.bgGradient} rounded-xl p-6 text-center border border-opacity-20`}
          >
            <div className="flex items-center justify-center gap-3 mb-2">
              <Clock className="h-6 w-6 text-slate-700" />
              <span className="text-lg font-semibold text-slate-800">
                {currentRide.status === "ASSIGNED"
                  ? "Taxi arrives in"
                  : "Arriving in"}
              </span>
            </div>
            <div className="text-4xl font-bold text-slate-900 font-mono tracking-wider">
              {timeRemaining}
            </div>
            <div className="mt-2 text-sm text-slate-600">
              Estimated time remaining
            </div>
          </div>
        )}

        {/* Taxi Info */}
        {currentRide.taxiId && (
          <div className="bg-gradient-to-r from-slate-50 to-slate-100 rounded-xl p-4 border border-slate-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-slate-200 rounded-lg flex items-center justify-center">
                  <Car className="h-5 w-5 text-slate-600" />
                </div>
                <span className="font-medium text-slate-700">
                  Assigned Taxi
                </span>
              </div>
              <span className="text-xl font-bold text-slate-900">
                #{currentRide.taxiId}
              </span>
            </div>
          </div>
        )}

        {/* Enhanced Route Info */}
        <div className="space-y-4">
          <div className="flex items-center gap-4 p-4 bg-green-50 rounded-xl border border-green-200">
            <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center shadow-sm">
              <MapPin className="h-5 w-5 text-white" />
            </div>
            <div className="flex-1">
              <p className="font-semibold text-green-900">Pickup Location</p>
              <p className="text-sm text-green-700 font-mono">
                {currentRide.pickup.lat.toFixed(4)},{" "}
                {currentRide.pickup.lng.toFixed(4)}
              </p>
            </div>
            <CheckCircle className="h-5 w-5 text-green-600" />
          </div>

          <div className="flex items-center gap-4 p-4 bg-red-50 rounded-xl border border-red-200">
            <div className="w-10 h-10 bg-red-500 rounded-full flex items-center justify-center shadow-sm">
              <Navigation className="h-5 w-5 text-white" />
            </div>
            <div className="flex-1">
              <p className="font-semibold text-red-900">Dropoff Location</p>
              <p className="text-sm text-red-700 font-mono">
                {currentRide.dropoff.lat.toFixed(4)},{" "}
                {currentRide.dropoff.lng.toFixed(4)}
              </p>
            </div>
          </div>
        </div>

        {/* Enhanced Cancel Button */}
        {(currentRide.status === "REQUESTED" ||
          currentRide.status === "ASSIGNED") && (
          <Button
            variant="outline"
            onClick={() => cancelRide(currentRide.rideId)}
            className="w-full h-12 border-2 border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300 font-semibold rounded-xl transition-all duration-200"
          >
            <X className="h-5 w-5 mr-2" />
            Cancel Ride
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
