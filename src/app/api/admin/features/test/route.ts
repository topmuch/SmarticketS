import { NextRequest, NextResponse } from 'next/server';
import { getSetting, invalidateSettingsCache } from '@/lib/settings';

// ═══════════════════════════════════════════════════════
//  GET — Récupérer le statut de configuration de chaque service
// ═══════════════════════════════════════════════════════

interface ConfigCheck {
  dbKey: string;
  envKey: string;
  required: boolean;
  label: string;
}

const SERVICE_CONFIGS: Record<string, { label: string; checks: ConfigCheck[] }> = {
  whatsapp_automated: {
    label: 'WhatsApp Automatisé',
    checks: [
      { dbKey: 'whatsapp_instance_id', envKey: 'WHATSAPP_INSTANCE_ID', required: true, label: 'Instance ID' },
      { dbKey: 'whatsapp_api_key', envKey: 'WHATSAPP_API_KEY', required: true, label: 'Clé API' },
    ],
  },
  geolocation_advanced: {
    label: 'Géolocalisation',
    checks: [
      { dbKey: 'nominatim_enabled', envKey: 'NOMINATIM_ENABLED', required: false, label: 'Nominatim' },
      { dbKey: 'google_maps_api_key', envKey: 'GOOGLE_MAPS_API_KEY', required: false, label: 'Google Maps API Key' },
    ],
  },
  push_notifications: {
    label: 'Notifications Push',
    checks: [
      { dbKey: 'whatsapp_instance_id', envKey: 'WHATSAPP_INSTANCE_ID', required: true, label: 'Instance ID' },
      { dbKey: 'whatsapp_api_key', envKey: 'WHATSAPP_API_KEY', required: true, label: 'Clé API' },
    ],
  },
  api_webhooks: {
    label: 'Webhooks',
    checks: [
      { dbKey: 'webhook_urls', envKey: 'WEBHOOK_URLS', required: false, label: 'Webhook URLs' },
    ],
  },
  wakit_api: {
    label: 'Wakit API',
    checks: [
      { dbKey: 'wakit_api_key', envKey: 'WAKIT_API_KEY', required: true, label: 'Clé API Wakit' },
      { dbKey: 'wakit_base_url', envKey: 'WAKIT_BASE_URL', required: false, label: 'URL de base' },
      { dbKey: 'wakit_phone_number_id', envKey: 'WAKIT_PHONE_NUMBER_ID', required: true, label: 'Phone Number ID' },
    ],
  },
  groq_api: {
    label: 'Groq API',
    checks: [
      { dbKey: 'groq_api_key', envKey: 'GROQ_API_KEY', required: true, label: 'Clé API Groq' },
      { dbKey: 'groq_base_url', envKey: 'GROQ_BASE_URL', required: false, label: 'URL de base' },
      { dbKey: 'groq_model_chat', envKey: 'GROQ_MODEL_CHAT', required: false, label: 'Modèle Chat' },
      { dbKey: 'groq_model_analysis', envKey: 'GROQ_MODEL_ANALYSIS', required: false, label: 'Modèle Analyse' },
    ],
  },
};

export async function GET() {
  try {
    // Force refresh settings cache
    invalidateSettingsCache();

    const configStatus: Record<string, { configured: boolean; missing: string[] }> = {};

    for (const [serviceKey, serviceConfig] of Object.entries(SERVICE_CONFIGS)) {
      const missing: string[] = [];

      for (const check of serviceConfig.checks) {
        const dbValue = await getSetting(check.dbKey);
        const envValue = process.env[check.envKey] || '';

        if (check.required && !dbValue && !envValue) {
          missing.push(check.label);
        }
      }

      configStatus[serviceKey] = {
        configured: missing.length === 0,
        missing,
      };
    }

    return NextResponse.json({ configStatus });
  } catch (error) {
    console.error('[Features Test] GET error:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la lecture de la configuration' },
      { status: 500 }
    );
  }
}

// ═══════════════════════════════════════════════════════
//  POST — Tester une connexion API
// ═══════════════════════════════════════════════════════

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { key } = body;

    if (!key) {
      return NextResponse.json(
        { success: false, message: 'Clé de fonctionnalité requise' },
        { status: 400 }
      );
    }

    // Force refresh settings cache
    invalidateSettingsCache();

    switch (key) {
      case 'groq_api':
        return testGroqAPI();
      case 'wakit_api':
        return testWakitAPI();
      case 'whatsapp_automated':
      case 'push_notifications':
        return testWhatsAppAPI();
      case 'geolocation_advanced':
        return testGeolocationAPI();
      case 'api_webhooks':
        return testWebhookAPI();
      default:
        return NextResponse.json({
          success: true,
          message: 'Cette fonctionnalité ne nécessite pas de test de connexion API.',
          noTest: true,
        });
    }
  } catch (error) {
    console.error('[Features Test] POST error:', error);
    return NextResponse.json({
      success: false,
      message: 'Erreur lors du test',
      details: error instanceof Error ? error.message : 'Erreur inconnue',
    });
  }
}

// ═══════════════════════════════════════════════════════
//  TEST: Groq API
// ═══════════════════════════════════════════════════════

async function testGroqAPI() {
  try {
    const apiKey = await getSetting('groq_api_key', process.env.GROQ_API_KEY || '');
    const baseUrl = await getSetting('groq_base_url', 'https://api.groq.com/openai/v1/chat/completions');

    if (!apiKey) {
      return NextResponse.json({
        success: false,
        key: 'groq_api',
        message: 'Clé API Groq non configurée',
        details: 'Veuillez entrer votre clé API Groq dans la configuration.',
      });
    }

    // Validate URL contains /chat/completions
    const url = baseUrl.includes('/chat/completions')
      ? baseUrl
      : `${baseUrl.replace(/\/+$/, '')}/chat/completions`;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: 'llama-3.3-70b-versatile',
          messages: [{ role: 'user', content: 'Say "OK" in one word.' }],
          max_tokens: 5,
          temperature: 0,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeout);

      if (response.ok) {
        const data = await response.json();
        const content = data?.choices?.[0]?.message?.content || '';
        return NextResponse.json({
          success: true,
          key: 'groq_api',
          message: 'Connexion Groq API réussie !',
          details: `Réponse du modèle: "${content}"\nModèle: ${data?.model || 'N/A'}\nTokens: ${data?.usage?.total_tokens || 'N/A'}`,
        });
      } else {
        const errorData = await response.json().catch(() => ({}));
        const errorMsg = errorData?.error?.message || `HTTP ${response.status}`;

        if (response.status === 401) {
          return NextResponse.json({
            success: false,
            key: 'groq_api',
            message: 'Clé API Groq invalide',
            details: `Erreur d'authentification: ${errorMsg}\n\nVérifiez que votre clé API est correcte.`,
          });
        }

        if (response.status === 404) {
          return NextResponse.json({
            success: false,
            key: 'groq_api',
            message: 'URL endpoint incorrecte',
            details: `L'URL "${url}" n'existe pas.\nAssurez-vous que l'URL se termine par /chat/completions.\nValeur recommandée: https://api.groq.com/openai/v1/chat/completions`,
          });
        }

        return NextResponse.json({
          success: false,
          key: 'groq_api',
          message: `Erreur API Groq (HTTP ${response.status})`,
          details: errorMsg,
        });
      }
    } catch (fetchError) {
      clearTimeout(timeout);
      if (fetchError instanceof DOMException && fetchError.name === 'AbortError') {
        return NextResponse.json({
          success: false,
          key: 'groq_api',
          message: 'Timeout — l\'API Groq ne répond pas',
          details: 'Le délai d\'attente de 15 secondes a été dépassé. Vérifiez votre connexion et l\'URL de l\'API.',
        });
      }
      throw fetchError;
    }
  } catch (error) {
    return NextResponse.json({
      success: false,
      key: 'groq_api',
      message: 'Erreur lors du test Groq',
      details: error instanceof Error ? error.message : 'Erreur inconnue',
    });
  }
}

// ═══════════════════════════════════════════════════════
//  TEST: Wakit API
// ═══════════════════════════════════════════════════════

async function testWakitAPI() {
  try {
    const apiKey = await getSetting('wakit_api_key', process.env.WAKIT_API_KEY || '');
    const baseUrl = await getSetting('wakit_base_url', 'https://api.wakit.ai/v1');

    if (!apiKey) {
      return NextResponse.json({
        success: false,
        key: 'wakit_api',
        message: 'Clé API Wakit non configurée',
        details: 'Veuillez entrer votre clé API Wakit dans la configuration.',
      });
    }

    // Simple connectivity check
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);

    try {
      const response = await fetch(baseUrl.replace(/\/+$/, ''), {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
        },
        signal: controller.signal,
      });

      clearTimeout(timeout);

      return NextResponse.json({
        success: response.ok || response.status === 404, // 404 still means server is reachable
        key: 'wakit_api',
        message: response.ok
          ? 'Connexion Wakit API réussie !'
          : 'Serveur Wakit joignable (vérifiez les endpoints)',
        details: `Statut HTTP: ${response.status} ${response.statusText}`,
      });
    } catch (fetchError) {
      clearTimeout(timeout);
      if (fetchError instanceof DOMException && fetchError.name === 'AbortError') {
        return NextResponse.json({
          success: false,
          key: 'wakit_api',
          message: 'Timeout — l\'API Wakit ne répond pas',
          details: 'Le délai d\'attente de 10 secondes a été dépassé. Vérifiez l\'URL de l\'API.',
        });
      }
      throw fetchError;
    }
  } catch (error) {
    return NextResponse.json({
      success: false,
      key: 'wakit_api',
      message: 'Erreur lors du test Wakit',
      details: error instanceof Error ? error.message : 'Erreur inconnue',
    });
  }
}

// ═══════════════════════════════════════════════════════
//  TEST: WhatsApp (Green API)
// ═══════════════════════════════════════════════════════

async function testWhatsAppAPI() {
  try {
    const instanceId = await getSetting('whatsapp_instance_id', '');
    const apiKey = await getSetting('whatsapp_api_key', '');

    if (!instanceId || !apiKey) {
      return NextResponse.json({
        success: false,
        key: 'whatsapp_automated',
        message: 'Identifiants WhatsApp manquants',
        details: !instanceId
          ? 'L\'Instance ID est requis.'
          : 'La clé API est requise.',
      });
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);

    try {
      const url = `https://api.green-api.com/waInstance${instanceId}/getSettings/${apiKey}`;
      const response = await fetch(url, { signal: controller.signal });

      clearTimeout(timeout);

      if (response.ok) {
        return NextResponse.json({
          success: true,
          key: 'whatsapp_automated',
          message: 'Connexion Green API réussie !',
          details: 'Les identifiants WhatsApp sont valides.',
        });
      }

      return NextResponse.json({
        success: false,
        key: 'whatsapp_automated',
        message: `Erreur Green API (HTTP ${response.status})`,
        details: 'Vérifiez votre Instance ID et votre clé API.',
      });
    } catch (fetchError) {
      clearTimeout(timeout);
      if (fetchError instanceof DOMException && fetchError.name === 'AbortError') {
        return NextResponse.json({
          success: false,
          key: 'whatsapp_automated',
          message: 'Timeout — Green API ne répond pas',
          details: 'Vérifiez votre connexion internet.',
        });
      }
      throw fetchError;
    }
  } catch (error) {
    return NextResponse.json({
      success: false,
      key: 'whatsapp_automated',
      message: 'Erreur lors du test WhatsApp',
      details: error instanceof Error ? error.message : 'Erreur inconnue',
    });
  }
}

// ═══════════════════════════════════════════════════════
//  TEST: Géolocalisation
// ═══════════════════════════════════════════════════════

async function testGeolocationAPI() {
  try {
    const nominatimEnabled = await getSetting('nominatim_enabled', 'false');
    const googleKey = await getSetting('google_maps_api_key', process.env.GOOGLE_MAPS_API_KEY || '');

    if (nominatimEnabled === 'true' || nominatimEnabled === '1') {
      // Test Nominatim
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10000);

      try {
        const response = await fetch(
          'https://nominatim.openstreetmap.org/reverse?lat=48.8566&lon=2.3522&format=json',
          {
            headers: { 'User-Agent': 'QRTrans-Test/1.0' },
            signal: controller.signal,
          }
        );
        clearTimeout(timeout);

        if (response.ok) {
          const data = await response.json();
          return NextResponse.json({
            success: true,
            key: 'geolocation_advanced',
            message: 'Géolocalisation Nominatim OK !',
            details: `Adresse test: ${data?.display_name || 'N/A'}`,
          });
        }
      } catch (fetchError) {
        clearTimeout(timeout);
      }
    }

    if (googleKey) {
      // Test Google Maps
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10000);

      try {
        const response = await fetch(
          `https://maps.googleapis.com/maps/api/geocode/json?latlng=48.8566,2.3522&key=${googleKey}`,
          { signal: controller.signal }
        );
        clearTimeout(timeout);

        if (response.ok) {
          const data = await response.json();
          if (data.status === 'OK') {
            return NextResponse.json({
              success: true,
              key: 'geolocation_advanced',
              message: 'Géolocalisation Google Maps OK !',
              details: `Adresse test: ${data.results?.[0]?.formatted_address || 'N/A'}`,
            });
          }
          return NextResponse.json({
            success: false,
            key: 'geolocation_advanced',
            message: 'Clé Google Maps invalide',
            details: `Statut: ${data.status} — ${data.error_message || 'Vérifiez votre clé API.'}`,
          });
        }
      } catch (fetchError) {
        clearTimeout(timeout);
      }
    }

    return NextResponse.json({
      success: false,
      key: 'geolocation_advanced',
      message: 'Aucun service de géolocalisation configuré',
      details: 'Activez Nominatim (gratuit) ou configurez une clé Google Maps API.',
    });
  } catch (error) {
    return NextResponse.json({
      success: false,
      key: 'geolocation_advanced',
      message: 'Erreur lors du test de géolocalisation',
      details: error instanceof Error ? error.message : 'Erreur inconnue',
    });
  }
}

// ═══════════════════════════════════════════════════════
//  TEST: Webhooks
// ═══════════════════════════════════════════════════════

async function testWebhookAPI() {
  try {
    const webhookUrls = await getSetting('webhook_urls', '');

    if (!webhookUrls) {
      return NextResponse.json({
        success: false,
        key: 'api_webhooks',
        message: 'Aucune URL webhook configurée',
        details: 'Entrez au moins une URL webhook dans la configuration.',
      });
    }

    const urls = webhookUrls.split('\n').map(u => u.trim()).filter(Boolean);

    if (urls.length === 0) {
      return NextResponse.json({
        success: false,
        key: 'api_webhooks',
        message: 'Aucune URL webhook valide',
        details: 'Les URLs doivent être saisies une par ligne.',
      });
    }

    return NextResponse.json({
      success: true,
      key: 'api_webhooks',
      message: `${urls.length} webhook${urls.length > 1 ? 's' : ''} configuré${urls.length > 1 ? 's' : ''}`,
      details: urls.map((u, i) => `${i + 1}. ${u}`).join('\n'),
    });
  } catch (error) {
    return NextResponse.json({
      success: false,
      key: 'api_webhooks',
      message: 'Erreur lors de la vérification des webhooks',
      details: error instanceof Error ? error.message : 'Erreur inconnue',
    });
  }
}
