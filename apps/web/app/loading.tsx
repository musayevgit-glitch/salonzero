export default function HomeLoading() {
  return (
    <div style={{ minHeight: '60vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '2rem', padding: '4rem 1rem' }}>
      <div style={{ width: 120, height: 18, background: '#ede5dc', borderRadius: 8, animation: 'pulse 1.5s ease-in-out infinite' }} />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1rem', width: '100%', maxWidth: 1100 }}>
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} style={{ height: 200, background: '#f9f6f3', borderRadius: 16, animation: 'pulse 1.5s ease-in-out infinite', animationDelay: `${i * 0.1}s` }} />
        ))}
      </div>
      <style>{`@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }`}</style>
    </div>
  );
}
