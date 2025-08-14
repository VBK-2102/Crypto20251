"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent } from "@/components/ui/card"
import { CheckCircle, CreditCard, Smartphone, AlertCircle, Loader2, CreditCardIcon } from "lucide-react"
import QRCode from "react-qr-code"
import { useAuth } from "@/hooks/use-auth"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

interface PaymentGatewayModalProps {
  isOpen: boolean
  onClose: () => void
  amount: number
  currency: string
  targetCrypto: string
  onSuccess: (transactionId: string) => void
}

type PaymentGateway = 'stripe' | 'paypal' | 'razorpay' | 'default';

export function PaymentGatewayModal({
  isOpen,
  onClose,
  amount,
  currency,
  targetCrypto,
  onSuccess,
}: PaymentGatewayModalProps) {
  const [paymentMethod, setPaymentMethod] = useState<"upi" | "card">("upi")
  const [paymentGateway, setPaymentGateway] = useState<PaymentGateway>("default")
  const [upiId, setUpiId] = useState("9741721110@superyes")
  const [cardNumber, setCardNumber] = useState("")
  const [cardExpiry, setCardExpiry] = useState("")
  const [cardCvv, setCardCvv] = useState("")
  const [cardName, setCardName] = useState("")
  const [isProcessing, setIsProcessing] = useState(false)
  const [error, setError] = useState("")
  const [transactionId, setTransactionId] = useState("")
  const [paymentStatus, setPaymentStatus] = useState<"pending" | "success" | "failed">("pending")
  const [qrValue, setQrValue] = useState("")
  const [paymentUrl, setPaymentUrl] = useState<string | null>(null)
  const [paymentId, setPaymentId] = useState<string | null>(null)

  const { getAuthHeaders } = useAuth()

  useEffect(() => {
    if (isOpen && paymentMethod === "upi") {
      // Generate UPI payment link
      const upiPaymentString = `upi://pay?pa=${upiId}&pn=Zerokost&am=${amount}&cu=${currency}&tn=Add money to wallet`
      setQrValue(upiPaymentString)
    }
  }, [isOpen, paymentMethod, amount, currency, upiId])

  const createPayment = async () => {
    setIsProcessing(true)
    setError("")

    try {
      const response = await fetch("/api/payments/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...getAuthHeaders(),
        },
        body: JSON.stringify({
          amount,
          currency,
          targetCrypto,
          paymentMethod,
          gateway: paymentGateway
        }),
      })

      const data = await response.json()

      if (data.success) {
        setTransactionId(data.transactionId)
        
        // If we have a payment URL from a real gateway, set it
        if (data.paymentUrl) {
          setPaymentUrl(data.paymentUrl)
          setPaymentId(data.paymentId)
          
          // For real payment gateways, we would redirect to their payment page
          if (paymentGateway !== 'default') {
            // In a production app, we would redirect to the payment URL
            // window.location.href = data.paymentUrl
            
            // For demo purposes, we'll simulate a redirect and then a callback
            setTimeout(() => {
              // Simulate the user completing payment on the gateway
              confirmPayment(data.transactionId)
            }, 3000)
          }
        } else {
          // For the default/simulated gateway
          setTimeout(() => {
            confirmPayment(data.transactionId)
          }, 2000)
        }
      } else {
        setError(data.error || "Failed to create payment")
        setIsProcessing(false)
      }
    } catch (error) {
      console.error("Error creating payment:", error)
      setError("Failed to create payment. Please try again.")
      setIsProcessing(false)
    }
  }

  const confirmPayment = async (txnId: string) => {
    try {
      const response = await fetch("/api/payments/confirm", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...getAuthHeaders(),
        },
        body: JSON.stringify({
          transactionId: txnId,
          paymentMethod,
          paymentId,
          gateway: paymentGateway
        }),
      })

      const data = await response.json()

      if (data.success) {
        setPaymentStatus("success")
        // Wait a moment before closing to show success state
        setTimeout(() => {
          onSuccess(txnId)
        }, 2000)
      } else {
        setError(data.error || "Payment verification failed")
        setPaymentStatus("failed")
      }
    } catch (error) {
      console.error("Error confirming payment:", error)
      setError("Payment verification failed. Please contact support.")
      setPaymentStatus("failed")
    } finally {
      setIsProcessing(false)
    }
  }

  const handlePayment = () => {
    setError("")

    if (paymentMethod === "card") {
      // Validate card details
      if (!cardNumber.trim() || !cardExpiry.trim() || !cardCvv.trim() || !cardName.trim()) {
        setError("Please fill in all card details")
        return
      }

      if (cardNumber.replace(/\s/g, "").length !== 16) {
        setError("Invalid card number")
        return
      }

      if (!/^\d{2}\/\d{2}$/.test(cardExpiry)) {
        setError("Invalid expiry date (MM/YY)")
        return
      }

      if (!/^\d{3}$/.test(cardCvv)) {
        setError("Invalid CVV")
        return
      }
    }

    createPayment()
  }

  const formatCardNumber = (value: string) => {
    const v = value.replace(/\s+/g, "").replace(/[^0-9]/gi, "")
    const matches = v.match(/\d{4,16}/g)
    const match = (matches && matches[0]) || ""
    const parts = []

    for (let i = 0, len = match.length; i < len; i += 4) {
      parts.push(match.substring(i, i + 4))
    }

    if (parts.length) {
      return parts.join(" ")
    } else {
      return value
    }
  }

  const handleCardNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatCardNumber(e.target.value)
    setCardNumber(formatted.substring(0, 19))
  }

  const handleCardExpiryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.replace(/\D/g, "")
    if (value.length > 2) {
      value = value.substring(0, 2) + "/" + value.substring(2, 4)
    }
    setCardExpiry(value.substring(0, 5))
  }

  return (
    <Dialog open={isOpen} onOpenChange={() => !isProcessing && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Complete Payment</DialogTitle>
        </DialogHeader>

        {paymentStatus === "success" ? (
          <div className="flex flex-col items-center justify-center py-6">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
            <h3 className="text-xl font-semibold text-center mb-2">Payment Successful!</h3>
            <p className="text-center text-gray-500 mb-4">
              {currency} {amount.toLocaleString()} has been added to your wallet
            </p>
            <Button onClick={() => onSuccess(transactionId)}>Continue</Button>
          </div>
        ) : paymentStatus === "failed" ? (
          <div className="flex flex-col items-center justify-center py-6">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
              <AlertCircle className="h-8 w-8 text-red-600" />
            </div>
            <h3 className="text-xl font-semibold text-center mb-2">Payment Failed</h3>
            <p className="text-center text-red-500 mb-4">{error || "Something went wrong"}</p>
            <div className="flex space-x-3">
              <Button variant="outline" onClick={onClose}>Cancel</Button>
              <Button onClick={() => {
                setPaymentStatus("pending")
                setError("")
              }}>Try Again</Button>
            </div>
          </div>
        ) : (
          <>
            <div className="mb-4">
              <p className="text-center font-semibold text-lg">
                {currency} {amount.toLocaleString()}
              </p>
              <p className="text-center text-gray-500 text-sm">
                Adding funds to your wallet
              </p>
            </div>

            <div className="mb-4">
              <Label htmlFor="paymentGateway">Payment Gateway</Label>
              <Select 
                value={paymentGateway} 
                onValueChange={(value) => setPaymentGateway(value as PaymentGateway)} 
                disabled={isProcessing}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select payment gateway" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="default">Default (Simulation)</SelectItem>
                  <SelectItem value="stripe">Stripe</SelectItem>
                  <SelectItem value="paypal">PayPal</SelectItem>
                  <SelectItem value="razorpay">Razorpay</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <Tabs defaultValue="upi" onValueChange={(value) => setPaymentMethod(value as "upi" | "card")}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="upi" disabled={isProcessing}>
                  <Smartphone className="h-4 w-4 mr-2" />
                  UPI
                </TabsTrigger>
                <TabsTrigger value="card" disabled={isProcessing}>
                  <CreditCard className="h-4 w-4 mr-2" />
                  Card
                </TabsTrigger>
              </TabsList>

              <TabsContent value="upi" className="space-y-4 py-4">
                <div className="flex flex-col items-center justify-center">
                  <div className="bg-white p-3 rounded-lg mb-4">
                    <QRCode value={qrValue} size={180} />
                  </div>
                  <p className="text-center mb-2">Scan with any UPI app</p>
                  <div className="flex items-center space-x-2 mb-4">
                    <p className="font-medium">UPI ID:</p>
                    <code className="bg-gray-100 px-2 py-1 rounded text-sm">{upiId}</code>
                  </div>
                  <p className="text-sm text-gray-500 text-center mb-4">
                    After completing payment in your UPI app, click the button below
                  </p>
                </div>
              </TabsContent>

              <TabsContent value="card" className="space-y-4 py-4">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="cardNumber">Card Number</Label>
                    <Input
                      id="cardNumber"
                      placeholder="1234 5678 9012 3456"
                      value={cardNumber}
                      onChange={handleCardNumberChange}
                      disabled={isProcessing}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="cardExpiry">Expiry Date</Label>
                      <Input
                        id="cardExpiry"
                        placeholder="MM/YY"
                        value={cardExpiry}
                        onChange={handleCardExpiryChange}
                        disabled={isProcessing}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="cardCvv">CVV</Label>
                      <Input
                        id="cardCvv"
                        placeholder="123"
                        value={cardCvv}
                        onChange={(e) => setCardCvv(e.target.value.replace(/\D/g, "").substring(0, 3))}
                        disabled={isProcessing}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="cardName">Name on Card</Label>
                    <Input
                      id="cardName"
                      placeholder="John Doe"
                      value={cardName}
                      onChange={(e) => setCardName(e.target.value)}
                      disabled={isProcessing}
                    />
                  </div>
                </div>
              </TabsContent>
            </Tabs>

            {error && (
              <div className="text-red-500 text-sm mt-2">{error}</div>
            )}

            <div className="flex justify-end space-x-2 mt-4">
              <Button variant="outline" onClick={onClose} disabled={isProcessing}>
                Cancel
              </Button>
              <Button onClick={handlePayment} disabled={isProcessing}>
                {isProcessing ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Processing...
                  </>
                ) : (
                  "Pay Now"
                )}
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}