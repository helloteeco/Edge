import { ImageResponse } from '@vercel/og';
import { NextRequest } from 'next/server';

export const runtime = 'edge';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  
  const address = searchParams.get('address') || 'STR Investment Analysis';
  const city = searchParams.get('city') || '';
  const state = searchParams.get('state') || '';
  const bedrooms = searchParams.get('bedrooms') || '0';
  const bathrooms = searchParams.get('bathrooms') || '0';
  const revenue = searchParams.get('revenue') || '0';
  const occupancy = searchParams.get('occupancy') || '0';
  const adr = searchParams.get('adr') || '0';
  const coc = searchParams.get('coc') || '0';
  const grade = searchParams.get('grade') || '';

  const formatRevenue = (value: string) => {
    const num = parseFloat(value);
    if (num >= 1000) {
      return '$' + Math.round(num / 1000) + 'K';
    }
    return '$' + Math.round(num);
  };

  const formatMonthly = (value: string) => {
    const num = parseFloat(value);
    return '$' + Math.round(num / 12 / 1000) + 'K';
  };

  const cocValue = parseFloat(coc);
  const cocColor = cocValue >= 15 ? '#16a34a' : cocValue >= 0 ? '#2b2823' : '#dc2626';

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
            <div style={{
              fontSize: '28px',
              fontWeight: 800,
              color: '#2b2823',
              letterSpacing: '-0.5px',
            }}>
              Edge
            </div>
            <div style={{
              fontSize: '14px',
              color: '#ffffff',
              backgroundColor: '#787060',
              padding: '3px 10px',
              borderRadius: '6px',
              fontWeight: 600,
            }}>
              by Teeco
            </div>
          </div>
          {grade && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}>
              <span style={{ fontSize: '14px', color: '#787060', fontWeight: 500 }}>STR Grade</span>
              <div style={{
                width: '44px',
                height: '44px',
                borderRadius: '10px',
                backgroundColor: '#2b2823',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#ffffff',
                fontSize: '20px',
                fontWeight: 800,
              }}>
                {grade}
              </div>
            </div>
          )}
        </div>

        {/* Main Content */}
        <div style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          padding: '32px 40px',
        }}>
          {/* Address */}
          <div style={{
            fontSize: '26px',
            fontWeight: 700,
            color: '#2b2823',
            marginBottom: '6px',
            lineHeight: 1.2,
          }}>
            {address}
          </div>
          <div style={{
            fontSize: '16px',
            color: '#787060',
            marginBottom: '28px',
          }}>
            {city}, {state} &bull; {bedrooms} Bed / {bathrooms} Bath
          </div>

          {/* Metrics Row */}
          <div style={{
            display: 'flex',
            gap: '16px',
            marginBottom: '28px',
          }}>
            {/* Cash-on-Cash */}
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
              <span style={{ fontSize: '14px', color: '#787060' }}>Cash-on-Cash Return</span>
              <span style={{ fontSize: '20px', fontWeight: 700, color: cocColor }}>{coc}%</span>
            </div>

            {/* Occupancy */}
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
              <span style={{ fontSize: '14px', color: '#787060' }}>Occupancy Rate</span>
              <span style={{ fontSize: '20px', fontWeight: 700, color: '#2b2823' }}>{occupancy}%</span>
            </div>

            {/* ADR */}
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
              <span style={{ fontSize: '20px', fontWeight: 700, color: '#2b2823' }}>${adr}</span>
            </div>
          </div>

          {/* Revenue Hero */}
          <div style={{
            display: 'flex',
            alignItems: 'baseline',
            gap: '4px',
            marginBottom: '4px',
          }}>
            <span style={{ fontSize: '14px', color: '#787060', fontWeight: 500 }}>Projected Annual Revenue</span>
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
              {formatRevenue(revenue)}
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
            fontSize: '16px',
            color: '#787060',
            marginTop: '4px',
          }}>
            {formatMonthly(revenue)}/mo estimated
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
          <div style={{ fontSize: '13px', color: '#9a9488' }}>
            &bull; Based on {bedrooms} comparable listings analyzed
          </div>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}>
            <span style={{ fontSize: '13px', color: '#9a9488' }}>Free STR analysis for any US address</span>
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
}
