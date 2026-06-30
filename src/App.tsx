import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Camera,
  Upload,
  Volume2,
  VolumeX,
  Candy,
  Flame,
  ShieldAlert,
  Sparkles,
  History,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Trash2,
  RefreshCw,
  Play,
  Square,
  ArrowRight,
  Heart,
  HelpCircle,
  Clock
} from "lucide-react";
import { Restriction, NutrientAnalysis, AnalysisResult, HistoryItem } from "./types";
import { drawPresetLabel } from "./utils/presets";

export default function App() {
  // --- States ---
  const [restrictions, setRestrictions] = useState<Restriction[]>(["diabetes"]);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSpeaking, setIsSpeaking] = useState<boolean>(false);
  const [scanHistory, setScanHistory] = useState<HistoryItem[]>([]);
  const [dragOver, setDragOver] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<string>("NutriLens sedang bersiap...");

  const fileInputRef = useRef<HTMLInputElement>(null);
  const synthesisRef = useRef<SpeechSynthesis | null>(null);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  // --- Sound Wave Simulation ---
  const [soundBars, setSoundBars] = useState<number[]>([10, 10, 10, 10, 10, 10, 10, 10]);

  // --- Load History & Set Up TTS ---
  useEffect(() => {
    // Load local history
    const savedHistory = localStorage.getItem("smart_grocery_history");
    if (savedHistory) {
      try {
        setScanHistory(JSON.parse(savedHistory));
      } catch (e) {
        console.error("Gagal memuat riwayat", e);
      }
    }

    // Set up SpeechSynthesis ref
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      synthesisRef.current = window.speechSynthesis;
    }

    // Cleanup voice on unmount
    return () => {
      if (synthesisRef.current) {
        synthesisRef.current.cancel();
      }
    };
  }, []);

  // --- Sound Wave Equalizer Effect ---
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isSpeaking) {
      interval = setInterval(() => {
        setSoundBars(Array.from({ length: 12 }, () => Math.floor(Math.random() * 30) + 6));
      }, 100);
    } else {
      setSoundBars([10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10]);
    }
    return () => clearInterval(interval);
  }, [isSpeaking]);

  // --- Toggle Restrictions ---
  const handleToggleRestriction = (res: Restriction) => {
    if (res === "umum") {
      setRestrictions(["umum"]);
      return;
    }

    let updated = [...restrictions].filter((r) => r !== "umum");
    if (updated.includes(res)) {
      updated = updated.filter((r) => r !== res);
    } else {
      updated.push(res);
    }

    // If empty, default back to umum
    if (updated.length === 0) {
      updated = ["umum"];
    }
    setRestrictions(updated);
  };

  // --- Read Image File Helper ---
  const handleImageFile = (file: File) => {
    if (!file.type.startsWith("image/")) {
      setError("Mohon pilih file gambar yang valid (JPG/PNG).");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setSelectedImage(reader.result as string);
      setAnalysisResult(null);
      setError(null);
    };
    reader.onerror = () => {
      setError("Gagal membaca file gambar.");
    };
    reader.readAsDataURL(file);
  };

  // --- File Select ---
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleImageFile(e.target.files[0]);
    }
  };

  // --- Drag and Drop ---
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = () => {
    setDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleImageFile(e.dataTransfer.files[0]);
    }
  };

  // --- Load Preset Label ---
  const handleLoadPreset = (type: "susu_manis" | "keripik_asin" | "susu_sehat") => {
    const base64Image = drawPresetLabel(type);
    setSelectedImage(base64Image);
    setAnalysisResult(null);
    setError(null);
  };

  // --- API Analysis Trigger ---
  const handleAnalyze = async () => {
    if (!selectedImage) {
      setError("Pilih atau ambil foto label gizi terlebih dahulu, Kek, Nek.");
      return;
    }

    setIsAnalyzing(true);
    setAnalysisResult(null);
    setError(null);

    // Stop speaking if currently active
    stopSpeaking();

    // Stagger status messages for an immersive user experience
    const messages = [
      "NutriLens sedang menerima foto produk...",
      "Memindai label nilai gizi pada gambar...",
      "Mengidentifikasi kandungan Gula, Garam, dan Lemak...",
      "Membandingkan nutrisi dengan pantangan kesehatan Kakek & Nenek...",
      "Menyusun saran belanja yang aman dan sehat..."
    ];

    let messageIndex = 0;
    setStatusMessage(messages[0]);
    const messageInterval = setInterval(() => {
      if (messageIndex < messages.length - 1) {
        messageIndex++;
        setStatusMessage(messages[messageIndex]);
      }
    }, 1500);

    try {
      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          image: selectedImage,
          restrictions,
        }),
      });

      clearInterval(messageInterval);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || "Gagal menghubungi asisten gizi.");
      }

      const result: AnalysisResult = await response.json();
      setAnalysisResult(result);

      // Add to history
      const newHistoryItem: HistoryItem = {
        id: Date.now().toString(),
        timestamp: new Date().toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }),
        restrictions: [...restrictions],
        result,
        imageUrl: selectedImage,
      };

      const updatedHistory = [newHistoryItem, ...scanHistory].slice(0, 5);
      setScanHistory(updatedHistory);
      localStorage.setItem("smart_grocery_history", JSON.stringify(updatedHistory));

      // Auto play speech synthesis for elderly accessibility
      setTimeout(() => {
        startSpeaking(result.speechText);
      }, 800);

    } catch (err: any) {
      clearInterval(messageInterval);
      setError(err.message || "Terjadi kesalahan saat memeriksa label gizi. Coba lagi ya, Kek, Nek.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  // --- Speech Synthesis Helper ---
  const startSpeaking = (text: string) => {
    if (!synthesisRef.current) return;

    synthesisRef.current.cancel(); // Clear queued speech

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "id-ID";
    utterance.rate = 0.82; // Slightly slower, highly friendly rate for elderly users

    // Attempt to match an Indonesian voice specifically
    const voices = synthesisRef.current.getVoices();
    const indonesianVoice = voices.find((v) => v.lang.startsWith("id") || v.lang === "id-ID");
    if (indonesianVoice) {
      utterance.voice = indonesianVoice;
    }

    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);
    utterance.onstart = () => setIsSpeaking(true);

    utteranceRef.current = utterance;
    synthesisRef.current.speak(utterance);
  };

  const stopSpeaking = () => {
    if (synthesisRef.current) {
      synthesisRef.current.cancel();
      setIsSpeaking(false);
    }
  };

  const handleToggleSpeak = () => {
    if (isSpeaking) {
      stopSpeaking();
    } else if (analysisResult) {
      startSpeaking(analysisResult.speechText);
    }
  };

  // --- Clear History ---
  const handleClearHistory = () => {
    setScanHistory([]);
    localStorage.removeItem("smart_grocery_history");
  };

  // --- Reload Past Scan ---
  const handleLoadHistoryItem = (item: HistoryItem) => {
    setSelectedImage(item.imageUrl);
    setRestrictions(item.restrictions);
    setAnalysisResult(item.result);
    setError(null);
    stopSpeaking();
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900 pb-20">
      
      {/* 1. Header (Identical structure style to Clean Minimalism Theme but with custom brand names) */}
      <header className="bg-white border-b border-slate-200 px-6 py-4 flex flex-col md:flex-row justify-between items-center gap-4 sticky top-0 z-40 shadow-sm" id="main-header">
        <div className="flex items-center gap-3">
          <div>
            <h1 className="text-xl md:text-2xl font-extrabold tracking-tight text-slate-900 flex items-center gap-2">
              NutriLens <span className="font-normal text-slate-400">| Smart Grocery Reader</span>
            </h1>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="bg-emerald-50 text-emerald-700 px-4 py-1.5 rounded-full text-xs font-bold border border-emerald-200">
            Pendamping Belanja Lansia
          </div>
        </div>
      </header>

      {/* Main Grid Layout - Two Columns (Left input, Right analysis results & history) */}
      <main className="max-w-7xl mx-auto px-4 md:px-6 py-8 grid grid-cols-1 lg:grid-cols-12 gap-8" id="app-main-layout">
        
        {/* Left Column: Restrictions & Image inputs (lg:col-span-5) */}
        <div className="lg:col-span-5 flex flex-col gap-6" id="left-column">
          
          {/* NutriLens Welcome Bubble */}
          <div className="bg-emerald-50 border border-emerald-100 rounded-3xl p-5" id="eyang-intro-card">
            <div className="flex gap-4">
              <div>
                <h3 className="font-bold text-emerald-950">Halo Bapak, Ibu, Kakek, dan Nenek!</h3>
                <p className="text-emerald-800 text-sm mt-1 leading-relaxed">
                  "Pilih pantangan kesehatan yang diberikan dokter di bawah ini, lalu foto atau pilih label gizi makanan yang mau dibeli. NutriLens bantu cek secara instan ya!"
                </p>
              </div>
            </div>
          </div>

          {/* STEP 1: Restrictions */}
          <section className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm" id="section-restrictions">
            <div className="flex items-center gap-3 mb-4">
              <span className="bg-slate-900 text-white w-6 h-6 rounded-full flex items-center justify-center font-bold text-xs">1</span>
              <h2 className="text-lg font-bold tracking-tight text-slate-900">Pilih Kondisi Kesehatan</h2>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3" id="restrictions-list">
              {/* Diabetes */}
              <button
                onClick={() => handleToggleRestriction("diabetes")}
                className={`p-3 rounded-2xl border text-left transition-all duration-150 cursor-pointer flex items-center gap-3 ${
                  restrictions.includes("diabetes")
                    ? "bg-red-50 border-red-300 ring-2 ring-red-100 text-red-950"
                    : "bg-white border-slate-200 hover:border-slate-300 text-slate-600"
                }`}
                id="select-diabetes"
              >
                <div className={`p-2 rounded-xl shrink-0 ${restrictions.includes("diabetes") ? "bg-red-500 text-white" : "bg-red-50 text-red-500"}`}>
                  <Candy className="w-5 h-5" />
                </div>
                <div>
                  <div className="font-bold text-sm">Diabetes</div>
                  <div className="text-[11px] opacity-80">Sensitif Gula</div>
                </div>
              </button>

              {/* Cholesterol */}
              <button
                onClick={() => handleToggleRestriction("cholesterol")}
                className={`p-3 rounded-2xl border text-left transition-all duration-150 cursor-pointer flex items-center gap-3 ${
                  restrictions.includes("cholesterol")
                    ? "bg-amber-50 border-amber-300 ring-2 ring-amber-100 text-amber-950"
                    : "bg-white border-slate-200 hover:border-slate-300 text-slate-600"
                }`}
                id="select-cholesterol"
              >
                <div className={`p-2 rounded-xl shrink-0 ${restrictions.includes("cholesterol") ? "bg-amber-500 text-white" : "bg-amber-50 text-amber-500"}`}>
                  <Heart className="w-5 h-5" />
                </div>
                <div>
                  <div className="font-bold text-sm">Kolesterol Tinggi</div>
                  <div className="text-[11px] opacity-80">Lemak Jenuh</div>
                </div>
              </button>

              {/* Hypertension */}
              <button
                onClick={() => handleToggleRestriction("hypertension")}
                className={`p-3 rounded-2xl border text-left transition-all duration-150 cursor-pointer flex items-center gap-3 ${
                  restrictions.includes("hypertension")
                    ? "bg-orange-50 border-orange-300 ring-2 ring-orange-100 text-orange-950"
                    : "bg-white border-slate-200 hover:border-slate-300 text-slate-600"
                }`}
                id="select-hypertension"
              >
                <div className={`p-2 rounded-xl shrink-0 ${restrictions.includes("hypertension") ? "bg-orange-500 text-white" : "bg-orange-50 text-orange-500"}`}>
                  <Flame className="w-5 h-5" />
                </div>
                <div>
                  <div className="font-bold text-sm">Darah Tinggi</div>
                  <div className="text-[11px] opacity-80">Sensitif Garam</div>
                </div>
              </button>

              {/* Gout */}
              <button
                onClick={() => handleToggleRestriction("gout")}
                className={`p-3 rounded-2xl border text-left transition-all duration-150 cursor-pointer flex items-center gap-3 ${
                  restrictions.includes("gout")
                    ? "bg-purple-50 border-purple-300 ring-2 ring-purple-100 text-purple-950"
                    : "bg-white border-slate-200 hover:border-slate-300 text-slate-600"
                }`}
                id="select-gout"
              >
                <div className={`p-2 rounded-xl shrink-0 ${restrictions.includes("gout") ? "bg-purple-500 text-white" : "bg-purple-50 text-purple-500"}`}>
                  <ShieldAlert className="w-5 h-5" />
                </div>
                <div>
                  <div className="font-bold text-sm">Asam Urat</div>
                  <div className="text-[11px] opacity-80">Tinggi Purin</div>
                </div>
              </button>
            </div>

            <div className="mt-4 flex justify-end">
              <button
                onClick={() => handleToggleRestriction("umum")}
                className={`px-3 py-1.5 rounded-full border text-xs font-semibold transition-all duration-150 cursor-pointer flex items-center gap-1.5 ${
                  restrictions.includes("umum")
                    ? "bg-emerald-100 border-emerald-300 text-emerald-800"
                    : "bg-slate-50 border-slate-200 text-slate-500 hover:border-slate-300"
                }`}
                id="select-umum"
              >
                <Sparkles className="w-3.5 h-3.5 text-emerald-500" />
                Umum (Menjaga Kesehatan Lansia)
              </button>
            </div>
          </section>

          {/* STEP 2: Capture / Dropzone Viewfinder */}
          <section className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm" id="section-camera">
            <div className="flex items-center gap-3 mb-4">
              <span className="bg-slate-900 text-white w-6 h-6 rounded-full flex items-center justify-center font-bold text-xs">2</span>
              <h2 className="text-lg font-bold tracking-tight text-slate-900">Foto Label Gizi</h2>
            </div>

            {/* Clean Minimalism Styled Viewfinder Border */}
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={`relative rounded-2xl border-4 border-slate-100 bg-slate-950 overflow-hidden shadow-inner flex flex-col items-center justify-center transition-all min-h-[220px] ${
                dragOver ? "border-emerald-400" : ""
              }`}
              id="viewfinder"
            >
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                accept="image/*"
                capture="environment"
                className="hidden"
                id="camera-input"
              />

              {/* Decorative Scanning Targets */}
              <div className="absolute inset-4 pointer-events-none border border-white/10 rounded-xl flex items-center justify-center">
                <div className="absolute top-0 left-0 w-6 h-6 border-t-2 border-l-2 border-emerald-400 rounded-tl-md"></div>
                <div className="absolute top-0 right-0 w-6 h-6 border-t-2 border-r-2 border-emerald-400 rounded-tr-md"></div>
                <div className="absolute bottom-0 left-0 w-6 h-6 border-b-2 border-l-2 border-emerald-400 rounded-bl-md"></div>
                <div className="absolute bottom-0 right-0 w-6 h-6 border-b-2 border-r-2 border-emerald-400 rounded-br-md"></div>
              </div>

              {selectedImage ? (
                <div className="w-full h-full relative flex flex-col items-center justify-center p-4 z-10" id="preview-container">
                  <img src={selectedImage} alt="Label scan preview" className="max-h-48 rounded-lg object-contain border border-white/20" />
                  
                  {/* Laser line while loading / analyzing */}
                  {isAnalyzing && (
                    <div className="absolute left-0 right-0 h-1 bg-emerald-400 shadow-[0_0_10px_#34d399] animate-[bounce_2s_infinite]" id="scanning-laser-beam" />
                  )}

                  <div className="flex gap-2 mt-4">
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="px-4 py-2 bg-white text-slate-800 rounded-full font-bold text-xs shadow-md border border-slate-200 cursor-pointer flex items-center gap-1"
                      id="btn-rephoto"
                    >
                      <Camera className="w-3.5 h-3.5" />
                      Ambil Ulang
                    </button>
                    <button
                      onClick={() => {
                        setSelectedImage(null);
                        setAnalysisResult(null);
                      }}
                      className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-full font-bold text-xs shadow-md cursor-pointer"
                      id="btn-discard"
                    >
                      Batal
                    </button>
                  </div>
                </div>
              ) : (
                <div className="text-center p-6 flex flex-col items-center justify-center z-10 text-white" id="viewfinder-placeholder">
                  <div className="w-14 h-14 bg-emerald-600 rounded-full flex items-center justify-center mb-4 shadow-lg text-white">
                    <Camera className="w-6 h-6" />
                  </div>
                  <p className="font-bold text-base text-white">Ketuk untuk Ambil Foto</p>
                  <p className="text-xs text-slate-400 mt-1 max-w-xs leading-normal">
                    Letakkan tabel nilai gizi pada kemasan di tengah kamera, atau seret foto ke sini
                  </p>
                  
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="mt-4 px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm rounded-full cursor-pointer shadow-md transition-all active:scale-95"
                    id="btn-camera-trigger"
                  >
                    Buka Kamera / Pilih File
                  </button>
                </div>
              )}
            </div>

            {/* Presets - quick testing triggers */}
            <div className="mt-5 pt-4 border-t border-slate-100" id="presets-container">
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                👉 Atau Coba Contoh Label Gizi Langsung:
              </p>
              <div className="grid grid-cols-3 gap-2" id="quick-presets">
                <button
                  onClick={() => handleLoadPreset("susu_manis")}
                  className="px-3 py-2 bg-slate-50 hover:bg-red-50 hover:text-red-950 rounded-xl text-center border border-slate-200 text-xs font-bold text-slate-700 cursor-pointer transition-all"
                  id="preset-sweet"
                >
                  🥛 SKM (Manis)
                </button>
                <button
                  onClick={() => handleLoadPreset("keripik_asin")}
                  className="px-3 py-2 bg-slate-50 hover:bg-amber-50 hover:text-amber-950 rounded-xl text-center border border-slate-200 text-xs font-bold text-slate-700 cursor-pointer transition-all"
                  id="preset-salty"
                >
                  🥔 Keripik (Asin)
                </button>
                <button
                  onClick={() => handleLoadPreset("susu_sehat")}
                  className="px-3 py-2 bg-slate-50 hover:bg-emerald-50 hover:text-emerald-950 rounded-xl text-center border border-slate-200 text-xs font-bold text-slate-700 cursor-pointer transition-all"
                  id="preset-healthy"
                >
                  🌱 Susu Gandum
                </button>
              </div>
            </div>

            {/* Large Scan Trigger Button */}
            {selectedImage && !isAnalyzing && (
              <button
                onClick={handleAnalyze}
                className="w-full mt-5 py-4 bg-emerald-600 hover:bg-emerald-700 text-white py-4 rounded-2xl font-bold text-lg shadow-lg flex items-center justify-center gap-2 cursor-pointer transition-all hover:shadow-emerald-100"
                id="btn-run-analysis"
              >
                <span>🔍</span> Cek Nilai Gizinya Sekarang
              </button>
            )}
          </section>
        </div>

        {/* Right Column: Analysis Results or Default Screen & History (lg:col-span-7) */}
        <div className="lg:col-span-7 flex flex-col gap-6" id="right-column">
          
          {/* Error display */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-3xl p-5 text-slate-900" id="error-box">
              <div className="flex gap-3">
                <XCircle className="w-6 h-6 text-red-600 shrink-0" />
                <div>
                  <h4 className="font-extrabold text-red-900">Mohon maaf, terjadi kendala:</h4>
                  <p className="text-sm mt-1 text-slate-700">{error}</p>
                </div>
              </div>
            </div>
          )}

          {/* LOADING STATE CARD */}
          {isAnalyzing && (
            <div className="bg-white rounded-3xl p-8 border border-slate-200 shadow-sm flex flex-col items-center justify-center text-center min-h-[350px]" id="loading-state">
              <div className="w-16 h-16 bg-emerald-50 rounded-full flex items-center justify-center mb-4 border border-emerald-100 relative">
                <RefreshCw className="w-8 h-8 text-emerald-600 animate-spin" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-1">Membaca Label Nilai Gizi...</h3>
              <p className="text-slate-500 text-sm max-w-sm mb-6 leading-relaxed">
                Mohon tunggu sebentar ya, NutriLens sedang meneliti foto yang dikirimkan.
              </p>
              
              <div className="w-full max-w-xs bg-slate-100 h-2 rounded-full overflow-hidden mb-4">
                <div className="h-full bg-emerald-600 animate-[pulse_1.5s_infinite] w-3/4 mx-auto rounded-full" />
              </div>

              <div className="bg-slate-50 border border-slate-100 rounded-2xl px-4 py-3 text-sm font-semibold text-slate-700">
                🔎 "{statusMessage}"
              </div>
            </div>
          )}

          {/* ACTIVE ANALYSIS RESULT DISPLAY */}
          <AnimatePresence mode="wait">
            {analysisResult && !isAnalyzing ? (
              <motion.div
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                className="flex flex-col gap-6"
                key="result-card"
                id="active-result-card"
              >
                {/* 1. Main Status Verdict Card */}
                <div
                  className={`bg-white rounded-3xl p-8 border-4 shadow-sm relative overflow-hidden flex flex-col items-center text-center justify-center ${
                    analysisResult.color === "merah"
                      ? "border-red-500"
                      : analysisResult.color === "kuning"
                      ? "border-amber-400"
                      : "border-emerald-500"
                  }`}
                  id="status-verdict-card"
                >
                  {/* Verdict Badge Icon */}
                  <div
                    className={`w-20 h-20 rounded-full flex items-center justify-center mb-4 border-4 shadow-inner ${
                      analysisResult.color === "merah"
                        ? "bg-red-50 border-red-400 text-red-600"
                        : analysisResult.color === "kuning"
                        ? "bg-amber-50 border-amber-400 text-amber-600"
                        : "bg-emerald-50 border-emerald-400 text-emerald-600"
                    }`}
                    id="verdict-icon-container"
                  >
                    {analysisResult.color === "merah" ? (
                      <XCircle className="w-10 h-10" />
                    ) : analysisResult.color === "kuning" ? (
                      <AlertTriangle className="w-10 h-10" />
                    ) : (
                      <CheckCircle2 className="w-10 h-10" />
                    )}
                  </div>

                  <h2
                    className={`text-4xl font-black uppercase tracking-tight mb-1 ${
                      analysisResult.color === "merah"
                        ? "text-red-600"
                        : analysisResult.color === "kuning"
                        ? "text-amber-500"
                        : "text-emerald-600"
                    }`}
                    id="verdict-title"
                  >
                    {analysisResult.status === "AMAN" && "AMAN KONSUMSI"}
                    {analysisResult.status === "BATASI" && "BATASI / WASPADA"}
                    {analysisResult.status === "BAHAYA" && "HINDARI / BAHAYA"}
                  </h2>

                  <p className="text-xl font-bold text-slate-700 mb-4" id="verdict-product-name">
                    {analysisResult.productName || "Nama Produk Makanan"}
                  </p>

                  <div className="w-full h-px bg-slate-100 mb-4"></div>

                  <p className="text-base text-slate-700 leading-relaxed max-w-lg mb-6" id="verdict-reason">
                    {analysisResult.reason}
                  </p>

                  {/* VOICE SPEAKER ACCENT (Clean Minimalist Interactive Bar) */}
                  <div className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 flex flex-col sm:flex-row justify-between items-center gap-3" id="voice-synthesis-bar">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-full ${isSpeaking ? "bg-red-500 animate-pulse text-white" : "bg-emerald-100 text-emerald-700"}`}>
                        <Volume2 className="w-5 h-5" />
                      </div>
                      <div className="text-left">
                        <span className="text-xs font-extrabold uppercase tracking-wider text-slate-400 block">Asisten Suara NutriLens</span>
                        <span className="text-xs text-slate-600 font-semibold">Dengarkan evaluasi belanja dibacakan nyaring</span>
                      </div>
                    </div>

                    {/* Simple Equalizer simulation */}
                    {isSpeaking && (
                      <div className="flex items-end gap-1 h-6 shrink-0" id="equalizer-bars">
                        {soundBars.map((height, idx) => (
                          <div
                            key={idx}
                            className="w-1 bg-emerald-500 rounded-t"
                            style={{ height: `${height}px` }}
                          />
                        ))}
                      </div>
                    )}

                    <button
                      onClick={handleToggleSpeak}
                      className={`px-4 py-2 text-xs font-bold rounded-full transition-all cursor-pointer shadow-sm flex items-center gap-1.5 ${
                        isSpeaking
                          ? "bg-red-500 text-white hover:bg-red-600"
                          : "bg-slate-900 text-white hover:bg-slate-800"
                      }`}
                      id="btn-voice-toggle"
                    >
                      {isSpeaking ? (
                        <>
                          <Square className="w-3 h-3 fill-white" /> Hentikan
                        </>
                      ) : (
                        <>
                          <Play className="w-3 h-3 fill-white" /> Putar Suara
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {/* 2. Detailed Nutrients Breakdown List */}
                <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm" id="nutrients-breakdown-card">
                  <h3 className="font-extrabold text-slate-900 mb-4 flex items-center gap-2 text-base">
                    📋 Kandungan Nutrisi Terdeteksi
                  </h3>
                  
                  <div className="space-y-3" id="nutrients-grid-list">
                    {analysisResult.nutrients && analysisResult.nutrients.length > 0 ? (
                      analysisResult.nutrients.map((nut, index) => (
                        <div
                          key={index}
                          className="flex justify-between items-center p-4 bg-slate-50 rounded-2xl border border-slate-150"
                        >
                          <div>
                            <span className="font-bold text-slate-800 text-sm md:text-base">{nut.name}</span>
                            <span className="text-xs text-slate-500 font-semibold block">Kandungan: {nut.value}</span>
                          </div>
                          
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-slate-500">{nut.evaluation}</span>
                            <span
                              className={`px-3 py-1.5 rounded-full text-xs font-extrabold uppercase tracking-wide border shadow-inner ${
                                nut.status === "MERAH"
                                  ? "bg-red-50 text-red-600 border-red-200"
                                  : nut.status === "KUNING"
                                  ? "bg-amber-50 text-amber-600 border-amber-200"
                                  : "bg-emerald-50 text-emerald-600 border-emerald-200"
                              }`}
                            >
                              {nut.status === "MERAH" ? "Bahaya" : nut.status === "KUNING" ? "Batasi" : "Aman"}
                            </span>
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className="text-slate-400 text-xs italic">Tidak ada nilai nutrisi spesifik untuk dirincikan.</p>
                    )}
                  </div>
                </div>

                {/* 3. Shopping Suggestions Banner */}
                <div className="bg-emerald-50 border border-emerald-200 rounded-3xl p-6" id="shopping-advice-banner">
                  <div>
                    <h3 className="font-bold text-emerald-950">Rekomendasi Belanja dari NutriLens:</h3>
                    <p className="text-emerald-900 text-sm mt-1 leading-relaxed">
                      {analysisResult.recommendation}
                    </p>
                  </div>
                </div>
              </motion.div>
            ) : null}
          </AnimatePresence>

          {/* INITIAL WELCOME SCREEN (If no result is actively scanned) */}
          {!analysisResult && !isAnalyzing && (
            <div className="bg-white rounded-3xl p-10 border border-slate-200 shadow-sm flex flex-col items-center justify-center text-center min-h-[350px]" id="welcome-instruction">
              <div className="w-16 h-16 bg-emerald-50 rounded-full flex items-center justify-center mb-6 border border-emerald-100">
                <Camera className="w-7 h-7 text-emerald-600" />
              </div>
              <h3 className="text-2xl font-bold text-slate-900 mb-2">Hasil Analisis Gizi</h3>
              <p className="text-slate-500 text-sm max-w-sm leading-relaxed mb-6">
                Belum ada produk yang dipindai. Silakan ambil foto label gizi makanan atau sentuh salah satu contoh label di kiri untuk memulai.
              </p>
              
              <div className="flex items-center gap-2 text-xs text-slate-400 font-semibold bg-slate-50 px-3 py-1.5 rounded-full border border-slate-100">
                <Clock className="w-3.5 h-3.5 text-slate-400" />
                Membantu Lansia Berbelanja Mandiri Sehat
              </div>
            </div>
          )}

          {/* TODAY'S SCAN HISTORY */}
          <section className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm" id="section-history">
            <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-100">
              <h3 className="font-bold text-slate-900 flex items-center gap-2 text-sm md:text-base">
                <History className="w-4 h-4 text-slate-500" /> Riwayat Belanja Hari Ini ({scanHistory.length})
              </h3>
              {scanHistory.length > 0 && (
                <button
                  onClick={handleClearHistory}
                  className="text-xs text-red-500 font-bold hover:text-red-700 flex items-center gap-1 cursor-pointer"
                  id="btn-delete-history"
                >
                  <Trash2 className="w-3.5 h-3.5" /> Bersihkan
                </button>
              )}
            </div>

            {scanHistory.length > 0 ? (
              <div className="space-y-2.5" id="history-items-container">
                {scanHistory.map((item) => (
                  <div
                    key={item.id}
                    onClick={() => handleLoadHistoryItem(item)}
                    className="p-3 bg-slate-50 hover:bg-slate-100/80 rounded-2xl border border-slate-200 cursor-pointer transition-all flex items-center justify-between gap-3"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-slate-200 border border-slate-300 overflow-hidden shrink-0 flex items-center justify-center text-sm font-bold">
                        <img src={item.imageUrl} alt="Thumbnail" className="w-full h-full object-cover" />
                      </div>
                      <div>
                        <div className="font-bold text-slate-800 text-xs md:text-sm line-clamp-1">
                          {item.result.productName}
                        </div>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {item.restrictions.map((res) => (
                            <span
                              key={res}
                              className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-white text-slate-500 border border-slate-200"
                            >
                              {res}
                            </span>
                          ))}
                          <span className="text-[10px] text-slate-400 font-medium ml-1">
                            Pukul {item.timestamp}
                          </span>
                        </div>
                      </div>
                    </div>

                    <span
                      className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase shrink-0 border ${
                        item.result.color === "merah"
                          ? "bg-red-50 text-red-600 border-red-200"
                          : item.result.color === "kuning"
                          ? "bg-amber-50 text-amber-600 border-amber-200"
                          : "bg-emerald-50 text-emerald-600 border-emerald-200"
                      }`}
                    >
                      {item.result.status}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-6 text-slate-400 text-xs italic" id="history-empty">
                Belum ada produk yang dipindai hari ini.
              </div>
            )}
          </section>

        </div>
      </main>

      {/* Modern, Simple, Clean Footer */}
      <footer className="mt-8 text-center text-xs text-slate-400 max-w-2xl mx-auto px-4" id="app-footer">
        <div className="w-16 h-px bg-slate-200 mx-auto mb-4" />
        <p className="font-medium text-slate-500">© 2026 NutriLens Smart Grocery Reader - By Hardianto-dev.</p>
        <p className="mt-1">Dibuat khusus untuk mendukung kemandirian hidup sehat kakek, nenek, dan lansia Indonesia.</p>
      </footer>
    </div>
  );
}
