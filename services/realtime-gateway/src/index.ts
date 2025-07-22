import { WebSocketServer, WebSocket } from 'ws';
import { Kafka } from 'kafkajs';

const wss = new WebSocketServer({ port: 3002 });
const kafka = new Kafka({
  clientId: 'realtime-gateway',
  brokers: ['localhost:9092'],
});
const consumer = kafka.consumer({ groupId: 'realtime-group' });

async function run() {
  await consumer.connect();
  await consumer.subscribe({ topic: 'taxi-locations', fromBeginning: false });

  consumer.run({
    eachMessage: async ({ message }) => {
      // Broadcast to all connected clients
      wss.clients.forEach((client: WebSocket) => {
        if (client.readyState === 1) {
          client.send(message.value!.toString());
        }
      });
    },
  });

  wss.on('connection', (ws: WebSocket) => {
    console.log('Frontend connected to WebSocket');
  });
}

run().catch(console.error);
