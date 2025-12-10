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
    title: "Infinite Canvas",
    description: "Sketch freely on an endless workspace. Create frames, connect them with arrows, and build your story visually.",
    color: "from-sm-pink to-sm-coral"
  },
  {
    icon: AIPolishIcon,
    title: "AI Polish",
    description: "Transform rough sketches into polished artwork. Our AI applies consistent styles while preserving your creative intent.",
    color: "from-sm-soft-purple to-sm-purple"
  },
  {
    icon: AnimationIcon,
    title: "AI Animation",
    description: "Generate smooth animations from your storyboard sequences. Watch your static frames come to life in seconds.",
    color: "from-sm-magenta to-sm-pink"
  },
  {
    icon: CollaborationIcon,
    title: "Real-time Collaboration",
    description: "Work together with your team. See live cursors, leave comments, and iterate faster than ever.",
    color: "from-sm-mint to-sm-soft-purple"
  },
  {
    icon: VersionHistoryIcon,
    title: "Version History",
    description: "Never lose your work. Track every change, compare versions, and restore previous states instantly.",
    color: "from-sm-coral to-sm-pink"
  },
  {
    icon: ExportIcon,
    title: "Easy Export & Share",
    description: "Export to MP4, GIF, or WebM. Generate shareable links with optional password protection.",
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
            <span className="text-sm font-medium text-white">Powerful Features</span>
          </div>
          <h2 className="font-display font-bold text-4xl md:text-5xl text-white mb-4">
            Everything You Need to{" "}
            <span className="gradient-text">Animate</span>
          </h2>
          <p className="text-xl text-white/70 max-w-2xl mx-auto">
            From initial sketch to final export, SketchMotion provides all the tools 
            you need to bring your stories to life.
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
                Simple 3-Step Workflow
              </h3>
              <p className="text-white/70">From idea to animation in minutes</p>
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
                <h4 className="font-display font-bold text-lg text-white mb-2">Sketch</h4>
                <p className="text-white/60 text-sm">
                  Draw your frames or upload images. Connect them to define your sequence.
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
                <h4 className="font-display font-bold text-lg text-white mb-2">Polish</h4>
                <p className="text-white/60 text-sm">
                  AI enhances your artwork with consistent style and professional quality.
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
                <h4 className="font-display font-bold text-lg text-white mb-2">Animate</h4>
                <p className="text-white/60 text-sm">
                  Generate smooth animations and export your video in seconds.
                </p>
              </div>
            </div>
          </GlassCard>
        </motion.div>
      </div>
    </section>
  );
}
