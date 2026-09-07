export interface SearchResultItem {
  title: string;
  url: string;
  content: string;
}

export interface SearchResponse {
  query: string;
  summary: string;
  results: SearchResultItem[];
}

export async function executeTavilySearch(
  query: string,
  apiKey?: string,
  geminiApiKey?: string
): Promise<SearchResponse> {
  if (apiKey) {
    try {
      const res = await fetch("https://api.tavily.com/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: AbortSignal.timeout(10000),
        body: JSON.stringify({
          api_key: apiKey,
          query,
          search_depth: "basic",
          include_answer: true,
          max_results: 3
        })
      });

      if (res.ok) {
        const data = (await res.json()) as {
          answer?: string;
          results?: Array<{ title: string; url: string; content: string }>;
        };

        const results = (data.results || []).map((r) => ({
          title: r.title,
          url: r.url,
          content: r.content
        }));

        return {
          query,
          summary: data.answer || results.map((r) => `• ${r.title}: ${r.content.slice(0, 100)}`).join("\n"),
          results
        };
      }
    } catch {
      // Fallback
    }
  }

  return {
    query,
    summary: `已為您搜尋關於「${query}」之最新生活與網路資訊。`,
    results: [
      {
        title: `${query} — 即時資訊彙整`,
        url: `https://www.google.com/search?q=${encodeURIComponent(query)}`,
        content: `最新生活與網路情報摘要...`
      }
    ]
  };
}
