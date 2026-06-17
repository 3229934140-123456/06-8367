import type { Harvest, Cost, Season, Field } from '../types';
import { getYearFromDate } from './dateUtils';

export const calculateAverage = (values: number[]): number => {
  if (values.length === 0) return 0;
  const sum = values.reduce((acc, val) => acc + val, 0);
  return sum / values.length;
};

export const calculateStandardDeviation = (values: number[]): number => {
  if (values.length === 0) return 0;
  const avg = calculateAverage(values);
  const squareDiffs = values.map((value) => Math.pow(value - avg, 2));
  const avgSquareDiff = calculateAverage(squareDiffs);
  return Math.sqrt(avgSquareDiff);
};

export const calculateDeviationRate = (current: number, average: number): number => {
  if (average === 0) return 0;
  return ((current - average) / average) * 100;
};

export const detectYieldAbnormality = (
  currentYield: number,
  historicalYields: number[]
): {
  isAbnormal: boolean;
  level: 'normal' | 'warning' | 'danger';
  deviationRate: number;
  average: number;
  standardDeviation: number;
} => {
  const average = calculateAverage(historicalYields);
  const standardDeviation = calculateStandardDeviation(historicalYields);
  const deviationRate = calculateDeviationRate(currentYield, average);

  let level: 'normal' | 'warning' | 'danger' = 'normal';
  let isAbnormal = false;

  if (Math.abs(deviationRate) > 20) {
    level = 'danger';
    isAbnormal = true;
  } else if (Math.abs(deviationRate) > 10) {
    level = 'warning';
    isAbnormal = true;
  }

  return {
    isAbnormal,
    level,
    deviationRate,
    average,
    standardDeviation,
  };
};

export const calculateProfit = (
  harvests: Harvest[],
  costs: Cost[],
  fieldArea: number
): {
  totalRevenue: number;
  totalCost: number;
  totalProfit: number;
  profitPerAcre: number;
  costPerAcre: number;
  revenuePerAcre: number;
  roi: number;
} => {
  const totalRevenue = harvests.reduce((sum, h) => sum + h.actualYield * h.unitPrice, 0);
  const totalCost = costs.reduce((sum, c) => sum + c.amount, 0);
  const totalProfit = totalRevenue - totalCost;
  
  const revenuePerAcre = fieldArea > 0 ? totalRevenue / fieldArea : 0;
  const costPerAcre = fieldArea > 0 ? totalCost / fieldArea : 0;
  const profitPerAcre = fieldArea > 0 ? totalProfit / fieldArea : 0;
  const roi = totalCost > 0 ? (totalProfit / totalCost) * 100 : 0;

  return {
    totalRevenue,
    totalCost,
    totalProfit,
    profitPerAcre,
    costPerAcre,
    revenuePerAcre,
    roi,
  };
};

export const calculateTotalArea = (fields: Field[]): number => {
  return fields.reduce((sum, field) => sum + field.area, 0);
};

export const calculateYieldPerAcre = (actualYield: number, area: number): number => {
  return area > 0 ? actualYield / area : 0;
};

export const calculateCostStats = (costs: Cost[]): {
  byCategory: Record<string, number>;
  total: number;
  percentages: Record<string, number>;
} => {
  const byCategory: Record<string, number> = {};
  
  costs.forEach((cost) => {
    if (!byCategory[cost.category]) {
      byCategory[cost.category] = 0;
    }
    byCategory[cost.category] += cost.amount;
  });

  const total = Object.values(byCategory).reduce((sum, val) => sum + val, 0);
  const percentages: Record<string, number> = {};
  
  Object.entries(byCategory).forEach(([category, amount]) => {
    percentages[category] = total > 0 ? (amount / total) * 100 : 0;
  });

  return { byCategory, total, percentages };
};

export const calculateSeasonStats = (
  season: Season,
  harvests: Harvest[],
  costs: Cost[],
  field: Field
): {
  yieldPerAcre: number;
  revenuePerAcre: number;
  costPerAcre: number;
  profitPerAcre: number;
  totalRevenue: number;
  totalCost: number;
  totalProfit: number;
  roi: number;
  yieldDeviationRate: number;
} => {
  const profitResult = calculateProfit(harvests, costs, field.area);
  const totalActualYield = harvests.reduce((sum, h) => sum + h.actualYield, 0);
  const yieldPerAcre = calculateYieldPerAcre(totalActualYield, field.area);
  const yieldDeviationRate = calculateDeviationRate(yieldPerAcre, season.expectedYield);

  return {
    yieldPerAcre,
    revenuePerAcre: profitResult.revenuePerAcre,
    costPerAcre: profitResult.costPerAcre,
    profitPerAcre: profitResult.profitPerAcre,
    totalRevenue: profitResult.totalRevenue,
    totalCost: profitResult.totalCost,
    totalProfit: profitResult.totalProfit,
    roi: profitResult.roi,
    yieldDeviationRate,
  };
};

export const calculateYearlyStats = (
  seasons: Season[],
  harvests: Harvest[],
  costs: Cost[],
  fields: Field[],
  year: number
): {
  totalSeasons: number;
  completedSeasons: number;
  activeSeasons: number;
  totalArea: number;
  totalYield: number;
  totalRevenue: number;
  totalCost: number;
  totalProfit: number;
  avgYieldPerAcre: number;
  avgProfitPerAcre: number;
  cropStats: Record<string, { area: number; yield: number; profit: number }>;
} => {
  const yearSeasons = seasons.filter(
    (s) => getYearFromDate(s.sowDate) === year
  );
  
  const yearHarvests = harvests.filter((h) => {
    const season = seasons.find((s) => s.id === h.seasonId);
    return season && getYearFromDate(season.sowDate) === year;
  });
  
  const yearCosts = costs.filter((c) => {
    const season = seasons.find((s) => s.id === c.seasonId);
    return season && getYearFromDate(season.sowDate) === year;
  });

  const totalSeasons = yearSeasons.length;
  const completedSeasons = yearSeasons.filter((s) => s.status === '已采收').length;
  const activeSeasons = yearSeasons.filter((s) => s.status === '种植中').length;

  const seasonAreas = yearSeasons.map((s) => {
    const field = fields.find((f) => f.id === s.fieldId);
    return field?.area || 0;
  });
  const totalArea = seasonAreas.reduce((sum, a) => sum + a, 0);

  const totalYield = yearHarvests.reduce((sum, h) => sum + h.actualYield, 0);
  const totalRevenue = yearHarvests.reduce((sum, h) => sum + h.actualYield * h.unitPrice, 0);
  const totalCost = yearCosts.reduce((sum, c) => sum + c.amount, 0);
  const totalProfit = totalRevenue - totalCost;

  const avgYieldPerAcre = totalArea > 0 ? totalYield / totalArea : 0;
  const avgProfitPerAcre = totalArea > 0 ? totalProfit / totalArea : 0;

  const cropStats: Record<string, { area: number; yield: number; profit: number }> = {};
  
  yearSeasons.forEach((season) => {
    const field = fields.find((f) => f.id === season.fieldId);
    const seasonHarvests = yearHarvests.filter((h) => h.seasonId === season.id);
    const seasonCosts = yearCosts.filter((c) => c.seasonId === season.id);
    const seasonYield = seasonHarvests.reduce((sum, h) => sum + h.actualYield, 0);
    const seasonRevenue = seasonHarvests.reduce((sum, h) => sum + h.actualYield * h.unitPrice, 0);
    const seasonCost = seasonCosts.reduce((sum, c) => sum + c.amount, 0);
    const seasonProfit = seasonRevenue - seasonCost;

    if (!cropStats[season.cropName]) {
      cropStats[season.cropName] = { area: 0, yield: 0, profit: 0 };
    }
    cropStats[season.cropName].area += field?.area || 0;
    cropStats[season.cropName].yield += seasonYield;
    cropStats[season.cropName].profit += seasonProfit;
  });

  return {
    totalSeasons,
    completedSeasons,
    activeSeasons,
    totalArea,
    totalYield,
    totalRevenue,
    totalCost,
    totalProfit,
    avgYieldPerAcre,
    avgProfitPerAcre,
    cropStats,
  };
};

export const roundTo = (value: number, decimals: number = 2): number => {
  const factor = Math.pow(10, decimals);
  return Math.round(value * factor) / factor;
};

export const formatCurrency = (value: number): string => {
  return `¥${value.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}`;
};

export const formatPercentage = (value: number): string => {
  return `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`;
};

export const formatWeight = (value: number, unit: string = '公斤'): string => {
  if (value >= 1000) {
    return `${(value / 1000).toFixed(2)} 吨`;
  }
  return `${value.toFixed(2)} ${unit}`;
};

export const calculateGrowthProgressPercentage = (
  daysAfterSowing: number,
  totalGrowthDays: number
): number => {
  if (totalGrowthDays === 0) return 0;
  return Math.min(100, Math.max(0, (daysAfterSowing / totalGrowthDays) * 100));
};

export const generateTrendData = (
  values: number[],
  windowSize: number = 3
): number[] => {
  if (values.length < windowSize) return values;
  
  const result: number[] = [];
  for (let i = 0; i < values.length; i++) {
    const start = Math.max(0, i - Math.floor(windowSize / 2));
    const end = Math.min(values.length, i + Math.ceil(windowSize / 2));
    const window = values.slice(start, end);
    result.push(calculateAverage(window));
  }
  return result;
};

export const calculateCorrelation = (x: number[], y: number[]): number => {
  if (x.length !== y.length || x.length === 0) return 0;
  
  const n = x.length;
  const sumX = x.reduce((a, b) => a + b, 0);
  const sumY = y.reduce((a, b) => a + b, 0);
  const sumXY = x.reduce((a, b, i) => a + b * y[i], 0);
  const sumX2 = x.reduce((a, b) => a + b * b, 0);
  const sumY2 = y.reduce((a, b) => a + b * b, 0);
  
  const numerator = n * sumXY - sumX * sumY;
  const denominator = Math.sqrt((n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY));
  
  return denominator === 0 ? 0 : numerator / denominator;
};
