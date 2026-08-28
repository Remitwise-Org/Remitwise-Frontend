'use client';

import Link from 'next/link';
import { Menu, X } from 'lucide-react';
import { useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { ThemeToggle } from '@/components/theme-toggle';
import { useActiveSection } from '@/hooks/useActiveSection';

export function Header() {
  const [isOpen, setIsOpen] = useState(false);
  const activeSection = useActiveSection();

  const isActive = (id: string) => activeSection === id;
  const baseNavClassName =
    'text-sm font-medium text-foreground hover:text-primary transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50';

  return (
    <header className="fixed top-0 w-full z-50 bg-background/80 backdrop-blur-md border-b border-border">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <div className="flex items-center gap-2">
            <div className="text-2xl font-bold text-primary">M</div>
            <span className="text-lg font-semibold text-foreground">MERIDIAN</span>
          </div>

          {/* Navigation - Desktop */}
          <nav className="hidden md:flex items-center gap-8">
            <Link href="#focus" aria-current={isActive('focus') ? 'page' : undefined} className={baseNavClassName}>Focus</Link>
            <Link href="#stream" aria-current={isActive('stream') ? 'page' : undefined} className={baseNavClassName}>Stream</Link>
            <Link href="#pool" aria-current={isActive('pool') ? 'page' : undefined} className={baseNavClassName}>Pool</Link>
            <Link href="#features" aria-current={isActive('features') ? 'page' : undefined} className={baseNavClassName}>Features</Link>
          </nav>

          {/* CTA - Desktop */}
          <div className="hidden md:flex items-center gap-3">
            <ThemeToggle />
            <button className="px-6 py-2 text-sm font-medium text-foreground hover:text-primary transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50">Sign In</button>
            <button className="px-6 py-2 text-sm font-medium rounded-full bg-primary text-primary-foreground hover:bg-primary/90 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50">Get Started</button>
          </div>

          {/* Accessible Mobile Menu Wrapper via Radix Dialog */}
          <Dialog.Root open={isOpen} onOpenChange={setIsOpen}>
            <Dialog.Trigger asChild>
              <button
                aria-label="Toggle navigation menu"
                className="md:hidden p-2 text-foreground hover:text-primary transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
              >
                {isOpen ? <X size={24} aria-hidden="true" /> : <Menu size={24} aria-hidden="true" />}
              </button>
            </Dialog.Trigger>

            <Dialog.Portal>
              {/* Overlay background for modern backdrop blur consistency */}
              <Dialog.Overlay className="fixed inset-0 z-40 bg-background/40 backdrop-blur-sm md:hidden" />
              
              <Dialog.Content className="fixed top-16 left-0 right-0 z-40 bg-background border-b border-border px-4 pb-6 pt-2 space-y-2 md:hidden shadow-lg focus:outline-none">
                <Dialog.Title className="sr-only">Mobile Navigation Menu</Dialog.Title>
                <Dialog.Description className="sr-only">Access site sections and system configuration links.</Dialog.Description>
                
                <nav className="space-y-2">
                  <Link href="#focus" className="block px-4 py-2 text-sm font-medium text-foreground hover:text-primary transition-colors rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50" onClick={() => setIsOpen(false)}>Focus</Link>
                  <Link href="#stream" className="block px-4 py-2 text-sm font-medium text-foreground hover:text-primary transition-colors rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50" onClick={() => setIsOpen(false)}>Stream</Link>
                  <Link href="#pool" className="block px-4 py-2 text-sm font-medium text-foreground hover:text-primary transition-colors rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50" onClick={() => setIsOpen(false)}>Pool</Link>
                  <Link href="#features" className="block px-4 py-2 text-sm font-medium text-foreground hover:text-primary transition-colors rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50" onClick={() => setIsOpen(false)}>Features</Link>
                  
                  <div className="flex items-center justify-between gap-2 px-4 pt-2 border-t border-border/50">
                    <span className="text-xs uppercase tracking-wide text-muted-foreground">Theme</span>
                    <ThemeToggle />
                  </div>
                  <div className="pt-2">
                    <button className="w-full px-4 py-2 text-sm font-medium rounded-full bg-primary text-primary-foreground hover:bg-primary/90 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50">Get Started</button>
                  </div>
                </nav>
              </Dialog.Content>
            </Dialog.Portal>
          </Dialog.Root>
        </div>
      </div>
    </header>
  );
}
