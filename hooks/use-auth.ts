"use client"

import { useState, useEffect } from 'react';

export const useAuth = () => {
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    const storedToken = localStorage.getItem('cryptopay_token');
    if (storedToken) {
      setToken(storedToken);
    }
  }, []);

  const getAuthHeaders = () => {
    if (token) {
      return {
        Authorization: `Bearer ${token}`,
      };
    }
    return {};
  };

  return { token, getAuthHeaders };
};