// HomePage - Landing page with navigation to features

export default function HomePage() {
  return (
    <div className="app-container">
      <header className="app-header">
        <h1>🇬🇭 Signify Ghana</h1>
        <p>Ghanaian Sign Language Recognition & Learning Platform</p>
      </header>

      <main className="home-main">
        <section className="hero">
          <h2>Bridge Communication Gaps with GSL</h2>
          <p>Real-time sign language recognition powered by AI</p>
        </section>

        <div className="feature-grid">
          <FeatureCard
            title="Sign Detection"
            description="Show a sign to your webcam and get instant text translation with audio"
            icon="👋"
            link="/sign.html"
          />
          <FeatureCard
            title="Learning Hub"
            description="Browse and learn Ghanaian Sign Language through video demonstrations"
            icon="📚"
            link="/learn.html"
          />
        </div>
      </main>

      <footer className="app-footer">
        <p>Powered by MediaPipe + TensorFlow.js</p>
      </footer>
    </div>
  );
}

function FeatureCard({ title, description, icon, link }) {
  return (
    <a href={link} className="feature-card">
      <div className="feature-icon">{icon}</div>
      <h3>{title}</h3>
      <p>{description}</p>
      <button className="btn-primary">Get Started →</button>
    </a>
  );
}
