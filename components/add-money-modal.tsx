"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { PaymentGatewayModal } from "./payment-gateway-modal"
import { currencies } from "@/lib/mock-data"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { CheckCircle, CreditCard, Smartphone } from "lucide-react"
import { motion } from "framer-motion"
import { useAuth } from "@/hooks/use-auth"
import toast from "react-hot-toast"

interface AddMoneyModalProps {
  onSuccess?: () => void;
  isOpen: boolean;
  onClose: () => void;
  userId?: string;
  onAmountChange?: (amount: number, currency: string) => void;
}

export function AddMoneyModal({ isOpen, onClose, onSuccess }: AddMoneyModalProps) {
  const [amount, setAmount] = useState<string>("")
  const [currency, setCurrency] = useState<string>("INR")
  const [targetCrypto, setTargetCrypto] = useState<string>("BTC")
  const [error, setError] = useState<string>("") 
  const [showPaymentGateway, setShowPaymentGateway] = useState<boolean>(false)
  const [loading, setLoading] = useState<boolean>(false)
  const [paymentData, setPaymentData] = useState<any>(null)
  const [paymentSuccess, setPaymentSuccess] = useState(false)
  const [newBalance, setNewBalance] = useState<number | null>(null)
  const [paymentMessage, setPaymentMessage] = useState('')
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState('')
  const [selectedCardType, setSelectedCardType] = useState('')
  const [userId, setUserId] = useState<string | undefined>(undefined)
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string | null>(null)
  const { getAuthHeaders } = useAuth()

  const fiatCurrencies = currencies.filter((c) => c.type === "fiat")
  const cryptoCurrencies = currencies.filter((c) => c.type === "crypto")

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/[^0-9.]/g, "")
    setAmount(value)
    setError("")
  }

  const handleProceed = () => {
    setError("")
    
    const numAmount = parseFloat(amount)
    
    if (!amount || isNaN(numAmount)) {
      setError("Please enter a valid amount")
      return
    }
    
    if (numAmount < 100) {
      setError("Minimum amount is 100")
      return
    }
    
    if (numAmount > 100000) {
      setError("Maximum amount is 100,000")
      return
    }

    const headers = getAuthHeaders()
    if (!headers.Authorization) {
      toast.error("You need to be logged in to add money")
      return
    }
    
    setShowPaymentGateway(true)
  }

  const handlePaymentSuccess = (transactionId: string) => {
    setShowPaymentGateway(false)
    if (onSuccess) {
      onSuccess()
    }
    onClose()
  }
  const handleClose = () => {
    setAmount("")
    setCurrency("INR")
    setTargetCrypto("BTC")
    setError("")
    onClose()
  }

  const createPaymentSession = async () => {
    try {
      const data = await fetch("/api/payments/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...getAuthHeaders(),
        },
        body: JSON.stringify({
          amount: parseFloat(amount),
          currency,
          targetCrypto,
        }),
      }).then((res) => res.json())

      if (!data.success) {
        throw new Error(data.error || "Failed to create payment")
      }

      setPaymentData(data)
      toast.success("Payment session created!")
    } catch (error: any) {
      toast.error(error.message || "Failed to create payment")
    } finally {
      setLoading(false)
    }
  }
  
  const handleCreatePayment = async () => {
    if (!amount || isNaN(parseFloat(amount))) {
      toast.error("Please enter a valid amount")
      return
    }
    
    setLoading(true)
    await createPaymentSession()
  }

  const handleSimulatePayment = async () => {
    if (!paymentData) return

    setLoading(true)
    try {
      const headers = getAuthHeaders()
      let response;
      
      // Process payment based on selected payment method
      if (selectedPaymentMethod === 'upi') {
        // Make sure we have a valid userId
        if (!userId) {
          throw new Error("User ID is missing. Please log in again.")
        }

        console.log('Sending webhook with userId:', userId);
        
        // First, simulate the payment gateway response for UPI
        const webhookResponse = await fetch(`${window.location.origin}/api/payments/webhook`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            transactionId: paymentData.transactionId,
            status: "success",
            paymentId: paymentData.paymentId || `UPI_${Date.now()}`,
            amount: paymentData.amount,
            currency: paymentData.currency,
            userId: userId,
            gateway: paymentData.gateway || 'default'
          }),
        })

        if (!webhookResponse.ok) {
          const errorData = await webhookResponse.json();
          console.error('Webhook error:', errorData);
          throw new Error(errorData.error || "UPI payment processing failed")
        }
        
        // Then confirm the payment to update wallet balance
        response = await fetch(`${window.location.origin}/api/payments/confirm`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...headers,
          },
          body: JSON.stringify({
            transactionId: paymentData.transactionId,
            paymentMethod: 'upi',
            paymentId: paymentData.paymentId,
            gateway: paymentData.gateway || 'default'
          }),
        })
      } else if (selectedPaymentMethod === 'card') {
        // Direct card payment processing
        response = await fetch(`${window.location.origin}/api/payments/card`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...headers,
          },
          body: JSON.stringify({
            amount: paymentData.amount,
            currency: paymentData.currency,
            transactionId: paymentData.transactionId,
            paymentId: paymentData.paymentId,
            gateway: paymentData.gateway || 'default',
            cardDetails: {
              // In a real app, you would collect and securely send card details
              // This is just a placeholder
              cardType: selectedCardType || 'visa'
            }
          }),
        })
      } else {
        throw new Error("Please select a payment method")
      }

      const responseData = await response.json()

      if (response.ok) {
        setNewBalance(responseData.newBalance || null)
        setPaymentMessage(responseData.message || `Payment of ${paymentData.amount} ${paymentData.currency} was successful`)
        setPaymentSuccess(true)
        toast.success(responseData.message || `Payment of ${paymentData.amount} ${paymentData.currency} was successful`)
        setTimeout(() => {
          setPaymentData(null)
          setAmount("")
          onClose()
        }, 2000)
      } else {
        throw new Error(responseData.error || "Payment failed")
      }
    } catch (error: any) {
      toast.error(error.message || "Payment failed");
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <Dialog open={isOpen && !showPaymentGateway} onOpenChange={handleClose}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add Money to Wallet</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="amount">Amount</Label>
              <div className="flex">
                <Select value={currency} onValueChange={setCurrency}>
                  <SelectTrigger className="w-24">
                    <SelectValue placeholder="Currency" />
                  </SelectTrigger>
                  <SelectContent>
                    {fiatCurrencies.map((c) => (
                      <SelectItem key={c.code} value={c.code}>
                        {c.symbol} {c.code}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Input
                  id="amount"
                  className="flex-1 ml-2"
                  placeholder="Enter amount"
                  value={amount}
                  onChange={handleAmountChange}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="targetCrypto">Target Cryptocurrency</Label>
              <Select value={targetCrypto} onValueChange={setTargetCrypto}>
                <SelectTrigger>
                  <SelectValue placeholder="Select cryptocurrency" />
                </SelectTrigger>
                <SelectContent>
                  {cryptoCurrencies.map((c) => (
                    <SelectItem key={c.code} value={c.code}>
                      {c.symbol} {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-sm text-gray-500">
                Your money will be converted to cryptocurrency at the current market rate
              </p>
            </div>

            {error && <p className="text-sm text-red-500">{error}</p>}
          </div>

          <div className="flex justify-end space-x-2">
            <Button variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            <Button onClick={handleProceed}>Proceed to Payment</Button>
          </div>
        </DialogContent>
      </Dialog>

      {showPaymentGateway && (
        <PaymentGatewayModal
          isOpen={showPaymentGateway}
          onClose={() => setShowPaymentGateway(false)}
          amount={parseFloat(amount)}
          currency={currency}
          targetCrypto={targetCrypto}
          onSuccess={handlePaymentSuccess}
        />
      )}
    </>
  )
}