import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search,
  Filter,
  Plus,
  MapPin,
  Droplets,
  Sprout,
  ChevronRight,
  Layers,
} from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';
import Card from '@/components/Common/Card';
import Button from '@/components/Common/Button';
import Tag from '@/components/Common/Tag';
import StatusBadge from '@/components/Common/StatusBadge';
import Empty from '@/components/Common/Empty';
import Modal, { ModalFooter } from '@/components/Common/Modal';
import { formatDate, getDaysSince } from '@/utils/dateUtils';
import { cropConfigs } from '@/data/cropConfigs';
import type { Field, Season } from '@/types';
import { SoilType } from '@/types';
import FieldForm from './FieldForm';

export default function Fields() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [soilFilter, setSoilFilter] = useState<string>('all');
  const [showAddModal, setShowAddModal] = useState(false);

  const { fields, seasons, operations } = useAppStore();

  const soilTypes = Object.values(SoilType);

  const getFieldCurrentSeason = (fieldId: string): Season | undefined => {
    const fieldSeasons = seasons.filter((s) => s.fieldId === fieldId);
    return fieldSeasons.find((s) => s.status === '种植中');
  };

  const getFieldLastOperation = (fieldId: string) => {
    const fieldSeasons = seasons.filter((s) => s.fieldId === fieldId);
    const fieldOperations = operations.filter((op) =>
      fieldSeasons.some((s) => s.id === op.seasonId)
    );
    const sorted = [...fieldOperations].sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );
    return sorted[0];
  };

  const getGrowthProgress = (season: Season): number => {
    const cropConfig = cropConfigs[season.cropName];
    if (!cropConfig) return 0;

    const daysSinceSowing = getDaysSince(season.sowDate);
    const progress = (daysSinceSowing / cropConfig.totalGrowthDays) * 100;
    return Math.min(100, Math.max(0, progress));
  };

  const getCurrentGrowthStage = (season: Season): string => {
    const cropConfig = cropConfigs[season.cropName];
    if (!cropConfig) return '未知';

    const daysSinceSowing = getDaysSince(season.sowDate);
    for (let i = cropConfig.stages.length - 1; i >= 0; i--) {
      if (daysSinceSowing >= cropConfig.stages[i].daysAfterSowing) {
        return cropConfig.stages[i].name;
      }
    }
    return cropConfig.stages[0]?.name || '播种期';
  };

  const getFieldHealthStatus = (fieldId: string): 'good' | 'normal' | 'poor' => {
    const season = getFieldCurrentSeason(fieldId);
    if (!season) return 'normal';

    const progress = getGrowthProgress(season);
    if (progress > 80) return 'good';
    if (progress > 30) return 'normal';
    return 'good';
  };

  const filteredFields = useMemo(() => {
    return fields.filter((field) => {
      const matchesSearch =
        field.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        field.location.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesSoil = soilFilter === 'all' || field.soilType === soilFilter;

      return matchesSearch && matchesSoil;
    });
  }, [fields, searchQuery, soilFilter]);

  const fieldsWithDetails = useMemo(() => {
    return filteredFields.map((field) => {
      const currentSeason = getFieldCurrentSeason(field.id);
      const lastOperation = getFieldLastOperation(field.id);
      const health = getFieldHealthStatus(field.id);
      const growthProgress = currentSeason ? getGrowthProgress(currentSeason) : 0;
      const growthStage = currentSeason
        ? getCurrentGrowthStage(currentSeason)
        : '未种植';

      return {
        ...field,
        currentSeason,
        lastOperation,
        health,
        growthProgress,
        growthStage,
      };
    });
  }, [filteredFields]);

  const healthConfig = {
    good: { label: '良好', variant: 'success' as const },
    normal: { label: '一般', variant: 'warning' as const },
    poor: { label: '较差', variant: 'danger' as const },
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">地块管理</h1>
          <p className="text-gray-500 mt-1">
            共 {fields.length} 块土地，总面积 {fields.reduce((sum, f) => sum + f.area, 0)} 亩
          </p>
        </div>
        <Button
          variant="primary"
          leftIcon={<Plus className="w-4 h-4" />}
          onClick={() => setShowAddModal(true)}
        >
          新增地块
        </Button>
      </div>

      <Card>
        <Card.Content>
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="搜索地块名称或位置..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-farm-500 focus:border-transparent"
              />
            </div>
            <div className="flex gap-3">
              <div className="relative">
                <select
                  value={soilFilter}
                  onChange={(e) => setSoilFilter(e.target.value)}
                  className="appearance-none pl-4 pr-10 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-farm-500 focus:border-transparent bg-white"
                >
                  <option value="all">全部土质</option>
                  {soilTypes.map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </select>
                <Filter className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
              </div>
            </div>
          </div>
        </Card.Content>
      </Card>

      {fieldsWithDetails.length === 0 ? (
        <Empty
          title="暂无地块数据"
          description="点击上方按钮添加您的第一块土地"
          action={
            <Button
              variant="primary"
              leftIcon={<Plus className="w-4 h-4" />}
              onClick={() => setShowAddModal(true)}
            >
              新增地块
            </Button>
          }
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {fieldsWithDetails.map((field) => {
            const healthInfo = healthConfig[field.health];
            return (
              <Card
                key={field.id}
                hoverable
                onClick={() => navigate(`/fields/${field.id}`)}
              >
                <Card.Content>
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-farm-100 rounded-xl flex items-center justify-center">
                        <MapPin className="w-6 h-6 text-farm-600" />
                      </div>
                      <div>
                        <h4 className="font-semibold text-gray-900 text-lg">
                          {field.name}
                        </h4>
                        <p className="text-sm text-gray-500">
                          {field.area} 亩 · {field.soilType}
                        </p>
                      </div>
                    </div>
                    <ChevronRight className="w-5 h-5 text-gray-400" />
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-500">位置</span>
                      <span className="text-sm text-gray-700 flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5 text-gray-400" />
                        {field.location}
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-500">当前作物</span>
                      {field.currentSeason ? (
                        <Tag variant="farm">{field.currentSeason.cropName}</Tag>
                      ) : (
                        <Tag variant="default">未种植</Tag>
                      )}
                    </div>

                    {field.currentSeason && (
                      <>
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-gray-500">生长阶段</span>
                          <Tag variant="wheat">{field.growthStage}</Tag>
                        </div>

                        <div>
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-sm text-gray-500">生长进度</span>
                            <span className="text-sm font-medium text-gray-700">
                              {field.growthProgress.toFixed(0)}%
                            </span>
                          </div>
                          <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-gradient-to-r from-farm-400 to-farm-600 rounded-full transition-all duration-500"
                              style={{ width: `${field.growthProgress}%` }}
                            />
                          </div>
                        </div>

                        <div className="flex items-center justify-between">
                          <span className="text-sm text-gray-500">健康状态</span>
                          <StatusBadge
                            status={healthInfo.variant}
                            text={healthInfo.label}
                            showIcon={false}
                            size="sm"
                          />
                        </div>
                      </>
                    )}

                    {field.lastOperation && (
                      <div className="pt-3 border-t border-gray-100">
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-gray-500">
                            上次操作
                          </span>
                          <span className="text-xs text-gray-500">
                            {field.lastOperation.type} · {formatDate(field.lastOperation.date)}
                          </span>
                        </div>
                      </div>
                    )}

                    <div className="pt-3 border-t border-gray-100">
                      <div className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-4">
                          <div className="flex items-center gap-1.5 text-gray-500">
                            <Layers className="w-4 h-4" />
                            <span>
                              {seasons.filter((s) => s.fieldId === field.id).length} 季
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5 text-gray-500">
                            <Sprout className="w-4 h-4" />
                            <span>
                              {operations.filter((op) => {
                                const season = seasons.find(
                                  (s) => s.id === op.seasonId
                                );
                                return season?.fieldId === field.id;
                              }).length} 次操作
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </Card.Content>
              </Card>
            );
          })}
        </div>
      )}

      <Modal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        title="新增地块"
        size="lg"
      >
        <FieldForm
          onSuccess={() => setShowAddModal(false)}
          onCancel={() => setShowAddModal(false)}
        />
      </Modal>
    </div>
  );
}
