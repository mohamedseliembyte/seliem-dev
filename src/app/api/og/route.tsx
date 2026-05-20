import { ImageResponse } from 'next/og'

export const runtime = 'edge'

export async function GET() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '1200px',
          height: '630px',
          background: '#0a0a0a',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: 'Georgia, serif',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Gold corner accents */}
        <div style={{
          position: 'absolute', top: 0, left: 0,
          width: '120px', height: '3px',
          background: 'linear-gradient(90deg, #c9a84c, transparent)',
        }} />
        <div style={{
          position: 'absolute', top: 0, left: 0,
          width: '3px', height: '120px',
          background: 'linear-gradient(180deg, #c9a84c, transparent)',
        }} />
        <div style={{
          position: 'absolute', bottom: 0, right: 0,
          width: '120px', height: '3px',
          background: 'linear-gradient(270deg, #c9a84c, transparent)',
        }} />
        <div style={{
          position: 'absolute', bottom: 0, right: 0,
          width: '3px', height: '120px',
          background: 'linear-gradient(0deg, #c9a84c, transparent)',
        }} />

        {/* Subtle radial glow */}
        <div style={{
          position: 'absolute',
          width: '700px', height: '700px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(201,168,76,0.07) 0%, transparent 70%)',
        }} />

        {/* Logo mark */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: '80px', height: '80px',
          borderRadius: '16px',
          background: 'linear-gradient(135deg, #c9a84c, #f5d485)',
          marginBottom: '28px',
          boxShadow: '0 0 40px rgba(201,168,76,0.4)',
        }}>
          <span style={{
            fontSize: '46px',
            fontWeight: '900',
            color: '#0a0a0a',
            fontFamily: 'Georgia, serif',
            lineHeight: 1,
          }}>S</span>
        </div>

        {/* Wordmark */}
        <div style={{
          fontSize: '72px',
          fontWeight: '900',
          background: 'linear-gradient(135deg, #c9a84c 0%, #f5d485 50%, #c9a84c 100%)',
          backgroundClip: 'text',
          color: 'transparent',
          letterSpacing: '-1px',
          marginBottom: '16px',
          fontFamily: 'Georgia, serif',
        }}>
          Seliem.dev
        </div>

        {/* Tagline */}
        <div style={{
          fontSize: '26px',
          color: '#9ca3af',
          letterSpacing: '0.05em',
          fontFamily: 'Arial, sans-serif',
          fontWeight: '400',
          marginBottom: '36px',
        }}>
          Premium Websites &amp; AI Automations
        </div>

        {/* Divider */}
        <div style={{
          width: '60px', height: '2px',
          background: 'linear-gradient(90deg, transparent, #c9a84c, transparent)',
          marginBottom: '28px',
        }} />

        {/* Sub-tagline */}
        <div style={{
          fontSize: '18px',
          color: '#4b5563',
          letterSpacing: '0.15em',
          textTransform: 'uppercase',
          fontFamily: 'Arial, sans-serif',
        }}>
          Built to convert visitors into action
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
    },
  )
}
