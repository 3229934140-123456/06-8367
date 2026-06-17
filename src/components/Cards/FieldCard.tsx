import { MapPin, Droplets, Thermometer, Leaf, MoreHorizontal } from 'lucide-react';
import { cn } from '@/lib/utils';
import Card from '@/components/Common/Card';
import Tag from '@/components/Common/Tag';
import StatusBadge from '@/components/Common/StatusBadge';

interface FieldCardProps {
  name: string;
  area: number;
  crop: string;
  growthStage: string;
  health: 'good' | 'normal' | 'poor';
  temperature: number;
  humidity: number;
  lastOperation?: string;
  onClick?: () => void;
  className?: string;
}

const healthConfig = {
  good: { label: '良好', variant: 'success' as const },
  normal: { label: '一般', variant: 'warning' as const },
  poor: { label: '较差', variant: 'danger' as const },
};

export default function FieldCard({
  name,
  area,
  crop,
  growthStage,
  health,
  temperature,
  humidity,
  lastOperation,
  onClick,
  className,
}: FieldCardProps) {
  const healthInfo = healthConfig[health];

  return (
    <Card hoverable className={className} onClick={onClick}>
      <Card.Content>
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-farm-100 rounded-lg flex items-center justify-center">
              <MapPin className="w-5 h-5 text-farm-600" />
            </div>
            <div>
              <h4 className="font-semibold text-gray-900">{name}</h4>
              <p className="text-sm text-gray-500">{area} 亩</p>
            </div>
          </div>
          <button className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors">
            <MoreHorizontal className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-500">种植作物</span>
            <Tag variant="farm">{crop}</Tag>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-500">生长阶段</span>
            <Tag variant="wheat">{growthStage}</Tag>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-500">健康状态</span>
            <StatusBadge status={healthInfo.variant} text={healthInfo.label} showIcon={false} />
          </div>

          <div className="pt-3 border-t border-gray-100">
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2">
                <Thermometer className="w-4 h-4 text-orange-500" />
                <span className="text-sm text-gray-700">{temperature}°C</span>
              </div>
              <div className="flex items-center gap-2">
                <Droplets className="w-4 h-4 text-blue-500" />
                <span className="text-sm text-gray-700">{humidity}%</span>
              </div>
            </div>
          </div>

          {lastOperation && (
            <div className="pt-3 border-t border-gray-100">
              <div className="flex items-center gap-2">
                <Leaf className="w-4 h-4 text-farm-500" />
                <span className="text-xs text-gray-500">
                  上次操作: {lastOperation}
                </span>
              </div>
            </div>
          )}
        </div>
      </Card.Content>
    </Card>
  );
}
