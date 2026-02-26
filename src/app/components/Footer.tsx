import { useLocation, Link } from 'react-router';
import { Logo } from './design-system/Logo';
import { Phone } from 'lucide-react';

export default function Footer() {
  const location = useLocation();
  const current = location.pathname;

  // define links; always include home
  const links: Array<{ to: string; label: string }> = [
    { to: '/', label: 'Home' },
    { to: '/privacy', label: 'Privacy' },
    { to: '/terms', label: 'Terms' },
    { to: '/support', label: 'Support' },
  ];

  return (
    <footer className="border-t border-border py-20 bg-muted/20">
      <div className="max-w-7xl mx-auto px-6">
        <div className="flex flex-col md:flex-row justify-between items-center gap-12">
          <Logo size="md" />
          <div className="flex gap-10 text-sm font-semibold uppercase tracking-wider">
            {links
              .filter(l => l.to !== current) // hide current page link
              .map(l => (
                <Link
                  key={l.to}
                  to={l.to}
                  className="text-muted-foreground hover:text-secondary transition-colors"
                >
                  {l.label}
                </Link>
              ))}
          </div>
          <div className="text-sm text-muted-foreground font-medium">
            © 2026 CalebDeck. Premium campus delivery.
          </div>
        </div>
      </div>
    </footer>
  );
}