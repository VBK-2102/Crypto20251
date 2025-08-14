export interface CryptoData {
  symbol: string
  name: string
  price_inr: number
  price_usd: number
  change_24h: number
  icon: string
}

export const cryptoService = {
  async fetchCryptoPrices(): Promise<CryptoData[]> {
    try {
      // In production, use CoinGecko API
      // const response = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum,tether&vs_currencies=inr,usd&include_24hr_change=true')

      // Mock data for demo
      return [
        
      ]
    } catch (error) {
      console.error("Error fetching crypto prices:", error)
      return []
    }
  },

  convertInrToCrypto(inrAmount: number, cryptoPrice: number): number {
    return inrAmount / cryptoPrice
  },

  convertCryptoToInr(cryptoAmount: number, cryptoPrice: number): number {
    return cryptoAmount * cryptoPrice
  },

  generateMockAddress(symbol: string): string {
    const prefixes = {
      BTC: "1",
      ETH: "0x",
      USDT: "0x",
    }
    const prefix = prefixes[symbol as keyof typeof prefixes] || "0x"
    const randomHex = Math.random().toString(16).substring(2, 34)
    return prefix + randomHex
  },
}
