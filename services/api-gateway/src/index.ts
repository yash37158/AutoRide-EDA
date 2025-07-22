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
  app.listen(3001, () => {
    console.log('API Gateway listening on port 3001');
  });
});
