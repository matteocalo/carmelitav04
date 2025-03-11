import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createRoot } from "react-dom/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/lib/supabase";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Camera,
  Download,
  Loader2,
  FileDown,
  AlertTriangle,
  CheckCircle,
  Clock,
  RefreshCw,
  Edit,
  Share2,
  DollarSign,
  Calendar,
  Printer,
} from "lucide-react";
import JobPdfGenerator from "@/components/photo-jobs/JobPdfGenerator";

type PhotoJob = {
  id: string;
  user_id: string;
  client_id: string;
  title: string;
  description: string;
  status:
    | "TBC"
    | "CONFIRMED"
    | "DOWNLOADED"
    | "IN_PROGRESS"
    | "READY_FOR_DOWNLOAD"
    | "READY_FOR_REVIEW"
    | "PENDING_PAYMENT"
    | "COMPLETED";
  amount: number;
  job_date?: string;
  end_date?: string | null;
  download_link?: string;
  download_expiry?: string;
  portal_password?: string | null;
  created_at: string;
  updated_at: string;
  client?: {
    name: string;
    email: string;
  };
  equipment_ids?: string[];
  comments_count?: number;
  unread_comments_count?: number;
};

type Comment = {
  id: string;
  job_id: string;
  text: string;
  created_at: string;
  user_id?: string | null;
  client_name: string;
  is_read: boolean;
  photographer_response?: string | null;
};

interface Client {
  id: string;
  name: string;
  email: string;
}

const JOB_STATUSES = [
  { value: "TBC", label: "⏳ In attesa di conferma" },
  { value: "CONFIRMED", label: "✅ Lavoro confermato" },
  { value: "DOWNLOADED", label: "📂 Lavoro scaricato" },
  { value: "IN_PROGRESS", label: "🛠 In lavorazione" },
  { value: "READY_FOR_DOWNLOAD", label: "📤 Pronto per il download" },
  { value: "READY_FOR_REVIEW", label: "👁 Pronto per le revisioni" },
  { value: "PENDING_PAYMENT", label: "💳 In attesa di pagamento" },
  { value: "COMPLETED", label: "🏁 Completato" },
];

const initialFormState = {
  title: "",
  description: "",
  client_id: "",
  amount: "",
  job_date: new Date().toISOString().slice(0, 16),
  end_date: "",
  status: "CONFIRMED" as PhotoJob["status"],
};

export default function PhotoJobs() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedJob, setSelectedJob] = useState<PhotoJob | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [formData, setFormData] = useState(initialFormState);
  const [clientPortalOpen, setClientPortalOpen] = useState(false);
  const [selectedPresetId, setSelectedPresetId] = useState<string>("");
  const [equipment, setEquipment] = useState<Array<any>>([]);
  const [selectedEquipment, setSelectedEquipment] = useState<Array<any>>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Query per ottenere i clienti
  const {
    data: clients,
    isLoading: clientsLoading,
    error: clientsError,
  } = useQuery<Client[], Error>({
    queryKey: ["clients"],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("clients")
        .select("id, name, email")
        .eq("user_id", user.id)
        .order("name");
  
      if (error) throw error;
      return data || [];
    },
    enabled: !!user,
    retry: 1,
  });

  // Query per ottenere i preset di attrezzatura
  const { data: presets, isLoading: presetsLoading } = useQuery({
    queryKey: ["equipment-presets"],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("equipment_presets")
        .select("*")
        .eq("user_id", user.id)
        .order("name");

      if (error) throw error;
      return data || [];
    },
    enabled: !!user,
  });

  // Query per ottenere l'attrezzatura
  const { data: equipmentData, isLoading: equipmentLoading } = useQuery({
    queryKey: ["equipment"],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("equipment")
        .select("*")
        .eq("user_id", user.id)
        .eq("status", "available")
        .order("name");

      if (error) throw error;
      return data || [];
    },
    enabled: !!user,
  });

  const { data: jobs, isLoading } = useQuery<PhotoJob[]>({
    queryKey: ["photo-jobs"],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("photo_jobs")
        .select(
          `
          *,
          client:clients(name, email)
        `
        )
        .eq("user_id", user.id)
        .order("job_date", { ascending: true });

      if (error) throw error;
      return data || [];
    },
    enabled: !!user,
  });

  const createJobMutation = useMutation({
    mutationFn: async (newJob: typeof formData) => {
      if (!user) throw new Error("Utente non autenticato");

      const { data, error } = await supabase
        .from("photo_jobs")
        .insert([
          {
            title: newJob.title,
            description: newJob.description,
            client_id: newJob.client_id,
            user_id: user.id,
            status: newJob.status,
            amount: parseFloat(newJob.amount) || 0,
            job_date: newJob.job_date,
            end_date: newJob.end_date || null,
            equipment_ids:
              selectedEquipment.length > 0 ? selectedEquipment : null,
          },
        ])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["photo-jobs"] });
      toast({
        title: "Lavoro creato",
        description: "Il nuovo lavoro fotografico è stato creato con successo",
      });
      handleCloseDialog();
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Errore",
        description: `Si è verificato un errore: ${error.message}`,
      });
    },
  });

  const updateJobMutation = useMutation({
    mutationFn: async (updatedJob: typeof formData & { id: string }) => {
      if (!user) throw new Error("Utente non autenticato");

      const { data, error } = await supabase
        .from("photo_jobs")
        .update({
          title: updatedJob.title,
          description: updatedJob.description,
          client_id: updatedJob.client_id,
          status: updatedJob.status,
          amount: parseFloat(updatedJob.amount) || 0,
          job_date: updatedJob.job_date,
          end_date: updatedJob.end_date || null,
          equipment_ids:
            selectedEquipment.length > 0 ? selectedEquipment : null,
        })
        .eq("id", updatedJob.id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["photo-jobs"] });
      toast({
        title: "Lavoro aggiornato",
        description: "Il lavoro fotografico è stato aggiornato con successo",
      });
      handleCloseDialog();
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Errore",
        description: `Si è verificato un errore: ${error.message}`,
      });
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({
      jobId,
      status,
    }: {
      jobId: string;
      status: PhotoJob["status"];
    }) => {
      const { data, error } = await supabase
        .from("photo_jobs")
        .update({ status })
        .eq("id", jobId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["photo-jobs"] });
      toast({
        title: "Stato aggiornato",
        description: "Lo stato del lavoro è stato aggiornato con successo",
      });
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Errore",
        description: `Si è verificato un errore: ${error.message}`,
      });
    },
  });

  const deleteJobMutation = useMutation({
    mutationFn: async (jobId: string) => {
      // Prima eliminiamo eventuali commenti associati al lavoro
      const { error: commentsError } = await supabase
        .from("photo_job_comments")
        .delete()
        .eq("job_id", jobId);

      if (commentsError) {
        console.error("Errore nell'eliminazione dei commenti:", commentsError);
      }

      // Poi eliminiamo il lavoro
      const { error } = await supabase
        .from("photo_jobs")
        .delete()
        .eq("id", jobId);

      if (error) throw error;
      return true;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["photo-jobs"] });
      toast({
        title: "Lavoro eliminato",
        description: "Il lavoro fotografico è stato eliminato con successo",
      });
    },
    onError: (error: Error) => {
      console.error("Errore nell'eliminazione del lavoro:", error);
      toast({
        variant: "destructive",
        title: "Errore",
        description: `Si è verificato un errore: ${error.message}`,
      });
    },
  });

  const [portalPassword, setPortalPassword] = useState<string>("");
  const [showPasswordField, setShowPasswordField] = useState<boolean>(false);
  
  const generateClientPortalLinkMutation = useMutation({
    mutationFn: async ({ jobId, password }: { jobId: string; password?: string }) => {
      const expiryDate = new Date();
      expiryDate.setDate(expiryDate.getDate() + 30);

      // Generiamo un token univoco per l'accesso pubblico
      const portalToken = `portal_${jobId}_${Math.random().toString(36).substring(2, 15)}`;
      
      // Creiamo un link pubblico che non richiede login
      // Utilizziamo il formato /client-portal/{token} che corrisponde al routing dell'app
      const updateData: any = {
        download_link: `/client-portal/${portalToken}`,
        download_expiry: expiryDate.toISOString(),
      };
      
      // Se è stata fornita una password, la salviamo
      if (password && password.trim() !== '') {
        updateData.portal_password = password;
      } else {
        // Se non è stata fornita una password, impostiamo a null
        updateData.portal_password = null;
      }

      const { data, error } = await supabase
        .from("photo_jobs")
        .update(updateData)
        .eq("id", jobId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["photo-jobs"] });
      toast({
        title: "Link client portal generato",
        description:
          "Il link per il portale cliente è stato generato con successo",
      });

      if (data.download_link) {
        // Don't use clipboard API directly as it causes permission issues
        // Just show the dialog with the link
        setClientPortalOpen(true);
        setPortalPassword("");
        setShowPasswordField(false);
      }
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Errore",
        description: `Si è verificato un errore: ${error.message}`,
      });
    },
  });

  const handleCloseDialog = () => {
    setFormData(initialFormState);
    setIsEditMode(false);
    setIsOpen(false);
  };

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handlePresetChange = async (presetId: string) => {
    if (!presetId) {
      setSelectedEquipment([]);
      return;
    }

    setSelectedPresetId(presetId);

    try {
      const selectedPreset = presets?.find((p) => p.id === presetId);

      if (
        selectedPreset &&
        selectedPreset.equipment_ids &&
        Array.isArray(selectedPreset.equipment_ids)
      ) {
        setSelectedEquipment(selectedPreset.equipment_ids);
      } else if (equipmentData) {
        setSelectedEquipment(equipmentData.slice(0, 3).map((item) => item.id));
      }
    } catch (error) {
      console.error(
        "Errore nel caricamento dell'attrezzatura del preset:",
        error
      );
      if (equipmentData) {
        setSelectedEquipment(equipmentData.slice(0, 3).map((item) => item.id));
      }
      toast({
        variant: "destructive",
        title: "Errore",
        description:
          "Impossibile caricare l'attrezzatura del preset selezionato.",
      });
    }
  };

  const handleEquipmentToggle = (equipmentId: string) => {
    setSelectedEquipment((prev) => {
      if (prev.includes(equipmentId)) {
        return prev.filter((id) => id !== equipmentId);
      } else {
        return [...prev, equipmentId];
      }
    });
  };

  const handleForceRefresh = async () => {
    setIsRefreshing(true);
    try {
      await queryClient.invalidateQueries({ queryKey: ["photo-jobs"] });
      await queryClient.invalidateQueries({ queryKey: ["clients"] });
      await queryClient.invalidateQueries({ queryKey: ["equipment"] });
      await queryClient.invalidateQueries({ queryKey: ["equipment-presets"] });
      toast({
        title: "Dati aggiornati",
        description: "Tutti i dati sono stati aggiornati con successo",
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Errore",
        description: "Si è verificato un errore durante l'aggiornamento dei dati",
      });
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    try {
      if (!formData.title.trim()) {
        toast({
          variant: "destructive",
          title: "Campo obbligatorio",
          description: "Il titolo del lavoro è obbligatorio",
        });
        return;
      }

      if (!formData.client_id) {
        toast({
          variant: "destructive",
          title: "Campo obbligatorio",
          description: "Seleziona un cliente",
        });
        return;
      }

      if (isEditMode && selectedJob) {
        updateJobMutation.mutate({ ...formData, id: selectedJob.id });
      } else {
        createJobMutation.mutate(formData);
      }
    } catch (error) {
      console.error("Errore durante l'invio del form:", error);
      toast({
        variant: "destructive",
        title: "Errore",
        description:
          "Si è verificato un errore durante il salvataggio. Riprova.",
      });
    }
  };

  const openEditDialog = (job: PhotoJob) => {
    setSelectedJob(job);
    setFormData({
      title: job.title,
      description: job.description || "",
      client_id: job.client_id,
      amount: job.amount.toString(),
      job_date: job.job_date
        ? new Date(job.job_date).toISOString().slice(0, 16)
        : new Date().toISOString().slice(0, 16),
      end_date: job.end_date
        ? new Date(job.end_date).toISOString().slice(0, 16)
        : "",
      status: job.status,
    });

    if (job.equipment_ids && Array.isArray(job.equipment_ids)) {
      setSelectedEquipment(job.equipment_ids);
    } else {
      setSelectedEquipment([]);
    }

    setSelectedPresetId("");
    setIsEditMode(true);
    setIsOpen(true);
  };

  const getStatusProgress = (status: PhotoJob["status"]) => {
    const statusValues = [
      "CONFIRMED",
      "DOWNLOADED",
      "IN_PROGRESS",
      "READY_FOR_DOWNLOAD",
      "READY_FOR_REVIEW",
      "PENDING_PAYMENT",
      "COMPLETED",
    ];
    const currentIndex = statusValues.indexOf(status);
    if (currentIndex === -1) return 0;
    return ((currentIndex + 1) / statusValues.length) * 100;
  };

  const getStatusIcon = (status: PhotoJob["status"]) => {
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
        return <RefreshCw className="h-4 w-4" />;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("it-IT", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fadeIn">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center space-y-4 md:space-y-0">
        <div>
          <h1 className="text-3xl font-medium text-foreground tracking-tight">
            Lavori
          </h1>
          <p className="text-muted-foreground">
            Gestisci i tuoi lavori fotografici e i progetti con i clienti
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
              <Button>
                <Camera className="mr-2 h-4 w-4" />
                Nuovo Lavoro
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>
                  {isEditMode
                    ? "Modifica Lavoro Fotografico"
                    : "Nuovo Lavoro Fotografico"}
                </DialogTitle>
                <DialogDescription>
                  {isEditMode
                    ? "Modifica i dettagli del lavoro fotografico selezionato."
                    : "Inserisci i dettagli per il nuovo lavoro fotografico."}
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit}>
                <div className="grid gap-4 py-4">
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="title" className="text-right">
                      Titolo *
                    </Label>
                    <Input
                      id="title"
                      name="title"
                      value={formData.title}
                      onChange={handleInputChange}
                      className="col-span-3"
                      required
                    />
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="client_id" className="text-right">
                      Cliente *
                    </Label>
                    {clientsLoading ? (
                      <div className="col-span-3 flex items-center space-x-2">
                        <Skeleton className="h-10 w-full" />
                      </div>
                    ) : (
                      <div className="col-span-3">
                        <select
                          id="client_id"
                          name="client_id"
                          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                          value={formData.client_id}
                          onChange={(e) =>
                            setFormData((prev) => ({
                              ...prev,
                              client_id: e.target.value,
                            }))
                          }
                        >
                          <option value="">Seleziona un cliente</option>
                          {clients && clients.length > 0 ? (
                            clients.map((client) => (
                              <option key={client.id} value={client.id}>
                                {client.name}
                              </option>
                            ))
                          ) : (
                            <option value="" disabled>
                              Nessun cliente disponibile
                            </option>
                          )}
                        </select>
                      </div>
                    )}
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="status" className="text-right">
                      Stato
                    </Label>
                    <div className="col-span-3">
                      <select
                        id="status"
                        name="status"
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                        value={formData.status}
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            status: e.target.value as PhotoJob["status"],
                          }))
                        }
                      >
                        {JOB_STATUSES.map((status) => (
                          <option key={status.value} value={status.value}>
                            {status.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="amount" className="text-right">
                      Importo €
                    </Label>
                    <Input
                      id="amount"
                      name="amount"
                      type="number"
                      min="0"
                      step="0.01"
                      value={formData.amount}
                      onChange={handleInputChange}
                      className="col-span-3"
                    />
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="job_date" className="text-right">
                      Data Inizio
                    </Label>
                    <Input
                      id="job_date"
                      name="job_date"
                      type="datetime-local"
                      value={formData.job_date || ""}
                      onChange={handleInputChange}
                      className="col-span-3"
                    />
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="end_date" className="text-right">
                      Data Fine
                    </Label>
                    <Input
                      id="end_date"
                      name="end_date"
                      type="datetime-local"
                      value={formData.end_date || ""}
                      onChange={handleInputChange}
                      className="col-span-3"
                    />
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="preset" className="text-right">
                      Preset Attrezzatura
                    </Label>
                    {presetsLoading ? (
                      <div className="col-span-3">
                        <Skeleton className="h-10 w-full" />
                      </div>
                    ) : (
                      <div className="col-span-3">
                        <select
                          id="preset"
                          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                          value={selectedPresetId}
                          onChange={(e) => handlePresetChange(e.target.value)}
                        >
                          <option value="">Seleziona un preset</option>
                          {presets && presets.length > 0 ? (
                            presets.map((preset) => (
                              <option key={preset.id} value={preset.id}>
                                {preset.name}
                              </option>
                            ))
                          ) : (
                            <option value="" disabled>
                              Nessun preset disponibile
                            </option>
                          )}
                        </select>
                      </div>
                    )}
                  </div>
                  <div className="grid grid-cols-4 items-start gap-4">
                    <Label className="text-right pt-2">Attrezzatura</Label>
                    <div className="col-span-3 border rounded-md p-3 max-h-60 overflow-y-auto bg-muted/30">
                      {equipmentLoading ? (
                        <Skeleton className="h-10 w-full" />
                      ) : equipmentData && equipmentData.length > 0 ? (
                        <div className="space-y-2">
                          {equipmentData.map((item) => (
                            <div
                              key={item.id}
                              className="flex items-center space-x-2 p-2 hover:bg-muted rounded-md"
                            >
                              <input
                                type="checkbox"
                                id={`equipment-${item.id}`}
                                checked={selectedEquipment.includes(item.id)}
                                onChange={() => handleEquipmentToggle(item.id)}
                                className="h-5 w-5 rounded border-gray-300 text-primary focus:ring-primary"
                              />
                              <label
                                htmlFor={`equipment-${item.id}`}
                                className="text-sm font-medium cursor-pointer flex-1"
                              >
                                {item.name}
                              </label>
                              {item.serial && (
                                <span className="text-xs text-muted-foreground">
                                  SN: {item.serial}
                                </span>
                              )}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-muted-foreground">
                          Nessuna attrezzatura disponibile
                        </p>
                      )}
                    </div>
                  </div>
                  {selectedEquipment.length > 0 && (
                    <div className="grid grid-cols-4 items-start gap-4">
                      <Label className="text-right pt-2">
                        Attrezzatura selezionata
                      </Label>
                      <div className="col-span-3 bg-primary/10 rounded-md p-3">
                        <ul className="list-disc pl-5 space-y-1">
                          {selectedEquipment.map((id) => {
                            const item = equipmentData?.find(
                              (e) => e.id === id
                            );
                            return item ? (
                              <li key={id} className="text-sm font-medium">
                                {item.name}
                                {item.serial && (
                                  <span className="text-xs text-muted-foreground ml-2">
                                    ({item.serial})
                                  </span>
                                )}
                              </li>
                            ) : null;
                          })}
                        </ul>
                      </div>
                    </div>
                  )}
                  <div className="grid grid-cols-4 items-start gap-4">
                    <Label htmlFor="description" className="text-right pt-2">
                      Descrizione
                    </Label>
                    <Textarea
                      id="description"
                      name="description"
                      value={formData.description}
                      onChange={handleInputChange}
                      className="col-span-3"
                      rows={4}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleCloseDialog}
                  >
                    Annulla
                  </Button>
                  <Button
                    type="submit"
                    disabled={
                      createJobMutation.isPending || updateJobMutation.isPending
                    }
                  >
                    {createJobMutation.isPending ||
                    updateJobMutation.isPending ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : isEditMode ? (
                      "Aggiorna"
                    ) : (
                      "Crea"
                    )}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>

          <Button
            variant="outline"
            size="sm"
            onClick={handleForceRefresh}
            disabled={isRefreshing}
          >
            {isRefreshing ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4 mr-2" />
            )}
            Aggiorna
          </Button>
        </div>
      </div>

      <Dialog open={clientPortalOpen} onOpenChange={setClientPortalOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Condividi Portale Cliente</DialogTitle>
            <DialogDescription>
              Il link per il portale cliente è stato generato.
              Puoi condividerlo direttamente con il cliente.
              CHIUDI E SCHIACCIA SU CONDIVIDI PER GENERARE IL LINK
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm text-muted-foreground mb-2">
              Il cliente potrà utilizzare questo link per vedere il progresso
              del lavoro e inserire commenti.
            </p>
            <div className="flex items-center gap-2">
              <div className="bg-secondary p-3 rounded-md text-xs font-mono overflow-x-auto flex-1">
                {selectedJob?.download_link &&
                  window.location.origin + selectedJob.download_link}
              </div>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => {
                  if (selectedJob?.download_link) {
                    navigator.clipboard.writeText(window.location.origin + selectedJob.download_link)
                      .then(() => {
                        toast({
                          title: "Link copiato",
                          description: "Il link è stato copiato negli appunti"
                        });
                      })
                      .catch(err => {
                        console.error('Errore durante la copia del link:', err);
                        toast({
                          variant: "destructive",
                          title: "Errore",
                          description: "Impossibile copiare il link negli appunti"
                        });
                      });
                  }
                }}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
                  <rect width="14" height="14" x="8" y="8" rx="2" ry="2"/>
                  <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/>
                </svg>
                <span className="ml-1">Copia</span>
              </Button>
            </div>
            {selectedJob?.portal_password && (
              <div className="mt-3">
                <p className="text-sm font-medium mb-2">Password di accesso:</p>
                <div className="bg-secondary p-3 rounded-md text-xs font-mono">
                  {selectedJob.portal_password}
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  Ricorda di comunicare questa password al cliente, sarà necessaria per accedere al portale.
                </p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button 
              variant="outline"
              onClick={() => {
                if (selectedJob) {
                  setShowPasswordField(true);
                  setPortalPassword(selectedJob.portal_password || "");
                  generateClientPortalLinkMutation.mutate({
                    jobId: selectedJob.id,
                    password: selectedJob.portal_password || ""
                  });
                }
              }}
              disabled={generateClientPortalLinkMutation.isPending}
            >
              {generateClientPortalLinkMutation.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4 mr-2" />
              )}
              Rigenera Link
            </Button>
            <Button onClick={() => setClientPortalOpen(false)}>Chiudi</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Card>
        <CardHeader>
          <CardTitle>I tuoi lavori fotografici</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Titolo</TableHead>
                <TableHead className="hidden md:table-cell">Cliente</TableHead>
                <TableHead className="hidden md:table-cell">Stato</TableHead>
                <TableHead className="hidden md:table-cell">Data</TableHead>
                <TableHead className="hidden md:table-cell">Importo</TableHead>
                <TableHead>Portale Cliente</TableHead>
                <TableHead>Azioni</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {jobs && jobs.length > 0 ? (
                jobs.map((job) => (
                  <TableRow key={job.id}>
                    <TableCell className="font-medium">
                      <div className="flex flex-col">
                        <span>{job.title}</span>
                        <span className="text-xs text-muted-foreground md:hidden">
                          {job.client?.name}
                        </span>
                        <div className="flex items-center gap-2 md:hidden">
                          {getStatusIcon(job.status)}
                          <span className="text-xs">
                            {JOB_STATUSES.find((s) => s.value === job.status)
                              ?.label || job.status}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 md:hidden mt-1">
                          <Calendar className="h-3 w-3" />
                          <span className="text-xs">
                            {job.job_date
                              ? formatDate(job.job_date)
                              : formatDate(job.created_at)}
                            {job.end_date && ` - ${formatDate(job.end_date)}`}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 md:hidden mt-1">
                          <DollarSign className="h-3 w-3" />
                          <span className="text-xs">
                            {job.amount ? job.amount.toFixed(2) : "0.00"} €
                          </span>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      {job.client?.name || "N/A"}
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-2">
                          {getStatusIcon(job.status)}
                          <span className="text-xs">
                            {JOB_STATUSES.find((s) => s.value === job.status)
                              ?.label || job.status}
                          </span>
                        </div>
                        <Progress
                          value={getStatusProgress(job.status)}
                          className="h-1.5"
                        />
                      </div>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      <div className="flex flex-col">
                        <span>
                          {job.job_date
                            ? formatDate(job.job_date)
                            : formatDate(job.created_at)}
                        </span>
                        {job.end_date && (
                          <span className="text-xs text-muted-foreground">
                            Fine: {formatDate(job.end_date)}
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      {job.amount ? job.amount.toFixed(2) : "0.00"} €
                    </TableCell>
                    <TableCell>
                      {job.download_link ? (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSelectedJob(job);
                            // Don't use clipboard API directly as it causes permission issues
                            setClientPortalOpen(true);
                          }}
                        >
                          <Share2 className="h-4 w-4 mr-2" />
                          Condividi
                        </Button>
                      ) : (
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setSelectedJob(job);
                                setShowPasswordField(true);
                              }}
                            >
                              Genera Link
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="sm:max-w-[425px]">
                            <DialogHeader>
                              <DialogTitle>Crea link per il cliente</DialogTitle>
                              <DialogDescription>
                                Genera un link sicuro da condividere con il cliente. Puoi opzionalmente impostare una password.
                              </DialogDescription>
                            </DialogHeader>
                            <div className="py-4">
                              <div className="space-y-4">
                                <div className="flex items-start space-x-2">
                                  <div className="flex-1 space-y-1">
                                    <Label htmlFor="portalPassword">Password (opzionale)</Label>
                                    <Input
                                      id="portalPassword"
                                      placeholder="Inserisci una password"
                                      value={portalPassword}
                                      onChange={(e) => setPortalPassword(e.target.value)}
                                    />
                                    <p className="text-xs text-muted-foreground">
                                      Se specificata, il cliente dovrà inserirla per accedere al portale
                                    </p>
                                  </div>
                                </div>
                              </div>
                            </div>
                            <DialogFooter>
                              <Button
                                onClick={() => {
                                  generateClientPortalLinkMutation.mutate({
                                    jobId: job.id,
                                    password: portalPassword
                                  });
                                }}
                                disabled={generateClientPortalLinkMutation.isPending}
                              >
                                {generateClientPortalLinkMutation.isPending ? (
                                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                ) : null}
                                Genera Link
                              </Button>
                            </DialogFooter>
                          </DialogContent>
                        </Dialog>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openEditDialog(job)}
                        >
                          <Edit className="h-4 w-4" />
                          <span className="sr-only">Modifica</span>
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            if (
                              window.confirm(
                                "Sei sicuro di voler eliminare questo lavoro?"
                              )
                            ) {
                              try {
                                deleteJobMutation.mutate(job.id);
                              } catch (error) {
                                console.error("Errore durante l'eliminazione:", error);
                                toast({
                                  variant: "destructive",
                                  title: "Errore",
                                  description: `Si è verificato un errore durante l'eliminazione: ${error}`
                                });
                              }
                            }
                          }}
                          className="text-red-500 hover:text-red-700"
                        >
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            width="16"
                            height="16"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            className="h-4 w-4"
                          >
                            <path d="M3 6h18"></path>
                            <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path>
                            <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path>
                          </svg>
                          <span className="sr-only">Elimina</span>
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            const dialogRef = document.createElement("dialog");
                            dialogRef.className = "p-4 rounded-lg shadow-lg";

                            const client = clients?.find(
                              (c) => c.id === job.client_id
                            );

                            let jobEquipment = [];
                            if (
                              job.equipment_ids &&
                              Array.isArray(job.equipment_ids) &&
                              equipmentData
                            ) {
                              jobEquipment = equipmentData.filter((e) =>
                                job.equipment_ids.includes(e.id)
                              );
                            }

                            const dialogContent = document.createElement("div");
                            dialogContent.innerHTML = `
                              <h3 class="text-lg font-medium mb-4">Scarica PDF</h3>
                              <div id="pdf-buttons"></div>
                              <div class="mt-4 text-right">
                                <button class="px-4 py-2 bg-gray-200 rounded-md">Chiudi</button>
                              </div>
                            `;

                            dialogRef.appendChild(dialogContent);
                            document.body.appendChild(dialogRef);

                            const closeButton =
                              dialogRef.querySelector("button");
                            closeButton.addEventListener("click", () => {
                              dialogRef.close();
                              document.body.removeChild(dialogRef);
                            });

                            const pdfContainer =
                              dialogRef.querySelector("#pdf-buttons");
                            const pdfRoot = document.createElement("div");
                            pdfContainer.appendChild(pdfRoot);

                            dialogRef.showModal();

                            // Use the imported createRoot function
                            const root = createRoot(pdfRoot);
                            root.render(
                              <JobPdfGenerator
                                job={job}
                                client={client}
                                equipment={jobEquipment}
                                allJobs={jobs}
                                allClients={clients}
                                allEquipment={equipmentData}
                              />
                            );
                          }}
                        >
                          <Printer className="h-4 w-4" />
                          <span className="sr-only">Stampa/PDF</span>
                        </Button>
                        <select
                          className="h-8 px-2 rounded-md border border-input bg-background text-sm"
                          value={job.status}
                          onChange={(e) =>
                            updateStatusMutation.mutate({
                              jobId: job.id,
                              status: e.target.value as PhotoJob["status"],
                            })
                          }
                        >
                          <option value="" disabled>
                            Cambia stato
                          </option>
                          {JOB_STATUSES.map((status) => (
                            <option key={status.value} value={status.value}>
                              {status.label}
                            </option>
                          ))}
                        </select>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8">
                    <div className="flex flex-col items-center gap-2">
                      <Camera className="h-8 w-8 text-muted-foreground" />
                      <p className="text-muted-foreground">
                        Nessun lavoro fotografico. Crea il tuo primo lavoro!
                      </p>
                      <Button
                        variant="outline"
                        onClick={() => setIsOpen(true)}
                        className="mt-2"
                      >
                        Nuovo Lavoro
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}