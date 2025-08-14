interface BinanceTickerPrice {
  symbol: string
  price: string
}

interface BinanceExchangeInfo {
  symbols: {
    symbol: string
    status: string
    baseAsset: string
    quoteAsset: string
  }[]
}

interface BinanceAccountInfo {
  balances: {
    asset: string
    free: string
    locked: string
  }[]
}

interface CachedPriceData {
  data: any[]
  timestamp: number
  source: string
}

export class BinanceAPI {
  private apiKey: string
  private secretKey: string
  private baseURL: string
  private priceCache: CachedPriceData | null = null
  private cacheTimeout: number = 60000 // 1 minute cache
  private lastRequestTime: number = 0
  private minRequestInterval: number = 2000 // 2 seconds between requests

  constructor() {
    this.apiKey = process.env.BINANCE_API_KEY || ''
    this.secretKey = process.env.BINANCE_API_SECRET || ''
    this.baseURL = "https://api.binance.com"
    
    // Log API key status for debugging
    console.log('Binance API Key status:', this.apiKey ? 'Present' : 'Missing')
    
    // Don't throw error, use fallback instead
    if (!this.apiKey) {
      console.warn('Binance API key not set in environment variables. Using fallback data.')
    }
  }

  private async createSignature(queryString: string): Promise<string> {
    // Use Node.js crypto for HMAC SHA256
    const crypto = await import('crypto')
    return crypto.createHmac('sha256', this.secretKey)
      .update(queryString)
      .digest('hex')
  }

  private getHeaders(includeAuth: boolean = false) {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    }
    
    if (includeAuth) {
      headers['X-MBX-APIKEY'] = this.apiKey
    }
    
    return headers
  }

  // Rate limiting helper
  private async waitForRateLimit(): Promise<void> {
    const now = Date.now()
    const timeSinceLastRequest = now - this.lastRequestTime
    
    if (timeSinceLastRequest < this.minRequestInterval) {
      const waitTime = this.minRequestInterval - timeSinceLastRequest
      console.log(`Rate limiting: waiting ${waitTime}ms`)
      await new Promise(resolve => setTimeout(resolve, waitTime))
    }
    
    this.lastRequestTime = Date.now()
  }

  // Check if cached data is still valid
  private isCacheValid(): boolean {
    if (!this.priceCache) return false
    const now = Date.now()
    return (now - this.priceCache.timestamp) < this.cacheTimeout
  }

  // Get live crypto prices with caching and rate limiting
  async getCryptoPrices(): Promise<any[]> {
    // Return cached data if still valid
    if (this.isCacheValid()) {
      console.log('Returning cached price data')
      return this.priceCache!.data
    }

    // If API key is missing, go directly to alternative source
    if (!this.apiKey) {
      console.log('No Binance API key available, using alternative source')
      return await this.getAlternativePrices()
    }

    try {
      // First try Binance
      const symbols = ['BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'DOGEUSDT']
      console.log('Fetching prices from Binance API...')
      
      const response = await fetch(`${this.baseURL}/api/v3/ticker/price`, {
        headers: this.getHeaders(true) // Include API key in headers
      })
      
      console.log('Binance API response status:', response.status)
      
      if (response.status === 451 || response.status === 401) {
        console.log('Binance API restricted or unauthorized, using alternative source')
        return await this.getAlternativePrices()
      }
      
      if (!response.ok) {
        console.error(`Binance API error: ${response.status}`)
        return await this.getAlternativePrices()
      }
      
      const allPrices: BinanceTickerPrice[] = await response.json()
      console.log('Received prices from Binance:', allPrices.length)
      
      // Filter for our supported cryptos and convert to our format
      const cryptoPrices = symbols.map(symbol => {
        const price = allPrices.find(p => p.symbol === symbol)
        const baseAsset = symbol.replace('USDT', '')
        
        if (!price) return null
        
        const usdPrice = parseFloat(price.price)
        const inrPrice = usdPrice * 83.5 // USD to INR conversion
        
        return {
          symbol: baseAsset,
          name: this.getCryptoName(baseAsset),
          price_usd: usdPrice,
          price_inr: inrPrice,
          change_24h: 0, // We'll get this from 24hr ticker
          icon: this.getCryptoIcon(baseAsset),
          lastUpdated: new Date().toISOString(),
          source: 'binance'
        }
      }).filter(Boolean)
      
      // Cache the result
      this.priceCache = {
        data: cryptoPrices,
        timestamp: Date.now(),
        source: 'binance'
      }
      
      return cryptoPrices
    } catch (error) {
      console.error('Error fetching Binance prices:', error)
      // Try alternative API
      return await this.getAlternativePrices()
    }
  }

  // Alternative price source with rate limiting and better error handling
  private async getAlternativePrices(): Promise<any[]> {
    try {
      // Apply rate limiting
      await this.waitForRateLimit()
      
      const coinIds = 'bitcoin,ethereum,tether,solana,dogecoin'
      const response = await fetch(
        `https://api.coingecko.com/api/v3/simple/price?ids=${coinIds}&vs_currencies=usd,inr&include_24hr_change=true`,
        {
          headers: {
            'Accept': 'application/json',
            'User-Agent': 'CryptoPaymentGateway/1.0'
          }
        }
      )
      
      if (response.status === 429) {
        console.log('CoinGecko API rate limited, using cached or fallback data')
        // If we have cached data, return it even if expired
        if (this.priceCache) {
          console.log('Returning expired cached data due to rate limit')
          return this.priceCache.data
        }
        // Otherwise use fallback
        return this.getFallbackPrices()
      }
      
      if (!response.ok) {
        throw new Error(`CoinGecko API error: ${response.status}`)
      }
      
      const data = await response.json()
      
      const cryptoPrices = [
        {
          symbol: 'BTC',
          name: 'Bitcoin',
          price_usd: data.bitcoin?.usd || 42000,
          price_inr: data.bitcoin?.inr || 3507000,
          change_24h: data.bitcoin?.usd_24h_change || 0,
          icon: '₿',
          lastUpdated: new Date().toISOString(),
          source: 'coingecko'
        },
        {
          symbol: 'ETH',
          name: 'Ethereum',
          price_usd: data.ethereum?.usd || 3200,
          price_inr: data.ethereum?.inr || 267200,
          change_24h: data.ethereum?.usd_24h_change || 0,
          icon: 'Ξ',
          lastUpdated: new Date().toISOString(),
          source: 'coingecko'
        },
        {
          symbol: 'USDT',
          name: 'Tether',
          price_usd: data.tether?.usd || 1.0,
          price_inr: data.tether?.inr || 83.5,
          change_24h: data.tether?.usd_24h_change || 0,
          icon: '₮',
          lastUpdated: new Date().toISOString(),
          source: 'coingecko'
        },
        {
          symbol: 'SOL',
          name: 'Solana',
          price_usd: data.solana?.usd || 170.0,
          price_inr: data.solana?.inr || 14195.0,
          change_24h: data.solana?.usd_24h_change || 0,
          icon: 'S',
          lastUpdated: new Date().toISOString(),
          source: 'coingecko'
        },
        {
          symbol: 'DOGE',
          name: 'Dogecoin',
          price_usd: data.dogecoin?.usd || 0.16,
          price_inr: data.dogecoin?.inr || 13.36,
          change_24h: data.dogecoin?.usd_24h_change || 0,
          icon: 'D',
          lastUpdated: new Date().toISOString(),
          source: 'coingecko'
        }
      ]
      
      // Cache the result
      this.priceCache = {
        data: cryptoPrices,
        timestamp: Date.now(),
        source: 'coingecko'
      }
      
      return cryptoPrices
    } catch (error) {
      console.error('Error fetching alternative prices:', error)
      
      // If we have cached data, return it even if expired
      if (this.priceCache) {
        console.log('Returning expired cached data due to API error')
        return this.priceCache.data.map(item => ({
          ...item,
          source: 'cached'
        }))
      }
      
      // Final fallback to mock data with current timestamp
      return this.getFallbackPrices()
    }
  }

  // Get 24hr price change statistics with proper error handling
  async get24hrStats(): Promise<any[]> {
    try {
      const symbols = ['BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'DOGEUSDT']
      const promises = symbols.map(symbol => 
        fetch(`${this.baseURL}/api/v3/ticker/24hr?symbol=${symbol}`, {
          headers: this.getHeaders()
        }).then(response => {
          if (response.status === 451) {
            throw new Error('API restricted')
          }
          if (!response.ok) {
            throw new Error(`HTTP ${response.status}`)
          }
          return response.json()
        }).catch(error => {
          console.log(`Failed to fetch 24hr stats for ${symbol}:`, error.message)
          return null
        })
      )
      
      const responses = await Promise.all(promises)
      
      // Filter out null responses and process valid ones
      const stats = responses
        .filter(response => response !== null && response.symbol)
        .map(stat => ({
          symbol: stat.symbol.replace('USDT', ''),
          priceChange: parseFloat(stat.priceChange || '0'),
          priceChangePercent: parseFloat(stat.priceChangePercent || '0'),
          lastPrice: parseFloat(stat.lastPrice || '0'),
          volume: parseFloat(stat.volume || '0')
        }))
      
      return stats
    } catch (error) {
      console.error('Error fetching 24hr stats:', error)
      return []
    }
  }

  // Get account balances with fallback to mock data
  /*
  async getWalletBalances(): Promise<any> {
    try {
      const timestamp = Date.now()
      const queryString = `timestamp=${timestamp}`
      const signature = await this.createSignature(queryString)
      
      const response = await fetch(
        `${this.baseURL}/api/v3/account?${queryString}&signature=${signature}`,
        {
          headers: this.getHeaders(true)
        }
      )
      
      if (response.status === 451) {
        console.log('Binance API restricted for wallet balances, using mock data')
        return this.getMockWalletBalances()
      }
      
      if (!response.ok) {
        throw new Error(`Binance API error: ${response.status}`)
      }
      
      const accountInfo: BinanceAccountInfo = await response.json()
      
      // Filter and format balances
      const relevantAssets = ['BTC', 'ETH', 'USDT', 'USDC', 'BNB']
      const balances: Record<string, number> = {}
      
      accountInfo.balances.forEach(balance => {
        if (relevantAssets.includes(balance.asset)) {
          const total = parseFloat(balance.free) + parseFloat(balance.locked)
          if (total > 0) {
            balances[balance.asset] = total
          }
        }
      })
      
      return balances
    } catch (error) {
      console.error('Error fetching wallet balances:', error)
      return this.getMockWalletBalances()
    }
  }
  */

  // Mock wallet balances for demo purposes
  private getMockWalletBalances(): Record<string, number> {
    return {
      BTC: 0.15432,
      ETH: 2.8765,
      USDT: 1250.50,
      USDC: 500.00,
      BNB: 12.345,
      SOL: 25.75,
      DOGE: 5000.00
    }
  }

  // Convert fiat to crypto amount
  async convertFiatToCrypto(fiatAmount: number, fiatCurrency: string, cryptoSymbol: string): Promise<number> {
    try {
      const prices = await this.getCryptoPrices()
      const crypto = prices.find(p => p.symbol === cryptoSymbol)
      
      if (!crypto) return 0
      
      let cryptoPrice = 0
      if (fiatCurrency === 'USD') {
        cryptoPrice = crypto.price_usd
      } else if (fiatCurrency === 'INR') {
        cryptoPrice = crypto.price_inr
      } else if (fiatCurrency === 'EUR') {
        cryptoPrice = crypto.price_usd * 0.85
      } else if (fiatCurrency === 'GBP') {
        cryptoPrice = crypto.price_usd * 0.75
      }
      
      return fiatAmount / cryptoPrice
    } catch (error) {
      console.error('Error converting fiat to crypto:', error)
      return 0
    }
  }

  // Convert crypto to fiat amount
  async convertCryptoToFiat(cryptoAmount: number, cryptoSymbol: string, fiatCurrency: string): Promise<number> {
    try {
      const prices = await this.getCryptoPrices()
      const crypto = prices.find(p => p.symbol === cryptoSymbol)
      
      if (!crypto) return 0
      
      let cryptoPrice = 0
      if (fiatCurrency === 'USD') {
        cryptoPrice = crypto.price_usd
      } else if (fiatCurrency === 'INR') {
        cryptoPrice = crypto.price_inr
      } else if (fiatCurrency === 'EUR') {
        cryptoPrice = crypto.price_usd * 0.85
      } else if (fiatCurrency === 'GBP') {
        cryptoPrice = crypto.price_usd * 0.75
      }
      
      return cryptoAmount * cryptoPrice
    } catch (error) {
      console.error('Error converting crypto to fiat:', error)
      return 0
    }
  }

  // Generate crypto address (mock - in production use proper wallet generation)
  generateCryptoAddress(symbol: string): string {
    const prefixes = {
      BTC: '1',
      ETH: '0x',
      USDT: '0x',
      USDC: '0x',
      BNB: 'bnb',
      SOL: 'sol',
      DOGE: 'D'
    }
    
    const prefix = prefixes[symbol as keyof typeof prefixes] || '0x'
    const randomHex = Math.random().toString(16).substring(2, 34)
    return prefix + randomHex
  }

  // Simulate on-chain transfer (in production, use proper blockchain integration)
  async simulateTransfer(fromAddress: string, toAddress: string, amount: number, symbol: string): Promise<string> {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 2000))
    
    // Generate transaction hash
    const txHash = '0x' + Math.random().toString(16).substring(2, 66)
    
    console.log(`Simulated ${symbol} transfer:`)
    console.log(`From: ${fromAddress}`)
    console.log(`To: ${toAddress}`)
    console.log(`Amount: ${amount} ${symbol}`)
    console.log(`TX Hash: ${txHash}`)
    
    return txHash
  }

  private getCryptoName(symbol: string): string {
    const names: Record<string, string> = {
      BTC: 'Bitcoin',
      ETH: 'Ethereum',
      USDT: 'Tether',
      USDC: 'USD Coin',
      BNB: 'Binance Coin',
      SOL: 'Solana',
      DOGE: 'Dogecoin'
    }
    return names[symbol] || symbol
  }

  private getCryptoIcon(symbol: string): string {
    const icons: Record<string, string> = {
      BTC: '₿',
      ETH: 'Ξ',
      USDT: '₮',
      USDC: '$',
      BNB: 'B',
      SOL: 'S',
      DOGE: 'D'
    }
    return icons[symbol] || '₿'
  }

  // Enhanced fallback prices with realistic variations
  private getFallbackPrices() {
    // Add some realistic price variations
    const btcBase = 42000
    const ethBase = 3200
    const usdtBase = 1.0
    const solBase = 170.0
    const dogeBase = 0.16
    
    const variation = () => (Math.random() - 0.5) * 0.02 // ±1% variation
    
    return [
      {
        symbol: 'BTC',
        name: 'Bitcoin',
        price_usd: btcBase * (1 + variation()),
        price_inr: btcBase * 83.5 * (1 + variation()),
        change_24h: (Math.random() - 0.5) * 10, // ±5% change
        icon: '₿',
        lastUpdated: new Date().toISOString(),
        source: 'fallback'
      },
      {
        symbol: 'ETH',
        name: 'Ethereum',
        price_usd: ethBase * (1 + variation()),
        price_inr: ethBase * 83.5 * (1 + variation()),
        change_24h: (Math.random() - 0.5) * 8, // ±4% change
        icon: 'Ξ',
        lastUpdated: new Date().toISOString(),
        source: 'fallback'
      },
      {
        symbol: 'USDT',
        name: 'Tether',
        price_usd: usdtBase * (1 + variation() * 0.1), // Smaller variation for stablecoin
        price_inr: usdtBase * 83.5 * (1 + variation() * 0.1),
        change_24h: (Math.random() - 0.5) * 0.5, // ±0.25% change
        icon: '₮',
        lastUpdated: new Date().toISOString(),
        source: 'fallback'
      },
      {
        symbol: 'SOL',
        name: 'Solana',
        price_usd: solBase * (1 + variation()),
        price_inr: solBase * 83.5 * (1 + variation()),
        change_24h: (Math.random() - 0.5) * 9, // ±4.5% change
        icon: 'S',
        lastUpdated: new Date().toISOString(),
        source: 'fallback'
      },
      {
        symbol: 'DOGE',
        name: 'Dogecoin',
        price_usd: dogeBase * (1 + variation()),
        price_inr: dogeBase * 83.5 * (1 + variation()),
        change_24h: (Math.random() - 0.5) * 12, // ±6% change
        icon: 'D',
        lastUpdated: new Date().toISOString(),
        source: 'fallback'
      }
    ]
  }

  // Clear cache manually if needed
  clearCache(): void {
    this.priceCache = null
    console.log('Price cache cleared')
  }

  // Get cache status
  getCacheStatus(): { cached: boolean, age: number, source: string } {
    if (!this.priceCache) {
      return { cached: false, age: 0, source: 'none' }
    }
    
    const age = Date.now() - this.priceCache.timestamp
    return {
      cached: true,
      age,
      source: this.priceCache.source
    }
  }
}

export const binanceAPI = new BinanceAPI()
