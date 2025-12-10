import { GlassCard } from "@/components/layout/GlassCard";
import { motion } from "framer-motion";
import {
  BenefitSpeedIcon,
  BenefitConsistencyIcon,
  CollaborationIcon,
  ExportIcon
} from "./SectionIcons";

const benefits = [
  {
    icon: BenefitSpeedIcon,
    heading: "Ship storyboards 3× faster",
    description: "Go from rough sketch to polished sequence in minutes, not days. AI handles the tedious cleanup so you can focus on storytelling."
  },
  {
    icon: BenefitConsistencyIcon,
    heading: "Keep style consistent across scenes",
    description: "Our AI learns your visual style and applies it uniformly, ensuring every frame feels cohesive from start to finish."
  },
  {
    icon: CollaborationIcon,
    heading: "Collaborate live with your team",
    description: "Work together in real-time with PMs, designers, and stakeholders. See live cursors, leave comments, and iterate faster."
  },
  {
    icon: ExportIcon,
    heading: "Export ready-to-share animations",
    description: "Generate polished MP4s, GIFs, or WebMs in minutes. Share instantly with clients or publish directly to your channels."
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

export function TestimonialsSection() {
  return (
    <section id="testimonials" className="py-20 px-4 scroll-mt-24">
      <div className="max-w-6xl mx-auto">
        {/* Section Header */}
        <motion.div 
          className="text-center mb-14"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 mb-6">
            <BenefitSpeedIcon className="w-4 h-4" />
            <span className="text-sm font-medium text-white">Why Creators Choose Us</span>
          </div>
          <h2 className="font-display font-bold text-4xl md:text-5xl text-white mb-4">
            Built for fast,{" "}
            <span className="gradient-text">controllable</span> animation
          </h2>
          <p className="text-xl text-white/70 max-w-2xl mx-auto">
            Everything you need to turn rough ideas into polished motion—without the steep learning curve.
          </p>
        </motion.div>

        {/* Benefits Grid */}
        <motion.div 
          className="grid md:grid-cols-2 gap-6"
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
        >
          {benefits.map((benefit, index) => {
            const Icon = benefit.icon;
            return (
              <motion.div key={index} variants={itemVariants}>
                <GlassCard className="p-6 h-full flex flex-col">
                  {/* Icon */}
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-sm-magenta/20 to-sm-purple/20 flex items-center justify-center mb-4 border border-white/10">
                    <Icon className="w-6 h-6 text-sm-magenta" />
                  </div>

                  {/* Heading */}
                  <h3 className="font-display font-bold text-xl text-white mb-2">
                    {benefit.heading}
                  </h3>

                  {/* Description */}
                  <p className="text-white/70 leading-relaxed">
                    {benefit.description}
                  </p>
                </GlassCard>
              </motion.div>
            );
          })}
        </motion.div>
      </div>
    </section>
  );
}
