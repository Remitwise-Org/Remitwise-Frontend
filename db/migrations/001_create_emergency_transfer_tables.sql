-- Emergency Transfer Tables Migration

-- Create emergency_transfer_events table
CREATE TABLE IF NOT EXISTS emergency_transfer_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id VARCHAR(255) NOT NULL,
  recipient_address VARCHAR(56) NOT NULL,
  amount VARCHAR(255) NOT NULL,
  asset_code VARCHAR(12) NOT NULL,
  asset_issuer VARCHAR(56),
  transaction_id VARCHAR(255) UNIQUE NOT NULL,
  stellar_tx_hash VARCHAR(64),
  memo TEXT,
  fee VARCHAR(255) NOT NULL,
  emergency_fee_applied BOOLEAN NOT NULL DEFAULT true,
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  metadata JSONB
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_emergency_transfer_user_id ON emergency_transfer_events(user_id);
CREATE INDEX IF NOT EXISTS idx_emergency_transfer_created_at ON emergency_transfer_events(created_at);
CREATE INDEX IF NOT EXISTS idx_emergency_transfer_status ON emergency_transfer_events(status);
CREATE INDEX IF NOT EXISTS idx_emergency_transfer_transaction_id ON emergency_transfer_events(transaction_id);

-- Create emergency_transfer_config table
CREATE TABLE IF NOT EXISTS emergency_transfer_config (
  id SERIAL PRIMARY KEY,
  enabled BOOLEAN NOT NULL DEFAULT true,
  max_amount_per_transfer VARCHAR(255) NOT NULL,
  max_daily_amount VARCHAR(255) NOT NULL,
  max_monthly_count INTEGER NOT NULL,
  emergency_fee_percentage DECIMAL(5,2) NOT NULL,
  standard_fee_percentage DECIMAL(5,2) NOT NULL,
  memo_prefix VARCHAR(50) NOT NULL DEFAULT 'EMERGENCY:',
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Insert default configuration
INSERT INTO emergency_transfer_config (
  enabled,
  max_amount_per_transfer,
  max_daily_amount,
  max_monthly_count,
  emergency_fee_percentage,
  standard_fee_percentage,
  memo_prefix
) VALUES (
  true,
  '10000000000',  -- 1000 XLM in stroops
  '50000000000',  -- 5000 XLM in stroops
  10,
  0.5,
  1.0,
  'EMERGENCY:'
) ON CONFLICT DO NOTHING;
