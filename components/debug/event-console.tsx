"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Terminal } from "lucide-react";
import { useAutoRideStore } from "@/lib/store";

interface EventLog {
  id: string;
  timestamp: Date;
  topic: string;
  payload: any;
  type: "location" | "ride" | "pricing" | "system";
}

export function EventConsole() {
  const [events, setEvents] = useState<EventLog[]>([]);
  const [filter, setFilter] = useState<string>("all");
  const { vehicles, currentRide, metrics } = useAutoRideStore();

  // Simulate event logging
  useEffect(() => {
    const interval = setInterval(
      () => {
        // Generate mock events
        const eventTypes = ["location", "ride", "pricing", "system"];
        const randomType = eventTypes[
          Math.floor(Math.random() * eventTypes.length)
        ] as EventLog["type"];

        let payload = {};
        let topic = "";

        switch (randomType) {
          case "location":
            const vehicleIds = Object.keys(vehicles);
            const randomVehicle =
              vehicleIds[Math.floor(Math.random() * vehicleIds.length)];
            topic = "vehicle.location.updated";
            payload = {
              taxiId: randomVehicle,
              lat: 40.7589 + (Math.random() - 0.5) * 0.01,
              lon: -73.9851 + (Math.random() - 0.5) * 0.01,
              status: vehicles[randomVehicle]?.status || "IDLE",
            };
            break;
          case "ride":
            topic = "ride.status.updated";
            payload = {
              rideId: currentRide?.rideId || "ride-" + Date.now(),
              status: "ENROUTE",
              timestamp: new Date().toISOString(),
            };
            break;
          case "pricing":
            topic = "pricing.surge.updated";
            payload = {
              regionId: "manhattan-central",
              surgeMultiplier: 1.2 + Math.random() * 0.8,
              reason: "high_demand",
            };
            break;
          case "system":
            topic = "metrics.updated";
            payload = {
              activeRides: metrics.activeRides,
              avgEta: metrics.avgEta,
              eventsPerSec: metrics.eventsPerSec,
            };
            break;
        }

        const newEvent: EventLog = {
          id: Date.now().toString() + Math.random(),
          timestamp: new Date(),
          topic,
          payload,
          type: randomType,
        };

        setEvents((prev) => [newEvent, ...prev.slice(0, 99)]); // Keep last 100 events
      },
      1000 + Math.random() * 2000,
    ); // Random interval 1-3 seconds

    return () => clearInterval(interval);
  }, [vehicles, currentRide, metrics]);

  const filteredEvents = events.filter(
    (event) => filter === "all" || event.type === filter,
  );

  const getEventColor = (type: string) => {
    switch (type) {
      case "location":
        return "bg-blue-100 text-blue-800";
      case "ride":
        return "bg-green-100 text-green-800";
      case "pricing":
        return "bg-orange-100 text-orange-800";
      case "system":
        return "bg-purple-100 text-purple-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <Card className="h-full">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Terminal className="h-5 w-5" />
            Event Stream Console
          </span>
          <div className="flex items-center gap-2">
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="text-sm border rounded px-2 py-1"
            >
              <option value="all">All Events</option>
              <option value="location">Location</option>
              <option value="ride">Ride</option>
              <option value="pricing">Pricing</option>
              <option value="system">System</option>
            </select>
            <Button variant="ghost" size="sm" onClick={() => setEvents([])}>
              Clear
            </Button>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="h-48 overflow-y-auto font-mono text-xs">
          {filteredEvents.length === 0 ? (
            <div className="p-4 text-center text-muted-foreground">
              No events to display
            </div>
          ) : (
            <div className="space-y-1 p-2">
              {filteredEvents.map((event) => (
                <div
                  key={event.id}
                  className="flex items-start gap-2 p-2 hover:bg-muted/50 rounded"
                >
                  <span className="text-muted-foreground whitespace-nowrap">
                    {event.timestamp.toLocaleTimeString()}.
                    {event.timestamp
                      .getMilliseconds()
                      .toString()
                      .padStart(3, "0")}
                  </span>
                  <Badge className={`${getEventColor(event.type)} text-xs`}>
                    {event.type}
                  </Badge>
                  <span className="font-medium">{event.topic}</span>
                  <span className="text-muted-foreground truncate flex-1">
                    {JSON.stringify(event.payload)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
