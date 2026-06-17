import { LucideIcon, TrendingUp, TrendingDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import Card from '@/components/Common/Card';

interface MetricCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  trend?: number;
  trendLabel?: string;
  color?: 'farm' | 'soil' | 'wheat' | 'sky' | 'danger' | 'default';
  className?: string;
}

const colorClasses = {
  farm: {
    bg: 'bg-farm-50',
    iconBg: 'bg-farm-500',
    text: 'text-farm-600',
  },
  soil: {
    bg: 'bg-soil-50',
    iconBg: 'bg-soil-500',
    text: 'text-soil-600',
  },
  wheat: {
    bg: 'bg-wheat-50',
    iconBg: 'bg-wheat-500',
    text: 'text-wheat-600',
  },
  sky: {
    bg: 'bg-sky-50',
    iconBg: 'bg-sky-500',
    text: 'text-sky-600',
  },
  danger: {
    bg: 'bg-red-50',
    iconBg: 'bg-red-500',
    text: 'text-red-600',
  },
  default: {
    bg: 'bg-gray-50',
    iconBg: 'bg-gray-500',
    text: 'text-gray-600',
  },
};

export default function MetricCard({
  title,
  value,
  icon: Icon,
  trend,
  trendLabel,
  color = 'default',
  className,
}: MetricCardProps) {
  const colors = colorClasses[color];
  const isPositive = trend !== undefined && trend >= 0;

  return (
    <Card hoverable className={className}>
      <Card.Content className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-500 mb-1">{title}</p>
          <p className="text-3xl font-bold text-gray-900 mb-2">{value}</p>
          {trend !== undefined && (
            <div className="flex items-center gap-1.5">
              {isPositive ? (
                <TrendingUp className="w-4 h-4 text-green-500" />
              ) : (
                <TrendingDown className="w-4 h-4 text-red-500" />
              )}
              <span
                className={cn(
                  'text-sm font-medium',
                  isPositive ? 'text-green-600' : 'text-red-600'
                )}
              >
                {isPositive ? '+' : ''}
                {trend}%
              </span>
              {trendLabel && (
                <span className="text-sm text-gray-500">{trendLabel}</span>
              )}
            </div>
          )}
        </div>
        <div
          className={cn(
            'w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ml-4',
            colors.iconBg
          )}
        >
          <Icon className="w-6 h-6 text-white" />
        </div>
      </Card.Content>
    </Card>
  );
}
