import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Camera, Check, AlertCircle, Loader } from 'lucide-react';
import { toast } from 'sonner';
import * as mobilenet from '@tensorflow-models/mobilenet';
import * as tf from '@tensorflow/tfjs';

interface DatasetCaptureModalProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: (signatures: number[][]) => void;
  productName: string;
}

export const DatasetCaptureModal = ({ isOpen, onClose, onComplete, productName }: DatasetCaptureModalProps) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [capturing, setCapturing] = useState(false);
  const [capturedCount, setCapturedCount] = useState(0);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [cameraStarted, setCameraStarted] = useState(false);
  const [model, setModel] = useState<mobilenet.MobileNet | null>(null);
  const [loadingModel, setLoadingModel] = useState(false);
  const [signatures, setSignatures] = useState<number[][]>([]);
  const [currentImage, setCurrentImage] = useState<string | null>(null);

  const TOTAL_IMAGES = 30;
  const CAPTURE_INTERVAL = 200; // ms

  useEffect(() => {
    if (isOpen) {
      loadModel();
    } else {
      stopCamera();
      setCameraStarted(false);
      setCapturedCount(0);
      setSignatures([]);
      setCurrentImage(null);
    }

    return () => {
      stopCamera();
    };
  }, [isOpen]);

  const loadModel = async () => {
    setLoadingModel(true);
    try {
      const loadedModel = await mobilenet.load();
      setModel(loadedModel);
      toast.success('AI Model loaded successfully');
    } catch (error) {
      console.error('Error loading MobileNet:', error);
      toast.error('Failed to load AI model');
    } finally {
      setLoadingModel(false);
    }
  };

  const startCamera = async () => {
    setCameraError(null);
    
    try {
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
      setCameraStarted(true);
      setCameraError(null);
    } catch (error: any) {
      console.error('Camera access error:', error);
      
      let errorMessage = 'Unable to access camera';
      if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
        errorMessage = 'Camera permission denied. Please allow camera access in your browser settings.';
      } else if (error.name === 'NotFoundError') {
        errorMessage = 'No camera found on this device.';
      }
      
      setCameraError(errorMessage);
      toast.error('Camera Error', { description: errorMessage });
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
  };

  const captureFrame = async (): Promise<number[] | null> => {
    if (!videoRef.current || !canvasRef.current || !model) return null;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');

    if (!ctx) return null;

    // Draw current video frame to canvas
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    // Get image data URL for preview
    const imageDataUrl = canvas.toDataURL('image/jpeg', 0.8);
    setCurrentImage(imageDataUrl);

    try {
      // Use MobileNet to extract feature vector (embedding)
      const activation = model.infer(video, true);
      const signatureArray = await activation.data();
      activation.dispose();

      // Convert to regular array
      return Array.from(signatureArray);
    } catch (error) {
      console.error('Error extracting features:', error);
      return null;
    }
  };

  const startCapture = async () => {
    if (!model) {
      toast.error('AI model not loaded yet');
      return;
    }

    if (!cameraStarted) {
      toast.error('Please start the camera first');
      return;
    }

    setCapturing(true);
    setCapturedCount(0);
    setSignatures([]);

    const capturedSignatures: number[][] = [];
    let count = 0;

    const intervalId = setInterval(async () => {
      if (count >= TOTAL_IMAGES) {
        clearInterval(intervalId);
        setCapturing(false);
        toast.success('Dataset capture complete!', {
          description: `Captured and processed ${TOTAL_IMAGES} images`
        });
        onComplete(capturedSignatures);
        return;
      }

      const signature = await captureFrame();
      if (signature) {
        capturedSignatures.push(signature);
        count++;
        setCapturedCount(count);
        setSignatures(capturedSignatures);
      }
    }, CAPTURE_INTERVAL);
  };

  const progress = (capturedCount / TOTAL_IMAGES) * 100;

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
              className="w-full max-w-4xl rounded-3xl p-8 relative"
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
                className="text-3xl mb-2 text-white"
                style={{ fontFamily: 'Montserrat, sans-serif' }}
              >
                📸 Dataset Capture
              </h2>
              <p className="text-white/70 mb-6" style={{ fontFamily: 'Inter, sans-serif' }}>
                Product: <strong className="text-white">{productName}</strong>
              </p>

              {/* Model Loading Status */}
              {loadingModel && (
                <div className="mb-6 p-4 rounded-xl bg-blue-500/10 border border-blue-500/30 flex items-center gap-3">
                  <Loader className="w-5 h-5 text-blue-400 animate-spin" />
                  <p className="text-blue-300">Loading AI model...</p>
                </div>
              )}

              {/* Camera View */}
              <div className="relative mb-6 rounded-2xl overflow-hidden bg-black">
                {!cameraStarted && !cameraError ? (
                  <div className="w-full h-96 flex flex-col items-center justify-center p-8 text-center">
                    <Camera className="w-20 h-20 text-blue-400 mb-6" />
                    <h3 className="text-2xl font-semibold text-white mb-3">Ready to Capture</h3>
                    <p className="text-white/70 mb-8 max-w-md">
                      We need 30 images of your product from all angles. Click "Start Camera" to begin.
                    </p>
                    
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={startCamera}
                      disabled={loadingModel}
                      className="px-8 py-4 rounded-xl bg-gradient-to-r from-blue-500 to-purple-500 text-white font-bold text-lg flex items-center gap-3 disabled:opacity-50"
                      style={{
                        boxShadow: '0 8px 24px rgba(59, 130, 246, 0.4)'
                      }}
                    >
                      <Camera className="w-6 h-6" />
                      Start Camera
                    </motion.button>
                  </div>
                ) : cameraError ? (
                  <div className="w-full h-96 flex flex-col items-center justify-center p-8 text-center">
                    <AlertCircle className="w-16 h-16 text-red-400 mb-4" />
                    <h3 className="text-xl font-semibold text-white mb-2">Camera Access Error</h3>
                    <p className="text-white/70 mb-6 max-w-md">{cameraError}</p>
                    
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={startCamera}
                      className="px-6 py-3 rounded-xl bg-gradient-to-r from-blue-500 to-purple-500 text-white font-semibold flex items-center gap-2"
                    >
                      <Camera className="w-5 h-5" />
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
                    
                    {/* Capture Progress Overlay */}
                    {capturing && (
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="absolute inset-0 bg-blue-500/20 flex items-center justify-center"
                      >
                        <div className="text-center">
                          <motion.div
                            animate={{ scale: [1, 1.2, 1] }}
                            transition={{ duration: 0.2, repeat: Infinity }}
                            className="w-20 h-20 rounded-full bg-red-500 mx-auto mb-4"
                            style={{ boxShadow: '0 0 30px rgba(239, 68, 68, 0.8)' }}
                          />
                          <p className="text-white text-2xl font-bold">
                            {capturedCount} / {TOTAL_IMAGES}
                          </p>
                          <p className="text-white/70 mt-2">Rotate the product slowly...</p>
                        </div>
                      </motion.div>
                    )}

                    {/* Current Image Preview */}
                    {currentImage && !capturing && (
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="absolute top-4 right-4 w-32 h-32 rounded-lg overflow-hidden border-2 border-green-400"
                      >
                        <img src={currentImage} alt="Last captured" className="w-full h-full object-cover" />
                      </motion.div>
                    )}
                  </>
                )}
              </div>

              {/* Hidden canvas for image processing */}
              <canvas ref={canvasRef} style={{ display: 'none' }} />

              {/* Progress Bar */}
              {capturedCount > 0 && (
                <div className="mb-6">
                  <div className="flex justify-between text-sm text-white/70 mb-2">
                    <span>Progress</span>
                    <span>{capturedCount} / {TOTAL_IMAGES} images</span>
                  </div>
                  <div className="w-full h-3 bg-white/10 rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${progress}%` }}
                      className="h-full bg-gradient-to-r from-blue-500 to-green-500"
                      transition={{ duration: 0.3 }}
                    />
                  </div>
                </div>
              )}

              {/* Instructions */}
              <div className="mb-6 p-4 rounded-xl bg-amber-500/10 border border-amber-500/30">
                <p className="text-amber-300 text-sm" style={{ fontFamily: 'Inter, sans-serif' }}>
                  <strong>Instructions:</strong>
                  <br />
                  1. Hold the product in front of the camera
                  <br />
                  2. Click "Start Capture" and slowly rotate the product 360°
                  <br />
                  3. The system will automatically capture {TOTAL_IMAGES} images
                  <br />
                  4. Keep the product centered and well-lit
                </p>
              </div>

              {/* Action Button */}
              <motion.button
                whileHover={{ scale: (!cameraStarted || capturing || loadingModel) ? 1 : 1.02 }}
                whileTap={{ scale: (!cameraStarted || capturing || loadingModel) ? 1 : 0.98 }}
                onClick={startCapture}
                disabled={!cameraStarted || capturing || capturedCount >= TOTAL_IMAGES || loadingModel}
                className="w-full py-4 rounded-xl bg-gradient-to-r from-green-500 to-emerald-500 text-white font-bold text-lg flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed"
                style={{
                  boxShadow: '0 8px 24px rgba(34, 197, 94, 0.4)'
                }}
              >
                {capturing ? (
                  <>
                    <Loader className="w-6 h-6 animate-spin" />
                    Capturing... ({capturedCount}/{TOTAL_IMAGES})
                  </>
                ) : capturedCount >= TOTAL_IMAGES ? (
                  <>
                    <Check className="w-6 h-6" />
                    Dataset Complete!
                  </>
                ) : (
                  <>
                    <Camera className="w-6 h-6" />
                    Start Capture ({TOTAL_IMAGES} images)
                  </>
                )}
              </motion.button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
