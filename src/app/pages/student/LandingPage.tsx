import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { Logo } from '../../components/design-system/Logo';
import { Button } from '../../components/design-system/Button';
import { Card } from '../../components/design-system/Card';
import { Clock, CheckCircle, Truck, Star, ArrowRight, Smartphone, Share, PlusSquare, MoreVertical, HelpCircle, MessageCircle, Utensils, ShoppingBag, X, Bike, Banknote, GraduationCap, Wifi } from 'lucide-react';
import { ImageWithFallback } from '../../components/figma/ImageWithFallback';
import { useTheme } from '../../../context/ThemeContext';
import { useAuth } from '../../../context/AuthContext';
import SEO from '../../components/SEO';
import { submitReview } from '../../../services/db';
import { toast } from 'react-toastify';
import { PaperBagHamburger } from '../../components/design-system/PaperBagHamburger';
import { SignedInHome } from './SignedInHome';

export default function LandingPage() {
  const { studentTheme } = useTheme();
  const { user } = useAuth();
  const isAuth = !!user;
  const navigate = useNavigate();
  const supportWhatsapp = 'https://wa.me/2348072550635';

  if (isAuth) {
    return <SignedInHome />;
  }

  // Global Review State
  const [isReviewOpen, setIsReviewOpen] = useState(false);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewText, setReviewText] = useState('');
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);
  const [pastOrder, setPastOrder] = useState<any>(null);

  useEffect(() => {
    try {
      const orderJson = localStorage.getItem('calebdeck_last_order');
      if (orderJson) {
        const order = JSON.parse(orderJson);
        const hasReviewed = localStorage.getItem(`reviewed_${order.orderId}`);
        const lastPromptStr = localStorage.getItem('last_global_review_prompt');
        const lastPrompt = lastPromptStr ? parseInt(lastPromptStr, 10) : 0;
        
        // Ensure prompt is shown at most twice a week (3.5 days = 302400000 ms)
        const canPrompt = (Date.now() - lastPrompt) > 302400000;

        if (!hasReviewed && canPrompt) {
          // Delay popup by 2 seconds so they have time to see the landing page
          setTimeout(() => {
            setPastOrder(order);
            setIsReviewOpen(true);
            localStorage.setItem('last_global_review_prompt', Date.now().toString());
          }, 2000);
        }
      }
    } catch(e) { }
  }, []);

  const handleReviewSubmit = async () => {
    if (!pastOrder) return;
    setIsSubmittingReview(true);
    try {
      await submitReview({
        orderId: pastOrder.orderId,
        rating: reviewRating,
        feedback: reviewText,
        riderName: pastOrder.riderName || pastOrder.assignedRiderId || 'Unknown Rider',
        cafeteria: pastOrder.cafeteria || 'Cafeteria',
        studentName: user?.fullName || 'Anonymous'
      });
      localStorage.setItem(`reviewed_${pastOrder.orderId}`, 'true');
      toast.success('Thanks for your feedback!');
      setIsReviewOpen(false);
    } catch(e) {
      toast.error('Failed to submit review');
    } finally {
      setIsSubmittingReview(false);
    }
  };

  // Smart PWA Routing: if launched from Home Screen, auto-redirect staff
  useEffect(() => {
    if (window.matchMedia('(display-mode: standalone)').matches && user) {
      if (user.role === 'ADMIN') {
        navigate('/admin', { replace: true });
      } else if (user.role === 'RIDER') {
        navigate('/rider', { replace: true });
      }
    }
  }, [user, navigate]);

  const howItWorks = [
    {
      icon: <CheckCircle className="w-8 h-8 text-secondary" />,
      title: 'Choose What You Need',
      description: 'Place a campus order in about 60 seconds, from meals to everyday essentials and whatever comes next.'
    },
    {
      icon: <Clock className="w-8 h-8 text-secondary" />,
      title: 'We Get It Ready',
      description: 'Your order is prepared, packed, or processed quickly depending on what you requested.'
    },
    {
      icon: <Truck className="w-8 h-8 text-secondary" />,
      title: 'Meet Your Rider',
      description: 'Your rider brings it to your hostel area or assigned pickup point. No queue, no campus runaround.'
    }
  ];

  const testimonials = [
    {
      quote: 'I ordered instead of joining the cafeteria line and my food came while I was still in the hostel.',
      name: 'Tolu',
      detail: '300L Law'
    },
    {
      quote: 'I like that it is not just meals. Small campus needs can come without me leaving my room area.',
      name: 'Daniel',
      detail: '200L Mass Comm'
    },
    {
      quote: 'Clear pickup point, smooth rider call, and no confusion. That is what made me order again.',
      name: 'Favour',
      detail: '100L Accounting'
    }
  ];

  const faqs = [
    {
      question: 'How long does delivery take?',
      answer: 'Most cafeteria orders arrive in about 20-30 minutes. Other campus orders depend on item availability, packing time, distance, weather, and order volume.'
    },
    {
      question: 'What happens if I stay in a female hostel?',
      answer: 'Because school rules restrict male riders from entering or moving close to female hostels, you must meet the rider yourself at a safe, school-approved pickup point.'
    },
    {
      question: 'Can I send someone else to collect my food?',
      answer: 'Please collect your order yourself whenever possible. CalebDeck can only confidently confirm delivery when the rider hands the order to the customer who placed it.'
    },
    {
      question: 'What should I use the Alternative Food box for?',
      answer: 'Use it only for backup food choices if your first option is unavailable, for example: "If jollof is finished, buy fried rice."'
    },
    {
      question: 'Is CalebDeck only for food?',
      answer: 'No. CalebDeck is built for campus convenience, so it can handle meals, essentials, and other useful student services as they become available.'
    },
    {
      question: 'What if my order has an issue?',
      answer: 'Contact support immediately from the site. Send your name, order ID, hostel, and a clear explanation so the team can trace it fast.'
    }
  ];


  return (
    <div className="min-h-screen bg-background text-foreground transition-colors duration-300">
      <SEO
        title="CalebDeck — Smart Campus Food, Grocery & Digital Services | Caleb University"
        description="CalebDeck is the smart campus platform for Caleb University. Order cafeteria food, shop groceries on CalebDeck Mart, and buy cheap student data with CalebNet."
        canonical="https://calebdeck.com/"
        jsonLd={{
          '@type': 'LocalBusiness',
          '@id': 'https://calebdeck.com/#localbusiness',
          name: 'CalebDeck',
          image: 'https://calebdeck.com/calebdeck-logo.jpeg',
          url: 'https://calebdeck.com',
          telephone: '+2348072550635',
          address: { '@type': 'PostalAddress', streetAddress: 'Caleb University Campus', addressLocality: 'Imota', addressRegion: 'Lagos', postalCode: '104102', addressCountry: 'NG' },
          geo: { '@type': 'GeoCoordinates', latitude: 6.6433, longitude: 3.6593 },
          parentOrganization: { '@id': 'https://iglobalstech.com.ng/#organization' },
          sameAs: ['https://x.com/iglobalstechinc'],
          description: 'Smart campus food delivery, grocery, and digital services for Caleb University students. A product of IGLOBALS TECHNOLOGY.'
        }}
      />

      {/* Navigation */}
      <nav className="sticky top-0 bg-background/95 backdrop-blur-md z-50 border-b border-border transition-colors duration-300">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <div className="flex-shrink-0">
            <Logo size="md" />
          </div>
          <div className="hidden xl:flex items-center gap-3 xl:gap-4">
            <a href="#how-it-works" className="text-foreground/80 hover:text-secondary transition-colors font-medium text-sm whitespace-nowrap">
              How it works
            </a>
            <a href="#faq" className="text-foreground/80 hover:text-secondary transition-colors font-medium text-sm whitespace-nowrap">
              FAQ
            </a>

            <div className="h-5 w-px bg-border" />

            <div className="flex items-center gap-1 xl:gap-2">
              {user?.role === 'ADMIN' && (
                <Link to="/admin">
                  <Button variant="secondary" className="border-[#7C3AED] text-[#7C3AED] text-xs px-2 xl:px-3 py-2 whitespace-nowrap">Admin</Button>
                </Link>
              )}
              {user?.role === 'RIDER' && (
                <Link to="/rider">
                  <Button variant="secondary" className="border-[#FCD34D] text-[#FCD34D] text-xs px-2 xl:px-3 py-2 whitespace-nowrap">Rider</Button>
                </Link>
              )}
              <Link to="/cafeteria">
                <Button variant="primary" className="text-xs px-2 xl:px-3 py-2 whitespace-nowrap">Order Food</Button>
              </Link>
              <Link to="/mart" className="text-sm font-bold text-[#10B981] hover:text-[#059669] transition-colors px-1 xl:px-2 py-1 whitespace-nowrap">
                Mart
              </Link>
              <Link to="/calebnet" className="text-sm font-bold text-blue-500 hover:text-blue-600 transition-colors px-1 xl:px-2 py-1 whitespace-nowrap">
                CalebNet
              </Link>
              {user ? (
                <Link to="/profile" className="text-sm font-bold text-[#7C3AED] hover:text-[#6D28D9] transition-colors px-1 xl:px-2 py-1 whitespace-nowrap flex items-center gap-1.5 bg-[#7C3AED]/10 rounded-lg">
                  i-CON Profile
                </Link>
              ) : (
                <Link to="/my-orders" className="text-sm font-bold text-[#A78BFA] hover:text-[#8B5CF6] transition-colors px-1 xl:px-2 py-1 whitespace-nowrap">
                  My Orders
                </Link>
              )}

              <div className="h-5 w-px bg-border mx-1" />

              <Link to="/rider/signup" className="text-xs font-bold text-[#10B981] border border-[#10B981]/30 rounded-lg px-2 xl:px-3 py-1.5 hover:bg-[#10B981]/10 transition-colors whitespace-nowrap">
                Earn as Rider
              </Link>
            </div>
          </div>
          <div className="xl:hidden flex items-center justify-end z-[999]">
            <PaperBagHamburger />
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 py-12 sm:py-16 md:py-24">
        <div className="grid md:grid-cols-2 gap-12 items-center">
          <div className="space-y-6 sm:space-y-8">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-secondary/10 border border-secondary/20 text-secondary text-sm font-semibold">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-secondary opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-secondary"></span>
              </span>
              Open for Campus Orders
            </div>
            <h1 className="text-3xl sm:text-5xl md:text-7xl leading-tight tracking-tight font-bold">
              Place your <br />
              campus orders <br />
              without stress.
            </h1>
            <p className="text-base sm:text-xl text-muted-foreground leading-relaxed max-w-lg">
              Order meals, snacks, essentials, and other campus needs through CalebDeck, then meet your rider at your hostel area or assigned pickup point.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 flex-wrap">
              <Link to="/cafeteria">
                <Button variant="primary" size="lg" className="w-full sm:w-auto px-10">
                  Order Food <ArrowRight className="w-5 h-5 ml-2" />
                </Button>
              </Link>
              <Link to="/mart">
                <Button variant="secondary" size="lg" className="w-full sm:w-auto border-[#10B981] text-[#10B981] hover:bg-[#10B981]/10">
                  Shop Mart <ArrowRight className="w-5 h-5 ml-2" />
                </Button>
              </Link>

              <Link to="/calebnet">
                <Button variant="secondary" size="lg" className="w-full sm:w-auto border-blue-500 text-blue-500 hover:bg-blue-500/10">
                  CalebNet Top-Up <Wifi className="w-5 h-5 ml-2" />
                </Button>
              </Link>
            </div>
            <div className="flex items-center gap-4 sm:gap-6 pt-4">
              <div className="text-center">
                <div className={`text-2xl sm:text-3xl font-bold ${isAuth ? 'text-foreground' : (studentTheme === 'dark' ? 'text-[#FAF9F6]' : 'text-gray-900')
                  }`}>20-30</div>
                <div className={`text-sm ${isAuth ? 'text-muted-foreground' : (studentTheme === 'dark' ? 'text-[#9C8F7F]' : 'text-gray-600')
                  }`}>Food ETA</div>
              </div>
              <div className={`w-px h-12 ${isAuth ? 'bg-border' : (studentTheme === 'dark' ? 'bg-[#333333]' : 'bg-gray-200')
                }`}></div>
              <div className="text-center">
                <div className={`text-2xl sm:text-3xl font-bold ${isAuth ? 'text-foreground' : (studentTheme === 'dark' ? 'text-[#FAF9F6]' : 'text-gray-900')
                  }`}>50+</div>
                <div className={`text-sm flex items-center justify-center gap-1 ${isAuth ? 'text-muted-foreground' : (studentTheme === 'dark' ? 'text-[#9C8F7F]' : 'text-gray-600')
                  }`}>
                  Orders
                </div>
              </div>
              <div className={`w-px h-12 ${isAuth ? 'bg-border' : (studentTheme === 'dark' ? 'bg-[#333333]' : 'bg-gray-200')
                }`}></div>
              <div className="text-center">
                <div className={`text-2xl sm:text-3xl font-bold ${isAuth ? 'text-foreground' : (studentTheme === 'dark' ? 'text-[#FAF9F6]' : 'text-gray-900')
                  }`}>Campus</div>
                <div className={`text-sm ${isAuth ? 'text-muted-foreground' : (studentTheme === 'dark' ? 'text-[#9C8F7F]' : 'text-gray-600')
                  }`}>Convenience</div>
              </div>
            </div>
          </div>
          <div className="relative">
            <div className="relative rounded-3xl overflow-hidden" style={{ boxShadow: '0 20px 60px rgba(0, 0, 0, 0.5)' }}>
              <ImageWithFallback
                src="/old-cafe-pic.jpeg"
                alt="Old Cafeteria"
                className="w-full h-full object-cover"
                loading="eager"
              />
              <div className="absolute bottom-6 right-6 bg-[#FCD34D] text-[#1A1A1A] px-6 py-3 rounded-xl font-bold shadow-lg">
                Food from N750
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Services Section */}
      <section className="py-16 md:py-24 max-w-7xl mx-auto px-4 sm:px-6">
        <div className="grid md:grid-cols-3 gap-8">
          <Link to="/cafeteria" className="group">
            <div className={`p-8 rounded-3xl border-2 transition-all duration-300 hover:scale-[1.02] shadow-sm hover:shadow-xl h-full ${isAuth ? 'bg-card border-border hover:border-[#FCD34D]/50' : (studentTheme === 'dark' ? 'bg-[#1A1A1A] border-[#FCD34D]/20' : 'bg-amber-50/50 border-amber-200')}`}>
              <div className="w-16 h-16 rounded-2xl bg-[#FCD34D]/20 flex items-center justify-center mb-6">
                <Utensils className="w-8 h-8 text-[#FCD34D]" />
              </div>
              <h3 className={`text-2xl font-bold mb-3 ${isAuth ? 'text-foreground' : (studentTheme === 'dark' ? 'text-[#FAF9F6]' : 'text-gray-900')}`}>Food Delivery</h3>
              <p className={`text-lg mb-6 ${isAuth ? 'text-muted-foreground' : (studentTheme === 'dark' ? 'text-[#9C8F7F]' : 'text-gray-600')}`}>Hot meals from campus cafeterias delivered to your hostel area or agreed pickup point.</p>
              <span className="text-[#FCD34D] font-bold flex items-center gap-2 group-hover:gap-4 transition-all">Order Now <ArrowRight className="w-5 h-5" /></span>
            </div>
          </Link>
          
          <Link to="/mart" className="group">
            <div className={`p-8 rounded-3xl border-2 transition-all duration-300 hover:scale-[1.02] shadow-sm hover:shadow-xl h-full ${isAuth ? 'bg-card border-border hover:border-[#10B981]/50' : (studentTheme === 'dark' ? 'bg-[#1A1A1A] border-[#10B981]/20' : 'bg-emerald-50/50 border-emerald-200')}`}>
              <div className="w-16 h-16 rounded-2xl bg-[#10B981]/20 flex items-center justify-center mb-6">
                <ShoppingBag className="w-8 h-8 text-[#10B981]" />
              </div>
              <h3 className={`text-2xl font-bold mb-3 ${isAuth ? 'text-foreground' : (studentTheme === 'dark' ? 'text-[#FAF9F6]' : 'text-gray-900')}`}>CalebDeck Mart</h3>
              <p className={`text-lg mb-6 ${isAuth ? 'text-muted-foreground' : (studentTheme === 'dark' ? 'text-[#9C8F7F]' : 'text-gray-600')}`}>Groceries, snacks, drinks, and essentials delivered around campus when you need them.</p>
              <span className="text-[#10B981] font-bold flex items-center gap-2 group-hover:gap-4 transition-all">Shop Mart <ArrowRight className="w-5 h-5" /></span>
            </div>
          </Link>

          <Link to="/calebnet" className="group">
            <div className={`p-8 rounded-3xl border-2 transition-all duration-300 hover:scale-[1.02] shadow-sm hover:shadow-xl h-full ${isAuth ? 'bg-card border-border hover:border-blue-500/50' : (studentTheme === 'dark' ? 'bg-[#1A1A1A] border-blue-500/20' : 'bg-blue-50/50 border-blue-200')}`}>
              <div className="w-16 h-16 rounded-2xl bg-blue-500/20 flex items-center justify-center mb-6">
                <Wifi className="w-8 h-8 text-blue-500" />
              </div>
              <h3 className={`text-2xl font-bold mb-3 ${isAuth ? 'text-foreground' : (studentTheme === 'dark' ? 'text-[#FAF9F6]' : 'text-gray-900')}`}>CalebNet</h3>
              <p className={`text-lg mb-6 ${isAuth ? 'text-muted-foreground' : (studentTheme === 'dark' ? 'text-[#9C8F7F]' : 'text-gray-600')}`}>Instant data and airtime top-up for MTN, Airtel, Glo, and 9Mobile directly from CalebDeck.</p>
              <span className="text-blue-500 font-bold flex items-center gap-2 group-hover:gap-4 transition-all">Top Up <ArrowRight className="w-5 h-5" /></span>
            </div>
          </Link>
        </div>
      </section>

      {/* Social Proof */}
      <section className="py-16 md:py-24 max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6 mb-10">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-secondary/10 border border-secondary/20 text-secondary text-sm font-bold mb-5">
              <Star className="w-4 h-4 fill-current" />
              Trusted by students
            </div>
            <h2 className="text-2xl sm:text-4xl md:text-5xl font-black tracking-tight">
              50+ campus orders and counting.
            </h2>
          </div>
          <p className="text-lg text-muted-foreground leading-relaxed max-w-xl">
            Real students are already using CalebDeck to save food runs, snack runs, and those small stressful errands.
          </p>
        </div>
        <div className="grid md:grid-cols-3 gap-6">
          {testimonials.map((testimonial) => (
            <Card key={testimonial.name} className="border border-border/60 bg-card/50 shadow-sm">
              <div className="flex gap-1 text-[#FCD34D] mb-5">
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star key={star} className="w-4 h-4 fill-current" />
                ))}
              </div>
              <p className="text-lg leading-relaxed mb-6">"{testimonial.quote}"</p>
              <div>
                <p className="font-black">{testimonial.name}</p>
                <p className="text-sm text-muted-foreground font-bold uppercase tracking-widest">{testimonial.detail}</p>
              </div>
            </Card>
          ))}
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="bg-muted/30 py-24 md:py-32">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-2xl sm:text-4xl md:text-6xl mb-6 font-bold">
              How CalebDeck Works
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">Three simple steps to handle campus needs without leaving your flow.</p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {howItWorks.map((step, index) => (
              <Card key={index} className="border-none bg-card/40 hover:bg-card shadow-sm hover:shadow-xl transition-all duration-500">
                <div className="space-y-6">
                  <div className="w-20 h-20 rounded-[2rem] bg-secondary/10 flex items-center justify-center transition-transform duration-500 group-hover:scale-110">
                    {step.icon}
                  </div>
                  <h3 className="text-2xl font-bold">{step.title}</h3>
                  <p className="text-muted-foreground leading-relaxed text-lg">{step.description}</p>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Rider Opportunity */}
      <section className={`py-16 md:py-24 ${isAuth ? 'bg-muted/30' : (studentTheme === 'dark' ? 'bg-[#101A17]' : 'bg-emerald-50/70')}`}>
        <div className="grid lg:grid-cols-[1.05fr_0.95fr] gap-8 lg:gap-12 items-center max-w-7xl mx-auto px-4 sm:px-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#10B981]/10 border border-[#10B981]/20 text-[#10B981] text-sm font-bold mb-5">
              <Bike className="w-4 h-4" />
              Rider Opportunity
            </div>
            <h2 className="text-2xl sm:text-4xl md:text-5xl font-black tracking-tight">
              Earn on campus with CalebDeck.
            </h2>
            <p className="text-lg text-muted-foreground leading-relaxed mt-5 max-w-2xl">
              Become a CalebDeck rider agent and earn up to ₦60k monthly helping students receive meals, mart items, and campus orders on time.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 mt-8">
              <Link to="/rider/signup">
                <Button variant="primary" size="lg" className="w-full sm:w-auto bg-[#10B981] text-white hover:bg-[#059669]">
                  Apply as a Rider <ArrowRight className="w-5 h-5 ml-2" />
                </Button>
              </Link>
            </div>
          </div>
          <div className="h-full">
            <div className="grid gap-4">
              <div className={`rounded-2xl border p-5 ${isAuth ? 'bg-card border-border' : (studentTheme === 'dark' ? 'bg-black/20 border-white/10' : 'bg-white border-emerald-100')}`}>
                <Banknote className="w-7 h-7 text-[#10B981] mb-4" />
                <p className="text-2xl font-black">Up to ₦60k monthly</p>
                <p className="text-sm text-muted-foreground mt-2">A clear earning path for consistent campus riders.</p>
              </div>
              <div className={`rounded-2xl border p-5 ${isAuth ? 'bg-card border-border' : (studentTheme === 'dark' ? 'bg-black/20 border-white/10' : 'bg-white border-emerald-100')}`}>
                <GraduationCap className="w-7 h-7 text-[#7C3AED] mb-4" />
                <p className="text-2xl font-black">For Caleb students</p>
                <p className="text-sm text-muted-foreground mt-2">Best for students who know campus routes and pickup points.</p>
              </div>
              <div className={`rounded-2xl border p-5 ${isAuth ? 'bg-card border-border' : (studentTheme === 'dark' ? 'bg-black/20 border-white/10' : 'bg-white border-emerald-100')}`}>
                <CheckCircle className="w-7 h-7 text-[#FCD34D] mb-4" />
                <p className="text-2xl font-black">Responsibility matters</p>
                <p className="text-sm text-muted-foreground mt-2">Be available, careful with orders, and respectful with every customer.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="py-20 md:py-28 max-w-7xl mx-auto px-4 sm:px-6">
        <div className="text-left md:text-center max-w-3xl mx-auto mb-12 md:mb-16">
            <div className="inline-flex items-center justify-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-sm font-bold">
              <HelpCircle className="w-4 h-4" />
              Questions students ask
            </div>
            <h2 className="text-2xl sm:text-4xl md:text-5xl font-black tracking-tight mt-5">
              Clear answers before you order.
            </h2>
            <p className="text-lg text-muted-foreground leading-relaxed mt-5">
              CalebDeck works best when pickup points, backup food choices, and support details are clear from the start.
            </p>
        </div>
        <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-5 lg:gap-6">
            {faqs.map((faq) => (
              <Card key={faq.question} className="border border-border/60 bg-card/50 shadow-sm h-full">
                <h3 className="text-lg font-black mb-2">{faq.question}</h3>
                <p className="text-muted-foreground leading-relaxed">{faq.answer}</p>
              </Card>
            ))}
        </div>
      </section>

      {/* CTA Section */}
      <section className="max-w-7xl mx-auto px-6 py-16 md:py-24">
        <div className="relative rounded-[2rem] sm:rounded-[3rem] overflow-hidden bg-secondary p-8 sm:p-12 md:p-24 text-center">
          <div className="text-center absolute inset-0 bg-gradient-to-br from-secondary to-secondary/80"></div>
          <div className="relative z-10  space-y-6">
            <h2 className="text-2xl sm:text-3xl md:text-5xl font-bold text-secondary-foreground">
              Ready to skip the campus runaround?
            </h2>
            <p className="text-base sm:text-xl text-secondary-foreground/80 max-w-2xl mx-auto ">
              Join 50+ campus orders already saving time with CalebDeck. Your next campus need can come to you.
            </p>
            <Link to="/cafeteria">
              <Button
                variant="primary"
                size="lg"
                className="bg-primary text-primary-foreground hover:bg-primary/90 "
              >
                Start Ordering Now
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* PWA Installation */}
      <section id="install-app" className={`py-20 md:py-28 ${isAuth ? 'bg-background' : (studentTheme === 'dark' ? 'bg-[#0A0A0A]' : 'bg-white')}`}>
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-12">
            <h2 className={`text-2xl sm:text-4xl md:text-5xl mb-5 font-black tracking-tight ${isAuth ? 'text-foreground' : (studentTheme === 'dark' ? 'text-[#FAF9F6]' : 'text-gray-900')}`}>
              Get Faster Access Next Time
            </h2>
            <p className={`text-xl max-w-2xl mx-auto ${studentTheme === 'dark' ? 'text-[#9C8F7F]' : 'text-gray-500'}`}>Install CalebDeck on your home screen after your first order. No app store required.</p>
          </div>

          <div className="grid md:grid-cols-2 gap-8 lg:gap-12 items-start">
            <div className={`p-8 md:p-10 rounded-[3rem] border-2 transition-all duration-500 hover:shadow-xl relative overflow-hidden ${isAuth ? 'bg-card border-border' : (studentTheme === 'dark' ? 'bg-[#1A1A1A] border-[#222222]' : 'bg-gray-50 border-gray-100')}`}>
              <div className="flex items-center gap-4 mb-8">
                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${isAuth ? 'bg-muted text-foreground' : (studentTheme === 'dark' ? 'bg-[#333333] text-[#FAF9F6]' : 'bg-white shadow-sm text-gray-900 border border-gray-100')}`}>
                  <Smartphone className="w-7 h-7" />
                </div>
                <h3 className={`text-2xl font-black ${isAuth ? 'text-foreground' : (studentTheme === 'dark' ? 'text-[#FAF9F6]' : 'text-gray-900')}`}>iOS Installation</h3>
              </div>
              <ol className="space-y-6 mb-10">
                <li className="flex gap-4 items-start">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold flex-shrink-0 ${isAuth ? 'bg-muted text-foreground' : (studentTheme === 'dark' ? 'bg-[#333333] text-[#FAF9F6]' : 'bg-gray-200 text-gray-900')}`}>1</div>
                  <p className={`text-lg leading-relaxed flex-1 ${isAuth ? 'text-muted-foreground' : (studentTheme === 'dark' ? 'text-[#9C8F7F]' : 'text-gray-600')}`}>Open CalebDeck in <strong>Safari</strong>.</p>
                </li>
                <li className="flex gap-4 items-start">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold flex-shrink-0 ${isAuth ? 'bg-muted text-foreground' : (studentTheme === 'dark' ? 'bg-[#333333] text-[#FAF9F6]' : 'bg-gray-200 text-gray-900')}`}>2</div>
                  <p className={`text-lg leading-relaxed flex-1 ${isAuth ? 'text-muted-foreground' : (studentTheme === 'dark' ? 'text-[#9C8F7F]' : 'text-gray-600')}`}>Tap <Share className="w-5 h-5 inline mx-1 -mt-1 text-primary" /> <strong>Share</strong>, then <PlusSquare className="w-5 h-5 inline mx-1 -mt-1" /> <strong>Add to Home Screen</strong>.</p>
                </li>
              </ol>

              <div className={`relative rounded-3xl overflow-hidden aspect-video border-4 shadow-inner flex items-center justify-center ${isAuth ? 'bg-background border-border' : (studentTheme === 'dark' ? 'bg-[#0A0A0A] border-[#222222]' : 'bg-gray-200 border-white')}`}>
                <ImageWithFallback src="https://res.cloudinary.com/dpwx4djzx/image/upload/v1772831572/iphone-mock_gehuma.jpg" alt="iOS Install Mockup" className="absolute inset-0 w-full h-full object-contain" />
              </div>
            </div>

            <div className={`p-8 md:p-10 rounded-[3rem] border-2 transition-all duration-500 hover:shadow-xl relative overflow-hidden ${isAuth ? 'bg-card border-border' : (studentTheme === 'dark' ? 'bg-[#1A1A1A] border-[#222222]' : 'bg-gray-50 border-gray-100')}`}>
              <div className="flex items-center gap-4 mb-8">
                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${isAuth ? 'bg-[#10B981]/10 text-[#10B981]' : (studentTheme === 'dark' ? 'bg-[#10B981]/20 text-[#10B981]' : 'bg-green-100 text-green-600 shadow-sm border border-green-50')}`}>
                  <Smartphone className="w-7 h-7" />
                </div>
                <h3 className={`text-2xl font-black ${isAuth ? 'text-foreground' : (studentTheme === 'dark' ? 'text-[#FAF9F6]' : 'text-gray-900')}`}>Android Installation</h3>
              </div>
              <ol className="space-y-6 mb-10">
                <li className="flex gap-4 items-start">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold flex-shrink-0 ${isAuth ? 'bg-muted text-foreground' : (studentTheme === 'dark' ? 'bg-[#333333] text-[#FAF9F6]' : 'bg-gray-200 text-gray-900')}`}>1</div>
                  <p className={`text-lg leading-relaxed flex-1 ${isAuth ? 'text-muted-foreground' : (studentTheme === 'dark' ? 'text-[#9C8F7F]' : 'text-gray-600')}`}>Open CalebDeck in <strong>Chrome</strong>.</p>
                </li>
                <li className="flex gap-4 items-start">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold flex-shrink-0 ${isAuth ? 'bg-muted text-foreground' : (studentTheme === 'dark' ? 'bg-[#333333] text-[#FAF9F6]' : 'bg-gray-200 text-gray-900')}`}>2</div>
                  <p className={`text-lg leading-relaxed flex-1 ${isAuth ? 'text-muted-foreground' : (studentTheme === 'dark' ? 'text-[#9C8F7F]' : 'text-gray-600')}`}>Tap <MoreVertical className="w-5 h-5 inline mx-1 -mt-1" /> then choose <strong>Install app</strong> or <strong>Add to Home screen</strong>.</p>
                </li>
              </ol>

              <div className={`relative rounded-3xl overflow-hidden aspect-video border-4 shadow-inner flex items-center justify-center ${isAuth ? 'bg-background border-border' : (studentTheme === 'dark' ? 'bg-[#0A0A0A] border-[#222222]' : 'bg-gray-200 border-white')}`}>
                <ImageWithFallback src="https://res.cloudinary.com/dpwx4djzx/image/upload/v1772831571/android-mock_ulo238.jpg" alt="Android Install Mockup" className="absolute inset-0 w-full h-full object-contain" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Support */}
      <section className="py-16 md:py-24 max-w-7xl mx-auto px-4 sm:px-6">
        <div className={`grid md:grid-cols-[0.9fr_1.1fr] gap-8 lg:gap-12 items-center rounded-[2rem] border p-8 sm:p-10 md:p-14 ${isAuth ? 'bg-card border-border' : (studentTheme === 'dark' ? 'bg-[#1A1A1A] border-[#333333]' : 'bg-gray-50 border-gray-100')}`}>
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-secondary/10 border border-secondary/20 text-secondary text-sm font-bold mb-5">
              <MessageCircle className="w-4 h-4" />
              Customer Support
            </div>
            <h2 className="text-2xl sm:text-4xl md:text-5xl font-black tracking-tight">
              Still need clarity?
            </h2>
            <p className="text-lg text-muted-foreground leading-relaxed mt-4">
              Contact CalebDeck support with your name, order ID, hostel, and complaint details for quick assistance.
            </p>
          </div>
          <div>
            <a href={supportWhatsapp} target="_blank" rel="noopener noreferrer" className={`block rounded-2xl border p-5 transition-all hover:-translate-y-1 ${isAuth ? 'bg-muted hover:bg-muted/80 border-border' : (studentTheme === 'dark' ? 'bg-[#222222] border-[#333333] hover:border-secondary/50' : 'bg-white border-gray-100 hover:border-secondary/40')}`}>
              <MessageCircle className="w-6 h-6 text-secondary mb-4" />
              <p className="font-black text-xl">Chat on WhatsApp</p>
              <p className="text-sm text-muted-foreground mt-2">0807 255 0635</p>
              <p className="text-sm text-muted-foreground mt-4 leading-relaxed">Fastest way to get help with payment confirmation, pickup point questions, wrong orders, or delivery issues.</p>
            </a>
          </div>
        </div>
      </section>

      <footer className="border-t border-border py-20 bg-muted/20">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex flex-col gap-12">
            <div className="flex flex-col md:flex-row justify-between items-center gap-12">
              <div onDoubleClick={() => navigate('/admin/login')} className="cursor-pointer">
                <Logo size="md" />
              </div>
              <div className="flex flex-wrap justify-center gap-6 sm:gap-10 text-sm font-semibold uppercase tracking-wider">
                <Link to="/calebdeck-mart" className="text-muted-foreground hover:text-[#10B981] transition-colors">CalebDeck Mart</Link>
                <Link to="/calebnet-info" className="text-muted-foreground hover:text-blue-500 transition-colors">CalebNet</Link>
                <Link to="/privacy" className="text-muted-foreground hover:text-secondary transition-colors">Privacy</Link>
                <Link to="/terms" className="text-muted-foreground hover:text-secondary transition-colors">Terms</Link>
                <Link to="/support" className="text-muted-foreground hover:text-secondary transition-colors">Support</Link>
                <Link to="/my-orders" className="text-muted-foreground hover:text-[#A78BFA] transition-colors">My Orders</Link>
                <Link to="/rider/signup" className="text-muted-foreground hover:text-[#10B981] transition-colors">Become a Rider</Link>
              </div>
            </div>
            <div className="flex flex-col md:flex-row justify-between items-center gap-4 pt-4 border-t border-border">
              <div onDoubleClick={() => navigate('/rider/login')} className="text-sm text-muted-foreground font-medium cursor-pointer">
                © 2026 CalebDeck. All rights reserved.
              </div>
              <a href="https://iglobalstech.com.ng" target="_blank" rel="noopener noreferrer" className="text-xs text-muted-foreground hover:text-secondary transition-colors font-semibold">
                A product of <span className="font-black">IGLOBALS TECHNOLOGY</span>
              </a>
            </div>
          </div>
        </div>
      </footer>

      {/* Global Review Modal */}
      {isReviewOpen && pastOrder && (
         <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
            <div className="bg-card w-full max-w-md rounded-3xl p-8 relative shadow-2xl">
               <button onClick={() => setIsReviewOpen(false)} className="absolute top-6 right-6 text-muted-foreground hover:text-foreground text-2xl leading-none">
                  <X className="w-6 h-6" />
               </button>
               <h3 className="text-2xl font-black mb-2 text-center text-[#7C3AED]">Rate Your Experience</h3>
               <p className="text-sm text-center text-muted-foreground mb-6">How was your recent order from {pastOrder.cafeteria || 'us'}?</p>
               <div className="flex justify-center gap-2 mb-6">
                  {[1, 2, 3, 4, 5].map((star) => (
                     <button key={star} onClick={() => setReviewRating(star)} className={`transition-transform ${star <= reviewRating ? 'text-[#FCD34D] scale-110' : 'text-gray-300'}`}>
                        <Star className="w-10 h-10 fill-current" />
                     </button>
                  ))}
               </div>
               <textarea 
                  className="w-full bg-secondary/10 border-2 border-secondary/20 rounded-2xl p-4 text-sm mb-6 min-h-[100px] outline-none font-medium resize-none placeholder:text-muted-foreground focus:border-primary/50" 
                  placeholder="Any feedback on the food or rider? (Optional)"
                  value={reviewText}
                  onChange={e => setReviewText(e.target.value)}
               />
               <Button variant="primary" disabled={isSubmittingReview} onClick={handleReviewSubmit} className="w-full py-4 text-lg">
                  {isSubmittingReview ? 'Submitting...' : 'Submit Review'}
               </Button>
            </div>
         </div>
      )}
    </div>
  );
}

