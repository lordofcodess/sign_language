// LearnPage - Learning hub with sign video gallery
import { useState, useEffect, useRef } from "react";

export default function LearnPage() {
  const [signs, setSigns] = useState([]);
  const [filter, setFilter] = useState("all");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSigns();
  }, []);

  const loadSigns = async () => {
    try {
      const response = await fetch("/labels.json");
      const labels = await response.json();
      setSigns(labels);
      setLoading(false);
    } catch (err) {
      console.error("Failed to load signs:", err);
      setLoading(false);
    }
  };

  const categorize = (sign) => {
    if (sign.length === 1 && /[A-Z]/.test(sign)) return "alphabet";
    if (/^\d+$/.test(sign)) return "numbers";
    return "words";
  };

  const filteredSigns = signs.filter((sign) => {
    if (filter === "all") return true;
    return categorize(sign) === filter;
  });

  return (
    <div className="page-container">
      <header className="page-header">
        <a href="/index.html" className="back-link">
          ← Home
        </a>
        <h1>📚 GSL Learning Hub</h1>
        <p>Browse and learn Ghanaian Sign Language signs</p>
      </header>

      <div className="filter-bar">
        {["all", "alphabet", "numbers", "words"].map((cat) => (
          <button
            key={cat}
            onClick={() => setFilter(cat)}
            className={`filter-btn ${filter === cat ? "active" : ""}`}
          >
            {cat.charAt(0).toUpperCase() + cat.slice(1)}
          </button>
        ))}
      </div>

      <main className="learn-main">
        {loading ? (
          <div className="loading">Loading signs...</div>
        ) : (
          <div className="signs-gallery">
            {filteredSigns.map((sign) => (
              <SignCard key={sign} sign={sign} category={categorize(sign)} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

function SignCard({ sign, category }) {
  const [isHovered, setIsHovered] = useState(false);
  const videoRef = useRef(null);

  const handleMouseEnter = () => {
    setIsHovered(true);
    videoRef.current?.play();
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
    if (videoRef.current) {
      videoRef.current.pause();
      videoRef.current.currentTime = 0;
    }
  };

  return (
    <div
      className="sign-card"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <div className="sign-video-wrapper">
        <video
          ref={videoRef}
          loop
          muted
          playsInline
          className="sign-preview"
          src={`/assets/videos/${sign.toLowerCase()}.mp4`}
        >
          Video unavailable
        </video>
        {!isHovered && <div className="play-overlay">▶</div>}
      </div>
      <div className="sign-info">
        <h3>{sign}</h3>
        <span className="category-badge">{category}</span>
      </div>
    </div>
  );
}
