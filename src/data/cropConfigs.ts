import type { CropConfig } from '../types';

export const cropConfigs: Record<string, CropConfig> = {
  '小麦': {
    name: '小麦',
    totalGrowthDays: 230,
    stages: [
      { name: '播种期', daysAfterSowing: 0, durationDays: 10, operations: ['整地', '播种'] },
      { name: '出苗期', daysAfterSowing: 10, durationDays: 20, operations: ['查苗补种'] },
      { name: '分蘖期', daysAfterSowing: 30, durationDays: 50, operations: ['冬灌', '追肥'] },
      { name: '返青期', daysAfterSowing: 80, durationDays: 30, operations: ['返青肥', '除草'] },
      { name: '拔节期', daysAfterSowing: 110, durationDays: 25, operations: ['追肥', '灌溉', '防虫'] },
      { name: '抽穗期', daysAfterSowing: 135, durationDays: 30, operations: ['一喷三防', '灌溉'] },
      { name: '灌浆期', daysAfterSowing: 165, durationDays: 40, operations: ['叶面肥', '防虫'] },
      { name: '成熟期', daysAfterSowing: 205, durationDays: 25, operations: ['收获'] },
    ],
  },
  '玉米': {
    name: '玉米',
    totalGrowthDays: 120,
    stages: [
      { name: '播种期', daysAfterSowing: 0, durationDays: 7, operations: ['整地', '播种'] },
      { name: '苗期', daysAfterSowing: 7, durationDays: 25, operations: ['间苗定苗', '除草'] },
      { name: '拔节期', daysAfterSowing: 32, durationDays: 20, operations: ['追肥', '中耕', '灌溉'] },
      { name: '大喇叭口期', daysAfterSowing: 52, durationDays: 15, operations: ['追肥', '防虫'] },
      { name: '抽雄吐丝期', daysAfterSowing: 67, durationDays: 15, operations: ['灌溉', '人工授粉'] },
      { name: '灌浆期', daysAfterSowing: 82, durationDays: 30, operations: ['叶面肥', '防虫'] },
      { name: '成熟期', daysAfterSowing: 112, durationDays: 8, operations: ['收获'] },
    ],
  },
  '水稻': {
    name: '水稻',
    totalGrowthDays: 150,
    stages: [
      { name: '育秧期', daysAfterSowing: 0, durationDays: 30, operations: ['播种育秧', '苗床管理'] },
      { name: '移栽期', daysAfterSowing: 30, durationDays: 10, operations: ['整地', '移栽'] },
      { name: '分蘖期', daysAfterSowing: 40, durationDays: 30, operations: ['追肥', '除草', '灌溉'] },
      { name: '拔节孕穗期', daysAfterSowing: 70, durationDays: 30, operations: ['追肥', '晒田', '防虫'] },
      { name: '抽穗开花期', daysAfterSowing: 100, durationDays: 15, operations: ['灌溉', '防虫'] },
      { name: '灌浆成熟期', daysAfterSowing: 115, durationDays: 35, operations: ['干湿灌溉', '收获'] },
    ],
  },
  '大豆': {
    name: '大豆',
    totalGrowthDays: 110,
    stages: [
      { name: '播种期', daysAfterSowing: 0, durationDays: 7, operations: ['整地', '播种'] },
      { name: '出苗期', daysAfterSowing: 7, durationDays: 15, operations: ['查苗补种', '除草'] },
      { name: '分枝期', daysAfterSowing: 22, durationDays: 20, operations: ['中耕', '追肥'] },
      { name: '开花期', daysAfterSowing: 42, durationDays: 25, operations: ['防虫', '灌溉'] },
      { name: '结荚期', daysAfterSowing: 67, durationDays: 25, operations: ['叶面肥', '防虫'] },
      { name: '成熟期', daysAfterSowing: 92, durationDays: 18, operations: ['收获'] },
    ],
  },
  '花生': {
    name: '花生',
    totalGrowthDays: 130,
    stages: [
      { name: '播种期', daysAfterSowing: 0, durationDays: 10, operations: ['整地', '播种', '覆膜'] },
      { name: '苗期', daysAfterSowing: 10, durationDays: 20, operations: ['破膜放苗', '查苗补种'] },
      { name: '开花下针期', daysAfterSowing: 30, durationDays: 30, operations: ['追肥', '中耕培土', '防虫'] },
      { name: '结荚期', daysAfterSowing: 60, durationDays: 35, operations: ['灌溉', '叶面肥', '控旺'] },
      { name: '饱果成熟期', daysAfterSowing: 95, durationDays: 35, operations: ['防早衰', '收获'] },
    ],
  },
  '棉花': {
    name: '棉花',
    totalGrowthDays: 140,
    stages: [
      { name: '播种期', daysAfterSowing: 0, durationDays: 12, operations: ['整地', '播种'] },
      { name: '苗期', daysAfterSowing: 12, durationDays: 28, operations: ['间苗定苗', '中耕', '除草'] },
      { name: '蕾期', daysAfterSowing: 40, durationDays: 30, operations: ['追肥', '整枝', '防虫'] },
      { name: '花铃期', daysAfterSowing: 70, durationDays: 40, operations: ['灌溉', '追肥', '整枝', '防虫'] },
      { name: '吐絮期', daysAfterSowing: 110, durationDays: 30, operations: ['催熟', '采收'] },
    ],
  },
};

export const getCropConfig = (cropName: string) => {
  return cropConfigs[cropName] || null;
};

export const getCropNames = (): string[] => {
  return Object.keys(cropConfigs);
};

export const getGrowthStage = (cropName: string, daysAfterSowing: number) => {
  const config = getCropConfig(cropName);
  if (!config) return null;

  for (let i = config.stages.length - 1; i >= 0; i--) {
    const stage = config.stages[i];
    if (daysAfterSowing >= stage.daysAfterSowing) {
      const daysInStage = daysAfterSowing - stage.daysAfterSowing;
      const progress = Math.min(100, (daysInStage / stage.durationDays) * 100);
      return {
        ...stage,
        currentStageIndex: i,
        totalStages: config.stages.length,
        daysInStage,
        progress,
        isCompleted: daysInStage >= stage.durationDays,
      };
    }
  }

  return null;
};

export const calculateGrowthProgress = (cropName: string, daysAfterSowing: number): number => {
  const config = getCropConfig(cropName);
  if (!config) return 0;
  return Math.min(100, (daysAfterSowing / config.totalGrowthDays) * 100);
};
