import { WebSocketServer, WebSocket } from 'ws';
import { Kafka } from 'kafkajs';

const PORT: number = Number(process.env.REALTIME_PORT || process.env.PORT || 3002);

let wss: WebSocketServer;
try {
  wss = new WebSocketServer({ port: PORT });
  console.log(`Realtime WebSocket listening on ${PORT}`);
} catch (e: any) {
  if (e && e.code === 'EADDRINUSE') {
    console.error(`Port ${PORT} is already in use. Set REALTIME_PORT to change it.`);
    process.exit(1);
  }
  throw e;
}

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
      wss.clients.forEach((client: WebSocket) => {
        if (client.readyState === 1) {
          client.send(message.value!.toString());
        }
      });
    },
  });

  wss.on('connection', () => {
    console.log('Frontend connected to WebSocket');
  });
}

run().catch(console.error);