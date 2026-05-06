import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Volume2, CheckCircle2, Info, ArrowRight, Loader2, FileText } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { AnalysisResult, generateUrduSpeech } from '@/src/services/geminiService';

interface ResultsDashboardProps {
  result: AnalysisResult;
  imageUrl: string;
}

export const ResultsDashboard: React.FC<ResultsDashboardProps> = ({ result, imageUrl }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    return () => {
      // Cleanup: stop all speech when component unmounts
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
      window.speechSynthesis.cancel();
    };
  }, []);

  const handleListen = async () => {
    // Stop any existing speech first
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    window.speechSynthesis.cancel();

    if (audioUrl) {
      const audio = new Audio(audioUrl);
      audioRef.current = audio;
      audio.onplay = () => setIsPlaying(true);
      audio.onended = () => {
        setIsPlaying(false);
        audioRef.current = null;
      };
      audio.play();
      return;
    }

    setIsPlaying(true);
    try {
      const url = await generateUrduSpeech(result.summary_ur);
      if (url) {
        setAudioUrl(url);
        const audio = new Audio(url);
        audioRef.current = audio;
        audio.onended = () => {
          setIsPlaying(false);
          audioRef.current = null;
        };
        audio.play();
      } else {
        // Fallback to browser TTS
        const utterance = new SpeechSynthesisUtterance(result.summary_ur);
        utterance.lang = 'ur-PK';
        utterance.onend = () => setIsPlaying(false);
        window.speechSynthesis.speak(utterance);
      }
    } catch (error) {
      console.error("Audio playback failed:", error);
      setIsPlaying(false);
      audioRef.current = null;
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-4 space-y-6">
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="grid grid-cols-1 md:grid-cols-3 gap-6"
      >
        {/* Document Preview */}
        <Card className="md:col-span-1 border-emerald-100 overflow-hidden">
          <CardHeader className="bg-emerald-50/50 pb-3">
            <CardTitle className="text-sm font-medium text-emerald-800">Document Preview</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {imageUrl.startsWith('data:application/pdf') ? (
              <div className="w-full h-64 bg-zinc-100 flex flex-col items-center justify-center gap-2">
                <FileText className="w-12 h-12 text-zinc-400" />
                <p className="text-xs text-zinc-500">PDF Document</p>
              </div>
            ) : (
              <img 
                src={imageUrl} 
                alt="Scanned Document" 
                className="w-full h-64 object-cover"
                referrerPolicy="no-referrer"
              />
            )}
          </CardContent>
        </Card>

        {/* Summary & Analysis */}
        <Card className="md:col-span-2 border-emerald-100 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <div className="space-y-1">
              <CardTitle className="text-2xl font-bold text-zinc-900">Analysis Result</CardTitle>
              <CardDescription>Decoded by Haqooq AI</CardDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleListen}
              disabled={isPlaying}
              className="border-emerald-200 text-emerald-700 hover:bg-emerald-50"
            >
              {isPlaying ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Volume2 className="w-4 h-4 mr-2" />}
              Listen (Urdu)
            </Button>
          </CardHeader>
          <CardContent className="space-y-6 pt-4">
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-emerald-700 font-semibold">
                <Info className="w-4 h-4" />
                <h3>Summary</h3>
              </div>
              <p className="text-zinc-700 leading-relaxed bg-zinc-50 p-4 rounded-lg border border-zinc-100">
                {result.summary_en}
              </p>
              <p className="text-zinc-600 text-right font-urdu leading-relaxed bg-emerald-50/30 p-4 rounded-lg border border-emerald-100/50 dir-rtl" dir="rtl">
                {result.summary_ur}
              </p>
            </div>

            <Separator className="bg-emerald-100" />

            <div className="space-y-4">
              <div className="flex items-center gap-2 text-emerald-700 font-semibold">
                <CheckCircle2 className="w-4 h-4" />
                <h3>Your Rights & Options</h3>
              </div>
              <div className="grid gap-3">
                {result.rights.map((right, index) => (
                  <motion.div
                    key={index}
                    initial={{ x: -10, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    transition={{ delay: index * 0.1 }}
                    className="flex items-start gap-3 p-3 rounded-md bg-emerald-50/30 border border-emerald-100/50"
                  >
                    <Badge variant="secondary" className="bg-emerald-100 text-emerald-800 shrink-0">
                      {index + 1}
                    </Badge>
                    <span className="text-zinc-700 text-sm">{right}</span>
                  </motion.div>
                ))}
              </div>
            </div>

            <Separator className="bg-emerald-100" />

            <div className="space-y-3">
              <div className="flex items-center gap-2 text-emerald-700 font-semibold">
                <ArrowRight className="w-4 h-4" />
                <h3>Recommended Action</h3>
              </div>
              <div className="p-4 bg-emerald-600 text-white rounded-lg shadow-md">
                <p className="font-medium">{result.action}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
};
