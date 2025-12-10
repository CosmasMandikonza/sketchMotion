import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { GlassPanel } from "@/components/layout/GlassPanel";
import { GlassCard } from "@/components/layout/GlassCard";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { motion, AnimatePresence } from "framer-motion";
import {
  Wand2,
  Film,
  Sparkles,
  Check,
  X,
  Play,
  Pause,
  RotateCcw,
  ChevronRight,
  Loader2,
  Image,
  Settings2,
  Info,
} from "lucide-react";
import { cn } from "@/lib/utils";

type WorkflowStep = "sketch" | "polish" | "animate";
type ProcessingState = "idle" | "processing" | "complete" | "error";

interface Frame {
  id: string;
  title?: string;
  status: "sketch" | "polished";
}

interface AIPanelProps {
  selectedFrames: string[];
  frames: Frame[];
  onPolish: () => void;
  onAnimate: () => void;
  isPolishing?: boolean;
  hasPolishedFrames?: boolean;
}

export function AIPanel({ 
  selectedFrames, 
  frames,
  onPolish, 
  onAnimate,
  isPolishing = false,
  hasPolishedFrames = false,
}: AIPanelProps) {
  const navigate = useNavigate();
  const { boardId } = useParams();
  const [activeStep, setActiveStep] = useState<WorkflowStep>("sketch");
  const [polishState, setPolishState] = useState<ProcessingState>("idle");
  const [animateState, setAnimateState] = useState<ProcessingState>("idle");
  const [polishProgress, setPolishProgress] = useState(0);
  const [animateProgress, setAnimateProgress] = useState(0);

  // Count frames by status
  const sketchFrames = frames.filter(f => f.status === "sketch").length;
  const polishedFrames = frames.filter(f => f.status === "polished").length;
  const selectedSketchFrames = frames.filter(f => selectedFrames.includes(f.id) && f.status === "sketch").length;
  const selectedPolishedFrames = frames.filter(f => selectedFrames.includes(f.id) && f.status === "polished").length;

  const handlePolish = () => {
    if (selectedFrames.length === 0) return;
    
    setPolishState("processing");
    setPolishProgress(0);
    
    // Simulate progress
    const interval = setInterval(() => {
      setPolishProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          setPolishState("complete");
          setActiveStep("polish");
          return 100;
        }
        return prev + 10;
      });
    }, 180);
    
    onPolish();
  };

  const handleAnimate = () => {
    if (!hasPolishedFrames && selectedPolishedFrames === 0) return;
    
    setAnimateState("processing");
    setAnimateProgress(0);
    
    // Simulate progress
    const interval = setInterval(() => {
      setAnimateProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          setAnimateState("complete");
          setActiveStep("animate");
          return 100;
        }
        return prev + 5;
      });
    }, 100);
    
    onAnimate();
  };

  const resetWorkflow = () => {
    setActiveStep("sketch");
    setPolishState("idle");
    setAnimateState("idle");
    setPolishProgress(0);
    setAnimateProgress(0);
  };

  return (
    <GlassPanel position="right" className="fixed right-4 top-20 bottom-4 w-80 flex flex-col z-40">
      <Tabs defaultValue="ai" className="flex-1 flex flex-col">
        <TabsList className="mx-4 mt-4 bg-white/10">
          <TabsTrigger value="ai" className="flex-1 data-[state=active]:bg-white/20">
            <Sparkles className="w-4 h-4 mr-2" />
            AI Workflow
          </TabsTrigger>
          <TabsTrigger value="properties" className="flex-1 data-[state=active]:bg-white/20">
            <Settings2 className="w-4 h-4 mr-2" />
            Properties
          </TabsTrigger>
        </TabsList>

        <TabsContent value="ai" className="flex-1 flex flex-col p-4 space-y-4 overflow-auto">
          {/* Workflow Steps Indicator */}
          <div className="flex items-center justify-between mb-2">
            {/* Step 1: Sketch */}
            <div className="flex flex-col items-center">
              <div
                className={cn(
                  "w-10 h-10 rounded-xl flex items-center justify-center transition-all",
                  activeStep === "sketch"
                    ? "bg-sm-pink text-white shadow-glow"
                    : "bg-white/10 text-white/60"
                )}
              >
                <Image className="w-5 h-5" />
              </div>
              <span className="text-xs text-white/60 mt-1">Sketch</span>
              <span className="text-[10px] text-white/40">{sketchFrames} frames</span>
            </div>

            <ChevronRight className="w-4 h-4 text-white/30" />

            {/* Step 2: Polish */}
            <div className="flex flex-col items-center">
              <div
                className={cn(
                  "w-10 h-10 rounded-xl flex items-center justify-center transition-all",
                  activeStep === "polish"
                    ? "bg-sm-soft-purple text-white shadow-glow"
                    : polishState === "complete" || polishedFrames > 0
                    ? "bg-sm-mint/20 text-sm-mint"
                    : "bg-white/10 text-white/60"
                )}
              >
                {isPolishing || polishState === "processing" ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : polishState === "complete" || polishedFrames > 0 ? (
                  <Check className="w-5 h-5" />
                ) : (
                  <Wand2 className="w-5 h-5" />
                )}
              </div>
              <span className="text-xs text-white/60 mt-1">Polish</span>
              <span className="text-[10px] text-white/40">{polishedFrames} frames</span>
            </div>

            <ChevronRight className="w-4 h-4 text-white/30" />

            {/* Step 3: Animate */}
            <div className="flex flex-col items-center">
              <div
                className={cn(
                  "w-10 h-10 rounded-xl flex items-center justify-center transition-all",
                  activeStep === "animate"
                    ? "bg-sm-magenta text-white shadow-glow animate-pulse-glow"
                    : animateState === "complete"
                    ? "bg-sm-mint/20 text-sm-mint"
                    : "bg-white/10 text-white/60"
                )}
              >
                {animateState === "processing" ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : animateState === "complete" ? (
                  <Check className="w-5 h-5" />
                ) : (
                  <Film className="w-5 h-5" />
                )}
              </div>
              <span className="text-xs text-white/60 mt-1">Animate</span>
            </div>
          </div>

          {/* Step 1: Sketch Explanation */}
          <GlassCard variant="dark" className="p-4">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-sm-pink/20 flex items-center justify-center flex-shrink-0">
                <Info className="w-4 h-4 text-sm-pink" />
              </div>
              <div>
                <h4 className="font-semibold text-white text-sm mb-1">Step 1: Sketch</h4>
                <p className="text-xs text-white/60 leading-relaxed">
                  Create frames on the canvas by clicking anywhere. Connect them with arrows to define your story sequence.
                </p>
              </div>
            </div>
          </GlassCard>

          {/* Selection Info */}
          <GlassCard variant="dark" className="p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-white/70">Selected Frames</span>
              <span className="text-sm font-semibold text-white">
                {selectedFrames.length} frames
              </span>
            </div>
            {selectedFrames.length === 0 ? (
              <p className="text-xs text-white/50">
                Select frames on the canvas to start the AI workflow
              </p>
            ) : (
              <div className="flex gap-2 text-xs">
                <span className="px-2 py-1 rounded bg-white/10 text-white/70">
                  {selectedSketchFrames} sketch
                </span>
                <span className="px-2 py-1 rounded bg-sm-mint/20 text-sm-mint">
                  {selectedPolishedFrames} polished
                </span>
              </div>
            )}
          </GlassCard>

          {/* Step 2: Polish Section */}
          <GlassCard variant="dark" className="p-4">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-sm-soft-purple to-sm-purple flex items-center justify-center">
                <Wand2 className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="font-semibold text-white">Step 2: AI Polish</h3>
                <p className="text-xs text-white/60">Clean & style your sketches</p>
              </div>
            </div>

            <AnimatePresence mode="wait">
              {(polishState === "idle" && !isPolishing) && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                >
                  <Button
                    onClick={handlePolish}
                    disabled={selectedFrames.length === 0 || selectedSketchFrames === 0}
                    className="w-full bg-sm-soft-purple hover:bg-sm-soft-purple/90 text-white font-semibold"
                  >
                    <Wand2 className="w-4 h-4 mr-2" />
                    Polish {selectedSketchFrames > 0 ? `${selectedSketchFrames} Frames` : "Selected Frames"}
                  </Button>
                  {selectedFrames.length > 0 && selectedSketchFrames === 0 && (
                    <p className="text-xs text-white/40 mt-2 text-center">
                      Selected frames are already polished
                    </p>
                  )}
                </motion.div>
              )}

              {(polishState === "processing" || isPolishing) && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="space-y-2"
                >
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-white/70">AI is polishing...</span>
                    <span className="text-white font-mono">{polishProgress}%</span>
                  </div>
                  <Progress value={polishProgress} className="h-2" />
                  <p className="text-xs text-white/50 text-center">
                    Aligning art style across frames
                  </p>
                </motion.div>
              )}

              {polishState === "complete" && !isPolishing && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0 }}
                  className="space-y-3"
                >
                  <div className="flex items-center gap-2 text-sm-mint">
                    <Check className="w-4 h-4" />
                    <span className="font-medium">Polish Complete!</span>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-1 border-white/20 text-white hover:bg-white/10"
                      onClick={resetWorkflow}
                    >
                      <X className="w-4 h-4 mr-1" />
                      Reset
                    </Button>
                    <Button
                      size="sm"
                      className="flex-1 bg-sm-mint/20 text-sm-mint hover:bg-sm-mint/30"
                    >
                      <Check className="w-4 h-4 mr-1" />
                      Accept
                    </Button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </GlassCard>

          {/* Step 3: Animate Section */}
          <GlassCard variant="dark" className="p-4">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-sm-magenta to-sm-pink flex items-center justify-center">
                <Film className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="font-semibold text-white">Step 3: AI Animate</h3>
                <p className="text-xs text-white/60">Generate video from sequence</p>
              </div>
            </div>

            <AnimatePresence mode="wait">
              {animateState === "idle" && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                >
                  <Button
                    onClick={handleAnimate}
                    disabled={!hasPolishedFrames && selectedPolishedFrames === 0}
                    className="w-full bg-sm-magenta hover:bg-sm-magenta/90 text-white font-semibold shadow-glow hover:shadow-glow-lg transition-all btn-press"
                  >
                    <Film className="w-4 h-4 mr-2" />
                    Generate Animation
                  </Button>
                  {!hasPolishedFrames && selectedPolishedFrames === 0 && (
                    <p className="text-xs text-white/40 mt-2 text-center">
                      Polish frames first to enable animation
                    </p>
                  )}
                </motion.div>
              )}

              {animateState === "processing" && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="space-y-2"
                >
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-white/70">Generating...</span>
                    <span className="text-white font-mono">{animateProgress}%</span>
                  </div>
                  <Progress value={animateProgress} className="h-2" />
                  <p className="text-xs text-white/50 text-center">
                    Creating smooth transitions
                  </p>
                </motion.div>
              )}

              {animateState === "complete" && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0 }}
                  className="space-y-3"
                >
                  {/* Video Preview */}
                  <div className="aspect-video rounded-lg bg-sm-charcoal/50 flex items-center justify-center relative overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-br from-sm-pink/20 to-sm-purple/20" />
                    <Button
                      size="icon"
                      className="w-12 h-12 rounded-full bg-white/20 hover:bg-white/30 backdrop-blur-sm"
                    >
                      <Play className="w-6 h-6 text-white" />
                    </Button>
                  </div>
                  <div className="flex items-center gap-2 text-sm-mint">
                    <Sparkles className="w-4 h-4" />
                    <span className="font-medium">Animation Ready!</span>
                  </div>
                  <Button 
                    className="w-full bg-sm-magenta hover:bg-sm-magenta/90 text-white"
                    onClick={() => navigate(`/export/${boardId}`)}
                  >
                    Export Video
                  </Button>
                </motion.div>
              )}
            </AnimatePresence>
          </GlassCard>

          {/* Reset Button */}
          {(polishState !== "idle" || animateState !== "idle") && (
            <Button
              variant="ghost"
              onClick={resetWorkflow}
              className="text-white/60 hover:text-white hover:bg-white/10"
            >
              <RotateCcw className="w-4 h-4 mr-2" />
              Reset Workflow
            </Button>
          )}
        </TabsContent>

        <TabsContent value="properties" className="flex-1 p-4 overflow-auto">
          <GlassCard variant="dark" className="p-4">
            <h3 className="font-semibold text-white mb-4">Frame Properties</h3>
            {selectedFrames.length === 0 ? (
              <p className="text-sm text-white/50">
                Select a frame to view its properties
              </p>
            ) : (
              <div className="space-y-4">
                <div>
                  <label className="text-xs text-white/60 block mb-1">Duration</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      defaultValue={1000}
                      className="flex-1 h-9 px-3 rounded-lg bg-white/10 border border-white/20 text-white text-sm"
                    />
                    <span className="text-sm text-white/60">ms</span>
                  </div>
                </div>
                <div>
                  <label className="text-xs text-white/60 block mb-1">Transition</label>
                  <select className="w-full h-9 px-3 rounded-lg bg-white/10 border border-white/20 text-white text-sm">
                    <option value="fade">Fade</option>
                    <option value="slide">Slide</option>
                    <option value="zoom">Zoom</option>
                    <option value="none">None</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs text-white/60 block mb-1">Easing</label>
                  <select className="w-full h-9 px-3 rounded-lg bg-white/10 border border-white/20 text-white text-sm">
                    <option value="ease">Ease</option>
                    <option value="ease-in">Ease In</option>
                    <option value="ease-out">Ease Out</option>
                    <option value="linear">Linear</option>
                  </select>
                </div>
              </div>
            )}
          </GlassCard>
        </TabsContent>
      </Tabs>
    </GlassPanel>
  );
}
