'use client';

import { motion } from 'framer-motion';
import { itemVariants } from '@/lib/animations/variants';

export function EarningsCalculator() {
  return (
    <motion.div
      variants={itemVariants}
      className="bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/20 rounded-xl p-6 mt-8"
    >
      <h4 className="font-semibold text-foreground mb-4">Earnings Calculator</h4>
      <div className="space-y-4">
        <div>
          <label className="text-sm text-muted-foreground block mb-2">Monthly Salary</label>
          <div className="flex items-center gap-2">
            <span className="text-lg font-semibold text-primary">$5,000</span>
            <span className="text-sm text-muted-foreground">/month</span>
          </div>
        </div>
        <div>
          <label className="text-sm text-muted-foreground block mb-2">Per Second Rate</label>
          <div className="flex items-center gap-2">
            <span className="text-2xl font-bold text-primary">$0.0578</span>
            <span className="text-sm text-muted-foreground">/second</span>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
