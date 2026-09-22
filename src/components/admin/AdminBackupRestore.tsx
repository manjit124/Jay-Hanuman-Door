import React, { useState, useEffect } from 'react';
import {
  Download,
  Upload,
  RefreshCw,
  ShieldCheck,
  HardDrive,
  Clock,
  FileCheck,
  AlertCircle,
  Database,
  CheckCircle2,
} from 'lucide-react';
import {
  exportDatabaseBackup,
  importDatabaseBackup,
  fetchBackupsList,
  restoreLocalBackup,
  BackupSummary,
} from '../../lib/api.ts';

interface AdminBackupRestoreProps {
  onDataRestored: () => void;
  showToast: (msg: string) => void;
}

export const AdminBackupRestore: React.FC<AdminBackupRestoreProps> = ({
  onDataRestored,
  showToast,
}) => {
  const [backups, setBackups] = useState<BackupSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [restoring, setRestoring] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);

  const loadBackups = async () => {
    try {
      setLoading(true);
      const list = await fetchBackupsList();
      setBackups(list);
    } catch (err: any) {
      console.warn('Could not fetch backups list:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBackups();
  }, []);

  const handleExport = async () => {
    try {
      setExporting(true);
      const blob = await exportDatabaseBackup();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `jaihanuman-production-backup-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      showToast('Production backup downloaded successfully');
    } catch (err: any) {
      alert('Backup export error: ' + err.message);
    } finally {
      setExporting(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const handleImport = async () => {
    if (!selectedFile) {
      alert('Please select a .json backup file first');
      return;
    }

    try {
      const text = await selectedFile.text();
      const json = JSON.parse(text);

      if (!confirm(`Are you sure you want to restore this backup? A pre-restore snapshot of current data will be saved automatically.`)) {
        return;
      }

      setImporting(true);
      const res = await importDatabaseBackup(json);
      showToast(res.message || 'Database restored successfully');
      setSelectedFile(null);
      await loadBackups();
      onDataRestored();
    } catch (err: any) {
      alert('Import failed: ' + (err.message || 'Invalid JSON backup file'));
    } finally {
      setImporting(false);
    }
  };

  const handleRestoreLocal = async (filename: string) => {
    if (!confirm(`Restore system snapshot "${filename}"? All data from this snapshot will replace current data. A pre-restore snapshot of current data will be created first.`)) {
      return;
    }

    try {
      setRestoring(filename);
      const res = await restoreLocalBackup(filename);
      showToast(res.message || 'Snapshot restored successfully');
      await loadBackups();
      onDataRestored();
    } catch (err: any) {
      alert('Restore failed: ' + err.message);
    } finally {
      setRestoring(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header & Status Card */}
      <div className="p-5 rounded-xl bg-stone-800/90 border border-emerald-500/30 shadow-lg">
        <div className="flex items-start sm:items-center justify-between gap-4 flex-col sm:flex-row">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-emerald-950/80 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-serif text-lg font-bold text-white flex items-center gap-2">
                Production Data Persistence Engine
                <span className="text-[11px] font-mono uppercase bg-emerald-950 text-emerald-300 border border-emerald-700/50 px-2 py-0.5 rounded-full">
                  Active & Protected
                </span>
              </h4>
              <p className="text-xs text-stone-400 mt-0.5">
                Atomic disk writes, secondary mirror redundancy, and automated rolling snapshots protect your live catalogue, prices, articles, and settings.
              </p>
            </div>
          </div>
          <button
            onClick={loadBackups}
            disabled={loading}
            className="text-xs text-stone-400 hover:text-stone-200 flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-stone-900/60 border border-stone-700/50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* Two Action Panels: Export and Import */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Export Panel */}
        <div className="p-5 rounded-xl bg-stone-800/80 border border-stone-700/60 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2.5 text-amber-400 mb-2">
              <Download className="w-5 h-5" />
              <h5 className="font-semibold text-white">Export / Download Backup</h5>
            </div>
            <p className="text-xs text-stone-300 leading-relaxed">
              Download a complete, offline JSON copy of your entire catalogue, customized door prices, categories, materials, finishes, frames, articles, and settings.
            </p>
            <div className="mt-3 p-3 rounded-lg bg-stone-900/60 border border-stone-700/40 text-[11px] text-stone-400 space-y-1">
              <div className="flex items-center gap-1.5 text-stone-300">
                <FileCheck className="w-3.5 h-3.5 text-emerald-400" />
                <span>Complete database structure & customized records</span>
              </div>
              <div className="flex items-center gap-1.5 text-stone-300">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                <span>Can be safely restored anytime on Hostinger or local server</span>
              </div>
            </div>
          </div>
          <button
            onClick={handleExport}
            disabled={exporting}
            className="mt-5 w-full py-2.5 px-4 rounded-lg bg-amber-600 hover:bg-amber-500 text-stone-950 font-semibold text-sm flex items-center justify-center gap-2 transition shadow-md disabled:opacity-50"
          >
            <Download className="w-4 h-4" />
            {exporting ? 'Generating Backup...' : 'Download Production Backup (.JSON)'}
          </button>
        </div>

        {/* Import Panel */}
        <div className="p-5 rounded-xl bg-stone-800/80 border border-stone-700/60 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2.5 text-amber-400 mb-2">
              <Upload className="w-5 h-5" />
              <h5 className="font-semibold text-white">Restore / Import Backup</h5>
            </div>
            <p className="text-xs text-stone-300 leading-relaxed">
              Restore your website data from a previously exported JSON backup file. The system will automatically create a pre-restore safety snapshot before updating.
            </p>
            <div className="mt-3">
              <label className="block text-xs font-medium text-stone-300 mb-1.5">
                Select JSON Backup File:
              </label>
              <input
                type="file"
                accept=".json,application/json"
                onChange={handleFileChange}
                className="w-full text-xs text-stone-300 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-stone-700 file:text-stone-200 hover:file:bg-stone-600 cursor-pointer bg-stone-900/60 p-2 rounded-lg border border-stone-700/40"
              />
            </div>
          </div>
          <button
            onClick={handleImport}
            disabled={!selectedFile || importing}
            className="mt-5 w-full py-2.5 px-4 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-sm flex items-center justify-center gap-2 transition shadow-md disabled:opacity-40"
          >
            <Upload className="w-4 h-4" />
            {importing ? 'Restoring Data...' : 'Restore Selected Backup'}
          </button>
        </div>
      </div>

      {/* Automated Local Snapshots */}
      <div className="p-5 rounded-xl bg-stone-800/80 border border-stone-700/60">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2 text-white">
            <HardDrive className="w-5 h-5 text-amber-400" />
            <h5 className="font-semibold">Automated Rolling System Snapshots</h5>
          </div>
          <span className="text-xs text-stone-400">
            {backups.length} snapshots available
          </span>
        </div>

        {backups.length === 0 ? (
          <div className="p-6 text-center text-xs text-stone-400 bg-stone-900/40 rounded-lg border border-stone-700/30">
            No local snapshots found. Snapshots are created automatically when changes are saved or builds run.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-stone-300">
              <thead className="bg-stone-900/70 text-stone-400 border-b border-stone-700/60">
                <tr>
                  <th className="p-2.5 font-medium">Snapshot File</th>
                  <th className="p-2.5 font-medium">Timestamp</th>
                  <th className="p-2.5 font-medium">Doors / Articles</th>
                  <th className="p-2.5 font-medium">Size</th>
                  <th className="p-2.5 font-medium text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-700/40">
                {backups.slice(0, 10).map((b) => (
                  <tr key={b.filename} className="hover:bg-stone-700/30 transition">
                    <td className="p-2.5 font-mono text-[11px] text-stone-200">
                      {b.filename}
                    </td>
                    <td className="p-2.5 text-stone-400 flex items-center gap-1.5">
                      <Clock className="w-3 h-3 text-stone-500" />
                      {new Date(b.timestamp).toLocaleString()}
                    </td>
                    <td className="p-2.5">
                      <span className="px-2 py-0.5 rounded bg-stone-900 text-amber-300 font-mono text-[11px]">
                        {b.doorCount} doors
                      </span>
                      <span className="ml-1.5 px-2 py-0.5 rounded bg-stone-900 text-stone-300 font-mono text-[11px]">
                        {b.articleCount} articles
                      </span>
                    </td>
                    <td className="p-2.5 text-stone-400 font-mono text-[11px]">
                      {(b.sizeBytes / 1024).toFixed(1)} KB
                    </td>
                    <td className="p-2.5 text-right">
                      <button
                        onClick={() => handleRestoreLocal(b.filename)}
                        disabled={restoring === b.filename}
                        className="px-2.5 py-1 rounded bg-stone-700 hover:bg-stone-600 text-white text-[11px] font-medium transition disabled:opacity-50"
                      >
                        {restoring === b.filename ? 'Restoring...' : 'Restore'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
