// @ts-nocheck
"use client";

import { useState, useCallback } from "react";
import { pdf } from "@react-pdf/renderer";
import { SalesReportPdf } from "@/components/reports/SalesReportPdf";
import type { TenantReportData } from "@/lib/reports";
import { toast } from "sonner";

export function usePdfExport() {
  const [isExporting, setIsExporting] = useState(false);

  const exportSalesReport = useCallback(
    async (
      report: TenantReportData,
      options?: {
        tenantName?: string;
        period?: string;
        filename?: string;
      }
    ) => {
      setIsExporting(true);
      try {
        const blob = await pdf(
          <SalesReportPdf
            report={report}
            tenantName={options?.tenantName}
            period={options?.period}
          />
        ).toBlob();

        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download =
          options?.filename ||
          `rapport-ventes-${report.period.start}_${report.period.end}.pdf`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);

        toast.success("PDF téléchargé avec succès");
      } catch (error) {
        console.error("PDF export failed:", error);
        toast.error("Impossible de générer le PDF");
      } finally {
        setIsExporting(false);
      }
    },
    []
  );

  return { exportSalesReport, isExporting };
}
