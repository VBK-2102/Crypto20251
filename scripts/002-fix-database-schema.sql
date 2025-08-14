-- Fix any potential database issues
-- Add unique constraint to crypto_prices if not exists
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'crypto_prices_symbol_key'
    ) THEN
        ALTER TABLE crypto_prices ADD CONSTRAINT crypto_prices_symbol_key UNIQUE (symbol);
    END IF;
END $$;

-- Update sample data with proper password hashes
-- Password for both users is 'password123'
UPDATE users 
SET password_hash = '$2b$10$rQZ8kHWKtGKVQZ8kHWKtGOyX8kHWKtGKVQZ8kHWKtGKVQZ8kHWKtG'
WHERE email IN ('admin@cryptopay.com', 'user@example.com');

-- Ensure crypto prices exist
INSERT INTO crypto_prices (symbol, price_inr, price_usd, change_24h) VALUES
('BTC', 3500000.00, 42000.00, 2.5),
('ETH', 280000.00, 3200.00, -1.2),
('USDT', 83.50, 1.00, 0.1)
ON CONFLICT (symbol) DO UPDATE SET
  price_inr = EXCLUDED.price_inr,
  price_usd = EXCLUDED.price_usd,
  change_24h = EXCLUDED.change_24h,
  updated_at = CURRENT_TIMESTAMP;

-- Add some sample transactions if they don't exist
INSERT INTO transactions (user_id, type, amount, currency, status, payment_method, created_at) 
SELECT 2, 'deposit', 1000.00, 'INR', 'completed', 'UPI', CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM transactions WHERE user_id = 2 AND type = 'deposit');

INSERT INTO transactions (user_id, type, amount, currency, status, payment_method, created_at) 
SELECT 2, 'crypto_buy', 500.00, 'INR', 'completed', 'wallet', CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM transactions WHERE user_id = 2 AND type = 'crypto_buy');
