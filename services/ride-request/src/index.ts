// autoride-eda/services/ride-request/src/index.ts
import express from "express";
import { Kafka } from "kafkajs";
import { Producer } from "kafkajs";

const RIDE_REQUEST_TOPIC = "ride.requests";

const app = express();
app.use(express.json());

let kafkaProducer: Producer;

/**
 * Sets up the Kafka producer and the Express server.
 */
async function setup() {
  // Initialize the Kafka client with the brokers from environment variables.
  const kafka = new Kafka({
    clientId: "ride-request-service",
    brokers: process.env.KAFKA_BROKERS?.split(",") || ["kafka:29092"],
  });
  kafkaProducer = kafka.producer(); // Use the shared kafka instance
  await kafkaProducer.connect();
  console.log("Kafka producer connected.");

  // Health check endpoint
  app.get("/health", (req, res) => {
    res.status(200).send("Ride Request Service is healthy");
  });

  // API endpoint to create a new ride request
  app.post("/rides", async (req, res) => {
    try {
      const { pickup, dropoff, userId } = req.body;

      if (!pickup || !dropoff || !userId) {
        return res
          .status(400)
          .json({ error: "Missing required fields: pickup, dropoff, userId" });
      }

      const rideRequest = {
        id: `RIDE-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        userId,
        pickup,
        dropoff,
        status: "pending",
        timestamp: new Date().toISOString(),
      };

      // Send the ride request event to the Kafka topic.
      await kafkaProducer.send({
        topic: RIDE_REQUEST_TOPIC,
        messages: [
          {
            key: rideRequest.id,
            value: JSON.stringify(rideRequest),
          },
        ],
      });

      console.log("Published ride request:", rideRequest);
      res.status(202).json(rideRequest);
    } catch (error) {
      console.error("Failed to process ride request:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => {
    console.log(`Ride Request Service listening on port ${PORT}`);
    console.log(`Submitting new ride requests to topic: ${RIDE_REQUEST_TOPIC}`);
  });

  process.on("SIGINT", async () => {
    console.log("Disconnecting Kafka producer...");
    await kafkaProducer.disconnect();
    process.exit(0);
  });
}

setup().catch(console.error);
