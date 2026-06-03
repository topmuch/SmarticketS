import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { db } from '@/lib/db';
import { sendEmail, getEmailSettings } from '@/lib/email';

// Messages API - Contact, Partenaire, Commande Agence
// GET - Fetch all messages with filters
export async function GET(request: NextRequest) {
  try {
    // 🔒 AUTH AJOUTÉE — Vérification authentification
    const session = await getSession();
    if (!session) {
      return NextResponse.json(
        { error: 'Non authentifié' },
        { status: 401 }
      );
    }
    const allowedRoles = ['admin', 'agent', 'agency', 'superadmin'];
    if (!allowedRoles.includes(session.role)) {
      return NextResponse.json(
        { error: 'Accès refusé - Rôle insuffisant' },
        { status: 403 }
      );
    }
    // 🔒 ISOLATION PAR AGENCE — Un admin/agence ne voit que ses messages, superadmin voit tout
    // 🔒 FIN AUTH

    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type');
    const status = searchParams.get('status');
    const limit = parseInt(searchParams.get('limit') || '50');

    const where: Record<string, unknown> = {};
    if (type && type !== 'all') where.type = type;
    if (status && status !== 'all') where.status = status;
    // 🔒 ISOLATION PAR AGENCE — filtrer par agencyId de la session
    if (session.role !== 'superadmin' && session.agencyId) {
      where.agencyId = session.agencyId;
    }
    // 🔒 FIN ISOLATION

    const messages = await db.message.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    // Get unread count
    const unreadWhere: Record<string, unknown> = { status: 'non_lu' };
    if (session.role !== 'superadmin' && session.agencyId) {
      unreadWhere.agencyId = session.agencyId;
    }
    const unreadCount = await db.message.count({
      where: unreadWhere,
    });

    return NextResponse.json({ messages, unreadCount });
  } catch (error) {
    console.error('Error fetching messages:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la récupération des messages' },
      { status: 500 }
    );
  }
}

// POST - Create a new message (public contact form — auth optional for contact type)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { type, senderName, senderEmail, senderPhone, agencyId, recipientAgencyId, subject, content } = body;

    if (!type || !content) {
      return NextResponse.json(
        { error: 'Type et contenu requis' },
        { status: 400 }
      );
    }

    const message = await db.message.create({
      data: {
        type,
        senderName: senderName || null,
        senderEmail: senderEmail || null,
        senderPhone: senderPhone || null,
        agencyId: agencyId || null,
        recipientAgencyId: recipientAgencyId || null,
        subject: subject || null,
        content: typeof content === 'string' ? content : JSON.stringify(content),
        status: 'non_lu',
      },
    });

    // 📧 Send email notification to admin
    let emailSent = false;
    let emailError = '';
    try {
      const emailSettings = await getEmailSettings();
      if (emailSettings) {
        const recipientEmail = emailSettings.recipientSystemEmail || emailSettings.fromEmail;
        if (recipientEmail) {
          await sendEmail({
            to: recipientEmail,
            subject: `Nouveau message de ${senderName || 'Visiteur'} - ${type}`,
            html: `<div style="font-family:Arial;max-width:600px;margin:0 auto;padding:20px"><h2 style="color:#ff7f00">Nouveau message SmarticketS</h2><p><strong>Type:</strong> ${type}</p>${senderName ? `<p><strong>De:</strong> ${senderName}</p>` : ''}${senderEmail ? `<p><strong>Email:</strong> ${senderEmail}</p>` : ''}${senderPhone ? `<p><strong>Téléphone:</strong> ${senderPhone}</p>` : ''}${subject ? `<p><strong>Sujet:</strong> ${subject}</p>` : ''}<div style="background:#f5f5f5;padding:15px;border-radius:8px;margin-top:15px"><p>${typeof content === 'string' ? content : JSON.stringify(content)}</p></div><hr style="margin-top:20px;border:none;border-top:1px solid #eee"><p style="color:#999;font-size:12px">© SmarticketS - Tous droits réservés</p></div>`,
            type: 'new_message',
          });
          emailSent = true;
        }
      }
    } catch (emailErr) {
      console.error('Failed to send email notification:', emailErr);
      emailError = emailErr instanceof Error ? emailErr.message : 'Erreur email inconnue';
    }

    // 🔔 Create in-app notification for SuperAdmin
    await db.notification.create({
      data: {
        type: 'new_message',
        message: `📨 Nouveau message de ${senderName || 'Visiteur'} — ${type}${subject ? ` : ${subject}` : ''}`,
        read: false,
      }
    });

    return NextResponse.json({ success: true, message, emailSent, emailError });
  } catch (error) {
    console.error('Error creating message:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la création du message' },
      { status: 500 }
    );
  }
}

// PUT - Update message status
export async function PUT(request: NextRequest) {
  try {
    // 🔒 AUTH AJOUTÉE — Vérification authentification
    const session = await getSession();
    if (!session) {
      return NextResponse.json(
        { error: 'Non authentifié' },
        { status: 401 }
      );
    }
    const allowedRoles = ['admin', 'agent', 'agency', 'superadmin'];
    if (!allowedRoles.includes(session.role)) {
      return NextResponse.json(
        { error: 'Accès refusé - Rôle insuffisant' },
        { status: 403 }
      );
    }
    // 🔒 FIN AUTH

    const body = await request.json();
    const { id, status } = body;

    if (!id || !status) {
      return NextResponse.json(
        { error: 'ID et statut requis' },
        { status: 400 }
      );
    }

    // 🔒 ISOLATION — vérifier que le message appartient à l'agence (sauf superadmin)
    if (session.role !== 'superadmin' && session.agencyId) {
      const existing = await db.message.findUnique({ where: { id }, select: { agencyId: true } });
      if (existing && existing.agencyId && existing.agencyId !== session.agencyId) {
        return NextResponse.json(
          { error: 'Accès refusé - Message non trouvé' },
          { status: 404 }
        );
      }
    }
    // 🔒 FIN ISOLATION

    const message = await db.message.update({
      where: { id },
      data: { status },
    });

    return NextResponse.json({ success: true, message });
  } catch (error) {
    console.error('Error updating message:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la mise à jour' },
      { status: 500 }
    );
  }
}

// DELETE - Delete a message
export async function DELETE(request: NextRequest) {
  try {
    // 🔒 AUTH AJOUTÉE — Vérification authentification
    const session = await getSession();
    if (!session) {
      return NextResponse.json(
        { error: 'Non authentifié' },
        { status: 401 }
      );
    }
    const allowedRoles = ['admin', 'agent', 'agency', 'superadmin'];
    if (!allowedRoles.includes(session.role)) {
      return NextResponse.json(
        { error: 'Accès refusé - Rôle insuffisant' },
        { status: 403 }
      );
    }
    // 🔒 FIN AUTH

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: 'ID requis' },
        { status: 400 }
      );
    }

    // 🔒 ISOLATION — vérifier que le message appartient à l'agence (sauf superadmin)
    if (session.role !== 'superadmin' && session.agencyId) {
      const existing = await db.message.findUnique({ where: { id }, select: { agencyId: true } });
      if (existing && existing.agencyId && existing.agencyId !== session.agencyId) {
        return NextResponse.json(
          { error: 'Accès refusé - Message non trouvé' },
          { status: 404 }
        );
      }
    }
    // 🔒 FIN ISOLATION

    await db.message.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting message:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la suppression' },
      { status: 500 }
    );
  }
}
