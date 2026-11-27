import { useNavigate, Link } from 'react-router';
import { ArrowLeft, MessageCircle } from 'lucide-react';
import { Logo } from '../components/design-system/Logo';
import Footer from '../components/Footer';
import SEO from '../components/SEO';
import { BRAND_CONFIG, PRODUCTS_CONFIG } from '../../config/brand';

export default function Support() {
  const navigate = useNavigate();

  const faqs = [
    {
      q: 'What products are currently active on CalebDeck?',
      a: `${PRODUCTS_CONFIG.fashion.name} (our curated fashion store) and ${PRODUCTS_CONFIG.business.name} (our brand visibility and product showcase platform for student entrepreneurs) are both active. We are also developing ${PRODUCTS_CONFIG.gaming.name}, an upcoming interactive social gaming experience.`,
    },
    {
      q: 'What happened to Food Delivery, CalebDeck Mart, and CalebNet?',
      a: 'Those campus services concluded operations as CalebDeck transitioned into its current product focus. No new food, Mart, or CalebNet orders are accepted, while all past order records and receipts remain safely preserved.',
    },
    {
      q: 'How does CalebDeck Fashion delivery work?',
      a: 'Fashion orders are fulfilled through structured batch schedules and Lagos/campus delivery options shown directly during Fashion checkout, with status updates visible in My Orders.',
    },
    {
      q: 'Is my i-CON Wallet balance and historical order history still safe?',
      a: 'Yes. Your i-CON account, wallet balance, and historical receipts remain intact and can be used on CalebDeck Fashion or viewed anytime under My Orders.',
    },
    {
      q: `Is ${PRODUCTS_CONFIG.gaming.name} available to play yet?`,
      a: `Not yet. ${PRODUCTS_CONFIG.gaming.name} is currently in development under the CalebDeck ecosystem. Official updates are shared through ${BRAND_CONFIG.socialXHandle}.`,
    },
  ];

  return (
    <div className="min-h-screen bg-background text-foreground transition-colors duration-300">
      <SEO
        title="Contact & Support | CalebDeck"
        description="Reach the CalebDeck team for help with CalebDeck Fashion orders, i-CON Wallet questions, historical receipts, or general brand enquiries."
        canonical="https://calebdeck.com/support"
      />
      <header className="sticky top-0 bg-background/95 backdrop-blur-sm z-50 border-b border-border transition-colors duration-300">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <button
            onClick={() => navigate(-1)}
            className="p-2 -ml-2 rounded-xl transition-colors hover:bg-muted"
            aria-label="Go back"
          >
            <ArrowLeft className="w-6 h-6 text-foreground" />
          </button>
          <div className="absolute left-1/2 -translate-x-1/2">
            <Logo size="md" />
          </div>
          <div className="w-10" />
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-16 space-y-12">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-muted-foreground mb-2">
            Customer Care &amp; Enquiries
          </p>
          <h1 className="text-4xl font-black tracking-tight mb-4">Contact &amp; Support</h1>
          <p className="text-muted-foreground text-base sm:text-lg leading-relaxed max-w-2xl">
            Need help with a {PRODUCTS_CONFIG.fashion.name} order, i-CON Wallet balance, historical order receipt, or partnership enquiry? Reach our team directly on WhatsApp.
          </p>

          <div className="mt-6 flex flex-wrap items-center gap-4">
            <a
              href={BRAND_CONFIG.supportWhatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2.5 px-6 py-3.5 rounded-full bg-[#25D366] text-black font-bold text-sm hover:opacity-90 transition-opacity"
            >
              <MessageCircle className="w-4 h-4" />
              WhatsApp Support ({BRAND_CONFIG.supportPhoneDisplay})
            </a>
            <Link
              to="/my-orders"
              className="inline-flex items-center gap-2 px-6 py-3.5 rounded-full border border-border font-semibold text-sm hover:bg-muted transition-colors"
            >
              View Order History
            </Link>
          </div>
        </div>

        <section className="border-t border-border pt-10 space-y-6">
          <h2 className="text-2xl font-bold">Frequently Asked Questions</h2>
          <dl className="divide-y divide-border">
            {faqs.map((item) => (
              <div key={item.q} className="py-5 space-y-2">
                <dt className="font-bold text-base sm:text-lg">{item.q}</dt>
                <dd className="text-sm sm:text-base text-muted-foreground leading-relaxed">
                  {item.a}
                </dd>
              </div>
            ))}
          </dl>
        </section>
      </main>

      <Footer />
    </div>
  );
}
