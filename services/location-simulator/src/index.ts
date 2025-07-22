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
  status: 'IDLE' | 'ENROUTE';
  seq: number;
};

type TaxiState = {
  data: VehicleLocation;
  route: [number, number][]; // Array of [lon, lat] points
  routeStep: number;
};

// In-memory state for all our taxis
const taxis: Record<string, TaxiState> = {};

// Function to get a route from Mapbox Directions API
async function getNewRoute(start: [number, number]): Promise<[number, number][]> {
  const endLon = -73.9851 + (Math.random() - 0.5) * 0.1;
  const endLat = 40.7589 + (Math.random() - 0.5) * 0.1;
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
    return []; // Return an empty route on error
  }
}


// Initialize all taxis
for (let i = 0; i < TAXI_COUNT; i++) {
  const taxiId = `taxi-${i.toString().padStart(3, '0')}`;
  taxis[taxiId] = {
    data: {
      taxiId,
      lat: 40.7589 + (Math.random() - 0.5) * 0.05,
      lon: -73.9851 + (Math.random() - 0.5) * 0.05,
      speedKph: 0,
      status: 'IDLE',
      seq: Date.now(),
    },
    route: [],
    routeStep: 0,
  };
}


async function run() {
  await producer.connect();
  console.log('Smart location simulator connected to Kafka.');

  // Main simulation loop
  setInterval(async () => {
    for (const taxiId in taxis) {
      const taxi = taxis[taxiId];

      // If a taxi is IDLE, get it a new route
      if (taxi.data.status === 'IDLE') {
        const newRoute = await getNewRoute([taxi.data.lon, taxi.data.lat]);
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
        } else {
          // Update position to the next step in the route
          const [lon, lat] = taxi.route[taxi.routeStep];
          taxi.data.lon = lon;
          taxi.data.lat = lat;
          taxi.data.speedKph = Math.floor(Math.random() * 20) + 30; // Random speed
        }
      }

      // Publish the taxi's current state to Kafka
      taxi.data.seq = Date.now();
      await producer.send({
        topic: 'taxi-locations',
        messages: [{
          key: taxi.data.taxiId,
          value: JSON.stringify(taxi.data),
        }],
      });
    }
    console.log(`Published road-aware updates for ${TAXI_COUNT} taxis.`);
  }, 2000); // Update every 2 seconds
}

run().catch(e => console.error('[smart-simulator] Error:', e));
