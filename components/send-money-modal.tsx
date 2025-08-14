"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent } from "@/components/ui/card"
import { CheckCircle, Loader2, Send, User, Search } from "lucide-react"

interface SendMoneyModalProps {
  isOpen: boolean
  onClose: () => void
  token: string
  currentUser: any
  balance: number
  onSuccess: () => void
}

interface UserSearchResult {
  id: number
  email: string
  fullName: string
}

export function SendMoneyModal({ isOpen, onClose, token, currentUser, balance, onSuccess }: SendMoneyModalProps) {
  const [step, setStep] = useState(1)
  const [searchQuery, setSearchQuery] = useState("")
  const [searchResults, setSearchResults] = useState<UserSearchResult[]>([])
  const [selectedUser, setSelectedUser] = useState<UserSearchResult | null>(null)
  const [amount, setAmount] = useState("")
  const [note, setNote] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [isSearching, setIsSearching] = useState(false)
  const [error, setError] = useState("")
  const [transactionId, setTransactionId] = useState("")

  const searchUsers = async (query: string) => {
    if (!query.trim()) {
      setSearchResults([])
      return
    }

    setIsSearching(true)
    try {
      const response = await fetch(`/api/users/search?q=${encodeURIComponent(query)}`, {
        headers: { Authorization: `Bearer ${token}` },
      })

      const data = await response.json()
      if (data.success) {
        // Filter out current user from results
        const filteredResults = data.data.filter((user: UserSearchResult) => user.id !== currentUser.id)
        setSearchResults(filteredResults)
      }
    } catch (error) {
      console.error("Error searching users:", error)
    } finally {
      setIsSearching(false)
    }
  }

  const handleUserSelect = (user: UserSearchResult) => {
    setSelectedUser(user)
    setSearchQuery(user.fullName)
    setSearchResults([])
    setStep(2)
  }

  const handleSendMoney = async () => {
    if (!selectedUser || !amount) return

    const sendAmount = Number.parseFloat(amount)
    if (sendAmount > balance) {
      setError("Insufficient balance")
      return
    }

    setIsLoading(true)
    setError("")

    try {
      const response = await fetch("/api/transactions/send", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          recipientId: selectedUser.id,
          amount: sendAmount,
          note: note.trim(),
        }),
      })

      const data = await response.json()

      if (data.success) {
        setTransactionId(data.transactionId)
        setStep(3)
      } else {
        setError(data.error || "Failed to send money")
      }
    } catch (error) {
      console.error("Error sending money:", error)
      setError("Failed to send money. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  const handleClose = () => {
    setStep(1)
    setSearchQuery("")
    setSearchResults([])
    setSelectedUser(null)
    setAmount("")
    setNote("")
    setError("")
    setTransactionId("")
    onClose()
  }

  const handleSuccess = () => {
    onSuccess()
    handleClose()
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <Send className="h-5 w-5 mr-2" />
            Send Money
          </DialogTitle>
          <DialogDescription>Transfer money to another user instantly</DialogDescription>
        </DialogHeader>

        <AnimatePresence mode="wait">
          {step === 1 && (
            <motion.div
              key="step1"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-4"
            >
              <div className="space-y-2">
                <Label htmlFor="search">Search User</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <Input
                    id="search"
                    placeholder="Search by name or email..."
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value)
                      searchUsers(e.target.value)
                    }}
                    className="pl-10"
                  />
                  {isSearching && (
                    <Loader2 className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 animate-spin" />
                  )}
                </div>
              </div>

              {searchResults.length > 0 && (
                <Card className="max-h-60 overflow-y-auto">
                  <CardContent className="p-2">
                    <div className="space-y-1">
                      {searchResults.map((user) => (
                        <button
                          key={user.id}
                          onClick={() => handleUserSelect(user)}
                          className="w-full p-3 text-left hover:bg-gray-50 rounded-lg transition-colors flex items-center space-x-3"
                        >
                          <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                            <span className="text-white font-bold text-sm">
                              {user.fullName.charAt(0).toUpperCase()}
                            </span>
                          </div>
                          <div>
                            <div className="font-medium">{user.fullName}</div>
                            <div className="text-sm text-gray-500">{user.email}</div>
                          </div>
                        </button>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {searchQuery && !isSearching && searchResults.length === 0 && (
                <div className="text-center py-4 text-gray-500">
                  <User className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No users found</p>
                </div>
              )}

              {error && <div className="text-sm text-red-600 bg-red-50 p-3 rounded-lg">{error}</div>}
            </motion.div>
          )}

          {step === 2 && selectedUser && (
            <motion.div
              key="step2"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-4"
            >
              <Card className="bg-blue-50">
                <CardContent className="p-4">
                  <div className="flex items-center space-x-3">
                    <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                      <span className="text-white font-bold">{selectedUser.fullName.charAt(0).toUpperCase()}</span>
                    </div>
                    <div>
                      <div className="font-medium">Sending to:</div>
                      <div className="text-lg font-bold">{selectedUser.fullName}</div>
                      <div className="text-sm text-gray-600">{selectedUser.email}</div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <div className="space-y-2">
                <Label htmlFor="amount">Amount (INR)</Label>
                <Input
                  id="amount"
                  type="number"
                  placeholder="Enter amount"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  max={balance}
                />
                <div className="text-xs text-gray-500">Available balance: ₹{balance.toLocaleString()}</div>
                {Number.parseFloat(amount) > balance && (
                  <div className="text-sm text-red-600">Amount exceeds available balance</div>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="note">Note (Optional)</Label>
                <Input
                  id="note"
                  placeholder="Add a note..."
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  maxLength={100}
                />
              </div>

              <div className="flex space-x-2">
                <Button variant="outline" onClick={() => setStep(1)} className="flex-1">
                  Back
                </Button>
                <Button
                  onClick={handleSendMoney}
                  className="flex-1"
                  disabled={
                    !amount || Number.parseFloat(amount) <= 0 || Number.parseFloat(amount) > balance || isLoading
                  }
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    <>
                      <Send className="mr-2 h-4 w-4" />
                      Send ₹{amount || "0"}
                    </>
                  )}
                </Button>
              </div>

              {error && <div className="text-sm text-red-600 bg-red-50 p-3 rounded-lg">{error}</div>}
            </motion.div>
          )}

          {step === 3 && (
            <motion.div
              key="step3"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="space-y-4 text-center"
            >
              <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.2, type: "spring" }}>
                <CheckCircle className="h-16 w-16 mx-auto text-green-500" />
              </motion.div>

              <div className="space-y-2">
                <h3 className="text-lg font-semibold text-green-600">Money Sent Successfully!</h3>
                <p className="text-sm text-gray-600">
                  ₹{amount} has been sent to {selectedUser?.fullName}
                </p>
                {note && <p className="text-sm text-gray-500 italic">"{note}"</p>}
                <div className="text-xs text-gray-400 mt-2">Transaction ID: {transactionId}</div>
              </div>

              <Button onClick={handleSuccess} className="w-full">
                Done
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
      </DialogContent>
    </Dialog>
  )
}
