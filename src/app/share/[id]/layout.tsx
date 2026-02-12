import { Metadata } from 'next';
import { createClient } from '@supabase/supabase-js';

// Use the same hardcoded fallback values as /api/share/route.ts
// This ensures OG meta tags work even without env vars on Vercel
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://izyfqnavncdcdwkldlih.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml6eWZxbmF2bmNkY2R3a2xkbGloIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAwNTI2NzAsImV4cCI6MjA4NTYyODY3MH0.aPzW5ZcbUP6PEJwxK3sEBtNc2SaZj5kDeyUNIAcn6n0';

type Props = {
  params: { id: string };
  children: React.ReactNode;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const shareId = params.id;
  
  try {
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    const { data } = await supabase
      .from('shared_analyses')
      .select('address, city, state, bedrooms, bathrooms, annual_revenue, occupancy_rate, adr, cash_on_cash, view_count, expires_at')
      .eq('share_id', shareId)
      .single();

    if (!data) {
      return {
        title: 'Analysis Not Found | Edge by Teeco',
        description: 'This analysis link is no longer available.',
      };
    }

    // NOTE: Always generate custom OG tags even for viewed/expired links
    // The preview card should always look beautiful when shared on social media
    // The page itself handles the view-once / expiry logic

    const revenueK = Math.round(data.annual_revenue / 1000);
    const monthlyK = Math.round(data.annual_revenue / 12 / 1000);
    const title = `${data.address}, ${data.city}, ${data.state} - $${revenueK}K/yr STR Analysis`;
    const description = `${data.city}, ${data.state} · ${data.bedrooms} Bed / ${data.bathrooms} Bath · Cash-on-Cash: ${data.cash_on_cash.toFixed(1)}% · Occupancy: ${data.occupancy_rate}% · ADR: $${Math.round(data.adr)} · $${monthlyK}K/mo estimated`;
    
    const ogImageUrl = `https://edge.teeco.co/api/og?address=${encodeURIComponent(data.address)}&city=${encodeURIComponent(data.city)}&state=${encodeURIComponent(data.state)}&bedrooms=${data.bedrooms}&bathrooms=${data.bathrooms}&revenue=${Math.round(data.annual_revenue)}&occupancy=${data.occupancy_rate}&adr=${Math.round(data.adr)}&coc=${data.cash_on_cash.toFixed(1)}`;

    return {
      title,
      description,
      openGraph: {
        title,
        description,
        type: 'website',
        url: `https://edge.teeco.co/share/${shareId}`,
        siteName: 'Edge by Teeco',
        images: [
          {
            url: ogImageUrl,
            width: 1200,
            height: 630,
            alt: `STR Investment Analysis for ${data.address}`,
          },
        ],
      },
      twitter: {
        card: 'summary_large_image',
        title,
        description,
        images: [ogImageUrl],
      },
    };
  } catch (error) {
    return {
      title: 'STR Investment Analysis | Edge by Teeco',
      description: 'Analyze short-term rental investment properties with Edge by Teeco.',
    };
  }
}

export default function ShareLayout({ children }: Props) {
  return <>{children}</>;
}
