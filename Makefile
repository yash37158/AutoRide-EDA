# Makefile for AutoRide EDA Backend Services

# --- Configuration ---
# Define the list of services that are standalone Node.js applications.
# The 'shared' directory is excluded because it is not a runnable service.
SERVICES := api-gateway dispatcher-ai location-simulator ride-request

# --- Primary Server Commands ---
# The default target to run when 'make' is called without arguments
.DEFAULT_GOAL := help

# The main "single command" to start the entire backend server
start-server:
	@echo "🚀 Starting all backend services with Docker Compose..."
	@docker compose up --build -d
	@echo "✅ All services are running in the background."
	@echo "To view logs, run: make logs"

# Command to stop the entire backend server
stop-server:
	@echo "🛑 Stopping all backend services..."
	@docker compose down
	@echo "✅ All services have been stopped."

# Command to view the logs from all running services
logs:
	@echo "🔎 Tailing logs from all services... (Press Ctrl+C to stop)"
	@docker compose logs -f

# --- Development Utilities ---
# Installs npm dependencies for all defined services
install:
	@echo "📦 Installing npm dependencies for all services..."
	@$(foreach service,$(SERVICES), \
		echo "--- Installing in services/$(service) ---"; \
		(cd services/$(service) && npm install); \
	)
	@echo "✅ All dependencies installed."

# Builds all services for production
build:
	@echo "🛠️ Building all services..."
	@$(foreach service,$(SERVICES), \
		echo "--- Building services/$(service) ---"; \
		(cd services/$(service) && npm run build); \
	)
	@echo "✅ All services built."

# Runs a specific service in development mode for debugging
dev:
ifndef service
	@echo "Error: Please specify which service to run."
	@echo "Usage: make dev service=<service_name>"
	@echo "Available services: $(SERVICES)"
	@exit 1
endif
	@echo "👨‍💻 Starting $(service) in development mode..."
	@(cd services/$(service) && npm run dev)

# --- Help ---
# Help command to display usage information
help:
	@echo "Usage: make [target]"
	@echo ""
	@echo "Server Commands:"
	@echo "  start-server  ✨ Starts the entire backend server using Docker Compose. This is the main command."
	@echo "  stop-server   Stops all running backend services."
	@echo "  logs          Tails the logs of all running services."
	@echo ""
	@echo "Development Utilities:"
	@echo "  install       Installs npm dependencies for every service."
	@echo "  build         Builds all services for production."
	@echo "  dev           Runs a specific service locally. Usage: make dev service=<service_name>"

# Phony targets are not files. This prevents conflicts with files of the same name.
.PHONY: all help start-server stop-server logs install build dev
