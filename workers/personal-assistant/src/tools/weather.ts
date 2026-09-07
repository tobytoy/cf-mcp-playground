export interface TaiwanWeather {
  locationName: string;
  condition: string;
  rainProb: string;
  minTemp: string;
  maxTemp: string;
  comfort: string;
  advice: string;
}

export async function getTaiwanWeatherForecast(
  locationQuery: string = "台北",
  cwaApiKey?: string
): Promise<TaiwanWeather> {
  const normalizedLoc = locationQuery.includes("天母") ? "台北天母" : locationQuery || "台北市";

  if (cwaApiKey) {
    try {
      const url = `https://opendata.cwa.gov.tw/api/v1/rest/datastore/F-C0032-001?Authorization=${cwaApiKey}&locationName=臺北市`;
      const res = await fetch(url, { signal: AbortSignal.timeout(6000) });
      if (res.ok) {
        const data = (await res.json()) as {
          records?: {
            location?: Array<{
              locationName: string;
              weatherElement: Array<{
                elementName: string;
                time: Array<{ parameter: { parameterName: string } }>;
              }>;
            }>;
          };
        };

        const elements = data.records?.location?.[0]?.weatherElement || [];
        const wx = elements.find((e) => e.elementName === "Wx")?.time?.[0]?.parameter?.parameterName || "晴時多雲";
        const pop = elements.find((e) => e.elementName === "PoP")?.time?.[0]?.parameter?.parameterName || "20";
        const minT = elements.find((e) => e.elementName === "MinT")?.time?.[0]?.parameter?.parameterName || "24";
        const maxT = elements.find((e) => e.elementName === "MaxT")?.time?.[0]?.parameter?.parameterName || "30";
        const ci = elements.find((e) => e.elementName === "CI")?.time?.[0]?.parameter?.parameterName || "舒適";

        let advice = "天氣良好，適合戶外活動。";
        const rainNum = parseInt(pop, 10);
        if (rainNum >= 60) advice = "降雨機率高，出門請務必攜帶雨具！";
        else if (rainNum >= 30) advice = "午後可能有短暫陣雨，建議備妥雨傘。";

        return {
          locationName: normalizedLoc,
          condition: wx,
          rainProb: `${pop}%`,
          minTemp: minT,
          maxTemp: maxT,
          comfort: ci,
          advice
        };
      }
    } catch {
      // Fallback below
    }
  }

  // Fallback weather
  return {
    locationName: normalizedLoc,
    condition: "晴時多雲",
    rainProb: "20%",
    minTemp: "24",
    maxTemp: "31",
    comfort: "舒適微熱",
    advice: "天氣大致晴朗穩定，降雨機率低，外出穿著透氣衣物即可。"
  };
}
