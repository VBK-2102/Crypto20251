"use client"

import { useState, useEffect } from "react"
import { SimpleAuthForm } from "@/components/simple-auth-form"
import { SimpleDashboard } from "@/components/simple-dashboard"
import { AddMoneyModal } from "@/components/add-money-modal"
import { AdminPanel } from "@/components/admin-panel"

export default function Home() {
  const [user, setUser] = useState<any>(null)
  const [token, setToken] = useState<string>("")
  const [showAdmin, setShowAdmin] = useState(false)

  useEffect(() => {
    // Check for stored auth data
    const storedToken = localStorage.getItem("cryptopay_token")
    const storedUser = localStorage.getItem("cryptopay_user")

    if (storedToken && storedUser) {
      try {
        setToken(storedToken)
        setUser(JSON.parse(storedUser))
      } catch (error) {
        console.error("Error parsing stored user data:", error)
        localStorage.removeItem("cryptopay_token")
        localStorage.removeItem("cryptopay_user")
      }
    }
  }, [])

  const handleAuthSuccess = (authToken: string, userData: any) => {
    setToken(authToken)
    setUser(userData)
    localStorage.setItem("cryptopay_token", authToken)
    localStorage.setItem("cryptopay_user", JSON.stringify(userData))
  }

  const handleLogout = () => {
    setToken("")
    setUser(null)
    setShowAdmin(false)
    localStorage.removeItem("cryptopay_token")
    localStorage.removeItem("cryptopay_user")
  }

  if (!user) {
    return <SimpleAuthForm onSuccess={handleAuthSuccess} />
  }

  if (showAdmin && user.isAdmin) {
    return <AdminPanel token={token} onBack={() => setShowAdmin(false)} />
  }

  return <SimpleDashboard user={user} token={token} onLogout={handleLogout} onShowAdmin={() => setShowAdmin(true)} />
}
