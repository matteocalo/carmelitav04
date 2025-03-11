import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/use-auth";
import { Skeleton } from "@/components/ui/skeleton";
import { MoreVertical, Edit, Trash2, FileText } from "lucide-react";
import jsPDF from 'jspdf';
import { EquipmentPdfGenerator } from "@/components/equipment/EquipmentPdfGenerator"; // Added import

type Equipment = {
  id: string;
  name: string;
  type: string;
  status: "available" | "in_use" | "maintenance";
  user_id: string;
  created_at: string;
};

const equipmentTypes = [
  "Camera",
  "Obiettivo",
  "Flash",
  "Treppiede",
  "Drone",
  "Accessorio",
  "Altro",
];

const statusOptions = [
  { value: "available", label: "Disponibile", color: "bg-green-500" },
  { value: "in_use", label: "In uso", color: "bg-yellow-500" },
  { value: "maintenance", label: "In manutenzione", color: "bg-red-500" },
];

export default function Equipment() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [editingEquipment, setEditingEquipment] = useState<Equipment | null>(null);
  const [newEquipment, setNewEquipment] = useState({
    name: "",
    type: equipmentTypes[0],
    status: "available" as "available" | "in_use" | "maintenance",
  });

  const queryClient = useQueryClient();

  const { data: equipment, isLoading } = useQuery<Equipment[]>({
    queryKey: ["equipment"],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("equipment")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data || [];
    },
    enabled: !!user,
  });

  const createEquipmentMutation = useMutation({
    mutationFn: async (newEquipment: {
      name: string;
      type: string;
      status: "available" | "in_use" | "maintenance";
    }) => {
      if (!user) throw new Error("Utente non autenticato");

      const { data, error } = await supabase.from("equipment").insert([
        {
          name: newEquipment.name,
          type: newEquipment.type,
          status: newEquipment.status,
          user_id: user.id,
        },
      ]).select();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["equipment"] });
      toast({
        title: "Attrezzatura aggiunta",
        description: "L'attrezzatura è stata aggiunta con successo",
      });
      setOpen(false);
      setNewEquipment({
        name: "",
        type: equipmentTypes[0],
        status: "available",
      });
    },
    onError: (error) => {
      toast({
        variant: "destructive",
        title: "Errore",
        description: `Si è verificato un errore: ${error instanceof Error ? error.message : "Errore sconosciuto"}`,
      });
    },
  });

  const updateEquipmentMutation = useMutation({
    mutationFn: async (equipment: Equipment) => {
      const { data, error } = await supabase
        .from("equipment")
        .update({
          name: equipment.name,
          type: equipment.type,
          status: equipment.status,
        })
        .eq("id", equipment.id)
        .select();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["equipment"] });
      toast({
        title: "Attrezzatura aggiornata",
        description: "L'attrezzatura è stata aggiornata con successo",
      });
      setEditingEquipment(null);
      setOpen(false);
    },
  });

  const deleteEquipmentMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("equipment")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["equipment"] });
      toast({
        title: "Attrezzatura eliminata",
        description: "L'attrezzatura è stata eliminata con successo",
      });
    },
  });

  const handleCreateOrUpdateEquipment = () => {
    if (!newEquipment.name || !newEquipment.type) {
      toast({
        variant: "destructive",
        title: "Dati mancanti",
        description: "Nome e tipo sono campi obbligatori",
      });
      return;
    }

    if (editingEquipment) {
      updateEquipmentMutation.mutate({
        ...editingEquipment,
        ...newEquipment,
      });
    } else {
      createEquipmentMutation.mutate(newEquipment);
    }
  };

  const handleEdit = (equipment: Equipment) => {
    setEditingEquipment(equipment);
    setNewEquipment({
      name: equipment.name,
      type: equipment.type,
      status: equipment.status,
    });
    setOpen(true);
  };

  const handleDelete = (id: string) => {
    if (window.confirm("Sei sicuro di voler eliminare questa attrezzatura?")) {
      deleteEquipmentMutation.mutate(id);
    }
  };

  const getStatusBadge = (status: string) => {
    const statusOption = statusOptions.find((opt) => opt.value === status);
    if (!statusOption) return null;

    return (
      <Badge className={`${statusOption.color} text-white`}>
        {statusOption.label}
      </Badge>
    );
  };

  const generatePDF = async () => {
    try {
      const pdf = new jsPDF();

      // Add title
      pdf.setFontSize(20);
      pdf.text("Lista Attrezzatura", 20, 20);

      // Add equipment list
      pdf.setFontSize(12);
      let yPos = 40;

      equipment?.forEach((item, index) => {
        if (yPos > 250) {
          pdf.addPage();
          yPos = 20;
        }

        pdf.setFont("helvetica", "bold");
        pdf.text(`${index + 1}. ${item.name}`, 20, yPos);
        pdf.setFont("helvetica", "normal");
        pdf.text(`Tipo: ${item.type}`, 30, yPos + 7);
        pdf.text(`Stato: ${statusOptions.find(opt => opt.value === item.status)?.label}`, 30, yPos + 14);

        yPos += 25;
      });

      pdf.save("attrezzatura.pdf");

      toast({
        title: "PDF Generato",
        description: "Il PDF dell'attrezzatura è stato generato con successo",
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Errore",
        description: "Impossibile generare il PDF",
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
        <h2 className="text-2xl font-bold">Attrezzatura</h2>
        <div className="flex gap-2">
          {equipment && equipment.length > 0 && (
            <EquipmentPdfGenerator 
              equipmentList={equipment} 
              title="Inventario Attrezzatura"
            />
          )}
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button>
                {editingEquipment ? "Modifica Attrezzatura" : "Aggiungi Attrezzatura"}
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>
                  {editingEquipment ? "Modifica attrezzatura" : "Aggiungi una nuova attrezzatura"}
                </DialogTitle>
                <DialogDescription>
                  {editingEquipment
                    ? "Modifica i dettagli dell'attrezzatura"
                    : "Inserisci i dettagli della nuova attrezzatura"}
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="name">Nome *</Label>
                  <Input
                    id="name"
                    name="name"
                    value={newEquipment.name}
                    onChange={(e) =>
                      setNewEquipment((prev) => ({ ...prev, name: e.target.value }))
                    }
                    placeholder="Nome dell'attrezzatura"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="type">Tipo *</Label>
                  <Select
                    value={newEquipment.type}
                    onValueChange={(value) =>
                      setNewEquipment((prev) => ({ ...prev, type: value }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Seleziona un tipo" />
                    </SelectTrigger>
                    <SelectContent>
                      {equipmentTypes.map((type) => (
                        <SelectItem key={type} value={type}>
                          {type}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="status">Stato</Label>
                  <Select
                    value={newEquipment.status}
                    onValueChange={(value: "available" | "in_use" | "maintenance") =>
                      setNewEquipment((prev) => ({ ...prev, status: value }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Seleziona uno stato" />
                    </SelectTrigger>
                    <SelectContent>
                      {statusOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button
                  onClick={handleCreateOrUpdateEquipment}
                  disabled={createEquipmentMutation.isPending || updateEquipmentMutation.isPending}
                >
                  {createEquipmentMutation.isPending || updateEquipmentMutation.isPending
                    ? "Salvataggio..."
                    : "Salva"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Tutta l'attrezzatura</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableCaption>
                {equipment && equipment.length > 0
                  ? "Elenco della tua attrezzatura"
                  : "Nessuna attrezzatura trovata"}
              </TableCaption>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Stato</TableHead>
                  <TableHead className="w-[100px]">Azioni</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {equipment && equipment.length > 0 ? (
                  equipment.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium">{item.name}</TableCell>
                      <TableCell>{item.type}</TableCell>
                      <TableCell>{getStatusBadge(item.status)}</TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleEdit(item)}>
                              <Edit className="mr-2 h-4 w-4" />
                              Modifica
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="text-red-600"
                              onClick={() => handleDelete(item.id)}
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Elimina
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center">
                      Nessuna attrezzatura trovata. Aggiungi la tua prima attrezzatura!
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}