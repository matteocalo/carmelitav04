import { createContext, ReactNode, useContext, useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";

type User = {
  id: string;
  email: string;
  username: string;
  role: 'photographer' | 'assistant';
  business_name?: string;
  vat_number?: string;
  fiscal_code?: string;
  address?: string;
  city?: string;
  postal_code?: string;
  province?: string;
  sdi_code?: string;
  pec_email?: string;
};

type AuthStatus = "INITIAL_SESSION" | "LOADING" | "SUCCESS" | "ERROR";

type AuthContextType = {
  user: User | null;
  setUser: ((user: User) => void) | null;
  status: AuthStatus;
  isLoading: boolean;
  error: Error | null;
  logoutMutation: ReturnType<typeof useLogoutMutation>;
};

const AuthContext = createContext<AuthContextType | null>(null);

const useLogoutMutation = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, navigate] = useLocation();

  return useMutation({
    mutationFn: async () => {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      return true;
    },
    onSuccess: () => {
      queryClient.setQueryData(["auth-user"], null);
      queryClient.clear();
      navigate("/login");
      toast({
        title: "Logout effettuato",
        description: "Sei stato disconnesso con successo",
      });
    },
    onError: (error: Error) => {
      console.error("Logout error:", error);
      toast({
        variant: "destructive",
        title: "Errore durante il logout",
        description: error.message,
      });
      queryClient.setQueryData(["auth-user"], null);
      queryClient.clear();
      navigate("/login");
    },
  });
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [userState, setUserState] = useState<User | null>(null);
  const [status, setStatus] = useState<AuthStatus>("INITIAL_SESSION");
  const [errorState, setErrorState] = useState<Error | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const queryClient = useQueryClient();
  const [, navigate] = useLocation();
  const logoutMutation = useLogoutMutation();
  const { toast } = useToast();

  const setUser = (updatedUser: User) => {
    setUserState(updatedUser);
  };

  useEffect(() => {
    const initializeAuth = async () => {
      try {
        setStatus("LOADING");
        const { data: { session }, error } = await supabase.auth.getSession();
        if (error) throw new Error(error.message);

        if (session?.user) {
          const userData: User = {
            id: session.user.id,
            email: session.user.email!,
            username: session.user.user_metadata.username || '',
            role: session.user.user_metadata.role || 'photographer',
            business_name: session.user.user_metadata.business_name,
            vat_number: session.user.user_metadata.vat_number,
            fiscal_code: session.user.user_metadata.fiscal_code,
            address: session.user.user_metadata.address,
            city: session.user.user_metadata.city,
            postal_code: session.user.user_metadata.postal_code,
            province: session.user.user_metadata.province,
            sdi_code: session.user.user_metadata.sdi_code,
            pec_email: session.user.user_metadata.pec_email,
          };
          setUserState(userData);
          setStatus("SUCCESS");
        } else if (window.location.pathname !== '/register' && window.location.pathname !== '/login') {
          navigate("/login");
        } else {
          setStatus("SUCCESS");
        }
      } catch (error) {
        const authError = error instanceof Error ? error : new Error('Authentication failed');
        console.error("Error initializing auth:", authError);
        setErrorState(authError);
        setStatus("ERROR");
        toast({
          variant: "destructive",
          title: "Errore di autenticazione",
          description: "Si è verificato un errore durante l'inizializzazione dell'autenticazione",
        });
        navigate("/login");
      } finally {
        setIsInitialized(true);
      }
    };
    initializeAuth();
  }, [queryClient, navigate, toast]);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      try {
        if (event === 'SIGNED_IN' && session?.user) {
          const userData: User = {
            id: session.user.id,
            email: session.user.email!,
            username: session.user.user_metadata.username || '',
            role: session.user.user_metadata.role || 'photographer',
            business_name: session.user.user_metadata.business_name,
            vat_number: session.user.user_metadata.vat_number,
            fiscal_code: session.user.user_metadata.fiscal_code,
            address: session.user.user_metadata.address,
            city: session.user.user_metadata.city,
            postal_code: session.user.user_metadata.postal_code,
            province: session.user.user_metadata.province,
            sdi_code: session.user.user_metadata.sdi_code,
            pec_email: session.user.user_metadata.pec_email,
          };
          setUser(userData);
          setStatus("SUCCESS");
        } else if (event === 'SIGNED_OUT') {
          setUserState(null);
          setStatus("SUCCESS");
          if (window.location.pathname !== '/register') {
            navigate('/login');
          }
        }
      } catch (error) {
        const authError = error instanceof Error ? error : new Error('Authentication state change failed');
        console.error("Auth state change error:", authError);
        setErrorState(authError);
        setStatus("ERROR");
        setUserState(null);
        navigate('/login');
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [queryClient, navigate, setUser]);

  if (!isInitialized) {
    return null;
  }

  return (
    <AuthContext.Provider
      value={{
        user: userState,
        setUser,
        status,
        isLoading: status === "LOADING",
        error: errorState,
        logoutMutation,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}