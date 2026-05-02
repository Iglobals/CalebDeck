import { Logo } from '../components/design-system/Logo';
import Footer from '../components/Footer';
import { useNavigate } from 'react-router';
import { ArrowLeft } from 'lucide-react';

export default function Support() {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen bg-background text-foreground transition-colors duration-300">
      <header className="sticky top-0 bg-background/95 backdrop-blur-sm z-50 border-b border-border transition-colors duration-300">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <button onClick={() => navigate(-1)} className="p-2 -ml-2 rounded-xl transition-colors hover:bg-muted">
            <ArrowLeft className="w-6 h-6 text-foreground" />
          </button>
          <div className="absolute left-1/2 -translate-x-1/2">
            <Logo size="md" />
          </div>
          <div className="w-10"></div>
        </div>
      </header>
      <main className="max-w-4xl mx-auto px-6 py-16">
        <h1 className="text-4xl font-bold mb-8 text-primary">Support</h1>

        <div className="prose prose-sm max-w-none text-foreground space-y-6">
          <section>
            <h2 className="text-2xl font-semibold mt-8 mb-4 text-secondary">How can we help?</h2>
            <p>
              If you have any questions, feedback, or issues while using CalebDeck,
              we're here to help. WhatsApp is the fastest way to reach support:
            </p>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li>Message us on WhatsApp: <a href="https://wa.me/2348072550635" className="underline" target="_blank" rel="noopener noreferrer">0807 255 0635</a></li>
              <li>For order issues, send your name, order ID, hostel, and a clear explanation</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mt-8 mb-4 text-secondary">Frequently Asked Questions</h2>
            <p>Here are quick answers for common CalebDeck questions:</p>
            <dl className="space-y-4">
              <dt className="font-semibold">Is CalebDeck only for food?</dt>
              <dd>No. CalebDeck handles cafeteria food and CalebDeck Mart essentials like snacks, drinks, groceries, and useful campus items.</dd>

              <dt className="font-semibold">How long does delivery take?</dt>
              <dd>Most food orders arrive in about 20-30 minutes. Mart orders depend on item availability, packing time, distance, weather, and order volume.</dd>

              <dt className="font-semibold">What happens if I stay in a female hostel?</dt>
              <dd>Because school rules restrict male riders from entering or moving close to female hostels, you must meet the rider yourself at the assigned safe pickup point shown after checkout.</dd>

              <dt className="font-semibold">Can I send someone else to collect my order?</dt>
              <dd>Please collect your order yourself whenever possible. CalebDeck can only confidently confirm delivery when the rider hands the order to the customer who placed it.</dd>

              <dt className="font-semibold">What should I put in Alternative Food?</dt>
              <dd>Use it only for backup food choices if your first option is unavailable, for example: "If jollof is finished, buy fried rice."</dd>

              <dt className="font-semibold">Can I cancel an order?</dt>
              <dd>Once an order has been submitted and processing has started, it may not be possible to cancel. Contact support quickly if you need help.</dd>
            </dl>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mt-8 mb-4 text-secondary">Contact</h2>
            <p>
              We are available on WhatsApp. Please include as much detail as possible
              so we can assist you quickly.
            </p>
            <p className="flex flex-col sm:flex-row gap-4">
              <a
                href="https://wa.me/2348072550635"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-[#25D366] font-bold hover:underline"
              >
                WhatsApp: 0807 255 0635
              </a>
            </p>
          </section>
        </div>
      </main>
      <Footer />
    </div>
  );
}
