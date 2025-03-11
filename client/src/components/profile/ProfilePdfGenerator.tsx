
import React, { useState } from "react";
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  PDFDownloadLink,
  Font,
} from "@react-pdf/renderer";
import { Button } from "@/components/ui/button";
import { Loader2, FileDown, Copy } from "lucide-react";

// Registra i font
Font.register({
  family: "Roboto",
  fonts: [
    {
      src: "https://cdnjs.cloudflare.com/ajax/libs/ink/3.1.10/fonts/Roboto/roboto-regular-webfont.ttf",
      fontWeight: "normal",
    },
    {
      src: "https://cdnjs.cloudflare.com/ajax/libs/ink/3.1.10/fonts/Roboto/roboto-bold-webfont.ttf",
      fontWeight: "bold",
    },
    {
      src: "https://cdnjs.cloudflare.com/ajax/libs/ink/3.1.10/fonts/Roboto/roboto-italic-webfont.ttf",
      fontStyle: "italic",
    },
  ],
});

// Definizione degli stili
const styles = StyleSheet.create({
  page: {
    padding: 30,
    fontFamily: "Roboto",
    fontSize: 12,
  },
  section: {
    marginBottom: 10,
  },
  title: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 15,
    textAlign: "center",
    color: "#1f2937",
  },
  subtitle: {
    fontSize: 14,
    fontWeight: "bold",
    marginBottom: 10,
    marginTop: 15,
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
    paddingBottom: 5,
    color: "#374151",
  },
  label: {
    fontSize: 10,
    fontWeight: "bold",
    marginBottom: 2,
    color: "#6b7280",
  },
  value: {
    marginBottom: 8,
    color: "#111827",
  },
  footer: {
    position: "absolute",
    bottom: 30,
    left: 30,
    right: 30,
    textAlign: "center",
    fontSize: 8,
    color: "#9ca3af",
    borderTopWidth: 1,
    borderTopColor: "#e5e7eb",
    paddingTop: 10,
  },
});

// Componente PDF del profilo
const ProfilePdf = ({ userData }) => (
  <Document>
    <Page size="A4" style={styles.page}>
      <View style={styles.section}>
        <Text style={styles.title}>Scheda Profilo</Text>
        
       

        <Text style={styles.label}>Ruolo:</Text>
        <Text style={styles.value}>{userData.role || "Utente Standard"}</Text>

        <Text style={styles.subtitle}>Dati Fiscali</Text>

        <Text style={styles.label}>Partita IVA:</Text>
        <Text style={styles.value}>{userData.vatNumber || "Non specificato"}</Text>

        <Text style={styles.label}>Codice Fiscale:</Text>
        <Text style={styles.value}>{userData.fiscalCode || "Non specificato"}</Text>

        <Text style={styles.label}>Indirizzo:</Text>
        <Text style={styles.value}>{userData.address || "Non specificato"}</Text>

        <Text style={styles.label}>Città:</Text>
        <Text style={styles.value}>
          {userData.city ? `${userData.city}${userData.postalCode ? ` - ${userData.postalCode}` : ""}${userData.province ? ` (${userData.province})` : ""}` : "Non specificato"}
        </Text>

        <Text style={styles.label}>Codice SDI:</Text>
        <Text style={styles.value}>{userData.sdiCode || "Non specificato"}</Text>

        <Text style={styles.label}>Email PEC:</Text>
        <Text style={styles.value}>{userData.pecEmail || "Non specificato"}</Text>

        <Text style={styles.subtitle}>Dati Bancari</Text>

        <Text style={styles.label}>IBAN:</Text>
        <Text style={styles.value}>{userData.iban || "Non specificato"}</Text>

        <Text style={styles.label}>Banca:</Text>
        <Text style={styles.value}>{userData.bankName || "Non specificato"}</Text>

        <Text style={styles.label}>Indirizzo Banca:</Text>
        <Text style={styles.value}>{userData.bankAddress || "Non specificato"}</Text>

        <Text style={styles.label}>Codice BIC/SWIFT:</Text>
        <Text style={styles.value}>{userData.bicCode || "Non specificato"}</Text>
      </View>

      <View style={styles.footer}>
        <Text>
          Documento generato il {new Date().toLocaleDateString("it-IT")} - Carmelita
        </Text>
      </View>
    </Page>
  </Document>
);

const ProfilePdfGenerator = ({ userData }) => {
  const [isGenerating, setIsGenerating] = useState(false);

  const handleCopyInfo = () => {
    const profileInfo = `
Nome Utente: ${userData.username || "N/A"}
Email: ${userData.email || "N/A"}
Ruolo: ${userData.role || "N/A"}

Dati Fiscali:
${userData.vatNumber ? `Partita IVA: ${userData.vatNumber}` : ""}
${userData.fiscalCode ? `Codice Fiscale: ${userData.fiscalCode}` : ""}
${userData.address ? `Indirizzo: ${userData.address}` : ""}
${userData.pecEmail ? `Email PEC: ${userData.pecEmail}` : ""}

Dati Bancari:
${userData.iban ? `IBAN: ${userData.iban}` : ""}
${userData.bankName ? `Nome Banca: ${userData.bankName}` : ""}
${userData.bankAddress ? `Indirizzo Banca: ${userData.bankAddress}` : ""}
${userData.bicCode ? `Codice BIC: ${userData.bicCode}` : ""}
    `;

    navigator.clipboard.writeText(profileInfo.trim());
    alert("Informazioni del profilo copiate negli appunti");
  };

  return (
    <div className="space-y-4">
      <div className="flex space-x-2">
        <PDFDownloadLink
          document={<ProfilePdf userData={userData} />}
          fileName={`profilo-${userData.username || "utente"}.pdf`}
          className="w-auto text-white"
        >
          {({ blob, url, loading, error }) => (
            <Button
              variant="outline"
              size="sm"
              disabled={loading}
              onClick={() => setIsGenerating(true)}
            >
              {loading || isGenerating ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <FileDown className="mr-2 h-4 w-4" />
              )}
              Scarica PDF
            </Button>
          )}
        </PDFDownloadLink>

        <Button variant="outline" size="sm" onClick={handleCopyInfo}>
          <Copy className="mr-2 h-4 w-4" />
          Copia testo
        </Button>
      </div>
    </div>
  );
};

export default ProfilePdfGenerator;
