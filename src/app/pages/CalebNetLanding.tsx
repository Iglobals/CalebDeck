import { Link } from 'react-router';
import { Logo } from '../components/design-system/Logo';
import { Button } from '../components/design-system/Button';
import { ArrowRight, ArrowLeft, Wifi, Zap, Shield, Smartphone, Globe } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import SEO from '../components/SEO';

export default function CalebNetLanding() {
  const { studentTheme } = useTheme();

  const features = [
    { icon: <Zap className="w-8 h-8 text-blue-500" />, title: 'Instant Delivery', description: 'Data and airtime are delivered automatically to your phone number within seconds of payment. No manual processing needed.' },
    { icon: <Shield className="w-8 h-8 text-blue-500" />, title: 'Student-Friendly Prices', description: 'CalebNet offers SME data, direct data, and bulk-discounted airtime at prices designed for student budgets.' },
    { icon: <Smartphone className="w-8 h-8 text-blue-500" />, title: 'All Networks Supported', description: 'Top up MTN, Airtel, Glo, and 9Mobile data plans and airtime — all from one platform.' },
    { icon: <Globe className="w-8 h-8 text-blue-500" />, title: 'Multiple Plan Types', description: 'Choose between SME data (cheapest shared bundles), Direct data (standard plans), Awoof data (special deals), and more.' },
    { icon: <Wifi className="w-8 h-8 text-blue-500" />, title: 'Wallet System', description: 'Fund your CalebDeck wallet once and buy data or airtime anytime without repeating bank transfers.' },
  ];

  const planTypes = [
    { name: 'SME Data', description: 'The cheapest data option — shared bulk bundles. Works like normal data for browsing, streaming, and social media.' },
    { name: 'Direct Data', description: 'Standard corporate data gifted directly from the network. May cost slightly more but is generally more stable.' },
    { name: 'Awoof Data', description: 'Special discounted data deals that appear during promotional windows. Best value when available.' },
    { name: 'Airtime', description: 'Instant airtime top-up for any Nigerian network at discounted student rates.' },
  ];

  return (
    <div className="min-h-screen bg-background text-foreground transition-colors duration-300">
      <SEO
        title="CalebNet — Cheap Student Data & Airtime Plans | CalebDeck"
        description="CalebNet is the affordable data and airtime service by CalebDeck. Buy SME data, direct data, and discounted airtime for MTN, Airtel, Glo, and 9Mobile. Powered by IGLOBALS TECHNOLOGY."
        canonical="https://calebdeck.com/calebnet-info"
        jsonLd={{
          '@type': 'Service',
          '@id': 'https://calebdeck.com/calebnet#service',
          name: 'CalebNet',
          url: 'https://calebdeck.com/calebnet',
          description: 'Affordable student data plans and airtime top-up for MTN, Airtel, Glo, and 9Mobile. A digital service of CalebDeck.',
          provider: { '@id': 'https://calebdeck.com/#application' },
          brand: { '@id': 'https://calebdeck.com/#application' },
          serviceType: 'Telecommunications Service',
          areaServed: { '@type': 'Country', name: 'Nigeria' },
          isPartOf: { '@id': 'https://calebdeck.com/#website' },
        }}
      />

      {/* Nav */}
      <nav className="sticky top-0 bg-background/95 backdrop-blur-md z-50 border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3">
            <ArrowLeft className="w-5 h-5 text-muted-foreground" />
            <Logo size="md" />
          </Link>
          <Link to="/calebnet">
            <Button variant="primary" className="bg-blue-600 hover:bg-blue-700">Buy Data Now <ArrowRight className="w-4 h-4 ml-2" /></Button>
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 py-16 md:py-24">
        <div className="max-w-3xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-500 text-sm font-bold mb-6">
            <Wifi className="w-4 h-4" />
            A CalebDeck Service
          </div>
          <h1 className="text-3xl sm:text-5xl md:text-6xl font-black tracking-tight leading-tight">
            CalebNet — Affordable Student Data & Airtime
          </h1>
          <p className="text-lg sm:text-xl text-muted-foreground mt-6 leading-relaxed max-w-2xl">
            CalebNet is the data and airtime service built into <strong>CalebDeck</strong>, the smart campus platform for Caleb University students. Get discounted data plans for MTN, Airtel, Glo, and 9Mobile — funded by your CalebDeck wallet.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 mt-8">
            <Link to="/calebnet">
              <Button variant="primary" size="lg" className="bg-blue-600 hover:bg-blue-700 w-full sm:w-auto">
                Buy Data or Airtime <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
            </Link>
            <Link to="/">
              <Button variant="secondary" size="lg" className="w-full sm:w-auto">
                Back to CalebDeck
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Plan Types */}
      <section className="bg-muted/30 py-16 md:py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <h2 className="text-2xl sm:text-4xl font-black tracking-tight mb-4">Understanding CalebNet Plan Types</h2>
          <p className="text-lg text-muted-foreground mb-10 max-w-2xl">Not all data plans are the same. Here is what each CalebNet category means so you can pick the best option for your budget.</p>
          <div className="grid md:grid-cols-2 gap-6">
            {planTypes.map((plan) => (
              <div key={plan.name} className={`p-7 rounded-3xl border-2 ${studentTheme === 'dark' ? 'bg-card border-border' : 'bg-white border-blue-50'}`}>
                <h3 className="text-xl font-black mb-2 text-blue-500">{plan.name}</h3>
                <p className="text-muted-foreground leading-relaxed">{plan.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 py-16 md:py-24">
        <h2 className="text-2xl sm:text-4xl font-black tracking-tight mb-12">Why Students Choose CalebNet</h2>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature) => (
            <div key={feature.title} className={`p-8 rounded-3xl border-2 transition-all hover:shadow-lg ${studentTheme === 'dark' ? 'bg-card border-border' : 'bg-white border-gray-100'}`}>
              <div className="w-14 h-14 rounded-2xl bg-blue-500/10 flex items-center justify-center mb-5">
                {feature.icon}
              </div>
              <h3 className="text-xl font-black mb-3">{feature.title}</h3>
              <p className="text-muted-foreground leading-relaxed">{feature.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Supported Networks */}
      <section className={`py-16 md:py-20 ${studentTheme === 'dark' ? 'bg-card/50' : 'bg-blue-50/50'}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 text-center">
          <h2 className="text-2xl sm:text-4xl font-black tracking-tight mb-8">Supported Networks</h2>
          <div className="flex flex-wrap justify-center gap-6">
            {['MTN', 'Airtel', 'Glo', '9Mobile'].map((network) => (
              <div key={network} className={`px-10 py-5 rounded-2xl border-2 font-black text-xl ${studentTheme === 'dark' ? 'bg-background border-border' : 'bg-white border-gray-100 shadow-sm'}`}>
                {network}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Ecosystem */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 py-16 md:py-24">
        <h2 className="text-2xl sm:text-4xl font-black tracking-tight mb-6">Part of the CalebDeck Ecosystem</h2>
        <p className="text-lg text-muted-foreground leading-relaxed max-w-3xl mb-10">
          CalebNet is one of the digital services under <strong>CalebDeck</strong>, the smart campus platform built for Caleb University students. CalebDeck also offers <strong>food delivery</strong> from campus cafeterias and <strong>CalebDeck Mart</strong> for groceries and essentials. All products are developed by <strong>IGLOBALS TECHNOLOGY</strong>.
        </p>
        <div className="flex flex-wrap gap-4">
          <Link to="/">
            <Button variant="secondary">CalebDeck Home</Button>
          </Link>
          <Link to="/calebdeck-mart">
            <Button variant="secondary" className="border-[#10B981] text-[#10B981] hover:bg-[#10B981]/10">About CalebDeck Mart</Button>
          </Link>
          <Link to="/cafeteria">
            <Button variant="secondary" className="border-[#FCD34D] text-[#FCD34D] hover:bg-[#FCD34D]/10">Order Food</Button>
          </Link>
        </div>
      </section>

      {/* CTA */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 py-16 md:py-24">
        <div className="rounded-[2rem] overflow-hidden bg-blue-600 p-8 sm:p-12 md:p-20 text-center">
          <h2 className="text-2xl sm:text-4xl font-black text-white mb-4">Ready to save on data and airtime?</h2>
          <p className="text-lg text-white/80 mb-8 max-w-2xl mx-auto">Fund your wallet and start buying discounted plans for any Nigerian network through CalebNet.</p>
          <Link to="/calebnet">
            <Button variant="primary" size="lg" className="bg-white text-blue-600 hover:bg-white/90 font-black">
              Open CalebNet <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-12 bg-muted/20">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex flex-wrap justify-center gap-6 text-sm font-semibold">
            <Link to="/" className="text-muted-foreground hover:text-secondary transition-colors">CalebDeck Home</Link>
            <Link to="/calebdeck-mart" className="text-muted-foreground hover:text-[#10B981] transition-colors">CalebDeck Mart</Link>
            <Link to="/support" className="text-muted-foreground hover:text-secondary transition-colors">Support</Link>
          </div>
          <a href="https://iglobalstech.com.ng" target="_blank" rel="noopener noreferrer" className="text-xs text-muted-foreground hover:text-secondary transition-colors font-semibold">
            A product of <span className="font-black">IGLOBALS TECHNOLOGY</span>
          </a>
        </div>
      </footer>
    </div>
  );
}
