import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { GlassCard } from "@/components/layout/GlassCard";
import { motion } from "framer-motion";
import { ArrowRight, Sparkles, Zap } from "lucide-react";

export function CTASection() {
  return (
    <section className="py-24 px-4">
      <div className="max-w-4xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <GlassCard className="p-8 md:p-12 text-center relative overflow-hidden">
            {/* Background Decorations */}
            <div className="absolute top-0 left-0 w-40 h-40 bg-sm-magenta/20 rounded-full blur-3xl" />
            <div className="absolute bottom-0 right-0 w-40 h-40 bg-sm-purple/20 rounded-full blur-3xl" />

            {/* Content */}
            <div className="relative z-10">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-sm-magenta/20 border border-sm-magenta/30 mb-6">
                <Zap className="w-4 h-4 text-sm-magenta" />
                <span className="text-sm font-medium text-white">Start Free Today</span>
              </div>

              <h2 className="font-display font-bold text-3xl md:text-5xl text-white mb-4">
                Ready to Bring Your{" "}
                <span className="gradient-text">Stories to Life?</span>
              </h2>

              <p className="text-lg text-white/70 mb-8 max-w-xl mx-auto">
                Join thousands of creators using SketchMotion to transform their ideas 
                into stunning animations. No credit card required.
              </p>

              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link to="/dashboard">
                  <Button 
                    size="lg"
                    className="bg-sm-magenta hover:bg-sm-magenta/90 text-white font-bold text-lg px-8 py-6 shadow-glow hover:shadow-glow-lg transition-all btn-press group"
                  >
                    <Sparkles className="w-5 h-5 mr-2" />
                    Start Creating Free
                    <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
                  </Button>
                </Link>
              </div>

              <p className="mt-6 text-sm text-white/50">
                Free plan includes 5 projects • No credit card required • Cancel anytime
              </p>
            </div>
          </GlassCard>
        </motion.div>
      </div>
    </section>
  );
}
