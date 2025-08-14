"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent } from "@/components/ui/card"
import { Loader2, CheckCircle, AlertCircle } from "lucide-react"
import { currencies } from "@/lib/mock-data"
import { useAuth } from "@/hooks/use-auth";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

interface WithdrawModalProps {
  isOpen: boolean
  onClose: () => void
  balances: Record<string, number>
  onSuccess: () => void
}

type WithdrawalGateway = 'stripe' | 'paypal' | 'razorpay' | 'default';

export function WithdrawModal({ isOpen, onClose, balances, onSuccess }: WithdrawModalProps) {
  const [amount, setAmount] = useState("")
  const [selectedCurrency, setSelectedCurrency] = useState("INR")
  const [withdrawalMethod, setWithdrawalMethod] = useState("bank")
  const [withdrawalGateway, setWithdrawalGateway] = useState<WithdrawalGateway>("default")
  const [accountDetails, setAccountDetails] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")
  const [withdrawalSuccess, setWithdrawalSuccess] = useState(false)
  const [withdrawalStatus, setWithdrawalStatus] = useState<"pending" | "processing" | "completed" | "failed">("pending")
  const [transactionId, setTransactionId] = useState<string | null>(null)
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
    setWithdrawalStatus("processing")

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
          gateway: withdrawalGateway
        }),
      })

      const data = await response.json()

      if (data.success) {
        setTransactionId(data.transactionId)
        setWithdrawalStatus("completed")
        setWithdrawalSuccess(true)
        onSuccess()
      } else {
        setWithdrawalStatus("failed")
        setError(data.error || "Withdrawal failed.")
      }
    } catch (error) {
      console.error("Error during withdrawal:", error)
      setWithdrawalStatus("failed")
      setError("Withdrawal failed. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }
  
  const checkWithdrawalStatus = async () => {
    if (!transactionId) return;
    
    try {
      const response = await fetch(`/api/transactions/withdraw/status?transactionId=${transactionId}`, {
        method: "GET",
        headers: {
          ...getAuthHeaders(),
        },
      });
      
      const data = await response.json();
      
      if (data.success) {
        setWithdrawalStatus(data.status);
        if (data.status === "completed") {
          setWithdrawalSuccess(true);
        } else if (data.status === "failed") {
          setError(data.message || "Withdrawal failed.");
        }
      }
    } catch (error) {
      console.error("Error checking withdrawal status:", error);
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
              <Select value={selectedCurrency} onValueChange={setSelectedCurrency}>
                <SelectTrigger>
                  <SelectValue placeholder="Select currency" />
                </SelectTrigger>
                <SelectContent>
                  {Object.keys(balances).map((currencyCode) => {
                    const currency = currencies.find(c => c.code === currencyCode);
                    if (!currency || currency.type !== 'fiat') return null; // Only show fiat currencies
                    return (
                      <SelectItem key={currency.code} value={currency.code}>
                        {currency.name} ({currency.symbol})
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="method">Withdrawal Method</Label>
              <Select value={withdrawalMethod} onValueChange={setWithdrawalMethod}>
                <SelectTrigger>
                  <SelectValue placeholder="Select method" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="bank">Bank Transfer</SelectItem>
                  <SelectItem value="upi">UPI</SelectItem>
                  <SelectItem value="paypal">PayPal</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="gateway">Payment Gateway</Label>
              <Select value={withdrawalGateway} onValueChange={(value) => setWithdrawalGateway(value as WithdrawalGateway)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select gateway" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="default">Default (Simulation)</SelectItem>
                  <SelectItem value="stripe">Stripe</SelectItem>
                  <SelectItem value="paypal">PayPal</SelectItem>
                  <SelectItem value="razorpay">Razorpay</SelectItem>
                </SelectContent>
              </Select>
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
            {withdrawalStatus === "completed" ? (
              <>
                <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.2, type: "spring" }}>
                  <CheckCircle className="h-16 w-16 mx-auto text-green-500" />
                </motion.div>
                <h3 className="text-lg font-semibold text-green-600">Withdrawal Successful!</h3>
                <p className="text-sm text-gray-600">
                  Your withdrawal of {currencies.find(c => c.code === selectedCurrency)?.symbol}
                  {Number.parseFloat(amount).toLocaleString()} {selectedCurrency} is being processed.
                </p>
                <p className="text-sm text-gray-600">Funds should arrive within 1-3 business days.</p>
                <p className="text-xs text-gray-500 mt-2">Transaction ID: {transactionId}</p>
                <Button onClick={onClose} className="w-full">Done</Button>
              </>
            ) : withdrawalStatus === "failed" ? (
              <>
                <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.2, type: "spring" }}>
                  <AlertCircle className="h-16 w-16 mx-auto text-red-500" />
                </motion.div>
                <h3 className="text-lg font-semibold text-red-600">Withdrawal Failed</h3>
                <p className="text-sm text-gray-600">{error || "There was an issue processing your withdrawal."}</p>
                <Button onClick={() => {
                  setWithdrawalStatus("pending");
                  setWithdrawalSuccess(false);
                }} className="w-full">Try Again</Button>
              </>
            ) : (
              <>
                <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.2, type: "spring" }}>
                  <Loader2 className="h-16 w-16 mx-auto text-blue-500 animate-spin" />
                </motion.div>
                <h3 className="text-lg font-semibold text-blue-600">Processing Withdrawal</h3>
                <p className="text-sm text-gray-600">
                  Your withdrawal of {currencies.find(c => c.code === selectedCurrency)?.symbol}
                  {Number.parseFloat(amount).toLocaleString()} {selectedCurrency} is being processed.
                </p>
                <p className="text-sm text-gray-600">This may take a few moments...</p>
                <Button onClick={checkWithdrawalStatus} className="w-full mt-4">Check Status</Button>
              </>
            )}
          </motion.div>
        )}
      </DialogContent>
    </Dialog>
  )
}