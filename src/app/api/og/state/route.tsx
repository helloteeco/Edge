import { ImageResponse } from '@vercel/og';
import { NextRequest } from 'next/server';

export const runtime = 'edge';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  
  const name = searchParams.get('name') || 'State';
  const stateCode = searchParams.get('code') || '';
  const cities = searchParams.get('cities') || '0';
  const avgADR = searchParams.get('avgADR') || '0';
  const medianHome = searchParams.get('medianHome') || '0';
  const topMarkets = searchParams.get('topMarkets') || '';
  const avgOccupancy = searchParams.get('avgOccupancy') || '0';
  const avgRevenue = searchParams.get('avgRevenue') || '0';

  const formatPrice = (value: string) => {
    const num = parseFloat(value);
    if (num >= 1000000) {
      return '$' + (num / 1000000).toFixed(1) + 'M';
    }
    if (num >= 1000) {
      return '$' + Math.round(num / 1000) + 'K';
    }
    return '$' + Math.round(num);
  };

  const annualRevenue = parseFloat(avgRevenue) * 12;

  const subtitleText = topMarkets
    ? `${cities} cities analyzed \u00B7 Top: ${topMarkets}`
    : `${cities} cities analyzed`;

  try {
    return new ImageResponse(
      (
        <div
          style={{
            height: '100%',
            width: '100%',
            display: 'flex',
            flexDirection: 'column',
            backgroundColor: '#f5f4f0',
            fontFamily: 'system-ui, -apple-system, sans-serif',
          }}
        >
          {/* Top Bar */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '24px 40px',
            backgroundColor: '#ffffff',
            borderBottom: '1px solid #e5e3da',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{
                fontSize: '28px',
                fontWeight: 800,
                color: '#2b2823',
                letterSpacing: '-0.5px',
              }}>
                Edge
              </span>
              <span style={{
                fontSize: '14px',
                color: '#ffffff',
                backgroundColor: '#787060',
                padding: '3px 10px',
                borderRadius: '6px',
                fontWeight: 600,
              }}>
                by Teeco
              </span>
            </div>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}>
              <span style={{ fontSize: '14px', color: '#787060', fontWeight: 500 }}>STR Markets</span>
              <div style={{
                height: '44px',
                borderRadius: '10px',
                backgroundColor: '#2b2823',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#ffffff',
                fontSize: '20px',
                fontWeight: 800,
                padding: '0 14px',
              }}>
                {cities}
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            padding: '32px 40px',
          }}>
            {/* State Name */}
            <div style={{
              display: 'flex',
              fontSize: '36px',
              fontWeight: 700,
              color: '#2b2823',
              marginBottom: '6px',
              lineHeight: 1.2,
            }}>
              {`${name} (${stateCode})`}
            </div>
            <div style={{
              display: 'flex',
              fontSize: '16px',
              color: '#787060',
              marginBottom: '28px',
            }}>
              {subtitleText}
            </div>

            {/* Metrics Row */}
            <div style={{
              display: 'flex',
              gap: '16px',
              marginBottom: '28px',
            }}>
              {/* Avg Monthly Revenue */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                backgroundColor: '#ffffff',
                border: '1px solid #e5e3da',
                borderRadius: '12px',
                padding: '14px 20px',
                flex: 1,
              }}>
                <span style={{ fontSize: '14px', color: '#787060' }}>Avg Monthly Revenue</span>
                <span style={{ fontSize: '20px', fontWeight: 700, color: '#16a34a' }}>{`$${avgRevenue}`}</span>
              </div>

              {/* Avg Occupancy */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                backgroundColor: '#ffffff',
                border: '1px solid #e5e3da',
                borderRadius: '12px',
                padding: '14px 20px',
                flex: 1,
              }}>
                <span style={{ fontSize: '14px', color: '#787060' }}>Avg Occupancy</span>
                <span style={{ fontSize: '20px', fontWeight: 700, color: '#2b2823' }}>{`${avgOccupancy}%`}</span>
              </div>

              {/* Avg ADR */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                backgroundColor: '#ffffff',
                border: '1px solid #e5e3da',
                borderRadius: '12px',
                padding: '14px 20px',
                flex: 1,
              }}>
                <span style={{ fontSize: '14px', color: '#787060' }}>Avg Nightly Rate</span>
                <span style={{ fontSize: '20px', fontWeight: 700, color: '#2b2823' }}>{`$${avgADR}`}</span>
              </div>
            </div>

            {/* Revenue Hero */}
            <div style={{
              display: 'flex',
              alignItems: 'baseline',
              gap: '4px',
              marginBottom: '4px',
            }}>
              <span style={{ fontSize: '14px', color: '#787060', fontWeight: 500 }}>Avg Projected Annual Revenue</span>
            </div>
            <div style={{
              display: 'flex',
              alignItems: 'baseline',
              gap: '8px',
            }}>
              <span style={{
                fontSize: '64px',
                fontWeight: 800,
                color: '#16a34a',
                lineHeight: 1,
                letterSpacing: '-2px',
              }}>
                {formatPrice(String(annualRevenue))}
              </span>
              <span style={{
                fontSize: '28px',
                fontWeight: 600,
                color: '#22c55e',
              }}>
                /yr
              </span>
            </div>
            <div style={{
              display: 'flex',
              fontSize: '16px',
              color: '#787060',
              marginTop: '4px',
            }}>
              {`Median Home Price: ${formatPrice(medianHome)}`}
            </div>
          </div>

          {/* Footer */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '16px 40px',
            backgroundColor: '#2b2823',
          }}>
            <span style={{ fontSize: '13px', color: '#9a9488' }}>
              {'\u2022 Free STR market data for all 50 states'}
            </span>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}>
              <span style={{ fontSize: '13px', color: '#9a9488' }}>Explore 1000+ STR markets free</span>
              <span style={{ fontSize: '14px', color: '#ffffff', fontWeight: 600 }}>edge.teeco.co</span>
            </div>
          </div>
        </div>
      ),
      {
        width: 1200,
        height: 630,
      }
    );
  } catch (e) {
    console.error('OG State Image generation error:', e);
    return new Response('Error generating image', { status: 500 });
  }
}
