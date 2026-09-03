export interface MarketQuote {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
}

export interface CryptoQuote {
  symbol: string;
  name: string;
  priceUsd: number;
  priceTwd: number;
  changePercent24h: number;
}

export interface GlobalFinanceSummary {
  usStocks: MarketQuote[];
  twStocks: MarketQuote[];
  crypto: CryptoQuote[];
}

/**
 * Fetch stock quotes via Yahoo Finance public chart API.
 */
export async function fetchStockQuote(symbol: string, displayName: string): Promise<MarketQuote | null> {
  try {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d&range=1d`;
    const res = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)" },
      signal: AbortSignal.timeout(6000)
    });

    if (!res.ok) return null;

    const data = (await res.json()) as {
      chart?: {
        result?: Array<{
          meta?: {
            regularMarketPrice?: number;
            chartPreviousClose?: number;
            previousClose?: number;
          };
        }>;
      };
    };

    const meta = data.chart?.result?.[0]?.meta;
    if (!meta || typeof meta.regularMarketPrice !== "number") return null;

    const price = meta.regularMarketPrice;
    const prevClose = meta.chartPreviousClose || meta.previousClose || price;
    const change = price - prevClose;
    const changePercent = prevClose ? (change / prevClose) * 100 : 0;

    return {
      symbol,
      name: displayName,
      price: Number(price.toFixed(2)),
      change: Number(change.toFixed(2)),
      changePercent: Number(changePercent.toFixed(2))
    };
  } catch (err) {
    console.warn(`[FinanceData] Failed to fetch quote for ${symbol}:`, err);
    return null;
  }
}

/**
 * Fetch major Crypto prices (BTC & ETH) via CoinGecko public API.
 */
export async function fetchCryptoQuotes(): Promise<CryptoQuote[]> {
  try {
    const url = "https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum&vs_currencies=usd,twd&include_24hr_change=true";
    const res = await fetch(url, {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(6000)
    });

    if (!res.ok) return getFallbackCrypto();

    const data = (await res.json()) as {
      bitcoin?: { usd: number; twd: number; usd_24h_change: number };
      ethereum?: { usd: number; twd: number; usd_24h_change: number };
    };

    const quotes: CryptoQuote[] = [];

    if (data.bitcoin) {
      quotes.push({
        symbol: "BTC",
        name: "比特幣",
        priceUsd: Math.round(data.bitcoin.usd),
        priceTwd: Math.round(data.bitcoin.twd),
        changePercent24h: Number(data.bitcoin.usd_24h_change.toFixed(2))
      });
    }

    if (data.ethereum) {
      quotes.push({
        symbol: "ETH",
        name: "以太坊",
        priceUsd: Math.round(data.ethereum.usd),
        priceTwd: Math.round(data.ethereum.twd),
        changePercent24h: Number(data.ethereum.usd_24h_change.toFixed(2))
      });
    }

    return quotes.length > 0 ? quotes : getFallbackCrypto();
  } catch (err) {
    console.warn("[FinanceData] CoinGecko API failed, using fallback:", err);
    return getFallbackCrypto();
  }
}

function getFallbackCrypto(): CryptoQuote[] {
  return [
    { symbol: "BTC", name: "比特幣", priceUsd: 78500, priceTwd: 2490000, changePercent24h: 0.5 },
    { symbol: "ETH", name: "以太坊", priceUsd: 2420, priceTwd: 76800, changePercent24h: -0.3 }
  ];
}

/**
 * Fetch full morning finance snapshot (US Stocks + Crypto).
 */
export async function fetchMorningFinanceSnapshot(): Promise<{ usStocks: MarketQuote[]; crypto: CryptoQuote[] }> {
  const stockTargets = [
    { sym: "^IXIC", name: "那斯達克" },
    { sym: "^GSPC", name: "標普 500" },
    { sym: "TSM", name: "台積電 ADR" },
    { sym: "NVDA", name: "輝達 (NVDA)" }
  ];

  const stockPromises = stockTargets.map((t) => fetchStockQuote(t.sym, t.name));
  const [cryptoQuotes, ...stockResults] = await Promise.all([
    fetchCryptoQuotes(),
    ...stockPromises
  ]);

  const validStocks = stockResults.filter((s): s is MarketQuote => s !== null);

  return {
    usStocks: validStocks,
    crypto: cryptoQuotes
  };
}

/**
 * Fetch Taiwan Stock closing snapshot (加權指數, 台積電 2330, 聯發科 2454).
 */
export async function fetchTaiwanStockSnapshot(): Promise<MarketQuote[]> {
  const twTargets = [
    { sym: "^TWII", name: "加權指數" },
    { sym: "2330.TW", name: "台積電" },
    { sym: "2454.TW", name: "聯發科" }
  ];

  const results = await Promise.all(twTargets.map((t) => fetchStockQuote(t.sym, t.name)));
  return results.filter((s): s is MarketQuote => s !== null);
}
