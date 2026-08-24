'use client';

import { motion } from 'framer-motion';
import { Brain, Shield, Zap, TrendingUp, Lock, Users } from 'lucide-react';
import { containerVariants, itemVariants, sectionReveal, sectionViewport } from '@/lib/animations/variants';

export function Features() {
  const features = [
    {
      icon: Brain,
      title: 'Smart Focus Tracking',
      description: 'AI-powered detection keeps you engaged without invasive monitoring.',
    },
    {
      icon: Shield,
      title: 'Secure & Private',
      description: 'All data encrypted on-chain with full control over your information.',
    },
    {
      icon: Zap,
      title: 'Instant Payouts',
      description: 'Withdraw earnings anytime with zero fees or waiting periods.',
    },
    {
      icon: TrendingUp,
      title: 'Transparent Analytics',
      description: 'Real-time dashboards showing your earnings, streaks, and progress.',
    },
    {
      icon: Lock,
      title: 'Multi-Signature Security',
      description: 'Enterprise-grade security protecting all your assets and accounts.',
    },
    {
      icon: Users,
      title: 'Community Rewards',
      description: 'Earn extra bonuses by referring friends and building your network.',
    },
  ];

  return (
    <section id="features" className="py-20 px-4 max-w-7xl mx-auto">
      <motion.div
        role="presentation"
        aria-hidden="true"
        variants={sectionReveal}
        initial="hidden"
        whileInView="visible"
        viewport={sectionViewport}
        className="text-center mb-16"
      >
        <h2 className="text-4xl sm:text-5xl font-bold text-foreground mb-4">Powerful Features</h2>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
          Everything you need to maximize productivity and earnings in one platform.
        </p>
      </motion.div>

      <motion.div
        role="presentation"
        aria-hidden="true"
        variants={containerVariants}
        initial="hidden"
        whileInView="visible"
        viewport={sectionViewport}
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
      >
        {features.map((feature) => {
          const Icon = feature.icon;
          return (
            <motion.div
              key={feature.title}
              variants={itemVariants}
              className="bg-card border border-border rounded-xl p-6 hover:border-primary/50 hover:shadow-lg hover:shadow-primary/10 transition-all duration-300"
            >
              <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                <Icon size={24} className="text-primary" />
              </div>
              <h3 className="font-semibold text-foreground text-lg mb-2">{feature.title}</h3>
              <p className="text-sm text-muted-foreground">{feature.description}</p>
            </motion.div>
          );
        })}
      </motion.div>
    </section>
  );
}
