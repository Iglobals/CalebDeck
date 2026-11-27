import { Link } from 'react-router';
import { ArrowLeft, ArrowRight, Shirt, Store, Sparkles } from 'lucide-react';
import { Logo } from '../components/design-system/Logo';
import { Button } from '../components/design-system/Button';
import Footer from '../components/Footer';
import SEO from '../components/SEO';
import {
  BRAND_CONFIG,
  PRODUCTS_CONFIG,
  HISTORICAL_IMPACT_METRICS,
} from '../../config/brand';

export default function LearnMore() {
  const breadcrumbJsonLd = {
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://calebdeck.com/' },
      { '@type': 'ListItem', position: 2, name: 'Our Journey', item: 'https://calebdeck.com/learn-more' },
    ],
  };

  return (
    <div className="min-h-screen bg-[#FAF9F6] dark:bg-[#0D0D10] text-[#121212] dark:text-[#FAF9F6] transition-colors duration-300">
      <SEO
        title="Our Journey — About CalebDeck | Fashion, Gaming & Digital Experiences"
        description="Read the story of CalebDeck: how we served over 1,000 students on campus and why we are evolving into CalebDeck Fashion and Caleb Life."
        canonical="https://calebdeck.com/learn-more"
        jsonLd={breadcrumbJsonLd}
      />

      <header className="sticky top-0 z-50 border-b border-black/[0.08] dark:border-white/[0.08] bg-[#FAF9F6]/90 dark:bg-[#0D0D10]/90 backdrop-blur-md">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-widest opacity-70 hover:opacity-100 transition-opacity"
          >
            <ArrowLeft className="w-4 h-4" />
            Home
          </Link>
          <Logo size="md" />
          <Link
            to={PRODUCTS_CONFIG.fashion.path}
            className="text-xs font-bold uppercase tracking-widest text-[#7C3AED] dark:text-[#C4B5FD] hover:underline"
          >
            Fashion
          </Link>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-16 sm:py-24 space-y-16">
        <section className="space-y-6">
          <p className="text-xs font-bold uppercase tracking-[0.22em] text-[#7C3AED] dark:text-[#A78BFA]">
            About {BRAND_CONFIG.name}
          </p>
          <h1
            className="text-4xl sm:text-6xl font-black tracking-[-0.03em] leading-[1.06]"
            style={{ fontFamily: 'Satoshi, Inter, sans-serif' }}
          >
            From everyday campus logistics to focused digital products.
          </h1>
          <p className="text-lg sm:text-xl text-[#121212]/72 dark:text-[#FAF9F6]/72 leading-relaxed">
            {BRAND_CONFIG.name} was founded under {BRAND_CONFIG.parentCompany} with a straightforward belief: thoughtful software should solve real problems and connect naturally with the people who use it.
          </p>
        </section>

        <section className="grid sm:grid-cols-2 gap-8 py-10 border-y border-black/10 dark:border-white/10">
          {HISTORICAL_IMPACT_METRICS.map((m) => (
            <div key={m.label}>
              <p
                className="text-5xl font-black tracking-tight mb-2"
                style={{ fontFamily: 'Satoshi, Inter, sans-serif' }}
              >
                {m.value}
              </p>
              <p className="font-bold text-lg mb-1">{m.label}</p>
              <p className="text-sm text-[#121212]/65 dark:text-[#FAF9F6]/65 leading-relaxed">
                {m.context}
              </p>
            </div>
          ))}
        </section>

        <section className="space-y-6 text-base sm:text-lg text-[#121212]/78 dark:text-[#FAF9F6]/78 leading-relaxed">
          <h2
            className="text-2xl sm:text-3xl font-black text-[#121212] dark:text-[#FAF9F6]"
            style={{ fontFamily: 'Satoshi, Inter, sans-serif' }}
          >
            Chapter I: What we built on campus
          </h2>
          <p>
            During our first operational chapter at Caleb University, CalebDeck ran high-frequency student services including cafeteria food delivery, CalebDeck Mart essentials, and CalebNet digital top-ups. Those services taught our team how to build reliable payment pipelines, manage fulfillment batches, and earn real customer trust one order at a time.
          </p>
          <p>
            As our long-term product roadmap matured, we made the deliberate decision to conclude Food Delivery, CalebDeck Mart, and CalebNet operations rather than stretch our focus across local logistics indefinitely. All historical customer order records and i-CON Wallet balances remain preserved.
          </p>
        </section>

        <section className="space-y-6 text-base sm:text-lg text-[#121212]/78 dark:text-[#FAF9F6]/78 leading-relaxed">
          <h2
            className="text-2xl sm:text-3xl font-black text-[#121212] dark:text-[#FAF9F6]"
            style={{ fontFamily: 'Satoshi, Inter, sans-serif' }}
          >
            Chapter II: Where CalebDeck is headed now
          </h2>
          <p>
            Today, CalebDeck focuses on three connected directions under one umbrella brand:
          </p>
          <div className="grid sm:grid-cols-3 gap-6 pt-2">
            <div className="p-6 rounded-2xl border border-black/10 dark:border-white/10 bg-white dark:bg-[#15151A] space-y-3">
              <div className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-widest text-emerald-600 dark:text-emerald-400">
                <Shirt className="w-3.5 h-3.5" />
                Active Product
              </div>
              <h3 className="text-xl font-black text-[#121212] dark:text-[#FAF9F6]">
                {PRODUCTS_CONFIG.fashion.name}
              </h3>
              <p className="text-sm text-[#121212]/70 dark:text-[#FAF9F6]/70 leading-relaxed">
                {PRODUCTS_CONFIG.fashion.description}
              </p>
              <Link
                to={PRODUCTS_CONFIG.fashion.path}
                className="inline-flex items-center gap-1.5 text-sm font-bold text-[#121212] dark:text-[#FAF9F6] pt-1 hover:underline"
              >
                Explore Fashion <ArrowRight className="w-4 h-4" />
              </Link>
            </div>

            <div className="p-6 rounded-2xl border border-black/10 dark:border-white/10 bg-white dark:bg-[#15151A] space-y-3">
              <div className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-widest text-[#7C3AED] dark:text-[#C4B5FD]">
                <Store className="w-3.5 h-3.5" />
                Active Platform
              </div>
              <h3 className="text-xl font-black text-[#121212] dark:text-[#FAF9F6]">
                {PRODUCTS_CONFIG.business.name}
              </h3>
              <p className="text-sm text-[#121212]/70 dark:text-[#FAF9F6]/70 leading-relaxed">
                {PRODUCTS_CONFIG.business.description}
              </p>
              <Link
                to={PRODUCTS_CONFIG.business.path}
                className="inline-flex items-center gap-1.5 text-sm font-bold text-[#7C3AED] dark:text-[#C4B5FD] pt-1 hover:underline"
              >
                List Your Brand <ArrowRight className="w-4 h-4" />
              </Link>
            </div>

            <div className="p-6 rounded-2xl border border-emerald-500/25 bg-[#09110E] text-white space-y-3">
              <div className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-widest text-emerald-300">
                <Sparkles className="w-3.5 h-3.5" />
                Coming Soon
              </div>
              <h3 className="text-xl font-black text-white" style={{ color: '#FFFFFF' }}>
                {PRODUCTS_CONFIG.gaming.name}
              </h3>
              <p className="text-sm text-white/75 leading-relaxed">
                {PRODUCTS_CONFIG.gaming.description}
              </p>
              <p className="text-xs text-emerald-300/80 pt-1 font-medium">
                Currently in active development — not yet publicly playable.
              </p>
            </div>
          </div>
        </section>

        <section className="pt-4">
          <Link to={PRODUCTS_CONFIG.fashion.path}>
            <Button
              variant="primary"
              size="lg"
              className="px-8 py-4 rounded-full bg-[#121212] text-[#FAF9F6] dark:bg-[#FAF9F6] dark:text-[#121212] hover:opacity-90 border-none font-bold inline-flex items-center gap-2"
            >
              Visit {PRODUCTS_CONFIG.fashion.name}
              <ArrowRight className="w-4 h-4" />
            </Button>
          </Link>
        </section>
      </main>

      <Footer />
    </div>
  );
}
