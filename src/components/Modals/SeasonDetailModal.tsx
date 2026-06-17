import { useMemo } from 'react';
import {
  LandPlot,
  Sprout,
  DollarSign,
  TrendingDown,
  TrendingUp,
  AlertTriangle,
  Leaf,
  Weight,
} from 'lucide-react';
import Modal from '@/components/Common/Modal';
import type { Season, Field, Harvest, Cost } from '@/types';
import {
  calculateProfit,
  calculateCostStats,
  calculateDeviationRate,
  formatCurrency,
  formatPercentage,
  formatWeight,
} from '@/utils/calculationUtils';
import { cn } from '@/lib/utils';

interface SeasonDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  season?: Season | null;
  field?: Field | null;
  harvests: Harvest[];
  costs: Cost[];
}

export default function SeasonDetailModal({
  isOpen,
  onClose,
  season,
  field,
  harvests,
  costs,
}: SeasonDetailModalProps) {
  const seasonHarvests = useMemo(
    () => (season ? harvests.filter((h) => h.seasonId === season.id) : []),
    [harvests, season]
  );
  const seasonCosts = useMemo(
    () => (season ? costs.filter((c) => c.seasonId === season.id) : []),
    [costs, season]
  );

  const stats = useMemo(() => {
    if (!field) return null;
    return calculateProfit(seasonHarvests, seasonCosts, field.area);
  }, [field, seasonHarvests, seasonCosts]);

  const costBreakdown = useMemo(() => {
    const result = calculateCostStats(seasonCosts);
    return Object.entries(result.byCategory)
      .map(([category, amount]) => ({
        category,
        amount,
        percentage: result.percentages[category] || 0,
      }))
      .sort((a, b) => b.amount - a.amount);
  }, [seasonCosts]);

  const totalYield = useMemo(
    () => seasonHarvests.reduce((s, h) => s + h.actualYield, 0),
    [seasonHarvests]
  );

  const yieldPerAcre = useMemo(
    () => (field && field.area > 0 ? totalYield / field.area : 0),
    [totalYield, field]
  );

  const abnormalNotes = useMemo(() => {
    const notes: { type: 'warning' | 'danger'; text: string }[] = [];
    if (!season || !field) return notes;

    const yieldDeviation = calculateDeviationRate(yieldPerAcre, season.expectedYield);
    if (yieldDeviation < -20) {
      notes.push({
        type: 'danger',
        text: `亩产 ${yieldPerAcre.toFixed(1)} 公斤，低于预期 ${season.expectedYield} 公斤 ${Math.abs(
          yieldDeviation
        ).toFixed(1)}%，产量严重偏低，需检查病虫草害或天气影响。`,
      });
    } else if (yieldDeviation < -10) {
      notes.push({
        type: 'warning',
        text: `亩产 ${yieldPerAcre.toFixed(1)} 公斤，低于预期 ${season.expectedYield} 公斤 ${Math.abs(
          yieldDeviation
        ).toFixed(1)}%。`,
      });
    } else if (yieldDeviation > 20) {
      notes.push({
        type: 'warning',
        text: `亩产 ${yieldPerAcre.toFixed(1)} 公斤，超预期 ${season.expectedYield} 公斤 ${yieldDeviation.toFixed(
          1
        )}%，表现良好。`,
      });
    }

    if (stats && stats.roi < 0) {
      notes.push({
        type: 'danger',
        text: `投资回报率 ${formatPercentage(stats.roi)}，本季亏损 ${formatCurrency(
          Math.abs(stats.totalProfit)
        )}，请分析成本结构。`,
      });
    }

    const avgCostPerAcre = field.area > 0 ? stats?.totalCost || 0 / field.area : 0;
    if (avgCostPerAcre > 1000) {
      notes.push({
        type: 'warning',
        text: `亩均成本 ${formatCurrency(avgCostPerAcre)} 偏高，建议查看成本分类是否合理。`,
      });
    }

    return notes;
  }, [season, field, yieldPerAcre, stats]);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="xl"
      title={
        season && field
          ? `${field.name} - ${season.cropName} (${season.sowDate} 播种)`
          : '种植季详情'
      }
    >
      {!season || !field ? (
        <div className="text-gray-500 py-8 text-center">请选择要查看的种植季</div>
      ) : (
        <div className="space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="bg-soil-50 rounded-lg p-3">
              <div className="flex items-center gap-2 text-soil-700 text-xs mb-1">
                <LandPlot className="w-3.5 h-3.5" />
                <span>地块面积</span>
              </div>
              <p className="text-lg font-bold text-soil-900">{field.area} 亩</p>
            </div>
            <div className="bg-farm-50 rounded-lg p-3">
              <div className="flex items-center gap-2 text-farm-700 text-xs mb-1">
                <Sprout className="w-3.5 h-3.5" />
                <span>预期亩产</span>
              </div>
              <p className="text-lg font-bold text-farm-900">{season.expectedYield} 公斤</p>
            </div>
            <div className="bg-wheat-50 rounded-lg p-3">
              <div className="flex items-center gap-2 text-wheat-700 text-xs mb-1">
                <Weight className="w-3.5 h-3.5" />
                <span>实际总产量</span>
              </div>
              <p className="text-lg font-bold text-wheat-900">{formatWeight(totalYield)}</p>
            </div>
            <div className="bg-sky-50 rounded-lg p-3">
              <div className="flex items-center gap-2 text-sky-700 text-xs mb-1">
                <Leaf className="w-3.5 h-3.5" />
                <span>实际亩产</span>
              </div>
              <p className="text-lg font-bold text-sky-900">{yieldPerAcre.toFixed(1)} 公斤</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="bg-green-50 rounded-lg p-4">
              <div className="flex items-center gap-2 text-green-700 text-sm mb-1">
                <DollarSign className="w-4 h-4" />
                <span>总收入</span>
              </div>
              <p className="text-2xl font-bold text-green-700">
                {formatCurrency(stats?.totalRevenue || 0)}
              </p>
              <p className="text-xs text-green-600 mt-1">
                亩均 {formatCurrency(stats?.revenuePerAcre || 0)}
              </p>
            </div>
            <div className="bg-red-50 rounded-lg p-4">
              <div className="flex items-center gap-2 text-red-700 text-sm mb-1">
                <TrendingDown className="w-4 h-4" />
                <span>总成本</span>
              </div>
              <p className="text-2xl font-bold text-red-700">
                {formatCurrency(stats?.totalCost || 0)}
              </p>
              <p className="text-xs text-red-600 mt-1">
                亩均 {formatCurrency(stats?.costPerAcre || 0)}
              </p>
            </div>
            <div
              className={cn(
                'rounded-lg p-4',
                (stats?.totalProfit || 0) >= 0 ? 'bg-wheat-50' : 'bg-orange-50'
              )}
            >
              <div
                className={cn(
                  'flex items-center gap-2 text-sm mb-1',
                  (stats?.totalProfit || 0) >= 0 ? 'text-wheat-700' : 'text-orange-700'
                )}
              >
                <TrendingUp className="w-4 h-4" />
                <span>净利润</span>
              </div>
              <p
                className={cn(
                  'text-2xl font-bold',
                  (stats?.totalProfit || 0) >= 0 ? 'text-wheat-700' : 'text-orange-700'
                )}
              >
                {formatCurrency(stats?.totalProfit || 0)}
              </p>
              <p
                className={cn(
                  'text-xs mt-1',
                  (stats?.totalProfit || 0) >= 0 ? 'text-wheat-600' : 'text-orange-600'
                )}
              >
                亩均 {formatCurrency(stats?.profitPerAcre || 0)} · ROI {formatPercentage(stats?.roi || 0)}
              </p>
            </div>
          </div>

          {abnormalNotes.length > 0 && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle className="w-4 h-4 text-yellow-700" />
                <span className="font-medium text-yellow-800">异常说明 / 分析建议</span>
              </div>
              <ul className="space-y-1.5">
                {abnormalNotes.map((note, i) => (
                  <li
                    key={i}
                    className={cn(
                      'text-sm flex items-start gap-2',
                      note.type === 'danger' ? 'text-red-700' : 'text-yellow-800'
                    )}
                  >
                    <span className="mt-0.5">•</span>
                    <span>{note.text}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h4 className="text-sm font-semibold text-gray-800 mb-2">成本分类占比</h4>
              {costBreakdown.length === 0 ? (
                <p className="text-sm text-gray-500">暂无成本数据</p>
              ) : (
                <div className="space-y-2">
                  {costBreakdown.map((item) => (
                    <div key={item.category}>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-gray-700">{item.category}</span>
                        <span className="text-gray-600">
                          {formatCurrency(item.amount)} ({item.percentage.toFixed(1)}%)
                        </span>
                      </div>
                      <div className="w-full bg-gray-100 rounded-full h-2">
                        <div
                          className="bg-farm-500 h-2 rounded-full"
                          style={{ width: `${Math.min(item.percentage, 100)}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div>
              <h4 className="text-sm font-semibold text-gray-800 mb-2">收成明细</h4>
              {seasonHarvests.length === 0 ? (
                <p className="text-sm text-gray-500">暂无收成数据</p>
              ) : (
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {seasonHarvests.map((h) => (
                    <div
                      key={h.id}
                      className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2"
                    >
                      <div>
                        <p className="text-sm font-medium text-gray-800">{h.harvestDate}</p>
                        <p className="text-xs text-gray-500">
                          {formatWeight(h.actualYield)} × {formatCurrency(h.unitPrice)}/公斤 ·{' '}
                          {h.quality}
                        </p>
                      </div>
                      <p className="text-sm font-medium text-green-700">
                        {formatCurrency(h.actualYield * h.unitPrice)}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </Modal>
  );
}
