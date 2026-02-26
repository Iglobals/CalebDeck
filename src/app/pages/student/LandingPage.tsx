import React from 'react';
import { Link } from 'react-router';
import { Logo } from '../../components/design-system/Logo';
import { Button } from '../../components/design-system/Button';
import { Card } from '../../components/design-system/Card';
import { Clock, CheckCircle, Truck, Star, ArrowRight } from 'lucide-react';
import { ImageWithFallback } from '../../components/figma/ImageWithFallback';
import { useTheme } from '../../../context/ThemeContext';

export default function LandingPage() {
  const { studentTheme } = useTheme();

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
      title: 'Delivered to Your Room',
      description: 'Skip the queue. We deliver directly to your hostel room.'
    }
  ];

  const testimonials = [
    {
      name: 'Chioma A.',
      hostel: 'Deborah Hall',
      text: 'CalebDeck saved me over 2 hours a week. I can now focus on my studies!',
      avatar: 'CA'
    },
    {
      name: 'David O.',
      hostel: 'Integrity Hall',
      text: 'The group order feature is amazing. We save money and get food faster.',
      avatar: 'DO'
    },
    {
      name: 'Faith M.',
      hostel: 'Mary Hall',
      text: 'Premium quality service. Feels like a well-funded startup!',
      avatar: 'FM'
    }
  ];

  return (
    <div className="min-h-screen bg-background text-foreground transition-colors duration-300">
      {/* Navigation */}
      <nav className="sticky top-0 bg-background/95 backdrop-blur-md z-50 border-b border-border transition-colors duration-300">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <Logo size="md" />
          <div className="hidden md:flex items-center gap-8">
            <a href="#how-it-works" className="text-foreground/80 hover:text-secondary transition-colors font-medium">
              How it works
            </a>
            <a href="#testimonials" className="text-foreground/80 hover:text-secondary transition-colors font-medium">
              Testimonials
            </a>
            <div className="flex items-center gap-4">
              <Link to="/cafeteria">
                <Button variant="primary">Order Now</Button>
              </Link>
            </div>
          </div>
          <div className="md:hidden flex items-center gap-4">
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
              Save up to 45 minutes every day. Direct delivery to your hostel room. Experience a new standard in campus dining.
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
                  }`}>20k+</div>
                <div className={`text-sm ${studentTheme === 'dark' ? 'text-[#9C8F7F]' : 'text-gray-600'
                  }`}>Orders delivered</div>
              </div>
              <div className={`w-px h-12 ${studentTheme === 'dark' ? 'bg-[#333333]' : 'bg-gray-200'
                }`}></div>
              <div className="text-center">
                <div className={`text-3xl font-bold ${studentTheme === 'dark' ? 'text-[#FAF9F6]' : 'text-gray-900'
                  }`}>4.9</div>
                <div className={`text-sm flex items-center gap-1 ${studentTheme === 'dark' ? 'text-[#9C8F7F]' : 'text-gray-600'
                  }`}>
                  <Star className="w-4 h-4 fill-[#FCD34D] text-[#FCD34D]" />
                  Rating
                </div>
              </div>
              <div className={`w-px h-12 ${studentTheme === 'dark' ? 'bg-[#333333]' : 'bg-gray-200'
                }`}></div>
              <div className="text-center">
                <div className={`text-3xl font-bold ${studentTheme === 'dark' ? 'text-[#FAF9F6]' : 'text-gray-900'
                  }`}>30min</div>
                <div className={`text-sm ${studentTheme === 'dark' ? 'text-[#9C8F7F]' : 'text-gray-600'
                  }`}>Avg. delivery</div>
              </div>
            </div>
          </div>
          <div className="relative">
            <div className="relative rounded-3xl overflow-hidden" style={{ boxShadow: '0 20px 60px rgba(0, 0, 0, 0.5)' }}>
              <ImageWithFallback
                src="https://images.unsplash.com/photo-1687709645238-0470ff08a6bf?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxoYXBweSUyMHN0dWRlbnQlMjBlYXRpbmclMjBtZWFsJTIwY2FtcHVzfGVufDF8fHx8MTc3MTMzODg2MXww&ixlib=rb-4.1.0&q=80&w=1080"
                alt="Happy student with meal"
                className="w-full h-full object-cover"
              />
              <div className="absolute bottom-6 right-6 bg-[#FCD34D] text-[#1A1A1A] px-6 py-3 rounded-xl font-bold shadow-lg">
                ₦700 Delivery
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

      {/* Testimonials */}
      <section id="testimonials" className="py-24 md:py-32">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-6xl mb-6 font-bold">
              Trusted by Students
            </h2>
            <p className="text-xl text-muted-foreground">Join the elite community of tech-savvy students at Caleb University.</p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {testimonials.map((testimonial, index) => (
              <Card key={index} className="hover:border-secondary/20 transition-all duration-500">
                <div className="space-y-6">
                  <div className="flex items-center gap-1">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className="w-5 h-5 fill-primary text-primary" />
                    ))}
                  </div>
                  <p className="text-lg italic leading-relaxed">"{testimonial.text}"</p>
                  <div className="flex items-center gap-4 pt-4">
                    <div className="w-14 h-14 rounded-2xl bg-secondary text-secondary-foreground flex items-center justify-center font-bold text-xl shadow-lg">
                      {testimonial.avatar}
                    </div>
                    <div>
                      <div className="font-bold text-lg">{testimonial.name}</div>
                      <div className="text-sm text-muted-foreground font-medium">{testimonial.hostel}</div>
                    </div>
                  </div>
                </div>
              </Card>
            ))}
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

      {/* Footer */}
      <footer className="border-t border-border py-20 bg-muted/20">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex flex-col md:flex-row justify-between items-center gap-12">
            <Logo size="md" />
            <div className="flex gap-10 text-sm font-semibold uppercase tracking-wider">
              <Link to="/privacy" className="text-muted-foreground hover:text-secondary transition-colors">Privacy</Link>
              <Link to="/terms" className="text-muted-foreground hover:text-secondary transition-colors">Terms</Link>
              <Link to="/support" className="text-muted-foreground hover:text-secondary transition-colors">Support</Link>
            </div>
            <div className="text-sm text-muted-foreground font-medium">
              © 2026 CalebDeck. Premium campus delivery.
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}