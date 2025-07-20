"use strict";
const { Kafka } = require("kafkajs");

// Kafka Topics
const TOPICS = {
  RIDES_REQUESTED: "rides.requested",
  RIDES_ASSIGNED: "rides.assigned",
  RIDES_COMPLETED: "rides.completed",
  VEHICLE_LOCATIONS: "vehicle.locations",
  PRICING_UPDATES: "pricing.updates",
  ALERTS_ANOMALIES: "alerts.anomalies",
  CHAT_QUERIES: "chat.queries",
  CHAT_RESPONSES: "chat.responses",
};

class KafkaClient {
  constructor(brokers) {
    this.kafka = new Kafka({
      clientId: "autoride-eda",
      brokers,
      retry: {
        initialRetryTime: 100,
        retries: 8,
      },
    });
    this.producer = null;
    this.consumers = new Map();

    // Graceful shutdown
    process.on("SIGINT", async () => {
      console.log("Shutting down KafkaClient...");
      await this.disconnect();
      process.exit(0);
    });
  }

  async getProducer() {
    if (!this.producer) {
      this.producer = this.kafka.producer({
        maxInFlightRequests: 1,
        idempotent: true,
        transactionTimeout: 30000,
      });
      await this.producer.connect();
    }
    return this.producer;
  }

  async createConsumer(groupId) {
    if (!this.consumers.has(groupId)) {
      const consumer = this.kafka.consumer({
        groupId,
        sessionTimeout: 30000,
        heartbeatInterval: 3000,
      });
      await consumer.connect();
      this.consumers.set(groupId, consumer);
    }
    return this.consumers.get(groupId);
  }

  async publishEvent(topic, key, value) {
    const producer = await this.getProducer();
    await producer.send({
      topic,
      messages: [
        {
          key,
          value: JSON.stringify(value),
          timestamp: Date.now().toString(),
        },
      ],
    });
  }

  async subscribe(groupId, topics, handler) {
    const consumer = await this.createConsumer(groupId);
    for (const topic of topics) {
      await consumer.subscribe({ topic, fromBeginning: false });
    }

    await consumer.run({
      eachMessage: async (payload) => {
        try {
          await handler(payload);
        } catch (error) {
          console.error(
            `Error processing message from ${payload.topic}:`,
            error,
          );
          // Dead Letter Queue (DLQ) logic can be added here if needed
        }
      },
    });
  }

  async disconnect() {
    if (this.producer) {
      await this.producer.disconnect();
    }
    for (const consumer of this.consumers.values()) {
      await consumer.disconnect();
    }
  }
}

module.exports = { KafkaClient, TOPICS };
