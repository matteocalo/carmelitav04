
import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/lib/supabase";
import { jsPDF } from "jspdf";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
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
import { Skeleton } from "@/components/ui/skeleton";
import { Pencil, Trash2, FileDown, RefreshCw } from "lucide-react";

type Client = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  notes: string | null;
  vat_number: string | null;
  address: string | null;
  sdi: string | null;
  created_at: string;
};

const initialFormState = {
  name: "",
  email: "",
  phone: "",
  notes: "",
  vat_number: "",
  address: "",
  sdi: "",
};

export default function Clients() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [formData, setFormData] = useState(initialFormState);
  const queryClient = useQueryClient();
  const [refreshKey, setRefreshKey] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const {
    data: clients,
    isLoading,
    refetch,
  } = useQuery<Client[]>({
    queryKey: ["clients", refreshKey], // Include refreshKey in the queryKey
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("clients")
        .select("*")
        .eq("user_id", user.id)
        .order("name", { ascending: true });

      if (error) {
        console.error("Error fetching clients:", error);
        throw new Error(error.message);
      }
      return data || [];
    },
    enabled: !!user,
  });

  // Forza un refresh manuale dei dati
  const handleForceRefresh = async () => {
    setIsRefreshing(true);
    try {
      await refetch();
      toast({
        title: "Dati aggiornati",
        description: "La lista clienti è stata aggiornata con successo",
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Errore",
        description: "Impossibile aggiornare i dati",
      });
    } finally {
      setIsRefreshing(false);
    }
  };

  const createMutation = useMutation({
    mutationFn: async (newClient: typeof formData) => {
      if (!user) throw new Error("Utente non autenticato");

      const { data, error } = await supabase
        .from("clients")
        .insert([
          {
            ...newClient,
            user_id: user.id,
            phone: newClient.phone || null,
            notes: newClient.notes || null,
            vat_number: newClient.vat_number || null,
            address: newClient.address || null,
            sdi: newClient.sdi || null,
          },
        ])
        .select();

      if (error) throw new Error(error.message);
      return data;
    },
    onSuccess: () => {
      // Forza il refresh incrementando la chiave
      setRefreshKey((prev) => prev + 1);
      setOpen(false);
      resetForm();
      toast({
        title: "Cliente Aggiunto",
        description: "Il cliente è stato aggiunto con successo",
      });
    },
    onError: (error) => {
      toast({
        variant: "destructive",
        title: "Errore",
        description: `Errore durante l'aggiunta del cliente: ${error.message}`,
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: typeof formData }) => {
      const { error } = await supabase
        .from("clients")
        .update({
          ...data,
          phone: data.phone || null,
          notes: data.notes || null,
          vat_number: data.vat_number || null,
          address: data.address || null,
          sdi: data.sdi || null,
        })
        .eq("id", id);

      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      // Forza il refresh incrementando la chiave
      setRefreshKey((prev) => prev + 1);
      setOpen(false);
      resetForm();
      toast({
        title: "Cliente Aggiornato",
        description: "Il cliente è stato aggiornato con successo",
      });
    },
    onError: (error) => {
      toast({
        variant: "destructive",
        title: "Errore",
        description: `Errore durante l'aggiornamento del cliente: ${error.message}`,
      });
    },
  });

  const deleteClientMutation = useMutation({
    mutationFn: async (id: string) => {
      // Prima aggiorna tutti i lavori fotografici associati per rimuovere il riferimento al cliente
      const { error: updateError } = await supabase
        .from("photo_jobs")
        .update({ client_id: null })
        .eq("client_id", id);

      if (updateError) throw new Error(updateError.message);

      // Poi elimina il cliente
      const { error } = await supabase.from("clients").delete().eq("id", id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      // Forza il refresh incrementando la chiave
      setRefreshKey((prev) => prev + 1);
      toast({
        title: "Cliente Eliminato",
        description: "Il cliente è stato eliminato con successo",
      });
    },
    onError: (error) => {
      toast({
        variant: "destructive",
        title: "Errore",
        description: `Errore durante l'eliminazione del cliente: ${error.message}`,
      });
    },
  });

  const resetForm = () => {
    setFormData(initialFormState);
    setSelectedClient(null);
  };

  const handleSubmit = () => {
    if (!formData.name || !formData.email) {
      toast({
        variant: "destructive",
        title: "Dati mancanti",
        description: "Nome e email sono campi obbligatori",
      });
      return;
    }

    try {
      if (selectedClient) {
        updateMutation.mutate({ id: selectedClient.id, data: formData });
      } else {
        createMutation.mutate(formData);
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

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleEdit = (client: Client) => {
    setSelectedClient(client);
    setFormData({
      name: client.name,
      email: client.email,
      phone: client.phone || "",
      notes: client.notes || "",
      vat_number: client.vat_number || "",
      address: client.address || "",
      sdi: client.sdi || "",
    });
    setOpen(true);
  };

  const generatePDF = async () => {
    try {
      const pdf = new jsPDF();

      // Add title
      pdf.setFontSize(20);
      pdf.text("Lista Clienti", 20, 20);

      // Add clients list
      pdf.setFontSize(12);
      let yPos = 30;

      clients?.forEach((client, index) => {
        if (yPos > 250) {
          pdf.addPage();
          yPos = 20;
        }

        pdf.setFont("helvetica", "bold");
        pdf.text(`${index + 1}. ${client.name}`, 20, yPos);
        pdf.setFont("helvetica", "normal");
        pdf.text(`Email: ${client.email}`, 30, yPos + 7);
        if (client.phone) pdf.text(`Telefono: ${client.phone}`, 30, yPos + 14);
        if (client.vat_number)
          pdf.text(`P.IVA: ${client.vat_number}`, 30, yPos + 21);
        if (client.sdi) pdf.text(`Codice SDI: ${client.sdi}`, 30, yPos + 28);
        if (client.address)
          pdf.text(`Indirizzo: ${client.address}`, 30, yPos + 35);
        if (client.notes) {
          pdf.text("Note:", 30, yPos + 42);
          pdf.text(client.notes, 40, yPos + 49);
          yPos += 56;
        } else {
          yPos += 42;
        }
      });

      pdf.save("clienti.pdf");

      toast({
        title: "PDF Generato",
        description: "Il PDF dei clienti è stato generato con successo",
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Errore",
        description: "Impossibile generare il PDF",
      });
    }
  };

  const printClientDetail = async (client: Client) => {
    try {
      const pdf = new jsPDF();

      // Titolo
      pdf.setFontSize(22);
      pdf.text("Dettaglio Cliente", 20, 20);

      // Informazioni cliente
      pdf.setFontSize(16);
      pdf.setFont("helvetica", "bold");
      pdf.text(client.name, 20, 40);

      pdf.setFontSize(12);
      pdf.setFont("helvetica", "normal");

      let yPos = 50;
      pdf.text(`Email: ${client.email}`, 20, yPos);
      yPos += 8;

      if (client.phone) {
        pdf.text(`Telefono: ${client.phone}`, 20, yPos);
        yPos += 8;
      }

      if (client.vat_number) {
        pdf.text(`Partita IVA: ${client.vat_number}`, 20, yPos);
        yPos += 8;
      }

      if (client.sdi) {
        pdf.text(`Codice SDI: ${client.sdi}`, 20, yPos);
        yPos += 8;
      }

      if (client.address) {
        pdf.text(`Indirizzo: ${client.address}`, 20, yPos);
        yPos += 8;
      }

      if (client.notes) {
        pdf.text("Note:", 20, yPos);
        yPos += 8;

        // Gestione del testo su più righe
        const splitNotes = pdf.splitTextToSize(client.notes, 170);
        pdf.text(splitNotes, 20, yPos);
      }

      // Data creazione
      yPos = 220;
      pdf.setFontSize(10);
      pdf.setTextColor(100);
      const formattedDate = new Date(client.created_at).toLocaleDateString(
        "it-IT",
      );
      pdf.text(`Cliente creato il: ${formattedDate}`, 20, yPos);

      // Salva il PDF con il nome del cliente
      pdf.save(`cliente_${client.name.replace(/\s+/g, "_")}.pdf`);

      toast({
        title: "PDF Generato",
        description: `Il PDF del cliente ${client.name} è stato generato con successo`,
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Errore",
        description: "Impossibile generare il PDF del cliente",
      });
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
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Clienti</h2>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={handleForceRefresh}
            disabled={isRefreshing}
          >
            <RefreshCw
              className={`mr-2 h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`}
            />
            {isRefreshing ? "Aggiornamento..." : "Aggiorna"}
          </Button>
          <Button variant="outline" onClick={generatePDF}>
            <FileDown className="mr-2 h-4 w-4" />
            Esporta PDF
          </Button>
          <Dialog
            open={open}
            onOpenChange={(isOpen) => {
              if (!isOpen) resetForm();
              setOpen(isOpen);
            }}
          >
            <DialogTrigger asChild>
              <Button>Aggiungi Cliente</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>
                  {selectedClient
                    ? "Modifica cliente"
                    : "Aggiungi un nuovo cliente"}
                </DialogTitle>
                <DialogDescription>
                  {selectedClient
                    ? "Modifica i dettagli del cliente"
                    : "Inserisci i dettagli del nuovo cliente"}
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="name">Nome *</Label>
                  <Input
                    id="name"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    placeholder="Nome del cliente"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="email">Email *</Label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    placeholder="Email del cliente"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="vat_number">Partita IVA</Label>
                  <Input
                    id="vat_number"
                    name="vat_number"
                    value={formData.vat_number}
                    onChange={handleInputChange}
                    placeholder="Partita IVA"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="sdi">Codice SDI</Label>
                  <Input
                    id="sdi"
                    name="sdi"
                    value={formData.sdi}
                    onChange={handleInputChange}
                    placeholder="Codice SDI"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="address">Indirizzo</Label>
                  <Input
                    id="address"
                    name="address"
                    value={formData.address}
                    onChange={handleInputChange}
                    placeholder="Indirizzo"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="phone">Telefono</Label>
                  <Input
                    id="phone"
                    name="phone"
                    value={formData.phone}
                    onChange={handleInputChange}
                    placeholder="Numero di telefono"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="notes">Note</Label>
                  <Input
                    id="notes"
                    name="notes"
                    value={formData.notes}
                    onChange={handleInputChange}
                    placeholder="Note aggiuntive"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button
                  onClick={handleSubmit}
                  disabled={
                    createMutation.isPending || updateMutation.isPending
                  }
                >
                  {createMutation.isPending || updateMutation.isPending
                    ? "Salvataggio..."
                    : selectedClient
                      ? "Modifica"
                      : "Salva"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Tutti i clienti</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableCaption>
              {clients && clients.length > 0
                ? "Elenco dei tuoi clienti"
                : "Nessun cliente trovato"}
            </TableCaption>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Telefono</TableHead>
                <TableHead>P.IVA</TableHead>
                <TableHead className="w-[120px]">Azioni</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {clients && clients.length > 0 ? (
                clients.map((client) => (
                  <TableRow key={client.id}>
                    <TableCell className="font-medium">{client.name}</TableCell>
                    <TableCell>{client.email}</TableCell>
                    <TableCell>{client.phone || "-"}</TableCell>
                    <TableCell>{client.vat_number || "-"}</TableCell>
                    <TableCell>
                      <div className="flex space-x-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEdit(client)}
                          title="Modifica cliente"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => printClientDetail(client)}
                          title="Esporta dettagli cliente"
                        >
                          <FileDown className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            if (
                              window.confirm(
                                "Sei sicuro di voler eliminare questo cliente? Tutti i lavori associati rimarranno ma senza riferimento al cliente.",
                              )
                            ) {
                              deleteClientMutation.mutate(client.id);
                            }
                          }}
                          title="Elimina cliente"
                          className="text-red-500 hover:text-red-700"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={5} className="text-center">
                    Nessun cliente trovato. Aggiungi il tuo primo cliente!
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
