import { Sprout, Leaf, Flower2, Sun, Carrot, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import Card from '@/components/Common/Card';

type GrowthStage = 'seedling' | 'vegetative' | 'flowering' | 'fruiting' | 'mature' | 'harvested';

interface GrowthStageItem {
  stage: GrowthStage;
  name: string;
  description: string;
  startDate?: string;
  endDate?: string;
  duration?: string;
}

interface GrowthTimelineProps {
  title?: string;
  stages: GrowthStageItem[];
  currentStage: GrowthStage;
  className?: string;
}

const stageConfig: Record<GrowthStage, { icon: typeof Sprout; color: string; bgColor: string }> = {
  seedling: { icon: Sprout, color: 'text-farm-500', bgColor: 'bg-farm-500' },
  vegetative: { icon: Leaf, color: 'text-farm-600', bgColor: 'bg-farm-600' },
  flowering: { icon: Flower2, color: 'text-pink-500', bgColor: 'bg-pink-500' },
  fruiting: { icon: Sun, color: 'text-wheat-500', bgColor: 'bg-wheat-500' },
  mature: { icon: Carrot, color: 'text-orange-500', bgColor: 'bg-orange-500' },
  harvested: { icon: CheckCircle2, color: 'text-green-500', bgColor: 'bg-green-500' },
};

const stageOrder: GrowthStage[] = ['seedling', 'vegetative', 'flowering', 'fruiting', 'mature', 'harvested'];

export default function GrowthTimeline({
  title = '生长周期',
  stages,
  currentStage,
  className,
}: GrowthTimelineProps) {
  const currentIndex = stageOrder.indexOf(currentStage);

  return (
    <Card className={className}>
      <Card.Header>
        <Card.Title>{title}</Card.Title>
      </Card.Header>
      <Card.Content>
        <div className="relative">
          <div className="absolute top-6 left-0 right-0 h-1 bg-gray-200" />
          <div
            className="absolute top-6 left-0 h-1 bg-farm-500 transition-all duration-500"
            style={{
              width: `${stages.length > 1 ? (currentIndex / (stages.length - 1)) * 100 : 0}%`,
            }}
          />
          <div className="relative flex justify-between">
            {stages.map((stage, index) => {
              const config = stageConfig[stage.stage];
              const Icon = config.icon;
              const isCompleted = index < currentIndex;
              const isCurrent = index === currentIndex;

              return (
                <div key={stage.stage} className="flex flex-col items-center">
                  <div
                    className={cn(
                      'relative z-10 w-12 h-12 rounded-full flex items-center justify-center border-4 transition-all duration-300',
                      isCompleted || isCurrent
                        ? `${config.bgColor} border-white shadow-lg`
                        : 'bg-white border-gray-200'
                    )}
                  >
                    <Icon
                      className={cn(
                        'w-5 h-5',
                        isCompleted || isCurrent ? 'text-white' : 'text-gray-400'
                      )}
                    />
                    {isCompleted && (
                      <div className="absolute -right-1 -bottom-1 w-5 h-5 bg-green-500 rounded-full flex items-center justify-center border-2 border-white">
                        <CheckCircle2 className="w-3 h-3 text-white" />
                      </div>
                    )}
                  </div>
                  <div className="mt-3 text-center max-w-24">
                    <p
                      className={cn(
                        'text-sm font-medium',
                        isCurrent ? config.color : isCompleted ? 'text-gray-900' : 'text-gray-400'
                      )}
                    >
                      {stage.name}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">{stage.description}</p>
                    {stage.duration && (
                      <p className="text-xs text-gray-400 mt-1">{stage.duration}</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </Card.Content>
    </Card>
  );
}
