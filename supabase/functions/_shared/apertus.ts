export type ChatMessage = { role: 'system' | 'user'; content: string };

function getEndpoint() {
  const configuredApiUrl = (Deno.env.get('APERTUS_API_URL') || 'https://api.publicai.co/v1').replace(/\/+$/, '');
  return /\/chat\/completions$/i.test(configuredApiUrl) ? configuredApiUrl : `${configuredApiUrl}/chat/completions`;
}

/** Sends a chat request to Apertus and returns the assistant message content. */
export async function callApertus(apiKey: string, messages: ChatMessage[], maxTokens = 2400) {
  const upstream = await fetch(getEndpoint(), {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: Deno.env.get('APERTUS_MODEL') || 'swiss-ai/apertus-v1.5-8b',
      messages,
      temperature: 0,
      max_tokens: maxTokens,
    }),
  });

  const raw = await upstream.text();
  let result: { choices?: Array<{ message?: { content?: string } }>; error?: { message?: string } } = {};
  try { result = raw ? JSON.parse(raw) : {}; } catch { /* fall through to the status check below */ }
  if (!upstream.ok) throw new Error(result.error?.message || `Apertus returned ${upstream.status}.`);
  return result.choices?.[0]?.message?.content?.trim() || '';
}

/** Parses the JSON object out of a model reply that may be wrapped in prose or a code fence. */
export function parseJsonReply<T>(content: string): T {
  const withoutFence = content.replace(/```(?:json)?/gi, '');
  const jsonText = withoutFence.match(/\{[\s\S]*\}/)?.[0];
  if (!jsonText) throw new Error('Apertus did not return JSON.');
  return JSON.parse(jsonText) as T;
}

/** Runs a prompt that must answer with JSON and returns the parsed object. */
export async function callApertusForJson<T>(apiKey: string, messages: ChatMessage[], maxTokens = 2400) {
  return parseJsonReply<T>(await callApertus(apiKey, messages, maxTokens));
}
