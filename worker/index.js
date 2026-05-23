/**
 * One Hundred Years — Synthesis Layer Worker
 *
 * Receives POST { query, context } from the frontend.
 * Calls Claude API with structured system prompt.
 * Caches responses in KV (same query+context hash = same synthesis).
 *
 * Secrets (set via `wrangler secret put`):
 *   ANTHROPIC_API_KEY — Claude API key
 *
 * KV namespace binding: CACHE
 */

const SYSTEM_PROMPT = `You are the synthesis engine for "One Hundred Years," a 10-issue data journalism series at onehundredyears.report. Each issue analyzes a dataset spanning 100+ years of American life.

Your role is to translate pre-computed data into clear, precise natural-language findings. You are a structured synthesis engine, not a chatbot. The data you receive comes from whichever issue the user is querying — it could be about UFO reports, baseball integration, weather patterns, immigration, gun violence, mental health, broadcast ownership, housing discrimination, or any other topic in the series.

RULES — follow these exactly:

1. GROUNDING: Every claim you make must be directly supported by the data provided in the user message. Do not invent statistics, infer trends not present in the data, or add information from outside the provided context. Synthesize ONLY the data you receive — do not reference other issues or datasets.

2. CONFIDENCE LABELS: End every synthesis with exactly one of these labels:
   - HIGH CONFIDENCE — finding is directly stated in the data with no extrapolation
   - MODERATE CONFIDENCE — finding requires minimal inference from the data
   - CANDIDATE — finding is plausible but requires assumptions beyond the data

3. CITATIONS: For every numerical claim, cite the source field from the data (e.g., "player.stat", "station.since", "legislation.year").

4. TONE: Write like a research briefing — precise, neutral, no speculation. Use active voice. No hedging language like "it seems" or "perhaps."

5. LENGTH: Keep synthesis to 3–5 sentences. Be dense with information. No filler.

6. STRUCTURE: Return valid JSON with this shape:
   {
     "synthesis": "The plain-language finding.",
     "confidence": "HIGH CONFIDENCE" | "MODERATE CONFIDENCE" | "CANDIDATE",
     "sources": ["field.name", "field.name"],
     "query_type": "player" | "team" | "station" | "year" | "legislation" | "state" | "event" | "general"
   }

If the provided data is insufficient to answer the query, say so explicitly and label as CANDIDATE.`;

// Simple hash for cache keys
async function hashKey(str) {
  const data = new TextEncoder().encode(str);
  const buf = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
}

// CORS headers
const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...CORS },
  });
}

export default {
  async fetch(request, env) {
    // CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: CORS });
    }

    if (request.method !== 'POST') {
      return json({ error: 'Method not allowed' }, 405);
    }

    try {
      const { query, context } = await request.json();

      if (!query || typeof query !== 'string' || query.trim().length === 0) {
        return json({ error: 'Missing or empty query' }, 400);
      }

      if (!context || typeof context !== 'object') {
        return json({ error: 'Missing context object' }, 400);
      }

      // Check cache
      const cacheInput = JSON.stringify({ query: query.trim().toLowerCase(), context });
      const cacheKey = await hashKey(cacheInput);

      const cached = await env.CACHE.get(cacheKey);
      if (cached) {
        return json({ ...JSON.parse(cached), cached: true });
      }

      // Call Claude API
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': env.ANTHROPIC_API_KEY,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 1024,
          system: SYSTEM_PROMPT,
          messages: [{
            role: 'user',
            content: `Query: "${query.trim()}"\n\nPre-computed data context:\n${JSON.stringify(context, null, 2)}`,
          }],
        }),
      });

      if (!response.ok) {
        const err = await response.text();
        console.error('Claude API error:', response.status, err);
        return json({ error: 'Synthesis service unavailable' }, 502);
      }

      const result = await response.json();
      const text = result.content?.[0]?.text;

      if (!text) {
        return json({ error: 'Empty response from synthesis engine' }, 502);
      }

      // Parse the JSON response from Claude
      let synthesis;
      try {
        // Extract JSON from the response (Claude may wrap it in markdown code blocks)
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        synthesis = jsonMatch ? JSON.parse(jsonMatch[0]) : { synthesis: text, confidence: 'CANDIDATE', sources: [], query_type: 'general' };
      } catch {
        // If JSON parsing fails, use the raw text
        synthesis = { synthesis: text, confidence: 'CANDIDATE', sources: [], query_type: 'general' };
      }

      // Cache for 24 hours
      await env.CACHE.put(cacheKey, JSON.stringify(synthesis), { expirationTtl: 86400 });

      return json({ ...synthesis, cached: false });

    } catch (err) {
      console.error('Worker error:', err);
      return json({ error: 'Server error' }, 500);
    }
  },
};
