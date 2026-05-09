/**
 * Client utilitaire Groq — AI Inference API
 *
 * Prêt à recevoir les appels:
 * - Si la clé API n'est pas configurée (DB + env) → retourne { fallback: true }
 * - Si l'API est configurée → envoie la requête avec timeout + retry (1 tentative)
 * - En cas d'échec → log console.warn et retourne { fallback: true }
 *
 * Les clés API sont lues depuis la DB (table Setting) en priorité,
 * puis depuis process.env en fallback.
 *
 * Usage:
 *   const result = await callGroqAI({
 *     model: 'llama3-8b-8192',
 *     messages: [{ role: 'user', content: 'Analyse ce bagage...' }],
 *     temperature: 0.3,
 *   });
 */

import type { GroqRequest, GroqResult } from '@/types/ai';
import {
  API_RETRY_COUNT,
  FALLBACK_MESSAGES,
  getServiceConfig,
} from './config';
import type { GroqServiceConfig } from './config';
import { fetchWithRetry } from './fetch-util';

// ═══════════════════════════════════════════════════════
//  FONCTION PRINCIPALE
// ═══════════════════════════════════════════════════════

/**
 * Appelle le modèle Groq pour de l'inférence IA.
 * Lit la configuration depuis la DB (priorité) puis les env vars.
 *
 * @param request - La requête Groq (model, messages, temperature, max_tokens)
 * @returns GroqResult — jamais lance d'exception
 */
export async function callGroqAI(request: GroqRequest): Promise<GroqResult> {
  const startTime = Date.now();

  // ─── Charger la config (DB + env) ───
  let config: GroqServiceConfig;
  try {
    config = await getServiceConfig('groq');
  } catch (error) {
    console.warn('[Groq] Erreur lecture config → fallback:', error);
    return {
      success: false,
      error: FALLBACK_MESSAGES.groq.noApiKey,
      fallback: true,
      latencyMs: Date.now() - startTime,
    };
  }

  // ─── Guard: API key non configurée → fallback ───
  if (!config.apiKey) {
    console.warn('[Groq] Clé API non configurée (DB + env) → fallback.');
    return {
      success: false,
      error: FALLBACK_MESSAGES.groq.noApiKey,
      fallback: true,
      latencyMs: Date.now() - startTime,
    };
  }

  // ─── Validation ───
  if (!request.messages || request.messages.length === 0) {
    console.warn('[Groq] Messages vides.');
    return {
      success: false,
      error: FALLBACK_MESSAGES.groq.invalidRequest,
      fallback: false,
      latencyMs: Date.now() - startTime,
    };
  }

  const model = request.model || config.modelChat;

  // ─── Appel API ───
  console.log(
    `[Groq] Appel modèle "${model}" — ${request.messages.length} message(s), temp=${request.temperature ?? 0.3}`
  );

  const body: Record<string, unknown> = {
    model,
    messages: request.messages,
    temperature: request.temperature ?? 0.3,
    max_tokens: request.max_tokens ?? 1024,
  };

  const result = await fetchWithRetry(
    config.baseUrl,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${config.apiKey}`,
      },
      body: JSON.stringify(body),
    },
    config.timeoutMs,
    API_RETRY_COUNT,
    'Groq'
  );

  const latencyMs = Date.now() - startTime;

  if (result.ok) {
    const data = result.data as Record<string, unknown>;
    const choices = data?.choices as Array<Record<string, unknown>> | undefined;
    const usage = data?.usage as Record<string, number> | undefined;
    const message = choices?.[0]?.message as Record<string, unknown> | undefined;
    const content = message?.content as string | undefined;

    if (content) {
      console.log(`[Groq] ✓ Réponse obtenue en ${latencyMs}ms — ${content.length} caractères`);
      return {
        success: true,
        content,
        usage: usage
          ? {
              promptTokens: usage.prompt_tokens ?? 0,
              completionTokens: usage.completion_tokens ?? 0,
              totalTokens: usage.total_tokens ?? 0,
            }
          : undefined,
        latencyMs,
        fallback: false,
      };
    }

    // Réponse OK mais pas de contenu
    console.warn('[Groq] Réponse OK mais contenu vide.');
    return {
      success: false,
      error: 'Réponse vide du modèle.',
      fallback: true,
      latencyMs,
    };
  }

  // ─── Échec → fallback (ne bloque jamais le flux) ───
  console.warn(`[Groq] ✗ Échec après ${API_RETRY_COUNT + 1} tentatives (${latencyMs}ms) → fallback.`);
  return {
    success: false,
    error: FALLBACK_MESSAGES.groq.genericError,
    fallback: true,
    latencyMs,
  };
}
