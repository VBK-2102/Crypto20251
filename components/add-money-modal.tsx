"use client"

import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import { Plus, CreditCard, Smartphone, QrCode } from "lucide-react"
import QRCode from 'qrcode'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useAuth } from "@/hooks/use-auth"
import toast from "react-hot-toast"

interface AddMoneyModalProps {
  onSuccess?: () => void;
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  onAmountChange?: (amount: number, currency: string) => void;
}

export function AddMoneyModal({ isOpen, onClose, userId }: AddMoneyModalProps) {
  const [amount, setAmount] = useState("")
  const [currency, setCurrency] = useState("INR")
  const [targetCrypto, setTargetCrypto] = useState("USDT")
  const [loading, setLoading] = useState(false)
  const [paymentData, setPaymentData] = useState<any>(null)
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<'upi' | 'card' | null>(currency === "INR" ? "upi" : null)
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string | null>(null)
  const [selectedCardType, setSelectedCardType] = useState<string | null>(null)
  const { getAuthHeaders } = useAuth()

  useEffect(() => {
    const generateQrCode = async () => {
      if (amount && selectedPaymentMethod === 'upi' && currency === 'INR') {
        try {
          const qrCodeContent = `upi://pay?pa=9741721110@superyes&am=${amount}&cu=${currency}`;
          const url = await QRCode.toDataURL(qrCodeContent);
          setQrCodeDataUrl(url);
        } catch (err) {
          console.error("Failed to generate QR code:", err);
          setQrCodeDataUrl(null);
        }
      } else {
        setQrCodeDataUrl(null);
      }
    };
    generateQrCode();
  }, [amount, selectedPaymentMethod, currency]);

  const handleCreatePayment = async () => {
    if (!amount || Number.parseFloat(amount) <= 0) {
      toast.error("Please enter a valid amount")
      return
    }

    const headers = getAuthHeaders()
    if (!headers.Authorization) {
      toast.error("You need to be logged in to add money")
      return
    }

    setLoading(true)
    try {
      // Check if the token is properly formatted
      const token = headers.Authorization.replace('Bearer ', '');
      if (!token || token.split('.').length !== 3) {
        toast.error("Invalid authentication token. Please log in again.")
        return
      }

      const response = await fetch("/api/payments/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...headers,
        },
        body: JSON.stringify({
          amount: Number.parseFloat(amount),
          currency,
          targetCrypto,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        if (response.status === 401) {
          toast.error("Authentication failed. Please log in again.")
          // Could redirect to login page here
          localStorage.removeItem('cryptopay_token'); // Clear invalid token
          return
        }
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

  const handleSimulatePayment = async () => {
    if (!paymentData) return

    setLoading(true)
    try {
      const response = await fetch(`${window.location.origin}/api/payments/webhook`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          transactionId: paymentData.transactionId,
          status: "success",
          paymentId: `PAY_${Date.now()}`,
          amount: paymentData.amount,
          currency: paymentData.currency,
          userId: userId,
        }),
      })

      if (response.ok) {
        toast.success(`Card payment of ${paymentData.amount} ${paymentData.currency} was successful`)
        setPaymentData(null)
        setAmount("")
        onClose()
      } else {
        toast.error("Payment failed")
      }
    } catch (error: any) {
      toast.error("Payment failed");
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogTrigger asChild>
       
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Add Money to Wallet</DialogTitle>
          <DialogDescription>Convert fiat currency to cryptocurrency</DialogDescription>
        </DialogHeader>

        {!paymentData ? (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="amount">Amount</Label>
              <Input
                id="amount"
                type="number"
                placeholder="Enter amount"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}/>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>From Currency</Label>
                <Select value={currency} onValueChange={setCurrency}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="INR">INR (₹)</SelectItem>
                    <SelectItem value="USD">USD ($)</SelectItem>
                    <SelectItem value="EUR">EUR (€)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>To Crypto</Label>
                <Select value={targetCrypto} onValueChange={setTargetCrypto}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="BTC">Bitcoin (BTC)</SelectItem>
                    <SelectItem value="ETH">Ethereum (ETH)</SelectItem>
                    <SelectItem value="USDT">Tether (USDT)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Button onClick={handleCreatePayment} disabled={loading} className="w-full">
              {loading ? "Creating..." : "Create Payment"}
            </Button>
          </motion.div>
        ) : (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Payment Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between">
                  <span>Amount:</span>
                  <span className="font-semibold">
                    {paymentData.amount} {paymentData.currency}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>You'll receive:</span>
                  <span className="font-semibold">
                    {paymentData.expectedCrypto?.toFixed(6) || '0'} {paymentData.targetCrypto}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Exchange Rate:</span>
                  <span>{paymentData.rate?.toFixed(2) || '0'}</span>
                </div>
                <div className="flex justify-between">
                  <span>Fees:</span>
                  <span>
                    {paymentData.fees?.toFixed(2) || '0'} {paymentData.currency}
                  </span>
                </div>
              </CardContent>
            </Card>

            <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2">
              {selectedPaymentMethod === 'upi' && currency === 'INR' && (
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-center">Scan to do UPI payment</h3>
                  <div className="flex justify-center">
                    <img src={qrCodeDataUrl || "/placeholder-qr.png"} alt="UPI QR Code" className="w-48 h-48 border p-2" />
                  </div>
                  <p className="text-sm text-muted-foreground text-center">
                    Open your UPI app and scan the QR code to complete the payment.
                  </p>

                  <h3 className="text-lg font-semibold mt-6">Other UPI Options</h3>
                  <div className="grid grid-cols-1 gap-3">
                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={() => toast.success("Initiating Online Mobile Transfer...")}
                    >
                      Online Mobile Transfer
                    </Button>
                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={() => toast.success("Initiating UPI Bank Transfer...")}
                    >
                      UPI Bank Transfer
                    </Button>
                  </div>
                </div>
              )}

              {selectedPaymentMethod === 'card' && (
                <div className="space-y-6">
                  {!selectedCardType ? (
                    <>
                      <div>
                        <h3 className="text-lg font-semibold">Credit Card</h3>
                        <p className="text-sm text-muted-foreground mb-3">
                          Choose your credit card type.
                        </p>
                        <div className="grid grid-cols-2 gap-3">
                          <Button variant="outline" className="w-full" onClick={() => setSelectedCardType("Visa Credit")}>Visa</Button>
                          <Button variant="outline" className="w-full" onClick={() => setSelectedCardType("RuPay Credit")}>RuPay</Button>
                          <Button variant="outline" className="w-full" onClick={() => setSelectedCardType("MasterCard Credit")}>MasterCard</Button>
                          <Button variant="outline" className="w-full" onClick={() => setSelectedCardType("SBI Credit")}>SBI Card</Button>
                        </div>
                      </div>

                      <div>
                        <h3 className="text-lg font-semibold">Debit Card</h3>
                        <p className="text-sm text-muted-foreground mb-3">
                          Choose your debit card type.
                        </p>
                        <div className="grid grid-cols-2 gap-3">
                          <Button variant="outline" className="w-full" onClick={() => setSelectedCardType("Visa Debit")}>Visa Debit</Button>
                          <Button variant="outline" className="w-full" onClick={() => setSelectedCardType("RuPay Debit")}>RuPay Debit</Button>
                          <Button variant="outline" className="w-full" onClick={() => setSelectedCardType("MasterCard Debit")}>MasterCard Debit</Button>
                          <Button variant="outline" className="w-full" onClick={() => setSelectedCardType("Maestro Debit")}>Maestro</Button>
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="space-y-4">
                      <h3 className="text-lg font-semibold">Enter {selectedCardType} Details</h3>
                      <div className="space-y-2">
                        <Label htmlFor="cardNumber">Card Number</Label>
                        <Input id="cardNumber" type="text" placeholder="XXXX XXXX XXXX XXXX" />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="cardHolderName">Card Holder Name</Label>
                        <Input id="cardHolderName" type="text" placeholder="As on card" />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="expiryDate">Expiry Date</Label>
                          <Input id="expiryDate" type="text" placeholder="MM/YY" />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="cvv">CVV</Label>
                          <Input id="cvv" type="text" placeholder="XXX" />
                        </div>
                      </div>
                      <Button className="w-full">Pay with {selectedCardType}</Button>
                      <Button variant="outline" className="w-full" onClick={() => setSelectedCardType(null)}>Back to Card Selection</Button>
                    </div>
                  )}
                </div>
              )}

              <div className="flex gap-2">
                {currency === "INR" && (
                  <Button
                    variant="outline"
                    className="flex-1 bg-transparent"
                    onClick={() => setSelectedPaymentMethod('upi')}
                  >
                    <Smartphone className="h-4 w-4 mr-2" />
                    UPI
                  </Button>
                )}
                <Button
                  variant="outline"
                  className="flex-1 bg-transparent"
                  onClick={() => setSelectedPaymentMethod('card')}
                >
                  <CreditCard className="h-4 w-4 mr-2" />
                  Card
                </Button>
              </div>

              <Button onClick={handleSimulatePayment} disabled={loading} className="w-full">
                {loading ? "Processing..." : "Simulate Payment Success"}
              </Button>
            </div>
          </motion.div>
        )}
      </DialogContent>
    </Dialog>
  )
}