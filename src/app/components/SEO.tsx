import { Helmet } from 'react-helmet-async';

interface SEOProps {
    title: string;
    description: string;
    name?: string;
    type?: string;
    url?: string;
    image?: string;
}

export default function SEO({ title, description, name = 'CalebDeck', type = 'website', url, image }: SEOProps) {
    const currentUrl = url || typeof window !== 'undefined' ? window.location.href : 'https://calebdeck.com';
    const currentImage = image || 'https://calebdeck.com/calebdeck-logo.jpeg';

    return (
        <Helmet>
            {/* Standard SEO */}
            <title>{title}</title>
            <meta name="description" content={description} />

            {/* Facebook & LinkedIn Open Graph */}
            <meta property="og:type" content={type} />
            <meta property="og:title" content={title} />
            <meta property="og:description" content={description} />
            <meta property="og:url" content={currentUrl} />
            <meta property="og:image" content={currentImage} />
            <meta property="og:site_name" content={name} />

            {/* Twitter Tags */}
            <meta name="twitter:creator" content={name} />
            <meta name="twitter:card" content="summary_large_image" />
            <meta name="twitter:title" content={title} />
            <meta name="twitter:description" content={description} />
            <meta name="twitter:image" content={currentImage} />

            {/* JSON-LD Structured Data for LocalBusiness */}
            <script type="application/ld+json">
                {JSON.stringify({
                    "@context": "https://schema.org",
                    "@type": "LocalBusiness",
                    "name": "CalebDeck",
                    "image": "https://calebdeck.com/calebdeck-logo.jpeg",
                    "@id": "https://calebdeck.com/",
                    "url": "https://calebdeck.com/",
                    "telephone": "+2340000000000",
                    "address": {
                        "@type": "PostalAddress",
                        "streetAddress": "Caleb University Campus",
                        "addressLocality": "Imota",
                        "addressRegion": "Lagos",
                        "postalCode": "104102",
                        "addressCountry": "NG"
                    },
                    "geo": {
                        "@type": "GeoCoordinates",
                        "latitude": 6.6433,
                        "longitude": 3.6593
                    },
                    "openingHoursSpecification": {
                        "@type": "OpeningHoursSpecification",
                        "dayOfWeek": [
                            "Monday",
                            "Tuesday",
                            "Wednesday",
                            "Thursday",
                            "Friday",
                            "Saturday",
                            "Sunday"
                        ],
                        "opens": "07:00",
                        "closes": "22:00"
                    },
                    "sameAs": [
                        "https://twitter.com/calebdeck",
                        "https://instagram.com/calebdeck"
                    ],
                    "description": "The official campus food delivery service for Caleb University students. Order from campus cafeterias and get it delivered directly to your hostel."
                })}
            </script>
        </Helmet>
    );
}
