'use client';

import { useState, useEffect } from 'react';
import api from '@/lib/api';
import { Printer, RefreshCw } from 'lucide-react';

export default function QrCodesPage() {
  const [qrs, setQrs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadQRs();
  }, []);

  const loadQRs = async () => {
    try {
      const res = await api.admin.getQRCodes();
      setQrs(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleRegenerate = async (taskId) => {
    if (!confirm('Are you sure you want to regenerate this QR code? Teams will no longer be able to scan the old one.')) return;
    try {
      await api.admin.regenerateQR(taskId);
      loadQRs();
    } catch (err) {
      alert(err.message);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  if (loading) return <div className="p-8 text-center text-text-muted">Loading QR Codes...</div>;

  return (
    <div className="space-y-6 animate-fade-in print:space-y-0 print:bg-white">
      {/* Header (Hidden when printing) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 print:hidden">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">QR Codes</h1>
          <p className="text-text-secondary mt-1">Print and manage location QR codes</p>
        </div>
        <button onClick={handlePrint} className="btn btn-primary gap-2">
          <Printer size={18} />
          Print All
        </button>
      </div>

      {qrs.length === 0 ? (
        <div className="card p-12 text-center print:hidden">
          <p className="text-text-secondary">No QR codes found. Create tasks first to generate QR codes.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 print:grid-cols-2 print:gap-8">
          {qrs.map((qr) => (
            <div key={qr.id} className="card p-6 flex flex-col items-center text-center print:border-2 print:border-black print:break-inside-avoid print:shadow-none">
              <h2 className="text-lg font-bold text-text-primary mb-1">{qr.taskTitle}</h2>
              <p className="text-sm font-semibold text-text-secondary uppercase tracking-wider mb-4">
                Round {qr.roundNumber} • Task {qr.taskOrder}
              </p>
              
              <div className="bg-white p-2 rounded-xl shadow-sm mb-4 border border-border">
                <img src={qr.qrDataUrl} alt={`QR Code for ${qr.taskTitle}`} className="w-48 h-48" />
              </div>
              
              <p className="text-xs font-mono text-text-muted mb-4 truncate w-full max-w-[200px]">
                {qr.secureToken}
              </p>

              <button 
                onClick={() => handleRegenerate(qr.taskId)}
                className="btn btn-secondary btn-sm gap-2 print:hidden"
              >
                <RefreshCw size={14} /> Regenerate
              </button>
            </div>
          ))}
        </div>
      )}
      
      {/* Print-only CSS */}
      <style jsx global>{`
        @media print {
          body {
            background-color: white !important;
          }
          nav, aside, header {
            display: none !important;
          }
          main {
            padding: 0 !important;
            margin: 0 !important;
          }
        }
      `}</style>
    </div>
  );
}
