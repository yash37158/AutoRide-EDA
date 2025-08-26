# AutoRide EDA - Autonomous Taxi Simulation

<div align="center">

![AutoRide EDA](https://img.shields.io/badge/AutoRide-EDA-blue?style=for-the-badge&logo=car)
![Next.js](https://img.shields.io/badge/Next.js-15.0.0-black?style=for-the-badge&logo=next.js)
![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue?style=for-the-badge&logo=typescript)
![Kafka](https://img.shields.io/badge/Kafka-Event%20Streaming-orange?style=for-the-badge&logo=apache-kafka)

**A sophisticated event-driven autonomous taxi  simulation platform with real-time AI-powered dispatching, dynamic pricing, and interactive management.**

[🚀 Quick Start](#-quick-start) • [📖 Features](#-features) • [️ Architecture](#️-architecture) • [🔧 Development](#-development) • [📊 Demo](#-demo)

</div>

---

##  What is AutoRide EDA?

AutoRide EDA (Event-Driven Architecture) is a comprehensive simulation platform that demonstrates modern autonomous taxi  management. It combines real-time vehicle tracking, intelligent AI dispatching, dynamic pricing algorithms, and an interactive web interface to showcase how autonomous ride-sharing services could operate in the future.

###  Key Capabilities

- **Real-time Fleet Simulation**: 7 autonomous taxis operating across Manhattan with realistic movement patterns
- **AI-Powered Dispatching**: Google Gemini AI analyzes  state and makes intelligent taxi assignments
- **Dynamic Pricing**: Surge pricing algorithms based on demand and supply
- **Interactive Web Interface**: Real-time map visualization with taxi tracking and ride management
- **Event-Driven Architecture**: Kafka-based event streaming for scalable, decoupled services
- **Intelligent Chat Assistant**: AI-powered  management insights and troubleshooting

## ️ Architecture

### Frontend (Next.js 15 + React 18)
- **Modern React Application** with TypeScript and Tailwind CSS
- **Interactive Map Interface** using Mapbox GL for real-time taxi visualization
- **Real-time Updates** via WebSocket connections
- **State Management** with Zustand for efficient client-side state
- **Responsive Design** with mobile-first approach

### Backend Microservices
- **API Gateway** (Express.js) - Main REST API and event publishing
- **Location Simulator** - Generates realistic taxi movement data across Manhattan
- **Dispatcher AI** - Google Gemini-powered intelligent ride assignment
- **Realtime Gateway** - WebSocket event streaming for frontend updates
- **Ride Request Service** - Ride lifecycle management and processing

### Infrastructure
- **RedPanda** (Kafka-compatible) - High-performance event streaming
- **PostgreSQL 15** - Persistent data storage with comprehensive schema
- **Redis** - Caching and session management
- **Docker Compose** - Service orchestration and development environment

## 🚀 Quick Start

### Prerequisites
- **Docker & Docker Compose** (for infrastructure services)
- **Node.js 18+** (for local development)
- **Mapbox API Token** (for map visualization)
- **Google Gemini API Key** (for AI dispatching)

### 1. Clone and Setup

```bash
git clone https://github.com/your-username/AutoRide-EDA.git
cd AutoRide-EDA
```

### 2. Environment Configuration

```bash
# Copy environment template
cp .env.example .env

# Edit with your API keys
nano .env
```

Required environment variables:
```env
# Mapbox for map visualization
MAPBOX_TOKEN=your_mapbox_token_here

# Google Gemini for AI dispatching
GEMINI_API_KEY=your_gemini_api_key_here

# Database (optional for full features)
DATABASE_URL=postgresql://username:password@localhost:5432/autoride
```

### 3. Start the Platform

```bash
# Install all dependencies
make install

# Start infrastructure and services
make start

# Or start individually:
docker-compose up -d  # Infrastructure (RedPanda, PostgreSQL, Redis)
npm run dev          # Frontend (Next.js)
```

### 4. Access the Application

- **Frontend**: http://localhost:3000
- **API Gateway**: http://localhost:3001
- **Realtime Gateway**: ws://localhost:3002
- **Dispatcher AI**: http://localhost:3003

##  Demo Features

### ️ Interactive Fleet Management
- **Real-time Taxi Tracking**: Watch 7 autonomous taxis navigate Manhattan
- **Intelligent Route Planning**: AI-powered pickup and dropoff optimization
- **Live Fleet Metrics**: Active rides, average ETAs, and system performance
- **Dynamic Pricing**: Real-time surge pricing based on demand

### 🤖 AI-Powered Operations
- **Smart Dispatching**: AI analyzes state and assigns optimal taxis
- **Predictive Analytics**: ETA calculations and route optimization
- **Intelligent Chat**: Ask questions about status and get AI-powered insights
- **Anomaly Detection**: Automatic detection of unusual patterns

### 📱 User Experience
- **Ride Request Interface**: Simple pickup/dropoff selection
- **Real-time Updates**: Live status updates via WebSocket
- **Responsive Design**: Works seamlessly on desktop and mobile
- **Performance Monitoring**: Real-time metrics and system health

## 🔧 Development

### Project Structure
```
AutoRide-EDA/
├── app/                    # Next.js frontend pages
├── components/             # React components
│   ├── map/               # Map visualization
│   ├── ride/              # Ride management
│   ├── panels/            # Control panels
│   └── ui/                # Reusable UI components
├── services/              # Backend microservices
│   ├── api-gateway/       # Main API service
│   ├── dispatcher-ai/     # AI dispatching service
│   ├── location-simulator/ # Taxi movement simulation
│   ├── realtime-gateway/  # WebSocket service
│   └── ride-request/      # Ride processing service
├── lib/                   # Shared utilities and types
├── hooks/                 # Custom React hooks
└── database/              # Database schema and migrations
```

### Local Development

```bash
# Install frontend dependencies
npm install

# Install service dependencies
make install

# Start development environment
make start

# View logs
docker-compose logs -f

# Stop all services
make stop
```

### Adding New Features

1. **Frontend Components**: Add to `components/` directory
2. **Backend Services**: Create new service in `services/` directory
3. **API Endpoints**: Extend API Gateway or create new service
4. **Event Types**: Update `lib/types.ts` for new Kafka events

##  API Reference

### Core Endpoints

| Service | Endpoint | Method | Description |
|---------|----------|--------|-------------|
| API Gateway | `/health` | GET | Service health check |
| API Gateway | `/event` | POST | Publish Kafka events |
| Ride Request | `/rides` | POST | Create new ride request |
| Dispatcher AI | `/chat/query` | POST | AI assistant |
| Dispatcher AI | `/ride-request` | POST | AI-powered ride assignment |

### WebSocket Events

Connect to `ws://localhost:3002` for real-time updates:

```javascript
const socket = new WebSocket('ws://localhost:3002');

socket.onmessage = (event) => {
  const data = JSON.parse(event.data);
  console.log('Fleet update:', data);
};
```

### Kafka Topics

| Topic | Description | Producer | Consumer |
|-------|-------------|----------|----------|
| `taxi-locations` | Real-time taxi positions | Location Simulator | Frontend, Dispatcher AI |
| `rides.requested` | New ride requests | Frontend | Dispatcher AI |
| `rides.assigned` | Taxi assignments | Dispatcher AI | Frontend |
| `pricing.updates` | Dynamic pricing changes | API Gateway | Frontend |

## 🧪 Testing

### Manual Testing

```bash
# Test ride request
curl -X POST http://localhost:3001/rides \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "user-123",
    "pickup": {"lat": 40.7589, "lng": -73.9851},
    "dropoff": {"lat": 40.7614, "lng": -73.9776}
  }'

# Test AI chat
curl -X POST http://localhost:3003/chat/query \
  -H "Content-Type: application/json" \
  -d '{"question": "How many taxis are currently idle?"}'
```

### Automated Testing

```bash
# Run frontend tests
npm test

# Run service tests
cd services/ride-request && npm test
```

## 🚀 Deployment

### Production Deployment

```bash
# Build production images
docker-compose -f docker-compose.prod.yml build

# Deploy to production
docker-compose -f docker-compose.prod.yml up -d
```

### Environment Variables

```env
# Production settings
NODE_ENV=production
KAFKA_BROKERS=kafka1:9092,kafka2:9092,kafka3:9092
DATABASE_URL=postgresql://user:pass@db:5432/autoride
REDIS_URL=redis://redis:6379
```

## 🐛 Troubleshooting

### Common Issues

**Service Connection Errors**
```bash
# Check service health
curl http://localhost:3001/health
curl http://localhost:3003/health

# View service logs
docker-compose logs -f api-gateway
```

**Kafka Issues**
```bash
# Check Kafka connectivity
docker-compose exec redpanda kafka-topics --bootstrap-server localhost:9092 --list

# Monitor topics
docker-compose exec redpanda kafka-console-consumer --bootstrap-server localhost:9092 --topic taxi-locations
```

**Frontend Issues**
```bash
# Clear Next.js cache
rm -rf .next
npm run dev

# Check browser console for WebSocket errors
```

## 📈 Current Capabilities

### Fleet Operations
- **7 Autonomous Taxis** operating across Manhattan
- **Real-time Location Updates** every 2 seconds
- **Intelligent Route Planning** using Mapbox Directions API
- **Zone-based Operations** with home zone assignments

### AI Integration
- **Google Gemini 2.0 Flash** for intelligent dispatching
- **Real-time Fleet Analysis** with context-aware decisions
- **Predictive ETA Calculations** based on current conditions
- **Natural Language Fleet Management** via chat interface

### Performance Characteristics
- **Event Processing**: ~2-second update intervals
- **WebSocket Latency**: <100ms for real-time updates
- **AI Response Time**: <3 seconds for dispatching decisions
- **Geographic Coverage**: Manhattan (40.7489°N to 40.7831°N, 73.9851°W to 73.9441°W)

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guidelines](CONTRIBUTING.md) for details.

### Development Workflow

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Make your changes and add tests
4. Commit with descriptive messages (`git commit -m 'Add amazing feature'`)
5. Push to your branch (`git push origin feature/amazing-feature`)
6. Open a Pull Request

### Code Standards

- **TypeScript**: Strict mode with comprehensive type definitions
- **ESLint**: Code quality and consistency
- **Prettier**: Code formatting
- **Testing**: Unit tests for new features

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

##  Acknowledgments

- **Mapbox** for mapping and routing services
- **Google Gemini** for AI-powered decision making
- **RedPanda** for high-performance event streaming
- **Next.js** for the modern React framework
- **Tailwind CSS** for beautiful, responsive design

---

<div align="center">

**Built with ❤️ for the future of autonomous transportation**

[Report Bug](https://github.com/your-username/AutoRide-EDA/issues) • [Request Feature](https://github.com/your-username/AutoRide-EDA/issues) • [View Demo](https://your-demo-url.com)

</div>
