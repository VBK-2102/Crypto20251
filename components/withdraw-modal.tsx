"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent } from "@/components/ui/card"
import { Loader2, CheckCircle } from "lucide-react"
import { currencies } from "@/lib/mock-data"
import { useAuth } from "@/hooks/use-auth";

interface WithdrawModalProps {
  isOpen: boolean
  onClose: () => void
  balances: Record<string, number>
  onSuccess: () => void
}

export function WithdrawModal({ isOpen, onClose, balances, onSuccess }: WithdrawModalProps) {
  const [amount, setAmount] = useState("")
  const [selectedCurrency, setSelectedCurrency] = useState("INR")
  const [withdrawalMethod, setWithdrawalMethod] = useState("bank")
  const [accountDetails, setAccountDetails] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")
  const [withdrawalSuccess, setWithdrawalSuccess] = useState(false)
  const { getAuthHeaders } = useAuth();

  const handleWithdraw = async () => {
    if (!amount || Number.parseFloat(amount) <= 0) {
      setError("Please enter a valid amount.")
      return
    }
    if (Number.parseFloat(amount) > balances[selectedCurrency]) {
      setError("Insufficient balance.")
      return
    }
    if (!accountDetails.trim()) {
      setError("Please provide account details.")
      return
    }

    setIsLoading(true)
    setError("")

    try {
      const response = await fetch("/api/transactions/withdraw", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...getAuthHeaders(),
        },
        body: JSON.stringify({
          amount: Number.parseFloat(amount),
          currency: selectedCurrency,
          withdrawalMethod,
          accountDetails,
        }),
      })

      const data = await response.json()

      if (data.success) {
        setWithdrawalSuccess(true)
        onSuccess()
      } else {
        setError(data.error || "Withdrawal failed.")
      }
    } catch (error) {
      console.error("Error during withdrawal:", error)
      setError("Withdrawal failed. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Withdraw Funds</DialogTitle>
          <DialogDescription>Withdraw money from your wallet to your bank account or other methods.</DialogDescription>
        </DialogHeader>

        {!withdrawalSuccess ? (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="amount">Amount</Label>
              <Input
                id="amount"
                type="number"
                placeholder="Enter amount to withdraw"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
              {selectedCurrency && balances[selectedCurrency] !== undefined && (
                <p className="text-sm text-gray-500">
                  Available: {currencies.find(c => c.code === selectedCurrency)?.symbol}
                  {balances[selectedCurrency].toLocaleString()}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="currency">Currency</Label>
              <select
                id="currency"
                value={selectedCurrency}
                onChange={(e) => setSelectedCurrency(e.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {Object.keys(balances).map((currencyCode) => {
                  const currency = currencies.find(c => c.code === currencyCode);
                  if (!currency || currency.type !== 'fiat') return null; // Only show fiat currencies
                  return (
                    <option key={currency.code} value={currency.code}>
                      {currency.name} ({currency.symbol})
                    </option>
                  );
                })}
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="method">Withdrawal Method</Label>
              <select
                id="method"
                value={withdrawalMethod}
                onChange={(e) => setWithdrawalMethod(e.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <option value="bank">Bank Transfer</option>
                <option value="upi">UPI</option>
                <option value="paypal">PayPal</option>
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="accountDetails">Account Details</Label>
              <Input
                id="accountDetails"
                placeholder="Bank Account No. / UPI ID / PayPal Email"
                value={accountDetails}
                onChange={(e) => setAccountDetails(e.target.value)}
              />
            </div>

            {error && <p className="text-sm text-red-600">{error}</p>}

            <Button onClick={handleWithdraw} disabled={isLoading} className="w-full">
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : (
                "Withdraw"
              )}
            </Button>
          </motion.div>
        ) : (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4 text-center">
            <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.2, type: "spring" }}>
              <CheckCircle className="h-16 w-16 mx-auto text-green-500" />
            </motion.div>
            <h3 className="text-lg font-semibold text-green-600">Withdrawal Successful!</h3>
            <p className="text-sm text-gray-600">
              Your withdrawal of {currencies.find(c => c.code === selectedCurrency)?.symbol}
              {Number.parseFloat(amount).toLocaleString()} {selectedCurrency} is being processed.
            </p>
            <p className="text-sm text-gray-600">Funds should arrive within 1-3 business days.</p>
            <Button onClick={onClose} className="w-full">Done</Button>
          </motion.div>
        )}
      </DialogContent>
    </Dialog>
  )
}