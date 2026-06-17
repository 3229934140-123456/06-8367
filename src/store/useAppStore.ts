import { create } from 'zustand';
import type {
  Field,
  Season,
  Operation,
  Harvest,
  Cost,
  Weather,
  Reminder,
} from '../types';
import { SeasonStatus } from '../types';
import { initDB, bulkAdd } from '../db';
import { fieldService } from '../services/fieldService';
import { seasonService } from '../services/seasonService';
import { operationService } from '../services/operationService';
import { harvestService } from '../services/harvestService';
import { costService } from '../services/costService';
import { reminderService } from '../services/reminderService';
import { weatherService } from '../services/weatherService';
import { allMockData } from '../data/mockData';

interface AppState {
  fields: Field[];
  seasons: Season[];
  operations: Operation[];
  harvests: Harvest[];
  costs: Cost[];
  weather: Weather[];
  reminders: Reminder[];
  isLoading: boolean;
  error: string | null;
}

interface AppStore extends AppState {
  initData: () => Promise<void>;
  loadAllData: () => Promise<void>;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  clearError: () => void;

  addField: (field: Omit<Field, 'id' | 'createdAt'>) => Promise<Field>;
  updateField: (field: Field) => Promise<Field>;
  deleteField: (id: string) => Promise<void>;

  addSeason: (season: Omit<Season, 'id' | 'createdAt'>) => Promise<Season>;
  updateSeason: (season: Season) => Promise<Season>;
  deleteSeason: (id: string) => Promise<void>;

  addOperation: (operation: Omit<Operation, 'id' | 'createdAt'>) => Promise<Operation>;
  updateOperation: (operation: Operation) => Promise<Operation>;
  deleteOperation: (id: string) => Promise<void>;

  addHarvest: (harvest: Omit<Harvest, 'id' | 'createdAt'>) => Promise<Harvest>;
  updateHarvest: (harvest: Harvest) => Promise<Harvest>;
  deleteHarvest: (id: string) => Promise<void>;

  addCost: (cost: Omit<Cost, 'id' | 'createdAt'>) => Promise<Cost>;
  updateCost: (cost: Cost) => Promise<Cost>;
  deleteCost: (id: string) => Promise<void>;

  addReminder: (reminder: Omit<Reminder, 'id' | 'createdAt'>) => Promise<Reminder>;
  updateReminder: (reminder: Reminder) => Promise<Reminder>;
  deleteReminder: (id: string) => Promise<void>;
  markReminderCompleted: (id: string) => Promise<Reminder>;

  addWeather: (weather: Omit<Weather, 'id'>) => Promise<Weather>;

  selectFieldById: (id: string) => Field | undefined;
  selectSeasonById: (id: string) => Season | undefined;
  selectOperationById: (id: string) => Operation | undefined;
  selectHarvestById: (id: string) => Harvest | undefined;
  selectCostById: (id: string) => Cost | undefined;
  selectWeatherById: (id: string) => Weather | undefined;
  selectReminderById: (id: string) => Reminder | undefined;

  selectSeasonsByFieldId: (fieldId: string) => Season[];
  selectOperationsBySeasonId: (seasonId: string) => Operation[];
  selectHarvestsBySeasonId: (seasonId: string) => Harvest[];
  selectCostsBySeasonId: (seasonId: string) => Cost[];
  selectRemindersBySeasonId: (seasonId: string) => Reminder[];

  selectPendingReminders: () => Reminder[];
  selectActiveSeasons: () => Season[];
  selectCompletedSeasons: () => Season[];
  selectTotalArea: () => number;
}

export const useAppStore = create<AppStore>((set, get) => ({
  fields: [],
  seasons: [],
  operations: [],
  harvests: [],
  costs: [],
  weather: [],
  reminders: [],
  isLoading: false,
  error: null,

  initData: async () => {
    try {
      set({ isLoading: true, error: null });
      await initDB();

      const mockData = allMockData;
      
      const existingFields = await fieldService.getAllFields();
      if (existingFields.length === 0) {
        await bulkAdd('fields', mockData.fields);
        await bulkAdd('seasons', mockData.seasons);
        await bulkAdd('operations', mockData.operations);
        await bulkAdd('harvests', mockData.harvests);
        await bulkAdd('costs', mockData.costs);
        await bulkAdd('weather', mockData.weather);
        await bulkAdd('reminders', mockData.reminders);
      }

      await get().loadAllData();
    } catch (error) {
      set({ error: error instanceof Error ? error.message : '初始化数据失败' });
      throw error;
    } finally {
      set({ isLoading: false });
    }
  },

  loadAllData: async () => {
    try {
      set({ isLoading: true, error: null });
      
      const [
        fields,
        seasons,
        operations,
        harvests,
        costs,
        weather,
        reminders,
      ] = await Promise.all([
        fieldService.getAllFields(),
        seasonService.getAllSeasons(),
        operationService.getAllOperations(),
        harvestService.getAllHarvests(),
        costService.getAllCosts(),
        weatherService.getAllWeather(),
        reminderService.getAllReminders(),
      ]);

      set({
        fields,
        seasons,
        operations,
        harvests,
        costs,
        weather,
        reminders,
      });
    } catch (error) {
      set({ error: error instanceof Error ? error.message : '加载数据失败' });
      throw error;
    } finally {
      set({ isLoading: false });
    }
  },

  setLoading: (loading: boolean) => set({ isLoading: loading }),
  setError: (error: string | null) => set({ error }),
  clearError: () => set({ error: null }),

  addField: async (fieldData) => {
    try {
      const field = await fieldService.addField(fieldData);
      set((state) => ({ fields: [...state.fields, field] }));
      return field;
    } catch (error) {
      set({ error: error instanceof Error ? error.message : '添加地块失败' });
      throw error;
    }
  },

  updateField: async (field) => {
    try {
      const updated = await fieldService.updateField(field);
      set((state) => ({
        fields: state.fields.map((f) => (f.id === field.id ? updated : f)),
      }));
      return updated;
    } catch (error) {
      set({ error: error instanceof Error ? error.message : '更新地块失败' });
      throw error;
    }
  },

  deleteField: async (id) => {
    try {
      await fieldService.deleteField(id);
      set((state) => ({
        fields: state.fields.filter((f) => f.id !== id),
      }));
    } catch (error) {
      set({ error: error instanceof Error ? error.message : '删除地块失败' });
      throw error;
    }
  },

  addSeason: async (seasonData) => {
    try {
      const season = await seasonService.addSeason(seasonData);
      set((state) => ({ seasons: [...state.seasons, season] }));
      return season;
    } catch (error) {
      set({ error: error instanceof Error ? error.message : '添加种植季失败' });
      throw error;
    }
  },

  updateSeason: async (season) => {
    try {
      const updated = await seasonService.updateSeason(season);
      set((state) => ({
        seasons: state.seasons.map((s) => (s.id === season.id ? updated : s)),
      }));
      return updated;
    } catch (error) {
      set({ error: error instanceof Error ? error.message : '更新种植季失败' });
      throw error;
    }
  },

  deleteSeason: async (id) => {
    try {
      await seasonService.deleteSeason(id);
      set((state) => ({
        seasons: state.seasons.filter((s) => s.id !== id),
        reminders: state.reminders.filter((r) => r.seasonId !== id),
      }));
    } catch (error) {
      set({ error: error instanceof Error ? error.message : '删除种植季失败' });
      throw error;
    }
  },

  addOperation: async (operationData) => {
    try {
      const operation = await operationService.addOperation(operationData);
      set((state) => ({ operations: [...state.operations, operation] }));
      return operation;
    } catch (error) {
      set({ error: error instanceof Error ? error.message : '添加操作记录失败' });
      throw error;
    }
  },

  updateOperation: async (operation) => {
    try {
      const updated = await operationService.updateOperation(operation);
      set((state) => ({
        operations: state.operations.map((o) => (o.id === operation.id ? updated : o)),
      }));
      return updated;
    } catch (error) {
      set({ error: error instanceof Error ? error.message : '更新操作记录失败' });
      throw error;
    }
  },

  deleteOperation: async (id) => {
    try {
      await operationService.deleteOperation(id);
      set((state) => ({
        operations: state.operations.filter((o) => o.id !== id),
      }));
    } catch (error) {
      set({ error: error instanceof Error ? error.message : '删除操作记录失败' });
      throw error;
    }
  },

  addHarvest: async (harvestData) => {
    try {
      const harvest = await harvestService.addHarvest(harvestData);
      const existingHarvests = get().harvests.filter((h) => h.seasonId === harvestData.seasonId);
      const wasFirstHarvest = existingHarvests.length === 0;
      set((state) => ({ harvests: [...state.harvests, harvest] }));

      if (wasFirstHarvest) {
        const season = get().seasons.find((s) => s.id === harvestData.seasonId);
        if (season && season.status !== SeasonStatus.HARVESTED) {
          try {
            const updatedSeason = await seasonService.updateSeason({
              ...season,
              status: SeasonStatus.HARVESTED,
            });
            set((state) => ({
              seasons: state.seasons.map((s) => (s.id === season.id ? updatedSeason : s)),
            }));
          } catch (seasonErr) {
            console.warn('自动更新季节状态失败:', seasonErr);
          }
        }
      }

      return harvest;
    } catch (error) {
      set({ error: error instanceof Error ? error.message : '添加收成记录失败' });
      throw error;
    }
  },

  updateHarvest: async (harvest) => {
    try {
      const updated = await harvestService.updateHarvest(harvest);
      set((state) => ({
        harvests: state.harvests.map((h) => (h.id === harvest.id ? updated : h)),
      }));
      return updated;
    } catch (error) {
      set({ error: error instanceof Error ? error.message : '更新收成记录失败' });
      throw error;
    }
  },

  deleteHarvest: async (id) => {
    try {
      await harvestService.deleteHarvest(id);
      set((state) => ({
        harvests: state.harvests.filter((h) => h.id !== id),
      }));
    } catch (error) {
      set({ error: error instanceof Error ? error.message : '删除收成记录失败' });
      throw error;
    }
  },

  addCost: async (costData) => {
    try {
      const cost = await costService.addCost(costData);
      set((state) => ({ costs: [...state.costs, cost] }));
      return cost;
    } catch (error) {
      set({ error: error instanceof Error ? error.message : '添加成本记录失败' });
      throw error;
    }
  },

  updateCost: async (cost) => {
    try {
      const updated = await costService.updateCost(cost);
      set((state) => ({
        costs: state.costs.map((c) => (c.id === cost.id ? updated : c)),
      }));
      return updated;
    } catch (error) {
      set({ error: error instanceof Error ? error.message : '更新成本记录失败' });
      throw error;
    }
  },

  deleteCost: async (id) => {
    try {
      await costService.deleteCost(id);
      set((state) => ({
        costs: state.costs.filter((c) => c.id !== id),
      }));
    } catch (error) {
      set({ error: error instanceof Error ? error.message : '删除成本记录失败' });
      throw error;
    }
  },

  addReminder: async (reminderData) => {
    try {
      const reminder = await reminderService.addReminder(reminderData);
      set((state) => ({ reminders: [...state.reminders, reminder] }));
      return reminder;
    } catch (error) {
      set({ error: error instanceof Error ? error.message : '添加提醒失败' });
      throw error;
    }
  },

  updateReminder: async (reminder) => {
    try {
      const updated = await reminderService.updateReminder(reminder);
      set((state) => ({
        reminders: state.reminders.map((r) => (r.id === reminder.id ? updated : r)),
      }));
      return updated;
    } catch (error) {
      set({ error: error instanceof Error ? error.message : '更新提醒失败' });
      throw error;
    }
  },

  deleteReminder: async (id) => {
    try {
      await reminderService.deleteReminder(id);
      set((state) => ({
        reminders: state.reminders.filter((r) => r.id !== id),
      }));
    } catch (error) {
      set({ error: error instanceof Error ? error.message : '删除提醒失败' });
      throw error;
    }
  },

  markReminderCompleted: async (id) => {
    try {
      const updated = await reminderService.markAsCompleted(id);
      set((state) => ({
        reminders: state.reminders.map((r) => (r.id === id ? updated : r)),
      }));
      return updated;
    } catch (error) {
      set({ error: error instanceof Error ? error.message : '标记提醒完成失败' });
      throw error;
    }
  },

  addWeather: async (weatherData) => {
    try {
      const weather = await weatherService.addWeather(weatherData);
      set((state) => ({ weather: [...state.weather, weather] }));
      return weather;
    } catch (error) {
      set({ error: error instanceof Error ? error.message : '添加气象数据失败' });
      throw error;
    }
  },

  selectFieldById: (id) => get().fields.find((f) => f.id === id),
  selectSeasonById: (id) => get().seasons.find((s) => s.id === id),
  selectOperationById: (id) => get().operations.find((o) => o.id === id),
  selectHarvestById: (id) => get().harvests.find((h) => h.id === id),
  selectCostById: (id) => get().costs.find((c) => c.id === id),
  selectWeatherById: (id) => get().weather.find((w) => w.id === id),
  selectReminderById: (id) => get().reminders.find((r) => r.id === id),

  selectSeasonsByFieldId: (fieldId) => get().seasons.filter((s) => s.fieldId === fieldId),
  selectOperationsBySeasonId: (seasonId) => get().operations.filter((o) => o.seasonId === seasonId),
  selectHarvestsBySeasonId: (seasonId) => get().harvests.filter((h) => h.seasonId === seasonId),
  selectCostsBySeasonId: (seasonId) => get().costs.filter((c) => c.seasonId === seasonId),
  selectRemindersBySeasonId: (seasonId) => get().reminders.filter((r) => r.seasonId === seasonId),

  selectPendingReminders: () => get().reminders.filter((r) => !r.isCompleted),
  selectActiveSeasons: () => get().seasons.filter((s) => s.status === '种植中'),
  selectCompletedSeasons: () => get().seasons.filter((s) => s.status === '已采收'),
  selectTotalArea: () => get().fields.reduce((sum, f) => sum + f.area, 0),
}));
