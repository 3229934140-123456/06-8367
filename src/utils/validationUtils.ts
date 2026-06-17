import type { OperationType, CostCategory, QualityGrade } from '@/types';

export interface OperationFormData {
  type: OperationType;
  date: string;
  product: string;
  dosage: number;
  dosageUnit: string;
  operator: string;
  remark: string;
}

export interface HarvestFormData {
  harvestDate: string;
  actualYield: number;
  quality: QualityGrade;
  unitPrice: number;
  remark: string;
}

export interface CostFormData {
  category: CostCategory;
  name: string;
  amount: number;
  date: string;
  remark: string;
}

export interface ValidationErrors {
  [key: string]: string;
}

export const validateOperation = (
  data: OperationFormData,
  sowDate?: string
): ValidationErrors => {
  const errors: ValidationErrors = {};

  if (!data.date) {
    errors.date = '请选择操作日期';
  } else if (sowDate) {
    const opDate = new Date(data.date);
    const sDate = new Date(sowDate);
    opDate.setHours(0, 0, 0, 0);
    sDate.setHours(0, 0, 0, 0);
    if (opDate < sDate) {
      errors.date = '操作日期不能早于播种日期';
    }
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (opDate > today) {
      errors.date = '操作日期不能晚于今天';
    }
  }

  if (!data.product.trim()) {
    errors.product = '请输入农资名称';
  }

  if (!data.dosage || data.dosage <= 0) {
    errors.dosage = '请输入有效的用量（大于0）';
  }

  if (!data.operator.trim()) {
    errors.operator = '请输入操作人姓名';
  }

  return errors;
};

export const validateHarvest = (
  data: HarvestFormData,
  sowDate?: string
): ValidationErrors => {
  const errors: ValidationErrors = {};

  if (!data.harvestDate) {
    errors.harvestDate = '请选择采收日期';
  } else if (sowDate) {
    const hDate = new Date(data.harvestDate);
    const sDate = new Date(sowDate);
    hDate.setHours(0, 0, 0, 0);
    sDate.setHours(0, 0, 0, 0);
    if (hDate < sDate) {
      errors.harvestDate = '采收日期不能早于播种日期';
    }
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (hDate > today) {
      errors.harvestDate = '采收日期不能晚于今天';
    }
  }

  if (!data.actualYield || data.actualYield <= 0) {
    errors.actualYield = '产量必须大于0';
  }

  if (data.unitPrice < 0) {
    errors.unitPrice = '单价不能为负数';
  }

  return errors;
};

export const validateCost = (
  data: CostFormData,
  sowDate?: string
): ValidationErrors => {
  const errors: ValidationErrors = {};

  if (!data.date) {
    errors.date = '请选择日期';
  } else if (sowDate) {
    const cDate = new Date(data.date);
    const sDate = new Date(sowDate);
    cDate.setHours(0, 0, 0, 0);
    sDate.setHours(0, 0, 0, 0);
    if (cDate < sDate) {
      errors.date = '日期不能早于播种日期';
    }
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (cDate > today) {
      errors.date = '日期不能晚于今天';
    }
  }

  if (!data.name.trim()) {
    errors.name = '请输入费用名称';
  }

  if (!data.amount || data.amount <= 0) {
    errors.amount = '金额必须大于0';
  }

  return errors;
};

export const hasErrors = (errors: ValidationErrors): boolean => {
  return Object.keys(errors).length > 0;
};
