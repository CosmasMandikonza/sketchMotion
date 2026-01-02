import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  try {
    let body: { operationName?: string };
    try {
      const text = await req.text();
      if (!text) {
        return new Response(
          JSON.stringify({ status: 'error', error: 'Empty request body' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      body = JSON.parse(text);
    } catch {
      return new Response(
        JSON.stringify({ status: 'error', error: 'Invalid JSON' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { operationName } = body;

    if (!operationName) {
      return new Response(
        JSON.stringify({ status: 'error', error: 'operationName required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Checking operation:', operationName);

    const serviceAccountKey = Deno.env.get('GOOGLE_SERVICE_ACCOUNT_KEY');
    const bucketName = Deno.env.get('GOOGLE_CLOUD_BUCKET_NAME');
    
    if (!serviceAccountKey) {
      return new Response(
        JSON.stringify({ status: 'error', error: 'Not configured' }),
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

    // Extract info from operation name
    // Format: projects/PROJECT/locations/LOCATION/publishers/google/models/MODEL/operations/UUID
    const parts = operationName.split('/');
    const projectId = parts[1];
    const location = parts[3];
    const modelId = parts[7];

    console.log('Extracted - project:', projectId, 'location:', location, 'model:', modelId);

    // Use fetchPredictOperation endpoint with v1beta1
    const pollUrl = `https://${location}-aiplatform.googleapis.com/v1beta1/projects/${projectId}/locations/${location}/publishers/google/models/${modelId}:fetchPredictOperation`;

    console.log('Poll URL:', pollUrl);

    const response = await fetch(pollUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ operationName })
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error('Poll failed:', response.status, errText);
      return new Response(
        JSON.stringify({ status: 'error', error: `Poll failed: ${response.status}` }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const result = await response.json();
    console.log('Poll result - done:', result.done);

    if (result.done) {
      if (result.error) {
        console.error('Operation error:', result.error);
        return new Response(
          JSON.stringify({ status: 'error', error: result.error.message }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // CORRECT STRUCTURE: response.videos[0].bytesBase64Encoded
      const videos = result.response?.videos;
      
      if (videos && videos.length > 0 && videos[0].bytesBase64Encoded) {
        console.log('Found base64 video, length:', videos[0].bytesBase64Encoded.length);
        
        // Decode base64 to binary
        const base64Data = videos[0].bytesBase64Encoded;
        const binaryString = atob(base64Data);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }
        
        console.log('Decoded video size:', bytes.length, 'bytes');

        // Upload to GCS
        if (bucketName) {
          const videoFileName = `videos/veo-${Date.now()}.mp4`;
          const uploadUrl = `https://storage.googleapis.com/upload/storage/v1/b/${bucketName}/o?uploadType=media&name=${encodeURIComponent(videoFileName)}`;
          
          console.log('Uploading to GCS:', videoFileName);
          
          const uploadResponse = await fetch(uploadUrl, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${accessToken}`,
              'Content-Type': 'video/mp4',
            },
            body: bytes,
          });

          if (uploadResponse.ok) {
            const videoUrl = `https://storage.googleapis.com/${bucketName}/${videoFileName}`;
            console.log('Video uploaded:', videoUrl);
            
            return new Response(
              JSON.stringify({ status: 'done', videoUrl }),
              { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
          } else {
            const uploadErr = await uploadResponse.text();
            console.error('GCS upload failed:', uploadErr);
            
            // Fallback: return as data URL (large but works)
            const videoUrl = `data:video/mp4;base64,${base64Data}`;
            return new Response(
              JSON.stringify({ status: 'done', videoUrl }),
              { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
          }
        } else {
          // No bucket configured - return as data URL
          console.log('No bucket configured, returning data URL');
          const videoUrl = `data:video/mp4;base64,${base64Data}`;
          return new Response(
            JSON.stringify({ status: 'done', videoUrl }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
      }

      // Fallback: check for GCS URI (older response format)
      let videoUrl = '';
      if (result.response?.videos?.[0]?.gcsUri) {
        videoUrl = result.response.videos[0].gcsUri;
      } else if (result.response?.generatedVideos?.[0]?.video?.uri) {
        videoUrl = result.response.generatedVideos[0].video.uri;
      }

      if (videoUrl) {
        // Convert gs:// to https://
        if (videoUrl.startsWith('gs://')) {
          videoUrl = videoUrl.replace('gs://', 'https://storage.googleapis.com/');
        }
        console.log('Video ready:', videoUrl);
        return new Response(
          JSON.stringify({ status: 'done', videoUrl }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // No video found
      console.error('No video in response:', JSON.stringify(result.response).slice(0, 500));
      return new Response(
        JSON.stringify({ status: 'error', error: 'No video in response' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Still processing
    const progress = result.metadata?.progressPercentage || 50;
    console.log('Still processing, progress:', progress);

    return new Response(
      JSON.stringify({ status: 'processing', progress }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ status: 'error', error: String(error) }),
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
