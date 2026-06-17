import { useState, useEffect, useMemo } from 'react';
import {
  Sun,
  Cloud,
  CloudRain,
  CloudSnow,
  Wind,
  Droplets,
  Thermometer,
  CloudLightning,
  Calendar,
  TrendingUp,
  AlertTriangle,
  Search,
  Info,
} from 'lucide-react';
import type { Weather, WeatherCondition, Operation, Harvest, Season } from '@/types';
import { weatherService } from '@/services/weatherService';
import { allMockData } from '@/data/mockData';
import { calculateCorrelation, formatPercentage } from '@/utils/calculationUtils';
import { formatDate } from '@/utils/dateUtils';
import Card from '@/components/Common/Card';
import LineChart from '@/components/Charts/LineChart';
import BarChart from '@/components/Charts/BarChart';
import { cn } from '@/lib/utils';

const weatherIcons: Record<WeatherCondition, typeof Sun> = {
  晴: Sun,
  多云: Cloud,
  阴: Cloud,
  小雨: CloudRain,
  中雨: CloudRain,
  大雨: CloudRain,
  暴雨: CloudLightning,
  雷阵雨: CloudLightning,
  雪: CloudSnow,
  冰雹: CloudLightning,
  雾: Cloud,
};

const weatherColors: Record<WeatherCondition, string> = {
  晴: 'text-yellow-500',
  多云: 'text-gray-500',
  阴: 'text-gray-600',
  小雨: 'text-blue-400',
  中雨: 'text-blue-500',
  大雨: 'text-blue-600',
  暴雨: 'text-blue-700',
  雷阵雨: 'text-purple-500',
  雪: 'text-cyan-300',
  冰雹: 'text-gray-400',
  雾: 'text-gray-400',
};

const weatherBgColors: Record<WeatherCondition, string> = {
  晴: 'from-yellow-400 to-orange-400',
  多云: 'from-gray-400 to-gray-500',
  阴: 'from-gray-500 to-gray-600',
  小雨: 'from-blue-400 to-blue-500',
  中雨: 'from-blue-500 to-blue-600',
  大雨: 'from-blue-600 to-blue-700',
  暴雨: 'from-blue-700 to-purple-600',
  雷阵雨: 'from-purple-500 to-blue-600',
  雪: 'from-cyan-200 to-blue-300',
  冰雹: 'from-gray-400 to-gray-500',
  雾: 'from-gray-300 to-gray-400',
};

export default function Weather() {
  const { operations, harvests, seasons } = allMockData;

  const [todayWeather, setTodayWeather] = useState<Weather | null>(null);
  const [forecast, setForecast] = useState<Weather[]>([]);
  const [historyWeather, setHistoryWeather] = useState<Weather[]>([]);
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [searchedWeather, setSearchedWeather] = useState<Weather | null>(null);
  const [isSearching, setIsSearching] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      const today = await weatherService.getTodayWeather();
      const forecastData = await weatherService.getWeatherForecast(7);
      const { startDate, endDate } = getDateRange(30);
      const history = await weatherService.getWeatherByDateRange(startDate, endDate);

      setTodayWeather(today || null);
      setForecast(forecastData);
      setHistoryWeather(history);
    };

    loadData();
  }, []);

  const getDateRange = (days: number) => {
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - days);
    return {
      startDate: start.toISOString().split('T')[0],
      endDate: end.toISOString().split('T')[0],
    };
  };

  const handleSearch = async () => {
    setIsSearching(true);
    try {
      const result = await weatherService.getWeatherByDate(selectedDate);
      setSearchedWeather(result || null);
    } finally {
      setIsSearching(false);
    }
  };

  const tempTrendData = useMemo(() => {
    return historyWeather.map((w) => ({
      name: w.date.slice(5),
      最高温: w.maxTemperature,
      最低温: w.minTemperature,
      平均温: w.temperature,
    }));
  }, [historyWeather]);

  const rainfallTrendData = useMemo(() => {
    return historyWeather.map((w) => ({
      name: w.date.slice(5),
      降雨量: w.rainfall,
    }));
  }, [historyWeather]);

  const weatherOperationData = useMemo(() => {
    const operationDates = new Set(operations.map((op) => op.date));
    const harvestDates = new Set(harvests.map((h) => h.harvestDate));

    return historyWeather.slice(-15).map((w) => {
      const dayOps = operations.filter((op) => op.date === w.date).length;
      const hasHarvest = harvestDates.has(w.date);
      return {
        name: w.date.slice(5),
        温度: w.temperature,
        降雨量: w.rainfall,
        农事操作: dayOps * 20,
        收获: hasHarvest ? 50 : 0,
      };
    });
  }, [historyWeather, operations, harvests]);

  const weatherYieldCorrelation = useMemo(() => {
    const completedSeasons = seasons.filter((s) => s.status === '已采收');
    const correlations = completedSeasons.slice(0, 3).map((season) => {
      const seasonHarvests = harvests.filter((h) => h.seasonId === season.id);
      if (seasonHarvests.length === 0) return null;

      const seasonWeathers = historyWeather.filter((w) =>
        w.date >= season.sowDate && w.date <= seasonHarvests[0].harvestDate
      );

      if (seasonWeathers.length < 10) return null;

      const totalYield = seasonHarvests.reduce((sum, h) => sum + h.actualYield, 0);
      const dailyYield = totalYield / seasonWeathers.length;

      const temps = seasonWeathers.map((w) => w.temperature);
      const rains = seasonWeathers.map((w) => w.rainfall);
      const yields = seasonWeathers.map(() => dailyYield);

      return {
        cropName: season.cropName,
        temperatureCorrelation: calculateCorrelation(temps, yields),
        rainfallCorrelation: calculateCorrelation(rains, yields),
        data: seasonWeathers.slice(-20).map((w, i) => ({
          name: w.date.slice(5),
          温度: w.temperature,
          降雨量: w.rainfall,
          产量趋势: yields[i] / 10,
        })),
      };
    }).filter(Boolean);

    return correlations;
  }, [seasons, harvests, historyWeather]);

  const analysisConclusions = useMemo(() => {
    if (todayWeather) {
      const conclusions = [];

      if (todayWeather.temperature > 30) {
        conclusions.push({
          level: 'warning' as const,
          title: '高温预警',
          content: `当前气温${todayWeather.temperature}℃，建议加强灌溉，防止作物受旱。`,
        });
      }

      if (todayWeather.rainfall > 10) {
        conclusions.push({
          level: 'info' as const,
          title: '降雨提示',
          content: `今日有${todayWeather.rainfall.toFixed(1)}mm降雨，注意田间排水，防止涝害。`,
        });
      }

      if (todayWeather.humidity > 80) {
        conclusions.push({
          level: 'warning' as const,
          title: '高湿预警',
          content: `当前湿度${todayWeather.humidity}%，高湿环境易引发病害，建议加强病害监测。`,
        });
      }

      const avgTempLast7 = historyWeather.slice(-7).reduce((sum, w) => sum + w.temperature, 0) / 7;
      if (avgTempLast7 < 10 && todayWeather.temperature > 15) {
        conclusions.push({
          level: 'info' as const,
          title: '气温回升',
          content: '近期气温回升明显，有利于作物生长，可适当增加施肥量。',
        });
      }

      if (conclusions.length === 0) {
        conclusions.push({
          level: 'info' as const,
          title: '天气适宜',
          content: '当前天气条件良好，适合进行田间管理作业。',
        });
      }

      return conclusions;
    }
    return [];
  }, [todayWeather, historyWeather]);

  const WeatherIcon = ({ condition, className }: { condition: WeatherCondition; className?: string }) => {
    const Icon = weatherIcons[condition] || Sun;
    return <Icon className={cn(className, weatherColors[condition])} />;
  };

  const getWindLevel = (temp: number): string => {
    const level = Math.round((temp % 5) + 2);
    return `${level}级`;
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">气象信息</h1>
          <p className="text-gray-500 mt-1">实时监控气象数据，科学指导农业生产</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-xl px-3 py-2">
            <Calendar className="w-4 h-4 text-gray-500" />
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="text-sm border-none outline-none bg-transparent w-36"
            />
            <button
              onClick={handleSearch}
              disabled={isSearching}
              className="flex items-center gap-1 px-3 py-1 bg-farm-500 text-white rounded-lg text-sm hover:bg-farm-600 transition-colors disabled:opacity-50"
            >
              <Search className="w-4 h-4" />
              查询
            </button>
          </div>
        </div>
      </div>

      {searchedWeather && (
        <Card className="bg-gradient-to-r from-sky-50 to-blue-50 border-sky-200">
          <Card.Content>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center shadow-sm">
                  <Calendar className="w-6 h-6 text-sky-500" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">历史气象查询</p>
                  <p className="text-lg font-semibold text-gray-900">
                    {formatDate(searchedWeather.date)}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-8">
                <div className="text-center">
                  <p className="text-2xl font-bold text-gray-900">{searchedWeather.temperature}°C</p>
                  <p className="text-sm text-gray-500">{searchedWeather.weatherCondition}</p>
                </div>
                <div className="text-center">
                  <p className="text-sm text-gray-500">湿度</p>
                  <p className="text-lg font-semibold text-gray-900">{searchedWeather.humidity}%</p>
                </div>
                <div className="text-center">
                  <p className="text-sm text-gray-500">降雨</p>
                  <p className="text-lg font-semibold text-gray-900">{searchedWeather.rainfall}mm</p>
                </div>
              </div>
            </div>
          </Card.Content>
        </Card>
      )}

      {todayWeather && (
        <Card className={cn('overflow-hidden bg-gradient-to-br', weatherBgColors[todayWeather.weatherCondition])}>
          <Card.Content className="text-white">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
              <div className="flex items-center gap-6">
                <div className="w-24 h-24 bg-white/20 rounded-3xl flex items-center justify-center backdrop-blur-sm">
                  <WeatherIcon condition={todayWeather.weatherCondition} className="w-14 h-14 text-white" />
                </div>
                <div>
                  <p className="text-white/80 text-sm mb-1">
                    {formatDate(todayWeather.date)} · {todayWeather.weatherCondition}
                  </p>
                  <p className="text-6xl font-bold mb-2">
                    {todayWeather.temperature}
                    <span className="text-3xl">°C</span>
                  </p>
                  <p className="text-white/80 text-sm">
                    最高 {todayWeather.maxTemperature}°C / 最低 {todayWeather.minTemperature}°C
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-6">
                <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-4 text-center">
                  <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center mx-auto mb-2">
                    <Droplets className="w-5 h-5 text-white" />
                  </div>
                  <p className="text-white/70 text-xs mb-1">湿度</p>
                  <p className="text-2xl font-bold">{todayWeather.humidity}%</p>
                </div>
                <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-4 text-center">
                  <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center mx-auto mb-2">
                    <Wind className="w-5 h-5 text-white" />
                  </div>
                  <p className="text-white/70 text-xs mb-1">风力</p>
                  <p className="text-2xl font-bold">{getWindLevel(todayWeather.temperature)}</p>
                </div>
                <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-4 text-center">
                  <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center mx-auto mb-2">
                    <CloudRain className="w-5 h-5 text-white" />
                  </div>
                  <p className="text-white/70 text-xs mb-1">降雨量</p>
                  <p className="text-2xl font-bold">{todayWeather.rainfall.toFixed(1)}mm</p>
                </div>
              </div>
            </div>
          </Card.Content>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <Card.Header>
            <h3 className="text-lg font-semibold text-gray-900">7日天气预报</h3>
            <p className="text-sm text-gray-500">未来一周天气趋势</p>
          </Card.Header>
          <Card.Content>
            <div className="grid grid-cols-7 gap-2">
              {forecast.map((day, index) => {
                const dayNames = ['今天', '明天', '后天', '周四', '周五', '周六', '周日'];
                const dayName = index < 3 ? dayNames[index] : new Date(day.date).toLocaleDateString('zh-CN', { weekday: 'short' });
                return (
                  <div
                    key={day.date}
                    className={cn(
                      'flex flex-col items-center p-3 rounded-xl transition-all',
                      index === 0
                        ? 'bg-farm-50 border border-farm-200'
                        : 'bg-gray-50 hover:bg-gray-100'
                    )}
                  >
                    <p className={cn('text-xs font-medium mb-2', index === 0 ? 'text-farm-600' : 'text-gray-500')}>
                      {dayName}
                    </p>
                    <WeatherIcon condition={day.weatherCondition} className="w-8 h-8 mb-2" />
                    <p className="text-xs text-gray-500 mb-1">{day.weatherCondition}</p>
                    <p className="text-sm font-bold text-gray-900">{day.temperature.toFixed(0)}°</p>
                    <p className="text-xs text-gray-400">{day.minTemperature.toFixed(0)}°</p>
                  </div>
                );
              })}
            </div>
          </Card.Content>
        </Card>

        <Card>
          <Card.Header>
            <div className="flex items-center gap-2">
              <Info className="w-5 h-5 text-sky-500" />
              <h3 className="text-lg font-semibold text-gray-900">分析结论与建议</h3>
            </div>
            <p className="text-sm text-gray-500">基于气象数据的种植建议</p>
          </Card.Header>
          <Card.Content>
            <div className="space-y-3">
              {analysisConclusions.map((conclusion, index) => (
                <div
                  key={index}
                  className={cn(
                    'flex items-start gap-3 p-3 rounded-xl',
                    conclusion.level === 'warning'
                      ? 'bg-amber-50 border border-amber-200'
                      : 'bg-sky-50 border border-sky-200'
                  )}
                >
                  {conclusion.level === 'warning' ? (
                    <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
                  ) : (
                    <Info className="w-5 h-5 text-sky-500 flex-shrink-0 mt-0.5" />
                  )}
                  <div>
                    <p className={cn(
                      'font-medium text-sm',
                      conclusion.level === 'warning' ? 'text-amber-700' : 'text-sky-700'
                    )}>
                      {conclusion.title}
                    </p>
                    <p className="text-sm text-gray-600 mt-0.5">{conclusion.content}</p>
                  </div>
                </div>
              ))}
            </div>
          </Card.Content>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <Card.Header>
            <div className="flex items-center gap-2">
              <Thermometer className="w-5 h-5 text-red-500" />
              <h3 className="text-lg font-semibold text-gray-900">温度趋势</h3>
            </div>
            <p className="text-sm text-gray-500">最近30天温度变化</p>
          </Card.Header>
          <Card.Content>
            <LineChart
              data={tempTrendData}
              lines={[
                { dataKey: '最高温', name: '最高温', color: '#ef4444', strokeWidth: 2 },
                { dataKey: '平均温', name: '平均温', color: '#22c55e', strokeWidth: 2 },
                { dataKey: '最低温', name: '最低温', color: '#3b82f6', strokeWidth: 2 },
              ]}
              height={280}
            />
          </Card.Content>
        </Card>

        <Card>
          <Card.Header>
            <div className="flex items-center gap-2">
              <CloudRain className="w-5 h-5 text-blue-500" />
              <h3 className="text-lg font-semibold text-gray-900">降雨量趋势</h3>
            </div>
            <p className="text-sm text-gray-500">最近30天降雨量统计（mm）</p>
          </Card.Header>
          <Card.Content>
            <BarChart
              data={rainfallTrendData}
              bars={[{ dataKey: '降雨量', name: '降雨量', color: '#3b82f6' }]}
              height={280}
              showLegend={false}
            />
          </Card.Content>
        </Card>
      </div>

      <Card>
        <Card.Header>
          <div className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-farm-500" />
            <h3 className="text-lg font-semibold text-gray-900">气象与农事关联分析</h3>
          </div>
          <p className="text-sm text-gray-500">温度、降雨与农事操作的关联趋势</p>
        </Card.Header>
        <Card.Content>
          <LineChart
            data={weatherOperationData}
            lines={[
              { dataKey: '温度', name: '温度(°C)', color: '#ef4444', strokeWidth: 2 },
              { dataKey: '降雨量', name: '降雨量(mm)', color: '#3b82f6', strokeWidth: 2 },
              { dataKey: '农事操作', name: '农事操作(次)', color: '#22c55e', strokeWidth: 2 },
              { dataKey: '收获', name: '收获', color: '#f59e0b', strokeWidth: 2 },
            ]}
            height={320}
          />
        </Card.Content>
      </Card>

      {weatherYieldCorrelation.map((item, index) => (
        item && (
          <Card key={index}>
            <Card.Header>
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <Thermometer className="w-5 h-5 text-farm-500" />
                    <h3 className="text-lg font-semibold text-gray-900">
                      {item.cropName} - 气象与产量关联分析
                    </h3>
                  </div>
                  <p className="text-sm text-gray-500 mt-1">
                    温度相关系数：
                    <span className={cn(
                      'font-medium ml-1',
                      item.temperatureCorrelation > 0.3 ? 'text-green-600' :
                      item.temperatureCorrelation < -0.3 ? 'text-red-600' : 'text-gray-600'
                    )}>
                      {formatPercentage(item.temperatureCorrelation * 100)}
                    </span>
                    <span className="mx-2">|</span>
                    降雨相关系数：
                    <span className={cn(
                      'font-medium ml-1',
                      item.rainfallCorrelation > 0.3 ? 'text-green-600' :
                      item.rainfallCorrelation < -0.3 ? 'text-red-600' : 'text-gray-600'
                    )}>
                      {formatPercentage(item.rainfallCorrelation * 100)}
                    </span>
                  </p>
                </div>
              </div>
            </Card.Header>
            <Card.Content>
              <LineChart
                data={item.data}
                lines={[
                  { dataKey: '温度', name: '温度(°C)', color: '#ef4444', strokeWidth: 2 },
                  { dataKey: '降雨量', name: '降雨量(mm)', color: '#3b82f6', strokeWidth: 2 },
                  { dataKey: '产量趋势', name: '产量趋势(×10公斤)', color: '#22c55e', strokeWidth: 2 },
                ]}
                height={280}
              />
            </Card.Content>
          </Card>
        )
      ))}
    </div>
  );
}
