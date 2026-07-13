import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';
import { lawnCareApi } from '@devbot/plugin-lawn-care/frontend/api';
import { babyLogsApi } from '@devbot/plugin-baby-logs/frontend/api';
import { ChatsWidget } from '../components/ChatsWidget';
import { SchedulerWidget } from '../components/SchedulerWidget';
import { BabyWidget } from '../components/BabyWidget';
import { LawnWidget } from '../components/LawnWidget';
import { HealthWidget } from '../components/HealthWidget';
import { DashboardQuickActions } from '../components/DashboardQuickActions';
import { DashboardRecentChats } from '../components/DashboardRecentChats';
import { DashboardActiveSchedulers } from '../components/DashboardActiveSchedulers';

export function Dashboard() {
  const { data: chats = [] } = useQuery({
    queryKey: ['interactive-chats'],
    queryFn: () => api.listInteractiveChats(),
  });

  const { data: tasks = [] } = useQuery({
    queryKey: ['scheduled-tasks'],
    queryFn: () => api.listScheduledTasks(),
    refetchInterval: 10000,
  });

  const { data: babyLogs = [] } = useQuery({
    queryKey: ['baby-logs-dashboard'],
    queryFn: () => babyLogsApi.listBabyLogs(undefined, 50, 0),
  });

  const { data: lawnProfiles = [] } = useQuery({
    queryKey: ['lawn-profiles'],
    queryFn: () => lawnCareApi.listLawnProfiles(),
  });

  const { data: lawnPlans = [] } = useQuery({
    queryKey: ['lawn-plans'],
    queryFn: () => lawnCareApi.listLawnPlans(),
    enabled: lawnProfiles.length > 0,
  });

  const { data: health } = useQuery({
    queryKey: ['health'],
    queryFn: () => api.health(),
    refetchInterval: 30000,
  });

  return (
    <div className="flex h-full flex-col">
      {/* Widget Grid */}
      <div className="flex-1 overflow-y-auto p-4">
        <div className="mx-auto w-full max-w-6xl space-y-4">
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
            <ChatsWidget chats={chats} />
            <SchedulerWidget tasks={tasks} />
            <BabyWidget logs={babyLogs} />
            <LawnWidget profiles={lawnProfiles} plans={lawnPlans} />
            <DashboardQuickActions />
            <HealthWidget health={health} />
          </div>
          <DashboardRecentChats chats={chats} />
          <DashboardActiveSchedulers tasks={tasks} />
        </div>
      </div>
    </div>
  );
}
