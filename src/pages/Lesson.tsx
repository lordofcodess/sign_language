// src/pages/Lesson.tsx
import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  Eye,
  Hand,
  Lightbulb,
  Check,
  ArrowRight,
  Video,
  CheckCircle,
  X,
  RotateCcw,
  Sparkles,
} from "lucide-react";
import SignDetector from "../components/SignDetector";

interface LessonItem {
  id: string;
  label: string;
  videoUrl: string;
  tips: string[];
}

export default function Lesson() {
  const { category } = useParams<{ category: string }>();
  const navigate = useNavigate();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showingVideo, setShowingVideo] = useState(true);
  const [lessonItems, setLessonItems] = useState<LessonItem[]>([]);

  useEffect(() => {
    loadLessonData(category!);
  }, [category]);

  const loadLessonData = async (cat: string) => {
    if (cat === "alphabets") {
      const items = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("").map((letter) => ({
        id: letter,
        label: letter,
        videoUrl: `/videos/alphabets/${letter}.mp4`,
        tips: [
          "Watch the hand shape carefully",
          "Pay attention to finger positions",
          "Note any movement required",
        ],
      }));
      setLessonItems(items);
    }
  };

  const currentItem = lessonItems[currentIndex];

  const handleNext = () => {
    if (currentIndex < lessonItems.length - 1) {
      setCurrentIndex(currentIndex + 1);
      setShowingVideo(true);
    } else {
      navigate("/practice");
    }
  };

  const handlePrevious = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
      setShowingVideo(true);
    }
  };

  if (!currentItem) return <div>Loading...</div>;

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50">
      {/* Progress Bar - GREEN for progress */}
      <div className="bg-green-600 w-[70%] ml-[15%] rounded-xl shadow-sm mb-5">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between mb-2">
            <button
              onClick={() => navigate("/learn")}
              className="text-white font-semibold hover:text-green-100 flex items-center gap-2"
            >
              <ArrowLeft size={20} />
              <span>Back to Lessons</span>
            </button>
            <span className="text-sm text-white font-medium">
              {currentIndex + 1} of {lessonItems.length}
            </span>
          </div>
          <div className="h-2 bg-white/30 rounded-full overflow-hidden">
            <div
              className="h-full bg-white transition-all duration-300"
              style={{
                width: `${((currentIndex + 1) / lessonItems.length) * 100}%`,
              }}
            />
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6">
        <div className="max-w-7xl mx-auto">
          {/* Current Sign Display */}
          <motion.div
            key={currentIndex}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-3xl shadow-2xl overflow-hidden mb-6"
          >
            {/* Large Sign Label - PURPLE/BLUE for learning/focus */}
            <div className="bg-gradient-to-r from-purple-600 to-blue-600 text-white py-4 text-center">
              <div className="text-6xl font-bold mb-2">{currentItem.label}</div>
              <div className="text-xl flex items-center justify-center gap-2">
                {showingVideo ? (
                  <span>Watch carefully</span>
                ) : (
                  <span>Your turn!</span>
                )}
              </div>
            </div>

            {/* Video/Practice Area */}
            <div className="p-6">
              <AnimatePresence mode="wait">
                {showingVideo ? (
                  <motion.div
                    key="video"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                  >
                    {/* Video + Tips Side by Side */}
                    <div className="grid grid-cols-2 gap-6 mb-6">
                      {/* Video Player - Left */}
                      <div className="bg-black rounded-2xl overflow-hidden flex items-center justify-center">
                        <video
                          src={currentItem.videoUrl}
                          controls
                          autoPlay
                          muted
                          loop
                          className="w-full h-full object-contain"
                        />
                      </div>

                      {/* Tips - Right - BLUE for information */}
                      <div className="bg-blue-50 rounded-xl p-6 flex flex-col justify-center">
                        <h3 className="text-2xl font-bold mb-6 flex items-center gap-2">
                          <Lightbulb className="text-yellow-500" size={28} />
                          <span>Key Points</span>
                        </h3>
                        <ul className="space-y-4">
                          {currentItem.tips.map((tip, i) => (
                            <li key={i} className="flex items-start gap-3">
                              <Check
                                className="text-blue-600 mt-1 flex-shrink-0"
                                size={24}
                              />
                              <span className="text-gray-700 text-lg">
                                {tip}
                              </span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-4">
                      {/* Practice Button - ORANGE for action/practice */}
                      <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => setShowingVideo(false)}
                        className="flex-1 bg-orange-500 hover:bg-orange-600 text-white font-bold py-4 rounded-xl text-xl flex items-center justify-center gap-2"
                      >
                        <Hand size={24} />
                        <span>Practice This Sign</span>
                      </motion.button>

                      {/* Next Button - GREEN for progress/continue */}
                      <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={handleNext}
                        className="flex-1 bg-green-600 hover:bg-green-700 text-white font-bold py-4 rounded-xl text-xl flex items-center justify-center gap-2"
                      >
                        <span>I Got It! Next</span>
                        <ArrowRight size={24} />
                      </motion.button>
                    </div>
                  </motion.div>
                ) : (
                  <motion.div
                    key="practice"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                  >
                    {/* Practice Mode with Webcam */}
                    <PracticeMode
                      targetSign={currentItem.label}
                      onSuccess={() => {
                        setShowingVideo(true);
                        setTimeout(handleNext, 1000);
                      }}
                      onRetry={() => setShowingVideo(true)}
                    />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>

          {/* Navigation */}
          <div className="flex justify-between">
            <button
              onClick={handlePrevious}
              disabled={currentIndex === 0}
              className="px-6 py-3 bg-gray-200 hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg font-bold flex items-center gap-2"
            >
              <ArrowLeft size={20} />
              <span>Previous</span>
            </button>

            {/* Exit Button - RED for stop/exit */}
            <button
              onClick={() => navigate("/learn")}
              className="px-6 py-3 bg-red-500 hover:bg-red-600 rounded-lg font-bold text-white"
            >
              Exit Lesson
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Practice Mode Component (embedded)
function PracticeMode({
  targetSign,
  onSuccess,
  onRetry,
}: {
  targetSign: string;
  onSuccess: () => void;
  onRetry: () => void;
}) {
  const [feedback, setFeedback] = useState<
    "idle" | "checking" | "correct" | "incorrect"
  >("idle");
  const [attempts, setAttempts] = useState(0);
  const [currentPrediction, setCurrentPrediction] = useState<string | null>(
    null
  );
  const [currentConfidence, setCurrentConfidence] = useState(0);

  const handleSignDetected = (sign: string, confidence: number) => {
    setCurrentPrediction(sign);
    setCurrentConfidence(confidence);
  };

  const handleMatch = () => {
    setFeedback("correct");
    setTimeout(() => {
      onSuccess();
    }, 2000);
  };

  const checkSign = () => {
    setAttempts((a) => a + 1);
    setFeedback("checking");

    setTimeout(() => {
      if (
        currentPrediction?.toUpperCase() === targetSign.toUpperCase() &&
        currentConfidence > 60
      ) {
        setFeedback("correct");
        setTimeout(() => {
          onSuccess();
        }, 2000);
      } else {
        setFeedback("incorrect");
        setTimeout(() => {
          setFeedback("idle");
        }, 2000);
      }
    }, 1500);
  };

  return (
    <div className="space-y-6">
      {/* Camera + Status Side by Side */}
      <div className="grid grid-cols-2 gap-6">
        {/* Sign Detector Component - Left */}
        <div className="relative">
          <SignDetector
            targetSign={targetSign}
            onSignDetected={handleSignDetected}
            onMatch={handleMatch}
            confidenceThreshold={60}
          />

          {/* Feedback Overlay - GREEN for success, RED for incorrect */}
          <AnimatePresence>
            {feedback === "correct" && (
              <motion.div
                initial={{ opacity: 0, scale: 0.5 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 bg-green-500/90 flex items-center justify-center rounded-2xl"
              >
                <div className="text-center text-white">
                  <CheckCircle
                    className="mx-auto mb-4"
                    size={120}
                    strokeWidth={2}
                  />
                  <div className="text-4xl font-bold">Perfect!</div>
                </div>
              </motion.div>
            )}

            {feedback === "incorrect" && (
              <motion.div
                initial={{ opacity: 0, scale: 0.5 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 bg-red-500/90 flex items-center justify-center rounded-2xl"
              >
                <div className="text-center text-white">
                  <X className="mx-auto mb-4" size={120} strokeWidth={2} />
                  <div className="text-4xl font-bold">Try Again</div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Status & Instructions - Right - PURPLE for learning context */}
        <div className="bg-purple-50 rounded-2xl p-8 flex flex-col justify-center">
          {/* Target Sign Indicator */}
          <div className="bg-green-100 border-2 border-green-500 rounded-xl p-4 text-center">
            <div className="text-sm text-green-700 font-semibold mb-1">
              Practice This Sign:
            </div>
            <div className="text-6xl font-bold text-green-900">
              {targetSign}
            </div>
          </div>
          <div className="text-center mb-8">
            <div className="flex justify-center mb-4">
              {feedback === "idle" && (
                <Eye className="text-gray-600" size={80} />
              )}
              {feedback === "checking" && (
                <Sparkles className="text-purple-600 animate-pulse" size={80} />
              )}
              {feedback === "correct" && (
                <CheckCircle className="text-green-600" size={80} />
              )}
              {feedback === "incorrect" && (
                <RotateCcw className="text-orange-600" size={80} />
              )}
            </div>
            <div className="text-2xl font-bold mb-4">
              {feedback === "idle" && "Show your sign when ready"}
              {feedback === "checking" && "Analyzing..."}
              {feedback === "correct" && "Excellent! Moving to next..."}
              {feedback === "incorrect" && "Not quite. Try again!"}
            </div>
            <div className="text-gray-600 flex items-center justify-center gap-2">
              <RotateCcw size={16} />
              <span>Attempt {attempts + 1}</span>
            </div>
          </div>

          {/* Current Detection */}
          {currentPrediction && (
            <div className="bg-white rounded-xl p-4 mb-6 text-center">
              <div className="text-sm text-gray-600 mb-1">Detecting:</div>
              <div className="text-3xl font-bold text-purple-600">
                {currentPrediction}
              </div>
              <div className="text-sm text-gray-500 mt-1">
                Confidence: {currentConfidence}%
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-4">
        {/* Watch Again - BLUE for learning/information */}
        <button
          onClick={onRetry}
          className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 rounded-xl text-xl flex items-center justify-center gap-2"
        >
          <Video size={24} />
          <span>Watch Video Again</span>
        </button>

        {/* Check Sign - GREEN for validation/submit */}
        <button
          onClick={checkSign}
          disabled={feedback === "checking"}
          className="flex-1 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white font-bold py-4 rounded-xl text-xl flex items-center justify-center gap-2"
        >
          <CheckCircle size={24} />
          <span>Check My Sign</span>
        </button>
      </div>
    </div>
  );
}
