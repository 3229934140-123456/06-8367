import type { Harvest, Cost, Season, Field, QualityGrade, CostCategory } from '@/types';
import { QualityGrade as QG, CostCategory as CC } from '@/types';
import { validateHarvest, validateCost, hasErrors, type ValidationErrors } from './validationUtils';

export interface ParsedHarvestRow {
  rowIndex: number;
  raw: Record<string, string>;
  data?: Omit<Harvest, 'id' | 'createdAt'>;
  errors: ValidationErrors;
  seasonId?: string;
  warnings: string[];
}

export interface ParsedCostRow {
  rowIndex: number;
  raw: Record<string, string>;
  data?: Omit<Cost, 'id' | 'createdAt'>;
  errors: ValidationErrors;
  seasonId?: string;
  warnings: string[];
}

export type ImportMode = 'harvest' | 'cost';

const QUALITY_MAP: Record<string, QualityGrade> = {
  特级: QG.EXCELLENT,
  EXCELLENT: QG.EXCELLENT,
  一级: QG.GOOD,
  GOOD: QG.GOOD,
  二级: QG.NORMAL,
  NORMAL: QG.NORMAL,
  等外品: QG.POOR,
  POOR: QG.POOR,
};

const CATEGORY_MAP: Record<string, CostCategory> = {
  种子: CC.SEED,
  SEED: CC.SEED,
  农药: CC.PESTICIDE,
  PESTICIDE: CC.PESTICIDE,
  化肥: CC.FERTILIZER,
  FERTILIZER: CC.FERTILIZER,
  人工: CC.LABOR,
  LABOR: CC.LABOR,
  农机: CC.MACHINERY,
  MACHINERY: CC.MACHINERY,
  灌溉: CC.IRRIGATION,
  IRRIGATION: CC.IRRIGATION,
  地租: CC.LAND,
  LAND: CC.LAND,
  其他: CC.OTHER,
  OTHER: CC.OTHER,
};

const pick = (obj: Record<string, string>, keys: string[]): string => {
  for (const k of keys) {
    const v = obj[k];
    if (v !== undefined && v !== null && v.trim() !== '') return v.trim();
  }
  return '';
};

export const parseCSV = (text: string): Record<string, string>[] => {
  const lines = text.replace(/\r\n/g, '\n').split('\n').filter((l) => l.trim().length > 0);
  if (lines.length < 2) return [];

  const splitLine = (line: string): string[] => {
    const result: string[] = [];
    let cur = '';
    let inQuote = false;
    for (let i = 0; i < line.length; i++) {
      const c = line[i];
      if (c === '"') {
        if (inQuote && line[i + 1] === '"') {
          cur += '"';
          i++;
        } else {
          inQuote = !inQuote;
        }
      } else if (c === ',' && !inQuote) {
        result.push(cur);
        cur = '';
      } else if (c === '\t' && !inQuote) {
        result.push(cur);
        cur = '';
      } else {
        cur += c;
      }
    }
    result.push(cur);
    return result.map((s) => s.trim());
  };

  const headers = splitLine(lines[0]);
  const rows: Record<string, string>[] = [];
  for (let i = 1; i < lines.length; i++) {
    const values = splitLine(lines[i]);
    const row: Record<string, string> = {};
    headers.forEach((h, idx) => {
      row[h] = values[idx] ?? '';
    });
    rows.push(row);
  }
  return rows;
};

const findSeasonByHint = (
  raw: Record<string, string>,
  seasons: Season[],
  fields: Field[]
): { seasonId?: string; warnings: string[] } => {
  const warnings: string[] = [];
  const fieldHint = pick(raw, ['地块', 'field', '地块名称', 'fieldName']);
  const cropHint = pick(raw, ['作物', 'crop', '品种', 'cropName']);
  const yearHint = pick(raw, ['年份', 'year', '年度']);
  const seasonId = pick(raw, ['seasonId', '种植季ID', '种植季']);

  if (seasonId) {
    const s = seasons.find((x) => x.id === seasonId);
    if (s) return { seasonId: s.id, warnings };
    warnings.push(`未找到种植季ID: ${seasonId}`);
    return { warnings };
  }

  if (fieldHint || cropHint) {
    const matched = seasons.filter((s) => {
      const field = fields.find((f) => f.id === s.fieldId);
      const fieldOk = !fieldHint || field?.name === fieldHint;
      const cropOk = !cropHint || s.cropName === cropHint;
      const yearOk =
        !yearHint || s.sowDate.startsWith(yearHint) || s.sowDate.startsWith(`${yearHint}-`);
      return fieldOk && cropOk && yearOk;
    });
    if (matched.length === 1) return { seasonId: matched[0].id, warnings };
    if (matched.length > 1) {
      warnings.push(`匹配到 ${matched.length} 个种植季，请缩小范围`);
    } else {
      warnings.push('未找到匹配的种植季');
    }
  }

  return { warnings };
};

export const parseHarvestRows = (
  text: string,
  seasons: Season[],
  fields: Field[]
): ParsedHarvestRow[] => {
  const rows = parseCSV(text);
  return rows.map((raw, idx) => {
    const result: ParsedHarvestRow = {
      rowIndex: idx + 2,
      raw,
      errors: {},
      warnings: [],
    };

    const { seasonId, warnings } = findSeasonByHint(raw, seasons, fields);
    result.seasonId = seasonId;
    result.warnings.push(...warnings);
    if (!seasonId) {
      result.errors.seasonId = '请提供地块/作物/年份或种植季ID以定位种植季';
    }

    const date = pick(raw, ['采收日期', '日期', 'harvestDate', 'date']);
    const yieldStr = pick(raw, ['产量', 'actualYield', 'weight', '产量(公斤)']);
    const priceStr = pick(raw, ['单价', 'unitPrice', 'price', '单价(元)']);
    const qualityRaw = pick(raw, ['质量', '品级', 'quality', '等级']);
    const remark = pick(raw, ['备注', 'remark', '说明']);

    const actualYield = parseFloat(yieldStr) || 0;
    const unitPrice = parseFloat(priceStr) || 0;
    const quality = (QUALITY_MAP[qualityRaw] || '二级') as QualityGrade;

    const data = {
      seasonId: seasonId || '',
      harvestDate: date,
      actualYield,
      unitPrice,
      quality,
      remark,
    };
    result.data = data;

    const selectedSeason = seasons.find((s) => s.id === seasonId);
    const errors = validateHarvest(data, selectedSeason?.sowDate);
    Object.assign(result.errors, errors);

    return result;
  });
};

export const parseCostRows = (
  text: string,
  seasons: Season[],
  fields: Field[]
): ParsedCostRow[] => {
  const rows = parseCSV(text);
  return rows.map((raw, idx) => {
    const result: ParsedCostRow = {
      rowIndex: idx + 2,
      raw,
      errors: {},
      warnings: [],
    };

    const { seasonId, warnings } = findSeasonByHint(raw, seasons, fields);
    result.seasonId = seasonId;
    result.warnings.push(...warnings);
    if (!seasonId) {
      result.errors.seasonId = '请提供地块/作物/年份或种植季ID以定位种植季';
    }

    const date = pick(raw, ['日期', 'costDate', 'date', '发生日期']);
    const name = pick(raw, ['项目', '项目名称', 'name', '费用名称']);
    const amountStr = pick(raw, ['金额', 'amount', '费用', '金额(元)']);
    const categoryRaw = pick(raw, ['分类', 'category', '类别', '成本分类']);
    const remark = pick(raw, ['备注', 'remark', '说明']);

    const amount = parseFloat(amountStr) || 0;
    const category = (CATEGORY_MAP[categoryRaw] || '其他') as CostCategory;

    const data = {
      seasonId: seasonId || '',
      category,
      name,
      amount,
      date,
      remark,
    };
    result.data = data;

    const selectedSeason = seasons.find((s) => s.id === seasonId);
    const errors = validateCost(data, selectedSeason?.sowDate);
    Object.assign(result.errors, errors);

    return result;
  });
};

export const countValidRows = <T extends { errors: ValidationErrors }>(rows: T[]): number => {
  return rows.filter((r) => !hasErrors(r.errors)).length;
};

export const readFileAsText = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(reader.error);
    reader.readAsText(file, 'utf-8');
  });
};
