import { NextResponse } from 'next/server';
import { binanceAPI } from '@/lib/binance-api';

export async function GET() {
  try {
    // Fetch live crypto prices from Binance API
    const cryptoPrices = await binanceAPI.getCryptoPrices();
    
    // Format the response to match the expected structure
    const livePrices: Record<string, { usd: number, usd_24h_change: number }> = {};
    
    // Process each cryptocurrency
    cryptoPrices.forEach(crypto => {
      livePrices[crypto.symbol] = {
        usd: crypto.price_usd,
        usd_24h_change: crypto.change_24h
      };
    });
    
    // If no prices were returned, use fallback data
    if (Object.keys(livePrices).length === 0) {
      console.warn('No crypto prices returned from API, using fallback data');
      return NextResponse.json({
        BTC: { usd: 121854.72, usd_24h_change: 1.5 },
        ETH: { usd: 3800.00, usd_24h_change: -0.5 },
        SOL: { usd: 170.00, usd_24h_change: 2.3 },
        DOGE: { usd: 0.16, usd_24h_change: -3.2 },
      });
    }
    
    return NextResponse.json(livePrices);
  } catch (error) {
    console.error('Error fetching live crypto prices:', error);
    
    // Return fallback data in case of error
    return NextResponse.json({
      BTC: { usd: 121854.72, usd_24h_change: 1.5 },
      ETH: { usd: 3800.00, usd_24h_change: -0.5 },
      SOL: { usd: 170.00, usd_24h_change: 2.3 },
      DOGE: { usd: 0.16, usd_24h_change: -3.2 },
    });
  }
}