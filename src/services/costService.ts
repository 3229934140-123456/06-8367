import { getAll, getById, add, update, remove, getByIndex, getAllBySeasonId } from '../db';
import type { Cost, CostStats } from '../types';
import { validateCost, createCost } from '../db/models';
import { sortByDate, getYearFromDate, isDateInRange } from '../utils/dateUtils';
import { calculateCostStats as calcCostStats } from '../utils/calculationUtils';

export const costService = {
  async getAllCosts(): Promise<Cost[]> {
    const costs = await getAll('costs');
    return sortByDate(costs, 'date');
  },

  async getCostById(id: string): Promise<Cost | undefined> {
    return getById('costs', id);
  },

  async getCostsBySeason(seasonId: string): Promise<Cost[]> {
    const costs = await getAllBySeasonId('costs', seasonId);
    return sortByDate(costs, 'date');
  },

  async getCostsByCategory(category: string): Promise<Cost[]> {
    const costs = await getByIndex('costs', 'category', category);
    return sortByDate(costs, 'date');
  },

  async getCostsByDateRange(startDate: string, endDate: string): Promise<Cost[]> {
    const costs = await this.getAllCosts();
    return costs.filter((c) => isDateInRange(c.date, startDate, endDate));
  },

  async getCostsByYear(year: number): Promise<Cost[]> {
    const costs = await this.getAllCosts();
    return costs.filter((c) => getYearFromDate(c.date) === year);
  },

  async addCost(costData: Omit<Cost, 'id' | 'createdAt'>): Promise<Cost> {
    const validation = validateCost(costData);
    if (!validation.valid) {
      throw new Error(validation.errors.join(', '));
    }
    const cost = createCost(costData);
    await add('costs', cost);
    return cost;
  },

  async updateCost(cost: Cost): Promise<Cost> {
    const validation = validateCost(cost);
    if (!validation.valid) {
      throw new Error(validation.errors.join(', '));
    }
    await update('costs', cost);
    return cost;
  },

  async deleteCost(id: string): Promise<void> {
    return remove('costs', id);
  },

  async getTotalCost(seasonId: string): Promise<number> {
    const costs = await this.getCostsBySeason(seasonId);
    return costs.reduce((sum, c) => sum + c.amount, 0);
  },

  async getCostStatsBySeason(seasonId: string): Promise<{
    byCategory: Record<string, number>;
    total: number;
    percentages: Record<string, number>;
  }> {
    const costs = await this.getCostsBySeason(seasonId);
    return calcCostStats(costs);
  },

  async getCostStatsByYear(year: number): Promise<{
    byCategory: Record<string, number>;
    total: number;
    percentages: Record<string, number>;
  }> {
    const costs = await this.getCostsByYear(year);
    return calcCostStats(costs);
  },

  async calculateCostPerAcre(seasonId: string, area: number): Promise<number> {
    const totalCost = await this.getTotalCost(seasonId);
    return area > 0 ? totalCost / area : 0;
  },

  async getCostStats(): Promise<{
    totalCost: number;
    byCategory: CostStats[];
    byMonth: Record<string, number>;
    bySeason: Record<string, number>;
  }> {
    const costs = await this.getAllCosts();
    const { byCategory, total, percentages } = calcCostStats(costs);

    const costStats: CostStats[] = Object.entries(byCategory).map(([category, amount]) => ({
      category,
      totalAmount: amount,
      percentage: percentages[category] || 0,
    }));

    const byMonth: Record<string, number> = {};
    const bySeason: Record<string, number> = {};

    costs.forEach((cost) => {
      const monthKey = cost.date.substring(0, 7);
      byMonth[monthKey] = (byMonth[monthKey] || 0) + cost.amount;
      bySeason[cost.seasonId] = (bySeason[cost.seasonId] || 0) + cost.amount;
    });

    return {
      totalCost: total,
      byCategory: costStats,
      byMonth,
      bySeason,
    };
  },

  async getCostComparison(
    seasonIds: string[]
  ): Promise<Array<{ seasonId: string; totalCost: number; byCategory: Record<string, number> }>> {
    const result: Array<{ seasonId: string; totalCost: number; byCategory: Record<string, number> }> = [];

    for (const seasonId of seasonIds) {
      const costs = await this.getCostsBySeason(seasonId);
      const { byCategory, total } = calcCostStats(costs);
      result.push({
        seasonId,
        totalCost: total,
        byCategory,
      });
    }

    return result;
  },

  async getCategories(): Promise<string[]> {
    const costs = await this.getAllCosts();
    const categories = new Set<string>(costs.map((c) => c.category));
    return Array.from(categories);
  },

  async getCostYears(): Promise<number[]> {
    const costs = await this.getAllCosts();
    const years = new Set<number>(costs.map((c) => getYearFromDate(c.date)));
    return Array.from(years).sort((a, b) => b - a);
  },

  async getAverageCostByCategory(category: string): Promise<number> {
    const costs = await this.getCostsByCategory(category);
    if (costs.length === 0) return 0;
    return costs.reduce((sum, c) => sum + c.amount, 0) / costs.length;
  },

  async getCostTrend(year: number): Promise<Array<{ month: string; amount: number; categories: Array<{ category: string; amount: number }> }>> {
    const costs = await this.getCostsByYear(year);
    const byMonthAndCategory: Record<string, Record<string, number>> = {};

    costs.forEach((cost) => {
      const month = cost.date.substring(5, 7);
      if (!byMonthAndCategory[month]) {
        byMonthAndCategory[month] = {};
      }
      byMonthAndCategory[month][cost.category] =
        (byMonthAndCategory[month][cost.category] || 0) + cost.amount;
    });

    return Object.entries(byMonthAndCategory)
      .map(([month, categories]) => ({
        month,
        amount: Object.values(categories).reduce((sum, v) => sum + v, 0),
        categories: Object.entries(categories).map(([category, amount]) => ({
          category,
          amount,
        })),
      }))
      .sort((a, b) => a.month.localeCompare(b.month));
  },

  async filterCosts(filters: {
    category?: string;
    seasonId?: string;
    startDate?: string;
    endDate?: string;
    minAmount?: number;
    maxAmount?: number;
  }): Promise<Cost[]> {
    let costs = await this.getAllCosts();

    if (filters.category) {
      costs = costs.filter((c) => c.category === filters.category);
    }

    if (filters.seasonId) {
      costs = costs.filter((c) => c.seasonId === filters.seasonId);
    }

    if (filters.startDate && filters.endDate) {
      costs = costs.filter((c) =>
        isDateInRange(c.date, filters.startDate!, filters.endDate!)
      );
    }

    if (filters.minAmount !== undefined) {
      costs = costs.filter((c) => c.amount >= filters.minAmount!);
    }

    if (filters.maxAmount !== undefined) {
      costs = costs.filter((c) => c.amount <= filters.maxAmount!);
    }

    return sortByDate(costs, 'date');
  },

  getCostStatsSync(costs: Cost[]): {
    totalCost: number;
    byCategory: CostStats[];
    byMonth: Record<string, number>;
    bySeason: Record<string, number>;
  } {
    const { byCategory, total, percentages } = calcCostStats(costs);

    const costStats: CostStats[] = Object.entries(byCategory).map(([category, amount]) => ({
      category,
      totalAmount: amount,
      percentage: percentages[category] || 0,
    }));

    const byMonth: Record<string, number> = {};
    const bySeason: Record<string, number> = {};

    costs.forEach((cost) => {
      const monthKey = cost.date.substring(0, 7);
      byMonth[monthKey] = (byMonth[monthKey] || 0) + cost.amount;
      bySeason[cost.seasonId] = (bySeason[cost.seasonId] || 0) + cost.amount;
    });

    return {
      totalCost: total,
      byCategory: costStats,
      byMonth,
      bySeason,
    };
  },
};
