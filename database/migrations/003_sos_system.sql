-- SOS System Database Migration
-- Creates tables for emergency SOS functionality and trusted contacts

-- Create sos_events table
CREATE TABLE IF NOT EXISTS sos_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    ended_at TIMESTAMP WITH TIME ZONE,
    initial_lat DOUBLE PRECISION NOT NULL,
    initial_lng DOUBLE PRECISION NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create sos_locations table for tracking location updates
CREATE TABLE IF NOT EXISTS sos_locations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sos_id UUID NOT NULL REFERENCES sos_events(id) ON DELETE CASCADE,
    lat DOUBLE PRECISION NOT NULL,
    lng DOUBLE PRECISION NOT NULL,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create emergency_contacts table
CREATE TABLE IF NOT EXISTS emergency_contacts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    name TEXT NOT NULL,
    phone TEXT NOT NULL,
    relationship TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_sos_events_user_id ON sos_events(user_id);
CREATE INDEX IF NOT EXISTS idx_sos_events_is_active ON sos_events(is_active);
CREATE INDEX IF NOT EXISTS idx_sos_events_started_at ON sos_events(started_at);
CREATE INDEX IF NOT EXISTS idx_sos_locations_sos_id ON sos_locations(sos_id);
CREATE INDEX IF NOT EXISTS idx_sos_locations_timestamp ON sos_locations(timestamp);
CREATE INDEX IF NOT EXISTS idx_emergency_contacts_user_id ON emergency_contacts(user_id);

-- Enable Row Level Security (RLS)
ALTER TABLE sos_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE sos_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE emergency_contacts ENABLE ROW LEVEL SECURITY;

-- RLS Policies for sos_events
CREATE POLICY "Users can read own SOS events" ON sos_events
    FOR SELECT USING (auth.uid()::text = user_id::text);

CREATE POLICY "Users can insert own SOS events" ON sos_events
    FOR INSERT WITH CHECK (auth.uid()::text = user_id::text);

CREATE POLICY "Users can update own SOS events" ON sos_events
    FOR UPDATE USING (auth.uid()::text = user_id::text);

-- RLS Policies for sos_locations
CREATE POLICY "Users can read own SOS locations" ON sos_locations
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM sos_events 
            WHERE sos_events.id = sos_locations.sos_id 
            AND sos_events.user_id::text = auth.uid()::text
        )
    );

CREATE POLICY "Users can insert own SOS locations" ON sos_locations
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM sos_events 
            WHERE sos_events.id = sos_locations.sos_id 
            AND sos_events.user_id::text = auth.uid()::text
        )
    );

-- RLS Policies for emergency_contacts
CREATE POLICY "Users can read own emergency contacts" ON emergency_contacts
    FOR SELECT USING (auth.uid()::text = user_id::text);

CREATE POLICY "Users can insert own emergency contacts" ON emergency_contacts
    FOR INSERT WITH CHECK (auth.uid()::text = user_id::text);

CREATE POLICY "Users can update own emergency contacts" ON emergency_contacts
    FOR UPDATE USING (auth.uid()::text = user_id::text);

CREATE POLICY "Users can delete own emergency contacts" ON emergency_contacts
    FOR DELETE USING (auth.uid()::text = user_id::text);

-- Grant necessary permissions
GRANT SELECT, INSERT, UPDATE ON sos_events TO authenticated;
GRANT SELECT, INSERT ON sos_locations TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON emergency_contacts TO authenticated;

-- Create function to automatically update updated_at timestamp for emergency_contacts
CREATE OR REPLACE FUNCTION update_emergency_contacts_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for emergency_contacts
CREATE TRIGGER update_emergency_contacts_updated_at 
    BEFORE UPDATE ON emergency_contacts 
    FOR EACH ROW 
    EXECUTE FUNCTION update_emergency_contacts_updated_at();

-- Verification
SELECT 'SOS system tables created successfully!' as status;