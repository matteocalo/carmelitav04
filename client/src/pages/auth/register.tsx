import { useState } from "react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/lib/supabase";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2 } from "lucide-react";

const registerSchema = z.object({
  username: z.string().min(3, "Username deve essere almeno 3 caratteri"),
  email: z.string().email("Indirizzo email non valido"),
  password: z.string()
    .min(8, "La password deve essere almeno 8 caratteri")
    .regex(/[A-Z]/, "La password deve contenere almeno una lettera maiuscola")
    .regex(/[0-9]/, "La password deve contenere almeno un numero")
    .regex(/[^A-Za-z0-9]/, "La password deve contenere almeno un carattere speciale"),
  role: z.enum(["photographer", "videomaker", "production_house"]),
});

type RegisterForm = z.infer<typeof registerSchema>;

const calculatePasswordStrength = (password: string) => {
  let strength = 0;
  if (password.length >= 8) strength += 25;
  if (/[A-Z]/.test(password)) strength += 25;
  if (/[0-9]/.test(password)) strength += 25;
  if (/[^A-Za-z0-9]/.test(password)) strength += 25;
  return strength;
};

const roleLabels = {
  photographer: "Fotografo",
  videomaker: "Videomaker",
  production_house: "Casa di Produzione"
};

export default function Register() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const form = useForm<RegisterForm>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      username: "",
      email: "",
      password: "",
      role: "photographer",
    },
  });

  async function onSubmit(data: RegisterForm) {
    if (isLoading) return;
    setIsLoading(true);
    setError(null);

    try {
      const { error } = await supabase.auth.signUp({
        email: data.email,
        password: data.password,
        options: {
          data: {
            username: data.username,
            role: data.role,
          },
        },
      });

      if (error) throw error;

      toast({
        title: "Registrazione completata",
        description: "La registrazione è avvenuta con successo. Effettua il login.",
      });
      navigate("/login");
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Si è verificato un errore durante la registrazione";
      setError(errorMessage);
      toast({
        variant: "destructive",
        title: "Errore di registrazione",
        description: errorMessage,
      });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/20 via-background to-background">
      <Card className="w-full max-w-[400px] animate-scale-in">
        <CardHeader className="space-y-2">
          <CardTitle className="text-2xl font-bold heading-gradient">
            Crea il tuo account
          </CardTitle>
          <CardDescription className="text-muted-foreground">
            Unisciti a Carmelita e porta il tuo lavoro al livello successivo
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4 animate-slide-up">
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="username"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Username</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="Il tuo username"
                          className="mobile-input"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input
                          type="email"
                          placeholder="La tua email"
                          className="mobile-input"
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
                          placeholder="Crea una password sicura"
                          className="mobile-input"
                          onChange={(e) => {
                            field.onChange(e);
                            setPasswordStrength(calculatePasswordStrength(e.target.value));
                          }}
                          {...field}
                        />
                      </FormControl>
                      <Progress 
                        value={passwordStrength} 
                        className="h-1 mt-2"
                        style={{
                          background: 'rgba(0,0,0,0.1)',
                        }}
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        La password deve contenere almeno 8 caratteri, una lettera maiuscola, un numero e un carattere speciale
                      </p>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="role"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tipo di Attività</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger className="mobile-input">
                            <SelectValue placeholder="Seleziona il tipo di attività" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {Object.entries(roleLabels).map(([value, label]) => (
                            <SelectItem key={value} value={value}>
                              {label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button
                  type="submit"
                  className="w-full btn-gradient mobile-button"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Creazione account...
                    </>
                  ) : (
                    "Inizia ora"
                  )}
                </Button>

                <div className="text-center text-sm">
                  <Button
                    variant="link"
                    onClick={() => navigate("/login")}
                    className="text-primary hover:text-accent transition-colors"
                  >
                    Hai già un account? Accedi
                  </Button>
                </div>
              </form>
            </Form>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}