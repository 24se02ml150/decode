'use client';

import { useState, useRef } from 'react';
import api from '@/lib/api';
import { ChevronLeft, Upload, FileSpreadsheet, AlertCircle, CheckCircle2, Download } from 'lucide-react';
import Link from 'next/link';

export default function BulkImportPage() {
  const fileInputRef = useRef(null);
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState(null);
  const [createdTeams, setCreatedTeams] = useState(null);
  const [error, setError] = useState(null);

  const handleFileChange = async (e) => {
    const selectedFile = e.target.files[0];
    if (!selectedFile) return;
    
    setFile(selectedFile);
    await uploadForPreview(selectedFile);
  };

  const uploadForPreview = async (selectedFile) => {
    setLoading(true);
    setError(null);
    setPreview(null);
    setCreatedTeams(null);
    
    try {
      const formData = new FormData();
      formData.append('file', selectedFile);
      
      const res = await api.admin.previewBulkImport(formData);
      setPreview(res.data.preview);
    } catch (err) {
      setError(err.message);
      setFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmImport = async () => {
    if (!preview) return;
    
    const validRows = preview.filter(r => r.isValid);
    if (validRows.length === 0) {
      alert("No valid rows to import.");
      return;
    }

    setLoading(true);
    setError(null);
    
    try {
      const res = await api.admin.confirmBulkImport({ validRows });
      setCreatedTeams(res.data.created);
      setPreview(null);
      setFile(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const downloadCredentialsCSV = () => {
    if (!createdTeams || createdTeams.length === 0) return;
    
    const headers = ['Team Name', 'Team Leader Name', 'Team ID', 'Default Password'];
    const rows = createdTeams.map(t => [t.teamName, t.leaderName || '', t.teamId, t.defaultPassword]);
    
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `imported_teams_credentials_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6 animate-fade-in max-w-4xl mx-auto">
      <div>
        <Link href="/admin/teams" className="inline-flex items-center text-sm font-medium text-text-secondary hover:text-accent mb-4 transition-colors">
          <ChevronLeft size={16} className="mr-1" /> Back to Teams
        </Link>
        <h1 className="text-2xl font-bold text-text-primary">Bulk Import Teams</h1>
        <p className="text-text-secondary mt-1">Upload an Excel file to create multiple teams at once.</p>
      </div>

      {error && (
        <div className="bg-error/10 border border-error/20 text-error p-4 rounded-xl flex items-start gap-3">
          <AlertCircle className="shrink-0 mt-0.5" />
          <div>
            <h3 className="font-bold">Error</h3>
            <p>{error}</p>
          </div>
        </div>
      )}

      {createdTeams ? (
        <div className="card p-8 text-center space-y-6 animate-scale-in">
          <div className="w-16 h-16 bg-success/20 text-success rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 size={32} />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-text-primary">Import Successful!</h2>
            <p className="text-text-secondary mt-2">
              Successfully created {createdTeams.length} teams. They have all been assigned the default password <strong>Campus@2026</strong>.
              They will be forced to change this password on their first login.
            </p>
          </div>
          
          <div className="pt-4 border-t border-border">
            <button 
              onClick={downloadCredentialsCSV}
              className="btn btn-primary gap-2 w-full sm:w-auto"
            >
              <Download size={18} />
              Download Credentials (CSV)
            </button>
            <p className="text-sm text-text-muted mt-4">
              Please download this now. You won't be able to see the passwords in plaintext again.
            </p>
          </div>
        </div>
      ) : (
        <div className="card p-6">
          <h2 className="text-lg font-bold mb-4">Upload File</h2>
          <div className="mb-6 bg-bg-hover p-4 rounded-lg text-sm text-text-secondary">
            <p className="font-bold text-text-primary mb-2">Required Excel format (.xlsx):</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Must contain columns: <strong>Team Name</strong> and <strong>Team Leader Name</strong></li>
              <li>Maximum 500 rows per upload</li>
              <li>No duplicate team names allowed</li>
            </ul>
          </div>

          <div 
            className="border-2 border-dashed border-border rounded-xl p-8 text-center hover:border-accent hover:bg-accent/5 transition-all cursor-pointer"
            onClick={() => fileInputRef.current?.click()}
          >
            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={handleFileChange} 
              accept=".xlsx,.xls,.csv" 
              className="hidden" 
            />
            
            {loading ? (
              <div className="py-8">
                <div className="animate-spin w-8 h-8 border-2 border-accent border-t-transparent rounded-full mx-auto mb-4"></div>
                <p className="text-text-secondary">Processing file...</p>
              </div>
            ) : (
              <div className="py-4">
                <div className="w-16 h-16 bg-bg-card rounded-full flex items-center justify-center mx-auto mb-4 text-text-secondary">
                  <FileSpreadsheet size={32} />
                </div>
                <p className="font-medium text-text-primary text-lg mb-1">
                  {file ? file.name : 'Click to upload Excel file'}
                </p>
                <p className="text-text-muted text-sm">.xlsx, .xls, .csv</p>
              </div>
            )}
          </div>
        </div>
      )}

      {preview && !createdTeams && (
        <div className="card p-6 animate-fade-in">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
            <div>
              <h2 className="text-lg font-bold">Import Preview</h2>
              <p className="text-text-secondary text-sm mt-1">
                {preview.filter(r => r.isValid).length} valid rows, {preview.filter(r => !r.isValid).length} errors
              </p>
            </div>
            
            <button 
              onClick={handleConfirmImport} 
              disabled={loading || preview.filter(r => r.isValid).length === 0}
              className="btn btn-primary gap-2"
            >
              {loading ? 'Importing...' : 'Confirm Import'}
              {!loading && <ChevronLeft size={16} className="rotate-180" />}
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-bg-hover text-text-secondary border-b border-border">
                <tr>
                  <th className="px-4 py-3 font-medium">Row</th>
                  <th className="px-4 py-3 font-medium">Team Name</th>
                  <th className="px-4 py-3 font-medium">Leader Name</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {preview.map((row, i) => (
                  <tr key={i} className={row.isValid ? '' : 'bg-error/5'}>
                    <td className="px-4 py-3 text-text-muted">#{row.rowNumber}</td>
                    <td className="px-4 py-3 font-medium">{row.teamName || '-'}</td>
                    <td className="px-4 py-3">{row.leaderName || '-'}</td>
                    <td className="px-4 py-3">
                      {row.isValid ? (
                        <span className="inline-flex items-center text-success text-xs font-bold gap-1">
                          <CheckCircle2 size={14} /> Valid
                        </span>
                      ) : (
                        <span className="inline-flex items-center text-error text-xs font-bold gap-1" title={row.error}>
                          <AlertCircle size={14} /> {row.error}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
