import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Play,
  Loader2,
  Link2,
  Sparkles,
  Copy,
  Check,
  ChevronDown,
  ChevronUp,
  Wand2,
  FileText,
  Film,
  Clapperboard,
  X,
  Sliders,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { generateStoryboardVideoPrompt } from "@/lib/googleAI";
import { generateVideoFromFrame } from "@/lib/videoGeneration";

interface Frame {
  id: string;
  title?: string;
  status: "sketch" | "polished";
  durationMs?: number;
  motionNotes?: string;
  thumbnail?: string;
  polishedDataUrl?: string;
  sketchDataUrl?: string;
}

interface AIPanelProps {
  selectedFrames: string[];
  frames: Frame[];
  onPolish: () => void;
  onAnimate: () => void;
  isPolishing?: boolean;
  hasPolishedFrames?: boolean;
  onDuplicate?: (frameId: string) => void;
  onDelete?: (frameId: string) => void;
  onDurationChange?: (frameId: string, durationMs: number) => void;
  onSelectFrame?: (frameId: string) => void;
  onPreview?: () => void;
}

type VideoStyle = "Cinematic" | "Animated" | "Realistic" | "Stylized";

interface GeneratedPrompt {
  masterPrompt: string;
  framePrompts: Array<{ frameTitle: string; prompt: string; duration: number }>;
  totalDuration: number;
  technicalNotes: string;
}

// Creative Director types
type Mood = "Epic" | "Whimsical" | "Tense" | "Romantic" | "Uplifting" | "Mysterious" | "Minimal";
type Pacing = "Slow" | "Medium" | "Fast";
type CameraLanguage = "Handheld" | "Locked-off" | "Dolly" | "Crane" | "Drone" | "Steadicam";
type Lens = "14mm wide" | "24mm" | "35mm" | "50mm" | "85mm portrait";
type Lighting = "Soft key" | "High contrast" | "Neon night" | "Golden hour" | "Studio clean";
type ColorGrade = "Teal & orange" | "Pastel" | "Monochrome" | "Film grain" | "Vibrant";

interface CreativeDirectorSettings {
  mood: Mood | null;
  pacing: Pacing;
  camera: CameraLanguage | null;
  lens: Lens | null;
  lighting: Lighting | null;
  colorGrade: ColorGrade | null;
  motionIntensity: number;
  continuityStrictness: number;
  noGoList: string[];
}

type DirectorOutputTab = "treatment" | "shotlist" | "prompt";

const DEFAULT_DIRECTOR_SETTINGS: CreativeDirectorSettings = {
  mood: null,
  pacing: "Medium",
  camera: null,
  lens: null,
  lighting: null,
  colorGrade: null,
  motionIntensity: 50,
  continuityStrictness: 70,
  noGoList: [],
};

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function safeSetSession(key: string, value: string) {
  try {
    sessionStorage.setItem(key, value);
  } catch {
    // Quota or disabled storage; fail silently (we still show prompt in UI)
  }
}

function getFrameImageUrl(f: Frame): string | null {
  return f.polishedDataUrl || f.thumbnail || f.sketchDataUrl || null;
}

async function toBase64DataUrl(imageUrl: string, timeoutMs = 15000): Promise<string> {
  if (imageUrl.startsWith("data:")) return imageUrl;

  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(imageUrl, { signal: controller.signal });
    if (!res.ok) throw new Error(`Image fetch failed (${res.status})`);

    const blob = await res.blob();
    return await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = () => reject(new Error("Failed to read image as base64"));
      reader.onloadend = () => resolve(reader.result as string);
      reader.readAsDataURL(blob);
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown error converting image to base64";
    throw new Error(`Could not access frame image. If this is a remote URL, it may be blocked by CORS. (${msg})`);
  } finally {
    clearTimeout(t);
  }
}

// Build director guidance string for Veo prompt enhancement
function buildDirectorGuidance(frames: Frame[], settings: CreativeDirectorSettings): string {
  const lines: string[] = ["DIRECTOR GUIDANCE:"];

  if (settings.mood) lines.push(`Mood: ${settings.mood} — evoke this emotional tone throughout.`);
  lines.push(`Pacing: ${settings.pacing} — ${settings.pacing === "Slow" ? "languid, contemplative rhythm" : settings.pacing === "Fast" ? "energetic, quick cuts" : "balanced, natural flow"}.`);
  if (settings.camera) lines.push(`Camera: ${settings.camera} movement style.`);
  if (settings.lens) lines.push(`Lens: ${settings.lens} perspective and depth of field.`);
  if (settings.lighting) lines.push(`Lighting: ${settings.lighting} aesthetic.`);
  if (settings.colorGrade) lines.push(`Color grade: ${settings.colorGrade} look.`);

  const motionLabel = settings.motionIntensity < 33 ? "subtle" : settings.motionIntensity > 66 ? "dynamic" : "moderate";
  lines.push(`Motion intensity: ${motionLabel} (${settings.motionIntensity}%).`);

  const continuityLabel = settings.continuityStrictness < 33 ? "loose" : settings.continuityStrictness > 66 ? "strict" : "balanced";
  lines.push(`Continuity: ${continuityLabel} — ${settings.continuityStrictness > 50 ? "maintain consistent character appearance, preserve scene composition, no new objects unless story-implied" : "allow creative interpretation between shots"}.`);

  if (settings.noGoList.length > 0) {
    lines.push(`Avoid: ${settings.noGoList.join(", ")}.`);
  }

  lines.push("Rules: Keep visual consistency across all frames. Smooth transitions. No jarring cuts unless intentional.");

  return lines.join("\n");
}

// Generate director's treatment (deterministic, no API call)
function generateTreatment(frames: Frame[], settings: CreativeDirectorSettings): string {
  if (frames.length === 0) return "";

  const totalDuration = frames.reduce((acc, f) => acc + (f.durationMs || 2000), 0) / 1000;
  const frameTitles = frames.map((f, i) => f.title || `Frame ${i + 1}`);

  const moodDesc = settings.mood
    ? {
        Epic: "sweeping grandeur and heroic undertones",
        Whimsical: "playful charm and lighthearted energy",
        Tense: "building suspense and edge-of-seat anticipation",
        Romantic: "intimate warmth and emotional connection",
        Uplifting: "inspiring hope and positive momentum",
        Mysterious: "enigmatic atmosphere and intrigue",
        Minimal: "elegant restraint and purposeful simplicity",
      }[settings.mood]
    : "a carefully crafted emotional journey";

  const cameraDesc = settings.camera
    ? {
        Handheld: "intimate, documentary-style camera work that puts the viewer in the scene",
        "Locked-off": "composed, architectural framing with deliberate stillness",
        Dolly: "graceful lateral movements that guide the eye through space",
        Crane: "sweeping vertical reveals that establish scale and grandeur",
        Drone: "expansive aerial perspectives that contextualize the narrative",
        Steadicam: "fluid, floating movement that follows action seamlessly",
      }[settings.camera]
    : "purposeful camera movement that serves the story";

  const treatment = `
DIRECTOR'S TREATMENT
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

PROJECT OVERVIEW
This ${totalDuration.toFixed(1)}-second piece unfolds across ${frames.length} carefully composed shots, delivering ${moodDesc}.

VISUAL APPROACH
The cinematography employs ${cameraDesc}. ${settings.lens ? `Shot primarily on ${settings.lens} to achieve the desired depth and perspective.` : "Lens choices serve each moment's emotional needs."}

${settings.lighting ? `LIGHTING DIRECTION\nThe piece is lit with a ${settings.lighting} approach, creating visual cohesion across all frames.` : ""}

${settings.colorGrade ? `COLOR PHILOSOPHY\nA ${settings.colorGrade} grade unifies the visual language, reinforcing the ${settings.mood || "intended"} tone.` : ""}

NARRATIVE ARC
${frameTitles.map((title, i) => `${i + 1}. "${title}" — ${i === 0 ? "establishes the visual world" : i === frameTitles.length - 1 ? "delivers the emotional resolution" : "develops the visual narrative"}`).join("\n")}

PACING & RHYTHM
The edit follows a ${settings.pacing.toLowerCase()} rhythm, ${settings.pacing === "Slow" ? "allowing moments to breathe and resonate" : settings.pacing === "Fast" ? "maintaining energetic momentum throughout" : "balancing contemplation with forward motion"}.

${settings.motionIntensity > 50 ? `MOTION PHILOSOPHY\nDynamic camera movement (${settings.motionIntensity}% intensity) creates kinetic energy while maintaining visual clarity.` : settings.motionIntensity < 50 ? `MOTION PHILOSOPHY\nSubtle, restrained movement (${settings.motionIntensity}% intensity) allows composition and performance to carry the scene.` : ""}

CONTINUITY NOTES
${settings.continuityStrictness > 50 ? "Strict continuity rules apply: character appearance, props, and environmental details must remain consistent across all shots. No elements should appear or disappear without narrative justification." : "Creative continuity allows for interpretive visual connections between shots while maintaining overall coherence."}

${settings.noGoList.length > 0 ? `RESTRICTIONS\nThe following are explicitly prohibited: ${settings.noGoList.join(", ")}.` : ""}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
"Make it feel directed, not generated."
  `.trim();

  return treatment;
}

// Generate shot list (deterministic, no API call)
function generateShotList(frames: Frame[], settings: CreativeDirectorSettings): string {
  if (frames.length === 0) return "";

  const cameraMovements: Record<CameraLanguage, string[]> = {
    Handheld: ["follows action", "subtle drift", "reactive movement", "organic sway"],
    "Locked-off": ["static hold", "tripod-mounted", "architectural frame", "stable composition"],
    Dolly: ["push in", "pull back", "lateral track", "arc around subject"],
    Crane: ["rise up", "descend", "sweeping reveal", "overhead to eye-level"],
    Drone: ["ascending wide", "flyover", "orbit", "reveal pull-back"],
    Steadicam: ["follow shot", "walk-and-talk", "fluid approach", "360° orbit"],
  };

  const lensFraming: Record<Lens, string> = {
    "14mm wide": "ultra-wide establishing",
    "24mm": "wide environmental",
    "35mm": "natural perspective",
    "50mm": "standard clean",
    "85mm portrait": "compressed intimate",
  };

  const shotList = frames.map((frame, i) => {
    const title = frame.title || `Frame ${i + 1}`;
    const duration = ((frame.durationMs || 2000) / 1000).toFixed(1);
    const camera = settings.camera || "Steadicam";
    const movements = cameraMovements[camera];
    const movement = movements[i % movements.length];
    const lens = settings.lens || "35mm";
    const framing = lensFraming[lens as Lens] || "natural";
    const lighting = settings.lighting || "natural";
    const motionNotes = frame.motionNotes || "";

    return `
SHOT ${String(i + 1).padStart(2, "0")} — "${title}"
┌─────────────────────────────────────────
│ Duration:    ${duration}s
│ Camera:      ${camera}, ${movement}
│ Lens:        ${lens} (${framing} framing)
│ Lighting:    ${lighting}
│ Motion:      ${motionNotes || `${settings.motionIntensity > 50 ? "Dynamic" : "Subtle"} movement`}
└─────────────────────────────────────────`;
  });

  const header = `
SHOT LIST
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Total Shots: ${frames.length}
Total Duration: ${(frames.reduce((acc, f) => acc + (f.durationMs || 2000), 0) / 1000).toFixed(1)}s
Camera Style: ${settings.camera || "Director's choice"}
Visual Grade: ${settings.colorGrade || "Natural"}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
"Shot list aligned to your storyboard."
  `.trim();

  return header + "\n" + shotList.join("\n");
}

// Generate enhanced master prompt (deterministic, no API call)
function generateEnhancedPrompt(frames: Frame[], settings: CreativeDirectorSettings, existingPrompt?: string): string {
  const basePrompt = existingPrompt || frames.map((f, i) => f.title || `Scene ${i + 1}`).join(", then ");

  const guidance = buildDirectorGuidance(frames, settings);

  return `${basePrompt}\n\n${guidance}`;
}

export function AIPanel({
  selectedFrames,
  frames,
  onAnimate,
  onDurationChange,
  onSelectFrame,
  onPreview,
}: AIPanelProps) {
  const navigate = useNavigate();
  const { boardId } = useParams();

  // Generation state
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationStep, setGenerationStep] = useState<
    "idle" | "analyzing" | "prompting" | "generating" | "complete"
  >("idle");
  const [generationProgress, setGenerationProgress] = useState(0);
  const [selectedStyle, setSelectedStyle] = useState<VideoStyle>("Cinematic");

  // Generated prompt state
  const [generatedPrompt, setGeneratedPrompt] = useState<GeneratedPrompt | null>(null);
  const [showPromptDetails, setShowPromptDetails] = useState(false);
  const [promptCopied, setPromptCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Creative Director state
  const [showDirector, setShowDirector] = useState(false);
  const [directorSettings, setDirectorSettings] = useState<CreativeDirectorSettings>(DEFAULT_DIRECTOR_SETTINGS);
  const [directorEnabled, setDirectorEnabled] = useState(false);
  const [noGoInput, setNoGoInput] = useState("");
  const [directorOutputTab, setDirectorOutputTab] = useState<DirectorOutputTab>("treatment");
  const [directorOutputs, setDirectorOutputs] = useState<{
    treatment: string;
    shotlist: string;
    prompt: string;
  }>({ treatment: "", shotlist: "", prompt: "" });
  const [showDirectorOutputs, setShowDirectorOutputs] = useState(false);
  const [directorCopied, setDirectorCopied] = useState(false);

  // Run-safety
  const runIdRef = useRef<string | null>(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const polishedCount = useMemo(
    () => frames.filter((f) => f.status === "polished").length,
    [frames]
  );
  const totalFrames = frames.length;

  const totalDuration = useMemo(() => {
    return frames.reduce((acc, f) => acc + (f.durationMs || 2000), 0) / 1000;
  }, [frames]);

  const selectedFrame = useMemo(() => {
    return selectedFrames.length === 1
      ? frames.find((f) => f.id === selectedFrames[0]) || null
      : null;
  }, [selectedFrames, frames]);

  const frameImageStats = useMemo(() => {
    const missingImage = frames.filter((f) => !getFrameImageUrl(f)).length;
    const unpolished = frames.filter((f) => f.status !== "polished").length;
    return { missingImage, unpolished };
  }, [frames]);

  const durationTooShort = totalDuration < 5;
  const durationTooLong = totalDuration > 60;

  const canGenerate =
    totalFrames > 0 &&
    !isGenerating &&
    frameImageStats.unpolished === 0 &&
    frameImageStats.missingImage === 0;

  useEffect(() => {
    if (!generatedPrompt || generationStep !== "complete") return;

    const currentDuration =
      frames.reduce((acc, f) => acc + (f.durationMs || 2000), 0) / 1000;

    const durationDrift = Math.abs(currentDuration - generatedPrompt.totalDuration);
    if (durationDrift > 0.5) {
      setGeneratedPrompt(null);
      setGenerationStep("idle");
      setShowPromptDetails(false);
    }
  }, [frames, generatedPrompt, generationStep]);

  const setProgressSafe = useCallback((p: number) => {
    if (!mountedRef.current) return;
    setGenerationProgress(Math.round(clamp(p, 0, 100)));
  }, []);

  // Director output handlers
  const handleGenerateTreatment = () => {
    const treatment = generateTreatment(frames, directorSettings);
    setDirectorOutputs((prev) => ({ ...prev, treatment }));
    setDirectorOutputTab("treatment");
    setShowDirectorOutputs(true);
  };

  const handleGenerateShotList = () => {
    const shotlist = generateShotList(frames, directorSettings);
    setDirectorOutputs((prev) => ({ ...prev, shotlist }));
    setDirectorOutputTab("shotlist");
    setShowDirectorOutputs(true);
  };

  const handleRewritePrompt = () => {
    const prompt = generateEnhancedPrompt(
      frames,
      directorSettings,
      generatedPrompt?.masterPrompt
    );
    setDirectorOutputs((prev) => ({ ...prev, prompt }));
    setDirectorOutputTab("prompt");
    setShowDirectorOutputs(true);
  };

  const handleCopyDirectorOutput = async () => {
    const content = directorOutputs[directorOutputTab];
    if (!content) return;

    try {
      await navigator.clipboard.writeText(content);
      setDirectorCopied(true);
      setTimeout(() => setDirectorCopied(false), 2000);
    } catch {
      setError("Clipboard blocked. Select and copy manually.");
    }
  };

  const handleAddNoGo = () => {
    const trimmed = noGoInput.trim();
    if (trimmed && !directorSettings.noGoList.includes(trimmed)) {
      setDirectorSettings((prev) => ({
        ...prev,
        noGoList: [...prev.noGoList, trimmed],
      }));
      setNoGoInput("");
    }
  };

  const handleRemoveNoGo = (item: string) => {
    setDirectorSettings((prev) => ({
      ...prev,
      noGoList: prev.noGoList.filter((x) => x !== item),
    }));
  };

  const handleGenerateVideo = async () => {
    if (!canGenerate) return;

    const runId =
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(16).slice(2)}`;

    runIdRef.current = runId;

    setIsGenerating(true);
    setError(null);
    setProgressSafe(0);
    setGenerationStep("analyzing");

    try {
      setProgressSafe(10);

      const orderedFrames = frames
        .map((f, index) => ({
          title: f.title || `Frame ${index + 1}`,
          imageUrl: getFrameImageUrl(f) || "",
          durationMs: f.durationMs || 2000,
          motionNotes: f.motionNotes,
          order: index,
        }))
        .filter((f) => !!f.imageUrl);

      if (orderedFrames.length === 0) {
        throw new Error("No frame images available (missing thumbnails/polished/sketch images)");
      }

      const firstFrame = orderedFrames[0];
      if (!firstFrame?.imageUrl) throw new Error("First frame has no usable image URL");

      setProgressSafe(20);
      setGenerationStep("prompting");

      const promptResult = await generateStoryboardVideoPrompt(orderedFrames, selectedStyle);

      if (runIdRef.current !== runId || !mountedRef.current) return;

      setGeneratedPrompt(promptResult);
      setProgressSafe(40);
      setGenerationStep("generating");

      const imageBase64 = await toBase64DataUrl(firstFrame.imageUrl);

      if (runIdRef.current !== runId || !mountedRef.current) return;

      const requestedSecondsRaw = Math.round((firstFrame.durationMs || 2000) / 1000);
      const requestedSeconds = clamp(requestedSecondsRaw, 5, 60);

      // Build the final Veo prompt - enhance with director guidance if enabled
      const basePrompt = promptResult?.masterPrompt || "Animate this scene with smooth motion";
      const veoPrompt = directorEnabled
        ? `${basePrompt}\n\n${buildDirectorGuidance(frames, directorSettings)}`
        : basePrompt;

      const videoResult = await generateVideoFromFrame(
        veoPrompt,
        imageBase64,
        requestedSeconds,
        (progress, status) => {
          const scaled = 40 + clamp(progress, 0, 100) * 0.6;
          setProgressSafe(scaled);
          console.log(`[Video Gen] ${status}: ${progress}%`);
        }
      );

      if (runIdRef.current !== runId || !mountedRef.current) return;

      setProgressSafe(100);
      safeSetSession("generatedVideoPrompt", veoPrompt);
      setGenerationStep("complete");

      if (videoResult?.status === "done" && videoResult.videoUrl) {
        safeSetSession("generatedVideoUrl", videoResult.videoUrl);
        onAnimate();

        setTimeout(() => {
          if (!mountedRef.current) return;
          navigate(`/export/${boardId}`);
        }, 1200);
        return;
      }

      if (videoResult?.status === "error") {
        setError(videoResult.error || "Video generation failed");
        return;
      }

      console.warn("Video generation returned unexpected result:", videoResult);
      setTimeout(() => {
        if (!mountedRef.current) return;
        navigate(`/export/${boardId}`);
      }, 1200);
    } catch (err) {
      console.error("Generation failed:", err);
      if (!mountedRef.current) return;
      setError(err instanceof Error ? err.message : "Generation failed");
      setGenerationStep("idle");
    } finally {
      if (!mountedRef.current) return;
      setIsGenerating(false);
    }
  };

  const handleCopyPrompt = async () => {
    if (!generatedPrompt) return;

    const fullPrompt = `MASTER PROMPT:\n${generatedPrompt.masterPrompt}\n\nFRAME PROMPTS:\n${generatedPrompt.framePrompts
      .map((fp, i) => `${i + 1}. ${fp.frameTitle} (${fp.duration}s):\n${fp.prompt}`)
      .join("\n\n")}\n\nTECHNICAL NOTES:\n${generatedPrompt.technicalNotes}`;

    try {
      await navigator.clipboard.writeText(fullPrompt);
      setPromptCopied(true);
      setTimeout(() => setPromptCopied(false), 2000);
    } catch {
      setError("Clipboard blocked. Copy manually from the prompt panel.");
      setShowPromptDetails(true);
    }
  };

  const handleExportToPDF = () => {
    navigate(`/export/${boardId}`);
  };

  const styles: VideoStyle[] = ["Cinematic", "Animated", "Realistic", "Stylized"];
  const moods: Mood[] = ["Epic", "Whimsical", "Tense", "Romantic", "Uplifting", "Mysterious", "Minimal"];
  const pacings: Pacing[] = ["Slow", "Medium", "Fast"];
  const cameras: CameraLanguage[] = ["Handheld", "Locked-off", "Dolly", "Crane", "Drone", "Steadicam"];
  const lenses: Lens[] = ["14mm wide", "24mm", "35mm", "50mm", "85mm portrait"];
  const lightings: Lighting[] = ["Soft key", "High contrast", "Neon night", "Golden hour", "Studio clean"];
  const colorGrades: ColorGrade[] = ["Teal & orange", "Pastel", "Monochrome", "Film grain", "Vibrant"];

  const getStepLabel = () => {
    switch (generationStep) {
      case "analyzing":
        return "Analyzing frames...";
      case "prompting":
        return "Crafting video prompt...";
      case "generating":
        return "Generating video...";
      case "complete":
        return "Ready!";
      default:
        return "";
    }
  };

  const framesNotReadyWarning =
    totalFrames === 0
      ? null
      : frameImageStats.unpolished > 0
      ? `Polish ${frameImageStats.unpolished} frame${frameImageStats.unpolished > 1 ? "s" : ""} first`
      : frameImageStats.missingImage > 0
      ? `Missing images for ${frameImageStats.missingImage} frame${frameImageStats.missingImage > 1 ? "s" : ""}`
      : null;

  // Compact select component
  const CompactSelect = ({
    value,
    options,
    onChange,
    placeholder,
  }: {
    value: string | null;
    options: string[];
    onChange: (v: string | null) => void;
    placeholder: string;
  }) => (
    <select
      value={value || ""}
      onChange={(e) => onChange(e.target.value || null)}
      className="w-full bg-white/5 border border-white/10 rounded-lg px-2 py-1.5 text-[10px] text-white/80 focus:outline-none focus:border-purple-500/50 appearance-none cursor-pointer"
      style={{ backgroundImage: "url(\"data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e\")", backgroundPosition: "right 4px center", backgroundRepeat: "no-repeat", backgroundSize: "16px" }}
    >
      <option value="" className="bg-[#1a1a2e]">{placeholder}</option>
      {options.map((opt) => (
        <option key={opt} value={opt} className="bg-[#1a1a2e]">{opt}</option>
      ))}
    </select>
  );

  return (
    <div className="fixed right-4 top-20 bottom-4 w-72 z-40 bg-[#0f0f1a]/90 backdrop-blur-xl border border-white/[0.08] rounded-2xl shadow-[0_8px_32px_rgba(0,0,0,0.4)] overflow-hidden flex flex-col">
      <div className="flex-1 overflow-y-auto">
        {/* Sequence Strip */}
        <div className="p-4 border-b border-white/10">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-medium text-white/70">Sequence</span>
            <div className="flex items-center gap-2">
              <button
                onClick={onPreview}
                disabled={totalFrames === 0}
                className="p-1 hover:bg-white/10 rounded transition-colors disabled:opacity-30"
              >
                <Play className="w-4 h-4 text-white/70" />
              </button>
              <span className="text-xs font-mono text-white/50">
                {totalDuration.toFixed(1)}s
              </span>
            </div>
          </div>

          {totalFrames > 0 ? (
            <>
              <div className="flex gap-1.5 overflow-x-auto pb-1">
                {frames.map((frame) => (
                  <button
                    key={frame.id}
                    onClick={() => onSelectFrame?.(frame.id)}
                    className={cn(
                      "flex-shrink-0 w-14 h-10 rounded-md border transition-all relative overflow-hidden",
                      selectedFrames.includes(frame.id)
                        ? "border-pink-500 ring-1 ring-pink-500/30"
                        : "border-white/10 hover:border-white/20"
                    )}
                  >
                    {getFrameImageUrl(frame) ? (
                      <img
                        src={getFrameImageUrl(frame)!}
                        className="w-full h-full object-cover"
                        alt=""
                      />
                    ) : (
                      <div className="w-full h-full bg-white/5" />
                    )}
                    <div
                      className={cn(
                        "absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full",
                        frame.status === "polished" ? "bg-emerald-400" : "bg-white/20"
                      )}
                    />
                  </button>
                ))}
              </div>

              <p className="text-[10px] text-white/40 mt-2">
                {polishedCount}/{totalFrames} polished
              </p>

              {(durationTooShort || durationTooLong) && (
                <p className="text-[10px] text-amber-400/70 mt-2">
                  {durationTooShort
                    ? "Total duration is under 5s (Veo may reject)."
                    : "Total duration exceeds 60s (will be clamped)."}
                </p>
              )}
            </>
          ) : (
            <div className="h-12 rounded-md border border-dashed border-white/10 flex items-center justify-center">
              <span className="text-[10px] text-white/30">Add frames to canvas</span>
            </div>
          )}
        </div>

        {/* AI Creative Director */}
        <div className="border-b border-white/10">
          <button
            onClick={() => setShowDirector(!showDirector)}
            className="w-full p-4 flex items-center justify-between hover:bg-white/[0.02] transition-colors"
          >
            <div className="flex items-center gap-2">
              <Clapperboard className="w-4 h-4 text-purple-400" />
              <span className="text-xs font-medium text-white/70">AI Creative Director</span>
              <span className="text-[9px] px-1.5 py-0.5 rounded bg-gradient-to-r from-purple-500/20 to-pink-500/20 text-purple-300 font-medium border border-purple-500/20">
                Pro
              </span>
            </div>
            {showDirector ? (
              <ChevronUp className="w-4 h-4 text-white/40" />
            ) : (
              <ChevronDown className="w-4 h-4 text-white/40" />
            )}
          </button>

          <AnimatePresence>
            {showDirector && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden"
              >
                <div className="px-4 pb-4 space-y-3">
                  {/* Enable toggle */}
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-white/50">Apply to generation</span>
                    <button
                      onClick={() => setDirectorEnabled(!directorEnabled)}
                      className={cn(
                        "w-8 h-4 rounded-full transition-all relative",
                        directorEnabled ? "bg-purple-500" : "bg-white/10"
                      )}
                    >
                      <div
                        className={cn(
                          "absolute top-0.5 w-3 h-3 rounded-full bg-white transition-all",
                          directorEnabled ? "left-4.5" : "left-0.5"
                        )}
                        style={{ left: directorEnabled ? "calc(100% - 14px)" : "2px" }}
                      />
                    </button>
                  </div>

                  <p className="text-[9px] text-white/30 italic">
                    "Make it feel directed, not generated."
                  </p>

                  {/* Directing Controls */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-1.5 mb-2">
                      <Sliders className="w-3 h-3 text-white/40" />
                      <span className="text-[10px] text-white/50 uppercase tracking-wider">Directing Controls</span>
                    </div>

                    {/* Mood */}
                    <div>
                      <label className="text-[9px] text-white/40 mb-1 block">Mood</label>
                      <CompactSelect
                        value={directorSettings.mood}
                        options={moods}
                        onChange={(v) => setDirectorSettings((s) => ({ ...s, mood: v as Mood | null }))}
                        placeholder="Select mood..."
                      />
                    </div>

                    {/* Pacing - Segmented */}
                    <div>
                      <label className="text-[9px] text-white/40 mb-1 block">Pacing</label>
                      <div className="flex gap-1">
                        {pacings.map((p) => (
                          <button
                            key={p}
                            onClick={() => setDirectorSettings((s) => ({ ...s, pacing: p }))}
                            className={cn(
                              "flex-1 py-1 text-[10px] rounded-md transition-all",
                              directorSettings.pacing === p
                                ? "bg-purple-500/20 text-purple-300 border border-purple-500/30"
                                : "bg-white/5 text-white/50 border border-transparent hover:bg-white/10"
                            )}
                          >
                            {p}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Camera */}
                    <div>
                      <label className="text-[9px] text-white/40 mb-1 block">Camera</label>
                      <CompactSelect
                        value={directorSettings.camera}
                        options={cameras}
                        onChange={(v) => setDirectorSettings((s) => ({ ...s, camera: v as CameraLanguage | null }))}
                        placeholder="Camera style..."
                      />
                    </div>

                    {/* Lens */}
                    <div>
                      <label className="text-[9px] text-white/40 mb-1 block">Lens</label>
                      <CompactSelect
                        value={directorSettings.lens}
                        options={lenses}
                        onChange={(v) => setDirectorSettings((s) => ({ ...s, lens: v as Lens | null }))}
                        placeholder="Lens choice..."
                      />
                    </div>

                    {/* Lighting */}
                    <div>
                      <label className="text-[9px] text-white/40 mb-1 block">Lighting</label>
                      <CompactSelect
                        value={directorSettings.lighting}
                        options={lightings}
                        onChange={(v) => setDirectorSettings((s) => ({ ...s, lighting: v as Lighting | null }))}
                        placeholder="Lighting style..."
                      />
                    </div>

                    {/* Color Grade */}
                    <div>
                      <label className="text-[9px] text-white/40 mb-1 block">Color Grade</label>
                      <CompactSelect
                        value={directorSettings.colorGrade}
                        options={colorGrades}
                        onChange={(v) => setDirectorSettings((s) => ({ ...s, colorGrade: v as ColorGrade | null }))}
                        placeholder="Color look..."
                      />
                    </div>

                    {/* Motion Intensity Slider */}
                    <div>
                      <div className="flex justify-between mb-1">
                        <label className="text-[9px] text-white/40">Motion Intensity</label>
                        <span className="text-[9px] text-white/50 font-mono">{directorSettings.motionIntensity}%</span>
                      </div>
                      <input
                        type="range"
                        min={0}
                        max={100}
                        value={directorSettings.motionIntensity}
                        onChange={(e) => setDirectorSettings((s) => ({ ...s, motionIntensity: Number(e.target.value) }))}
                        className="w-full h-1 bg-white/10 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-2.5 [&::-webkit-slider-thumb]:h-2.5 [&::-webkit-slider-thumb]:bg-purple-400 [&::-webkit-slider-thumb]:rounded-full"
                      />
                      <div className="flex justify-between text-[8px] text-white/30 mt-0.5">
                        <span>Subtle</span>
                        <span>Dynamic</span>
                      </div>
                    </div>

                    {/* Continuity Strictness Slider */}
                    <div>
                      <div className="flex justify-between mb-1">
                        <label className="text-[9px] text-white/40">Continuity</label>
                        <span className="text-[9px] text-white/50 font-mono">{directorSettings.continuityStrictness}%</span>
                      </div>
                      <input
                        type="range"
                        min={0}
                        max={100}
                        value={directorSettings.continuityStrictness}
                        onChange={(e) => setDirectorSettings((s) => ({ ...s, continuityStrictness: Number(e.target.value) }))}
                        className="w-full h-1 bg-white/10 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-2.5 [&::-webkit-slider-thumb]:h-2.5 [&::-webkit-slider-thumb]:bg-purple-400 [&::-webkit-slider-thumb]:rounded-full"
                      />
                      <div className="flex justify-between text-[8px] text-white/30 mt-0.5">
                        <span>Loose</span>
                        <span>Strict</span>
                      </div>
                      <p className="text-[8px] text-white/25 mt-1 italic">Consistency rules prevent AI drift.</p>
                    </div>

                    {/* No-Go List */}
                    <div>
                      <label className="text-[9px] text-white/40 mb-1 block">Avoid List</label>
                      <div className="flex gap-1">
                        <input
                          type="text"
                          value={noGoInput}
                          onChange={(e) => setNoGoInput(e.target.value)}
                          onKeyDown={(e) => e.key === "Enter" && handleAddNoGo()}
                          placeholder="e.g. camera shake"
                          className="flex-1 bg-white/5 border border-white/10 rounded-lg px-2 py-1 text-[10px] text-white/80 placeholder:text-white/30 focus:outline-none focus:border-purple-500/50"
                        />
                        <button
                          onClick={handleAddNoGo}
                          className="px-2 py-1 bg-white/5 hover:bg-white/10 rounded-lg text-[10px] text-white/60 transition-colors"
                        >
                          Add
                        </button>
                      </div>
                      {directorSettings.noGoList.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {directorSettings.noGoList.map((item) => (
                            <span
                              key={item}
                              className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-red-500/10 text-red-300 text-[9px] rounded-md border border-red-500/20"
                            >
                              {item}
                              <button
                                onClick={() => handleRemoveNoGo(item)}
                                className="hover:text-red-200 transition-colors"
                              >
                                <X className="w-2.5 h-2.5" />
                              </button>
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Director Output Buttons */}
                  <div className="pt-2 border-t border-white/5 space-y-2">
                    <div className="flex items-center gap-1.5 mb-2">
                      <Film className="w-3 h-3 text-white/40" />
                      <span className="text-[10px] text-white/50 uppercase tracking-wider">Director Outputs</span>
                    </div>

                    <button
                      onClick={handleGenerateTreatment}
                      disabled={totalFrames === 0}
                      className="w-full py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-[10px] text-white/70 transition-all disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center gap-1.5"
                    >
                      <FileText className="w-3 h-3" />
                      Generate Director's Treatment
                    </button>

                    <button
                      onClick={handleGenerateShotList}
                      disabled={totalFrames === 0}
                      className="w-full py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-[10px] text-white/70 transition-all disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center gap-1.5"
                    >
                      <Clapperboard className="w-3 h-3" />
                      Generate Shot List
                    </button>

                    <button
                      onClick={handleRewritePrompt}
                      disabled={totalFrames === 0}
                      className="w-full py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-[10px] text-white/70 transition-all disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center gap-1.5"
                    >
                      <Wand2 className="w-3 h-3" />
                      Rewrite Master Prompt
                    </button>

                    {totalFrames === 0 && (
                      <p className="text-[8px] text-white/30 text-center">Add frames to enable outputs</p>
                    )}
                  </div>

                  {/* Director Notes Panel */}
                  <AnimatePresence>
                    {showDirectorOutputs && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        className="pt-2 border-t border-white/5"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-[10px] text-white/50">Director Notes</span>
                          <button
                            onClick={() => setShowDirectorOutputs(false)}
                            className="p-0.5 hover:bg-white/10 rounded transition-colors"
                          >
                            <X className="w-3 h-3 text-white/40" />
                          </button>
                        </div>

                        {/* Tabs */}
                        <div className="flex gap-1 mb-2">
                          {(["treatment", "shotlist", "prompt"] as const).map((tab) => (
                            <button
                              key={tab}
                              onClick={() => setDirectorOutputTab(tab)}
                              className={cn(
                                "flex-1 py-1 text-[9px] rounded-md transition-all capitalize",
                                directorOutputTab === tab
                                  ? "bg-purple-500/20 text-purple-300"
                                  : "bg-white/5 text-white/40 hover:text-white/60"
                              )}
                            >
                              {tab === "shotlist" ? "Shot List" : tab}
                            </button>
                          ))}
                        </div>

                        {/* Content */}
                        <div className="bg-white/5 rounded-lg p-2 max-h-32 overflow-y-auto">
                          <pre className="text-[9px] text-white/70 whitespace-pre-wrap font-mono leading-relaxed">
                            {directorOutputs[directorOutputTab] || "Generate content above..."}
                          </pre>
                        </div>

                        {/* Copy button */}
                        <button
                          onClick={handleCopyDirectorOutput}
                          disabled={!directorOutputs[directorOutputTab]}
                          className="w-full mt-2 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-[10px] text-white/70 transition-all disabled:opacity-30 flex items-center justify-center gap-1.5"
                        >
                          {directorCopied ? (
                            <>
                              <Check className="w-3 h-3 text-emerald-400" />
                              Copied!
                            </>
                          ) : (
                            <>
                              <Copy className="w-3 h-3" />
                              Copy
                            </>
                          )}
                        </button>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Video Generation */}
        <div className="p-4 border-b border-white/10">
          <div className="flex items-center gap-2 mb-3">
            <Wand2 className="w-4 h-4 text-pink-400" />
            <span className="text-xs font-medium text-white/70">Generate Video</span>
            {directorEnabled && (
              <span className="text-[8px] px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-300 border border-purple-500/20">
                +Director
              </span>
            )}
          </div>

          <div className="grid grid-cols-2 gap-1.5 mb-4">
            {styles.map((style) => (
              <button
                key={style}
                onClick={() => setSelectedStyle(style)}
                disabled={isGenerating}
                className={cn(
                  "py-1.5 px-2 rounded-lg text-xs font-medium transition-all",
                  selectedStyle === style
                    ? "bg-pink-500/20 text-pink-300 border border-pink-500/30"
                    : "bg-white/5 text-white/50 border border-transparent hover:text-white/70 hover:bg-white/10",
                  isGenerating && "opacity-50 cursor-not-allowed"
                )}
              >
                {style}
              </button>
            ))}
          </div>

          <AnimatePresence>
            {isGenerating && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="mb-4"
              >
                <div className="flex justify-between text-[10px] mb-1.5">
                  <span className="text-white/50">{getStepLabel()}</span>
                  <span className="text-white/70 font-mono">{generationProgress}%</span>
                </div>
                <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                  <motion.div
                    className="h-full bg-gradient-to-r from-pink-500 to-rose-500"
                    initial={{ width: 0 }}
                    animate={{ width: `${generationProgress}%` }}
                    transition={{ ease: "easeOut" }}
                  />
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <button
            onClick={handleGenerateVideo}
            disabled={!canGenerate}
            className={cn(
              "w-full py-2.5 rounded-xl font-medium text-sm transition-all flex items-center justify-center gap-2",
              canGenerate
                ? "bg-gradient-to-r from-pink-500 to-rose-500 text-white hover:shadow-[0_4px_20px_rgba(236,72,153,0.3)] hover:scale-[1.02] active:scale-[0.98]"
                : "bg-white/5 text-white/30 cursor-not-allowed"
            )}
          >
            {isGenerating ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Generating...
              </>
            ) : generationStep === "complete" ? (
              <>
                <Check className="w-4 h-4" />
                Regenerate
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                Generate Video
              </>
            )}
          </button>

          <p className="text-[10px] text-white/40 text-center mt-2">
            Powered by Gemini + Veo 3
          </p>

          {error && <p className="text-[10px] text-red-400 text-center mt-2">{error}</p>}

          {framesNotReadyWarning && !isGenerating && (
            <p className="text-[10px] text-amber-400/70 text-center mt-2">
              {framesNotReadyWarning}
            </p>
          )}
        </div>

        {/* Generated Prompt */}
        <AnimatePresence>
          {generatedPrompt && generationStep === "complete" && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="border-b border-white/10"
            >
              <div className="p-4">
                <button
                  onClick={() => setShowPromptDetails(!showPromptDetails)}
                  className="w-full flex items-center justify-between text-xs font-medium text-white/70 hover:text-white/90 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-emerald-400" />
                    <span>AI Video Prompt</span>
                  </div>
                  {showPromptDetails ? (
                    <ChevronUp className="w-4 h-4" />
                  ) : (
                    <ChevronDown className="w-4 h-4" />
                  )}
                </button>

                <AnimatePresence>
                  {showPromptDetails && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className="mt-3 space-y-3"
                    >
                      <div>
                        <span className="text-[10px] text-white/40 uppercase tracking-wider">
                          Master Prompt
                        </span>
                        <p className="text-xs text-white/80 mt-1 leading-relaxed">
                          {generatedPrompt.masterPrompt}
                        </p>
                      </div>

                      <div>
                        <span className="text-[10px] text-white/40 uppercase tracking-wider">
                          Scene Breakdown
                        </span>
                        <div className="mt-1 space-y-2 max-h-32 overflow-y-auto">
                          {generatedPrompt.framePrompts.map((fp, i) => (
                            <div
                              key={i}
                              className="text-[10px] text-white/60 bg-white/5 rounded-lg p-2"
                            >
                              <span className="text-white/80 font-medium">
                                {fp.frameTitle}
                              </span>
                              <span className="text-white/40 ml-2">
                                ({fp.duration}s)
                              </span>
                              <p className="mt-0.5 line-clamp-2">{fp.prompt}</p>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div>
                        <span className="text-[10px] text-white/40 uppercase tracking-wider">
                          Technical
                        </span>
                        <p className="text-[10px] text-white/50 mt-1">
                          {generatedPrompt.technicalNotes}
                        </p>
                      </div>

                      <button
                        onClick={handleCopyPrompt}
                        className="w-full py-2 rounded-lg bg-white/5 hover:bg-white/10 text-xs text-white/70 transition-all flex items-center justify-center gap-2"
                      >
                        {promptCopied ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-emerald-400" />
                            Copied!
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5" />
                            Copy Full Prompt
                          </>
                        )}
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Selected Frame Details */}
        <AnimatePresence>
          {selectedFrame && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="p-4 border-b border-white/10"
            >
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-medium text-white/70">Selected</span>
                <span
                  className={cn(
                    "text-[10px] px-2 py-0.5 rounded-full",
                    selectedFrame.status === "polished"
                      ? "bg-emerald-500/10 text-emerald-400"
                      : "bg-white/5 text-white/40"
                  )}
                >
                  {selectedFrame.status === "polished" ? "Ready" : "Draft"}
                </span>
              </div>

              <p className="text-sm text-white mb-3">
                {selectedFrame.title || "Untitled"}
              </p>

              <div className="mb-3">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] text-white/40">Duration</span>
                  <span className="text-xs font-mono text-white/70">
                    {((selectedFrame.durationMs || 2000) / 1000).toFixed(1)}s
                  </span>
                </div>
                <input
                  type="range"
                  min={500}
                  max={5000}
                  step={100}
                  value={selectedFrame.durationMs || 2000}
                  onChange={(e) =>
                    onDurationChange?.(selectedFrame.id, Number(e.target.value))
                  }
                  className="w-full h-1 bg-white/10 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:bg-pink-400 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:cursor-pointer"
                />
              </div>

              {selectedFrame.motionNotes && (
                <div>
                  <span className="text-[10px] text-white/40">Motion</span>
                  <p className="text-xs text-white/60 mt-1 italic">
                    "{selectedFrame.motionNotes}"
                  </p>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Export */}
        <div className="p-4">
          <span className="text-xs font-medium text-white/70">Export</span>

          <div className="flex gap-2 mt-3">
            <button
              onClick={handleExportToPDF}
              className="flex-1 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-xs text-white/70 transition-all"
            >
              ↓ PDF
            </button>
            <button
              onClick={() => navigate(`/export/${boardId}`)}
              className="flex-1 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-xs text-white/70 transition-all"
            >
              ↓ Video
            </button>
            <button
              onClick={async () => {
                try {
                  const url = `${window.location.origin}/board/${boardId}`;
                  await navigator.clipboard.writeText(url);
                } catch {
                  setError("Clipboard blocked. Copy link from address bar.");
                }
              }}
              className="w-10 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-white/70 transition-all flex items-center justify-center"
            >
              <Link2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
