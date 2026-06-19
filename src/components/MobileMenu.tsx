

import { useState } from 'react';
import { Menu, X } from 'lucide-react';
import { Link } from 'wouter';

const MobileMenu = () => {
  const [isOpen, setIsOpen] = useState(false);

  const links = [
    { name: 'Home', href: '/' },
    { name: 'Features', href: '#features' },
    { name: 'Pricing', href: '#pricing' },
    { name: 'About Us', href: '#about' },
  ];

  return (
    <div className="md:hidden">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="p-2 text-white/70 hover:text-white transition-colors"
      >
        {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 right-0 bg-brand-dark/95 border-b border-white/10 backdrop-blur-xl z-50">
          <nav className="flex flex-col p-4 space-y-4">
            {links.map((link) => (
              <Link
                key={link.name}
                href={link.href}
                className="text-white/70 hover:text-white transition-colors text-lg font-medium"
                onClick={() => setIsOpen(false)}
              >
                {link.name}
              </Link>
            ))}
          </nav>
        </div>
      )}
    </div>
  );
};

export default MobileMenu;
