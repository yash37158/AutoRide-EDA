import express, { Request, Response } from 'express';
import { Kafka } from 'kafkajs';

const app = express();
app.use(express.json());

const kafka = new Kafka({
  clientId: 'api-gateway',
  brokers: ['localhost:9092'],
});
const producer = kafka.producer();

app.post('/event', async (req: Request, res: Response) => {
  const { topic, message } = req.body;
  if (!topic || !message) {
    return res.status(400).json({ error: 'Missing topic or message' });
  }
  await producer.send({
    topic,
    messages: [{ value: JSON.stringify(message) }],
  });
  res.json({ status: 'ok' });
});

producer.connect().then(() => {
  const PORT = Number(process.env.API_GATEWAY_PORT || process.env.PORT || 3001);
  const server = app.listen(PORT, () => {
    console.log(`API Gateway listening on port ${PORT}`);
  });
  server.on('error', (err: NodeJS.ErrnoException) => {
    if (err.code === 'EADDRINUSE') {
      console.error(`Port ${PORT} is already in use. Set API_GATEWAY_PORT to change it.`);
      process.exit(1);
    }
    throw err;
  });
});