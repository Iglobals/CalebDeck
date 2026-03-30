import { Logo } from '../components/design-system/Logo';
import Footer from '../components/Footer';
import SEO from '../components/SEO';

export default function LearnMore() {
  return (
    <div className="min-h-screen bg-background text-foreground transition-colors duration-300">
      <SEO
        title="About CalebDeck — Caleb University Campus Delivery"
        description="Learn how CalebDeck is transforming campus dining at Caleb University by delivering cafeteria meals instantly to your hostel."
      />
      <header className="sticky top-0 bg-background/95 backdrop-blur-sm z-50 border-b border-border transition-colors duration-300">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-center">
          <Logo size="md" />
        </div>
      </header>
      <main className="max-w-4xl mx-auto px-6 py-16">
        <h1 className="text-4xl font-bold mb-8 text-primary">About CalebDeck</h1>

        <div className="prose prose-sm max-w-none text-foreground space-y-6">
          <section>
            <h2 className="text-2xl font-semibold mt-8 mb-4 text-secondary">What is CalebDeck?</h2>
            <p>
              CalebDeck is a premium campus food delivery platform built to help students
              skip cafeteria lines and get freshly prepared meals delivered straight to
              their hostel rooms. Whether you’re in a hurry between classes or just
              craving your favourite cafeteria dish, CalebDeck makes ordering fast,
              convenient, and reliable.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mt-8 mb-4 text-secondary">How It Works (Student Flow)</h2>
            <ol className="list-decimal list-inside space-y-2 ml-4">
              <li>Browse participating campus cafeterias and select your desired menu items.</li>
              <li>Use the plate builder to customise portions and add extras.</li>
              <li>Checkout securely using your preferred payment method.</li>
              <li>Track your order and receive delivery directly to your hostel.</li>
            </ol>
            <p>
              Our system batches orders regularly to keep meals hot and delivery times
              short; you can save up to 45 minutes per meal compared to waiting in line.
            </p>
          </section>



          <section>
            <h2 className="text-2xl font-semibold mt-8 mb-4 text-secondary">Getting Started</h2>
            <p>
              Simply visit <a href="/" className="underline">calebdeck.com</a>, browse
              cafeteria menus, build your plate and checkout—no login or account required.
            </p>
          </section>
        </div>
      </main>
      <Footer />
    </div>
  );
}