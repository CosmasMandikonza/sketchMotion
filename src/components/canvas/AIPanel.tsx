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
  // Prefer the most "final" asset first
  return f.polishedDataUrl || f.thumbnail || f.sketchDataUrl || null;
}

async function toBase64DataUrl(imageUrl: string, timeoutMs = 15000): Promise<string> {
  // If already base64, return
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
    // Most common judge-day failure: CORS / blocked URL
    const msg =
      e instanceof Error
        ? e.message
        : "Unknown error converting image to base64";
    throw new Error(
      `Could not access frame image. If this is a remote URL, it may be blocked by CORS. (${msg})`
    );
  } finally {
    clearTimeout(t);
  }
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
  const [generatedPrompt, setGeneratedPrompt] = useState<GeneratedPrompt | null>(
    null
  );
  const [showPromptDetails, setShowPromptDetails] = useState(false);
  const [promptCopied, setPromptCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Run-safety: ignore stale async completions
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

  // More honest readiness checks
  const frameImageStats = useMemo(() => {
    const missingImage = frames.filter((f) => !getFrameImageUrl(f)).length;
    const unpolished = frames.filter((f) => f.status !== "polished").length;
    return { missingImage, unpolished };
  }, [frames]);

  // Veo typical hard bounds (you clamp later anyway); we warn early
  const durationTooShort = totalDuration < 5;
  const durationTooLong = totalDuration > 60;

  const canGenerate =
    totalFrames > 0 &&
    !isGenerating &&
    frameImageStats.unpolished === 0 &&
    frameImageStats.missingImage === 0;

  // Mark prompt stale if frames/style changed after generation
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
      // Step 1: Prepare frames (0–20)
      setProgressSafe(10);

      // IMPORTANT: use frames in the order they are passed in.
      // If you want connection-order, pass getSequencedFrames() from CanvasPage into AIPanel.
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

      // Choose the first frame in the ordered sequence as conditioning image
      const firstFrame = orderedFrames[0];
      if (!firstFrame?.imageUrl) throw new Error("First frame has no usable image URL");

      setProgressSafe(20);
      setGenerationStep("prompting");

      // Step 2: Prompt generation (20–40)
      const promptResult = await generateStoryboardVideoPrompt(
        orderedFrames,
        selectedStyle
      );

      // stale-run guard
      if (runIdRef.current !== runId || !mountedRef.current) return;

      setGeneratedPrompt(promptResult);
      setProgressSafe(40);
      setGenerationStep("generating");

      // Step 3: Generate video via Edge Function (40–100)
      // Convert conditioning frame image to base64 safely
      const imageBase64 = await toBase64DataUrl(firstFrame.imageUrl);

      // stale-run guard
      if (runIdRef.current !== runId || !mountedRef.current) return;

      // Veo clamp: 5–60s (you can also split into multiple shots later)
      const requestedSecondsRaw = Math.round((firstFrame.durationMs || 2000) / 1000);
      const requestedSeconds = clamp(requestedSecondsRaw, 5, 60);

      const videoResult = await generateVideoFromFrame(
        promptResult?.masterPrompt || "Animate this scene with smooth motion",
        imageBase64,
        requestedSeconds,
        (progress, status) => {
          // Scale 0–100 => 40–100
          const scaled = 40 + clamp(progress, 0, 100) * 0.6;
          setProgressSafe(scaled);
          // optional log
          console.log(`[Video Gen] ${status}: ${progress}%`);
        }
      );

      // stale-run guard
      if (runIdRef.current !== runId || !mountedRef.current) return;

      setProgressSafe(100);

      // Always store prompt safely (even if video fails)
      safeSetSession("generatedVideoPrompt", promptResult.masterPrompt);

      setGenerationStep("complete");

      if (videoResult?.status === "done" && videoResult.videoUrl) {
        safeSetSession("generatedVideoUrl", videoResult.videoUrl);

        onAnimate();

        // Navigate after short delay (avoid state updates after)
        setTimeout(() => {
          if (!mountedRef.current) return;
          navigate(`/export/${boardId}`);
        }, 1200);
        return;
      }

      if (videoResult?.status === "error") {
        setError(videoResult.error || "Video generation failed");
        // Still allow user to export prompt
        return;
      }

      // Unknown status: still let them continue with prompt
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
      .map(
        (fp, i) => `${i + 1}. ${fp.frameTitle} (${fp.duration}s):\n${fp.prompt}`
      )
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
                        frame.status === "polished"
                          ? "bg-emerald-400"
                          : "bg-white/20"
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

        {/* Video Generation */}
        <div className="p-4 border-b border-white/10">
          <div className="flex items-center gap-2 mb-3">
            <Wand2 className="w-4 h-4 text-pink-400" />
            <span className="text-xs font-medium text-white/70">Generate Video</span>
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
                  // Make sure this matches your actual public route
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
