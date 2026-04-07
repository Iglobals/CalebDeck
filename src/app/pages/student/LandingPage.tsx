import React, { useEffect } from 'react';
import { Link, useNavigate } from 'react-router';
import { Logo } from '../../components/design-system/Logo';
import { Button } from '../../components/design-system/Button';
import { Card } from '../../components/design-system/Card';
import { Clock, CheckCircle, Truck, Star, ArrowRight, Smartphone, Share, PlusSquare, MoreVertical } from 'lucide-react';
import { ImageWithFallback } from '../../components/figma/ImageWithFallback';
import { useTheme } from '../../../context/ThemeContext';
import { useAuth } from '../../../context/AuthContext';
import SEO from '../../components/SEO';

export default function LandingPage() {
  const { studentTheme } = useTheme();
  const { user } = useAuth();
  const navigate = useNavigate();

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
      title: 'Build Your Plate',
      description: 'Choose from a variety of bases, proteins, and extras to create your perfect meal.'
    },
    {
      icon: <Clock className="w-8 h-8 text-secondary" />,
      title: 'We Batch & Prepare',
      description: 'Our system batches orders efficiently for faster preparation.'
    },
    {
      icon: <Truck className="w-8 h-8 text-secondary" />,
      title: 'Delivered to Your Hostel',
      description: 'Skip the queue. We deliver directly to your hostel.'
    }
  ];


  return (
    <div className="min-h-screen bg-background text-foreground transition-colors duration-300">
      <SEO
        title="CalebDeck — Caleb University Food Delivery"
        description="The official food delivery app for Caleb University students. Order from campus cafeterias and get food delivered straight to your hostel fast."
      />

      {/* Navigation */}
      <nav className="sticky top-0 bg-background/95 backdrop-blur-md z-50 border-b border-border transition-colors duration-300">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <Logo size="md" />
          <div className="hidden md:flex items-center gap-8">
            <a href="#how-it-works" className="text-foreground/80 hover:text-secondary transition-colors font-medium">
              How it works
            </a>

            <div className="flex items-center gap-4">
              {user?.role === 'ADMIN' && (
                <Link to="/admin">
                  <Button variant="secondary" className="border-[#7C3AED] text-[#7C3AED]">Admin Portal</Button>
                </Link>
              )}
              {user?.role === 'RIDER' && (
                <Link to="/rider">
                  <Button variant="secondary" className="border-[#FCD34D] text-[#FCD34D]">Rider Portal</Button>
                </Link>
              )}
              <Link to="/cafeteria">
                <Button variant="primary">Order Now</Button>
              </Link>
            </div>
          </div>
          <div className="md:hidden flex items-center gap-4">
            {user?.role === 'ADMIN' && (
              <Link to="/admin">
                <Button variant="secondary" size="sm" className="border-[#7C3AED] text-[#7C3AED]">Admin</Button>
              </Link>
            )}
            {user?.role === 'RIDER' && (
              <Link to="/rider">
                <Button variant="secondary" size="sm" className="border-[#FCD34D] text-[#FCD34D]">Rider</Button>
              </Link>
            )}
            <Link to="/cafeteria">
              <Button variant="primary" size="sm">Order now</Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="max-w-7xl mx-auto px-6 py-16 md:py-24">
        <div className="grid md:grid-cols-2 gap-12 items-center">
          <div className="space-y-8">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-secondary/10 border border-secondary/20 text-secondary text-sm font-semibold">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-secondary opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-secondary"></span>
              </span>
              Batching Orders Now
            </div>
            <h1 className="text-5xl md:text-7xl leading-tight tracking-tight font-bold">
              Skip the queue. <br />
              <span className="text-secondary">Premium</span> food <br />
              delivery.
            </h1>
            <p className="text-xl text-muted-foreground leading-relaxed max-w-lg">
              Save up to 45 minutes every day. Direct delivery to your hostel. Experience a new standard in campus dining.
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <Link to="/cafeteria">
                <Button variant="primary" size="lg" className="px-10">
                  Order Now <ArrowRight className="w-5 h-5" />
                </Button>
              </Link>
              <Link to="/learn-more">
                <Button variant="secondary" size="lg">
                  Learn More
                </Button>
              </Link>
            </div>
            <div className="flex items-center gap-6 pt-4">
              <div className="text-center">
                <div className={`text-3xl font-bold ${studentTheme === 'dark' ? 'text-[#FAF9F6]' : 'text-gray-900'
                  }`}>2</div>
                <div className={`text-sm ${studentTheme === 'dark' ? 'text-[#9C8F7F]' : 'text-gray-600'
                  }`}>Cafeterias</div>
              </div>
              <div className={`w-px h-12 ${studentTheme === 'dark' ? 'bg-[#333333]' : 'bg-gray-200'
                }`}></div>
              <div className="text-center">
                <div className={`text-3xl font-bold ${studentTheme === 'dark' ? 'text-[#FAF9F6]' : 'text-gray-900'
                  }`}>1</div>
                <div className={`text-sm flex items-center justify-center gap-1 ${studentTheme === 'dark' ? 'text-[#9C8F7F]' : 'text-gray-600'
                  }`}>
                  Campus
                </div>
              </div>
              <div className={`w-px h-12 ${studentTheme === 'dark' ? 'bg-[#333333]' : 'bg-gray-200'
                }`}></div>
              <div className="text-center">
                <div className={`text-3xl font-bold ${studentTheme === 'dark' ? 'text-[#FAF9F6]' : 'text-gray-900'
                  }`}>0</div>
                <div className={`text-sm ${studentTheme === 'dark' ? 'text-[#9C8F7F]' : 'text-gray-600'
                  }`}>Queues</div>
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
                ₦750 Delivery
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="bg-muted/30 py-24 md:py-32">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-6xl mb-6 font-bold">
              Elevated Experience
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">Three simple steps to reclaim your time and enjoy premium campus meals.</p>
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

      {/* PWA Installation */}
      <section id="install-app" className={`py-24 md:py-32 ${studentTheme === 'dark' ? 'bg-[#0A0A0A]' : 'bg-white'}`}>
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className={`text-4xl md:text-5xl mb-6 font-black tracking-tight ${studentTheme === 'dark' ? 'text-[#FAF9F6]' : 'text-gray-900'}`}>
              Get the App Experience
            </h2>
            <p className={`text-xl max-w-2xl mx-auto ${studentTheme === 'dark' ? 'text-[#9C8F7F]' : 'text-gray-500'}`}>Install CalebDeck directly on your home screen for faster access. No app store required.</p>
          </div>

          <div className="grid md:grid-cols-2 gap-8 lg:gap-12 items-start">
            {/* iOS Guide */}
            <div className={`p-8 md:p-10 rounded-[3rem] border-2 transition-all duration-500 hover:shadow-xl relative overflow-hidden ${studentTheme === 'dark' ? 'bg-[#1A1A1A] border-[#222222]' : 'bg-gray-50 border-gray-100'}`}>
              <div className="flex items-center gap-4 mb-8">
                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${studentTheme === 'dark' ? 'bg-[#333333] text-[#FAF9F6]' : 'bg-white shadow-sm text-gray-900 border border-gray-100'}`}>
                  <Smartphone className="w-7 h-7" />
                </div>
                <h3 className={`text-2xl font-black ${studentTheme === 'dark' ? 'text-[#FAF9F6]' : 'text-gray-900'}`}>iOS Installation</h3>
              </div>

              <ol className="space-y-6 mb-10">
                <li className="flex gap-4 items-start">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold flex-shrink-0 ${studentTheme === 'dark' ? 'bg-[#333333] text-[#FAF9F6]' : 'bg-gray-200 text-gray-900'}`}>1</div>
                  <p className={`text-lg leading-relaxed flex-1 ${studentTheme === 'dark' ? 'text-[#9C8F7F]' : 'text-gray-600'}`}>Open CalebDeck in <strong>Safari</strong> browser.</p>
                </li>
                <li className="flex gap-4 items-start">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold flex-shrink-0 ${studentTheme === 'dark' ? 'bg-[#333333] text-[#FAF9F6]' : 'bg-gray-200 text-gray-900'}`}>2</div>
                  <p className={`text-lg leading-relaxed flex-1 ${studentTheme === 'dark' ? 'text-[#9C8F7F]' : 'text-gray-600'}`}>Tap the <Share className="w-5 h-5 inline mx-1 -mt-1 text-primary" /> <strong>Share</strong> button at the bottom of the screen.</p>
                </li>
                <li className="flex gap-4 items-start">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold flex-shrink-0 ${studentTheme === 'dark' ? 'bg-[#333333] text-[#FAF9F6]' : 'bg-gray-200 text-gray-900'}`}>3</div>
                  <p className={`text-lg leading-relaxed flex-1 ${studentTheme === 'dark' ? 'text-[#9C8F7F]' : 'text-gray-600'}`}>Scroll down and tap <PlusSquare className="w-5 h-5 inline mx-1 -mt-1" /> <strong>Add to Home Screen</strong>.</p>
                </li>
              </ol>

              <div className={`relative rounded-3xl overflow-hidden aspect-video border-4 shadow-inner flex items-center justify-center ${studentTheme === 'dark' ? 'bg-[#0A0A0A] border-[#222222]' : 'bg-gray-200 border-white'}`}>
                <ImageWithFallback src="https://res.cloudinary.com/dpwx4djzx/image/upload/v1772831572/iphone-mock_gehuma.jpg" alt="iOS Install Mockup" className="absolute inset-0 w-full h-full object-contain" />
              </div>
            </div>

            {/* Android Guide */}
            <div className={`p-8 md:p-10 rounded-[3rem] border-2 transition-all duration-500 hover:shadow-xl relative overflow-hidden ${studentTheme === 'dark' ? 'bg-[#1A1A1A] border-[#222222]' : 'bg-gray-50 border-gray-100'}`}>
              <div className="flex items-center gap-4 mb-8">
                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${studentTheme === 'dark' ? 'bg-[#10B981]/20 text-[#10B981]' : 'bg-green-100 text-green-600 shadow-sm border border-green-50'}`}>
                  <Smartphone className="w-7 h-7" />
                </div>
                <h3 className={`text-2xl font-black ${studentTheme === 'dark' ? 'text-[#FAF9F6]' : 'text-gray-900'}`}>Android Installation</h3>
              </div>

              <ol className="space-y-6 mb-10">
                <li className="flex gap-4 items-start">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold flex-shrink-0 ${studentTheme === 'dark' ? 'bg-[#333333] text-[#FAF9F6]' : 'bg-gray-200 text-gray-900'}`}>1</div>
                  <p className={`text-lg leading-relaxed flex-1 ${studentTheme === 'dark' ? 'text-[#9C8F7F]' : 'text-gray-600'}`}>Open CalebDeck in <strong>Chrome</strong> browser.</p>
                </li>
                <li className="flex gap-4 items-start">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold flex-shrink-0 ${studentTheme === 'dark' ? 'bg-[#333333] text-[#FAF9F6]' : 'bg-gray-200 text-gray-900'}`}>2</div>
                  <p className={`text-lg leading-relaxed flex-1 ${studentTheme === 'dark' ? 'text-[#9C8F7F]' : 'text-gray-600'}`}>Tap the <MoreVertical className="w-5 h-5 inline mx-1 -mt-1" /> <strong>Menu</strong> icon at the top right.</p>
                </li>
                <li className="flex gap-4 items-start">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold flex-shrink-0 ${studentTheme === 'dark' ? 'bg-[#333333] text-[#FAF9F6]' : 'bg-gray-200 text-gray-900'}`}>3</div>
                  <p className={`text-lg leading-relaxed flex-1 ${studentTheme === 'dark' ? 'text-[#9C8F7F]' : 'text-gray-600'}`}>Tap <strong>Install app</strong> or <strong>Add to Home screen</strong>.</p>
                </li>
              </ol>

              <div className={`relative rounded-3xl overflow-hidden aspect-video border-4 shadow-inner flex items-center justify-center ${studentTheme === 'dark' ? 'bg-[#0A0A0A] border-[#222222]' : 'bg-gray-200 border-white'}`}>
                <ImageWithFallback src="https://res.cloudinary.com/dpwx4djzx/image/upload/v1772831571/android-mock_ulo238.jpg" alt="Android Install Mockup" className="absolute inset-0 w-full h-full object-contain" />
              </div>
            </div>

          </div>
        </div>
      </section>



      {/* CTA Section */}
      <section className="max-w-7xl mx-auto px-6 py-16 md:py-24">
        <div className="relative rounded-[3rem] overflow-hidden bg-secondary p-12 md:p-24 text-center">
          <div className="text-center absolute inset-0 bg-gradient-to-br from-secondary to-secondary/80"></div>
          <div className="relative z-10  space-y-6">
            <h2 className="text-3xl md:text-5xl font-bold text-secondary-foreground">
              Ready to skip the queue?
            </h2>
            <p className="text-xl text-secondary-foreground/80 max-w-2xl mx-auto ">
              Join thousands of students saving time every day with CalebDeck. Your premium lifestyle starts here.
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

      <footer className="border-t border-border py-20 bg-muted/20">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex flex-col md:flex-row justify-between items-center gap-12">
            <div onDoubleClick={() => navigate('/admin/login')} className="cursor-pointer">
              <Logo size="md" />
            </div>
            <div className="flex gap-10 text-sm font-semibold uppercase tracking-wider">
              <Link to="/privacy" className="text-muted-foreground hover:text-secondary transition-colors">Privacy</Link>
              <Link to="/terms" className="text-muted-foreground hover:text-secondary transition-colors">Terms</Link>
              <Link to="/support" className="text-muted-foreground hover:text-secondary transition-colors">Support</Link>
            </div>
            <div onDoubleClick={() => navigate('/rider/login')} className="text-sm text-muted-foreground font-medium cursor-pointer">
              © 2026 CalebDeck. Premium campus delivery.
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}