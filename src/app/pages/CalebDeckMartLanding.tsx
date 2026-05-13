import { Link } from 'react-router';
import { Logo } from '../components/design-system/Logo';
import { Button } from '../components/design-system/Button';
import { ArrowRight, ArrowLeft, ShoppingBag, Truck, Clock, Shield, Package } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import SEO from '../components/SEO';

export default function CalebDeckMartLanding() {
  const { studentTheme } = useTheme();

  const features = [
    { icon: <ShoppingBag className="w-8 h-8 text-[#10B981]" />, title: 'Wide Product Range', description: 'From breakfast cereals and snacks to personal care, drinks, and clothing — CalebDeck Mart stocks what students actually need on campus.' },
    { icon: <Truck className="w-8 h-8 text-[#10B981]" />, title: 'Campus Delivery', description: 'Items are delivered around campus to your hostel area or agreed pickup point. No more walking to off-campus stores.' },
    { icon: <Clock className="w-8 h-8 text-[#10B981]" />, title: 'Fast & Simple', description: 'Browse, add to cart, checkout. CalebDeck Mart is designed for speed — order in under a minute and get your items delivered.' },
    { icon: <Shield className="w-8 h-8 text-[#10B981]" />, title: 'Student-Focused Pricing', description: 'Prices are set with students in mind. No markups, no surprises. What you see is what you pay.' },
    { icon: <Package className="w-8 h-8 text-[#10B981]" />, title: 'Restocked Regularly', description: 'Our inventory is refreshed frequently so popular items stay available when you need them.' },
  ];

  const categories = ['Breakfast & Cereals', 'Spreads & Snacks', 'Sugar & Beverages', 'Perfumes', 'Personal Care', 'Clothing & Accessories', 'Home & Living'];

  return (
    <div className="min-h-screen bg-background text-foreground transition-colors duration-300">
      <SEO
        title="CalebDeck Mart — Campus Grocery & Essentials Delivery | CalebDeck"
        description="CalebDeck Mart delivers groceries, snacks, drinks, personal care products, and everyday essentials to Caleb University students. A service of CalebDeck, powered by IGLOBALS TECHNOLOGY."
        canonical="https://calebdeck.com/calebdeck-mart"
        jsonLd={{
          '@type': 'Service',
          '@id': 'https://calebdeck.com/mart#service',
          name: 'CalebDeck Mart',
          url: 'https://calebdeck.com/mart',
          description: 'Campus grocery and essentials delivery for Caleb University students. A service of CalebDeck.',
          provider: { '@id': 'https://calebdeck.com/#application' },
          brand: { '@id': 'https://calebdeck.com/#application' },
          serviceType: 'Grocery Delivery',
          areaServed: { '@type': 'Place', name: 'Caleb University, Imota, Lagos, Nigeria' },
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
          <Link to="/mart">
            <Button variant="primary" className="bg-[#10B981] hover:bg-[#059669]">Shop Now <ArrowRight className="w-4 h-4 ml-2" /></Button>
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 py-16 md:py-24">
        <div className="max-w-3xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#10B981]/10 border border-[#10B981]/20 text-[#10B981] text-sm font-bold mb-6">
            <ShoppingBag className="w-4 h-4" />
            A CalebDeck Service
          </div>
          <h1 className="text-3xl sm:text-5xl md:text-6xl font-black tracking-tight leading-tight">
            CalebDeck Mart — Campus Grocery & Essentials Delivery
          </h1>
          <p className="text-lg sm:text-xl text-muted-foreground mt-6 leading-relaxed max-w-2xl">
            CalebDeck Mart is the grocery and essentials arm of <strong>CalebDeck</strong>, the smart campus platform for Caleb University students. Order snacks, drinks, personal care items, and more — delivered right to your hostel area.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 mt-8">
            <Link to="/mart">
              <Button variant="primary" size="lg" className="bg-[#10B981] hover:bg-[#059669] w-full sm:w-auto">
                Start Shopping <ArrowRight className="w-5 h-5 ml-2" />
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

      {/* Categories */}
      <section className="bg-muted/30 py-16 md:py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <h2 className="text-2xl sm:text-4xl font-black tracking-tight mb-10">What You Can Find on CalebDeck Mart</h2>
          <div className="flex flex-wrap gap-3">
            {categories.map((cat) => (
              <span key={cat} className={`px-5 py-2.5 rounded-full text-sm font-bold border-2 ${studentTheme === 'dark' ? 'bg-card border-border text-foreground' : 'bg-white border-emerald-100 text-gray-800'}`}>
                {cat}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 py-16 md:py-24">
        <h2 className="text-2xl sm:text-4xl font-black tracking-tight mb-12">Why Students Use CalebDeck Mart</h2>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature) => (
            <div key={feature.title} className={`p-8 rounded-3xl border-2 transition-all hover:shadow-lg ${studentTheme === 'dark' ? 'bg-card border-border' : 'bg-white border-gray-100'}`}>
              <div className="w-14 h-14 rounded-2xl bg-[#10B981]/10 flex items-center justify-center mb-5">
                {feature.icon}
              </div>
              <h3 className="text-xl font-black mb-3">{feature.title}</h3>
              <p className="text-muted-foreground leading-relaxed">{feature.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Ecosystem */}
      <section className={`py-16 md:py-24 ${studentTheme === 'dark' ? 'bg-card/50' : 'bg-gray-50'}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <h2 className="text-2xl sm:text-4xl font-black tracking-tight mb-6">Part of the CalebDeck Ecosystem</h2>
          <p className="text-lg text-muted-foreground leading-relaxed max-w-3xl mb-10">
            CalebDeck Mart is one of the services under <strong>CalebDeck</strong>, the smart campus platform built for Caleb University students. CalebDeck also offers <strong>food delivery</strong> from campus cafeterias and <strong>CalebNet</strong> for affordable data and airtime top-ups. All products are developed by <strong>IGLOBALS TECHNOLOGY</strong>.
          </p>
          <div className="flex flex-wrap gap-4">
            <Link to="/">
              <Button variant="secondary">CalebDeck Home</Button>
            </Link>
            <Link to="/calebnet-info">
              <Button variant="secondary" className="border-blue-500 text-blue-500 hover:bg-blue-500/10">About CalebNet</Button>
            </Link>
            <Link to="/cafeteria">
              <Button variant="secondary" className="border-[#FCD34D] text-[#FCD34D] hover:bg-[#FCD34D]/10">Order Food</Button>
            </Link>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 py-16 md:py-24">
        <div className="rounded-[2rem] overflow-hidden bg-[#10B981] p-8 sm:p-12 md:p-20 text-center">
          <h2 className="text-2xl sm:text-4xl font-black text-white mb-4">Ready to shop campus essentials?</h2>
          <p className="text-lg text-white/80 mb-8 max-w-2xl mx-auto">Browse CalebDeck Mart now and get groceries, snacks, and more delivered to your hostel.</p>
          <Link to="/mart">
            <Button variant="primary" size="lg" className="bg-white text-[#10B981] hover:bg-white/90 font-black">
              Open CalebDeck Mart <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-12 bg-muted/20">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex flex-wrap justify-center gap-6 text-sm font-semibold">
            <Link to="/" className="text-muted-foreground hover:text-secondary transition-colors">CalebDeck Home</Link>
            <Link to="/calebnet-info" className="text-muted-foreground hover:text-blue-500 transition-colors">CalebNet</Link>
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
