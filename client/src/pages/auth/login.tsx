import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/lib/supabase";
import { useQueryClient } from "@tanstack/react-query";
import { Loader2, Github } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const loginSchema = z.object({
  email: z.string().email("Indirizzo email non valido"),
  password: z.string().min(1, "Password richiesta"),
  rememberMe: z.boolean().default(false),
});

type LoginForm = z.infer<typeof loginSchema>;

const calculatePasswordStrength = (password: string) => {
  let strength = 0;
  if (password.length >= 8) strength += 25;
  if (/[A-Z]/.test(password)) strength += 25;
  if (/[0-9]/.test(password)) strength += 25;
  if (/[^A-Za-z0-9]/.test(password)) strength += 25;
  return strength;
};

export default function Login() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [showRecoveryDialog, setShowRecoveryDialog] = useState(false);
  const queryClient = useQueryClient();

  const form = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
      rememberMe: false,
    },
  });

  useEffect(() => {
    const subscription = form.watch((value, { name }) => {
      if (name === "password") {
        setPasswordStrength(calculatePasswordStrength(value.password || ""));
      }
    });
    return () => subscription.unsubscribe();
  }, [form.watch]);

  async function onSubmit(data: LoginForm) {
    if (isLoading) return;
    setIsLoading(true);
    setError(null);

    try {
      const { error, data: authData } = await supabase.auth.signInWithPassword({
        email: data.email,
        password: data.password,
      });

      if (error) throw error;

      if (authData.user) {
        const userData = {
          id: authData.user.id,
          email: authData.user.email!,
          username: authData.user.user_metadata.username || "",
          role: authData.user.user_metadata.role || "photographer",
        };
        queryClient.setQueryData(["auth-user"], userData);
      }

      await new Promise((resolve) => setTimeout(resolve, 100));
      navigate("/");
    } catch (error) {
      const errorMessage =
        error instanceof Error
          ? error.message === "Invalid login credentials"
            ? "Credenziali non valide"
            : error.message
          : "Si è verificato un errore durante l'accesso";
      setError(errorMessage);
      toast({
        variant: "destructive",
        title: "Errore di accesso",
        description: errorMessage,
      });
    } finally {
      setIsLoading(false);
    }
  }

  async function handleSocialLogin(provider: "github") {
    try {
      setIsLoading(true);
      setError(null);
      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      });
      if (error) throw error;
    } catch (error) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : "Errore durante l'accesso social";
      setError(errorMessage);
      toast({
        variant: "destructive",
        title: "Errore di accesso",
        description: errorMessage,
      });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <>
      <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-background via-background/95 to-background/90">
        <Card
          className="w-full max-w-[400px] shadow-xl border-accent/20 glass hover:shadow-2xl transition-shadow duration-300"
        >
          <CardHeader className="space-y-2">
            <CardTitle className="text-3xl     font-bold text-accent-foreground">
              Bentornato in Carmelita
            </CardTitle>
            <CardDescription className="font-bold text-accent-foreground">
              La tua assistente digitale personale 👩🏼‍💼
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4">
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t border-border" />
                </div>
                <div className="relative flex justify-center text-xs uppercase "></div>
              </div>

              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <Form {...form}>
                <form
                  onSubmit={form.handleSubmit(onSubmit)}
                  className="space-y-4"
                >
                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email</FormLabel>
                        <FormControl>
                          <Input
                            type="email"
                            placeholder="Inserisci la tua email"
                            autoComplete="email"
                            className="bg-input"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Password</FormLabel>
                        <FormControl>
                          <Input
                            type="password"
                            placeholder="Inserisci la tua password"
                            autoComplete="current-password"
                            className="bg-input "
                            {...field}
                          />
                        </FormControl>
                        <Progress
                          value={passwordStrength}
                          className="h-1 mt-2"
                          style={{
                            background: "rgba(255,255,255,0.1)",
                          }}
                        />
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="rememberMe"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center space-x-3 space-y-0">
                        <FormControl>
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                        <FormLabel className="text-sm font-normal">
                          Ricordami
                        </FormLabel>
                      </FormItem>
                    )}
                  />
                  <Button
                    type="submit"
                    className="w-full bg-gradient-to-r from-primary to-accent hover:opacity-90 transition-all duration-200"
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Accesso in corso...
                      </>
                    ) : (
                      "Accedi"
                    )}
                  </Button>
                </form>
              </Form>

              <div className="space-y-2 text-center text-sm">
                <Button
                  variant="link"
                  onClick={() => navigate("/register")}
                  className="text-primary hover:text-accent transition-colors"
                >
                  Non hai un account? Registrati
                </Button>
                <Button
                  variant="link"
                  onClick={() => setShowRecoveryDialog(true)}
                  className="block w-full text-muted-foreground hover:text-primary"
                >
                  Password dimenticata?
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Dialog open={showRecoveryDialog} onOpenChange={setShowRecoveryDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Recupero Password</DialogTitle>
            <DialogDescription className="space-y-2">
              <p>
                Per il recupero della password, contatta il nostro team di
                assistenza all'indirizzo:
              </p>
              <p className="font-medium text-primary">info@carmelita.it</p>
              <p className="text-sm text-muted-foreground mt-4">
                Il team di Carmelita è sempre a tua disposizione per aiutarti a
                gestire il tuo lavoro in modo efficiente e professionale.
              </p>
            </DialogDescription>
          </DialogHeader>
        </DialogContent>
      </Dialog>
    </>
  );
}