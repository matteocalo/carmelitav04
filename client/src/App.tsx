
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { AuthProvider } from "./hooks/use-auth";
import { Switch, Route, useLocation } from "wouter";
import { Toaster } from "@/components/ui/toaster";
import NotFound from "@/pages/not-found";
import Login from "@/pages/auth/login";
import Register from "@/pages/auth/register";
import Dashboard from "@/pages/dashboard";
import Clients from "@/pages/clients";
import Equipment from "@/pages/equipment";
import Calendar from "@/pages/calendar";
import Team from "@/pages/team";
import Sidebar from "@/components/layout/sidebar";
import Header from "@/components/layout/header";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { Suspense, useState, useEffect } from "react";
import EquipmentPresets from "@/pages/equipment/presets";
import { Button } from "@/components/ui/button";
import {
  HomeIcon,
  Users2Icon,
  BoxIcon,
  CalendarIcon,
  BoxesIcon,
  MenuIcon,
  XIcon
} from "lucide-react";
import React, { lazy } from "react";
import ProfileSettings from "./pages/profile/settings";
import PhotoJobs from "@/pages/photo-jobs";
import Comments from "@/pages/photo-jobs/comments";
import ClientPortal from "./pages/client-portal/[token]";
import ErrorBoundary from "@/components/ErrorBoundary";
import { Loader2, AlertTriangle, CheckCircle, MessageCircle } from "lucide-react"; // Added required imports

// If you want to use lazy loading instead, uncomment this and use LazyProfileSettings component
// const LazyProfileSettings = lazy(() => import("./pages/profile/settings"));

const mobileNavItems = [
  { icon: HomeIcon, label: "Home", href: "/" },
  { icon: Users2Icon, label: "Clienti", href: "/clients" },
  { icon: BoxIcon, label: "Attrezzatura", href: "/equipment" },
  { icon: BoxesIcon, label: "Preset", href: "/equipment/presets" },
  { icon: CalendarIcon, label: "Calendario", href: "/calendar" },
  { icon: Users2Icon, label: "Lavori", href: "/photo-jobs" },
  { icon: MessageCircle, label: "Commenti", href: "/photo-jobs/comments" },
  { icon: CheckCircle, label: "Dati Fiscali", href: "/profile/settings" },
];

function MobileNav() {
  const [location, setLocation] = useLocation();
  const [isOpen, setIsOpen] = useState(false);

  // Chiudi il menu quando si cambia pagina
  useEffect(() => {
    setIsOpen(false);
  }, [location]);

  return (
    <>
      {/* Pulsante toggle menu */}
      <Button
        variant="ghost"
        size="icon"
        className="fixed bottom-4 right-4 z-50 h-12 w-12 rounded-full bg-primary text-primary-foreground shadow-lg hover:bg-primary/90"
        onClick={() => setIsOpen(!isOpen)}
      >
        {isOpen ? (
          <XIcon className="h-5 w-5" />
        ) : (
          <MenuIcon className="h-5 w-5" />
        )}
      </Button>

      {/* Overlay scuro quando il menu è aperto */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-background/80 backdrop-blur-sm z-40"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Menu mobile */}
      <nav
        className={`fixed bottom-0 left-0 right-0 bg-card border-t border-border/10 p-4 z-50 transform transition-transform duration-300 ease-in-out ${
          isOpen ? "translate-y-0" : "translate-y-full"
        }`}
      >
        <div className="grid grid-cols-3 gap-4">
          {mobileNavItems.map(({ icon: Icon, label, href }) => (
            <Button
              key={href}
              variant="ghost"
              className={`flex flex-col items-center gap-2 p-3 transition-all duration-200 ${
                location === href
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-primary/5"
              }`}
              onClick={() => {
                setLocation(href);
                setIsOpen(false);
              }}
            >
              <Icon className="h-6 w-6" />
              <span className="text-xs font-medium">{label}</span>
            </Button>
          ))}
        </div>
      </nav>
    </>
  );
}

function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [isMobile, setIsMobile] = useState(false);
  
  useEffect(() => {
    // Set initial value
    setIsMobile(window.innerWidth < 768);
    
    // Add window resize listener
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    window.addEventListener('resize', handleResize);
    
    // Clean up
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  return (
    <div className="flex h-screen bg-background">
      {!isMobile && <Sidebar />}
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-auto p-4 md:p-6">
          <div className="max-w-7xl mx-auto w-full space-y-8">
            {children}
          </div>
          {isMobile && <MobileNav />}
        </main>
      </div>
    </div>
  );
}

const pathToTitle: Record<string, string> = {
  "/": "Dashboard",
  "/clients": "Clienti",
  "/equipment": "Attrezzatura",
  "/equipment/presets": "Preset Attrezzatura",
  "/calendar": "Calendario",
  "/team": "Team",
  "/profile/settings": "Impostazioni Profilo",
  "/photo-jobs": "Lavori Fotografici",
  "/photo-jobs/comments": "Commenti" 
};

export default function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <Suspense
            fallback={
              <div className="flex items-center justify-center h-screen">
                <Loader2 className="h-8 w-8 animate-spin" />
              </div>
            }
          >
            <Switch>
              <Route path="/login" component={Login} />
              <Route path="/register" component={Register} />
              
              {/* Portale cliente - rotta pubblica accessibile senza autenticazione */}
              <Route path="/client-portal/:token" component={ClientPortal} />

              {/* Rotte protette con layout dashboard */}
              <Route path="/">
                <ProtectedRoute
                  path="/"
                  component={() => (
                    <DashboardLayout>
                      <Dashboard />
                    </DashboardLayout>
                  )}
                />
              </Route>
              
              <Route path="/clients">
                <ProtectedRoute
                  path="/clients"
                  component={() => (
                    <DashboardLayout>
                      <Clients />
                    </DashboardLayout>
                  )}
                />
              </Route>
              
              <Route path="/equipment">
                <ProtectedRoute
                  path="/equipment"
                  component={() => (
                    <DashboardLayout>
                      <Equipment />
                    </DashboardLayout>
                  )}
                />
              </Route>
              
              <Route path="/equipment/presets">
                <ProtectedRoute
                  path="/equipment/presets"
                  component={() => (
                    <DashboardLayout>
                      <EquipmentPresets />
                    </DashboardLayout>
                  )}
                />
              </Route>
              
              <Route path="/calendar">
                <ProtectedRoute
                  path="/calendar"
                  component={() => (
                    <DashboardLayout>
                      <Calendar />
                    </DashboardLayout>
                  )}
                />
              </Route>
              
              <Route path="/team">
                <ProtectedRoute
                  path="/team"
                  component={() => (
                    <DashboardLayout>
                      <Team />
                    </DashboardLayout>
                  )}
                />
              </Route>
              
              <Route path="/profile/settings">
                <ProtectedRoute
                  path="/profile/settings"
                  component={() => (
                    <DashboardLayout>
                      <ProfileSettings />
                    </DashboardLayout>
                  )}
                />
              </Route>
              
              <Route path="/photo-jobs">
                <ProtectedRoute
                  path="/photo-jobs"
                  component={() => (
                    <DashboardLayout>
                      <PhotoJobs />
                    </DashboardLayout>
                  )}
                />
              </Route>

              <Route path="/photo-jobs/comments">
                <ProtectedRoute
                  path="/photo-jobs/comments"
                  component={() => (
                    <DashboardLayout>
                      <Comments />
                    </DashboardLayout>
                  )}
                />
              </Route>

              <Route component={NotFound} />
            </Switch>
          </Suspense>
          <Toaster />
        </AuthProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}
