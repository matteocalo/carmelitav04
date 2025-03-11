import { useEffect } from "react";
import { Loader2 } from "lucide-react";
import { Route, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { Redirect } from "wouter";

export function ProtectedRoute({
  path,
  component: Component,
}: {
  path: string;
  component: () => JSX.Element;
}) {
  const { user, isLoading } = useAuth();
  const [, navigate] = useLocation();

  useEffect(() => {
    if (!isLoading && !user && window.location.pathname !== '/register') {
      navigate("/login");
    }
  }, [user, isLoading, navigate]);

  // Bypassa la protezione per il portale cliente
  if (path && path.startsWith("/client-portal/")) {
    return <Route path={path} component={Component} />;
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return user ? <Route path={path} component={Component} /> : null;
}