"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { CheckCircle, XCircle, Loader2 } from "lucide-react"

export function TestConnection() {
  const [isLoading, setIsLoading] = useState(false)
  const [result, setResult] = useState<any>(null)

  const testConnection = async () => {
    setIsLoading(true)
    setResult(null)

    try {
      const response = await fetch("/api/test")
      const data = await response.json()
      setResult(data)
    } catch (error) {
      setResult({
        success: false,
        error: "Failed to connect to server",
        details: error instanceof Error ? error.message : "Unknown error",
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle>Database Connection Test</CardTitle>
        <CardDescription>Test the database connection and setup</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Button onClick={testConnection} disabled={isLoading} className="w-full">
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Testing...
            </>
          ) : (
            "Test Connection"
          )}
        </Button>

        {result && (
          <div className="space-y-2">
            <div className={`flex items-center space-x-2 ${result.success ? "text-green-600" : "text-red-600"}`}>
              {result.success ? <CheckCircle className="h-5 w-5" /> : <XCircle className="h-5 w-5" />}
              <span className="font-medium">{result.success ? "Connection Successful" : "Connection Failed"}</span>
            </div>

            {result.success && result.data && (
              <div className="text-sm text-gray-600 space-y-1">
                <div>Users: {result.data.userCount}</div>
                <div>Crypto Prices: {result.data.cryptoPricesCount}</div>
                {result.data.sampleUser && <div>Sample User: {result.data.sampleUser.email}</div>}
              </div>
            )}

            {!result.success && (
              <div className="text-sm text-red-600">
                <div>Error: {result.error}</div>
                {result.details && <div>Details: {result.details}</div>}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
