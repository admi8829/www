import React, { useState, useEffect, useRef } from 'react';
import { 
  Smartphone, 
  Database, 
  Code2, 
  ChevronRight, 
  Check, 
  X, 
  RefreshCw, 
  Download, 
  ArrowLeft, 
  Award, 
  Clock, 
  Terminal, 
  Copy, 
  BookOpen, 
  History, 
  ExternalLink, 
  Layers, 
  Info,
  CheckCircle,
  HelpCircle,
  Play
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Question, HighScore, QuizState } from './types';
import { ETHIOPIAN_GRADE_10_QUESTIONS } from './data';
import { KOTLIN_PROJECT_FILES } from './kotlinCode';
import { getHighScores, saveHighScore, resetScores, executeQuery, SQLResult } from './dbSimulation';

// Sound effect generator using Web Audio API
function playSound(type: 'correct' | 'incorrect' | 'click') {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    const audioCtx = new AudioContextClass();
    
    if (type === 'click') {
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(500, audioCtx.currentTime);
      gain.gain.setValueAtTime(0.02, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + 0.08);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.08);
    } else if (type === 'correct') {
      const osc1 = audioCtx.createOscillator();
      const osc2 = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      
      osc1.type = 'triangle';
      osc2.type = 'triangle';
      
      osc1.frequency.setValueAtTime(523.25, audioCtx.currentTime); // C5
      osc2.frequency.setValueAtTime(659.25, audioCtx.currentTime + 0.06); // E5
      
      gain.gain.setValueAtTime(0.04, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.25);
      
      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(audioCtx.destination);
      
      osc1.start();
      osc2.start(audioCtx.currentTime + 0.06);
      osc1.stop(audioCtx.currentTime + 0.25);
      osc2.stop(audioCtx.currentTime + 0.25);
    } else if (type === 'incorrect') {
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(140, audioCtx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(80, audioCtx.currentTime + 0.22);
      
      gain.gain.setValueAtTime(0.04, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + 0.25);
      
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      
      osc.start();
      osc.stop(audioCtx.currentTime + 0.25);
    }
  } catch (e) {
    // Silently proceed if AudioContext is blocked by browser policies until user interacts
  }
}

export default function App() {
  // Mobile App Core States
  const [activeTab, setActiveTab] = useState<'emulator' | 'code' | 'database' | 'guide'>('emulator');
  const [highScores, setHighScores] = useState<HighScore[]>(() => getHighScores());
  
  // Custom quiz sequence state
  const [quiz, setQuiz] = useState<QuizState>({
    status: 'dashboard',
    currentSubject: null,
    questions: [],
    currentQuestionIndex: 0,
    selectedOptionIndex: null,
    isAnswerChecked: false,
    score: 0,
    timeRemaining: 30,
    answersHistory: []
  });

  // Source code file viewer states
  const [selectedFileIndex, setSelectedFileIndex] = useState(3); // Default to QuizViewModel.kt style
  const [copyFeedback, setCopyFeedback] = useState(false);
  
  // Custom database console state
  const [sqlQuery, setSqlQuery] = useState('SELECT * FROM quiz_scores');
  const [sqlResult, setSqlResult] = useState<SQLResult | null>(null);

  // Time Ref to maintain correct ticking in countdown timers
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Load standard template SQL results initially
  useEffect(() => {
    runSimulatedSQL('SELECT * FROM quiz_scores');
  }, [highScores]);

  // Run countdown logic when quiz is active
  useEffect(() => {
    if (quiz.status === 'active' && quiz.currentSubject && !quiz.isAnswerChecked) {
      timerRef.current = setInterval(() => {
        setQuiz(prev => {
          if (prev.timeRemaining <= 1) {
            if (timerRef.current) clearInterval(timerRef.current);
            // Handle timeout automatically
            playSound('incorrect');
            const currentQ = prev.questions[prev.currentQuestionIndex];
            return {
              ...prev,
              timeRemaining: 0,
              isAnswerChecked: true,
              answersHistory: [
                ...prev.answersHistory,
                {
                  questionIndex: prev.currentQuestionIndex,
                  questionText: currentQ.text,
                  selectedOption: null,
                  correctOption: currentQ.options[currentQ.correctAnswerIndex],
                  isCorrect: false,
                  explanation: currentQ.explanation
                }
              ]
            };
          }
          return {
            ...prev,
            timeRemaining: prev.timeRemaining - 1
          };
        });
      }, 1000);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [quiz.status, quiz.currentQuestionIndex, quiz.isAnswerChecked, quiz.currentSubject]);

  // Action methods
  const handleStartQuiz = (subject: 'Physics' | 'Chemistry' | 'Biology') => {
    playSound('click');
    const filtered = ETHIOPIAN_GRADE_10_QUESTIONS.filter(q => q.subject === subject);
    // Shuffle or select 5 questions max
    const selectedBatch = [...filtered].sort(() => 0.5 - Math.random()).slice(0, 5);
    
    setQuiz({
      status: 'active',
      currentSubject: subject,
      questions: selectedBatch,
      currentQuestionIndex: 0,
      selectedOptionIndex: null,
      isAnswerChecked: false,
      score: 0,
      timeRemaining: 30,
      answersHistory: []
    });
  };

  const selectOption = (idx: number) => {
    if (quiz.isAnswerChecked) return;
    playSound('click');
    setQuiz(prev => ({ ...prev, selectedOptionIndex: idx }));
  };

  const submitAnswer = () => {
    if (quiz.selectedOptionIndex === null || quiz.isAnswerChecked) return;
    if (timerRef.current) clearInterval(timerRef.current);

    const currentQ = quiz.questions[quiz.currentQuestionIndex];
    const isCorrect = quiz.selectedOptionIndex === currentQ.correctAnswerIndex;

    if (isCorrect) {
      playSound('correct');
    } else {
      playSound('incorrect');
    }

    setQuiz(prev => {
      const nextScore = isCorrect ? prev.score + 1 : prev.score;
      return {
        ...prev,
        isAnswerChecked: true,
        score: nextScore,
        answersHistory: [
          ...prev.answersHistory,
          {
            questionIndex: prev.currentQuestionIndex,
            questionText: currentQ.text,
            selectedOption: currentQ.options[prev.selectedOptionIndex!],
            correctOption: currentQ.options[currentQ.correctAnswerIndex],
            isCorrect,
            explanation: currentQ.explanation
          }
        ]
      };
    });
  };

  const nextQuestion = () => {
    playSound('click');
    const isLast = quiz.currentQuestionIndex === quiz.questions.length - 1;
    
    if (isLast) {
      // Finished Quiz: Save Score & Go to Summary
      const updatedScores = saveHighScore(quiz.currentSubject!, quiz.score, quiz.questions.length);
      setHighScores(updatedScores);
      setQuiz(prev => ({
        ...prev,
        status: 'summary'
      }));
    } else {
      setQuiz(prev => ({
        ...prev,
        currentQuestionIndex: prev.currentQuestionIndex + 1,
        selectedOptionIndex: null,
        isAnswerChecked: false,
        timeRemaining: 30
      }));
    }
  };

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopyFeedback(true);
    setTimeout(() => setCopyFeedback(false), 2000);
  };

  const runSimulatedSQL = (query: string) => {
    const res = executeQuery(query);
    setSqlResult(res);
  };

  const handleResetScores = () => {
    playSound('click');
    const reset = resetScores();
    setHighScores(reset);
    setQuiz({
      status: 'dashboard',
      currentSubject: null,
      questions: [],
      currentQuestionIndex: 0,
      selectedOptionIndex: null,
      isAnswerChecked: false,
      score: 0,
      timeRemaining: 30,
      answersHistory: []
    });
  };

  const selectedFile = KOTLIN_PROJECT_FILES[selectedFileIndex];

  return (
    <div id="app_root" className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-emerald-500/30 selection:text-emerald-300">
      
      {/* Dynamic Upper Top Bar in Ethiopian Educational Tri-color accents */}
      <header id="app_header" className="relative border-b border-slate-800 bg-slate-900/80 backdrop-blur-md px-6 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 z-20">
        <div className="absolute top-0 left-0 right-0 h-1.5 flex">
          <div className="w-1/3 h-full bg-emerald-600"></div>
          <div className="w-1/3 h-full bg-amber-500"></div>
          <div className="w-1/3 h-full bg-red-600"></div>
        </div>
        
        <div>
          <div className="flex items-center gap-2 mt-1">
            <span className="bg-emerald-500/10 text-emerald-400 text-xs font-mono px-2.5 py-0.5 rounded-full border border-emerald-500/20">
              Grade 10 National Syllabus
            </span>
            <span className="bg-slate-800 text-slate-300 text-[10px] font-mono px-2 py-0.5 rounded border border-slate-700">
              Jetpack Compose + Room
            </span>
          </div>
          <h1 className="text-xl md:text-2xl font-bold font-display tracking-tight text-white mt-1">
            Ethiopian Grade 10 Android Quiz Simulator
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Full-fidelity interactive device preview, Room Database inspection, and ready-to-use clean Kotlin source modules.
          </p>
        </div>

        {/* Global developer metrics */}
        <div className="flex items-center gap-4 text-xs">
          <div className="bg-slate-800/60 p-2.5 rounded-lg border border-slate-700/80 flex items-center gap-3">
            <div>
              <p className="text-slate-500 text-[10px] uppercase tracking-wider font-mono font-bold">Simulated DB Schema</p>
              <p className="text-slate-200 mt-0.5 font-medium">Room v2.6.1 (SQLite LocalState)</p>
            </div>
          </div>
          <button 
            onClick={handleResetScores}
            className="flex items-center gap-1 px-3 py-2 bg-slate-800 hover:bg-slate-700 active:bg-slate-900 border border-slate-700 hover:border-slate-600 rounded-lg text-slate-300 hover:text-white transition duration-200 font-medium font-mono text-[11px]"
            title="Reset simulated Room DB scores table"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Reset DB Cache
          </button>
        </div>
      </header>

      {/* Main Full-Scale Workspace Container */}
      <main id="app_workspace" className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        
        {/* Left Column (SPAN 5): HIGH-FIDELITY ANDROID SIMULATOR DECK */}
        <div className="lg:col-span-5 flex flex-col items-center justify-start xl:-mt-2">
          
          <div className="w-full max-w-[360px] relative">
            
            {/* Real Hardware Chassis frame simulating general top-notch Android smartphone */}
            <div className="w-full bg-slate-900 rounded-[52px] p-3.5 shadow-2xl border-4 border-slate-800/90 relative ring-1 ring-slate-800/50">
              
              {/* Outer chassis hardware buttons */}
              <div className="absolute right-[-6px] top-24 w-[3.5px] h-14 bg-slate-800 rounded-l border-r border-slate-900/60 shadow-md"></div>
              <div className="absolute right-[-6px] top-44 w-[3.5px] h-20 bg-slate-800 rounded-l border-r border-slate-900/60 shadow-md"></div>
              
              {/* Phone Internal Glass Wrapper */}
              <div className="w-full aspect-[9/19] rounded-[38px] bg-slate-900 overflow-hidden relative border border-slate-950 flex flex-col">
                
                {/* Physical Notch */}
                <div className="absolute top-0 inset-x-0 h-6 flex justify-center z-50 pointer-events-none">
                  <div className="bg-slate-950 w-28 h-4 rounded-b-xl flex items-center justify-end px-3">
                    <div className="w-1.5 h-1.5 rounded-full bg-slate-800 mr-2 ring-1 ring-slate-700/50"></div>
                    <div className="w-3 h-0.5 rounded bg-slate-900"></div>
                  </div>
                </div>

                {/* Simulated Android Top Status Bar */}
                <div className="h-6.5 bg-slate-950 px-5 pt-1.5 flex items-center justify-between text-[11px] font-mono text-slate-400 z-40 select-none">
                  <span>9:41 AM</span>
                  <div id="emulator_status_icons" className="flex items-center gap-1.5">
                    <span className="text-[9px] text-emerald-500 font-bold tracking-tight">🇪🇹 GR10</span>
                    <History className="w-2.5 h-2.5 text-slate-500" />
                    <span className="text-slate-400">5G</span>
                    <div className="w-5 h-2.5 border border-slate-600 rounded-sm p-0.5 flex items-center">
                      <div className="h-full w-[85%] bg-emerald-500 rounded-2xs"></div>
                    </div>
                  </div>
                </div>

                {/* EMULATOR SCREEN INNER CANVAS CONTAINER */}
                <div className="flex-1 bg-slate-950 relative overflow-hidden flex flex-col text-slate-100 selection:bg-neutral-500/25">
                  <AnimatePresence mode="wait">
                    
                    {/* --- VIEW 1: DASHBOARD VIEW --- */}
                    {quiz.status === 'dashboard' && (
                      <motion.div 
                        key="dashboard"
                        initial={{ opacity: 0, y: 15 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -15 }}
                        className="flex-1 flex flex-col"
                      >
                        {/* CenterAlignedTopAppBar */}
                        <div className="bg-slate-900 border-b border-slate-800/80 px-4 py-3 text-center shadow-sm">
                          <h2 className="text-sm font-bold tracking-tight text-white font-display">Grade 10 Ethiopian Quiz</h2>
                          <p className="text-[10px] text-slate-400 font-mono mt-0.5">National Curriculum App</p>
                        </div>

                        {/* Scrollable LazyColumn Simulated */}
                        <div className="flex-1 overflow-y-auto px-4 py-3.5 space-y-4">
                          
                          {/* Banner Info */}
                          <div className="bg-gradient-to-br from-slate-900 to-slate-950 p-3.5 rounded-xl border border-slate-800">
                            <h3 className="text-xs font-bold text-white flex items-center gap-1.5">
                              <Award className="w-3.5 h-3.5 text-amber-500" />
                              Assessment Dashboard
                            </h3>
                            <p className="text-[10px] text-slate-400 mt-1 leading-normal">
                              Practice standardized multiple-choice questions aligned directly with the Ethiopian Ministry of Education Secondary Curriculum.
                            </p>
                          </div>

                          <h4 className="text-[11px] uppercase tracking-wider font-mono font-bold text-slate-400">Select Subject Category</h4>

                          {/* Subject LazyRow/LazyColumn Cards */}
                          <div className="space-y-3">
                            {[
                              { id: 'Physics', icon: '⚛️', colorBg: 'from-sky-500/20 to-sky-950/40', border: 'border-sky-500/20', hover: 'hover:bg-sky-500/10', glow: 'text-sky-400', desc: 'Electrostatics, Electromagnetism, 2D Motion' },
                              { id: 'Chemistry', icon: '🧪', colorBg: 'from-emerald-500/20 to-emerald-950/45', border: 'border-emerald-500/20', hover: 'hover:bg-emerald-500/10', glow: 'text-emerald-400', desc: 'Organic Intro, Saturated, Unsaturated, Alcohols' },
                              { id: 'Biology', icon: '🌿', colorBg: 'from-amber-500/20 to-amber-950/45', border: 'border-amber-500/20', hover: 'hover:bg-amber-500/10', glow: 'text-amber-400', desc: 'Biotech, Angiosperms, Ecology, Circulation' }
                            ].map((subj) => {
                              const scoreObj = highScores.find(s => s.subject === subj.id);
                              const scoreVal = scoreObj ? scoreObj.score : 0;
                              return (
                                <div 
                                  key={subj.id}
                                  onClick={() => handleStartQuiz(subj.id as any)}
                                  className={`group relative p-4 rounded-xl bg-gradient-to-r ${subj.colorBg} border ${subj.border} cursor-pointer hover:scale-[1.01] transition-all duration-200`}
                                >
                                  <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2.5">
                                      <span className="text-2xl filter drop-shadow">{subj.icon}</span>
                                      <div>
                                        <h4 className="text-xs font-bold text-white group-hover:text-emerald-400 transition">{subj.id}</h4>
                                        <p className="text-[9px] text-slate-400 mt-0.5 line-clamp-1">{subj.desc}</p>
                                      </div>
                                    </div>
                                    <div className="text-right">
                                      <p className="text-[9px] text-slate-500">Room DB High</p>
                                      <p className={`text-[11px] font-bold ${subj.glow}`}>{scoreVal}/5</p>
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                          
                          {/* Mini stats block inside Room database inside phone */}
                          <div className="p-3 bg-slate-900/40 rounded-xl border border-dashed border-slate-800/80">
                            <span className="text-[9px] font-mono text-slate-500 uppercase tracking-widest block mb-1">Room DB Table: quiz_scores</span>
                            <div className="grid grid-cols-3 gap-1 text-[10px] font-mono text-center">
                              {highScores.map((s) => (
                                <div key={s.subject} className="bg-slate-950 py-1 px-1.5 rounded border border-slate-800">
                                  <p className="text-slate-500 text-[8px]">{s.subject}</p>
                                  <p className="text-white font-bold mb-0.5">{s.score}/5</p>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>

                        {/* Bottom Footer inside OS */}
                        <div className="bg-slate-900/60 p-3 text-center border-t border-slate-800/80">
                          <p className="text-[8px] text-slate-500 uppercase tracking-widest font-mono">Ethiopia MoE G-10 Prep Kit</p>
                        </div>
                      </motion.div>
                    )}

                    {/* --- VIEW 2: ACTIVE ASSESSMENT QUIZ VIEW --- */}
                    {quiz.status === 'active' && quiz.currentSubject && (
                      <motion.div 
                        key="quiz"
                        initial={{ opacity: 0, scale: 0.98 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.98 }}
                        className="flex-1 flex flex-col bg-slate-950"
                      >
                        {/* App bar */}
                        <div className="bg-slate-900 border-b border-slate-800/80 px-4 py-3 flex items-center justify-between shadow-sm">
                          <button 
                            onClick={() => {
                              playSound('click');
                              setQuiz(prev => ({ ...prev, status: 'dashboard' }));
                            }}
                            className="p-1.5 bg-slate-950 text-slate-400 hover:text-white rounded-lg border border-slate-800"
                          >
                            <ArrowLeft className="w-3.5 h-3.5" />
                          </button>
                          <h3 className="text-sm font-bold text-white font-display uppercase tracking-wider">{quiz.currentSubject} Session</h3>
                          <div className="w-7"></div>
                        </div>

                        {/* Question Content Area */}
                        <div className="flex-1 overflow-y-auto px-4 py-3.5 flex flex-col">
                          
                          {/* Question progress and Countdown timer */}
                          <div className="flex items-center justify-between bg-slate-900/50 px-3 py-2 rounded-lg border border-slate-800/50 mb-3 text-xs">
                            <span className="text-slate-400 text-[10px] font-mono font-bold">
                              Q: {quiz.currentQuestionIndex + 1} of {quiz.questions.length}
                            </span>
                            
                            {/* Animated Countdown Ring */}
                            <div className="flex items-center gap-1.5">
                              <Clock className={`w-3 h-3 ${quiz.timeRemaining < 10 ? 'text-red-500 animate-pulse' : 'text-slate-400'}`} />
                              <span className={`font-mono font-bold ${quiz.timeRemaining < 10 ? 'text-red-500' : 'text-emerald-400'}`}>
                                {quiz.timeRemaining}s
                              </span>
                            </div>
                          </div>

                          {/* Linear progress timeline */}
                          <div className="w-full bg-slate-900 h-1.5 rounded-full overflow-hidden mb-4">
                            <div 
                              className="bg-gradient-to-r from-emerald-500 to-teal-400 h-full rounded-full transition-all duration-300"
                              style={{ width: `${((quiz.currentQuestionIndex + 1) / quiz.questions.length) * 100}%` }}
                            ></div>
                          </div>

                          {/* Question Text Card */}
                          <div className="bg-slate-900 p-4 rounded-xl border border-slate-800 shadow-lg min-h-[96px] flex flex-col justify-center mb-4">
                            <p className="text-xs text-emerald-400 uppercase font-mono tracking-wider font-bold mb-1">
                              Topic: {quiz.questions[quiz.currentQuestionIndex]?.topic}
                            </p>
                            <p className="text-xs md:text-sm font-medium text-slate-100 leading-relaxed">
                              {quiz.questions[quiz.currentQuestionIndex]?.text}
                            </p>
                          </div>

                          {/* Options stack */}
                          <div className="space-y-2 flex-1">
                            {quiz.questions[quiz.currentQuestionIndex]?.options.map((opt, oIdx) => {
                              const isSelected = quiz.selectedOptionIndex === oIdx;
                              const isCorrect = quiz.questions[quiz.currentQuestionIndex].correctAnswerIndex === oIdx;
                              
                              // Visual class triggers based on state
                              let optionClass = "border-slate-850 bg-slate-900 hover:bg-slate-850 text-slate-200";
                              let iconEl = null;

                              if (quiz.isAnswerChecked) {
                                if (isCorrect) {
                                  optionClass = "border-emerald-500/80 bg-emerald-950/30 text-emerald-200 font-medium";
                                  iconEl = <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />;
                                } else if (isSelected && !isCorrect) {
                                  optionClass = "border-red-500/80 bg-red-950/30 text-red-200";
                                  iconEl = <X className="w-3.5 h-3.5 text-red-400 shrink-0" />;
                                } else {
                                  optionClass = "border-slate-900 bg-slate-950/50 text-slate-500 pointer-events-none";
                                }
                              } else {
                                if (isSelected) {
                                  optionClass = "border-emerald-500 bg-emerald-950/20 text-emerald-300 ring-1 ring-emerald-500/30";
                                }
                              }

                              return (
                                <button
                                  key={oIdx}
                                  onClick={() => selectOption(oIdx)}
                                  disabled={quiz.isAnswerChecked}
                                  className={`w-full text-left p-2.5 rounded-lg border text-xs leading-normal flex items-start gap-2.5 transition duration-150 ${optionClass}`}
                                >
                                  <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-mono font-bold shrink-0 mt-0.5 border ${
                                    isSelected 
                                      ? 'bg-emerald-500 text-slate-950 border-emerald-400' 
                                      : 'bg-slate-950 text-slate-400 border-slate-800'
                                  }`}>
                                    {['A', 'B', 'C', 'D'][oIdx]}
                                  </span>
                                  <span className="flex-1">{opt}</span>
                                  {iconEl}
                                </button>
                              );
                            })}
                          </div>

                          {/* Info Collapse area displaying standard educational context explanations immediately */}
                          {quiz.isAnswerChecked && (
                            <motion.div 
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: 'auto' }}
                              className="mt-4 p-3 bg-slate-900/90 rounded-xl border border-slate-800 text-[10.5px] leading-relaxed text-slate-300"
                            >
                              <div className="flex items-center gap-1.5 mb-1 text-xs font-bold text-white">
                                <Info className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                                <span>Curriculum Insight</span>
                              </div>
                              <p>{quiz.questions[quiz.currentQuestionIndex]?.explanation}</p>
                            </motion.div>
                          )}
                        </div>

                        {/* Bottom action trigger controls */}
                        <div className="bg-slate-900/80 border-t border-slate-850 p-3 flex gap-2">
                          {!quiz.isAnswerChecked ? (
                            <button
                              onClick={submitAnswer}
                              disabled={quiz.selectedOptionIndex === null}
                              className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-800 disabled:text-slate-500 rounded-lg text-xs font-bold font-mono tracking-wide text-white transition disabled:scale-100 active:scale-98"
                            >
                              SUBMIT ANSWER
                            </button>
                          ) : (
                            <button
                              onClick={nextQuestion}
                              className="w-full py-2.5 px-4 bg-slate-200 hover:bg-white text-slate-950 rounded-lg text-xs font-bold font-mono tracking-wide transition active:scale-98 flex items-center justify-center gap-1.5"
                            >
                              <span>
                                {quiz.currentQuestionIndex === quiz.questions.length - 1 ? 'FINISH PRACTICE' : 'NEXT QUESTION'}
                              </span>
                              <ChevronRight className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </motion.div>
                    )}

                    {/* --- VIEW 3: SUMMARY ASSESSMENT REPORT SCREEN --- */}
                    {quiz.status === 'summary' && quiz.currentSubject && (
                      <motion.div 
                        key="summary"
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="flex-1 flex flex-col bg-slate-950"
                      >
                        {/* Summary Header */}
                        <div className="bg-slate-900 border-b border-slate-800/80 px-4 py-3.5 text-center">
                          <h3 className="text-sm font-bold text-white font-display">Performance Assessment</h3>
                          <p className="text-[10px] text-slate-400">Ethiopian MoE Grade 10 Framework</p>
                        </div>

                        {/* Summary Content Body */}
                        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
                          
                          {/* Circle badge of academic feedback scoring */}
                          <div className="bg-slate-900 border border-slate-800 py-4 px-3 rounded-2xl text-center space-y-2 shadow-inner">
                            <span className="text-[9px] font-mono tracking-widest text-slate-500 uppercase block">Total Points Secured</span>
                            <div className="inline-flex items-baseline gap-1">
                              <span className="text-4xl font-black text-emerald-400 font-display">{quiz.score}</span>
                              <span className="text-slate-500 font-mono text-xs">/ {quiz.questions.length}</span>
                            </div>
                            
                            {/* Score Educational Rating message */}
                            <div className="px-2 py-1.5 bg-slate-950/60 rounded-lg border border-slate-850 text-[11px] font-bold">
                              {quiz.score === quiz.questions.length && (
                                <span className="text-yellow-400">🥇 Excellent! 🇪🇹 Academic Star</span>
                              )}
                              {quiz.score >= quiz.questions.length * 0.8 && quiz.score < quiz.questions.length && (
                                <span className="text-emerald-400">🥈 Very Good! Highly Capable</span>
                              )}
                              {quiz.score >= quiz.questions.length * 0.5 && quiz.score < quiz.questions.length * 0.8 && (
                                <span className="text-amber-400">🥉 Satisfactory! Good Core Knowledge</span>
                              )}
                              {quiz.score < quiz.questions.length * 0.5 && (
                                <span className="text-red-400">⚠️ Needs Review! Re-study Topics</span>
                              )}
                            </div>
                          </div>

                          {/* Interactive accordion lists of answers reviewed */}
                          <div>
                            <h4 className="text-[11px] uppercase tracking-wider font-mono font-bold text-slate-405 mb-2">Subject Review Detail</h4>
                            <div className="space-y-2.5 max-h-[178px] overflow-y-auto pr-1">
                              {quiz.answersHistory.map((ans, idx) => (
                                <div key={idx} className="p-2.5 bg-slate-900 rounded-lg border border-slate-850 text-[10px]">
                                  <div className="flex items-center gap-1.5 justify-between">
                                    <span className="font-mono text-[9px] text-slate-500">Q-{idx+1} review</span>
                                    <span className={ans.isCorrect ? "text-emerald-400 font-bold" : "text-red-400 font-bold"}>
                                      {ans.isCorrect ? 'Correct' : 'Incorrect'}
                                    </span>
                                  </div>
                                  <p className="text-white font-medium mt-1 leading-snug line-clamp-2">{ans.questionText}</p>
                                  <div className="mt-1.5 text-slate-400 pt-1 border-t border-slate-800/80 flex flex-col gap-0.5 text-[9px]">
                                    <p>Your answer: <span className={ans.isCorrect ? 'text-emerald-400' : 'text-red-400'}>{ans.selectedOption || '[Timeout]'}</span></p>
                                    {!ans.isCorrect && <p>Correct: <span className="text-emerald-400">{ans.correctOption}</span></p>}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>

                        </div>

                        {/* Navigation Footer Controls */}
                        <div className="bg-slate-900/80 border-t border-slate-850 p-3 space-y-2">
                          <button
                            onClick={() => handleStartQuiz(quiz.currentSubject!)}
                            className="w-full py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold transition active:scale-98"
                          >
                            RETREAT PRACTICE
                          </button>
                          <button
                            onClick={() => {
                              playSound('click');
                              setQuiz(prev => ({ ...prev, status: 'dashboard' }));
                            }}
                            className="w-full py-2 bg-slate-800 hover:bg-slate-705 text-slate-300 rounded-lg text-xs font-bold transition active:scale-98"
                          >
                            EXIT TO SUBJECTS
                          </button>
                        </div>
                      </motion.div>
                    )}

                  </AnimatePresence>
                </div>

                {/* Android System Pill navigation bar */}
                <div className="h-6 bg-slate-950 flex justify-center items-center select-none">
                  <div className="w-24 h-1 bg-slate-700 rounded-full hover:bg-slate-600 cursor-pointer" onClick={() => {
                    playSound('click');
                    setQuiz(prev => ({ ...prev, status: 'dashboard' }));
                  }}></div>
                </div>

              </div>
            </div>

            {/* Simulated hardware badge labeling on desk */}
            <div className="text-center mt-3 text-[10px] text-slate-500 font-mono uppercase tracking-wider">
              📱 HD EMULATOR STAGE
            </div>
          </div>
        </div>

        {/* Right Column (SPAN 7): KOTLIN + COMPOSE DEVELOPER CENTER */}
        <div className="lg:col-span-7 flex flex-col items-stretch justify-start bg-slate-900/40 rounded-2xl border border-slate-800 overflow-hidden">
          
          {/* Tab Navigation Menu */}
          <div className="border-b border-slate-800 bg-slate-900/90 flex flex-wrap text-xs select-none">
            {[
              { id: 'emulator', label: 'Overview', icon: Smartphone },
              { id: 'code', label: 'Kotlin Source', icon: Code2 },
              { id: 'database', label: 'Room SQL Console', icon: Database },
              { id: 'guide', label: 'App Deployment', icon: BookOpen }
            ].map(tab => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => {
                    playSound('click');
                    setActiveTab(tab.id as any);
                  }}
                  className={`flex items-center gap-2 px-4 py-3.5 border-b-2 font-medium tracking-tight transition duration-150 ${
                    isActive 
                      ? 'border-emerald-500 text-white bg-slate-950/40' 
                      : 'border-transparent text-slate-400 hover:text-slate-100 hover:bg-slate-800/30'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? 'text-emerald-400' : 'text-slate-500'}`} />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          {/* Dynamic Screen Tabs */}
          <div id="dev_suite_content" className="flex-1 p-6 overflow-y-auto space-y-6">

            {/* ================== TAB: OVERVIEW / EMULATOR GUIDE ================== */}
            {activeTab === 'emulator' && (
              <motion.div 
                initial={{ opacity: 0 }} 
                animate={{ opacity: 1 }} 
                className="space-y-6"
              >
                <div>
                  <h3 className="text-xl font-bold font-display text-white">Curriculum Quiz Architecture</h3>
                  <p className="text-sm text-slate-400 mt-1 leading-relaxed">
                    This simulator implements a standard 10th-grade revision application designed for Ethiopian secondary students. The native implementation utilizes <strong>Android Jetpack Compose</strong> declarative layouts paired with local persistent <strong>Room Database</strong> frameworks.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  
                  {/* Subject details card */}
                  <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800">
                    <h4 className="text-sm font-semibold text-emerald-400 flex items-center gap-2">
                      <Layers className="w-4 h-4 text-emerald-400" />
                      Ministry Curriculum Seeds
                    </h4>
                    <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">
                      Pre-populated standard catalog targets foundational high-yield units covered in the national Ethiopian examination guidelines:
                    </p>
                    <ul className="mt-2 space-y-1 text-xs text-slate-300 list-disc list-inside">
                      <li><strong className="text-white">Physics:</strong> Electrostatics and Electromagnetism rules.</li>
                      <li><strong className="text-white">Chemistry:</strong> Hydrocarbons and Esters functional classes.</li>
                      <li><strong className="text-white">Biology:</strong> Applied Biotechnology and Savanna Ecology.</li>
                    </ul>
                  </div>

                  {/* Architecture Details */}
                  <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800">
                    <h4 className="text-sm font-semibold text-emerald-400 flex items-center gap-2">
                      <Terminal className="w-4 h-4 text-emerald-400" />
                      Full Android Architecture
                    </h4>
                    <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">
                      Build targets clean MVVM architecture patterns with unidirectional flows:
                    </p>
                    <ul className="mt-2 space-y-1 text-xs text-slate-300 list-disc list-inside">
                      <li><strong className="text-white">UI View:</strong> State-aware reusable Compositions.</li>
                      <li><strong className="text-white">ViewModel:</strong> Coroutine StateFlow with 30s timers.</li>
                      <li><strong className="text-white">Room layer:</strong> Thread-safe SQLite access.</li>
                    </ul>
                  </div>

                </div>

                {/* Flow and Code details */}
                <div className="p-4.5 rounded-xl bg-slate-950 border border-slate-800 space-y-3.5">
                  <h4 className="text-xs font-bold tracking-wider text-slate-500 uppercase font-mono">Simulated State Bridge</h4>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3.5 text-center text-xs">
                    <div className="p-2.5 bg-slate-900/80 rounded border border-slate-850">
                      <p className="text-[10px] text-slate-500 font-mono">SIMULATION METHOD</p>
                      <p className="font-semibold text-emerald-400 mt-0.5">Dual React-Flow Hooks</p>
                    </div>
                    <div className="p-2.5 bg-slate-900/80 rounded border border-slate-850">
                      <p className="text-[10px] text-slate-500 font-mono">COROUTINE TIME STEP</p>
                      <p className="font-semibold text-emerald-400 mt-0.5">30s Live Tick Interval</p>
                    </div>
                    <div className="p-2.5 bg-slate-900/80 rounded border border-slate-850 col-span-2 sm:col-span-1 border-dashed">
                      <p className="text-[10px] text-slate-500 font-mono">DATABASE PARITY</p>
                      <p className="font-semibold text-amber-500 mt-0.5">Simulated SQL Parser</p>
                    </div>
                  </div>
                </div>

                <div className="flex justify-start gap-4">
                  <button 
                    onClick={() => setActiveTab('code')}
                    className="flex items-center gap-1.5 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg text-xs leading-none transition"
                  >
                    <Code2 className="w-4 h-4" />
                    Inspect Kotlin Modules
                  </button>
                  <button 
                    onClick={() => setActiveTab('database')}
                    className="flex items-center gap-1.5 px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 rounded-lg text-xs font-bold leading-none transition"
                  >
                    <Database className="w-4 h-4" />
                    Query Room SQLite Table
                  </button>
                </div>
              </motion.div>
            )}

            {/* ================== TAB: KOTLIN SOURCE CODE EXPLORER ================== */}
            {activeTab === 'code' && (
              <motion.div 
                initial={{ opacity: 0 }} 
                animate={{ opacity: 1 }} 
                className="space-y-6"
              >
                <div>
                  <h3 className="text-xl font-bold font-display text-white">Kotlin &amp; Compose File Tree</h3>
                  <p className="text-sm text-slate-400 mt-1 leading-relaxed">
                    Review native Android code compiled as fully annotated modules. Select files to browse their direct schema implementations.
                  </p>
                </div>

                {/* Directory tree file selectors with badge labels */}
                <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-start">
                  
                  {/* File tree navigation list */}
                  <div className="md:col-span-4 bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-1.5">
                    <span className="text-[9px] uppercase tracking-wider font-mono font-bold text-slate-500 block px-2 mb-2">Android Studio Project</span>
                    {KOTLIN_PROJECT_FILES.map((file, fIdx) => (
                      <button
                        key={file.name}
                        onClick={() => {
                          playSound('click');
                          setSelectedFileIndex(fIdx);
                        }}
                        className={`w-full text-left px-3 py-2 rounded-md font-mono text-xs flex items-center justify-between transition duration-150 ${
                          selectedFileIndex === fIdx 
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                            : 'text-slate-400 hover:text-white hover:bg-slate-900 border border-transparent'
                        }`}
                      >
                        <span className="truncate">{file.name}</span>
                        <span className="text-[8px] opacity-70 px-1 py-0.2 select-none border border-current rounded uppercase scale-90">
                          {file.name.endsWith('.kts') ? 'gradle' : 'kt'}
                        </span>
                      </button>
                    ))}
                  </div>

                  {/* Code viewport panel with copy triggers */}
                  <div className="md:col-span-8 flex flex-col items-stretch space-y-3">
                    
                    <div className="bg-slate-950 rounded-xl border border-slate-800 overflow-hidden">
                      
                      {/* Sub header of current highlighted file */}
                      <div className="bg-slate-900 px-4 py-3 flex items-center justify-between border-b border-slate-800">
                        <div className="min-w-0">
                          <p className="text-[10px] font-mono text-emerald-400 font-semibold truncate leading-none">{selectedFile.path}</p>
                          <p className="text-slate-500 text-[9px] mt-1.5 italic line-clamp-1">{selectedFile.description}</p>
                        </div>
                        <button
                          onClick={() => handleCopyCode(selectedFile.code)}
                          className="flex items-center gap-1 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded border border-slate-700 transition font-mono text-[10px] uppercase font-bold"
                        >
                          {copyFeedback ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                          <span>{copyFeedback ? 'Copied' : 'Copy'}</span>
                        </button>
                      </div>

                      {/* Monospaced code box */}
                      <pre className="p-4 overflow-x-auto text-slate-300 font-mono text-xs max-h-[440px] leading-relaxed select-text select-all">
                        <code>{selectedFile.code}</code>
                      </pre>

                    </div>

                    <div className="p-3.5 bg-slate-900/40 rounded-lg border border-slate-800 text-[11px] leading-relaxed text-slate-400 flex items-start gap-2.5">
                      <Info className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                      <div>
                        <strong className="text-slate-300">Development Hub Tip:</strong> Combine the Entity, DAO annotations, and Database classes to form Room Database configurations instantly on Android. These classes directly manage SQL interactions in separate threads.
                      </div>
                    </div>

                  </div>

                </div>
              </motion.div>
            )}

            {/* ================== TAB: ROOM SQLite SQL CONSOLE ================== */}
            {activeTab === 'database' && (
              <motion.div 
                initial={{ opacity: 0 }} 
                animate={{ opacity: 1 }} 
                className="space-y-6"
              >
                <div>
                  <h3 className="text-xl font-bold font-display text-white">Room SQLite Inspector Console</h3>
                  <p className="text-sm text-slate-400 mt-1 leading-relaxed">
                    Android's Room Persistence library is built as an abstraction over native SQLite. Explore current values, run select queries, and view simulated query execution mapping directly to local memory data models.
                  </p>
                </div>

                {/* Sub table metrics */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="p-3 bg-slate-950 rounded-lg border border-slate-800">
                    <p className="text-[9px] font-mono text-slate-500 uppercase">Room Database File</p>
                    <p className="text-sm font-semibold text-white mt-1">ethiopian_quiz_database</p>
                  </div>
                  <div className="p-3 bg-slate-950 rounded-lg border border-slate-800">
                    <p className="text-[9px] font-mono text-slate-500 uppercase">Table: questions</p>
                    <p className="text-sm font-semibold text-emerald-400 mt-1">15 Core Seed Rows</p>
                  </div>
                  <div className="p-3 bg-slate-950 rounded-lg border border-slate-800">
                    <p className="text-[9px] font-mono text-slate-500 uppercase">Table: quiz_scores</p>
                    <p className="text-sm font-semibold text-amber-500 mt-1">Dynamic Score Rows</p>
                  </div>
                </div>

                {/* Console Terminal */}
                <div className="bg-slate-950 border border-slate-800 rounded-xl overflow-hidden flex flex-col">
                  
                  {/* Console label top */}
                  <div className="bg-slate-900 px-4 py-3 border-b border-slate-800 flex items-center justify-between text-xs font-mono">
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full bg-red-500" />
                      <div className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                      <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                      <span className="text-slate-400 font-semibold ml-2">SQLite Dynamic Query Shell</span>
                    </div>
                    <span className="bg-slate-800 text-slate-400 text-[10px] px-2 py-0.5 rounded uppercase">RESTRICTED DB CONTEXT</span>
                  </div>

                  {/* Input form */}
                  <div className="p-4 bg-slate-950 border-b border-slate-800 space-y-3">
                    <div className="flex flex-col gap-1.5">
                      <label className="text-slate-400 text-xs font-mono">Execute Read-Only SQLite commands:</label>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={sqlQuery}
                          onChange={(e) => setSqlQuery(e.target.value)}
                          placeholder="SELECT * FROM questions"
                          className="flex-1 bg-slate-900 border border-slate-800 text-slate-200 font-mono text-xs rounded-lg px-3 py-2 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/20"
                        />
                        <button
                          onClick={() => {
                            playSound('click');
                            runSimulatedSQL(sqlQuery);
                          }}
                          className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-lg text-xs font-mono font-bold tracking-wider transition hover:scale-101 shrink-0"
                        >
                          RUN QUERY
                        </button>
                      </div>
                    </div>

                    {/* Pre set triggers */}
                    <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-slate-900/80 text-xs">
                      <span className="text-slate-500 font-mono text-[10px]">Quick presets:</span>
                      {[
                        'SELECT * FROM quiz_scores',
                        'SELECT * FROM questions WHERE subject = \'Physics\'',
                        'SELECT * FROM questions WHERE subject = \'Biology\'',
                        'SELECT * FROM questions'
                      ].map((preset) => (
                        <button
                          key={preset}
                          onClick={() => {
                            playSound('click');
                            setSqlQuery(preset);
                            runSimulatedSQL(preset);
                          }}
                          className="bg-slate-900 hover:bg-slate-805 text-slate-300 font-mono text-[9px] px-2 py-1 rounded border border-slate-800 select-none cursor-pointer"
                        >
                          {preset.length > 36 ? preset.substring(0, 34) + '...' : preset}
                        </button>
                      ))}
                    </div>

                  </div>

                  {/* Terminal Results window */}
                  <div className="p-4 bg-slate-950 overflow-auto font-mono text-xs max-h-64 divide-y divide-slate-900 min-h-[120px]">
                    {sqlResult ? (
                      <div>
                        
                        {/* Display Query description or count info */}
                        <div className="flex items-center justify-between text-[10px] text-slate-500 uppercase tracking-tight pb-2.5">
                          <span>EXECUTED: &quot;{sqlResult.query}&quot;</span>
                          <span>{sqlResult.rows.length} rows returned</span>
                        </div>

                        {sqlResult.error ? (
                          <div className="text-red-400 py-1.5 flex items-start gap-1 p-2 bg-red-950/20 rounded border border-red-500/20">
                            <X className="w-3.5 h-3.5 shrink-0" />
                            <span>Error: {sqlResult.error}</span>
                          </div>
                        ) : (
                          <div className="overflow-x-auto">
                            <table className="min-w-full text-left border-collapse mt-1">
                              <thead>
                                <tr className="border-b border-slate-800 text-slate-400 uppercase text-[9px]">
                                  {sqlResult.columns.map(col => (
                                    <th key={col} className="pb-1.5 pr-4 font-bold">{col}</th>
                                  ))}
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-900">
                                {sqlResult.rows.map((rowArr, rIdx) => (
                                  <tr key={rIdx} className="hover:bg-slate-900/30">
                                    {rowArr.map((cell: any, cIdx: number) => (
                                      <td key={cIdx} className="py-2 pr-4 text-slate-300 whitespace-nowrap">{String(cell)}</td>
                                    ))}
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </div>
                    ) : (
                      <p className="text-slate-500 text-center py-8">Execute an SQL query preset above to inspect Room SQLite status models.</p>
                    )}
                  </div>

                </div>
              </motion.div>
            )}

            {/* ================== TAB: EXPLICIT APP DEPLOYMENT ROADMAP ================== */}
            {activeTab === 'guide' && (
              <motion.div 
                initial={{ opacity: 0 }} 
                animate={{ opacity: 1 }} 
                className="space-y-6"
              >
                <div>
                  <h3 className="text-xl font-bold font-display text-white">Native Android Studio Deployment</h3>
                  <p className="text-sm text-slate-400 mt-1 leading-relaxed">
                    Ready to build this for real on your phone? Since you are running in AI Studio, you can export these source modules directly using the sidebar menu and import them straight to Android Studio.
                  </p>
                </div>

                {/* Step sequences */}
                <div className="space-y-4">
                  
                  {[
                    {
                      step: '1',
                      title: 'Download and Initialize Android Studio',
                      desc: 'Ensure you have the latest Android Studio Hedgehog or higher installed. Create a new project selecting the Empty Compose Activity template targeting API Level 24 (Android 7.0) minimum.'
                    },
                    {
                      step: '2',
                      title: 'Configure Project build.gradle.kts',
                      desc: 'Open the app-level build.gradle.kts file. Add the Kotlin Kapt and Room compilers. Ensure standard Compose dependencies conform to the structural layout given in the Gradle tab.'
                    },
                    {
                      step: '3',
                      title: 'Mirror Package Directory Architecture',
                      desc: 'In your main Java resources directory (e.g., edu.ethiopia.quiz), create sub-packages: data for datamodels/Room, and ui/screens for Compose dashboards. Copy the Kotlin files verbatim from the source tabs.'
                    },
                    {
                      step: '4',
                      title: 'Connect Physical Phone & Compile Build',
                      desc: 'Turn on Developer Options in your Android settings. Enable USB Debugging, connect your physical mobile device to your computer via USB, and compile and run utilizing the standard Play button with Gradle.'
                    }
                  ].map((it) => (
                    <div key={it.step} className="flex gap-4 p-4 rounded-xl bg-slate-900/60 border border-slate-800">
                      <div className="w-7 h-7 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-mono font-bold flex items-center justify-center shrink-0 mt-0.5 select-none">
                        {it.step}
                      </div>
                      <div className="space-y-1">
                        <h4 className="text-sm font-semibold text-white leading-tight">{it.title}</h4>
                        <p className="text-xs text-slate-400 leading-relaxed">{it.desc}</p>
                      </div>
                    </div>
                  ))}

                </div>

                <div className="p-4 rounded-xl bg-slate-950 border border-slate-850 flex items-start gap-3 text-xs leading-relaxed text-slate-400">
                  <Info className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-slate-300">Important Note on USB Debugging:</strong> If compiling on a real phone, you must toggle on developer parameters by navigating to Settings &gt; About Phone &gt; tap &quot;Build Number&quot; seven times consecutively in speed.
                  </div>
                </div>

              </motion.div>
            )}

          </div>

          {/* Dev-Suite persistent footer info */}
          <div className="bg-slate-900 border-t border-slate-800 p-4.5 text-xs text-slate-400 flex flex-col sm:flex-row items-center justify-between gap-3">
            <span className="flex items-center gap-2">
              <Code2 className="w-4 h-4 text-emerald-400" />
              <span>Developer Workspace: Native Android 10th-Grade Assessment Edition</span>
            </span>
            <div className="flex items-center gap-1.5 font-mono text-[10px] uppercase">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-slate-300 font-bold">Simulator Connected</span>
            </div>
          </div>

        </div>

      </main>

      {/* Persistent global educational banner representing Ethiopia Flag colors softly */}
      <footer id="global_footer" className="mt-auto border-t border-slate-800 bg-slate-950 px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500 select-none">
        <p>&copy; 2026 Ethiopian Ministry of Education Prep Kit. All Rights Reserved.</p>
        <div className="flex items-center gap-3">
          <span className="h-2 w-3 bg-emerald-600 rounded-sm"></span>
          <span className="h-2 w-3 bg-amber-500 rounded-sm"></span>
          <span className="h-2 w-3 bg-red-600 rounded-sm"></span>
          <span>Academic Excellence Standard</span>
        </div>
      </footer>

    </div>
  );
}
