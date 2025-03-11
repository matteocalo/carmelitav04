import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
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
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/use-auth";
import { Edit, Trash2 } from "lucide-react";

type EquipmentPreset = {
  id: string;
  name: string;
  type: string;
  equipment_ids: string[];
};

type Equipment = {
  id: string;
  name: string;
  type: string;
};

export default function EquipmentPresets() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [editingPreset, setEditingPreset] = useState<EquipmentPreset | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    type: "",
    equipment_ids: [] as string[],
  });

  const queryClient = useQueryClient();

  const { data: equipment } = useQuery<Equipment[]>({
    queryKey: ["equipment"],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("equipment")
        .select("id, name, type")
        .eq("user_id", user.id);

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

  const createPresetMutation = useMutation({
    mutationFn: async (newPreset: Omit<EquipmentPreset, "id">) => {
      if (!user) throw new Error("Utente non autenticato");

      const { data, error } = await supabase
        .from("equipment_presets")
        .insert([{
          ...newPreset,
          user_id: user.id,
        }])
        .select();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["equipment-presets"] });
      toast({
        title: "Preset creato",
        description: "Il preset è stato creato con successo",
      });
      setOpen(false);
      resetForm();
    },
  });

  const updatePresetMutation = useMutation({
    mutationFn: async (preset: EquipmentPreset) => {
      if (!user) throw new Error("Utente non autenticato");

      const { data, error } = await supabase
        .from("equipment_presets")
        .update({
          name: preset.name,
          type: preset.type,
          equipment_ids: preset.equipment_ids,
        })
        .eq("id", preset.id)
        .select();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["equipment-presets"] });
      toast({
        title: "Preset aggiornato",
        description: "Il preset è stato aggiornato con successo",
      });
      setOpen(false);
      resetForm();
    },
  });

  const deletePresetMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("equipment_presets")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["equipment-presets"] });
      toast({
        title: "Preset eliminato",
        description: "Il preset è stato eliminato con successo",
      });
    },
  });

  const handleEquipmentToggle = (equipmentId: string) => {
    setFormData(prev => {
      const newEquipmentIds = prev.equipment_ids.includes(equipmentId)
        ? prev.equipment_ids.filter(id => id !== equipmentId)
        : [...prev.equipment_ids, equipmentId];
      return { ...prev, equipment_ids: newEquipmentIds };
    });
  };

  const handleSubmit = () => {
    if (!formData.name || !formData.type || formData.equipment_ids.length === 0) {
      toast({
        variant: "destructive",
        title: "Dati mancanti",
        description: "Nome, tipo e almeno un'attrezzatura sono richiesti",
      });
      return;
    }

    if (editingPreset) {
      updatePresetMutation.mutate({
        ...editingPreset,
        name: formData.name,
        type: formData.type,
        equipment_ids: formData.equipment_ids,
      });
    } else {
      createPresetMutation.mutate(formData);
    }
  };

  const handleEdit = (preset: EquipmentPreset) => {
    setEditingPreset(preset);
    setFormData({
      name: preset.name,
      type: preset.type,
      equipment_ids: preset.equipment_ids,
    });
    setOpen(true);
  };

  const handleDelete = (id: string) => {
    if (window.confirm("Sei sicuro di voler eliminare questo preset?")) {
      deletePresetMutation.mutate(id);
    }
  };

  const resetForm = () => {
    setEditingPreset(null);
    setFormData({
      name: "",
      type: "",
      equipment_ids: [],
    });
  };

  // Reset form when dialog closes
  const handleOpenChange = (open: boolean) => {
    setOpen(open);
    if (!open) {
      resetForm();
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Preset Attrezzatura</h2>
        <Dialog open={open} onOpenChange={handleOpenChange}>
          <DialogTrigger asChild>
            <Button>Crea Nuovo Preset</Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>
                {editingPreset ? "Modifica preset" : "Crea un nuovo preset"}
              </DialogTitle>
              <DialogDescription>
                {editingPreset 
                  ? "Modifica i dettagli del preset esistente" 
                  : "Crea un preset per il tuo tipo di lavoro preferito"}
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="name">Nome Preset</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Es: Set Fotografico Base"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="type">Tipo di Lavoro</Label>
                <Input
                  id="type"
                  value={formData.type}
                  onChange={(e) => setFormData(prev => ({ ...prev, type: e.target.value }))}
                  placeholder="Es: Sfilata, Matrimonio, etc."
                />
              </div>
              <div className="grid gap-2">
                <Label>Attrezzatura</Label>
                <ScrollArea className="h-[200px] border rounded-md p-4">
                  <div className="space-y-2">
                    {equipment?.map((item) => (
                      <div key={item.id} className="flex items-center space-x-2">
                        <Checkbox
                          id={item.id}
                          checked={formData.equipment_ids.includes(item.id)}
                          onCheckedChange={() => handleEquipmentToggle(item.id)}
                        />
                        <Label htmlFor={item.id}>{item.name}</Label>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </div>
            </div>
            <DialogFooter>
              <Button onClick={handleSubmit} disabled={createPresetMutation.isPending || updatePresetMutation.isPending}>
                {createPresetMutation.isPending || updatePresetMutation.isPending 
                  ? "Salvataggio..." 
                  : editingPreset 
                    ? "Salva Modifiche" 
                    : "Crea Preset"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {presets?.map((preset) => (
          <Card key={preset.id}>
            <CardHeader>
              <CardTitle>{preset.name}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-2">
                Tipo: {preset.type}
              </p>
              <div className="space-y-1">
                <p className="text-sm font-medium">Attrezzatura inclusa:</p>
                <ul className="list-disc list-inside text-sm text-muted-foreground">
                  {equipment
                    ?.filter(item => preset.equipment_ids.includes(item.id))
                    .map(item => (
                      <li key={item.id}>{item.name}</li>
                    ))}
                </ul>
              </div>
            </CardContent>
            <CardFooter className="flex justify-end gap-2">
              <Button variant="outline" size="sm" onClick={() => handleEdit(preset)}>
                <Edit className="h-4 w-4 mr-1" /> Modifica
              </Button>
              <Button variant="destructive" size="sm" onClick={() => handleDelete(preset.id)}>
                <Trash2 className="h-4 w-4 mr-1" /> Elimina
              </Button>
            </CardFooter>
          </Card>
        ))}
      </div>
    </div>
  );
}
