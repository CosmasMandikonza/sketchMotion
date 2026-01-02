import { supabase } from './supabase';

export async function startVideoGeneration(options: {
  prompt: string;
  imageBase64: string;
  durationSeconds?: number;
}) {
  const { data, error } = await supabase.functions.invoke('generate-video', { body: options });
  if (error) return { status: 'error' as const, error: error.message };
  return data;
}

export async function checkVideoStatus(operationName: string) {
  const { data, error } = await supabase.functions.invoke('check-video-status', { body: { operationName } });
  if (error) return { status: 'error' as const, error: error.message };
  return data;
}

export async function generateVideoFromFrame(
  prompt: string,
  imageBase64: string,
  durationSeconds: number = 6,
  onProgress?: (progress: number, status: string) => void
): Promise<{ status: string; videoUrl?: string; error?: string }> {

  onProgress?.(5, 'Starting video generation...');

  console.log('[Video Gen] Sending request - prompt length:', prompt?.length, 'image length:', imageBase64?.length);

  // Start generation
  const { data: startData, error: startError } = await supabase.functions.invoke('generate-video', {
    body: { prompt, imageBase64, durationSeconds: [4, 6, 8].includes(durationSeconds) ? durationSeconds : 6 }
  });

  console.log('[Video Gen] Response:', { startData, startError });

  if (startError || startData?.status === 'error') {
    return { status: 'error', error: startError?.message || startData?.error };
  }

  if (!startData?.operationName) {
    return { status: 'error', error: 'No operation name returned' };
  }

  onProgress?.(10, 'Video generation started...');

  // Poll for completion (max 5 minutes)
  for (let i = 0; i < 60; i++) {
    await new Promise(r => setTimeout(r, 5000));

    console.log('[Video Gen] Polling with operationName:', startData.operationName);

    const { data: statusData, error: statusError } = await supabase.functions.invoke('check-video-status', {
      body: { operationName: startData.operationName }
    });

    console.log('[Video Gen] Status response:', statusData, statusError);

    if (statusError) {
      return { status: 'error', error: statusError.message };
    }

    if (statusData?.status === 'done') {
      onProgress?.(100, 'Video ready!');
      return { status: 'done', videoUrl: statusData.videoUrl };
    }

    if (statusData?.status === 'error') {
      return { status: 'error', error: statusData.error };
    }

    onProgress?.(10 + (i * 1.5), 'Generating video...');
  }

  return { status: 'error', error: 'Generation timed out' };
}

export async function generateVideoWithPolling(
  options: { prompt: string; imageBase64: string; durationSeconds?: number },
  onProgress?: (progress: number, status: string) => void
): Promise<{ status: string; videoUrl?: string; error?: string }> {
  return generateVideoFromFrame(
    options.prompt,
    options.imageBase64,
    options.durationSeconds || 6,
    onProgress
  );
}
