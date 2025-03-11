
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Receipt } from "lucide-react";
import { Calendar, CheckCircle, Clock, AlertTriangle } from "lucide-react"; // Added import for Calendar icon

function MetricCard({ title, value, description, icon, loading }) {
  if (loading) return <Skeleton className="h-32 w-full" />;
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        {icon}
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        <p className="text-xs text-muted-foreground">{description}</p>
      </CardContent>
    </Card>
  );
}

// Extract UpcomingJobs component to avoid hooks in conditional rendering
function UpcomingJobs({ user }) {
  const { data: upcomingJobs, isLoading } = useQuery({
    queryKey: ["upcoming-jobs"],
    queryFn: async () => {
      if (!user) return [];

      const startOfToday = new Date();
      startOfToday.setHours(0, 0, 0, 0);
      const todayISOString = startOfToday.toISOString();

      const { data, error } = await supabase
        .from("photo_jobs")
        .select(
          `
          id, 
          title, 
          job_date,
          status,
          clients (
            id,
            name
          )
        `,
        )
        .eq("user_id", user.id)
        .gte("job_date", todayISOString)
        .order("job_date", { ascending: true })
        .limit(5);

      if (error) throw error;
      return data || [];
    },
    enabled: !!user,
  });

  if (isLoading) return <Skeleton className="h-24" />;

  return upcomingJobs && upcomingJobs.length > 0 ? (
    <div className="space-y-4">
      {upcomingJobs.map((job: any) => (
        <div
          key={job.id}
          className="flex items-center justify-between border-b pb-2"
        >
          <div>
            <div className="font-medium flex items-center gap-2">
              {job.status === "CONFIRMED" && (
                <CheckCircle className="h-4 w-4 text-green-500" />
              )}
              {job.status === "IN_PROGRESS" && (
                <Clock className="h-4 w-4 text-blue-500" />
              )}
              {job.status === "PENDING_PAYMENT" && (
                <AlertTriangle className="h-4 w-4 text-amber-500" />
              )}
              {job.title}
            </div>
            <p className="text-sm text-muted-foreground">
              Cliente: {job.clients?.name || "Nessun cliente"}
            </p>
          </div>
          <div className="text-sm">
            {new Date(job.job_date).toLocaleDateString("it-IT", {
              year: "numeric",
              month: "short",
              day: "numeric",
            })}
          </div>
        </div>
      ))}
    </div>
  ) : (
    <p className="text-center py-6 text-muted-foreground">
      Nessun lavoro programmato.
    </p>
  );
}

export default function Dashboard() {
  const { user } = useAuth();
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const years = Array.from(
    { length: 5 },
    (_, i) => new Date().getFullYear() - i,
  );

  const { data: clientsCount, isLoading: isLoadingClients } = useQuery({
    queryKey: ["clients-count"],
    queryFn: async () => {
      if (!user) return 0;
      const { count, error } = await supabase
        .from("clients")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id);

      if (error) throw error;
      return count || 0;
    },
    enabled: !!user,
  });

  const { data: equipmentCount, isLoading: isLoadingEquipment } = useQuery({
    queryKey: ["equipment-count"],
    queryFn: async () => {
      if (!user) return 0;
      const { count, error } = await supabase
        .from("equipment")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id);

      if (error) throw error;
      return count || 0;
    },
    enabled: !!user,
  });

  const { data: photoJobs, isLoading: isLoadingPhotoJobs } = useQuery({
    queryKey: ["photo-jobs", selectedYear],
    queryFn: async () => {
      if (!user) return 0;

      const startOfYear = new Date(selectedYear, 0, 1);
      const endOfYear = new Date(selectedYear, 11, 31, 23, 59, 59, 999);

      const { count, error } = await supabase
        .from("photo_jobs")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id)
        .gte("job_date", startOfYear.toISOString())
        .lte("job_date", endOfYear.toISOString());

      if (error) throw error;
      return count || 0;
    },
    enabled: !!user,
  });

  // Always declare all hooks at the top level, regardless of conditions
  const { data: upcomingEvents = [], isLoading: isLoadingUpcoming } = useQuery({
    queryKey: ["upcoming-events"],
    queryFn: async () => {
      if (!user) return [];

      const startOfToday = new Date();
      startOfToday.setHours(0, 0, 0, 0);
      const todayISOString = startOfToday.toISOString();

      const { data, error } = await supabase
        .from("events")
        .select(
          `
          id, 
          title, 
          date, 
          clients (
            id,
            name
          )
        `,
        )
        .eq("user_id", user.id)
        .gte("date", todayISOString)
        .order("date", { ascending: true })
        .limit(5);

      if (error) throw error;
      return data || [];
    },
    enabled: !!user,
  });

  const isLoading =
    isLoadingClients ||
    isLoadingEquipment ||
    isLoadingPhotoJobs ||
    isLoadingUpcoming;

  if (isLoading) {
    return <DashboardSkeleton />;
  }

  return (
    <div className="space-y-6 animate-fadeIn">
      <div className="flex flex-col md:flex-row md:justify-between md:items-center space-y-2 md:space-y-0">
        <div>
          <h1 className="text-3xl font-medium text-foreground tracking-tight">
            Ciao, {user?.username}!
          </h1>
          <p className="text-muted-foreground">
            Ecco un riepilogo delle tue attività
          </p>
        </div>
        
        <div className="flex items-center space-x-2">
          <p className="text-sm font-medium">Anno: </p>
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(Number(e.target.value))}
            className="h-8 w-24 rounded-md border border-input bg-background text-sm"
          >
            {years.map((year) => (
              <option key={year} value={year}>
                {year}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <MetricCard title="Clienti" value={clientsCount} description="Clienti registrati" icon={<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" className="h-4 w-4 text-muted-foreground"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" /></svg>} loading={isLoadingClients} />
        <MetricCard title="Magazzino" value={equipmentCount} description="Attrezzature registrate" icon={<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" className="h-4 w-4 text-muted-foreground"><path d="M3 6h18" /><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" /><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" /></svg>} loading={isLoadingEquipment} />
        <MetricCard title="Lavori" value={photoJobs} description={`Lavori dell'anno ${selectedYear}`} icon={<Calendar className="h-4 w-4 text-muted-foreground" />} loading={isLoadingPhotoJobs} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Prossimi lavori</CardTitle>
        </CardHeader>
        <CardContent>
          {/* Use the extracted component */}
          <UpcomingJobs user={user} />
        </CardContent>
      </Card>
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-8 w-48" />

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>

      <Skeleton className="h-64 w-full" />
    </div>
  );
}
