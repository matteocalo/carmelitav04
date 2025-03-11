import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardFooter, CardDescription } from "@/components/ui/card";
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
import { supabase } from "@/lib/supabase";
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
  Users,
  Trash2,
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
      
      try {
        const response = await apiRequest('/api/photo-jobs', {
          method: 'GET'
        });
        return response || [];
      } catch (error) {
        console.error("Errore durante il recupero dei lavori fotografici:", error);
        // Fallback a Supabase per compatibilità con il codice esistente
        const { data, error: supabaseError } = await supabase
          .from("photo_jobs")
          .select(
            `
            *,
            client:clients(name, email)
          `
          )
          .eq("user_id", user.id)
          .order("job_date", { ascending: true });

        if (supabaseError) throw supabaseError;
        return data || [];
      }
    },
    enabled: !!user,
  });

  const createJobMutation = useMutation({
    mutationFn: async (newJob: typeof formData) => {
      if (!user) throw new Error("Utente non autenticato");

      try {
        const response = await apiRequest('/api/photo-jobs', {
          method: 'POST',
          body: JSON.stringify({
            title: newJob.title,
            description: newJob.description,
            client_id: newJob.client_id,
            status: newJob.status,
            amount: parseFloat(newJob.amount) || 0,
            job_date: newJob.job_date,
            end_date: newJob.end_date || null,
            equipment_ids: selectedEquipment.length > 0 ? selectedEquipment : null,
          })
        });
        return response;
      } catch (error) {
        console.error("Errore durante la creazione del lavoro:", error);
        // Fallback a Supabase
        const { data, error: supabaseError } = await supabase
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

        if (supabaseError) throw supabaseError;
        return data;
      }
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

      try {
        const response = await apiRequest(`/api/photo-jobs/${updatedJob.id}`, {
          method: 'PATCH',
          body: JSON.stringify({
            title: updatedJob.title,
            description: updatedJob.description,
            client_id: updatedJob.client_id,
            status: updatedJob.status,
            amount: parseFloat(updatedJob.amount) || 0,
            job_date: updatedJob.job_date,
            end_date: updatedJob.end_date || null,
            equipment_ids: selectedEquipment.length > 0 ? selectedEquipment : null,
          })
        });
        return response;
      } catch (error) {
        console.error("Errore durante l'aggiornamento del lavoro:", error);
        // Fallback a Supabase
        const { data, error: supabaseError } = await supabase
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

        if (supabaseError) throw supabaseError;
        return data;
      }
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
      try {
        const response = await apiRequest(`/api/photo-jobs/${jobId}`, {
          method: 'PATCH',
          body: JSON.stringify({ status })
        });
        return response;
      } catch (error) {
        console.error("Errore durante l'aggiornamento dello stato:", error);
        // Fallback a Supabase
        const { data, error: supabaseError } = await supabase
          .from("photo_jobs")
          .update({ status })
          .eq("id", jobId)
          .select()
          .single();

        if (supabaseError) throw supabaseError;
        return data;
      }
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
      try {
        await apiRequest(`/api/photo-jobs/${jobId}`, {
          method: 'DELETE'
        });
        return true;
      } catch (error) {
        console.error("Errore durante l'eliminazione del lavoro:", error);
        // Fallback a Supabase
        const { error: supabaseError } = await supabase
          .from("photo_jobs")
          .delete()
          .eq("id", jobId);

        if (supabaseError) throw supabaseError;
        return true;
      }
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
      
      try {
        const response = await apiRequest(`/api/photo-jobs/${jobId}`, {
          method: 'PATCH',
          body: JSON.stringify({
            password: password
          })
        });
        return response;
      } catch (error) {
        console.error("Errore durante la generazione del link:", error);
        // Fallback a Supabase
        const expiryDate = new Date();
        expiryDate.setDate(expiryDate.getDate() + 30);

        const portalToken = `portal_${jobId}_${Math.random().toString(36).substring(2, 15)}`;

        const { data, error: supabaseError } = await supabase
          .from("photo_jobs")
          .update({
            download_link: `/client-portal/${portalToken}`,
            download_expiry: expiryDate.toISOString(),
            password: password // Salviamo la password
          })
          .eq("id", jobId)
          .select()
          .single();

        if (supabaseError) throw supabaseError;
        return data;
      }
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["photo-jobs"] });
      toast({
        title: "Password impostata",
        description:
          "La password per l'accesso del cliente è stata impostata con successo",
      });

      setClientPortalOpen(true);
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Errore",
        description: `Si è verificato un errore: ${error.message}`,
      });
    },
  });

  const addCommentMutation = useMutation({
    mutationFn: async ({ jobId, content }: { jobId: string; content: string }) => {
      try {
        const response = await apiRequest(`/api/photo-jobs/${jobId}/comments`, {
          method: 'POST',
          body: JSON.stringify({ content })
        });
        return response;
      } catch (error) {
        console.error("Errore durante l'aggiunta del commento:", error);
        // Fallback a Supabase
        const { data, error: supabaseError } = await supabase
          .from("photo_job_comments")
          .insert([
            {
              job_id: jobId,
              content,
              is_from_client: false
            }
          ])
          .select()
          .single();

        if (supabaseError) throw supabaseError;
        return data;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["photo-jobs"] });
      setNewComment("");
      toast({
        title: "Commento aggiunto",
        description: "Il tuo commento è stato aggiunto con successo",
      });
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Errore",
        description: `Si è verificato un errore: ${error.message}`,
      });
    }
  });

  const verifyPasswordMutation = useMutation({
    mutationFn: async ({ jobId, password }: { jobId: string; password: string }) => {
      try {
        const response = await apiRequest(`/api/photo-jobs/${jobId}/verify-password`, {
          method: 'POST',
          body: JSON.stringify({ password })
        });
        return response;
      } catch (error) {
        console.error("Errore durante la verifica della password:", error);
        throw error;
      }
    },
    onSuccess: (data) => {
      setPasswordVerified(true);
      setPasswordError("");
      // Impostiamo il lavoro per il portale cliente
      if (data.job) {
        setJobForClientPortal(data.job);
      }
      
      // Estraiamo e impostiamo i commenti
      if (data.job && data.job.comments) {
        setComments(data.job.comments);
      }
    },
    onError: (error: Error) => {
      setPasswordVerified(false);
      setPasswordError("Password non valida. Riprova.");
      toast({
        variant: "destructive",
        title: "Errore",
        description: `Password non valida: ${error.message}`,
      });
    }
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
      amount: job.amount?.toString() || "0",
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

  const calculateProgressPercentage = (status: PhotoJob["status"]) => {
    const statusValues = [
      "TBC",
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

  const handleSubmitComment = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newComment.trim() || !jobForClientPortal) {
      return;
    }
    
    setSubmittingComment(true);
    
    addCommentMutation.mutate(
      { 
        jobId: jobForClientPortal.id,
        content: newComment
      },
      {
        onSettled: () => {
          setSubmittingComment(false);
        }
      }
    );
  };

  const verifyPassword = async (job: PhotoJob, password: string) => {
    if (!password.trim()) {
      setPasswordError("La password è obbligatoria");
      return;
    }
    
    verifyPasswordMutation.mutate({
      jobId: job.id,
      password
    });
  };

  const openClientPortal = (job: PhotoJob) => {
    setJobForClientPortal(job);
    setPasswordVerified(false);
    setPasswordError("");
    setInputPassword("");
    setActiveTab("portal");
    
    // Carichiamo i commenti dal job se disponibili
    if (job.comments) {
      setComments(job.comments);
    } else {
      setComments([]);
    }
    
    // Se il lavoro non ha password, consideriamo l'accesso già verificato
    if (!job.password) {
      setPasswordVerified(true);
    }
  };

  // Formattazione data
  const formatDate = (dateString?: string) => {
    if (!dateString) return "N/D";
    const date = new Date(dateString);
    return date.toLocaleDateString("it-IT", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };

  if (isLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">Lavori fotografici</h1>
          <Skeleton className="h-10 w-24" />
        </div>
        <div className="grid gap-4">
          {Array.from({ length: 3 }).map((_, index) => (
            <Skeleton key={index} className="h-24 w-full" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 md:p-6">
      <Tabs 
        defaultValue="jobs" 
        value={activeTab} 
        onValueChange={setActiveTab}
        className="w-full"
      >
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold">Lavori fotografici</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Gestisci i tuoi lavori fotografici e il portale cliente
            </p>
          </div>
          <div className="flex gap-2 mt-4 md:mt-0">
            <TabsList>
              <TabsTrigger value="jobs" className="flex items-center gap-1.5">
                <Camera className="h-4 w-4" />
                <span>Lavori</span>
              </TabsTrigger>
              <TabsTrigger value="portal" className="flex items-center gap-1.5">
                <Users className="h-4 w-4" />
                <span>Portale cliente</span>
              </TabsTrigger>
            </TabsList>
            <Button onClick={() => {
              setIsOpen(true);
              setIsEditMode(false);
              setFormData(initialFormState);
            }}>
              Nuovo lavoro
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={handleForceRefresh}
              disabled={isRefreshing}
            >
              {isRefreshing ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>

        <TabsContent value="jobs" className="mt-0">
          {jobs && jobs.length > 0 ? (
            <div className="grid gap-4">
              <Card>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Cliente</TableHead>
                        <TableHead>Titolo</TableHead>
                        <TableHead className="hidden md:table-cell">
                          Data
                        </TableHead>
                        <TableHead className="hidden md:table-cell">
                          Stato
                        </TableHead>
                        <TableHead className="hidden md:table-cell">
                          Importo
                        </TableHead>
                        <TableHead className="hidden md:table-cell">
                          Link Cliente
                        </TableHead>
                        <TableHead className="text-right">Azioni</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {jobs.map((job) => (
                        <TableRow key={job.id}>
                          <TableCell>
                            <div className="font-medium">
                              {job.client?.name || "Cliente sconosciuto"}
                            </div>
                            <div className="text-sm text-muted-foreground md:hidden">
                              {formatDate(job.job_date)}
                            </div>
                            <div className="md:hidden flex items-center mt-1">
                              <Badge
                                variant="outline"
                                className="flex gap-1 items-center"
                              >
                                {getStatusIcon(job.status)}
                                {
                                  JOB_STATUSES.find(
                                    (s) => s.value === job.status
                                  )?.label.split(" ")[1] || job.status
                                }
                              </Badge>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="font-medium">{job.title}</div>
                            <div className="md:hidden">
                              {job.amount > 0 && (
                                <div className="text-sm text-muted-foreground flex items-center gap-1">
                                  <DollarSign className="h-3 w-3" />
                                  {job.amount.toFixed(2)}€
                                </div>
                              )}
                            </div>
                            <div className="w-full mt-1 md:hidden">
                              <Progress
                                value={calculateProgressPercentage(job.status)}
                                className="h-2"
                              />
                            </div>
                          </TableCell>
                          <TableCell className="hidden md:table-cell">
                            {formatDate(job.job_date)}
                            {job.end_date && (
                              <div className="text-xs text-muted-foreground">
                                Fine: {formatDate(job.end_date)}
                              </div>
                            )}
                          </TableCell>
                          <TableCell className="hidden md:table-cell">
                            <div className="flex flex-col gap-1">
                              <Badge
                                variant="outline"
                                className="w-fit flex gap-1 items-center"
                              >
                                {getStatusIcon(job.status)}
                                {
                                  JOB_STATUSES.find(
                                    (s) => s.value === job.status
                                  )?.label || job.status
                                }
                              </Badge>
                              <Progress
                                value={calculateProgressPercentage(job.status)}
                                className="h-2"
                              />
                            </div>
                          </TableCell>
                          <TableCell className="hidden md:table-cell">
                            {job.amount > 0 ? (
                              <span>{job.amount.toFixed(2)}€</span>
                            ) : (
                              <span className="text-muted-foreground italic">
                                Non specificato
                              </span>
                            )}
                          </TableCell>
                          <TableCell className="hidden md:table-cell">
                            {job.download_link ? (
                              <div className="flex items-center gap-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="h-8"
                                  onClick={() => openClientPortal(job)}
                                >
                                  <Users className="h-3.5 w-3.5 mr-1.5" />
                                  Portale
                                </Button>
                              </div>
                            ) : (
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-8"
                                onClick={() => {
                                  setSelectedJob(job);
                                  setPasswordDialogOpen(true);
                                }}
                              >
                                <Lock className="h-3.5 w-3.5 mr-1" />
                                Crea password
                              </Button>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end items-center gap-2">
                              <div className="md:hidden">
                                {job.download_link ? (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => openClientPortal(job)}
                                  >
                                    <Users className="h-3.5 w-3.5" />
                                  </Button>
                                ) : (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => {
                                      setSelectedJob(job);
                                      setPasswordDialogOpen(true);
                                    }}
                                  >
                                    <Lock className="h-3.5 w-3.5" />
                                  </Button>
                                )}
                              </div>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => openEditDialog(job)}
                              >
                                <Edit className="h-3.5 w-3.5" />
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  if (
                                    window.confirm(
                                      "Sei sicuro di voler eliminare questo lavoro?"
                                    )
                                  ) {
                                    deleteJobMutation.mutate(job.id);
                                  }
                                }}
                              >
                                <div className="i-lucide-trash-2 h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </div>
          ) : (
            <Card>
              <CardContent className="flex flex-col items-center justify-center p-8">
                <Camera className="h-10 w-10 mb-4 text-muted-foreground" />
                <h3 className="text-xl font-medium mb-2">
                  Nessun lavoro fotografico
                </h3>
                <p className="text-center text-muted-foreground mb-4">
                  Non hai ancora creato nessun lavoro fotografico. Crea il tuo primo lavoro!
                </p>
                <Button
                  onClick={() => {
                    setIsOpen(true);
                    setIsEditMode(false);
                    setFormData(initialFormState);
                  }}
                >
                  Crea il primo lavoro
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>
        
        <TabsContent value="portal" className="mt-0">
          <Card className="mb-4">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Portale Cliente
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Usa questa sezione per visualizzare e interagire con il portale cliente, inserire commenti e monitorare le revisioni.
              </p>
            </CardHeader>
            
            <CardContent>
              {!jobForClientPortal ? (
                <div className="flex flex-col items-center justify-center p-8">
                  <Users className="h-10 w-10 mb-4 text-muted-foreground" />
                  <h3 className="text-xl font-medium mb-2">
                    Nessun lavoro selezionato
                  </h3>
                  <p className="text-center text-muted-foreground mb-4">
                    Seleziona un lavoro dalla tab "Lavori" per accedere al portale cliente.
                  </p>
                  <Button onClick={() => setActiveTab("jobs")}>
                    Vai ai lavori
                  </Button>
                </div>
              ) : !passwordVerified && jobForClientPortal.password ? (
                <div className="max-w-md mx-auto p-4">
                  <div className="text-center mb-4">
                    <Lock className="h-10 w-10 mx-auto mb-2 text-muted-foreground" />
                    <h3 className="text-xl font-medium">Accesso protetto</h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      Inserisci la password per accedere al portale cliente
                    </p>
                  </div>
                  
                  <form className="space-y-4" onSubmit={(e) => {
                    e.preventDefault();
                    verifyPassword(jobForClientPortal, inputPassword);
                  }}>
                    <div className="space-y-2">
                      <Label htmlFor="portal-password">Password</Label>
                      <Input
                        id="portal-password"
                        type="password"
                        value={inputPassword}
                        onChange={e => setInputPassword(e.target.value)}
                        placeholder="Inserisci la password..."
                      />
                      {passwordError && (
                        <p className="text-sm text-destructive">{passwordError}</p>
                      )}
                    </div>
                    
                    <Button type="submit" className="w-full">
                      {verifyPasswordMutation.isPending ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Verifica...
                        </>
                      ) : (
                        <>
                          <ArrowRight className="h-4 w-4 mr-2" />
                          Accedi
                        </>
                      )}
                    </Button>
                  </form>
                </div>
              ) : (
                <div>
                  <div className="flex flex-col md:flex-row border-b gap-6 mb-6 pb-6">
                    <div className="md:w-2/3">
                      <h3 className="text-lg font-medium mb-2">
                        {jobForClientPortal.title}
                      </h3>
                      <div className="mb-4">
                        <Badge variant="outline" className="flex w-fit gap-1 items-center mb-2">
                          {getStatusIcon(jobForClientPortal.status)}
                          {JOB_STATUSES.find(s => s.value === jobForClientPortal.status)?.label || jobForClientPortal.status}
                        </Badge>
                        <Progress
                          value={calculateProgressPercentage(jobForClientPortal.status)}
                          className="h-2 mb-2"
                        />
                      </div>
                      
                      {jobForClientPortal.description && (
                        <div className="mb-4">
                          <p className="whitespace-pre-wrap text-sm">
                            {jobForClientPortal.description}
                          </p>
                        </div>
                      )}
                      
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <p className="text-xs text-muted-foreground">Data servizio</p>
                          <p className="text-sm">{formatDate(jobForClientPortal.job_date)}</p>
                        </div>
                        {jobForClientPortal.end_date && (
                          <div>
                            <p className="text-xs text-muted-foreground">Data fine</p>
                            <p className="text-sm">{formatDate(jobForClientPortal.end_date)}</p>
                          </div>
                        )}
                      </div>
                    </div>
                    
                    <div className="md:w-1/3">
                      <div className="border rounded-lg p-4 h-full">
                        <h4 className="font-medium text-sm text-muted-foreground mb-2 flex items-center gap-1.5">
                          <User className="h-3.5 w-3.5" />
                          Cliente
                        </h4>
                        <div className="flex items-center gap-3 mb-2">
                          <Avatar className="h-8 w-8">
                            <AvatarFallback>
                              {jobForClientPortal.client?.name?.charAt(0) || "C"}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium">
                              {jobForClientPortal.client?.name || "Cliente sconosciuto"}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {jobForClientPortal.client?.email}
                            </p>
                          </div>
                        </div>
                        
                        {jobForClientPortal.download_link && (
                          <div className="mt-4">
                            <h4 className="text-sm text-muted-foreground mb-1 flex items-center gap-1.5">
                              <LinkIcon className="h-3.5 w-3.5" />
                              Link portale
                            </h4>
                            <div className="text-xs font-mono bg-muted p-2 rounded-md overflow-auto break-all">
                              {window.location.origin}{jobForClientPortal.download_link}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <div className="space-y-4">
                    <h3 className="text-lg font-medium flex items-center gap-2">
                      <MessageSquare className="h-4 w-4" />
                      Commenti e revisioni
                    </h3>
                    
                    <div className="border rounded-lg overflow-hidden">
                      <ScrollArea className="h-72">
                        <div className="p-4 space-y-4">
                          {comments && comments.length > 0 ? (
                            comments.map((comment) => (
                              <div 
                                key={comment.id} 
                                className={`flex gap-3 ${comment.is_from_client ? "justify-start" : "justify-end"}`}
                              >
                                <div 
                                  className={`flex gap-3 max-w-[80%] ${comment.is_from_client ? "" : "flex-row-reverse"}`}
                                >
                                  <Avatar className="h-8 w-8">
                                    <AvatarFallback className={comment.is_from_client ? "bg-blue-100" : "bg-green-100"}>
                                      {comment.is_from_client ? "C" : "F"}
                                    </AvatarFallback>
                                  </Avatar>
                                  
                                  <div
                                    className={`rounded-lg px-3 py-2 ${
                                      comment.is_from_client
                                        ? "bg-muted"
                                        : "bg-primary text-primary-foreground"
                                    }`}
                                  >
                                    <div className="text-sm whitespace-pre-wrap">
                                      {comment.content}
                                    </div>
                                    <div className="text-xs mt-1 opacity-70">
                                      {new Date(comment.created_at).toLocaleString("it-IT", {
                                        day: "2-digit",
                                        month: "2-digit",
                                        hour: "2-digit",
                                        minute: "2-digit",
                                      })}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            ))
                          ) : (
                            <div className="text-center py-8 text-muted-foreground">
                              <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-30" />
                              <p>Nessun commento presente</p>
                              <p className="text-sm">Inserisci il primo commento per questo lavoro</p>
                            </div>
                          )}
                        </div>
                      </ScrollArea>
                      
                      <div className="border-t p-3">
                        <form className="flex gap-2" onSubmit={handleSubmitComment}>
                          <Textarea
                            placeholder="Scrivi un commento..."
                            className="min-h-[80px]"
                            value={newComment}
                            onChange={(e) => setNewComment(e.target.value)}
                            disabled={submittingComment}
                          />
                          <Button
                            type="submit"
                            size="sm"
                            className="self-end"
                            disabled={!newComment.trim() || submittingComment}
                          >
                            {submittingComment ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <ArrowRight className="h-4 w-4" />
                            )}
                          </Button>
                        </form>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Dialog per la creazione o modifica di un lavoro */}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>
              {isEditMode ? "Modifica lavoro" : "Nuovo lavoro fotografico"}
            </DialogTitle>
            <DialogDescription>
              {isEditMode
                ? "Modifica i dettagli del lavoro fotografico"
                : "Inserisci i dettagli del nuovo lavoro fotografico"}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="title">Titolo del lavoro *</Label>
                <Input
                  id="title"
                  name="title"
                  value={formData.title}
                  onChange={handleInputChange}
                  placeholder="Es. Matrimonio Marco e Giulia"
                />
              </div>

              <div>
                <Label htmlFor="client_id">Cliente *</Label>
                <Select
                  name="client_id"
                  value={formData.client_id}
                  onValueChange={(value) =>
                    setFormData((prev) => ({ ...prev, client_id: value }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleziona un cliente" />
                  </SelectTrigger>
                  <SelectContent>
                    {clientsLoading ? (
                      <div className="flex items-center justify-center p-2">
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Caricamento...
                      </div>
                    ) : clients && clients.length > 0 ? (
                      clients.map((client) => (
                        <SelectItem key={client.id} value={client.id}>
                          {client.name}
                        </SelectItem>
                      ))
                    ) : (
                      <div className="p-2 text-center text-sm">
                        Nessun cliente disponibile
                      </div>
                    )}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="job_date">Data del servizio</Label>
                <Input
                  id="job_date"
                  name="job_date"
                  type="datetime-local"
                  value={formData.job_date}
                  onChange={handleInputChange}
                />
              </div>

              <div>
                <Label htmlFor="end_date">Data fine (opzionale)</Label>
                <Input
                  id="end_date"
                  name="end_date"
                  type="datetime-local"
                  value={formData.end_date}
                  onChange={handleInputChange}
                />
              </div>

              <div>
                <Label htmlFor="amount">Importo (€)</Label>
                <Input
                  id="amount"
                  name="amount"
                  type="number"
                  step="0.01"
                  value={formData.amount}
                  onChange={handleInputChange}
                  placeholder="0.00"
                />
              </div>

              <div>
                <Label htmlFor="status">Stato</Label>
                <Select
                  name="status"
                  value={formData.status}
                  onValueChange={(value) =>
                    setFormData((prev) => ({
                      ...prev,
                      status: value as PhotoJob["status"],
                    }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleziona uno stato" />
                  </SelectTrigger>
                  <SelectContent>
                    {JOB_STATUSES.map((status) => (
                      <SelectItem key={status.value} value={status.value}>
                        {status.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="md:col-span-2">
                <Label htmlFor="description">Descrizione</Label>
                <Textarea
                  id="description"
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  placeholder="Inserisci una descrizione o note per questo lavoro..."
                  rows={3}
                />
              </div>

              <div className="md:col-span-2">
                <Label htmlFor="equipment-preset">Preset attrezzatura</Label>
                <Select
                  value={selectedPresetId}
                  onValueChange={handlePresetChange}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleziona un preset o personalizza" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Personalizzato</SelectItem>
                    {presetsLoading ? (
                      <div className="flex items-center justify-center p-2">
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Caricamento...
                      </div>
                    ) : presets && presets.length > 0 ? (
                      presets.map((preset) => (
                        <SelectItem key={preset.id} value={preset.id}>
                          {preset.name}
                        </SelectItem>
                      ))
                    ) : (
                      <div className="p-2 text-center text-sm">
                        Nessun preset disponibile
                      </div>
                    )}
                  </SelectContent>
                </Select>
              </div>

              <div className="md:col-span-2">
                <Label className="mb-2 block">Attrezzatura</Label>
                <div className="border rounded-md p-3 max-h-[200px] overflow-y-auto grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {equipmentLoading ? (
                    <div className="flex items-center justify-center p-2 col-span-2">
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Caricamento attrezzatura...
                    </div>
                  ) : equipmentData && equipmentData.length > 0 ? (
                    equipmentData.map((item) => (
                      <div key={item.id} className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          id={`equipment-${item.id}`}
                          checked={selectedEquipment.includes(item.id)}
                          onChange={() => handleEquipmentToggle(item.id)}
                          className="h-4 w-4 border-gray-300 rounded"
                        />
                        <Label
                          htmlFor={`equipment-${item.id}`}
                          className="text-sm font-normal flex items-center cursor-pointer"
                        >
                          <Camera className="h-3 w-3 mr-1.5" />
                          {item.name}
                          <span className="text-xs text-muted-foreground ml-1">
                            ({item.type})
                          </span>
                        </Label>
                      </div>
                    ))
                  ) : (
                    <div className="text-center p-2 text-sm text-muted-foreground col-span-2">
                      Nessuna attrezzatura disponibile. Aggiungi dell'attrezzatura
                      nella sezione dedicata.
                    </div>
                  )}
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" type="button" onClick={handleCloseDialog}>
                Annulla
              </Button>
              <Button type="submit" disabled={createJobMutation.isPending || updateJobMutation.isPending}>
                {createJobMutation.isPending || updateJobMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Salvataggio...
                  </>
                ) : isEditMode ? (
                  "Aggiorna lavoro"
                ) : (
                  "Crea lavoro"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Dialog per la creazione del link client portal */}
      <Dialog open={passwordDialogOpen} onOpenChange={setPasswordDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Imposta password per il portale cliente</DialogTitle>
            <DialogDescription>
              Crea una password per il portale cliente che permetta al tuo cliente di accedere in modo sicuro al lavoro.
            </DialogDescription>
          </DialogHeader>

          <form 
            onSubmit={(e) => {
              e.preventDefault();
              if (selectedJob) {
                generateClientPortalLinkMutation.mutate({
                  jobId: selectedJob.id, 
                  password: linkPassword
                });
                setPasswordDialogOpen(false);
              }
            }}
            className="space-y-4"
          >
            <div>
              <Label htmlFor="link-password">Password per il cliente</Label>
              <Input
                id="link-password"
                type="text"
                value={linkPassword}
                onChange={(e) => setLinkPassword(e.target.value)}
                placeholder="Inserisci una password sicura..."
              />
              <p className="text-sm text-muted-foreground mt-1">
                Questa password sarà richiesta al cliente per accedere al portale
              </p>
            </div>

            <DialogFooter>
              <Button variant="outline" type="button" onClick={() => setPasswordDialogOpen(false)}>
                Annulla
              </Button>
              <Button 
                type="submit" 
                disabled={!linkPassword.trim() || generateClientPortalLinkMutation.isPending}
              >
                {generateClientPortalLinkMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Creazione...
                  </>
                ) : (
                  <>
                    <Lock className="h-4 w-4 mr-2" />
                    Crea password
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Dialog per mostrare il link del portale cliente */}
      <Dialog open={clientPortalOpen} onOpenChange={setClientPortalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Portale cliente</DialogTitle>
            <DialogDescription>
              Il portale cliente è stato configurato con successo! Il cliente può ora accedere al portale inserendo la password.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label>Portale cliente</Label>
              <div className="mt-2">
                <p className="text-sm">
                  Ora puoi accedere direttamente al portale cliente dalla tab "Portale Cliente" o inviare il link al client.
                </p>
              </div>
              <Button
                variant="outline"
                className="w-full mt-4"
                onClick={() => {
                  if (selectedJob) {
                    openClientPortal(selectedJob);
                    setClientPortalOpen(false);
                  }
                }}
              >
                <Users className="h-4 w-4 mr-2" />
                Vai al portale cliente
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}