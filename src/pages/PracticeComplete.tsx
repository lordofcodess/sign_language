import { useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import confetti from "canvas-confetti";

export default function PracticeComplete() {
  const navigate = useNavigate();
  const location = useLocation();

  const { score = 0, total = 0, accuracy = 0 } = location.state || {};

  useEffect(() => {
    // Celebration confetti on mount
    const duration = 3000;
    const end = Date.now() + duration;

    const frame = () => {
      confetti({
        particleCount: 2,
        angle: 60,
        spread: 55,
        origin: { x: 0 },
        colors: ["#9333ea", "#3b82f6", "#10b981"],
      });
      confetti({
        particleCount: 2,
        angle: 120,
        spread: 55,
        origin: { x: 1 },
        colors: ["#9333ea", "#3b82f6", "#10b981"],
      });

      if (Date.now() < end) {
        requestAnimationFrame(frame);
      }
    };

    frame();
  }, []);

  const getPerformanceMessage = () => {
    if (accuracy >= 90)
      return { emoji: "🏆", text: "Outstanding!", color: "purple" };
    if (accuracy >= 75)
      return { emoji: "⭐", text: "Great Job!", color: "blue" };
    if (accuracy >= 60)
      return { emoji: "👍", text: "Well Done!", color: "green" };
    return { emoji: "💪", text: "Keep Practicing!", color: "yellow" };
  };

  const performance = getPerformanceMessage();

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-600 via-blue-600 to-indigo-700 flex items-center justify-center p-4">
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.5 }}
        className="max-w-2xl w-full bg-white rounded-3xl shadow-2xl overflow-hidden"
      >
        {/* Header */}
        <div
          className={`bg-gradient-to-r from-${performance.color}-500 to-${performance.color}-600 text-white p-8 text-center`}
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: [0, 1.2, 1] }}
            transition={{ delay: 0.2, duration: 0.6 }}
            className="text-9xl mb-4"
          >
            {performance.emoji}
          </motion.div>
          <h1 className="text-5xl font-bold mb-2">{performance.text}</h1>
          <p className="text-2xl opacity-90">Practice Session Complete!</p>
        </div>

        {/* Stats */}
        <div className="p-8">
          <div className="grid grid-cols-3 gap-6 mb-8">
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="text-center"
            >
              <div className="text-5xl font-bold text-purple-600">{score}</div>
              <div className="text-gray-600 mt-2">Points</div>
            </motion.div>

            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.4 }}
              className="text-center"
            >
              <div className="text-5xl font-bold text-blue-600">{total}</div>
              <div className="text-gray-600 mt-2">Signs Practiced</div>
            </motion.div>

            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.5 }}
              className="text-center"
            >
              <div className="text-5xl font-bold text-green-600">
                {accuracy}%
              </div>
              <div className="text-gray-600 mt-2">Accuracy</div>
            </motion.div>
          </div>

          {/* Progress Circle */}
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.6, type: "spring" }}
            className="flex justify-center mb-8"
          >
            <div className="relative w-48 h-48">
              <svg className="transform -rotate-90 w-48 h-48">
                <circle
                  cx="96"
                  cy="96"
                  r="88"
                  stroke="#e5e7eb"
                  strokeWidth="12"
                  fill="none"
                />
                <motion.circle
                  cx="96"
                  cy="96"
                  r="88"
                  stroke="url(#gradient)"
                  strokeWidth="12"
                  fill="none"
                  strokeLinecap="round"
                  initial={{ strokeDasharray: "0 552" }}
                  animate={{ strokeDasharray: `${(accuracy / 100) * 552} 552` }}
                  transition={{ delay: 0.8, duration: 1.5 }}
                />
                <defs>
                  <linearGradient id="gradient" x1="0%" y1="0%" x2="100%">
                    <stop offset="0%" stopColor="#9333ea" />
                    <stop offset="100%" stopColor="#3b82f6" />
                  </linearGradient>
                </defs>
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center">
                  <div className="text-4xl font-bold text-gray-800">
                    {accuracy}%
                  </div>
                  <div className="text-sm text-gray-600">Complete</div>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Encouragement Messages */}
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.9 }}
            className="bg-purple-50 rounded-2xl p-6 mb-6"
          >
            <p className="text-center text-lg text-gray-700">
              {accuracy >= 90 &&
                "You're a natural! Keep up the amazing work! 🌟"}
              {accuracy >= 75 &&
                accuracy < 90 &&
                "You're making excellent progress! Keep practicing! 💫"}
              {accuracy >= 60 &&
                accuracy < 75 &&
                "Nice effort! Practice makes perfect! 🎯"}
              {accuracy < 60 &&
                "Every expert was once a beginner. Don't give up! 🚀"}
            </p>
          </motion.div>

          {/* Action Buttons */}
          <div className="space-y-4">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => navigate("/learn")}
              className="w-full bg-gradient-to-r from-purple-600 to-blue-600 text-white font-bold py-4 rounded-xl text-lg shadow-lg hover:shadow-xl transition-shadow"
            >
              🎓 Continue Learning
            </motion.button>

            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => navigate("/practice", { state: location.state })}
              className="w-full bg-white border-2 border-purple-600 text-purple-600 font-bold py-4 rounded-xl text-lg hover:bg-purple-50 transition-colors"
            >
              🔄 Practice Again
            </motion.button>

            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => navigate("/")}
              className="w-full bg-gray-200 text-gray-700 font-bold py-4 rounded-xl text-lg hover:bg-gray-300 transition-colors"
            >
              🏠 Home
            </motion.button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
