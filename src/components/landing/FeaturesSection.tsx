import { GlassCard } from "@/components/layout/GlassCard";
import { motion } from "framer-motion";
import {
  StoryboardIcon,
  AIPolishIcon,
  AnimationIcon,
  CollaborationIcon,
  VersionHistoryIcon,
  ExportIcon,
  BenefitWorkflowIcon
} from "./SectionIcons";

const features = [
  {
    icon: StoryboardIcon,
    title: "Never run out of room",
    description: "Drop sketches anywhere. Connect frames with a click. Your storyboard grows with your story.",
    color: "from-sm-pink to-sm-coral"
  },
  {
    icon: AIPolishIcon,
    title: "Your style, elevated",
    description: "Rough lines become clean frames. AI learns your look — not some generic filter.",
    color: "from-sm-soft-purple to-sm-purple"
  },
  {
    icon: AnimationIcon,
    title: "Hit play, get video",
    description: "One click turns static frames into smooth, cinematic motion. 5 seconds, not 5 hours.",
    color: "from-sm-magenta to-sm-pink"
  },
  {
    icon: CollaborationIcon,
    title: "Iterate with your team, live",
    description: "See cursors move. Drop comments. Ship faster with everyone in the same canvas.",
    color: "from-sm-mint to-sm-soft-purple"
  },
  {
    icon: VersionHistoryIcon,
    title: "Undo anything, anytime",
    description: "Every version saved. Compare. Restore. Sleep easy.",
    color: "from-sm-coral to-sm-pink"
  },
  {
    icon: ExportIcon,
    title: "One-click delivery",
    description: "Export 4K MP4, GIF, or WebM. Share with a link. Password-protect if you're paranoid.",
    color: "from-sm-purple to-sm-magenta"
  }
];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1
    }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 }
};

export function FeaturesSection() {
  return (
    <section id="features" className="py-24 px-4 scroll-mt-24">
      <div className="max-w-7xl mx-auto">
        {/* Section Header */}
        <motion.div
          className="text-center mb-16"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 mb-6">
            <BenefitWorkflowIcon className="w-4 h-4" />
            <span className="text-sm font-medium text-white">✨ Your New Animation Stack</span>
          </div>
          <h2 className="font-display font-bold text-4xl md:text-5xl text-white mb-4">
            Less grind.{" "}
            <span className="gradient-text">More creating.</span>
          </h2>
          <p className="text-xl text-white/70 max-w-2xl mx-auto">
            Every tool you need to go from napkin sketch to shareable video — without the 47-tab workflow.
          </p>
        </motion.div>

        {/* Features Grid */}
        <motion.div 
          className="grid md:grid-cols-2 lg:grid-cols-3 gap-6"
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
        >
          {features.map((feature, index) => (
            <motion.div key={index} variants={itemVariants}>
              <GlassCard 
                hover 
                className="p-6 h-full group"
              >
                {/* Icon */}
                <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${feature.color} flex items-center justify-center mb-4 shadow-lg group-hover:shadow-glow transition-shadow`}>
                  <feature.icon className="w-7 h-7 text-white" />
                </div>

                {/* Content */}
                <h3 className="font-display font-bold text-xl text-white mb-2">
                  {feature.title}
                </h3>
                <p className="text-white/70 leading-relaxed">
                  {feature.description}
                </p>
              </GlassCard>
            </motion.div>
          ))}
        </motion.div>

        {/* Workflow Preview */}
        <motion.div 
          className="mt-20"
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
        >
          <GlassCard className="p-8 md:p-12">
            <div className="text-center mb-10">
              <h3 className="font-display font-bold text-2xl md:text-3xl text-white mb-2">
                Napkin to Netflix-ready in 3 steps
              </h3>
              <p className="text-white/70">No tutorials required. No steep learning curve. Just draw, polish, export.</p>
            </div>

            <div className="grid md:grid-cols-3 gap-8">
              {/* Step 1 */}
              <div className="text-center">
                <div className="relative inline-block mb-4">
                  <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-sm-pink to-sm-coral flex items-center justify-center shadow-lg">
                    <StoryboardIcon className="w-10 h-10" />
                  </div>
                  <div className="absolute -top-2 -right-2 w-8 h-8 rounded-full bg-white text-sm-charcoal font-bold flex items-center justify-center text-lg shadow-lg">
                    1
                  </div>
                </div>
                <h4 className="font-display font-bold text-lg text-white mb-2">Sketch or upload</h4>
                <p className="text-white/60 text-sm">
                  Drop your rough drawings onto the canvas. Doesn't matter if they're ugly. <span className="text-white/40">(30 seconds)</span>
                </p>
              </div>

              {/* Arrow */}
              <div className="hidden md:flex items-center justify-center">
                <svg className="w-8 h-8 text-white/30" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path d="M5 12h14M14 7l5 5-5 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>

              {/* Step 2 */}
              <div className="text-center md:col-start-2 md:row-start-1">
                <div className="relative inline-block mb-4">
                  <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-sm-soft-purple to-sm-purple flex items-center justify-center shadow-lg">
                    <AIPolishIcon className="w-10 h-10" />
                  </div>
                  <div className="absolute -top-2 -right-2 w-8 h-8 rounded-full bg-white text-sm-charcoal font-bold flex items-center justify-center text-lg shadow-lg">
                    2
                  </div>
                </div>
                <h4 className="font-display font-bold text-lg text-white mb-2">AI polishes</h4>
                <p className="text-white/60 text-sm">
                  One click. Your sketches get the studio treatment — with <em>your</em> style intact. <span className="text-white/40">(Instant)</span>
                </p>
              </div>

              {/* Step 3 */}
              <div className="text-center">
                <div className="relative inline-block mb-4">
                  <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-sm-magenta to-sm-pink flex items-center justify-center shadow-lg animate-pulse-glow">
                    <AnimationIcon className="w-10 h-10" />
                  </div>
                  <div className="absolute -top-2 -right-2 w-8 h-8 rounded-full bg-white text-sm-charcoal font-bold flex items-center justify-center text-lg shadow-lg">
                    3
                  </div>
                </div>
                <h4 className="font-display font-bold text-lg text-white mb-2">Export video</h4>
                <p className="text-white/60 text-sm">
                  Smooth motion, cinematic transitions. Download or share with a link. <span className="text-white/40">(Under 60 seconds)</span>
                </p>
              </div>
            </div>
          </GlassCard>
        </motion.div>
      </div>
    </section>
  );
}
