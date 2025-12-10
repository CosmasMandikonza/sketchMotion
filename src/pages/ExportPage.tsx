import { useState, useEffect, useCallback } from "react";
import { Link, useParams } from "react-router-dom";
import { GradientBackground } from "@/components/layout/GradientBackground";
import { GlassCard } from "@/components/layout/GlassCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { motion, AnimatePresence } from "framer-motion";
import {
  Sparkles,
  ChevronLeft,
  Play,
  Pause,
  Download,
  Link2,
  Copy,
  Check,
  Clock,
  Film,
  Settings2,
  Lock,
  Eye,
  Share2,
  RotateCcw,
  Loader2,
  FileVideo,
  Smartphone,
  Square,
  Monitor,
  Crown,
  Zap,
  ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";

// Mock board data based on boardId
const getBoardData = (boardId: string | undefined) => {
  const boards: Record<string, { title: string; duration: string; durationSec: number; resolution: string }> = {
    "1": { title: "Product Launch Animation", duration: "0:45", durationSec: 45, resolution: "1080p" },
    "2": { title: "Explainer Video Storyboard", duration: "1:12", durationSec: 72, resolution: "1080p" },
    "3": { title: "Social Media Campaign", duration: "0:30", durationSec: 30, resolution: "1080p" },
    "4": { title: "App Onboarding Flow", duration: "0:58", durationSec: 58, resolution: "720p" },
    "5": { title: "Brand Story Animation", duration: "2:15", durationSec: 135, resolution: "4K" },
    "6": { title: "Tutorial Series", duration: "1:45", durationSec: 105, resolution: "1080p" },
  };
  return boards[boardId || "1"] || { title: "Untitled Board", duration: "0:45", durationSec: 45, resolution: "1080p" };
};

// Preset configurations
interface Preset {
  id: string;
  name: string;
  icon: React.ElementType;
  resolution: string;
  aspectRatio: string;
  dimensions: string;
}

const presets: Preset[] = [
  { id: "tiktok", name: "TikTok Vertical", icon: Smartphone, resolution: "1080p", aspectRatio: "9:16", dimensions: "1080×1920" },
  { id: "youtube", name: "YouTube Short", icon: Smartphone, resolution: "1080p", aspectRatio: "9:16", dimensions: "1080×1920" },
  { id: "instagram", name: "Instagram Reel", icon: Smartphone, resolution: "1080p", aspectRatio: "9:16", dimensions: "1080×1920" },
  { id: "square", name: "Square Post", icon: Square, resolution: "1080p", aspectRatio: "1:1", dimensions: "1080×1080" },
  { id: "landscape", name: "Landscape HD", icon: Monitor, resolution: "1080p", aspectRatio: "16:9", dimensions: "1920×1080" },
];

// Mock version history with more detail
const versionHistory = [
  {
    id: "v3",
    label: "v3 – Final",
    name: "Final Export",
    timestamp: "Today, 2:30 PM",
    duration: "0:45",
    durationSec: 45,
    resolution: "1080p",
    thumbnail: "https://images.unsplash.com/photo-1558655146-9f40138edfeb?w=200&q=80",
    status: "current" as const,
  },
  {
    id: "v2",
    label: "v2 – Client feedback",
    name: "Added transitions",
    timestamp: "Today, 11:15 AM",
    duration: "0:42",
    durationSec: 42,
    resolution: "1080p",
    thumbnail: "https://images.unsplash.com/photo-1611532736597-de2d4265fba3?w=200&q=80",
    status: "archived" as const,
  },
  {
    id: "v1",
    label: "v1 – First cut",
    name: "Initial render",
    timestamp: "Yesterday, 4:45 PM",
    duration: "0:38",
    durationSec: 38,
    resolution: "720p",
    thumbnail: "https://images.unsplash.com/photo-1626785774573-4b799315345d?w=200&q=80",
    status: "archived" as const,
  },
];

// Quality descriptions
const getQualityDescription = (quality: number) => {
  if (quality >= 90) return "Archival quality – Best for final delivery";
  if (quality >= 75) return "High quality – Great for most uses";
  if (quality >= 60) return "Best for social – Optimized file size";
  return "Draft quality – Quick preview";
};

export function ExportPage() {
  const { boardId } = useParams();
  const boardData = getBoardData(boardId);
  
  // Video player state
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [playbackProgress, setPlaybackProgress] = useState(0);
  
  // Export settings state
  const [selectedPreset, setSelectedPreset] = useState<string>("landscape");
  const [selectedFormat, setSelectedFormat] = useState("mp4");
  const [resolution, setResolution] = useState("1080p");
  const [quality, setQuality] = useState([80]);
  
  // Export progress state
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  const [exportComplete, setExportComplete] = useState(false);
  const [exportFilename, setExportFilename] = useState("");
  
  // Share state
  const [passwordProtect, setPasswordProtect] = useState(false);
  const [password, setPassword] = useState("");
  const [shareLink, setShareLink] = useState("");
  const [linkCopied, setLinkCopied] = useState(false);
  
  // Version state
  const [selectedVersion, setSelectedVersion] = useState("v3");
  const [currentVersionData, setCurrentVersionData] = useState(versionHistory[0]);

  // Update version data when selection changes
  useEffect(() => {
    const version = versionHistory.find(v => v.id === selectedVersion);
    if (version) {
      setCurrentVersionData(version);
    }
  }, [selectedVersion]);

  // Simulate video playback
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isPlaying) {
      interval = setInterval(() => {
        setPlaybackProgress(prev => {
          if (prev >= 100) {
            setIsPlaying(false);
            return 0;
          }
          return prev + 2;
        });
        setCurrentTime(prev => {
          const maxTime = currentVersionData.durationSec;
          if (prev >= maxTime) {
            setIsPlaying(false);
            return 0;
          }
          return prev + (maxTime / 50);
        });
      }, 100);
    }
    return () => clearInterval(interval);
  }, [isPlaying, currentVersionData.durationSec]);

  // Update resolution when preset changes
  useEffect(() => {
    const preset = presets.find(p => p.id === selectedPreset);
    if (preset) {
      setResolution(preset.resolution);
    }
  }, [selectedPreset]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const handleGenerateLink = useCallback(() => {
    const randomId = Math.random().toString(36).substring(2, 8);
    setShareLink(`https://sketchmotion.app/share/${randomId}`);
  }, []);

  const handleCopyLink = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(shareLink);
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  }, [shareLink]);

  const handleExport = useCallback(() => {
    setIsExporting(true);
    setExportProgress(0);
    setExportComplete(false);

    // Simulate export progress
    const interval = setInterval(() => {
      setExportProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          setIsExporting(false);
          setExportComplete(true);
          // Generate filename
          const sanitizedTitle = boardData.title.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
          setExportFilename(`sketchmotion-${sanitizedTitle}-${resolution}.${selectedFormat}`);
          return 100;
        }
        return prev + 5;
      });
    }, 80);
  }, [boardData.title, resolution, selectedFormat]);

  const handleDownload = useCallback(() => {
    // Simulate download
    console.log("Downloading:", exportFilename);
  }, [exportFilename]);

  const currentPreset = presets.find(p => p.id === selectedPreset);

  return (
    <GradientBackground>
      <div className="min-h-screen">
        {/* Header */}
        <header className="fixed top-0 left-0 right-0 z-50 px-4 py-3">
          <GlassCard className="max-w-full mx-auto px-4 py-2 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link
                to={`/canvas/${boardId}`}
                className="flex items-center gap-2 text-white/70 hover:text-white transition-colors group"
              >
                <ChevronLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
                <span className="hidden sm:inline">Back to Canvas</span>
              </Link>

              <div className="h-6 w-px bg-white/20" />

              <Link to="/" className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-sm-magenta to-sm-purple flex items-center justify-center">
                  <Sparkles className="w-4 h-4 text-white" />
                </div>
              </Link>
            </div>

            {/* Breadcrumb Title */}
            <div className="flex items-center gap-2 text-white">
              <span className="text-white/60 hidden sm:inline">SketchMotion</span>
              <ChevronRight className="w-4 h-4 text-white/40 hidden sm:inline" />
              <span className="font-display font-bold truncate max-w-[200px] sm:max-w-none">
                {boardData.title}
              </span>
            </div>

            <div className="flex items-center gap-2 text-sm text-white/60">
              <Film className="w-4 h-4" />
              <span className="hidden sm:inline">{currentVersionData.duration}</span>
              <span className="hidden sm:inline">•</span>
              <span>{currentVersionData.resolution}</span>
            </div>
          </GlassCard>
        </header>

        {/* Main Content */}
        <div className="pt-24 pb-8 px-4">
          <div className="max-w-7xl mx-auto grid lg:grid-cols-3 gap-6">
            {/* Video Preview */}
            <div className="lg:col-span-2 space-y-6">
              <GlassCard className="p-6">
                <h2 className="font-display font-bold text-xl text-white mb-4">
                  Video Preview
                </h2>

                {/* Video Player */}
                <div className={cn(
                  "rounded-xl bg-sm-charcoal/80 relative overflow-hidden mb-4",
                  currentPreset?.aspectRatio === "9:16" ? "aspect-[9/16] max-w-[300px] mx-auto" :
                  currentPreset?.aspectRatio === "1:1" ? "aspect-square max-w-[400px] mx-auto" :
                  "aspect-video"
                )}>
                  {/* Video Thumbnail/Preview */}
                  <img
                    src="https://images.unsplash.com/photo-1558655146-9f40138edfeb?w=800&q=80"
                    alt="Video preview"
                    className="w-full h-full object-cover"
                  />

                  {/* Overlay with title and duration */}
                  <div className="absolute top-4 left-4 right-4 flex items-start justify-between">
                    <div className="px-3 py-1.5 rounded-lg bg-black/60 backdrop-blur-sm">
                      <p className="text-white text-sm font-medium truncate max-w-[200px]">
                        {boardData.title}
                      </p>
                    </div>
                    <div className="px-2 py-1 rounded-md bg-black/60 backdrop-blur-sm text-white text-sm font-mono">
                      {currentVersionData.duration}
                    </div>
                  </div>

                  {/* Play/Pause Overlay */}
                  <div className="absolute inset-0 flex items-center justify-center">
                    <motion.button
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => setIsPlaying(!isPlaying)}
                      className="w-20 h-20 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center hover:bg-white/30 transition-colors"
                    >
                      {isPlaying ? (
                        <Pause className="w-10 h-10 text-white" />
                      ) : (
                        <Play className="w-10 h-10 text-white ml-1" />
                      )}
                    </motion.button>
                  </div>

                  {/* Playback Status */}
                  <div className="absolute bottom-4 left-4">
                    <div className="px-2 py-1 rounded-md bg-black/60 backdrop-blur-sm text-white text-xs">
                      {isPlaying ? "Preview playing..." : "Paused"}
                    </div>
                  </div>

                  {/* Resolution Badge */}
                  <div className="absolute bottom-4 right-4 px-2 py-1 rounded-md bg-black/60 backdrop-blur-sm text-white text-xs font-mono">
                    {currentPreset?.dimensions || "1920×1080"}
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="space-y-2">
                  <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                    <motion.div
                      className="h-full bg-gradient-to-r from-sm-magenta to-sm-pink"
                      style={{ width: `${playbackProgress}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-sm text-white/60 font-mono">
                    <span>{formatTime(currentTime)}</span>
                    <span>{currentVersionData.duration}</span>
                  </div>
                </div>
              </GlassCard>

              {/* Version History */}
              <GlassCard className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="font-display font-bold text-xl text-white">
                    Version History
                  </h2>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-white/70 hover:text-white hover:bg-white/10"
                  >
                    <RotateCcw className="w-4 h-4 mr-2" />
                    Restore
                  </Button>
                </div>

                <div className="space-y-3">
                  {versionHistory.map((version) => (
                    <motion.div
                      key={version.id}
                      whileHover={{ scale: 1.01 }}
                      onClick={() => setSelectedVersion(version.id)}
                      className={cn(
                        "flex items-center gap-4 p-3 rounded-xl cursor-pointer transition-all",
                        selectedVersion === version.id
                          ? "bg-white/15 ring-2 ring-sm-magenta"
                          : "bg-white/5 hover:bg-white/10"
                      )}
                    >
                      {/* Thumbnail */}
                      <div className="w-20 h-12 rounded-lg overflow-hidden flex-shrink-0">
                        <img
                          src={version.thumbnail}
                          alt={version.name}
                          className="w-full h-full object-cover"
                        />
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-semibold text-white">
                            {version.label}
                          </p>
                          <span className={cn(
                            "px-2 py-0.5 rounded-full text-xs font-medium",
                            version.status === "current" 
                              ? "bg-sm-mint/20 text-sm-mint"
                              : "bg-white/10 text-white/60"
                          )}>
                            {version.status === "current" ? "Current" : "Archived"}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 text-sm text-white/60 mt-1">
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {version.duration}
                          </span>
                          <span className="flex items-center gap-1">
                            <Film className="w-3 h-3" />
                            {version.resolution}
                          </span>
                          <span className="text-white/40 hidden sm:inline">
                            {version.timestamp}
                          </span>
                        </div>
                      </div>

                      {/* Select Indicator */}
                      {selectedVersion === version.id && (
                        <Check className="w-5 h-5 text-sm-magenta flex-shrink-0" />
                      )}
                    </motion.div>
                  ))}
                </div>
              </GlassCard>

              {/* Upgrade Upsell */}
              <GlassCard className="p-4 bg-gradient-to-r from-sm-purple/20 to-sm-magenta/20 border border-sm-purple/30">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-sm-purple to-sm-magenta flex items-center justify-center">
                      <Crown className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <p className="font-semibold text-white">Upgrade for team exports</p>
                      <p className="text-sm text-white/60">
                        Need 4K exports and team approvals? Try SketchMotion Studio.
                      </p>
                    </div>
                  </div>
                  <Button className="bg-sm-magenta hover:bg-sm-magenta/90 text-white font-semibold shadow-glow flex-shrink-0">
                    <Zap className="w-4 h-4 mr-2" />
                    Upgrade
                  </Button>
                </div>
              </GlassCard>
            </div>

            {/* Export Settings */}
            <div className="space-y-6">
              {/* Preset Selection */}
              <GlassCard className="p-6">
                <div className="flex items-center gap-2 mb-4">
                  <FileVideo className="w-5 h-5 text-sm-coral" />
                  <h2 className="font-display font-bold text-xl text-white">
                    Export Preset
                  </h2>
                </div>

                <div className="flex flex-wrap gap-2">
                  {presets.map((preset) => {
                    const Icon = preset.icon;
                    return (
                      <button
                        key={preset.id}
                        onClick={() => setSelectedPreset(preset.id)}
                        className={cn(
                          "flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all",
                          selectedPreset === preset.id
                            ? "bg-sm-magenta text-white shadow-glow"
                            : "bg-white/10 text-white/70 hover:bg-white/20 hover:text-white"
                        )}
                      >
                        <Icon className="w-4 h-4" />
                        {preset.name}
                      </button>
                    );
                  })}
                </div>

                {currentPreset && (
                  <div className="mt-4 p-3 rounded-lg bg-white/5 text-sm">
                    <div className="flex justify-between text-white/60">
                      <span>Aspect Ratio</span>
                      <span className="text-white font-mono">{currentPreset.aspectRatio}</span>
                    </div>
                    <div className="flex justify-between text-white/60 mt-1">
                      <span>Dimensions</span>
                      <span className="text-white font-mono">{currentPreset.dimensions}</span>
                    </div>
                  </div>
                )}
              </GlassCard>

              {/* Export Options */}
              <GlassCard className="p-6">
                <div className="flex items-center gap-2 mb-4">
                  <Settings2 className="w-5 h-5 text-sm-soft-purple" />
                  <h2 className="font-display font-bold text-xl text-white">
                    Export Settings
                  </h2>
                </div>

                <div className="space-y-5">
                  {/* Format */}
                  <div>
                    <Label className="text-white/70 mb-2 block">Format</Label>
                    <div className="grid grid-cols-3 gap-2">
                      {["mp4", "gif", "webm"].map((format) => (
                        <button
                          key={format}
                          onClick={() => setSelectedFormat(format)}
                          className={cn(
                            "py-2 px-3 rounded-lg text-sm font-medium uppercase transition-all",
                            selectedFormat === format
                              ? "bg-sm-magenta text-white shadow-glow"
                              : "bg-white/10 text-white/70 hover:bg-white/20 hover:text-white"
                          )}
                        >
                          {format}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Resolution */}
                  <div>
                    <Label className="text-white/70 mb-2 block">Resolution</Label>
                    <div className="grid grid-cols-3 gap-2">
                      {["720p", "1080p", "4K"].map((res) => (
                        <button
                          key={res}
                          onClick={() => setResolution(res)}
                          className={cn(
                            "py-2 px-3 rounded-lg text-sm font-medium transition-all",
                            resolution === res
                              ? "bg-sm-soft-purple text-white"
                              : "bg-white/10 text-white/70 hover:bg-white/20 hover:text-white",
                            res === "4K" && "relative"
                          )}
                        >
                          {res}
                          {res === "4K" && (
                            <span className="absolute -top-1 -right-1 w-3 h-3 bg-sm-coral rounded-full flex items-center justify-center">
                              <Crown className="w-2 h-2 text-white" />
                            </span>
                          )}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Quality */}
                  <div>
                    <div className="flex justify-between mb-2">
                      <Label className="text-white/70">Quality: {quality[0]}%</Label>
                    </div>
                    <Slider
                      value={quality}
                      min={50}
                      max={100}
                      step={5}
                      onValueChange={setQuality}
                    />
                    <p className="text-xs text-white/50 mt-2">
                      {getQualityDescription(quality[0])}
                    </p>
                  </div>

                  {/* Export Button */}
                  <AnimatePresence mode="wait">
                    {!isExporting && !exportComplete && (
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                      >
                        <Button
                          onClick={handleExport}
                          className="w-full bg-sm-magenta hover:bg-sm-magenta/90 text-white font-semibold shadow-glow hover:shadow-glow-lg transition-all btn-press"
                        >
                          <Download className="w-4 h-4 mr-2" />
                          Export {selectedFormat.toUpperCase()}
                        </Button>
                      </motion.div>
                    )}

                    {isExporting && (
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="space-y-3"
                      >
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-white/70 flex items-center gap-2">
                            <Loader2 className="w-4 h-4 animate-spin" />
                            Exporting...
                          </span>
                          <span className="text-white font-mono">{exportProgress}%</span>
                        </div>
                        <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                          <motion.div
                            className="h-full bg-gradient-to-r from-sm-magenta to-sm-pink"
                            style={{ width: `${exportProgress}%` }}
                          />
                        </div>
                      </motion.div>
                    )}

                    {exportComplete && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0 }}
                        className="space-y-3"
                      >
                        <div className="flex items-center gap-2 text-sm-mint">
                          <Check className="w-4 h-4" />
                          <span className="font-medium">Download ready!</span>
                        </div>
                        <div className="p-3 rounded-lg bg-white/5">
                          <p className="text-xs text-white/60 mb-1">Filename</p>
                          <p className="text-sm text-white font-mono truncate">
                            {exportFilename}
                          </p>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            className="flex-1 border-white/20 text-white hover:bg-white/10"
                            onClick={() => {
                              setExportComplete(false);
                              setExportProgress(0);
                            }}
                          >
                            <RotateCcw className="w-4 h-4 mr-2" />
                            New Export
                          </Button>
                          <Button
                            className="flex-1 bg-sm-mint hover:bg-sm-mint/90 text-white"
                            onClick={handleDownload}
                          >
                            <Download className="w-4 h-4 mr-2" />
                            Download
                          </Button>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </GlassCard>

              {/* Share Options */}
              <GlassCard className="p-6">
                <div className="flex items-center gap-2 mb-4">
                  <Share2 className="w-5 h-5 text-sm-pink" />
                  <h2 className="font-display font-bold text-xl text-white">
                    Share
                  </h2>
                </div>

                <div className="space-y-4">
                  {/* Password Protection */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Lock className="w-4 h-4 text-white/60" />
                      <Label className="text-white/70">Password Protect</Label>
                    </div>
                    <Switch
                      checked={passwordProtect}
                      onCheckedChange={setPasswordProtect}
                    />
                  </div>

                  <AnimatePresence>
                    {passwordProtect && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        className="space-y-2"
                      >
                        <Input
                          type="password"
                          placeholder="Enter password"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          className="bg-white/10 border-white/20 text-white placeholder:text-white/40"
                        />
                        <p className="text-xs text-white/50">
                          Viewers will be asked for this password before watching.
                        </p>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Generate Link */}
                  <Button
                    onClick={handleGenerateLink}
                    variant="outline"
                    className="w-full border-white/20 text-white hover:bg-white/10"
                  >
                    <Link2 className="w-4 h-4 mr-2" />
                    Generate Share Link
                  </Button>

                  {/* Share Link Display */}
                  <AnimatePresence>
                    {shareLink && (
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="space-y-2"
                      >
                        <div className="flex items-center gap-2">
                          <Input
                            value={shareLink}
                            readOnly
                            className="bg-white/10 border-white/20 text-white text-sm font-mono"
                          />
                          <Button
                            size="icon"
                            onClick={handleCopyLink}
                            className={cn(
                              "flex-shrink-0 transition-all",
                              linkCopied
                                ? "bg-sm-mint text-white"
                                : "bg-white/10 text-white hover:bg-white/20"
                            )}
                          >
                            {linkCopied ? (
                              <Check className="w-4 h-4" />
                            ) : (
                              <Copy className="w-4 h-4" />
                            )}
                          </Button>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-white/60">
                          <Eye className="w-4 h-4" />
                          <span>
                            {passwordProtect 
                              ? "Password required to view" 
                              : "Anyone with the link can view"}
                          </span>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </GlassCard>
            </div>
          </div>
        </div>
      </div>
    </GradientBackground>
  );
}
