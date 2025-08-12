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

export function MapViewport({ children }: { children: React.ReactNode }) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<any>(null);
  const markersRef = useRef<{ [key: string]: any }>({});
  const { vehicles, currentRide, setPickupLocation, setDropoffLocation } =
    useAutoRideStore();
  const [mapLoaded, setMapLoaded] = useState(false);

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
        style: mapStyle as any, // can be URL or style object
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
          } catch {
            // Ignore if style doesn't have the required sources/layers
          }
        }
      });

      // Handle map clicks
      map.current.on("click", (e: any) => {
        // selection handled at panel level
      });
    })();

    return () => {
      map.current?.remove();
      map.current = null;
    };
  }, [mapStyle]);

  // Update taxi markers
  useEffect(() => {
    if (!map.current || !mapLoaded) return;

    Object.values(markersRef.current).forEach((marker: any) => marker.remove());
    markersRef.current = {};

    Object.values(vehicles).forEach((vehicle: any) => {
      const el = document.createElement("div");
      el.className = "taxi-marker-container";
      el.innerHTML = `
        <div class="relative">
          <div class="relative w-8 h-8 rounded-full border-3 border-white shadow-lg flex items-center justify-center text-lg"
               style="background: linear-gradient(135deg, #10B981, #10B981dd);">
            🚗
          </div>
          <div class="absolute -bottom-8 left-1/2 transform -translate-x-1/2 bg-black/80 text-white text-xs px-2 py-1 rounded whitespace-nowrap">
            Taxi ${vehicle.taxiId}
          </div>
        </div>
      `;

      const marker = new (window as any).mapboxgl.Marker(el)
        .setLngLat([vehicle.lon, vehicle.lat])
        .addTo(map.current!);

      markersRef.current[vehicle.taxiId] = marker;
    });
  }, [vehicles, mapLoaded]);

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
        layout: { "line-join": "round", "line-cap": "round" },
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
      {children}

      {/* Map Style Selector (shows OSM only when no token) */}
      <div className="absolute top-4 right-4 z-20">
        <div className="bg-white/95 backdrop-blur-sm rounded-xl shadow-lg border border-slate-200 p-2">
          <div className="flex gap-1">
            {mapStyles.map((style) => (
              <button
                key={style.name}
                onClick={() => {
                  // Switch styles; for Mapbox URLs we pass the string; for OSM we pass the object
                  setMapStyle(style.value as any);
                  if (map.current) {
                    try {
                      map.current.setStyle(style.value as any);
                    } catch {
                      /* noop */
                    }
                  }
                }}
                className={`px-3 py-2 text-xs font-medium rounded-lg transition-all duration-200 ${
                  (typeof mapStyle === "string" && mapStyle === style.value) ||
                  (typeof mapStyle === "object" && style.value === OSM_STYLE)
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
    </div>
  );
}