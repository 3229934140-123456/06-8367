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
  Trash2,
  AlertTriangle,
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
import { getCropConfig, getGrowthStage } from '@/data/cropConfigs';
import { formatDateChinese, getDaysSince } from '@/utils/dateUtils';
import {
  validateOperation,
  validateHarvest,
  validateCost,
  hasErrors,
  type ValidationErrors,
} from '@/utils/validationUtils';
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
    deleteSeason,
    isLoading,
  } = useAppStore();

  const [showOperationModal, setShowOperationModal] = useState(false);
  const [showHarvestModal, setShowHarvestModal] = useState(false);
  const [showCostModal, setShowCostModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteError, setDeleteError] = useState('');
  const [operationForm, setOperationForm] = useState({
    type: '施肥' as OperationType,
    date: new Date().toISOString().split('T')[0],
    product: '',
    dosage: 0,
    dosageUnit: 'kg',
    operator: '',
    remark: '',
  });
  const [operationErrors, setOperationErrors] = useState<ValidationErrors>({});
  const [harvestForm, setHarvestForm] = useState({
    harvestDate: new Date().toISOString().split('T')[0],
    actualYield: 0,
    quality: '一级' as QualityGrade,
    unitPrice: 0,
    remark: '',
  });
  const [harvestErrors, setHarvestErrors] = useState<ValidationErrors>({});
  const [costForm, setCostForm] = useState({
    category: '化肥' as CostCategory,
    name: '',
    amount: 0,
    date: new Date().toISOString().split('T')[0],
    remark: '',
  });
  const [costErrors, setCostErrors] = useState<ValidationErrors>({});

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

    const errors = validateOperation(operationForm, data.season.sowDate);
    setOperationErrors(errors);
    if (hasErrors(errors)) return;

    await addOperation({
      ...operationForm,
      seasonId: data.season.id,
    });
    setShowOperationModal(false);
    setOperationErrors({});
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

    const errors = validateHarvest(harvestForm, data.season.sowDate);
    setHarvestErrors(errors);
    if (hasErrors(errors)) return;

    await addHarvest({
      ...harvestForm,
      seasonId: data.season.id,
    });
    setShowHarvestModal(false);
    setHarvestErrors({});
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

    const errors = validateCost(costForm, data.season.sowDate);
    setCostErrors(errors);
    if (hasErrors(errors)) return;

    await addCost({
      ...costForm,
      seasonId: data.season.id,
    });
    setShowCostModal(false);
    setCostErrors({});
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
          <Button
            variant="ghost"
            leftIcon={<Trash2 className="w-4 h-4" />}
            onClick={() => {
              setDeleteError('');
              setShowDeleteConfirm(true);
            }}
            className="text-gray-400 hover:text-red-600 hover:bg-red-50"
          >
            删除
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
        onClose={() => {
          setShowOperationModal(false);
          setOperationErrors({});
        }}
        title="添加农事操作"
        size="lg"
        footer={
          <ModalFooter
            onConfirm={handleAddOperation}
            onCancel={() => {
              setShowOperationModal(false);
              setOperationErrors({});
            }}
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
                日期 <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                value={operationForm.date}
                min={data.season.sowDate}
                max={new Date().toISOString().split('T')[0]}
                onChange={(e) => {
                  setOperationForm({ ...operationForm, date: e.target.value });
                  if (operationErrors.date) {
                    const opDate = new Date(e.target.value);
                    const sowDate = new Date(data.season.sowDate);
                    const today = new Date();
                    today.setHours(0, 0, 0, 0);
                    opDate.setHours(0, 0, 0, 0);
                    sowDate.setHours(0, 0, 0, 0);
                    if (opDate >= sowDate && opDate <= today) {
                      const newErrors = { ...operationErrors };
                      delete newErrors.date;
                      setOperationErrors(newErrors);
                    }
                  }
                }}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-farm-500 focus:border-farm-500 ${
                  operationErrors.date ? 'border-red-500 bg-red-50' : 'border-gray-300'
                }`}
              />
              {operationErrors.date && (
                <p className="mt-1 text-sm text-red-500">{operationErrors.date}</p>
              )}
              {!operationErrors.date && (
                <p className="mt-1 text-xs text-gray-500">
                  播种日期：{data.season.sowDate}，操作日期不能早于此日期
                </p>
              )}
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              农资名称 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={operationForm.product}
              onChange={(e) => {
                setOperationForm({ ...operationForm, product: e.target.value });
                if (operationErrors.product && e.target.value.trim()) {
                  const newErrors = { ...operationErrors };
                  delete newErrors.product;
                  setOperationErrors(newErrors);
                }
              }}
              placeholder="如：尿素、杀虫剂等"
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-farm-500 focus:border-farm-500 ${
                operationErrors.product ? 'border-red-500 bg-red-50' : 'border-gray-300'
              }`}
            />
            {operationErrors.product && (
              <p className="mt-1 text-sm text-red-500">{operationErrors.product}</p>
            )}
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                用量 <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                value={operationForm.dosage || ''}
                min="0"
                step="0.01"
                onChange={(e) => {
                  const val = Number(e.target.value);
                  setOperationForm({ ...operationForm, dosage: val });
                  if (operationErrors.dosage && val > 0) {
                    const newErrors = { ...operationErrors };
                    delete newErrors.dosage;
                    setOperationErrors(newErrors);
                  }
                }}
                placeholder="请输入用量"
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-farm-500 focus:border-farm-500 ${
                  operationErrors.dosage ? 'border-red-500 bg-red-50' : 'border-gray-300'
                }`}
              />
              {operationErrors.dosage && (
                <p className="mt-1 text-sm text-red-500">{operationErrors.dosage}</p>
              )}
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
              操作人 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={operationForm.operator}
              onChange={(e) => {
                setOperationForm({ ...operationForm, operator: e.target.value });
                if (operationErrors.operator && e.target.value.trim()) {
                  const newErrors = { ...operationErrors };
                  delete newErrors.operator;
                  setOperationErrors(newErrors);
                }
              }}
              placeholder="请输入操作人姓名"
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-farm-500 focus:border-farm-500 ${
                operationErrors.operator ? 'border-red-500 bg-red-50' : 'border-gray-300'
              }`}
            />
            {operationErrors.operator && (
              <p className="mt-1 text-sm text-red-500">{operationErrors.operator}</p>
            )}
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
        onClose={() => {
          setShowHarvestModal(false);
          setHarvestErrors({});
        }}
        title="录入收成"
        size="lg"
        footer={
          <ModalFooter
            onConfirm={handleAddHarvest}
            onCancel={() => {
              setShowHarvestModal(false);
              setHarvestErrors({});
            }}
            confirmText="保存"
            loading={isLoading}
          />
        }
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                采收日期 <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                value={harvestForm.harvestDate}
                min={data.season.sowDate}
                max={new Date().toISOString().split('T')[0]}
                onChange={(e) => {
                  setHarvestForm({ ...harvestForm, harvestDate: e.target.value });
                  if (harvestErrors.harvestDate) {
                    const hDate = new Date(e.target.value);
                    const sDate = new Date(data.season.sowDate);
                    const today = new Date();
                    today.setHours(0, 0, 0, 0);
                    hDate.setHours(0, 0, 0, 0);
                    sDate.setHours(0, 0, 0, 0);
                    if (hDate >= sDate && hDate <= today) {
                      const newErrors = { ...harvestErrors };
                      delete newErrors.harvestDate;
                      setHarvestErrors(newErrors);
                    }
                  }
                }}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-farm-500 focus:border-farm-500 ${
                  harvestErrors.harvestDate ? 'border-red-500 bg-red-50' : 'border-gray-300'
                }`}
              />
              {harvestErrors.harvestDate && (
                <p className="mt-1 text-sm text-red-500">{harvestErrors.harvestDate}</p>
              )}
              {!harvestErrors.harvestDate && (
                <p className="mt-1 text-xs text-gray-500">
                  播种日期：{data.season.sowDate}，采收日期不能早于此日期
                </p>
              )}
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
                实际产量 (kg) <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                value={harvestForm.actualYield || ''}
                min="0"
                step="0.01"
                onChange={(e) => {
                  const val = Number(e.target.value);
                  setHarvestForm({ ...harvestForm, actualYield: val });
                  if (harvestErrors.actualYield && val > 0) {
                    const newErrors = { ...harvestErrors };
                    delete newErrors.actualYield;
                    setHarvestErrors(newErrors);
                  }
                }}
                placeholder="请输入产量"
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-farm-500 focus:border-farm-500 ${
                  harvestErrors.actualYield ? 'border-red-500 bg-red-50' : 'border-gray-300'
                }`}
              />
              {harvestErrors.actualYield && (
                <p className="mt-1 text-sm text-red-500">{harvestErrors.actualYield}</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                单价 (元/kg) <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                value={harvestForm.unitPrice || ''}
                min="0"
                step="0.01"
                onChange={(e) => {
                  const val = Number(e.target.value);
                  setHarvestForm({ ...harvestForm, unitPrice: val });
                  if (harvestErrors.unitPrice && val >= 0) {
                    const newErrors = { ...harvestErrors };
                    delete newErrors.unitPrice;
                    setHarvestErrors(newErrors);
                  }
                }}
                placeholder="请输入单价"
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-farm-500 focus:border-farm-500 ${
                  harvestErrors.unitPrice ? 'border-red-500 bg-red-50' : 'border-gray-300'
                }`}
              />
              {harvestErrors.unitPrice && (
                <p className="mt-1 text-sm text-red-500">{harvestErrors.unitPrice}</p>
              )}
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
        onClose={() => {
          setShowCostModal(false);
          setCostErrors({});
        }}
        title="添加成本"
        size="lg"
        footer={
          <ModalFooter
            onConfirm={handleAddCost}
            onCancel={() => {
              setShowCostModal(false);
              setCostErrors({});
            }}
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
                日期 <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                value={costForm.date}
                min={data.season.sowDate}
                max={new Date().toISOString().split('T')[0]}
                onChange={(e) => {
                  setCostForm({ ...costForm, date: e.target.value });
                  if (costErrors.date) {
                    const cDate = new Date(e.target.value);
                    const sDate = new Date(data.season.sowDate);
                    const today = new Date();
                    today.setHours(0, 0, 0, 0);
                    cDate.setHours(0, 0, 0, 0);
                    sDate.setHours(0, 0, 0, 0);
                    if (cDate >= sDate && cDate <= today) {
                      const newErrors = { ...costErrors };
                      delete newErrors.date;
                      setCostErrors(newErrors);
                    }
                  }
                }}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-farm-500 focus:border-farm-500 ${
                  costErrors.date ? 'border-red-500 bg-red-50' : 'border-gray-300'
                }`}
              />
              {costErrors.date && (
                <p className="mt-1 text-sm text-red-500">{costErrors.date}</p>
              )}
              {!costErrors.date && (
                <p className="mt-1 text-xs text-gray-500">
                  播种日期：{data.season.sowDate}，日期不能早于此日期
                </p>
              )}
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              费用名称 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={costForm.name}
              onChange={(e) => {
                setCostForm({ ...costForm, name: e.target.value });
                if (costErrors.name && e.target.value.trim()) {
                  const newErrors = { ...costErrors };
                  delete newErrors.name;
                  setCostErrors(newErrors);
                }
              }}
              placeholder="如：尿素、人工费用等"
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-farm-500 focus:border-farm-500 ${
                costErrors.name ? 'border-red-500 bg-red-50' : 'border-gray-300'
              }`}
            />
            {costErrors.name && (
              <p className="mt-1 text-sm text-red-500">{costErrors.name}</p>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              金额 (元) <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              value={costForm.amount || ''}
              min="0"
              step="0.01"
              onChange={(e) => {
                const val = Number(e.target.value);
                setCostForm({ ...costForm, amount: val });
                if (costErrors.amount && val > 0) {
                  const newErrors = { ...costErrors };
                  delete newErrors.amount;
                  setCostErrors(newErrors);
                }
              }}
              placeholder="请输入金额"
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-farm-500 focus:border-farm-500 ${
                costErrors.amount ? 'border-red-500 bg-red-50' : 'border-gray-300'
              }`}
            />
            {costErrors.amount && (
              <p className="mt-1 text-sm text-red-500">{costErrors.amount}</p>
            )}
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

      <Modal
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        title="确认删除种植季"
        size="md"
      >
        <div className="space-y-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0">
              <AlertTriangle className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <p className="text-base font-medium text-gray-900">
                确定要删除「{data?.season.cropName} - {data?.field?.name}」吗？
              </p>
              <p className="text-sm text-gray-500 mt-1">
                播种日期：{data?.season && formatDateChinese(data.season.sowDate)}
              </p>
            </div>
          </div>

          <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
            <p className="text-sm text-amber-800">
              <span className="font-medium">注意：</span>删除后该种植季的所有提醒也将被清除。如果存在操作记录、收成记录或成本记录，则无法删除。
            </p>
          </div>

          {deleteError && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-600">{deleteError}</p>
            </div>
          )}
        </div>
        <ModalFooter
          onConfirm={async () => {
            try {
              await deleteSeason(seasonId);
              setShowDeleteConfirm(false);
              navigate('/seasons');
            } catch (error) {
              setDeleteError(error instanceof Error ? error.message : '删除失败');
            }
          }}
          onCancel={() => setShowDeleteConfirm(false)}
          confirmText="确认删除"
          confirmVariant="danger"
          loading={isLoading}
        />
      </Modal>
    </div>
  );
}
