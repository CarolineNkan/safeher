-- Onboarding Enhancements Migration
-- Adds AI consent, formatted address, and risk profile fields for AI Championship requirements

-- Add new columns to profiles table
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS ai_location_consent BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS formatted_address TEXT,
ADD COLUMN IF NOT EXISTS user_risk_profile INTEGER CHECK (user_risk_profile >= 0 AND user_risk_profile <= 10);

-- Add indexes for new fields
CREATE INDEX IF NOT EXISTS idx_profiles_ai_consent ON profiles(ai_location_consent);
CREATE INDEX IF NOT EXISTS idx_profiles_risk_profile ON profiles(user_risk_profile);

-- Add comments for documentation
COMMENT ON COLUMN profiles.ai_location_consent IS 'User consent for AI-powered location analysis and crime trend insights';
COMMENT ON COLUMN profiles.formatted_address IS 'Formatted address string from geocoding service';
COMMENT ON COLUMN profiles.user_risk_profile IS 'User comfort level walking alone at night (0=very uncomfortable, 10=very comfortable)';

-- Verification
SELECT 'Onboarding enhancements migration completed successfully!' as status;