import { GoogleGenAI } from "@google/genai";

const getAIClient = () => {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
  if (!apiKey) {
    console.warn("VITE_GEMINI_API_KEY not found");
    return null;
  }
  return new GoogleGenAI({ apiKey });
};

export const ai = getAIClient();

/**
 * Convert image URL to base64 data URL
 */
async function imageUrlToBase64(url: string): Promise<string> {
  // If already base64, return as-is
  if (url.startsWith('data:')) {
    return url;
  }
  
  // Fetch image and convert to base64
  const response = await fetch(url);
  const blob = await response.blob();
  
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

/**
 * Polish a rough sketch into a professional illustration using Gemini
 * Uses image generation capabilities with responseModalities: ["TEXT", "IMAGE"]
 */
export async function polishSketch(imageInput: string): Promise<string | null> {
  if (!ai) {
    throw new Error("API key not configured. Add VITE_GEMINI_API_KEY to .env");
  }

  // Convert URL to base64 if needed
  const base64Image = await imageUrlToBase64(imageInput);

  const response = await ai.models.generateContent({
    model: "gemini-2.0-flash-exp",
    contents: [
      {
        role: "user",
        parts: [
          {
            text: `Transform this rough sketch into a polished, professional digital illustration.

REQUIREMENTS:
- Keep the EXACT same composition, layout, and subject matter
- Enhance lines to be clean and professional
- Add rich colors, shading, and lighting
- Make it look like a finished storyboard frame from a professional animator
- Maintain the artistic intent
- Output ONLY the enhanced image`,
          },
          {
            inlineData: {
              data: base64Image.replace(/^data:image\/\w+;base64,/, ""),
              mimeType: "image/png",
            },
          },
        ],
      },
    ],
    config: {
      responseModalities: ["TEXT", "IMAGE"],
    },
  });

  // Extract image from response
  const parts = response.candidates?.[0]?.content?.parts;
  if (parts) {
    for (const part of parts) {
      if (part.inlineData?.data) {
        const mimeType = part.inlineData.mimeType || "image/png";
        return `data:${mimeType};base64,${part.inlineData.data}`;
      }
    }
  }

  console.warn("No image in Gemini response");
  return null;
}

/**
 * Polish a sketch with a specific style
 */
export async function polishSketchWithStyle(
  imageInput: string,
  stylePrompt: string
): Promise<string | null> {
  if (!ai) {
    throw new Error("API key not configured. Add VITE_GEMINI_API_KEY to .env");
  }

  // Convert URL to base64 if needed
  const base64Image = await imageUrlToBase64(imageInput);

  const fullPrompt = `Transform this rough sketch into a polished, professional image.

STYLE: ${stylePrompt}

REQUIREMENTS:
- Keep the EXACT same composition, layout, and subject matter
- Enhance lines to be clean and professional
- Add rich colors, shading, and lighting appropriate to the style
- Maintain the original artistic intent
- Output ONLY the enhanced image, no text`;

  const response = await ai.models.generateContent({
    model: "gemini-2.0-flash-exp",
    contents: [
      {
        role: "user",
        parts: [
          { text: fullPrompt },
          {
            inlineData: {
              data: base64Image.replace(/^data:image\/\w+;base64,/, ""),
              mimeType: "image/png",
            },
          },
        ],
      },
    ],
    config: {
      responseModalities: ["TEXT", "IMAGE"],
    },
  });

  const parts = response.candidates?.[0]?.content?.parts;
  if (parts) {
    for (const part of parts) {
      if (part.inlineData?.data) {
        return `data:${part.inlineData.mimeType || "image/png"};base64,${part.inlineData.data}`;
      }
    }
  }
  return null;
}

/**
 * Analyze a sketch and describe it for animation purposes
 */
export async function analyzeSketch(imageInput: string): Promise<string> {
  if (!ai) {
    throw new Error("Google AI not configured.");
  }

  // Convert URL to base64 if needed
  const base64Image = await imageUrlToBase64(imageInput);

  const response = await ai.models.generateContent({
    model: "gemini-2.0-flash",
    contents: [
      {
        role: "user",
        parts: [
          {
            text: "Analyze this storyboard frame briefly. Describe: 1) Main subject/action, 2) Composition, 3) Suggested camera movement for animation. Keep it under 100 words.",
          },
          {
            inlineData: {
              data: base64Image.replace(/^data:image\/\w+;base64,/, ""),
              mimeType: "image/png",
            },
          },
        ],
      },
    ],
  });

  return response.text || "Unable to analyze sketch";
}

/**
 * Generate a video/animation prompt from sketch analysis and user notes
 */
export async function generateMotionPrompt(
  sketchAnalysis: string,
  userMotionNotes: string
): Promise<string> {
  if (!ai) {
    throw new Error("Google AI not configured");
  }

  const response = await ai.models.generateContent({
    model: "gemini-2.0-flash",
    contents: `Create a concise video generation prompt from:

Sketch: ${sketchAnalysis}
Motion Notes: ${userMotionNotes}

Output a single prompt for AI video generation. Include camera movement, timing, transitions. Under 100 words, no explanations.`,
  });

  return response.text || userMotionNotes;
}

/**
 * Suggest motion/camera notes for a frame based on its image
 * Returns cinematic camera direction like "Slow zoom in, subtle parallax"
 */
export async function suggestMotionNotes(imageInput: string): Promise<string> {
  if (!ai) {
    throw new Error("Google AI not configured.");
  }

  const base64Image = await imageUrlToBase64(imageInput);

  const response = await ai.models.generateContent({
    model: "gemini-2.0-flash",
    contents: [
      {
        role: "user",
        parts: [
          {
            text: `You are a cinematographer. Analyze this storyboard frame and suggest camera movement/animation.

Output ONLY a short camera direction (max 10 words). Examples:
- "Slow zoom in on subject, subtle parallax"
- "Pan left revealing scene, gentle float"
- "Static wide shot, foreground blur"
- "Push in dramatic, rack focus"
- "Crane up and over, drift right"

Be specific to what's in the image. Output only the direction, nothing else.`,
          },
          {
            inlineData: {
              data: base64Image.replace(/^data:image\/\w+;base64,/, ""),
              mimeType: "image/png",
            },
          },
        ],
      },
    ],
  });

  return response.text?.trim() || "Slow zoom in, subtle movement";
}

/**
 * Check visual continuity across multiple frames
 * Returns array of issues found
 */
export async function checkContinuity(
  frames: Array<{ id: string; title: string; imageUrl: string }>
): Promise<Array<{ frameId: string; frameTitle: string; issue: string; severity: 'low' | 'medium' | 'high' }>> {
  if (!ai) {
    throw new Error("Google AI not configured.");
  }

  if (frames.length < 2) {
    return [];
  }

  // Convert all images to base64
  const frameParts: Array<{ text: string } | { inlineData: { data: string; mimeType: string } }> = [];
  
  frameParts.push({
    text: `You are a continuity supervisor for animation. Analyze these ${frames.length} storyboard frames in sequence and identify visual inconsistencies.

Check for:
- Character appearance changes (clothing, hair, features)
- Color palette shifts between frames
- Lighting direction inconsistencies
- Art style variations
- Background/environment changes that shouldn't occur
- Object continuity (items appearing/disappearing)

Frames in order: ${frames.map((f, i) => `Frame ${i + 1}: "${f.title}"`).join(', ')}

Output JSON array only, no markdown. Format:
[{"frameIndex": 1, "issue": "description", "severity": "low|medium|high"}]

If no issues found, output: []`,
  });

  for (const frame of frames) {
    const base64 = await imageUrlToBase64(frame.imageUrl);
    frameParts.push({
      inlineData: {
        data: base64.replace(/^data:image\/\w+;base64,/, ""),
        mimeType: "image/png",
      },
    });
  }

  const response = await ai.models.generateContent({
    model: "gemini-2.0-flash",
    contents: [
      {
        role: "user",
        parts: frameParts,
      },
    ],
  });

  try {
    const text = response.text?.trim() || "[]";
    // Clean up potential markdown code blocks
    const jsonStr = text.replace(/```json\n?|\n?```/g, '').trim();
    const issues = JSON.parse(jsonStr);
    
    return issues.map((issue: { frameIndex: number; issue: string; severity: string }) => ({
      frameId: frames[issue.frameIndex]?.id || frames[0].id,
      frameTitle: frames[issue.frameIndex]?.title || `Frame ${issue.frameIndex + 1}`,
      issue: issue.issue,
      severity: issue.severity as 'low' | 'medium' | 'high',
    }));
  } catch (e) {
    console.error("Failed to parse continuity response:", e);
    return [];
  }
}

/**
 * Generate a comprehensive video prompt from storyboard frames
 * Analyzes all frames and creates a master prompt for video generation
 */
export async function generateStoryboardVideoPrompt(
  frames: Array<{
    title: string;
    imageUrl: string;
    durationMs: number;
    motionNotes?: string;
    order: number;
  }>,
  style: 'Cinematic' | 'Animated' | 'Realistic' | 'Stylized'
): Promise<{
  masterPrompt: string;
  framePrompts: Array<{ frameTitle: string; prompt: string; duration: number }>;
  totalDuration: number;
  technicalNotes: string;
}> {
  if (!ai) {
    throw new Error("Google AI not configured. Add VITE_GEMINI_API_KEY to .env");
  }

  // Build content with all frame images
  const parts: Array<{ text: string } | { inlineData: { data: string; mimeType: string } }> = [];

  const frameDescriptions = frames.map((f, i) =>
    `Frame ${i + 1}: "${f.title}" (${f.durationMs / 1000}s)${f.motionNotes ? ` - Motion: ${f.motionNotes}` : ''}`
  ).join('\n');

  parts.push({
    text: `You are a professional video director. Analyze these ${frames.length} storyboard frames and create a comprehensive video generation prompt.

FRAMES:
${frameDescriptions}

STYLE: ${style}
TOTAL DURATION: ${frames.reduce((acc, f) => acc + f.durationMs, 0) / 1000} seconds

OUTPUT JSON (no markdown, pure JSON):
{
  "masterPrompt": "A single cohesive prompt describing the entire video narrative, visual style, and flow",
  "framePrompts": [
    {"frameTitle": "title", "prompt": "specific scene prompt", "duration": seconds}
  ],
  "technicalNotes": "Camera work, transitions, pacing notes"
}

Be specific about visual elements you see. Include camera movements, lighting, mood, and transitions between scenes.`
  });

  // Add all frame images
  for (const frame of frames) {
    if (frame.imageUrl) {
      const base64 = await imageUrlToBase64(frame.imageUrl);
      parts.push({
        inlineData: {
          data: base64.replace(/^data:image\/\w+;base64,/, ""),
          mimeType: "image/png",
        },
      });
    }
  }

  const response = await ai.models.generateContent({
    model: "gemini-2.0-flash",
    contents: [{ role: "user", parts }],
  });

  try {
    const text = response.text?.trim() || "{}";
    const jsonStr = text.replace(/```json\n?|\n?```/g, '').trim();
    const result = JSON.parse(jsonStr);

    return {
      masterPrompt: result.masterPrompt || "Generate a smooth cinematic video sequence",
      framePrompts: result.framePrompts || frames.map(f => ({
        frameTitle: f.title,
        prompt: f.motionNotes || "Smooth transition",
        duration: f.durationMs / 1000,
      })),
      totalDuration: frames.reduce((acc, f) => acc + f.durationMs, 0) / 1000,
      technicalNotes: result.technicalNotes || `${style} style, ${frames.length} scenes`,
    };
  } catch (e) {
    console.error("Failed to parse video prompt response:", e);
    // Return fallback
    return {
      masterPrompt: `Create a ${style.toLowerCase()} video sequence with ${frames.length} scenes. Smooth transitions, consistent visual style.`,
      framePrompts: frames.map(f => ({
        frameTitle: f.title,
        prompt: f.motionNotes || "Smooth pan with gentle movement",
        duration: f.durationMs / 1000,
      })),
      totalDuration: frames.reduce((acc, f) => acc + f.durationMs, 0) / 1000,
      technicalNotes: `${style} style rendering with fluid transitions`,
    };
  }
}

/**
 * Generate video using Veo 3 via Gemini API
 * Supports text prompts and image conditioning from storyboard frames
 */
export async function generateVideoWithVeo(
  prompt: string,
  referenceImages?: string[], // Base64 images from polished frames
  config?: {
    duration?: number; // seconds (5-60)
    aspectRatio?: '16:9' | '9:16' | '1:1';
    style?: string;
  }
): Promise<{
  status: 'success' | 'processing' | 'error';
  videoUrl?: string;
  operationId?: string;
  message: string;
}> {
  if (!ai) {
    throw new Error("Google AI not configured. Add VITE_GEMINI_API_KEY to .env");
  }

  try {
    // Build the content parts
    const parts: Array<{ text: string } | { inlineData: { data: string; mimeType: string } }> = [];

    // Add the video generation prompt
    parts.push({
      text: `Generate a smooth, cinematic video based on this storyboard sequence:

${prompt}

Style: ${config?.style || 'Cinematic, professional quality'}
Duration: ${config?.duration || 10} seconds
Aspect Ratio: ${config?.aspectRatio || '16:9'}

Create fluid transitions between scenes. Maintain visual consistency throughout.`
    });

    // Add reference images from storyboard frames (image conditioning)
    if (referenceImages && referenceImages.length > 0) {
      for (const imageBase64 of referenceImages) {
        const cleanBase64 = imageBase64.replace(/^data:image\/\w+;base64,/, "");
        parts.push({
          inlineData: {
            data: cleanBase64,
            mimeType: "image/png",
          },
        });
      }
    }

    // Call Veo 3 via Gemini API
    // Note: The exact model name may vary - check Google AI Studio for current model ID
    const response = await ai.models.generateContent({
      model: "veo-3-fast", // or "veo-3.1-fast" - check AI Studio
      contents: [
        {
          role: "user",
          parts: parts,
        },
      ],
      config: {
        // Video generation config
        responseModalities: ["VIDEO"],
      },
    });

    // Extract video from response
    const responseParts = response.candidates?.[0]?.content?.parts;
    if (responseParts) {
      for (const part of responseParts) {
        // Check for video data
        if (part.inlineData?.mimeType?.startsWith('video/')) {
          // Return base64 video data URL
          return {
            status: 'success',
            videoUrl: `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`,
            message: 'Video generated successfully!',
          };
        }
        // Check for file URI (Google may return a hosted URL)
        if (part.fileData?.fileUri) {
          return {
            status: 'success',
            videoUrl: part.fileData.fileUri,
            message: 'Video generated successfully!',
          };
        }
      }
    }

    // Check for async operation (long video generation)
    if (response.candidates?.[0]?.content?.parts?.[0]?.text?.includes('operation')) {
      return {
        status: 'processing',
        message: 'Video generation started. This may take a few minutes.',
        operationId: response.candidates[0].content.parts[0].text,
      };
    }

    return {
      status: 'error',
      message: 'No video in response. The model may not support video generation yet.',
    };

  } catch (error) {
    console.error("Veo video generation error:", error);

    // Handle specific errors
    if (error instanceof Error) {
      if (error.message.includes('not found') || error.message.includes('invalid model')) {
        return {
          status: 'error',
          message: 'Veo model not available. Try veo-3-fast or check Google AI Studio for current model names.',
        };
      }
      if (error.message.includes('quota') || error.message.includes('rate')) {
        return {
          status: 'error',
          message: 'API quota exceeded. Try again later or check billing.',
        };
      }
    }

    return {
      status: 'error',
      message: error instanceof Error ? error.message : 'Video generation failed',
    };
  }
}

/**
 * Generate video from storyboard with full context
 * Combines prompt generation + Veo video generation
 */
export async function generateStoryboardVideo(
  frames: Array<{
    title: string;
    imageUrl: string;
    durationMs: number;
    motionNotes?: string;
    order: number;
  }>,
  style: 'Cinematic' | 'Animated' | 'Realistic' | 'Stylized'
): Promise<{
  status: 'success' | 'processing' | 'error';
  videoUrl?: string;
  prompt?: string;
  message: string;
}> {
  // Step 1: Generate the video prompt using Gemini
  const promptResult = await generateStoryboardVideoPrompt(frames, style);

  // Step 2: Collect reference images (first frame from each scene)
  const referenceImages: string[] = [];
  for (const frame of frames.slice(0, 4)) { // Limit to 4 reference images
    if (frame.imageUrl) {
      const base64 = await imageUrlToBase64(frame.imageUrl);
      referenceImages.push(base64);
    }
  }

  // Step 3: Generate video with Veo
  const totalDuration = frames.reduce((acc, f) => acc + f.durationMs, 0) / 1000;

  const videoResult = await generateVideoWithVeo(
    promptResult.masterPrompt,
    referenceImages,
    {
      duration: Math.min(Math.max(totalDuration, 5), 60), // Clamp 5-60s
      aspectRatio: '16:9',
      style: style,
    }
  );

  return {
    ...videoResult,
    prompt: promptResult.masterPrompt,
  };
}
