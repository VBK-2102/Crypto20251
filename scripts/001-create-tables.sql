-- Create users table
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    phone VARCHAR(20),
    wallet_balance DECIMAL(15, 2) DEFAULT 0.00,
    is_admin BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create transactions table
CREATE TABLE IF NOT EXISTS transactions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    type VARCHAR(20) NOT NULL, -- 'deposit', 'withdrawal', 'crypto_buy', 'crypto_sell'
    amount DECIMAL(15, 2) NOT NULL,
    currency VARCHAR(10) NOT NULL, -- 'INR', 'BTC', 'ETH', 'USDT'
    crypto_amount DECIMAL(20, 8),
    crypto_currency VARCHAR(10),
    status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'completed', 'failed'
    payment_method VARCHAR(50),
    transaction_hash VARCHAR(255),
    receiver_address VARCHAR(255),
    upi_reference VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create crypto_prices table for caching
CREATE TABLE IF NOT EXISTS crypto_prices (
    id SERIAL PRIMARY KEY,
    symbol VARCHAR(10) NOT NULL,
    price_inr DECIMAL(15, 2) NOT NULL,
    price_usd DECIMAL(15, 2) NOT NULL,
    change_24h DECIMAL(5, 2),
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert sample admin user (password: admin123)
INSERT INTO users (email, password_hash, full_name, is_admin, wallet_balance) 
VALUES ('admin@cryptopay.com', '$2b$10$rQZ8kHWKtGKVQZ8kHWKtGOyX8kHWKtGKVQZ8kHWKtGKVQZ8kHWKtG', 'Admin User', TRUE, 10000.00)
ON CONFLICT (email) DO NOTHING;

-- Insert sample regular user (password: user123)
INSERT INTO users (email, password_hash, full_name, wallet_balance) 
VALUES ('user@example.com', '$2b$10$rQZ8kHWKtGKVQZ8kHWKtGOyX8kHWKtGKVQZ8kHWKtGKVQZ8kHWKtG', 'John Doe', 5000.00)
ON CONFLICT (email) DO NOTHING;

-- Insert sample crypto prices
INSERT INTO crypto_prices (symbol, price_inr, price_usd, change_24h) VALUES
('BTC', 3500000.00, 42000.00, 2.5),
('ETH', 280000.00, 3200.00, -1.2),
('USDT', 83.50, 1.00, 0.1)
ON CONFLICT DO NOTHING;

-- Insert sample transactions
INSERT INTO transactions (user_id, type, amount, currency, status, payment_method) VALUES
(2, 'deposit', 1000.00, 'INR', 'completed', 'UPI'),
(2, 'crypto_buy', 500.00, 'INR', 'completed', 'wallet'),
(2, 'withdrawal', 200.00, 'INR', 'pending', 'bank_transfer');
