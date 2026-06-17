import { useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Plus,
  Calendar,
  MapPin,
  Sprout,
  DollarSign,
  TrendingUp,
  Truck,
} from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';
import Card from '@/components/Common/Card';
import Button from '@/components/Common/Button';
import StatusBadge from '@/components/Common/StatusBadge';
import Tag from '@/components/Common/Tag';
import MetricCard from '@/components/Cards/MetricCard';
import GrowthTimeline from '@/components/Cards/GrowthTimeline';
import OperationTimeline from '@/components/Cards/OperationTimeline';
import Modal from '@/components/Common/Modal';
import { ModalFooter } from '@/components/Common/Modal';
import Empty from '@/components/Common/Empty';
import { seasonService } from '@/services/seasonService';
import { harvestService } from '@/services/harvestService';
import { costService } from '@/services/costService';
import { getCropConfig, getGrowthStage } from '@/data/cropConfigs';
import { formatDateChinese, getDaysSince } from '@/utils/dateUtils';
import type {
  Season,
  Field,
  Operation,
  Harvest,
  Cost,
  OperationType,
  CostCategory,
  QualityGrade,
} from '@/types';

interface SeasonDetailData {
  season: Season;
  field?: Field;
  operations: Operation[];
  harvests: Harvest[];
  costs: Cost[];
}

export default function SeasonDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const seasonId = id || '';
  const {
    selectSeasonById,
    selectFieldById,
    selectOperationsBySeasonId,
    selectHarvestsBySeasonId,
    selectCostsBySeasonId,
    addOperation,
    addHarvest,
    addCost,
    isLoading,
  } = useAppStore();

  const [showOperationModal, setShowOperationModal] = useState(false);
  const [showHarvestModal, setShowHarvestModal] = useState(false);
  const [showCostModal, setShowCostModal] = useState(false);
  const [operationForm, setOperationForm] = useState({
    type: '施肥' as OperationType,
    date: new Date().toISOString().split('T')[0],
    product: '',
    dosage: 0,
    dosageUnit: 'kg',
    operator: '',
    remark: '',
  });
  const [harvestForm, setHarvestForm] = useState({
    harvestDate: new Date().toISOString().split('T')[0],
    actualYield: 0,
    quality: '一级' as QualityGrade,
    unitPrice: 0,
    remark: '',
  });
  const [costForm, setCostForm] = useState({
    category: '化肥' as CostCategory,
    name: '',
    amount: 0,
    date: new Date().toISOString().split('T')[0],
    remark: '',
  });

  const data = useMemo((): SeasonDetailData | null => {
    const season = selectSeasonById(seasonId);
    if (!season) return null;

    const field = selectFieldById(season.fieldId);
    const operations = selectOperationsBySeasonId(seasonId);
    const harvests = selectHarvestsBySeasonId(seasonId);
    const costs = selectCostsBySeasonId(seasonId);

    return { season, field, operations, harvests, costs };
  }, [seasonId, selectSeasonById, selectFieldById, selectOperationsBySeasonId, selectHarvestsBySeasonId, selectCostsBySeasonId]);

  const cropConfig = useMemo(() => {
    if (!data?.season) return null;
    return getCropConfig(data.season.cropName);
  }, [data?.season]);

  const growthStageData = useMemo(() => {
    if (!data?.season || !cropConfig) return { stages: [], currentStage: 'seedling' as const };

    const daysAfterSowing = getDaysSince(data.season.sowDate);
    const currentStageInfo = getGrowthStage(data.season.cropName, daysAfterSowing);

    const stageMap: Record<string, 'seedling' | 'vegetative' | 'flowering' | 'fruiting' | 'mature' | 'harvested'> = {
      '播种期': 'seedling',
      '出苗期': 'seedling',
      '分蘖期': 'vegetative',
      '返青期': 'vegetative',
      '拔节期': 'vegetative',
      '苗期': 'seedling',
      '分枝期': 'vegetative',
      '大喇叭口期': 'vegetative',
      '抽雄吐丝期': 'flowering',
      '抽穗期': 'flowering',
      '开花期': 'flowering',
      '开花下针期': 'flowering',
      '蕾期': 'vegetative',
      '花铃期': 'flowering',
      '灌浆期': 'fruiting',
      '结荚期': 'fruiting',
      '结荚成熟期': 'mature',
      '成熟期': 'mature',
      '饱果成熟期': 'mature',
      '吐絮期': 'harvested',
      '育秧期': 'seedling',
      '移栽期': 'vegetative',
      '拔节孕穗期': 'vegetative',
      '抽穗开花期': 'flowering',
      '灌浆成熟期': 'mature',
    };

    const stages = cropConfig.stages.map((stage) => {
      const startDate = new Date(data.season!.sowDate);
      startDate.setDate(startDate.getDate() + stage.daysAfterSowing);
      const endDate = new Date(startDate);
      endDate.setDate(endDate.getDate() + stage.durationDays);

      return {
        stage: stageMap[stage.name] || 'vegetative',
        name: stage.name,
        description: stage.operations.join('、'),
        startDate: startDate.toISOString().split('T')[0],
        endDate: endDate.toISOString().split('T')[0],
        duration: `${stage.durationDays}天`,
      };
    });

    const currentStage = currentStageInfo
      ? stageMap[currentStageInfo.name] || 'vegetative'
      : data.season.status === '已采收'
      ? 'harvested'
      : 'seedling';

    return { stages, currentStage };
  }, [data?.season, cropConfig]);

  const stats = useMemo(() => {
    if (!data) return null;

    const totalCost = data.costs.reduce((sum, c) => sum + c.amount, 0);
    const totalYield = data.harvests.reduce((sum, h) => sum + h.actualYield, 0);
    const totalRevenue = data.harvests.reduce((sum, h) => sum + h.actualYield * h.unitPrice, 0);
    const profit = totalRevenue - totalCost;

    const operationCount = data.operations.length;
    const growthDays = seasonService.getGrowthDays(data.season);
    const totalDays = seasonService.getTotalGrowthDays(data.season);
    const progress = seasonService.calculateGrowthProgress(data.season);

    return {
      totalCost,
      totalYield,
      totalRevenue,
      profit,
      operationCount,
      growthDays,
      totalDays,
      progress,
    };
  }, [data]);

  const operationTimelineData = useMemo(() => {
    if (!data?.operations) return [];

    const typeMap: Record<string, 'planting' | 'irrigation' | 'fertilization' | 'pruning' | 'pest_control' | 'harvest'> = {
      '播种': 'planting',
      '移栽': 'planting',
      '施肥': 'fertilization',
      '追肥': 'fertilization',
      '叶面肥': 'fertilization',
      '打药': 'pest_control',
      '防虫': 'pest_control',
      '灌溉': 'irrigation',
      '浇水': 'irrigation',
      '除草': 'pruning',
      '修剪': 'pruning',
      '整枝': 'pruning',
      '中耕': 'pruning',
      '收获': 'harvest',
      '采收': 'harvest',
    };

    return data.operations.map((op) => ({
      id: op.id,
      type: typeMap[op.type] || 'fertilization',
      title: `${op.type} - ${op.product}`,
      description: op.remark,
      date: new Date(op.date),
      operator: op.operator,
      status: 'completed' as const,
      fieldName: data.field?.name,
    }));
  }, [data?.operations, data?.field]);

  const costByCategory = useMemo(() => {
    if (!data?.costs) return {};
    return data.costs.reduce((acc, cost) => {
      acc[cost.category] = (acc[cost.category] || 0) + cost.amount;
      return acc;
    }, {} as Record<string, number>);
  }, [data?.costs]);

  const handleAddOperation = async () => {
    if (!data?.season) return;
    await addOperation({
      ...operationForm,
      seasonId: data.season.id,
    });
    setShowOperationModal(false);
    setOperationForm({
      type: '施肥' as OperationType,
      date: new Date().toISOString().split('T')[0],
      product: '',
      dosage: 0,
      dosageUnit: 'kg',
      operator: '',
      remark: '',
    });
  };

  const handleAddHarvest = async () => {
    if (!data?.season) return;
    await addHarvest({
      ...harvestForm,
      seasonId: data.season.id,
    });
    setShowHarvestModal(false);
    setHarvestForm({
      harvestDate: new Date().toISOString().split('T')[0],
      actualYield: 0,
      quality: '一级' as QualityGrade,
      unitPrice: 0,
      remark: '',
    });
  };

  const handleAddCost = async () => {
    if (!data?.season) return;
    await addCost({
      ...costForm,
      seasonId: data.season.id,
    });
    setShowCostModal(false);
    setCostForm({
      category: '化肥' as CostCategory,
      name: '',
      amount: 0,
      date: new Date().toISOString().split('T')[0],
      remark: '',
    });
  };

  if (!data || !stats) {
    return <Empty title="种植季不存在" description="请返回列表重新选择" />;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" onClick={() => navigate(-1)} leftIcon={<ArrowLeft className="w-4 h-4" />}>
          返回列表
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-gray-900">
              {data.season.cropName} - {data.field?.name || '未知地块'}
            </h1>
            <StatusBadge
              status={data.season.status === '种植中' ? 'in-progress' : 'completed'}
              text={data.season.status}
            />
          </div>
          <p className="text-sm text-gray-500 mt-1">
            播种日期: {formatDateChinese(data.season.sowDate)} | 预计产量: {data.season.expectedYield} kg/亩
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            leftIcon={<Plus className="w-4 h-4" />}
            onClick={() => setShowOperationModal(true)}
          >
            添加操作
          </Button>
          <Button
            variant="secondary"
            leftIcon={<Truck className="w-4 h-4" />}
            onClick={() => setShowHarvestModal(true)}
          >
            录入收成
          </Button>
          <Button
            variant="primary"
            leftIcon={<DollarSign className="w-4 h-4" />}
            onClick={() => setShowCostModal(true)}
          >
            添加成本
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="生长进度"
          value={`${Math.round(stats.progress)}%`}
          icon={Sprout}
          color="farm"
          trend={stats.progress > 50 ? 10 : 5}
          trendLabel="较预期"
        />
        <MetricCard
          title="总成本"
          value={`¥${stats.totalCost.toLocaleString()}`}
          icon={DollarSign}
          color="soil"
        />
        <MetricCard
          title="总产量"
          value={`${stats.totalYield.toLocaleString()} kg`}
          icon={TrendingUp}
          color="wheat"
        />
        <MetricCard
          title="利润"
          value={`¥${stats.profit.toLocaleString()}`}
          icon={DollarSign}
          color={stats.profit >= 0 ? 'farm' : 'danger'}
          trend={stats.profit >= 0 ? 15 : -5}
        />
      </div>

      <Card>
        <Card.Header>
          <Card.Title>基础信息</Card.Title>
        </Card.Header>
        <Card.Content>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-farm-100 rounded-lg flex items-center justify-center">
                <MapPin className="w-5 h-5 text-farm-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">地块</p>
                <p className="font-medium text-gray-900">{data.field?.name || '未知'}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-soil-100 rounded-lg flex items-center justify-center">
                <Calendar className="w-5 h-5 text-soil-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">播种日期</p>
                <p className="font-medium text-gray-900">{formatDateChinese(data.season.sowDate)}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-wheat-100 rounded-lg flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-wheat-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">生长天数</p>
                <p className="font-medium text-gray-900">{stats.growthDays} / {stats.totalDays} 天</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-sky-100 rounded-lg flex items-center justify-center">
                <Sprout className="w-5 h-5 text-sky-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">操作次数</p>
                <p className="font-medium text-gray-900">{stats.operationCount} 次</p>
              </div>
            </div>
          </div>
        </Card.Content>
      </Card>

      <GrowthTimeline
        title="生长周期"
        stages={growthStageData.stages}
        currentStage={growthStageData.currentStage}
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <OperationTimeline
          title="农事操作记录"
          operations={operationTimelineData}
        />

        <div className="space-y-6">
          <Card>
            <Card.Header>
              <Card.Title>采收记录</Card.Title>
            </Card.Header>
            <Card.Content>
              {data.harvests.length === 0 ? (
                <Empty
                  title="暂无采收记录"
                  description="点击右上角按钮录入收成"
                  className="py-8"
                />
              ) : (
                <div className="space-y-4">
                  {data.harvests.map((harvest) => (
                    <div
                      key={harvest.id}
                      className="p-4 bg-wheat-50 rounded-lg border border-wheat-200"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <Truck className="w-5 h-5 text-wheat-600" />
                          <span className="font-medium text-gray-900">
                            {formatDateChinese(harvest.harvestDate)}
                          </span>
                        </div>
                        <Tag variant="wheat" size="sm">{harvest.quality}</Tag>
                      </div>
                      <div className="grid grid-cols-3 gap-4 text-sm">
                        <div>
                          <p className="text-gray-500">产量</p>
                          <p className="font-medium text-gray-900">{harvest.actualYield} kg</p>
                        </div>
                        <div>
                          <p className="text-gray-500">单价</p>
                          <p className="font-medium text-gray-900">¥{harvest.unitPrice}/kg</p>
                        </div>
                        <div>
                          <p className="text-gray-500">收入</p>
                          <p className="font-medium text-farm-600">
                            ¥{(harvest.actualYield * harvest.unitPrice).toLocaleString()}
                          </p>
                        </div>
                      </div>
                      {harvest.remark && (
                        <p className="text-sm text-gray-500 mt-2">备注: {harvest.remark}</p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </Card.Content>
          </Card>

          <Card>
            <Card.Header>
              <Card.Title>成本统计</Card.Title>
            </Card.Header>
            <Card.Content>
              {data.costs.length === 0 ? (
                <Empty
                  title="暂无成本记录"
                  description="点击右上角按钮添加成本"
                  className="py-8"
                />
              ) : (
                <div className="space-y-4">
                  {Object.entries(costByCategory).map(([category, amount]) => (
                    <div key={category} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Tag variant="soil">{category}</Tag>
                      </div>
                      <span className="font-medium text-gray-900">
                        ¥{amount.toLocaleString()}
                      </span>
                    </div>
                  ))}
                  <div className="pt-4 border-t border-gray-100">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-gray-700">总成本</span>
                      <span className="text-xl font-bold text-red-600">
                        ¥{stats.totalCost.toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </Card.Content>
          </Card>
        </div>
      </div>

      <Modal
        isOpen={showOperationModal}
        onClose={() => setShowOperationModal(false)}
        title="添加农事操作"
        size="lg"
        footer={
          <ModalFooter
            onConfirm={handleAddOperation}
            onCancel={() => setShowOperationModal(false)}
            confirmText="添加"
            loading={isLoading}
          />
        }
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                操作类型
              </label>
              <select
                value={operationForm.type}
                onChange={(e) => setOperationForm({ ...operationForm, type: e.target.value as OperationType })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-farm-500 focus:border-farm-500"
              >
                <option value="施肥">施肥</option>
                <option value="打药">打药</option>
                <option value="灌溉">灌溉</option>
                <option value="除草">除草</option>
                <option value="追肥">追肥</option>
                <option value="防虫">防虫</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                日期
              </label>
              <input
                type="date"
                value={operationForm.date}
                onChange={(e) => setOperationForm({ ...operationForm, date: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-farm-500 focus:border-farm-500"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              农资名称
            </label>
            <input
              type="text"
              value={operationForm.product}
              onChange={(e) => setOperationForm({ ...operationForm, product: e.target.value })}
              placeholder="如：尿素、杀虫剂等"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-farm-500 focus:border-farm-500"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                用量
              </label>
              <input
                type="number"
                value={operationForm.dosage}
                onChange={(e) => setOperationForm({ ...operationForm, dosage: Number(e.target.value) })}
                placeholder="0"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-farm-500 focus:border-farm-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                单位
              </label>
              <select
                value={operationForm.dosageUnit}
                onChange={(e) => setOperationForm({ ...operationForm, dosageUnit: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-farm-500 focus:border-farm-500"
              >
                <option value="kg">kg</option>
                <option value="g">g</option>
                <option value="L">L</option>
                <option value="mL">mL</option>
                <option value="袋">袋</option>
                <option value="瓶">瓶</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              操作人
            </label>
            <input
              type="text"
              value={operationForm.operator}
              onChange={(e) => setOperationForm({ ...operationForm, operator: e.target.value })}
              placeholder="请输入操作人姓名"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-farm-500 focus:border-farm-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              备注
            </label>
            <textarea
              value={operationForm.remark}
              onChange={(e) => setOperationForm({ ...operationForm, remark: e.target.value })}
              placeholder="请输入备注信息"
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-farm-500 focus:border-farm-500 resize-none"
            />
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={showHarvestModal}
        onClose={() => setShowHarvestModal(false)}
        title="录入收成"
        size="lg"
        footer={
          <ModalFooter
            onConfirm={handleAddHarvest}
            onCancel={() => setShowHarvestModal(false)}
            confirmText="保存"
            loading={isLoading}
          />
        }
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                采收日期
              </label>
              <input
                type="date"
                value={harvestForm.harvestDate}
                onChange={(e) => setHarvestForm({ ...harvestForm, harvestDate: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-farm-500 focus:border-farm-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                质量等级
              </label>
              <select
                value={harvestForm.quality}
                onChange={(e) => setHarvestForm({ ...harvestForm, quality: e.target.value as QualityGrade })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-farm-500 focus:border-farm-500"
              >
                <option value="特级">特级</option>
                <option value="一级">一级</option>
                <option value="二级">二级</option>
                <option value="等外品">等外品</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                实际产量 (kg)
              </label>
              <input
                type="number"
                value={harvestForm.actualYield}
                onChange={(e) => setHarvestForm({ ...harvestForm, actualYield: Number(e.target.value) })}
                placeholder="0"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-farm-500 focus:border-farm-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                单价 (元/kg)
              </label>
              <input
                type="number"
                value={harvestForm.unitPrice}
                onChange={(e) => setHarvestForm({ ...harvestForm, unitPrice: Number(e.target.value) })}
                placeholder="0"
                step="0.01"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-farm-500 focus:border-farm-500"
              />
            </div>
          </div>
          <div className="p-4 bg-farm-50 rounded-lg">
            <p className="text-sm text-gray-600">
              预计收入: <span className="font-bold text-farm-600">
                ¥{(harvestForm.actualYield * harvestForm.unitPrice).toLocaleString()}
              </span>
            </p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              备注
            </label>
            <textarea
              value={harvestForm.remark}
              onChange={(e) => setHarvestForm({ ...harvestForm, remark: e.target.value })}
              placeholder="请输入备注信息"
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-farm-500 focus:border-farm-500 resize-none"
            />
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={showCostModal}
        onClose={() => setShowCostModal(false)}
        title="添加成本"
        size="lg"
        footer={
          <ModalFooter
            onConfirm={handleAddCost}
            onCancel={() => setShowCostModal(false)}
            confirmText="添加"
            loading={isLoading}
          />
        }
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                成本类别
              </label>
              <select
                value={costForm.category}
                onChange={(e) => setCostForm({ ...costForm, category: e.target.value as CostCategory })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-farm-500 focus:border-farm-500"
              >
                <option value="种子">种子</option>
                <option value="农药">农药</option>
                <option value="化肥">化肥</option>
                <option value="人工">人工</option>
                <option value="农机">农机</option>
                <option value="灌溉">灌溉</option>
                <option value="地租">地租</option>
                <option value="其他">其他</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                日期
              </label>
              <input
                type="date"
                value={costForm.date}
                onChange={(e) => setCostForm({ ...costForm, date: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-farm-500 focus:border-farm-500"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              费用名称
            </label>
            <input
              type="text"
              value={costForm.name}
              onChange={(e) => setCostForm({ ...costForm, name: e.target.value })}
              placeholder="如：尿素、人工费用等"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-farm-500 focus:border-farm-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              金额 (元)
            </label>
            <input
              type="number"
              value={costForm.amount}
              onChange={(e) => setCostForm({ ...costForm, amount: Number(e.target.value) })}
              placeholder="0"
              step="0.01"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-farm-500 focus:border-farm-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              备注
            </label>
            <textarea
              value={costForm.remark}
              onChange={(e) => setCostForm({ ...costForm, remark: e.target.value })}
              placeholder="请输入备注信息"
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-farm-500 focus:border-farm-500 resize-none"
            />
          </div>
        </div>
      </Modal>
    </div>
  );
}
