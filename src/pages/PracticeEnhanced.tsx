import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  Camera,
  CameraOff,
  Award,
  Zap,
  CheckCircle,
  XCircle,
  Star,
  Trophy,
  Target,
  FileText,
  Palette,
  Users,
  Send,
  Lightbulb,
  Clock,
} from "lucide-react";

type PracticeMode = "quiz" | "freestyle" | "challenge";
type Difficulty = "easy" | "medium" | "hard";

const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");
const NUMBERS = "0123456789".split("");
const BASIC_WORDS: string[] = [
  "HELLO",
  "WATER",
  "THANK",
  "YES",
  "NO",
  "PLEASE",
  "SORRY",
  "HELP",
];

export default function PracticeEnhanced() {
  const navigate = useNavigate();
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [mode, setMode] = useState<PracticeMode | null>(null);
  const [difficulty, setDifficulty] = useState<Difficulty>("easy");
  const [cameraEnabled, setCameraEnabled] = useState(false);
  const [predictedSign, setPredictedSign] = useState("");
  const [confidence, setConfidence] = useState(0);
  const [currentChallenge, setCurrentChallenge] = useState("");
  const [currentQuestions, setCurrentQuestions] = useState<string[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [totalQuestions, setTotalQuestions] = useState(0);
  const [stars, setStars] = useState(0);
  const [showFeedback, setShowFeedback] = useState<
    "correct" | "incorrect" | null
  >(null);
  const [showHint, setShowHint] = useState(false);
  const [showChallengeModal, setShowChallengeModal] = useState(false);

  useEffect(() => {
    // Load stars from localStorage
    const savedStars = localStorage.getItem("practiceStars");
    if (savedStars) setStars(parseInt(savedStars));

    return () => stopCamera();
  }, []);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 480, facingMode: "user" },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setCameraEnabled(true);
      }
    } catch (error) {
      console.error("Error accessing camera:", error);
      alert("Unable to access camera. Please check permissions.");
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setCameraEnabled(false);
  };

  const startQuiz = (diff: Difficulty) => {
    setDifficulty(diff);
    setMode("quiz");

    // Generate questions based on difficulty
    let questions: string[] = [];
    if (diff === "easy") {
      questions = ALPHABET.slice(0, 10).sort(() => Math.random() - 0.5);
    } else if (diff === "medium") {
      questions = [...ALPHABET.slice(0, 15), ...NUMBERS.slice(0, 5)].sort(
        () => Math.random() - 0.5
      );
    } else {
      questions = [...ALPHABET, ...NUMBERS]
        .sort(() => Math.random() - 0.5)
        .slice(0, 20);
    }

    setCurrentQuestions(questions);
    setCurrentQuestionIndex(0);
    setScore(0);
    setTotalQuestions(questions.length);
    setCurrentChallenge(questions[0]);
    startCamera();
  };

  const checkAnswer = () => {
    // Simulate sign recognition (in production, use your ML model)
    const isCorrect = Math.random() > 0.3; // 70% success rate for demo

    if (isCorrect) {
      setShowFeedback("correct");
      setScore((s) => s + 1);
      setStars((s) => {
        const newStars = s + 10;
        localStorage.setItem("practiceStars", newStars.toString());
        return newStars;
      });

      // Confetti effect
      setTimeout(() => {
        if (currentQuestionIndex < currentQuestions.length - 1) {
          setCurrentQuestionIndex((i) => i + 1);
          setCurrentChallenge(currentQuestions[currentQuestionIndex + 1]);
          setShowFeedback(null);
        } else {
          // Quiz complete!
          stopCamera();
          setTimeout(() => {
            navigate("/practice-complete", {
              state: {
                score,
                stars: stars + 10,
                difficulty,
                mode: "quiz",
              },
            });
          }, 500);
        }
      }, 1500);
    } else {
      setShowFeedback("incorrect");
      setTimeout(() => setShowFeedback(null), 1500);
    }
  };

  const startFreestyle = () => {
    setMode("freestyle");
    startCamera();
  };

  const startChallenge = () => {
    setShowChallengeModal(true);
  };

  const sendTelegramChallenge = () => {
    // Create challenge message
    const challengeText = `🤟 GSL Sign Language Challenge! 🤟\n\nI challenge you to beat my score!\n\n⭐ My Stars: ${stars}\n🎯 Difficulty: ${difficulty.toUpperCase()}\n\nJoin me on GSL Learning App and accept this challenge!`;

    // Encode challenge data
    const challengeData = btoa(
      JSON.stringify({
        stars,
        difficulty,
        challenger: "You",
        timestamp: Date.now(),
      })
    );

    // Deep link to app with challenge
    const appLink = `${window.location.origin}/challenge/${challengeData}`;

    // Open Telegram with pre-filled message
    const telegramUrl = `t.me/wotegslbot`;

    window.open(telegramUrl, "_blank");
    setShowChallengeModal(false);
  };

  // Mode Selection Screen
  if (!mode) {
    return (
      <div className="min-h-screen bg-white">
        <div className="container mx-auto px-4 py-8">
          {/* Header - Duolingo Style */}
          <div className="flex items-center justify-between mb-12">
            <button
              onClick={() => navigate("/learn")}
              className="flex items-center gap-2 text-gray-600 hover:text-gray-800 font-bold"
            >
              <ArrowLeft size={24} />
              <span>Back</span>
            </button>

            <div className="flex items-center gap-3 bg-[#ffc800] rounded-2xl px-6 py-3 shadow-lg">
              <Star className="text-white" fill="currentColor" size={24} />
              <span className="text-white font-black text-xl">{stars}</span>
            </div>
          </div>

          {/* Title */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-16"
          >
            <h1 className="text-6xl font-black text-gray-800 mb-4">
              Practice Time!
            </h1>
            <p className="text-2xl text-gray-600 font-bold">
              Choose your practice mode
            </p>
          </motion.div>

          {/* Practice Modes */}
          <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {/* Quiz Mode */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-white border-4 border-[#e5e5e5] rounded-3xl p-8 shadow-xl hover:border-[#58cc02] transition-colors"
            >
              <div className="text-center">
                <FileText
                  className="mx-auto mb-6 text-[#1cb0f6]"
                  size={80}
                  strokeWidth={2}
                />
                <h2 className="text-3xl font-black text-gray-800 mb-4">
                  Quiz Mode
                </h2>
                <p className="text-lg text-gray-600 font-bold mb-8">
                  Test your knowledge with guided challenges
                </p>

                <div className="space-y-4">
                  <button
                    onClick={() => startQuiz("easy")}
                    className="w-full bg-[#58cc02] hover:bg-[#58a700] text-white font-black py-4 rounded-2xl text-xl transition-all shadow-lg border-b-4 border-[#58a700] hover:border-b-2"
                  >
                    Easy (10 signs)
                  </button>
                  <button
                    onClick={() => startQuiz("medium")}
                    className="w-full bg-[#ffc800] hover:bg-[#d9a500] text-white font-black py-4 rounded-2xl text-xl transition-all shadow-lg border-b-4 border-[#d9a500] hover:border-b-2"
                  >
                    Medium (20 signs)
                  </button>
                  <button
                    onClick={() => startQuiz("hard")}
                    className="w-full bg-[#ff4b4b] hover:bg-[#ea2b2b] text-white font-black py-4 rounded-2xl text-xl transition-all shadow-lg border-b-4 border-[#ea2b2b] hover:border-b-2"
                  >
                    Hard (30 signs)
                  </button>
                </div>
              </div>
            </motion.div>

            {/* Freestyle Mode */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="bg-white border-4 border-[#e5e5e5] rounded-3xl p-8 shadow-xl hover:border-[#1cb0f6] transition-colors"
            >
              <div className="text-center">
                <Palette
                  className="mx-auto mb-6 text-[#ce82ff]"
                  size={80}
                  strokeWidth={2}
                />
                <h2 className="text-3xl font-black text-gray-800 mb-4">
                  Freestyle
                </h2>
                <p className="text-lg text-gray-600 font-bold mb-8">
                  Practice any sign at your own pace
                </p>

                <button
                  onClick={startFreestyle}
                  className="w-full bg-[#ce82ff] hover:bg-[#a568cc] text-white font-black py-6 rounded-2xl text-xl transition-all shadow-lg border-b-4 border-[#a568cc] hover:border-b-2"
                >
                  Start Practicing
                </button>

                <div className="mt-6 space-y-2">
                  <div className="flex items-center justify-center gap-2 text-gray-600">
                    <CheckCircle size={16} className="text-[#58cc02]" />
                    <span className="text-sm font-bold">No pressure</span>
                  </div>
                  <div className="flex items-center justify-center gap-2 text-gray-600">
                    <CheckCircle size={16} className="text-[#58cc02]" />
                    <span className="text-sm font-bold">
                      Real-time feedback
                    </span>
                  </div>
                  <div className="flex items-center justify-center gap-2 text-gray-600">
                    <CheckCircle size={16} className="text-[#58cc02]" />
                    <span className="text-sm font-bold">Practice any sign</span>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Challenge Mode */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="bg-white border-4 border-[#e5e5e5] rounded-3xl p-8 shadow-xl hover:border-[#ff9600] transition-colors relative overflow-hidden"
            >
              <div className="absolute top-4 right-4 bg-[#ff9600] text-white px-4 py-2 rounded-full text-sm font-black shadow-lg">
                BETA
              </div>

              <div className="text-center">
                <Trophy
                  className="mx-auto mb-6 text-[#ffc800]"
                  size={80}
                  strokeWidth={2}
                />
                <h2 className="text-3xl font-black text-gray-800 mb-4">
                  Challenge
                </h2>
                <p className="text-lg text-gray-600 font-bold mb-8">
                  Challenge your friends on Telegram
                </p>

                <button
                  onClick={startChallenge}
                  className="w-full bg-gradient-to-r from-[#ff9600] to-[#ff4b4b] hover:from-[#e07b00] hover:to-[#ea2b2b] text-white font-black py-6 rounded-2xl text-xl transition-all shadow-lg border-b-4 border-[#ea2b2b] hover:border-b-2"
                >
                  Challenge Friend
                </button>

                <div className="mt-6 space-y-2">
                  <div className="flex items-center justify-center gap-2 text-gray-600">
                    <Users size={16} className="text-[#1cb0f6]" />
                    <span className="text-sm font-bold">Multiplayer</span>
                  </div>
                  <div className="flex items-center justify-center gap-2 text-gray-600">
                    <Send size={16} className="text-[#0088cc]" />
                    <span className="text-sm font-bold">Via Telegram</span>
                  </div>
                  <div className="flex items-center justify-center gap-2 text-gray-600">
                    <Trophy size={16} className="text-[#ffc800]" />
                    <span className="text-sm font-bold">Earn extra stars</span>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>

        {/* Challenge Modal */}
        <AnimatePresence>
          {showChallengeModal && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
              onClick={() => setShowChallengeModal(false)}
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                onClick={(e) => e.stopPropagation()}
                className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl border-4 border-[#e5e5e5]"
              >
                <div className="text-center mb-6">
                  <Users
                    className="mx-auto mb-4 text-[#58cc02]"
                    size={80}
                    strokeWidth={2}
                  />
                  <h2 className="text-3xl font-black text-gray-800 mb-2">
                    Challenge a Friend!
                  </h2>
                  <p className="text-gray-600 font-bold">
                    Share your progress and challenge them to beat it
                  </p>
                </div>

                <div className="bg-[#f7f7f7] rounded-2xl p-6 mb-6 border-2 border-[#e5e5e5]">
                  <div className="flex justify-between items-center mb-3">
                    <span className="text-gray-600 font-bold">Your Stars:</span>
                    <div className="flex items-center gap-2">
                      <Star
                        className="text-[#ffc800]"
                        size={24}
                        fill="currentColor"
                      />
                      <span className="text-2xl font-black text-[#58cc02]">
                        {stars}
                      </span>
                    </div>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600 font-bold">Difficulty:</span>
                    <span className="text-xl font-black text-gray-800 uppercase">
                      {difficulty}
                    </span>
                  </div>
                </div>

                <button
                  onClick={sendTelegramChallenge}
                  className="w-full bg-[#0088cc] hover:bg-[#006699] text-white font-black py-5 rounded-2xl text-xl flex items-center justify-center gap-3 transition-all shadow-lg border-b-4 border-[#006699] hover:border-b-2 mb-3"
                >
                  <Send size={28} />
                  <span>Share on Telegram</span>
                </button>

                <button
                  onClick={() => setShowChallengeModal(false)}
                  className="w-full bg-[#e5e5e5] hover:bg-[#d0d0d0] text-gray-700 font-bold py-4 rounded-2xl transition-all"
                >
                  Cancel
                </button>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  }

  // Practice Session Screen
  return (
    <div className="min-h-screen bg-white">
      {/* Header - GREEN Duolingo style */}
      <div className="bg-[#58cc02] shadow-lg">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between mb-3">
            <button
              onClick={() => {
                setMode(null);
                stopCamera();
              }}
              className="flex items-center gap-2 text-white hover:opacity-80 font-bold"
            >
              <ArrowLeft size={20} />
              <span>Exit</span>
            </button>

            {mode === "quiz" && (
              <div className="flex items-center gap-4">
                <span className="text-white font-bold">
                  {currentQuestionIndex + 1} / {totalQuestions}
                </span>
                <div className="flex items-center gap-2 bg-white/20 px-4 py-2 rounded-2xl">
                  <CheckCircle size={20} className="text-white" />
                  <span className="font-black text-white">{score}</span>
                </div>
              </div>
            )}
          </div>

          {mode === "quiz" && (
            <div className="h-4 bg-white/30 rounded-full overflow-hidden">
              <div
                className="h-full bg-white transition-all duration-300"
                style={{
                  width: `${
                    ((currentQuestionIndex + 1) / totalQuestions) * 100
                  }%`,
                }}
              />
            </div>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto">
          <div className="grid md:grid-cols-2 gap-8">
            {/* Camera Feed */}
            <div className="relative">
              <div className="bg-black rounded-2xl overflow-hidden aspect-video relative border-4 border-[#e5e5e5]">
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover mirror"
                />

                {!cameraEnabled && (
                  <div className="absolute inset-0 flex items-center justify-center bg-gray-900">
                    <div className="text-center text-white">
                      <CameraOff
                        size={64}
                        className="mx-auto mb-4 opacity-50"
                      />
                      <p className="text-xl font-bold">Camera starting...</p>
                    </div>
                  </div>
                )}

                {/* Feedback Overlay */}
                <AnimatePresence>
                  {showFeedback === "correct" && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.5 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0 }}
                      className="absolute inset-0 bg-[#58cc02] flex items-center justify-center"
                    >
                      <div className="text-center text-white">
                        <CheckCircle size={120} strokeWidth={3} />
                        <div className="text-5xl font-black mt-4">Perfect!</div>
                      </div>
                    </motion.div>
                  )}

                  {showFeedback === "incorrect" && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.5 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0 }}
                      className="absolute inset-0 bg-[#ff4b4b] flex items-center justify-center"
                    >
                      <div className="text-center text-white">
                        <XCircle size={120} strokeWidth={3} />
                        <div className="text-5xl font-black mt-4">
                          Try Again!
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Hand Detection Indicator */}
                {cameraEnabled && !showFeedback && (
                  <div className="absolute bottom-4 left-4 bg-white rounded-2xl px-4 py-2 shadow-lg border-2 border-[#e5e5e5]">
                    <div className="flex items-center gap-2">
                      <div
                        className={`w-3 h-3 rounded-full ${
                          confidence > 70 ? "bg-[#58cc02]" : "bg-[#ffc800]"
                        }`}
                      />
                      <span className="font-bold text-sm text-gray-800">
                        {confidence > 0 ? `${confidence}%` : "Show hand"}
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* Camera Controls */}
              <div className="mt-4 flex gap-4">
                <button
                  onClick={cameraEnabled ? stopCamera : startCamera}
                  className="flex-1 bg-[#e5e5e5] hover:bg-[#d0d0d0] text-gray-800 font-black py-4 rounded-2xl flex items-center justify-center gap-2 shadow-lg border-b-4 border-[#afafaf] hover:border-b-2"
                >
                  {cameraEnabled ? (
                    <CameraOff size={20} />
                  ) : (
                    <Camera size={20} />
                  )}
                  {cameraEnabled ? "Stop Camera" : "Start Camera"}
                </button>
              </div>
            </div>

            {/* Challenge Panel */}
            <div className="space-y-6">
              {/* Current Challenge */}
              <div className="bg-white border-4 border-[#e5e5e5] rounded-2xl p-8 shadow-xl">
                <h2 className="text-2xl font-black text-gray-800 mb-4">
                  {mode === "quiz" ? "Show this sign:" : "Practice Mode"}
                </h2>

                <div className="text-center">
                  <div className="text-9xl font-black text-[#58cc02] mb-6">
                    {currentChallenge || "Ready?"}
                  </div>

                  {mode === "quiz" && (
                    <div className="space-y-4">
                      <button
                        onClick={checkAnswer}
                        disabled={!cameraEnabled}
                        className="w-full bg-[#58cc02] hover:bg-[#58a700] disabled:bg-gray-400 disabled:border-gray-500 text-white font-black py-5 rounded-2xl text-xl transition-all shadow-lg border-b-4 border-[#58a700] hover:border-b-2 disabled:border-b-4 flex items-center justify-center gap-2"
                      >
                        <CheckCircle size={24} />
                        <span>CHECK</span>
                      </button>

                      <button
                        onClick={() => setShowHint(!showHint)}
                        className="w-full bg-[#1cb0f6] hover:bg-[#1899d6] text-white font-black py-4 rounded-2xl transition-all shadow-lg border-b-4 border-[#1899d6] hover:border-b-2 flex items-center justify-center gap-2"
                      >
                        <Lightbulb size={24} />
                        <span>HINT</span>
                      </button>

                      {showHint && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          className="bg-[#ddf4ff] border-2 border-[#1cb0f6] rounded-xl p-4 text-left"
                        >
                          <p className="text-sm text-gray-700 font-bold">
                            <strong>Tip:</strong> Watch your hand position
                            carefully. Make sure all fingers are clearly visible
                            to the camera.
                          </p>
                        </motion.div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-white border-4 border-[#e5e5e5] rounded-2xl p-6 text-center shadow-lg">
                  <Trophy className="mx-auto mb-2 text-[#ffc800]" size={40} />
                  <div className="text-4xl font-black text-gray-800">
                    {stars}
                  </div>
                  <div className="text-sm text-gray-600 font-bold">Stars</div>
                </div>

                <div className="bg-white border-4 border-[#e5e5e5] rounded-2xl p-6 text-center shadow-lg">
                  <Target className="mx-auto mb-2 text-[#58cc02]" size={40} />
                  <div className="text-4xl font-black text-gray-800">
                    {mode === "quiz" ? `${score}/${totalQuestions}` : "∞"}
                  </div>
                  <div className="text-sm text-gray-600 font-bold">Score</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        .mirror {
          transform: scaleX(-1);
        }
      `}</style>
    </div>
  );
}
