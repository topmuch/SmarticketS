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

    // Generate QR code as data URL
    const qrUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'https://smartickets.com'}/retrieve/${reference}`;
    const qrDataUrl = await QRCode.toDataURL(qrUrl, {
      width: 200,
      margin: 1,
      color: { dark: '#0f172a', light: '#ffffff' },
      errorCorrectionLevel: 'H',
    });

    // Format date
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

    const companyName = colis.busCompany || colis.airlineName || colis.trainCompany || colis.shipName || '—';
    const status = ticket.ticketStatus?.toUpperCase() || '';
    const statusLabel = status.includes('ACTIVE') || status.includes('VALID')
      ? 'VALIDÉ'
      : status.includes('CANCEL') || status.includes('EXPIR') || status.includes('ANNUL')
        ? 'ANNULÉ'
        : 'EN ATTENTE';
    const statusBg = statusLabel === 'VALIDÉ' ? '#d1fae5' : statusLabel === 'ANNULÉ' ? '#fecaca' : '#fef3c7';
    const statusColor = statusLabel === 'VALIDÉ' ? '#059669' : statusLabel === 'ANNULÉ' ? '#dc2626' : '#d97706';

    const html = `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <title>Ticket ${reference} — SmarticketS</title>
  <style>
    @page {
      size: A4;
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
      .ticket-wrapper { box-shadow: none !important; }
    }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      background: #e8f0fe;
      color: #0f172a;
      display: flex;
      justify-content: center;
      align-items: flex-start;
      padding: 24px;
      min-height: 100vh;
    }

    /* ── TICKET CARD ── */
    .ticket-wrapper {
      width: 100%;
      max-width: 440px;
      background: #ffffff;
      border-radius: 24px;
      overflow: hidden;
      box-shadow: 0 4px 24px rgba(0,0,0,0.08);
    }

    /* ── HEADER ── */
    .header {
      background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%);
      color: #ffffff;
      padding: 28px 24px 32px;
      position: relative;
      overflow: hidden;
      border-radius: 24px 24px 0 0;
    }
    .header::before {
      content: '';
      position: absolute;
      top: -30px;
      right: -30px;
      width: 120px;
      height: 120px;
      background: rgba(255,255,255,0.06);
      border-radius: 50%;
    }
    .header::after {
      content: '';
      position: absolute;
      bottom: -20px;
      left: -20px;
      width: 80px;
      height: 80px;
      background: rgba(255,255,255,0.04);
      border-radius: 50%;
    }
    .header-row {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      position: relative;
      z-index: 1;
    }
    .header-logo {
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .logo-icon {
      width: 44px;
      height: 44px;
      background: rgba(255,255,255,0.2);
      border-radius: 14px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 20px;
      font-weight: 900;
      backdrop-filter: blur(4px);
    }
    .logo-title {
      font-size: 18px;
      font-weight: 800;
      letter-spacing: 0.5px;
      line-height: 1.2;
    }
    .logo-sub {
      font-size: 11px;
      opacity: 0.5;
      margin-top: 2px;
    }
    .status-badge {
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 6px 14px;
      border-radius: 9999px;
      background: ${statusBg};
      color: ${statusColor};
      font-size: 11px;
      font-weight: 700;
      letter-spacing: 0.5px;
    }
    .status-dot {
      width: 7px;
      height: 7px;
      border-radius: 50%;
      background: ${statusColor};
    }

    /* ── SEAT & COMPANY ROW ── */
    .seat-company-row {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 16px;
      padding: 20px 24px;
    }
    .seat-box {
      display: flex;
      flex-direction: column;
      align-items: center;
      background: #f1f5f9;
      border-radius: 16px;
      padding: 14px 24px;
      min-width: 90px;
    }
    .seat-icon { font-size: 22px; margin-bottom: 4px; }
    .seat-number { font-size: 32px; font-weight: 900; color: #0f172a; line-height: 1; }
    .seat-label { font-size: 10px; font-weight: 600; text-transform: uppercase; letter-spacing: 1px; margin-top: 4px; color: #475569; }

    .route-icon-separator {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .separator-line { width: 28px; height: 2px; background: #cbd5e1; border-radius: 1px; }
    .separator-bus {
      width: 44px;
      height: 44px;
      border-radius: 50%;
      background: rgba(37, 99, 235, 0.08);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 22px;
    }

    .company-box {
      display: flex;
      flex-direction: column;
      align-items: center;
      background: #f1f5f9;
      border-radius: 16px;
      padding: 14px 24px;
      min-width: 90px;
    }
    .company-icon { font-size: 22px; margin-bottom: 4px; }
    .company-value { font-size: 18px; font-weight: 900; color: #0f172a; line-height: 1; }
    .company-label { font-size: 10px; font-weight: 600; text-transform: uppercase; letter-spacing: 1px; margin-top: 4px; color: #475569; }

    /* ── BLACK BAND ── */
    .black-band {
      background: #0f172a;
      color: #ffffff;
      padding: 16px 24px;
      display: grid;
      grid-template-columns: 1fr 1fr 1fr;
      gap: 8px;
    }
    .black-band-item { text-align: center; }
    .black-band-center {
      border-left: 1px solid rgba(255,255,255,0.1);
      border-right: 1px solid rgba(255,255,255,0.1);
    }
    .black-band-label {
      font-size: 10px;
      text-transform: uppercase;
      letter-spacing: 1px;
      font-weight: 600;
      opacity: 0.7;
    }
    .black-band-value {
      font-size: 15px;
      font-weight: 700;
      margin-top: 3px;
    }

    /* ── TRAJET ── */
    .trajet-section { padding: 24px; }
    .trajet-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
    }
    .trajet-city {
      font-size: 28px;
      font-weight: 900;
      text-transform: uppercase;
      color: #2563eb;
      letter-spacing: 1px;
    }
    .trajet-mid {
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .trajet-line { width: 32px; height: 2px; background: #93c5fd; border-radius: 1px; }
    .trajet-bus-icon {
      width: 44px;
      height: 44px;
      border-radius: 50%;
      background: rgba(37, 99, 235, 0.1);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 22px;
    }
    .trajet-details {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 20px;
      margin-top: 16px;
      padding-top: 16px;
      border-top: 1px solid #e2e8f0;
      font-size: 12px;
      font-weight: 500;
      color: #475569;
    }
    .trajet-detail-item { display: flex; align-items: center; gap: 4px; }

    /* ── BOTTOM SECTION (Blue bg + QR) ── */
    .bottom-section {
      background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%);
      padding: 24px;
      display: flex;
      gap: 20px;
      align-items: center;
    }
    .bottom-info { flex: 1; color: #ffffff; }
    .bottom-info-label {
      font-size: 10px;
      text-transform: uppercase;
      letter-spacing: 1px;
      font-weight: 600;
      opacity: 0.6;
      margin-bottom: 4px;
    }
    .bottom-info-value {
      font-size: 13px;
      font-weight: 600;
    }
    .bottom-info-row { margin-bottom: 10px; }
    .bottom-info-row:last-child { margin-bottom: 0; }

    .qr-wrapper {
      width: 130px;
      height: 130px;
      background: #ffffff;
      border-radius: 16px;
      padding: 8px;
      flex-shrink: 0;
    }
    .qr-wrapper img {
      width: 100%;
      height: 100%;
      display: block;
      border-radius: 8px;
    }

    /* ── PASSENGER ── */
    .passenger-section { padding: 20px 24px; }
    .passenger-header {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 8px;
    }
    .passenger-header-icon { font-size: 16px; }
    .passenger-header-text {
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 1px;
      color: #475569;
    }
    .passenger-name { font-size: 20px; font-weight: 800; color: #0f172a; }
    .passenger-grid {
      display: grid;
      grid-template-columns: 1fr 1fr 1fr;
      gap: 12px;
      margin-top: 12px;
    }
    .passenger-box {
      background: #f8fafc;
      border-radius: 12px;
      border: 1px dashed rgba(37, 99, 235, 0.2);
      padding: 12px;
      text-align: center;
    }
    .passenger-box-label {
      font-size: 10px;
      font-weight: 600;
      text-transform: uppercase;
      color: #475569;
    }
    .passenger-box-value {
      font-size: 14px;
      font-weight: 700;
      color: #0f172a;
      margin-top: 3px;
    }

    /* ── BAGAGES ── */
    .bagages-section { padding: 20px 24px; border-top: 1px solid #f1f5f9; }
    .bagages-header {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 12px;
    }
    .bagages-header-icon { font-size: 16px; }
    .bagages-header-text {
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 1px;
      color: #475569;
    }
    .bagages-grid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 12px; }
    .bagages-box {
      background: #f8fafc;
      border-radius: 12px;
      border: 1px dashed rgba(37, 99, 235, 0.2);
      padding: 14px;
      text-align: center;
    }
    .bagages-value { font-size: 24px; font-weight: 900; color: #0f172a; }
    .bagages-unit { font-size: 13px; font-weight: 600; margin-left: 2px; color: #475569; }
    .bagages-label {
      font-size: 10px;
      font-weight: 600;
      text-transform: uppercase;
      color: #475569;
      margin-top: 4px;
    }

    /* ── CONTROL CODE ── */
    .control-section {
      margin: 0 24px 24px;
      background: #d1fae5;
      border-radius: 16px;
      border: 2px dashed rgba(16, 185, 129, 0.3);
      padding: 16px;
      text-align: center;
    }
    .control-header {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      color: #065f46;
      letter-spacing: 0.5px;
    }
    .control-code {
      font-size: 28px;
      font-weight: 900;
      color: #064e3b;
      letter-spacing: 6px;
      font-family: 'Courier New', Courier, monospace;
      margin: 6px 0;
    }
    .control-hint { font-size: 11px; color: #059669; }

    /* ── PRINT BUTTON ── */
    .print-area {
      text-align: center;
      margin-top: 24px;
    }
    .print-btn {
      display: inline-block;
      padding: 14px 40px;
      background: #2563eb;
      color: #ffffff;
      border: none;
      border-radius: 14px;
      font-size: 15px;
      font-weight: 600;
      cursor: pointer;
      transition: background 0.2s;
    }
    .print-btn:hover { background: #1d4ed8; }
  </style>
</head>
<body>
  <div class="ticket-wrapper">
    <!-- ═══ HEADER ═══ -->
    <div class="header">
      <div class="header-row">
        <div class="header-logo">
          <div class="logo-icon">S</div>
          <div>
            <div class="logo-title">SMARTICKETS</div>
            <div class="logo-sub">Ticket de transport</div>
          </div>
        </div>
        <div class="status-badge">
          <div class="status-dot"></div>
          ${statusLabel}
        </div>
      </div>
    </div>

    <!-- ═══ SEAT & COMPANY ═══ -->
    <div class="seat-company-row">
      <div class="seat-box">
        <div class="seat-icon">💺</div>
        <div class="seat-number">${ticket.seatNumber || '—'}</div>
        <div class="seat-label">Siège</div>
      </div>
      <div class="route-icon-separator">
        <div class="separator-line"></div>
        <div class="separator-bus">🚌</div>
        <div class="separator-line"></div>
      </div>
      <div class="company-box">
        <div class="company-icon">🏢</div>
        <div class="company-value" style="font-size:14px;">${companyName}</div>
        <div class="company-label">Compagnie</div>
      </div>
    </div>

    <!-- ═══ BLACK BAND ═══ -->
    <div class="black-band">
      <div class="black-band-item">
        <div class="black-band-label">Date</div>
        <div class="black-band-value">${dateStr}</div>
      </div>
      <div class="black-band-item black-band-center">
        <div class="black-band-label">Départ</div>
        <div class="black-band-value">${timeStr}</div>
      </div>
      <div class="black-band-item">
        <div class="black-band-label">Code réservation</div>
        <div class="black-band-value" style="font-family: 'Courier New', monospace;">${reference}</div>
      </div>
    </div>

    <!-- ═══ TRAJET ═══ -->
    <div class="trajet-section">
      <div class="trajet-row">
        <div class="trajet-city">${colis.departureCity || '—'}</div>
        <div class="trajet-mid">
          <div class="trajet-line"></div>
          <div class="trajet-bus-icon">🚌</div>
          <div class="trajet-line"></div>
        </div>
        <div class="trajet-city">${ticket.destination || colis.arrivalCity || '—'}</div>
      </div>
      <div class="trajet-details">
        <span class="trajet-detail-item">🕐 ${timeStr}</span>
        <span class="trajet-detail-item">💺 Siège ${ticket.seatNumber || '—'}</span>
        ${ticket.platform ? `<span class="trajet-detail-item">📍 Quai ${ticket.platform}</span>` : ''}
      </div>
    </div>

    <!-- ═══ BOTTOM SECTION (Blue + QR) ═══ -->
    <div class="bottom-section">
      <div class="bottom-info">
        <div class="bottom-info-row">
          <div class="bottom-info-label">Passager</div>
          <div class="bottom-info-value">${ticket.passengerName || '—'}</div>
        </div>
        <div class="bottom-info-row">
          <div class="bottom-info-label">Compagnie</div>
          <div class="bottom-info-value">${companyName}</div>
        </div>
        <div class="bottom-info-row">
          <div class="bottom-info-label">Siège / Train</div>
          <div class="bottom-info-value">${ticket.seatNumber || '—'} / ${companyName}</div>
        </div>
        <div class="bottom-info-row">
          <div class="bottom-info-label">Code réservation</div>
          <div class="bottom-info-value" style="font-family: 'Courier New', monospace;">${reference}</div>
        </div>
      </div>
      <div class="qr-wrapper">
        <img src="${qrDataUrl}" alt="QR Code" />
      </div>
    </div>

    <!-- ═══ PASSENGER ═══ -->
    <div class="passenger-section">
      <div class="passenger-header">
        <span class="passenger-header-icon">👤</span>
        <span class="passenger-header-text">Passager</span>
      </div>
      <div class="passenger-name">${ticket.passengerName || '—'}</div>
      <div class="passenger-grid">
        <div class="passenger-box">
          <div class="passenger-box-label">Âge</div>
          <div class="passenger-box-value">${ticket.passengerAge || '—'} ans</div>
        </div>
        <div class="passenger-box">
          <div class="passenger-box-label">Document</div>
          <div class="passenger-box-value">${ticket.documentType || '—'}</div>
        </div>
        <div class="passenger-box">
          <div class="passenger-box-label">N° Document</div>
          <div class="passenger-box-value" style="font-family: 'Courier New', monospace; font-size:12px;">${ticket.documentNumber || '—'}</div>
        </div>
      </div>
    </div>

    <!-- ═══ BAGAGES ═══ -->
    <div class="bagages-section">
      <div class="bagages-header">
        <span class="bagages-header-icon">📦</span>
        <span class="bagages-header-text">Bagages</span>
      </div>
      <div class="bagages-grid">
        <div class="bagages-box">
          <div class="bagages-value">${ticket.luggageCount || 0}</div>
          <div class="bagages-label">Quantité</div>
        </div>
        <div class="bagages-box">
          <div class="bagages-value">${ticket.luggageWeightKg || 0}<span class="bagages-unit">kg</span></div>
          <div class="bagages-label">Poids</div>
        </div>
        <div class="bagages-box">
          <div class="bagages-value">${ticket.luggageFee || 0}<span class="bagages-unit">F</span></div>
          <div class="bagages-label">Frais</div>
        </div>
      </div>
    </div>

    <!-- ═══ CODE DE CONTRÔLE ═══ -->
    <div class="control-section">
      <div class="control-header">🛡️ Code de contrôle</div>
      <div class="control-code">${(ticket.controlCode || '').split('').join('  ')}</div>
      <div class="control-hint">Présentez ce code lors du contrôle</div>
    </div>
  </div>

  <!-- Print Button -->
  <div class="print-area no-print">
    <button class="print-btn" onclick="window.print()">🖨️  Imprimer / Enregistrer en PDF</button>
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
    console.error('[/api/ticket-pdf] GET error:', error);
    return NextResponse.json(
      { error: 'server_error', message: 'Erreur serveur.' },
      { status: 500 }
    );
  }
}
