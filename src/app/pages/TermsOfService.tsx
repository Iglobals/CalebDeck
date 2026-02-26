import { Logo } from '../components/design-system/Logo';
import Footer from '../components/Footer';

export default function TermsOfService() {
  return (
    <div className="min-h-screen bg-background text-foreground transition-colors duration-300">
      <header className="sticky top-0 bg-background/95 backdrop-blur-sm z-50 border-b border-border transition-colors duration-300">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-center">
          <Logo size="md" />
        </div>
      </header>
      <main className="max-w-4xl mx-auto px-6 py-16">
        <h1 className="text-4xl font-bold mb-8 text-primary">Terms of Service</h1>
        
        <div className="prose prose-sm max-w-none text-foreground space-y-6">
          <section>
            <h2 className="text-2xl font-semibold mt-8 mb-4 text-secondary">1. Agreement to Terms</h2>
            <p>
              By accessing and using the CalebDeck application, you accept and agree to be bound by the terms and provision of this agreement. If you do not agree to abide by the above, please do not use this service.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mt-8 mb-4 text-secondary">2. Use License</h2>
            <p>
              Permission is granted to temporarily download one copy of the materials (information or software) on CalebDeck for personal, non-commercial transitory viewing only. This is the grant of a license, not a transfer of title, and under this license you may not:
            </p>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li>Modify or copy the materials</li>
              <li>Use the materials for any commercial purpose or for any public display</li>
              <li>Attempt to decompile or reverse engineer any software contained on the Service</li>
              <li>Remove any copyright or other proprietary notations from the materials</li>
              <li>Transfer the materials to another person or "mirror" the materials on any other server</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mt-8 mb-4 text-secondary">3. Disclaimer</h2>
            <p>
              The materials on CalebDeck are provided on an 'as is' basis. CalebDeck makes no warranties, expressed or implied, and hereby disclaims and negates all other warranties including, without limitation, implied warranties or conditions of merchantability, fitness for a particular purpose, or non-infringement of intellectual property or other violation of rights.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mt-8 mb-4 text-secondary">4. Limitations</h2>
            <p>
              In no event shall CalebDeck or its suppliers be liable for any damages (including, without limitation, damages for loss of data or profit, or due to business interruption) arising out of the use or inability to use the materials on CalebDeck, even if CalebDeck or an authorized representative has been notified orally or in writing of the possibility of such damage.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mt-8 mb-4 text-secondary">5. Accuracy of Materials</h2>
            <p>
              The materials appearing on CalebDeck could include technical, typographical, or photographic errors. CalebDeck does not warrant that any of the materials on its website are accurate, complete, or current. CalebDeck may make changes to the materials contained on its website at any time without notice.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mt-8 mb-4 text-secondary">6. Links</h2>
            <p>
              CalebDeck has not reviewed all of the sites linked to its website and is not responsible for the contents of any such linked site. The inclusion of any link does not imply endorsement by CalebDeck of the site. Use of any such linked website is at the user's own risk.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mt-8 mb-4 text-secondary">7. Modifications</h2>
            <p>
              CalebDeck may revise these terms of service for its website at any time without notice. By using this website, you are agreeing to be bound by the then current version of these terms of service.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mt-8 mb-4 text-secondary">8. Governing Law</h2>
            <p>
              These terms and conditions are governed by and construed in accordance with the laws of the jurisdiction in which CalebDeck operates, and you irrevocably submit to the exclusive jurisdiction of the courts in that location.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mt-8 mb-4 text-secondary">9. Contact Information</h2>
            <p>
              If you have any questions about these Terms of Service, please contact us at: support@calebdeck.com
            </p>
          </section>
        </div>
      </main>
      <Footer />
    </div>
  );
}
