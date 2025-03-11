import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
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
import { apiRequest, getQueryFn } from "@/lib/queryClient";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
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
  User,
  MessageSquare,
  BadgeCheck,
  ArrowRight,
  Link as LinkIcon,
  Lock,
  ExternalLink,
  Copy,
  Send,
  ChevronRight,
} from "lucide-react";
import JobPdfGenerator from "@/components/photo-jobs/JobPdfGenerator";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";

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
  password?: string;
  equipment_ids?: string[];
  created_at: string;
  updated_at: string;
  client?: {
    name: string;
    email: string;
  };
  comments?: Comment[];
};

type Comment = {
  id: string;
  job_id: string;
  content: string;
  created_at: string;
  is_from_client: boolean;
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
  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false);
  const [linkPassword, setLinkPassword] = useState("");
  const [selectedPresetId, setSelectedPresetId] = useState<string>("");
  const [equipment, setEquipment] = useState<Array<any>>([]);
  const [selectedEquipment, setSelectedEquipment] = useState<Array<any>>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  // Variabili per il client portal integrato
  const [activeTab, setActiveTab] = useState<string>("jobs");
  const [jobForClientPortal, setJobForClientPortal] = useState<PhotoJob | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState<string>("");
  const [submittingComment, setSubmittingComment] = useState<boolean>(false);
  const [passwordVerified, setPasswordVerified] = useState<boolean>(false);
  const [passwordError, setPasswordError] = useState<string>("");
  const [inputPassword, setInputPassword] = useState<string>("");

  // Query per ottenere i clienti
  const {
    data: clients,
    isLoading: clientsLoading,
  } = useQuery<Client[]>({
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
      toast({
        variant: "destructive",
        title: "Errore",
        description: `Si è verificato un errore: ${error.message}`,
      });
    },
  });

  const generateClientPortalLinkMutation = useMutation({
    mutationFn: async ({jobId, password}: {jobId: string, password: string}) => {
      if (!password || password.trim() === '') {
        throw new Error("La password non può essere vuota");
      }
      
      const expiryDate = new Date();
      expiryDate.setDate(expiryDate.getDate() + 30);

      const portalToken = `portal_${jobId}_${Math.random().toString(36).substring(2, 15)}`;

      const { data, error } = await supabase
        .from("photo_jobs")
        .update({
          download_link: `/client-portal/${portalToken}`,
          download_expiry: expiryDate.toISOString(),
          password: password // Salviamo la password
        })
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
          "Il link protetto da password per il portale cliente è stato generato con successo",
      });

      if (data.download_link) {
        // Non utilizziamo più il clipboard automatico che causa problemi di permessi
        // Mostreremo invece il link per la copia manuale
        setClientPortalOpen(true);
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
  
  // Funzione per formattare la data con ora
  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("it-IT", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });
  };
  
  // Funzione per ottenere lo stato del lavoro per il client portal
  const getStatusLabel = (status: string) => {
    const statusMap: Record<string, string> = {
      'CONFIRMED': '✅ Lavoro confermato',
      'DOWNLOADED': '📂 Lavoro scaricato',
      'IN_PROGRESS': '🛠 In lavorazione',
      'READY_FOR_DOWNLOAD': '📤 Pronto per il download',
      'READY_FOR_REVIEW': '👁 Pronto per le revisioni',
      'PENDING_PAYMENT': '💳 In attesa di pagamento',
      'COMPLETED': '🏁 Completato'
    };
    return statusMap[status] || status;
  };
  
  // Funzione per ottenere i commenti di un lavoro
  const fetchJobComments = async (jobId: string) => {
    try {
      setSubmittingComment(true);
      const { data, error } = await supabase
        .from('job_comments')
        .select('*')
        .eq('job_id', jobId)
        .order('created_at', { ascending: true });
        
      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Errore nel caricamento dei commenti:', error);
      toast({
        variant: "destructive",
        title: "Errore",
        description: "Impossibile caricare i commenti. Riprova più tardi.",
      });
      return [];
    } finally {
      setSubmittingComment(false);
    }
  };
  
  // Funzione per verificare la password del client portal
  const verifyPassword = async (job: PhotoJob, password: string) => {
    setSubmittingComment(true);
    setPasswordError("");
    
    try {
      if (!job || !job.password) {
        throw new Error("Informazioni sul lavoro mancanti");
      }
      
      // Verifica la password
      if (job.password !== password) {
        setPasswordError("Password non corretta. Riprova.");
        return false;
      }
      
      // Password corretta
      setPasswordVerified(true);
      
      // Carica i commenti
      const commentsData = await fetchJobComments(job.id);
      setComments(commentsData);
      
      toast({
        title: "Accesso effettuato",
        description: "Password verificata con successo",
      });
      
      return true;
    } catch (error) {
      console.error('Errore nella verifica della password:', error);
      setPasswordError("Si è verificato un errore. Riprova.");
      return false;
    } finally {
      setSubmittingComment(false);
    }
  };
  
  // Funzione per aggiungere un commento
  const handleAddComment = async (isFromClient: boolean = false) => {
    if (!newComment.trim() || !jobForClientPortal) return;
    
    setSubmittingComment(true);
    
    try {
      const { data, error } = await supabase
        .from('job_comments')
        .insert([
          {
            job_id: jobForClientPortal.id,
            text: newComment,
            client_name: 'Cliente',
            is_read: false
          }
        ])
        .select()
        .single();
        
      if (error) throw error;
      
      setComments([...comments, data]);
      setNewComment('');
      
      toast({
        title: "Commento aggiunto",
        description: "Il commento è stato aggiunto con successo",
      });
    } catch (error) {
      console.error('Errore durante l\'aggiunta del commento:', error);
      toast({
        variant: "destructive",
        title: "Errore",
        description: "Non è stato possibile aggiungere il commento",
      });
    } finally {
      setSubmittingComment(false);
    }
  };
  
  // Funzione per approvare il lavoro
  const handleApproveWork = async () => {
    if (!jobForClientPortal) return;
    
    setSubmittingComment(true);
    
    try {
      // Aggiunge un commento di approvazione
      const { data: commentData, error: commentError } = await supabase
        .from('job_comments')
        .insert([
          {
            job_id: jobForClientPortal.id,
            content: "Lavoro approvato senza modifiche.",
            is_from_client: true
          }
        ])
        .select()
        .single();
      
      if (commentError) throw commentError;
      
      // Aggiorna lo stato del lavoro
      const { data: jobData, error: jobError } = await supabase
        .from('photo_jobs')
        .update({ status: 'PENDING_PAYMENT' })
        .eq('id', jobForClientPortal.id)
        .select()
        .single();
        
      if (jobError) throw jobError;
      
      // Aggiorna i dati locali
      setJobForClientPortal(jobData);
      setComments([...comments, commentData]);
      
      // Aggiorna i dati nella cache
      queryClient.invalidateQueries({ queryKey: ["photo-jobs"] });
      
      toast({
        title: "Lavoro approvato",
        description: "Il lavoro è stato approvato e ora è in attesa di pagamento",
      });
    } catch (error) {
      console.error('Errore durante l\'approvazione del lavoro:', error);
      toast({
        variant: "destructive",
        title: "Errore",
        description: "Non è stato possibile approvare il lavoro",
      });
    } finally {
      setSubmittingComment(false);
    }
  };
  
  // Funzione per aprire il client portal
  const openClientPortal = async (job: PhotoJob) => {
    setJobForClientPortal(job);
    setActiveTab("client-portal");
    setPasswordVerified(false);
    setInputPassword("");
    setPasswordError("");
    setComments([]);
    
    // Se il job non ha password, carica direttamente i commenti
    if (!job.password) {
      const commentsData = await fetchJobComments(job.id);
      setComments(commentsData);
      setPasswordVerified(true);
    }
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
            Gestisci i tuoi lavori e i progetti con i clienti
          </p>
        </div>
        
        {activeTab === "jobs" && (
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
                    {/* Contenuto del form qui */}
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
        )}
      </div>
      
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2 mb-4">
          <TabsTrigger value="jobs">
            <Camera className="mr-2 h-4 w-4" />
            Lavori Fotografici
          </TabsTrigger>
          <TabsTrigger value="client-portal">
            <User className="mr-2 h-4 w-4" /> 
            Client Portal
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="jobs" className="space-y-4">
          {/* Dialog per la condivisione del link esistente */}
          <Dialog open={clientPortalOpen} onOpenChange={setClientPortalOpen}>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>Condividi Portale Cliente</DialogTitle>
                <DialogDescription>
                  Il link per il portale cliente è stato generato con successo.
                  Puoi condividerlo direttamente con il cliente.
                </DialogDescription>
              </DialogHeader>
              <div className="py-4">
                <p className="text-sm text-muted-foreground mb-2">
                  Il cliente potrà utilizzare questo link per vedere il progresso
                  del lavoro e inserire commenti. Il link è protetto con password.
                </p>
                <div className="bg-secondary p-3 rounded-md text-xs font-mono overflow-x-auto">
                  {selectedJob?.download_link &&
                    window.location.origin + selectedJob.download_link}
                </div>
                <div className="mt-4">
                  <p className="text-sm font-medium mb-1">Password:</p>
                  <div className="bg-secondary p-3 rounded-md text-xs font-mono">
                    {linkPassword}
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    Ricorda di comunicare questa password al cliente in modo sicuro.
                  </p>
                </div>
              </div>
              <DialogFooter>
                <Button onClick={() => setClientPortalOpen(false)}>Chiudi</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          
          {/* Dialog per inserire la password quando si genera un nuovo link */}
          <Dialog open={passwordDialogOpen} onOpenChange={setPasswordDialogOpen}>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>Proteggi con Password</DialogTitle>
                <DialogDescription>
                  Crea una password per proteggere il link del portale cliente.
                </DialogDescription>
              </DialogHeader>
              <div className="py-4">
                <Label htmlFor="link-password" className="mb-2 block">Password</Label>
                <Input
                  id="link-password"
                  type="text"
                  value={linkPassword}
                  onChange={(e) => setLinkPassword(e.target.value)}
                  placeholder="Inserisci una password sicura"
                  className="w-full"
                />
                <p className="text-xs text-muted-foreground mt-2">
                  La password deve essere comunicata al cliente per accedere alle foto.
                </p>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setPasswordDialogOpen(false)}>Annulla</Button>
                <Button 
                  onClick={() => {
                    if (selectedJob) {
                      generateClientPortalLinkMutation.mutate({
                        jobId: selectedJob.id,
                        password: linkPassword
                      });
                      setPasswordDialogOpen(false);
                    }
                  }}
                  disabled={!linkPassword || linkPassword.trim() === "" || generateClientPortalLinkMutation.isPending}
                >
                  {generateClientPortalLinkMutation.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      Generazione...
                    </>
                  ) : (
                    "Genera Link"
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Card>
            <CardHeader>
              <CardTitle>I tuoi lavori</CardTitle>
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
                            <div className="flex gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  setSelectedJob(job);
                                  setLinkPassword(job.password || "");
                                  setClientPortalOpen(true);
                                }}
                              >
                                <Share2 className="h-4 w-4 mr-2" />
                                Condividi
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => openClientPortal(job)}
                              >
                                <User className="h-4 w-4 mr-2" />
                                Apri
                              </Button>
                            </div>
                          ) : (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setSelectedJob(job);
                                setPasswordDialogOpen(true);
                                setLinkPassword("");
                              }}
                              disabled={generateClientPortalLinkMutation.isPending}
                            >
                              {generateClientPortalLinkMutation.isPending ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                "Genera Link"
                              )}
                            </Button>
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
                                  deleteJobMutation.mutate(job.id);
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
                      <TableCell colSpan={7} className="text-center">
                        Nessun lavoro trovato. Crea il tuo primo lavoro fotografico.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="client-portal" className="space-y-4">
          {!jobForClientPortal ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center p-8">
                <User className="h-16 w-16 text-muted-foreground opacity-20 mb-4" />
                <h3 className="text-xl font-medium mb-2">Nessun lavoro selezionato</h3>
                <p className="text-muted-foreground text-center max-w-md mb-6">
                  Seleziona un lavoro dalla tabella per visualizzare o generare un portale cliente.
                  Puoi condividere un link protetto da password con i tuoi clienti.
                </p>
                <Button onClick={() => setActiveTab("jobs")}>
                  <Camera className="mr-2 h-4 w-4" />
                  Vai alla lista dei lavori
                </Button>
              </CardContent>
            </Card>
          ) : jobForClientPortal.password && !passwordVerified ? (
            <Card>
              <CardHeader>
                <CardTitle>Accesso Protetto</CardTitle>
                <div className="flex items-center gap-2 mt-2">
                  <BadgeCheck className="h-5 w-5 text-primary" />
                  <span className="text-sm font-medium">{jobForClientPortal.title}</span>
                </div>
              </CardHeader>
              <CardContent className="max-w-md mx-auto">
                <div className="text-center mb-6">
                  <Lock className="h-12 w-12 text-primary mx-auto mb-4" />
                  <p className="text-muted-foreground">
                    Questo contenuto è protetto da password. Inserisci la password per accedere.
                  </p>
                </div>
                
                <form onSubmit={(e) => {
                  e.preventDefault();
                  verifyPassword(jobForClientPortal, inputPassword);
                }}>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="password">Password</Label>
                      <Input
                        id="password"
                        type="password"
                        placeholder="Inserisci la password"
                        value={inputPassword}
                        onChange={(e) => setInputPassword(e.target.value)}
                        className={passwordError ? "border-red-500" : ""}
                      />
                      {passwordError && (
                        <p className="text-sm text-red-500">{passwordError}</p>
                      )}
                    </div>
                    <Button 
                      type="submit" 
                      className="w-full" 
                      disabled={!inputPassword || submittingComment}
                    >
                      {submittingComment ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Verifica...
                        </>
                      ) : (
                        "Accedi"
                      )}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          ) : (
            <>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <BadgeCheck className="h-5 w-5 text-primary" />
                  <h2 className="text-xl font-bold">{jobForClientPortal.title}</h2>
                </div>
                {jobForClientPortal.download_link && (
                  <Badge className="cursor-pointer" onClick={() => {
                    setSelectedJob(jobForClientPortal);
                    setLinkPassword(jobForClientPortal.password || "");
                    setClientPortalOpen(true);
                  }}>
                    <LinkIcon className="h-3 w-3 mr-1" />
                    Link Condivisione
                  </Badge>
                )}
              </div>
              
              <Tabs defaultValue="details" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="details">Dettagli Lavoro</TabsTrigger>
                  <TabsTrigger value="comments">Revisioni e Commenti</TabsTrigger>
                </TabsList>
                
                <TabsContent value="details" className="mt-4">
                  <Card>
                    <CardHeader>
                      <CardTitle>{jobForClientPortal.title}</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm text-muted-foreground">
                            Stato: {getStatusLabel(jobForClientPortal.status)}
                          </span>
                        </div>
                        <Progress value={getStatusProgress(jobForClientPortal.status)} className="h-2" />
                      </div>
                      
                      <Separator />
                      
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm">Data creazione: {formatDate(jobForClientPortal.created_at)}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Camera className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm">Importo: {jobForClientPortal.amount.toFixed(2)} €</span>
                        </div>
                      </div>
                      
                      <Separator />
                      
                      <div>
                        <h3 className="font-medium mb-2">Descrizione</h3>
                        <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                          {jobForClientPortal.description || "Nessuna descrizione disponibile"}
                        </p>
                      </div>
                      
                      {jobForClientPortal.status === 'READY_FOR_REVIEW' && (
                        <div className="mt-4 p-4 bg-primary/10 rounded-lg">
                          <h3 className="font-medium mb-2 flex items-center gap-2">
                            <CheckCircle className="h-5 w-5 text-primary" />
                            Revisioni disponibili
                          </h3>
                          <p className="text-sm text-muted-foreground mb-3">
                            Il lavoro è pronto per le revisioni. Vai alla scheda "Revisioni e Commenti" per fornire feedback o approvare il lavoro.
                          </p>
                          <Button 
                            variant="outline" 
                            onClick={() => {
                              const tabsElement = document.querySelector('[role="tablist"]');
                              if (tabsElement) {
                                const commentTab = tabsElement.querySelectorAll('[role="tab"]')[1];
                                if (commentTab) {
                                  commentTab.click();
                                }
                              }
                            }}
                            className="w-full"
                          >
                            Vai alle revisioni
                            <ArrowRight className="ml-2 h-4 w-4" />
                          </Button>
                        </div>
                      )}
                      
                      {jobForClientPortal.status === 'PENDING_PAYMENT' && (
                        <div className="mt-4 p-4 bg-amber-500/10 rounded-lg">
                          <h3 className="font-medium mb-2 flex items-center gap-2 text-amber-500">
                            <CheckCircle className="h-5 w-5" />
                            In attesa di pagamento
                          </h3>
                          <p className="text-sm text-muted-foreground">
                            Il lavoro è stato approvato ed è in attesa di pagamento. Il fotografo ti contatterà per i dettagli sul pagamento.
                          </p>
                        </div>
                      )}
                      
                      {jobForClientPortal.status === 'COMPLETED' && (
                        <div className="mt-4 p-4 bg-green-500/10 rounded-lg">
                          <h3 className="font-medium mb-2 flex items-center gap-2 text-green-500">
                            <CheckCircle className="h-5 w-5" />
                            Lavoro completato
                          </h3>
                          <p className="text-sm text-muted-foreground">
                            Il lavoro è stato completato. Grazie per la fiducia!
                          </p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>
                
                <TabsContent value="comments" className="mt-4">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <MessageSquare className="h-5 w-5" />
                        Revisioni e Commenti
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4 max-h-[400px] overflow-y-auto p-1">
                        {comments.length > 0 ? (
                          comments.map((comment) => (
                            <div 
                              key={comment.id} 
                              className={`p-3 rounded-lg ${
                                comment.is_from_client 
                                  ? "bg-primary/10 ml-8" 
                                  : "bg-secondary mr-8"
                              }`}
                            >
                              <div className="flex items-center gap-2 mb-1">
                                <Avatar className="h-6 w-6">
                                  <AvatarFallback>
                                    {comment.is_from_client ? "C" : "P"}
                                  </AvatarFallback>
                                </Avatar>
                                <span className="text-xs font-medium">
                                  {comment.is_from_client 
                                    ? jobForClientPortal.client?.name || "Cliente" 
                                    : "Fotografo"}
                                </span>
                                <span className="text-xs text-muted-foreground ml-auto">
                                  {formatDateTime(comment.created_at)}
                                </span>
                              </div>
                              <p className="text-sm whitespace-pre-wrap">{comment.content}</p>
                            </div>
                          ))
                        ) : (
                          <div className="text-center py-8">
                            <MessageSquare className="h-10 w-10 text-muted-foreground mx-auto mb-2 opacity-50" />
                            <p className="text-muted-foreground">
                              Nessun commento disponibile. Sii il primo a lasciare un commento.
                            </p>
                          </div>
                        )}
                      </div>
                    </CardContent>
                    <CardFooter className="flex flex-col gap-3 pt-2">
                      {jobForClientPortal.status === 'READY_FOR_REVIEW' ? (
                        <>
                          <Textarea 
                            placeholder="Scrivi qui il tuo commento o le tue richieste di modifica..."
                            value={newComment}
                            onChange={(e) => setNewComment(e.target.value)}
                            rows={3}
                            className="w-full"
                          />
                          <div className="flex gap-2 w-full">
                            <Button 
                              variant="outline" 
                              className="flex-1"
                              onClick={handleApproveWork}
                              disabled={submittingComment}
                            >
                              Approva senza modifiche
                            </Button>
                            <Button 
                              className="flex-1"
                              onClick={() => handleAddComment(false)}
                              disabled={!newComment.trim() || submittingComment}
                            >
                              {submittingComment ? (
                                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                              ) : "Invia commento"}
                            </Button>
                          </div>
                        </>
                      ) : (
                        <div className="text-center w-full py-3">
                          <p className="text-sm text-muted-foreground">
                            {jobForClientPortal.status === 'PENDING_PAYMENT' || jobForClientPortal.status === 'COMPLETED' 
                              ? "Il lavoro è già stato approvato."
                              : "I commenti saranno disponibili quando il lavoro sarà pronto per le revisioni."}
                          </p>
                        </div>
                      )}
                    </CardFooter>
                  </Card>
                </TabsContent>
              </Tabs>
            </>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}