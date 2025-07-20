-- AutoRide EDA Database Schema

-- Rides table
CREATE TABLE IF NOT EXISTS rides (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id VARCHAR(255) NOT NULL,
    taxi_id VARCHAR(255),
    pickup_location JSONB NOT NULL,
    dropoff_location JSONB NOT NULL,
    price DECIMAL(10,2),
    surge_multiplier DECIMAL(3,2) DEFAULT 1.0,
    status VARCHAR(50) DEFAULT 'REQUESTED',
    eta_seconds INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP
);

-- Taxis table
CREATE TABLE IF NOT EXISTS taxis (
    id VARCHAR(255) PRIMARY KEY,
    current_location JSONB NOT NULL,
    status VARCHAR(50) DEFAULT 'IDLE',
    speed_kph DECIMAL(5,2) DEFAULT 0,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Events table for audit and replay
CREATE TABLE IF NOT EXISTS events (
    event_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_type VARCHAR(100) NOT NULL,
    topic VARCHAR(100) NOT NULL,
    payload JSONB NOT NULL,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    processed BOOLEAN DEFAULT FALSE
);

-- Pricing zones table
CREATE TABLE IF NOT EXISTS pricing_zones (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    zone_name VARCHAR(255) NOT NULL,
    bounds JSONB NOT NULL,
    base_multiplier DECIMAL(3,2) DEFAULT 1.0,
    current_multiplier DECIMAL(3,2) DEFAULT 1.0,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Anomalies table
CREATE TABLE IF NOT EXISTS anomalies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    anomaly_type VARCHAR(100) NOT NULL,
    description TEXT,
    severity VARCHAR(20) DEFAULT 'LOW',
    data JSONB,
    resolved BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_rides_status ON rides(status);
CREATE INDEX IF NOT EXISTS idx_rides_created_at ON rides(created_at);
CREATE INDEX IF NOT EXISTS idx_taxis_status ON taxis(status);
CREATE INDEX IF NOT EXISTS idx_events_timestamp ON events(timestamp);
CREATE INDEX IF NOT EXISTS idx_events_type ON events(event_type);

-- Insert sample taxi data
INSERT INTO taxis (id, current_location, status) VALUES
('taxi-001', '{"lat": 40.7589, "lng": -73.9851}', 'IDLE'),
('taxi-002', '{"lat": 40.7614, "lng": -73.9776}', 'IDLE'),
('taxi-003', '{"lat": 40.7505, "lng": -73.9934}', 'IDLE')
ON CONFLICT (id) DO NOTHING;

-- Insert sample pricing zones
INSERT INTO pricing_zones (zone_name, bounds, base_multiplier) VALUES
('Manhattan Central', '{"north": 40.7831, "south": 40.7489, "east": -73.9441, "west": -74.0059}', 1.2),
('Times Square', '{"north": 40.7614, "south": 40.7505, "east": -73.9776, "west": -73.9934}', 1.5)
ON CONFLICT DO NOTHING;
