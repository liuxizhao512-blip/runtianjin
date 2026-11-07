/**
 * Run Tianjin — AI proxy for the Tips page Q&A.
 *
 * Why this exists: the site is static (GitHub Pages), so an API key cannot live
 * in the browser. This Worker holds the key in an environment variable and
 * forwards only the chat request, so the key never reaches the visitor.
 *
 * Deploy (free tier is enough):
 *   1. npm i -g wrangler
 *   2. wrangler login
 *   3. wrangler deploy worker/ai-proxy.js --name run-tianjin-ai
 *   4. wrangler secret put GROQ_API_KEY      (paste your gsk_... key)
 *   5. Copy the printed URL into AI_ENDPOINT in qa.js
 *
 * Optional: set ALLOWED_ORIGIN to your site origin to lock down CORS.
 */

const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';
const MODEL = 'llama-3.3-70b-versatile';

// Requests per IP per hour. Keeps a public endpoint from being drained.
const RATE_LIMIT = 30;
const RATE_WINDOW_MS = 60 * 60 * 1000;

// In-memory counter. Resets when the isolate recycles, which is fine for
// abuse-dampening; use a Durable Object if you need exact accounting.
const hits = new Map();

function rateLimited(ip) {
  const now = Date.now();
  const entry = hits.get(ip);
  if (!entry || now - entry.start > RATE_WINDOW_MS) {
    hits.set(ip, { start: now, count: 1 });
    return false;
  }
  entry.count += 1;
  return entry.count > RATE_LIMIT;
}

function corsHeaders(env) {
  return {
    'Access-Control-Allow-Origin': env.ALLOWED_ORIGIN || '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '86400'
  };
}

function json(body, status, env) {
  return new Response(JSON.stringify(body), {
    status: status,
    headers: Object.assign(
      { 'Content-Type': 'application/json; charset=utf-8' },
      corsHeaders(env)
    )
  });
}

export default {
  async fetch(request, env) {
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders(env) });
    }

    if (request.method !== 'POST') {
      return json({ error: 'Use POST.' }, 405, env);
    }

    if (!env.GROQ_API_KEY) {
      return json({ error: 'Server is missing GROQ_API_KEY.' }, 500, env);
    }

    const ip = request.headers.get('CF-Connecting-IP') || 'unknown';
    if (rateLimited(ip)) {
      return json({ error: 'Too many questions. Try again in a little while.' }, 429, env);
    }

    let payload;
    try {
      payload = await request.json();
    } catch (error) {
      return json({ error: 'Body must be JSON.' }, 400, env);
    }

    const question = typeof payload.question === 'string' ? payload.question.trim() : '';
    const context = typeof payload.context === 'string' ? payload.context : '';

    if (!question) {
      return json({ error: 'Missing question.' }, 400, env);
    }
    if (question.length > 500) {
      return json({ error: 'Question is too long.' }, 400, env);
    }

    // The knowledge base is sent from the client so the Worker stays stateless
    // and the guide can be edited without redeploying.
    const systemPrompt = [
      'You are the running assistant for Run Tianjin, a city running guide for Tianjin, China.',
      'Answer using ONLY the guide below. If the guide does not cover the question, say so plainly',
      'and suggest what the guide does cover. Never invent routes, distances, or opening hours.',
      'Keep answers under 120 words. Use short paragraphs or a few bullets. Plain text only.',
      '',
      '--- GUIDE START ---',
      context.slice(0, 12000),
      '--- GUIDE END ---'
    ].join('\n');

    let upstream;
    try {
      upstream = await fetch(GROQ_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer ' + env.GROQ_API_KEY
        },
        body: JSON.stringify({
          model: MODEL,
          temperature: 0.3,
          max_tokens: 400,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: question }
          ]
        })
      });
    } catch (error) {
      return json({ error: 'Could not reach the AI service.' }, 502, env);
    }

    if (!upstream.ok) {
      const detail = await upstream.text();
      // Log upstream detail for the operator, but do not leak it to the visitor.
      console.error('Groq error', upstream.status, detail.slice(0, 500));
      const message =
        upstream.status === 429
          ? 'The AI service is busy right now. Try again shortly.'
          : 'The AI service returned an error.';
      return json({ error: message }, 502, env);
    }

    const data = await upstream.json();
    const answer =
      data && data.choices && data.choices[0] && data.choices[0].message
        ? data.choices[0].message.content
        : '';

    if (!answer) {
      return json({ error: 'The AI service returned an empty answer.' }, 502, env);
    }

    return json({ answer: answer.trim() }, 200, env);
  }
};
