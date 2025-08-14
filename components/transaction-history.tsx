"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { AddMoneyModal } from "./add-money-modal"
import {
  ArrowUpRight,
  ArrowDownLeft,
  Bitcoin,
  DollarSign,
  Send,
  ArrowDownRight,
  ArrowRightLeft,
  Search,
  RefreshCw,
  Calendar,
} from "lucide-react"
import { currencies } from "@/lib/mock-data"

interface Transaction {
  id: number
  user_id: number
  type: string
  amount: number
  currency: string
  crypto_amount?: number
  crypto_currency?: string
  fiat_amount?: number
  fiat_currency?: string
  status: string
  payment_method?: string
  transaction_hash?: string
  receiver_address?: string
  upi_reference?: string
  created_at: string
  updated_at?: string
}

interface TransactionHistoryProps {
  token: string
}

export function TransactionHistory({ token }: TransactionHistoryProps) {
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [filteredTransactions, setFilteredTransactions] = useState<Transaction[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [typeFilter, setTypeFilter] = useState("all")
  const [showAddMoney, setShowAddMoney] = useState(false)
  useEffect(() => {
    fetchTransactions()
    // Auto-refresh every 5 seconds
    const interval = setInterval(fetchTransactions, 5000)
    return () => clearInterval(interval)
  }, [token])

  useEffect(() => {
    filterTransactions()
  }, [transactions, searchTerm, statusFilter, typeFilter])

  const fetchTransactions = async () => {
    try {
      const response = await fetch("/api/transactions", {
        headers: { Authorization: `Bearer ${token}` },
      })

      if (response.ok) {
        const data = await response.json()
        if (data.success) {
          setTransactions(data.data || [])
        }
      }
    } catch (error) {
      console.error("Error fetching transactions:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const filterTransactions = () => {
    let filtered = transactions

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(
        (tx) =>
          tx.transaction_hash?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          tx.receiver_address?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          tx.upi_reference?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          tx.currency.toLowerCase().includes(searchTerm.toLowerCase()),
      )
    }

    // Status filter
    if (statusFilter !== "all") {
      filtered = filtered.filter((tx) => tx.status === statusFilter)
    }

    // Type filter
    if (typeFilter !== "all") {
      filtered = filtered.filter((tx) => tx.type === typeFilter)
    }

    setFilteredTransactions(filtered)
  }

  const getTransactionIcon = (type: string) => {
    switch (type) {
      case "deposit":
        return <ArrowDownLeft className="h-4 w-4 text-green-600" />
      case "withdrawal":
        return <ArrowUpRight className="h-4 w-4 text-red-600" />
      case "crypto_buy":
        return <Bitcoin className="h-4 w-4 text-orange-600" />
      case "crypto_sell":
        return <DollarSign className="h-4 w-4 text-blue-600" />
      case "crypto_send":
        return <Send className="h-4 w-4 text-purple-600" />
      case "crypto_receive":
        return <ArrowDownRight className="h-4 w-4 text-green-600" />
      case "crypto_receive_as_fiat":
        return <ArrowRightLeft className="h-4 w-4 text-green-600" />
      case "crypto_transfer_out":
        return <ArrowRightLeft className="h-4 w-4 text-orange-600" />
      case "crypto_transfer_in":
        return <ArrowRightLeft className="h-4 w-4 text-blue-600" />
      case "transfer_out":
        return <Send className="h-4 w-4 text-red-600" />
      case "transfer_in":
        return <ArrowDownRight className="h-4 w-4 text-green-600" />
      default:
        return <DollarSign className="h-4 w-4" />
    }
  }

  const getTransactionLabel = (type: string) => {
    switch (type) {
      case "deposit":
        return "Money Added"
      case "withdrawal":
        return "Money Withdrawn"
      case "crypto_buy":
        return "Crypto Purchased"
      case "crypto_sell":
        return "Crypto Sold"
      case "crypto_send":
        return "Crypto Sent"
      case "crypto_receive":
        return "Crypto Received"
      case "crypto_receive_as_fiat":
        return "Crypto Received as Fiat"
      case "crypto_transfer_out":
        return "Crypto Transfer Out"
      case "crypto_transfer_in":
        return "Crypto Transfer In"
      case "transfer_out":
        return "Money Sent"
      case "transfer_in":
        return "Money Received"
      default:
        return type.replace("_", " ").toUpperCase()
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "completed":
        return (
          <Badge variant="default" className="bg-green-100 text-green-800 border-green-200">
            ✓ Completed
          </Badge>
        )
      case "pending":
        return (
          <Badge variant="secondary" className="bg-yellow-100 text-yellow-800 border-yellow-200">
            ⏳ Pending
          </Badge>
        )
      case "failed":
        return (
          <Badge variant="destructive" className="bg-red-100 text-red-800 border-red-200">
            ✗ Failed
          </Badge>
        )
      default:
        return <Badge variant="secondary">{status}</Badge>
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60)

    if (diffInHours < 1) {
      const diffInMinutes = Math.floor(diffInHours * 60)
      return `${diffInMinutes} min${diffInMinutes !== 1 ? "s" : ""} ago`
    } else if (diffInHours < 24) {
      const hours = Math.floor(diffInHours)
      return `${hours} hour${hours !== 1 ? "s" : ""} ago`
    } else {
      return date.toLocaleDateString("en-IN", {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    }
  }

  const formatAmount = (amount: number, currency: string, type: string) => {
    const isDebit = type.includes("send") || type.includes("out") || type === "withdrawal"
    const prefix = isDebit ? "-" : "+"

    const currencyData = currencies.find((c) => c.code === currency)
    if (currencyData) {
      if (currencyData.type === "crypto") {
        return `${prefix}${amount.toFixed(8)} ${currencyData.symbol}`
      } else {
        return `${prefix}${currencyData.symbol}${amount.toLocaleString()}`
      }
    }
    return `${prefix}${amount} ${currency}`
  }

  const getAmountColor = (type: string) => {
    const isDebit = type.includes("send") || type.includes("out") || type === "withdrawal"
    return isDebit ? "text-red-600" : "text-green-600"
  }

  const transactionTypes = [
    { value: "all", label: "All Types" },
    { value: "deposit", label: "Money Added" },
    { value: "withdrawal", label: "Money Withdrawn" },
    { value: "crypto_send", label: "Crypto Sent" },
    { value: "crypto_receive", label: "Crypto Received" },
    { value: "crypto_receive_as_fiat", label: "Crypto → Fiat Received" },
    { value: "transfer_out", label: "Money Sent" },
    { value: "transfer_in", label: "Money Received" },
  ]

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Transaction History</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <RefreshCw className="h-6 w-6 animate-spin text-gray-400" />
            <span className="ml-2 text-gray-500">Loading transactions...</span>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center">
              <Calendar className="h-5 w-5 mr-2" />
              Transaction History
            </CardTitle>
            <CardDescription>Your complete payment and crypto activity ({transactions.length} total)</CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={fetchTransactions}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder="Search transactions..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="flex h-10 w-full sm:w-auto rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <option value="all">All Status</option>
            <option value="completed">Completed</option>
            <option value="pending">Pending</option>
            <option value="failed">Failed</option>
          </select>
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="flex h-10 w-full sm:w-auto rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {transactionTypes.map((type) => (
              <option key={type.value} value={type.value}>
                {type.label}
              </option>
            ))}
          </select>
        </div>

        {/* Transaction List */}
        {filteredTransactions.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Calendar className="h-8 w-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No transactions yet</h3>
            <p className="text-gray-500 mb-4">
              {transactions.length === 0
                ? "Start by adding money to your wallet or sending crypto to see your transaction history."
                : "No transactions match your current filters."}
            </p>
            {transactions.length === 0 && (
              <div className="flex justify-center space-x-3">
                 
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {filteredTransactions.map((transaction) => (
              <div
                key={transaction.id}
                className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center space-x-4">
                  <div className="p-2 bg-gray-100 rounded-full">{getTransactionIcon(transaction.type)}</div>
                  <div className="flex-1">
                    <div className="flex items-center space-x-2">
                      <div className="font-medium">{getTransactionLabel(transaction.type)}</div>
                      {getStatusBadge(transaction.status)}
                    </div>
                    <div className="text-sm text-gray-500 mt-1">
                      {formatDate(transaction.created_at)}
                      {transaction.receiver_address && (
                        <span className="ml-2">• To: {transaction.receiver_address}</span>
                      )}
                    </div>
                    {transaction.upi_reference && (
                      <div className="text-xs text-gray-400 mt-1">{transaction.upi_reference}</div>
                    )}
                    {transaction.transaction_hash && (
                      <div className="text-xs text-blue-600 mt-1 font-mono">ID: {transaction.transaction_hash}</div>
                    )}
                    {/* Enhanced crypto conversion display */}
                    {transaction.crypto_amount && transaction.crypto_currency && transaction.type === "crypto_send" && (
                      <div className="text-xs text-purple-600 mt-1">
                        Sent: {transaction.crypto_amount.toFixed(8)} {transaction.crypto_currency}
                        {transaction.fiat_amount && transaction.fiat_currency && (
                          <span className="text-green-600 ml-2">
                            → Recipient got: {currencies.find((c) => c.code === transaction.fiat_currency)?.symbol}
                            {transaction.fiat_amount.toLocaleString()} {transaction.fiat_currency}
                          </span>
                        )}
                      </div>
                    )}
                    {transaction.crypto_amount &&
                      transaction.crypto_currency &&
                      transaction.type === "crypto_receive_as_fiat" && (
                        <div className="text-xs text-green-600 mt-1">
                          Received: {transaction.crypto_amount.toFixed(8)} {transaction.crypto_currency} as fiat
                          currency
                        </div>
                      )}
                  </div>
                </div>
                <div className="text-right">
                  <div className={`font-bold text-lg ${getAmountColor(transaction.type)}`}>
                    {formatAmount(transaction.amount, transaction.currency, transaction.type)}
                  </div>
                  {transaction.fiat_amount && transaction.fiat_currency && transaction.type === "crypto_send" && (
                    <div className="text-sm text-gray-500">
                      Recipient: {currencies.find((c) => c.code === transaction.fiat_currency)?.symbol}
                      {transaction.fiat_amount.toLocaleString()}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Summary Stats */}
        {filteredTransactions.length > 0 && (
          <div className="mt-6 pt-4 border-t">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-center">
              <div className="bg-green-50 p-3 rounded-lg">
                <div className="text-sm text-green-600 font-medium">Completed</div>
                <div className="text-lg font-bold text-green-800">
                  {filteredTransactions.filter((tx) => tx.status === "completed").length}
                </div>
              </div>
              <div className="bg-yellow-50 p-3 rounded-lg">
                <div className="text-sm text-yellow-600 font-medium">Pending</div>
                <div className="text-lg font-bold text-yellow-800">
                  {filteredTransactions.filter((tx) => tx.status === "pending").length}
                </div>
              </div>
              <div className="bg-blue-50 p-3 rounded-lg">
                <div className="text-sm text-blue-600 font-medium">This Month</div>
                <div className="text-lg font-bold text-blue-800">
                  {
                    filteredTransactions.filter((tx) => {
                      const txDate = new Date(tx.created_at)
                      const now = new Date()
                      return txDate.getMonth() === now.getMonth() && txDate.getFullYear() === now.getFullYear()
                    }).length
                  }
                </div>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
