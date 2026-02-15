import { ImageResponse } from '@vercel/og';
import { NextRequest } from 'next/server';

export const runtime = 'edge';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  
  const name = searchParams.get('name') || 'City';
  const stateCode = searchParams.get('state') || '';
  const grade = searchParams.get('grade') || 'B';
  const revenue = searchParams.get('revenue') || '0';
  const occupancy = searchParams.get('occupancy') || '0';
  const adr = searchParams.get('adr') || '0';
  const score = searchParams.get('score') || '0';
  const medianPrice = searchParams.get('medianPrice') || '0';
  const county = searchParams.get('county') || '';

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

  const gradeColor = (g: string) => {
    if (g === 'A+' || g === 'A') return { bg: '#dcfce7', text: '#16a34a' };
    if (g === 'B+' || g === 'B') return { bg: '#fef3c7', text: '#d97706' };
    return { bg: '#fef2f2', text: '#dc2626' };
  };

  const gc = gradeColor(grade);
  const scoreNum = parseInt(score);

  const countyDisplay = county && county.toLowerCase().includes('county') ? county : county ? `${county} County` : '';
  const subtitleText = countyDisplay
    ? `${countyDisplay} \u00B7 Market Score: ${score}/100`
    : `Market Score: ${score}/100`;

  const footerLabel = scoreNum >= 75
    ? 'Top-rated market for STR investing'
    : scoreNum >= 55
    ? 'Solid market opportunity for STR investing'
    : 'Emerging market for STR investing';

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
              <span style={{ fontSize: '14px', color: '#787060', fontWeight: 500 }}>STR Grade</span>
              <div style={{
                width: '44px',
                height: '44px',
                borderRadius: '10px',
                backgroundColor: gc.bg,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: gc.text,
                fontSize: '20px',
                fontWeight: 800,
              }}>
                {grade}
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
            {/* City Name */}
            <div style={{
              display: 'flex',
              fontSize: '36px',
              fontWeight: 700,
              color: '#2b2823',
              marginBottom: '6px',
              lineHeight: 1.2,
            }}>
              {`${name}, ${stateCode}`}
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
              {/* Monthly Revenue */}
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
                <span style={{ fontSize: '14px', color: '#787060' }}>Monthly Revenue</span>
                <span style={{ fontSize: '20px', fontWeight: 700, color: '#16a34a' }}>{`$${revenue}`}</span>
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
                <span style={{ fontSize: '20px', fontWeight: 700, color: '#2b2823' }}>{`${occupancy}%`}</span>
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
                <span style={{ fontSize: '20px', fontWeight: 700, color: '#2b2823' }}>{`$${adr}`}</span>
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
                {formatPrice(String(parseFloat(revenue) * 12))}
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
              {`Median Home Price: ${formatPrice(medianPrice)}`}
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
              {`\u2022 ${footerLabel}`}
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
    console.error('OG City Image generation error:', e);
    return new Response('Error generating image', { status: 500 });
  }
}
