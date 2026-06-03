// @ts-nocheck
'use client';

import { useCallback, useState } from 'react';
import { FileDown, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { toast } from 'sonner';
import QRCode from 'qrcode';

interface TicketPDFOptions {
  reference: string;
  passengerName: string;
  passengerAge: number;
  documentType: string;
  documentNumber: string;
  seatNumber: string;
  companyName: string;
  departureCity: string;
  destination: string;
  departureDate: string;
  departureTime: string;
  luggageCount: number;
  luggageWeightKg: number;
  luggageFee: number;
  controlCode: string;
  status: string;
  agencyName?: string;
}

/**
 * Client-side PDF ticket generator using jsPDF.
 *
 * Generates an A4 card-style PDF matching the visual design of the
 * HTML version at /api/ticket-pdf/[ref], but entirely client-side.
 *
 * No server round-trip required — works offline via PWA.
 */
async function generateTicketPDF(options: TicketPDFOptions): Promise<Blob> {
  const {
    reference,
    passengerName,
    passengerAge,
    documentType,
    documentNumber,
    seatNumber,
    companyName,
    departureCity,
    destination,
    departureDate,
    departureTime,
    luggageCount,
    luggageWeightKg,
    luggageFee,
    controlCode,
    status,
    agencyName = 'SmarticketS',
  } = options;

  const { jsPDF } = await import('jspdf');

  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const cardWidth = 105;
  const cardX = (pageWidth - cardWidth) / 2;
  let y = 15;

  // ─── Card wrapper ───
  const roundRect = (x: number, yy: number, w: number, h: number, r: number) => {
    doc.roundedRect(x, yy, w, h, r, r, 'FD');
  };

  // Background card
  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.3);
  roundRect(cardX, y, cardWidth, 180, 4);
  y += 0;

  // ─── Header (blue gradient simulation) ───
  doc.setFillColor(37, 99, 235);
  roundRect(cardX, y, cardWidth, 22, 4);
  doc.setFillColor(37, 99, 235);
  doc.rect(cardX, y + 10, cardWidth, 12, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('SMARTICKETS', cardX + 6, y + 8);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.text('Ticket de transport', cardX + 6, y + 13);

  // Status badge
  const statusText = status === 'ACTIVE' || status === 'VALIDATED' ? 'VALIDÉ' : status.includes('CANCEL') ? 'ANNULÉ' : 'EN ATTENTE';
  const statusBg = statusText === 'VALIDÉ' ? [209, 250, 229] : statusText === 'ANNULÉ' ? [254, 202, 202] : [254, 243, 199];
  const statusFg = statusText === 'VALIDÉ' ? [5, 150, 105] : statusText === 'ANNULÉ' ? [220, 38, 38] : [217, 119, 6];
  doc.setFillColor(...statusBg);
  doc.roundedRect(cardX + cardWidth - 28, y + 3, 24, 7, 2, 2, 'F');
  doc.setTextColor(...statusFg);
  doc.setFontSize(7);
  doc.setFont('helvetica', 'bold');
  doc.text(statusText, cardX + cardWidth - 16, y + 7.5, { align: 'center' });

  y += 28;

  // ─── Seat & Company ───
  doc.setFillColor(241, 245, 249);
  const boxW = 38;
  const boxGap = 18;

  // Seat box
  doc.roundedRect(cardX + 8, y, boxW, 16, 3, 3, 'FD');
  doc.setTextColor(71, 85, 105);
  doc.setFontSize(7);
  doc.setFont('helvetica', 'bold');
  doc.text('SIÈGE', cardX + 8 + boxW / 2, y + 5, { align: 'center' });
  doc.setTextColor(15, 23, 42);
  doc.setFontSize(18);
  doc.text(seatNumber, cardX + 8 + boxW / 2, y + 13, { align: 'center' });

  // Company box
  doc.setFillColor(241, 245, 249);
  const cx = cardX + cardWidth - 8 - boxW;
  doc.roundedRect(cx, y, boxW, 16, 3, 3, 'FD');
  doc.setTextColor(71, 85, 105);
  doc.setFontSize(7);
  doc.setFont('helvetica', 'bold');
  doc.text('COMPAGNIE', cx + boxW / 2, y + 5, { align: 'center' });
  doc.setTextColor(15, 23, 42);
  doc.setFontSize(9);
  const trimmedCompany = companyName.length > 14 ? companyName.substring(0, 13) + '.' : companyName;
  doc.text(trimmedCompany, cx + boxW / 2, y + 13, { align: 'center' });

  y += 22;

  // ─── Black band ───
  doc.setFillColor(15, 23, 42);
  doc.rect(cardX, y, cardWidth, 14, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(7);
  doc.setFont('helvetica', 'bold');
  doc.text('DATE', cardX + cardWidth / 6, y + 5, { align: 'center' });
  doc.text('DÉPART', cardX + cardWidth / 2, y + 5, { align: 'center' });
  doc.text('RÉFÉRENCE', cardX + 5 * cardWidth / 6, y + 5, { align: 'center' });
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text(departureDate, cardX + cardWidth / 6, y + 10, { align: 'center' });
  doc.text(departureTime, cardX + cardWidth / 2, y + 10, { align: 'center' });
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.text(reference, cardX + 5 * cardWidth / 6, y + 10, { align: 'center' });

  y += 18;

  // ─── Route display ───
  doc.setTextColor(37, 99, 235);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  const cityY = y + 5;
  const depX = cardX + 10;
  const destX = cardX + cardWidth - 10;
  doc.text(departureCity, depX, cityY);
  doc.text(destination, destX, cityY, { align: 'right' });

  // Arrow
  doc.setTextColor(147, 197, 253);
  doc.setFontSize(8);
  doc.text('------>', cardX + cardWidth / 2, cityY, { align: 'center' });

  y += 12;

  // ─── Passenger + Luggage grid ───
  const halfW = (cardWidth - 12) / 2;

  // Passenger section
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.2);
  doc.line(cardX + halfW + 6, y, cardX + halfW + 6, y + 26);

  doc.setTextColor(71, 85, 105);
  doc.setFontSize(7);
  doc.setFont('helvetica', 'bold');
  doc.text('PASSAGER', cardX + 6, y + 4);

  doc.setTextColor(15, 23, 42);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  const trimmedName = passengerName.length > 16 ? passengerName.substring(0, 15) + '.' : passengerName;
  doc.text(trimmedName, cardX + 6, y + 10);

  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(71, 85, 105);
  doc.text(`Âge: ${passengerAge}  |  ${documentType}`, cardX + 6, y + 15);
  doc.text(`N°: ${documentNumber.substring(0, 12)}`, cardX + 6, y + 20);

  // Luggage section
  const lx = cardX + halfW + 10;
  doc.setTextColor(71, 85, 105);
  doc.setFontSize(7);
  doc.setFont('helvetica', 'bold');
  doc.text('BAGAGES', lx, y + 4);

  doc.setTextColor(15, 23, 42);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text(`${luggageCount}`, lx, y + 11);
  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(71, 85, 105);
  doc.text(`${luggageWeightKg}kg  |  ${luggageFee}F`, lx, y + 16);
  doc.text(`Agence: ${agencyName.substring(0, 10)}`, lx, y + 21);

  y += 30;

  // ─── QR Code ───
  const qrSize = 28;
  const qrX = cardX + cardWidth - 6 - qrSize;
  const qrUrl = `https://smartickets.com/retrieve/${reference}`;
  const qrDataUrl = await QRCode.toDataURL(qrUrl, {
    width: 200,
    margin: 1,
    errorCorrectionLevel: 'M',
  });

  // Blue info panel
  doc.setFillColor(37, 99, 235);
  roundRect(cardX, y, cardWidth, qrSize + 6, 3);
  doc.rect(cardX, y + 3, cardWidth, qrSize + 3, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(7);
  doc.setFont('helvetica', 'bold');
  doc.text('PASSAGER', cardX + 6, y + 8);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.text(trimmedName, cardX + 6, y + 14);
  doc.setFontSize(7);
  doc.text('COMPAGNIE', cardX + 6, y + 21);
  doc.setFont('helvetica', 'normal');
  doc.text(trimmedCompany, cardX + 6, y + 26);

  // QR code image on white background
  doc.setFillColor(255, 255, 255);
  doc.roundedRect(qrX - 2, y + 1, qrSize + 4, qrSize + 4, 2, 2, 'FD');
  doc.addImage(qrDataUrl, 'PNG', qrX, y + 3, qrSize, qrSize);

  y += qrSize + 12;

  // ─── Control code ───
  doc.setFillColor(209, 250, 229);
  doc.setDrawColor(16, 185, 129);
  doc.setLineWidth(0.3);
  const ccW = 60;
  const ccX = (pageWidth - ccW) / 2;
  doc.roundedRect(ccX, y, ccW, 14, 3, 3, 'FD');

  doc.setTextColor(6, 95, 70);
  doc.setFontSize(6);
  doc.setFont('helvetica', 'bold');
  doc.text('CODE DE CONTRÔLE', pageWidth / 2, y + 4, { align: 'center' });

  doc.setTextColor(6, 78, 59);
  doc.setFontSize(12);
  doc.setFont('courier', 'bold');
  const spacedCode = controlCode.split('').join('  ');
  doc.text(spacedCode, pageWidth / 2, y + 11, { align: 'center' });

  // ─── Footer ───
  y += 22;
  doc.setTextColor(148, 163, 184);
  doc.setFontSize(6);
  doc.setFont('helvetica', 'normal');
  doc.text(`Smartickets ${new Date().getFullYear()} — smartickets.com`, pageWidth / 2, y, { align: 'center' });
  doc.text('Billet non remboursable — Pièce d\'identité obligatoire', pageWidth / 2, y + 4, { align: 'center' });

  return doc.output('blob');
}

/**
 * DownloadTicketPDF — Client-side PDF download button.
 *
 * Fetches ticket data from the API, generates PDF via jsPDF,
 * and triggers browser download. Works offline in PWA mode.
 */
interface DownloadTicketPDFProps {
  /** Ticket reference (e.g. VOL26-K9X2P4) */
  reference: string;
  /** Variant */
  variant?: 'default' | 'outline' | 'ghost';
  /** Size */
  size?: 'default' | 'sm' | 'lg' | 'icon';
  /** Custom label */
  label?: string;
  className?: string;
}

export function DownloadTicketPDF({
  reference,
  variant = 'outline',
  size = 'default',
  label = 'Télécharger PDF',
  className,
}: DownloadTicketPDFProps) {
  const [loading, setLoading] = useState(false);

  const handleDownload = useCallback(async () => {
    setLoading(true);
    try {
      const ref = reference.toUpperCase().trim();

      // Fetch ticket data from API
      const res = await fetch(`/api/ticket-pdf/${encodeURIComponent(ref)}`);
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        toast.error(err.message || 'Ticket introuvable');
        return;
      }

      // We need structured data — fetch from our own JSON endpoint
      const baggageRes = await fetch(`/api/baggage/${ref}`);
      if (!baggageRes.ok) {
        toast.error('Données du ticket introuvables');
        return;
      }
      const baggage = await baggageRes.json();

      const ticket = baggage.ticket || baggage.passengerTicket;
      if (!ticket) {
        toast.error('Aucun billet associé à cette référence');
        return;
      }

      const formatDate = (d: string | null | undefined) => {
        if (!d) return '—';
        try {
          return new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: '2-digit' });
        } catch {
          return '—';
        }
      };

      const formatTime = (d: string | Date | null | undefined) => {
        if (!d) return '—';
        try {
          return new Date(d).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
        } catch {
          return '—';
        }
      };

      const company = baggage.busCompany || baggage.airlineName || baggage.trainCompany || baggage.shipName || '—';

      const pdfOptions: TicketPDFOptions = {
        reference: ref,
        passengerName: ticket.passengerName || '—',
        passengerAge: ticket.passengerAge || 0,
        documentType: ticket.documentType || '—',
        documentNumber: ticket.documentNumber || '—',
        seatNumber: ticket.seatNumber || '—',
        companyName: company,
        departureCity: baggage.departureCity || '—',
        destination: ticket.destination || baggage.destination || '—',
        departureDate: formatDate(baggage.departureDate),
        departureTime: formatTime(ticket.departureTime) || baggage.departureTime || '—',
        luggageCount: ticket.luggageCount || 0,
        luggageWeightKg: ticket.luggageWeightKg || 0,
        luggageFee: ticket.luggageFee || 0,
        controlCode: ticket.controlCode || '',
        status: ticket.ticketStatus || 'ACTIVE',
        agencyName: baggage.agency?.name || 'SmarticketS',
      };

      const blob = await generateTicketPDF(pdfOptions);

      // Trigger download
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `ticket-${ref.toLowerCase()}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast.success(`PDF ${ref} téléchargé`);
    } catch (err) {
      console.error('[DownloadTicketPDF] Error:', err);
      toast.error('Erreur lors de la génération du PDF');
    } finally {
      setLoading(false);
    }
  }, [reference]);

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant={variant}
            size={size}
            onClick={handleDownload}
            disabled={loading}
            className={`gap-2 ${className || ''}`}
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <FileDown className="h-4 w-4" />
            )}
            <span>{label}</span>
          </Button>
        </TooltipTrigger>
        <TooltipContent>Télécharger le billet en PDF</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
