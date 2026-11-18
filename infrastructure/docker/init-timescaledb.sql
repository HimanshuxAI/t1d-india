-- TimescaleDB Initialization Script
-- Runs on first database creation

-- Enable TimescaleDB extension
CREATE EXTENSION IF NOT EXISTS timescaledb;

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Enable pgcrypto for hashing
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Create application user (if not using default)
-- CREATE USER t1d_app WITH PASSWORD 'secure_password';
-- GRANT ALL PRIVILEGES ON DATABASE t1d TO t1d_app;

-- Set timezone
SET TIMEZONE = 'Asia/Kolkata';

-- Create hypertable for CGM readings (will be created by Prisma migrate)
-- This is a reference for manual creation if needed
/*
CREATE TABLE cgm_readings (
    time        TIMESTAMPTZ       NOT NULL,
    user_id     UUID              NOT NULL,
    glucose_mg_dL SMALLINT        NOT NULL,
    trend       SMALLINT,
    trend_arrow TEXT,
    is_valid    BOOLEAN           DEFAULT TRUE,
    noise_level TEXT,
    signal_loss BOOLEAN           DEFAULT FALSE,
    source      TEXT,
    device_timestamp TIMESTAMPTZ,
    client_id   TEXT,
    created_at  TIMESTAMPTZ       DEFAULT NOW()
);

SELECT create_hypertable('cgm_readings', 'time',
    chunk_time_interval => INTERVAL '1 day',
    if_not_exists => TRUE
);

-- Compression policy
ALTER TABLE cgm_readings SET (
    timescaledb.compress,
    timescaledb.compress_segmentby = 'user_id'
);

SELECT add_compression_policy('cgm_readings', INTERVAL '7 days');

-- Continuous aggregate for hourly stats
CREATE MATERIALIZED VIEW cgm_hourly_stats
WITH (timescaledb.continuous) AS
SELECT
    user_id,
    time_bucket('1 hour', time) AS hour_bucket,
    COUNT(*) AS reading_count,
    AVG(glucose_mg_dl)::SMALLINT AS avg_glucose,
    MIN(glucose_mg_dl) AS min_glucose,
    MAX(glucose_mg_dl) AS max_glucose,
    PERCENTILE_CONT(0.25) WITHIN GROUP (ORDER BY glucose_mg_dl) AS p25,
    PERCENTILE_CONT(0.50) WITHIN GROUP (ORDER BY glucose_mg_dl) AS median,
    PERCENTILE_CONT(0.75) WITHIN GROUP (ORDER BY glucose_mg_dl) AS p75,
    SUM(CASE WHEN glucose_mg_dl < 54 THEN 1 ELSE 0 END) AS very_low_count,
    SUM(CASE WHEN glucose_mg_dl < 70 THEN 1 ELSE 0 END) AS low_count,
    SUM(CASE WHEN glucose_mg_dl BETWEEN 70 AND 180 THEN 1 ELSE 0 END) AS in_range_count,
    SUM(CASE WHEN glucose_mg_dl > 180 THEN 1 ELSE 0 END) AS high_count,
    SUM(CASE WHEN glucose_mg_dl > 250 THEN 1 ELSE 0 END) AS very_high_count
FROM cgm_readings
WHERE is_valid = TRUE
GROUP BY user_id, hour_bucket;

SELECT add_continuous_aggregate_policy('cgm_hourly_stats',
    start_offset => INTERVAL '2 hours',
    end_offset => INTERVAL '1 hour',
    schedule_interval => INTERVAL '1 hour'
);
*/

-- Indexes for performance
-- These will be created by Prisma migrations

-- Grant permissions
-- GRANT ALL ON ALL TABLES IN SCHEMA public TO t1d_app;
-- GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO t1d_app;
-- ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO t1d_app;