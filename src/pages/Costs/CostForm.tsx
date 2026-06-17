import { useState, useEffect } from 'react';
import { Plus, X } from 'lucide-react';
import Card from '@/components/Common/Card';
import Button from '@/components/Common/Button';
import { costService } from '@/services/costService';
import { seasonService } from '@/services/seasonService';
import { fieldService } from '@/services/fieldService';
import { CostCategory } from '@/types';
import type { Cost, Season, Field } from '@/types';
import { formatCurrency } from '@/utils/calculationUtils';

interface CostFormProps {
  onSubmit?: (cost: Cost) => void;
  onCancel?: () => void;
  editData?: Cost | null;
}

interface FormData {
  seasonId: string;
  category: CostCategory;
  name: string;
  amount: number;
  date: string;
  remark: string;
}

const categoryOptions = [
  { value: CostCategory.SEED, label: '种子' },
  { value: CostCategory.PESTICIDE, label: '农药' },
  { value: CostCategory.FERTILIZER, label: '化肥' },
  { value: CostCategory.LABOR, label: '人工' },
  { value: CostCategory.MACHINERY, label: '农机' },
  { value: CostCategory.IRRIGATION, label: '灌溉' },
  { value: CostCategory.OTHER, label: '其他' },
];

export default function CostForm({ onSubmit, onCancel, editData }: CostFormProps) {
  const [formData, setFormData] = useState<FormData>({
    seasonId: '',
    category: CostCategory.FERTILIZER,
    name: '',
    amount: 0,
    date: new Date().toISOString().split('T')[0],
    remark: '',
  });

  const [seasons, setSeasons] = useState<Season[]>([]);
  const [fields, setFields] = useState<Field[]>([]);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (editData) {
      setFormData({
        seasonId: editData.seasonId,
        category: editData.category,
        name: editData.name,
        amount: editData.amount,
        date: editData.date,
        remark: editData.remark,
      });
    }
  }, [editData]);

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

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.seasonId) {
      newErrors.seasonId = '请选择种植季';
    }
    if (!formData.category) {
      newErrors.category = '请选择成本分类';
    }
    if (!formData.name || formData.name.trim() === '') {
      newErrors.name = '请输入项目名称';
    }
    if (formData.amount <= 0) {
      newErrors.amount = '金额必须大于0';
    }
    if (!formData.date) {
      newErrors.date = '请选择日期';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate()) return;

    setLoading(true);

    try {
      let cost: Cost;

      if (editData) {
        cost = await costService.updateCost({
          ...editData,
          ...formData,
        });
      } else {
        cost = await costService.addCost(formData);
      }

      onSubmit?.(cost);
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
      category: CostCategory.FERTILIZER,
      name: '',
      amount: 0,
      date: new Date().toISOString().split('T')[0],
      remark: '',
    });
    setErrors({});
  };

  const selectedSeason = seasons.find((s) => s.id === formData.seasonId);
  const selectedField = fields.find((f) => f.id === selectedSeason?.fieldId);

  return (
    <Card className="w-full">
      <Card.Header>
        <Card.Title>{editData ? '编辑成本记录' : '新增成本'}</Card.Title>
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
                关联种植季 <span className="text-red-500">*</span>
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
                成本分类 <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value as CostCategory })}
                className={`w-full px-4 py-2.5 border rounded-lg focus:outline-none focus:ring-2 focus:ring-farm-500 focus:border-transparent transition-all ${
                  errors.category ? 'border-red-500 bg-red-50' : 'border-gray-300'
                }`}
              >
                {categoryOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              {errors.category && <p className="mt-1 text-sm text-red-500">{errors.category}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                项目名称 <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="如：尿素、复合肥、人工费用等"
                className={`w-full px-4 py-2.5 border rounded-lg focus:outline-none focus:ring-2 focus:ring-farm-500 focus:border-transparent transition-all ${
                  errors.name ? 'border-red-500 bg-red-50' : 'border-gray-300'
                }`}
              />
              {errors.name && <p className="mt-1 text-sm text-red-500">{errors.name}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                金额（元） <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={formData.amount || ''}
                onChange={(e) => setFormData({ ...formData, amount: parseFloat(e.target.value) || 0 })}
                placeholder="请输入金额"
                className={`w-full px-4 py-2.5 border rounded-lg focus:outline-none focus:ring-2 focus:ring-farm-500 focus:border-transparent transition-all ${
                  errors.amount ? 'border-red-500 bg-red-50' : 'border-gray-300'
                }`}
              />
              {errors.amount && <p className="mt-1 text-sm text-red-500">{errors.amount}</p>}
              {formData.amount > 0 && (
                <p className="mt-1 text-sm text-gray-500">
                  大写：{formatCurrency(formData.amount)}
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                日期 <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                className={`w-full px-4 py-2.5 border rounded-lg focus:outline-none focus:ring-2 focus:ring-farm-500 focus:border-transparent transition-all ${
                  errors.date ? 'border-red-500 bg-red-50' : 'border-gray-300'
                }`}
              />
              {errors.date && <p className="mt-1 text-sm text-red-500">{errors.date}</p>}
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
                  <p className="text-xs text-gray-500">播种日期</p>
                  <p className="text-sm font-medium text-gray-900">{selectedSeason.sowDate}</p>
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
            {editData ? '保存修改' : '新增成本'}
          </Button>
        </Card.Footer>
      </form>
    </Card>
  );
}
