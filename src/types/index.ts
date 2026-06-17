export enum SoilType {
  SANDY = '砂壤土',
  LOAM = '壤土',
  CLAY = '粘壤土',
  SILT = '粉壤土',
  SANDY_LOAM = '沙壤土',
  BROWN = '褐土',
  BLACK = '黑土',
  RED = '红壤'
}

export enum OperationType {
  SOW = '播种',
  FERTILIZE = '施肥',
  PESTICIDE = '打药',
  IRRIGATE = '灌溉',
  WEED = '除草',
  PLOW = '整地',
  HARVEST = '收获',
  THINNING = '间苗定苗',
  TRANSPLANT = '移栽',
  TOPDRESSING = '追肥',
  SPRAY = '一喷三防',
  FOLIAR_FERTILIZER = '叶面肥',
  INSECT_CONTROL = '防虫',
  ARTIFICIAL_POLLINATION = '人工授粉',
  FIELD_MANAGEMENT = '田间管理',
  SEEDLING_MANAGEMENT = '苗床管理'
}

export enum CostCategory {
  SEED = '种子',
  PESTICIDE = '农药',
  FERTILIZER = '化肥',
  LABOR = '人工',
  MACHINERY = '农机',
  IRRIGATION = '灌溉',
  LAND = '地租',
  OTHER = '其他'
}

export enum QualityGrade {
  EXCELLENT = '特级',
  GOOD = '一级',
  NORMAL = '二级',
  POOR = '等外品'
}

export enum SeasonStatus {
  PLANTING = '种植中',
  HARVESTED = '已采收'
}

export enum WeatherCondition {
  SUNNY = '晴',
  CLOUDY = '多云',
  OVERCAST = '阴',
  LIGHT_RAIN = '小雨',
  MODERATE_RAIN = '中雨',
  HEAVY_RAIN = '大雨',
  STORM = '暴雨',
  THUNDERSTORM = '雷阵雨',
  SNOW = '雪',
  HAIL = '冰雹',
  FOG = '雾'
}

export enum ReminderType {
  FERTILIZE = '施肥提醒',
  PESTICIDE = '打药提醒',
  IRRIGATE = '灌溉提醒',
  HARVEST = '收获提醒',
  SOW = '播种提醒',
  WEED = '除草提醒',
  PEST = '虫害防治',
  DISEASE = '病害防治',
  GROWTH_STAGE = '生育期提醒'
}

export enum CropType {
  WHEAT = '小麦',
  CORN = '玉米',
  RICE = '水稻'
}

export interface GrowthStage {
  name: string;
  daysAfterSowing: number;
  durationDays: number;
  operations: string[];
}

export interface CropConfig {
  name: string;
  totalGrowthDays: number;
  stages: GrowthStage[];
}

export interface Field {
  id: string;
  name: string;
  area: number;
  soilType: SoilType;
  location: string;
  description: string;
  createdAt: string;
}

export interface Season {
  id: string;
  fieldId: string;
  cropName: string;
  sowDate: string;
  expectedYield: number;
  status: SeasonStatus;
  createdAt: string;
}

export interface Operation {
  id: string;
  seasonId: string;
  type: OperationType;
  date: string;
  product: string;
  dosage: number;
  dosageUnit: string;
  operator: string;
  remark: string;
  createdAt: string;
}

export interface Harvest {
  id: string;
  seasonId: string;
  harvestDate: string;
  actualYield: number;
  quality: QualityGrade;
  unitPrice: number;
  remark: string;
  createdAt: string;
}

export interface Cost {
  id: string;
  seasonId: string;
  category: CostCategory;
  name: string;
  amount: number;
  date: string;
  remark: string;
  createdAt: string;
}

export interface Weather {
  id: string;
  date: string;
  temperature: number;
  minTemperature: number;
  maxTemperature: number;
  rainfall: number;
  humidity: number;
  weatherCondition: WeatherCondition;
}

export interface Reminder {
  id: string;
  seasonId: string;
  type: ReminderType;
  remindDate: string;
  title: string;
  content: string;
  isCompleted: boolean;
  createdAt: string;
}

export type EntityType = 'fields' | 'seasons' | 'operations' | 'harvests' | 'costs' | 'weather' | 'reminders';

export interface SeasonWithDetails extends Season {
  field?: Field;
  operations?: Operation[];
  harvest?: Harvest;
  costs?: Cost[];
  reminders?: Reminder[];
}

export interface FieldWithSeasons extends Field {
  seasons?: Season[];
}

export interface CostStats {
  category: string;
  totalAmount: number;
  percentage: number;
}

export interface YieldComparison {
  cropName: string;
  year: number;
  actualYield: number;
  expectedYield: number;
  deviation: number;
  deviationRate: number;
  seasonId: string;
  isAbnormal: boolean;
  abnormalLevel: 'normal' | 'warning' | 'danger';
}

export interface WeatherSummary {
  avgTemperature: number;
  totalRainfall: number;
  avgHumidity: number;
  sunnyDays: number;
  rainyDays: number;
}

export interface WeatherYieldAnalysis {
  date: string;
  temperature: number;
  rainfall: number;
  yield: number;
  seasonId?: string;
}
