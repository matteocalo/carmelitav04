
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/use-auth";
import { Skeleton } from "@/components/ui/skeleton";

type Team = {
  id: string;
  name: string;
  owner_id: string;
  created_at: string;
  members?: TeamMember[];
};

type TeamMember = {
  id: string;
  username: string;
  email: string;
  role: string;
};

export default function Team() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [newTeam, setNewTeam] = useState({
    name: "",
  });
  const queryClient = useQueryClient();

  const { data: team, isLoading } = useQuery<Team | null>({
    queryKey: ["team"],
    queryFn: async () => {
      if (!user) return null;
      
      // Check if user owns a team
      const { data: ownedTeams, error: ownedTeamsError } = await supabase
        .from("teams")
        .select("*")
        .eq("owner_id", user.id);

      if (ownedTeamsError) throw ownedTeamsError;
      
      if (ownedTeams && ownedTeams.length > 0) {
        // Get team members
        const { data: members, error: membersError } = await supabase
          .from("users")
          .select("id, username, email, role")
          .eq("team_id", ownedTeams[0].id);

        if (membersError) throw membersError;
        
        return {
          ...ownedTeams[0],
          members: members || []
        };
      }
      
      // If user doesn't own a team, check if they are a member of a team
      const { data: userData, error: userError } = await supabase
        .from("users")
        .select("team_id")
        .eq("id", user.id)
        .single();
        
      if (userError) throw userError;
      
      if (userData?.team_id) {
        const { data: teamData, error: teamError } = await supabase
          .from("teams")
          .select("*")
          .eq("id", userData.team_id)
          .single();
          
        if (teamError) throw teamError;
        
        // Get team members
        const { data: members, error: membersError } = await supabase
          .from("users")
          .select("id, username, email, role")
          .eq("team_id", userData.team_id);
          
        if (membersError) throw membersError;
        
        return {
          ...teamData,
          members: members || []
        };
      }
      
      return null;
    },
    enabled: !!user,
  });

  const createTeamMutation = useMutation({
    mutationFn: async (newTeam: { name: string }) => {
      if (!user) throw new Error("Utente non autenticato");

      // Create a new team
      const { data: teamData, error: teamError } = await supabase
        .from("teams")
        .insert([
          {
            name: newTeam.name,
            owner_id: user.id,
          },
        ])
        .select()
        .single();

      if (teamError) throw teamError;
      
      // Update user's team_id
      const { error: userError } = await supabase
        .from("users")
        .update({ team_id: teamData.id })
        .eq("id", user.id);
        
      if (userError) throw userError;
      
      return teamData;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["team"] });
      toast({
        title: "Team creato",
        description: "Il team è stato creato con successo",
      });
      setOpen(false);
      setNewTeam({ name: "" });
    },
    onError: (error) => {
      toast({
        variant: "destructive",
        title: "Errore",
        description: `Si è verificato un errore: ${error instanceof Error ? error.message : "Errore sconosciuto"}`,
      });
    },
  });

  const handleCreateTeam = () => {
    if (!newTeam.name) {
      toast({
        variant: "destructive",
        title: "Nome mancante",
        description: "Il nome del team è un campo obbligatorio",
      });
      return;
    }

    createTeamMutation.mutate(newTeam);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setNewTeam((prev) => ({ ...prev, [name]: value }));
  };

  const isOwner = team && user ? team.owner_id === user.id : false;

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
        <h2 className="text-2xl font-bold">Team</h2>
        {!team && (
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button>Crea Team</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Crea un nuovo team</DialogTitle>
                <DialogDescription>
                  Inserisci il nome del nuovo team
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="name">Nome *</Label>
                  <Input
                    id="name"
                    name="name"
                    value={newTeam.name}
                    onChange={handleInputChange}
                    placeholder="Nome del team"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button
                  onClick={handleCreateTeam}
                  disabled={createTeamMutation.isPending}
                >
                  {createTeamMutation.isPending ? "Creazione..." : "Crea Team"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {team ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex justify-between items-center">
              <span>{team.name}</span>
              {isOwner && (
                <Badge className="bg-green-500">Proprietario</Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <h3 className="text-lg font-semibold mb-4">Membri del team</h3>
            <div className="space-y-4">
              {team.members && team.members.length > 0 ? (
                team.members.map((member) => (
                  <div key={member.id} className="flex items-center justify-between border-b pb-2">
                    <div className="flex items-center space-x-3">
                      <Avatar>
                        <AvatarFallback>
                          {member.username?.substring(0, 2).toUpperCase() || member.email.substring(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium">{member.username || member.email}</p>
                        <p className="text-sm text-muted-foreground">{member.email}</p>
                      </div>
                    </div>
                    <Badge>
                      {member.role === "photographer" ? "Fotografo" : "Assistente"}
                    </Badge>
                  </div>
                ))
              ) : (
                <p className="text-center py-6 text-muted-foreground">
                  Nessun membro nel team.
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="text-center p-8 bg-muted rounded-lg">
          <h3 className="text-lg font-medium mb-2">Non sei ancora parte di un team</h3>
          <p className="mb-4 text-muted-foreground">
            Crea un nuovo team per iniziare a collaborare con altre persone.
          </p>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button>Crea Team</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Crea un nuovo team</DialogTitle>
                <DialogDescription>
                  Inserisci il nome del nuovo team
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="name">Nome *</Label>
                  <Input
                    id="name"
                    name="name"
                    value={newTeam.name}
                    onChange={handleInputChange}
                    placeholder="Nome del team"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button
                  onClick={handleCreateTeam}
                  disabled={createTeamMutation.isPending}
                >
                  {createTeamMutation.isPending ? "Creazione..." : "Crea Team"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      )}
    </div>
  );
}
