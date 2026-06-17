import { getAll, getById, add, update, remove, getAllBySeasonId } from '../db';
import type { Harvest, Season, YieldComparison } from '../types';
import { validateHarvest, createHarvest } from '../db/models';
import { sortByDate, getYearFromDate, isDateInRange } from '../utils/dateUtils';
import {
  detectYieldAbnormality,
  calculateDeviationRate,
  calculateAverage,
  calculateYieldPerAcre,
} from '../utils/calculationUtils';

export const harvestService = {
  async getAllHarvests(): Promise<Harvest[]> {
    const harvests = await getAll('harvests');
    return sortByDate(harvests, 'harvestDate');
  },

  async getHarvestById(id: string): Promise<Harvest | undefined> {
    return getById('harvests', id);
  },

  async getHarvestsBySeason(seasonId: string): Promise<Harvest[]> {
    const harvests = await getAllBySeasonId('harvests', seasonId);
    return sortByDate(harvests, 'harvestDate');
  },

  async getHarvestsByDateRange(startDate: string, endDate: string): Promise<Harvest[]> {
    const harvests = await this.getAllHarvests();
    return harvests.filter((h) => isDateInRange(h.harvestDate, startDate, endDate));
  },

  async getHarvestsByYear(year: number): Promise<Harvest[]> {
    const harvests = await this.getAllHarvests();
    return harvests.filter((h) => getYearFromDate(h.harvestDate) === year);
  },

  async addHarvest(harvestData: Omit<Harvest, 'id' | 'createdAt'>): Promise<Harvest> {
    const validation = validateHarvest(harvestData);
    if (!validation.valid) {
      throw new Error(validation.errors.join(', '));
    }
    const harvest = createHarvest(harvestData);
    await add('harvests', harvest);
    return harvest;
  },

  async updateHarvest(harvest: Harvest): Promise<Harvest> {
    const validation = validateHarvest(harvest);
    if (!validation.valid) {
      throw new Error(validation.errors.join(', '));
    }
    await update('harvests', harvest);
    return harvest;
  },

  async deleteHarvest(id: string): Promise<void> {
    return remove('harvests', id);
  },

  async getTotalYield(seasonId: string): Promise<number> {
    const harvests = await this.getHarvestsBySeason(seasonId);
    return harvests.reduce((sum, h) => sum + h.actualYield, 0);
  },

  async getTotalRevenue(seasonId: string): Promise<number> {
    const harvests = await this.getHarvestsBySeason(seasonId);
    return harvests.reduce((sum, h) => sum + h.actualYield * h.unitPrice, 0);
  },

  async getYieldHistory(
    fieldId: string,
    cropName: string,
    seasons: Season[],
    area: number
  ): Promise<number[]> {
    const fieldSeasons = seasons.filter(
      (s) => s.fieldId === fieldId && s.cropName === cropName && s.status === '已采收'
    );

    const yields: number[] = [];
    for (const season of fieldSeasons) {
      const totalYield = await this.getTotalYield(season.id);
      const yieldPerAcre = calculateYieldPerAcre(totalYield, area);
      if (yieldPerAcre > 0) {
        yields.push(yieldPerAcre);
      }
    }

    return yields.sort((a, b) => a - b);
  },

  async detectYieldAbnormality(
    currentYield: number,
    fieldId: string,
    cropName: string,
    seasons: Season[],
    area: number
  ): Promise<ReturnType<typeof detectYieldAbnormality>> {
    const historicalYields = await this.getYieldHistory(fieldId, cropName, seasons, area);
    return detectYieldAbnormality(currentYield, historicalYields);
  },

  async getYieldComparison(
    seasons: Season[],
    fields: { id: string; area: number }[]
  ): Promise<YieldComparison[]> {
    const completedSeasons = seasons.filter((s) => s.status === '已采收');
    const comparisons: YieldComparison[] = [];

    for (const season of completedSeasons) {
      const field = fields.find((f) => f.id === season.fieldId);
      if (!field) continue;

      const totalYield = await this.getTotalYield(season.id);
      const yieldPerAcre = calculateYieldPerAcre(totalYield, field.area);
      const deviationRate = calculateDeviationRate(yieldPerAcre, season.expectedYield);

      let isAbnormal = false;
      let abnormalLevel: 'normal' | 'warning' | 'danger' = 'normal';

      if (Math.abs(deviationRate) > 20) {
        isAbnormal = true;
        abnormalLevel = 'danger';
      } else if (Math.abs(deviationRate) > 10) {
        isAbnormal = true;
        abnormalLevel = 'warning';
      }

      comparisons.push({
        seasonId: season.id,
        cropName: season.cropName,
        year: getYearFromDate(season.sowDate),
        actualYield: yieldPerAcre,
        expectedYield: season.expectedYield,
        deviation: yieldPerAcre - season.expectedYield,
        deviationRate,
        isAbnormal,
        abnormalLevel,
      });
    }

    return comparisons.sort((a, b) => b.year - a.year);
  },

  async getAbnormalHarvests(
    seasons: Season[],
    fields: { id: string; area: number }[]
  ): Promise<YieldComparison[]> {
    const comparisons = await this.getYieldComparison(seasons, fields);
    return comparisons.filter((c) => c.isAbnormal);
  },

  async getYieldStats(): Promise<{
    totalYield: number;
    totalRevenue: number;
    avgYieldPerAcre: number;
    avgUnitPrice: number;
    byQuality: Record<string, { count: number; totalYield: number; totalRevenue: number }>;
    byCrop: Record<string, { totalYield: number; totalRevenue: number; avgYieldPerAcre: number }>;
  }> {
    const harvests = await this.getAllHarvests();

    const totalYield = harvests.reduce((sum, h) => sum + h.actualYield, 0);
    const totalRevenue = harvests.reduce((sum, h) => sum + h.actualYield * h.unitPrice, 0);
    const avgUnitPrice = harvests.length > 0 ? totalRevenue / totalYield : 0;

    const byQuality: Record<string, { count: number; totalYield: number; totalRevenue: number }> = {};
    const byCrop: Record<string, { totalYield: number; totalRevenue: number; seasonIds: Set<string> }> = {};

    harvests.forEach((h) => {
      if (!byQuality[h.quality]) {
        byQuality[h.quality] = { count: 0, totalYield: 0, totalRevenue: 0 };
      }
      byQuality[h.quality].count++;
      byQuality[h.quality].totalYield += h.actualYield;
      byQuality[h.quality].totalRevenue += h.actualYield * h.unitPrice;
    });

    return {
      totalYield,
      totalRevenue,
      avgYieldPerAcre: 0,
      avgUnitPrice,
      byQuality,
      byCrop: {},
    };
  },

  async getHarvestYears(): Promise<number[]> {
    const harvests = await this.getAllHarvests();
    const years = new Set<number>(harvests.map((h) => getYearFromDate(h.harvestDate)));
    return Array.from(years).sort((a, b) => b - a);
  },

  async getAverageYieldByCrop(cropName: string, seasons: Season[]): Promise<number> {
    const cropSeasons = seasons.filter(
      (s) => s.cropName === cropName && s.status === '已采收'
    );

    const yields: number[] = [];
    for (const season of cropSeasons) {
      const totalYield = await this.getTotalYield(season.id);
      if (totalYield > 0) {
        yields.push(totalYield);
      }
    }

    return calculateAverage(yields);
  },

  async getYieldTrend(
    fieldId: string,
    cropName: string,
    seasons: Season[]
  ): Promise<Array<{ year: number; yield: number }>> {
    const fieldSeasons = seasons.filter(
      (s) => s.fieldId === fieldId && s.cropName === cropName && s.status === '已采收'
    );

    const trend: Array<{ year: number; yield: number }> = [];
    for (const season of fieldSeasons) {
      const totalYield = await this.getTotalYield(season.id);
      trend.push({
        year: getYearFromDate(season.sowDate),
        yield: totalYield,
      });
    }

    return trend.sort((a, b) => a.year - b.year);
  },

  getTotalYieldSync(seasonId: string, harvests: Harvest[]): number {
    return harvests
      .filter((h) => h.seasonId === seasonId)
      .reduce((sum, h) => sum + h.actualYield, 0);
  },

  getYieldComparisonSync(
    seasons: Season[],
    fields: { id: string; area: number }[],
    harvests: Harvest[]
  ): YieldComparison[] {
    const completedSeasons = seasons.filter((s) => s.status === '已采收');
    const comparisons: YieldComparison[] = [];

    for (const season of completedSeasons) {
      const field = fields.find((f) => f.id === season.fieldId);
      if (!field) continue;

      const totalYield = this.getTotalYieldSync(season.id, harvests);
      const yieldPerAcre = calculateYieldPerAcre(totalYield, field.area);
      const deviationRate = calculateDeviationRate(yieldPerAcre, season.expectedYield);

      let isAbnormal = false;
      let abnormalLevel: 'normal' | 'warning' | 'danger' = 'normal';

      if (Math.abs(deviationRate) > 20) {
        isAbnormal = true;
        abnormalLevel = 'danger';
      } else if (Math.abs(deviationRate) > 10) {
        isAbnormal = true;
        abnormalLevel = 'warning';
      }

      comparisons.push({
        seasonId: season.id,
        cropName: season.cropName,
        year: getYearFromDate(season.sowDate),
        actualYield: yieldPerAcre,
        expectedYield: season.expectedYield,
        deviation: yieldPerAcre - season.expectedYield,
        deviationRate,
        isAbnormal,
        abnormalLevel,
      });
    }

    return comparisons.sort((a, b) => b.year - a.year);
  },
};
