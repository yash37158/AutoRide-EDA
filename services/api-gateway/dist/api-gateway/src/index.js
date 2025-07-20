"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const http_1 = require("http");
const socket_io_1 = require("socket.io");
const kafka_client_1 = require("../../shared/kafka-client");
const pg_1 = require("pg");
const ioredis_1 = __importDefault(require("ioredis"));
const app = (0, express_1.default)();
const server = (0, http_1.createServer)(app);
const io = new socket_io_1.Server(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"],
    },
});
const port = process.env.PORT || 3000;
// Initialize services
const kafkaClient = new kafka_client_1.KafkaClient(process.env.KAFKA_BROKERS?.split(",") || ["localhost:9092"]);
const db = new pg_1.Pool({ connectionString: process.env.DATABASE_URL });
const redis = new ioredis_1.default(process.env.REDIS_URL || "redis://localhost:6379");
app.use((0, cors_1.default)());
app.use(express_1.default.json());
// Health check
app.get("/health", (req, res) => {
    res.json({ status: "healthy", service: "api-gateway" });
});
// Get all taxi locations
app.get("/taxis/locations", async (req, res) => {
    try {
        const result = await db.query("SELECT * FROM taxis ORDER BY updated_at DESC");
        res.json({ taxis: result.rows });
    }
    catch (error) {
        console.error("Error fetching taxi locations:", error);
        res.status(500).json({ error: "Internal server error" });
    }
});
// Get current pricing
app.get("/pricing/current", async (req, res) => {
    try {
        const surgeMultiplier = (await redis.get("current_surge_multiplier")) || "1.0";
        const baseFare = 12.5;
        res.json({
            baseFare,
            surgeMultiplier: Number.parseFloat(surgeMultiplier),
            estimatedFare: baseFare * Number.parseFloat(surgeMultiplier),
        });
    }
    catch (error) {
        console.error("Error fetching pricing:", error);
        res.status(500).json({ error: "Internal server error" });
    }
});
// Get fleet metrics
app.get("/metrics", async (req, res) => {
    try {
        const [ridesResult, taxisResult] = await Promise.all([
            db.query("SELECT status, COUNT(*) as count FROM rides WHERE status IN ($1, $2, $3) GROUP BY status", [
                "REQUESTED",
                "ASSIGNED",
                "ENROUTE",
            ]),
            db.query("SELECT status, COUNT(*) as count FROM taxis GROUP BY status"),
        ]);
        const activeRides = ridesResult.rows.reduce((sum, row) => sum + Number.parseInt(row.count), 0);
        const taxiStats = taxisResult.rows.reduce((acc, row) => {
            acc[row.status.toLowerCase()] = Number.parseInt(row.count);
            return acc;
        }, {});
        // Calculate average ETA
        const etaResult = await db.query("SELECT AVG(eta_seconds) as avg_eta FROM rides WHERE status IN ($1, $2) AND eta_seconds IS NOT NULL", ["ASSIGNED", "ENROUTE"]);
        const avgEta = etaResult.rows[0]?.avg_eta ? Math.round(etaResult.rows[0].avg_eta / 60) : 5;
        res.json({
            activeRides,
            avgEta,
            taxiStats,
            surgeMultiplier: Number.parseFloat((await redis.get("current_surge_multiplier")) || "1.0"),
            eventsPerSec: Number.parseInt((await redis.get("events_per_second")) || "10"),
        });
    }
    catch (error) {
        console.error("Error fetching metrics:", error);
        res.status(500).json({ error: "Internal server error" });
    }
});
// Get recent events for debugging
app.get("/events/recent", async (req, res) => {
    try {
        const limit = Number.parseInt(req.query.limit) || 50;
        const result = await db.query("SELECT * FROM events ORDER BY timestamp DESC LIMIT $1", [limit]);
        res.json({ events: result.rows });
    }
    catch (error) {
        console.error("Error fetching events:", error);
        res.status(500).json({ error: "Internal server error" });
    }
});
// WebSocket connection handling
io.on("connection", (socket) => {
    console.log("Client connected:", socket.id);
    socket.on("disconnect", () => {
        console.log("Client disconnected:", socket.id);
    });
    // Send initial data
    socket.emit("connected", { message: "Connected to AutoRide EDA" });
});
// Kafka event listeners for real-time updates
async function startKafkaListeners() {
    // Listen for ride assignments
    await kafkaClient.subscribe("api-gateway-rides", [kafka_client_1.TOPICS.RIDES_ASSIGNED, kafka_client_1.TOPICS.RIDES_COMPLETED], async ({ topic, message }) => {
        if (message.value) {
            const data = JSON.parse(message.value.toString());
            io.emit("rideUpdate", { topic, data });
        }
    });
    // Listen for vehicle location updates
    await kafkaClient.subscribe("api-gateway-locations", [kafka_client_1.TOPICS.VEHICLE_LOCATIONS], async ({ message }) => {
        if (message.value) {
            const location = JSON.parse(message.value.toString());
            io.emit("vehicleUpdate", location);
        }
    });
    // Listen for pricing updates
    await kafkaClient.subscribe("api-gateway-pricing", [kafka_client_1.TOPICS.PRICING_UPDATES], async ({ message }) => {
        if (message.value) {
            const pricing = JSON.parse(message.value.toString());
            io.emit("pricingUpdate", pricing);
            // Cache the surge multiplier
            await redis.setex("current_surge_multiplier", 300, pricing.surgeMultiplier.toString());
        }
    });
    // Listen for anomalies
    await kafkaClient.subscribe("api-gateway-anomalies", [kafka_client_1.TOPICS.ALERTS_ANOMALIES], async ({ message }) => {
        if (message.value) {
            const anomaly = JSON.parse(message.value.toString());
            io.emit("anomalyAlert", anomaly);
        }
    });
    console.log("API Gateway Kafka listeners started");
}
// Start the server
server.listen(port, () => {
    console.log(`API Gateway running on port ${port}`);
    startKafkaListeners().catch(console.error);
});
// Graceful shutdown
process.on("SIGTERM", async () => {
    await kafkaClient.disconnect();
    await db.end();
    await redis.quit();
    server.close();
    process.exit(0);
});
