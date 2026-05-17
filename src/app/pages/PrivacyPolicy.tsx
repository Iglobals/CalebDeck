import { Logo } from '../components/design-system/Logo';
import Footer from '../components/Footer';
import SEO from '../components/SEO';

export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-background text-foreground transition-colors duration-300">
      <SEO
        title="Privacy Policy - CalebDeck"
        description="Read how CalebDeck handles student information, order details, payment records, support messages, and service data."
        canonical="https://calebdeck.com/privacy"
      />
      <header className="sticky top-0 bg-background/95 backdrop-blur-sm z-50 border-b border-border transition-colors duration-300">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-center">
          <Logo size="md" />
        </div>
      </header>
      <main className="max-w-4xl mx-auto px-6 py-16">
        <h1 className="text-4xl font-bold mb-8 text-primary">Privacy Policy</h1>
        
        <div className="prose prose-sm max-w-none text-foreground space-y-6">
          <section>
            <h2 className="text-2xl font-semibold mt-8 mb-4 text-secondary">1. Introduction</h2>
            <p>
              CalebDeck ("we", "us", "our", or "Company") operates the CalebDeck application. This page informs you of our policies regarding the collection, use, and disclosure of personal data when you use our Service and the choices you have associated with that data.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mt-8 mb-4 text-secondary">2. Information Collection and Use</h2>
            <p>
              We collect several different types of information for various purposes to provide and improve our Service to you.
            </p>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li>Personal Data: Name, email address, phone number, and cafeteria preferences</li>
              <li>Payment Information: Payment method details processed through secure payment gateways</li>

            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mt-8 mb-4 text-secondary">3. Use of Data</h2>
            <p>
              CalebDeck uses the collected data for various purposes:
            </p>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li>To provide and maintain our Service</li>
              <li>To process your transactions and send related information</li>
              <li>To provide customer support</li>
              <li>To gather analysis or valuable information to improve our Service</li>
              <li>To monitor the usage of our Service</li>
              <li>To detect, prevent and address technical issues</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mt-8 mb-4 text-secondary">4. Security of Data</h2>
            <p>
              The security of your data is important to us but remember that no method of transmission over the Internet or method of electronic storage is 100% secure. While we strive to use commercially acceptable means to protect your Personal Data, we cannot guarantee its absolute security.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mt-8 mb-4 text-secondary">5. Contact Us</h2>
            <p>
              If you have any questions about this Privacy Policy, please contact us on WhatsApp at 0807 255 0635.
            </p>
          </section>
        </div>
      </main>
      <Footer />
    </div>
  );
}
