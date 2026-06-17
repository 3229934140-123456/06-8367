import type {
  Field,
  Season,
  Operation,
  Harvest,
  Cost,
  Weather,
  Reminder,
  SoilType,
  OperationType,
  CostCategory,
  QualityGrade,
  SeasonStatus,
  WeatherCondition,
  ReminderType
} from '../types';
import { generateId } from '../db';
import { cropConfigs } from './cropConfigs';

const formatDate = (date: Date): string => {
  return date.toISOString().split('T')[0];
};

const addDays = (dateStr: string, days: number): string => {
  const date = new Date(dateStr);
  date.setDate(date.getDate() + days);
  return formatDate(date);
};

const randomBetween = (min: number, max: number): number => {
  return Math.floor(Math.random() * (max - min + 1)) + min;
};

const randomFloat = (min: number, max: number, decimals: number = 1): number => {
  return parseFloat((Math.random() * (max - min) + min).toFixed(decimals));
};

const randomPick = <T>(arr: T[]): T => {
  return arr[Math.floor(Math.random() * arr.length)];
};

export const mockFields: Field[] = [
  {
    id: generateId('field'),
    name: '东洼地',
    area: 50,
    soilType: '壤土' as SoilType,
    location: '村东头',
    description: '地势平坦，灌溉条件好，适合种植小麦、玉米',
    createdAt: '2023-01-15'
  },
  {
    id: generateId('field'),
    name: '西坡地',
    area: 35,
    soilType: '砂壤土' as SoilType,
    location: '村西坡',
    description: '排水性好，适合种植玉米、花生',
    createdAt: '2023-01-15'
  },
  {
    id: generateId('field'),
    name: '南稻田',
    area: 40,
    soilType: '粘壤土' as SoilType,
    location: '村南边',
    description: '水源充足，常年种植水稻',
    createdAt: '2023-01-15'
  },
  {
    id: generateId('field'),
    name: '北岗地',
    area: 45,
    soilType: '褐土' as SoilType,
    location: '村北岗',
    description: '地势较高，适合种植耐旱作物',
    createdAt: '2023-01-15'
  },
  {
    id: generateId('field'),
    name: '中心方',
    area: 60,
    soilType: '黑土' as SoilType,
    location: '村中心',
    description: '土壤肥沃，是主要的高产田块',
    createdAt: '2023-01-15'
  }
];

const cropSowingDates: Record<string, string[]> = {
  '小麦': ['2023-10-05', '2024-10-08', '2025-10-06'],
  '玉米': ['2023-06-10', '2024-06-12', '2025-06-08'],
  '水稻': ['2023-04-20', '2024-04-18', '2025-04-22']
};

const expectedYields: Record<string, number[]> = {
  '小麦': [450, 480, 500],
  '玉米': [600, 650, 700],
  '水稻': [550, 580, 600]
};

const fieldCropAssignments: Record<string, string[]> = {
  [mockFields[0].id]: ['小麦', '玉米', '小麦'],
  [mockFields[1].id]: ['玉米', '小麦', '玉米'],
  [mockFields[2].id]: ['水稻', '水稻', '水稻'],
  [mockFields[3].id]: ['玉米', '玉米', '小麦'],
  [mockFields[4].id]: ['小麦', '水稻', '玉米']
};

export const mockSeasons: Season[] = [];
export const mockOperations: Operation[] = [];
export const mockHarvests: Harvest[] = [];
export const mockCosts: Cost[] = [];
export const mockReminders: Reminder[] = [];

const operators = ['张三', '李四', '王五', '赵六', '陈七'];

const operationProducts: Record<string, string[]> = {
  '播种': ['优良品种'],
  '施肥': ['尿素', '复合肥', '磷酸二铵', '钾肥', '有机肥'],
  '打药': ['吡虫啉', '多菌灵', '三唑酮', '草甘膦', '除草剂'],
  '灌溉': ['地下水灌溉', '河水灌溉'],
  '除草': ['人工除草', '化学除草'],
  '整地': ['机械整地'],
  '收获': ['机械收获'],
  '间苗定苗': ['人工间苗'],
  '移栽': ['人工移栽'],
  '追肥': ['尿素', '复合肥', '叶面肥'],
  '一喷三防': ['杀虫剂+杀菌剂+叶面肥'],
  '叶面肥': ['磷酸二氢钾', '尿素溶液'],
  '防虫': ['吡虫啉', '氯氰菊酯', '阿维菌素'],
  '人工授粉': ['人工辅助授粉'],
  '田间管理': ['中耕培土'],
  '苗床管理': ['苗床浇水', '苗床施肥']
};

const costItems: Record<string, string[]> = {
  '种子': ['小麦种子', '玉米种子', '水稻种子'],
  '农药': ['杀虫剂', '杀菌剂', '除草剂', '植物生长调节剂'],
  '化肥': ['尿素', '复合肥', '磷肥', '钾肥', '有机肥'],
  '人工': ['播种人工', '施肥人工', '打药人工', '收获人工', '田间管理人工'],
  '农机': ['耕地费', '播种费', '收割费', '运输费'],
  '灌溉': ['水费', '电费', '灌溉设备维护'],
  '地租': ['土地租金'],
  '其他': ['工具购置费', '维修费', '其他杂费']
};

mockFields.forEach((field) => {
  const crops = fieldCropAssignments[field.id] || ['小麦', '玉米', '水稻'];
  
  crops.forEach((cropName, yearIdx) => {
    const year = 2023 + yearIdx;
    const sowDate = cropSowingDates[cropName][yearIdx];
    const cropConfig = cropConfigs[cropName];
    const expectedYield = expectedYields[cropName][yearIdx];
    
    const seasonId = generateId('season');
    const isCompleted = yearIdx < 2;
    
    const season: Season = {
      id: seasonId,
      fieldId: field.id,
      cropName,
      sowDate,
      expectedYield,
      status: isCompleted ? ('已采收' as SeasonStatus) : ('种植中' as SeasonStatus),
      createdAt: sowDate
    };
    mockSeasons.push(season);
    
    if (cropConfig) {
      cropConfig.stages.forEach((stage) => {
        const stageStartDate = addDays(sowDate, stage.daysAfterSowing);
        const stageMidDate = addDays(stageStartDate, Math.floor(stage.durationDays / 2));
        
        const reminderId = generateId('reminder');
        const remindDate = addDays(stageStartDate, -3);
        const reminderType = getReminderTypeForStage(stage.name);
        
        mockReminders.push({
          id: reminderId,
          seasonId,
          type: reminderType,
          remindDate,
          title: `${cropName} - ${stage.name}提醒`,
          content: `${field.name}地块的${cropName}即将进入${stage.name}，建议操作：${stage.operations.join('、')}`,
          isCompleted: isCompleted || remindDate < formatDate(new Date()),
          createdAt: sowDate
        });
        
        if (stage.operations.length > 0 && isCompleted) {
          stage.operations.forEach((opName) => {
            const opType = getOperationType(opName);
            if (opType) {
              const opDate = Math.random() > 0.5 ? stageStartDate : stageMidDate;
              const products = operationProducts[opType] || ['通用农资'];
              const product = randomPick(products);
              
              let dosage = 0;
              let dosageUnit = '';
              
              if (opType === '施肥' || opType === '追肥') {
                dosage = randomFloat(20, 40);
                dosageUnit = '公斤/亩';
              } else if (opType === '打药' || opType === '防虫') {
                dosage = randomFloat(30, 80);
                dosageUnit = '毫升/亩';
              } else if (opType === '灌溉') {
                dosage = randomFloat(30, 60);
                dosageUnit = '立方米/亩';
              } else if (opType === '播种') {
                dosage = randomFloat(10, 25);
                dosageUnit = '公斤/亩';
              } else if (opType === '收获') {
                dosage = field.area;
                dosageUnit = '亩';
              }
              
              mockOperations.push({
                id: generateId('operation'),
                seasonId,
                type: opType as OperationType,
                date: opDate,
                product,
                dosage,
                dosageUnit,
                operator: randomPick(operators),
                remark: `${stage.name}${opName}作业`,
                createdAt: opDate
              });
            }
          });
        }
      });
    }
    
    if (isCompleted) {
      const harvestDate = addDays(sowDate, cropConfig?.totalGrowthDays || 120);
      const actualYieldVariation = randomFloat(0.85, 1.15);
      const actualYield = Math.floor(expectedYield * actualYieldVariation);
      
      const qualityGrades: QualityGrade[] = ['特级' as QualityGrade, '一级' as QualityGrade, '二级' as QualityGrade];
      const qualityWeights = [0.3, 0.5, 0.2];
      const random = Math.random();
      let quality: QualityGrade = '一级' as QualityGrade;
      let cumulative = 0;
      for (let i = 0; i < qualityGrades.length; i++) {
        cumulative += qualityWeights[i];
        if (random <= cumulative) {
          quality = qualityGrades[i];
          break;
        }
      }
      
      const unitPriceByQuality: Record<string, number> = {
        '特级': cropName === '小麦' ? 3.2 : cropName === '玉米' ? 2.8 : 3.5,
        '一级': cropName === '小麦' ? 2.8 : cropName === '玉米' ? 2.4 : 3.0,
        '二级': cropName === '小麦' ? 2.4 : cropName === '玉米' ? 2.0 : 2.5,
        '等外品': cropName === '小麦' ? 1.8 : cropName === '玉米' ? 1.5 : 2.0
      };
      
      mockHarvests.push({
        id: generateId('harvest'),
        seasonId,
        harvestDate,
        actualYield: actualYield * field.area,
        quality,
        unitPrice: unitPriceByQuality[quality],
        remark: `${year}年${cropName}收获，品质${quality}`,
        createdAt: harvestDate
      });
      
      const costEntries: Array<{ category: CostCategory; multiplier: number }> = [
        { category: '种子' as CostCategory, multiplier: 1 },
        { category: '化肥' as CostCategory, multiplier: 2 },
        { category: '农药' as CostCategory, multiplier: 1 },
        { category: '人工' as CostCategory, multiplier: 2 },
        { category: '农机' as CostCategory, multiplier: 1 },
        { category: '灌溉' as CostCategory, multiplier: 0.5 }
      ];
      
      costEntries.forEach(({ category, multiplier }) => {
        const items = costItems[category] || ['其他'];
        const item = randomPick(items);
        const baseAmount = category === '种子' ? 80 : 
                          category === '化肥' ? 150 :
                          category === '农药' ? 60 :
                          category === '人工' ? 120 :
                          category === '农机' ? 100 :
                          category === '灌溉' ? 50 : 30;
        
        const costDate = addDays(sowDate, randomBetween(10, cropConfig?.totalGrowthDays || 100));
        
        mockCosts.push({
          id: generateId('cost'),
          seasonId,
          category,
          name: item,
          amount: Math.floor(baseAmount * field.area * multiplier * randomFloat(0.8, 1.2)),
          date: costDate,
          remark: `${field.name}地块${year}年${cropName}${item}支出`,
          createdAt: costDate
        });
      });
    }
  });
});

function getReminderTypeForStage(stageName: string): ReminderType {
  if (stageName.includes('播种') || stageName.includes('育秧') || stageName.includes('移栽')) {
    return '播种提醒' as ReminderType;
  } else if (stageName.includes('施肥') || stageName.includes('追肥') || stageName.includes('返青')) {
    return '施肥提醒' as ReminderType;
  } else if (stageName.includes('防虫') || stageName.includes('一喷三防') || stageName.includes('抽穗')) {
    return '打药提醒' as ReminderType;
  } else if (stageName.includes('灌溉') || stageName.includes('灌浆')) {
    return '灌溉提醒' as ReminderType;
  } else if (stageName.includes('收获') || stageName.includes('成熟')) {
    return '收获提醒' as ReminderType;
  } else if (stageName.includes('除草')) {
    return '除草提醒' as ReminderType;
  }
  return '生育期提醒' as ReminderType;
}

function getOperationType(opName: string): string | null {
  const typeMap: Record<string, string> = {
    '整地': '整地',
    '播种': '播种',
    '查苗补种': '间苗定苗',
    '冬灌': '灌溉',
    '追肥': '追肥',
    '返青肥': '施肥',
    '除草': '除草',
    '施肥': '施肥',
    '灌溉': '灌溉',
    '防虫': '防虫',
    '一喷三防': '一喷三防',
    '叶面肥': '叶面肥',
    '收获': '收获',
    '间苗定苗': '间苗定苗',
    '中耕': '田间管理',
    '人工授粉': '人工授粉',
    '播种育秧': '播种',
    '苗床管理': '苗床管理',
    '移栽': '移栽',
    '晒田': '田间管理',
    '干湿灌溉': '灌溉'
  };
  return typeMap[opName] || null;
}

export const mockWeather: Weather[] = [];

const seasonTemps: Record<number, { min: number; max: number }> = {
  1: { min: -5, max: 5 },
  2: { min: -2, max: 8 },
  3: { min: 3, max: 15 },
  4: { min: 8, max: 22 },
  5: { min: 14, max: 28 },
  6: { min: 19, max: 33 },
  7: { min: 22, max: 35 },
  8: { min: 21, max: 33 },
  9: { min: 15, max: 27 },
  10: { min: 8, max: 20 },
  11: { min: 2, max: 12 },
  12: { min: -3, max: 6 }
};

const today = new Date();
const startDate = new Date(today);
startDate.setFullYear(startDate.getFullYear() - 1);

for (let d = new Date(startDate); d <= today; d.setDate(d.getDate() + 1)) {
  const month = d.getMonth() + 1;
  const tempRange = seasonTemps[month];
  
  const maxTemp = randomFloat(tempRange.min + 5, tempRange.max, 1);
  const minTemp = randomFloat(tempRange.min, maxTemp - 3, 1);
  const avgTemp = parseFloat(((maxTemp + minTemp) / 2).toFixed(1));
  
  let rainfall = 0;
  let humidity = randomFloat(40, 70);
  let condition: WeatherCondition = '晴' as WeatherCondition;
  
  const weatherRandom = Math.random();
  if (weatherRandom < 0.5) {
    condition = '晴' as WeatherCondition;
  } else if (weatherRandom < 0.75) {
    condition = '多云' as WeatherCondition;
  } else if (weatherRandom < 0.85) {
    condition = '阴' as WeatherCondition;
    humidity = randomFloat(60, 80);
  } else if (weatherRandom < 0.92) {
    condition = '小雨' as WeatherCondition;
    rainfall = randomFloat(0.1, 10, 1);
    humidity = randomFloat(70, 90);
  } else if (weatherRandom < 0.97) {
    condition = '中雨' as WeatherCondition;
    rainfall = randomFloat(10, 30, 1);
    humidity = randomFloat(80, 95);
  } else {
    condition = '雷阵雨' as WeatherCondition;
    rainfall = randomFloat(20, 50, 1);
    humidity = randomFloat(85, 95);
  }
  
  if (month === 12 || month === 1 || month === 2) {
    if (Math.random() < 0.15) {
      condition = '雪' as WeatherCondition;
      rainfall = randomFloat(1, 10, 1);
    }
  }
  
  mockWeather.push({
    id: generateId('weather'),
    date: formatDate(new Date(d)),
    temperature: avgTemp,
    minTemperature: minTemp,
    maxTemperature: maxTemp,
    rainfall,
    humidity,
    weatherCondition: condition
  });
}

export const getAllMockData = () => ({
  fields: mockFields,
  seasons: mockSeasons,
  operations: mockOperations,
  harvests: mockHarvests,
  costs: mockCosts,
  weather: mockWeather,
  reminders: mockReminders
});

export const allMockData = getAllMockData();
