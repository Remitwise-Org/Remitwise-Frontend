import { Link } from 'wouter';

const NavLinks = () => {
  const links = [
    { name: 'Home', href: '/' },
    { name: 'Features', href: '#features' },
    { name: 'Pricing', href: '#pricing' },
    { name: 'About Us', href: '#about' },
  ];

  return (
    <nav className="hidden md:flex items-center gap-8">
      {links.map((link) => (
        <Link
          key={link.name}
          href={link.href}
          className="text-white/70 hover:text-white transition-colors text-sm font-medium"
        >
          {link.name}
        </Link>
      ))}
    </nav>
  );
};

export default NavLinks;
