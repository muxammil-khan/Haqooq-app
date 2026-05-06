import React, { useState, useEffect } from 'react';
import { ScanButton } from '@/src/components/ScanButton';
import { ResultsDashboard } from '@/src/components/ResultsDashboard';
import { analyzeDocument, AnalysisResult } from '@/src/services/geminiService';
import { deleteScan, saveScan, getUserScans, ScanRecord } from '@/src/services/firebaseService';
import { auth, signInWithGoogle } from '@/src/lib/firebase';
import { onAuthStateChanged, User } from 'firebase/auth';
import { Toaster } from '@/components/ui/sonner';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'motion/react';
import { Scale, History, Info, ShieldCheck, ArrowLeft, Volume2, LogIn, LogOut, FileText, ArrowRight, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [view, setView] = useState<'home' | 'results' | 'history'>('home');
  const [history, setHistory] = useState<ScanRecord[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
      if (user) {
        loadHistory();
      }
    });
    return () => unsubscribe();
  }, []);

  const loadHistory = async () => {
    setIsLoadingHistory(true);
    try {
      const scans = await getUserScans();
      setHistory(scans);
    } catch (error) {
      console.error("Failed to load history:", error);
    } finally {
      setIsLoadingHistory(false);
    }
  };

  const handleLogin = async () => {
    try {
      await signInWithGoogle();
      toast.success("Signed in successfully!");
    } catch (error) {
      toast.error("Failed to sign in.");
    }
  };

  const handleLogout = async () => {
    await auth.signOut();
    setView('home');
    setResult(null);
    setImageUrl(null);
    toast.info("Signed out.");
  };

  const handleScan = async (file: File) => {
    if (!user) {
      toast.error("Please sign in to scan documents.");
      handleLogin();
      return;
    }

    setIsScanning(true);
    const reader = new FileReader();
    
    reader.onload = async (e) => {
      const base64 = e.target?.result as string;
      setImageUrl(base64);
      
      try {
        const analysis = await analyzeDocument(base64, file.type);
        setResult(analysis);
        
        // Save to Firebase
        await saveScan(base64, analysis);
        await loadHistory(); // Refresh history
        
        setView('results');
        toast.success("Document analyzed and saved!");
      } catch (error) {
        console.error(error);
        toast.error("Failed to analyze document. Please try again.");
      } finally {
        setIsScanning(false);
      }
    };

    reader.readAsDataURL(file);
  };

  const reset = () => {
    window.speechSynthesis.cancel();
    setResult(null);
    setImageUrl(null);
    setView('home');
  };

  const viewHistory = () => {
    if (!user) {
      handleLogin();
      return;
    }
    setView('history');
  };

  const selectFromHistory = (record: ScanRecord) => {
    setResult({
      summary_en: record.summary_en,
      summary_ur: record.summary_ur,
      rights: record.rights,
      action: record.action
    });
    setImageUrl(record.imageUrl);
    setView('results');
  };

  const handleDelete = async (e: React.MouseEvent, scanId: string) => {
    e.stopPropagation();
    setDeleteConfirmId(scanId);
  };

  const confirmDelete = async () => {
    if (!deleteConfirmId) return;
    
    try {
      await deleteScan(deleteConfirmId);
      setHistory(prev => prev.filter(item => item.id !== deleteConfirmId));
      toast.success("Scan deleted successfully");
    } catch (error) {
      toast.error("Failed to delete scan");
    } finally {
      setDeleteConfirmId(null);
    }
  };

  return (
    <div className="min-h-screen bg-[#fdfcf9] font-sans text-zinc-900">
      <Toaster position="top-center" />
      
      {/* Navigation */}
      <nav className="border-b border-emerald-100 bg-white/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2 cursor-pointer" onClick={reset}>
            <div className="bg-emerald-600 p-1.5 rounded-lg">
              <Scale className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-emerald-900">Haqooq</h1>
          </div>
          
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" className="text-zinc-600" onClick={viewHistory}>
              <History className="w-4 h-4 mr-2" />
              History
            </Button>
            {user ? (
              <div className="flex items-center gap-3">
                <div className="hidden md:block text-right">
                  <p className="text-xs font-medium text-zinc-900">{user.displayName}</p>
                  <p className="text-[10px] text-zinc-500">{user.email}</p>
                </div>
                <Button variant="outline" size="sm" onClick={handleLogout} className="border-zinc-200">
                  <LogOut className="w-4 h-4" />
                </Button>
              </div>
            ) : (
              <Button size="sm" onClick={handleLogin} className="bg-emerald-600 hover:bg-emerald-700">
                <LogIn className="w-4 h-4 mr-2" />
                Sign In
              </Button>
            )}
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 py-12">
        <AnimatePresence mode="wait">
          {view === 'home' && (
            <motion.div
              key="home"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-12"
            >
              <div className="space-y-4 max-w-2xl">
                <h2 className="text-5xl font-extrabold text-zinc-900 tracking-tight leading-tight">
                  Understand Your Documents. <br />
                  <span className="text-emerald-600">Know Your Rights.</span>
                </h2>
                <p className="text-xl text-zinc-500">
                  Upload any Pakistani legal or utility document. Haqooq uses AI to decode complex language into simple steps.
                </p>
              </div>

              <ScanButton onScan={handleScan} isScanning={isScanning} />

              {!user && (
                <div className="bg-emerald-50 border border-emerald-100 p-4 rounded-xl max-w-md">
                  <p className="text-emerald-800 text-sm font-medium">
                    Sign in to save your scans and access them later from any device.
                  </p>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-3 gap-8 w-full max-w-4xl pt-12">
                <div className="flex flex-col items-center p-6 rounded-2xl bg-white border border-emerald-50 shadow-sm">
                  <div className="bg-emerald-100 p-3 rounded-full mb-4">
                    <ShieldCheck className="w-6 h-6 text-emerald-700" />
                  </div>
                  <h3 className="font-bold mb-2">Legal Clarity</h3>
                  <p className="text-sm text-zinc-500">Get simple explanations for complex legal jargon.</p>
                </div>
                <div className="flex flex-col items-center p-6 rounded-2xl bg-white border border-emerald-50 shadow-sm">
                  <div className="bg-emerald-100 p-3 rounded-full mb-4">
                    <History className="w-6 h-6 text-emerald-700" />
                  </div>
                  <h3 className="font-bold mb-2">Secure History</h3>
                  <p className="text-sm text-zinc-500">All your scans are saved securely for future reference.</p>
                </div>
                <div className="flex flex-col items-center p-6 rounded-2xl bg-white border border-emerald-50 shadow-sm">
                  <div className="bg-emerald-100 p-3 rounded-full mb-4">
                    <Volume2 className="w-6 h-6 text-emerald-700" />
                  </div>
                  <h3 className="font-bold mb-2">Urdu Support</h3>
                  <p className="text-sm text-zinc-500">Listen to summaries in Urdu for better accessibility.</p>
                </div>
              </div>
            </motion.div>
          )}

          {view === 'results' && result && imageUrl && (
            <motion.div
              key="results"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-8"
            >
              <div className="flex items-center justify-between">
                <Button variant="ghost" onClick={reset} className="text-zinc-500">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back to Scan
                </Button>
                <div className="flex gap-2">
                  <Badge variant="outline" className="border-emerald-200 text-emerald-700">
                    Document Decoded
                  </Badge>
                </div>
              </div>
              
              <ResultsDashboard result={result} imageUrl={imageUrl} />
            </motion.div>
          )}

          {view === 'history' && (
            <motion.div
              key="history"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-8"
            >
              <div className="flex items-center justify-between">
                <Button variant="ghost" onClick={reset} className="text-zinc-500">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back to Home
                </Button>
                <h2 className="text-2xl font-bold text-emerald-900">Your Scan History</h2>
              </div>

              {isLoadingHistory ? (
                <div className="flex justify-center py-20">
                  <Scale className="w-12 h-12 text-emerald-200 animate-pulse" />
                </div>
              ) : history.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {history.map((record) => (
                    <Card 
                      key={record.id} 
                      className="overflow-hidden hover:shadow-md transition-shadow cursor-pointer border-emerald-50"
                      onClick={() => selectFromHistory(record)}
                    >
                      <div className="h-40 overflow-hidden relative">
                        <img 
                          src={record.imageUrl} 
                          alt="Scan" 
                          className="w-full h-full object-cover"
                          referrerPolicy="no-referrer"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent flex items-end p-4">
                          <p className="text-white text-xs font-medium">
                            {record.createdAt?.toDate().toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <CardHeader className="p-4 relative">
                        <CardTitle className="text-sm line-clamp-2 text-zinc-800 pr-6">
                          {record.summary_en}
                        </CardTitle>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="absolute top-2 right-2 text-zinc-400 hover:text-red-500 h-8 w-8"
                          onClick={(e) => handleDelete(e, record.id!)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </CardHeader>
                      <CardContent className="p-4 pt-0">
                        <div className="flex items-center text-emerald-600 text-xs font-semibold">
                          View Details <ArrowRight className="w-3 h-3 ml-1" />
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="text-center py-20 space-y-4">
                  <div className="bg-zinc-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto">
                    <FileText className="w-8 h-8 text-zinc-400" />
                  </div>
                  <p className="text-zinc-500">No scans found. Start by scanning a document!</p>
                  <Button onClick={reset} className="bg-emerald-600 hover:bg-emerald-700">
                    Scan Now
                  </Button>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {deleteConfirmId && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
              onClick={() => setDeleteConfirmId(null)}
            />
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-2xl p-6 shadow-2xl relative z-10 max-w-sm w-full space-y-4"
            >
              <h3 className="text-xl font-bold text-zinc-900">Delete Scan?</h3>
              <p className="text-zinc-500">
                Are you sure you want to delete this scan? This action cannot be undone.
              </p>
              <div className="flex gap-3 pt-2">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => setDeleteConfirmId(null)}
                >
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  className="flex-1 bg-red-600 hover:bg-red-700"
                  onClick={confirmDelete}
                >
                  Delete
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Footer */}
      <footer className="border-t border-emerald-50 bg-white py-12 mt-24">
        <div className="max-w-7xl mx-auto px-4 flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-2">
            <Scale className="w-5 h-5 text-emerald-600" />
            <span className="font-bold text-emerald-900">Haqooq</span>
          </div>
          <p className="text-zinc-400 text-sm">
            © 2026 Haqooq. Empowering citizens through legal literacy.
          </p>
          <div className="flex gap-6 text-sm text-zinc-500">
            <a href="#" className="hover:text-emerald-600">Privacy</a>
            <a href="#" className="hover:text-emerald-600">Terms</a>
            <a href="#" className="hover:text-emerald-600">Contact</a>
          </div>
        </div>
      </footer>
    </div>
  );
}

