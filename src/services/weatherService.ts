import { getAll, getById, add, getByIndex, bulkAdd, getWeatherByDate, getWeatherByDateRange as getWeatherByRange } from '../db';
import type { Weather, WeatherYieldAnalysis, Harvest, Season, WeatherCondition } from '../types';
import { createWeather } from '../db/models';
import { getSeason, sortByDate, isDateInRange, getDateRange, getYearFromDate } from '../utils/dateUtils';
import { calculateAverage, calculateCorrelation } from '../utils/calculationUtils';

export const weatherService = {
  async getAllWeather(): Promise<Weather[]> {
    const weather = await getAll('weather');
    return sortByDate(weather, 'date');
  },

  async getWeatherById(id: string): Promise<Weather | undefined> {
    return getById('weather', id);
  },

  async getWeatherByDate(date: string): Promise<Weather | undefined> {
    return getWeatherByDate(date);
  },

  async getWeatherByDateRange(startDate: string, endDate: string): Promise<Weather[]> {
    const weather = await getWeatherByRange(startDate, endDate);
    return weather.sort((a, b) => a.date.localeCompare(b.date));
  },

  async getWeatherByYear(year: number): Promise<Weather[]> {
    const weather = await this.getAllWeather();
    return weather.filter((w) => getYearFromDate(w.date) === year);
  },

  async addWeather(weatherData: Omit<Weather, 'id'>): Promise<Weather> {
    const weather = createWeather(weatherData);
    await add('weather', weather);
    return weather;
  },

  generateWeatherData(date: string): Weather {
    const d = new Date(date);
    const season = getSeason(date);
    
    let baseTemp = 15;
    let baseRain = 50;
    
    switch (season) {
      case '春':
        baseTemp = 15 + Math.random() * 10;
        baseRain = 40 + Math.random() * 30;
        break;
      case '夏':
        baseTemp = 25 + Math.random() * 10;
        baseRain = 100 + Math.random() * 50;
        break;
      case '秋':
        baseTemp = 15 + Math.random() * 10;
        baseRain = 60 + Math.random() * 40;
        break;
      case '冬':
        baseTemp = 0 + Math.random() * 10;
        baseRain = 20 + Math.random() * 20;
        break;
    }
    
    const tempVariation = Math.random() * 5 - 2.5;
    const avgTemp = baseTemp + tempVariation;
    const rainfall = Math.max(0, baseRain * (Math.random() * 0.5 + 0.25) / 30);
    
    const conditions: WeatherCondition[] = ['晴' as WeatherCondition, '多云' as WeatherCondition, '阴' as WeatherCondition, '小雨' as WeatherCondition, '中雨' as WeatherCondition, '大雨' as WeatherCondition];
    let condition = conditions[0];
    if (rainfall > 10) condition = conditions[5];
    else if (rainfall > 5) condition = conditions[4];
    else if (rainfall > 1) condition = conditions[3];
    else if (Math.random() > 0.7) condition = conditions[2];
    else if (Math.random() > 0.5) condition = conditions[1];
    
    return createWeather({
      date,
      temperature: Math.round(avgTemp * 10) / 10,
      minTemperature: Math.round((avgTemp - 5 - Math.random() * 3) * 10) / 10,
      maxTemperature: Math.round((avgTemp + 5 + Math.random() * 3) * 10) / 10,
      rainfall: Math.round(rainfall * 10) / 10,
      humidity: Math.round(50 + Math.random() * 40),
      weatherCondition: condition,
    });
  },

  async generateWeatherForDateRange(startDate: string, endDate: string): Promise<Weather[]> {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const weatherList: Weather[] = [];
    
    const current = new Date(start);
    while (current <= end) {
      const dateStr = current.toISOString().split('T')[0];
      const existing = await this.getWeatherByDate(dateStr);
      
      if (!existing) {
        weatherList.push(this.generateWeatherData(dateStr));
      }
      
      current.setDate(current.getDate() + 1);
    }
    
    if (weatherList.length > 0) {
      await bulkAdd('weather', weatherList);
    }
    
    return this.getWeatherByDateRange(startDate, endDate);
  },

  async generateWeatherForYear(year: number): Promise<Weather[]> {
    const startDate = `${year}-01-01`;
    const endDate = `${year}-12-31`;
    return this.generateWeatherForDateRange(startDate, endDate);
  },

  async getRecentWeather(days: number = 7): Promise<Weather[]> {
    const { startDate, endDate } = getDateRange(days);
    return this.getWeatherByDateRange(startDate, endDate);
  },

  async getWeatherStats(startDate: string, endDate: string): Promise<{
    avgTemperature: number;
    minTemperature: number;
    maxTemperature: number;
    totalRainfall: number;
    avgHumidity: number;
    rainyDays: number;
    sunnyDays: number;
    avgTemperatureByMonth: Record<string, number>;
    totalRainfallByMonth: Record<string, number>;
  }> {
    const weather = await this.getWeatherByDateRange(startDate, endDate);
    
    if (weather.length === 0) {
      return {
        avgTemperature: 0,
        minTemperature: 0,
        maxTemperature: 0,
        totalRainfall: 0,
        avgHumidity: 0,
        rainyDays: 0,
        sunnyDays: 0,
        avgTemperatureByMonth: {},
        totalRainfallByMonth: {},
      };
    }
    
    const temperatures = weather.map((w) => w.temperature);
    const minTemps = weather.map((w) => w.minTemperature);
    const maxTemps = weather.map((w) => w.maxTemperature);
    const rainfalls = weather.map((w) => w.rainfall);
    const humidities = weather.map((w) => w.humidity);
    
    const avgTemperatureByMonth: Record<string, number> = {};
    const totalRainfallByMonth: Record<string, number> = {};
    const tempByMonth: Record<string, number[]> = {};
    
    weather.forEach((w) => {
      const month = w.date.substring(0, 7);
      if (!tempByMonth[month]) {
        tempByMonth[month] = [];
      }
      tempByMonth[month].push(w.temperature);
      totalRainfallByMonth[month] = (totalRainfallByMonth[month] || 0) + w.rainfall;
    });
    
    Object.entries(tempByMonth).forEach(([month, temps]) => {
      avgTemperatureByMonth[month] = calculateAverage(temps);
    });
    
    return {
      avgTemperature: Math.round(calculateAverage(temperatures) * 10) / 10,
      minTemperature: Math.round(Math.min(...minTemps) * 10) / 10,
      maxTemperature: Math.round(Math.max(...maxTemps) * 10) / 10,
      totalRainfall: Math.round(rainfalls.reduce((sum, r) => sum + r, 0) * 10) / 10,
      avgHumidity: Math.round(calculateAverage(humidities) * 10) / 10,
      rainyDays: weather.filter((w) => w.rainfall > 0).length,
      sunnyDays: weather.filter((w) => w.weatherCondition === '晴').length,
      avgTemperatureByMonth,
      totalRainfallByMonth,
    };
  },

  async getOperationWeather(operationDate: string): Promise<Weather | undefined> {
    return this.getWeatherByDate(operationDate);
  },

  async generateWeatherYieldAnalysis(
    seasonId: string,
    harvests: Harvest[],
    seasons: Season[]
  ): Promise<WeatherYieldAnalysis[]> {
    const season = seasons.find((s) => s.id === seasonId);
    if (!season) return [];
    
    const seasonHarvests = harvests.filter((h) => h.seasonId === seasonId);
    if (seasonHarvests.length === 0) return [];
    
    const weather = await this.getWeatherByDateRange(season.sowDate, seasonHarvests[0].harvestDate);
    
    const analysis: WeatherYieldAnalysis[] = [];
    const totalYield = seasonHarvests.reduce((sum, h) => sum + h.actualYield, 0);
    const days = weather.length;
    
    weather.forEach((w, index) => {
      const yieldPortion = totalYield / days;
      analysis.push({
        date: w.date,
        temperature: w.temperature,
        rainfall: w.rainfall,
        yield: Math.round(yieldPortion * 100) / 100,
      });
    });
    
    return analysis;
  },

  async analyzeWeatherYieldCorrelation(
    seasonId: string,
    harvests: Harvest[],
    seasons: Season[]
  ): Promise<{
    temperatureCorrelation: number;
    rainfallCorrelation: number;
    analysis: WeatherYieldAnalysis[];
  }> {
    const analysis = await this.generateWeatherYieldAnalysis(seasonId, harvests, seasons);
    
    if (analysis.length === 0) {
      return {
        temperatureCorrelation: 0,
        rainfallCorrelation: 0,
        analysis: [],
      };
    }
    
    const temperatures = analysis.map((a) => a.temperature);
    const rainfalls = analysis.map((a) => a.rainfall);
    const yields = analysis.map((a) => a.yield);
    
    return {
      temperatureCorrelation: Math.round(calculateCorrelation(temperatures, yields) * 1000) / 1000,
      rainfallCorrelation: Math.round(calculateCorrelation(rainfalls, yields) * 1000) / 1000,
      analysis,
    };
  },

  async getWeatherYears(): Promise<number[]> {
    const weather = await this.getAllWeather();
    const years = new Set<number>(weather.map((w) => getYearFromDate(w.date)));
    return Array.from(years).sort((a, b) => b - a);
  },

  async getTodayWeather(): Promise<Weather | undefined> {
    const today = new Date().toISOString().split('T')[0];
    let weather = await this.getWeatherByDate(today);
    
    if (!weather) {
      weather = this.generateWeatherData(today);
      await this.addWeather(weather);
    }
    
    return weather;
  },

  async getWeatherForecast(days: number = 7): Promise<Weather[]> {
    const forecast: Weather[] = [];
    const today = new Date();
    
    for (let i = 0; i < days; i++) {
      const date = new Date(today);
      date.setDate(date.getDate() + i);
      const dateStr = date.toISOString().split('T')[0];
      forecast.push(this.generateWeatherData(dateStr));
    }
    
    return forecast;
  },

  async getSeasonalWeatherSummary(year: number): Promise<Array<{
    season: string;
    avgTemperature: number;
    totalRainfall: number;
    avgHumidity: number;
    rainyDays: number;
  }>> {
    const weather = await this.getWeatherByYear(year);
    
    const seasons = ['春', '夏', '秋', '冬'];
    const seasonMonths: Record<string, number[]> = {
      '春': [2, 3, 4],
      '夏': [5, 6, 7],
      '秋': [8, 9, 10],
      '冬': [11, 0, 1],
    };
    
    const summary: Array<{
      season: string;
      avgTemperature: number;
      totalRainfall: number;
      avgHumidity: number;
      rainyDays: number;
    }> = [];
    
    for (const season of seasons) {
      const seasonWeather = weather.filter((w) => {
        const month = new Date(w.date).getMonth();
        return seasonMonths[season].includes(month);
      });
      
      if (seasonWeather.length > 0) {
        summary.push({
          season,
          avgTemperature: Math.round(calculateAverage(seasonWeather.map((w) => w.temperature)) * 10) / 10,
          totalRainfall: Math.round(seasonWeather.reduce((sum, w) => sum + w.rainfall, 0) * 10) / 10,
          avgHumidity: Math.round(calculateAverage(seasonWeather.map((w) => w.humidity)) * 10) / 10,
          rainyDays: seasonWeather.filter((w) => w.rainfall > 0).length,
        });
      }
    }
    
    return summary;
  },
};
