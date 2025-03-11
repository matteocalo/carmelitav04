import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/lib/supabase";
import {
  MessageCircle,
  Loader2,
  RefreshCw,
  Eye,
  EyeOff,
  Send,
  Clock,
  CheckCircle,
  AlertTriangle,
  Users2 as Users2Icon, // Assumed import
} from "lucide-react";

type PhotoJob = {
  id: string;
  user_id: string;
  client_id: string;
  title: string;
  description: string;
  status: string;
  client?: {
    name: string;
    email: string;
  };
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

export default function Comments() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<string>("all");
  const [newComment, setNewComment] = useState("");
  const [responseText, setResponseText] = useState("");
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [customSenderName, setCustomSenderName] = useState("");

  const { data: jobs, isLoading: jobsLoading } = useQuery<PhotoJob[]>({
    queryKey: ["photo-jobs-with-comments"],
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
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Get comment counts for each job
      if (data && data.length > 0) {
        const jobsWithComments = await Promise.all(
          data.map(async (job) => {
            // Get total comments
            const { count: totalCount, error: countError } = await supabase
              .from("job_comments")
              .select("*", { count: "exact", head: true })
              .eq("job_id", job.id);

            // Get unread comments
            const { count: unreadCount, error: unreadError } = await supabase
              .from("job_comments")
              .select("*", { count: "exact", head: true })
              .eq("job_id", job.id)
              .eq("is_read", false);

            if (countError || unreadError) {
              console.error("Error fetching comment counts", countError || unreadError);
              return job;
            }

            return {
              ...job,
              comments_count: totalCount || 0,
              unread_comments_count: unreadCount || 0,
            };
          })
        );

        return jobsWithComments;
      }

      return data || [];
    },
    enabled: !!user,
    refetchInterval: 30000, // Ricarica ogni 30 secondi
  });

  const {
    data: comments,
    isLoading: commentsLoading,
    error: commentsError,
  } = useQuery<Comment[]>({
    queryKey: ["job-comments", selectedJobId],
    queryFn: async () => {
      if (!selectedJobId) return [];
      const { data, error } = await supabase
        .from("job_comments")
        .select("*")
        .eq("job_id", selectedJobId)
        .order("created_at", { ascending: true });

      if (error) throw error;
      return data || [];
    },
    enabled: !!selectedJobId,
  });

  const markAsReadMutation = useMutation({
    mutationFn: async (commentId: string) => {
      const { data, error } = await supabase
        .from("job_comments")
        .update({ is_read: true })
        .eq("id", commentId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["job-comments", selectedJobId] });
      queryClient.invalidateQueries({ queryKey: ["photo-jobs-with-comments"] });
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Errore",
        description: `Si è verificato un errore: ${error.message}`,
      });
    },
  });

  const addResponseMutation = useMutation({
    mutationFn: async ({ commentId, response }: { commentId: string; response: string }) => {
      const { data, error } = await supabase
        .from("job_comments")
        .update({
          photographer_response: response,
          is_read: true,
        })
        .eq("id", commentId)
        .select();

      if (error) throw error;
      return data?.[0] || null;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["job-comments", selectedJobId] });
      setResponseText("");
      toast({
        title: "Risposta inviata",
        description: "La tua risposta è stata inviata con successo",
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

  const addCommentMutation = useMutation({
    mutationFn: async ({ jobId, text }: { jobId: string; text: string }) => {
      // Ottieni il nome del fotografo dall'utente corrente o usa il nome personalizzato
      const { data: userData, error: userError } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("id", user?.id)
        .maybeSingle();

      if (userError) throw userError;

      // Usa il nome personalizzato se fornito o il nome completo del profilo o default "Fotografo"
      const photographerName = customSenderName || userData?.full_name || "Fotografo";

      const { data, error } = await supabase
        .from("job_comments")
        .insert([
          {
            job_id: jobId,
            text,
            user_id: user?.id,
            client_name: photographerName,
            is_read: true, // I commenti aggiunti dal fotografo sono già letti
          },
        ])
        .select();

      if (error) throw error;
      return data?.[0];
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["job-comments", selectedJobId] });
      queryClient.invalidateQueries({ queryKey: ["photo-jobs-with-comments"] });
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
    },
  });

  const handleForceRefresh = async () => {
    setIsRefreshing(true);
    try {
      await queryClient.invalidateQueries({ queryKey: ["photo-jobs-with-comments"] });
      if (selectedJobId) {
        await queryClient.invalidateQueries({ queryKey: ["job-comments", selectedJobId] });
      }
      toast({
        title: "Dati aggiornati",
        description: "I commenti sono stati aggiornati con successo",
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

  // Quando viene selezionato un lavoro, marca tutti i suoi commenti come letti
  useEffect(() => {
    if (selectedJobId && comments) {
      const unreadComments = comments.filter((comment) => !comment.is_read);
      unreadComments.forEach((comment) => {
        markAsReadMutation.mutate(comment.id);
      });
    }
  }, [selectedJobId, comments]);

  const filteredJobs = jobs?.filter((job) => {
    if (activeTab === "all") return true;
    if (activeTab === "unread") return (job.unread_comments_count || 0) > 0;
    return false;
  });

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString("it-IT", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (jobsLoading) {
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
            Commenti
          </h1>
          <p className="text-muted-foreground">
            Gestisci i commenti e le comunicazioni dei tuoi lavori
          </p>
        </div>

        <div className="flex items-center gap-2">
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

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle className="flex justify-between items-center">
                <span>Lavori</span>
                <Tabs defaultValue="all" value={activeTab} onValueChange={setActiveTab}>
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="all">Tutti</TabsTrigger>
                    <TabsTrigger value="unread">
                      Non letti
                      {jobs?.some((job) => (job.unread_comments_count || 0) > 0) && (
                        <Badge variant="destructive" className="ml-2">
                          {jobs?.reduce((acc, job) => acc + (job.unread_comments_count || 0), 0)}
                        </Badge>
                      )}
                    </TabsTrigger>
                  </TabsList>
                </Tabs>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 max-h-[500px] overflow-y-auto pr-2">
                {filteredJobs && filteredJobs.length > 0 ? (
                  filteredJobs.map((job) => (
                    <div
                      key={job.id}
                      className={`p-3 rounded-lg cursor-pointer transition-colors ${
                        selectedJobId === job.id
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted hover:bg-muted/80"
                      }`}
                      onClick={() => setSelectedJobId(job.id)}
                    >
                      <div className="flex justify-between items-start">
                        <div className="font-medium">{job.title}</div>
                        {(job.unread_comments_count || 0) > 0 && (
                          <Badge variant="destructive" className="animate-pulse">
                            {job.unread_comments_count}
                          </Badge>
                        )}
                      </div>
                      <div className="text-sm mt-1 flex items-center gap-1">
                        <Users2Icon className="h-3 w-3 opacity-70" />
                        <span className="opacity-80">{job.client?.name || "Cliente sconosciuto"}</span>
                      </div>
                      <div className="flex items-center mt-2 text-xs opacity-70">
                        <MessageCircle className="h-3 w-3 mr-1" />
                        {job.comments_count || 0} commenti
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-6 text-muted-foreground">
                    {activeTab === "unread"
                      ? "Non ci sono lavori con commenti non letti"
                      : "Non ci sono lavori con commenti"}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="md:col-span-2">
          <Card className="h-full flex flex-col">
            <CardHeader>
              <CardTitle>
                {selectedJobId
                  ? jobs?.find((j) => j.id === selectedJobId)?.title || "Commenti"
                  : "Seleziona un lavoro per vedere i commenti"}
              </CardTitle>
            </CardHeader>
            <CardContent className="flex-grow flex flex-col">
              {selectedJobId ? (
                <>
                  {commentsError ? (
                    <Alert variant="destructive" className="mb-4">
                      <AlertTriangle className="h-4 w-4" />
                      <AlertTitle>Errore</AlertTitle>
                      <AlertDescription>
                        Si è verificato un errore durante il caricamento dei commenti.
                        <Button
                          variant="outline"
                          size="sm"
                          className="mt-2"
                          onClick={handleForceRefresh}
                        >
                          Riprova
                        </Button>
                      </AlertDescription>
                    </Alert>
                  ) : commentsLoading ? (
                    <div className="space-y-4 flex-grow">
                      <Skeleton className="h-20 w-full" />
                      <Skeleton className="h-20 w-full" />
                      <Skeleton className="h-20 w-full" />
                    </div>
                  ) : comments && comments.length > 0 ? (
                    <div className="space-y-4 flex-grow overflow-y-auto max-h-[500px] pr-2 mb-4">
                      {comments.map((comment) => (
                        <div
                          key={comment.id}
                          className={`p-4 rounded-lg ${
                            comment.user_id
                              ? "bg-primary/10 ml-8"
                              : "bg-muted mr-8"
                          }`}
                        >
                          <div className="flex justify-between items-start">
                            <div className="font-medium">
                              {comment.client_name}
                              {!comment.is_read && !comment.user_id && (
                                <Badge className="ml-2" variant="destructive">
                                  Nuovo
                                </Badge>
                              )}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {formatDate(comment.created_at)}
                            </div>
                          </div>
                          <div className="mt-2 text-sm whitespace-pre-line">
                            {comment.text}
                          </div>

                          {comment.photographer_response && (
                            <div className="mt-4 p-3 bg-primary/5 rounded border border-primary/10">
                              <div className="text-xs font-medium mb-1">La tua risposta:</div>
                              <div className="text-sm whitespace-pre-line">
                                {comment.photographer_response}
                              </div>
                            </div>
                          )}

                          {!comment.user_id && !comment.photographer_response && (
                            <div className="mt-3 flex gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  const dialogElement = document.createElement("dialog");
                                  dialogElement.className = "p-6 rounded-lg shadow-lg";

                                  const handleClose = () => {
                                    document.body.removeChild(dialogElement);
                                  };

                                  const handleSubmit = () => {
                                    const textarea = dialogElement.querySelector("textarea");
                                    if (textarea && textarea.value.trim()) {
                                      addResponseMutation.mutate({
                                        commentId: comment.id,
                                        response: textarea.value.trim(),
                                      });
                                      handleClose();
                                    }
                                  };

                                  dialogElement.innerHTML = `
                                    <div>
                                      <h3 class="text-lg font-medium mb-2">Rispondi al commento</h3>
                                      <p class="text-sm mb-4 opacity-70">Commento di ${comment.client_name}: ${comment.text}</p>
                                      <textarea 
                                        class="w-full p-3 border rounded-md min-h-[100px] mb-4" 
                                        placeholder="Scrivi la tua risposta..."
                                      ></textarea>
                                      <div class="flex justify-end gap-2">
                                        <button class="px-4 py-2 bg-gray-200 rounded-md" id="cancel">Annulla</button>
                                        <button class="px-4 py-2 bg-blue-600 text-white rounded-md" id="submit">Invia</button>
                                      </div>
                                    </div>
                                  `;

                                  document.body.appendChild(dialogElement);

                                  const cancelButton = dialogElement.querySelector("#cancel");
                                  const submitButton = dialogElement.querySelector("#submit");

                                  if (cancelButton) {
                                    cancelButton.addEventListener("click", handleClose);
                                  }

                                  if (submitButton) {
                                    submitButton.addEventListener("click", handleSubmit);
                                  }

                                  dialogElement.showModal();
                                }}
                              >
                                Rispondi
                              </Button>

                              {!comment.is_read && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => markAsReadMutation.mutate(comment.id)}
                                >
                                  <Eye className="h-4 w-4 mr-1" />
                                  Segna come letto
                                </Button>
                              )}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-12 text-muted-foreground flex-grow flex flex-col items-center justify-center">
                      <MessageCircle className="h-8 w-8 mb-2 opacity-50" />
                      <p>Non ci sono commenti per questo lavoro</p>
                      <p className="text-sm mt-1">
                        Inizia la conversazione aggiungendo un commento
                      </p>
                    </div>
                  )}

                  <div className="mt-auto pt-4 border-t">
                    <div className="flex gap-2 mb-2">
                      <Input
                        placeholder="Il tuo nome (opzionale)"
                        value={customSenderName}
                        onChange={(e) => setCustomSenderName(e.target.value)}
                        className="max-w-[220px]"
                      />
                    </div>
                    <div className="flex gap-2">
                      <Textarea
                        placeholder="Scrivi un commento..."
                        value={newComment}
                        onChange={(e) => setNewComment(e.target.value)}
                        className="min-h-[80px]"
                      />
                      <Button
                        className="self-end"
                        disabled={!newComment.trim() || addCommentMutation.isPending}
                        onClick={() => {
                          if (selectedJobId && newComment.trim()) {
                            addCommentMutation.mutate({
                              jobId: selectedJobId,
                              text: newComment.trim(),
                            });
                          }
                        }}
                      >
                        {addCommentMutation.isPending ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Send className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </div>
                </>
              ) : (
                <div className="text-center py-12 text-muted-foreground flex flex-col items-center justify-center flex-grow">
                  <MessageCircle className="h-12 w-12 mb-3 opacity-30" />
                  <p className="text-lg">Seleziona un lavoro per vedere i commenti</p>
                  <p className="text-sm mt-1 max-w-md">
                    I commenti ti permettono di comunicare con i tuoi clienti riguardo ai lavori fotografici
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}