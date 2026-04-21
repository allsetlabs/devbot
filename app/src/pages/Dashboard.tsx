import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@allsetlabs/reusable/components/ui/button';
import { Menu } from 'lucide-react';
import { api } from '../lib/api';
import { lawnCareApi } from '@devbot/plugin-lawn-care/frontend/api';
import { SlideNav } from '../components/SlideNav';
import { babyLogsApi } from '@devbot/plugin-baby-logs/frontend/api';
import { ChatsWidget } from '../components/ChatsWidget';
import { SchedulerWidget } from '../components/SchedulerWidget';
import { BabyWidget } from '../components/BabyWidget';
import { LawnWidget } from '../components/LawnWidget';
import { HealthWidget } from '../components/HealthWidget';
import { DashboardQuickActions } from '../components/DashboardQuickActions';

export function Dashboard() {
  const [navOpen, setNavOpen] = useState(false);

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
      <SlideNav isOpen={navOpen} onClose={() => setNavOpen(false)} />

      {/* Header */}
      <header className="safe-area-top flex items-center justify-between border-b border-border px-4 py-3">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => setNavOpen(true)}>
            <Menu className="h-5 w-5" />
          </Button>
          <h1 className="text-lg font-semibold text-foreground">Dashboard</h1>
        </div>
      </header>

      {/* Widget Grid */}
      <div className="flex-1 overflow-y-auto p-4">
        <div className="mx-auto grid w-full max-w-6xl grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
          <ChatsWidget chats={chats} />
          <SchedulerWidget tasks={tasks} />
          <BabyWidget logs={babyLogs} />
          <LawnWidget profiles={lawnProfiles} plans={lawnPlans} />
          <DashboardQuickActions />
          <HealthWidget health={health} />
        </div>
      </div>
    </div>
  );
}
