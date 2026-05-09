/**
 * Client utilitaire Groq — AI Inference API
 *
 * Prêt à recevoir les appels. Pour l'instant:
 * - Si GROQ_API_KEY n'est pas configurée → retourne { fallback: true }
 * - Si l'API est configurée → envoie la requête avec timeout + retry (1 tentative)
 * - En cas d'échec → log console.warn et retourne { fallback: true }
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
  GROQ_API_KEY,
  GROQ_BASE_URL,
  GROQ_TIMEOUT_MS,
  API_RETRY_COUNT,
  GROQ_MODEL_CHAT,
  FALLBACK_MESSAGES,
} from './config';
import { fetchWithRetry } from './fetch-util';

// ═══════════════════════════════════════════════════════
//  FONCTION PRINCIPALE
// ═══════════════════════════════════════════════════════

/**
 * Appelle le modèle Groq pour de l'inférence IA.
 *
 * @param request - La requête Groq (model, messages, temperature, max_tokens)
 * @returns GroqResult — jamais lance d'exception
 */
export async function callGroqAI(request: GroqRequest): Promise<GroqResult> {
  const startTime = Date.now();

  // ─── Guard: API key non configurée → fallback ───
  if (!GROQ_API_KEY) {
    console.warn('[Groq] Clé API non configurée → fallback.');
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

  const model = request.model || GROQ_MODEL_CHAT;

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
    GROQ_BASE_URL,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${GROQ_API_KEY}`,
      },
      body: JSON.stringify(body),
    },
    GROQ_TIMEOUT_MS,
    API_RETRY_COUNT,
    'Groq'
  );

  const latencyMs = Date.now() - startTime;

  if (result.ok) {
    const data = result.data as Record<string, unknown>;
    const choices = data?.choices as Array<Record<string, unknown>> | undefined;
    const usage = data?.usage as Record<string, number> | undefined;
    const content = choices?.[0]?.message?.content as string | undefined;

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
