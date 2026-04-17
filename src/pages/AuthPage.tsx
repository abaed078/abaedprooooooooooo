import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  updateProfile,
  GoogleAuthProvider,
  signInWithPopup
} from "firebase/auth";
import { auth } from "@/lib/firebase";
import { motion, AnimatePresence } from "framer-motion";
import { 
  LogIn, 
  UserPlus, 
  Mail, 
  Lock, 
  User as UserIcon, 
  ArrowRight, 
  AlertCircle,
  Chrome,
  Eye,
  EyeOff,
  Cpu,
  Fingerprint,
  Activity,
  ShieldCheck
} from "lucide-react";

export default function AuthPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [scanProgress, setScanProgress] = useState(0);
  const [, setLocation] = useLocation();

  useEffect(() => {
    let interval: any;
    if (loading) {
      interval = setInterval(() => {
        setScanProgress(prev => (prev < 95 ? prev + Math.random() * 15 : prev));
      }, 100);
    } else {
      if (interval) clearInterval(interval);
    }
    return () => clearInterval(interval);
  }, [loading]);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setScanProgress(0); // Add reset here
    setLoading(true);
    setError(null);

    try {
      if (isLogin) {
        await signInWithEmailAndPassword(auth, email, password);
      } else {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        await updateProfile(userCredential.user, { displayName: name });
      }
      setLocation("/");
    } catch (err: any) {
      console.error(err);
      setError(err.message || "فشل التحقق من الهوية. يرجى مراجعة البيانات.");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    const provider = new GoogleAuthProvider();
    setLoading(true);
    try {
      await signInWithPopup(auth, provider);
      setLocation("/");
    } catch (err: any) {
      setError(err.message);
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#050505] flex items-center justify-center p-4 font-sans selection:bg-blue-500/30 relative overflow-hidden">
      {/* Cinematic Background */}
      <div className="fixed inset-0 pointer-events-none">
        {/* Grid System */}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(13,24,44,0.5)_1px,transparent_1px),linear-gradient(90deg,rgba(13,24,44,0.5)_1px,transparent_1px)] bg-[size:40px_40px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)] opacity-30" />
        
        {/* Moving Laser Scan */}
        <motion.div 
          animate={{ y: ["-100%", "200%"] }}
          transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
          className="absolute inset-x-0 h-[2px] bg-gradient-to-r from-transparent via-blue-500/50 to-transparent shadow-[0_0_20px_rgba(59,130,246,0.5)] z-0"
        />

        {/* Ambient Glows */}
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-900/20 blur-[120px] rounded-full" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-900/10 blur-[120px] rounded-full" />
      </div>

      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-lg relative z-10"
      >
        <div className="backdrop-blur-xl bg-zinc-900/60 border border-white/10 rounded-[2rem] overflow-hidden shadow-[0_0_50px_rgba(0,0,0,0.5)] flex flex-col md:flex-row">
          
          {/* Diagnostic Sidebar (Visible on large screens) */}
          <div className="hidden md:flex flex-col justify-between p-8 bg-blue-600/5 border-r border-white/5 w-40">
            <div className="space-y-6">
              <Activity className="text-blue-500/40 w-6 h-6" />
              <Cpu className="text-blue-500/40 w-6 h-6" />
              <Fingerprint className="text-blue-500/40 w-6 h-6" />
            </div>
            <ShieldCheck className="text-blue-500/60 w-8 h-8" />
          </div>

          <div className="flex-1 flex flex-col">
            {/* Header */}
            <div className="p-8 pb-4 text-center">
              <motion.div 
                animate={{ boxShadow: ["0 0 20px rgba(59,130,246,0.1)", "0 0 40px rgba(59,130,246,0.3)", "0 0 20px rgba(59,130,246,0.1)"] }}
                transition={{ duration: 2, repeat: Infinity }}
                className="inline-flex items-center justify-center w-20 h-20 rounded-3xl bg-gradient-to-br from-blue-600 to-blue-800 mb-6 shadow-xl relative group"
              >
                <img src="/apple-touch-icon.png" alt="Autel" className="w-12 h-12 object-contain invert relative z-10" />
                <div className="absolute inset-0 rounded-3xl bg-blue-400/20 blur-xl opacity-0 group-hover:opacity-100 transition-opacity" />
              </motion.div>
              
              <h1 className="text-3xl font-bold text-white tracking-widest mb-2 uppercase font-mono">
                Autel MaxiSYS
              </h1>
              <div className="flex items-center justify-center gap-2 mb-4">
                <span className="h-[1px] w-8 bg-blue-500/30" />
                <p className="text-blue-400/80 text-[10px] uppercase tracking-[0.3em] font-bold">
                  {isLogin ? "System Access" : "Network Registration"}
                </p>
                <span className="h-[1px] w-8 bg-blue-500/30" />
              </div>
            </div>

            <form onSubmit={handleAuth} className="p-8 pt-2 space-y-5">
              <AnimatePresence mode="wait">
                {error && (
                  <motion.div 
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    className="bg-red-500/10 border-l-4 border-red-500 text-red-400 p-4 rounded-r-lg text-sm flex items-start gap-3"
                  >
                    <AlertCircle size={18} className="shrink-0 mt-0.5" />
                    <p>{error}</p>
                  </motion.div>
                )}
              </AnimatePresence>

              {!isLogin && (
                <div className="space-y-2">
                  <label className="text-[10px] uppercase tracking-[0.2em] font-bold text-zinc-500 ml-1">Identity Name</label>
                  <div className="relative group">
                    <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500 group-focus-within:text-blue-500 transition-all" size={18} />
                    <input 
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Operator Name"
                      className="w-full bg-black/40 border border-white/5 focus:border-blue-500/50 focus:ring-4 focus:ring-blue-500/10 rounded-2xl py-3.5 pl-12 pr-4 text-white placeholder:text-zinc-600 transition-all outline-none"
                    />
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <label className="text-[10px] uppercase tracking-[0.2em] font-bold text-zinc-500 ml-1">Terminal ID (Email)</label>
                <div className="relative group">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500 group-focus-within:text-blue-500 transition-all" size={18} />
                  <input 
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="access@autel.com"
                    className="w-full bg-black/40 border border-white/5 focus:border-blue-500/50 focus:ring-4 focus:ring-blue-500/10 rounded-2xl py-3.5 pl-12 pr-4 text-white placeholder:text-zinc-600 transition-all outline-none"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] uppercase tracking-[0.2em] font-bold text-zinc-500 ml-1">Security Key (Password)</label>
                <div className="relative group">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500 group-focus-within:text-blue-500 transition-all" size={18} />
                  <input 
                    type={showPassword ? "text" : "password"}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full bg-black/40 border border-white/5 focus:border-blue-500/50 focus:ring-4 focus:ring-blue-500/10 rounded-2xl py-3.5 pl-12 pr-12 text-white placeholder:text-zinc-600 transition-all outline-none font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white transition-colors"
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              <button 
                type="submit"
                disabled={loading}
                className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-4 rounded-2xl shadow-[0_0_30px_rgba(37,99,235,0.3)] transition-all flex flex-col items-center justify-center gap-1 group mt-4 overflow-hidden relative"
              >
                <div className="flex items-center gap-2 z-10">
                  {loading ? (
                    <span className="uppercase tracking-[0.2em] text-xs">Initializing System... {Math.round(scanProgress)}%</span>
                  ) : (
                    <>
                      <span className="uppercase tracking-[0.2em]">{isLogin ? "Authenticate" : "Register Unit"}</span>
                      <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                    </>
                  )}
                </div>
                {loading && (
                  <motion.div 
                    initial={{ scaleX: 0 }}
                    animate={{ scaleX: scanProgress / 100 }}
                    className="absolute bottom-0 left-0 right-0 h-1 bg-white/40 origin-left"
                  />
                )}
              </button>

              <div className="relative flex items-center justify-center py-2">
                <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-white/5"></div></div>
                <span className="relative px-4 text-[9px] uppercase tracking-widest text-zinc-600 bg-[#151619]/0 backdrop-blur-none">Biometric / External Auth</span>
              </div>

              <button 
                type="button"
                onClick={handleGoogleSignIn}
                className="w-full bg-white/5 hover:bg-white/10 border border-white/10 text-white font-bold py-4 rounded-2xl transition-all flex items-center justify-center gap-3 px-4 uppercase tracking-[0.1em] text-xs"
              >
                <div className="w-6 h-6 bg-white rounded-full flex items-center justify-center">
                  <Chrome size={14} className="text-blue-600" />
                </div>
                Portal Sign-In
              </button>
            </form>

            <div className="p-8 pt-0 text-center">
              <p className="text-zinc-500 text-[10px] uppercase tracking-widest">
                {isLogin ? "Unit Not Registered?" : "Authorization Active?"}{" "}
                <button 
                  onClick={() => setIsLogin(!isLogin)}
                  className="text-blue-400 hover:text-blue-300 font-bold ml-2 underline underline-offset-8 decoration-blue-500/30"
                >
                  {isLogin ? "Create ID" : "Login Terminal"}
                </button>
              </p>
            </div>
          </div>
        </div>

        {/* Footer info */}
        <div className="mt-8 flex flex-col md:flex-row items-center justify-between gap-4 text-[9px] uppercase tracking-[0.3em] text-zinc-500 font-bold px-6">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1.5"><div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" /> Global Server Online</span>
            <span>OS Build 2.4.0.S2</span>
          </div>
          <div className="flex items-center gap-4">
            <span>© 2026 Autel Intelligent Technology</span>
            <ShieldCheck size={12} className="text-blue-500" />
          </div>
        </div>
      </motion.div>
    </div>
  );
}

