import { NextRequest, NextResponse } from 'next/server';
import QRCode from 'qrcode';
import { db } from '@/lib/db';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ ref: string }> }
) {
  try {
    const { ref } = await params;
    const reference = (ref || '').toUpperCase().trim();

    // Fetch baggage + passenger ticket from DB
    const colis = await db.baggage.findUnique({
      where: { reference },
      include: { agency: true },
    });

    if (!colis) {
      return NextResponse.json(
        { error: 'not_found', message: 'Ticket introuvable.' },
        { status: 404 }
      );
    }

    // Fetch passenger ticket if category is 'ticket'
    let ticket = null;
    if (colis.category === 'ticket') {
      ticket = await db.passengerTicket.findUnique({
        where: { baggageId: colis.id },
      });
    }

    if (!ticket) {
      return NextResponse.json(
        { error: 'no_ticket', message: 'Aucun ticket associé.' },
        { status: 404 }
      );
    }

    // Generate QR code as data URL (smaller for thermal)
    const qrUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'https://smartickets.com'}/retrieve/${reference}`;
    const qrDataUrl = await QRCode.toDataURL(qrUrl, {
      width: 150,
      margin: 1,
      color: { dark: '#000000', light: '#ffffff' },
      errorCorrectionLevel: 'M',
    });

    // Format data
    const dateStr = colis.departureDate
      ? new Date(colis.departureDate).toLocaleDateString('fr-FR', {
          day: '2-digit',
          month: '2-digit',
          year: '2-digit',
        })
      : '—';

    const timeStr = ticket.departureTime
      ? new Date(ticket.departureTime).toLocaleTimeString('fr-FR', {
          hour: '2-digit',
          minute: '2-digit',
        })
      : colis.departureTime || '—';

    const companyName = colis.busCompany || colis.airlineName || colis.trainCompany || colis.shipName || colis.company || '—';
    const departureStation = colis.departureCity || '—';
    const destination = ticket.destination || colis.arrivalCity || '—';

    const status = ticket.ticketStatus?.toUpperCase() || '';
    const statusLabel = status.includes('ACTIVE') || status.includes('VALID')
      ? 'VALIDÉ'
      : status.includes('CANCEL') || status.includes('EXPIR') || status.includes('ANNUL')
        ? 'ANNULÉ'
        : 'EN ATTENTE';

    // ═════════════════════════════════════════
    //  THERMAL RECEIPT — 80mm wide, all black/white
    // ═════════════════════════════════════════
    const html = `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <title>Ticket ${reference} — Impression Thermique</title>
  <style>
    @page {
      size: 80mm auto;
      margin: 0;
    }
    @media print {
      html, body {
        margin: 0;
        padding: 0;
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
        color-adjust: exact !important;
      }
      .no-print { display: none !important; }
      * { -webkit-text-stroke: 0 !important; }
    }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'Courier New', Courier, monospace;
      background: #ffffff;
      color: #000000;
      width: 80mm;
      margin: 0 auto;
      padding: 4mm 3mm;
      font-size: 10px;
      line-height: 1.4;
    }

    /* ── RECEIPT WRAPPER ── */
    .receipt { width: 100%; }

    /* ── HEADER ── */
    .header {
      text-align: center;
      border-bottom: 2px dashed #000;
      padding-bottom: 6px;
      margin-bottom: 6px;
    }
    .brand {
      font-size: 16px;
      font-weight: 900;
      letter-spacing: 2px;
      text-transform: uppercase;
    }
    .subtitle {
      font-size: 9px;
      margin-top: 1px;
      letter-spacing: 1px;
    }
    .status-row {
      margin-top: 4px;
      font-size: 10px;
      font-weight: 700;
    }

    /* ── SECTIONS ── */
    .section {
      margin-top: 6px;
    }
    .section-title {
      font-size: 9px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 1px;
      border-bottom: 1px solid #000;
      padding-bottom: 2px;
      margin-bottom: 4px;
    }

    /* ── ROUTE ── */
    .route-display {
      text-align: center;
      padding: 6px 0;
      border-bottom: 1px solid #000;
      border-top: 1px solid #000;
      margin: 6px 0;
    }
    .route-cities {
      font-size: 14px;
      font-weight: 900;
      text-transform: uppercase;
      letter-spacing: 1px;
    }
    .route-arrow {
      font-size: 12px;
      margin: 0 6px;
    }

    /* ── KEY-VALUE ROW ── */
    .row {
      display: flex;
      justify-content: space-between;
      padding: 2px 0;
      border-bottom: 1px dotted #ccc;
    }
    .row:last-child { border-bottom: none; }
    .label {
      font-size: 9px;
      text-transform: uppercase;
      color: #333;
      font-weight: 600;
    }
    .value {
      font-size: 11px;
      font-weight: 700;
      text-align: right;
    }
    .value-mono {
      font-family: 'Courier New', monospace;
      font-size: 10px;
    }

    /* ── COMPACT 3-COL ── */
    .row-triple {
      display: flex;
      justify-content: space-between;
      padding: 2px 0;
      border-bottom: 1px dotted #ccc;
    }
    .col {
      text-align: center;
      flex: 1;
    }
    .col-label {
      font-size: 8px;
      text-transform: uppercase;
      color: #333;
    }
    .col-value {
      font-size: 12px;
      font-weight: 900;
    }

    /* ── QR CODE ── */
    .qr-section {
      text-align: center;
      margin-top: 8px;
      border-top: 2px dashed #000;
      padding-top: 8px;
    }
    .qr-img {
      width: 38mm;
      height: 38mm;
      margin: 4px auto;
    }
    .qr-img img {
      width: 100%;
      height: 100%;
    }
    .qr-caption {
      font-size: 8px;
      color: #333;
      letter-spacing: 0.5px;
    }

    /* ── CONTROL CODE ── */
    .control-section {
      text-align: center;
      margin-top: 8px;
      border-top: 1px solid #000;
      padding-top: 6px;
    }
    .control-label {
      font-size: 9px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 1px;
    }
    .control-code {
      font-size: 20px;
      font-weight: 900;
      letter-spacing: 4px;
      font-family: 'Courier New', monospace;
      margin: 3px 0;
    }
    .control-hint {
      font-size: 8px;
      color: #333;
    }

    /* ── FOOTER ── */
    .footer {
      margin-top: 8px;
      border-top: 2px dashed #000;
      padding-top: 6px;
      text-align: center;
      font-size: 7px;
      color: #666;
      letter-spacing: 0.5px;
    }

    /* ── PRINT BUTTON ── */
    .print-area {
      text-align: center;
      margin-top: 12px;
    }
    .print-btn {
      display: inline-block;
      padding: 10px 28px;
      background: #000;
      color: #fff;
      border: none;
      font-family: 'Courier New', monospace;
      font-size: 12px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 1px;
      cursor: pointer;
    }
    .print-btn:hover { background: #333; }
  </style>
</head>
<body>
  <div class="receipt">

    <!-- ═══ HEADER ═══ -->
    <div class="header">
      <div class="brand">SMARTICKETS</div>
      <div class="subtitle">Ticket de transport</div>
      <div class="status-row">[ ${statusLabel} ]</div>
    </div>

    <!-- ═══ ROUTE ═══ -->
    <div class="route-display">
      <div class="route-cities">
        ${departureStation}
        <span class="route-arrow"> ----> </span>
        ${destination}
      </div>
    </div>

    <!-- ═══ TRAJET INFO ═══ -->
    <div class="section">
      <div class="section-title">Trajet</div>
      <div class="row">
        <span class="label">Compagnie</span>
        <span class="value">${companyName}</span>
      </div>
      <div class="row">
        <span class="label">Date</span>
        <span class="value">${dateStr}</span>
      </div>
      <div class="row">
        <span class="label">Heure depart</span>
        <span class="value">${timeStr}</span>
      </div>
      <div class="row">
        <span class="label">Siege</span>
        <span class="value">${ticket.seatNumber || '—'}</span>
      </div>
      <div class="row">
        <span class="label">Ref</span>
        <span class="value value-mono">${reference}</span>
      </div>
    </div>

    <!-- ═══ PASSAGER ═══ -->
    <div class="section">
      <div class="section-title">Passager</div>
      <div class="row">
        <span class="label">Nom</span>
        <span class="value">${ticket.passengerName || '—'}</span>
      </div>
      <div class="row">
        <span class="label">Age</span>
        <span class="value">${ticket.passengerAge || '—'} ans</span>
      </div>
      <div class="row">
        <span class="label">Document</span>
        <span class="value">${ticket.documentType || '—'}</span>
      </div>
      <div class="row">
        <span class="label">N° Doc</span>
        <span class="value value-mono">${ticket.documentNumber || '—'}</span>
      </div>
    </div>

    <!-- ═══ BAGAGES ═══ -->
    <div class="section">
      <div class="section-title">Bagages</div>
      <div class="row-triple">
        <div class="col">
          <div class="col-label">Qte</div>
          <div class="col-value">${ticket.luggageCount || 0}</div>
        </div>
        <div class="col">
          <div class="col-label">Poids</div>
          <div class="col-value">${ticket.luggageWeightKg || 0}kg</div>
        </div>
        <div class="col">
          <div class="col-label">Frais</div>
          <div class="col-value">${ticket.luggageFee || 0}F</div>
        </div>
      </div>
    </div>

    <!-- ═══ QR CODE ═══ -->
    <div class="qr-section">
      <div class="qr-img">
        <img src="${qrDataUrl}" alt="QR" />
      </div>
      <div class="qr-caption">Scannez pour suivre votre ticket</div>
    </div>

    <!-- ═══ CODE DE CONTROLE ═══ -->
    <div class="control-section">
      <div class="control-label">Code de controle</div>
      <div class="control-code">${ticket.controlCode || ''}</div>
      <div class="control-hint">Presentez ce code lors du controle</div>
    </div>

    <!-- ═══ FOOTER ═══ -->
    <div class="footer">
      Smartickets ${(new Date()).getFullYear()} &mdash; smartickets.com<br/>
      Billet non remboursable &middot; Piece d'identite obligatoire
    </div>

  </div>

  <!-- Print Button -->
  <div class="print-area no-print">
    <button class="print-btn" onclick="window.print()">Imprimer</button>
  </div>
</body>
</html>`;

    return new NextResponse(html, {
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      },
    });
  } catch (error) {
    console.error('[/api/ticket-thermal] GET error:', error);
    return NextResponse.json(
      { error: 'server_error', message: 'Erreur serveur.' },
      { status: 500 }
    );
  }
}
