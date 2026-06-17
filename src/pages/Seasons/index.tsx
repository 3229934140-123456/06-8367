import { useState, useMemo } from 'react';
import { Plus, Sprout, Calendar, MapPin, TrendingUp, Filter } from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';
import Card from '@/components/Common/Card';
import Button from '@/components/Common/Button';
import StatusBadge from '@/components/Common/StatusBadge';
import Tag from '@/components/Common/Tag';
import Empty from '@/components/Common/Empty';
import Modal from '@/components/Common/Modal';
import { seasonService } from '@/services/seasonService';
import { getCropConfig, getGrowthStage } from '@/data/cropConfigs';
import { getYearFromDate, formatDateChinese } from '@/utils/dateUtils';
import type { Season, SeasonStatus, Field } from '@/types';
import SeasonForm from './SeasonForm';

interface SeasonWithProgress extends Season {
  progress: number;
  growthDays: number;
  totalDays: number;
  currentStage: ReturnType<typeof getGrowthStage>;
  field?: Field;
}

export default function SeasonsPage() {
  const { seasons, fields, addSeason, isLoading } = useAppStore();
  const [selectedFieldId, setSelectedFieldId] = useState<string>('');
  const [selectedYear, setSelectedYear] = useState<string>('');
  const [selectedStatus, setSelectedStatus] = useState<SeasonStatus | ''>('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedSeasonId, setSelectedSeasonId] = useState<string | null>(null);

  const availableYears = useMemo(() => {
    const years = new Set(seasons.map((s) => getYearFromDate(s.sowDate)));
    return Array.from(years).sort((a, b) => b - a);
  }, [seasons]);

  const filteredSeasons = useMemo((): SeasonWithProgress[] => {
    let result = [...seasons];

    if (selectedFieldId) {
      result = result.filter((s) => s.fieldId === selectedFieldId);
    }

    if (selectedYear) {
      result = result.filter((s) => getYearFromDate(s.sowDate) === Number(selectedYear));
    }

    if (selectedStatus) {
      result = result.filter((s) => s.status === selectedStatus);
    }

    return result
      .map((season) => {
        const progress = seasonService.calculateGrowthProgress(season);
        const growthDays = seasonService.getGrowthDays(season);
        const totalDays = seasonService.getTotalGrowthDays(season);
        const currentStage = seasonService.getCurrentGrowthStage(season);
        const field = fields.find((f) => f.id === season.fieldId);

        return {
          ...season,
          progress,
          growthDays,
          totalDays,
          currentStage,
          field,
        };
      })
      .sort((a, b) => new Date(b.sowDate).getTime() - new Date(a.sowDate).getTime());
  }, [seasons, fields, selectedFieldId, selectedYear, selectedStatus]);

  const handleSeasonClick = (seasonId: string) => {
    setSelectedSeasonId(seasonId);
  };

  const handleCreateSeason = async (data: Omit<Season, 'id' | 'createdAt'>) => {
    await addSeason(data);
    setShowCreateModal(false);
  };

  if (selectedSeasonId) {
    const SeasonDetail = require('./SeasonDetail').default;
    return (
      <SeasonDetail
        seasonId={selectedSeasonId}
        onBack={() => setSelectedSeasonId(null)}
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">种植季管理</h1>
          <p className="text-sm text-gray-500 mt-1">管理所有种植季，跟踪作物生长进度</p>
        </div>
        <Button
          leftIcon={<Plus className="w-4 h-4" />}
          onClick={() => setShowCreateModal(true)}
        >
          创建种植季
        </Button>
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
                年份
              </label>
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-farm-500 focus:border-farm-500"
              >
                <option value="">全部年份</option>
                {availableYears.map((year) => (
                  <option key={year} value={year}>
                    {year}年
                  </option>
                ))}
              </select>
            </div>
            <div className="flex-1 min-w-[200px]">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                状态
              </label>
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value as SeasonStatus | '')}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-farm-500 focus:border-farm-500"
              >
                <option value="">全部状态</option>
                <option value="种植中">种植中</option>
                <option value="已采收">已采收</option>
              </select>
            </div>
            <div className="flex items-end">
              <Button
                variant="ghost"
                onClick={() => {
                  setSelectedFieldId('');
                  setSelectedYear('');
                  setSelectedStatus('');
                }}
              >
                重置筛选
              </Button>
            </div>
          </div>
        </Card.Content>
      </Card>

      {filteredSeasons.length === 0 ? (
        <Empty
          title="暂无种植季"
          description="点击上方按钮创建第一个种植季"
          action={
            <Button
              leftIcon={<Plus className="w-4 h-4" />}
              onClick={() => setShowCreateModal(true)}
            >
              创建种植季
            </Button>
          }
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredSeasons.map((season) => (
            <Card
              key={season.id}
              hoverable
              onClick={() => handleSeasonClick(season.id)}
              className="transition-all duration-200 hover:border-farm-300"
            >
              <Card.Content>
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-farm-100 rounded-xl flex items-center justify-center">
                      <Sprout className="w-6 h-6 text-farm-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">{season.cropName}</h3>
                      <p className="text-sm text-gray-500">{season.field?.name || '未知地块'}</p>
                    </div>
                  </div>
                  <StatusBadge
                    status={season.status === '种植中' ? 'in-progress' : 'completed'}
                    text={season.status}
                    size="sm"
                  />
                </div>

                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-gray-400" />
                    <span className="text-sm text-gray-600">
                      播种: {formatDateChinese(season.sowDate)}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-gray-400" />
                    <span className="text-sm text-gray-600">
                      已生长 {season.growthDays} 天 / 共 {season.totalDays} 天
                    </span>
                  </div>

                  {season.currentStage && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-500">当前阶段</span>
                      <Tag variant="farm" size="sm">
                        {season.currentStage.name}
                      </Tag>
                    </div>
                  )}

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs text-gray-500">生长进度</span>
                      <span className="text-xs font-medium text-farm-600">
                        {Math.round(season.progress)}%
                      </span>
                    </div>
                    <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-farm-400 to-farm-600 rounded-full transition-all duration-500"
                        style={{ width: `${season.progress}%` }}
                      />
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-4 mt-4 border-t border-gray-100">
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-soil-500" />
                    <span className="text-xs text-gray-500">
                      {season.field?.area || 0} 亩
                    </span>
                  </div>
                  <div className="text-xs text-gray-500">
                    预计产量: {season.expectedYield} kg/亩
                  </div>
                </div>
              </Card.Content>
            </Card>
          ))}
        </div>
      )}

      <Modal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="创建种植季"
        size="lg"
      >
        <SeasonForm
          onSubmit={handleCreateSeason}
          onCancel={() => setShowCreateModal(false)}
          isLoading={isLoading}
        />
      </Modal>
    </div>
  );
}
