import { NextResponse } from 'next/server';

export async function GET() {
  // In a real application, you would fetch live crypto prices from an external API
  // For now, we'll return mock data.
  const livePrices = {
    BTC: { usd: 67500.00, usd_24h_change: 1.5 },
    ETH: { usd: 3800.00, usd_24h_change: -0.5 },
    SOL: { usd: 170.00, usd_24h_change: 2.3 },
    DOGE: { usd: 0.16, usd_24h_change: -3.2 },
  };

  return NextResponse.json(livePrices);
}