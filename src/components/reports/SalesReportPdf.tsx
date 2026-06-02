// @ts-nocheck
"use client";

import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
} from "@react-pdf/renderer";
import type { TenantReportData } from "@/lib/reports";

const styles = StyleSheet.create({
  page: {
    padding: 30,
    fontFamily: "Helvetica",
    fontSize: 10,
    color: "#1f2937",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 20,
    paddingBottom: 12,
    borderBottomWidth: 2,
    borderBottomColor: "#059669",
  },
  title: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#064e3b",
  },
  subtitle: {
    fontSize: 11,
    color: "#6b7280",
    marginTop: 4,
  },
  dateLabel: {
    fontSize: 10,
    color: "#6b7280",
    textAlign: "right" as const,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: "bold",
    color: "#064e3b",
    marginTop: 16,
    marginBottom: 8,
    paddingBottom: 4,
    borderBottomWidth: 1,
    borderBottomColor: "#d1d5db",
  },
  kpiGrid: {
    flexDirection: "row" as const,
    flexWrap: "wrap" as const,
    gap: 8,
    marginBottom: 12,
  },
  kpiCard: {
    width: "31%",
    padding: 10,
    backgroundColor: "#f9fafb",
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  kpiLabel: {
    fontSize: 9,
    color: "#6b7280",
    marginBottom: 2,
  },
  kpiValue: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#111827",
  },
  table: {
    marginTop: 8,
  },
  tableHeader: {
    flexDirection: "row" as const,
    backgroundColor: "#f3f4f6",
    borderBottomWidth: 1,
    borderBottomColor: "#d1d5db",
    paddingVertical: 6,
    paddingHorizontal: 8,
  },
  tableHeaderCell: {
    fontSize: 9,
    fontWeight: "bold",
    color: "#374151",
  },
  tableRow: {
    flexDirection: "row" as const,
    borderBottomWidth: 1,
    borderBottomColor: "#f3f4f6",
    paddingVertical: 5,
    paddingHorizontal: 8,
  },
  tableRowAlt: {
    flexDirection: "row" as const,
    borderBottomWidth: 1,
    borderBottomColor: "#f3f4f6",
    paddingVertical: 5,
    paddingHorizontal: 8,
    backgroundColor: "#fafafa",
  },
  tableRowTotal: {
    flexDirection: "row" as const,
    borderBottomWidth: 2,
    borderBottomColor: "#059669",
    paddingVertical: 6,
    paddingHorizontal: 8,
    backgroundColor: "#f0fdf4",
  },
  cellDate: { width: "25%", fontSize: 9 },
  cellNum: { width: "18%", fontSize: 9, textAlign: "right" as const },
  cellRevenue: { width: "39%", fontSize: 9, textAlign: "right" as const },
  cellLineName: { width: "50%", fontSize: 9 },
  cellLineTickets: { width: "25%", fontSize: 9, textAlign: "right" as const },
  cellLineRevenue: { width: "25%", fontSize: 9, textAlign: "right" as const },
  footer: {
    position: "absolute" as const,
    bottom: 20,
    left: 30,
    right: 30,
    textAlign: "center" as const,
    fontSize: 8,
    color: "#9ca3af",
  },
});

function formatFCFA(value: number): string {
  return new Intl.NumberFormat("fr-FR").format(value) + " FCFA";
}

function formatReportDate(dateStr: string): string {
  try {
    const d = new Date(dateStr + "T00:00:00");
    return d.toLocaleDateString("fr-FR", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  } catch {
    return dateStr;
  }
}

interface SalesReportPdfProps {
  report: TenantReportData;
  tenantName?: string;
  period?: string;
}

export function SalesReportPdf({ report, tenantName, period }: SalesReportPdfProps) {
  const totalRevenue = report.tickets.revenue + report.parcels.revenue;
  const delayRate =
    report.departures.total > 0
      ? Math.round((report.departures.delayed / report.departures.total) * 100)
      : 0;

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>SmartTicketQR — Rapport de Ventes</Text>
            <Text style={styles.subtitle}>
              {tenantName || "Transporteur"}
              {period ? ` • ${period}` : ""}
            </Text>
          </View>
          <View>
            <Text style={styles.dateLabel}>
              {new Date().toLocaleDateString("fr-FR", {
                day: "2-digit",
                month: "long",
                year: "numeric",
              })}
            </Text>
            <Text style={styles.dateLabel}>
              Période : {formatReportDate(report.period.start)} →{" "}
              {formatReportDate(report.period.end)}
            </Text>
          </View>
        </View>

        {/* KPI Cards */}
        <View style={styles.kpiGrid}>
          <View style={styles.kpiCard}>
            <Text style={styles.kpiLabel}>Tickets Vendus</Text>
            <Text style={styles.kpiValue}>{report.tickets.total}</Text>
          </View>
          <View style={styles.kpiCard}>
            <Text style={styles.kpiLabel}>Revenus Tickets</Text>
            <Text style={styles.kpiValue}>{formatFCFA(report.tickets.revenue)}</Text>
          </View>
          <View style={styles.kpiCard}>
            <Text style={styles.kpiLabel}>Colis Enregistrés</Text>
            <Text style={styles.kpiValue}>{report.parcels.total}</Text>
          </View>
          <View style={styles.kpiCard}>
            <Text style={styles.kpiLabel}>Revenus Colis</Text>
            <Text style={styles.kpiValue}>{formatFCFA(report.parcels.revenue)}</Text>
          </View>
          <View style={styles.kpiCard}>
            <Text style={styles.kpiLabel}>Revenus Totaux</Text>
            <Text style={[styles.kpiValue, { color: "#059669" }]}>
              {formatFCFA(totalRevenue)}
            </Text>
          </View>
          <View style={styles.kpiCard}>
            <Text style={styles.kpiLabel}>Taux de Retard</Text>
            <Text
              style={[
                styles.kpiValue,
                { color: delayRate > 15 ? "#dc2626" : delayRate > 5 ? "#d97706" : "#059669" },
              ]}
            >
              {delayRate}%
            </Text>
          </View>
        </View>

        {/* Daily Stats Table */}
        <Text style={styles.sectionTitle}>Statistiques Quotidiennes</Text>
        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={[styles.tableHeaderCell, styles.cellDate]}>Date</Text>
            <Text style={[styles.tableHeaderCell, styles.cellNum]}>Tickets</Text>
            <Text style={[styles.tableHeaderCell, styles.cellNum]}>Colis</Text>
            <Text style={[styles.tableHeaderCell, styles.cellRevenue]}>Revenus</Text>
          </View>
          {[...report.dailyStats].reverse().map((row, i) => (
            <View key={row.date + i} style={i % 2 === 0 ? styles.tableRow : styles.tableRowAlt}>
              <Text style={styles.cellDate}>{formatReportDate(row.date)}</Text>
              <Text style={styles.cellNum}>{row.tickets}</Text>
              <Text style={styles.cellNum}>{row.parcels}</Text>
              <Text style={styles.cellRevenue}>{formatFCFA(row.revenue)}</Text>
            </View>
          ))}
          <View style={styles.tableRowTotal}>
            <Text style={[styles.cellDate, { fontWeight: "bold" }]}>TOTAUX</Text>
            <Text style={[styles.cellNum, { fontWeight: "bold" }]}>{report.tickets.total}</Text>
            <Text style={[styles.cellNum, { fontWeight: "bold" }]}>{report.parcels.total}</Text>
            <Text style={[styles.cellRevenue, { fontWeight: "bold", color: "#059669" }]}>
              {formatFCFA(totalRevenue)}
            </Text>
          </View>
        </View>

        {/* Top Lines Table */}
        {report.topLines.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>Top Lignes par Revenus</Text>
            <View style={styles.table}>
              <View style={styles.tableHeader}>
                <Text style={[styles.tableHeaderCell, styles.cellLineName]}>Ligne</Text>
                <Text style={[styles.tableHeaderCell, styles.cellLineTickets]}>Tickets</Text>
                <Text style={[styles.tableHeaderCell, styles.cellLineRevenue]}>Revenus</Text>
              </View>
              {report.topLines.slice(0, 5).map((line, i) => (
                <View key={line.lineId} style={i % 2 === 0 ? styles.tableRow : styles.tableRowAlt}>
                  <Text style={styles.cellLineName}>{line.lineName}</Text>
                  <Text style={styles.cellLineTickets}>{line.tickets}</Text>
                  <Text style={styles.cellLineRevenue}>{formatFCFA(line.revenue)}</Text>
                </View>
              ))}
            </View>
          </>
        )}

        {/* Footer */}
        <View style={styles.footer}>
          <Text>
            Rapport généré par SmartTicketQR —{" "}
            {new Date().toLocaleString("fr-FR")}
          </Text>
          <Text>Document confidentiel — Usage interne uniquement</Text>
        </View>
      </Page>
    </Document>
  );
}
