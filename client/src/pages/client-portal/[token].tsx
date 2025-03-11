import { useState, useEffect } from "react";
import { useParams, useLocation } from "wouter";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabase";
import { Loader2, AlertTriangle, LockIcon, SendIcon, LogIn, CheckCircle, Download, Clock, FileDown, Edit, RefreshCw } from "lucide-react";

export default function ClientPortal() {
  const { token } = useParams();
  const [location, setLocation] = useLocation();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [jobData, setJobData] = useState<any>(null);
  const [comments, setComments] = useState<any[]>([]);
  const [newComment, setNewComment] = useState("");
  const [clientName, setClientName] = useState("");
  const [isPasswordProtected, setIsPasswordProtected] = useState(false);
  const [password, setPassword] = useState("");
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loadingAuth, setLoadingAuth] = useState(false);
  const [forceDirectAccess, setForceDirectAccess] = useState(false);

  // Estrai il jobId dal parametro token
  const getJobIdFromToken = () => {
    if (!token && !forceDirectAccess) return null;

    let tokenStr = token;

    // Se stiamo usando forceDirectAccess, prendiamo il token dalla sessionStorage
    if (forceDirectAccess) {
      tokenStr = sessionStorage.getItem("current_portal_token") || "";
    }

    if (tokenStr?.startsWith("portal_")) {
      const parts = tokenStr.split("_");
      if (parts.length >= 2) {
        return parts[1];
      }
    }

    return tokenStr;
  };

  // Inizializzazione - verifica se è necessario forzare l'accesso diretto
  useEffect(() => {
    // Previeni il redirect alla pagina di login/registrazione
    if (location.includes("login") || location.includes("register")) {
      const savedToken = sessionStorage.getItem("current_portal_token");
      if (savedToken) {
        // Torna al portale client con il token salvato
        setLocation(`/client-portal/${savedToken}`);
      }
    } else if (token) {
      // Salva il token corrente per uso futuro
      sessionStorage.setItem("current_portal_token", token);
      
      // Forza l'accesso diretto al portale client
      if (location.includes("login") || location.includes("register")) {
        setLocation(`/client-portal/${token}`);
      }
    }
  }, [token, location, setLocation]);

  // Funzione per caricare i dati del lavoro
  const fetchJobData = async () => {
    try {
      if (loading && !isAuthenticated) {
        setLoading(true);
      }
      
      const jobId = getJobIdFromToken();

      if (!jobId) {
        setError("ID lavoro non valido");
        setLoading(false);
        return;
      }

      // Verifica prima che il job esista, senza recuperare l'intero record
      const { count, error: countError } = await supabase
        .from("photo_jobs")
        .select("id", { count: "exact", head: true })
        .eq("id", jobId);

      if (countError || count === 0) {
        console.error("Job non trovato:", countError);
        setError("Portale non trovato o scaduto");
        setLoading(false);
        return;
      }

      // Dopo aver verificato che il job esiste, recupera i dettagli completi
      const { data: job, error: jobError } = await supabase
        .from("photo_jobs")
        .select("*")
        .eq("id", jobId)
        .single();

      if (jobError) {
        console.error("Errore nel caricamento del lavoro:", jobError);
        setError("Errore nel caricamento dei dati del portale");
        setLoading(false);
        return;
      }

      setJobData(job);

      // Controlla se il job è protetto da password
      if (job.portal_password) {
        setIsPasswordProtected(true);

        // Verifica se l'autenticazione è già stata completata
        const authKey = `portal_auth_${jobId}`;
        const isAlreadyAuthenticated = sessionStorage.getItem(authKey) === "true";

        if (isAlreadyAuthenticated) {
          setIsAuthenticated(true);
          await loadComments(jobId);
        }
      } else {
        setIsAuthenticated(true);
        await loadComments(jobId);
      }

      setLoading(false);
    } catch (e) {
      console.error("Errore:", e);
      setError("Si è verificato un errore durante il caricamento dei dati");
      setLoading(false);
    }
  };

  // Carica i dati del lavoro inizialmente
  useEffect(() => {
    // Esegui il fetch solo se abbiamo un token (da URL o forzato)
    if (token || forceDirectAccess) {
      fetchJobData();
    }
  }, [token, forceDirectAccess]);
  
  // Aggiornamento periodico dei dati del lavoro (polling)
  useEffect(() => {
    // Non avviare il polling se non siamo autenticati o se c'è un errore
    if (!isAuthenticated || error) return;
    
    // Imposta un intervallo per aggiornare i dati ogni 30 secondi
    const intervalId = setInterval(() => {
      if (isAuthenticated) {
        // Aggiorna solo i dati del lavoro senza mostrare il loader
        const updateJobData = async () => {
          try {
            const jobId = getJobIdFromToken();
            if (!jobId) return;
            
            const { data: job, error: jobError } = await supabase
              .from("photo_jobs")
              .select("*")
              .eq("id", jobId)
              .single();
            
            if (!jobError && job) {
              setJobData(job);
              await loadComments(jobId);
            }
          } catch (e) {
            console.error("Errore nell'aggiornamento automatico:", e);
          }
        };
        
        updateJobData();
      }
    }, 30000); // Aggiorna ogni 30 secondi
    
    // Pulisci l'intervallo quando il componente viene smontato
    return () => clearInterval(intervalId);
  }, [isAuthenticated, error]);

  // Carica i commenti per il lavoro
  const loadComments = async (jobId: string) => {
    try {
      const { data, error } = await supabase
        .from("job_comments")
        .select("*")
        .eq("job_id", jobId)
        .order("created_at", { ascending: true });

      if (error) {
        console.error("Errore nel caricamento dei commenti:", error);
        return;
      }

      setComments(data || []);
    } catch (e) {
      console.error("Errore:", e);
    }
  };

  // Verifica la password
  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!password.trim()) {
      toast({
        variant: "destructive",
        title: "Password richiesta",
        description: "Inserisci la password per accedere al portale",
      });
      return;
    }

    setLoadingAuth(true);

    try {
      const jobId = getJobIdFromToken();

      if (jobData && jobData.portal_password === password) {
        setIsAuthenticated(true);

        // Salva l'autenticazione in sessionStorage
        sessionStorage.setItem(`portal_auth_${jobId}`, "true");

        await loadComments(jobId!);
        toast({
          title: "Accesso effettuato",
          description: "Benvenuto nel portale cliente",
        });
      } else {
        toast({
          variant: "destructive",
          title: "Password errata",
          description: "La password inserita non è corretta",
        });
      }
    } catch (e) {
      console.error("Errore durante l'autenticazione:", e);
      toast({
        variant: "destructive",
        title: "Errore",
        description: "Si è verificato un errore durante l'autenticazione",
      });
    } finally {
      setLoadingAuth(false);
    }
  };

  // Invia un nuovo commento
  const handleSubmitComment = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!newComment.trim() || !clientName.trim()) {
      toast({
        variant: "destructive",
        title: "Campi mancanti",
        description: "Inserisci il tuo nome e un commento",
      });
      return;
    }

    try {
      const jobId = getJobIdFromToken();

      const { data, error } = await supabase
        .from("job_comments")
        .insert([
          {
            job_id: jobId,
            client_name: clientName,
            text: newComment,
            is_read: false,
          },
        ])
        .select("*");

      if (error) {
        console.error("Errore nell'invio del commento:", error);
        toast({
          variant: "destructive",
          title: "Errore",
          description: "Si è verificato un errore durante l'invio del commento",
        });
        return;
      }

      setNewComment("");
      // Salva il nome del cliente
      sessionStorage.setItem("portal_client_name", clientName);

      toast({
        title: "Commento inviato",
        description: "Il tuo commento è stato inviato con successo",
      });

      // Aggiorna la lista dei commenti
      await loadComments(jobId!);
    } catch (e) {
      console.error("Errore:", e);
      toast({
        variant: "destructive",
        title: "Errore",
        description: "Si è verificato un errore durante l'invio del commento",
      });
    }
  };

  // Formatta la data
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString("it-IT", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // Ottiene l'icona per lo stato del lavoro
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
        return <RefreshCw className="h-4 w-4" />;
    }
  };

  // Ottiene l'etichetta per lo stato del lavoro
  const getStatusLabel = (status: string) => {
    const statusMap: Record<string, string> = {
      'TBC': '⏳ In attesa di conferma',
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

  // Calcola la percentuale di progresso in base allo stato
  const getStatusProgress = (status: string) => {
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


  // Recupera il nome del cliente precedentemente salvato
  useEffect(() => {
    const savedName = sessionStorage.getItem("portal_client_name");
    if (savedName) {
      setClientName(savedName);
    }
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Caricamento in corso...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <Alert variant="destructive" className="max-w-md">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Errore</AlertTitle>
          <AlertDescription>
            {error}
            {location.includes("login") && (
              <div className="mt-4">
                <Button 
                  variant="outline" 
                  onClick={() => {
                    const savedToken = sessionStorage.getItem("current_portal_token");
                    if (savedToken) {
                      // Prova a tornare al portale
                      setLocation(`/client-portal/${savedToken}`);
                    }
                  }}
                >
                  Torna al portale client
                </Button>
              </div>
            )}
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  if (isPasswordProtected && !isAuthenticated) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <Card className="max-w-md w-full">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <LockIcon className="h-5 w-5" /> Portale Protetto
            </CardTitle>
            <CardDescription>
              Questo portale è protetto da password. Inserisci la password per accedere.
            </CardDescription>
          </CardHeader>
          <form onSubmit={handlePasswordSubmit}>
            <CardContent>
              <Input
                type="password"
                placeholder="Inserisci password..."
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mb-2"
              />
            </CardContent>
            <CardFooter>
              <Button type="submit" disabled={loadingAuth}>
                {loadingAuth ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Verifica...
                  </>
                ) : (
                  <>
                    <LogIn className="h-4 w-4 mr-2" />
                    Accedi
                  </>
                )}
              </Button>
            </CardFooter>
          </form>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-4xl mx-auto space-y-8">
        <Card>
          <CardHeader>
            <CardTitle>{jobData?.title || "Progetto Fotografico"}</CardTitle>
            <CardDescription>
              {jobData?.description || "Nessuna descrizione disponibile"}
            </CardDescription>
          </CardHeader>
          <CardContent className="pb-0">
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-medium mb-2">Stato del lavoro</h3>
                <div className="p-4 bg-muted rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    {getStatusIcon(jobData?.status)}
                    <span className="font-medium">
                      {getStatusLabel(jobData?.status)}
                    </span>
                  </div>
                  <div className="w-full bg-background rounded-full h-2.5 mb-1">
                    <div 
                      className="bg-primary h-2.5 rounded-full transition-all duration-500" 
                      style={{ width: `${getStatusProgress(jobData?.status)}%` }}
                    ></div>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    Ultimo aggiornamento: {formatDate(jobData?.updated_at)}
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
          <CardContent>
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-medium mb-2">Commenti</h3>
                <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2">
                  {comments.length > 0 ? (
                    comments.map((comment) => (
                      <div
                        key={comment.id}
                        className={`p-4 rounded-lg ${
                          comment.user_id ? "bg-primary/10 ml-8" : "bg-muted"
                        }`}
                      >
                        <div className="flex justify-between items-start">
                          <div className="font-medium">{comment.client_name}</div>
                          <div className="text-xs text-muted-foreground">
                            {formatDate(comment.created_at)}
                          </div>
                        </div>
                        <div className="mt-2 text-sm whitespace-pre-line">
                          {comment.text}
                        </div>

                        {comment.photographer_response && (
                          <div className="mt-4 p-3 bg-primary/5 rounded border border-primary/10">
                            <div className="text-xs font-medium mb-1">Risposta del fotografo:</div>
                            <div className="text-sm whitespace-pre-line">
                              {comment.photographer_response}
                            </div>
                          </div>
                        )}
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-6 text-muted-foreground">
                      Non ci sono ancora commenti per questo progetto.
                    </div>
                  )}
                </div>
              </div>

              <div className="border-t pt-6">
                <h3 className="text-lg font-medium mb-4">Aggiungi un commento</h3>
                <form onSubmit={handleSubmitComment} className="space-y-4">
                  <div>
                    <Input
                      placeholder="Il tuo nome"
                      value={clientName}
                      onChange={(e) => setClientName(e.target.value)}
                    />
                  </div>
                  <div>
                    <Textarea
                      placeholder="Scrivi il tuo commento..."
                      value={newComment}
                      onChange={(e) => setNewComment(e.target.value)}
                      rows={4}
                    />
                  </div>
                  <Button type="submit">
                    <SendIcon className="h-4 w-4 mr-2" />
                    Invia commento
                  </Button>
                </form>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

