import { Metadata } from 'next';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

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

    // Check if expired or viewed
    if (new Date(data.expires_at) < new Date() || data.view_count > 0) {
      return {
        title: 'Analysis Unavailable | Edge by Teeco',
        description: 'This analysis link has expired or has already been viewed.',
      };
    }

    const title = `STR Analysis: ${data.address}`;
    const description = `${data.bedrooms} bed / ${data.bathrooms} bath · $${Math.round(data.annual_revenue).toLocaleString()}/yr projected · ${data.occupancy_rate}% occupancy · ${data.cash_on_cash.toFixed(1)}% CoC`;
    
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
