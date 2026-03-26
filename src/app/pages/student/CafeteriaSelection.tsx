import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { Logo } from '../../components/design-system/Logo';
import { Card } from '../../components/design-system/Card';
import { Badge, StatusDot } from '../../components/design-system/Badge';
import { Button } from '../../components/design-system/Button';
import { ArrowLeft, Clock, TrendingUp } from 'lucide-react';
import { ImageWithFallback } from '../../components/figma/ImageWithFallback';
import { ThemeToggle } from '../../components/ThemeToggle';
import { toast } from 'react-toastify';
import { useTheme } from '../../../context/ThemeContext';
import SEO from '../../components/SEO';

export default function CafeteriaSelection() {
  const [selectedCafeteria, setSelectedCafeteria] = useState<string | null>(null);
  const navigate = useNavigate();
  const { studentTheme } = useTheme();

  const currentTime = new Date();
  const hour = currentTime.getHours();
  // Operational hours: 12pm to 11pm (12 to 23) - TEMPORARY FOR TESTING
  const isClosed = hour < 12 || hour >= 23;
  const statusLabel = isClosed ? 'CalebDeck is Closed' : 'Open now';
  const statusType = isClosed ? 'inactive' : 'active';

  const cafeterias = [
    {
      id: 'old',
      name: 'Old Cafeteria',
      image: '/old-cafe-pic.jpeg',
      prepTime: '12 min',
      status: isClosed ? 'closed' : 'open',
      popular: false
    },
    {
      id: 'new',
      name: 'New Cafeteria',
      image: '/new-cafe pic.jpeg',
      status: isClosed ? 'closed' : 'open',
      popular: true
    }
  ];

  const sections = [
    { id: 'front', name: 'Front', description: 'Main serving area' },
    { id: 'back', name: 'Back', description: 'Alternative counter' }
  ];

  const handleCafeteriaClick = (cafeteriaId: string) => {
    if (isClosed) {
      toast.info('CalebDeck is currently closed. Operational hours: 12pm - 6pm.', {
        position: 'top-center'
      });
      return;
    }
    const caf = cafeterias.find(c => c.id === cafeteriaId);
    // Old Cafe has no front/back — go directly to plate builder
    if (cafeteriaId === 'old') {
      navigate(`/plate-builder/${cafeteriaId}`, {
        state: {
          cafeteria: caf?.name,
          cafeteriaId,
          sectionId: 'none'
        }
      });
    } else {
      setSelectedCafeteria(cafeteriaId);
    }
  };

  const handleSectionSelect = (sectionId: string) => {
    const cafeteriaName = cafeterias.find(c => c.id === selectedCafeteria)?.name;
    navigate(`/plate-builder/${selectedCafeteria}`, {
      state: {
        cafeteria: cafeteriaName,
        cafeteriaId: selectedCafeteria,
        sectionId: sectionId
      }
    });
  };

  return (
    <div className="min-h-screen bg-background text-foreground transition-colors duration-300">
      <SEO
        title="Cafeterias — CalebDeck Food Delivery"
        description="Browse all open cafeterias at Caleb University. Order freshly prepared meals directly to your hostel room."
      />
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-border bg-background/95 backdrop-blur-sm transition-colors duration-300">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            {selectedCafeteria ? (
              <button
                onClick={() => setSelectedCafeteria(null)}
                className="p-2 rounded-xl transition-colors hover:bg-muted"
              >
                <ArrowLeft className="w-6 h-6 text-foreground" />
              </button>
            ) : (
              <Link to="/">
                <button className="p-2 rounded-xl transition-colors hover:bg-muted">
                  <ArrowLeft className="w-6 h-6 text-foreground" />
                </button>
              </Link>
            )}
            <h1 className="text-2xl font-bold text-foreground">
              {selectedCafeteria ? 'Select Section' : 'Choose Cafeteria'}
            </h1>
          </div>
          <Logo size="md" />
        </div>
      </header>

      {/* Content */}
      <main className="max-w-7xl mx-auto px-6 py-12">
        {!selectedCafeteria ? (
          <>
            <div className="mb-8">
              <p className="text-lg text-muted-foreground">
                Select a cafeteria to start building your plate
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-8">
              {cafeterias.map((cafeteria) => (
                <div key={cafeteria.id} onClick={() => handleCafeteriaClick(cafeteria.id)}>
                  <Card hover className="relative overflow-hidden group cursor-pointer border-none shadow-lg">
                    {cafeteria.popular && (
                      <div className="absolute top-4 right-4 z-10">
                        <Badge variant="gold" className="flex items-center gap-1 shadow-md">
                          <TrendingUp className="w-4 h-4" />
                          Popular now
                        </Badge>
                      </div>
                    )}

                    <div className="space-y-4">
                      <div className="relative h-64 rounded-xl overflow-hidden">
                        <ImageWithFallback
                          src={cafeteria.image}
                          alt={cafeteria.name}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent"></div>
                        <div className="absolute bottom-4 left-4 right-4 flex items-end justify-between">
                          <div>
                            <h2 className="text-3xl font-bold text-white mb-2">
                              {cafeteria.name}
                            </h2>
                            <StatusDot status={statusType} label={statusLabel} className="text-white drop-shadow-md" />
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-2">
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Clock className="w-5 h-5 text-secondary" />
                          <span className="font-medium">Est. prep time: {cafeteria.prepTime}</span>
                        </div>
                        <Button variant={isClosed ? 'secondary' : 'primary'} className="px-8" disabled={isClosed}>
                          {isClosed ? 'Closed' : 'Select'}
                        </Button>
                      </div>
                    </div>
                  </Card>
                </div>
              ))}
            </div>

            {/* Info Card */}
            <div className="mt-12">
              <Card className="bg-gradient-to-br from-primary/10 to-secondary/10 border-2 border-primary/30">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-secondary flex items-center justify-center flex-shrink-0 shadow-lg">
                    <Clock className="w-6 h-6 text-secondary-foreground" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold mb-2">
                      Group Orders Save Time & Money
                    </h3>
                    <p className="text-muted-foreground leading-relaxed">
                      Order with friends and get 20% off delivery per plate. The more you order together, the more you save! Secure your spot in the next batch.
                    </p>
                  </div>
                </div>
              </Card>
            </div>
          </>
        ) : (
          <>
            <div className="mb-8 text-center max-w-2xl mx-auto">
              <h2 className="text-3xl font-bold mb-4">Choose Your Serving Point</h2>
              <p className="text-lg text-muted-foreground">
                Pricing and menu items may vary slightly between the <span className="text-secondary font-bold">Front</span> and <span className="text-secondary font-bold">Back</span> sections of {cafeterias.find(c => c.id === selectedCafeteria)?.name}.
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-8">
              {sections.map((section) => (
                <div key={section.id} onClick={() => handleSectionSelect(section.id)}>
                  <Card hover className="cursor-pointer group hover:border-secondary/30 transition-all duration-500">
                    <div className="space-y-8 py-8 text-center">
                      <div className="w-32 h-32 rounded-3xl bg-secondary/10 flex items-center justify-center mx-auto transition-transform duration-500 group-hover:scale-110 group-hover:bg-secondary group-hover:shadow-2xl">
                        <span className="text-5xl font-bold text-secondary group-hover:text-secondary-foreground transition-colors duration-500">
                          {section.name.charAt(0)}
                        </span>
                      </div>
                      <div>
                        <h2 className="text-4xl font-bold mb-3 group-hover:text-secondary transition-colors duration-500">
                          {section.name}
                        </h2>
                        <p className="text-xl text-muted-foreground">{section.description}</p>
                      </div>

                      <Button variant="primary" className="w-full py-6 text-xl rounded-2xl">
                        Select {section.name}
                      </Button>
                    </div>
                  </Card>
                </div>
              ))}
            </div>
          </>
        )}
      </main>
    </div>
  );
}