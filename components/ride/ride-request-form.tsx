"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MapPin, Navigation, DollarSign, Sparkles, Zap } from "lucide-react";
import { Car } from "lucide-react"; // Import the Car component

interface Location {
  lat: number;
  lng: number;
}

export function RideRequestForm() {
  const [pickupLocation, setPickupLocation] = useState<Location | null>(null);
  const [dropoffLocation, setDropoffLocation] = useState<Location | null>(null);
  const [surgeMultiplier, setSurgeMultiplier] = useState(1.0);
  const [pickupAddress, setPickupAddress] = useState("");
  const [dropoffAddress, setDropoffAddress] = useState("");

  const baseFare = 12.5;
  const estimatedFare = baseFare * surgeMultiplier;
  const canRequestRide = pickupLocation && dropoffLocation;

  const handleRequestRide = () => {
    if (pickupLocation && dropoffLocation) {
      alert(
        `Ride Requested from ${pickupLocation.lat}, ${pickupLocation.lng} to ${dropoffLocation.lat}, ${dropoffLocation.lng} with surge multiplier ${surgeMultiplier}`,
      );
    }
  };

  const handleQuickDemo = () => {
    const pickup = { lat: 40.7589, lng: -73.9851 };
    const dropoff = { lat: 40.7614, lng: -73.9776 };
    setPickupLocation(pickup);
    setDropoffLocation(dropoff);
  };

  return (
    <Card className="border-0 shadow-lg bg-gradient-to-br from-white to-slate-50">
      <CardHeader className="pb-4">
        <CardTitle className="text-xl flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center">
            <Car className="h-6 w-6 text-white" />{" "}
            {/* Use the Car component here */}
          </div>
          Request Your Ride
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Pickup Location */}
        <div className="space-y-3">
          <Label className="flex items-center gap-2 text-sm font-semibold text-slate-700">
            <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center">
              <MapPin className="h-4 w-4 text-green-600" />
            </div>
            Pickup Location
          </Label>
          <Input
            placeholder="Enter address or click on map"
            value={pickupAddress}
            onChange={(e) => setPickupAddress(e.target.value)}
            className="border-slate-200 focus:border-green-500 focus:ring-green-500/20 bg-white/80 backdrop-blur-sm"
          />
          {pickupLocation && (
            <div className="flex items-center gap-2 p-2 bg-green-50 rounded-lg">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <p className="text-xs text-green-700 font-medium">
                {pickupLocation.lat.toFixed(4)}, {pickupLocation.lng.toFixed(4)}
              </p>
            </div>
          )}
        </div>

        {/* Dropoff Location */}
        <div className="space-y-3">
          <Label className="flex items-center gap-2 text-sm font-semibold text-slate-700">
            <div className="w-6 h-6 bg-red-100 rounded-full flex items-center justify-center">
              <Navigation className="h-4 w-4 text-red-600" />
            </div>
            Dropoff Location
          </Label>
          <Input
            placeholder="Enter address or click on map"
            value={dropoffAddress}
            onChange={(e) => setDropoffAddress(e.target.value)}
            className="border-slate-200 focus:border-red-500 focus:ring-red-500/20 bg-white/80 backdrop-blur-sm"
          />
          {dropoffLocation && (
            <div className="flex items-center gap-2 p-2 bg-red-50 rounded-lg">
              <div className="w-2 h-2 bg-red-500 rounded-full"></div>
              <p className="text-xs text-red-700 font-medium">
                {dropoffLocation.lat.toFixed(4)},{" "}
                {dropoffLocation.lng.toFixed(4)}
              </p>
            </div>
          )}
        </div>

        {/* Fare Estimate */}
        {canRequestRide && (
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-4 border border-blue-100">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                  <DollarSign className="h-5 w-5 text-blue-600" />
                </div>
                <span className="font-semibold text-blue-900">
                  Estimated Fare
                </span>
              </div>
              <div className="text-right">
                <span className="text-2xl font-bold text-blue-900">
                  ${estimatedFare.toFixed(2)}
                </span>
                {surgeMultiplier > 1 && (
                  <div className="flex items-center gap-1 text-orange-600 text-xs font-medium">
                    <Zap className="h-3 w-3" />
                    {surgeMultiplier}x surge pricing
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="space-y-3">
          <Button
            onClick={handleRequestRide}
            disabled={!canRequestRide}
            className="w-full h-12 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {canRequestRide ? (
              <div className="flex items-center gap-2">
                <Sparkles className="h-5 w-5" />
                Request Ride Now
              </div>
            ) : (
              "Select pickup and dropoff locations"
            )}
          </Button>

          <Button
            onClick={handleQuickDemo}
            variant="outline"
            className="w-full h-10 border-2 border-slate-200 hover:border-blue-300 hover:bg-blue-50 text-slate-700 hover:text-blue-700 font-medium rounded-xl transition-all duration-200 bg-transparent"
          >
            <Zap className="h-4 w-4 mr-2" />
            Use Demo Locations
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
