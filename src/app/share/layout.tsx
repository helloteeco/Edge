import { Metadata } from "next";

// Helper to decode share data for metadata
function decodeShareData(encoded: string): any {
  try {
    const decoded = Buffer.from(encoded, "base64").toString("utf-8");
    return JSON.parse(decoded);
  } catch (e) {
    return null;
  }
}

// Format currency for descriptions
function formatCurrency(value: number): string {
  if (value >= 1000000) {
    return `$${(value / 1000000).toFixed(1)}M`;
  }
  if (value >= 1000) {
    return `$${Math.round(value / 1000)}K`;
  }
  return `$${value.toFixed(0)}`;
}

export async function generateMetadata({ searchParams }: { searchParams: { d?: string } }): Promise<Metadata> {
  const encoded = searchParams.d;
  
  if (!encoded) {
    return {
      title: "Share - Edge by Teeco",
      description: "STR Investment Analysis powered by Edge",
    };
  }

  const data = decodeShareData(encoded);
  
  if (!data) {
    return {
      title: "Share - Edge by Teeco",
      description: "STR Investment Analysis powered by Edge",
    };
  }

  // Generate OG image URL with encoded data
  const ogImageUrl = `https://edge.teeco.co/api/og/share?d=${encodeURIComponent(encoded)}`;

  if (data.type === "deal") {
    const title = `${data.address} - ${formatCurrency(data.revenue)}/yr STR Analysis`;
    const description = `${data.bedrooms} BR / ${data.bathrooms} BA in ${data.city}, ${data.state}. ${data.occupancy}% occupancy, $${data.adr}/night ADR, ${data.coc.toFixed(1)}% cash-on-cash return.`;
    
    return {
      title,
      description,
      openGraph: {
        title,
        description,
        images: [{ url: ogImageUrl, width: 1200, height: 630 }],
        type: "website",
        siteName: "Edge by Teeco",
      },
      twitter: {
        card: "summary_large_image",
        title,
        description,
        images: [ogImageUrl],
      },
    };
  }

  if (data.type === "city") {
    const title = `${data.name}, ${data.state} - STR Investment Grade: ${data.grade}`;
    const description = `Market Score: ${data.score}/100. Median price: ${formatCurrency(data.price)}. Monthly STR revenue: ${formatCurrency(data.revenue)}.`;
    
    return {
      title,
      description,
      openGraph: {
        title,
        description,
        images: [{ url: ogImageUrl, width: 1200, height: 630 }],
        type: "website",
        siteName: "Edge by Teeco",
      },
      twitter: {
        card: "summary_large_image",
        title,
        description,
        images: [ogImageUrl],
      },
    };
  }

  if (data.type === "state") {
    const title = `${data.name} STR Markets - Grade: ${data.grade}`;
    const description = `Explore ${data.cityCount} STR markets in ${data.name}. Market Score: ${data.score}/100. Top market: ${data.topCity}.`;
    
    return {
      title,
      description,
      openGraph: {
        title,
        description,
        images: [{ url: ogImageUrl, width: 1200, height: 630 }],
        type: "website",
        siteName: "Edge by Teeco",
      },
      twitter: {
        card: "summary_large_image",
        title,
        description,
        images: [ogImageUrl],
      },
    };
  }

  return {
    title: "Share - Edge by Teeco",
    description: "STR Investment Analysis powered by Edge",
  };
}

export default function ShareLayout({ children }: { children: React.ReactNode }) {
  return children;
}
