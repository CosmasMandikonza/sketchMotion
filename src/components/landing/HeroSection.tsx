import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { GlassCard } from "@/components/layout/GlassCard";
import { ArrowRight, Sparkles, Wand2 } from "lucide-react";
import { motion } from "framer-motion";

// Dancing Pen + Board Mascot Component
function DancingMascot() {
  return (
    <motion.div 
      className="flex justify-center mb-6"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1, duration: 0.5 }}
    >
      <div className="animate-mascot-dance">
        <svg 
          width="64" 
          height="64" 
          viewBox="0 0 64 64" 
          fill="none" 
          xmlns="http://www.w3.org/2000/svg"
          className="w-12 h-12 md:w-16 md:h-16"
        >
          {/* Storyboard/Frame */}
          <rect 
            x="16" 
            y="20" 
            width="32" 
            height="28" 
            rx="4" 
            fill="url(#boardGradient)" 
            stroke="rgba(255,255,255,0.3)" 
            strokeWidth="2"
          />
          {/* Frame lines */}
          <line x1="16" y1="32" x2="48" y2="32" stroke="rgba(255,255,255,0.2)" strokeWidth="1.5"/>
          <line x1="32" y1="20" x2="32" y2="48" stroke="rgba(255,255,255,0.2)" strokeWidth="1.5"/>
          
          {/* Pen leaning on board */}
          <g transform="rotate(-25, 52, 18)">
            <rect 
              x="46" 
              y="4" 
              width="8" 
              height="36" 
              rx="2" 
              fill="url(#penGradient)"
            />
            {/* Pen tip */}
            <polygon 
              points="46,40 54,40 50,50" 
              fill="#FF3D8F"
            />
            {/* Pen grip */}
            <rect 
              x="46" 
              y="28" 
              width="8" 
              height="8" 
              fill="rgba(255,255,255,0.3)"
              rx="1"
            />
          </g>
          
          {/* Sparkle accents */}
          <circle cx="12" cy="16" r="2" fill="#FF6BD5" opacity="0.8"/>
          <circle cx="56" cy="52" r="1.5" fill="#A78BFA" opacity="0.8"/>
          <circle cx="8" cy="40" r="1" fill="#FF8A33" opacity="0.6"/>
          
          <defs>
            <linearGradient id="boardGradient" x1="16" y1="20" x2="48" y2="48" gradientUnits="userSpaceOnUse">
              <stop stopColor="#A78BFA" stopOpacity="0.4"/>
              <stop offset="1" stopColor="#C471ED" stopOpacity="0.6"/>
            </linearGradient>
            <linearGradient id="penGradient" x1="46" y1="4" x2="54" y2="40" gradientUnits="userSpaceOnUse">
              <stop stopColor="#FF6B9D"/>
              <stop offset="1" stopColor="#C471ED"/>
            </linearGradient>
          </defs>
        </svg>
      </div>
    </motion.div>
  );
}

// Simplified Canvas Preview Component
function CanvasPreview() {
  return (
    <div className="aspect-[4/3] rounded-xl bg-sm-charcoal/50 relative overflow-hidden" style={{
      backgroundImage: `radial-gradient(circle at 1px 1px, rgba(255,255,255,0.08) 1px, transparent 0)`,
      backgroundSize: '24px 24px'
    }}>
      {/* SVG for arrows and connections */}
      <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 400 300">
        <defs>
          <linearGradient id="arrowGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#FF6B9D" />
            <stop offset="100%" stopColor="#C471ED" />
          </linearGradient>
          <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
            <feMerge>
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
        </defs>
        
        {/* Arrow from Frame 1 to Frame 2 */}
        <motion.path 
          d="M 115 85 Q 170 60 195 95" 
          stroke="url(#arrowGradient)" 
          strokeWidth="2.5" 
          fill="none"
          strokeLinecap="round"
          filter="url(#glow)"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 1, delay: 0.5 }}
        />
        {/* Glowing dot at arrowhead 1 */}
        <motion.circle 
          cx="195" 
          cy="95" 
          r="4" 
          fill="#FF6B9D"
          filter="url(#glow)"
          initial={{ opacity: 0 }}
          animate={{ opacity: [0.6, 1, 0.6] }}
          transition={{ duration: 1.5, repeat: Infinity, delay: 1.5 }}
        />
        
        {/* Arrow from Frame 2 to Frame 3 */}
        <motion.path 
          d="M 285 130 Q 320 180 295 210" 
          stroke="url(#arrowGradient)" 
          strokeWidth="2.5" 
          fill="none"
          strokeLinecap="round"
          filter="url(#glow)"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 1, delay: 1 }}
        />
        {/* Glowing dot at arrowhead 2 */}
        <motion.circle 
          cx="295" 
          cy="210" 
          r="4" 
          fill="#C471ED"
          filter="url(#glow)"
          initial={{ opacity: 0 }}
          animate={{ opacity: [0.6, 1, 0.6] }}
          transition={{ duration: 1.5, repeat: Infinity, delay: 2 }}
        />
      </svg>

      {/* Frame 1 - Top Left */}
      <motion.div 
        className="absolute top-6 left-6 sm:top-8 sm:left-8"
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, delay: 0.2 }}
      >
        <div className="w-20 h-16 sm:w-24 sm:h-20 rounded-lg bg-white/5 backdrop-blur-sm border border-white/20 p-1.5 shadow-lg">
          <div className="w-full h-full rounded bg-gradient-to-br from-sm-pink/30 to-sm-coral/30 flex items-center justify-center">
            <span className="text-[10px] sm:text-xs font-mono text-white/70">Frame 1</span>
          </div>
        </div>
      </motion.div>

      {/* Frame 2 - Center Right */}
      <motion.div 
        className="absolute top-12 right-8 sm:top-16 sm:right-12"
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, delay: 0.4 }}
      >
        <div className="w-20 h-16 sm:w-24 sm:h-20 rounded-lg bg-white/5 backdrop-blur-sm border border-white/20 p-1.5 shadow-lg">
          <div className="w-full h-full rounded bg-gradient-to-br from-sm-purple/30 to-sm-soft-purple/30 flex items-center justify-center">
            <span className="text-[10px] sm:text-xs font-mono text-white/70">Frame 2</span>
          </div>
        </div>
      </motion.div>

      {/* AI Processing Pill - Between Frame 2 and Frame 3 */}
      <motion.div 
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 sm:translate-x-0 sm:left-auto sm:right-16"
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, delay: 0.8 }}
      >
        <div className="relative px-3 py-1.5 sm:px-4 sm:py-2 rounded-full bg-sm-magenta/90 backdrop-blur-sm shadow-glow flex items-center gap-2 overflow-hidden">
          {/* Shimmer overlay */}
          <div className="absolute inset-0 animate-ai-shimmer" />
          <Wand2 className="w-3 h-3 sm:w-4 sm:h-4 text-white relative z-10" />
          <span className="text-xs sm:text-sm font-semibold text-white relative z-10">AI Processing</span>
          {/* Pulsing dots */}
          <div className="flex gap-0.5 relative z-10">
            <span className="w-1 h-1 sm:w-1.5 sm:h-1.5 rounded-full bg-white animate-pulse-dot-1" />
            <span className="w-1 h-1 sm:w-1.5 sm:h-1.5 rounded-full bg-white animate-pulse-dot-2" />
            <span className="w-1 h-1 sm:w-1.5 sm:h-1.5 rounded-full bg-white animate-pulse-dot-3" />
          </div>
        </div>
      </motion.div>

      {/* Frame 3 - Bottom Right */}
      <motion.div 
        className="absolute bottom-6 right-10 sm:bottom-8 sm:right-16"
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, delay: 0.6 }}
      >
        <div className="w-20 h-16 sm:w-24 sm:h-20 rounded-lg bg-white/5 backdrop-blur-sm border border-white/20 p-1.5 shadow-lg">
          <div className="w-full h-full rounded bg-gradient-to-br from-sm-mint/30 to-sm-soft-purple/30 flex items-center justify-center">
            <span className="text-[10px] sm:text-xs font-mono text-white/70">Frame 3</span>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

export function HeroSection() {
  return (
    <section className="pt-24 pb-20 px-4">
      <div className="max-w-7xl mx-auto">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Left Content */}
          <motion.div 
            className="text-center lg:text-left"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            {/* Dancing Mascot */}
            <div className="lg:hidden">
              <DancingMascot />
            </div>
            
            {/* Badge */}
            <motion.div
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 mb-6"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2 }}
            >
              <Sparkles className="w-4 h-4 text-sm-magenta" />
              <span className="text-sm font-medium text-white">🚀 Early Access — Launching Soon</span>
            </motion.div>

            {/* Headline with mascot on desktop */}
            <div className="relative">
              <div className="hidden lg:flex justify-center lg:justify-start mb-4">
                <DancingMascot />
              </div>
              <h1 className="font-display font-extrabold text-5xl md:text-6xl lg:text-7xl text-white leading-tight mb-6">
                Sketch it.{" "}
                <span className="gradient-text">
                  Ship it.
                </span>
              </h1>
            </div>

            {/* Subheadline */}
            <p className="text-xl text-white/80 mb-8 max-w-xl mx-auto lg:mx-0">
              Stop waiting weeks for polished animations. SketchMotion turns your rough
              storyboards into production-ready video — in minutes, not months. Your style, amplified by AI.
            </p>

            {/* CTA Button */}
            <div className="flex justify-center lg:justify-start">
              <Link to="/dashboard">
                <Button
                  size="lg"
                  className="bg-sm-magenta hover:bg-sm-magenta/90 text-white font-bold text-lg px-8 py-6 shadow-glow hover:shadow-glow-lg transition-all btn-press group"
                >
                  Start Creating
                  <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
                </Button>
              </Link>
            </div>

            {/* Origin Story - Pre-launch social proof */}
            <div className="mt-10 flex items-center gap-3 justify-center lg:justify-start">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-sm-pink to-sm-purple flex items-center justify-center">
                <Wand2 className="w-5 h-5 text-white" />
              </div>
              <p className="text-white/70 text-sm">
                Built by animators tired of the After Effects grind.
              </p>
            </div>
          </motion.div>

          {/* Right Content - Canvas Preview */}
          <motion.div 
            className="relative"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, delay: 0.3 }}
          >
            <GlassCard className="p-4 sm:p-6 relative overflow-hidden">
              <CanvasPreview />
            </GlassCard>

            {/* Decorative Elements */}
            <div className="absolute -top-4 -right-4 w-24 h-24 bg-sm-magenta/30 rounded-full blur-3xl" />
            <div className="absolute -bottom-4 -left-4 w-32 h-32 bg-sm-purple/30 rounded-full blur-3xl" />
          </motion.div>
        </div>
      </div>
    </section>
  );
}
