import { cn } from '@/lib/utils';
import { CheckCircle, Clock, AlertTriangle, XCircle, Pause, Play } from 'lucide-react';

type StatusType = 'success' | 'warning' | 'danger' | 'info' | 'pending' | 'in-progress' | 'completed' | 'cancelled';
type StatusSize = 'sm' | 'md';

interface StatusBadgeProps {
  status: StatusType;
  text?: string;
  showIcon?: boolean;
  size?: StatusSize;
  className?: string;
}

const sizeClasses: Record<StatusSize, string> = {
  sm: 'px-2 py-0.5 text-xs gap-1',
  md: 'px-2.5 py-1 text-sm gap-1.5',
};

const statusConfig: Record<StatusType, { bg: string; text: string; dot: string; icon: typeof CheckCircle }> = {
  success: {
    bg: 'bg-green-100',
    text: 'text-green-700',
    dot: 'bg-green-500',
    icon: CheckCircle,
  },
  warning: {
    bg: 'bg-yellow-100',
    text: 'text-yellow-700',
    dot: 'bg-yellow-500',
    icon: AlertTriangle,
  },
  danger: {
    bg: 'bg-red-100',
    text: 'text-red-700',
    dot: 'bg-red-500',
    icon: XCircle,
  },
  info: {
    bg: 'bg-blue-100',
    text: 'text-blue-700',
    dot: 'bg-blue-500',
    icon: CheckCircle,
  },
  pending: {
    bg: 'bg-gray-100',
    text: 'text-gray-700',
    dot: 'bg-gray-400',
    icon: Clock,
  },
  'in-progress': {
    bg: 'bg-farm-100',
    text: 'text-farm-700',
    dot: 'bg-farm-500',
    icon: Play,
  },
  completed: {
    bg: 'bg-green-100',
    text: 'text-green-700',
    dot: 'bg-green-500',
    icon: CheckCircle,
  },
  cancelled: {
    bg: 'bg-red-100',
    text: 'text-red-700',
    dot: 'bg-red-500',
    icon: Pause,
  },
};

const statusTextMap: Record<StatusType, string> = {
  success: '成功',
  warning: '警告',
  danger: '危险',
  info: '信息',
  pending: '待处理',
  'in-progress': '进行中',
  completed: '已完成',
  cancelled: '已取消',
};

export default function StatusBadge({
  status,
  text,
  showIcon = true,
  size = 'md',
  className,
}: StatusBadgeProps) {
  const config = statusConfig[status];
  const Icon = config.icon;
  const displayText = text || statusTextMap[status];
  const iconSize = size === 'sm' ? 'w-3 h-3' : 'w-3.5 h-3.5';

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full font-medium',
        sizeClasses[size],
        config.bg,
        config.text,
        className
      )}
    >
      {showIcon ? (
        <Icon className={iconSize} />
      ) : (
        <span className={cn('w-2 h-2 rounded-full', config.dot)} />
      )}
      {displayText}
    </span>
  );
}
