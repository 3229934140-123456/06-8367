import { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { Leaf } from 'lucide-react';

interface EmptyProps {
  title?: string;
  description?: string;
  icon?: ReactNode;
  action?: ReactNode;
  className?: string;
}

export default function Empty({
  title = '暂无数据',
  description = '添加第一条记录开始使用吧',
  icon,
  action,
  className,
}: EmptyProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center py-16 px-4 text-center',
        className
      )}
    >
      <div className="w-20 h-20 bg-farm-50 rounded-full flex items-center justify-center mb-6">
        {icon || <Leaf className="w-10 h-10 text-farm-400" />}
      </div>
      <h3 className="text-lg font-medium text-gray-900 mb-2">{title}</h3>
      <p className="text-sm text-gray-500 max-w-sm mb-6">{description}</p>
      {action && <div>{action}</div>}
    </div>
  );
}
