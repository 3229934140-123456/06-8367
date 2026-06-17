import { openDB, IDBPDatabase, StoreKey, StoreNames, StoreValue } from 'idb';
import type {
  Field,
  Season,
  Operation,
  Harvest,
  Cost,
  Weather,
  Reminder,
  EntityType
} from '../types';

let idCounter = 0;

export const generateId = (prefix: string = 'id'): string => {
  return `${prefix}_${Date.now()}_${++idCounter}`;
};

export const DB_NAME = 'farm-management-db';
export const DB_VERSION = 1;

export type StoreMap = {
  fields: Field;
  seasons: Season;
  operations: Operation;
  harvests: Harvest;
  costs: Cost;
  weather: Weather;
  reminders: Reminder;
};

export type ValidStoreName = keyof StoreMap;

let dbPromise: Promise<IDBPDatabase<StoreMap>> | null = null;

export const initDB = async (): Promise<IDBPDatabase<StoreMap>> => {
  if (dbPromise) {
    return dbPromise;
  }

  dbPromise = openDB<StoreMap>(DB_NAME, DB_VERSION, {
    upgrade(db) {
      if (!db.objectStoreNames.contains('fields')) {
        const fieldsStore = db.createObjectStore('fields', {
          keyPath: 'id'
        });
        fieldsStore.createIndex('name', 'name', { unique: false });
        fieldsStore.createIndex('createdAt', 'createdAt', { unique: false });
      }

      if (!db.objectStoreNames.contains('seasons')) {
        const seasonsStore = db.createObjectStore('seasons', {
          keyPath: 'id'
        });
        seasonsStore.createIndex('fieldId', 'fieldId', { unique: false });
        seasonsStore.createIndex('cropName', 'cropName', { unique: false });
        seasonsStore.createIndex('status', 'status', { unique: false });
        seasonsStore.createIndex('sowDate', 'sowDate', { unique: false });
        seasonsStore.createIndex('createdAt', 'createdAt', { unique: false });
      }

      if (!db.objectStoreNames.contains('operations')) {
        const operationsStore = db.createObjectStore('operations', {
          keyPath: 'id'
        });
        operationsStore.createIndex('seasonId', 'seasonId', { unique: false });
        operationsStore.createIndex('type', 'type', { unique: false });
        operationsStore.createIndex('date', 'date', { unique: false });
        operationsStore.createIndex('createdAt', 'createdAt', { unique: false });
      }

      if (!db.objectStoreNames.contains('harvests')) {
        const harvestsStore = db.createObjectStore('harvests', {
          keyPath: 'id'
        });
        harvestsStore.createIndex('seasonId', 'seasonId', { unique: false });
        harvestsStore.createIndex('harvestDate', 'harvestDate', { unique: false });
        harvestsStore.createIndex('quality', 'quality', { unique: false });
        harvestsStore.createIndex('createdAt', 'createdAt', { unique: false });
      }

      if (!db.objectStoreNames.contains('costs')) {
        const costsStore = db.createObjectStore('costs', {
          keyPath: 'id'
        });
        costsStore.createIndex('seasonId', 'seasonId', { unique: false });
        costsStore.createIndex('category', 'category', { unique: false });
        costsStore.createIndex('date', 'date', { unique: false });
        costsStore.createIndex('createdAt', 'createdAt', { unique: false });
      }

      if (!db.objectStoreNames.contains('weather')) {
        const weatherStore = db.createObjectStore('weather', {
          keyPath: 'id'
        });
        weatherStore.createIndex('date', 'date', { unique: true });
        weatherStore.createIndex('weatherCondition', 'weatherCondition', { unique: false });
      }

      if (!db.objectStoreNames.contains('reminders')) {
        const remindersStore = db.createObjectStore('reminders', {
          keyPath: 'id'
        });
        remindersStore.createIndex('seasonId', 'seasonId', { unique: false });
        remindersStore.createIndex('type', 'type', { unique: false });
        remindersStore.createIndex('remindDate', 'remindDate', { unique: false });
        remindersStore.createIndex('isCompleted', 'isCompleted', { unique: false });
        remindersStore.createIndex('createdAt', 'createdAt', { unique: false });
      }
    }
  });

  return dbPromise;
};

export const getDB = async (): Promise<IDBPDatabase<StoreMap>> => {
  return initDB();
};

export const getAll = async <Name extends ValidStoreName>(
  storeName: Name
): Promise<StoreValue<StoreMap, Name>[]> => {
  const db = await getDB();
  return db.getAll(storeName);
};

export const getById = async <Name extends ValidStoreName>(
  storeName: Name,
  id: StoreKey<StoreMap, Name>
): Promise<StoreValue<StoreMap, Name> | undefined> => {
  const db = await getDB();
  return db.get(storeName, id);
};

export const getByIndex = async <Name extends ValidStoreName>(
  storeName: Name,
  indexName: string,
  value: IDBValidKey
): Promise<StoreValue<StoreMap, Name>[]> => {
  const db = await getDB();
  return db.getAllFromIndex(storeName, indexName, value);
};

export const getByBooleanIndex = async <Name extends ValidStoreName>(
  storeName: Name,
  indexName: string,
  value: boolean
): Promise<StoreValue<StoreMap, Name>[]> => {
  const db = await getDB();
  const all = await db.getAll(storeName);
  return all.filter((item: any) => item[indexName] === value);
};

export const add = async <Name extends ValidStoreName>(
  storeName: Name,
  value: StoreValue<StoreMap, Name>
): Promise<StoreKey<StoreMap, Name>> => {
  const db = await getDB();
  return db.add(storeName, value);
};

export const addBatch = async <Name extends ValidStoreName>(
  storeName: Name,
  values: StoreValue<StoreMap, Name>[]
): Promise<void> => {
  const db = await getDB();
  const tx = db.transaction(storeName, 'readwrite');
  const store = tx.store;
  
  for (const value of values) {
    await store.add(value);
  }
  
  await tx.done;
};

export const update = async <Name extends ValidStoreName>(
  storeName: Name,
  value: StoreValue<StoreMap, Name>
): Promise<StoreKey<StoreMap, Name>> => {
  const db = await getDB();
  return db.put(storeName, value);
};

export const updateBatch = async <Name extends ValidStoreName>(
  storeName: Name,
  values: StoreValue<StoreMap, Name>[]
): Promise<void> => {
  const db = await getDB();
  const tx = db.transaction(storeName, 'readwrite');
  const store = tx.store;
  
  for (const value of values) {
    await store.put(value);
  }
  
  await tx.done;
};

export const remove = async <Name extends ValidStoreName>(
  storeName: Name,
  id: StoreKey<StoreMap, Name>
): Promise<void> => {
  const db = await getDB();
  await db.delete(storeName, id);
};

export const clearStore = async <Name extends ValidStoreName>(
  storeName: Name
): Promise<void> => {
  const db = await getDB();
  await db.clear(storeName);
};

export const clearAllStores = async (): Promise<void> => {
  const storeNames: ValidStoreName[] = ['fields', 'seasons', 'operations', 'harvests', 'costs', 'weather', 'reminders'];
  const db = await getDB();
  const tx = db.transaction(storeNames, 'readwrite');
  
  for (const storeName of storeNames) {
    await tx.objectStore(storeName).clear();
  }
  
  await tx.done;
};

export const getAllBySeasonId = async <Name extends ValidStoreName>(
  storeName: Name,
  seasonId: string
): Promise<StoreValue<StoreMap, Name>[]> => {
  return getByIndex(storeName, 'seasonId', seasonId);
};

export const getSeasonsByFieldId = async (fieldId: string): Promise<Season[]> => {
  return getByIndex('seasons', 'fieldId', fieldId);
};

export const getWeatherByDateRange = async (startDate: string, endDate: string): Promise<Weather[]> => {
  const db = await getDB();
  const allWeather = await db.getAll('weather');
  return allWeather.filter(w => w.date >= startDate && w.date <= endDate);
};

export const getWeatherByDate = async (date: string): Promise<Weather | undefined> => {
  const results = await getByIndex('weather', 'date', date);
  return results[0];
};

export const getRemindersBySeasonId = async (seasonId: string): Promise<Reminder[]> => {
  return getAllBySeasonId('reminders', seasonId);
};

export const getPendingReminders = async (): Promise<Reminder[]> => {
  const db = await getDB();
  const allReminders = await db.getAll('reminders');
  return allReminders.filter(r => !r.isCompleted);
};

export const bulkAdd = async <Name extends ValidStoreName>(
  storeName: Name,
  values: StoreValue<StoreMap, Name>[]
): Promise<void> => {
  const db = await getDB();
  const tx = db.transaction(storeName, 'readwrite');
  const store = tx.store;
  
  for (const value of values) {
    await store.add(value);
  }
  
  await tx.done;
};
