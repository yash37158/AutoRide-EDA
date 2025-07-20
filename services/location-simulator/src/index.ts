// autoride-eda/services/location-simulator/src/index.ts
import { Kafka } from "kafkajs";

const KAFKA_TOPIC = "vehicle.locations";
const FLEET_SIZE = 10;

// In-memory store for the state of our 10 taxis
const vehicles = new Map<
  string,
  { lat: number; lon: number; bearing: number }
>();

function initializeFleet() {
  for (let i = 1; i <= FLEET_SIZE; i++) {
    const taxiId = `TAXI-${i}`;
    vehicles.set(taxiId, {
      lat: 40.7589 + (Math.random() - 0.5) * 0.1, // Start around NYC
      lon: -73.9851 + (Math.random() - 0.5) * 0.1,
      bearing: Math.random() * 360,
    });
  }
  console.log(`[location-simulator] Initialized ${FLEET_SIZE} vehicles.`);
}

// Function to retry connecting to Kafka
async function connectWithRetry(kafka: Kafka, retries = 5, delay = 3000) {
  for (let i = 0; i <= retries; i++) {
    try {
      const producer = kafka.producer();
      await producer.connect();
      console.log("[location-simulator] Kafka producer connected.");
      return producer; // Return the producer if connection is successful
    } catch (error: any) {
      console.error(
        `[location-simulator] Failed to connect to Kafka (attempt ${i + 1}/${retries}):`,
        error.message,
      );
      if (i === retries) {
        console.error(
          "[location-simulator] Max retries reached. Could not connect to Kafka.",
        );
        throw error; // Re-throw the error to stop the service
      }
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
  throw new Error("Failed to connect to Kafka after retries"); // This should not be reached if the loop exits
}

async function runSimulation() {
  console.log("[location-simulator] Starting...");
  initializeFleet();

  // Initialize the Kafka client with brokers from the environment.
  const kafka = new Kafka({
    clientId: "location-simulator",
    brokers: process.env.KAFKA_BROKERS?.split(",") || ["kafka:29092"],
  });

  const producer = await connectWithRetry(kafka);

  // Send the location updates every 2 seconds.
  setInterval(async () => {
    const kafkaMessages = [];

    for (const [id, state] of vehicles.entries()) {
      // Simulate movement. Move forward with a small turn.
      const speed = 0.0001; // Degrees per second
      state.bearing = (state.bearing + (Math.random() - 0.5) * 10 + 360) % 360;
      const radians = (state.bearing * Math.PI) / 180;
      state.lat += speed * Math.cos(radians);
      state.lon += speed * Math.sin(radians);

      // Create the payload for Kafka.
      const payload = {
        taxi_id: id,
        latitude: state.lat,
        longitude: state.lon,
        timestamp: Date.now(),
      };

      // Add to the list of messages to send.
      kafkaMessages.push({ key: id, value: JSON.stringify(payload) });
    }

    if (kafkaMessages.length > 0) {
      // Send the batch of messages to Kafka.
      try {
        await producer.send({
          topic: KAFKA_TOPIC,
          messages: kafkaMessages,
        });
      } catch (e) {
        console.error("Error sending Kafka message", e);
      }
    }
  }, 2000);
}

runSimulation().catch(console.error);
