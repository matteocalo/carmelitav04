import { useLocation } from "wouter";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuGroup,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/hooks/use-auth";
import { Receipt, Settings, LogOut } from "lucide-react";

const pathToTitle: Record<string, string> = {
  "/": "Dashboard",
  "/clients": "Clienti",
  "/equipment": "Attrezzatura",
  "/calendar": "Calendario",
  "/team": "Team",
};

export default function Header() {
  const [location, setLocation] = useLocation();
  const { user, logoutMutation } = useAuth();
  const title = pathToTitle[location] || "Non trovato";

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b border-border/50 bg-background/80 backdrop-blur-md px-4 sm:px-6 shadow-sm">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="relative h-8 w-10 rounded-full">
            <Avatar className="h-8 w-10">
              <AvatarFallback className="bg-gradient-to-r from-blue-500 to-red-100 text-black">
                {user?.username.substring(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-56" align="end" forceMount>
          <DropdownMenuLabel className="font-normal">
            <div className="flex flex-col space-y-1">
              <p className="text-sm font-medium leading-none">
                {user?.username}
              </p>
              <p className="text-xs leading-none text-muted-foreground">
                {user?.email}
              </p>
            </div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuGroup>
            <DropdownMenuItem onClick={() => setLocation("/profile/settings")}>
              <Settings className="mr-2 h-4 w-4" />
              Impostazioni Profilo
            </DropdownMenuItem>
            <DropdownMenuItem 
              onClick={() => setLocation("/profile/settings?tab=fiscal")}
              className="text-primary"
            >
              <Receipt className="mr-2 h-4 w-4" />
              Gestione Dati Fiscali
            </DropdownMenuItem>
          </DropdownMenuGroup>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            className="text-red-500 focus:text-red-500"
            onClick={() => logoutMutation.mutate()}
            disabled={logoutMutation.isPending}
          >
            <LogOut className="mr-2 h-4 w-4" />
            {logoutMutation.isPending ? "Disconnessione..." : "Esci"}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  );
}