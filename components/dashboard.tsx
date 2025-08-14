"use client"

import { useAuth } from "@/hooks/use-auth";
import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { TrendingUp, TrendingDown, Plus, ArrowUpRight, LogOut, Shield, Bitcoin } from "lucide-react"
import type { CryptoData } from "@/lib/crypto"
import type { Transaction } from "@/lib/db"
import { AddMoneyModal } from "./add-money-modal"
import { WithdrawModal } from "./withdraw-modal"
import { SendCryptoModal } from "./send-crypto-modal"
import { TransactionHistory } from "./transaction-history"
import { MultiCurrencyWallet } from "./multi-currency-wallet"

interface DashboardProps {
  user: any
  onLogout: () => void
  onShowAdmin?: () => void
}

export function Dashboard({ user, onLogout, onShowAdmin }: DashboardProps) {
  const [cryptoPrices, setCryptoPrices] = useState<CryptoData[]>([])
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [walletBalances, setWalletBalances] = useState(user.walletBalances || {})
  const [showAddMoney, setShowAddMoney] = useState(false)
  const [showWithdraw, setShowWithdraw] = useState(false)
  const [showSendCrypto, setShowSendCrypto] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const { token, getAuthHeaders } = useAuth();

  useEffect(() => {
    if (token) {
      fetchData()
    }
  }, [token])

  const fetchData = async () => {
    try {
      const [pricesRes, transactionsRes, balanceRes] = await Promise.all([
        fetch("/api/crypto/prices"),
        fetch("/api/transactions", {
          headers: getAuthHeaders(),
        }),
        fetch("/api/crypto/wallet-balances", {
          headers: getAuthHeaders(),
        }),
      ])

      // Handle crypto prices
      let prices = []
      if (pricesRes.ok) {
        const pricesData = await pricesRes.json()
        prices = pricesData.success ? pricesData.data : []
      }

      // Handle transactions
      let transactionsData = []
      if (transactionsRes.ok) {
        const transData = await transactionsRes.json()
        transactionsData = transData.success ? transData.data : []
      }

      // Handle balances
      let balanceData = user.walletBalances || {}
      if (balanceRes.ok) {
        const balData = await balanceRes.json()
        balanceData = balData.success ? balData.balances : user.walletBalances || {}
      }

      setCryptoPrices(prices)
      setTransactions(transactionsData)
      setWalletBalances(balanceData)
    } catch (error) {
      console.error("Error fetching data:", error)
      // Set fallback data
      setCryptoPrices([])
      setTransactions([])
      setWalletBalances(user.walletBalances || {})
    } finally {
      setIsLoading(false)
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
    }).format(amount)
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    )
  }

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
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <MultiCurrencyWallet balances={walletBalances} />
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
            >
              <Bitcoin className="h-4 w-4 mr-2" />
              Send Crypto
            </Button>
            <Button
              onClick={() => setShowWithdraw(true)}
              className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700"
            >
              <ArrowUpRight className="h-4 w-4 mr-2" />
              Withdraw
            </Button>
          </div>
        </motion.div>

        {/* How It Works */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mb-8"
        >
          <Card className="bg-gradient-to-r from-green-50 to-blue-50 border-green-200">
            <CardHeader>
              <CardTitle className="text-green-800">🚀 Pure Crypto Payment Gateway</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                <div className="text-center">
                  <div className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-2">
                    <span className="text-white font-bold">1</span>
                  </div>
                  <div className="font-medium">Add Any Currency</div>
                  <div className="text-gray-600">INR, USD, EUR, GBP to your wallet</div>
                </div>
                <div className="text-center">
                  <div className="w-12 h-12 bg-purple-500 rounded-full flex items-center justify-center mx-auto mb-2">
                    <span className="text-white font-bold">2</span>
                  </div>
                  <div className="font-medium">Send Pure Crypto</div>
                  <div className="text-gray-600">BTC, ETH, USDT directly</div>
                </div>
                <div className="text-center">
                  <div className="w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center mx-auto mb-2">
                    <span className="text-white font-bold">3</span>
                  </div>
                  <div className="font-medium">Receive Any Currency</div>
                  <div className="text-gray-600">Auto-convert to preferred currency</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Crypto Prices */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mb-8"
        >
          <h2 className="text-2xl font-bold mb-4">Live Crypto Exchange Rates</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {cryptoPrices.map((crypto, index) => (
              <motion.div
                key={crypto.symbol}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: index * 0.1 }}
              >
                <Card className="hover:shadow-lg transition-shadow">
                  <CardHeader className="pb-2">
                    <CardTitle className="flex items-center justify-between">
                      <div className="flex items-center">
                        <span className="text-2xl mr-2">{crypto.icon}</span>
                        <div>
                          <div className="font-bold">{crypto.symbol}</div>
                          <div className="text-sm text-gray-500">{crypto.name}</div>
                        </div>
                      </div>
                      <div
                        className={`flex items-center ${crypto.change_24h >= 0 ? "text-green-600" : "text-red-600"}`}
                      >
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
                    <div className="text-xl font-bold">{formatCurrency(crypto.price_inr)}</div>
                    <div className="text-sm text-gray-500">${crypto.price_usd.toLocaleString()}</div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Recent Transactions */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
          <TransactionHistory transactions={transactions} />
        </motion.div>
      </div>

      {/* Modals */}
      <AddMoneyModal isOpen={showAddMoney} onClose={() => setShowAddMoney(false)} userId={user._id} onSuccess={fetchData} />
      <SendCryptoModal
        isOpen={showSendCrypto}
        onClose={() => setShowSendCrypto(false)}
        token={token}
        currentUser={user}
        balances={walletBalances}
        onSuccess={fetchData}
      />
      <WithdrawModal
        isOpen={showWithdraw}
        onClose={() => setShowWithdraw(false)}
        token={token}
        balances={walletBalances}
        onSuccess={fetchData}
      />
    </div>
  )
}