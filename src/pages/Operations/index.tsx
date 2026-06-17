import { useState, useMemo } from 'react';
import {
  Plus,
  Filter,
  Calendar,
  MapPin,
  Sprout,
  Droplets,
  Leaf,
  Bug,
  Sun,
  Cloud,
  CloudRain,
  Thermometer,
} from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';
import Card from '@/components/Common/Card';
import Button from '@/components/Common/Button';
import Tag from '@/components/Common/Tag';
import StatusBadge from '@/components/Common/StatusBadge';
import Empty from '@/components/Common/Empty';
import Modal from '@/components/Common/Modal';
import { formatDateChinese, getDateRange, isDateInRange } from '@/utils/dateUtils';
import { OperationType } from '@/types';
import type { Operation, Weather, Season, Field } from '@/types';
import OperationForm from './OperationForm';

interface OperationWithDetails extends Operation {
  season?: Season;
  field?: Field;
  weather?: Weather;
}

type OperationTypeFilter = OperationType | '';
type DateRangePreset = '7' | '30' | '90' | 'custom' | '';

export default function OperationsPage() {
  const { operations, seasons, fields, weather, addOperation, isLoading } = useAppStore();
  const [selectedFieldId, setSelectedFieldId] = useState<string>('');
  const [selectedType, setSelectedType] = useState<OperationTypeFilter>('');
  const [dateRangePreset, setDateRangePreset] = useState<DateRangePreset>('');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [showCreateModal, setShowCreateModal] = useState(false);

  const operationTypes: OperationType[] = [
    OperationType.FERTILIZE,
    OperationType.PESTICIDE,
    OperationType.IRRIGATE,
    OperationType.WEED,
    OperationType.TOPDRESSING,
    OperationType.INSECT_CONTROL,
    OperationType.SOW,
    OperationType.HARVEST,
  ];

  const typeIconMap: Record<string, typeof Sprout> = {
    '播种': Sprout,
    '移栽': Sprout,
    '施肥': Leaf,
    '追肥': Leaf,
    '叶面肥': Leaf,
    '打药': Bug,
    '防虫': Bug,
    '灌溉': Droplets,
    '浇水': Droplets,
    '除草': Leaf,
    '修剪': Leaf,
    '整枝': Leaf,
    '中耕': Leaf,
    '收获': Sun,
    '采收': Sun,
  };

  const typeColorMap: Record<string, string> = {
    '播种': 'bg-farm-500',
    '移栽': 'bg-farm-500',
    '施肥': 'bg-wheat-500',
    '追肥': 'bg-wheat-500',
    '叶面肥': 'bg-wheat-500',
    '打药': 'bg-red-500',
    '防虫': 'bg-red-500',
    '灌溉': 'bg-sky-500',
    '浇水': 'bg-sky-500',
    '除草': 'bg-soil-500',
    '修剪': 'bg-soil-500',
    '整枝': 'bg-soil-500',
    '中耕': 'bg-soil-500',
    '收获': 'bg-wheat-600',
    '采收': 'bg-wheat-600',
  };

  const weatherIconMap: Record<string, typeof Sun> = {
    '晴': Sun,
    '多云': Cloud,
    '阴': Cloud,
    '小雨': CloudRain,
    '中雨': CloudRain,
    '大雨': CloudRain,
  };

  const filteredOperations = useMemo((): OperationWithDetails[] => {
    let result = [...operations];

    if (selectedType) {
      result = result.filter((op) => op.type === selectedType);
    }

    if (selectedFieldId) {
      const fieldSeasonIds = seasons
        .filter((s) => s.fieldId === selectedFieldId)
        .map((s) => s.id);
      result = result.filter((op) => fieldSeasonIds.includes(op.seasonId));
    }

    let effectiveStartDate = startDate;
    let effectiveEndDate = endDate;

    if (dateRangePreset && dateRangePreset !== 'custom') {
      const { startDate: presetStart, endDate: presetEnd } = getDateRange(Number(dateRangePreset));
      effectiveStartDate = presetStart;
      effectiveEndDate = presetEnd;
    }

    if (effectiveStartDate && effectiveEndDate) {
      result = result.filter((op) => isDateInRange(op.date, effectiveStartDate, effectiveEndDate));
    }

    return result
      .map((op) => {
        const season = seasons.find((s) => s.id === op.seasonId);
        const field = season ? fields.find((f) => f.id === season.fieldId) : undefined;
        const opWeather = weather.find((w) => w.date === op.date);

        return {
          ...op,
          season,
          field,
          weather: opWeather,
        };
      })
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [operations, seasons, fields, weather, selectedType, selectedFieldId, dateRangePreset, startDate, endDate]);

  const stats = useMemo(() => {
    const totalOperations = filteredOperations.length;
    const byType = filteredOperations.reduce((acc, op) => {
      acc[op.type] = (acc[op.type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    const totalDosage = filteredOperations.reduce((sum, op) => sum + op.dosage, 0);

    return {
      totalOperations,
      byType,
      totalDosage,
    };
  }, [filteredOperations]);

  const handleCreateOperation = async (data: Omit<Operation, 'id' | 'createdAt'>) => {
    await addOperation(data);
    setShowCreateModal(false);
  };

  const resetFilters = () => {
    setSelectedFieldId('');
    setSelectedType('');
    setDateRangePreset('');
    setStartDate('');
    setEndDate('');
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">农事操作</h1>
          <p className="text-sm text-gray-500 mt-1">记录和管理所有农事操作记录</p>
        </div>
        <Button
          leftIcon={<Plus className="w-4 h-4" />}
          onClick={() => setShowCreateModal(true)}
        >
          新增操作
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <Card.Content>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">总操作次数</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{stats.totalOperations}</p>
              </div>
              <div className="w-12 h-12 bg-farm-100 rounded-xl flex items-center justify-center">
                <Sprout className="w-6 h-6 text-farm-600" />
              </div>
            </div>
          </Card.Content>
        </Card>
        <Card>
          <Card.Content>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">操作类型</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{Object.keys(stats.byType).length}</p>
              </div>
              <div className="w-12 h-12 bg-wheat-100 rounded-xl flex items-center justify-center">
                <Leaf className="w-6 h-6 text-wheat-600" />
              </div>
            </div>
          </Card.Content>
        </Card>
        <Card>
          <Card.Content>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">总用量</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{stats.totalDosage.toLocaleString()} kg</p>
              </div>
              <div className="w-12 h-12 bg-sky-100 rounded-xl flex items-center justify-center">
                <Droplets className="w-6 h-6 text-sky-600" />
              </div>
            </div>
          </Card.Content>
        </Card>
      </div>

      <Card>
        <Card.Content>
          <div className="flex items-center gap-2 mb-4">
            <Filter className="w-4 h-4 text-gray-400" />
            <span className="text-sm font-medium text-gray-700">筛选条件</span>
          </div>
          <div className="flex flex-wrap gap-4">
            <div className="flex-1 min-w-[200px]">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                地块
              </label>
              <select
                value={selectedFieldId}
                onChange={(e) => setSelectedFieldId(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-farm-500 focus:border-farm-500"
              >
                <option value="">全部地块</option>
                {fields.map((field) => (
                  <option key={field.id} value={field.id}>
                    {field.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex-1 min-w-[200px]">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                操作类型
              </label>
              <select
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value as OperationTypeFilter)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-farm-500 focus:border-farm-500"
              >
                <option value="">全部类型</option>
                {operationTypes.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex-1 min-w-[200px]">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                时间范围
              </label>
              <select
                value={dateRangePreset}
                onChange={(e) => {
                  setDateRangePreset(e.target.value as DateRangePreset);
                  if (e.target.value !== 'custom') {
                    setStartDate('');
                    setEndDate('');
                  }
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-farm-500 focus:border-farm-500"
              >
                <option value="">全部时间</option>
                <option value="7">最近7天</option>
                <option value="30">最近30天</option>
                <option value="90">最近90天</option>
                <option value="custom">自定义范围</option>
              </select>
            </div>
            {dateRangePreset === 'custom' && (
              <>
                <div className="flex-1 min-w-[150px]">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    开始日期
                  </label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-farm-500 focus:border-farm-500"
                  />
                </div>
                <div className="flex-1 min-w-[150px]">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    结束日期
                  </label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-farm-500 focus:border-farm-500"
                  />
                </div>
              </>
            )}
            <div className="flex items-end">
              <Button variant="ghost" onClick={resetFilters}>
                重置筛选
              </Button>
            </div>
          </div>
        </Card.Content>
      </Card>

      {filteredOperations.length === 0 ? (
        <Empty
          title="暂无操作记录"
          description="点击上方按钮添加第一条操作记录"
          action={
            <Button
              leftIcon={<Plus className="w-4 h-4" />}
              onClick={() => setShowCreateModal(true)}
            >
              新增操作
            </Button>
          }
        />
      ) : (
        <Card>
          <Card.Header>
            <Card.Title>操作记录</Card.Title>
            <Card.Description>共 {filteredOperations.length} 条记录</Card.Description>
          </Card.Header>
          <Card.Content>
            <div className="relative">
              {filteredOperations.map((op, index) => {
                const Icon = typeIconMap[op.type] || Sprout;
                const WeatherIcon = op.weather ? weatherIconMap[op.weather.weatherCondition] : Sun;
                const isLast = index === filteredOperations.length - 1;

                return (
                  <div key={op.id} className="relative flex gap-4">
                    {!isLast && (
                      <div className="absolute left-5 top-12 w-0.5 h-full bg-gray-200" />
                    )}
                    <div
                      className={`relative z-10 w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${typeColorMap[op.type] || 'bg-gray-500'}`}
                    >
                      <Icon className="w-5 h-5 text-white" />
                    </div>
                    <div className="flex-1 pb-8">
                      <div className="bg-white border border-gray-100 rounded-xl p-4 hover:shadow-md transition-shadow">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center gap-3">
                            <Tag variant="farm" size="sm">{op.type}</Tag>
                            <span className="text-sm text-gray-500">
                              {formatDateChinese(op.date)}
                            </span>
                          </div>
                          <StatusBadge status="completed" text="已完成" size="sm" showIcon={false} />
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-3">
                          <div>
                            <p className="text-xs text-gray-500 mb-1">作物/地块</p>
                            <p className="text-sm font-medium text-gray-900">
                              {op.season?.cropName || '未知'} - {op.field?.name || '未知'}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-500 mb-1">农资/用量</p>
                            <p className="text-sm font-medium text-gray-900">
                              {op.product} {op.dosage} {op.dosageUnit}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-500 mb-1">操作人</p>
                            <p className="text-sm font-medium text-gray-900">{op.operator}</p>
                          </div>
                          {op.weather && (
                            <div>
                              <p className="text-xs text-gray-500 mb-1">当日天气</p>
                              <div className="flex items-center gap-2">
                                <WeatherIcon className="w-4 h-4 text-sky-500" />
                                <span className="text-sm font-medium text-gray-900">
                                  {op.weather.weatherCondition} {op.weather.temperature}°C
                                </span>
                              </div>
                            </div>
                          )}
                        </div>

                        {op.weather && (
                          <div className="flex items-center gap-6 p-3 bg-sky-50 rounded-lg mb-3">
                            <div className="flex items-center gap-2">
                              <Thermometer className="w-4 h-4 text-orange-500" />
                              <span className="text-xs text-gray-600">
                                {op.weather.minTemperature}°C ~ {op.weather.maxTemperature}°C
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Droplets className="w-4 h-4 text-blue-500" />
                              <span className="text-xs text-gray-600">
                                湿度 {op.weather.humidity}%
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              <CloudRain className="w-4 h-4 text-blue-400" />
                              <span className="text-xs text-gray-600">
                                降水 {op.weather.rainfall}mm
                              </span>
                            </div>
                          </div>
                        )}

                        {op.remark && (
                          <p className="text-sm text-gray-600 bg-gray-50 p-3 rounded-lg">
                            备注: {op.remark}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </Card.Content>
        </Card>
      )}

      <Modal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="新增农事操作"
        size="xl"
      >
        <OperationForm
          onSubmit={handleCreateOperation}
          onCancel={() => setShowCreateModal(false)}
          isLoading={isLoading}
        />
      </Modal>
    </div>
  );
}
