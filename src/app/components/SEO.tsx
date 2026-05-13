import { Helmet } from 'react-helmet-async';

interface SEOProps {
    title: string;
    description: string;
    name?: string;
    type?: string;
    url?: string;
    image?: string;
    canonical?: string;
    jsonLd?: Record<string, any> | Record<string, any>[];
}

export default function SEO({
    title,
    description,
    name = 'CalebDeck',
    type = 'website',
    url,
    image,
    canonical,
    jsonLd,
}: SEOProps) {
    const currentUrl = url || (typeof window !== 'undefined' ? window.location.href : 'https://calebdeck.com');
    const currentImage = image || 'https://calebdeck.com/calebdeck-logo.jpeg';
    const canonicalUrl = canonical || currentUrl;

    const schemas = jsonLd
        ? Array.isArray(jsonLd) ? jsonLd : [jsonLd]
        : [];

    return (
        <Helmet>
            {/* Standard SEO */}
            <title>{title}</title>
            <meta name="description" content={description} />
            <link rel="canonical" href={canonicalUrl} />

            {/* Facebook & LinkedIn Open Graph */}
            <meta property="og:type" content={type} />
            <meta property="og:title" content={title} />
            <meta property="og:description" content={description} />
            <meta property="og:url" content={currentUrl} />
            <meta property="og:image" content={currentImage} />
            <meta property="og:image:width" content="1200" />
            <meta property="og:image:height" content="630" />
            <meta property="og:site_name" content={name} />

            {/* Twitter / X Tags */}
            <meta name="twitter:card" content="summary_large_image" />
            <meta name="twitter:site" content="@iglobalstechinc" />
            <meta name="twitter:creator" content="@iglobalstechinc" />
            <meta name="twitter:title" content={title} />
            <meta name="twitter:description" content={description} />
            <meta name="twitter:image" content={currentImage} />

            {/* Page-specific JSON-LD */}
            {schemas.map((schema, i) => (
                <script key={i} type="application/ld+json">
                    {JSON.stringify({ "@context": "https://schema.org", ...schema })}
                </script>
            ))}
        </Helmet>
    );
}
