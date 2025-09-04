'use client';

import React, { useState } from 'react';
import CashfreeCardForm from '@/components/cashfree-card-form';

export default function TestCashfreePage() {
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const testDirectApi = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch('/api/cashfree/create-order', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          amount: 100,
          currency: 'INR',
          customer_id: 'cust_' + Date.now(),
          customer_email: 'test@example.com',
          customer_phone: '9999999999'
        }),
      });

      const data = await response.json();
      setResult(data);
      
      if (!response.ok) {
        setError(`API Error: ${data.error || 'Unknown error'}`);
      }
    } catch (err: any) {
      setError(`Request Error: ${err.message}`);
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Cashfree Integration Test</h1>
      
      <div className="mb-8 p-4 border rounded">
        <h2 className="text-xl font-semibold mb-2">Test Direct API Call</h2>
        <button 
          onClick={testDirectApi}
          disabled={loading}
          className="px-4 py-2 bg-blue-500 text-white rounded disabled:bg-gray-400"
        >
          {loading ? 'Loading...' : 'Test API'}
        </button>
        
        {error && (
          <div className="mt-4 p-3 bg-red-100 text-red-700 rounded">
            {error}
          </div>
        )}
        
        {result && (
          <div className="mt-4">
            <h3 className="font-semibold">API Response:</h3>
            <pre className="p-3 bg-gray-100 rounded overflow-auto max-h-60 text-sm">
              {JSON.stringify(result, null, 2)}
            </pre>
          </div>
        )}
      </div>
      
      <div className="p-4 border rounded">
        <h2 className="text-xl font-semibold mb-2">Cashfree Card Form Component</h2>
        <CashfreeCardForm 
          user={{ email: 'test@example.com', phone: '9999999999' }}
          onSuccess={() => alert('Payment successful!')}
        />
      </div>
    </div>
  );
}