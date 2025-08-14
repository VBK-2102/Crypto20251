"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { TrendingUp, TrendingDown, RefreshCw, Zap, Globe, Wallet, AlertTriangle, Database, Clock } from 'lucide-react'

interface LiveCryptoPrice {
  symbol: string
  name: string
  price_usd: number
  price_inr: number
  change_24h: number
  volume_24h: number
  price_change: number
  icon: string
  lastUpdated: string
  source?: string
}

interface WalletBalance {
  asset: string
  balance: number
  usdValue: number
  inrValue: number
  price: any
}

import { useAuth } from "@/hooks/use-auth";

// ...

interface LiveCryptoDashboardProps {
  // Remove token: string;
}

export function LiveCryptoDashboard({}: LiveCryptoDashboardProps) {
  const [livePrices, setLivePrices] = useState<LiveCryptoPrice[]>([])
  const [walletBalances, setWalletBalances] = useState<WalletBalance[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [lastUpdate, setLastUpdate] = useState<string>("")
  const [dataSource, setDataSource] = useState<string>("")
  const [walletSource, setWalletSource] = useState<string>("")
  const [apiMessage, setApiMessage] = useState<string>("")
  const [walletMessage, setWalletMessage] = useState<string>("")
  const [isCached, setIsCached] = useState<boolean>(false)
  const [cacheAge, setCacheAge] = useState<number>(0)
  const { getAuthHeaders } = useAuth();

  // Helper function to get crypto name from symbol
  const getCryptoName = (symbol: string): string => {
    const cryptoNames: Record<string, string> = {
      BTC: "Bitcoin",
      ETH: "Ethereum",
      SOL: "Solana",
      DOGE: "Dogecoin"
    };
    return cryptoNames[symbol] || symbol;
  };

  useEffect(() => {
    fetchLiveData()
    // Increased refresh interval to 60 seconds to avoid rate limits
    const interval = setInterval(fetchLiveData, 60000)
    return () => clearInterval(interval)
  }, [])

  const fetchLiveData = async () => {
    try {
      // Get token directly from localStorage
      const token = typeof window !== 'undefined' ? localStorage.getItem('cryptopay_token') : null;
      
      const [pricesRes, balancesRes] = await Promise.all([
        fetch("/api/crypto/live-prices"),
        fetch("/api/crypto/wallet-balances", {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        }),
      ])

      if (pricesRes.ok) {
        const pricesData = await pricesRes.json()
        // Transform the API response to the expected format
        const formattedPrices = Object.entries(pricesData).map(([symbol, data]: [string, any]) => ({
          symbol,
          name: getCryptoName(symbol),
          price_usd: data.usd,
          price_inr: data.usd * 83.5, // Convert USD to INR using approximate exchange rate
          change_24h: data.usd_24h_change,
          volume_24h: 0, // Not provided in the API
          price_change: data.usd_24h_change,
          icon: "", // Not provided in the API
          lastUpdated: new Date().toISOString(),
          source: "API"
        }))
        
        setLivePrices(formattedPrices)
        setLastUpdate(new Date().toISOString())
        setDataSource("CryptoAPI")
        setApiMessage("")
        setIsCached(false)
        setCacheAge(0)
      }

      if (balancesRes.ok) {
        const balancesData = await balancesRes.json()
        if (balancesData.success) {
          setWalletBalances(balancesData.balances)
          setWalletSource(balancesData.source)
          setWalletMessage(balancesData.message || "")
        }
      }
    } catch (error) {
      console.error("Error fetching live data:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const formatCurrency = (amount: number, currency: string = "USD") => {
    if (currency === "USD") {
      return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
      }).format(amount)
    } else {
      return new Intl.NumberFormat("en-IN", {
        style: "currency",
        currency: "INR",
      }).format(amount)
    }
  }

  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString("en-US", {
      hour12: true,
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    })
  }

  const formatCacheAge = (ageMs: number) => {
    const seconds = Math.floor(ageMs / 1000)
    const minutes = Math.floor(seconds / 60)
    
    if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s ago`
    }
    return `${seconds}s ago`
  }

  const getSourceBadge = (source: string) => {
    switch (source) {
      case 'binance':
        return <Badge variant="default" className="bg-yellow-500"><Globe className="h-3 w-3 mr-1" />Binance API</Badge>
      case 'coingecko':
        return <Badge variant="secondary" className="bg-green-500 text-white"><Globe className="h-3 w-3 mr-1" />CoinGecko API</Badge>
      case 'cached':
        return <Badge variant="outline" className="bg-orange-500 text-white"><Clock className="h-3 w-3 mr-1" />Cached Data</Badge>
      case 'mock':
        return <Badge variant="outline" className="bg-blue-500 text-white"><Database className="h-3 w-3 mr-1" />Demo Data</Badge>
      case 'fallback':
        return <Badge variant="destructive"><AlertTriangle className="h-3 w-3 mr-1" />Fallback Data</Badge>
      default:
        return <Badge variant="outline">Unknown Source</Badge>
    }
  }

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Zap className="h-5 w-5 mr-2" />
            Live Crypto Market
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <RefreshCw className="h-6 w-6 animate-spin text-gray-400" />
            <span className="ml-2 text-gray-500">Loading live crypto data...</span>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
     

      {/* Live Crypto Prices */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {livePrices.map((crypto) => (
          <Card key={crypto.symbol} className={`hover:shadow-lg transition-shadow border-l-4 ${
            dataSource === 'binance' ? 'border-l-yellow-500' :
            dataSource === 'coingecko' ? 'border-l-green-500' :
            dataSource === 'cached' ? 'border-l-orange-500' :
            'border-l-gray-500'
          }`}>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center">
                  <span className="text-2xl mr-2">{crypto.icon}</span>
                  <div>
                    <div className="font-bold">{crypto.symbol}</div>
                    <div className="text-sm text-gray-500">{crypto.name}</div>
                  </div>
                </div>
                <div className={`flex items-center ${crypto.change_24h >= 0 ? "text-green-600" : "text-red-600"}`}>
                  {crypto.change_24h >= 0 ? (
                    <TrendingUp className="h-4 w-4 mr-1" />
                  ) : (
                    <TrendingDown className="h-4 w-4 mr-1" />
                  )}
                  {Math.abs(crypto.change_24h).toFixed(2)}%
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="text-xl font-bold">{formatCurrency(crypto.price_usd, "USD")}</div>
                <div className="text-lg font-semibold text-blue-600">{formatCurrency(crypto.price_inr, "INR")}</div>
                <div className="text-sm text-gray-500">
                  24h Change: {formatCurrency(crypto.price_change || 0, "USD")}
                </div>
                {crypto.volume_24h > 0 && (
                  <div className="text-xs text-gray-400">
                    Volume: {crypto.volume_24h.toLocaleString()} {crypto.symbol}
                  </div>
                )}
                <div className="text-xs text-gray-400">
                  Source: {crypto.source || dataSource}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Live Wallet Balances */}
      {walletBalances.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center">
                <Wallet className="h-5 w-5 mr-2" />
                Wallet Balances
                <div className="ml-3">
                  {getSourceBadge(walletSource)}
                </div>
              </div>
            </CardTitle>
            {walletMessage && (
              <div className="text-sm text-gray-600 mt-2">
                {walletMessage}
              </div>
            )}
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {walletBalances.map((balance) => (
                <div key={balance.asset} className="bg-gray-50 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="font-semibold">{balance.asset}</div>
                    <Badge variant="outline">{balance.balance.toFixed(8)}</Badge>
                  </div>
                  <div className="text-sm text-gray-600">
                    <div>USD: {formatCurrency(balance.usdValue, "USD")}</div>
                    <div>INR: {formatCurrency(balance.inrValue, "INR")}</div>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-4 pt-4 border-t">
              <div className="grid grid-cols-2 gap-4 text-center">
                <div className="bg-green-50 p-3 rounded-lg">
                  <div className="text-sm text-green-600 font-medium">Total USD Value</div>
                  <div className="text-lg font-bold text-green-800">
                    {formatCurrency(
                      walletBalances.reduce((sum, b) => sum + b.usdValue, 0),
                      "USD"
                    )}
                  </div>
                </div>
                <div className="bg-blue-50 p-3 rounded-lg">
                  <div className="text-sm text-blue-600 font-medium">Total INR Value</div>
                  <div className="text-lg font-bold text-blue-800">
                    {formatCurrency(
                      walletBalances.reduce((sum, b) => sum + b.inrValue, 0),
                      "INR"
                    )}
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
