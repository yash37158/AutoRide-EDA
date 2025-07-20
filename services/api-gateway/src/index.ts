// autoride-eda/services/api-gateway/src/index.ts
import express from "express";
import http from "http";
import { Server as SocketIOServer } from "socket.io";
import cors from "cors";
import { Kafka, EachMessagePayload } from "kafkajs";

const KAFKA_TOPIC = "vehicle.locations";

// 1. Create an Express app.
const app = express();
app.use(cors());

// 2. Create an HTTP server using the Express app.
const server = http.createServer(app);

// 3. Create a Socket.IO server, attaching it to the HTTP server.
const io = new SocketIOServer(server, {
  cors: {
    origin: "*", // Allow connections from any origin (for development)
  },
});

// Handle new WebSocket connections.
io.on("connection", (socket) => {
  console.log(`[api-gateway] Client connected: ${socket.id}`);
  socket.on("disconnect", () => {
    console.log(`[api-gateway] Client disconnected: ${socket.id}`);
  });
});

async function startServer() {
  console.log("[api-gateway] Starting...");

  // Initialize the Kafka consumer.
  const kafka = new Kafka({
    clientId: "api-gateway",
    brokers: process.env.KAFKA_BROKERS?.split(",") || ["kafka:29092"],
  });
  const consumer = kafka.consumer({
    groupId: "api-gateway-group-" + Date.now(),
  });

  await consumer.connect();
  await consumer.subscribe({ topic: KAFKA_TOPIC, fromBeginning: false });
  console.log(`[api-gateway] Subscribed to Kafka topic: ${KAFKA_TOPIC}`);

  // Consume messages from Kafka and broadcast them over WebSockets.
  await consumer.run({
    eachMessage: async ({ message }: EachMessagePayload) => {
      if (!message.value) return;
      const vehicleUpdate = JSON.parse(message.value.toString());
      io.emit("fleetUpdate", [vehicleUpdate]); // Broadcast to all connected clients
    },
  });

  const PORT = process.env.PORT || 3000;
  server.listen(PORT, () => {
    console.log(`[api-gateway] API Gateway running on port ${PORT}`);
  });
}

startServer().catch(console.error);
