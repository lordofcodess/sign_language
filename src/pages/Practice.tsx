import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Volume2, CheckCircle, HelpCircle, ChevronRight, Star, Sparkles } from 'lucide-react';
import confetti from 'canvas-confetti';

type PracticeMode = 'fingerspelling' | 'signs';
type Letter = string;
type Word = string;

const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
const BASIC_WORDS: Word[] = ['HELLO', 'WATER', 'THANK', 'YES', 'NO', 'PLEASE', 'SORRY', 'HELP'];

function Practice() {
  const navigate = useNavigate();
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  
  const [mode, setMode] = useState<PracticeMode | null>(null);
  const [isActive, setIsActive] = useState(false);
  const [predictedLetter, setPredictedLetter] = useState<Letter>('');
  const [confidence, setConfidence] = useState(0);
  const [currentWord, setCurrentWord] = useState<Word>('');
  const [wordProgress, setWordProgress] = useState<string[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [level, setLevel] = useState(1);
  const [progress, setProgress] = useState(0);
  const [stars, setStars] = useState(0);
  const [streak, setStreak] = useState(0);
  const [learnedToday, setLearnedToday] = useState(0);
  const [showFeedback, setShowFeedback] = useState<'correct' | 'incorrect' | null>(null);

  // Load stats from localStorage
  useEffect(() => {
    const savedStars = localStorage.getItem('practiceStars');
    const savedStreak = localStorage.getItem('practiceStreak');
    const savedLearned = localStorage.getItem('learnedToday');
    const lastDate = localStorage.getItem('lastPracticeDate');
    const today = new Date().toDateString();

    if (savedStars) setStars(parseInt(savedStars));
    if (savedStreak) setStreak(parseInt(savedStreak));
    if (lastDate === today && savedLearned) {
      setLearnedToday(parseInt(savedLearned));
    } else {
      localStorage.setItem('lastPracticeDate', today);
      localStorage.setItem('learnedToday', '0');
    }
  }, []);

  // Cleanup camera on unmount
  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { width: 640, height: 480 } 
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setIsActive(true);
      }
    } catch (error) {
      console.error('Error accessing camera:', error);
      alert('Unable to access camera. Please check permissions.');
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setIsActive(false);
  };

  // Hand tracking simulation with useEffect
  useEffect(() => {
    if (!isActive || !mode) return;

    // Simulate hand tracking and prediction
    // In production, this would use MediaPipe Hands
    const interval = setInterval(() => {
      if (!streamRef.current) {
        return;
      }

      // Simulate prediction
      if (mode === 'fingerspelling' && currentIndex < ALPHABET.length) {
        const letter = ALPHABET[currentIndex];
        const conf = Math.floor(Math.random() * 20) + 80; // 80-100%
        setPredictedLetter(letter);
        setConfidence(conf);
      } else if (mode === 'signs' && currentWord) {
        const letter = currentWord[currentIndex] || '';
        const conf = Math.floor(Math.random() * 20) + 75; // 75-95%
        setPredictedLetter(letter);
        setConfidence(conf);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [isActive, mode, currentIndex, currentWord]);

  const initializePractice = async (selectedMode: PracticeMode) => {
    setMode(selectedMode);
    if (selectedMode === 'fingerspelling') {
      setCurrentWord('');
      setWordProgress([]);
      setCurrentIndex(0);
      setProgress(0);
    } else {
      const word = BASIC_WORDS[Math.floor(Math.random() * BASIC_WORDS.length)];
      setCurrentWord(word);
      setWordProgress(Array(word.length).fill('_'));
      setCurrentIndex(0);
      setProgress(0);
    }
    await startCamera();
  };

  const handleCorrect = () => {
    setShowFeedback('correct');
    
    // Update word progress
    if (mode === 'signs' && currentWord) {
      const newProgress = [...wordProgress];
      newProgress[currentIndex] = currentWord[currentIndex];
      setWordProgress(newProgress);
    }

    // Update stats
    const newStars = stars + 1;
    const newStreak = streak + 1;
    const newLearned = learnedToday + 1;
    
    setStars(newStars);
    setStreak(newStreak);
    setLearnedToday(newLearned);
    
    localStorage.setItem('practiceStars', newStars.toString());
    localStorage.setItem('practiceStreak', newStreak.toString());
    localStorage.setItem('learnedToday', newLearned.toString());

    // Confetti effect
    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 }
    });

    // Play success sound (using Web Audio API)
    playSuccessSound();

    // Move to next
    setTimeout(() => {
      setShowFeedback(null);
      handleNext();
    }, 1500);
  };

  const handleHint = () => {
    // Show hint image or animation
    alert(`Hint: The sign for "${predictedLetter}" looks like...`);
  };

  const handleNext = () => {
    if (mode === 'fingerspelling') {
      if (currentIndex < ALPHABET.length - 1) {
        setCurrentIndex(currentIndex + 1);
        setProgress(((currentIndex + 1) / ALPHABET.length) * 100);
      } else {
        // Level complete
        setLevel(level + 1);
        setCurrentIndex(0);
        setProgress(0);
      }
    } else if (mode === 'signs' && currentWord) {
      if (currentIndex < currentWord.length - 1) {
        setCurrentIndex(currentIndex + 1);
        setProgress(((currentIndex + 1) / currentWord.length) * 100);
      } else {
        // Word complete, get new word
        const word = BASIC_WORDS[Math.floor(Math.random() * BASIC_WORDS.length)];
        setCurrentWord(word);
        setWordProgress(Array(word.length).fill('_'));
        setCurrentIndex(0);
        setProgress(0);
      }
    }
    setPredictedLetter('');
    setConfidence(0);
  };

  const speakLetter = () => {
    if (predictedLetter) {
      const utterance = new SpeechSynthesisUtterance(predictedLetter);
      window.speechSynthesis.speak(utterance);
    }
  };

  const playSuccessSound = () => {
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    oscillator.frequency.value = 800;
    oscillator.type = 'sine';
    
    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
    
    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.5);
  };

  // Mode selection screen
  if (!mode) {
    return (
      <div className="max-w-4xl mx-auto px-6 py-12">
        <button
          onClick={() => navigate('/')}
          className="flex items-center gap-2 text-gray-600 hover:text-green-600 mb-8 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
          Back
        </button>

        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold text-gray-800 mb-4">PRACTICE MODE</h1>
          <p className="text-gray-600 text-lg">Choose your practice mode</p>
        </div>

        <div className="grid md:grid-cols-2 gap-8">
          <button
            onClick={() => initializePractice('fingerspelling')}
            className="bg-gradient-to-br from-green-500 to-emerald-600 hover:from-green-400 hover:to-emerald-500 rounded-2xl p-12 shadow-xl transition-all transform hover:scale-105"
          >
            <div className="text-center text-white">
              <div className="text-6xl font-bold mb-4">A-Z</div>
              <h2 className="text-2xl font-bold mb-2">Fingerspelling</h2>
              <p className="text-green-100">Practice individual letters</p>
            </div>
          </button>

          <button
            onClick={() => initializePractice('signs')}
            className="bg-gradient-to-br from-green-600 to-teal-600 hover:from-green-500 hover:to-teal-500 rounded-2xl p-12 shadow-xl transition-all transform hover:scale-105"
          >
            <div className="text-center text-white">
              <div className="text-6xl font-bold mb-4">📝</div>
              <h2 className="text-2xl font-bold mb-2">Basic Words</h2>
              <p className="text-green-100">Practice common signs</p>
            </div>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-6 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <button
          onClick={() => {
            stopCamera();
            setMode(null);
          }}
          className="flex items-center gap-2 text-gray-600 hover:text-green-600 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
          Back
        </button>
        <h1 className="text-2xl font-bold text-gray-800">PRACTICE</h1>
        <div className="w-20"></div> {/* Spacer */}
      </div>

      {/* Stats Bar */}
      <div className="flex items-center justify-between mb-6 p-4 bg-white rounded-lg border-2 border-green-200 shadow-sm">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <Star className="w-5 h-5 text-green-600 fill-green-600" />
            <span className="text-gray-800 font-semibold">{stars}</span>
          </div>
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-green-500" />
            <span className="text-gray-800 font-semibold">Streak: {streak}</span>
          </div>
        </div>
        <div className="text-gray-600">
          Learned today: <span className="text-gray-800 font-semibold">{learnedToday}</span>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Camera Feed */}
        <div className="bg-white rounded-2xl p-6 shadow-xl border-2 border-green-200">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">Webcam Feed</h2>
          <div className="relative aspect-video bg-gray-100 rounded-lg overflow-hidden mb-4">
            {!isActive ? (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center text-gray-500">
                  <p>Camera will start when practice begins</p>
                </div>
              </div>
            ) : (
              <>
                <video
                  ref={videoRef}
                  autoPlay
                  muted
                  playsInline
                  className="w-full h-full object-cover"
                />
                <canvas
                  ref={canvasRef}
                  className="absolute inset-0 pointer-events-none"
                />
                {/* Overlay for hand tracking visualization */}
                <div className="absolute inset-0 pointer-events-none">
                  {/* Hand landmarks would be drawn here with MediaPipe */}
                </div>
              </>
            )}
          </div>
        </div>

        {/* Prediction Panel */}
        <div className="bg-white rounded-2xl p-6 shadow-xl border-2 border-green-200">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">Prediction</h2>
          
          {/* Predicted Letter */}
          <div className="bg-gray-50 rounded-xl p-8 mb-4 text-center border-2 border-green-200">
            <div className="text-6xl font-bold text-gray-800 mb-2">
              {predictedLetter || '?'}
            </div>
            <div className="text-gray-600 text-sm mb-1">Confidence</div>
            <div className="text-2xl font-bold text-green-600">
              {confidence}%
            </div>
          </div>

          {/* Word Progress */}
          {mode === 'signs' && currentWord && (
            <div className="bg-gray-50 rounded-xl p-6 mb-4 border-2 border-green-200">
              <div className="text-gray-600 text-sm mb-2">🔤 Word:</div>
              <div className="flex gap-2 justify-center text-3xl font-mono font-bold text-gray-800">
                {wordProgress.map((char, idx) => (
                  <span
                    key={idx}
                    className={idx === currentIndex ? 'text-green-600' : 'text-gray-800'}
                  >
                    {char}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* TTS Playback */}
          {predictedLetter && (
            <button
              onClick={speakLetter}
              className="w-full bg-green-600 hover:bg-green-700 text-white py-3 rounded-lg font-medium transition-colors flex items-center justify-center gap-2 mb-4"
            >
              <Volume2 className="w-5 h-5" />
              🔊 "{predictedLetter}" (TTS playback)
            </button>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3">
            <button
              onClick={handleCorrect}
              disabled={!predictedLetter}
              className="flex-1 bg-green-600 hover:bg-green-700 disabled:bg-gray-300 disabled:text-gray-500 text-white py-3 rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
            >
              <CheckCircle className="w-5 h-5" />
              ✓ Correct
            </button>
            <button
              onClick={handleHint}
              className="px-4 bg-gray-300 hover:bg-gray-400 text-gray-800 py-3 rounded-lg font-medium transition-colors flex items-center justify-center"
            >
              <HelpCircle className="w-5 h-5" />
            </button>
            <button
              onClick={handleNext}
              className="px-4 bg-gray-300 hover:bg-gray-400 text-gray-800 py-3 rounded-lg font-medium transition-colors flex items-center justify-center"
            >
              Next <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="mt-6 bg-white rounded-xl p-6 border-2 border-green-200 shadow-sm">
        <div className="flex items-center justify-between mb-2">
          <span className="text-gray-800 font-medium">Progress</span>
          <span className="text-gray-600">Level {level}</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-4 overflow-hidden">
          <div
            className="bg-gradient-to-r from-green-500 to-emerald-500 h-full transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
        <div className="mt-2 text-sm text-gray-600">
          {mode === 'fingerspelling' 
            ? `${currentIndex + 1} / ${ALPHABET.length} letters`
            : `${currentIndex + 1} / ${currentWord.length} letters in "${currentWord}"`
          }
        </div>
      </div>

      {/* Feedback Toast */}
      {showFeedback && (
        <div className={`fixed top-20 left-1/2 transform -translate-x-1/2 z-50 px-6 py-4 rounded-lg shadow-2xl transition-all ${
          showFeedback === 'correct' 
            ? 'bg-green-600 text-white' 
            : 'bg-red-500 text-white'
        }`}>
          {showFeedback === 'correct' ? '🎉 Good job!' : 'Try again'}
        </div>
      )}
    </div>
  );
}

export default Practice;

