// src/pages/Learn.tsx
import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import {
  GraduationCap,
  Type,
  Hash,
  FileText,
  Lock,
  CheckCircle,
  Flame,
  Clock,
  Target,
  Star,
} from "lucide-react";

type LessonCategory = "alphabets" | "numbers" | "words";

interface Progress {
  alphabets: number; // 0-26
  numbers: number; // 0-10
  words: number; // 0-100
}

export default function Learn() {
  const navigate = useNavigate();
  const [progress, setProgress] = useState<Progress>({
    alphabets: 0,
    numbers: 0,
    words: 0,
  });

  useEffect(() => {
    // Load progress from localStorage
    const saved = localStorage.getItem("gsl_progress");
    if (saved) setProgress(JSON.parse(saved));
  }, []);

  const lessons = [
    {
      id: "alphabets",
      title: "Alphabet (A-Z)",
      icon: Type,
      total: 26,
      completed: progress.alphabets,
      description: "Learn all 26 letter signs",
      color: "from-red-600 to-red-600",
      locked: false,
    },
    {
      id: "numbers",
      title: "Numbers (0-9)",
      icon: Hash,
      total: 10,
      completed: progress.numbers,
      description: "Master number signs",
      color: "from-yellow-500 to-yellow-500",
      locked: progress.alphabets < 26,
    },
    {
      id: "words",
      title: "Common Words",
      icon: FileText,
      total: 100,
      completed: progress.words,
      description: "Everyday vocabulary",
      color: "from-green-500 to-green-500",
      locked: progress.numbers < 10,
    },
  ];

  const startLesson = (category: LessonCategory, locked: boolean) => {
    if (locked) return;
    navigate(`/lesson/${category}`);
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="container mx-auto px-4">
        {/* Header with Overall Progress */}
        <div className="bg-white rounded-2xl p-4 shadow-lg mb-12">
          <h1 className="text-4xl font-bold mb-6 flex items-center gap-4">
            <GraduationCap className="text-green-600" size={48} />
            <span>Your Learning Journey</span>
          </h1>

          {/* Overall Progress Bar */}
          <div className="mb-4">
            <div className="flex justify-between text-sm text-green-600 font-bold mb-2">
              <span>Overall Progress</span>
              <span>
                {Math.round(
                  ((progress.alphabets + progress.numbers + progress.words) /
                    136) *
                    100
                )}
                %
              </span>
            </div>
            <div className="h-4 bg-gray-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-purple-500 to-blue-500 transition-all duration-500"
                style={{
                  width: `${
                    ((progress.alphabets + progress.numbers + progress.words) /
                      136) *
                    100
                  }%`,
                }}
              />
            </div>
          </div>

          <p className="text-gray-600 text-lg">
            {progress.alphabets + progress.numbers + progress.words} of 136
            signs learned
          </p>
        </div>

        {/* Lesson Cards */}
        <div className="grid md:grid-cols-3 gap-8">
          {lessons.map((lesson, index) => {
            const percentage = (lesson.completed / lesson.total) * 100;
            const isComplete = lesson.completed === lesson.total;
            const IconComponent = lesson.icon;

            return (
              <motion.div
                key={lesson.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                whileHover={lesson.locked ? {} : { scale: 1.02 }}
                onClick={() =>
                  startLesson(lesson.id as LessonCategory, lesson.locked)
                }
                className={`
                  relative overflow-hidden rounded-2xl shadow-xl cursor-pointer
                  ${lesson.locked ? "opacity-50 cursor-not-allowed" : ""}
                `}
              >
                {/* Background Gradient */}
                <div
                  className={`bg-gradient-to-br ${lesson.color} p-4 text-white h-full`}
                >
                  {/* Lock Badge */}
                  {lesson.locked && (
                    <div className="absolute top-4 right-4 bg-white/20 backdrop-blur-sm rounded-full p-3">
                      <Lock size={32} />
                    </div>
                  )}

                  {/* Completion Badge */}
                  {isComplete && (
                    <div className="absolute top-4 right-4 bg-white/20 backdrop-blur-sm rounded-full p-3">
                      <CheckCircle size={32} />
                    </div>
                  )}

                  {/* Icon */}
                  <div className="mb-6">
                    <IconComponent size={72} strokeWidth={1.5} />
                  </div>

                  {/* Title */}
                  <h2 className="text-3xl font-bold mb-3">{lesson.title}</h2>

                  {/* Description */}
                  <p className="text-white/90 text-lg mb-6">
                    {lesson.description}
                  </p>

                  {/* Progress */}
                  <div className="mb-4">
                    <div className="flex justify-between text-sm mb-2">
                      <span>
                        {lesson.completed} / {lesson.total}
                      </span>
                      <span>{Math.round(percentage)}%</span>
                    </div>
                    <div className="h-3 bg-white/20 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-white transition-all duration-500"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>

                  {/* CTA */}
                  {!lesson.locked && (
                    <button className="w-full bg-white/50 backdrop-blur-sm hover:bg-white/30 text-white font-bold py-3 rounded-lg transition-colors">
                      {lesson.completed === 0
                        ? "Start Lesson"
                        : "Continue Learning"}
                    </button>
                  )}

                  {lesson.locked && (
                    <div className="text-center text-white/80 text-sm">
                      Complete previous lesson to unlock
                    </div>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Quick Stats */}
        <div className="mt-12 grid md:grid-cols-4 gap-6">
          {[
            {
              icon: Flame,
              label: "Day Streak",
              value: "3",
              color: "text-orange-500",
            },
            {
              icon: Clock,
              label: "Time Today",
              value: "15m",
              color: "text-blue-500",
            },
            {
              icon: Target,
              label: "Accuracy",
              value: "87%",
              color: "text-green-500",
            },
            {
              icon: Star,
              label: "Stars Earned",
              value: "24",
              color: "text-yellow-500",
            },
          ].map((stat, i) => {
            const StatIcon = stat.icon;
            return (
              <motion.div
                key={i}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: i * 0.1 }}
                className="bg-white rounded-xl p-6 shadow-lg text-center"
              >
                <div className={`${stat.color} mb-2 flex justify-center`}>
                  <StatIcon size={48} strokeWidth={1.5} />
                </div>
                <div className="text-2xl font-bold text-gray-800 mb-1">
                  {stat.value}
                </div>
                <div className="text-sm text-gray-600">{stat.label}</div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
