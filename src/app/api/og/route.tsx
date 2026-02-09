import { ImageResponse } from 'next/og';
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

  const formatCurrency = (value: string) => {
    const num = parseFloat(value);
    if (num >= 1000) {
      return '$' + (num / 1000).toFixed(0) + 'k';
    }
    return '$' + num.toFixed(0);
  };

  return new ImageResponse(
    (
      <div
        style={{
          height: '100%',
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          backgroundColor: '#E8E4DD',
          padding: '40px',
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: '20px' }}>
          <div style={{ 
            fontSize: '32px', 
            fontWeight: 'bold', 
            color: '#3D3D3D',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <span style={{ 
              width: '40px', 
              height: '40px', 
              backgroundColor: '#3D3D3D', 
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white',
              fontSize: '20px'
            }}>🏠</span>
            teeco
          </div>
          <div style={{ 
            marginLeft: 'auto', 
            backgroundColor: '#22C55E', 
            color: 'white', 
            padding: '8px 16px', 
            borderRadius: '20px',
            fontSize: '14px',
            fontWeight: 'bold'
          }}>
            STR Analysis
          </div>
        </div>

        {/* Property Info */}
        <div style={{ 
          backgroundColor: 'white', 
          borderRadius: '20px', 
          padding: '30px',
          marginBottom: '20px',
          boxShadow: '0 4px 6px rgba(0,0,0,0.05)'
        }}>
          <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#3D3D3D', marginBottom: '8px' }}>
            {address}
          </div>
          <div style={{ fontSize: '18px', color: '#22C55E', fontWeight: '500' }}>
            {city}, {state} · {bedrooms} Bed / {bathrooms} Bath
          </div>
        </div>

        {/* Key Metrics */}
        <div style={{ 
          backgroundColor: '#3D3D3D', 
          borderRadius: '20px', 
          padding: '30px',
          display: 'flex',
          justifyContent: 'space-between'
        }}>
          <div style={{ textAlign: 'center', flex: 1 }}>
            <div style={{ color: '#9CA3AF', fontSize: '12px', textTransform: 'uppercase', marginBottom: '8px' }}>
              Projected Revenue
            </div>
            <div style={{ color: '#22C55E', fontSize: '36px', fontWeight: 'bold' }}>
              {formatCurrency(revenue)}/yr
            </div>
          </div>
          <div style={{ textAlign: 'center', flex: 1 }}>
            <div style={{ color: '#9CA3AF', fontSize: '12px', textTransform: 'uppercase', marginBottom: '8px' }}>
              Occupancy
            </div>
            <div style={{ color: '#22C55E', fontSize: '36px', fontWeight: 'bold' }}>
              {occupancy}%
            </div>
          </div>
          <div style={{ textAlign: 'center', flex: 1 }}>
            <div style={{ color: '#9CA3AF', fontSize: '12px', textTransform: 'uppercase', marginBottom: '8px' }}>
              Avg Nightly
            </div>
            <div style={{ color: '#22C55E', fontSize: '36px', fontWeight: 'bold' }}>
              ${adr}
            </div>
          </div>
          <div style={{ textAlign: 'center', flex: 1 }}>
            <div style={{ color: '#9CA3AF', fontSize: '12px', textTransform: 'uppercase', marginBottom: '8px' }}>
              Cash-on-Cash
            </div>
            <div style={{ color: '#22C55E', fontSize: '36px', fontWeight: 'bold' }}>
              {coc}%
            </div>
          </div>
        </div>

        {/* Footer */}
        <div style={{ 
          marginTop: 'auto', 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          paddingTop: '20px'
        }}>
          <div style={{ color: '#6B7280', fontSize: '14px' }}>
            Analyzed with Edge by Teeco
          </div>
          <div style={{ color: '#3D3D3D', fontSize: '16px', fontWeight: '500' }}>
            edge.teeco.co
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
