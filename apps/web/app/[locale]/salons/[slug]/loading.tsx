export default function SalonDetailLoading() {
  return (
    <div style={{ maxWidth: 900, margin: '0 auto', padding: '2rem 1rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div style={{ height: 28, width: 240, background: '#f9f6f3', borderRadius: 8, animation: 'pulse 1.5s ease-in-out infinite' }} />
      <div style={{ height: 64, width: '70%', background: '#f9f6f3', borderRadius: 8, animation: 'pulse 1.5s ease-in-out infinite', animationDelay: '0.1s' }} />
      <div style={{ height: 260, background: '#f9f6f3', borderRadius: 16, animation: 'pulse 1.5s ease-in-out infinite', animationDelay: '0.2s' }} />
      <div style={{ height: 200, background: '#f9f6f3', borderRadius: 16, animation: 'pulse 1.5s ease-in-out infinite', animationDelay: '0.3s' }} />
      <style>{`@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }`}</style>
    </div>
  );
}
