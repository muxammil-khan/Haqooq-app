import React, { useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Camera, Upload, Loader2, FileUp } from 'lucide-react';
import { motion } from 'motion/react';
import { cn } from '@/lib/utils';

interface ScanButtonProps {
  onScan: (file: File) => void;
  isScanning: boolean;
}

export const ScanButton: React.FC<ScanButtonProps> = ({ onScan, isScanning }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      onScan(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    if (!isScanning) setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (isScanning) return;

    const file = e.dataTransfer.files?.[0];
    if (file && (file.type.startsWith('image/') || file.type === 'application/pdf')) {
      onScan(file);
    }
  };

  const triggerUpload = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="flex flex-col items-center gap-6 p-8 w-full max-w-xl mx-auto">
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept="image/*,.pdf"
        className="hidden"
      />
      
      <motion.div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={cn(
          "w-full aspect-video rounded-3xl border-2 border-dashed transition-all duration-300 flex flex-col items-center justify-center gap-4 cursor-pointer relative overflow-hidden",
          isDragging 
            ? "border-emerald-500 bg-emerald-50/50 scale-[1.02]" 
            : "border-emerald-200 bg-white hover:border-emerald-400 hover:bg-emerald-50/30",
          isScanning && "opacity-50 cursor-not-allowed"
        )}
        onClick={triggerUpload}
      >
        <AnimatePresence>
          {isScanning ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex flex-col items-center gap-3"
            >
              <Loader2 className="w-12 h-12 animate-spin text-emerald-600" />
              <p className="text-emerald-700 font-semibold animate-pulse">Analyzing Document...</p>
            </motion.div>
          ) : (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex flex-col items-center gap-3 text-center px-6"
            >
              <div className={cn(
                "p-4 rounded-full transition-colors",
                isDragging ? "bg-emerald-500 text-white" : "bg-emerald-100 text-emerald-600"
              )}>
                {isDragging ? <FileUp className="w-10 h-10" /> : <Camera className="w-10 h-10" />}
              </div>
              <div className="space-y-1">
                <p className="text-xl font-bold text-zinc-800">
                  {isDragging ? "Drop to scan" : "Click or drag document here"}
                </p>
                <p className="text-zinc-500 text-sm">
                  Supports Images and PDFs
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Animated background pulse when dragging */}
        {isDragging && (
          <motion.div
            layoutId="pulse"
            className="absolute inset-0 bg-emerald-500/5"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ repeat: Infinity, duration: 1.5, repeatType: "reverse" }}
          />
        )}
      </motion.div>

      <div className="text-center space-y-2">
        <p className="text-zinc-600 font-medium">Upload a photo or PDF of your legal or utility document</p>
        <p className="text-zinc-400 text-sm italic">Haqooq will decode it for you in seconds</p>
      </div>

      <Button
        variant="ghost"
        onClick={triggerUpload}
        disabled={isScanning}
        className="text-emerald-700 hover:text-emerald-800 hover:bg-emerald-50"
      >
        <Upload className="w-4 h-4 mr-2" />
        Choose from device
      </Button>
    </div>
  );
};

import { AnimatePresence } from 'motion/react';
