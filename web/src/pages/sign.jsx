// SignPage - Webcam-based sign detection page
import WebcamDetector from "../components/WebcamDetector.jsx";

export default function SignPage() {
  return (
    <div className="page-container">
      <header className="page-header">
        <a href="/index.html" className="back-link">
          ← Home
        </a>
        <h1>Sign to Text Recognition</h1>
        <p>Show a Ghanaian Sign Language gesture to your webcam</p>
      </header>

      <main className="page-main">
        <WebcamDetector />
      </main>

      <footer className="page-footer">
        <p>
          💡 Tip: Ensure good lighting and keep your hand visible in the frame
        </p>
      </footer>
    </div>
  );
}
