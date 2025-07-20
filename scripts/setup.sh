#!/bin/bash

# AutoRide EDA Backend Setup Script

set -e

echo "🚀 Setting up AutoRide EDA Backend..."

# Check prerequisites
command -v docker >/dev/null 2>&1 || { echo "❌ Docker is required but not installed. Aborting." >&2; exit 1; }
command -v docker-compose >/dev/null 2>&1 || { echo "❌ Docker Compose is required but not installed. Aborting." >&2; exit 1; }

# Create environment file if it doesn't exist
if [ ! -f .env ]; then
    echo "📝 Creating .env file from template..."
    cp .env.example .env
    echo "⚠️  Please edit .env file with your actual credentials before continuing."
    echo "   Required: DATABASE_URL, OPENAI_API_KEY"
    read -p "Press enter to continue after editing .env file..."
fi

# Build and start services
echo "🏗️  Building Docker images..."
docker-compose build

echo "🚀 Starting services..."
docker-compose up -d

# Wait for services to be ready
echo "⏳ Waiting for services to start..."
sleep 30

# Check service health
echo "🔍 Checking service health..."
services=("api-gateway:3000" "ride-request-service:3001")

for service in "${services[@]}"; do
    name=$(echo $service | cut -d: -f1)
    port=$(echo $service | cut -d: -f2)
    
    if curl -f http://localhost:$port/health >/dev/null 2>&1; then
        echo "✅ $name is healthy"
    else
        echo "❌ $name is not responding"
    fi
done

# Create Kafka topics
echo "📡 Creating Kafka topics..."
docker-compose exec -T kafka kafka-topics --create --bootstrap-server localhost:9092 --topic rides.requested --partitions 3 --replication-factor 1 --if-not-exists
docker-compose exec -T kafka kafka-topics --create --bootstrap-server localhost:9092 --topic rides.assigned --partitions 3 --replication-factor 1 --if-not-exists
docker-compose exec -T kafka kafka-topics --create --bootstrap-server localhost:9092 --topic rides.completed --partitions 3 --replication-factor 1 --if-not-exists
docker-compose exec -T kafka kafka-topics --create --bootstrap-server localhost:9092 --topic vehicle.locations --partitions 3 --replication-factor 1 --if-not-exists
docker-compose exec -T kafka kafka-topics --create --bootstrap-server localhost:9092 --topic pricing.updates --partitions 3 --replication-factor 1 --if-not-exists
docker-compose exec -T kafka kafka-topics --create --bootstrap-server localhost:9092 --topic alerts.anomalies --partitions 3 --replication-factor 1 --if-not-exists

echo "✅ Setup complete!"
echo ""
echo "🌐 Services available at:"
echo "   API Gateway: http://localhost:3000"
echo "   Ride Request: http://localhost:3001"
echo "   Chat AI: http://localhost:3002"
echo ""
echo "📊 View logs: docker-compose logs -f"
echo "🛑 Stop services: docker-compose down"
