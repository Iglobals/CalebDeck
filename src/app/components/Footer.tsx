import { useLocation, Link } from 'react-router';
import { Logo } from './design-system/Logo';
import { BRAND_CONFIG, PRODUCTS_CONFIG } from '../../config/brand';

export default function Footer() {
  const location = useLocation();
  const current = location.pathname;

  const productLinks = [
    { to: '/', label: 'Home' },
    { to: PRODUCTS_CONFIG.fashion.path, label: PRODUCTS_CONFIG.fashion.name },
    { to: PRODUCTS_CONFIG.business.path, label: PRODUCTS_CONFIG.business.name },
    { to: PRODUCTS_CONFIG.gaming.anchor, label: `${PRODUCTS_CONFIG.gaming.name} (Coming Soon)` },
  ];

  const companyLinks = [
    { to: '/learn-more', label: 'Our Journey' },
    { to: '/support', label: 'Contact & Support' },
    { to: '/privacy', label: 'Privacy Policy' },
    { to: '/terms', label: 'Terms of Service' },
  ];

  return (
    <footer className="border-t border-border/80 bg-background text-foreground py-16 sm:py-20">
      <div className="max-w-7xl mx-auto px-6">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-12 pb-12 border-b border-border/70">
          <div className="md:col-span-5 space-y-4">
            <Logo size="md" />
            <p className="text-sm text-muted-foreground leading-relaxed max-w-sm">
              An evolving digital brand building consumer experiences across fashion and interactive social gaming.
            </p>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
              A product ecosystem by {BRAND_CONFIG.parentCompany}
            </p>
          </div>

          <div className="md:col-span-3 space-y-3">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-muted-foreground">
              Products
            </p>
            <ul className="space-y-2.5 text-sm font-medium">
              {productLinks.map((link) => (
                <li key={link.to}>
                  <Link
                    to={link.to}
                    className={`transition-colors hover:text-foreground ${
                      current === link.to ? 'text-foreground font-semibold' : 'text-muted-foreground'
                    }`}
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div className="md:col-span-4 space-y-3">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-muted-foreground">
              Company & Connect
            </p>
            <ul className="space-y-2.5 text-sm font-medium">
              {companyLinks.map((link) => (
                <li key={link.to}>
                  <Link
                    to={link.to}
                    className={`transition-colors hover:text-foreground ${
                      current === link.to ? 'text-foreground font-semibold' : 'text-muted-foreground'
                    }`}
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
              <li>
                <a
                  href={BRAND_CONFIG.socialXUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  X / Twitter ({BRAND_CONFIG.socialXHandle})
                </a>
              </li>
              <li>
                <a
                  href={BRAND_CONFIG.supportWhatsappUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  WhatsApp ({BRAND_CONFIG.supportPhoneDisplay})
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-muted-foreground">
          <p>© {new Date().getFullYear()} {BRAND_CONFIG.name}. All rights reserved.</p>
          <p>{BRAND_CONFIG.parentCompany}</p>
        </div>
      </div>
    </footer>
  );
}
