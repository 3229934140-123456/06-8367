import type { Field, Season, Operation, Harvest, Cost, Weather, Reminder } from '../types';
import { generateId } from './index';

export const createField = (data: Omit<Field, 'id' | 'createdAt'>): Field => ({
  id: generateId(),
  ...data,
  createdAt: new Date().toISOString(),
});

export const createSeason = (data: Omit<Season, 'id' | 'createdAt'>): Season => ({
  id: generateId(),
  ...data,
  createdAt: new Date().toISOString(),
});

export const createOperation = (data: Omit<Operation, 'id' | 'createdAt'>): Operation => ({
  id: generateId(),
  ...data,
  createdAt: new Date().toISOString(),
});

export const createHarvest = (data: Omit<Harvest, 'id' | 'createdAt'>): Harvest => ({
  id: generateId(),
  ...data,
  createdAt: new Date().toISOString(),
});

export const createCost = (data: Omit<Cost, 'id' | 'createdAt'>): Cost => ({
  id: generateId(),
  ...data,
  createdAt: new Date().toISOString(),
});

export const createWeather = (data: Omit<Weather, 'id'>): Weather => ({
  id: generateId(),
  ...data,
});

export const createReminder = (data: Omit<Reminder, 'id' | 'createdAt'>): Reminder => ({
  id: generateId(),
  ...data,
  createdAt: new Date().toISOString(),
});

export const validateField = (field: Partial<Field>): { valid: boolean; errors: string[] } => {
  const errors: string[] = [];
  
  if (!field.name || field.name.trim() === '') {
    errors.push('地块名称不能为空');
  }
  
  if (field.area !== undefined && (field.area <= 0 || isNaN(field.area))) {
    errors.push('地块面积必须大于0');
  }
  
  return { valid: errors.length === 0, errors };
};

export const validateSeason = (season: Partial<Season>): { valid: boolean; errors: string[] } => {
  const errors: string[] = [];
  
  if (!season.fieldId) {
    errors.push('必须关联地块');
  }
  
  if (!season.cropName || season.cropName.trim() === '') {
    errors.push('作物品种不能为空');
  }
  
  if (!season.sowDate) {
    errors.push('播种日期不能为空');
  }
  
  if (season.expectedYield !== undefined && (season.expectedYield <= 0 || isNaN(season.expectedYield))) {
    errors.push('预计产量必须大于0');
  }
  
  return { valid: errors.length === 0, errors };
};

export const validateOperation = (operation: Partial<Operation>): { valid: boolean; errors: string[] } => {
  const errors: string[] = [];
  
  if (!operation.seasonId) {
    errors.push('必须关联种植季');
  }
  
  if (!operation.type) {
    errors.push('操作类型不能为空');
  }
  
  if (!operation.date) {
    errors.push('操作日期不能为空');
  }
  
  return { valid: errors.length === 0, errors };
};

export const validateHarvest = (harvest: Partial<Harvest>): { valid: boolean; errors: string[] } => {
  const errors: string[] = [];
  
  if (!harvest.seasonId) {
    errors.push('必须关联种植季');
  }
  
  if (!harvest.harvestDate) {
    errors.push('采收日期不能为空');
  }
  
  if (harvest.actualYield !== undefined && (harvest.actualYield < 0 || isNaN(harvest.actualYield))) {
    errors.push('实际产量不能为负数');
  }
  
  if (harvest.unitPrice !== undefined && (harvest.unitPrice < 0 || isNaN(harvest.unitPrice))) {
    errors.push('销售单价不能为负数');
  }
  
  return { valid: errors.length === 0, errors };
};

export const validateCost = (cost: Partial<Cost>): { valid: boolean; errors: string[] } => {
  const errors: string[] = [];
  
  if (!cost.seasonId) {
    errors.push('必须关联种植季');
  }
  
  if (!cost.category) {
    errors.push('成本分类不能为空');
  }
  
  if (!cost.name || cost.name.trim() === '') {
    errors.push('项目名称不能为空');
  }
  
  if (cost.amount === undefined || cost.amount <= 0 || isNaN(cost.amount)) {
    errors.push('金额必须大于0');
  }
  
  return { valid: errors.length === 0, errors };
};

export const validateReminder = (reminder: Partial<Reminder>): { valid: boolean; errors: string[] } => {
  const errors: string[] = [];
  
  if (!reminder.seasonId) {
    errors.push('必须关联种植季');
  }
  
  if (!reminder.title || reminder.title.trim() === '') {
    errors.push('提醒标题不能为空');
  }
  
  if (!reminder.remindDate) {
    errors.push('提醒日期不能为空');
  }
  
  return { valid: errors.length === 0, errors };
};
