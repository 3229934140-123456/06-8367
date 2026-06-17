import { Sprout, Droplets, Scissors, Leaf, Bug, Truck } from 'lucide-react';
import { format } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import Card from '@/components/Common/Card';
import StatusBadge from '@/components/Common/StatusBadge';

type OperationType = 'planting' | 'irrigation' | 'fertilization' | 'pruning' | 'pest_control' | 'harvest';

interface OperationItem {
  id: string;
  type: OperationType;
  title: string;
  description?: string;
  date: Date;
  operator: string;
  status: 'completed' | 'in-progress' | 'pending';
  fieldName?: string;
}

interface OperationTimelineProps {
  title?: string;
  operations: OperationItem[];
  className?: string;
}

const operationConfig: Record<OperationType, { icon: typeof Sprout; color: string; label: string }> = {
  planting: { icon: Sprout, color: 'bg-farm-500', label: '播种' },
  irrigation: { icon: Droplets, color: 'bg-sky-500', label: '灌溉' },
  fertilization: { icon: Leaf, color: 'bg-wheat-500', label: '施肥' },
  pruning: { icon: Scissors, color: 'bg-soil-500', label: '修剪' },
  pest_control: { icon: Bug, color: 'bg-red-500', label: '防虫' },
  harvest: { icon: Truck, color: 'bg-green-500', label: '采收' },
};

export default function OperationTimeline({
  title = '农事操作记录',
  operations,
  className,
}: OperationTimelineProps) {
  return (
    <Card className={className}>
      <Card.Header>
        <Card.Title>{title}</Card.Title>
      </Card.Header>
      <Card.Content>
        <div className="relative">
          {operations.map((operation, index) => {
            const config = operationConfig[operation.type];
            const Icon = config.icon;
            const isLast = index === operations.length - 1;

            return (
              <div key={operation.id} className="relative flex gap-4">
                {!isLast && (
                  <div className="absolute left-5 top-12 w-0.5 h-full bg-gray-200" />
                )}
                <div
                  className={cn(
                    'relative z-10 w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0',
                    config.color
                  )}
                >
                  <Icon className="w-5 h-5 text-white" />
                </div>
                <div className="flex-1 pb-8">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-medium text-gray-900">{operation.title}</h4>
                        <StatusBadge status={operation.status} size="sm" showIcon={false} />
                      </div>
                      {operation.description && (
                        <p className="text-sm text-gray-500 mb-2">{operation.description}</p>
                      )}
                      <div className="flex items-center gap-4 text-xs text-gray-400">
                        <span>{format(operation.date, 'MM月dd日 HH:mm', { locale: zhCN })}</span>
                        <span>操作人: {operation.operator}</span>
                        {operation.fieldName && <span>地块: {operation.fieldName}</span>}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </Card.Content>
    </Card>
  );
}
