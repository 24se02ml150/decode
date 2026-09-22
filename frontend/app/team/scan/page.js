'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function ScanPage() {
  const router = useRouter();
  const scannerRef = useRef(null);
  const [error, setError] = useState('');
  const [scanning, setScanning] = useState(false);
  const [hasCamera, setHasCamera] = useState(true);
  const [manualToken, setManualToken] = useState('');

  useEffect(() => {
    let html5QrCode = null;

    const startScanner = async () => {
      try {
        const { Html5Qrcode } = await import('html5-qrcode');
        html5QrCode = new Html5Qrcode('qr-reader');
        scannerRef.current = html5QrCode;

        await html5QrCode.start(
          { facingMode: 'environment' },
          {
            fps: 10,
            qrbox: { width: 250, height: 250 },
            aspectRatio: 1,
          },
          (decodedText) => {
            // Extract token from URL
            let token = decodedText;
            try {
              const url = new URL(decodedText);
              const parts = url.pathname.split('/');
              token = parts[parts.length - 1];
            } catch {
              // Not a URL, use as-is
            }

            // Stop scanner, wait for it, then navigate via hard reload to reset context
            if (html5QrCode) {
              html5QrCode.stop().catch(() => {}).finally(() => {
                window.location.href = `/team/task/${token}`;
              });
            } else {
              window.location.href = `/team/task/${token}`;
            }
          },
          () => {} // ignore scan failures
        );

        setScanning(true);
      } catch (err) {
        console.error('Scanner error:', err);
        setHasCamera(false);
        setError('Camera access denied or not available.');
      }
    };

    startScanner();

    return () => {
      if (scannerRef.current) {
        scannerRef.current.stop().catch(() => {});
      }
    };
  }, [router]);

  const handleManualEntry = (e) => {
    e.preventDefault();
    if (manualToken.trim()) {
      if (scannerRef.current) {
        scannerRef.current.stop().catch(() => {}).finally(() => {
          window.location.href = `/team/task/${manualToken.trim()}`;
        });
      } else {
        window.location.href = `/team/task/${manualToken.trim()}`;
      }
    }
  };

  return (
    <div className="min-h-dvh bg-bg">
      {/* Header */}
      <div className="px-5 pt-6 pb-4 flex items-center gap-3">
        <button
          onClick={() => {
            if (scannerRef.current) {
              scannerRef.current.stop().catch(() => {}).finally(() => router.back());
            } else {
              router.back();
            }
          }}
          className="w-9 h-9 rounded-full bg-bg-card border border-border flex items-center justify-center"
        >
          <svg className="w-4 h-4 text-text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
          </svg>
        </button>
        <h1 className="text-lg font-bold text-text-primary">Scan QR Code</h1>
      </div>

      {/* Scanner */}
      <div className="px-5 mb-6">
        <div className="card overflow-hidden animate-fade-in-up">
          <div id="qr-reader" className="w-full" style={{ minHeight: 300 }}></div>
        </div>

        {scanning && (
          <p className="text-center text-text-secondary text-sm mt-4 animate-pulse-soft">
            Point your camera at the QR code
          </p>
        )}

        {error && (
          <div className="mt-4 p-3 rounded-lg bg-error-light text-error text-sm font-medium text-center animate-fade-in">
            {error}
          </div>
        )}
      </div>

      {/* Manual Entry */}
      <div className="px-5">
        <div className="card p-5">
          <h3 className="text-sm font-semibold text-text-secondary mb-3">Or enter code manually</h3>
          <form onSubmit={handleManualEntry} className="flex gap-2">
            <input
              type="text"
              className="input flex-1"
              placeholder="Enter task code"
              value={manualToken}
              onChange={(e) => setManualToken(e.target.value)}
            />
            <button type="submit" className="btn btn-primary btn-sm" disabled={!manualToken.trim()}>
              Go
            </button>
          </form>
        </div>
      </div>

      {/* Instructions */}
      <div className="px-5 mt-6 mb-8">
        <div className="space-y-3 text-sm text-text-secondary">
          <div className="flex items-start gap-3">
            <span className="w-6 h-6 rounded-full bg-accent-light text-accent flex items-center justify-center flex-shrink-0 text-xs font-bold">1</span>
            <p>Find the QR code at the campus location</p>
          </div>
          <div className="flex items-start gap-3">
            <span className="w-6 h-6 rounded-full bg-accent-light text-accent flex items-center justify-center flex-shrink-0 text-xs font-bold">2</span>
            <p>Point your camera at the QR code</p>
          </div>
          <div className="flex items-start gap-3">
            <span className="w-6 h-6 rounded-full bg-accent-light text-accent flex items-center justify-center flex-shrink-0 text-xs font-bold">3</span>
            <p>Answer the question to unlock the next hint</p>
          </div>
        </div>
      </div>
    </div>
  );
}
