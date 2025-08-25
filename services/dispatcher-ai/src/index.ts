import 'dotenv/config';
import { Kafka } from "kafkajs";
import { EachMessagePayload } from "kafkajs";
import { GoogleGenerativeAI } from "@google/generative-ai";
import express, { Request, Response } from "express";
import cors from "cors";

// Define the topics this service will interact with
const RIDE_REQUEST_TOPIC = "ride.requests";
const RIDE_ASSIGNMENT_TOPIC = "ride.assignments";
const TAXI_LOCATIONS_TOPIC = "taxi-locations";
const RIDES_REQUESTED_TOPIC = "rides.requested";
const RIDES_ASSIGNED_TOPIC = "rides.assigned";
const RIDES_COMPLETED_TOPIC = "rides.completed";
const PRICING_UPDATES_TOPIC = "pricing.updates";
const ALERTS_ANOMALIES_TOPIC = "alerts.anomalies";

// Initialize Gemini AI
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");
const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash-exp" });

// Initialize Express server for AI chat
const app = express();
const PORT = process.env.AI_CHAT_PORT || 3003;

// Type definitions
interface FleetEvent {
  topic: string;
  payload: any;
  timestamp: number;
}

interface TaxiData {
  taxiId: string;
  status: string;
  [key: string]: any;
}

interface RideData {
  rideId: string;
  status: string;
  [key: string]: any;
}

interface AnomalyData {
  type: string;
  [key: string]: any;
}

// Fleet state
let fleetState: {
  taxis: Record<string, TaxiData>;
  activeRides: Record<string, RideData>;
  recentEvents: FleetEvent[];
  pricing: { surgeMultiplier: number };
  anomalies: AnomalyData[];
  lastUpdate: number;
} = {
  taxis: {},
  activeRides: {},
  recentEvents: [],
  pricing: { surgeMultiplier: 1.0 },
  anomalies: [],
  lastUpdate: Date.now()
};

const MAX_EVENTS = 100;

app.use(cors());
app.use(express.json());

/**
 * AI Chat endpoint with real-time fleet context
 */
app.post("/chat/query", async (req: Request, res: Response) => {
  try {
    const { question, context } = req.body;
    
    if (!question) {
      return res.status(400).json({ error: "Question is required" });
    }

    // Create context-aware prompt with real-time fleet data
    const realTimeContext = `
REAL-TIME FLEET STATUS (as of ${new Date(fleetState.lastUpdate).toLocaleString()}):

ACTIVE TAXIS: ${Object.keys(fleetState.taxis).length}
- Status breakdown: ${Object.values(fleetState.taxis).reduce((acc: any, taxi: any) => {
    acc[taxi.status] = (acc[taxi.status] || 0) + 1;
    return acc;
  }, {})}

ACTIVE RIDES: ${Object.keys(fleetState.activeRides).length}
- Recent ride events: ${fleetState.recentEvents.filter(e => e.topic.includes('ride')).slice(-5).map(e => `${e.topic}: ${e.payload.status || 'N/A'}`).join(', ')}

PRICING: Surge multiplier: ${fleetState.pricing.surgeMultiplier}x

RECENT ANOMALIES: ${fleetState.anomalies.slice(-3).map(a => a.type).join(', ')}

LAST 10 EVENTS: ${fleetState.recentEvents.slice(-10).map(e => `${e.topic}: ${JSON.stringify(e.payload).substring(0, 100)}...`).join('\n')}

User Question: ${question}

Based on this REAL-TIME fleet data, provide an accurate, current response. If the user asks about specific metrics, use the actual numbers above. If they ask about trends, analyze the recent events.`;

    const prompt = `
You are an AI assistant for AutoRide, an autonomous taxi fleet management system. 
You have access to REAL-TIME fleet data from Kafka events and can help with:

- Current fleet status and metrics (use the real-time data provided)
- Active rides and their status
- Recent system events and anomalies
- Pricing and surge analysis
- Operational insights based on live data
- Troubleshooting based on current system state

IMPORTANT: Always base your responses on the REAL-TIME data provided above. 
Don't make assumptions - use the actual current numbers and events.

${realTimeContext}

Please provide a helpful, accurate response based on the REAL-TIME context of autonomous taxi fleet management. 
Keep responses concise but informative, and reference specific current data when possible.

Response:`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    res.json({
      id: Date.now().toString(),
      question,
      answer: text,
      sourceContext: {
        fleetState,
        realTimeData: true,
        lastUpdate: fleetState.lastUpdate
      },
      fallback: false,
      timestamp: Date.now()
    });

  } catch (error) {
    console.error("AI Chat error:", error);
    res.status(500).json({ 
      error: "Failed to generate AI response",
      fallback: true 
    });
  }
});

/**
 * Add this new endpoint after the existing chat endpoint
 */
app.post("/ride-request", async (req: Request, res: Response) => {
  try {
    const rideData = req.body;
    console.log("Received ride request via HTTP:", rideData);
    
    // Update fleet state with this ride request
    updateFleetState('rides.requested', JSON.stringify(rideData));
    
    // Use AI to determine optimal taxi assignment
    const aiAssignment = await aiDispatchTaxi(rideData);
    
    if (aiAssignment) {
      const assignmentPayload = {
        rideRequestId: rideData.rideId,
        taxiId: aiAssignment.recommendedTaxiId,
        eta: aiAssignment.estimatedEta,
        aiReasoning: aiAssignment.reasoning,
        confidence: aiAssignment.confidence,
        timestamp: Date.now()
      };
      
      // Publish to Kafka
      await producer.send({
        topic: RIDE_ASSIGNMENT_TOPIC,
        messages: [
          { key: rideData.rideId, value: JSON.stringify(assignmentPayload) },
        ],
      });
      
      console.log("Published AI-powered ride assignment:", assignmentPayload);
      
      res.json({
        success: true,
        assignment: assignmentPayload,
        message: "Ride request processed and taxi assigned"
      });
    } else {
      res.status(400).json({
        success: false,
        message: "No available taxis for assignment"
      });
    }
    
  } catch (error) {
    console.error("Ride request processing error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to process ride request"
    });
  }
});

/**
 * Update fleet state based on Kafka events
 */
function updateFleetState(topic: string, payload: any) {
  const event: FleetEvent = {
    topic,
    payload,
    timestamp: Date.now()
  };

  // Add to recent events
  fleetState.recentEvents.push(event);
  if (fleetState.recentEvents.length > MAX_EVENTS) {
    fleetState.recentEvents.shift();
  }

  // Update specific state based on topic
  switch (topic) {
    case 'taxi-locations':
      const taxiData = JSON.parse(payload.toString());
      fleetState.taxis[taxiData.taxiId] = {
        ...taxiData,
        lastUpdate: Date.now()
      };
      break;

    case 'rides.requested':
      const rideRequest = JSON.parse(payload.toString());
      fleetState.activeRides[rideRequest.rideId] = {
        ...rideRequest,
        status: 'REQUESTED',
        timestamp: Date.now()
      };
      break;

    case 'rides.assigned':
      const rideAssignment = JSON.parse(payload.toString());
      if (fleetState.activeRides[rideAssignment.rideId]) {
        fleetState.activeRides[rideAssignment.rideId] = {
          ...fleetState.activeRides[rideAssignment.rideId],
          ...rideAssignment,
          status: 'ASSIGNED'
        };
      }
      break;

    case 'rides.completed':
      const completedRide = JSON.parse(payload.toString());
      if (fleetState.activeRides[completedRide.rideId]) {
        delete fleetState.activeRides[completedRide.rideId];
      }
      break;

    case 'pricing.updates':
      const pricingUpdate = JSON.parse(payload.toString());
      fleetState.pricing = {
        ...fleetState.pricing,
        ...pricingUpdate
      };
      break;

    case 'alerts.anomalies':
      const anomaly = JSON.parse(payload.toString());
      fleetState.anomalies.push(anomaly);
      if (fleetState.anomalies.length > 10) {
        fleetState.anomalies.shift();
      }
      break;
  }

  fleetState.lastUpdate = Date.now();
  console.log(`Updated fleet state from ${topic}:`, Object.keys(fleetState.taxis).length, 'taxis,', Object.keys(fleetState.activeRides).length, 'active rides');
}

/**
 * AI-powered taxi dispatch logic with real-time fleet data
 */
async function aiDispatchTaxi(rideRequest: any) {
  try {
    const prompt = `
You are an AI dispatcher for AutoRide autonomous taxi fleet. Analyze this ride request and CURRENT fleet data to determine the optimal taxi assignment.

Ride Request:
- Pickup: ${JSON.stringify(rideRequest.pickup)}
- Dropoff: ${JSON.stringify(rideRequest.dropoff)}
- User ID: ${rideRequest.userId}
- Timestamp: ${rideRequest.timestamp}

CURRENT FLEET STATUS:
${JSON.stringify(fleetState, null, 2)}

Based on this REAL-TIME data, provide a JSON response with:
1. recommendedTaxiId: The best taxi to assign (must exist in current fleet)
2. reasoning: Why this taxi is optimal based on current status
3. estimatedEta: Estimated time of arrival in minutes
4. confidence: Confidence level (0-1)

Consider factors like:
- Current taxi locations and status
- Distance from pickup
- Active rides and workload distribution
- Recent events and anomalies
- Fleet efficiency metrics

Response (JSON only):`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    
    // Extract JSON from response
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
    
    throw new Error("Failed to parse AI response");
    
  } catch (error) {
    console.error("AI Dispatch error:", error);
    // Fallback to simple logic using real fleet data
    const availableTaxis = Object.values(fleetState.taxis).filter((t: any) => t.status === 'IDLE');
    if (availableTaxis.length > 0) {
      const randomTaxi = availableTaxis[Math.floor(Math.random() * availableTaxis.length)];
      return {
        recommendedTaxiId: randomTaxi.taxiId,
        reasoning: "Fallback assignment using current fleet data",
        estimatedEta: Math.floor(Math.random() * 10) + 2,
        confidence: 0.5
      };
    }
    return null;
  }
}

// Move these to global scope (outside of main function)
let producer: any;

/**
 * The main function for the Dispatcher AI service.
 */
async function main() {
  console.log("Starting Dispatcher AI service with Kafka event integration...");

  // Start Express server
  app.listen(PORT, () => {
    console.log(`AI Chat service listening on port ${PORT}`);
  });

  // Initialize the Kafka client
  const kafka = new Kafka({
    clientId: "dispatcher-ai",
    brokers: process.env.KAFKA_BROKERS?.split(",") || ["localhost:9092"],
  });

  const consumer = kafka.consumer({ groupId: "dispatcher-ai-group" });
  producer = kafka.producer(); // Assign to global variable

  await Promise.all([consumer.connect(), producer.connect()]);
  console.log("Kafka consumer and producer connected.");

  // Subscribe to ALL relevant topics for comprehensive fleet monitoring
  const topics = [
    TAXI_LOCATIONS_TOPIC,
    RIDES_REQUESTED_TOPIC,
    RIDES_ASSIGNED_TOPIC,
    RIDES_COMPLETED_TOPIC,
    PRICING_UPDATES_TOPIC,
    ALERTS_ANOMALIES_TOPIC
  ];

  for (const topic of topics) {
    await consumer.subscribe({ topic, fromBeginning: false });
    console.log(`Subscribed to topic: ${topic}`);
  }

  await consumer.run({
    eachMessage: async ({ topic, message }: EachMessagePayload) => {
      if (!message.value) return;

      // Update fleet state with this event
      updateFleetState(topic, message.value);

      // Handle ride requests specifically
      if (topic === RIDES_REQUESTED_TOPIC) {
        const rideRequest = JSON.parse(message.value.toString());
        console.log("Received ride request:", rideRequest);

        // Use AI to determine optimal taxi assignment with real-time data
        const aiAssignment = await aiDispatchTaxi(rideRequest);
        if (aiAssignment) {
          console.log("AI Assignment:", aiAssignment);

          const assignmentPayload = {
            rideRequestId: rideRequest.rideId,
            taxiId: aiAssignment.recommendedTaxiId,
            eta: aiAssignment.estimatedEta,
            aiReasoning: aiAssignment.reasoning,
            confidence: aiAssignment.confidence,
            timestamp: Date.now()
          };

          // Produce the ride assignment event
          await producer.send({
            topic: RIDE_ASSIGNMENT_TOPIC,
            messages: [
              { key: rideRequest.rideId, value: JSON.stringify(assignmentPayload) },
            ],
          });

          console.log("Published AI-powered ride assignment:", assignmentPayload);
        }
      }
    },
  });

  process.on("SIGINT", async () => {
    console.log("Disconnecting Kafka consumer and producer...");
    await Promise.all([consumer.disconnect(), producer.disconnect()]);
    process.exit(0);
  });
}

main().catch(console.error);
