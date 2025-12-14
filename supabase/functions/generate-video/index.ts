import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

// Force deploy v20 - 2024-12-12

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight - MUST return early
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  try {
    // Safe JSON parsing - read as text first
    let body: { prompt?: string; imageBase64?: string; durationSeconds?: number };
    try {
      const text = await req.text();
      console.log('Request body length:', text?.length || 0);

      if (!text || text.length === 0) {
        return new Response(
          JSON.stringify({ status: 'error', error: 'Empty request body' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      body = JSON.parse(text);
    } catch (parseError) {
      console.error('JSON parse error:', parseError);
      return new Response(
        JSON.stringify({ status: 'error', error: 'Invalid JSON: ' + String(parseError) }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { prompt, imageBase64, durationSeconds: rawDuration = 6 } = body;
    const durationSeconds = [4, 6, 8].includes(rawDuration) ? rawDuration : 6;

    console.log('Received request - prompt length:', prompt?.length, 'image length:', imageBase64?.length);

    if (!prompt) {
      return new Response(
        JSON.stringify({ status: 'error', error: 'Missing prompt' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const projectId = Deno.env.get('GOOGLE_CLOUD_PROJECT');
    const location = Deno.env.get('GOOGLE_CLOUD_LOCATION') || 'us-central1';
    const bucketName = Deno.env.get('GOOGLE_CLOUD_BUCKET_NAME');
    const serviceAccountKey = Deno.env.get('GOOGLE_SERVICE_ACCOUNT_KEY');

    if (!projectId || !serviceAccountKey) {
      console.error('Missing config - projectId:', !!projectId, 'serviceAccountKey:', !!serviceAccountKey);
      return new Response(
        JSON.stringify({ status: 'error', error: 'Server not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let credentials;
    try {
      credentials = JSON.parse(serviceAccountKey);
    } catch {
      // Service account key is base64 encoded
      credentials = JSON.parse(atob(serviceAccountKey));
    }
    const accessToken = await getAccessToken(credentials);

    const cleanBase64 = (b64: string) => b64.replace(/^data:image\/\w+;base64,/, '');

    // Use Veo 2.0 model
    const veoEndpoint = `https://${location}-aiplatform.googleapis.com/v1/projects/${projectId}/locations/${location}/publishers/google/models/veo-2.0-generate-001:predictLongRunning`;

    // Build request body - image-to-video or text-to-video based on whether image is provided
    let requestBody;
    if (imageBase64) {
      // Image-to-video mode
      console.log('Using image-to-video mode');
      requestBody = {
        instances: [{
          prompt: prompt,
          image: {
            bytesBase64Encoded: cleanBase64(imageBase64),
            mimeType: "image/png"
          },
        }],
        parameters: {
          sampleCount: 1,
          aspectRatio: '16:9',
          durationSeconds: durationSeconds,
        }
      };
    } else {
      // Text-to-video mode
      console.log('Using text-to-video mode');
      requestBody = {
        instances: [{ prompt: prompt }],
        parameters: { sampleCount: 1, durationSeconds: durationSeconds }
      };
    }

    console.log('Calling Veo API:', veoEndpoint);

    const response = await fetch(veoEndpoint, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody),
    });

    const responseText = await response.text();

    if (!response.ok) {
      console.error('Veo error:', responseText);
      return new Response(
        JSON.stringify({ status: 'error', error: responseText, prompt }),
        { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const result = JSON.parse(responseText);
    console.log('Veo operation started:', result.name);

    return new Response(
      JSON.stringify({ status: 'processing', operationName: result.name, prompt }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ status: 'error', error: (error as Error).message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

async function getAccessToken(credentials: { client_email: string; private_key: string }): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const header = { alg: 'RS256', typ: 'JWT' };
  const payload = {
    iss: credentials.client_email,
    scope: 'https://www.googleapis.com/auth/cloud-platform',
    aud: 'https://oauth2.googleapis.com/token',
    iat: now,
    exp: now + 3600,
  };

  const encoder = new TextEncoder();
  const headerB64 = btoa(JSON.stringify(header)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
  const payloadB64 = btoa(JSON.stringify(payload)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
  const unsignedToken = `${headerB64}.${payloadB64}`;

  const privateKey = credentials.private_key;
  const pemContents = privateKey.replace(/-----BEGIN PRIVATE KEY-----/, '').replace(/-----END PRIVATE KEY-----/, '').replace(/\s/g, '');
  const binaryKey = Uint8Array.from(atob(pemContents), c => c.charCodeAt(0));

  const cryptoKey = await crypto.subtle.importKey('pkcs8', binaryKey, { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['sign']);
  const signature = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', cryptoKey, encoder.encode(unsignedToken));
  const signatureB64 = btoa(String.fromCharCode(...new Uint8Array(signature))).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');

  const jwt = `${unsignedToken}.${signatureB64}`;

  const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`,
  });

  const tokenData = await tokenResponse.json();
  if (!tokenData.access_token) {
    throw new Error('Failed to get access token: ' + JSON.stringify(tokenData));
  }
  return tokenData.access_token;
}
