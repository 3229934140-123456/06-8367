import { getAll, getById, add, update, remove, getByIndex, getAllBySeasonId } from '../db';
import type { Operation, Weather, Season } from '../types';
import { validateOperation, createOperation } from '../db/models';
import { sortByDate, isDateInRange, getDateRange } from '../utils/dateUtils';

export const operationService = {
  async getAllOperations(): Promise<Operation[]> {
    const operations = await getAll('operations');
    return sortByDate(operations, 'date');
  },

  async getOperationById(id: string): Promise<Operation | undefined> {
    return getById('operations', id);
  },

  async getOperationsBySeason(seasonId: string): Promise<Operation[]> {
    const operations = await getAllBySeasonId('operations', seasonId);
    return sortByDate(operations, 'date');
  },

  async getOperationsByType(type: string): Promise<Operation[]> {
    const operations = await getByIndex('operations', 'type', type);
    return sortByDate(operations, 'date');
  },

  async getOperationsByDate(date: string): Promise<Operation[]> {
    const operations = await getByIndex('operations', 'date', date);
    return sortByDate(operations, 'date');
  },

  async getOperationsByField(fieldId: string, seasons: Season[]): Promise<Operation[]> {
    const seasonIds = seasons.filter((s) => s.fieldId === fieldId).map((s) => s.id);
    const allOperations = await this.getAllOperations();
    return allOperations.filter((op) => seasonIds.includes(op.seasonId));
  },

  async getOperationsByDateRange(startDate: string, endDate: string): Promise<Operation[]> {
    const operations = await this.getAllOperations();
    return operations
      .filter((op) => isDateInRange(op.date, startDate, endDate))
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  },

  async filterOperations(filters: {
    type?: string;
    seasonId?: string;
    startDate?: string;
    endDate?: string;
    operator?: string;
  }): Promise<Operation[]> {
    let operations = await this.getAllOperations();

    if (filters.type) {
      operations = operations.filter((op) => op.type === filters.type);
    }

    if (filters.seasonId) {
      operations = operations.filter((op) => op.seasonId === filters.seasonId);
    }

    if (filters.startDate && filters.endDate) {
      operations = operations.filter((op) =>
        isDateInRange(op.date, filters.startDate!, filters.endDate!)
      );
    }

    if (filters.operator) {
      operations = operations.filter(
        (op) => op.operator.toLowerCase().includes(filters.operator!.toLowerCase())
      );
    }

    return sortByDate(operations, 'date');
  },

  async addOperation(
    operationData: Omit<Operation, 'id' | 'createdAt'>
  ): Promise<Operation> {
    const validation = validateOperation(operationData);
    if (!validation.valid) {
      throw new Error(validation.errors.join(', '));
    }
    const operation = createOperation(operationData);
    await add('operations', operation);
    return operation;
  },

  async updateOperation(operation: Operation): Promise<Operation> {
    const validation = validateOperation(operation);
    if (!validation.valid) {
      throw new Error(validation.errors.join(', '));
    }
    await update('operations', operation);
    return operation;
  },

  async deleteOperation(id: string): Promise<void> {
    return remove('operations', id);
  },

  async getOperationWeather(operationId: string, weatherData: Weather[]): Promise<Weather | undefined> {
    const operation = await this.getOperationById(operationId);
    if (!operation) return undefined;
    return weatherData.find((w) => w.date === operation.date);
  },

  async getOperationsWithWeather(
    operations: Operation[],
    weatherData: Weather[]
  ): Promise<Array<Operation & { weather?: Weather }>> {
    return operations.map((op) => ({
      ...op,
      weather: weatherData.find((w) => w.date === op.date),
    }));
  },

  async getRecentOperations(days: number = 30): Promise<Operation[]> {
    const { startDate, endDate } = getDateRange(days);
    return this.getOperationsByDateRange(startDate, endDate);
  },

  async getOperationStats(): Promise<{
    byType: Record<string, number>;
    totalCount: number;
    thisMonthCount: number;
    byOperator: Record<string, number>;
  }> {
    const operations = await this.getAllOperations();
    const now = new Date();
    const thisMonth = now.getMonth();
    const thisYear = now.getFullYear();

    const byType: Record<string, number> = {};
    const byOperator: Record<string, number> = {};
    let thisMonthCount = 0;

    operations.forEach((op) => {
      const opDate = new Date(op.date);
      
      byType[op.type] = (byType[op.type] || 0) + 1;
      
      if (op.operator) {
        byOperator[op.operator] = (byOperator[op.operator] || 0) + 1;
      }
      
      if (opDate.getMonth() === thisMonth && opDate.getFullYear() === thisYear) {
        thisMonthCount++;
      }
    });

    return {
      byType,
      totalCount: operations.length,
      thisMonthCount,
      byOperator,
    };
  },

  async getOperationTypes(): Promise<string[]> {
    const operations = await this.getAllOperations();
    const types = new Set<string>(operations.map((op) => op.type));
    return Array.from(types);
  },

  async getOperators(): Promise<string[]> {
    const operations = await this.getAllOperations();
    const operators = new Set<string>(operations.map((op) => op.operator).filter(Boolean) as string[]);
    return Array.from(operators);
  },

  async getOperationsBySeasonAndType(seasonId: string, type: string): Promise<Operation[]> {
    const operations = await this.getOperationsBySeason(seasonId);
    return operations.filter((op) => op.type === type);
  },

  async getOperationCountBySeason(seasonId: string): Promise<number> {
    const operations = await this.getOperationsBySeason(seasonId);
    return operations.length;
  },
};
