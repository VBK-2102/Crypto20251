// Mock data for testing without database
export const mockUsers = [
  {
    id: 1,
    email: "admin@cryptopay.com",
    password: "admin123",
    fullName: "Admin User",
    // Multi-currency wallet balances - Reset to empty
    walletBalances: {
      INR: 0,
      USD: 0,
      EUR: 0,
      GBP: 0,
      BTC: 0,
      ETH: 0,
      USDT: 0,
    },
    isAdmin: true,
  },
  {
    id: 2,
    email: "user@example.com",
    password: "user123",
    fullName: "John Doe",
    walletBalances: {
      INR: 0,
      USD: 0,
      EUR: 0,
      GBP: 0,
      BTC: 0,
      ETH: 0,
      USDT: 0,
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

// Reset transactions to empty array
export const mockTransactions: any[] = []

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
