import { NextRequest, NextResponse } from 'next/server';
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

    // Format date
    const dateStr = colis.departureDate
      ? new Date(colis.departureDate).toLocaleDateString('fr-FR', {
          weekday: 'long',
          day: '2-digit',
          month: 'long',
          year: 'numeric',
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
    const statusColor = statusLabel === 'VALIDÉ' ? '#059669' : statusLabel === 'ANNULÉ' ? '#dc2626' : '#d97706';

    const html = `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Ticket ${reference} — SmarticketS</title>
  <style>
    @media print {
      body { margin: 0; padding: 20mm; }
      .no-print { display: none !important; }
      .ticket-card { border: 2px dashed #2563eb; box-shadow: none !important; }
    }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: #f1f5f9;
      color: #0f172a;
      display: flex;
      justify-content: center;
      padding: 20px;
      min-height: 100vh;
    }
    .ticket-card {
      width: 100%;
      max-width: 440px;
      background: white;
      border-radius: 24px;
      border: 2px dashed rgba(37, 99, 235, 0.3);
      overflow: hidden;
      box-shadow: 0 1px 3px rgba(0,0,0,0.1);
    }
    .header {
      background: linear-gradient(135deg, #2563eb, #1d4ed8);
      color: white;
      padding: 24px;
      position: relative;
    }
    .header-content {
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
    .header-logo-icon {
      width: 40px; height: 40px;
      background: rgba(255,255,255,0.2);
      border-radius: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 18px;
      font-weight: 900;
    }
    .header-title { font-size: 18px; font-weight: 700; }
    .header-ref { font-size: 11px; opacity: 0.6; font-family: monospace; margin-top: 2px; }
    .status-badge {
      display: flex; align-items: center; gap: 6px;
      padding: 6px 12px; border-radius: 9999px;
      background: rgba(255,255,255,0.9);
      color: ${statusColor}; font-size: 12px; font-weight: 700;
    }
    .status-dot {
      width: 8px; height: 8px; border-radius: 50%;
      background: ${statusColor};
    }
    .section { padding: 20px; }
    .section + .section { border-top: 1px solid #f1f5f9; }

    .seat-company { display: flex; align-items: center; gap: 16px; }
    .seat-box {
      display: flex; flex-direction: column; align-items: center;
      background: #f1f5f9; border-radius: 16px;
      padding: 12px 20px; min-width: 80px;
    }
    .seat-icon { font-size: 20px; margin-bottom: 4px; }
    .seat-number { font-size: 28px; font-weight: 900; color: #0f172a; }
    .seat-label { font-size: 10px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; margin-top: 4px; }
    .company-info { flex: 1; min-width: 0; }
    .company-label { font-size: 12px; font-weight: 500; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 4px; }
    .company-name { font-size: 16px; font-weight: 700; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .company-ref { font-size: 12px; font-family: monospace; margin-top: 2px; }

    .dark-band {
      background: #0f172a; color: white;
      padding: 14px 20px;
      display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 8px;
    }
    .dark-band-center { border-left: 1px solid rgba(255,255,255,0.1); border-right: 1px solid rgba(255,255,255,0.1); }
    .dark-band-label { font-size: 10px; text-transform: uppercase; letter-spacing: 0.05em; font-weight: 600; }
    .dark-band-value { font-size: 14px; font-weight: 700; margin-top: 2px; }

    .trajet { display: flex; align-items: center; justify-content: space-between; }
    .trajet-city { font-size: 24px; font-weight: 900; text-transform: uppercase; }
    .trajet-icon { display: flex; align-items: center; gap: 8px; margin: 0 12px; }
    .trajet-icon-bus {
      width: 40px; height: 40px; border-radius: 50%;
      background: rgba(37, 99, 235, 0.1);
      display: flex; align-items: center; justify-content: center;
      font-size: 20px;
    }
    .trajet-icon-line { width: 24px; height: 2px; background: #2563eb; border-radius: 1px; }
    .trajet-info {
      display: flex; align-items: center; justify-content: center; gap: 16px;
      margin-top: 16px; padding-top: 16px; border-top: 1px solid #f1f5f9;
      font-size: 12px; font-weight: 500;
    }

    .section-header {
      display: flex; align-items: center; gap: 8px; margin-bottom: 12px;
    }
    .section-header-icon { width: 16px; height: 16px; color: #2563eb; }
    .section-header-text { font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; }
    .passenger-name { font-size: 20px; font-weight: 700; }
    .info-grid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 12px; margin-top: 12px; }
    .info-box {
      background: #f8fafc; border-radius: 12px;
      border: 1px dashed rgba(37, 99, 235, 0.2);
      padding: 12px; text-align: center;
    }
    .info-box-label { font-size: 10px; font-weight: 600; text-transform: uppercase; }
    .info-box-value { font-size: 14px; font-weight: 700; margin-top: 2px; }

    .luggage-grid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 12px; }
    .luggage-box {
      background: #f8fafc; border-radius: 12px;
      border: 1px dashed rgba(37, 99, 235, 0.2);
      padding: 16px; text-align: center;
    }
    .luggage-value { font-size: 24px; font-weight: 900; }
    .luggage-unit { font-size: 14px; font-weight: 600; margin-left: 2px; }
    .luggage-label { font-size: 10px; font-weight: 600; text-transform: uppercase; margin-top: 4px; }

    .control-section {
      background: #d1fae5; border-radius: 16px;
      border: 2px dashed rgba(16, 185, 129, 0.3);
      padding: 20px; text-align: center;
    }
    .control-header {
      display: flex; align-items: center; justify-content: center; gap: 8px;
      font-size: 12px; font-weight: 700; text-transform: uppercase;
      color: #065f46; margin-bottom: 8px;
    }
    .control-code {
      font-size: 28px; font-weight: 900; color: #064e3b;
      letter-spacing: 0.2em; font-family: monospace;
      margin: 4px 0;
    }
    .control-hint { font-size: 12px; color: #059669; }

    .print-btn {
      display: block; margin: 24px auto 0;
      padding: 12px 32px;
      background: #2563eb; color: white;
      border: none; border-radius: 12px;
      font-size: 14px; font-weight: 600;
      cursor: pointer;
    }
    .print-btn:hover { background: #1d4ed8; }
    .footer {
      text-align: center; padding: 8px;
      font-size: 11px; color: #94a3b8; margin-top: 16px;
    }
  </style>
</head>
<body>
  <div class="ticket-card">
    <!-- HEADER -->
    <div class="header">
      <div class="header-content">
        <div class="header-logo">
          <div class="header-logo-icon">S</div>
          <div>
            <div class="header-title">TICKET DE TRANSPORT</div>
            <div class="header-ref">${reference}</div>
          </div>
        </div>
        <div class="status-badge">
          <div class="status-dot"></div>
          ${statusLabel}
        </div>
      </div>
    </div>

    <!-- MAIN INFO -->
    <div class="section">
      <div class="seat-company">
        <div class="seat-box">
          <div class="seat-icon">💺</div>
          <div class="seat-number">${ticket.seatNumber || '—'}</div>
          <div class="seat-label">Siège</div>
        </div>
        <div class="company-info">
          <div class="company-label">Compagnie</div>
          <div class="company-name">${companyName}</div>
          <div class="company-ref">${reference}</div>
        </div>
      </div>
    </div>

    <!-- DARK BAND -->
    <div class="dark-band">
      <div class="dark-band-item">
        <div class="dark-band-label">Date</div>
        <div class="dark-band-value">${dateStr}</div>
      </div>
      <div class="dark-band-item dark-band-center">
        <div class="dark-band-label">Heure départ</div>
        <div class="dark-band-value">${timeStr}</div>
      </div>
      <div class="dark-band-item">
        <div class="dark-band-label">Référence</div>
        <div class="dark-band-value" style="font-family: monospace;">${reference}</div>
      </div>
    </div>

    <!-- TRAJET -->
    <div class="section">
      <div class="trajet">
        <div class="trajet-city">${colis.departureCity || '—'}</div>
        <div class="trajet-icon">
          <div class="trajet-icon-line" style="background: #e2e8f0;"></div>
          <div class="trajet-icon-bus">🚌</div>
          <div class="trajet-icon-line"></div>
        </div>
        <div class="trajet-city">${ticket.destination || '—'}</div>
      </div>
      <div class="trajet-info">
        <span>🕐 ${timeStr}</span>
        <span>💺 Siège ${ticket.seatNumber || '—'}</span>
        ${ticket.platform ? `<span>📍 Quai ${ticket.platform}</span>` : ''}
      </div>
    </div>

    <!-- PASSAGER -->
    <div class="section">
      <div class="section-header">
        <span>👤</span>
        <span class="section-header-text">Passager</span>
      </div>
      <div class="passenger-name">${ticket.passengerName || '—'}</div>
      <div class="info-grid">
        <div class="info-box">
          <div class="info-box-label">Âge</div>
          <div class="info-box-value">${ticket.passengerAge || '—'} ans</div>
        </div>
        <div class="info-box">
          <div class="info-box-label">Document</div>
          <div class="info-box-value">${ticket.documentType || '—'}</div>
        </div>
        <div class="info-box">
          <div class="info-box-label">N° Document</div>
          <div class="info-box-value" style="font-family: monospace;">${ticket.documentNumber || '—'}</div>
        </div>
      </div>
    </div>

    <!-- BAGAGES -->
    <div class="section">
      <div class="section-header">
        <span>📦</span>
        <span class="section-header-text">Bagages</span>
      </div>
      <div class="luggage-grid">
        <div class="luggage-box">
          <div class="luggage-value">${ticket.luggageCount || 0}</div>
          <div class="luggage-label">Quantité</div>
        </div>
        <div class="luggage-box">
          <div class="luggage-value">${ticket.luggageWeightKg || 0}<span class="luggage-unit">kg</span></div>
          <div class="luggage-label">Poids</div>
        </div>
        <div class="luggage-box">
          <div class="luggage-value">${ticket.luggageFee || 0}<span class="luggage-unit">F</span></div>
          <div class="luggage-label">Frais</div>
        </div>
      </div>
    </div>

    <!-- CODE DE CONTRÔLE -->
    <div class="section">
      <div class="control-section">
        <div class="control-header">🛡️ Code de contrôle</div>
        <div class="control-code">${(ticket.controlCode || '').split('').join('  ')}</div>
        <div class="control-hint">Présentez ce code lors du contrôle</div>
      </div>
    </div>
  </div>

  <!-- Print Button -->
  <div class="no-print">
    <button class="print-btn" onclick="window.print()">🖨️ Imprimer / Enregistrer en PDF</button>
  </div>

  <div class="footer no-print">
    © ${new Date().getFullYear()} SmarticketS. Tous droits réservés.
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
