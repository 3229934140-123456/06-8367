import { getAll, getById, add, update, remove, getByIndex, getSeasonsByFieldId } from '../db';
import type { Field, Season } from '../types';
import { validateField, createField } from '../db/models';

export const fieldService = {
  async getAllFields(): Promise<Field[]> {
    return getAll('fields');
  },

  async getFieldById(id: string): Promise<Field | undefined> {
    return getById('fields', id);
  },

  async getFieldSeasons(fieldId: string): Promise<Season[]> {
    return getSeasonsByFieldId(fieldId);
  },

  async addField(fieldData: Omit<Field, 'id' | 'createdAt'>): Promise<Field> {
    const validation = validateField(fieldData);
    if (!validation.valid) {
      throw new Error(validation.errors.join(', '));
    }
    const field = createField(fieldData);
    await add('fields', field);
    return field;
  },

  async updateField(field: Field): Promise<Field> {
    const validation = validateField(field);
    if (!validation.valid) {
      throw new Error(validation.errors.join(', '));
    }
    await update('fields', field);
    return field;
  },

  async deleteField(id: string): Promise<void> {
    const seasons = await this.getFieldSeasons(id);
    if (seasons.length > 0) {
      throw new Error('该地块下存在种植季，无法删除');
    }
    return remove('fields', id);
  },

  async getTotalArea(): Promise<number> {
    const fields = await this.getAllFields();
    return fields.reduce((sum, field) => sum + field.area, 0);
  },

  async getAreaStats(): Promise<{
    totalArea: number;
    fieldCount: number;
    avgArea: number;
    maxArea: number;
    minArea: number;
  }> {
    const fields = await this.getAllFields();
    const areas = fields.map((f) => f.area);
    
    return {
      totalArea: areas.reduce((sum, a) => sum + a, 0),
      fieldCount: fields.length,
      avgArea: areas.length > 0 ? areas.reduce((sum, a) => sum + a, 0) / areas.length : 0,
      maxArea: areas.length > 0 ? Math.max(...areas) : 0,
      minArea: areas.length > 0 ? Math.min(...areas) : 0,
    };
  },

  async getFieldsBySoilType(): Promise<Record<string, { count: number; area: number }>> {
    const fields = await this.getAllFields();
    const result: Record<string, { count: number; area: number }> = {};
    
    fields.forEach((field) => {
      if (!result[field.soilType]) {
        result[field.soilType] = { count: 0, area: 0 };
      }
      result[field.soilType].count++;
      result[field.soilType].area += field.area;
    });
    
    return result;
  },

  async searchFields(keyword: string): Promise<Field[]> {
    const fields = await this.getAllFields();
    const lowerKeyword = keyword.toLowerCase();
    
    return fields.filter(
      (field) =>
        field.name.toLowerCase().includes(lowerKeyword) ||
        field.location.toLowerCase().includes(lowerKeyword) ||
        field.soilType.toLowerCase().includes(lowerKeyword) ||
        field.description.toLowerCase().includes(lowerKeyword)
    );
  },
};
