import { useState, useMemo, useEffect } from 'react';
import {
  Sprout,
  Droplets,
  Leaf,
  Bug,
  Calendar,
  User,
  Package,
  AlertCircle,
  Sun,
  Cloud,
  CloudRain,
  Thermometer,
  Wind,
} from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';
import { ModalFooter } from '@/components/Common/Modal';
import Tag from '@/components/Common/Tag';
import { weatherService } from '@/services/weatherService';
import { getTodayString, formatDateChinese } from '@/utils/dateUtils';
import { OperationType } from '@/types';
import type { Operation, Weather, Season } from '@/types';

interface OperationFormProps {
  onSubmit: (data: Omit<Operation, 'id' | 'createdAt'>) => Promise<void>;
  onCancel: () => void;
  isLoading?: boolean;
  initialData?: Partial<Operation>;
  defaultSeasonId?: string;
}

interface FormErrors {
  seasonId?: string;
  type?: string;
  date?: string;
  product?: string;
  dosage?: string;
  operator?: string;
}

export default function OperationForm({
  onSubmit,
  onCancel,
  isLoading = false,
  initialData,
  defaultSeasonId,
}: OperationFormProps) {
  const { seasons, fields } = useAppStore();
  const [formData, setFormData] = useState({
    seasonId: initialData?.seasonId || defaultSeasonId || '',
    type: (initialData?.type as OperationType) || OperationType.FERTILIZE,
    date: initialData?.date || getTodayString(),
    product: initialData?.product || '',
    dosage: initialData?.dosage || 0,
    dosageUnit: initialData?.dosageUnit || 'kg',
    operator: initialData?.operator || '',
    remark: initialData?.remark || '',
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const [weather, setWeather] = useState<Weather | null>(null);
  const [weatherLoading, setWeatherLoading] = useState(false);

  const operationTypes: { value: OperationType; label: string; icon: typeof Sprout }[] = [
    { value: OperationType.FERTILIZE, label: '施肥', icon: Leaf },
    { value: OperationType.PESTICIDE, label: '打药', icon: Bug },
    { value: OperationType.IRRIGATE, label: '灌溉', icon: Droplets },
    { value: OperationType.WEED, label: '除草', icon: Leaf },
    { value: OperationType.TOPDRESSING, label: '追肥', icon: Leaf },
    { value: OperationType.INSECT_CONTROL, label: '防虫', icon: Bug },
  ];

  const dosageUnits = ['kg', 'g', 'L', 'mL', '袋', '瓶'];

  const activeSeasons = useMemo((): Array<Season & { fieldName: string }> => {
    return seasons
      .filter((s) => s.status === '种植中')
      .map((season) => {
        const field = fields.find((f) => f.id === season.fieldId);
        return {
          ...season,
          fieldName: field?.name || '未知地块',
        };
      })
      .sort((a, b) => new Date(b.sowDate).getTime() - new Date(a.sowDate).getTime());
  }, [seasons, fields]);

  const selectedSeason = useMemo(() => {
    if (!formData.seasonId) return null;
    return seasons.find((s) => s.id === formData.seasonId);
  }, [formData.seasonId, seasons]);

  const selectedField = useMemo(() => {
    if (!selectedSeason) return null;
    return fields.find((f) => f.id === selectedSeason.fieldId);
  }, [selectedSeason, fields]);

  useEffect(() => {
    const fetchWeather = async () => {
      if (!formData.date) return;

      setWeatherLoading(true);
      try {
        let weatherData = await weatherService.getWeatherByDate(formData.date);
        if (!weatherData) {
          weatherData = weatherService.generateWeatherData(formData.date);
        }
        setWeather(weatherData);
      } catch (error) {
        console.error('获取气象数据失败:', error);
        setWeather(null);
      } finally {
        setWeatherLoading(false);
      }
    };

    fetchWeather();
  }, [formData.date]);

  const validate = (): boolean => {
    const newErrors: FormErrors = {};

    if (!formData.seasonId) {
      newErrors.seasonId = '请选择种植季';
    }

    if (!formData.type) {
      newErrors.type = '请选择操作类型';
    }

    if (!formData.date) {
      newErrors.date = '请选择日期';
    } else {
      const opDate = new Date(formData.date);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (opDate > today) {
        newErrors.date = '操作日期不能晚于今天';
      }
      if (selectedSeason && opDate < new Date(selectedSeason.sowDate)) {
        newErrors.date = '操作日期不能早于播种日期';
      }
    }

    if (!formData.product.trim()) {
      newErrors.product = '请输入农资名称';
    }

    if (!formData.dosage || formData.dosage <= 0) {
      newErrors.dosage = '请输入有效的用量';
    }

    if (!formData.operator.trim()) {
      newErrors.operator = '请输入操作人姓名';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;

    await onSubmit({
      seasonId: formData.seasonId,
      type: formData.type,
      date: formData.date,
      product: formData.product.trim(),
      dosage: formData.dosage,
      dosageUnit: formData.dosageUnit,
      operator: formData.operator.trim(),
      remark: formData.remark.trim(),
    });
  };

  const getWeatherIcon = (condition: string) => {
    if (condition.includes('晴')) return Sun;
    if (condition.includes('雨')) return CloudRain;
    return Cloud;
  };

  return (
    <div className="space-y-6">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          <Sprout className="w-4 h-4 inline mr-1 text-gray-400" />
          选择种植季 <span className="text-red-500">*</span>
        </label>
        <select
          value={formData.seasonId}
          onChange={(e) => {
            setFormData({ ...formData, seasonId: e.target.value });
            if (errors.seasonId) {
              setErrors({ ...errors, seasonId: undefined });
            }
          }}
          className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-farm-500 focus:border-farm-500 ${
            errors.seasonId ? 'border-red-500' : 'border-gray-300'
          }`}
        >
          <option value="">请选择种植季</option>
          {activeSeasons.map((season) => (
            <option key={season.id} value={season.id}>
              {season.cropName} - {season.fieldName} ({formatDateChinese(season.sowDate)}播种)
            </option>
          ))}
        </select>
        {errors.seasonId && (
          <p className="mt-1 text-sm text-red-500 flex items-center gap-1">
            <AlertCircle className="w-3 h-3" />
            {errors.seasonId}
          </p>
        )}
        {selectedSeason && selectedField && !errors.seasonId && (
          <div className="mt-2 p-3 bg-farm-50 rounded-lg">
            <p className="text-sm text-gray-600">
              <span className="font-medium">{selectedSeason.cropName}</span>
              {' · '}
              {selectedField.name} ({selectedField.area}亩)
              {' · '}
              播种于 {formatDateChinese(selectedSeason.sowDate)}
            </p>
          </div>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          操作类型 <span className="text-red-500">*</span>
        </label>
        <div className="grid grid-cols-3 gap-2">
          {operationTypes.map(({ value, label, icon: Icon }) => (
            <button
              key={value}
              type="button"
              onClick={() => {
                setFormData({ ...formData, type: value });
                if (errors.type) {
                  setErrors({ ...errors, type: undefined });
                }
              }}
              className={`flex items-center justify-center gap-2 px-4 py-3 rounded-lg border-2 transition-all ${
                formData.type === value
                  ? 'border-farm-500 bg-farm-50 text-farm-700'
                  : 'border-gray-200 hover:border-gray-300 text-gray-600'
              }`}
            >
              <Icon className="w-5 h-5" />
              <span className="font-medium">{label}</span>
            </button>
          ))}
        </div>
        {errors.type && (
          <p className="mt-1 text-sm text-red-500 flex items-center gap-1">
            <AlertCircle className="w-3 h-3" />
            {errors.type}
          </p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            <Calendar className="w-4 h-4 inline mr-1 text-gray-400" />
            操作日期 <span className="text-red-500">*</span>
          </label>
          <input
            type="date"
            value={formData.date}
            onChange={(e) => {
              setFormData({ ...formData, date: e.target.value });
              if (errors.date) {
                setErrors({ ...errors, date: undefined });
              }
            }}
            max={getTodayString()}
            className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-farm-500 focus:border-farm-500 ${
              errors.date ? 'border-red-500' : 'border-gray-300'
            }`}
          />
          {errors.date && (
            <p className="mt-1 text-sm text-red-500 flex items-center gap-1">
              <AlertCircle className="w-3 h-3" />
              {errors.date}
            </p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            <User className="w-4 h-4 inline mr-1 text-gray-400" />
            操作人 <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={formData.operator}
            onChange={(e) => {
              setFormData({ ...formData, operator: e.target.value });
              if (errors.operator && e.target.value.trim()) {
                setErrors({ ...errors, operator: undefined });
              }
            }}
            placeholder="请输入操作人姓名"
            className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-farm-500 focus:border-farm-500 ${
              errors.operator ? 'border-red-500' : 'border-gray-300'
            }`}
          />
          {errors.operator && (
            <p className="mt-1 text-sm text-red-500 flex items-center gap-1">
              <AlertCircle className="w-3 h-3" />
              {errors.operator}
            </p>
          )}
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          <Package className="w-4 h-4 inline mr-1 text-gray-400" />
          农资名称 <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          value={formData.product}
          onChange={(e) => {
            setFormData({ ...formData, product: e.target.value });
            if (errors.product && e.target.value.trim()) {
              setErrors({ ...errors, product: undefined });
            }
          }}
          placeholder="如：尿素、复合肥、杀虫剂、除草剂等"
          className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-farm-500 focus:border-farm-500 ${
            errors.product ? 'border-red-500' : 'border-gray-300'
          }`}
        />
        {errors.product && (
          <p className="mt-1 text-sm text-red-500 flex items-center gap-1">
            <AlertCircle className="w-3 h-3" />
            {errors.product}
          </p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            用量 <span className="text-red-500">*</span>
          </label>
          <input
            type="number"
            value={formData.dosage || ''}
            onChange={(e) => {
              const value = Number(e.target.value);
              setFormData({ ...formData, dosage: value });
              if (errors.dosage && value > 0) {
                setErrors({ ...errors, dosage: undefined });
              }
            }}
            placeholder="0"
            min="0"
            step="0.01"
            className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-farm-500 focus:border-farm-500 ${
              errors.dosage ? 'border-red-500' : 'border-gray-300'
            }`}
          />
          {errors.dosage && (
            <p className="mt-1 text-sm text-red-500 flex items-center gap-1">
              <AlertCircle className="w-3 h-3" />
              {errors.dosage}
            </p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            单位
          </label>
          <select
            value={formData.dosageUnit}
            onChange={(e) => setFormData({ ...formData, dosageUnit: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-farm-500 focus:border-farm-500"
          >
            {dosageUnits.map((unit) => (
              <option key={unit} value={unit}>
                {unit}
              </option>
            ))}
          </select>
        </div>
      </div>

      {weather && (
        <div className="p-4 bg-sky-50 rounded-lg border border-sky-200">
          <h4 className="text-sm font-medium text-sky-800 mb-3 flex items-center gap-2">
            <Sun className="w-4 h-4" />
            {formatDateChinese(formData.date)} 气象数据
            {weatherLoading && <span className="text-xs text-gray-500">(加载中...)</span>}
          </h4>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-sky-100 rounded-lg flex items-center justify-center">
                {(() => {
                  const WeatherIcon = getWeatherIcon(weather.weatherCondition);
                  return <WeatherIcon className="w-5 h-5 text-sky-600" />;
                })()}
              </div>
              <div>
                <p className="text-xs text-gray-500">天气状况</p>
                <p className="font-medium text-gray-900">{weather.weatherCondition}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                <Thermometer className="w-5 h-5 text-orange-600" />
              </div>
              <div>
                <p className="text-xs text-gray-500">温度</p>
                <p className="font-medium text-gray-900">
                  {weather.minTemperature}°C ~ {weather.maxTemperature}°C
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <Droplets className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-xs text-gray-500">湿度</p>
                <p className="font-medium text-gray-900">{weather.humidity}%</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-cyan-100 rounded-lg flex items-center justify-center">
                <CloudRain className="w-5 h-5 text-cyan-600" />
              </div>
              <div>
                <p className="text-xs text-gray-500">降水量</p>
                <p className="font-medium text-gray-900">{weather.rainfall} mm</p>
              </div>
            </div>
          </div>
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          备注
        </label>
        <textarea
          value={formData.remark}
          onChange={(e) => setFormData({ ...formData, remark: e.target.value })}
          placeholder="请输入备注信息（可选）"
          rows={3}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-farm-500 focus:border-farm-500 resize-none"
        />
      </div>

      <div className="flex flex-wrap gap-2">
        <Tag variant="farm" size="sm">
          种植季: {selectedSeason?.cropName || '未选择'}
        </Tag>
        <Tag variant="soil" size="sm">
          地块: {selectedField?.name || '未选择'}
        </Tag>
        <Tag variant="wheat" size="sm">
          类型: {formData.type}
        </Tag>
        <Tag variant="sky" size="sm">
          用量: {formData.dosage || 0} {formData.dosageUnit}
        </Tag>
      </div>

      <ModalFooter
        onConfirm={handleSubmit}
        onCancel={onCancel}
        confirmText={initialData ? '保存修改' : '添加记录'}
        loading={isLoading}
      />
    </div>
  );
}
