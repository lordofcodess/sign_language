// VideoPlayer - Text-to-sign video playback component
import { useState, useEffect, useRef } from "react";

export default function VideoPlayer() {
  const [searchTerm, setSearchTerm] = useState("");
  const [availableSigns, setAvailableSigns] = useState([]);
  const [selectedSign, setSelectedSign] = useState(null);
  const videoRef = useRef(null);

  useEffect(() => {
    loadAvailableSigns();
  }, []);

  const loadAvailableSigns = async () => {
    try {
      const response = await fetch("/labels.json");
      const labels = await response.json();
      setAvailableSigns(labels);
    } catch (err) {
      console.error("Failed to load signs:", err);
    }
  };

  const filteredSigns = availableSigns.filter((sign) =>
    sign.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const playSign = (sign) => {
    setSelectedSign(sign);
  };

  return (
    <div className="video-player">
      <div className="search-section">
        <input
          type="text"
          placeholder="Search for a sign (e.g., Hello, A, Thank you)"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="search-input"
        />
        <p className="search-info">
          {filteredSigns.length} sign{filteredSigns.length !== 1 ? "s" : ""}{" "}
          found
        </p>
      </div>

      <div className="signs-grid">
        {filteredSigns.map((sign) => (
          <button
            key={sign}
            onClick={() => playSign(sign)}
            className={`sign-button ${selectedSign === sign ? "active" : ""}`}
          >
            {sign}
          </button>
        ))}
      </div>

      {selectedSign && (
        <div className="video-display">
          <h3>Demonstrating: {selectedSign}</h3>
          <div className="video-container">
            <video
              ref={videoRef}
              key={selectedSign}
              autoPlay
              loop
              muted
              playsInline
              className="sign-video"
              src={`/assets/videos/${selectedSign.toLowerCase()}.mp4`}
              onError={(e) => {
                console.error("Video load error:", e);
              }}
            >
              <p className="video-error">
                Video not available for "{selectedSign}"
              </p>
            </video>
          </div>
        </div>
      )}
    </div>
  );
}
