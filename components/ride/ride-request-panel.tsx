"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MapPin, Navigation, DollarSign } from "lucide-react";
import { useAutoRideStore } from "@/lib/store";
import { Car } from "lucide-react"; // Declared the Car variable

export function RideRequestPanel() {
  const {
    pickupLocation,
    dropoffLocation,
    requestRide,
    surgeMultiplier,
    setPickupLocation,
    setDropoffLocation,
  } = useAutoRideStore();

  const [pickupAddress, setPickupAddress] = useState("");
  const [dropoffAddress, setDropoffAddress] = useState("");

  const baseFare = 12.5;
  const estimatedFare = baseFare * surgeMultiplier;

  const handleRequestRide = () => {
    if (pickupLocation && dropoffLocation) {
      requestRide(pickupLocation, dropoffLocation);
    }
  };

  const canRequestRide = pickupLocation && dropoffLocation;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Car className="h-5 w-5" />
          Request a Ride
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Pickup Location */}
        <div className="space-y-2">
          <Label htmlFor="pickup" className="flex items-center gap-2">
            <MapPin className="h-4 w-4 text-green-600" />
            Pickup Location
          </Label>
          <Input
            id="pickup"
            placeholder="Enter pickup address or click map"
            value={pickupAddress}
            onChange={(e) => setPickupAddress(e.target.value)}
          />
          {pickupLocation && (
            <p className="text-xs text-muted-foreground">
              {pickupLocation.lat.toFixed(4)}, {pickupLocation.lng.toFixed(4)}
            </p>
          )}
        </div>

        {/* Dropoff Location */}
        <div className="space-y-2">
          <Label htmlFor="dropoff" className="flex items-center gap-2">
            <Navigation className="h-4 w-4 text-red-600" />
            Dropoff Location
          </Label>
          <Input
            id="dropoff"
            placeholder="Enter dropoff address or click map"
            value={dropoffAddress}
            onChange={(e) => setDropoffAddress(e.target.value)}
          />
          {dropoffLocation && (
            <p className="text-xs text-muted-foreground">
              {dropoffLocation.lat.toFixed(4)}, {dropoffLocation.lng.toFixed(4)}
            </p>
          )}
        </div>

        {/* Fare Estimate */}
        {canRequestRide && (
          <div className="p-3 bg-muted rounded-lg">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-2 text-sm">
                <DollarSign className="h-4 w-4" />
                Estimated Fare
              </span>
              <span className="font-semibold">
                ${estimatedFare.toFixed(2)}
                {surgeMultiplier > 1 && (
                  <span className="text-xs text-orange-600 ml-1">
                    ({surgeMultiplier}x surge)
                  </span>
                )}
              </span>
            </div>
          </div>
        )}

        {/* Request Button */}
        <Button
          onClick={handleRequestRide}
          disabled={!canRequestRide}
          className="w-full"
        >
          {canRequestRide
            ? "Request Ride"
            : "Select pickup and dropoff locations"}
        </Button>

        {/* Quick Actions */}
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              // Set sample locations for demo
              setPickupLocation({ lat: 40.7589, lng: -73.9851 });
              setDropoffLocation({ lat: 40.7614, lng: -73.9776 });
            }}
          >
            Demo Route
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
