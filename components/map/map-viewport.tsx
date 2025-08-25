"use client";

import { Children, useEffect, useRef, useState } from "react";
import { useAutoRideStore } from "@/lib/store";

declare global {
  interface Window {
    mapboxgl: any;
  }
}

// Minimal OSM raster style (no token required)
const OSM_STYLE: any = {
  version: 8,
  sources: {
    osm: {
      type: "raster",
      tiles: [
        "https://a.tile.openstreetmap.org/{z}/{x}/{y}.png",
        "https://b.tile.openstreetmap.org/{z}/{x}/{y}.png",
        "https://c.tile.openstreetmap.org/{z}/{x}/{y}.png",
      ],
      tileSize: 256,
      attribution:
        '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    },
  },
  layers: [
    {
      id: "osm",
      type: "raster",
      source: "osm",
    },
  ],
};

// Dynamically load Mapbox GL as an ES-module
async function loadMapbox(): Promise<any> {
  if (typeof (window as any).mapboxgl !== "undefined")
    return (window as any).mapboxgl;

  if (!document.getElementById("mapbox-css")) {
    const css = document.createElement("link");
    css.id = "mapbox-css";
    css.rel = "stylesheet";
    css.href = "https://api.mapbox.com/mapbox-gl-js/v2.15.0/mapbox-gl.css";
    document.head.appendChild(css);
  }

  const { default: mapboxgl } = await import("mapbox-gl");
  (window as any).mapboxgl = mapboxgl;
  return mapboxgl;
}

// Accept multiple env keys; handle cases where token exists under different names
const MAPBOX_TOKEN =
  process.env.NEXT_PUBLIC_MAPBOX_TOKEN ||
  process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN ||
  process.env.MAPBOX_TOKEN ||
  "";

const USING_MAPBOX: boolean = Boolean(MAPBOX_TOKEN);

// Geocoding function using Mapbox Geocoding API
async function reverseGeocode(lng: number, lat: number): Promise<string> {
  if (!MAPBOX_TOKEN) {
    return `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
  }

  try {
    const response = await fetch(
      `https://api.mapbox.com/geocoding/v5/mapbox.places/${lng},${lat}.json?access_token=${MAPBOX_TOKEN}&types=address,poi`
    );
    const data = await response.json();
    
    if (data.features && data.features.length > 0) {
      return data.features[0].place_name;
    }
  } catch (error) {
    console.error("Geocoding error:", error);
  }
  
  return `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
}

export function MapViewport({ children }: { children: React.ReactNode }) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<any>(null);
  const markersRef = useRef<{ [key: string]: any }>({});
  const pickupPinRef = useRef<any>(null);
  const dropoffPinRef = useRef<any>(null);
  const { 
    vehicles, 
    currentRide, 
    setPickupLocation, 
    setDropoffLocation,
    pickupLocation,
    dropoffLocation,
    selectedTaxi,
    etaToPickup,
    etaToDestination,
    taxiRoute,
    rideRoute,
    taxiProgress,
    rideProgress,
    taxiStatus,
    startTaxiMovement,
    updateTaxiProgress,
    startRideJourney,
    updateRideProgress,
    completeRide,
    initializeSimulation,
    clearTaxiSelection
  } = useAutoRideStore();
  const [mapLoaded, setMapLoaded] = useState(false);
  const [isSettingPickup, setIsSettingPickup] = useState(true);

  // Default to Mapbox style if token available; otherwise OSM raster style
  const [mapStyle, setMapStyle] = useState<any>(
    USING_MAPBOX ? "mapbox://styles/mapbox/dark-v11" : OSM_STYLE,
  );

  // Available styles (when Mapbox token is present)
  const mapStyles =
    USING_MAPBOX
      ? [
          { name: "Dark", value: "mapbox://styles/mapbox/dark-v11" },
          { name: "Streets", value: "mapbox://styles/mapbox/streets-v12" },
          {
            name: "Satellite",
            value: "mapbox://styles/mapbox/satellite-streets-v12",
          },
          { name: "Navigation", value: "mapbox://styles/mapbox/navigation-day-v1" },
          { name: "Light", value: "mapbox://styles/mapbox/light-v11" },
        ]
      : [{ name: "OSM", value: OSM_STYLE }];

  // Initialize map
  useEffect(() => {
    if (!mapContainer.current || map.current) return;

    (async () => {
      const mapboxgl = await loadMapbox();
      if (USING_MAPBOX) {
        mapboxgl.accessToken = MAPBOX_TOKEN;
      }

      map.current = new mapboxgl.Map({
        container: mapContainer.current,
        style: 'mapbox://styles/mapbox/streets-v12', // can be URL or style object
        center: [-73.9851, 40.7589],
        zoom: 13,
        pitch: 45,
        bearing: 0,
        attributionControl: false,
        antialias: true,
      });

      // Fallback to OSM if style fails due to token issues or style fetch errors
      map.current.on("error", (e: any) => {
        const msg = String(e?.error?.message || "");
        const status = (e?.error as any)?.status;
        const unauthorized =
          status === 401 ||
          /unauthorized|forbidden|access token|not permitted/i.test(msg);
        if (unauthorized) {
          try {
            map.current.setStyle(OSM_STYLE);
          } catch {
            /* noop */
          }
        }
      });

      map.current.on("load", () => {
        setMapLoaded(true);

        // Only add Mapbox-specific layers when using Mapbox styles
        const isUsingMapboxStyle = typeof mapStyle === "string";
        if (isUsingMapboxStyle) {
          try {
            // 3D buildings
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

            // Traffic layer
            // map.current.addSource("mapbox-traffic", {
            //   type: "vector",
            //   url: "mapbox://mapbox.mapbox-traffic-v1",
            // });
            // map.current.addLayer({
            //   id: "traffic",
            //   type: "line",
            //   source: "mapbox-traffic",
            //   "source-layer": "traffic",
            //   paint: {
            //     "line-width": 2,
            //     "line-color": [
            //       "case",
            //       ["==", ["get", "congestion"], "low"],
            //       "#00ff00",
            //       ["==", ["get", "congestion"], "moderate"],
            //       "#ffff00",
            //       ["==", ["get", "congestion"], "heavy"],
            //       "#ff8000",
            //       ["==", ["get", "congestion"], "severe"],
            //       "#ff0000",
            //       "#000000",
            //     ],
            //   },
            // });
          } catch {
            // Ignore if style doesn't have the required sources/layers
          }
        }
      });

      // Handle map clicks for pin dropping
      map.current.on("click", async (e: any) => {
        const { lng, lat } = e.lngLat;
        const address = await reverseGeocode(lng, lat);
        
        if (isSettingPickup) {
          setPickupLocation({ lat, lng });
          // Update pickup address in store
          useAutoRideStore.getState().setPickupAddress(address);
        } else {
          setDropoffLocation({ lat, lng });
          // Update dropoff address in store
          useAutoRideStore.getState().setDropoffAddress(address);
        }
      });
    })();

    return () => {
      map.current?.remove();
      map.current = null;
    };
  }, [mapStyle, isSettingPickup]);

  // Update taxi markers with highlighting and arrival state
  useEffect(() => {
    if (!map.current || !mapLoaded) return;

    Object.values(markersRef.current).forEach((marker: any) => marker.remove());
    markersRef.current = {};

    Object.values(vehicles).forEach((vehicle: any) => {
      const el = document.createElement("div");
      el.className = "taxi-marker-container";
      
      // Check if this is the selected taxi and its status
      const isSelected = selectedTaxi?.taxiId === vehicle.taxiId;
      const hasArrived = taxiStatus === "ARRIVED_AT_PICKUP" && isSelected;
      
      let highlightClass = "";
      let icon = "🚗";
      let label = `Taxi ${vehicle.taxiId}`;
      let backgroundColor = "#10B981";
      
      if (isSelected) {
        if (hasArrived) {
          // Taxi has arrived - show green checkmark
          highlightClass = "ring-4 ring-green-400 ring-offset-2";
          icon = "✅";
          label = "Taxi Arrived!";
          backgroundColor = "#10B981";
        } else {
          // Taxi is en route - show yellow highlight
          highlightClass = "ring-4 ring-yellow-400 ring-offset-2";
          icon = "🚕";
          label = "Selected Taxi";
          backgroundColor = "#F59E0B";
        }
      }
      
      el.innerHTML = `
        <div class="relative">
          <div class="relative w-8 h-8 rounded-full border-3 border-white shadow-lg flex items-center justify-center text-lg ${highlightClass}"
               style="background: linear-gradient(135deg, ${backgroundColor}, ${backgroundColor}dd);">
            ${icon}
          </div>
          <div class="absolute -bottom-8 left-1/2 transform -translate-x-1/2 bg-black/80 text-white text-xs px-2 py-1 rounded whitespace-nowrap">
            ${label}
          </div>
        </div>
      `;

      const marker = new (window as any).mapboxgl.Marker(el)
        .setLngLat([vehicle.lon, vehicle.lat])
        .addTo(map.current!);

      markersRef.current[vehicle.taxiId] = marker;
    });
  }, [vehicles, mapLoaded, selectedTaxi, taxiStatus]);

  // Update taxi route overlay
  useEffect(() => {
    if (!map.current || !mapLoaded) return;

    // Remove existing taxi route
    if (map.current.getSource?.("taxi-route")) {
      try {
        map.current.removeLayer("taxi-route");
        map.current.removeSource("taxi-route");
      } catch {
        /* noop */
      }
    }

    // Add taxi route if available
    if (taxiRoute && taxiRoute.length > 1) {
      console.log("Adding intelligent taxi route:", taxiRoute);
      
      map.current.addSource("taxi-route", {
        type: "geojson",
        data: {
          type: "Feature",
          properties: {},
          geometry: {
            type: "LineString",
            coordinates: taxiRoute.map(point => [point.lng, point.lat]),
          },
        },
      });

      map.current.addLayer({
        id: "taxi-route",
        type: "line",
        source: "taxi-route",
        layout: { "line-join": "round", "line-cap": "round" },
        paint: {
          "line-color": "#F59E0B",
          "line-width": 6,
          "line-opacity": 0.8,
          "line-dasharray": [3, 3],
        },
      });
    }
  }, [taxiRoute, mapLoaded]);

  // Update ride route overlay
  useEffect(() => {
    if (!map.current || !mapLoaded) return;

    // Remove existing ride route
    if (map.current.getSource?.("ride-route")) {
      try {
        map.current.removeLayer("ride-route");
        map.current.removeSource("ride-route");
      } catch {
        /* noop */
      }
    }

    // Add ride route if available and taxi has arrived at pickup
    if (rideRoute && rideRoute.length > 1 && taxiStatus === "EN_ROUTE_TO_DESTINATION") {
      console.log("Adding ride route:", rideRoute);
      
      map.current.addSource("ride-route", {
        type: "geojson",
        data: {
          type: "Feature",
          properties: {},
          geometry: {
            type: "LineString",
            coordinates: rideRoute.map(point => [point.lng, point.lat]),
          },
        },
      });

      map.current.addLayer({
        id: "ride-route",
        type: "line",
        source: "ride-route",
        layout: { "line-join": "round", "line-cap": "round" },
        paint: {
          "line-color": "#10B981",
          "line-width": 6,
          "line-opacity": 0.8,
          "line-dasharray": [2, 2],
        },
      });
    }
  }, [rideRoute, mapLoaded, taxiStatus]);

  // Update taxi position based on current phase
  useEffect(() => {
    if (!map.current || !mapLoaded || !selectedTaxi) return;

    if (taxiStatus === "ARRIVED_AT_PICKUP") {
      // Taxi is at pickup location
      const targetLocation = pickupLocation || dropoffLocation;
      if (targetLocation) {
        const taxiMarker = markersRef.current[selectedTaxi.taxiId];
        if (taxiMarker) {
          taxiMarker.setLngLat([targetLocation.lng, targetLocation.lat]);
        }
      }
    } else if (taxiStatus === "EN_ROUTE_TO_DESTINATION") {
      // Taxi is moving to destination
      if (rideRoute.length > 1) {
        const currentIndex = Math.floor(rideProgress * (rideRoute.length - 1));
        const currentPosition = rideRoute[currentIndex];
        
        if (currentPosition) {
          const taxiMarker = markersRef.current[selectedTaxi.taxiId];
          if (taxiMarker) {
            taxiMarker.setLngLat([currentPosition.lng, currentPosition.lat]);
          }
        }
      }
    } else if (taxiStatus === "EN_ROUTE_TO_PICKUP") {
      // Taxi is moving to pickup
      if (taxiRoute.length > 1) {
        const currentIndex = Math.floor(taxiProgress * (taxiRoute.length - 1));
        const currentPosition = taxiRoute[currentIndex];
        
        if (currentPosition) {
          const taxiMarker = markersRef.current[selectedTaxi.taxiId];
          if (taxiMarker) {
            taxiMarker.setLngLat([currentPosition.lng, currentPosition.lat]);
          }
        }
      }
    }
  }, [taxiProgress, rideProgress, selectedTaxi, taxiRoute, rideRoute, mapLoaded, taxiStatus, pickupLocation, dropoffLocation]);

  // Update pickup/dropoff pins
  useEffect(() => {
    if (!map.current || !mapLoaded) return;

    // Remove existing pins
    if (pickupPinRef.current) {
      pickupPinRef.current.remove();
      pickupPinRef.current = null;
    }
    if (dropoffPinRef.current) {
      dropoffPinRef.current.remove();
      dropoffPinRef.current = null;
    }

    // Add pickup pin
    if (pickupLocation) {
      const pickupEl = document.createElement("div");
      pickupEl.className = "pickup-pin-container";
      pickupEl.innerHTML = `
        <div class="relative">
          <div class="w-6 h-6 bg-green-500 rounded-full border-3 border-white shadow-lg flex items-center justify-center">
            <div class="w-2 h-2 bg-white rounded-full"></div>
          </div>
          <div class="absolute -bottom-6 left-1/2 transform -translate-x-1/2 bg-green-500 text-white text-xs px-2 py-1 rounded whitespace-nowrap">
            Pickup
          </div>
        </div>
      `;

      pickupPinRef.current = new (window as any).mapboxgl.Marker(pickupEl)
        .setLngLat([pickupLocation.lng, pickupLocation.lat])
        .addTo(map.current!);
    }

    // Add dropoff pin
    if (dropoffLocation) {
      const dropoffEl = document.createElement("div");
      dropoffEl.className = "dropoff-pin-container";
      dropoffEl.innerHTML = `
        <div class="relative">
          <div class="w-6 h-6 bg-red-500 rounded-full border-3 border-white shadow-lg flex items-center justify-center">
            <div class="w-2 h-2 bg-white rounded-full"></div>
          </div>
          <div class="absolute -bottom-6 left-1/2 transform -translate-x-1/2 bg-red-500 text-white text-xs px-2 py-1 rounded whitespace-nowrap">
            Dropoff
          </div>
        </div>
      `;

      dropoffPinRef.current = new (window as any).mapboxgl.Marker(dropoffEl)
        .setLngLat([dropoffLocation.lng, dropoffLocation.lat])
        .addTo(map.current!);
    }
  }, [pickupLocation, dropoffLocation, mapLoaded]);

  // Route overlay (works with both styles)
  useEffect(() => {
    if (!map.current || !mapLoaded) return;

    if (map.current.getSource?.("route")) {
      try {
        map.current.removeLayer("route");
        map.current.removeSource("route");
      } catch {
        /* noop */
      }
    }

    if (pickupLocation && dropoffLocation) {
      map.current.addSource("route", {
        type: "geojson",
        data: {
          type: "Feature",
          properties: {},
          geometry: {
            type: "LineString",
            coordinates: [
              [pickupLocation.lng, pickupLocation.lat],
              [dropoffLocation.lng, dropoffLocation.lat],
            ],
          },
        },
      });

      map.current.addLayer({
        id: "route",
        type: "line",
        source: "route",
        layout: { "line-join": "round", "line-cap": "round" },
        paint: {
          "line-color": "#3B82F6",
          "line-width": 4,
          "line-opacity": 0.8,
          "line-dasharray": [2, 2],
        },
      });
    }
  }, [pickupLocation, dropoffLocation, mapLoaded]);

  return (
    <div className="relative w-full h-full">
      <div ref={mapContainer} className="w-full h-full" />
      {children}

      {/* Pin Mode Toggle */}
      <div className="absolute top-4 left-4 z-20">
        <div className="bg-white/95 backdrop-blur-sm rounded-xl shadow-lg border border-slate-200 p-2">
          <div className="flex gap-1">
            <button
              onClick={() => setIsSettingPickup(true)}
              className={`px-3 py-2 text-xs font-medium rounded-lg transition-all duration-200 ${
                isSettingPickup
                  ? "bg-green-600 text-white shadow-sm"
                  : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              Set Pickup
            </button>
            <button
              onClick={() => setIsSettingPickup(false)}
              className={`px-3 py-2 text-xs font-medium rounded-lg transition-all duration-200 ${
                !isSettingPickup
                  ? "bg-red-600 text-white shadow-sm"
                  : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              Set Dropoff
            </button>
          </div>
        </div>
      </div>

      {/* Instructions */}
      <div className="absolute bottom-4 left-4 z-20">
        <div className="bg-white/95 backdrop-blur-sm rounded-xl shadow-lg border border-slate-200 p-3 max-w-xs">
          <p className="text-xs text-slate-600">
            <span className="font-semibold">Click on the map</span> to set your {isSettingPickup ? "pickup" : "dropoff"} location
          </p>
        </div>
      </div>
    </div>
  );
}