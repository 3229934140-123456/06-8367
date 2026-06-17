import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Save, X, MapPin, Ruler, Droplets, FileText, AlertCircle } from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';
import Button from '@/components/Common/Button';
import { validateField } from '@/db/models';
import { SoilType } from '@/types';
import type { Field } from '@/types';

interface FieldFormProps {
  field?: Field;
  onSuccess?: () => void;
  onCancel?: () => void;
}

interface FormData {
  name: string;
  area: number;
  soilType: SoilType;
  location: string;
  description: string;
}

export default function FieldForm({ field, onSuccess, onCancel }: FieldFormProps) {
  const isEditing = !!field;
  const { addField, updateField, setError } = useAppStore();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
  } = useForm<FormData>({
    defaultValues: {
      name: field?.name || '',
      area: field?.area || 0,
      soilType: field?.soilType || SoilType.LOAM,
      location: field?.location || '',
      description: field?.description || '',
    },
  });

  const watchArea = watch('area');
  const soilTypes = Object.values(SoilType);

  const onSubmit = async (data: FormData) => {
    const fieldData = {
      name: data.name.trim(),
      area: Number(data.area),
      soilType: data.soilType,
      location: data.location.trim(),
      description: data.description.trim(),
    };

    const validation = validateField(fieldData);
    if (!validation.valid) {
      setError(validation.errors.join(', '));
      return;
    }

    setIsSubmitting(true);
    try {
      if (isEditing && field) {
        await updateField({
          ...field,
          ...fieldData,
        });
      } else {
        await addField(fieldData);
      }
      onSuccess?.();
    } catch (error) {
      console.error('保存地块失败:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">
            <MapPin className="w-4 h-4 inline mr-1.5 text-farm-600" />
            地块名称 <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            placeholder="请输入地块名称"
            className={`w-full px-4 py-2.5 border rounded-lg focus:outline-none focus:ring-2 focus:ring-farm-500 focus:border-transparent transition-colors ${
              errors.name ? 'border-red-500' : 'border-gray-200'
            }`}
            {...register('name', {
              required: '地块名称不能为空',
              minLength: {
                value: 2,
                message: '地块名称至少2个字符',
              },
              maxLength: {
                value: 50,
                message: '地块名称不能超过50个字符',
              },
            })}
          />
          {errors.name && (
            <p className="text-sm text-red-500 flex items-center gap-1">
              <AlertCircle className="w-3.5 h-3.5" />
              {errors.name.message}
            </p>
          )}
        </div>

        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">
            <Ruler className="w-4 h-4 inline mr-1.5 text-wheat-600" />
            面积（亩） <span className="text-red-500">*</span>
          </label>
          <input
            type="number"
            step="0.1"
            min="0.1"
            placeholder="请输入地块面积"
            className={`w-full px-4 py-2.5 border rounded-lg focus:outline-none focus:ring-2 focus:ring-farm-500 focus:border-transparent transition-colors ${
              errors.area ? 'border-red-500' : 'border-gray-200'
            }`}
            {...register('area', {
              required: '面积不能为空',
              min: {
                value: 0.1,
                message: '面积必须大于0',
              },
              valueAsNumber: true,
            })}
          />
          {errors.area && (
            <p className="text-sm text-red-500 flex items-center gap-1">
              <AlertCircle className="w-3.5 h-3.5" />
              {errors.area.message}
            </p>
          )}
          {watchArea > 0 && (
            <p className="text-xs text-gray-500">
              约 {Math.round(watchArea * 666.67)} 平方米
            </p>
          )}
        </div>

        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">
            <Droplets className="w-4 h-4 inline mr-1.5 text-soil-600" />
            土质类型 <span className="text-red-500">*</span>
          </label>
          <select
            className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-farm-500 focus:border-transparent transition-colors bg-white"
            {...register('soilType', {
              required: '请选择土质类型',
            })}
          >
            {soilTypes.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
          {errors.soilType && (
            <p className="text-sm text-red-500 flex items-center gap-1">
              <AlertCircle className="w-3.5 h-3.5" />
              {errors.soilType.message}
            </p>
          )}
        </div>

        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">
            <MapPin className="w-4 h-4 inline mr-1.5 text-sky-600" />
            位置
          </label>
          <input
            type="text"
            placeholder="请输入地块位置描述"
            className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-farm-500 focus:border-transparent transition-colors"
            {...register('location', {
              maxLength: {
                value: 100,
                message: '位置描述不能超过100个字符',
              },
            })}
          />
          {errors.location && (
            <p className="text-sm text-red-500 flex items-center gap-1">
              <AlertCircle className="w-3.5 h-3.5" />
              {errors.location.message}
            </p>
          )}
        </div>
      </div>

      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-700">
          <FileText className="w-4 h-4 inline mr-1.5 text-gray-600" />
          备注信息
        </label>
        <textarea
          rows={4}
          placeholder="请输入地块备注信息，如灌溉条件、土壤特性、适合种植的作物等..."
          className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-farm-500 focus:border-transparent transition-colors resize-none"
          {...register('description', {
            maxLength: {
              value: 500,
              message: '备注信息不能超过500个字符',
            },
          })}
        />
        {errors.description && (
          <p className="text-sm text-red-500 flex items-center gap-1">
            <AlertCircle className="w-3.5 h-3.5" />
            {errors.description.message}
          </p>
        )}
      </div>

      <div className="bg-gray-50 rounded-lg p-4">
        <h4 className="text-sm font-medium text-gray-700 mb-2">土质类型说明</h4>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-xs text-gray-500">
          <div>• 壤土：保水保肥好，适合多种作物</div>
          <div>• 砂壤土：透气性好，适合块根作物</div>
          <div>• 粘壤土：保水性好，适合水稻</div>
          <div>• 粉壤土：土质细腻，适合蔬菜</div>
          <div>• 褐土：中性偏碱，适合旱作</div>
          <div>• 黑土：肥沃，适合高产作物</div>
        </div>
      </div>

      <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100">
        <Button
          type="button"
          variant="ghost"
          leftIcon={<X className="w-4 h-4" />}
          onClick={onCancel}
          disabled={isSubmitting}
        >
          取消
        </Button>
        <Button
          type="submit"
          variant="primary"
          leftIcon={<Save className="w-4 h-4" />}
          loading={isSubmitting}
        >
          {isEditing ? '保存修改' : '新增地块'}
        </Button>
      </div>
    </form>
  );
}
