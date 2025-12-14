import { Link } from "react-router-dom";
import { GlassCard } from "@/components/layout/GlassCard";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  PricingSoloIcon,
  PricingTeamIcon,
  PricingStudioIcon
} from "./SectionIcons";

const plans = [
  {
    name: "Starter",
    price: "$0",
    period: "forever",
    description: "Kick the tires. No credit card, no tricks.",
    icon: PricingSoloIcon,
    color: "from-sm-pink to-sm-coral",
    features: [
      "5 projects (plenty to start)",
      "720p exports (good for socials)",
      "AI polish included",
      "No credit card required",
      "Small watermark",
    ],
    cta: "Start Free",
    popular: false,
    founding: false,
  },
  {
    name: "Founding Pro",
    price: "$12",
    originalPrice: "$19",
    period: "/mo forever",
    description: "For creators who ship. First 500 only.",
    icon: PricingTeamIcon,
    color: "from-sm-magenta to-sm-pink",
    features: [
      "Unlimited projects",
      "4K exports",
      "Advanced AI polish",
      "Priority support",
      "No watermarks",
      "Custom styles",
      "Version history",
    ],
    cta: "Claim Founding Price",
    popular: true,
    founding: true,
  },
  {
    name: "Founding Team",
    price: "$29",
    originalPrice: "$49",
    period: "/mo forever",
    description: "For studios ready to scale. First 100 only.",
    icon: PricingStudioIcon,
    color: "from-sm-purple to-sm-soft-purple",
    features: [
      "Everything in Pro",
      "Unlimited team members",
      "Real-time collaboration",
      "Admin controls",
      "API access",
      "Custom branding",
      "Dedicated support",
    ],
    cta: "Claim Founding Price",
    popular: false,
    founding: true,
  },
];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};

export function PricingSection() {
  return (
    <section id="pricing" className="py-24 px-4 scroll-mt-24">
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
            <PricingSoloIcon className="w-4 h-4" />
            <span className="text-sm font-medium text-white">🎁 Founding Member Pricing</span>
          </div>
          <h2 className="font-display font-bold text-4xl md:text-5xl text-white mb-4">
            Lock in{" "}
            <span className="gradient-text">early access rates</span>
          </h2>
          <p className="text-xl text-white/70 max-w-2xl mx-auto">
            First 500 members get lifetime discounts. Prices go up at launch.
          </p>
        </motion.div>

        {/* Pricing Cards */}
        <motion.div
          className="grid md:grid-cols-3 gap-6 lg:gap-8"
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
        >
          {plans.map((plan, index) => (
            <motion.div key={index} variants={itemVariants}>
              <GlassCard
                className={cn(
                  "p-6 h-full flex flex-col relative",
                  plan.popular && "ring-2 ring-sm-magenta"
                )}
              >
                {/* Popular Badge */}
                {plan.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full bg-sm-magenta text-white text-sm font-semibold shadow-glow">
                    Most Popular
                  </div>
                )}

                {/* Icon */}
                <div
                  className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${plan.color} flex items-center justify-center mb-4 shadow-lg`}
                >
                  <plan.icon className="w-7 h-7 text-white" />
                </div>

                {/* Plan Info */}
                <h3 className="font-display font-bold text-2xl text-white mb-1">
                  {plan.name}
                </h3>
                <p className="text-white/60 text-sm mb-4">{plan.description}</p>

                {/* Price */}
                <div className="mb-6">
                  {plan.originalPrice && (
                    <span className="text-white/40 line-through text-lg mr-2">
                      {plan.originalPrice}
                    </span>
                  )}
                  <span className="font-display font-bold text-4xl text-white">
                    {plan.price}
                  </span>
                  <span className="text-white/60">{plan.period}</span>
                </div>

                {/* Features */}
                <ul className="space-y-3 mb-8 flex-grow">
                  {plan.features.map((feature, i) => (
                    <li key={i} className="flex items-center gap-3">
                      <div className="w-5 h-5 rounded-full bg-sm-mint/20 flex items-center justify-center flex-shrink-0">
                        <Check className="w-3 h-3 text-sm-mint" />
                      </div>
                      <span className="text-white/80 text-sm">{feature}</span>
                    </li>
                  ))}
                </ul>

                {/* CTA */}
                <Link to="/dashboard">
                  <Button
                    className={cn(
                      "w-full font-semibold transition-all btn-press",
                      plan.popular
                        ? "bg-sm-magenta hover:bg-sm-magenta/90 text-white shadow-glow hover:shadow-glow-lg"
                        : "bg-white/10 hover:bg-white/20 text-white"
                    )}
                  >
                    {plan.cta}
                  </Button>
                </Link>
              </GlassCard>
            </motion.div>
          ))}
        </motion.div>

        {/* FAQ Link */}
        <motion.div
          className="text-center mt-12"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 0.3 }}
        >
          <p className="text-white/60">
            Have questions?{" "}
            <a href="#" className="text-sm-magenta hover:underline">
              Check our FAQ
            </a>{" "}
            or{" "}
            <a href="#" className="text-sm-magenta hover:underline">
              contact support
            </a>
          </p>
        </motion.div>
      </div>
    </section>
  );
}
