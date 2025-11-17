// src/pages/Onboarding.tsx
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";

const onboardingSteps = [
  {
    icon: "👋",
    title: "Welcome!",
    description:
      "This app teaches Ghana Sign Language through interactive lessons",
    visual: "🇬🇭🤟",
    action: "Let's begin",
  },
  {
    icon: "📹",
    title: "How It Works",
    description: "Watch video demonstrations, then practice with your webcam",
    visual: "📹 → 🤟 → ✅",
    action: "Got it",
  },
  {
    icon: "🎯",
    title: "Your Learning Path",
    description: "Start with alphabets, then numbers, then common words",
    visual: "A-Z → 0-9 → 📝",
    action: "Sounds good",
  },
  {
    icon: "🤖",
    title: "AI Feedback",
    description:
      "Our AI will tell you if your sign is correct using visual cues",
    visual: "✅ ⚠️ ❌",
    action: "Understood",
  },
  {
    icon: "🔒",
    title: "Privacy First",
    description:
      "Your camera video never leaves your device. Everything runs locally.",
    visual: "📹 ↛ ☁️",
    action: "Start learning",
  },
];

export default function Onboarding() {
  const [currentStep, setCurrentStep] = useState(0);
  const navigate = useNavigate();

  const handleNext = () => {
    if (currentStep < onboardingSteps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      localStorage.setItem("onboarding_complete", "true");
      navigate("/learn");
    }
  };

  const step = onboardingSteps[currentStep];

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-600 to-blue-600 flex items-center justify-center p-4">
      <div className="max-w-2xl w-full">
        {/* Progress Dots */}
        <div className="flex justify-center gap-3 mb-12">
          {onboardingSteps.map((_, i) => (
            <div
              key={i}
              className={`h-3 rounded-full transition-all ${
                i === currentStep ? "w-12 bg-white" : "w-3 bg-white/30"
              }`}
            />
          ))}
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={currentStep}
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -50 }}
            className="bg-white rounded-3xl p-12 shadow-2xl"
          >
            {/* Large Icon */}
            <div className="text-8xl text-center mb-8">{step.icon}</div>

            {/* Title */}
            <h2 className="text-4xl font-bold text-center mb-6 text-gray-800">
              {step.title}
            </h2>

            {/* Description */}
            <p className="text-xl text-center text-gray-600 mb-8">
              {step.description}
            </p>

            {/* Visual Representation */}
            <div className="text-6xl text-center mb-12 bg-purple-50 rounded-2xl py-8">
              {step.visual}
            </div>

            {/* Action Button */}
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleNext}
              className="w-full bg-purple-600 text-white py-6 rounded-xl text-2xl font-bold hover:bg-purple-700 transition-colors"
            >
              {step.action} →
            </motion.button>

            {/* Skip Option */}
            {currentStep < onboardingSteps.length - 1 && (
              <button
                onClick={() => {
                  localStorage.setItem("onboarding_complete", "true");
                  navigate("/learn");
                }}
                className="w-full mt-4 text-gray-500 hover:text-gray-700 text-lg"
              >
                Skip tutorial
              </button>
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
