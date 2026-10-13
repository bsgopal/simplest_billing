import React, { useEffect, useRef, useState } from 'react';
import { BrowserMultiFormatReader } from '@zxing/browser';
import { 
  BarcodeFormat, 
  DecodeHintType 
} from '@zxing/library';
import { Camera, X, RefreshCw, Zap, Volume2, VolumeX, CheckCircle, Lightbulb } from 'lucide-react';

export default function CameraBarcodeScanner({
  isOpen,
  onClose,
  onScan,
  continuous = false,
  title = 'Scan Barcode'
}) {
  const [cameras, setCameras] = useState([]);
  const [activeCameraId, setActiveCameraId] = useState('');
  const [isScanning, setIsScanning] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [lastScanned, setLastScanned] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [torchOn, setTorchOn] = useState(false);
  const [hasTorch, setHasTorch] = useState(false);
  
  const videoRef = useRef(null);
  const codeReaderRef = useRef(null);
  const scanLockRef = useRef(false);
  const streamRef = useRef(null);

  // Play audio beep using Web Audio API synthesizer
  const playBeep = () => {
    if (!soundEnabled) return;
    try {
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(950, audioCtx.currentTime); // Fast crisp A5 beep
      gain.gain.setValueAtTime(0.18, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.08);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.08);
    } catch {}
  };

  useEffect(() => {
    if (!isOpen) return;

    let isMounted = true;
    scanLockRef.current = false;

    const startScanner = async () => {
      try {
        setErrorMsg('');
        
        // Setup comprehensive hints for rapid detection
        const hints = new Map();
        hints.set(DecodeHintType.POSSIBLE_FORMATS, [
          BarcodeFormat.EAN_13,
          BarcodeFormat.EAN_8,
          BarcodeFormat.CODE_128,
          BarcodeFormat.CODE_39,
          BarcodeFormat.UPC_A,
          BarcodeFormat.UPC_E,
          BarcodeFormat.QR_CODE,
          BarcodeFormat.ITF,
          BarcodeFormat.DATA_MATRIX
        ]);
        hints.set(DecodeHintType.TRY_HARDER, true);

        // Direct camera stream acquisition for universal compatibility on mobile & laptop
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
          setErrorMsg('Camera API is not supported on this browser or connection. Please use HTTPS or localhost.');
          return;
        }

        // 1. Get devices to list cameras
        let devices = [];
        try {
          devices = await navigator.mediaDevices.enumerateDevices();
        } catch (e) {}

        const videoDevices = devices.filter(d => d.kind === 'videoinput');
        if (isMounted) setCameras(videoDevices);

        // Find rear/environment camera on mobile
        const backCam = videoDevices.find(d => 
          d.label.toLowerCase().includes('back') || 
          d.label.toLowerCase().includes('rear') ||
          d.label.toLowerCase().includes('environment')
        );

        if (isMounted && videoDevices.length > 0) {
          setActiveCameraId(backCam ? backCam.deviceId : videoDevices[0].deviceId);
        }

        // 2. Request user media with clean, robust constraints (Full HD 1080p for fine Code 128 resolution)
        const videoConstraints = {
          facingMode: backCam ? { ideal: 'environment' } : { ideal: 'user' },
          width: { ideal: 1920, min: 1280 },
          height: { ideal: 1080, min: 720 },
          focusMode: { ideal: 'continuous' }
        };

        if (activeCameraId && !backCam) {
          videoConstraints.deviceId = { ideal: activeCameraId };
        }

        const stream = await navigator.mediaDevices.getUserMedia({
          video: videoConstraints,
          audio: false
        });

        streamRef.current = stream;

        if (!videoRef.current || !isMounted) {
          stream.getTracks().forEach(t => t.stop());
          return;
        }

        // Attach stream directly to video element
        videoRef.current.srcObject = stream;
        videoRef.current.setAttribute('playsinline', 'true');
        await videoRef.current.play();

        setIsScanning(true);

        // Check torch & advanced capabilities
        const track = stream.getVideoTracks()[0];
        const capabilities = track?.getCapabilities?.();
        if (capabilities?.torch && isMounted) {
          setHasTorch(true);
        }

        const handleBarcodeFound = (text) => {
          if (!text || scanLockRef.current) return;
          scanLockRef.current = true;
          playBeep();
          if (isMounted) setLastScanned(text);
          onScan(text);

          if (!continuous) {
            stopScanner();
            onClose();
          } else {
            setTimeout(() => {
              scanLockRef.current = false;
              if (isMounted) setLastScanned(null);
            }, 1200);
          }
        };

        // 3. Check for Native Hardware BarcodeDetector API (Zero-error on high density 19-char Code 128)
        let nativeDetectorRunning = false;
        if ('BarcodeDetector' in window) {
          try {
            const formats = await window.BarcodeDetector.getSupportedFormats();
            if (formats.includes('code_128') || formats.includes('ean_13')) {
              const detector = new window.BarcodeDetector({ formats });
              nativeDetectorRunning = true;

              const detectLoop = async () => {
                if (!isMounted || !videoRef.current || scanLockRef.current) {
                  if (isMounted) requestAnimationFrame(detectLoop);
                  return;
                }
                try {
                  if (videoRef.current.readyState >= 2) {
                    const barcodes = await detector.detect(videoRef.current);
                    if (barcodes && barcodes.length > 0) {
                      // Prefer longest detected string if multiple barcodes visible
                      const sorted = [...barcodes].sort((a, b) => (b.rawValue?.length || 0) - (a.rawValue?.length || 0));
                      const best = sorted[0]?.rawValue;
                      if (best) {
                        handleBarcodeFound(best);
                      }
                    }
                  }
                } catch (e) {}
                if (isMounted) {
                  setTimeout(detectLoop, 80);
                }
              };
              detectLoop();
            }
          } catch (e) {
            nativeDetectorRunning = false;
          }
        }

        // Fallback / Concurrent ZXing Browser Reader with TRY_HARDER
        const codeReader = new BrowserMultiFormatReader(hints, 100);
        codeReaderRef.current = codeReader;

        codeReader.decodeFromVideoElement(
          videoRef.current,
          (result) => {
            if (result && !scanLockRef.current) {
              const text = result.getText();
              if (text) {
                handleBarcodeFound(text);
              }
            }
          }
        );
      } catch (err) {
        console.error('Camera startup error:', err);
        if (isMounted) {
          if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
            setErrorMsg('Camera access was blocked. Please tap the camera/lock icon in your browser address bar and choose "Allow".');
          } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
            setErrorMsg('No camera detected on this device.');
          } else if (err.name === 'NotReadableError' || err.name === 'TrackStartError') {
            setErrorMsg('Camera is already in use by another application or tab.');
          } else {
            setErrorMsg(err?.message || 'Could not access camera. Please allow camera permissions.');
          }
        }
      }
    };

    startScanner();

    return () => {
      isMounted = false;
      stopScanner();
    };
  }, [isOpen]);

  const stopScanner = () => {
    if (codeReaderRef.current) {
      try {
        codeReaderRef.current.reset();
      } catch {}
      codeReaderRef.current = null;
    }
    if (streamRef.current) {
      try {
        streamRef.current.getTracks().forEach(t => t.stop());
      } catch {}
      streamRef.current = null;
    }
    setIsScanning(false);
  };

  const toggleTorch = async () => {
    if (!streamRef.current) return;
    try {
      const track = streamRef.current.getVideoTracks()[0];
      const nextState = !torchOn;
      await track.applyConstraints({
        advanced: [{ torch: nextState }]
      });
      setTorchOn(nextState);
    } catch {}
  };

  const handleSwitchCamera = async () => {
    if (cameras.length <= 1) return;
    const currentIndex = cameras.findIndex(c => c.deviceId === activeCameraId);
    const nextCamera = cameras[(currentIndex + 1) % cameras.length];
    if (!nextCamera) return;

    try {
      stopScanner();
      setActiveCameraId(nextCamera.deviceId);

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { deviceId: { exact: nextCamera.deviceId } },
        audio: false
      });
      streamRef.current = stream;

      if (!videoRef.current) return;
      videoRef.current.srcObject = stream;
      videoRef.current.setAttribute('playsinline', 'true');
      await videoRef.current.play();

      setIsScanning(true);

      const hints = new Map();
      hints.set(DecodeHintType.POSSIBLE_FORMATS, [
        BarcodeFormat.EAN_13,
        BarcodeFormat.EAN_8,
        BarcodeFormat.CODE_128,
        BarcodeFormat.CODE_39,
        BarcodeFormat.UPC_A,
        BarcodeFormat.UPC_E,
        BarcodeFormat.QR_CODE,
        BarcodeFormat.ITF,
        BarcodeFormat.DATA_MATRIX
      ]);
      hints.set(DecodeHintType.TRY_HARDER, true);

      const codeReader = new BrowserMultiFormatReader(hints, 100);
      codeReaderRef.current = codeReader;

      codeReader.decodeFromVideoElement(
        videoRef.current,
        (result) => {
          if (result && !scanLockRef.current) {
            const text = result.getText();
            if (!text) return;
            scanLockRef.current = true;
            playBeep();
            setLastScanned(text);
            onScan(text);

            if (!continuous) {
              stopScanner();
              onClose();
            } else {
              setTimeout(() => {
                scanLockRef.current = false;
                setLastScanned(null);
              }, 1200);
            }
          }
        }
      );
    } catch (err) {
      setErrorMsg('Failed to switch camera: ' + err.message);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
      <div className="bg-white border border-slate-200 rounded-3xl w-full max-w-md overflow-hidden shadow-2xl flex flex-col animate-in fade-in zoom-in-95 duration-150 text-slate-900">
        
        {/* Top Header */}
        <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-brand-100 rounded-xl text-brand-800">
              <Camera className="w-5 h-5 text-brand-700" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-black text-slate-900 flex items-center gap-2">
                {title}
                {continuous && (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-brand-100 text-brand-800 font-bold border border-brand-300">
                    Continuous
                  </span>
                )}
              </h3>
              <p className="text-[11px] text-slate-500">
                Ultra-fast barcode &amp; QR recognition engine
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            {hasTorch && (
              <button
                type="button"
                onClick={toggleTorch}
                className={`p-2 rounded-xl transition ${
                  torchOn ? 'text-amber-700 bg-amber-100' : 'text-slate-400 bg-slate-100'
                }`}
                title="Toggle Flash / Torch"
              >
                <Lightbulb className="w-4 h-4" />
              </button>
            )}

            {cameras.length > 1 && (
              <button
                type="button"
                onClick={handleSwitchCamera}
                className="p-2 text-slate-500 hover:text-slate-800 rounded-xl bg-slate-100 hover:bg-slate-200 transition"
                title="Switch Camera (Front / Rear)"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            )}

            <button
              type="button"
              onClick={() => setSoundEnabled(!soundEnabled)}
              className={`p-2 rounded-xl transition ${
                soundEnabled ? 'text-brand-800 bg-brand-100' : 'text-slate-400 bg-slate-100'
              }`}
              title="Toggle Beep Sound"
            >
              {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-600 rounded-xl bg-slate-100 hover:bg-slate-200 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Video Viewport Area */}
        <div className="relative bg-black flex items-center justify-center min-h-[300px] overflow-hidden">
          <video 
            ref={videoRef} 
            playsInline 
            muted 
            autoPlay 
            className="w-full h-full object-cover min-h-[300px] max-h-[420px]" 
          />

          {/* Aiming Reticle Laser Overlay */}
          {isScanning && !errorMsg && (
            <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center">
              <div className="w-[280px] h-[160px] border-2 border-brand-400/90 rounded-2xl relative shadow-lg shadow-brand-500/10">
                {/* Corner Accents */}
                <div className="absolute -top-1 -left-1 w-4 h-4 border-t-3 border-l-3 border-brand-400 rounded-tl-lg" />
                <div className="absolute -top-1 -right-1 w-4 h-4 border-t-3 border-r-3 border-brand-400 rounded-tr-lg" />
                <div className="absolute -bottom-1 -left-1 w-4 h-4 border-b-3 border-l-3 border-brand-400 rounded-bl-lg" />
                <div className="absolute -bottom-1 -right-1 w-4 h-4 border-b-3 border-r-3 border-brand-400 rounded-br-lg" />

                {/* Laser scan animation line */}
                <div className="absolute left-2 right-2 top-1/2 -translate-y-1/2 h-0.5 bg-gradient-to-r from-transparent via-brand-400 to-transparent animate-pulse shadow-[0_0_8px_#84cc16]" />
              </div>
              <p className="text-[11px] text-white/90 bg-black/60 px-3 py-1 rounded-full mt-3 font-semibold backdrop-blur-xs">
                Hold barcode 15-20cm from camera
              </p>
            </div>
          )}

          {/* Detection Alert Badge */}
          {lastScanned && (
            <div className="absolute bottom-4 left-4 right-4 bg-brand-500 text-slate-950 px-4 py-2.5 rounded-2xl shadow-xl flex items-center justify-between font-bold text-xs animate-in slide-in-from-bottom duration-150">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4" />
                <span>Detected: <span className="font-mono">{lastScanned}</span></span>
              </div>
              {continuous && <span className="text-[10px] bg-slate-950/20 px-2 py-0.5 rounded font-black">Next ready</span>}
            </div>
          )}

          {/* Error View */}
          {errorMsg && (
            <div className="absolute inset-0 bg-slate-950/95 p-6 flex flex-col items-center justify-center text-center z-20">
              <div className="p-3 bg-brand-500/10 rounded-2xl text-brand-400 mb-2">
                <Camera className="w-8 h-8" />
              </div>
              <p className="text-sm font-black text-white mb-1">Camera Permission Required</p>
              <p className="text-xs text-slate-300 max-w-xs mb-3">{errorMsg}</p>
              <button
                type="button"
                onClick={async () => {
                  setErrorMsg('');
                  if (navigator.mediaDevices?.getUserMedia) {
                    try {
                      const s = await navigator.mediaDevices.getUserMedia({ video: true });
                      s.getTracks().forEach(t => t.stop());
                      window.location.reload();
                    } catch (e) {
                      setErrorMsg('Permission was rejected. Please enable camera in your browser site settings.');
                    }
                  }
                }}
                className="px-4 py-2 bg-brand-500 hover:bg-brand-600 text-slate-950 font-black rounded-xl text-xs transition shadow-xs flex items-center gap-1.5 active:scale-95"
              >
                <Camera className="w-4 h-4" />
                <span>Tap to Allow Camera Permission</span>
              </button>
            </div>
          )}
        </div>

        {/* Bottom Help Bar */}
        <div className="p-3.5 bg-slate-50 border-t border-slate-200 text-center text-[11px] text-slate-500 flex items-center justify-between px-5">
          <span>Fast EAN-13, Code 128, UPC-A, QR Code</span>
          <button
            type="button"
            onClick={onClose}
            className="text-xs text-brand-700 hover:underline font-bold"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
