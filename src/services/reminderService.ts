import { getAll, getById, add, update, remove, getByIndex, getByBooleanIndex, getAllBySeasonId, getPendingReminders as getPendingFromDB } from '../db';
import type { Reminder, Season, ReminderType } from '../types';
import { validateReminder, createReminder } from '../db/models';
import { getCropConfig } from '../data/cropConfigs';
import { addDaysToDate, sortByDate, getDaysFromNow, isDateInRange } from '../utils/dateUtils';

export const reminderService = {
  async getAllReminders(): Promise<Reminder[]> {
    const reminders = await getAll('reminders');
    return sortByDate(reminders, 'remindDate');
  },

  async getReminderById(id: string): Promise<Reminder | undefined> {
    return getById('reminders', id);
  },

  async getRemindersBySeason(seasonId: string): Promise<Reminder[]> {
    const reminders = await getAllBySeasonId('reminders', seasonId);
    return sortByDate(reminders, 'remindDate');
  },

  async getRemindersByDate(date: string): Promise<Reminder[]> {
    return getByIndex('reminders', 'remindDate', date);
  },

  async getPendingReminders(): Promise<Reminder[]> {
    const reminders = await getPendingFromDB();
    return sortByDate(reminders, 'remindDate');
  },

  async getCompletedReminders(): Promise<Reminder[]> {
    const allReminders = await getAll('reminders');
    const reminders = allReminders.filter(r => r.isCompleted);
    return sortByDate(reminders, 'remindDate', true);
  },

  async getTodoList(days: number = 7): Promise<Reminder[]> {
    const reminders = await this.getPendingReminders();
    const today = new Date().toISOString().split('T')[0];
    const endDate = addDaysToDate(today, days);
    
    return reminders.filter((r) => isDateInRange(r.remindDate, today, endDate));
  },

  async getOverdueReminders(): Promise<Reminder[]> {
    const reminders = await this.getPendingReminders();
    const today = new Date().toISOString().split('T')[0];
    
    return reminders.filter((r) => r.remindDate < today);
  },

  async addReminder(reminderData: Omit<Reminder, 'id' | 'createdAt'>): Promise<Reminder> {
    const validation = validateReminder(reminderData);
    if (!validation.valid) {
      throw new Error(validation.errors.join(', '));
    }
    const reminder = createReminder(reminderData);
    await add('reminders', reminder);
    return reminder;
  },

  async updateReminder(reminder: Reminder): Promise<Reminder> {
    const validation = validateReminder(reminder);
    if (!validation.valid) {
      throw new Error(validation.errors.join(', '));
    }
    await update('reminders', reminder);
    return reminder;
  },

  async deleteReminder(id: string): Promise<void> {
    return remove('reminders', id);
  },

  async markAsCompleted(id: string): Promise<Reminder> {
    const reminder = await this.getReminderById(id);
    if (!reminder) {
      throw new Error('提醒不存在');
    }

    const updatedReminder: Reminder = {
      ...reminder,
      isCompleted: true,
    };

    return this.updateReminder(updatedReminder);
  },

  async markAsPending(id: string): Promise<Reminder> {
    const reminder = await this.getReminderById(id);
    if (!reminder) {
      throw new Error('提醒不存在');
    }

    const updatedReminder: Reminder = {
      ...reminder,
      isCompleted: false,
    };

    return this.updateReminder(updatedReminder);
  },

  async generateRemindersForSeason(season: Season): Promise<Reminder[]> {
    const config = getCropConfig(season.cropName);
    if (!config) {
      return [];
    }

    const existingReminders = await this.getRemindersBySeason(season.id);
    const existingTitles = new Set(existingReminders.map((r) => r.title));

    const newReminders: Reminder[] = [];

    for (const stage of config.stages) {
      const stageStartDate = addDaysToDate(season.sowDate, stage.daysAfterSowing);
      const remindDate = addDaysToDate(stageStartDate, -3);

      for (const operation of stage.operations) {
        const title = `${stage.name} - ${operation}`;
        
        if (!existingTitles.has(title)) {
          const reminderType = getReminderType(operation);
          const reminder = createReminder({
            seasonId: season.id,
            type: reminderType,
            remindDate,
            title,
            content: `建议在${stage.name}进行${operation}操作，请及时处理。`,
            isCompleted: false,
          });
          newReminders.push(reminder);
        }
      }
    }

    const createdReminders: Reminder[] = [];
    for (const reminder of newReminders) {
      const { id, createdAt, ...data } = reminder;
      const created = await this.addReminder(data);
      createdReminders.push(created);
    }

    return createdReminders;
  },

  async generateRemindersForAllSeasons(seasons: Season[]): Promise<Reminder[]> {
    const activeSeasons = seasons.filter((s) => s.status === '种植中');
    const allReminders: Reminder[] = [];

    for (const season of activeSeasons) {
      const reminders = await this.generateRemindersForSeason(season);
      allReminders.push(...reminders);
    }

    return allReminders;
  },

  async getReminderStats(): Promise<{
    total: number;
    pending: number;
    completed: number;
    overdue: number;
    today: number;
    thisWeek: number;
  }> {
    const all = await this.getAllReminders();
    const pending = await this.getPendingReminders();
    const today = new Date().toISOString().split('T')[0];
    const weekEnd = addDaysToDate(today, 7);

    return {
      total: all.length,
      pending: pending.length,
      completed: all.length - pending.length,
      overdue: pending.filter((r) => r.remindDate < today).length,
      today: pending.filter((r) => r.remindDate === today).length,
      thisWeek: pending.filter((r) => isDateInRange(r.remindDate, today, weekEnd)).length,
    };
  },

  async getRemindersByPriority(): Promise<{
    urgent: Reminder[];
    today: Reminder[];
    thisWeek: Reminder[];
    later: Reminder[];
  }> {
    const pending = await this.getPendingReminders();
    const today = new Date().toISOString().split('T')[0];
    const weekEnd = addDaysToDate(today, 7);

    const urgent: Reminder[] = [];
    const todayReminders: Reminder[] = [];
    const thisWeek: Reminder[] = [];
    const later: Reminder[] = [];

    for (const reminder of pending) {
      const daysUntil = getDaysFromNow(reminder.remindDate);
      
      if (daysUntil < 0) {
        urgent.push(reminder);
      } else if (daysUntil === 0) {
        todayReminders.push(reminder);
      } else if (daysUntil <= 7) {
        thisWeek.push(reminder);
      } else {
        later.push(reminder);
      }
    }

    return { urgent, today: todayReminders, thisWeek, later };
  },

  async deleteRemindersBySeason(seasonId: string): Promise<void> {
    const reminders = await this.getRemindersBySeason(seasonId);
    for (const reminder of reminders) {
      await this.deleteReminder(reminder.id);
    }
  },

  async getUpcomingReminders(limit: number = 10): Promise<Reminder[]> {
    const pending = await this.getPendingReminders();
    return pending.slice(0, limit);
  },
};

function getReminderType(operation: string): ReminderType {
  if (operation.includes('施肥') || operation.includes('追肥')) {
    return '施肥提醒' as ReminderType;
  } else if (operation.includes('打药') || operation.includes('防虫') || operation.includes('一喷三防')) {
    return '打药提醒' as ReminderType;
  } else if (operation.includes('灌溉')) {
    return '灌溉提醒' as ReminderType;
  } else if (operation.includes('收获')) {
    return '收获提醒' as ReminderType;
  } else if (operation.includes('播种') || operation.includes('移栽')) {
    return '播种提醒' as ReminderType;
  } else if (operation.includes('除草')) {
    return '除草提醒' as ReminderType;
  }
  return '生育期提醒' as ReminderType;
}
