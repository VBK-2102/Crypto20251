"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Send, Loader2, CheckCircle, AlertCircle } from 'lucide-react'

interface CryptoTransferModalProps {
  token: string
}

export function CryptoTransferModal({ token }: CryptoTransferModalProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [transferResult, setTransferResult] = useState<any>(null)
  const [formData, setFormData] = useState({
    fromAddress: '',
    toAddress: '',
    amount: '',
    symbol: 'BTC'
  })

  const cryptoOptions = [
    { value: 'BTC', label: 'Bitcoin (BTC)', icon: '₿' },
    { value: 'ETH', label: 'Ethereum (ETH)', icon: 'Ξ' },
    { value: 'USDT', label: 'Tether (USDT)', icon: '₮' },
    { value: 'USDC', label: 'USD Coin (USDC)', icon: '$' },
    { value: 'BNB', label: 'Binance Coin (BNB)', icon: 'B' }
  ]

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setTransferResult(null)

    try {
      const response = await fetch('/api/crypto/transfer', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(formData)
      })

      const result = await response.json()
      setTransferResult(result)

      if (result.success) {
        // Reset form on success
        setFormData({
          fromAddress: '',
          toAddress: '',
          amount: '',
          symbol: 'BTC'
        })
      }
    } catch (error) {
      console.error('Transfer error:', error)
      setTransferResult({
        success: false,
        error: 'Network error occurred'
      })
    } finally {
      setIsLoading(false)
    }
  }

  const generateSampleAddress = (symbol: string) => {
    const prefixes = {
      BTC: '1',
      ETH: '0x',
      USDT: '0x',
      USDC: '0x',
      BNB: 'bnb'
    }
    
    const prefix = prefixes[symbol as keyof typeof prefixes] || '0x'
    const randomHex = Math.random().toString(16).substring(2, 34)
    return prefix + randomHex
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button className="w-full">
          <Send className="h-4 w-4 mr-2" />
          Send Crypto
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <Send className="h-5 w-5 mr-2" />
            On-Chain Crypto Transfer
          </DialogTitle>
        </DialogHeader>

        {!transferResult && (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="symbol">Cryptocurrency</Label>
              <Select
                value={formData.symbol}
                onValueChange={(value) => setFormData({ ...formData, symbol: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select cryptocurrency" />
                </SelectTrigger>
                <SelectContent>
                  {cryptoOptions.map((crypto) => (
                    <SelectItem key={crypto.value} value={crypto.value}>
                      <div className="flex items-center">
                        <span className="mr-2">{crypto.icon}</span>
                        {crypto.label}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="fromAddress">From Address</Label>
              <div className="flex space-x-2">
                <Input
                  id="fromAddress"
                  placeholder="Enter sender address"
                  value={formData.fromAddress}
                  onChange={(e) => setFormData({ ...formData, fromAddress: e.target.value })}
                  required
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setFormData({ 
                    ...formData, 
                    fromAddress: generateSampleAddress(formData.symbol) 
                  })}
                >
                  Sample
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="toAddress">To Address</Label>
              <div className="flex space-x-2">
                <Input
                  id="toAddress"
                  placeholder="Enter recipient address"
                  value={formData.toAddress}
                  onChange={(e) => setFormData({ ...formData, toAddress: e.target.value })}
                  required
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setFormData({ 
                    ...formData, 
                    toAddress: generateSampleAddress(formData.symbol) 
                  })}
                >
                  Sample
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="amount">Amount</Label>
              <Input
                id="amount"
                type="number"
                step="0.00000001"
                placeholder="0.00000000"
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                required
              />
            </div>

            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Processing Transfer...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  Send {formData.symbol}
                </>
              )}
            </Button>
          </form>
        )}

        {transferResult && (
          <div className="space-y-4">
            {transferResult.success ? (
              <Card className="border-green-200 bg-green-50">
                <CardContent className="pt-6">
                  <div className="flex items-center mb-4">
                    <CheckCircle className="h-5 w-5 text-green-600 mr-2" />
                    <span className="font-semibold text-green-800">Transfer Successful!</span>
                  </div>
                  
                  <div className="space-y-3 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Amount:</span>
                      <span className="font-medium">
                        {transferResult.data.amount} {transferResult.data.symbol}
                      </span>
                    </div>
                    
                    <div className="flex justify-between">
                      <span className="text-gray-600">USD Value:</span>
                      <span className="font-medium">
                        ${transferResult.data.usdValue.toFixed(2)}
                      </span>
                    </div>
                    
                    <div className="flex justify-between">
                      <span className="text-gray-600">INR Value:</span>
                      <span className="font-medium">
                        ₹{transferResult.data.inrValue.toFixed(2)}
                      </span>
                    </div>
                    
                    <div className="flex justify-between">
                      <span className="text-gray-600">Network:</span>
                      <Badge variant="outline">{transferResult.data.network}</Badge>
                    </div>
                    
                    <div className="pt-2 border-t">
                      <div className="text-gray-600 text-xs mb-1">Transaction Hash:</div>
                      <div className="font-mono text-xs bg-gray-100 p-2 rounded break-all">
                        {transferResult.data.transactionHash}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card className="border-red-200 bg-red-50">
                <CardContent className="pt-6">
                  <div className="flex items-center mb-2">
                    <AlertCircle className="h-5 w-5 text-red-600 mr-2" />
                    <span className="font-semibold text-red-800">Transfer Failed</span>
                  </div>
                  <p className="text-red-700 text-sm">
                    {transferResult.error || 'An unknown error occurred'}
                  </p>
                </CardContent>
              </Card>
            )}
            
            <Button
              onClick={() => {
                setTransferResult(null)
                if (transferResult.success) {
                  setIsOpen(false)
                }
              }}
              className="w-full"
            >
              {transferResult.success ? 'Close' : 'Try Again'}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
