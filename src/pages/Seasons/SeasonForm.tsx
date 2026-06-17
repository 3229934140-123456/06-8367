import { useState, useMemo } from 'react';
import { MapPin, Sprout, Calendar, TrendingUp, AlertCircle } from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';
import Button from '@/components/Common/Button';
import { ModalFooter } from '@/components/Common/Modal';
import { getCropConfig, getCropNames } from '@/data/cropConfigs';
import { getTodayString, formatDateChinese } from '@/utils/dateUtils';
import type { Season, SeasonStatus, Field } from '@/types';

interface SeasonFormProps {
  onSubmit: (data: Omit<Season, 'id' | 'createdAt'>) => Promise<void>;
  onCancel: () => void;
  isLoading?: boolean;
  initialData?: Partial<Season>;
}

interface FormErrors {
  fieldId?: string;
  cropName?: string;
  sowDate?: string;
  expectedYield?: string;
}

export default function SeasonForm({
  onSubmit,
  onCancel,
  isLoading = false,
  initialData,
}: SeasonFormProps) {
  const { fields } = useAppStore();
  const [formData, setFormData] = useState({
    fieldId: initialData?.fieldId || '',
    cropName: initialData?.cropName || '',
    sowDate: initialData?.sowDate || getTodayString(),
    expectedYield: initialData?.expectedYield || 0,
    status: (initialData?.status as SeasonStatus) || '种植中' as SeasonStatus,
  });
  const [errors, setErrors] = useState<FormErrors>({});

  const cropNames = useMemo(() => getCropNames(), []);
  const selectedCropConfig = useMemo(() => {
    if (!formData.cropName) return null;
    return getCropConfig(formData.cropName);
  }, [formData.cropName]);

  const selectedField = useMemo((): Field | undefined => {
    if (!formData.fieldId) return undefined;
    return fields.find((f) => f.id === formData.fieldId);
  }, [formData.fieldId, fields]);

  const estimatedHarvestDate = useMemo(() => {
    if (!formData.sowDate || !selectedCropConfig) return '';
    const sowDate = new Date(formData.sowDate);
    sowDate.setDate(sowDate.getDate() + selectedCropConfig.totalGrowthDays);
    return sowDate.toISOString().split('T')[0];
  }, [formData.sowDate, selectedCropConfig]);

  const validate = (): boolean => {
    const newErrors: FormErrors = {};

    if (!formData.fieldId) {
      newErrors.fieldId = '请选择地块';
    }

    if (!formData.cropName) {
      newErrors.cropName = '请选择作物品种';
    }

    if (!formData.sowDate) {
      newErrors.sowDate = '请选择播种日期';
    } else {
      const sowDate = new Date(formData.sowDate);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (sowDate > today) {
        newErrors.sowDate = '播种日期不能晚于今天';
      }
    }

    if (!formData.expectedYield || formData.expectedYield <= 0) {
      newErrors.expectedYield = '请输入有效的预计产量';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;

    await onSubmit({
      fieldId: formData.fieldId,
      cropName: formData.cropName,
      sowDate: formData.sowDate,
      expectedYield: formData.expectedYield,
      status: formData.status,
    });
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            <MapPin className="w-4 h-4 inline mr-1 text-gray-400" />
            选择地块 <span className="text-red-500">*</span>
          </label>
          <select
            value={formData.fieldId}
            onChange={(e) => {
              setFormData({ ...formData, fieldId: e.target.value });
              if (errors.fieldId) {
                setErrors({ ...errors, fieldId: undefined });
              }
            }}
            className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-farm-500 focus:border-farm-500 ${
              errors.fieldId ? 'border-red-500' : 'border-gray-300'
            }`}
          >
            <option value="">请选择地块</option>
            {fields.map((field) => (
              <option key={field.id} value={field.id}>
                {field.name} ({field.area}亩 - {field.soilType})
              </option>
            ))}
          </select>
          {errors.fieldId && (
            <p className="mt-1 text-sm text-red-500 flex items-center gap-1">
              <AlertCircle className="w-3 h-3" />
              {errors.fieldId}
            </p>
          )}
          {selectedField && !errors.fieldId && (
            <p className="mt-1 text-xs text-gray-500">
              位置: {selectedField.location} | 土壤: {selectedField.soilType}
            </p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            <Sprout className="w-4 h-4 inline mr-1 text-gray-400" />
            作物品种 <span className="text-red-500">*</span>
          </label>
          <select
            value={formData.cropName}
            onChange={(e) => {
              setFormData({ ...formData, cropName: e.target.value });
              if (errors.cropName) {
                setErrors({ ...errors, cropName: undefined });
              }
            }}
            className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-farm-500 focus:border-farm-500 ${
              errors.cropName ? 'border-red-500' : 'border-gray-300'
            }`}
          >
            <option value="">请选择作物品种</option>
            {cropNames.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </select>
          {errors.cropName && (
            <p className="mt-1 text-sm text-red-500 flex items-center gap-1">
              <AlertCircle className="w-3 h-3" />
              {errors.cropName}
            </p>
          )}
          {selectedCropConfig && !errors.cropName && (
            <p className="mt-1 text-xs text-gray-500">
              生长周期: {selectedCropConfig.totalGrowthDays}天 | 共 {selectedCropConfig.stages.length} 个阶段
            </p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            <Calendar className="w-4 h-4 inline mr-1 text-gray-400" />
            播种日期 <span className="text-red-500">*</span>
          </label>
          <input
            type="date"
            value={formData.sowDate}
            onChange={(e) => {
              setFormData({ ...formData, sowDate: e.target.value });
              if (errors.sowDate) {
                setErrors({ ...errors, sowDate: undefined });
              }
            }}
            max={getTodayString()}
            className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-farm-500 focus:border-farm-500 ${
              errors.sowDate ? 'border-red-500' : 'border-gray-300'
            }`}
          />
          {errors.sowDate && (
            <p className="mt-1 text-sm text-red-500 flex items-center gap-1">
              <AlertCircle className="w-3 h-3" />
              {errors.sowDate}
            </p>
          )}
          {formData.sowDate && !errors.sowDate && (
            <p className="mt-1 text-xs text-gray-500">
              {formatDateChinese(formData.sowDate)}
            </p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            <TrendingUp className="w-4 h-4 inline mr-1 text-gray-400" />
            预计产量 (kg/亩) <span className="text-red-500">*</span>
          </label>
          <input
            type="number"
            value={formData.expectedYield || ''}
            onChange={(e) => {
              const value = Number(e.target.value);
              setFormData({ ...formData, expectedYield: value });
              if (errors.expectedYield && value > 0) {
                setErrors({ ...errors, expectedYield: undefined });
              }
            }}
            placeholder="请输入预计产量"
            min="0"
            step="0.01"
            className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-farm-500 focus:border-farm-500 ${
              errors.expectedYield ? 'border-red-500' : 'border-gray-300'
            }`}
          />
          {errors.expectedYield && (
            <p className="mt-1 text-sm text-red-500 flex items-center gap-1">
              <AlertCircle className="w-3 h-3" />
              {errors.expectedYield}
            </p>
          )}
          {selectedField && formData.expectedYield > 0 && !errors.expectedYield && (
            <p className="mt-1 text-xs text-gray-500">
              预计总产量: {(selectedField.area * formData.expectedYield).toLocaleString()} kg
            </p>
          )}
        </div>
      </div>

      {selectedCropConfig && estimatedHarvestDate && (
        <div className="p-4 bg-farm-50 rounded-lg border border-farm-200">
          <h4 className="text-sm font-medium text-farm-800 mb-2">种植信息预览</h4>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-gray-600">生长周期:</span>
              <span className="font-medium text-gray-900 ml-2">{selectedCropConfig.totalGrowthDays} 天</span>
            </div>
            <div>
              <span className="text-gray-600">预计收获日期:</span>
              <span className="font-medium text-farm-600 ml-2">{formatDateChinese(estimatedHarvestDate)}</span>
            </div>
            <div>
              <span className="text-gray-600">生长阶段:</span>
              <span className="font-medium text-gray-900 ml-2">{selectedCropConfig.stages.length} 个</span>
            </div>
            <div>
              <span className="text-gray-600">主要农事:</span>
              <span className="font-medium text-gray-900 ml-2">
                {selectedCropConfig.stages.flatMap(s => s.operations).slice(0, 5).join('、')}...
              </span>
            </div>
          </div>
        </div>
      )}

      {selectedCropConfig && (
        <div>
          <h4 className="text-sm font-medium text-gray-700 mb-3">生长阶段详情</h4>
          <div className="space-y-2">
            {selectedCropConfig.stages.map((stage, index) => (
              <div
                key={index}
                className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg"
              >
                <div className="w-8 h-8 bg-farm-100 rounded-full flex items-center justify-center text-sm font-medium text-farm-600">
                  {index + 1}
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-gray-900">{stage.name}</span>
                    <span className="text-sm text-gray-500">
                      第 {stage.daysAfterSowing + 1} - {stage.daysAfterSowing + stage.durationDays} 天
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    持续 {stage.durationDays} 天 | 农事: {stage.operations.join('、')}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <ModalFooter
        onConfirm={handleSubmit}
        onCancel={onCancel}
        confirmText={initialData ? '保存修改' : '创建种植季'}
        loading={isLoading}
      />
    </div>
  );
}
