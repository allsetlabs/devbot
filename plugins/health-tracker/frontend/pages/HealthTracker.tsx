import { useState, useEffect, useCallback } from 'react';
import type { MemberRecord, MedicationRecord, AppointmentRecord, DashboardData } from '../types';
import { healthTrackerApi } from '../api';
import { MembersList } from '../components/MembersList';
import { MedicationsList } from '../components/MedicationsList';
import { AppointmentsList } from '../components/AppointmentsList';
import { HeaderSlot } from '@devbot/app/components/HeaderSlot';
import { Card, CardContent } from '@allsetlabs/forge/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@allsetlabs/forge/components/ui/tabs';
import { Button } from '@allsetlabs/forge/components/ui/button';
import {
  Users, Pill, CalendarDays, RefreshCw,
  AlertCircle, Loader2,
  type LucideIcon,
} from 'lucide-react';
import { toast } from 'sonner';

function StatCard({
  label,
  icon: Icon,
  value,
  valueClassName,
  subtitle,
}: {
  label: string;
  icon: LucideIcon;
  value: React.ReactNode;
  valueClassName?: string;
  subtitle: React.ReactNode;
}) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">{label}</p>
          <Icon className="h-4 w-4 text-muted-foreground" />
        </div>
        <p className={`mt-1 text-2xl font-bold tabular-nums ${valueClassName ?? ''}`}>
          {value}
        </p>
        {subtitle}
      </CardContent>
    </Card>
  );
}

export function HealthTracker() {
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [members, setMembers] = useState<MemberRecord[]>([]);
  const [medications, setMedications] = useState<MedicationRecord[]>([]);
  const [appointments, setAppointments] = useState<AppointmentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<string>('members');

  const loadDashboard = useCallback(async () => {
    try {
      const data = await healthTrackerApi.dashboard();
      setDashboard(data);
    } catch {
      toast.error('Failed to load dashboard');
    }
  }, []);

  const loadMembers = useCallback(async () => {
    try {
      const data = await healthTrackerApi.listMembers();
      setMembers(data);
    } catch {
      toast.error('Failed to load members');
    }
  }, []);

  const loadMedications = useCallback(async () => {
    try {
      const data = await healthTrackerApi.listMedications();
      setMedications(data);
    } catch {
      toast.error('Failed to load medications');
    }
  }, []);

  const loadAppointments = useCallback(async () => {
    try {
      const data = await healthTrackerApi.listAppointments();
      setAppointments(data);
    } catch {
      toast.error('Failed to load appointments');
    }
  }, []);

  const loadAll = useCallback(async () => {
    setLoading(true);
    await Promise.all([loadDashboard(), loadMembers(), loadMedications(), loadAppointments()]);
    setLoading(false);
  }, [loadDashboard, loadMembers, loadMedications, loadAppointments]);

  useEffect(() => {
    void loadAll();
  }, [loadAll]);

  const handleTabRefresh = useCallback(
    async (tab: string) => {
      const loaders: Record<string, () => Promise<void>> = {
        members: loadMembers,
        medications: loadMedications,
        appointments: loadAppointments,
      };
      await Promise.all([loaders[tab]?.(), loadDashboard()]);
    },
    [loadMembers, loadMedications, loadAppointments, loadDashboard],
  );

  return (
    <div className="flex h-full flex-col">
      <HeaderSlot>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={() => {
            setLoading(true);
            void loadAll();
          }}
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
        </Button>
      </HeaderSlot>

      <div className="flex-1 overflow-auto">
        <div className="mx-auto w-full max-w-2xl p-4">
          {loading && !dashboard ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <>
              {/* Dashboard stats */}
              {dashboard && (
                <div className="mb-4 grid grid-cols-2 gap-2 md:grid-cols-4">
                  <StatCard
                    label="Members"
                    icon={Users}
                    value={dashboard.totalMembers}
                    subtitle={
                      <p className="text-xs text-muted-foreground">Family profiles</p>
                    }
                  />
                  <StatCard
                    label="Medications"
                    icon={Pill}
                    value={dashboard.totalActiveMedications}
                    subtitle={
                      <p className="text-xs text-muted-foreground">Active prescriptions</p>
                    }
                  />
                  <StatCard
                    label="Appointments"
                    icon={CalendarDays}
                    value={dashboard.totalUpcomingAppointments}
                    subtitle={
                      <p className="text-xs text-muted-foreground">Upcoming scheduled</p>
                    }
                  />
                  <StatCard
                    label="Refills Due"
                    icon={AlertCircle}
                    value={dashboard.refillsDueCount}
                    valueClassName={dashboard.refillsDueCount > 0 ? 'text-amber-500' : ''}
                    subtitle={
                      <p className="text-xs text-muted-foreground">Within 7 days</p>
                    }
                  />
                </div>
              )}

              {/* Tabbed content */}
              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="mb-3 w-full">
                  <TabsTrigger value="members" className="flex-1">
                    Members
                  </TabsTrigger>
                  <TabsTrigger value="medications" className="flex-1">
                    Medications
                  </TabsTrigger>
                  <TabsTrigger value="appointments" className="flex-1">
                    Appointments
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="members">
                  <MembersList
                    members={members}
                    onRefresh={() => handleTabRefresh('members')}
                  />
                </TabsContent>

                <TabsContent value="medications">
                  <MedicationsList
                    medications={medications}
                    members={members}
                    onRefresh={() => handleTabRefresh('medications')}
                  />
                </TabsContent>

                <TabsContent value="appointments">
                  <AppointmentsList
                    appointments={appointments}
                    members={members}
                    onRefresh={() => handleTabRefresh('appointments')}
                  />
                </TabsContent>
              </Tabs>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
