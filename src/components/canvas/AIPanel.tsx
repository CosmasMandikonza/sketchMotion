import { useState, useEffect } from "react";
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

type VideoStyle = 'Cinematic' | 'Animated' | 'Realistic' | 'Stylized';

interface GeneratedPrompt {
  masterPrompt: string;
  framePrompts: Array<{ frameTitle: string; prompt: string; duration: number }>;
  totalDuration: number;
  technicalNotes: string;
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
  const [generationStep, setGenerationStep] = useState<'idle' | 'analyzing' | 'prompting' | 'generating' | 'complete'>('idle');
  const [generationProgress, setGenerationProgress] = useState(0);
  const [selectedStyle, setSelectedStyle] = useState<VideoStyle>("Cinematic");

  // Generated prompt state
  const [generatedPrompt, setGeneratedPrompt] = useState<GeneratedPrompt | null>(null);
  const [showPromptDetails, setShowPromptDetails] = useState(false);
  const [promptCopied, setPromptCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Count frames by status
  const polishedCount = frames.filter(f => f.status === "polished").length;
  const totalFrames = frames.length;

  // Calculate total duration
  const totalDuration = frames.reduce((acc, f) => acc + (f.durationMs || 2000), 0) / 1000;

  // Get selected frame details
  const selectedFrame = selectedFrames.length === 1
    ? frames.find(f => f.id === selectedFrames[0])
    : null;

  // Check if ready to generate
  const canGenerate = polishedCount === totalFrames && totalFrames > 0 && !isGenerating;

  // Reset generation state when frames change significantly
  useEffect(() => {
    if (generatedPrompt && generationStep === 'complete') {
      // If frames changed after generation, mark as stale
      const currentDuration = frames.reduce((acc, f) => acc + (f.durationMs || 2000), 0) / 1000;
      if (Math.abs(currentDuration - generatedPrompt.totalDuration) > 0.5) {
        setGeneratedPrompt(null);
        setGenerationStep('idle');
      }
    }
  }, [frames, generatedPrompt, generationStep]);

  const handleGenerateVideo = async () => {
    if (!canGenerate) return;

    setIsGenerating(true);
    setError(null);
    setGenerationProgress(0);
    setGenerationStep('analyzing');

    try {
      // Step 1: Analyzing frames (0-20%)
      setGenerationProgress(10);

      // Prepare frames data
      const orderedFrames = frames.map((f, index) => ({
        title: f.title || `Frame ${index + 1}`,
        imageUrl: f.polishedDataUrl || f.sketchDataUrl || f.thumbnail || '',
        durationMs: f.durationMs || 2000,
        motionNotes: f.motionNotes,
        order: index,
      })).filter(f => f.imageUrl);

      if (orderedFrames.length === 0) {
        throw new Error("No frame images available");
      }

      // Find first polished frame for video generation
      const firstPolishedFrame = orderedFrames.find(f => f.imageUrl);
      if (!firstPolishedFrame?.imageUrl) {
        throw new Error("No polished frames available");
      }

      setGenerationProgress(20);
      setGenerationStep('prompting');

      // Step 2: Generate prompt (20-40%)
      const promptResult = await generateStoryboardVideoPrompt(orderedFrames, selectedStyle);
      setGeneratedPrompt(promptResult);
      setGenerationProgress(40);

      setGenerationStep('generating');

      // Step 3: Convert image to base64 and generate video with Veo via Supabase Edge Function
      const imageResponse = await fetch(firstPolishedFrame.imageUrl);
      const blob = await imageResponse.blob();
      const imageBase64 = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.readAsDataURL(blob);
      });

      const videoResult = await generateVideoFromFrame(
        promptResult?.masterPrompt || 'Animate this scene with smooth motion',
        imageBase64,
        Math.round((firstPolishedFrame.durationMs || 2000) / 1000),
        (progress, status) => {
          setGenerationProgress(40 + (progress * 0.6)); // Scale 0-100 to 40-100
          console.log(`[Video Gen] ${status}: ${progress}%`);
        }
      );

      setGenerationProgress(100);

      if (videoResult.status === 'done' && videoResult.videoUrl) {
        // Store video URL for export page
        sessionStorage.setItem('generatedVideoUrl', videoResult.videoUrl);
        sessionStorage.setItem('generatedVideoPrompt', promptResult.masterPrompt);

        setGenerationStep('complete');
        onAnimate();

        // Navigate to export after short delay
        setTimeout(() => {
          navigate(`/export/${boardId}`);
        }, 1500);

      } else if (videoResult.status === 'error') {
        // Error from edge function
        setGenerationStep('complete');
        setError(videoResult.error || 'Video generation failed');
        // Still store prompt for manual use
        sessionStorage.setItem('generatedVideoPrompt', promptResult.masterPrompt);

      } else {
        // Unknown status - still show the prompt
        setGenerationStep('complete');
        console.warn("Video generation:", videoResult);
        sessionStorage.setItem('generatedVideoPrompt', promptResult.masterPrompt);
        // Navigate to export anyway - they can use the prompt
        setTimeout(() => {
          navigate(`/export/${boardId}`);
        }, 1500);
      }

    } catch (err) {
      console.error("Generation failed:", err);
      setError(err instanceof Error ? err.message : "Generation failed");
      setGenerationStep('idle');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopyPrompt = async () => {
    if (!generatedPrompt) return;

    const fullPrompt = `MASTER PROMPT:\n${generatedPrompt.masterPrompt}\n\nFRAME PROMPTS:\n${generatedPrompt.framePrompts.map((fp, i) => `${i + 1}. ${fp.frameTitle} (${fp.duration}s):\n${fp.prompt}`).join('\n\n')}\n\nTECHNICAL NOTES:\n${generatedPrompt.technicalNotes}`;

    await navigator.clipboard.writeText(fullPrompt);
    setPromptCopied(true);
    setTimeout(() => setPromptCopied(false), 2000);
  };

  const handleExportToPDF = () => {
    navigate(`/export/${boardId}`);
  };

  const styles: VideoStyle[] = ['Cinematic', 'Animated', 'Realistic', 'Stylized'];

  const getStepLabel = () => {
    switch (generationStep) {
      case 'analyzing': return 'Analyzing frames...';
      case 'prompting': return 'Crafting video prompt...';
      case 'generating': return 'Generating video...';
      case 'complete': return 'Ready!';
      default: return '';
    }
  };

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
              <span className="text-xs font-mono text-white/50">{totalDuration.toFixed(1)}s</span>
            </div>
          </div>

          {/* Mini frame strip */}
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
                    {frame.thumbnail || frame.polishedDataUrl || frame.sketchDataUrl ? (
                      <img
                        src={frame.thumbnail || frame.polishedDataUrl || frame.sketchDataUrl}
                        className="w-full h-full object-cover"
                        alt=""
                      />
                    ) : (
                      <div className="w-full h-full bg-white/5" />
                    )}
                    {/* Status dot */}
                    <div className={cn(
                      "absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full",
                      frame.status === "polished" ? "bg-emerald-400" : "bg-white/20"
                    )} />
                  </button>
                ))}
              </div>

              <p className="text-[10px] text-white/40 mt-2">
                {polishedCount}/{totalFrames} polished
              </p>
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

          {/* Style selector */}
          <div className="grid grid-cols-2 gap-1.5 mb-4">
            {styles.map(style => (
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

          {/* Progress bar (when generating) */}
          <AnimatePresence>
            {isGenerating && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
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

          {/* Generate button */}
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
            ) : generationStep === 'complete' ? (
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

          {/* Error message */}
          {error && (
            <p className="text-[10px] text-red-400 text-center mt-2">
              {error}
            </p>
          )}

          {/* Warning if frames not ready */}
          {polishedCount < totalFrames && totalFrames > 0 && !isGenerating && (
            <p className="text-[10px] text-amber-400/70 text-center mt-2">
              Polish {totalFrames - polishedCount} frame{totalFrames - polishedCount > 1 ? 's' : ''} first
            </p>
          )}
        </div>

        {/* Generated Prompt (when complete) */}
        <AnimatePresence>
          {generatedPrompt && generationStep === 'complete' && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
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
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="mt-3 space-y-3"
                    >
                      {/* Master prompt */}
                      <div>
                        <span className="text-[10px] text-white/40 uppercase tracking-wider">Master Prompt</span>
                        <p className="text-xs text-white/80 mt-1 leading-relaxed">
                          {generatedPrompt.masterPrompt}
                        </p>
                      </div>

                      {/* Frame prompts */}
                      <div>
                        <span className="text-[10px] text-white/40 uppercase tracking-wider">Scene Breakdown</span>
                        <div className="mt-1 space-y-2 max-h-32 overflow-y-auto">
                          {generatedPrompt.framePrompts.map((fp, i) => (
                            <div key={i} className="text-[10px] text-white/60 bg-white/5 rounded-lg p-2">
                              <span className="text-white/80 font-medium">{fp.frameTitle}</span>
                              <span className="text-white/40 ml-2">({fp.duration}s)</span>
                              <p className="mt-0.5 line-clamp-2">{fp.prompt}</p>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Technical notes */}
                      <div>
                        <span className="text-[10px] text-white/40 uppercase tracking-wider">Technical</span>
                        <p className="text-[10px] text-white/50 mt-1">
                          {generatedPrompt.technicalNotes}
                        </p>
                      </div>

                      {/* Copy button */}
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
                <span className={cn(
                  "text-[10px] px-2 py-0.5 rounded-full",
                  selectedFrame.status === "polished"
                    ? "bg-emerald-500/10 text-emerald-400"
                    : "bg-white/5 text-white/40"
                )}>
                  {selectedFrame.status === "polished" ? 'Ready' : 'Draft'}
                </span>
              </div>

              <p className="text-sm text-white mb-3">{selectedFrame.title || 'Untitled'}</p>

              {/* Duration slider */}
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
                  onChange={(e) => onDurationChange?.(selectedFrame.id, Number(e.target.value))}
                  className="w-full h-1 bg-white/10 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:bg-pink-400 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:cursor-pointer"
                />
              </div>

              {/* Motion notes */}
              {selectedFrame.motionNotes && (
                <div>
                  <span className="text-[10px] text-white/40">Motion</span>
                  <p className="text-xs text-white/60 mt-1 italic">"{selectedFrame.motionNotes}"</p>
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
              onClick={() => {
                navigator.clipboard.writeText(`${window.location.origin}/board/${boardId}`);
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
