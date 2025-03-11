import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Camera,
  Users,
  Box,
  Calendar as CalendarIcon,
  Users2,
  LogOut,
  Boxes,
  Receipt,
  Image,
  MessageSquare
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { Badge } from "@/components/ui/badge"; // Added import for Badge


const menuItems = [
  { icon: Camera, label: "Dashboard", href: "/", emoji: "📸" },
  { icon: Receipt, label: "Dati Fiscali", href: "/profile/settings?tab=fiscal", emoji: "📑" },
  { icon: Image, label: "Gestisci i tuoi lavori ", href: "/photo-jobs", emoji: "🖼️" },
  { icon: Users, label: "Clienti", href: "/clients", emoji: "👥" },
  { icon: Box, label: "Attrezzatura", href: "/equipment", emoji: "🎥" },
  { icon: Boxes, label: "Preset Attrezzatura", href: "/equipment/presets", emoji: "📦" },
  { icon: CalendarIcon, label: "Calendario", href: "/calendar", emoji: "📅" },
  { icon: Users2, label: "Team", href: "/team", emoji: "👥" },
];

export default function Sidebar() {
  const [location] = useLocation();
  const { logoutMutation } = useAuth();
  const { user } = useAuth(); // Added to access user authentication status
  const [unreadCommentsCount, setUnreadCommentsCount] = useState(0);

  const { data: commentsCount } = useQuery({
    queryKey: ["unread-comments-count"],
    queryFn: async () => {
      if (!user) return 0;

      const { count, error } = await supabase
        .from("job_comments")
        .select("id", { count: "exact", head: true })
        .eq("is_read", false)
        .in("job_id", supabase.from("photo_jobs").select("id").eq("user_id", user.id));

      if (error) {
        console.error("Error fetching unread comments count:", error);
        return 0;
      }

      return count || 0;
    },
    enabled: !!user,
    refetchInterval: 60000, // Refresh every minute
  });

  useEffect(() => {
    if (commentsCount !== undefined) {
      setUnreadCommentsCount(commentsCount);
    }
  }, [commentsCount]);

  const handleLogout = async () => {
    try {
      await logoutMutation.mutateAsync();
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  return (
    <div className="w-64 bg-gray-800 border-r border-gray-700 shadow-lg shadow-black/20 z-10">
      <div className="h-16 flex items-center px-6 border-b border-gray-700">
        <h1 className="text-xl font-bold text-white">
          Carmelita
        </h1>
      </div>

      <nav className="p-4 space-y-2">
        {menuItems.map(({ icon: Icon, label, href, emoji }) => (
          <Link key={href} href={href}>
            <Button
              variant={location === href ? "secondary" : "ghost"}
              className={cn(
                "w-full justify-start gap-2 transition-all duration-300 ease-in-out hover:scale-105",
                (location === href) && "bg-gray-700 hover:bg-gray-600 text-white"
              )}
            >
              <span className="flex items-center gap-2">
                <Icon className="h-4 w-4 text-white" />
                <span className="text-white">{emoji}</span>
              </span>
              <span className="text-white">{label}</span>
            </Button>
          </Link>
        ))}
        {/* Added comments link */}
        <Link href="/photo-jobs/comments"> {/* Assumed route */}
          <Button variant="ghost" className="w-full justify-start gap-2">
            <MessageSquare className="h-4 w-4 text-white" />
            <span className="text-white">Commenti</span>
            {unreadCommentsCount > 0 && (
              <Badge variant="destructive" className="ml-auto text-xs">
                {unreadCommentsCount}
              </Badge>
            )}
          </Button>
        </Link>
      </nav>

      <div className="absolute bottom-4 w-64 px-4">
        <Button
          variant="ghost"
          className="w-full justify-start gap-2 text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-colors duration-200"
          onClick={handleLogout}
          disabled={logoutMutation.isPending}
        >
          <LogOut className="h-4 w-4 text-red-400" />
          <span className="text-red-400">{logoutMutation.isPending ? "Disconnessione..." : "Esci"}</span>
        </Button>
      </div>
    </div>
  );
}