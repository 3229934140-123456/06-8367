import { format, parseISO, differenceInDays, addDays, startOfDay, endOfDay, isWithinInterval, getYear, getMonth, formatISO } from 'date-fns';
import { zhCN } from 'date-fns/locale';

export const formatDate = (date: string | Date, formatStr: string = 'yyyy-MM-dd'): string => {
  const d = typeof date === 'string' ? parseISO(date) : date;
  return format(d, formatStr, { locale: zhCN });
};

export const formatDateChinese = (date: string | Date): string => {
  const d = typeof date === 'string' ? parseISO(date) : date;
  return format(d, 'yyyy年MM月dd日', { locale: zhCN });
};

export const formatDateTime = (date: string | Date): string => {
  const d = typeof date === 'string' ? parseISO(date) : date;
  return format(d, 'yyyy-MM-dd HH:mm:ss', { locale: zhCN });
};

export const getDaysBetween = (startDate: string | Date, endDate: string | Date): number => {
  const start = typeof startDate === 'string' ? parseISO(startDate) : startDate;
  const end = typeof endDate === 'string' ? parseISO(endDate) : endDate;
  return differenceInDays(end, start);
};

export const getDaysFromNow = (date: string | Date): number => {
  const d = typeof date === 'string' ? parseISO(date) : date;
  return differenceInDays(d, new Date());
};

export const getDaysSince = (date: string | Date): number => {
  const d = typeof date === 'string' ? parseISO(date) : date;
  return differenceInDays(new Date(), d);
};

export const addDaysToDate = (date: string | Date, days: number): string => {
  const d = typeof date === 'string' ? parseISO(date) : date;
  return formatISO(addDays(d, days), { representation: 'date' });
};

export const isDateInRange = (
  date: string | Date,
  startDate: string | Date,
  endDate: string | Date
): boolean => {
  const d = typeof date === 'string' ? parseISO(date) : date;
  const start = typeof startDate === 'string' ? parseISO(startDate) : startDate;
  const end = typeof endDate === 'string' ? parseISO(endDate) : endDate;
  
  return isWithinInterval(d, {
    start: startOfDay(start),
    end: endOfDay(end),
  });
};

export const getYearFromDate = (date: string | Date): number => {
  const d = typeof date === 'string' ? parseISO(date) : date;
  return getYear(d);
};

export const getMonthFromDate = (date: string | Date): number => {
  const d = typeof date === 'string' ? parseISO(date) : date;
  return getMonth(d) + 1;
};

export const getSeason = (date: string | Date): '春' | '夏' | '秋' | '冬' => {
  const month = getMonthFromDate(date);
  
  if (month >= 3 && month <= 5) return '春';
  if (month >= 6 && month <= 8) return '夏';
  if (month >= 9 && month <= 11) return '秋';
  return '冬';
};

export const getSeasonName = (date: string | Date): string => {
  const season = getSeason(date);
  const seasonNames = {
    '春': '春季',
    '夏': '夏季',
    '秋': '秋季',
    '冬': '冬季',
  };
  return seasonNames[season];
};

export const getTodayString = (): string => {
  return formatISO(new Date(), { representation: 'date' });
};

export const getDateRange = (days: number): { startDate: string; endDate: string } => {
  const endDate = getTodayString();
  const startDate = addDaysToDate(new Date(), -days + 1);
  return { startDate, endDate };
};

export const getMonthRange = (year: number, month: number): { startDate: string; endDate: string } => {
  const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
  const lastDay = new Date(year, month, 0).getDate();
  const endDate = `${year}-${String(month).padStart(2, '0')}-${lastDay}`;
  return { startDate, endDate };
};

export const getYearRange = (year: number): { startDate: string; endDate: string } => {
  return {
    startDate: `${year}-01-01`,
    endDate: `${year}-12-31`,
  };
};

export const formatRelativeTime = (date: string | Date): string => {
  const days = getDaysFromNow(date);
  
  if (days === 0) return '今天';
  if (days === 1) return '明天';
  if (days === -1) return '昨天';
  if (days > 0 && days < 7) return `${days}天后`;
  if (days < 0 && days > -7) return `${Math.abs(days)}天前`;
  
  return formatDate(date);
};

export const sortByDate = <T>(
  items: T[],
  dateField: keyof T = 'date' as keyof T,
  ascending: boolean = false
): T[] => {
  return [...items].sort((a, b) => {
    const dateA = new Date(String(a[dateField])).getTime();
    const dateB = new Date(String(b[dateField])).getTime();
    return ascending ? dateA - dateB : dateB - dateA;
  });
};

export const groupByMonth = <T extends { date: string }>(items: T[]): Record<string, T[]> => {
  return items.reduce((groups, item) => {
    const monthKey = formatDate(item.date, 'yyyy-MM');
    if (!groups[monthKey]) {
      groups[monthKey] = [];
    }
    groups[monthKey].push(item);
    return groups;
  }, {} as Record<string, T[]>);
};

export const groupByYear = <T extends { date: string }>(items: T[]): Record<number, T[]> => {
  return items.reduce((groups, item) => {
    const year = getYearFromDate(item.date);
    if (!groups[year]) {
      groups[year] = [];
    }
    groups[year].push(item);
    return groups;
  }, {} as Record<number, T[]>);
};
