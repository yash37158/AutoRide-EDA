import { Kafka } from "kafkajs";
import { EachMessagePayload } from "kafkajs";

// Define the topics this service will interact with for clarity
const RIDE_REQUEST_TOPIC = "ride.requests";
const RIDE_ASSIGNMENT_TOPIC = "ride.assignments";

/**
 * The main function for the Dispatcher AI service.
 */
async function main() {
  console.log("Starting Dispatcher AI service...");

  // Initialize the Kafka client with brokers from the environment.
  const kafka = new Kafka({
    clientId: "dispatcher-ai",
    brokers: process.env.KAFKA_BROKERS?.split(",") || ["kafka:29092"],
  });

  const consumer = kafka.consumer({ groupId: "dispatcher-ai-group" });
  const producer = kafka.producer();

  await Promise.all([consumer.connect(), producer.connect()]);
  console.log("Kafka consumer and producer connected.");

  // Subscribe to the ride request topic
  await consumer.subscribe({ topic: RIDE_REQUEST_TOPIC, fromBeginning: false }); // Subscribe from the latest messages.
  console.log(`Subscribed to topic: ${RIDE_REQUEST_TOPIC}`);

  await consumer.run({
    eachMessage: async ({ message }: EachMessagePayload) => {
      if (!message.value) return;

      const rideRequest = JSON.parse(message.value.toString());
      console.log("Received ride request:", rideRequest);

      // --- AI Logic for Dispatch (Simplified) ---
      // This is where you would implement complex logic to find the best taxi.
      // For now, we'll just assign a random taxi from our fleet of 10.
      const assignedTaxiId = `TAXI-${Math.floor(Math.random() * 10) + 1}`;

      const assignmentPayload = {
        rideRequestId: rideRequest.id,
        taxiId: assignedTaxiId,
        eta: Math.floor(Math.random() * 10) + 2, // Random ETA between 2-12 mins
      };

      // Produce the ride assignment event
      await producer.send({
        topic: RIDE_ASSIGNMENT_TOPIC,
        messages: [
          { key: rideRequest.id, value: JSON.stringify(assignmentPayload) },
        ],
      });

      console.log("Published ride assignment:", assignmentPayload);
    },
  });

  process.on("SIGINT", async () => {
    console.log("Disconnecting Kafka consumer and producer...");
    await Promise.all([consumer.disconnect(), producer.disconnect()]);
    process.exit(0);
  });
}

main().catch(console.error);
