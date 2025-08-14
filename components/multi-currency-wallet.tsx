"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Wallet, ArrowRightLeft } from 'lucide-react'
import { currencies, mockCryptoPrices } from "@/lib/mock-data"

interface MultiCurrencyWalletProps {
  balances: Record<string, number>
  liveCryptoPrices?: any[]
}

export function MultiCurrencyWallet({ balances, liveCryptoPrices = [] }: MultiCurrencyWalletProps) {
  const formatAmount = (amount: number, currencyCode: string) => {
    const currency = currencies.find((c) => c.code === currencyCode)
    if (!currency) return `${amount} ${currencyCode}`

    if (currency.type === "crypto") {
      return `${amount.toFixed(8)} ${currency.symbol}`
    } else {
      return `${currency.symbol}${amount.toLocaleString()}`
    }
  }

  const getCryptoPrice = (symbol: string) => {
    return liveCryptoPrices.find((c) => c.symbol === symbol) || mockCryptoPrices.find((c) => c.symbol === symbol)
  }

  const calculateTotalValue = () => {
    let totalINR = 0
    Object.entries(balances).forEach(([currency, amount]) => {
      if (currency === "INR") {
        totalINR += amount
      } else if (currency === "USD") {
        totalINR += amount * 83.5 // Mock USD to INR rate
      } else if (currency === "EUR") {
        totalINR += amount * 90 // Mock EUR to INR rate
      } else if (currency === "GBP") {
        totalINR += amount * 105 // Mock GBP to INR rate
      } else {
        const crypto = getCryptoPrice(currency)
        if (crypto) {
          totalINR += amount * crypto.price_inr
        }
      }
    })
    return totalINR
  }

  // Calculate total fiat balance in INR for crypto conversion
  const getTotalFiatInINR = () => {
    let totalINR = 0
    Object.entries(balances).forEach(([currency, amount]) => {
      const curr = currencies.find((c) => c.code === currency)
      if (curr?.type === "fiat") {
        if (currency === "INR") {
          totalINR += amount
        } else if (currency === "USD") {
          totalINR += amount * 83.5
        } else if (currency === "EUR") {
          totalINR += amount * 90
        } else if (currency === "GBP") {
          totalINR += amount * 105
        }
      }
    })
    return totalINR
  }

  const fiatBalances = Object.entries(balances).filter(([currency]) => {
    const curr = currencies.find((c) => c.code === currency)
    return curr?.type === "fiat"
  })

  const cryptoBalances = Object.entries(balances).filter(([currency]) => {
    const curr = currencies.find((c) => c.code === currency)
    return curr?.type === "crypto"
  })

  const totalFiatINR = getTotalFiatInINR()
  const hasAnyFiat = totalFiatINR > 0

  return (
    <Card className="bg-gradient-to-r from-blue-600 to-purple-600 text-white border-0">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center">
            <Wallet className="h-6 w-6 mr-2" />
            Multi-Currency Wallet
          </div>
          <Badge variant="secondary" className="bg-white/20 text-white">
            Total: ₹{calculateTotalValue().toLocaleString()}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
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
                          <div className="font-bold">{formatAmount(amount, currency)}</div>
                        </div>
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          </div>

          {/* Cryptocurrencies - Enhanced to show both direct holdings and fiat equivalents */}
          <div>
            <h3 className="text-lg font-semibold mb-3 flex items-center">₿ Cryptocurrencies</h3>
            <div className="space-y-2">
              {liveCryptoPrices.length > 0 ? liveCryptoPrices.map((crypto) => {
                const directCryptoBalance = balances[crypto.symbol] || 0

                // Calculate how much crypto can be bought with total fiat
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

                    {/* Breakdown of crypto sources */}
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
              }) : mockCryptoPrices.map((crypto) => {
                const directCryptoBalance = balances[crypto.symbol] || 0

                // Calculate how much crypto can be bought with total fiat
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

                    {/* Breakdown of crypto sources */}
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

        {/* Summary Information */}
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
  )
}
