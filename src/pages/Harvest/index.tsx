import { useState, useMemo } from 'react';
import {
  Leaf,
  TrendingUp,
  Award,
  PieChart as PieChartIcon,
  Plus,
  Edit2,
  Trash2,
  AlertTriangle,
  AlertCircle,
  CheckCircle,
  Upload,
} from 'lucide-react';
import Card from '@/components/Common/Card';
import Button from '@/components/Common/Button';
import MetricCard from '@/components/Cards/MetricCard';
import BarChart from '@/components/Charts/BarChart';
import LineChart from '@/components/Charts/LineChart';
import PieChart from '@/components/Charts/PieChart';
import Table from '@/components/Common/Table';
import StatusBadge from '@/components/Common/StatusBadge';
import Tag from '@/components/Common/Tag';
import HarvestForm from './HarvestForm';
import BulkImportModal from '@/components/Modals/BulkImportModal';
import { useAppStore } from '@/store/useAppStore';
import { harvestService } from '@/services/harvestService';
import type { Harvest, Season, Field, YieldComparison } from '@/types';
import {
  formatWeight,
  formatCurrency,
  calculateYieldPerAcre,
  formatPercentage,
} from '@/utils/calculationUtils';

interface HarvestWithDetails extends Harvest {
  season?: Season;
  field?: Field;
  yieldPerAcre?: number;
  revenue?: number;
}

export default function Harvest() {
  const {
    fields,
    seasons,
    harvests: storeHarvests,
    isLoading,
    deleteHarvest,
    selectSeasonById,
    selectFieldById,
  } = useAppStore();

  const [showForm, setShowForm] = useState(false);
  const [editData, setEditData] = useState<Harvest | null>(null);
  const [selectedField, setSelectedField] = useState<string>('');
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [showImport, setShowImport] = useState(false);

  const harvests = useMemo<HarvestWithDetails[]>(() => {
    return storeHarvests.map((h) => {
      const season = selectSeasonById(h.seasonId);
      const field = season ? selectFieldById(season.fieldId) : undefined;
      const yieldPerAcre = field ? calculateYieldPerAcre(h.actualYield, field.area) : 0;
      return {
        ...h,
        season,
        field,
        yieldPerAcre,
        revenue: h.actualYield * h.unitPrice,
      };
    });
  }, [storeHarvests, selectSeasonById, selectFieldById]);

  const yieldComparisons = useMemo<YieldComparison[]>(() => {
    if (seasons.length === 0 || fields.length === 0) return [];
    return harvestService.getYieldComparisonSync(
      seasons,
      fields.map((f) => ({ id: f.id, area: f.area })),
      storeHarvests
    );
  }, [seasons, fields, storeHarvests, harvestService]);

  const abnormalHarvests = useMemo<YieldComparison[]>(() => {
    return yieldComparisons.filter((c) => c.isAbnormal);
  }, [yieldComparisons]);

  const loading = isLoading;

  const stats = useMemo(() => {
    const totalYield = harvests.reduce((sum, h) => sum + h.actualYield, 0);
    const totalRevenue = harvests.reduce((sum, h) => sum + (h.revenue || 0), 0);
    const totalArea = fields.reduce((sum, f) => sum + f.area, 0);
    const avgYieldPerAcre = totalArea > 0 ? totalYield / totalArea : 0;

    const byQuality = harvests.reduce((acc, h) => {
      if (!acc[h.quality]) {
        acc[h.quality] = { count: 0, totalYield: 0 };
      }
      acc[h.quality].count++;
      acc[h.quality].totalYield += h.actualYield;
      return acc;
    }, {} as Record<string, { count: number; totalYield: number }>);

    let maxYieldField = { name: '-', yield: 0 };
    const fieldYields = new Map<string, { name: string; totalYield: number; area: number }>();

    harvests.forEach((h) => {
      if (h.field) {
        const existing = fieldYields.get(h.field.id) || {
          name: h.field.name,
          totalYield: 0,
          area: h.field.area,
        };
        existing.totalYield += h.actualYield;
        fieldYields.set(h.field.id, existing);
      }
    });

    fieldYields.forEach((data) => {
      const yieldPerAcre = data.area > 0 ? data.totalYield / data.area : 0;
      if (yieldPerAcre > maxYieldField.yield) {
        maxYieldField = { name: data.name, yield: yieldPerAcre };
      }
    });

    return {
      totalYield,
      totalRevenue,
      avgYieldPerAcre,
      byQuality,
      maxYieldField,
    };
  }, [harvests, fields]);

  const qualityChartData = useMemo(() => {
    return Object.entries(stats.byQuality).map(([name, data]) => ({
      name,
      value: data.totalYield,
    }));
  }, [stats]);

  const historyChartData = useMemo(() => {
    if (!selectedField) return [];

    const fieldSeasons = seasons.filter(
      (s) => s.fieldId === selectedField && s.status === '已采收'
    );

    return fieldSeasons
      .map((s) => {
        const year = new Date(s.sowDate).getFullYear();
        const seasonHarvests = harvests.filter((h) => h.seasonId === s.id);
        const totalYield = seasonHarvests.reduce((sum, h) => sum + h.actualYield, 0);
        const field = fields.find((f) => f.id === s.fieldId);
        const yieldPerAcre = field ? calculateYieldPerAcre(totalYield, field.area) : 0;

        const comparison = yieldComparisons.find((c) => c.seasonId === s.id);

        return {
          name: `${year}年`,
          year,
          actual: yieldPerAcre,
          expected: s.expectedYield,
          isAbnormal: comparison?.isAbnormal || false,
          abnormalLevel: comparison?.abnormalLevel || 'normal',
        };
      })
      .sort((a, b) => a.year - b.year);
  }, [selectedField, seasons, harvests, fields, yieldComparisons]);

  const trendChartData = useMemo(() => {
    const yearHarvests = harvests.filter((h) => {
      const year = new Date(h.harvestDate).getFullYear();
      return year === selectedYear;
    });

    const monthData = new Map<string, number>();
    yearHarvests.forEach((h) => {
      const month = h.harvestDate.substring(5, 7);
      monthData.set(month, (monthData.get(month) || 0) + h.actualYield);
    });

    return Array.from(monthData.entries())
      .map(([month, yieldAmount]) => ({
        name: `${parseInt(month)}月`,
        产量: yieldAmount,
      }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [harvests, selectedYear]);

  const getAbnormalityReasons = (comparison: YieldComparison): string[] => {
    const reasons: string[] = [];
    if (comparison.deviationRate < -20) {
      reasons.push('产量大幅低于预期，可能存在病虫害或气候灾害影响');
      reasons.push('建议核查田间管理记录和气象数据');
    } else if (comparison.deviationRate < -10) {
      reasons.push('产量低于预期，可能与施肥不足或灌溉不及时有关');
    } else if (comparison.deviationRate > 20) {
      reasons.push('产量大幅高于预期，气候条件适宜或品种改良效果显著');
      reasons.push('建议总结经验，推广成功的管理模式');
    } else if (comparison.deviationRate > 10) {
      reasons.push('产量高于预期，田间管理措施效果良好');
    }
    return reasons;
  };

  const handleSubmit = async () => {
    setShowForm(false);
    setEditData(null);
  };

  const handleEdit = (harvest: Harvest) => {
    setEditData(harvest);
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('确定要删除这条收成记录吗？')) {
      try {
        await deleteHarvest(id);
      } catch (error) {
        console.error('删除失败:', error);
      }
    }
  };

  const columns = [
    {
      key: 'field',
      title: '地块',
      render: (item: HarvestWithDetails) => item.field?.name || '-',
    },
    {
      key: 'cropName',
      title: '作物',
      render: (item: HarvestWithDetails) => item.season?.cropName || '-',
    },
    {
      key: 'harvestDate',
      title: '采收日期',
    },
    {
      key: 'actualYield',
      title: '产量',
      render: (item: HarvestWithDetails) => formatWeight(item.actualYield),
      align: 'right' as const,
    },
    {
      key: 'yieldPerAcre',
      title: '亩产',
      render: (item: HarvestWithDetails) => formatWeight(item.yieldPerAcre || 0),
      align: 'right' as const,
    },
    {
      key: 'quality',
      title: '品质',
      render: (item: HarvestWithDetails) => (
        <Tag variant="farm" size="sm">
          {item.quality}
        </Tag>
      ),
    },
    {
      key: 'unitPrice',
      title: '单价',
      render: (item: HarvestWithDetails) => formatCurrency(item.unitPrice),
      align: 'right' as const,
    },
    {
      key: 'revenue',
      title: '收入',
      render: (item: HarvestWithDetails) => formatCurrency(item.revenue || 0),
      align: 'right' as const,
    },
    {
      key: 'actions',
      title: '操作',
      width: '120px',
      render: (item: HarvestWithDetails) => (
        <div className="flex gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleEdit(item)}
            leftIcon={<Edit2 className="w-4 h-4" />}
          />
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleDelete(item.id)}
            leftIcon={<Trash2 className="w-4 h-4 text-red-500" />}
          />
        </div>
      ),
    },
  ];

  const years = useMemo(() => {
    const yearSet = new Set(harvests.map((h) => new Date(h.harvestDate).getFullYear()));
    yearSet.add(new Date().getFullYear());
    return Array.from(yearSet).sort((a, b) => b - a);
  }, [harvests]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">收成管理</h1>
          <p className="text-gray-500 mt-1">记录和分析作物收成数据</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="md"
            leftIcon={<Upload className="w-4 h-4" />}
            onClick={() => setShowImport(true)}
          >
            批量导入
          </Button>
          <Button leftIcon={<Plus className="w-4 h-4" />} onClick={() => setShowForm(true)}>
            录入收成
          </Button>
        </div>
      </div>

      {showForm && (
        <HarvestForm
          editData={editData}
          onSubmit={handleSubmit}
          onCancel={() => {
            setShowForm(false);
            setEditData(null);
          }}
        />
      )}

      <BulkImportModal
        isOpen={showImport}
        onClose={() => setShowImport(false)}
        mode="harvest"
      />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="总产量"
          value={formatWeight(stats.totalYield)}
          icon={Leaf}
          color="farm"
          trend={5.2}
          trendLabel="较去年"
        />
        <MetricCard
          title="平均亩产"
          value={formatWeight(stats.avgYieldPerAcre)}
          icon={TrendingUp}
          color="wheat"
          trend={3.8}
          trendLabel="较去年"
        />
        <MetricCard
          title="最高产地块"
          value={stats.maxYieldField.name}
          icon={Award}
          color="soil"
          trendLabel={`${formatWeight(stats.maxYieldField.yield)}/亩`}
        />
        <MetricCard
          title="总收入"
          value={formatCurrency(stats.totalRevenue)}
          icon={PieChartIcon}
          color="sky"
          trend={6.5}
          trendLabel="较去年"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-1">
          <Card.Header>
            <Card.Title>品质分布</Card.Title>
          </Card.Header>
          <Card.Content>
            <PieChart
              data={qualityChartData}
              height={250}
              innerRadius={50}
              outerRadius={80}
              showLabel
            />
          </Card.Content>
        </Card>

        <Card className="lg:col-span-2">
          <Card.Header>
            <Card.Title>历史产量对比</Card.Title>
            <div className="flex gap-3">
              <select
                value={selectedField}
                onChange={(e) => setSelectedField(e.target.value)}
                className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-farm-500"
              >
                <option value="">选择地块</option>
                {fields.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.name}
                  </option>
                ))}
              </select>
            </div>
          </Card.Header>
          <Card.Content>
            {selectedField ? (
              <div>
                <BarChart
                  data={historyChartData.map((d) => ({
                    ...d,
                    isAbnormal: undefined,
                    abnormalLevel: undefined,
                  }))}
                  bars={[
                    { dataKey: 'actual', name: '实际亩产', color: '#22c55e' },
                    { dataKey: 'expected', name: '预期亩产', color: '#94a3b8' },
                  ]}
                  height={280}
                />
                {historyChartData.some((d) => d.isAbnormal) && (
                  <div className="mt-4 flex flex-wrap gap-2">
                    {historyChartData
                      .filter((d) => d.isAbnormal)
                      .map((d, i) => (
                        <Tag
                          key={i}
                          variant={d.abnormalLevel === 'danger' ? 'danger' : 'warning'}
                          size="sm"
                        >
                          {d.name} 异常（偏差 {formatPercentage(
                            yieldComparisons.find((c) => c.seasonId === seasons.find((s) => {
                              const year = new Date(s.sowDate).getFullYear();
                              return s.fieldId === selectedField && year === d.year;
                            })?.id)?.deviationRate || 0
                          )}）
                        </Tag>
                      ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="h-[280px] flex items-center justify-center text-gray-400">
                请选择地块查看历史对比
              </div>
            )}
          </Card.Content>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <Card.Header>
            <Card.Title>年度产量趋势</Card.Title>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(parseInt(e.target.value))}
              className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-farm-500"
            >
              {years.map((y) => (
                <option key={y} value={y}>
                  {y}年
                </option>
              ))}
            </select>
          </Card.Header>
          <Card.Content>
            <LineChart
              data={trendChartData}
              lines={[{ dataKey: '产量', name: '产量（公斤）', color: '#22c55e' }]}
              height={280}
            />
          </Card.Content>
        </Card>

        <Card>
          <Card.Header>
            <Card.Title>异常分析</Card.Title>
            <StatusBadge
              status={abnormalHarvests.length > 0 ? 'warning' : 'success'}
              text={`${abnormalHarvests.length} 个异常`}
              size="sm"
            />
          </Card.Header>
          <Card.Content>
            {abnormalHarvests.length > 0 ? (
              <div className="space-y-4 max-h-[320px] overflow-y-auto">
                {abnormalHarvests.map((abnormal, index) => {
                  const season = seasons.find((s) => s.id === abnormal.seasonId);
                  const field = fields.find((f) => f.id === season?.fieldId);
                  const reasons = getAbnormalityReasons(abnormal);

                  return (
                    <div
                      key={index}
                      className={`p-4 rounded-lg border ${
                        abnormal.abnormalLevel === 'danger'
                          ? 'bg-red-50 border-red-200'
                          : 'bg-yellow-50 border-yellow-200'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          {abnormal.abnormalLevel === 'danger' ? (
                            <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
                          ) : (
                            <AlertTriangle className="w-5 h-5 text-yellow-500 flex-shrink-0" />
                          )}
                          <div>
                            <p className="font-medium text-gray-900">
                              {field?.name} - {abnormal.cropName}（{abnormal.year}年）
                            </p>
                            <p className="text-sm text-gray-500 mt-1">
                              亩产 {formatWeight(abnormal.actualYield)}，预期{' '}
                              {formatWeight(abnormal.expectedYield)}，偏差{' '}
                              <span
                                className={`font-medium ${
                                  abnormal.deviationRate > 0 ? 'text-green-600' : 'text-red-600'
                                }`}
                              >
                                {formatPercentage(abnormal.deviationRate)}
                              </span>
                            </p>
                          </div>
                        </div>
                        <Tag
                          variant={abnormal.abnormalLevel === 'danger' ? 'danger' : 'warning'}
                          size="sm"
                        >
                          {abnormal.abnormalLevel === 'danger' ? '显著异常' : '轻微异常'}
                        </Tag>
                      </div>
                      {reasons.length > 0 && (
                        <div className="mt-3 pt-3 border-t border-gray-200">
                          <p className="text-xs text-gray-500 mb-2">可能原因分析：</p>
                          <ul className="text-sm text-gray-600 space-y-1">
                            {reasons.map((reason, i) => (
                              <li key={i} className="flex items-start gap-2">
                                <span className="text-gray-400 mt-1">•</span>
                                {reason}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="h-[280px] flex flex-col items-center justify-center text-gray-400">
                <CheckCircle className="w-12 h-12 text-green-400 mb-3" />
                <p>暂无异常数据</p>
                <p className="text-sm mt-1">所有地块产量均在正常范围内</p>
              </div>
            )}
          </Card.Content>
        </Card>
      </div>

      <Card>
        <Card.Header>
          <Card.Title>收成记录</Card.Title>
        </Card.Header>
        <Card.Content>
          <Table
            columns={columns as any}
            data={harvests as any}
            loading={loading}
            rowKey="id"
            emptyText="暂无收成记录"
          />
        </Card.Content>
      </Card>
    </div>
  );
}
