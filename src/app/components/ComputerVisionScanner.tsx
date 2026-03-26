import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Camera, RefreshCw, Check, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import * as tf from '@tensorflow/tfjs';

interface ComputerVisionScannerProps {
  isOpen: boolean;
  onClose: () => void;
  onDetect: (productName: string, confidence: number) => void;
}

export const ComputerVisionScanner = ({ isOpen, onClose, onDetect }: ComputerVisionScannerProps) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [detectedItem, setDetectedItem] = useState<{ name: string; confidence: number } | null>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [permissionDenied, setPermissionDenied] = useState(false);
  const [cameraStarted, setCameraStarted] = useState(false);

  // Mock product recognition (in real app, you'd use a trained model)
  const mockRecognitionProducts = [
    'Apple',
    'Banana',
    'Onion',
    'Potato',
    'Tomato',
    'Orange',
    'Carrot',
    'Grapes'
  ];

  useEffect(() => {
    // Don't auto-start camera, let user click to start
    return () => {
      stopCamera();
    };
  }, [isOpen]);

  // Clean up when modal closes
  useEffect(() => {
    if (!isOpen) {
      stopCamera();
      setCameraStarted(false);
      setCameraError(null);
      setDetectedItem(null);
    }
  }, [isOpen]);

  const startCamera = async () => {
    setCameraError(null);
    setPermissionDenied(false);
    
    try {
      // Check if mediaDevices is supported
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Camera not supported in this browser');
      }

      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: 640, height: 480 }
      });
      
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
      
      setStream(mediaStream);
      setCameraError(null);
      setCameraStarted(true);
    } catch (error: any) {
      console.error('Camera access error:', error);
      
      // Handle different error types
      let errorMessage = 'Unable to access camera';
      
      if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
        errorMessage = 'Camera permission denied. Please allow camera access in your browser settings.';
        setPermissionDenied(true);
        toast.error('Camera Access Denied', {
          description: 'Please enable camera permissions in your browser settings and try again.'
        });
      } else if (error.name === 'NotFoundError' || error.name === 'DevicesNotFoundError') {
        errorMessage = 'No camera found on this device.';
        toast.error('No Camera Found', {
          description: 'Please connect a camera device.'
        });
      } else if (error.name === 'NotReadableError' || error.name === 'TrackStartError') {
        errorMessage = 'Camera is already in use by another application.';
        toast.error('Camera In Use', {
          description: 'Please close other applications using the camera.'
        });
      } else if (error.name === 'OverconstrainedError' || error.name === 'ConstraintNotSatisfiedError') {
        errorMessage = 'Camera does not meet the required specifications.';
        toast.error('Camera Error', {
          description: 'Camera does not support required settings.'
        });
      } else if (error.message) {
        errorMessage = error.message;
        toast.error('Camera Error', {
          description: errorMessage
        });
      }
      
      setCameraError(errorMessage);
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
  };

  const performScan = async () => {
    setIsScanning(true);
    
    // Simulate AI processing delay
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    // Mock detection - In real app, you'd use TensorFlow.js to analyze the video frame
    const randomProduct = mockRecognitionProducts[Math.floor(Math.random() * mockRecognitionProducts.length)];
    const confidence = 0.75 + Math.random() * 0.2; // 75-95% confidence
    
    setDetectedItem({ name: randomProduct, confidence });
    setIsScanning(false);
    
    toast.success(`Detected: ${randomProduct}`, {
      description: `Confidence: ${(confidence * 100).toFixed(1)}%`
    });
  };

  const handleConfirm = () => {
    if (detectedItem) {
      onDetect(detectedItem.name, detectedItem.confidence);
      setDetectedItem(null);
      onClose();
    }
  };

  const handleRetry = () => {
    setDetectedItem(null);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-40"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
          >
            <div
              className="w-full max-w-3xl rounded-3xl p-8 relative"
              style={{
                background: 'rgba(20, 20, 40, 0.95)',
                backdropFilter: 'blur(30px)',
                border: '1px solid rgba(255, 255, 255, 0.18)',
                boxShadow: '0 8px 32px rgba(0, 0, 0, 0.37)'
              }}
            >
              {/* Close Button */}
              <button
                onClick={onClose}
                className="absolute top-4 right-4 text-white/50 hover:text-white transition-colors z-10"
              >
                <X className="w-6 h-6" />
              </button>

              {/* Title */}
              <h2
                className="text-3xl mb-6 text-white"
                style={{ fontFamily: 'Montserrat, sans-serif' }}
              >
                🔍 AI Vision Scanner
              </h2>

              {/* Camera View */}
              <div className="relative mb-6 rounded-2xl overflow-hidden bg-black">
                {!cameraStarted && !cameraError ? (
                  // Initial state - Show "Start Camera" button
                  <div className="w-full h-96 flex flex-col items-center justify-center p-8 text-center">
                    <Camera className="w-20 h-20 text-blue-400 mb-6" />
                    <h3 className="text-2xl font-semibold text-white mb-3">Ready to Scan</h3>
                    <p className="text-white/70 mb-8 max-w-md">
                      Click the button below to activate your camera and start identifying products.
                    </p>
                    
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={startCamera}
                      className="px-8 py-4 rounded-xl bg-gradient-to-r from-blue-500 to-purple-500 text-white font-bold text-lg flex items-center gap-3"
                      style={{
                        boxShadow: '0 8px 24px rgba(59, 130, 246, 0.4)'
                      }}
                    >
                      <Camera className="w-6 h-6" />
                      Start Camera
                    </motion.button>
                    
                    <p className="text-white/50 text-sm mt-6">
                      📹 Your browser will ask for camera permission
                    </p>
                  </div>
                ) : cameraError ? (
                  <div className="w-full h-96 flex flex-col items-center justify-center p-8 text-center">
                    <AlertCircle className="w-16 h-16 text-red-400 mb-4" />
                    <h3 className="text-xl font-semibold text-white mb-2">Camera Access Error</h3>
                    <p className="text-white/70 mb-6 max-w-md">{cameraError}</p>
                    
                    {permissionDenied && (
                      <div className="mb-6 p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 max-w-md">
                        <p className="text-amber-300 text-sm">
                          <strong>How to fix:</strong>
                          <br />
                          1. Click the camera icon in your browser's address bar
                          <br />
                          2. Select "Allow" for camera access
                          <br />
                          3. Click "Retry Camera Access" button below
                        </p>
                      </div>
                    )}
                    
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={startCamera}
                      className="px-6 py-3 rounded-xl bg-gradient-to-r from-blue-500 to-purple-500 text-white font-semibold flex items-center gap-2"
                    >
                      <RefreshCw className="w-5 h-5" />
                      Retry Camera Access
                    </motion.button>
                  </div>
                ) : (
                  <>
                    <video
                      ref={videoRef}
                      autoPlay
                      playsInline
                      muted
                      className="w-full h-96 object-cover"
                    />
                    
                    {/* Scanning Overlay */}
                    {isScanning && (
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="absolute inset-0 bg-blue-500/20 flex items-center justify-center"
                      >
                        <motion.div
                          animate={{ 
                            y: [-100, 100, -100],
                            opacity: [0.5, 1, 0.5]
                          }}
                          transition={{ 
                            duration: 2,
                            repeat: Infinity,
                            ease: "linear"
                          }}
                          className="w-full h-1 bg-blue-400 shadow-lg"
                          style={{
                            boxShadow: '0 0 20px rgba(59, 130, 246, 0.8)'
                          }}
                        />
                      </motion.div>
                    )}

                    {/* Detection Result */}
                    {detectedItem && (
                      <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="absolute bottom-4 left-4 right-4 p-4 rounded-xl"
                        style={{
                          background: 'rgba(34, 197, 94, 0.9)',
                          backdropFilter: 'blur(10px)',
                          border: '1px solid rgba(34, 197, 94, 0.5)'
                        }}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <Check className="w-6 h-6 text-white" />
                            <div>
                              <p className="text-white font-bold text-lg">{detectedItem.name}</p>
                              <p className="text-white/80 text-sm">
                                Confidence: {(detectedItem.confidence * 100).toFixed(1)}%
                              </p>
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </>
                )}
              </div>

              {/* Instructions */}
              <div className="mb-6 p-4 rounded-xl bg-blue-500/10 border border-blue-500/30">
                <p className="text-blue-300 text-sm" style={{ fontFamily: 'Inter, sans-serif' }}>
                  <strong>How to use:</strong> Position the item in the center of the camera view and click "Scan".
                  The AI will identify loose items like fruits, vegetables, and grains that don't have barcodes.
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-4">
                {!detectedItem ? (
                  <motion.button
                    whileHover={{ scale: (!cameraStarted || cameraError) ? 1 : 1.02 }}
                    whileTap={{ scale: (!cameraStarted || cameraError) ? 1 : 0.98 }}
                    onClick={performScan}
                    disabled={isScanning || !cameraStarted || !!cameraError}
                    className="flex-1 py-4 rounded-xl bg-gradient-to-r from-blue-500 to-purple-500 text-white font-semibold flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isScanning ? (
                      <>
                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        Scanning...
                      </>
                    ) : (
                      <>
                        <Camera className="w-5 h-5" />
                        {!cameraStarted ? 'Start Camera First' : 'Scan Item'}
                      </>
                    )}
                  </motion.button>
                ) : (
                  <>
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={handleRetry}
                      className="flex-1 py-4 rounded-xl bg-white/10 text-white font-semibold flex items-center justify-center gap-2"
                    >
                      <RefreshCw className="w-5 h-5" />
                      Scan Again
                    </motion.button>
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={handleConfirm}
                      className="flex-1 py-4 rounded-xl bg-gradient-to-r from-green-500 to-emerald-500 text-white font-semibold flex items-center justify-center gap-2"
                    >
                      <Check className="w-5 h-5" />
                      Confirm & Add
                    </motion.button>
                  </>
                )}
              </div>

              {/* Mock Products List */}
              <div className="mt-6 p-4 rounded-xl bg-white/5 border border-white/10">
                <p className="text-white/70 text-sm mb-2">
                  <strong>Supported Items (Demo):</strong>
                </p>
                <div className="flex flex-wrap gap-2">
                  {mockRecognitionProducts.map(product => (
                    <span
                      key={product}
                      className="px-3 py-1 rounded-full bg-white/10 text-white/70 text-xs"
                    >
                      {product}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};