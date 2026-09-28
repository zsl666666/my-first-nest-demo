// src/mcp-server/tools/weather.tool.ts
// 天气查询工具

interface WeatherDataItemObj {
  temp: number;
  weather: string;
  humidity: number;
  windSpeed: string;
}

type City = "北京" | "上海" | "广州" | "深圳" | "杭州";

export const handleWeatherQuery = (args: any): Promise<string> => {

}
