import 'dotenv/config'; // Load .env file
import { Kafka } from 'kafkajs';
import axios from 'axios';
import polyline from '@mapbox/polyline';

const MAPBOX_TOKEN = process.env.MAPBOX_TOKEN;
if (!MAPBOX_TOKEN) {
  throw new Error("Mapbox token not found. Please add it to .env file.");
}

const kafka = new Kafka({
  clientId: 'location-simulator',
  brokers: ['localhost:9092'],
});

const producer = kafka.producer();
const TAXI_COUNT = 7;

type VehicleLocation = {
  taxiId: string;
  lat: number;
  lon: number;
  speedKph: number;
  status: 'IDLE' | 'ENROUTE' | 'ASSIGNED' | 'EN_ROUTE_TO_PICKUP' | 'ARRIVED_AT_PICKUP' | 'EN_ROUTE_TO_DESTINATION' | 'COMPLETED';
  seq: number;
};

type TaxiState = {
  data: VehicleLocation;
  route: [number, number][]; // Array of [lon, lat] points
  routeStep: number;
  homeZone: { center: [number, number]; radius: number }; // Taxi's operating zone
  intelligentRoute?: [number, number][]; // Route for intelligent movement
  intelligentProgress?: number; // Progress along intelligent route (0-1)
  isIntelligentMode?: boolean; // Whether taxi is in intelligent mode
};

// In-memory state for all our taxis
const taxis: Record<string, TaxiState> = {};

// Manhattan operating zones for taxis
const MANHATTAN_ZONES: Array<{ center: [number, number]; radius: number; name: string }> = [
  { center: [-73.9851, 40.7589], radius: 0.03, name: "Midtown" },      // Times Square
  { center: [-73.9776, 40.7614], radius: 0.03, name: "Central Park" },  // Central Park
  { center: [-73.9934, 40.7505], radius: 0.03, name: "Chelsea" },       // Chelsea
  { center: [-73.9851, 40.7489], radius: 0.03, name: "Union Square" },  // Union Square
  { center: [-73.9441, 40.7831], radius: 0.03, name: "Upper East" },    // Upper East Side
  { center: [-73.9550, 40.7831], radius: 0.03, name: "Upper West" },    // Upper West Side
  { center: [-73.9851, 40.7300], radius: 0.03, name: "Greenwich Village" } // Greenwich Village
];

// Function to get a realistic route within Manhattan
async function getManhattanRoute(start: [number, number]): Promise<[number, number][]> {
  // Pick a random destination within Manhattan bounds
  const manhattanBounds = {
    north: 40.7831, // Upper Manhattan
    south: 40.7489, // Lower Manhattan
    east: -73.9441, // East River
    west: -73.9851  // Hudson River
  };
  
  const endLon = manhattanBounds.west + Math.random() * (manhattanBounds.east - manhattanBounds.west);
  const endLat = manhattanBounds.south + Math.random() * (manhattanBounds.north - manhattanBounds.south);
  
  const url = `https://api.mapbox.com/directions/v5/mapbox/driving/${start[0]},${start[1]};${endLon},${endLat}?geometries=polyline&access_token=${MAPBOX_TOKEN}`;

  try {
    const response = await axios.get(url);
    const geometry = response.data.routes[0].geometry;
    // Decode the polyline to get an array of [lat, lon] and reverse it to [lon, lat] for consistency
    return polyline.decode(geometry).map(p => [p[1], p[0]]);
  } catch (error) {
    console.error(
      "Error fetching route from Mapbox:",
      (error instanceof Error) ? error.message : error
    );
    // Fallback: create a simple route within Manhattan
    return [
      start,
      [endLon, endLat]
    ];
  }
}

// Function to keep taxi within Manhattan bounds
function constrainToManhattan(lat: number, lon: number): [number, number] {
  const manhattanBounds = {
    north: 40.7831,
    south: 40.7489,
    east: -73.9441,
    west: -73.9851
  };
  
  const constrainedLat = Math.max(manhattanBounds.south, Math.min(manhattanBounds.north, lat));
  const constrainedLon = Math.max(manhattanBounds.west, Math.min(manhattanBounds.east, lon));
  
  return [constrainedLon, constrainedLat];
}

// Initialize all taxis in realistic Manhattan locations
for (let i = 0; i < TAXI_COUNT; i++) {
  const taxiId = `taxi-${i.toString().padStart(3, '0')}`;
  
  // Assign each taxi to a specific Manhattan zone
  const zone = MANHATTAN_ZONES[i % MANHATTAN_ZONES.length];
  const zoneCenter: [number, number] = zone.center; // Explicitly type as tuple
  
  // Add some randomness within the zone
  const lat = zoneCenter[1] + (Math.random() - 0.5) * 0.01;
  const lon = zoneCenter[0] + (Math.random() - 0.5) * 0.01;
  
  taxis[taxiId] = {
    data: {
      taxiId,
      lat,
      lon,
      speedKph: 0,
      status: 'IDLE',
      seq: Date.now(),
    },
    route: [],
    routeStep: 0,
    homeZone: {
      center: zoneCenter,
      radius: zone.radius
    },
    intelligentRoute: undefined,
    intelligentProgress: 0,
    isIntelligentMode: false
  };
}

async function run() {
  await producer.connect();
  console.log('Intelligent Manhattan location simulator connected to Kafka.');

  // Main simulation loop
  setInterval(async () => {
    for (const taxiId in taxis) {
      const taxi = taxis[taxiId];
      
      // COMPLETELY SKIP intelligent taxis - don't publish anything for them
      if (['EN_ROUTE_TO_PICKUP', 'ARRIVED_AT_PICKUP', 'EN_ROUTE_TO_DESTINATION', 'COMPLETED'].includes(taxi.data.status)) {
        // Don't publish anything for intelligent taxis - let frontend control them completely
        continue;
      }

      // If a taxi is IDLE, get it a new route within Manhattan
      if (taxi.data.status === 'IDLE') {
        const newRoute = await getManhattanRoute([taxi.data.lon, taxi.data.lat]);
        if (newRoute.length > 0) {
          taxi.route = newRoute;
          taxi.routeStep = 0;
          taxi.data.status = 'ENROUTE';
        }
      }

      // If a taxi is ENROUTE, move it along the route
      if (taxi.data.status === 'ENROUTE') {
        taxi.routeStep++;
        // Check if the trip is over
        if (taxi.routeStep >= taxi.route.length) {
          taxi.data.status = 'IDLE';
          taxi.route = [];
          taxi.routeStep = 0;
          taxi.data.speedKph = 0;
          
          // Return taxi to its home zone when idle
          const [homeLon, homeLat] = taxi.homeZone.center;
          const currentDistance = Math.sqrt(
            Math.pow(taxi.data.lon - homeLon, 2) + 
            Math.pow(taxi.data.lat - homeLat, 2)
          );
          
          // If taxi is far from home zone, gradually move it back
          if (currentDistance > taxi.homeZone.radius) {
            const directionLon = (homeLon - taxi.data.lon) * 0.1;
            const directionLat = (homeLat - taxi.data.lat) * 0.1;
            
            taxi.data.lon += directionLon;
            taxi.data.lat += directionLat;
            
            // Constrain to Manhattan bounds
            const [constrainedLon, constrainedLat] = constrainToManhattan(taxi.data.lat, taxi.data.lon);
            taxi.data.lon = constrainedLon;
            taxi.data.lat = constrainedLat;
          }
        } else {
          // Update position to the next step in the route
          const [lon, lat] = taxi.route[taxi.routeStep];
          
          // Constrain movement to Manhattan bounds
          const [constrainedLon, constrainedLat] = constrainToManhattan(lat, lon);
          taxi.data.lon = constrainedLon;
          taxi.data.lat = constrainedLat;
          
          taxi.data.speedKph = Math.floor(Math.random() * 20) + 30; // Realistic speed 30-50 km/h
        }
      }

      // Publish the taxi's current state to Kafka (only for non-intelligent taxis)
      taxi.data.seq = Date.now();
      await producer.send({
        topic: 'taxi-locations',
        messages: [{
          key: taxi.data.taxiId,
          value: JSON.stringify(taxi.data),
        }],
      });
    }
    console.log(`Published updates for non-intelligent taxis.`);
  }, 2000); // Update every 2 seconds
}

run().catch(e => console.error('[intelligent-simulator] Error:', e));
