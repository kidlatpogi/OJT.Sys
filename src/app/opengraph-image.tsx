import { ImageResponse } from 'next/og';

export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          background: '#f8f8f8',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: 72,
          fontFamily: 'sans-serif',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
          <div
            style={{
              width: 68,
              height: 68,
              borderRadius: 18,
              background: '#000000',
              color: '#FFFFFF',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 36,
              fontWeight: 800,
            }}
          >
            <span>O</span>
            <span style={{ color: '#C44900' }}>.</span>
          </div>
          <div style={{ display: 'flex', fontSize: 38, fontWeight: 800, color: '#0f172a' }}>
            <span>OJT</span>
            <span style={{ color: '#C44900' }}>.SYS</span>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              fontSize: 72,
              fontWeight: 800,
              lineHeight: 1.04,
              color: '#000000',
            }}
          >
            <span>Track Daily OJT.</span>
            <div style={{ display: 'flex', gap: 18 }}>
              <span>Automate</span>
              <span style={{ color: '#C44900' }}>Reports.</span>
            </div>
          </div>
          <div style={{ display: 'flex', fontSize: 28, color: '#475569', maxWidth: 880 }}>
            Mobile-first attendance punch clock, automated past-tense task summaries, and 1:1 DOCX and PDF exports.
          </div>
        </div>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderTop: '2px solid #e2e8f0',
            paddingTop: 24,
            fontSize: 22,
            color: '#64748b',
          }}
        >
          <span>Daily Attendance · Weekly Report · Monthly Report</span>
          <span style={{ color: '#C44900', fontWeight: 700 }}>OJT.SYS</span>
        </div>
      </div>
    ),
    { ...size }
  );
}
