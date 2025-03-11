import React from "react";
import { Button } from "@/components/ui/button";
import { FileText } from "lucide-react";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";

interface Equipment {
  id: string;
  name: string;
  category: string;
  description?: string;
  weight?: number;
  notes?: string;
  serial_number?: string;
  quantity?: number;
}

interface EquipmentPdfGeneratorProps {
  equipmentList: Equipment[];
  title?: string;
}

export const EquipmentPdfGenerator: React.FC<EquipmentPdfGeneratorProps> = ({
  equipmentList,
  title = "Lista Attrezzatura",
}) => {
  const generatePDF = async () => {
    // Creare un elemento HTML temporaneo per il rendering
    const element = document.createElement("div");
    element.className = "pdf-content";

    // Stile per il report con tema moderno
    element.innerHTML = `
      <style>
        .pdf-content {
          font-family: 'Inter', sans-serif;
          padding: 20px;
          max-width: 800px;
          color: #18181b;
        }
        .pdf-header {
          text-align: center;
          margin-bottom: 24px;
          border-bottom: 1px solid #1e293b;
          padding-bottom: 16px;
        }
        .pdf-title {
          font-size: 28px;
          font-weight: bold;
          margin-bottom: 8px;
          color: #00bfff;
        }
        .pdf-date {
          font-size: 14px;
          color: #64748b;
        }
        .equipment-table {
          width: 100%;
          border-collapse: collapse;
          margin-top: 24px;
          border-radius: 8px;
          overflow: hidden;
        }
        .equipment-table th {
          background-color: #0f172a;
          color: #f8fafc;
          padding: 12px;
          text-align: left;
          font-weight: bold;
        }
        .equipment-table td {
          padding: 12px;
          border-bottom: 1px solid #334155;
        }
        .equipment-table tr:nth-child(even) {
          background-color: #f1f5f9;
        }
        .equipment-category {
          font-weight: bold;
          background-color: #1e293b;
          color: #f8fafc;
          padding: 12px;
          margin-top: 20px;
          border-radius: 4px;
        }
        .logo {
          display: block;
          margin: 0 auto 16px auto;
          max-width: 120px;
        }
        .footer {
          margin-top: 40px;
          text-align: center;
          font-size: 12px;
          color: #64748b;
        }
      </style>
      <div class="pdf-header">
        <div class="pdf-title">${title}</div>
        <div class="pdf-date">Generato il: ${new Date().toLocaleDateString("it-IT")}</div>
      </div>
    `;

    // Raggruppare attrezzatura per categoria
    const groupedEquipment: Record<string, Equipment[]> = {};
    equipmentList.forEach((item) => {
      if (!groupedEquipment[item.category]) {
        groupedEquipment[item.category] = [];
      }
      groupedEquipment[item.category].push(item);
    });

    // Creare tabella per ogni categoria
    Object.entries(groupedEquipment).forEach(([category, items]) => {
      const categoryDiv = document.createElement("div");
      categoryDiv.className = "equipment-category";
      categoryDiv.textContent = category;
      element.appendChild(categoryDiv);

      const table = document.createElement("table");
      table.className = "equipment-table";

      // Intestazione tabella
      const thead = document.createElement("thead");
      thead.innerHTML = `
        <tr>
          <th>Nome</th>
          <th>Quantità</th>
          <th>Numero Seriale</th>
          <th>Note</th>
        </tr>
      `;
      table.appendChild(thead);

      // Corpo tabella
      const tbody = document.createElement("tbody");
      items.forEach((item) => {
        const row = document.createElement("tr");
        row.innerHTML = `
          <td>${item.name}</td>
          <td>${item.quantity || 1}</td>
          <td>${item.serial_number || "-"}</td>
          <td>${item.notes || "-"}</td>
        `;
        tbody.appendChild(row);
      });
      table.appendChild(tbody);
      element.appendChild(table);
    });

    // Aggiunge un footer
    const footer = document.createElement("div");
    footer.className = "footer";
    footer.innerHTML = `
      <p>Documento generato da Carmelita - La tua assistente fotografica professionale</p>
    `;
    element.appendChild(footer);

    document.body.appendChild(element);

    try {
      // Convertire HTML in Canvas
      const canvas = await html2canvas(element, {
        scale: 2,
        logging: false,
        backgroundColor: "#ffffff",
      });

      // Creare PDF
      const pdf = new jsPDF("p", "mm", "a4");
      const imgData = canvas.toDataURL("image/png");
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

      pdf.addImage(imgData, "PNG", 0, 0, pdfWidth, pdfHeight);
      pdf.save(
        `${title.replace(/\s+/g, "_")}_${new Date().toISOString().split("T")[0]}.pdf`,
      );
    } catch (error) {
      console.error("Errore nella generazione del PDF:", error);
    } finally {
      // Rimuovere elemento temporaneo
      document.body.removeChild(element);
    }
  };

  return (
    <Button
      onClick={generatePDF}
      variant="outline"
      size="sm"
      className="flex items-center gap-1 hover-glow"
    >
      <FileText size={16} />
      <span>Esporta PDF</span>
    </Button>
  );
};

export default EquipmentPdfGenerator;
