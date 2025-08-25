# Start all backend services and infrastructure
start:
	docker compose up -d
	cd services/location-simulator && npm install
	cd services/api-gateway && npm install
	cd services/realtime-gateway && npm install
	cd services/dispatcher-ai && npm install
	npm --prefix services/location-simulator run dev &
	npm --prefix services/api-gateway run dev &
	npm --prefix services/realtime-gateway run dev &
	npm --prefix services/dispatcher-ai run dev &

# Stop all running services and infrastructure
stop:
	@echo "Stopping backend services..."
	@pkill -f "ts-node src/index.ts" || true
	docker compose down

# Clean up Docker volumes (dangerous: removes all data)
clean:
	docker compose down -v

# Install all dependencies
install:
	cd services/location-simulator && npm install
	cd services/api-gateway && npm install
	cd services/realtime-gateway && npm install
	cd services/dispatcher-ai && npm install

.PHONY: start stop clean install
