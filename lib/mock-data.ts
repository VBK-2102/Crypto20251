// Mock data for testing without database
export const mockUsers = [
  {
    id: 1,
    email: "admin@cryptopay.com",
    password: "admin123",
    fullName: "Admin User",
    // Multi-currency wallet balances
    walletBalances: {
      INR: 15000,
      USD: 200,
      EUR: 150,
      GBP: 100,
      BTC: 0.05,
      ETH: 1.2,
      USDT: 500,
    },
    isAdmin: true,
  },
  {
    id: 2,
    email: "user@example.com",
    password: "user123",
    fullName: "John Doe",
    walletBalances: {
      INR: 8500,
      USD: 100,
      EUR: 75,
      GBP: 50,
      BTC: 0.00285,
      ETH: 0.5,
      USDT: 200,
    },
    isAdmin: false,
  },
]

export const mockCryptoPrices = [
  {
    symbol: "BTC",
    name: "Bitcoin",
    price_inr: 3500000,
    price_usd: 42000,
    change_24h: 2.5,
    icon: "₿",
  },
  {
    symbol: "ETH",
    name: "Ethereum",
    price_inr: 280000,
    price_usd: 3200,
    change_24h: -1.2,
    icon: "Ξ",
  },
  {
    symbol: "USDT",
    name: "Tether",
    price_inr: 83.5,
    price_usd: 1.0,
    change_24h: 0.1,
    icon: "₮",
  },
]

export const currencies = [
  { code: "INR", symbol: "₹", name: "Indian Rupee", type: "fiat" },
  { code: "USD", symbol: "$", name: "US Dollar", type: "fiat" },
  { code: "EUR", symbol: "€", name: "Euro", type: "fiat" },
  { code: "GBP", symbol: "£", name: "British Pound", type: "fiat" },
  { code: "BTC", symbol: "₿", name: "Bitcoin", type: "crypto" },
  { code: "ETH", symbol: "Ξ", name: "Ethereum", type: "crypto" },
  { code: "USDT", symbol: "₮", name: "Tether", type: "crypto" },
]

// Mock transactions data
export const mockTransactions: any[] = [
  {
    id: 1,
    user_id: "689d92f87490ba3005de3d43", // For user@example.com - using MongoDB ObjectId format
    type: "deposit",
    amount: 5000,
    currency: "INR",
    status: "completed",
    payment_method: "UPI",
    upi_reference: "UPI123456789",
    created_at: "2023-06-15T10:30:00Z"
  },
  {
    id: 2,
    user_id: "689d92f87490ba3005de3d43", // For user@example.com
    type: "crypto_buy",
    amount: 1000,
    currency: "INR",
    crypto_amount: 0.00285,
    crypto_currency: "BTC",
    status: "completed",
    transaction_hash: "0x123abc456def789ghi",
    created_at: "2023-06-16T14:20:00Z"
  },
  {
    id: 3,
    user_id: "689d92f87490ba3005de3d43", // For user@example.com
    type: "withdrawal",
    amount: 500,
    currency: "INR",
    status: "pending",
    payment_method: "Bank Transfer",
    created_at: "2023-06-18T09:15:00Z"
  },
  {
    id: 4,
    user_id: "admin123", // For admin user
    type: "deposit",
    amount: 10000,
    currency: "INR",
    status: "completed",
    payment_method: "Credit Card",
    created_at: "2023-06-10T11:45:00Z"
  }
]

// Helper function to update user balance
export function updateUserBalance(userId: number, currency: string, amount: number) {
  const user = mockUsers.find((u) => u.id === userId)
  if (user) {
    user.walletBalances[currency] = (user.walletBalances[currency] || 0) + amount
    return user.walletBalances
  }
  return null
}

// Helper function to get user balances
export function getUserBalances(userId: number) {
  const user = mockUsers.find((u) => u.id === userId)
  return user ? user.walletBalances : {}
}
