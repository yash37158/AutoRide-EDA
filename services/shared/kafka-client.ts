import { Kafka } from "kafkajs";

// This makes the client configurable using environment variables.
const KAFKA_BROKERS = process.env.KAFKA_BROKERS?.split(",") || ["kafka:29092"];

// Create the Kafka client instance. The `kafkaInstance` variable
// is explicitly typed to make TypeScript happy.
const kafkaInstance: Kafka = new Kafka({
  clientId: "autoride-eda-app", // Replace if needed.
  brokers: KAFKA_BROKERS,
  // Add retry logic for production resilience.
  retry: {
    initialRetryTime: 300,
    retries: 5,
  },
});

// Export a single, shared instance of the Kafka client for use in other modules.
export const kafka = kafkaInstance;
