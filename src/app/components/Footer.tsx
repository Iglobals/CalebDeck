import { useLocation, Link } from 'react-router';
import { ArrowUpRight } from 'lucide-react';
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
    <footer className="bg-[#0D0917] text-[#FAF8F4] border-t border-white/10 py-16 sm:py-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-12 pb-12 border-b border-white/10">
          <div className="md:col-span-5 space-y-4">
            <Logo size="lg" />
            <p className="text-sm text-white/65 leading-relaxed max-w-sm">
              An evolving digital consumer brand uniting curated apparel on{' '}
              <span className="text-white font-medium">{PRODUCTS_CONFIG.fashion.name}</span>, founder visibility on{' '}
              <span className="text-white font-medium">{PRODUCTS_CONFIG.business.name}</span>, and upcoming social play with{' '}
              <span className="text-[#FCD34D] font-medium">{PRODUCTS_CONFIG.gaming.name}</span>.
            </p>
            <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#C4B5FD]">
              {BRAND_CONFIG.parentCompany}
            </p>
          </div>

          <div className="md:col-span-3 space-y-3.5">
            <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#FCD34D]">
              Ecosystem
            </p>
            <ul className="space-y-2.5 text-sm font-medium">
              {productLinks.map((link) => (
                <li key={link.to}>
                  <Link
                    to={link.to}
                    className={`transition-colors hover:text-[#FCD34D] ${
                      current === link.to ? 'text-white font-bold' : 'text-white/68'
                    }`}
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div className="md:col-span-4 space-y-3.5">
            <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#FCD34D]">
              Company &amp; Direct Line
            </p>
            <ul className="space-y-2.5 text-sm font-medium">
              {companyLinks.map((link) => (
                <li key={link.to}>
                  <Link
                    to={link.to}
                    className={`transition-colors hover:text-[#FCD34D] ${
                      current === link.to ? 'text-white font-bold' : 'text-white/68'
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
                  className="inline-flex items-center gap-1 text-white/68 hover:text-[#FCD34D] transition-colors"
                >
                  <span>X / Twitter ({BRAND_CONFIG.socialXHandle})</span>
                  <ArrowUpRight className="w-3.5 h-3.5" />
                </a>
              </li>
              <li>
                <a
                  href={BRAND_CONFIG.supportWhatsappUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-white/68 hover:text-[#FCD34D] transition-colors"
                >
                  <span>WhatsApp ({BRAND_CONFIG.supportPhoneDisplay})</span>
                  <ArrowUpRight className="w-3.5 h-3.5" />
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-white/45">
          <p>© {new Date().getFullYear()} {BRAND_CONFIG.name}. All rights reserved.</p>
          <p>Built by {BRAND_CONFIG.parentCompany}</p>
        </div>
      </div>
    </footer>
  );
}
