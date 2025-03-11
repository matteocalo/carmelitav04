import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format, addDays, startOfWeek, isSameDay, parseISO } from "date-fns";
import { it } from "date-fns/locale";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/use-auth";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ChevronLeft,
  ChevronRight,
  Pencil,
  Users2,
  Box,
  CalendarIcon,
  List,
  CheckCircle,
  Download,
  FileDown,
  Edit,
  AlertTriangle,
  Clock,
  Printer,
} from "lucide-react";

type Event = {
  id: string;
  title: string;
  date: string;
  end_date?: string | null;
  client_id: string | null;
  equipment_ids: string[] | null;
  notes: string;
  user_id: string;
  created_at: string;
};

type Client = {
  id: string;
  name: string;
  email: string;
};

type Equipment = {
  id: string;
  name: string;
  type: string;
  status: string;
};

type EquipmentPreset = {
  id: string;
  name: string;
  type: string;
  equipment_ids: string[];
};

type PhotoJob = {
  id: string;
  title: string;
  job_date: string;
  end_date?: string | null;
  status: string;
  client_id: string;
  client?: {
    name: string;
  };
  equipment_ids?: string[]; // Added equipment_ids
};

const initialFormState = {
  title: "",
  client_id: "",
  equipment_ids: [] as string[],
  notes: "",
  job_date: "", // Data di inizio
  end_date: "", // Data di fine
};

const getEventEmoji = (event: Event) => {
  if (event.client_id) {
    return "📸";
  }
  if (event.equipment_ids?.length) {
    return "🎥";
  }
  return "📅";
};

const getStatusIcon = (status: string) => {
  switch (status) {
    case "CONFIRMED":
      return <CheckCircle className="h-4 w-4 text-green-500" />;
    case "DOWNLOADED":
      return <Download className="h-4 w-4 text-purple-500" />;
    case "IN_PROGRESS":
      return <Clock className="h-4 w-4 text-blue-500" />;
    case "READY_FOR_DOWNLOAD":
      return <FileDown className="h-4 w-4 text-cyan-500" />;
    case "READY_FOR_REVIEW":
      return <Edit className="h-4 w-4 text-indigo-500" />;
    case "PENDING_PAYMENT":
      return <AlertTriangle className="h-4 w-4 text-amber-500" />;
    case "COMPLETED":
      return <CheckCircle className="h-4 w-4 text-emerald-500" />;
    default:
      return null;
  }
};

export default function Calendar() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [date, setDate] = useState<Date>(new Date());
  const [weekDates, setWeekDates] = useState<Date[]>([]);
  const [open, setOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [formData, setFormData] = useState({
    ...initialFormState,
    job_date: formatDateTimeForInput(new Date()),
  });
  const [selectedPresetType, setSelectedPresetType] = useState<string>("");
  const [isClassicMode, setIsClassicMode] = useState(false);
  const [activeTab, setActiveTab] = useState<string>("calendar");
  const queryClient = useQueryClient();

  // Funzione utility per formattare le date per l'input datetime-local
  function formatDateTimeForInput(date: Date): string {
    return date.toISOString().slice(0, 16); // formato: "YYYY-MM-DDThh:mm"
  }

  useEffect(() => {
    const start = startOfWeek(date, { weekStartsOn: 1 });
    const dates = Array.from({ length: 7 }, (_, i) => addDays(start, i));
    setWeekDates(dates);
  }, [date]);

  const { data: clients, isLoading: isLoadingClients } = useQuery<Client[]>({
    queryKey: ["clients"],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("clients")
        .select("id, name, email")
        .eq("user_id", user.id)
        .order("name", { ascending: true });

      if (error) throw error;
      return data || [];
    },
    enabled: !!user,
  });

  const { data: equipment, isLoading: isLoadingEquipment } = useQuery<
    Equipment[]
  >({
    queryKey: ["equipment"],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("equipment")
        .select("id, name, type, status")
        .eq("user_id", user.id)
        .order("name", { ascending: true });

      if (error) throw error;
      return data || [];
    },
    enabled: !!user,
  });

  const { data: events, isLoading: isLoadingEvents } = useQuery<Event[]>({
    queryKey: ["events"],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("events")
        .select(
          `
          id, 
          title, 
          date,
          end_date,
          client_id,
          equipment_ids,
          notes,
          user_id,
          created_at
        `,
        )
        .eq("user_id", user.id)
        .order("date", { ascending: true });

      if (error) throw error;
      return data || [];
    },
    enabled: !!user,
  });

  const { data: presets } = useQuery<EquipmentPreset[]>({
    queryKey: ["equipment-presets"],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("equipment_presets")
        .select("*")
        .eq("user_id", user.id);

      if (error) throw error;
      return data || [];
    },
    enabled: !!user,
  });

  const { data: photoJobs, isLoading: isLoadingPhotoJobs } = useQuery<
    PhotoJob[]
  >({
    queryKey: ["photo-jobs"],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("photo_jobs")
        .select(
          `id, title, job_date, end_date, status, client_id, client:clients(name), equipment_ids`,
        )
        .eq("user_id", user.id)
        .not("job_date", "is", null); // Filter out jobs without a date

      if (error) throw error;
      return data || [];
    },
    enabled: !!user,
  });

  const createEventMutation = useMutation({
    mutationFn: async (newEvent: any) => {
      if (!user) throw new Error("Utente non autenticato");

      // Sanitizzazione dei dati
      const eventData = {
        title: newEvent.title,
        date: newEvent.date,
        end_date: newEvent.end_date,
        client_id: newEvent.client_id || null,
        notes: newEvent.notes || "",
        user_id: user.id,
        equipment_ids:
          Array.isArray(newEvent.equipment_ids) &&
          newEvent.equipment_ids.length > 0
            ? newEvent.equipment_ids
            : null,
      };

      console.log("Creating event with data:", eventData);

      const { data, error } = await supabase
        .from("events")
        .insert([eventData])
        .select();

      if (error) {
        console.error("Error creating event:", error);
        throw new Error(error.message);
      }
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["events"] });
      toast({
        title: "Lavoro aggiunto",
        description: "Il lavoro è stato aggiunto con successo",
      });
      resetForm();
    },
    onError: (error: Error) => {
      console.error("Mutation error:", error);
      toast({
        variant: "destructive",
        title: "Errore",
        description: `Si è verificato un errore: ${error.message}`,
      });
    },
  });

  const updateEventMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      if (!user) throw new Error("Utente non autenticato");

      // Sanitizzazione dei dati
      const eventData = {
        title: data.title,
        date: data.date,
        end_date: data.end_date,
        client_id: data.client_id || null,
        notes: data.notes || "",
        equipment_ids:
          Array.isArray(data.equipment_ids) && data.equipment_ids.length > 0
            ? data.equipment_ids
            : null,
      };

      console.log("Updating event with data:", eventData);

      const { data: updatedData, error } = await supabase
        .from("events")
        .update(eventData)
        .eq("id", id)
        .select();

      if (error) {
        console.error("Error updating event:", error);
        throw new Error(error.message);
      }
      return updatedData;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["events"] });
      toast({
        title: "Lavoro modificato",
        description: "Il lavoro è stato modificato con successo",
      });
      resetForm();
    },
    onError: (error: Error) => {
      console.error("Mutation error:", error);
      toast({
        variant: "destructive",
        title: "Errore",
        description: `Si è verificato un errore: ${error.message}`,
      });
    },
  });

  const createPhotoJobMutation = useMutation({
    mutationFn: async (
      newJob: Omit<PhotoJob, "id" | "client"> & { client_id: string },
    ) => {
      if (!user) throw new Error("Utente non autenticato");

      const { data, error } = await supabase
        .from("photo_jobs")
        .insert([{ ...newJob, user_id: user.id }])
        .select();

      if (error) {
        console.error("Error creating photo job:", error);
        throw new Error(error.message);
      }
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["photo-jobs"] });
      toast({
        title: "Lavoro fotografico aggiunto",
        description: "Il lavoro fotografico è stato aggiunto con successo",
      });
      resetForm();
    },
    onError: (error: Error) => {
      console.error("Mutation error:", error);
      toast({
        variant: "destructive",
        title: "Errore",
        description: `Si è verificato un errore: ${error.message}`,
      });
    },
  });

  const updatePhotoJobMutation = useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: string;
      data: Omit<PhotoJob, "id" | "client"> & { client_id: string };
    }) => {
      if (!user) throw new Error("Utente non autenticato");

      const { data: updatedData, error } = await supabase
        .from("photo_jobs")
        .update(data)
        .eq("id", id)
        .select();

      if (error) {
        console.error("Error updating photo job:", error);
        throw new Error(error.message);
      }
      return updatedData;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["photo-jobs"] });
      toast({
        title: "Lavoro fotografico modificato",
        description: "Il lavoro fotografico è stato modificato con successo",
      });
      resetForm();
    },
    onError: (error: Error) => {
      console.error("Mutation error:", error);
      toast({
        variant: "destructive",
        title: "Errore",
        description: `Si è verificato un errore: ${error.message}`,
      });
    },
  });

  const resetForm = () => {
    setFormData({
      ...initialFormState,
      job_date: formatDateTimeForInput(date),
    });
    setSelectedEvent(null);
    setOpen(false);
    setSelectedPresetType("");
  };

  const handleSubmit = () => {
    if (!formData.title || !formData.job_date) {
      toast({
        variant: "destructive",
        title: "Dati mancanti",
        description: "Titolo e data di inizio sono campi obbligatori",
      });
      return;
    }

    // Sanitizzazione dei dati
    const sanitizedData = {
      ...formData,
      title: formData.title.trim(),
      notes: formData.notes.trim(),
      client_id: formData.client_id || null,
      equipment_ids: Array.isArray(formData.equipment_ids)
        ? formData.equipment_ids
        : [],
      date: formData.job_date,
      end_date: formData.end_date || null,
    };

    try {
      if (selectedEvent) {
        console.log("Updating event:", {
          id: selectedEvent.id,
          data: sanitizedData,
        });

        updateEventMutation.mutate({
          id: selectedEvent.id,
          data: sanitizedData,
        });
      } else {
        console.log("Creating event:", sanitizedData);

        createEventMutation.mutate(sanitizedData);
      }
    } catch (error) {
      console.error("Submit error:", error);
      toast({
        variant: "destructive",
        title: "Errore",
        description: "Si è verificato un errore durante il salvataggio",
      });
    }
  };

  const handleEdit = (event: Event) => {
    console.log("Editing event:", event);
    setSelectedEvent(event);
    setDate(new Date(event.date));

    // Sanitizzazione dei dati prima di impostarli nel form
    setFormData({
      title: event.title || "",
      client_id: event.client_id || "",
      equipment_ids: Array.isArray(event.equipment_ids)
        ? event.equipment_ids
        : [],
      notes: event.notes || "",
      job_date: event.date
        ? event.date.slice(0, 16)
        : formatDateTimeForInput(new Date()),
      end_date: event.end_date ? event.end_date.slice(0, 16) : "",
    });

    // Se l'evento ha un preset associato, impostarlo
    if (event.equipment_ids && presets) {
      for (const preset of presets) {
        if (
          preset.type &&
          Array.isArray(preset.equipment_ids) &&
          Array.isArray(event.equipment_ids) &&
          preset.equipment_ids.length > 0 &&
          preset.equipment_ids.every((id) => event.equipment_ids?.includes(id))
        ) {
          setSelectedPresetType(preset.type);
          break;
        }
      }
    }

    setOpen(true);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleEquipmentToggle = (equipmentId: string) => {
    setFormData((prev) => {
      const newEquipmentIds = prev.equipment_ids.includes(equipmentId)
        ? prev.equipment_ids.filter((id) => id !== equipmentId)
        : [...prev.equipment_ids, equipmentId];
      return { ...prev, equipment_ids: newEquipmentIds };
    });
  };

  const handlePresetTypeChange = (type: string) => {
    setSelectedPresetType(type);
    const preset = presets?.find((p) => p.type === type);
    if (preset) {
      setFormData((prev) => ({
        ...prev,
        equipment_ids: preset.equipment_ids,
      }));
    }
  };

  const getClientName = (clientId: string | null) => {
    if (!clientId || !clients) return "Nessun cliente";
    const client = clients.find((c) => c.id === clientId);
    return client ? client.name : "Nessun cliente";
  };

  const getEquipmentNames = (equipmentIds: string[] | null) => {
    if (!equipmentIds || !equipment) return [];
    return equipmentIds
      .map((id) => equipment.find((e) => e.id === id)?.name)
      .filter((name): name is string => !!name);
  };

  const handleDateSelect = (newDate: Date | undefined) => {
    if (newDate) {
      setDate(newDate);
      // Aggiorniamo anche la data di inizio nel form mantenendo l'ora corrente
      const currentTime = new Date();
      newDate.setHours(currentTime.getHours());
      newDate.setMinutes(currentTime.getMinutes());
      setFormData((prev) => ({
        ...prev,
        job_date: formatDateTimeForInput(newDate),
      }));
    }
  };

  const getDatesWithItems = () => {
    const dateMap = new Map();

    if (events) {
      events.forEach((event) => {
        const date = format(new Date(event.date), "yyyy-MM-dd");
        dateMap.set(date, (dateMap.get(date) || 0) + 1);
      });
    }

    if (photoJobs) {
      photoJobs.forEach((job) => {
        if (job.job_date) {
          const date = format(new Date(job.job_date), "yyyy-MM-dd");
          dateMap.set(date, (dateMap.get(date) || 0) + 1);
        }
      });
    }

    return dateMap;
  };

  if (
    isLoadingEvents ||
    isLoadingClients ||
    isLoadingEquipment ||
    isLoadingPhotoJobs
  ) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-medium text-foreground flex items-center gap-2">
            <CalendarIcon className="h-6 w-6 text-primary" />
            Calendario 📅
          </h2>
          <p className="text-sm text-muted-foreground">
            {format(date, "MMMM yyyy", { locale: it })}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center space-x-2 mr-4">
            <Switch
              id="classic-mode"
              checked={isClassicMode}
              onCheckedChange={setIsClassicMode}
            />
            <Label htmlFor="classic-mode">Modalità Classica</Label>
          </div>

          <Button
            variant="outline"
            size="icon"
            onClick={() => setDate(addDays(date, -7))}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>

          <Button
            variant="outline"
            size="icon"
            onClick={() => setDate(addDays(date, 7))}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>

          <Dialog
            open={open}
            onOpenChange={(isOpen) => {
              if (!isOpen) resetForm();
              setOpen(isOpen);
            }}
          >
            <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>
                  {selectedEvent
                    ? "Modifica lavoro"
                    : "Aggiungi un nuovo lavoro"}
                </DialogTitle>
                <DialogDescription>
                  {selectedEvent
                    ? "Modifica i dettagli del lavoro"
                    : "Inserisci i dettagli del nuovo lavoro"}
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="title">Titolo *</Label>
                  <Input
                    id="title"
                    name="title"
                    value={formData.title}
                    onChange={handleInputChange}
                    placeholder="Titolo del lavoro"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="client">Cliente</Label>
                  {/* Utilizziamo un controllo NULL esplicito prima di renderizzare il Select */}
                  {clients ? (
                    <Select
                      value={formData.client_id || undefined}
                      onValueChange={(value) =>
                        setFormData((prev) => ({ ...prev, client_id: value }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Seleziona un cliente" />
                      </SelectTrigger>
                      <SelectContent>
                        {clients.map((client) => (
                          <SelectItem key={client.id} value={client.id}>
                            {client.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <Input disabled placeholder="Caricamento clienti..." />
                  )}
                </div>
                <div className="grid gap-2">
                  <Label>Tipo di Lavoro / Preset</Label>
                  {presets ? (
                    <Select
                      value={selectedPresetType || undefined}
                      onValueChange={handlePresetTypeChange}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Seleziona il tipo di lavoro" />
                      </SelectTrigger>
                      <SelectContent>
                        {presets.map((preset) => (
                          <SelectItem
                            key={preset.id}
                            value={preset.type || preset.id}
                          >
                            {preset.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <Input disabled placeholder="Caricamento presets..." />
                  )}
                </div>
                <div className="grid gap-2">
                  <Label>Attrezzature</Label>
                  <ScrollArea className="h-[200px] border rounded-md p-4">
                    <div className="space-y-2">
                      {equipment?.map((item) => (
                        <div
                          key={item.id}
                          className="flex items-center space-x-2"
                        >
                          <Checkbox
                            id={item.id}
                            checked={formData.equipment_ids.includes(item.id)}
                            onCheckedChange={() =>
                              handleEquipmentToggle(item.id)
                              
                            }
                          />
                          <Label htmlFor={item.id}>{item.name}</Label>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="job_date">Data Inizio *</Label>
                  <input
                    type="datetime-local"
                    id="job_date"
                    name="job_date"
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2"
                    value={formData.job_date}
                    onChange={handleInputChange}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="end_date">Data Fine</Label>
                  <input
                    type="datetime-local"
                    id="end_date"
                    name="end_date"
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2"
                    value={formData.end_date}
                    onChange={handleInputChange}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="notes">Note</Label>
                  <Input
                    id="notes"
                    name="notes"
                    value={formData.notes}
                    onChange={handleInputChange}
                    placeholder="Note sul lavoro"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button
                  onClick={handleSubmit}
                  disabled={
                    createEventMutation.isPending ||
                    updateEventMutation.isPending
                  }
                  className="w-full sm:w-auto"
                >
                  {createEventMutation.isPending ||
                  updateEventMutation.isPending
                    ? "Salvataggio..."
                    : selectedEvent
                      ? "Modifica"
                      : "Salva"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Tabs
        defaultValue="calendar"
        className="w-full"
        value={activeTab}
        onValueChange={setActiveTab}
      >
        <TabsList className="grid w-full grid-cols-2 mb-4">
          <TabsTrigger value="calendar" className="flex items-center gap-2">
            <CalendarIcon className="h-4 w-4" />
            Calendario
          </TabsTrigger>
          <TabsTrigger value="events" className="flex items-center gap-2">
            <List className="h-4 w-4" />
            Lavori Salvati
          </TabsTrigger>
        </TabsList>

        <TabsContent value="calendar">
          {isClassicMode ? (
            <Card className="shadow-xl shadow-black/5">
              <CardContent className="p-4">
                <CalendarComponent
                  mode="single"
                  selected={date}
                  onSelect={handleDateSelect}
                  className="mx-auto"
                  locale={it}
                  modifiers={{
                    hasEvent: (date) =>
                      events?.some((event) =>
                        isSameDay(new Date(event.date), date),
                      ) ||
                      photoJobs?.some((job) =>
                        isSameDay(new Date(job.job_date), date),
                      ) ||
                      false,
                  }}
                  modifiersStyles={{
                    hasEvent: {
                      fontWeight: "600",
                      backgroundColor: "hsl(var(--primary) / 0.1)",
                      color: "hsl(var(--primary))",
                      boxShadow: "0 2px 4px hsl(var(--primary) / 0.1)",
                    },
                  }}
                />

                {/* Eventi del giorno selezionato */}
                <div className="mt-8 border-t pt-6">
                  <h3 className="text-lg font-medium mb-4">
                    Eventi del {format(date, "d MMMM yyyy", { locale: it })}
                  </h3>
                  <div className="space-y-3">
                    {events
                      ?.filter((event) => isSameDay(new Date(event.date), date))
                      .map((event) => (
                        <div
                          key={event.id}
                          className="p-3 rounded-lg bg-primary/10 border border-primary/20 cursor-pointer hover:bg-primary/20 transition-colors"
                          onClick={() => handleEdit(event)}
                        >
                          <div className="font-medium flex items-center gap-1">
                            {getEventEmoji(event)} {event.title}
                          </div>
                          {event.client_id && (
                            <div className="text-sm text-muted-foreground mt-1">
                              {getClientName(event.client_id)}
                            </div>
                          )}
                        </div>
                      ))}
                    {photoJobs
                      ?.filter((job) => isSameDay(new Date(job.job_date), date))
                      .map((job) => (
                        <div
                          key={job.id}
                          className="p-3 rounded-lg bg-primary/10 border border-primary/20 cursor-pointer hover:bg-primary/20 transition-colors"
                        >
                          <div className="font-medium flex items-center gap-1">
                            {getStatusIcon(job.status)} {job.title}
                          </div>
                          {job.client_id && (
                            <div className="text-sm text-muted-foreground mt-1">
                              {getClientName(job.client_id)}
                            </div>
                          )}
                        </div>
                      ))}

                    {events?.filter((event) =>
                      isSameDay(new Date(event.date), date),
                    ).length === 0 &&
                      photoJobs?.filter((job) =>
                        isSameDay(new Date(job.job_date), date),
                      ).length === 0 && (
                        <p className="text-muted-foreground text-center py-4">
                          Nessun evento programmato per questo giorno
                        </p>
                      )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card className="shadow-xl shadow-black/5">
              <CardContent className="p-0">
                <div className="grid grid-cols-7 gap-px bg-border">
                  {weekDates.map((date) => (
                    <div key={date.toISOString()} className="bg-card p-4">
                      <div className="text-sm font-medium mb-2">
                        {format(date, "EEE", { locale: it })}
                      </div>
                      <div className="text-2xl font-bold">
                        {format(date, "d")}
                      </div>
                      <div className="mt-4 space-y-2">
                        {events
                          ?.filter((event) => {
                            // Visualizza l'evento se la data corrente è compresa tra la data di inizio e fine
                            const eventStartDate = new Date(event.date);
                            // Se c'è una data di fine, controlla se la data corrente è compresa tra inizio e fine
                            if (event.end_date) {
                              const eventEndDate = new Date(event.end_date);
                              return (
                                (date >= eventStartDate &&
                                  date <= eventEndDate) ||
                                isSameDay(date, eventStartDate) ||
                                isSameDay(date, eventEndDate)
                              );
                            }
                            // Altrimenti visualizza solo nella data di inizio
                            return isSameDay(eventStartDate, date);
                          })
                          .map((event) => (
                            <div
                              key={event.id}
                              className="p-2 rounded-lg bg-primary/10 border border-primary/20 cursor-pointer hover:bg-primary/20 transition-colors"
                              onClick={() => handleEdit(event)}
                            >
                              <div className="font-medium text-sm flex items-center gap-1">
                                {getEventEmoji(event)} {event.title}
                                {event.end_date &&
                                  !isSameDay(
                                    new Date(event.date),
                                    new Date(event.end_date),
                                  ) && (
                                    <span className="text-xs text-muted-foreground ml-1">
                                      (multi-giorno)
                                    </span>
                                  )}
                              </div>
                              {event.client_id && (
                                <div className="text-xs text-muted-foreground mt-1">
                                  {getClientName(event.client_id)}
                                </div>
                              )}
                            </div>
                          ))}
                        {photoJobs
                          ?.filter((job) => {
                            // Visualizza il lavoro se la data corrente è compresa tra la data di inizio e fine
                            const jobStartDate = new Date(job.job_date);
                            // Se c'è una data di fine, controlla se la data corrente è compresa trainizio e fine
                            if (job.end_date) {
                              const jobEndDate = new Date(job.end_date);
                              return (
                                (date >= jobStartDate && date <= jobEndDate) ||
                                isSameDay(date, jobStartDate) ||
                                isSameDay(date, jobEndDate)
                              );
                            }
                            // Altrimenti visualizza solo nella data di inizio
                            return isSameDay(jobStartDate, date);
                          })
                          .map((job) => (
                            <div
                              key={job.id}
                              className="p-2 rounded-lg bg-primary/10 border border-primary/20 cursor-pointer hover:bg-primary/20 transition-colors"
                            >
                              <div className="font-medium text-sm flex items-center gap-1">
                                {getStatusIcon(job.status)} {job.title}
                                {job.end_date &&
                                  !isSameDay(
                                    new Date(job.job_date),
                                    new Date(job.end_date),
                                  ) && (
                                    <span className="text-xs text-muted-foreground ml-1">
                                      (multi-giorno)
                                    </span>
                                  )}
                              </div>
                              {job.client_id && (
                                <div className="text-xs text-muted-foreground mt-1">
                                  {getClientName(job.client_id)}
                                </div>
                              )}
                            </div>
                          ))}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="events">
          <Card className="shadow-xl shadow-black/5">
            <CardHeader>
              <CardTitle>Tutti i Lavori Salvati 📋</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {events
                  ?.sort(
                    (a, b) =>
                      new Date(b.date).getTime() - new Date(a.date).getTime(),
                  )
                  .map((event) => (
                    <div
                      key={event.id}
                      className="group relative bg-card p-4 rounded-xl border border-border/50 hover:border-primary/30 shadow-lg hover:shadow-xl transition-all duration-200"
                    >
                      <div className="flex flex-col sm:flex-row justify-between items-start gap-3">
                        <div className="flex-1 min-w-0">
                          <h3 className="text-base font-medium text-foreground truncate flex items-center gap-2">
                            {getEventEmoji(event)} {event.title}
                          </h3>
                          <p className="text-sm text-muted-foreground mt-1">
                            {format(new Date(event.date), "d MMMM yyyy", {
                              locale: it,
                            })}
                            {event.end_date &&
                              !isSameDay(
                                new Date(event.date),
                                new Date(event.end_date),
                              ) &&
                              ` - ${format(new Date(event.end_date), "d MMMM yyyy", { locale: it })}`}
                          </p>
                          {event.client_id && (
                            <p className="text-sm text-muted-foreground mt-1 flex items-center gap-2">
                              <Users2 className="h-4 w-4" />
                              {getClientName(event.client_id)}
                            </p>
                          )}
                        </div>
                        <div className="flex gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEdit(event)}
                            className="hover:bg-accent/50"
                            title="Modifica"
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="hover:bg-accent/50"
                            title="Visualizza resoconto"
                            onClick={() => {
                              const eventClient = clients?.find(c => c.id === event.client_id);
                              const eventEquipment = equipment?.filter(e => event.equipment_ids?.includes(e.id));

                              // Creazione del resoconto da copiare/stampare
                              const equipmentText = eventEquipment && eventEquipment.length > 0
                                ? `\nAttrezzatura:\n${eventEquipment.map(item => `- ${item.name}`).join('\n')}`
                                : '';

                              const eventInfo = `
RESOCONTO LAVORO
================
Titolo: ${event.title}
Cliente: ${eventClient?.name || "Nessun cliente"}
Data Inizio: ${format(new Date(event.date), "d MMMM yyyy", { locale: it })}
${event.end_date ? `Data Fine: ${format(new Date(event.end_date), "d MMMM yyyy", { locale: it })}` : ''}
Note: ${event.notes || "Nessuna nota"}${equipmentText}
================
                              `;

                              // Dialog con stile migliorato per visualizzare o copiare il resoconto
                              const dialogRef = document.createElement("dialog");
                              dialogRef.className = "p-6 rounded-lg shadow-lg max-w-2xl bg-background border border-border";

                              const dialogContent = document.createElement("div");
                              dialogContent.innerHTML = `
                                <h3 class="text-xl font-medium mb-4">Resoconto Lavoro: ${event.title}</h3>
                                <div class="bg-muted/30 rounded-md p-4 mb-4">
                                  <pre class="whitespace-pre-wrap text-sm text-foreground">${eventInfo}</pre>
                                </div>
                                <div class="flex flex-col space-y-3 sm:flex-row sm:space-y-0 sm:space-x-3 sm:justify-end">
                                  <button id="copyBtn" class="px-4 py-2 bg-secondary text-secondary-foreground rounded-md flex items-center justify-center gap-2">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                      <rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/>
                                    </svg>
                                    Copia testo
                                  </button>
                                  <button id="printBtn" class="px-4 py-2 bg-primary text-primary-foreground rounded-md flex items-center justify-center gap-2">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                      <polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/>
                                      <rect width="12" height="8" x="6" y="14"/>
                                    </svg>
                                    Stampa
                                  </button>
                                  <button id="closeBtn" class="px-4 py-2 bg-muted text-muted-foreground rounded-md flex items-center justify-center gap-2">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                      <path d="M18 6 6 18"/><path d="m6 6 12 12"/>
                                    </svg>
                                    Chiudi
                                  </button>
                                </div>
                              `;

                              dialogRef.appendChild(dialogContent);
                              document.body.appendChild(dialogRef);

                              // Event listeners
                              const closeBtn = dialogRef.querySelector("#closeBtn");
                              const copyBtn = dialogRef.querySelector("#copyBtn");
                              const printBtn = dialogRef.querySelector("#printBtn");

                              closeBtn.addEventListener("click", () => {
                                dialogRef.close();
                                document.body.removeChild(dialogRef);
                              });

                              copyBtn.addEventListener("click", () => {
                                navigator.clipboard.writeText(eventInfo);
                                toast({
                                  title: "Copiato!",
                                  description: "Il resoconto è stato copiato negli appunti",
                                });
                              });

                              printBtn.addEventListener("click", () => {
                                const printWindow = window.open('', '_blank');
                                printWindow.document.write(`
                                  <html>
                                    <head>
                                      <title>Resoconto: ${event.title}</title>
                                      <style>
                                        body { 
                                          font-family: Arial, sans-serif; 
                                          line-height: 1.6; 
                                          padding: 20px;
                                          color: #000;
                                          background-color: #fff;
                                        }
                                        h1 { 
                                          border-bottom: 1px solid #ddd; 
                                          padding-bottom: 10px;
                                          color: #000;
                                        }
                                        pre { 
                                          white-space: pre-wrap;
                                          background-color: #f9f9f9;
                                          padding: 15px;
                                          border-radius: 5px;
                                          border: 1px solid #ddd;
                                          color: #000;
                                        }
                                        .container {
                                          max-width: 800px;
                                          margin: 0 auto;
                                        }
                                      </style>
                                    </head>
                                    <body>
                                      <div class="container">
                                        <h1>Resoconto Lavoro: ${event.title}</h1>
                                        <pre>${eventInfo}</pre>
                                      </div>
                                    </body>
                                  </html>
                                `);
                                printWindow.document.close();
                                printWindow.print();
                              });

                              // Mostra dialog
                              dialogRef.showModal();
                            }}
                          >
                            <Printer className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              const eventClient = clients?.find(c => c.id === event.client_id);
                              const eventEquipment = equipment?.filter(e => event.equipment_ids?.includes(e.id));

                              // Creazione del resoconto da copiare/stampare
                              const equipmentText = eventEquipment && eventEquipment.length > 0
                                ? `\nAttrezzatura:\n${eventEquipment.map(item => `- ${item.name}`).join('\n')}`
                                : '';

                              const eventInfo = `
RESOCONTO LAVORO
================
Titolo: ${event.title}
Cliente: ${eventClient?.name || "Nessun cliente"}
Data Inizio: ${format(new Date(event.date), "d MMMM yyyy", { locale: it })}
${event.end_date ? `Data Fine: ${format(new Date(event.end_date), "d MMMM yyyy", { locale: it })}` : ''}
Note: ${event.notes || "Nessuna nota"}${equipmentText}
================
                              `;

                              // Dialog con stile migliorato per visualizzare o copiare il resoconto
                              const dialogRef = document.createElement("dialog");
                              dialogRef.className = "p-6 rounded-lg shadow-lg max-w-2xl bg-background border border-border";

                              const dialogContent = document.createElement("div");
                              dialogContent.innerHTML = `
                                <h3 class="text-xl font-medium mb-4">Resoconto Lavoro: ${event.title}</h3>
                                <div class="bg-muted/30 rounded-md p-4 mb-4">
                                  <pre class="whitespace-pre-wrap text-sm text-foreground">${eventInfo}</pre>
                                </div>
                                <div class="flex flex-col space-y-3 sm:flex-row sm:space-y-0 sm:space-x-3 sm:justify-end">
                                  <button id="copyBtn" class="px-4 py-2 bg-secondary text-secondary-foreground rounded-md flex items-center justify-center gap-2">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                      <rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/>
                                    </svg>
                                    Copia testo
                                  </button>
                                  <button id="printBtn" class="px-4 py-2 bg-primary text-primary-foreground rounded-md flex items-center justify-center gap-2">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                      <polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/>
                                      <rect width="12" height="8" x="6" y="14"/>
                                    </svg>
                                    Stampa
                                  </button>
                                  <button id="closeBtn" class="px-4 py-2 bg-muted text-muted-foreground rounded-md flex items-center justify-center gap-2">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                      <path d="M18 6 6 18"/><path d="m6 6 12 12"/>
                                    </svg>
                                    Chiudi
                                  </button>
                                </div>
                              `;

                              dialogRef.appendChild(dialogContent);
                              document.body.appendChild(dialogRef);

                              // Event listeners
                              const closeBtn = dialogRef.querySelector("#closeBtn");
                              const copyBtn = dialogRef.querySelector("#copyBtn");
                              const printBtn = dialogRef.querySelector("#printBtn");

                              closeBtn.addEventListener("click", () => {
                                dialogRef.close();
                                document.body.removeChild(dialogRef);
                              });

                              copyBtn.addEventListener("click", () => {
                                navigator.clipboard.writeText(eventInfo);
                                toast({
                                  title: "Copiato!",
                                  description: "Il resoconto è stato copiato negli appunti",
                                });
                              });

                              printBtn.addEventListener("click", () => {
                                const printWindow = window.open('', '_blank');
                                printWindow.document.write(`
                                  <html>
                                    <head>
                                      <title>Resoconto: ${event.title}</title>
                                      <style>
                                        body { 
                                          font-family: Arial, sans-serif; 
                                          line-height: 1.6; 
                                          padding: 20px;
                                          color: #000;
                                          background-color: #fff;
                                        }
                                        h1 { 
                                          border-bottom: 1px solid #ddd; 
                                          padding-bottom: 10px;
                                          color: #000;
                                        }
                                        pre { 
                                          white-space: pre-wrap;
                                          background-color: #f9f9f9;
                                          padding: 15px;
                                          border-radius: 5px;
                                          border: 1px solid #ddd;
                                          color: #000;
                                        }
                                        .container {
                                          max-width: 800px;
                                          margin: 0 auto;
                                        }
                                      </style>
                                    </head>
                                    <body>
                                      <div class="container">
                                        <h1>Resoconto Lavoro: ${event.title}</h1>
                                        <pre>${eventInfo}</pre>
                                      </div>
                                    </body>
                                  </html>
                                `);
                                printWindow.document.close();
                                printWindow.print();
                              });

                              // Mostra dialog
                              dialogRef.showModal();
                            }}
                            className="hover:bg-accent/50"
                            title="Visualizza resoconto"
                          >
                            <Printer className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>

                      {(event.equipment_ids?.length > 0 || event.notes) && (
                        <div className="mt-3 pt-3 border-t border-border/50">
                          {event.equipment_ids &&
                            event.equipment_ids.length > 0 && (
                              <div>
                                <p className="text-sm font-medium text-foreground flex items-center gap-2">
                                  <Box className="h-4 w-4" />
                                  Attrezzatura 🎥
                                </p>
                                <ul className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-2">
                                  {getEquipmentNames(event.equipment_ids).map(
                                    (name) => (
                                      <li
                                        key={name}
                                        className="text-sm text-muted-foreground flex items-center gap-2"
                                      >
                                        <span className="h-1.5 w-1.5 rounded-full bg-primary"></span>
                                        {name}
                                      </li>
                                    ),
                                  )}
                                </ul>
                              </div>
                            )}
                          {event.notes && (
                            <p className="text-sm text-muted-foreground mt-3 bg-accent/50 p-3 rounded-lg">
                              📝 {event.notes}
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                {photoJobs
                  ?.sort(
                    (a, b) =>
                      new Date(b.job_date).getTime() -
                      new Date(a.job_date).getTime(),
                  )
                  .map((job) => (
                    <div
                      key={job.id}
                      className="group relative bg-card p-4 rounded-xl border border-border/50 hover:border-primary/30 shadow-lg hover:shadow-xl transition-all duration-200"
                    >
                      <div className="flex flex-col sm:flex-row justify-between items-start gap-3">
                        <div className="flex-1 min-w-0">
                          <h3 className="text-base font-medium text-foreground truncate flex items-center gap-2">
                            {getStatusIcon(job.status)} {job.title}
                          </h3>
                          <p className="text-sm text-muted-foreground mt-1">
                            {format(new Date(job.job_date), "d MMMM yyyy", {
                              locale: it,
                            })}
                            {job.end_date &&
                              !isSameDay(
                                new Date(job.job_date),
                                new Date(job.end_date),
                              ) &&
                              ` - ${format(new Date(job.end_date), "d MMMM yyyy", { locale: it })}`}
                          </p>
                          {job.client_id && (
                            <p className="text-sm text-muted-foreground mt-1 flex items-center gap-2">
                              <Users2 className="h-4 w-4" />
                              {getClientName(job.client_id)}
                            </p>
                          )}
                        </div>
                        <div className="flex gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="hover:bg-accent/50"
                            title="Visualizza resoconto"
                            onClick={() => {
                              const jobClient = clients?.find(c => c.id === job.client_id);
                              const jobEquipment = equipment?.filter(e => job.equipment_ids?.includes(e.id));

                              // Creazione del resoconto da copiare/stampare
                              const equipmentText = jobEquipment && jobEquipment.length > 0
                                ? `\nAttrezzatura:\n${jobEquipment.map(item => `- ${item.name}`).join('\n')}`
                                : '';

                              const jobInfo = `
RESOCONTO LAVORO FOTOGRAFICO
============================
Titolo: ${job.title}
Cliente: ${jobClient?.name || "Nessun cliente"}
Stato: ${job.status}
Data Inizio: ${format(new Date(job.job_date), "d MMMM yyyy", { locale: it })}
${job.end_date ? `Data Fine: ${format(new Date(job.end_date), "d MMMM yyyy", { locale: it })}` : ''}
${equipmentText}
============================
                              `;

                              // Dialog con stile migliorato per visualizzare o copiare il resoconto
                              const dialogRef = document.createElement("dialog");
                              dialogRef.className = "p-6 rounded-lg shadow-lg max-w-2xl bg-background border border-border";

                              const dialogContent = document.createElement("div");
                              dialogContent.innerHTML = `
                                <h3 class="text-xl font-medium mb-4">Resoconto Lavoro Fotografico: ${job.title}</h3>
                                <div class="bg-muted/30 rounded-md p-4 mb-4">
                                  <pre class="whitespace-pre-wrap text-sm text-foreground">${jobInfo}</pre>
                                </div>
                                <div class="flex flex-col space-y-3 sm:flex-row sm:space-y-0 sm:space-x-3 sm:justify-end">
                                  <button id="copyBtn" class="px-4 py-2 bg-secondary text-secondary-foreground rounded-md flex items-center justify-center gap-2">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                      <rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/>
                                    </svg>
                                    Copia testo
                                  </button>
                                  <button id="printBtn" class="px-4 py-2 bg-primary text-primary-foreground rounded-md flex items-center justify-center gap-2">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                      <polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/>
                                      <rect width="12" height="8" x="6" y="14"/>
                                    </svg>
                                    Stampa
                                  </button>
                                  <button id="closeBtn" class="px-4 py-2 bg-muted text-muted-foreground rounded-md flex items-center justify-center gap-2">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                      <path d="M18 6 6 18"/><path d="m6 6 12 12"/>
                                    </svg>
                                    Chiudi
                                  </button>
                                </div>
                              `;

                              dialogRef.appendChild(dialogContent);
                              document.body.appendChild(dialogRef);

                              // Event listeners
                              const closeBtn = dialogRef.querySelector("#closeBtn");
                              const copyBtn = dialogRef.querySelector("#copyBtn");
                              const printBtn = dialogRef.querySelector("#printBtn");

                              closeBtn.addEventListener("click", () => {
                                dialogRef.close();
                                document.body.removeChild(dialogRef);
                              });

                              copyBtn.addEventListener("click", () => {
                                navigator.clipboard.writeText(jobInfo);
                                toast({
                                  title: "Copiato!",
                                  description: "Il resoconto è stato copiato negli appunti",
                                });
                              });

                              printBtn.addEventListener("click", () => {
                                const printWindow = window.open('', '_blank');
                                printWindow.document.write(`
                                  <html>
                                    <head>
                                      <title>Resoconto: ${job.title}</title>
                                      <style>
                                        body { 
                                          font-family: Arial, sans-serif; 
                                          line-height: 1.6; 
                                          padding: 20px;
                                          color: #000;
                                          background-color: #fff;
                                        }
                                        h1 { 
                                          border-bottom: 1px solid #ddd; 
                                          padding-bottom: 10px;
                                          color: #000;
                                        }
                                        pre { 
                                          white-space: pre-wrap;
                                          background-color: #f9f9f9;
                                          padding: 15px;
                                          border-radius: 5px;
                                          border: 1px solid #ddd;
                                          color: #000;
                                        }
                                        .container {
                                          max-width: 800px;
                                          margin: 0 auto;
                                        }
                                      </style>
                                    </head>
                                    <body>
                                      <div class="container">
                                        <h1>Resoconto Lavoro Fotografico: ${job.title}</h1>
                                        <pre>${jobInfo}</pre>
                                      </div>
                                    </body>
                                  </html>
                                `);
                                printWindow.document.close();
                                printWindow.print();
                              });

                              // Mostra dialog
                              dialogRef.showModal();
                            }}
                          >
                            <Printer className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}