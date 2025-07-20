# AutoRide EDA - Backend Services

Event-driven autonomous taxi fleet simulation backend built with microservices architecture, Kafka, and Neon PostgreSQL.

## 🏗️ Architecture

\`\`\`
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│  Ride Request   │    │ Location        │    │ Dispatcher AI   │
│  Service        │    │ Simulator       │    │ Service         │
│  (Port 3001)    │    │                 │    │                 │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         └───────────────────────┼───────────────────────┘
                                 │
                    ┌─────────────────┐
                    │     Kafka       │
                    │   Event Bus     │
                    └─────────────────┘
                                 │
         ┌───────────────────────┼───────────────────────┐
         │                       │                       │
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│ Pricing AI      │    │ API Gateway     │    │ Chat AI         │
│ Service         │    │ (Port 3000)     │    │ Service         │
│                 │    │ + WebSocket     │    │ (Port 3002)     │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                                 │
                    ┌─────────────────┐
                    │ Neon PostgreSQL │
                    │   + Redis       │
                    └─────────────────┘
\`\`\`

## 🚀 Quick Start

### Prerequisites
- Docker & Docker Compose
- Node.js 18+ (for local development)
- Neon Database account
- OpenAI API key (optional, for chat service)

### 1. Environment Setup

\`\`\`bash
# Copy environment template
cp .env.example .env

# Edit .env with your credentials
nano .env
\`\`\`

Required environment variables:
\`\`\`env
DATABASE_URL=postgresql://username:password@ep-example.us-east-1.aws.neon.tech/autoride?sslmode=require
OPENAI_API_KEY=sk-your-openai-api-key-here
API_KEY=your-api-key-for-authentication
\`\`\`

### 2. Database Setup

\`\`\`bash
# Connect to your Neon database and run:
psql $DATABASE_URL -f database/schema.sql
\`\`\`

### 3. Start Services

\`\`\`bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Check service health
curl http://localhost:3000/health
\`\`\`

## 📡 API Endpoints

### REST API (Port 3000)

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/health` | GET | Health check |
| `/taxis/locations` | GET | Get all taxi locations |
| `/pricing/current` | GET | Get current pricing & surge |
| `/metrics` | GET | Get fleet metrics |
| `/events/recent` | GET | Get recent events (debug) |

### Ride Request Service (Port 3001)

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/ride-request` | POST | Request a new ride |
| `/rides/active` | GET | Get active rides |
| `/rides/:rideId` | GET | Get specific ride |

### Chat AI Service (Port 3002)

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/chat/query` | POST | Ask AI assistant |
| `/chat/history` | GET | Get chat history |

## 🔌 WebSocket Events

Connect to `ws://localhost:3000` to receive real-time events:

- `rideUpdate` - Ride status changes
- `vehicleUpdate` - Taxi location updates
- `pricingUpdate` - Surge pricing changes
- `anomalyAlert` - Fleet anomalies

## 🎯 Kafka Topics

| Topic | Description |
|-------|-------------|
| `rides.requested` | New ride requests |
| `rides.assigned` | Taxi assignments |
| `rides.completed` | Completed rides |
| `vehicle.locations` | Real-time taxi locations |
| `pricing.updates` | Dynamic pricing changes |
| `alerts.anomalies` | Fleet anomalies |

## 🧪 Testing

### Test Ride Request
\`\`\`bash
curl -X POST http://localhost:3001/ride-request \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "user-123",
    "pickup": {"lat": 40.7589, "lng": -73.9851},
    "dropoff": {"lat": 40.7614, "lng": -73.9776}
  }'
\`\`\`

### Test WebSocket Connection
\`\`\`javascript
const socket = io('http://localhost:3000');
socket.on('vehicleUpdate', (data) => {
  console.log('Vehicle update:', data);
});
\`\`\`

## 🔧 Development

### Local Development
\`\`\`bash
# Install dependencies for a service
cd services/ride-request
npm install

# Run in development mode
npm run dev

# Build TypeScript
npm run build
\`\`\`

### Adding New Services
1. Create service directory in `services/`
2. Add Dockerfile and package.json
3. Update docker-compose.yml
4. Add Kafka topics to shared types

## 📊 Monitoring

### Service Health
\`\`\`bash
# Check all services
docker-compose ps

# View specific service logs
docker-compose logs ride-request-service

# Monitor Kafka topics
docker-compose exec kafka kafka-console-consumer --bootstrap-server localhost:9092 --topic rides.requested
\`\`\`

### Database Queries
\`\`\`sql
-- Active rides
SELECT * FROM rides WHERE status IN ('REQUESTED', 'ASSIGNED', 'ENROUTE');

-- Fleet status
SELECT status, COUNT(*) FROM taxis GROUP BY status;

-- Recent events
SELECT * FROM events ORDER BY timestamp DESC LIMIT 10;
\`\`\`

### To Run Backend
\`\`\`bash
# Install all Service
make install

# Run all Services
make start-server
\`\`\`


## 🚀 Deployment

### DigitalOcean Deployment
\`\`\`bash
# Create droplet with Docker
doctl compute droplet create autoride-backend \
  --image docker-20-04 \
  --size s-2vcpu-4gb \
  --region nyc1

# Deploy services
scp -r . root@your-droplet-ip:/app
ssh root@your-droplet-ip
cd /app && docker-compose up -d
\`\`\`

### Production Considerations
- Use managed Kafka (Confluent Cloud)
- Enable SSL/TLS for all connections
- Set up proper monitoring (Prometheus/Grafana)
- Configure log aggregation
- Implement proper secrets management

## 🐛 Troubleshooting

### Common Issues

**Kafka Connection Errors**
\`\`\`bash
# Check Kafka is running
docker-compose logs kafka

# Verify topics exist
docker-compose exec kafka kafka-topics --bootstrap-server localhost:9092 --list
\`\`\`

**Database Connection Issues**
\`\`\`bash
# Test database connection
psql $DATABASE_URL -c "SELECT NOW();"

# Check service logs
docker-compose logs ride-request-service
\`\`\`

**Service Not Starting**
\`\`\`bash
# Check service dependencies
docker-compose ps

# Rebuild service
docker-compose build ride-request-service
docker-compose up -d ride-request-service
\`\`\`

## 📈 Performance Metrics

- **Target Latency**: < 5s p95 for ride assignments
- **Throughput**: 1000+ concurrent ride events
- **Availability**: 99.9% uptime
- **Event Processing**: < 2s end-to-end latency

## 🤝 Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
