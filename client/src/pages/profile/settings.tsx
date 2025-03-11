import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/lib/supabase";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, Save } from "lucide-react";
import BrowserOnlyPdfGenerator from "@/components/profile/BrowserOnlyPdfGenerator";

export default function ProfileSettings() {
  const { user, setUser } = useAuth();
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    username: "",
    businessName: "",
    vatNumber: "",
    fiscalCode: "",
    address: "",
    city: "",
    postalCode: "",
    province: "",
    sdiCode: "",
    pecEmail: "",
    iban: "",
    bankName: "",
    bankAddress: "",
    bicCode: "",
  });

  const [loading, setLoading] = useState(false);
  // Add proper type for error state
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0); // Stato per forzare il refresh

  // Determina la tab iniziale basandosi sui parametri URL
  const [defaultTab, setDefaultTab] = useState("personal");

  useEffect(() => {
    // Gestione sicura dei parametri URL
    if (typeof window !== "undefined") {
      const searchParams = new URLSearchParams(window.location.search);
      setDefaultTab(
        searchParams.get("tab") === "fiscal" ? "fiscal" : "personal",
      );
    }
  }, []);

  // Effetto per caricare i dati utente
  useEffect(() => {
    const loadUserData = async () => {
      if (!user || !user.id) return;

      try {
        // Fetch diretto dei dati utente da Supabase
        const { data, error: fetchError } = await supabase
          .from("users")
          .select("*")
          .eq("id", user.id)
          .single();

        if (fetchError) throw fetchError;

        if (data) {
          // Aggiorna lo stato locale con i dati freschi dal database
          setFormData({
            username: data.username || "",
            businessName: data.business_name || "",
            vatNumber: data.vat_number || "",
            fiscalCode: data.fiscal_code || "",
            address: data.address || "",
            city: data.city || "",
            postalCode: data.postal_code || "",
            province: data.province || "",
            sdiCode: data.sdi_code || "",
            pecEmail: data.pec_email || "",
            iban: data.iban || "",
            bankName: data.bank_name || "",
            bankAddress: data.bank_address || "",
            bicCode: data.bic_code || "",
          });

          // Aggiorna anche lo stato dell'utente nel contesto di autenticazione
          setUser(data);
        }
      } catch (err) {
        console.error("Errore nel caricamento dei dati utente:", err);
        setError("Impossibile caricare i dati utente. Riprova più tardi.");
      }
    };

    loadUserData();
  }, [user?.id, refreshKey]); // Aggiunto refreshKey come dipendenza

  const handleUpdate = async (isPersonal = true) => {
    setLoading(true);
    setError(null);

    try {
      const updateData = isPersonal
        ? { username: formData.username }
        : {
            business_name: formData.businessName,
            vat_number: formData.vatNumber,
            fiscal_code: formData.fiscalCode,
            address: formData.address,
            city: formData.city,
            postal_code: formData.postalCode,
            province: formData.province,
            sdi_code: formData.sdiCode,
            pec_email: formData.pecEmail,
            iban: formData.iban,
            bank_name: formData.bankName,
            bank_address: formData.bankAddress,
            bic_code: formData.bicCode,
          };

      const { error: updateError } = await supabase
        .from("users")
        .update(updateData)
        .eq("id", user.id);

      if (updateError) throw updateError;

      // Forza un refresh dei dati dopo l'aggiornamento
      setRefreshKey((prevKey) => prevKey + 1);

      toast({
        title: "Aggiornamento completato",
        description: "Le tue informazioni sono state aggiornate con successo.",
        variant: "default",
      });
    } catch (err) {
      console.error("Errore durante l'aggiornamento:", err);
      setError(
        "Si è verificato un errore durante l'aggiornamento delle informazioni.",
      );
    } finally {
      setLoading(false);
    }
  };

  // Add proper type for event handler
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };
  
  // Add null check for user
  if (!user?.id) {
    return <div>Loading...</div>;
  }
  
  // Remove the incorrect error state updates that were causing issues
  // setError("Impossibile caricare i dati utente. Riprova più tardi.");
  // setError("Si è verificato un errore durante l'aggiornamento delle informazioni.");

  const pdfDataFormat = {
    username: formData.username,
    email: user?.email || "",
    role: user?.role || "",
    vatNumber: formData.vatNumber,
    fiscalCode: formData.fiscalCode,
    address: formData.address,
    city: formData.city,
    postalCode: formData.postalCode,
    province: formData.province,
    sdiCode: formData.sdiCode,
    pecEmail: formData.pecEmail,
    iban: formData.iban,
    bankName: formData.bankName,
    bankAddress: formData.bankAddress,
    bicCode: formData.bicCode,
  };

  return (
    <div className="container py-6 space-y-6">
      <h1 className="text-3xl font-bold tracking-tight">
        Impostazioni Profilo
      </h1>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Tabs defaultValue={defaultTab}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="personal">Dati Personali</TabsTrigger>
          <TabsTrigger value="fiscal">Dati Fiscali</TabsTrigger>
        </TabsList>

        <TabsContent value="personal" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Dati Personali</CardTitle>
              <CardDescription>
                Gestisci le tue informazioni personali.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="username">Nome utente</Label>
                <Input
                  id="username"
                  name="username"
                  value={formData.username}
                  onChange={handleChange}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  value={user?.email || ""}
                  disabled
                  className="bg-gray-100 cursor-not-allowed"
                />
                <p className="text-sm text-gray-500">
                  Per cambiare l'email, contatta l'amministratore.
                </p>
              </div>
            </CardContent>
            <CardFooter>
              <Button
                onClick={() => handleUpdate(true)}
                disabled={loading}
                className="ml-auto"
              >
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                <Save className="mr-2 h-4 w-4" />
                Salva Dati Personali
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>

        <TabsContent value="fiscal" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Dati Fiscali</CardTitle>
              <CardDescription>
                Gestisci i tuoi dati fiscali per la fatturazione.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="businessName">Nome Partita IVA</Label>
                <Input
                  id="businessName"
                  name="businessName"
                  value={formData.businessName}
                  onChange={handleChange}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="vatNumber">Partita IVA</Label>
                  <Input
                    id="vatNumber"
                    name="vatNumber"
                    value={formData.vatNumber}
                    onChange={handleChange}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="fiscalCode">Codice Fiscale</Label>
                  <Input
                    id="fiscalCode"
                    name="fiscalCode"
                    value={formData.fiscalCode}
                    onChange={handleChange}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="address">Indirizzo</Label>
                <Input
                  id="address"
                  name="address"
                  value={formData.address}
                  onChange={handleChange}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="city">Città</Label>
                  <Input
                    id="city"
                    name="city"
                    value={formData.city}
                    onChange={handleChange}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="postalCode">CAP</Label>
                  <Input
                    id="postalCode"
                    name="postalCode"
                    value={formData.postalCode}
                    onChange={handleChange}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="province">Provincia</Label>
                  <Input
                    id="province"
                    name="province"
                    value={formData.province}
                    onChange={handleChange}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="sdiCode">Codice SDI</Label>
                  <Input
                    id="sdiCode"
                    name="sdiCode"
                    value={formData.sdiCode}
                    onChange={handleChange}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="pecEmail">Email PEC</Label>
                  <Input
                    id="pecEmail"
                    name="pecEmail"
                    value={formData.pecEmail}
                    onChange={handleChange}
                  />
                </div>
              </div>

              <div className="mt-6 border-t pt-4">
                <h3 className="text-lg font-medium mb-3">Dati Bancari</h3>

                <div className="space-y-2">
                  <Label htmlFor="iban">IBAN</Label>
                  <Input
                    id="iban"
                    name="iban"
                    value={formData.iban}
                    onChange={handleChange}
                  />
                </div>

                <div className="space-y-2 mt-3">
                  <Label htmlFor="bankName">Nome Banca</Label>
                  <Input
                    id="bankName"
                    name="bankName"
                    value={formData.bankName}
                    onChange={handleChange}
                  />
                </div>

                <div className="space-y-2 mt-3">
                  <Label htmlFor="bankAddress">Indirizzo Banca</Label>
                  <Input
                    id="bankAddress"
                    name="bankAddress"
                    value={formData.bankAddress}
                    onChange={handleChange}
                  />
                </div>

                <div className="space-y-2 mt-3">
                  <Label htmlFor="bicCode">Codice BIC/SWIFT</Label>
                  <Input
                    id="bicCode"
                    name="bicCode"
                    value={formData.bicCode}
                    onChange={handleChange}
                  />
                </div>
              </div>
            </CardContent>
            <CardFooter className="flex justify-between">
              <div>
                <BrowserOnlyPdfGenerator userData={pdfDataFormat} />
              </div>
              <Button
                onClick={() => handleUpdate(false)}
                disabled={loading}
                className="space-x-2"
              >
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                <Save className="mr-2 h-4 w-4" />
                Salva Dati Fiscali
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
