import { useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Edit2,
  MapPin,
  Ruler,
  Droplets,
  Calendar,
  TrendingUp,
  Sprout,
  LayoutGrid,
  Clock,
  AlertCircle,
  Info,
  BarChart3,
} from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';
import Card from '@/components/Common/Card';
import Button from '@/components/Common/Button';
import Tag from '@/components/Common/Tag';
import StatusBadge from '@/components/Common/StatusBadge';
import Empty from '@/components/Common/Empty';
import Table from '@/components/Common/Table';
import Modal from '@/components/Common/Modal';
import BarChart from '@/components/Charts/BarChart';
import { formatDate, formatRelativeTime, sortByDate, getYearFromDate, getDaysSince } from '@/utils/dateUtils';
import { formatCurrency, formatWeight, calculateYieldPerAcre, roundTo } from '@/utils/calculationUtils';
import { cropConfigs } from '@/data/cropConfigs';
import type { Season, Operation, Harvest, Cost } from '@/types';
import FieldForm from './FieldForm';

export default function FieldDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [showEditModal, setShowEditModal] = useState(false);

  const {
    fields,
    seasons,
    operations,
    harvests,
    costs,
    selectFieldById,
    selectSeasonsByFieldId,
  } = useAppStore();

  const field = id ? selectFieldById(id) : undefined;
  const fieldSeasons = id ? selectSeasonsByFieldId(id) : [];

  const currentSeason = useMemo(() => {
    return fieldSeasons.find((s) => s.status === '种植中');
  }, [fieldSeasons]);

  const completedSeasons = useMemo(() => {
    return sortByDate(
      fieldSeasons.filter((s) => s.status === '已采收'),
      'sowDate'
    );
  }, [fieldSeasons]);

  const fieldOperations = useMemo(() => {
    const seasonIds = fieldSeasons.map((s) => s.id);
    const fieldOps = operations.filter((op) => seasonIds.includes(op.seasonId));
    return sortByDate(fieldOps, 'date');
  }, [fieldSeasons, operations]);

  const yieldComparisonData = useMemo(() => {
    return completedSeasons.map((season) => {
      const seasonHarvests = harvests.filter((h) => h.seasonId === season.id);
      const totalYield = seasonHarvests.reduce((sum, h) => sum + h.actualYield, 0);
      const yieldPerAcre = field ? calculateYieldPerAcre(totalYield, field.area) : 0;

      return {
        name: `${getYearFromDate(season.sowDate)}年\n${season.cropName}`,
        实际产量: roundTo(yieldPerAcre, 1),
        预期产量: season.expectedYield,
      };
    });
  }, [completedSeasons, harvests, field]);

  const seasonTableColumns = [
    {
      key: 'year',
      title: '年份',
      render: (item: Season) => (
        <span className="font-medium">{getYearFromDate(item.sowDate)}</span>
      ),
    },
    {
      key: 'cropName',
      title: '作物',
      render: (item: Season) => <Tag variant="farm">{item.cropName}</Tag>,
    },
    {
      key: 'sowDate',
      title: '播种日期',
      render: (item: Season) => formatDate(item.sowDate),
    },
    {
      key: 'expectedYield',
      title: '预期亩产',
      render: (item: Season) => `${item.expectedYield} 公斤`,
      align: 'right' as const,
    },
    {
      key: 'actualYield',
      title: '实际亩产',
      render: (item: Season) => {
        const seasonHarvests = harvests.filter((h) => h.seasonId === item.id);
        const totalYield = seasonHarvests.reduce((sum, h) => sum + h.actualYield, 0);
        const yieldPerAcre = field ? calculateYieldPerAcre(totalYield, field.area) : 0;
        return (
          <span className={yieldPerAcre >= item.expectedYield ? 'text-green-600 font-medium' : 'text-red-600 font-medium'}>
            {yieldPerAcre.toFixed(1)} 公斤
          </span>
        );
      },
      align: 'right' as const,
    },
    {
      key: 'revenue',
      title: '总收入',
      render: (item: Season) => {
        const seasonHarvests = harvests.filter((h) => h.seasonId === item.id);
        const totalRevenue = seasonHarvests.reduce((sum, h) => sum + h.actualYield * h.unitPrice, 0);
        return <span className="font-medium">{formatCurrency(totalRevenue)}</span>;
      },
      align: 'right' as const,
    },
    {
      key: 'profit',
      title: '利润',
      render: (item: Season) => {
        const seasonHarvests = harvests.filter((h) => h.seasonId === item.id);
        const seasonCosts = costs.filter((c) => c.seasonId === item.id);
        const totalRevenue = seasonHarvests.reduce((sum, h) => sum + h.actualYield * h.unitPrice, 0);
        const totalCost = seasonCosts.reduce((sum, c) => sum + c.amount, 0);
        const profit = totalRevenue - totalCost;
        return (
          <span className={`font-medium ${profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {formatCurrency(profit)}
          </span>
        );
      },
      align: 'right' as const,
    },
    {
      key: 'status',
      title: '状态',
      render: (item: Season) => (
        <StatusBadge
          status={item.status === '已采收' ? 'success' : 'warning'}
          text={item.status}
          showIcon={false}
        />
      ),
    },
  ];

  const getOperationIcon = (type: string) => {
    const iconMap: Record<string, typeof Sprout> = {
      播种: Sprout,
      施肥: Sprout,
      打药: AlertCircle,
      灌溉: Droplets,
      除草: Sprout,
      整地: LayoutGrid,
      收获: TrendingUp,
      追肥: Sprout,
      一喷三防: AlertCircle,
      防虫: AlertCircle,
    };
    return iconMap[type] || Sprout;
  };

  const getOperationColor = (type: string) => {
    const colorMap: Record<string, string> = {
      播种: 'bg-farm-500',
      施肥: 'bg-wheat-500',
      打药: 'bg-red-500',
      灌溉: 'bg-sky-500',
      除草: 'bg-green-500',
      整地: 'bg-soil-500',
      收获: 'bg-farm-600',
      追肥: 'bg-wheat-600',
      一喷三防: 'bg-red-600',
      防虫: 'bg-orange-500',
    };
    return colorMap[type] || 'bg-gray-500';
  };

  if (!field) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <Empty
          title="地块不存在"
          description="请返回地块列表重新选择"
          action={
            <Button
              variant="primary"
              leftIcon={<ArrowLeft className="w-4 h-4" />}
              onClick={() => navigate('/fields')}
            >
              返回列表
            </Button>
          }
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            leftIcon={<ArrowLeft className="w-4 h-4" />}
            onClick={() => navigate('/fields')}
          >
            返回
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{field.name}</h1>
            <p className="text-gray-500 mt-1">地块详情管理</p>
          </div>
        </div>
        <Button
          variant="outline"
          leftIcon={<Edit2 className="w-4 h-4" />}
          onClick={() => setShowEditModal(true)}
        >
          编辑地块
        </Button>
      </div>

      <Card>
        <Card.Header>
          <Card.Title>基础信息</Card.Title>
        </Card.Header>
        <Card.Content>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-farm-100 rounded-xl flex items-center justify-center flex-shrink-0">
                <MapPin className="w-6 h-6 text-farm-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500 mb-1">地块位置</p>
                <p className="font-medium text-gray-900">{field.location}</p>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-wheat-100 rounded-xl flex items-center justify-center flex-shrink-0">
                <Ruler className="w-6 h-6 text-wheat-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500 mb-1">土地面积</p>
                <p className="font-medium text-gray-900">{field.area} 亩</p>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-soil-100 rounded-xl flex items-center justify-center flex-shrink-0">
                <Droplets className="w-6 h-6 text-soil-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500 mb-1">土质类型</p>
                <p className="font-medium text-gray-900">{field.soilType}</p>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-sky-100 rounded-xl flex items-center justify-center flex-shrink-0">
                <Calendar className="w-6 h-6 text-sky-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500 mb-1">创建时间</p>
                <p className="font-medium text-gray-900">{formatDate(field.createdAt)}</p>
              </div>
            </div>
          </div>
          {field.description && (
            <div className="mt-6 pt-6 border-t border-gray-100">
              <p className="text-sm text-gray-500 mb-2">备注信息</p>
              <p className="text-gray-700">{field.description}</p>
            </div>
          )}
        </Card.Content>
      </Card>

      {currentSeason && (
        <Card>
          <Card.Header>
            <div className="flex items-center gap-2">
              <Sprout className="w-5 h-5 text-farm-600" />
              <Card.Title>当前种植季</Card.Title>
              <StatusBadge status="warning" text={currentSeason.status} showIcon={false} />
            </div>
          </Card.Header>
          <Card.Content>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <p className="text-sm text-gray-500 mb-1">种植作物</p>
                <Tag variant="farm" size="md">
                  {currentSeason.cropName}
                </Tag>
              </div>
              <div>
                <p className="text-sm text-gray-500 mb-1">播种日期</p>
                <p className="font-medium text-gray-900">
                  {formatDate(currentSeason.sowDate)}
                  <span className="text-gray-400 ml-2">
                    ({formatRelativeTime(currentSeason.sowDate)})
                  </span>
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500 mb-1">预期亩产</p>
                <p className="font-medium text-gray-900">{currentSeason.expectedYield} 公斤/亩</p>
              </div>
            </div>

            {cropConfigs[currentSeason.cropName] && (
              <div className="mt-6 pt-6 border-t border-gray-100">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-sm text-gray-500">生长进度</p>
                  <span className="text-sm font-medium text-gray-700">
                    {Math.min(100, (getDaysSince(currentSeason.sowDate) / cropConfigs[currentSeason.cropName].totalGrowthDays) * 100).toFixed(0)}%
                  </span>
                </div>
                <div className="w-full h-3 bg-gray-100 rounded-full overflow-hidden mb-4">
                  <div
                    className="h-full bg-gradient-to-r from-farm-400 to-farm-600 rounded-full transition-all duration-500"
                    style={{
                      width: `${Math.min(100, (getDaysSince(currentSeason.sowDate) / cropConfigs[currentSeason.cropName].totalGrowthDays) * 100)}%`,
                    }}
                  />
                </div>
                <div className="flex flex-wrap gap-2">
                  {cropConfigs[currentSeason.cropName].stages.map((stage, index) => {
                    const daysSinceSowing = getDaysSince(currentSeason.sowDate);
                    const isActive =
                      daysSinceSowing >= stage.daysAfterSowing &&
                      daysSinceSowing < stage.daysAfterSowing + stage.durationDays;
                    const isCompleted = daysSinceSowing >= stage.daysAfterSowing + stage.durationDays;

                    return (
                      <Tag
                        key={index}
                        variant={
                          isActive ? 'farm' : isCompleted ? 'success' : 'default'
                        }
                        size="sm"
                      >
                        {stage.name}
                      </Tag>
                    );
                  })}
                </div>
              </div>
            )}
          </Card.Content>
        </Card>
      )}

      <Card>
        <Card.Header>
          <div className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-farm-600" />
            <Card.Title>历史种植季</Card.Title>
            <Tag variant="default" size="sm">
              共 {fieldSeasons.length} 季
            </Tag>
          </div>
        </Card.Header>
        <Card.Content>
          {completedSeasons.length === 0 ? (
            <Empty
              title="暂无历史数据"
              description="该地块还没有完成的种植季"
              className="py-8"
            />
          ) : (
            <Table
              columns={seasonTableColumns}
              data={completedSeasons}
              rowKey="id"
            />
          )}
        </Card.Content>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <Card.Header>
            <div className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-farm-600" />
              <Card.Title>历年产量对比</Card.Title>
            </div>
          </Card.Header>
          <Card.Content>
            {yieldComparisonData.length === 0 ? (
              <Empty
                title="暂无产量数据"
                description="完成种植季后将显示产量对比"
                className="py-8"
              />
            ) : (
              <BarChart
                data={yieldComparisonData}
                bars={[
                  { dataKey: '实际产量', name: '实际亩产（公斤）', color: '#22c55e' },
                  { dataKey: '预期产量', name: '预期亩产（公斤）', color: '#f59e0b' },
                ]}
                height={300}
                showGrid
                showLegend
              />
            )}
          </Card.Content>
        </Card>

        <Card>
          <Card.Header>
            <div className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-farm-600" />
              <Card.Title>农事操作记录</Card.Title>
              <Tag variant="default" size="sm">
                共 {fieldOperations.length} 条
              </Tag>
            </div>
          </Card.Header>
          <Card.Content>
            {fieldOperations.length === 0 ? (
              <Empty
                title="暂无操作记录"
                description="开始记录您的农事操作吧"
                className="py-8"
              />
            ) : (
              <div className="relative max-h-[400px] overflow-y-auto">
                {fieldOperations.slice(0, 10).map((op, index) => {
                  const Icon = getOperationIcon(op.type);
                  const isLast = index === Math.min(fieldOperations.length, 10) - 1;
                  return (
                    <div key={op.id} className="relative flex gap-4">
                      {!isLast && (
                        <div className="absolute left-5 top-12 w-0.5 h-full bg-gray-200" />
                      )}
                      <div
                        className={`relative z-10 w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${getOperationColor(op.type)}`}
                      >
                        <Icon className="w-5 h-5 text-white" />
                      </div>
                      <div className="flex-1 pb-6">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <h4 className="font-medium text-gray-900">
                                {op.type}
                              </h4>
                              <StatusBadge
                                status="success"
                                text="已完成"
                                size="sm"
                                showIcon={false}
                              />
                            </div>
                            {op.remark && (
                              <p className="text-sm text-gray-500 mb-2">
                                {op.remark}
                              </p>
                            )}
                            <div className="flex items-center gap-4 text-xs text-gray-400 flex-wrap">
                              <span className="flex items-center gap-1">
                                <Calendar className="w-3 h-3" />
                                {formatDate(op.date)}
                              </span>
                              <span>操作人: {op.operator}</span>
                              {op.product && op.dosage > 0 && (
                                <span>
                                  {op.product}: {op.dosage} {op.dosageUnit}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </Card.Content>
        </Card>
      </div>

      <Modal
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        title="编辑地块"
        size="lg"
      >
        <FieldForm
          field={field}
          onSuccess={() => setShowEditModal(false)}
          onCancel={() => setShowEditModal(false)}
        />
      </Modal>
    </div>
  );
}
