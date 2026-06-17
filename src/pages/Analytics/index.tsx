import { useState, useMemo } from 'react';
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  LandPlot,
  BarChart3,
  Trophy,
  Filter,
  ChevronDown,
  ArrowUpDown,
  Calculator,
  PieChart,
  X,
} from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';
import type { Season, Field, Harvest, Cost, CostCategory } from '@/types';
import {
  calculateProfit,
  calculateYearlyStats,
  formatCurrency,
  formatPercentage,
  formatWeight,
  roundTo,
} from '@/utils/calculationUtils';
import { getYearFromDate } from '@/utils/dateUtils';
import MetricCard from '@/components/Cards/MetricCard';
import Card from '@/components/Common/Card';
import Table from '@/components/Common/Table';
import BarChart from '@/components/Charts/BarChart';
import PieChartComponent from '@/components/Charts/PieChart';
import SeasonDetailModal from '@/components/Modals/SeasonDetailModal';
import { cn } from '@/lib/utils';

interface VarietyProfitData {
  id: string;
  cropName: string;
  fieldName: string;
  area: number;
  yield: number;
  cost: number;
  revenue: number;
  profit: number;
  roi: number;
  yieldPerAcre: number;
  profitPerAcre: number;
  year: number;
}

type SortKey = keyof VarietyProfitData;
type SortOrder = 'asc' | 'desc';

export default function Analytics() {
  const { fields, seasons, harvests, costs } = useAppStore();

  const availableYears = useMemo(() => {
    const years = new Set(seasons.map((s) => getYearFromDate(s.sowDate)));
    return Array.from(years).sort((a, b) => b - a);
  }, [seasons]);

  const availableCrops = useMemo(() => {
    const crops = new Set(seasons.map((s) => s.cropName));
    return Array.from(crops);
  }, [seasons]);

  const [selectedYear, setSelectedYear] = useState<number | 'all'>('all');
  const [selectedCrop, setSelectedCrop] = useState<string | 'all'>('all');
  const [sortKey, setSortKey] = useState<SortKey>('profit');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const [showYearDropdown, setShowYearDropdown] = useState(false);
  const [showCropDropdown, setShowCropDropdown] = useState(false);
  const [drillSeasonId, setDrillSeasonId] = useState<string | null>(null);
  const [selectedCropForCost, setSelectedCropForCost] = useState<string | 'all'>('all');

  const drillSeason = useMemo(
    () => (drillSeasonId ? seasons.find((s) => s.id === drillSeasonId) : undefined),
    [drillSeasonId, seasons]
  );
  const drillField = useMemo(
    () => (drillSeason ? fields.find((f) => f.id === drillSeason.fieldId) : undefined),
    [drillSeason, fields]
  );

  const filteredSeasons = useMemo(() => {
    return seasons.filter((s) => {
      const yearMatch = selectedYear === 'all' || getYearFromDate(s.sowDate) === selectedYear;
      const cropMatch = selectedCrop === 'all' || s.cropName === selectedCrop;
      return yearMatch && cropMatch && s.status === '已采收';
    });
  }, [seasons, selectedYear, selectedCrop]);

  const overallStats = useMemo(() => {
    const filteredHarvests = harvests.filter((h) =>
      filteredSeasons.some((s) => s.id === h.seasonId)
    );
    const filteredCosts = costs.filter((c) =>
      filteredSeasons.some((s) => s.id === c.seasonId)
    );
    const totalArea = filteredSeasons.reduce((sum, s) => {
      const field = fields.find((f) => f.id === s.fieldId);
      return sum + (field?.area || 0);
    }, 0);

    return calculateProfit(filteredHarvests, filteredCosts, totalArea);
  }, [filteredSeasons, harvests, costs, fields]);

  const yearlyComparison = useMemo(() => {
    const cropYears: Record<string, Record<number, { profit: number; area: number }>> = {};

    filteredSeasons.forEach((season) => {
      const year = getYearFromDate(season.sowDate);
      const field = fields.find((f) => f.id === season.fieldId);
      const seasonHarvests = harvests.filter((h) => h.seasonId === season.id);
      const seasonCosts = costs.filter((c) => c.seasonId === season.id);
      const profitResult = calculateProfit(seasonHarvests, seasonCosts, field?.area || 0);

      if (!cropYears[season.cropName]) {
        cropYears[season.cropName] = {};
      }
      if (!cropYears[season.cropName][year]) {
        cropYears[season.cropName][year] = { profit: 0, area: 0 };
      }
      cropYears[season.cropName][year].profit += profitResult.totalProfit;
      cropYears[season.cropName][year].area += field?.area || 0;
    });

    const years = Array.from(new Set(filteredSeasons.map((s) => getYearFromDate(s.sowDate)))).sort();
    const crops = Object.keys(cropYears);

    return years.map((year) => {
      const item = { name: `${year}年` } as { name: string; [key: string]: string | number };
      crops.forEach((crop) => {
        item[crop] = roundTo(cropYears[crop]?.[year]?.profit || 0, 0);
      });
      return item;
    });
  }, [filteredSeasons, fields, harvests, costs]);

  const varietyData = useMemo((): VarietyProfitData[] => {
    return filteredSeasons.map((season) => {
      const field = fields.find((f) => f.id === season.fieldId);
      const seasonHarvests = harvests.filter((h) => h.seasonId === season.id);
      const seasonCosts = costs.filter((c) => c.seasonId === season.id);
      const area = field?.area || 0;
      const profitResult = calculateProfit(seasonHarvests, seasonCosts, area);
      const totalYield = seasonHarvests.reduce((sum, h) => sum + h.actualYield, 0);

      return {
        id: season.id,
        cropName: season.cropName,
        fieldName: field?.name || '',
        area,
        yield: totalYield,
        cost: profitResult.totalCost,
        revenue: profitResult.totalRevenue,
        profit: profitResult.totalProfit,
        roi: profitResult.roi,
        yieldPerAcre: area > 0 ? totalYield / area : 0,
        profitPerAcre: profitResult.profitPerAcre,
        year: getYearFromDate(season.sowDate),
      };
    });
  }, [filteredSeasons, fields, harvests, costs]);

  const sortedVarietyData = useMemo(() => {
    return [...varietyData].sort((a, b) => {
      const aVal = a[sortKey];
      const bVal = b[sortKey];
      if (typeof aVal === 'number' && typeof bVal === 'number') {
        return sortOrder === 'asc' ? aVal - bVal : bVal - aVal;
      }
      if (typeof aVal === 'string' && typeof bVal === 'string') {
        return sortOrder === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
      }
      return 0;
    });
  }, [varietyData, sortKey, sortOrder]);

  const leaderboardData = useMemo(() => {
    return [...varietyData].sort((a, b) => b.profit - a.profit).slice(0, 5);
  }, [varietyData]);

  const cropCostBreakdown = useMemo(() => {
    const years = availableYears.slice(0, 2);
    const curYear = years[0];
    const lastYear = years[1];

    const result: Record<
      string,
      {
        crop: string;
        currentTotal: number;
        lastTotal: number;
        byCategory: Record<string, { current: number; last: number }>;
      }
    > = {};

    const initCrop = (crop: string) => {
      if (!result[crop]) {
        result[crop] = {
          crop,
          currentTotal: 0,
          lastTotal: 0,
          byCategory: {},
        };
      }
    };

    costs.forEach((c) => {
      const season = seasons.find((s) => s.id === c.seasonId);
      if (!season) return;
      const y = getYearFromDate(season.sowDate);
      initCrop(season.cropName);
      const entry = result[season.cropName];
      if (!entry.byCategory[c.category]) {
        entry.byCategory[c.category] = { current: 0, last: 0 };
      }
      if (y === curYear) {
        entry.currentTotal += c.amount;
        entry.byCategory[c.category].current += c.amount;
      } else if (y === lastYear) {
        entry.lastTotal += c.amount;
        entry.byCategory[c.category].last += c.amount;
      }
    });

    return result;
  }, [costs, seasons, availableYears]);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortOrder('desc');
    }
  };

  const columns = [
    {
      key: 'year',
      title: '年份',
      sortable: true,
      render: (item: VarietyProfitData) => <span className="font-medium">{item.year}</span>,
    },
    {
      key: 'cropName',
      title: '品种',
      sortable: true,
      render: (item: VarietyProfitData) => {
        const colors: Record<string, string> = {
          小麦: 'bg-wheat-100 text-wheat-700',
          玉米: 'bg-farm-100 text-farm-700',
          水稻: 'bg-sky-100 text-sky-700',
        };
        return (
          <span className={cn('px-2 py-1 rounded-full text-xs font-medium', colors[item.cropName])}>
            {item.cropName}
          </span>
        );
      },
    },
    {
      key: 'fieldName',
      title: '地块',
      sortable: true,
    },
    {
      key: 'area',
      title: '面积(亩)',
      sortable: true,
      align: 'right' as const,
      render: (item: VarietyProfitData) => <span>{item.area.toFixed(1)}</span>,
    },
    {
      key: 'yield',
      title: '总产量',
      sortable: true,
      align: 'right' as const,
      render: (item: VarietyProfitData) => <span>{formatWeight(item.yield)}</span>,
    },
    {
      key: 'yieldPerAcre',
      title: '亩产(公斤)',
      sortable: true,
      align: 'right' as const,
      render: (item: VarietyProfitData) => <span>{item.yieldPerAcre.toFixed(1)}</span>,
    },
    {
      key: 'cost',
      title: '总成本',
      sortable: true,
      align: 'right' as const,
      render: (item: VarietyProfitData) => <span>{formatCurrency(item.cost)}</span>,
    },
    {
      key: 'revenue',
      title: '总收入',
      sortable: true,
      align: 'right' as const,
      render: (item: VarietyProfitData) => <span>{formatCurrency(item.revenue)}</span>,
    },
    {
      key: 'profit',
      title: '净利润',
      sortable: true,
      align: 'right' as const,
      render: (item: VarietyProfitData) => (
        <span className={cn('font-medium', item.profit >= 0 ? 'text-green-600' : 'text-red-600')}>
          {formatCurrency(item.profit)}
        </span>
      ),
    },
    {
      key: 'profitPerAcre',
      title: '亩均利润',
      sortable: true,
      align: 'right' as const,
      render: (item: VarietyProfitData) => (
        <span className={cn(item.profitPerAcre >= 0 ? 'text-green-600' : 'text-red-600')}>
          {formatCurrency(item.profitPerAcre)}
        </span>
      ),
    },
    {
      key: 'roi',
      title: 'ROI(%)',
      sortable: true,
      align: 'right' as const,
      render: (item: VarietyProfitData) => (
        <span className={cn('font-medium', item.roi >= 0 ? 'text-green-600' : 'text-red-600')}>
          {formatPercentage(item.roi)}
        </span>
      ),
    },
  ];

  const yearlyStatsByYear = useMemo(() => {
    return availableYears.map((year) => {
      const yearHarvests = harvests.filter((h) => {
        const season = seasons.find((s) => s.id === h.seasonId);
        return season && getYearFromDate(season.sowDate) === year;
      });
      const yearCosts = costs.filter((c) => {
        const season = seasons.find((s) => s.id === c.seasonId);
        return season && getYearFromDate(season.sowDate) === year;
      });
      const stats = calculateYearlyStats(seasons, harvests, costs, fields, year);
      return {
        year,
        ...stats,
        avgRevenuePerAcre: stats.totalArea > 0 ? stats.totalRevenue / stats.totalArea : 0,
      };
    });
  }, [availableYears, seasons, harvests, costs, fields]);

  const SortIcon = ({ columnKey }: { columnKey: SortKey }) => {
    if (sortKey !== columnKey) {
      return <ArrowUpDown className="w-3 h-3 text-gray-400 ml-1" />;
    }
    return sortOrder === 'asc' ? (
      <TrendingUp className="w-3 h-3 text-farm-600 ml-1" />
    ) : (
      <TrendingDown className="w-3 h-3 text-farm-600 ml-1" />
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">收益分析</h1>
          <p className="text-gray-500 mt-1">全面分析种植收益，优化生产决策</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <button
              onClick={() => {
                setShowYearDropdown(!showYearDropdown);
                setShowCropDropdown(false);
              }}
              className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-xl text-sm hover:bg-gray-50 transition-colors"
            >
              <Filter className="w-4 h-4 text-gray-500" />
              <span>{selectedYear === 'all' ? '全部年份' : `${selectedYear}年`}</span>
              <ChevronDown className="w-4 h-4 text-gray-500" />
            </button>
            {showYearDropdown && (
              <div className="absolute right-0 mt-2 w-40 bg-white border border-gray-200 rounded-xl shadow-lg z-10">
                <div className="py-1">
                  <button
                    onClick={() => {
                      setSelectedYear('all');
                      setShowYearDropdown(false);
                    }}
                    className={cn(
                      'w-full px-4 py-2 text-left text-sm hover:bg-gray-50',
                      selectedYear === 'all' && 'text-farm-600 font-medium'
                    )}
                  >
                    全部年份
                  </button>
                  {availableYears.map((year) => (
                    <button
                      key={year}
                      onClick={() => {
                        setSelectedYear(year);
                        setShowYearDropdown(false);
                      }}
                      className={cn(
                        'w-full px-4 py-2 text-left text-sm hover:bg-gray-50',
                        selectedYear === year && 'text-farm-600 font-medium'
                      )}
                    >
                      {year}年
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
          <div className="relative">
            <button
              onClick={() => {
                setShowCropDropdown(!showCropDropdown);
                setShowYearDropdown(false);
              }}
              className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-xl text-sm hover:bg-gray-50 transition-colors"
            >
              <LandPlot className="w-4 h-4 text-gray-500" />
              <span>{selectedCrop === 'all' ? '全部作物' : selectedCrop}</span>
              <ChevronDown className="w-4 h-4 text-gray-500" />
            </button>
            {showCropDropdown && (
              <div className="absolute right-0 mt-2 w-40 bg-white border border-gray-200 rounded-xl shadow-lg z-10">
                <div className="py-1">
                  <button
                    onClick={() => {
                      setSelectedCrop('all');
                      setShowCropDropdown(false);
                    }}
                    className={cn(
                      'w-full px-4 py-2 text-left text-sm hover:bg-gray-50',
                      selectedCrop === 'all' && 'text-farm-600 font-medium'
                    )}
                  >
                    全部作物
                  </button>
                  {availableCrops.map((crop) => (
                    <button
                      key={crop}
                      onClick={() => {
                        setSelectedCrop(crop);
                        setShowCropDropdown(false);
                      }}
                      className={cn(
                        'w-full px-4 py-2 text-left text-sm hover:bg-gray-50',
                        selectedCrop === crop && 'text-farm-600 font-medium'
                      )}
                    >
                      {crop}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="总收入"
          value={formatCurrency(overallStats.totalRevenue)}
          icon={DollarSign}
          color="farm"
          trend={12.5}
          trendLabel="较上年"
        />
        <MetricCard
          title="总成本"
          value={formatCurrency(overallStats.totalCost)}
          icon={Calculator}
          color="soil"
          trend={8.2}
          trendLabel="较上年"
        />
        <MetricCard
          title="净利润"
          value={formatCurrency(overallStats.totalProfit)}
          icon={TrendingUp}
          color="wheat"
          trend={18.7}
          trendLabel="较上年"
        />
        <MetricCard
          title="投资回报率"
          value={formatPercentage(overallStats.roi)}
          icon={BarChart3}
          color="sky"
          trend={5.3}
          trendLabel="较上年"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <Card.Header>
            <h3 className="text-lg font-semibold text-gray-900">利润计算详情</h3>
            <p className="text-sm text-gray-500">每亩成本、收入与利润分析</p>
          </Card.Header>
          <Card.Content>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-red-50 rounded-xl p-5">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 bg-red-500 rounded-lg flex items-center justify-center">
                    <TrendingDown className="w-5 h-5 text-white" />
                  </div>
                  <span className="text-sm font-medium text-gray-700">每亩成本</span>
                </div>
                <p className="text-3xl font-bold text-red-600">
                  {formatCurrency(overallStats.costPerAcre)}
                </p>
                <div className="mt-4 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">种子</span>
                    <span className="text-gray-700">¥80.00</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">化肥</span>
                    <span className="text-gray-700">¥300.00</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">农药</span>
                    <span className="text-gray-700">¥120.00</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">人工</span>
                    <span className="text-gray-700">¥240.00</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">农机</span>
                    <span className="text-gray-700">¥100.00</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">其他</span>
                    <span className="text-gray-700">¥60.00</span>
                  </div>
                </div>
              </div>

              <div className="bg-green-50 rounded-xl p-5">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 bg-green-500 rounded-lg flex items-center justify-center">
                    <TrendingUp className="w-5 h-5 text-white" />
                  </div>
                  <span className="text-sm font-medium text-gray-700">每亩收入</span>
                </div>
                <p className="text-3xl font-bold text-green-600">
                  {formatCurrency(overallStats.revenuePerAcre)}
                </p>
                <div className="mt-4 space-y-2">
                  {yearlyStatsByYear.slice(0, 3).map((stat) => (
                    <div key={stat.year} className="flex justify-between text-sm">
                      <span className="text-gray-500">{stat.year}年</span>
                      <span className="text-gray-700">
                        {formatCurrency(stat.avgRevenuePerAcre)}
                      </span>
                    </div>
                  ))}
                </div>
                <div className="mt-4 pt-4 border-t border-green-200">
                  <p className="text-xs text-gray-500">
                    计算公式：产量 × 单价 = 收入
                  </p>
                </div>
              </div>

              <div className="bg-wheat-50 rounded-xl p-5">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 bg-wheat-500 rounded-lg flex items-center justify-center">
                    <DollarSign className="w-5 h-5 text-white" />
                  </div>
                  <span className="text-sm font-medium text-gray-700">每亩净利润</span>
                </div>
                <p className="text-3xl font-bold text-wheat-600">
                  {formatCurrency(overallStats.profitPerAcre)}
                </p>
                <div className="mt-4 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">收入</span>
                    <span className="text-green-600">
                      {formatCurrency(overallStats.revenuePerAcre)}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">成本</span>
                    <span className="text-red-600">
                      -{formatCurrency(overallStats.costPerAcre)}
                    </span>
                  </div>
                  <div className="h-px bg-wheat-200 my-2" />
                  <div className="flex justify-between text-sm font-medium">
                    <span className="text-gray-700">净利润</span>
                    <span className="text-wheat-600">
                      {formatCurrency(overallStats.profitPerAcre)}
                    </span>
                  </div>
                </div>
                <div className="mt-4 pt-4 border-t border-wheat-200">
                  <p className="text-xs text-gray-500">
                    计算公式：收入 - 成本 = 利润
                  </p>
                </div>
              </div>
            </div>
          </Card.Content>
        </Card>

        <Card>
          <Card.Header>
            <div className="flex items-center gap-2">
              <Trophy className="w-5 h-5 text-wheat-500" />
              <h3 className="text-lg font-semibold text-gray-900">效益排行榜</h3>
            </div>
            <p className="text-sm text-gray-500">净利润 Top 5</p>
          </Card.Header>
          <Card.Content>
            <div className="space-y-3">
              {leaderboardData.map((item, index) => (
                <button
                  type="button"
                  key={item.id}
                  onClick={() => setDrillSeasonId(item.id)}
                  className={cn(
                    'w-full text-left flex items-center gap-3 p-3 rounded-xl transition-colors cursor-pointer hover:ring-2 hover:ring-farm-400',
                    index === 0 && 'bg-gradient-to-r from-yellow-50 to-yellow-100 border border-yellow-200',
                    index === 1 && 'bg-gradient-to-r from-gray-50 to-gray-100 border border-gray-200',
                    index === 2 && 'bg-gradient-to-r from-orange-50 to-orange-100 border border-orange-200',
                    index > 2 && 'bg-gray-50 hover:bg-gray-100'
                  )}
                >
                  <div
                    className={cn(
                      'w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0',
                      index === 0 && 'bg-yellow-400 text-yellow-900',
                      index === 1 && 'bg-gray-400 text-gray-900',
                      index === 2 && 'bg-orange-400 text-orange-900',
                      index > 2 && 'bg-gray-300 text-gray-600'
                    )}
                  >
                    {index + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-gray-900 truncate">
                        {item.fieldName}
                      </span>
                      <span className="text-xs px-2 py-0.5 bg-farm-100 text-farm-700 rounded-full">
                        {item.cropName}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-gray-500 mt-0.5">
                      <span>{item.year}年</span>
                      <span>·</span>
                      <span>{item.area}亩</span>
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p
                      className={cn(
                        'font-bold',
                        item.profit >= 0 ? 'text-green-600' : 'text-red-600'
                      )}
                    >
                      {formatCurrency(item.profit)}
                    </p>
                    <p className="text-xs text-gray-500">
                      ROI {formatPercentage(item.roi)}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          </Card.Content>
        </Card>
      </div>

      <Card>
        <Card.Header>
          <h3 className="text-lg font-semibold text-gray-900">年度收益对比</h3>
          <p className="text-sm text-gray-500">各品种年度净利润对比（单位：元）</p>
        </Card.Header>
        <Card.Content>
          {yearlyComparison.length > 0 ? (
            <BarChart
              data={yearlyComparison}
              bars={availableCrops.map((crop, idx) => ({
                dataKey: crop,
                name: crop,
                color: ['#22c55e', '#f59e0b', '#0ea5e9'][idx % 3],
              }))}
              height={350}
            />
          ) : (
            <div className="h-64 flex items-center justify-center text-gray-500">
              暂无数据
            </div>
          )}
        </Card.Content>
      </Card>

      <Card>
        <Card.Header>
          <h3 className="text-lg font-semibold text-gray-900">品种收益分析</h3>
          <p className="text-sm text-gray-500">点击表头可排序</p>
        </Card.Header>
        <Card.Content className="p-0">
          <Table
            columns={columns.map((col) => ({
              ...col,
              title: (
                <span className="inline-flex items-center">
                  {col.title}
                  {col.sortable && (
                    <button
                      onClick={() => handleSort(col.key as SortKey)}
                      className="ml-1 hover:text-farm-600"
                    >
                      <SortIcon columnKey={col.key as SortKey} />
                    </button>
                  )}
                </span>
              ),
            }))}
            data={sortedVarietyData}
            rowKey="id"
            onRowClick={(item) => setDrillSeasonId(item.id)}
          />
        </Card.Content>
      </Card>

      <Card>
        <Card.Header>
          <div className="flex items-center justify-between w-full">
            <div>
              <div className="flex items-center gap-2">
                <PieChart className="w-5 h-5 text-soil-600" />
                <h3 className="text-lg font-semibold text-gray-900">品种成本拆分对比</h3>
              </div>
              <p className="text-sm text-gray-500 mt-1">
                种子、化肥、农药、人工等分类占比，与上一年同品种对比
              </p>
            </div>
            <div className="flex items-center gap-2">
              <select
                value={selectedCropForCost}
                onChange={(e) => setSelectedCropForCost(e.target.value)}
                className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-farm-500"
              >
                <option value="all">全部作物</option>
                {availableCrops.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </Card.Header>
        <Card.Content>
          {Object.values(cropCostBreakdown).length === 0 ? (
            <p className="text-gray-500 py-8 text-center">暂无成本数据</p>
          ) : (
            <div className="space-y-6">
              {Object.values(cropCostBreakdown)
                .filter((v) => selectedCropForCost === 'all' || v.crop === selectedCropForCost)
                .map((entry) => {
                  const categories = Object.entries(entry.byCategory)
                    .map(([name, v]) => ({ name, ...v }))
                    .sort((a, b) => b.current - a.current);
                  const totalCur = entry.currentTotal || 1;
                  const totalLast = entry.lastTotal || 1;
                  const yoy = entry.lastTotal
                    ? ((entry.currentTotal - entry.lastTotal) / entry.lastTotal) * 100
                    : 0;

                  return (
                    <div key={entry.crop} className="border border-gray-200 rounded-xl p-4">
                      <div className="flex items-center justify-between mb-4">
                        <div>
                          <h4 className="text-base font-semibold text-gray-900">{entry.crop}</h4>
                          <p className="text-xs text-gray-500">
                            本年总成本 {formatCurrency(entry.currentTotal)}
                            {entry.lastTotal > 0 && (
                              <span
                                className={cn(
                                  'ml-2',
                                  yoy >= 0 ? 'text-red-600' : 'text-green-600'
                                )}
                              >
                                同比 {yoy >= 0 ? '+' : ''}
                                {yoy.toFixed(1)}%
                              </span>
                            )}
                          </p>
                        </div>
                      </div>
                      <div className="space-y-2">
                        {categories.length === 0 && (
                          <p className="text-sm text-gray-500">暂无分类数据</p>
                        )}
                        {categories.map((cat) => (
                          <div key={cat.name}>
                            <div className="flex justify-between text-sm mb-1">
                              <span className="text-gray-700">{cat.name}</span>
                              <span className="text-gray-600">
                                {formatCurrency(cat.current)} (
                                {((cat.current / totalCur) * 100).toFixed(1)}%)
                                {cat.last > 0 && (
                                  <span
                                    className={cn(
                                      'ml-2 text-xs',
                                      cat.current >= cat.last ? 'text-red-600' : 'text-green-600'
                                    )}
                                  >
                                    vs 上年 {formatCurrency(cat.last)} (
                                    {((cat.last / totalLast) * 100).toFixed(1)}%)
                                  </span>
                                )}
                              </span>
                            </div>
                            <div className="w-full bg-gray-100 rounded-full h-2.5 overflow-hidden">
                              <div
                                className="bg-gradient-to-r from-farm-500 to-soil-500 h-2.5 rounded-full"
                                style={{ width: `${Math.min((cat.current / totalCur) * 100, 100)}%` }}
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
            </div>
          )}
        </Card.Content>
      </Card>

      <SeasonDetailModal
        isOpen={!!drillSeasonId}
        onClose={() => setDrillSeasonId(null)}
        season={drillSeason}
        field={drillField}
        harvests={harvests}
        costs={costs}
      />
    </div>
  );
}
