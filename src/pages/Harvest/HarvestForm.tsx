import { useState, useEffect } from 'react';
import { Plus, X } from 'lucide-react';
import Card from '@/components/Common/Card';
import Button from '@/components/Common/Button';
import { harvestService } from '@/services/harvestService';
import { seasonService } from '@/services/seasonService';
import { fieldService } from '@/services/fieldService';
import { QualityGrade } from '@/types';
import type { Harvest, Season, Field } from '@/types';
import { detectYieldAbnormality, calculateYieldPerAcre, formatWeight, formatCurrency } from '@/utils/calculationUtils';
import StatusBadge from '@/components/Common/StatusBadge';
import Tag from '@/components/Common/Tag';

interface HarvestFormProps {
  onSubmit?: (harvest: Harvest) => void;
  onCancel?: () => void;
  editData?: Harvest | null;
}

interface FormData {
  seasonId: string;
  harvestDate: string;
  actualYield: number;
  quality: QualityGrade;
  unitPrice: number;
  remark: string;
}

const qualityOptions = [
  { value: QualityGrade.EXCELLENT, label: '特级' },
  { value: QualityGrade.GOOD, label: '一级' },
  { value: QualityGrade.NORMAL, label: '二级' },
  { value: QualityGrade.POOR, label: '等外品' },
];

export default function HarvestForm({ onSubmit, onCancel, editData }: HarvestFormProps) {
  const [formData, setFormData] = useState<FormData>({
    seasonId: '',
    harvestDate: new Date().toISOString().split('T')[0],
    actualYield: 0,
    quality: QualityGrade.GOOD,
    unitPrice: 0,
    remark: '',
  });

  const [seasons, setSeasons] = useState<Season[]>([]);
  const [fields, setFields] = useState<Field[]>([]);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [abnormalityCheck, setAbnormalityCheck] = useState<{
    isAbnormal: boolean;
    level: 'normal' | 'warning' | 'danger';
    deviationRate: number;
    average: number;
    standardDeviation: number;
  } | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (editData) {
      setFormData({
        seasonId: editData.seasonId,
        harvestDate: editData.harvestDate,
        actualYield: editData.actualYield,
        quality: editData.quality,
        unitPrice: editData.unitPrice,
        remark: editData.remark,
      });
    }
  }, [editData]);

  useEffect(() => {
    checkAbnormality();
  }, [formData.seasonId, formData.actualYield]);

  const loadData = async () => {
    try {
      const [seasonsData, fieldsData] = await Promise.all([
        seasonService.getAllSeasons(),
        fieldService.getAllFields(),
      ]);
      setSeasons(seasonsData);
      setFields(fieldsData);
    } catch (error) {
      console.error('加载数据失败:', error);
    }
  };

  const checkAbnormality = async () => {
    if (!formData.seasonId || formData.actualYield <= 0) {
      setAbnormalityCheck(null);
      return;
    }

    try {
      const season = seasons.find((s) => s.id === formData.seasonId);
      const field = fields.find((f) => f.id === season?.fieldId);

      if (!season || !field) return;

      const yieldPerAcre = calculateYieldPerAcre(formData.actualYield, field.area);
      const result = await harvestService.detectYieldAbnormality(
        yieldPerAcre,
        field.id,
        season.cropName,
        seasons,
        field.area
      );

      setAbnormalityCheck(result);
    } catch (error) {
      console.error('异常检测失败:', error);
    }
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.seasonId) {
      newErrors.seasonId = '请选择种植季';
    }
    if (!formData.harvestDate) {
      newErrors.harvestDate = '请选择采收日期';
    } else if (selectedSeason) {
      const harvestDate = new Date(formData.harvestDate);
      const sowDate = new Date(selectedSeason.sowDate);
      harvestDate.setHours(0, 0, 0, 0);
      sowDate.setHours(0, 0, 0, 0);
      
      if (harvestDate < sowDate) {
        newErrors.harvestDate = '采收日期不能早于播种日期';
      }
      
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (harvestDate > today) {
        newErrors.harvestDate = '采收日期不能晚于今天';
      }
    }
    if (formData.actualYield <= 0) {
      newErrors.actualYield = '产量必须大于0';
    }
    if (formData.unitPrice < 0) {
      newErrors.unitPrice = '单价不能为负数';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate()) return;

    setLoading(true);

    try {
      let harvest: Harvest;

      if (editData) {
        harvest = await harvestService.updateHarvest({
          ...editData,
          ...formData,
        });
      } else {
        harvest = await harvestService.addHarvest(formData);
      }

      onSubmit?.(harvest);
      resetForm();
    } catch (error) {
      console.error('提交失败:', error);
      if (error instanceof Error) {
        setErrors({ submit: error.message });
      }
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      seasonId: '',
      harvestDate: new Date().toISOString().split('T')[0],
      actualYield: 0,
      quality: QualityGrade.GOOD,
      unitPrice: 0,
      remark: '',
    });
    setErrors({});
    setAbnormalityCheck(null);
  };

  const selectedSeason = seasons.find((s) => s.id === formData.seasonId);
  const selectedField = fields.find((f) => f.id === selectedSeason?.fieldId);

  const getAbnormalityMessage = () => {
    if (!abnormalityCheck || !abnormalityCheck.isAbnormal) return null;

    if (abnormalityCheck.level === 'danger') {
      return `产量显著异常（偏差 ${abnormalityCheck.deviationRate.toFixed(1)}%），请核查！`;
    }
    if (abnormalityCheck.level === 'warning') {
      return `产量轻微异常（偏差 ${abnormalityCheck.deviationRate.toFixed(1)}%），建议关注。`;
    }
    return null;
  };

  return (
    <Card className="w-full">
      <Card.Header>
        <Card.Title>{editData ? '编辑收成记录' : '录入收成'}</Card.Title>
        {onCancel && (
          <Button variant="ghost" size="sm" onClick={onCancel} leftIcon={<X className="w-4 h-4" />}>
            关闭
          </Button>
        )}
      </Card.Header>

      <form onSubmit={handleSubmit}>
        <Card.Content>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                选择种植季 <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.seasonId}
                onChange={(e) => setFormData({ ...formData, seasonId: e.target.value })}
                className={`w-full px-4 py-2.5 border rounded-lg focus:outline-none focus:ring-2 focus:ring-farm-500 focus:border-transparent transition-all ${
                  errors.seasonId ? 'border-red-500 bg-red-50' : 'border-gray-300'
                }`}
              >
                <option value="">请选择种植季</option>
                {seasons.map((season) => {
                  const field = fields.find((f) => f.id === season.fieldId);
                  return (
                    <option key={season.id} value={season.id}>
                      {field?.name} - {season.cropName} ({season.sowDate})
                    </option>
                  );
                })}
              </select>
              {errors.seasonId && <p className="mt-1 text-sm text-red-500">{errors.seasonId}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                采收日期 <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                value={formData.harvestDate}
                min={selectedSeason?.sowDate || ''}
                max={new Date().toISOString().split('T')[0]}
                onChange={(e) => {
                  setFormData({ ...formData, harvestDate: e.target.value });
                  if (errors.harvestDate) {
                    const harvestDate = new Date(e.target.value);
                    const sowDate = selectedSeason ? new Date(selectedSeason.sowDate) : new Date(0);
                    const today = new Date();
                    today.setHours(0, 0, 0, 0);
                    harvestDate.setHours(0, 0, 0, 0);
                    sowDate.setHours(0, 0, 0, 0);
                    if (harvestDate >= sowDate && harvestDate <= today) {
                      const newErrors = { ...errors };
                      delete newErrors.harvestDate;
                      setErrors(newErrors);
                    }
                  }
                }}
                className={`w-full px-4 py-2.5 border rounded-lg focus:outline-none focus:ring-2 focus:ring-farm-500 focus:border-transparent transition-all ${
                  errors.harvestDate ? 'border-red-500 bg-red-50' : 'border-gray-300'
                }`}
              />
              {errors.harvestDate && <p className="mt-1 text-sm text-red-500">{errors.harvestDate}</p>}
              {selectedSeason && !errors.harvestDate && (
                <p className="mt-1 text-xs text-gray-500">
                  播种日期：{selectedSeason.sowDate}，采收日期不能早于此日期
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                实际产量（公斤） <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={formData.actualYield || ''}
                onChange={(e) => setFormData({ ...formData, actualYield: parseFloat(e.target.value) || 0 })}
                placeholder="请输入实际产量"
                className={`w-full px-4 py-2.5 border rounded-lg focus:outline-none focus:ring-2 focus:ring-farm-500 focus:border-transparent transition-all ${
                  errors.actualYield ? 'border-red-500 bg-red-50' : 'border-gray-300'
                }`}
              />
              {errors.actualYield && <p className="mt-1 text-sm text-red-500">{errors.actualYield}</p>}
              {selectedField && formData.actualYield > 0 && (
                <p className="mt-1 text-sm text-gray-500">
                  亩产：{formatWeight(calculateYieldPerAcre(formData.actualYield, selectedField.area))}
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                品质等级 <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.quality}
                onChange={(e) => setFormData({ ...formData, quality: e.target.value as QualityGrade })}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-farm-500 focus:border-transparent transition-all"
              >
                {qualityOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                销售单价（元/公斤） <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={formData.unitPrice || ''}
                onChange={(e) => setFormData({ ...formData, unitPrice: parseFloat(e.target.value) || 0 })}
                placeholder="请输入销售单价"
                className={`w-full px-4 py-2.5 border rounded-lg focus:outline-none focus:ring-2 focus:ring-farm-500 focus:border-transparent transition-all ${
                  errors.unitPrice ? 'border-red-500 bg-red-50' : 'border-gray-300'
                }`}
              />
              {errors.unitPrice && <p className="mt-1 text-sm text-red-500">{errors.unitPrice}</p>}
              {formData.actualYield > 0 && formData.unitPrice > 0 && (
                <p className="mt-1 text-sm text-gray-500">
                  预计收入：{formatCurrency(formData.actualYield * formData.unitPrice)}
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                备注
              </label>
              <input
                type="text"
                value={formData.remark}
                onChange={(e) => setFormData({ ...formData, remark: e.target.value })}
                placeholder="请输入备注信息"
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-farm-500 focus:border-transparent transition-all"
              />
            </div>
          </div>

          {selectedSeason && selectedField && (
            <div className="mt-6 p-4 bg-gray-50 rounded-lg">
              <h4 className="text-sm font-medium text-gray-700 mb-3">种植季信息</h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <p className="text-xs text-gray-500">地块</p>
                  <p className="text-sm font-medium text-gray-900">{selectedField.name}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">作物</p>
                  <p className="text-sm font-medium text-gray-900">{selectedSeason.cropName}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">面积</p>
                  <p className="text-sm font-medium text-gray-900">{selectedField.area} 亩</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">状态</p>
                  <StatusBadge
                    status={selectedSeason.status === '已采收' ? 'completed' : 'in-progress'}
                    text={selectedSeason.status}
                    size="sm"
                  />
                </div>
              </div>
            </div>
          )}

          {abnormalityCheck && (
            <div
              className={`mt-4 p-4 rounded-lg ${
                abnormalityCheck.level === 'danger'
                  ? 'bg-red-50 border border-red-200'
                  : abnormalityCheck.level === 'warning'
                  ? 'bg-yellow-50 border border-yellow-200'
                  : 'bg-green-50 border border-green-200'
              }`}
            >
              <div className="flex items-center gap-3">
                <Tag
                  variant={
                    abnormalityCheck.level === 'danger'
                      ? 'danger'
                      : abnormalityCheck.level === 'warning'
                      ? 'warning'
                      : 'success'
                  }
                  size="sm"
                >
                  {abnormalityCheck.level === 'danger'
                    ? '显著异常'
                    : abnormalityCheck.level === 'warning'
                    ? '轻微异常'
                    : '正常'}
                </Tag>
                <span className="text-sm text-gray-700">
                  {getAbnormalityMessage() || '产量在正常范围内'}
                </span>
              </div>
              <div className="mt-3 grid grid-cols-3 gap-4 text-sm">
                <div>
                  <p className="text-gray-500">历史平均亩产</p>
                  <p className="font-medium text-gray-900">{formatWeight(abnormalityCheck.average)}</p>
                </div>
                <div>
                  <p className="text-gray-500">偏差率</p>
                  <p
                    className={`font-medium ${
                      abnormalityCheck.deviationRate > 0 ? 'text-green-600' : 'text-red-600'
                    }`}
                  >
                    {abnormalityCheck.deviationRate > 0 ? '+' : ''}
                    {abnormalityCheck.deviationRate.toFixed(1)}%
                  </p>
                </div>
                <div>
                  <p className="text-gray-500">标准差</p>
                  <p className="font-medium text-gray-900">{abnormalityCheck.standardDeviation.toFixed(2)}</p>
                </div>
              </div>
            </div>
          )}

          {errors.submit && (
            <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-600">{errors.submit}</p>
            </div>
          )}
        </Card.Content>

        <Card.Footer className="flex justify-end gap-3">
          {onCancel && (
            <Button type="button" variant="outline" onClick={onCancel}>
              取消
            </Button>
          )}
          <Button type="submit" loading={loading} leftIcon={<Plus className="w-4 h-4" />}>
            {editData ? '保存修改' : '录入收成'}
          </Button>
        </Card.Footer>
      </form>
    </Card>
  );
}
