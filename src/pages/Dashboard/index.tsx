import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  LayoutGrid,
  Sprout,
  TrendingUp,
  DollarSign,
  Bell,
  CheckCircle2,
  Clock,
  MapPin,
  Calendar,
  AlertCircle,
} from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';
import MetricCard from '@/components/Cards/MetricCard';
import Card from '@/components/Common/Card';
import Button from '@/components/Common/Button';
import Tag from '@/components/Common/Tag';
import StatusBadge from '@/components/Common/StatusBadge';
import Empty from '@/components/Common/Empty';
import LineChart from '@/components/Charts/LineChart';
import PieChart from '@/components/Charts/PieChart';
import { formatDate, formatRelativeTime, sortByDate, getMonthFromDate, getYearFromDate } from '@/utils/dateUtils';
import { formatCurrency, formatWeight, roundTo } from '@/utils/calculationUtils';
import type { Operation, Reminder, Season } from '@/types';

export default function Dashboard() {
  const navigate = useNavigate();
  const [markingReminderId, setMarkingReminderId] = useState<string | null>(null);

  const {
    fields,
    seasons,
    operations,
    harvests,
    costs,
    reminders,
    markReminderCompleted,
    selectActiveSeasons,
    selectPendingReminders,
    selectTotalArea,
  } = useAppStore();

  const activeSeasons = selectActiveSeasons();
  const pendingReminders = selectPendingReminders();
  const totalArea = selectTotalArea();

  const stats = useMemo(() => {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1;

    const yearHarvests = harvests.filter((h) => {
      const season = seasons.find((s) => s.id === h.seasonId);
      return season && getYearFromDate(season.sowDate) === currentYear;
    });

    const monthHarvests = harvests.filter((h) => {
      const harvestDate = new Date(h.harvestDate);
      return (
        harvestDate.getFullYear() === currentYear &&
        harvestDate.getMonth() + 1 === currentMonth
      );
    });

    const totalRevenue = yearHarvests.reduce(
      (sum, h) => sum + h.actualYield * h.unitPrice,
      0
    );

    const yearCosts = costs.filter((c) => {
      const season = seasons.find((s) => s.id === c.seasonId);
      return season && getYearFromDate(season.sowDate) === currentYear;
    });

    const totalCost = yearCosts.reduce((sum, c) => sum + c.amount, 0);
    const profit = totalRevenue - totalCost;

    const monthYield = monthHarvests.reduce((sum, h) => sum + h.actualYield, 0);

    return {
      totalFields: fields.length,
      activeCrops: activeSeasons.length,
      monthYield,
      yearProfit: profit,
      totalArea,
    };
  }, [fields, seasons, harvests, costs, activeSeasons]);

  const recentOperations = useMemo(() => {
    const operationsWithDetails = operations.map((op) => {
      const season = seasons.find((s) => s.id === op.seasonId);
      const field = season ? fields.find((f) => f.id === season.fieldId) : null;
      return {
        ...op,
        cropName: season?.cropName || '',
        fieldName: field?.name || '',
      };
    });
    return sortByDate(operationsWithDetails, 'date').slice(0, 8);
  }, [operations, seasons, fields]);

  const yieldTrendData = useMemo(() => {
    const now = new Date();
    const months: string[] = [];
    const data: { name: string; 产量: number }[] = [];

    for (let i = 11; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      const monthLabel = `${date.getMonth() + 1}月`;
      months.push(monthKey);

      const monthHarvests = harvests.filter((h) => {
        const harvestDate = new Date(h.harvestDate);
        const harvestMonthKey = `${harvestDate.getFullYear()}-${String(harvestDate.getMonth() + 1).padStart(2, '0')}`;
        return harvestMonthKey === monthKey;
      });

      const totalYield = monthHarvests.reduce((sum, h) => sum + h.actualYield, 0);
      data.push({
        name: monthLabel,
        产量: roundTo(totalYield / 1000, 2),
      });
    }

    return data;
  }, [harvests]);

  const cropDistributionData = useMemo(() => {
    const cropAreas: Record<string, number> = {};

    activeSeasons.forEach((season) => {
      const field = fields.find((f) => f.id === season.fieldId);
      if (field) {
        if (!cropAreas[season.cropName]) {
          cropAreas[season.cropName] = 0;
        }
        cropAreas[season.cropName] += field.area;
      }
    });

    const colors = ['#22c55e', '#f59e0b', '#0ea5e9', '#ef4444', '#8b5cf6'];

    return Object.entries(cropAreas).map(([name, value], index) => ({
      name,
      value,
      color: colors[index % colors.length],
    }));
  }, [activeSeasons, fields]);

  const handleMarkReminderComplete = async (reminderId: string) => {
    setMarkingReminderId(reminderId);
    try {
      await markReminderCompleted(reminderId);
    } catch (error) {
      console.error('标记提醒完成失败:', error);
    } finally {
      setMarkingReminderId(null);
    }
  };

  const getOperationIcon = (type: string) => {
    const iconMap: Record<string, typeof Sprout> = {
      播种: Sprout,
      施肥: Sprout,
      打药: AlertCircle,
      灌溉: Clock,
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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">总览仪表盘</h1>
          <p className="text-gray-500 mt-1">欢迎回来，查看您的农场运营状况</p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-500">
            {formatDate(new Date(), 'yyyy年MM月dd日 EEEE')}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="总地块数"
          value={`${stats.totalFields} 块`}
          icon={LayoutGrid}
          color="farm"
          trend={5.2}
          trendLabel="较去年"
        />
        <MetricCard
          title="在种作物"
          value={`${stats.activeCrops} 种`}
          icon={Sprout}
          color="wheat"
          trend={0}
          trendLabel="本季"
        />
        <MetricCard
          title="本月产量"
          value={formatWeight(stats.monthYield)}
          icon={TrendingUp}
          color="sky"
          trend={12.5}
          trendLabel="较上月"
        />
        <MetricCard
          title="本年收益"
          value={formatCurrency(stats.yearProfit)}
          icon={DollarSign}
          color="soil"
          trend={8.3}
          trendLabel="较去年"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-1">
          <Card.Header>
            <div className="flex items-center gap-2">
              <Bell className="w-5 h-5 text-wheat-600" />
              <Card.Title>待办提醒</Card.Title>
              {pendingReminders.length > 0 && (
                <Tag variant="danger" size="sm">
                  {pendingReminders.length}
                </Tag>
              )}
            </div>
          </Card.Header>
          <Card.Content>
            {pendingReminders.length === 0 ? (
              <Empty
                title="暂无待办"
                description="所有提醒事项已完成"
                className="py-8"
              />
            ) : (
              <div className="space-y-3 max-h-[400px] overflow-y-auto">
                {pendingReminders.slice(0, 6).map((reminder) => (
                  <div
                    key={reminder.id}
                    className="flex items-start gap-3 p-3 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors"
                  >
                    <div className="w-10 h-10 bg-wheat-100 rounded-lg flex items-center justify-center flex-shrink-0">
                      <AlertCircle className="w-5 h-5 text-wheat-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <h4 className="font-medium text-gray-900 text-sm truncate">
                          {reminder.title}
                        </h4>
                        <Button
                          variant="ghost"
                          size="sm"
                          loading={markingReminderId === reminder.id}
                          onClick={() => handleMarkReminderComplete(reminder.id)}
                          className="flex-shrink-0 h-8 w-8 p-0"
                        >
                          <CheckCircle2 className="w-4 h-4" />
                        </Button>
                      </div>
                      <p className="text-xs text-gray-500 mt-1 line-clamp-2">
                        {reminder.content}
                      </p>
                      <div className="flex items-center gap-2 mt-2">
                        <Tag variant="warning" size="sm">
                          {reminder.type}
                        </Tag>
                        <span className="text-xs text-gray-400 flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {formatRelativeTime(reminder.remindDate)}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card.Content>
        </Card>

        <Card className="lg:col-span-2">
          <Card.Header>
            <div className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-farm-600" />
              <Card.Title>近期操作记录</Card.Title>
            </div>
          </Card.Header>
          <Card.Content>
            {recentOperations.length === 0 ? (
              <Empty
                title="暂无操作记录"
                description="开始记录您的农事操作吧"
                className="py-8"
              />
            ) : (
              <div className="relative">
                {recentOperations.map((op, index) => {
                  const Icon = getOperationIcon(op.type);
                  const isLast = index === recentOperations.length - 1;
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
                                {op.type} - {op.cropName}
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
                                <MapPin className="w-3 h-3" />
                                {op.fieldName}
                              </span>
                              <span className="flex items-center gap-1">
                                <Calendar className="w-3 h-3" />
                                {formatDate(op.date)}
                              </span>
                              <span>操作人: {op.operator}</span>
                              {op.product && (
                                <span>农资: {op.product}</span>
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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <Card.Header>
            <Card.Title>产量趋势（近12个月）</Card.Title>
          </Card.Header>
          <Card.Content>
            <LineChart
              data={yieldTrendData}
              lines={[
                {
                  dataKey: '产量',
                  name: '产量（吨）',
                  color: '#22c55e',
                  strokeWidth: 3,
                },
              ]}
              height={300}
              showGrid
              showLegend
            />
          </Card.Content>
        </Card>

        <Card>
          <Card.Header>
            <Card.Title>作物分布（按种植面积）</Card.Title>
          </Card.Header>
          <Card.Content>
            {cropDistributionData.length === 0 ? (
              <Empty
                title="暂无作物数据"
                description="添加种植季后将显示作物分布"
                className="py-8"
              />
            ) : (
              <PieChart
                data={cropDistributionData}
                height={300}
                innerRadius={60}
                outerRadius={100}
                showLegend
                showLabel
              />
            )}
          </Card.Content>
        </Card>
      </div>

      <div className="flex items-center justify-center gap-4 pt-4">
        <Button
          variant="outline"
          onClick={() => navigate('/fields')}
          leftIcon={<LayoutGrid className="w-4 h-4" />}
        >
          查看所有地块
        </Button>
        <Button
          variant="primary"
          onClick={() => navigate('/fields')}
          leftIcon={<Sprout className="w-4 h-4" />}
        >
          管理种植季
        </Button>
      </div>
    </div>
  );
}
