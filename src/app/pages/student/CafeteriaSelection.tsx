import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router';
import { Logo } from '../../components/design-system/Logo';
import { Card } from '../../components/design-system/Card';
import { Badge, StatusDot } from '../../components/design-system/Badge';
import { Button } from '../../components/design-system/Button';
import { ArrowLeft, Clock, Lock, TrendingUp, Utensils } from 'lucide-react';
import { ImageWithFallback } from '../../components/figma/ImageWithFallback';
import { ThemeToggle } from '../../components/ThemeToggle';
import { toast } from 'react-toastify';
import { useTheme } from '../../../context/ThemeContext';
import SEO from '../../components/SEO';
import { subscribeToPlatformSettings, PlatformSettings } from '../../../services/db';
import { CAFETERIA_OPTIONS, NEW_CAFETERIA_SECTIONS, cafeteriaNameForId } from '../../../services/cafeterias';

export default function CafeteriaSelection() {
  const [selectedCafeteria, setSelectedCafeteria] = useState<string | null>(null);
  const navigate = useNavigate();
  const { studentTheme } = useTheme();
  const [platformSettings, setPlatformSettings] = useState<PlatformSettings | null>(null);

  useEffect(() => {
    const unsub = subscribeToPlatformSettings(setPlatformSettings);
    return () => unsub();
  }, []);

  const currentTime = new Date();
  const hour = currentTime.getHours();
  
  const openingHour = platformSettings?.systemOpeningHour ?? 10;
  const closingHour = platformSettings?.systemClosingHour ?? 18;
  const isOutOfHours = hour < openingHour || hour >= closingHour;
  const isFoodLocked = platformSettings?.isFoodOrderingClosed === true;
  const isGlobalLocked = platformSettings?.isAcceptingOrders === false;

  // Closed only by global/food locks or operating hours. Batch state does NOT block cafeteria access.
  const isClosed = !!platformSettings && (isGlobalLocked || isFoodLocked || isOutOfHours);
  const statusLabel = isClosed ? 'CalebDeck is Closed' : 'Open now';
  const statusType = isClosed ? 'inactive' : 'active';
  const closedTitle = isFoodLocked ? 'Food Ordering is Closed' : isGlobalLocked ? 'CalebDeck is Paused' : 'Ordering Currently Closed';
  const closedMessage = isFoodLocked
    ? (platformSettings?.foodOrderingClosedMessage || 'Food ordering is currently closed. Cafeterias are preparing for the next order window.')
    : isGlobalLocked
      ? (platformSettings?.globalClosedMessage || 'CalebDeck is temporarily paused while we make a quick operational update. Please check back shortly.')
      : `CalebDeck food ordering hours are ${openingHour}:00 to ${closingHour}:00.`;

  const cafeterias = CAFETERIA_OPTIONS.map((cafeteria) => ({
    ...cafeteria,
    status: isClosed ? 'closed' : 'open',
  }));
  const sections = NEW_CAFETERIA_SECTIONS;

  const handleCafeteriaClick = (cafeteriaId: string) => {
    if (isClosed) {
      toast.info(closedMessage, {
        position: 'top-center'
      });
      return;
    }
    const caf = cafeterias.find(c => c.id === cafeteriaId);
    if (!caf?.hasSections) {
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
    const cafeteriaName = cafeteriaNameForId(selectedCafeteria || '');
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
        title="Caleb University Cafeterias - CalebDeck Food Delivery"
        description="Choose Old Cafeteria or New Cafeteria on CalebDeck, build your plate, and order freshly prepared meals to your Caleb University hostel."
        canonical="https://calebdeck.com/cafeteria"
        keywords="Caleb University cafeteria, CalebDeck food delivery, Old Cafeteria Caleb University, New Cafeteria Caleb University"
      />
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-border bg-background/95 backdrop-blur-sm transition-colors duration-300">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            {selectedCafeteria ? (
              <button
                onClick={() => setSelectedCafeteria(null)}
                className="p-2 rounded-xl transition-colors hover:bg-muted"
                aria-label="Back to cafeteria list"
              >
                <ArrowLeft className="w-6 h-6 text-foreground" />
              </button>
            ) : (
              <Link to="/">
                <button className="p-2 rounded-xl transition-colors hover:bg-muted" aria-label="Back to CalebDeck home">
                  <ArrowLeft className="w-6 h-6 text-foreground" />
                </button>
              </Link>
            )}
            <h1 className="text-lg sm:text-xl md:text-2xl font-bold text-foreground">
              {selectedCafeteria ? 'Choose Your Serving Section' : 'Choose a Caleb University Cafeteria'}
            </h1>
          </div>
          <Logo size="md" />
        </div>
      </header>

      {/* Content */}
      <main className="max-w-7xl mx-auto px-6 py-12">


        {/* Full-screen closed overlay — only for global/food locks, NOT for batch window closures */}
        {(isGlobalLocked || isFoodLocked) && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center bg-background/85 p-4 backdrop-blur-md">
            <Card className="w-full max-w-md border-2 border-border p-8 text-center shadow-2xl">
              <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-2xl bg-secondary/10 text-secondary">
                {isFoodLocked ? <Utensils className="h-10 w-10" /> : <Lock className="h-10 w-10" />}
              </div>
              <Badge variant={isFoodLocked ? 'amber' : 'gray'} className="mb-4">Closed</Badge>
              <h2 className="mb-3 text-3xl font-black">{closedTitle}</h2>
              <p className="mb-8 text-lg font-medium leading-relaxed text-muted-foreground">{closedMessage}</p>
              <Link to="/">
                <Button variant="primary" className="w-full py-4">Return Home</Button>
              </Link>
            </Card>
          </div>
        )}
        {!selectedCafeteria ? (
          <>
            <section className="mb-8" aria-labelledby="cafeteria-options-title">
              <h2 id="cafeteria-options-title" className="sr-only">Available campus cafeterias on CalebDeck</h2>
              <p className="text-lg text-muted-foreground">
                Browse active campus cafeterias, choose your preferred serving point, and build a meal for hostel delivery without leaving the CalebDeck flow.
              </p>
            </section>

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

            {/* Info Card — batch-aware copy */}
            <div className="mt-12">
              <Card className="bg-gradient-to-br from-primary/10 to-secondary/10 border-2 border-primary/30">
                <div className="flex flex-col">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 rounded-xl bg-secondary flex items-center justify-center flex-shrink-0 shadow-sm">
                      <Clock className="w-5 h-5 text-secondary-foreground" />
                    </div>
                    <h3 className="text-lg sm:text-xl font-bold">
                      Two Ways to Get Your Food
                    </h3>
                  </div>
                  <p className="text-muted-foreground leading-relaxed text-sm sm:text-base">
                    Order Now for immediate processing, or Join a Delivery Batch for a predictable scheduled window. Group with friends to save on delivery either way.
                  </p>
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
