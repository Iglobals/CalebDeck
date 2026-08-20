import React, { useState } from 'react';
import { useNavigate } from 'react-router';
import { useTheme } from '../../../context/ThemeContext';
import { Card } from '../../components/design-system/Card';
import { Button } from '../../components/design-system/Button';
import { Store, ArrowRight, MessageCircle, Lock, Loader2, Sparkles, TrendingUp, Users } from 'lucide-react';
import SEO from '../../components/SEO';
import { ThemeToggle } from '../../components/ThemeToggle';
import { Logo } from '../../components/design-system/Logo';
import { Link } from 'react-router';

export default function BusinessPage() {
  const { studentTheme, toggleStudentTheme } = useTheme();
  const navigate = useNavigate();
  const isDark = studentTheme === 'dark';

  const [vendorName, setVendorName] = useState('');
  const [description, setDescription] = useState('');
  const [categoryTag, setCategoryTag] = useState('');
  const [contactName, setContactName] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [plan, setPlan] = useState('Monthly Basic');

  const [accessCode, setAccessCode] = useState('');
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [authError, setAuthError] = useState('');

  const ONBOARDING_PHONE = '2348072550635'; // CalebDeck Business onboarding line

  const handleApply = (e: React.FormEvent) => {
    e.preventDefault();
    if (!vendorName || !contactPhone) return;

    const message = `*CalebDeck Business Application*

*Business Name:* ${vendorName}
*Category/Tags:* ${categoryTag || 'Not specified'}
*What we sell:* ${description || 'Not specified'}

*Contact Name:* ${contactName}
*Phone Number:* ${contactPhone}
*Preferred Plan:* ${plan}

I would like to onboard my business to CalebDeck.`;

    const encodedMessage = encodeURIComponent(message);
    window.open(`https://wa.me/${ONBOARDING_PHONE}?text=${encodedMessage}`, '_blank');
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!accessCode) return;

    setIsAuthenticating(true);
    setAuthError('');

    try {
      const response = await fetch('/api/vendor-auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: accessCode })
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Authentication failed');
      }

      // Store in session storage
      sessionStorage.setItem('calebdeck_vendor', JSON.stringify(result.data.vendor));
      navigate('/business/dashboard');

    } catch (err: any) {
      setAuthError(err.message || 'Invalid access code. Please try again.');
    } finally {
      setIsAuthenticating(false);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground transition-colors duration-300 relative pb-20">
      <ThemeToggle theme={studentTheme} onToggle={toggleStudentTheme} variant="floating" />
      <SEO 
        title="CalebDeck Business — Campus Vendor Visibility" 
        description="Grow your campus business by reaching every student on CalebDeck. List your products on the Campus Brand section." 
      />

      {/* Navigation (Simplified) */}
      <nav className="sticky top-0 bg-background/95 backdrop-blur-md z-50 border-b border-border transition-colors duration-300">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <Link to="/">
            <Logo size="md" />
          </Link>
          <div className="flex items-center gap-4">
            <Link to="/" className="text-sm font-bold hover:text-primary transition-colors">
              Back to CalebDeck
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="max-w-4xl mx-auto px-4 sm:px-6 pt-16 pb-12 text-center">
        <h1 className="text-4xl sm:text-5xl md:text-6xl font-black tracking-tight mb-6 leading-tight">
          List your business on <br className="hidden sm:block" />
          <span className="text-primary">CalebDeck.</span>
        </h1>
        <p className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto mb-10 leading-relaxed">
          The subscription-based catalog for independent campus vendors. We showcase your products on the CalebDeck homepage, where students already are.
        </p>

        <div className="grid sm:grid-cols-3 gap-6 text-left max-w-4xl mx-auto mb-16">
          <Card className="p-6 border-border bg-card shadow-sm squircle">
            <Users className="w-8 h-8 text-primary mb-4" />
            <h3 className="font-bold text-lg mb-2">Campus Visibility</h3>
            <p className="text-sm text-muted-foreground">Your catalog appears directly on the CalebDeck homepage for all students to see.</p>
          </Card>
          <Card className="p-6 border-border bg-card shadow-sm squircle">
            <MessageCircle className="w-8 h-8 text-primary mb-4" />
            <h3 className="font-bold text-lg mb-2">Direct Messaging</h3>
            <p className="text-sm text-muted-foreground">Customers tap "Chat with Vendor" to message your WhatsApp directly with their order.</p>
          </Card>
          <Card className="p-6 border-border bg-card shadow-sm squircle">
            <TrendingUp className="w-8 h-8 text-primary mb-4" />
            <h3 className="font-bold text-lg mb-2">Track Referrals</h3>
            <p className="text-sm text-muted-foreground">Your vendor dashboard tracks exactly how many clicks your products get each month.</p>
          </Card>
        </div>
      </section>

      {/* Forms Section */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="grid md:grid-cols-2 gap-8 lg:gap-12 items-start">
          
          {/* Apply Form */}
          <Card className={`p-6 sm:p-8 sm:rounded-3xl border-2 shadow-lg ${isDark ? 'bg-[#1A1A1A] border-[#333333]' : 'bg-white border-gray-100'}`}>
            <div className="flex items-center gap-3 mb-8">
              <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center">
                <Store className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h2 className="text-2xl font-black">Get Started</h2>
                <p className="text-sm text-muted-foreground font-medium">Apply to list your business</p>
              </div>
            </div>

            <form onSubmit={handleApply} className="space-y-5">
              <div>
                <label className="block text-sm font-bold mb-2">Business Name</label>
                <input
                  type="text"
                  required
                  value={vendorName}
                  onChange={e => setVendorName(e.target.value)}
                  placeholder="e.g. ScentByKels"
                  className={`w-full px-4 py-3 rounded-xl border-2 outline-none transition-all ${isDark ? 'border-[#333333] bg-[#2A2A2A] focus:border-primary' : 'border-gray-200 bg-gray-50 focus:border-primary/50'}`}
                />
              </div>

              <div>
                <label className="block text-sm font-bold mb-2">Category Tag</label>
                <input
                  type="text"
                  required
                  value={categoryTag}
                  onChange={e => setCategoryTag(e.target.value)}
                  placeholder="e.g. Perfume, Jewelry, Accessories (No Food/Fashion)"
                  className={`w-full px-4 py-3 rounded-xl border-2 outline-none transition-all ${isDark ? 'border-[#333333] bg-[#2A2A2A] focus:border-primary' : 'border-gray-200 bg-gray-50 focus:border-primary/50'}`}
                />
              </div>

              <div>
                <label className="block text-sm font-bold mb-2">What do you sell?</label>
                <textarea
                  required
                  rows={2}
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  placeholder="Brief description of your products..."
                  className={`w-full px-4 py-3 rounded-xl border-2 outline-none resize-none transition-all ${isDark ? 'border-[#333333] bg-[#2A2A2A] focus:border-primary' : 'border-gray-200 bg-gray-50 focus:border-primary/50'}`}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold mb-2">Your Name</label>
                  <input
                    type="text"
                    required
                    value={contactName}
                    onChange={e => setContactName(e.target.value)}
                    className={`w-full px-4 py-3 rounded-xl border-2 outline-none transition-all ${isDark ? 'border-[#333333] bg-[#2A2A2A] focus:border-primary' : 'border-gray-200 bg-gray-50 focus:border-primary/50'}`}
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold mb-2">WhatsApp No.</label>
                  <input
                    type="tel"
                    required
                    value={contactPhone}
                    onChange={e => setContactPhone(e.target.value)}
                    placeholder="080..."
                    className={`w-full px-4 py-3 rounded-xl border-2 outline-none transition-all ${isDark ? 'border-[#333333] bg-[#2A2A2A] focus:border-primary' : 'border-gray-200 bg-gray-50 focus:border-primary/50'}`}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold mb-2">Select Plan</label>
                <select
                  value={plan}
                  onChange={e => setPlan(e.target.value)}
                  className={`w-full px-4 py-3 rounded-xl border-2 outline-none transition-all ${isDark ? 'border-[#333333] bg-[#2A2A2A] focus:border-primary' : 'border-gray-200 bg-gray-50 focus:border-primary/50'}`}
                >
                  <option value="Monthly Basic">Monthly Basic</option>
                  <option value="Quarterly Pro">Quarterly Pro</option>
                  <option value="Semester Enterprise">Semester Enterprise</option>
                </select>
              </div>

              <Button type="submit" variant="primary" className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-bold py-4 mt-2 shadow-lg shadow-primary/20">
                Apply via WhatsApp <MessageCircle className="w-5 h-5 ml-2" />
              </Button>
            </form>
          </Card>

          {/* Login Form */}
          <Card className={`p-6 sm:p-8 sm:rounded-3xl border-2 shadow-sm ${isDark ? 'bg-[#222222] border-[#333333]' : 'bg-gray-50 border-gray-200'}`}>
            <div className="flex items-center gap-3 mb-8">
              <div className="w-12 h-12 rounded-2xl bg-muted border border-border flex items-center justify-center">
                <Lock className={`w-6 h-6 ${isDark ? 'text-[#FAF9F6]' : 'text-gray-900'}`} />
              </div>
              <div>
                <h2 className="text-2xl font-black">Vendor Access</h2>
                <p className="text-sm text-muted-foreground font-medium">For approved businesses</p>
              </div>
            </div>

            <form onSubmit={handleLogin} className="space-y-5">
              <div>
                <label className="block text-sm font-bold mb-2">Access Code</label>
                <input
                  type="text"
                  required
                  value={accessCode}
                  onChange={e => setAccessCode(e.target.value)}
                  placeholder="XXXX-XXXX-XXXX"
                  className={`w-full px-4 py-4 text-center tracking-widest font-mono text-lg rounded-xl border-2 outline-none transition-all ${isDark ? 'border-[#333333] bg-[#1A1A1A] focus:border-primary' : 'border-gray-200 bg-white focus:border-primary/50'}`}
                />
              </div>

              {authError && (
                <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-500 text-sm font-bold text-center">
                  {authError}
                </div>
              )}

              <Button type="submit" variant="secondary" disabled={isAuthenticating || !accessCode} className={`w-full font-bold py-4 ${isDark ? 'bg-[#333333] text-white hover:bg-[#444444]' : 'bg-gray-200 text-gray-900 hover:bg-gray-300'}`}>
                {isAuthenticating ? (
                  <><Loader2 className="w-5 h-5 animate-spin mr-2" /> Authenticating...</>
                ) : (
                  <>Access Dashboard <ArrowRight className="w-5 h-5 ml-2" /></>
                )}
              </Button>
            </form>

            <div className="mt-8 pt-6 border-t border-border/50 text-center">
              <p className="text-sm text-muted-foreground">
                Lost your access code? Contact CalebDeck support to regenerate it.
              </p>
            </div>
          </Card>
        </div>
      </section>
    </div>
  );
}
