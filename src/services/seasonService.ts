import { getAll, getById, add, update, remove, getByIndex, getSeasonsByFieldId, getAllBySeasonId } from '../db';
import type { Season, Operation, Harvest, Cost, Reminder } from '../types';
import { validateSeason, createSeason } from '../db/models';
import { getDaysSince, getYearFromDate } from '../utils/dateUtils';
import { getCropConfig, calculateGrowthProgress, getGrowthStage } from '../data/cropConfigs';
import { getAllBySeasonId as getRemindersBySeasonId, remove as removeReminder } from '../db';

export const seasonService = {
  async getAllSeasons(): Promise<Season[]> {
    return getAll('seasons');
  },

  async getSeasonById(id: string): Promise<Season | undefined> {
    return getById('seasons', id);
  },

  async getSeasonsByField(fieldId: string): Promise<Season[]> {
    return getSeasonsByFieldId(fieldId);
  },

  async getSeasonsByCrop(cropName: string): Promise<Season[]> {
    return getByIndex('seasons', 'cropName', cropName);
  },

  async getSeasonsByYear(year: number): Promise<Season[]> {
    const seasons = await this.getAllSeasons();
    return seasons.filter((s) => getYearFromDate(s.sowDate) === year);
  },

  async getSeasonsByFieldAndYear(fieldId: string, year: number): Promise<Season[]> {
    const fieldSeasons = await this.getSeasonsByField(fieldId);
    return fieldSeasons.filter((s) => getYearFromDate(s.sowDate) === year);
  },

  async addSeason(seasonData: Omit<Season, 'id' | 'createdAt'>): Promise<Season> {
    const validation = validateSeason(seasonData);
    if (!validation.valid) {
      throw new Error(validation.errors.join(', '));
    }
    const season = createSeason(seasonData);
    await add('seasons', season);
    return season;
  },

  async updateSeason(season: Season): Promise<Season> {
    const validation = validateSeason(season);
    if (!validation.valid) {
      throw new Error(validation.errors.join(', '));
    }
    await update('seasons', season);
    return season;
  },

  async deleteSeason(id: string): Promise<void> {
    const operations = await this.getSeasonOperations(id);
    const harvests = await this.getSeasonHarvests(id);
    const costs = await this.getSeasonCosts(id);

    if (operations.length > 0 || harvests.length > 0 || costs.length > 0) {
      throw new Error('该种植季下存在操作、收成或成本记录，无法删除。请先删除关联的业务数据。');
    }

    const reminders = await this.getSeasonReminders(id);
    for (const reminder of reminders) {
      await removeReminder('reminders', reminder.id);
    }

    return remove('seasons', id);
  },

  async getSeasonReminders(seasonId: string): Promise<Reminder[]> {
    return getRemindersBySeasonId('reminders', seasonId);
  },

  async getSeasonOperations(seasonId: string): Promise<Operation[]> {
    return getAllBySeasonId('operations', seasonId);
  },

  async getSeasonHarvests(seasonId: string): Promise<Harvest[]> {
    return getAllBySeasonId('harvests', seasonId);
  },

  async getSeasonCosts(seasonId: string): Promise<Cost[]> {
    return getAllBySeasonId('costs', seasonId);
  },

  calculateGrowthProgress(season: Season): number {
    const daysAfterSowing = getDaysSince(season.sowDate);
    return calculateGrowthProgress(season.cropName, daysAfterSowing);
  },

  getCurrentGrowthStage(season: Season): ReturnType<typeof getGrowthStage> {
    const daysAfterSowing = getDaysSince(season.sowDate);
    return getGrowthStage(season.cropName, daysAfterSowing);
  },

  getGrowthDays(season: Season): number {
    return getDaysSince(season.sowDate);
  },

  getTotalGrowthDays(season: Season): number {
    const config = getCropConfig(season.cropName);
    return config?.totalGrowthDays || 0;
  },

  getEstimatedHarvestDate(season: Season): string {
    const config = getCropConfig(season.cropName);
    if (!config) return '';
    
    const sowDate = new Date(season.sowDate);
    sowDate.setDate(sowDate.getDate() + config.totalGrowthDays);
    return sowDate.toISOString().split('T')[0];
  },

  async getActiveSeasons(): Promise<Season[]> {
    const seasons = await this.getAllSeasons();
    return seasons.filter((s) => s.status === '种植中');
  },

  async getCompletedSeasons(): Promise<Season[]> {
    const seasons = await this.getAllSeasons();
    return seasons.filter((s) => s.status === '已采收');
  },

  async markAsHarvested(seasonId: string): Promise<Season> {
    const season = await this.getSeasonById(seasonId);
    if (!season) {
      throw new Error('种植季不存在');
    }
    
    const updatedSeason: Season = {
      ...season,
      status: '已采收',
    };
    
    return this.updateSeason(updatedSeason);
  },

  async getSeasonsWithProgress(): Promise<Array<Season & { progress: number; growthDays: number; totalDays: number }>> {
    const seasons = await this.getAllSeasons();
    return seasons.map((season) => ({
      ...season,
      progress: this.calculateGrowthProgress(season),
      growthDays: this.getGrowthDays(season),
      totalDays: this.getTotalGrowthDays(season),
    }));
  },

  async getAvailableYears(): Promise<number[]> {
    const seasons = await this.getAllSeasons();
    const years = new Set<number>(seasons.map((s) => getYearFromDate(s.sowDate)));
    return Array.from(years).sort((a, b) => b - a);
  },

  async getCropSummary(): Promise<Record<string, { count: number; area: number; seasons: Season[] }>> {
    const seasons = await this.getAllSeasons();
    const result: Record<string, { count: number; area: number; seasons: Season[] }> = {};
    
    seasons.forEach((season) => {
      if (!result[season.cropName]) {
        result[season.cropName] = { count: 0, area: 0, seasons: [] };
      }
      result[season.cropName].count++;
      result[season.cropName].seasons.push(season);
    });
    
    return result;
  },
};
