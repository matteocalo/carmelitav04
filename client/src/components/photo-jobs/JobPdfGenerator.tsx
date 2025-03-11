import React, { useState } from "react";
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  PDFDownloadLink,
  Image,
  Font,
} from "@react-pdf/renderer";
import { Button } from "@/components/ui/button";
import { Loader2, FileDown, List, Copy } from "lucide-react";

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
  table: {
    display: "flex",
    width: "auto",
    borderStyle: "solid",
    borderWidth: 1,
    borderColor: "#e5e7eb",
    marginTop: 10,
    marginBottom: 10,
  },
  tableRow: {
    margin: "auto",
    flexDirection: "row",
  },
  tableRowHeader: {
    margin: "auto",
    flexDirection: "row",
    backgroundColor: "#f3f4f6",
  },
  tableColHeader: {
    width: "33.33%",
    borderStyle: "solid",
    borderWidth: 1,
    borderColor: "#e5e7eb",
    padding: 5,
    fontWeight: "bold",
    fontSize: 10,
    color: "#4b5563",
  },
  tableCol: {
    width: "33.33%",
    borderStyle: "solid",
    borderWidth: 1,
    borderColor: "#e5e7eb",
    padding: 5,
    fontSize: 10,
  },
  logo: {
    width: 120,
    height: 50,
    alignSelf: "center",
    marginBottom: 20,
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
  listItem: {
    flexDirection: "row",
    marginBottom: 3,
  },
  bullet: {
    width: 10,
    fontSize: 10,
  },
  listItemContent: {
    flex: 1,
  },
});

const formatDate = (dateString) => {
  if (!dateString) return "N/A";
  return new Date(dateString).toLocaleDateString("it-IT", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

// Componente PDF singolo lavoro
const JobPdf = ({ job, client, equipment }) => (
  <Document>
    <Page size="A4" style={styles.page}>
      <View style={styles.section}>
        <Text style={styles.title}>Scheda Lavoro Fotografico</Text>
        <Text style={styles.subtitle}>Informazioni Generali</Text>

        <Text style={styles.label}>Titolo:</Text>
        <Text style={styles.value}>{job.title}</Text>

        <Text style={styles.subtitle}>Dati Cliente</Text>

        <Text style={styles.label}>Nome:</Text>
        <Text style={styles.value}>{client?.name || "N/A"}</Text>
        <Text style={styles.label}>Email:</Text>
        <Text style={styles.value}>{client?.email || "N/A"}</Text>
        <Text style={styles.label}>Codice SDI:</Text>
        <Text style={styles.value}>{client?.SDI || "N/A"}</Text>

        <Text style={styles.label}>Telefono:</Text>
        <Text style={styles.value}>{client?.phone || "N/A"}</Text>

        <Text style={styles.label}>P.IVA/CF:</Text>
        <Text style={styles.value}>{client?.vatNumber || "N/A"}</Text>

        <Text style={styles.label}>Indirizzo:</Text>
        <Text style={styles.value}>{client?.address || "N/A"}</Text>

        <Text style={styles.subtitle}>Dettagli Lavoro</Text>


        <Text style={styles.label}>Stato:</Text>
        <Text style={styles.value}>{job.status}</Text>

        <Text style={styles.label}>Importo:</Text>
        <Text style={styles.value}>€ {job.amount?.toFixed(2) || "0.00"}</Text>

        <Text style={styles.label}>Data Inizio:</Text>
        <Text style={styles.value}>{formatDate(job.job_date)}</Text>

        <Text style={styles.label}>Data Fine:</Text>
        <Text style={styles.value}>{formatDate(job.end_date)}</Text>

        <Text style={styles.subtitle}>Descrizione</Text>
        <Text style={styles.value}>
          {job.description || "Nessuna descrizione disponibile"}
        </Text>

        {equipment && equipment.length > 0 && (
          <>
            <Text style={styles.subtitle}>Attrezzatura</Text>
            {equipment.map((item, index) => (
              <View key={index} style={styles.listItem}>
                <Text style={styles.bullet}>•</Text>
                <Text style={styles.listItemContent}>
                  {item.name} {item.serial ? `(SN: ${item.serial})` : ""}
                </Text>
              </View>
            ))}
          </>
        )}
      </View>

      <View style={styles.footer}>
        <Text>
          Documento generato il {new Date().toLocaleDateString("it-IT")} -
          Pagina 1
        </Text>
      </View>
    </Page>
  </Document>
);

// Componente PDF per tutti i lavori
const AllJobsPdf = ({ jobs, clients, equipment }) => (
  <Document>
    <Page size="A4" style={styles.page}>
      <View style={styles.section}>
        <Text style={styles.title}>Riepilogo Lavori Fotografici</Text>
        <Text style={styles.value}>Totale lavori: {jobs.length}</Text>

        {jobs.map((job, index) => {
          const client = clients?.find((c) => c.id === job.client_id);
          const jobEquipment =
            job.equipment_ids && Array.isArray(job.equipment_ids) && equipment
              ? equipment.filter((e) => job.equipment_ids.includes(e.id))
              : [];

          return (
            <View
              key={index}
              style={[
                styles.section,
                {
                  marginTop: 20,
                  borderTopWidth: index > 0 ? 1 : 0,
                  borderTopColor: "#e5e7eb",
                  paddingTop: index > 0 ? 20 : 0,
                },
              ]}
            >
              <Text style={styles.subtitle}>{job.title}</Text>

              <Text style={styles.label}>Cliente:</Text>
              <Text style={styles.value}>{client?.name || "N/A"}</Text>

              <Text style={styles.label}>Stato:</Text>
              <Text style={styles.value}>{job.status}</Text>

              <Text style={styles.label}>Date:</Text>
              <Text style={styles.value}>
                {formatDate(job.job_date)}
                {job.end_date ? ` - ${formatDate(job.end_date)}` : ""}
              </Text>

              {jobEquipment.length > 0 && (
                <>
                  <Text style={styles.label}>Attrezzatura:</Text>
                  {jobEquipment.map((item, idx) => (
                    <View key={idx} style={styles.listItem}>
                      <Text style={styles.bullet}>•</Text>
                      <Text style={styles.listItemContent}>{item.name}</Text>
                    </View>
                  ))}
                </>
              )}
            </View>
          );
        })}
      </View>

      <View style={styles.footer}>
        <Text>
          Documento generato il {new Date().toLocaleDateString("it-IT")}
        </Text>
      </View>
    </Page>
  </Document>
);

const JobPdfGenerator = ({
  job,
  client,
  equipment,
  allJobs,
  allClients,
  allEquipment,
}) => {
  const [isGeneratingSingle, setIsGeneratingSingle] = useState(false);
  const [isGeneratingAll, setIsGeneratingAll] = useState(false);

  const handleCopyJobInfo = () => {
    const equipmentText =
      equipment && equipment.length > 0
        ? `\nAttrezzatura:\n${equipment.map((item) => `- ${item.name}`).join("\n")}`
        : "";

    const jobInfo = `
Titolo: ${job.title}
Cliente: ${client?.name || "N/A"}
Stato: ${job.status}
Importo: € ${job.amount?.toFixed(2) || "0.00"}
Data Inizio: ${formatDate(job.job_date)}
Data Fine: ${formatDate(job.end_date)}
Descrizione: ${job.description || "Nessuna descrizione"}${equipmentText}
    `;

    navigator.clipboard.writeText(jobInfo.trim());

    // Alert che conferma che il testo è stato copiato
    alert("Informazioni del lavoro copiate negli appunti");
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <h3 className="text-lg font-medium">Scheda singola</h3>
        <div className="flex space-x-2">
          <PDFDownloadLink
            document={
              <JobPdf job={job} client={client} equipment={equipment} />
            }
            fileName={`lavoro-${job.title.replace(/\s+/g, "-").toLowerCase()}.pdf`}
            className="w-auto text-white"
          >
            {({ blob, url, loading, error }) => (
              <Button
                variant="outline"
                size="sm"
                disabled={loading}
                onClick={() => setIsGeneratingSingle(true)}
              >
                {loading || isGeneratingSingle ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin text-white" />
                ) : (
                  <FileDown className="mr-2 h-4 w-4 text-white " />
                )}
                Scarica PDF
              </Button>
            )}
          </PDFDownloadLink>

          <Button variant="outline" size="sm" onClick={handleCopyJobInfo}>
            <Copy className="mr-2 h-4 w-4 text-white" />
            <h3 className="text-white  ">Copia testo</h3>
          </Button>
        </div>
      </div>

      {allJobs && allJobs.length > 1 && (
        <div className="space-y-2">
          <h3 className="text-lg font-medium ">Tutti i lavori</h3>
          <PDFDownloadLink
            document={
              <AllJobsPdf
                jobs={allJobs}
                clients={allClients}
                equipment={allEquipment}
              />
            }
            fileName={`riepilogo-lavori.pdf`}
            className="w-auto text-white"
          >
            {({ blob, url, loading, error }) => (
              <Button
                variant="outline"
                size="sm"
                disabled={loading}
                onClick={() => setIsGeneratingAll(true)}
              >
                {loading || isGeneratingAll ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <List className="mr-2 h-4 w-4 text-white" />
                )}
                Scarica riepilogo
              </Button>
            )}
          </PDFDownloadLink>
        </div>
      )}
    </div>
  );
};

export default JobPdfGenerator;
