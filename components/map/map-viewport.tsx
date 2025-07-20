"use client";

import { useEffect, useRef, useState } from "react";
import { useAutoRideStore } from "@/lib/store";

declare global {
  interface Window {
    mapboxgl: any;
  }
}

// Dynamically load Mapbox GL as an ES-module (avoids MIME-type / CSP issues)
async function loadMapbox(): Promise<any> {
  if (typeof (window as any).mapboxgl !== "undefined")
    return (window as any).mapboxgl;

  // Load the CSS once
  if (!document.getElementById("mapbox-css")) {
    const css = document.createElement("link");
    css.id = "mapbox-css";
    css.rel = "stylesheet";
    css.href = "https://api.mapbox.com/mapbox-gl-js/v2.15.0/mapbox-gl.css";
    document.head.appendChild(css);
  }

  // 🚀  Import the ESM build directly from esm.sh (served with correct MIME type)
  const { default: mapboxgl } = await import("mapbox-gl");
  (window as any).mapboxgl = mapboxgl;
  return mapboxgl;
}

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;

export function MapViewport() {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<any>(null);
  const markersRef = useRef<{ [key: string]: any }>({});
  const { vehicles, currentRide, setPickupLocation, setDropoffLocation } =
    useAutoRideStore();
  const [mapLoaded, setMapLoaded] = useState(false);
  const [isSelectingLocation, setIsSelectingLocation] = useState<
    "pickup" | "dropoff" | null
  >(null);
  const [mapStyle, setMapStyle] = useState("mapbox://styles/mapbox/dark-v11");

  // Available map styles
  const mapStyles = [
    { name: "Dark", value: "mapbox://styles/mapbox/dark-v11" },
    { name: "Streets", value: "mapbox://styles/mapbox/streets-v12" },
    {
      name: "Satellite",
      value: "mapbox://styles/mapbox/satellite-streets-v12",
    },
    { name: "Navigation", value: "mapbox://styles/mapbox/navigation-day-v1" },
    { name: "Light", value: "mapbox://styles/mapbox/light-v11" },
  ];

  // Initialize map
  useEffect(() => {
    if (!mapContainer.current || map.current) return;
    (async () => {
      const mapboxgl = await loadMapbox();
      mapboxgl.accessToken = MAPBOX_TOKEN;

      map.current = new mapboxgl.Map({
        container: mapContainer.current,
        style: mapStyle,
        center: [-73.9851, 40.7589], // NYC
        zoom: 13,
        pitch: 45, // 3D tilt
        bearing: 0,
        attributionControl: false,
        antialias: true, // Smooth rendering
      });

      // Add 3D buildings layer
      map.current.on("load", () => {
        setMapLoaded(true);

        // Add 3D buildings
        map.current.addLayer({
          id: "3d-buildings",
          source: "composite",
          "source-layer": "building",
          filter: ["==", "extrude", "true"],
          type: "fill-extrusion",
          minzoom: 15,
          paint: {
            "fill-extrusion-color": "#aaa",
            "fill-extrusion-height": [
              "interpolate",
              ["linear"],
              ["zoom"],
              15,
              0,
              15.05,
              ["get", "height"],
            ],
            "fill-extrusion-base": [
              "interpolate",
              ["linear"],
              ["zoom"],
              15,
              0,
              15.05,
              ["get", "min_height"],
            ],
            "fill-extrusion-opacity": 0.6,
          },
        });

        // Add traffic layer
        map.current.addSource("mapbox-traffic", {
          type: "vector",
          url: "mapbox://mapbox.mapbox-traffic-v1",
        });

        map.current.addLayer({
          id: "traffic",
          type: "line",
          source: "mapbox-traffic",
          "source-layer": "traffic",
          paint: {
            "line-width": 2,
            "line-color": [
              "case",
              ["==", ["get", "congestion"], "low"],
              "#00ff00",
              ["==", ["get", "congestion"], "moderate"],
              "#ffff00",
              ["==", ["get", "congestion"], "heavy"],
              "#ff8000",
              ["==", ["get", "congestion"], "severe"],
              "#ff0000",
              "#000000",
            ],
          },
        });
      });

      // Handle map clicks
      map.current.on("click", (e: any) => {
        if (isSelectingLocation === "pickup") {
          setPickupLocation({ lat: e.lngLat.lat, lng: e.lngLat.lng });
          setIsSelectingLocation("dropoff");
        } else if (isSelectingLocation === "dropoff") {
          setDropoffLocation({ lat: e.lngLat.lat, lng: e.lngLat.lng });
          setIsSelectingLocation(null);
        }
      });

      // Add smooth rotation animation
      map.current.on("idle", () => {
        if (map.current.isMoving()) return;
        map.current.easeTo({
          bearing: map.current.getBearing() + 0.2,
          duration: 10000,
          easing: (t: number) => t,
        });
      });
    })();

    return () => {
      map.current?.remove();
      map.current = null;
    };
  }, [mapStyle, isSelectingLocation, setPickupLocation, setDropoffLocation]);

  // Create enhanced taxi markers
  const createTaxiMarker = (vehicle: any) => {
    const el = document.createElement("div");
    el.className = "taxi-marker-container";

    const statusConfig = {
      IDLE: { color: "#3B82F6", pulse: false, icon: "🚕" },
      ASSIGNED: { color: "#F59E0B", pulse: true, icon: "🚖" },
      ENROUTE: { color: "#10B981", pulse: true, icon: "🚗" },
    };

    const config =
      statusConfig[vehicle.status as keyof typeof statusConfig] ||
      statusConfig.IDLE;

    el.innerHTML = `
      <div class="relative">
        ${
          config.pulse
            ? `<div class="absolute inset-0 w-8 h-8 rounded-full animate-ping opacity-75" style="background-color: ${config.color}"></div>`
            : ""
        }
        <div class="relative w-8 h-8 rounded-full border-3 border-white shadow-lg flex items-center justify-center text-lg transition-all duration-300 hover:scale-110"
             style="background: linear-gradient(135deg, ${config.color}, ${config.color}dd);">
          ${config.icon}
        </div>
        <div class="absolute -bottom-8 left-1/2 transform -translate-x-1/2 bg-black/80 text-white text-xs px-2 py-1 rounded whitespace-nowrap opacity-0 hover:opacity-100 transition-opacity">
          Taxi ${vehicle.taxiId}<br/>
          ${vehicle.status} • ${Math.round(vehicle.speedKph)} km/h
        </div>
      </div>
    `;

    return el;
  };

  // Update taxi markers with enhanced styling
  useEffect(() => {
    if (!map.current || !mapLoaded) return;

    // Remove old markers
    Object.values(markersRef.current).forEach((marker: any) => marker.remove());
    markersRef.current = {};

    // Add enhanced markers
    Object.values(vehicles).forEach((vehicle: any) => {
      const el = createTaxiMarker(vehicle);

      const marker = new (window as any).mapboxgl.Marker(el)
        .setLngLat([vehicle.lon, vehicle.lat])
        .setPopup(
          new (window as any).mapboxgl.Popup({
            offset: 25,
            className: "custom-popup",
          }).setHTML(`
            <div class="p-4 bg-gradient-to-br from-slate-900 to-slate-800 text-white rounded-lg">
              <div class="flex items-center gap-3 mb-3">
                <div class="text-2xl">${vehicle.status === "IDLE" ? "🚕" : vehicle.status === "ASSIGNED" ? "🚖" : "🚗"}</div>
                <div>
                  <div class="font-bold text-lg">Taxi ${vehicle.taxiId}</div>
                  <div class="text-sm text-slate-300">Autonomous Vehicle</div>
                </div>
              </div>
              <div class="space-y-2 text-sm">
                <div class="flex justify-between">
                  <span class="text-slate-400">Status:</span>
                  <span class="font-semibold text-${vehicle.status === "IDLE" ? "blue" : vehicle.status === "ASSIGNED" ? "amber" : "emerald"}-400">
                    ${vehicle.status}
                  </span>
                </div>
                <div class="flex justify-between">
                  <span class="text-slate-400">Speed:</span>
                  <span class="font-semibold">${Math.round(vehicle.speedKph)} km/h</span>
                </div>
                <div class="flex justify-between">
                  <span class="text-slate-400">Location:</span>
                  <span class="font-mono text-xs">${vehicle.lat.toFixed(4)}, ${vehicle.lon.toFixed(4)}</span>
                </div>
              </div>
            </div>
          `),
        )
        .addTo(map.current!);

      markersRef.current[vehicle.taxiId] = marker;
    });
  }, [vehicles, mapLoaded]);

  // Add enhanced pickup/dropoff markers
  useEffect(() => {
    if (!map.current || !mapLoaded) return;

    // Remove existing markers
    const existingPickup = document.querySelector(".pickup-marker");
    const existingDropoff = document.querySelector(".dropoff-marker");
    existingPickup?.remove();
    existingDropoff?.remove();

    // Add pickup marker
    if (currentRide?.pickup) {
      const pickupEl = document.createElement("div");
      pickupEl.className = "pickup-marker";
      pickupEl.innerHTML = `
        <div class="relative">
          <div class="absolute inset-0 w-10 h-10 bg-green-400 rounded-full animate-ping opacity-75"></div>
          <div class="relative w-10 h-10 bg-gradient-to-br from-green-500 to-emerald-600 rounded-full border-3 border-white shadow-xl flex items-center justify-center text-white text-lg font-bold">
            📍
          </div>
          <div class="absolute -bottom-8 left-1/2 transform -translate-x-1/2 bg-green-600 text-white text-xs px-2 py-1 rounded whitespace-nowrap">
            Pickup Location
          </div>
        </div>
      `;
      new (window as any).mapboxgl.Marker(pickupEl)
        .setLngLat([currentRide.pickup.lng, currentRide.pickup.lat])
        .addTo(map.current!);
    }

    // Add dropoff marker
    if (currentRide?.dropoff) {
      const dropoffEl = document.createElement("div");
      dropoffEl.className = "dropoff-marker";
      dropoffEl.innerHTML = `
        <div class="relative">
          <div class="absolute inset-0 w-10 h-10 bg-red-400 rounded-full animate-ping opacity-75"></div>
          <div class="relative w-10 h-10 bg-gradient-to-br from-red-500 to-rose-600 rounded-full border-3 border-white shadow-xl flex items-center justify-center text-white text-lg font-bold">
            🎯
          </div>
          <div class="absolute -bottom-8 left-1/2 transform -translate-x-1/2 bg-red-600 text-white text-xs px-2 py-1 rounded whitespace-nowrap">
            Dropoff Location
          </div>
        </div>
      `;
      new (window as any).mapboxgl.Marker(dropoffEl)
        .setLngLat([currentRide.dropoff.lng, currentRide.dropoff.lat])
        .addTo(map.current!);
    }

    // Add route line if both locations exist
    if (
      currentRide?.pickup &&
      currentRide?.dropoff &&
      map.current.getSource("route")
    ) {
      map.current.removeLayer("route");
      map.current.removeSource("route");
    }

    if (currentRide?.pickup && currentRide?.dropoff) {
      map.current.addSource("route", {
        type: "geojson",
        data: {
          type: "Feature",
          properties: {},
          geometry: {
            type: "LineString",
            coordinates: [
              [currentRide.pickup.lng, currentRide.pickup.lat],
              [currentRide.dropoff.lng, currentRide.dropoff.lat],
            ],
          },
        },
      });

      map.current.addLayer({
        id: "route",
        type: "line",
        source: "route",
        layout: {
          "line-join": "round",
          "line-cap": "round",
        },
        paint: {
          "line-color": "#3B82F6",
          "line-width": 4,
          "line-opacity": 0.8,
          "line-dasharray": [2, 2],
        },
      });
    }
  }, [currentRide, mapLoaded]);

  return (
    <div className="relative w-full h-full">
      <div ref={mapContainer} className="w-full h-full" />

      {/* Map Style Selector */}
      <div className="absolute top-4 right-4 z-20">
        <div className="bg-white/95 backdrop-blur-sm rounded-xl shadow-lg border border-slate-200 p-2">
          <div className="flex gap-1">
            {mapStyles.map((style) => (
              <button
                key={style.value}
                onClick={() => setMapStyle(style.value)}
                className={`px-3 py-2 text-xs font-medium rounded-lg transition-all duration-200 ${
                  mapStyle === style.value
                    ? "bg-blue-600 text-white shadow-sm"
                    : "text-slate-600 hover:bg-slate-100"
                }`}
              >
                {style.name}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Location Selection Overlay */}
      {isSelectingLocation && (
        <div className="absolute top-4 left-1/2 transform -translate-x-1/2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl shadow-lg px-6 py-3 z-20">
          <div className="flex items-center gap-3">
            <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
            <p className="font-medium">
              Click on the map to set {isSelectingLocation} location
            </p>
          </div>
        </div>
      )}

      {/* Enhanced Map Controls */}
      <div className="absolute bottom-6 right-6 flex flex-col gap-3 z-10">
        {/* Zoom Controls */}
        <div className="bg-white/95 backdrop-blur-sm rounded-xl shadow-lg border border-slate-200 overflow-hidden">
          <button
            className="w-12 h-12 flex items-center justify-center text-xl font-bold text-slate-700 hover:bg-blue-50 hover:text-blue-600 transition-colors border-b border-slate-200"
            onClick={() => map.current?.zoomIn()}
          >
            +
          </button>
          <button
            className="w-12 h-12 flex items-center justify-center text-xl font-bold text-slate-700 hover:bg-blue-50 hover:text-blue-600 transition-colors"
            onClick={() => map.current?.zoomOut()}
          >
            −
          </button>
        </div>

        {/* 3D Toggle */}
        <button
          className="w-12 h-12 bg-white/95 backdrop-blur-sm rounded-xl shadow-lg border border-slate-200 flex items-center justify-center text-slate-700 hover:bg-blue-50 hover:text-blue-600 transition-colors"
          onClick={() => {
            const currentPitch = map.current?.getPitch() || 0;
            map.current?.easeTo({
              pitch: currentPitch > 0 ? 0 : 45,
              duration: 1000,
            });
          }}
        >
          🏢
        </button>

        {/* Reset View */}
        <button
          className="w-12 h-12 bg-white/95 backdrop-blur-sm rounded-xl shadow-lg border border-slate-200 flex items-center justify-center text-slate-700 hover:bg-blue-50 hover:text-blue-600 transition-colors"
          onClick={() => {
            map.current?.easeTo({
              center: [-73.9851, 40.7589],
              zoom: 13,
              pitch: 45,
              bearing: 0,
              duration: 1500,
            });
          }}
        >
          🎯
        </button>
      </div>

      {/* Map Legend */}
      <div className="absolute bottom-6 left-6 bg-white/95 backdrop-blur-sm rounded-xl shadow-lg border border-slate-200 p-4 z-10">
        <h3 className="font-semibold text-slate-800 mb-3 text-sm">
          Fleet Status
        </h3>
        <div className="space-y-2 text-xs">
          <div className="flex items-center gap-3">
            <div className="w-4 h-4 bg-blue-500 rounded-full"></div>
            <span className="text-slate-600">Idle (Available)</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-4 h-4 bg-amber-500 rounded-full animate-pulse"></div>
            <span className="text-slate-600">Assigned</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-4 h-4 bg-emerald-500 rounded-full animate-pulse"></div>
            <span className="text-slate-600">En Route</span>
          </div>
        </div>
      </div>
    </div>
  );
}
