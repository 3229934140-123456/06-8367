import { useState, useMemo } from 'react';
import {
  DollarSign,
  PieChart as PieChartIcon,
  TrendingUp,
  Plus,
  Edit2,
  Trash2,
  Filter,
  X,
} from 'lucide-react';
import Card from '@/components/Common/Card';
import Button from '@/components/Common/Button';
import MetricCard from '@/components/Cards/MetricCard';
import BarChart from '@/components/Charts/BarChart';
import LineChart from '@/components/Charts/LineChart';
import PieChart from '@/components/Charts/PieChart';
import Table from '@/components/Common/Table';
import Tag from '@/components/Common/Tag';
import CostForm from './CostForm';
import { useAppStore } from '@/store/useAppStore';
import { costService } from '@/services/costService';
import { CostCategory } from '@/types';
import type { Cost, Season, Field, CostStats } from '@/types';
import { formatCurrency, formatPercentage } from '@/utils/calculationUtils';

interface CostWithDetails extends Cost {
  season?: Season;
  field?: Field;
}

interface Filters {
  category: string;
  seasonId: string;
  startDate: string;
  endDate: string;
}

const categoryColors: Record<string, string> = {
  [CostCategory.SEED]: '#22c55e',
  [CostCategory.PESTICIDE]: '#ef4444',
  [CostCategory.FERTILIZER]: '#f59e0b',
  [CostCategory.LABOR]: '#3b82f6',
  [CostCategory.MACHINERY]: '#8b5cf6',
  [CostCategory.IRRIGATION]: '#06b6d4',
  [CostCategory.OTHER]: '#6b7280',
  [CostCategory.LAND]: '#84cc16',
};

const categoryLabels: Record<string, string> = {
  [CostCategory.SEED]: '种子',
  [CostCategory.PESTICIDE]: '农药',
  [CostCategory.FERTILIZER]: '化肥',
  [CostCategory.LABOR]: '人工',
  [CostCategory.MACHINERY]: '农机',
  [CostCategory.IRRIGATION]: '灌溉',
  [CostCategory.OTHER]: '其他',
  [CostCategory.LAND]: '地租',
};

export default function Costs() {
  const {
    costs: storeCosts,
    seasons,
    fields,
    isLoading,
    deleteCost,
    selectSeasonById,
    selectFieldById,
  } = useAppStore();

  const [showForm, setShowForm] = useState(false);
  const [editData, setEditData] = useState<Cost | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<Filters>({
    category: '',
    seasonId: '',
    startDate: '',
    endDate: '',
  });
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());

  const costs = useMemo<CostWithDetails[]>(() => {
    return storeCosts.map((c) => {
      const season = selectSeasonById(c.seasonId);
      const field = season ? selectFieldById(season.fieldId) : undefined;
      return {
        ...c,
        season,
        field,
      };
    });
  }, [storeCosts, selectSeasonById, selectFieldById]);

  const costStats = useMemo(() => {
    return costService.getCostStatsSync(storeCosts);
  }, [storeCosts, costService]);

  const loading = isLoading;

  const filteredCosts = useMemo(() => {
    let result = [...costs];

    if (filters.category) {
      result = result.filter((c) => c.category === filters.category);
    }
    if (filters.seasonId) {
      result = result.filter((c) => c.seasonId === filters.seasonId);
    }
    if (filters.startDate) {
      result = result.filter((c) => c.date >= filters.startDate);
    }
    if (filters.endDate) {
      result = result.filter((c) => c.date <= filters.endDate);
    }

    return result.sort((a, b) => b.date.localeCompare(a.date));
  }, [costs, filters]);

  const filteredStats = useMemo(() => {
    const total = filteredCosts.reduce((sum, c) => sum + c.amount, 0);
    const byCategory = filteredCosts.reduce((acc, c) => {
      if (!acc[c.category]) {
        acc[c.category] = 0;
      }
      acc[c.category] += c.amount;
      return acc;
    }, {} as Record<string, number>);

    return {
      total,
      byCategory,
    };
  }, [filteredCosts]);

  const categoryPieData = useMemo(() => {
    if (!costStats) return [];
    return costStats.byCategory.map((stat) => ({
      name: categoryLabels[stat.category] || stat.category,
      value: stat.totalAmount,
      color: categoryColors[stat.category] || '#6b7280',
    }));
  }, [costStats]);

  const categoryBarData = useMemo(() => {
    if (!costStats) return [];
    return costStats.byCategory
      .sort((a, b) => b.totalAmount - a.totalAmount)
      .map((stat) => ({
        name: categoryLabels[stat.category] || stat.category,
        金额: stat.totalAmount,
        占比: stat.percentage,
      }));
  }, [costStats]);

  const trendChartData = useMemo(() => {
    if (!costStats) return [];

    const months = ['01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11', '12'];
    return months.map((month) => {
      const key = `${selectedYear}-${month}`;
      return {
        name: `${parseInt(month)}月`,
        成本: costStats.byMonth[key] || 0,
      };
    });
  }, [costStats, selectedYear]);

  const handleSubmit = async () => {
    setShowForm(false);
    setEditData(null);
  };

  const handleEdit = (cost: Cost) => {
    setEditData(cost);
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('确定要删除这条成本记录吗？')) {
      try {
        await deleteCost(id);
      } catch (error) {
        console.error('删除失败:', error);
      }
    }
  };

  const resetFilters = () => {
    setFilters({
      category: '',
      seasonId: '',
      startDate: '',
      endDate: '',
    });
  };

  const columns = [
    {
      key: 'date',
      title: '日期',
      width: '110px',
    },
    {
      key: 'category',
      title: '分类',
      render: (item: CostWithDetails) => (
        <span
          className="inline-flex items-center px-2.5 py-1 text-sm font-medium rounded-full"
          style={{
            backgroundColor: `${categoryColors[item.category]}20`,
            color: categoryColors[item.category],
          }}
        >
          {categoryLabels[item.category] || item.category}
        </span>
      ),
    },
    {
      key: 'name',
      title: '项目名称',
    },
    {
      key: 'field',
      title: '地块',
      render: (item: CostWithDetails) => item.field?.name || '-',
    },
    {
      key: 'cropName',
      title: '作物',
      render: (item: CostWithDetails) => item.season?.cropName || '-',
    },
    {
      key: 'amount',
      title: '金额',
      render: (item: CostWithDetails) => formatCurrency(item.amount),
      align: 'right' as const,
    },
    {
      key: 'remark',
      title: '备注',
      render: (item: CostWithDetails) => item.remark || '-',
    },
    {
      key: 'actions',
      title: '操作',
      width: '120px',
      render: (item: CostWithDetails) => (
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
    const yearSet = new Set(costs.map((c) => new Date(c.date).getFullYear()));
    yearSet.add(new Date().getFullYear());
    return Array.from(yearSet).sort((a, b) => b - a);
  }, [costs]);

  const getCategoryIcon = (category: string) => {
    const icons: Record<string, string> = {
      [CostCategory.SEED]: '🌱',
      [CostCategory.PESTICIDE]: '🧪',
      [CostCategory.FERTILIZER]: '💧',
      [CostCategory.LABOR]: '👷',
      [CostCategory.MACHINERY]: '🚜',
      [CostCategory.IRRIGATION]: '💦',
      [CostCategory.OTHER]: '📦',
      [CostCategory.LAND]: '🏞️',
    };
    return icons[category] || '💰';
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">成本管理</h1>
          <p className="text-gray-500 mt-1">记录和分析农业生产成本</p>
        </div>
        <div className="flex gap-3">
          <Button
            variant="outline"
            leftIcon={<Filter className="w-4 h-4" />}
            onClick={() => setShowFilters(!showFilters)}
          >
            筛选
          </Button>
          <Button leftIcon={<Plus className="w-4 h-4" />} onClick={() => setShowForm(true)}>
            新增成本
          </Button>
        </div>
      </div>

      {showForm && (
        <CostForm
          editData={editData}
          onSubmit={handleSubmit}
          onCancel={() => {
            setShowForm(false);
            setEditData(null);
          }}
        />
      )}

      {showFilters && (
        <Card>
          <Card.Header>
            <Card.Title>筛选条件</Card.Title>
            <Button variant="ghost" size="sm" onClick={resetFilters}>
              重置
            </Button>
          </Card.Header>
          <Card.Content>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">分类</label>
                <select
                  value={filters.category}
                  onChange={(e) => setFilters({ ...filters, category: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-farm-500"
                >
                  <option value="">全部</option>
                  {Object.entries(categoryLabels).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">种植季</label>
                <select
                  value={filters.seasonId}
                  onChange={(e) => setFilters({ ...filters, seasonId: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-farm-500"
                >
                  <option value="">全部</option>
                  {seasons.map((s) => {
                    const field = fields.find((f) => f.id === s.fieldId);
                    return (
                      <option key={s.id} value={s.id}>
                        {field?.name} - {s.cropName}
                      </option>
                    );
                  })}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">开始日期</label>
                <input
                  type="date"
                  value={filters.startDate}
                  onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-farm-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">结束日期</label>
                <input
                  type="date"
                  value={filters.endDate}
                  onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-farm-500"
                />
              </div>
            </div>
            {(filters.category || filters.seasonId || filters.startDate || filters.endDate) && (
              <div className="mt-4 flex flex-wrap gap-2">
                {filters.category && (
                  <Tag variant="farm" size="sm" className="flex items-center gap-1">
                    分类：{categoryLabels[filters.category]}
                    <X
                      className="w-3 h-3 cursor-pointer"
                      onClick={() => setFilters({ ...filters, category: '' })}
                    />
                  </Tag>
                )}
                {filters.seasonId && (
                  <Tag variant="farm" size="sm" className="flex items-center gap-1">
                    种植季：{seasons.find((s) => s.id === filters.seasonId)?.cropName || ''}
                    <X
                      className="w-3 h-3 cursor-pointer"
                      onClick={() => setFilters({ ...filters, seasonId: '' })}
                    />
                  </Tag>
                )}
                {filters.startDate && (
                  <Tag variant="farm" size="sm" className="flex items-center gap-1">
                    开始：{filters.startDate}
                    <X
                      className="w-3 h-3 cursor-pointer"
                      onClick={() => setFilters({ ...filters, startDate: '' })}
                    />
                  </Tag>
                )}
                {filters.endDate && (
                  <Tag variant="farm" size="sm" className="flex items-center gap-1">
                    结束：{filters.endDate}
                    <X
                      className="w-3 h-3 cursor-pointer"
                      onClick={() => setFilters({ ...filters, endDate: '' })}
                    />
                  </Tag>
                )}
              </div>
            )}
          </Card.Content>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="总成本"
          value={formatCurrency(costStats?.totalCost || 0)}
          icon={DollarSign}
          color="farm"
          trend={-2.5}
          trendLabel="较去年"
        />
        <MetricCard
          title="记录条数"
          value={filteredCosts.length}
          icon={PieChartIcon}
          color="wheat"
        />
        <MetricCard
          title="平均单笔"
          value={formatCurrency(
            filteredCosts.length > 0 ? filteredStats.total / filteredCosts.length : 0
          )}
          icon={TrendingUp}
          color="soil"
        />
        <MetricCard
          title="筛选结果"
          value={formatCurrency(filteredStats.total)}
          icon={DollarSign}
          color="sky"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-1">
          <Card.Header>
            <Card.Title>成本分类占比</Card.Title>
          </Card.Header>
          <Card.Content>
            <PieChart
              data={categoryPieData}
              height={280}
              innerRadius={50}
              outerRadius={90}
              showLabel
            />
          </Card.Content>
        </Card>

        <Card className="lg:col-span-2">
          <Card.Header>
            <Card.Title>分类统计</Card.Title>
          </Card.Header>
          <Card.Content>
            <BarChart
              data={categoryBarData}
              bars={[{ dataKey: '金额', name: '金额（元）', color: '#22c55e' }]}
              height={280}
              horizontal
            />
          </Card.Content>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <Card.Header>
            <Card.Title>月度成本趋势</Card.Title>
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
              lines={[{ dataKey: '成本', name: '成本（元）', color: '#22c55e', strokeWidth: 3 }]}
              height={280}
            />
          </Card.Content>
        </Card>

        <Card>
          <Card.Header>
            <Card.Title>分类明细</Card.Title>
          </Card.Header>
          <Card.Content>
            <div className="space-y-3">
              {costStats?.byCategory
                .sort((a, b) => b.totalAmount - a.totalAmount)
                .map((stat, index) => (
                  <div key={index} className="flex items-center gap-3">
                    <span className="text-xl">{getCategoryIcon(stat.category)}</span>
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium text-gray-700">
                          {categoryLabels[stat.category] || stat.category}
                        </span>
                        <span className="text-sm font-medium text-gray-900">
                          {formatCurrency(stat.totalAmount)}
                        </span>
                      </div>
                      <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{
                            width: `${stat.percentage}%`,
                            backgroundColor: categoryColors[stat.category] || '#6b7280',
                          }}
                        />
                      </div>
                      <p className="text-xs text-gray-500 mt-1">
                        占比 {formatPercentage(stat.percentage)}
                      </p>
                    </div>
                  </div>
                ))}
            </div>
          </Card.Content>
        </Card>
      </div>

      <Card>
        <Card.Header>
          <Card.Title>
            成本明细
            {filteredCosts.length !== costs.length && (
              <span className="ml-2 text-sm font-normal text-gray-500">
                （筛选结果 {filteredCosts.length} 条）
              </span>
            )}
          </Card.Title>
        </Card.Header>
        <Card.Content>
          <Table
            columns={columns as any}
            data={filteredCosts as any}
            loading={loading}
            rowKey="id"
            emptyText="暂无成本记录"
          />
        </Card.Content>
      </Card>
    </div>
  );
}
