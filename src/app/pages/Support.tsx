import { Logo } from '../components/design-system/Logo';
import { Phone } from 'lucide-react';
import Footer from '../components/Footer';

export default function Support() {
  return (
    <div className="min-h-screen bg-background text-foreground transition-colors duration-300">
      <header className="sticky top-0 bg-background/95 backdrop-blur-sm z-50 border-b border-border transition-colors duration-300">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-center">
          <Logo size="md" />
        </div>
      </header>
      <main className="max-w-4xl mx-auto px-6 py-16">
        <h1 className="text-4xl font-bold mb-8 text-primary">Support</h1>

        <div className="prose prose-sm max-w-none text-foreground space-y-6">
          <section>
            <h2 className="text-2xl font-semibold mt-8 mb-4 text-secondary">How can we help?</h2>
            <p>
              If you have any questions, feedback, or issues while using CalebDeck,
              we’re here to help. Below are a few ways to get support:
            </p>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li>Email us at <a href="mailto:support@calebdeck.com" className="underline">support@calebdeck.com</a></li>
              <li>Check the FAQ section below for common questions</li>
              <li>Visit our social channels (links coming soon)</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mt-8 mb-4 text-secondary">Frequently Asked Questions</h2>
            <p>Here are answers to some common questions:</p>
            <dl className="space-y-4">
              <dt className="font-semibold">How do I place an order?</dt>
              <dd>Select a cafeteria, build your plate, and checkout – it’s that simple.</dd>

              <dt className="font-semibold">How long does delivery take?</dt>
              <dd>Delivery times are fast – typically 5–10 minutes once your meal is ready.</dd>

              <dt className="font-semibold">Can I cancel an order?</dt>
              <dd>Once an order has been submitted and batching has started it cannot be cancelled, but you can reach out to support for assistance.</dd>
            </dl>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mt-8 mb-4 text-secondary">Contact</h2>
            <p>
              We are available 24/7 via email or phone. Please include as much detail as possible
              so we can assist you quickly.
            </p>
            <p className="flex flex-col sm:flex-row gap-4">
              <a href="mailto:support@calebdeck.com" className="underline">support@calebdeck.com</a>
              <a
                href="tel:+234XXXXXXXXXX"
                className="inline-flex items-center gap-2 text-secondary hover:underline"
              >
                <Phone className="w-5 h-5" /> Call us
              </a>
            </p>
          </section>
        </div>
      </main>
      <Footer />
    </div>
  );
}