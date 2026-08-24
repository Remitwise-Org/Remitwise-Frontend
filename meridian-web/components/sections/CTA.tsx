'use client';

import { Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';
import { cardReveal, sectionReveal, sectionViewport } from '@/lib/animations/variants';

import { cn } from '@/lib/utils';
import {
  CTA_QUERY_PARAM,
  CTA_VARIANTS,
  DEFAULT_CTA_VARIANT,
  resolveCtaVariant,
  type CtaButtonStyle,
  type CtaVariant,
  type CtaVariantId,
} from '@/lib/cta-variants';

interface CTAProps {
  /**
   * Explicitly select a variant. When omitted, the variant is resolved from
   * the `?cta=` query param (e.g. `/?cta=member`), falling back to the
   * marketing variant.
   */
  variant?: CtaVariantId;
}

const BUTTON_STYLES: Record<CtaButtonStyle, string> = {
  solid:
    'bg-primary text-primary-foreground hover:bg-primary/90',
  outline:
    'border border-primary text-primary hover:bg-primary/5',
  ghost:
    'text-primary hover:bg-primary/10',
};

export function CTA({ variant }: CTAProps) {
  // An explicit prop needs no query-param lookup, so skip the Suspense
  // boundary useSearchParams requires and render directly.
  if (variant) {
    return <CTAContent variant={variant} />;
  }

  return (
    <Suspense fallback={<CTAContent variant={DEFAULT_CTA_VARIANT} />}>
      <CTAFromQuery />
    </Suspense>
  );
}

/** Resolves the variant from the URL, e.g. `/?cta=member`. */
function CTAFromQuery() {
  const searchParams = useSearchParams();
  const resolved = resolveCtaVariant(undefined, searchParams.get(CTA_QUERY_PARAM));
  return <CTAContent variant={resolved.id as CtaVariantId} />;
}

function CTAContent({ variant }: { variant: CtaVariantId }) {
  const { badge, heading, description, actions, footnote }: CtaVariant = CTA_VARIANTS[variant];

  return (
    <section aria-labelledby="cta-heading" className="py-20 px-4 max-w-4xl mx-auto">
      <motion.div
        variants={cardReveal}
        initial="hidden"
        whileInView="visible"
        viewport={sectionViewport}
        className="bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/30 rounded-3xl p-12 text-center relative overflow-hidden"
      >
        {/* Background decoration */}
        <div className="absolute inset-0 -z-10">
          <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 rounded-full blur-3xl -mr-32 -mt-32" />
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl -ml-32 -mb-32" />
        </div>

        {badge && (
          <motion.div
            variants={sectionReveal}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-primary/30 bg-primary/10 mb-6"
          >
            <span className="w-2 h-2 rounded-full bg-primary" aria-hidden="true" />
            <span className="text-sm font-medium text-primary">{badge}</span>
          </motion.div>
        )}

        <motion.h2
          id="cta-heading"
          variants={sectionReveal}
          className="text-4xl sm:text-5xl font-bold text-foreground mb-4"
        >
          {heading}
        </motion.h2>

        <motion.p
          variants={sectionReveal}
          className="text-lg text-muted-foreground mb-8 max-w-2xl mx-auto"
        >
          {description}
        </motion.p>

        <motion.div
          variants={sectionReveal}
          className="flex flex-col sm:flex-row gap-4 justify-center items-center"
        >
          {actions.map((action) => (
            <Link
              key={action.label}
              href={action.href}
              className={cn(
                'px-8 py-4 rounded-full font-semibold transition-all duration-200 inline-flex items-center gap-2 group',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background',
                BUTTON_STYLES[action.style]
              )}
            >
              {action.label}
              {action.withArrow && (
                <ArrowRight
                  aria-hidden="true"
                  className="w-4 h-4 group-hover:translate-x-1 transition-transform"
                />
              )}
            </Link>
          ))}
        </motion.div>

        {footnote && (
          <motion.p
            variants={sectionReveal}
            className="text-sm text-muted-foreground mt-8"
          >
            {footnote}
          </motion.p>
        )}
      </motion.div>
    </section>
  );
}
