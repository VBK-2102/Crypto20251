"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { TrendingUp, TrendingDown, Plus, ArrowUpRight, LogOut, Shield, Bitcoin, Wallet, RefreshCw, ArrowRightLeft, Plug, CreditCard } from 'lucide-react'
import { AddMoneyModal } from "./add-money-modal"
import { WithdrawModal } from "./withdraw-modal"
import { SendCryptoModal } from "./send-crypto-modal"
import { TransactionHistory } from "./transaction-history"
import { currencies, mockCryptoPrices } from "@/lib/mock-data"
import { LiveCryptoDashboard } from "./live-crypto-dashboard"

interface SimpleDashboardProps {
  user: any
  token: string
  onLogout: () => void
  onShowAdmin?: () => void
}

export function SimpleDashboard({ user, token, onLogout, onShowAdmin }: SimpleDashboardProps) {
  const [walletBalances, setWalletBalances] = useState(user.walletBalances || {})
  const [showAddMoney, setShowAddMoney] = useState(false)
  const [showWithdraw, setShowWithdraw] = useState(false)
  const [showSendCrypto, setShowSendCrypto] = useState(false)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [liveCryptoPrices, setLiveCryptoPrices] = useState<any[]>([])
  const [walletAddress, setWalletAddress] = useState<string | null>(null)
  const [isConnecting, setIsConnecting] = useState(false)

  // Auto-refresh balances and prices every 3 seconds
  useEffect(() => {
    fetchBalances() // Initial fetch
    const interval = setInterval(() => {
      fetchBalances()
    }, 3000)

    return () => clearInterval(interval)
  }, [token])

  // Check for existing MetaMask connection on mount
  useEffect(() => {
    if (typeof window !== 'undefined' && (window as any).ethereum) {
      const ethereum = (window as any).ethereum;
      ethereum.request({ method: 'eth_accounts' })
        .then((accounts: string[]) => {
          if (accounts.length > 0) {
            setWalletAddress(accounts[0]);
          }
        })
        .catch((error: any) => console.error("Error checking accounts:", error));

      // Listen for account changes
      ethereum.on('accountsChanged', (accounts: string[]) => {
        if (accounts.length > 0) {
          setWalletAddress(accounts[0]);
        } else {
          setWalletAddress(null);
        }
      });

      // Listen for chain changes
      ethereum.on('chainChanged', (chainId: string) => {
        console.log("Chain changed to:", chainId);
      });
    }
  }, []);

  const fetchBalances = async () => {
    try {
      const [balanceRes, livePricesRes] = await Promise.all([
        fetch("/api/crypto/wallet-balances", {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch("/api/crypto/live-prices")
      ])

      // Handle balances
      let balanceData = user.walletBalances || {}
      if (balanceRes.ok) {
        const balData = await balanceRes.json()
        balanceData = balData.success ? balData.balances : user.walletBalances || {}
      }

      // Handle live crypto prices
      let livePrices = []
      if (livePricesRes.ok) {
        const pricesData = await livePricesRes.json()
        // Transform the API response to the expected format
        livePrices = Object.entries(pricesData).map(([symbol, data]: [string, any]) => ({
          symbol,
          price_usd: data.usd,
          price_inr: data.usd * 83.5, // Convert USD to INR using approximate exchange rate
          change_24h: data.usd_24h_change
        }))
      }

      setWalletBalances(balanceData)
      setLiveCryptoPrices(livePrices)
    } catch (error) {
      console.error("Error fetching balances:", error)
      setWalletBalances(user.walletBalances || {})
      setLiveCryptoPrices([])
    }
  }

  const handleRefresh = async () => {
    setIsRefreshing(true)
    await fetchBalances()
    setTimeout(() => setIsRefreshing(false), 1000)
  }

  const connectWallet = async () => {
    if (typeof window !== 'undefined' && (window as any).ethereum) {
      setIsConnecting(true);
      try {
        const accounts = await (window as any).ethereum.request({ method: 'eth_requestAccounts' });
        if (accounts.length > 0) {
          setWalletAddress(accounts[0]);
          console.log("Wallet connected:", accounts[0]);
        }
      } catch (error: any) {
        console.error("Error connecting to MetaMask:", error);
        alert(`Failed to connect wallet: ${error.message}`);
      } finally {
        setIsConnecting(false);
      }
    } else {
      alert('MetaMask or a compatible Ethereum wallet is not installed. Please install it to connect.');
    }
  };

  const disconnectWallet = () => {
    setWalletAddress(null);
    console.log("Wallet disconnected.");
  };

  const formatAmount = (amount: number, currencyCode: string) => {
    const currency = currencies.find((c) => c.code === currencyCode)
    if (!currency) return `${amount} ${currencyCode}`

    if (currency.type === "crypto") {
      return `${amount.toFixed(8)} ${currency.symbol}`
    } else {
      return `${currency.symbol}${amount.toLocaleString()}`
    }
  }

  const calculateTotalValue = () => {
    let totalINR = 0
    Object.entries(walletBalances).forEach(([currency, amount]) => {
      if (currency === "INR") {
        totalINR += typeof amount === 'number' ? amount : 0
      } else if (currency === "USD" && typeof amount === 'number') {
        totalINR += amount * 83.5
      } else if (currency === "EUR") {
        totalINR += (amount as number) * 90
      } else if (currency === "GBP") {
        totalINR += (amount as number) * 105
      } else {
        const crypto = liveCryptoPrices.find((c) => c.symbol === currency)
        if (crypto && typeof amount === 'number') {
          totalINR += (amount as number) * crypto.price_inr
        }
      }
    })
    return totalINR
  }

  const getTotalFiatInINR = () => {
    let totalINR = 0
    Object.entries(walletBalances).forEach(([currency, amount]) => {
      const curr = currencies.find((c) => c.code === currency)
      if (curr?.type === "fiat") {
        if (currency === "INR") {
          totalINR += typeof amount === 'number' ? amount : 0
        } else if (currency === "USD") {
          totalINR += (typeof amount === 'number' ? amount : 0) * 83.5
        } else if (currency === "EUR") {
          totalINR += (typeof amount === 'number' ? amount : 0) * 90
        } else if (currency === "GBP") {
          totalINR += (typeof amount === 'number' ? amount : 0) * 105
        }
      }
    })
    return totalINR
  }

  const fiatBalances = Object.entries(walletBalances).filter(([currency]) => {
    const curr = currencies.find((c) => c.code === currency)
    return curr?.type === "fiat"
  })

  const cryptoBalances = Object.entries(walletBalances).filter(([currency]) => {
    const curr = currencies.find((c) => c.code === currency)
    return curr?.type === "crypto"
  })

  const hasAnyBalance = Object.values(walletBalances).some((balance): balance is number => typeof balance === 'number' && balance > 0)
  const totalFiatINR = getTotalFiatInINR()
  const hasAnyFiat = totalFiatINR > 0

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center mr-3">
                <span className="text-white font-bold">₿</span>
              </div>
              <h1 className="text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                CryptoPay Gateway
              </h1>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-600">Welcome, {user.fullName}</span>
              {user.isAdmin && (
                <>
                  <Badge variant="secondary">Admin</Badge>
                  <Button variant="outline" size="sm" onClick={onShowAdmin}>
                    <Shield className="h-4 w-4 mr-2" />
                    Admin Panel
                  </Button>
                </>
              )}
              {walletAddress ? (
                <Button variant="outline" size="sm" onClick={disconnectWallet}>
                  <CreditCard className="h-4 w-4 mr-2" />
                  {walletAddress.substring(0, 6)}...{walletAddress.substring(walletAddress.length - 4)}
                </Button>
              ) : (
                <Button variant="outline" size="sm" onClick={connectWallet} disabled={isConnecting}>
                  <Plug className="h-4 w-4 mr-2" />
                  {isConnecting ? 'Connecting...' : 'Connect Wallet'}
                </Button>
              )}
              <Button variant="ghost" size="sm" onClick={onLogout}>
                <LogOut className="h-4 w-4 mr-2" />
                Logout
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Multi-Currency Wallet */}
        <div className="mb-8">
          <Card className="bg-gradient-to-r from-blue-600 to-purple-600 text-white border-0">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center">
                  <Wallet className="h-6 w-6 mr-2" />
                  Multi-Currency Wallet
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleRefresh}
                    className="ml-3 text-white hover:bg-white/20"
                    disabled={isRefreshing}
                  >
                    <RefreshCw className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`} />
                  </Button>
                </div>
                <Badge variant="secondary" className="bg-white/20 text-white">
                  Total: ₹{calculateTotalValue().toLocaleString()}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {!hasAnyBalance ? (
                <div className="text-center py-8">
                  <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Wallet className="h-8 w-8 text-white/80" />
                  </div>
                  <h3 className="text-xl font-semibold mb-2">Your wallet is empty</h3>
                  <p className="text-white/80 mb-6">Add money to start using CryptoPay Gateway</p>
                  <Button onClick={() => setShowAddMoney(true)} className="bg-white text-blue-600 hover:bg-white/90">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Money Now
                  </Button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Fiat Currencies */}
                  <div>
                    <h3 className="text-lg font-semibold mb-3 flex items-center">💰 Fiat Currencies</h3>
                    <div className="space-y-2">
                      {fiatBalances.length === 0 ? (
                        <div className="bg-white/10 rounded-lg p-4 text-center">
                          <div className="text-white/60 text-sm">No fiat currencies</div>
                          <div className="text-white/40 text-xs mt-1">Add money to get started</div>
                        </div>
                      ) : (
                        fiatBalances.map(([currency, amount]) => {
                          const curr = currencies.find((c) => c.code === currency)
                          return (
                            <div key={currency} className="bg-white/10 rounded-lg p-3">
                              <div className="flex justify-between items-center">
                                <div className="flex items-center">
                                  <span className="text-lg mr-2">{curr?.symbol}</span>
                                  <span className="font-medium">{curr?.name}</span>
                                </div>
                                <div className="text-right">
                                  <div className="font-bold">{formatAmount(typeof amount === 'number' ? amount : 0, currency)}</div>
                                </div>
                              </div>
                            </div>
                          )
                        })
                      )}
                    </div>
                  </div>

                  {/* Cryptocurrencies */}
                  <div>
                    <h3 className="text-lg font-semibold mb-3 flex items-center">₿ Cryptocurrencies</h3>
                    <div className="space-y-2">
                      {liveCryptoPrices.map((crypto) => {
                        const directCryptoBalance = walletBalances[crypto.symbol] || 0
                        let cryptoFromFiat = 0
                        if (hasAnyFiat) {
                          cryptoFromFiat = totalFiatINR / crypto.price_inr
                        }

                        const totalAvailableCrypto = directCryptoBalance + cryptoFromFiat
                        const totalValueINR = totalAvailableCrypto * crypto.price_inr

                        return (
                          <div key={crypto.symbol} className="bg-white/10 rounded-lg p-3">
                            <div className="flex justify-between items-center mb-2">
                              <div className="flex items-center">
                                <span className="text-lg mr-2">{crypto.icon}</span>
                                <div>
                                  <div className="font-medium">{crypto.name}</div>
                                  <div className="text-xs opacity-75">₹{crypto.price_inr.toLocaleString()}</div>
                                </div>
                              </div>
                              <div className="text-right">
                                <div className="font-bold">
                                  {totalAvailableCrypto.toFixed(8)} {crypto.symbol}
                                </div>
                                <div className="text-xs opacity-75">≈ ₹{totalValueINR.toLocaleString()}</div>
                              </div>
                            </div>

                            <div className="mt-2 pt-2 border-t border-white/20 space-y-1">
                              {directCryptoBalance > 0 && (
                                <div className="flex justify-between text-xs">
                                  <span className="text-white/70">Direct Holdings:</span>
                                  <span className="text-white/90">
                                    {directCryptoBalance.toFixed(8)} {crypto.symbol}
                                  </span>
                                </div>
                              )}
                              {cryptoFromFiat > 0 && (
                                <div className="flex justify-between text-xs">
                                  <span className="text-white/70 flex items-center">
                                    <ArrowRightLeft className="h-3 w-3 mr-1" />
                                    From Fiat:
                                  </span>
                                  <span className="text-green-300">
                                    {cryptoFromFiat.toFixed(8)} {crypto.symbol}
                                  </span>
                                </div>
                              )}
                              {totalAvailableCrypto === 0 && (
                                <div className="text-center text-white/50 text-xs py-1">
                                  Add fiat money to send {crypto.symbol}
                                </div>
                              )}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                </div>
              )}

              {hasAnyFiat && (
                <div className="mt-6 pt-4 border-t border-white/20">
                  <div className="bg-white/10 rounded-lg p-3">
                    <div className="text-sm font-medium mb-2 flex items-center">
                      <ArrowRightLeft className="h-4 w-4 mr-2" />
                      Available for Crypto Conversion
                    </div>
                    <div className="text-xs text-white/80">
                      Total Fiat Balance: ₹{totalFiatINR.toLocaleString()}
                      <span className="ml-2 text-green-300">→ Ready to convert to any cryptocurrency</span>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <div className="flex flex-wrap gap-3 mt-4">
            <Button
              onClick={() => setShowAddMoney(true)}
              className="bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Money
            </Button>
            <Button
              onClick={() => setShowSendCrypto(true)}
              className="bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700"
              disabled={!hasAnyBalance && !hasAnyFiat}
            >
              <Bitcoin className="h-4 w-4 mr-2" />
              Send Crypto
            </Button>
            <Button
              onClick={() => setShowWithdraw(true)}
              className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700"
              disabled={!hasAnyBalance}
            >
              <ArrowUpRight className="h-4 w-4 mr-2" />
              Withdraw
            </Button>
          </div>
        </div>

        {/* Live Crypto Market Data */}
        <div className="mb-8">
          <LiveCryptoDashboard token={token} />
        </div>

        {/* Real-time Status */}
        <div className="mb-8">
          <Card className="bg-green-50 border-green-200">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                  <span className="text-sm font-medium text-green-800">Real-time Balance Updates</span>
                </div>
                <span className="text-xs text-green-600">Auto-refreshing every 3 seconds</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Transaction History */}
        <div className="mb-8">
          <TransactionHistory token={token} />
        </div>
      </div>

      {/* Modals */}
      <AddMoneyModal
        isOpen={showAddMoney}
        onClose={() => setShowAddMoney(false)}
        userId={user.id}
        onSuccess={fetchBalances}
      />
      <SendCryptoModal
        isOpen={showSendCrypto}
        onClose={() => setShowSendCrypto(false)}
        token={token}
        currentUser={user}
        balances={walletBalances}
        liveCryptoPrices={liveCryptoPrices}
        onSuccess={fetchBalances}
      />
      <WithdrawModal
        isOpen={showWithdraw}
        onClose={() => setShowWithdraw(false)}
        token={token}
        balances={walletBalances}
        onSuccess={fetchBalances}
      />
    </div>
  )
}