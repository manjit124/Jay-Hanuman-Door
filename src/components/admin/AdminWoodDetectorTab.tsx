import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  TreePine,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Activity,
  Layers,
  Check,
  X,
  Loader2,
  Clock,
  ShieldCheck,
  Sliders,
  TrendingUp,
  AlertCircle,
  Play,
  Plus,
  Trash2,
  BookmarkCheck,
  FileCheck2,
  Microscope,
  Award,
} from 'lucide-react';
import {
  AIWoodDetectorStats,
  AIWoodDetectorSettings,
  BusinessSettings,
  WoodReferenceSample,
  WoodAccuracyBenchmarkResult,
  WoodSpeciesCategory,
} from '../../types.ts';
import {
  fetchWoodDetectorStats,
  updateWoodDetectorConfig,
  fetchWoodReferences,
  createWoodReference,
  deleteWoodReferenceAPI,
  toggleVerifyWoodReferenceAPI,
  runWoodBenchmarkAPI,
} from '../../lib/api.ts';

interface AdminWoodDetectorTabProps {
  settings: BusinessSettings;
  onSettingsUpdated?: () => void;
}

const SUPPORTED_SPECIES: WoodSpeciesCategory[] = [
  'Sagwan (Teak)',
  'Saal (Sal)',
  'Sheesham',
  'Jungle Wood',
  'Deodar',
  'Mango Wood',
  'Neem',
  'Pine',
  'Plywood',
  'Veneered Wood',
  'Laminated or engineered wood',
  'Other / Unknown',
];

export const AdminWoodDetectorTab: React.FC<AdminWoodDetectorTabProps> = ({
  settings,
  onSettingsUpdated,
}) => {
  const [stats, setStats] = useState<AIWoodDetectorStats | null>(null);
  const [references, setReferences] = useState<WoodReferenceSample[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Configuration Form State
  const [enabled, setEnabled] = useState<boolean>(
    settings.aiWoodDetector?.enabled !== false
  );
  const [customNotice, setCustomNotice] = useState<string>(
    settings.aiWoodDetector?.customNotice || ''
  );
  const [maxDailyScans, setMaxDailyScans] = useState<number>(
    settings.aiWoodDetector?.maxDailyScans || 150
  );

  // Live Test State
  const [testingApi, setTestingApi] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  // Benchmark Evaluation State
  const [runningBenchmark, setRunningBenchmark] = useState(false);
  const [benchmarkResult, setBenchmarkResult] = useState<WoodAccuracyBenchmarkResult | null>(null);

  // Add Reference Modal State
  const [showAddModal, setShowAddModal] = useState(false);
  const [refSpecies, setRefSpecies] = useState<WoodSpeciesCategory>('Sagwan (Teak)');
  const [refLabel, setRefLabel] = useState('');
  const [refImageUrl, setRefImageUrl] = useState('');
  const [refSource, setRefSource] = useState('Jai Hanuman Door Sawmill Certified Batch');
  const [refNotes, setRefNotes] = useState('');
  const [refVerified, setRefVerified] = useState(true);
  const [savingRef, setSavingRef] = useState(false);

  // Filter for references list
  const [selectedFilterSpecies, setSelectedFilterSpecies] = useState<string>('all');

  const loadData = async () => {
    try {
      setLoading(true);
      const [statsData, refsData] = await Promise.all([
        fetchWoodDetectorStats().catch(() => null),
        fetchWoodReferences().catch(() => []),
      ]);

      if (statsData) {
        setStats(statsData);
        if (typeof statsData.enabled === 'boolean') {
          setEnabled(statsData.enabled);
        }
      }
      setReferences(refsData);
    } catch (err: any) {
      console.error('Failed to load wood detector data:', err);
      setErrorMessage(err.message || 'Stats load karne mein samasya aayi');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSaveSuccess(false);
    setErrorMessage(null);
    try {
      await updateWoodDetectorConfig({
        enabled,
        customNotice,
        maxDailyScans,
      });
      setSaveSuccess(true);
      if (onSettingsUpdated) {
        onSettingsUpdated();
      }
      setTimeout(() => setSaveSuccess(false), 3000);
      loadData();
    } catch (err: any) {
      setErrorMessage(err.message || 'Settings update nahi ho saki.');
    } finally {
      setSaving(false);
    }
  };

  const handleRunHealthCheck = async () => {
    setTestingApi(true);
    setTestResult(null);
    try {
      const dummyTestImage =
        'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=';
      const startTime = Date.now();
      const res = await fetch('/api/wood-analysis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: dummyTestImage }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setTestResult({
          success: true,
          message: `API Health Check Passed! Gemini Vision Model responded in ${data.durationMs || Date.now() - startTime}ms.`,
        });
      } else {
        setTestResult({
          success: false,
          message: `API Check Failed: ${data.error || 'Server error'}`,
        });
      }
      loadData();
    } catch (err: any) {
      setTestResult({
        success: false,
        message: `Health check error: ${err.message}`,
      });
    } finally {
      setTestingApi(false);
    }
  };

  // Run isolated Accuracy Benchmark
  const handleRunBenchmark = async () => {
    setRunningBenchmark(true);
    try {
      const result = await runWoodBenchmarkAPI();
      setBenchmarkResult(result);
    } catch (err: any) {
      alert('Benchmark Error: ' + err.message);
    } finally {
      setRunningBenchmark(false);
    }
  };

  // Add Reference Sample
  const handleAddReference = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!refLabel.trim() || !refImageUrl.trim()) {
      alert('Kripya label aur image URL dono bharein.');
      return;
    }
    setSavingRef(true);
    try {
      await createWoodReference({
        woodType: refSpecies,
        verifiedLabel: refLabel.trim(),
        imageUrl: refImageUrl.trim(),
        source: refSource.trim(),
        notes: refNotes.trim(),
        isVerified: refVerified,
        verifiedBy: refVerified ? 'Administrator' : undefined,
        verifiedAt: refVerified ? new Date().toISOString() : undefined,
      });
      setShowAddModal(false);
      setRefLabel('');
      setRefImageUrl('');
      setRefNotes('');
      loadData();
    } catch (err: any) {
      alert('Error creating reference sample: ' + err.message);
    } finally {
      setSavingRef(false);
    }
  };

  const handleToggleVerify = async (id: string) => {
    try {
      await toggleVerifyWoodReferenceAPI(id);
      loadData();
    } catch (err: any) {
      alert('Verification toggle error: ' + err.message);
    }
  };

  const handleDeleteRef = async (id: string) => {
    if (!confirm('Kya aap is reference sample ko delete karna chahte hain?')) return;
    try {
      await deleteWoodReferenceAPI(id);
      loadData();
    } catch (err: any) {
      alert('Delete error: ' + err.message);
    }
  };

  const filteredReferences = references.filter(r => {
    if (selectedFilterSpecies === 'all') return true;
    return r.woodType.toLowerCase().includes(selectedFilterSpecies.toLowerCase());
  });

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-5 border-b border-stone-800 gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30">
              <TreePine className="w-5 h-5" />
            </span>
            <h2 className="text-xl sm:text-2xl font-bold text-stone-100 font-serif">
              AI Wood Detector – Lakdi Ki Pehchan Management
            </h2>
          </div>
          <p className="text-xs sm:text-sm text-stone-400 mt-1">
            Timber identification accuracy, verified reference dataset, live benchmark evaluation, and monitoring.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={loadData}
            disabled={loading}
            className="px-3 py-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-300 text-xs font-semibold flex items-center gap-1.5 border border-stone-700 transition-colors"
          >
            <RotateCcw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>

          <button
            onClick={handleRunHealthCheck}
            disabled={testingApi}
            className="px-3.5 py-2 rounded-xl bg-amber-600/20 hover:bg-amber-600/30 text-amber-300 text-xs font-semibold flex items-center gap-1.5 border border-amber-500/40 transition-colors"
          >
            {testingApi ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5" />}
            <span>Quick Ping</span>
          </button>

          <button
            onClick={handleRunBenchmark}
            disabled={runningBenchmark}
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-stone-950 font-bold text-xs flex items-center gap-1.5 shadow-md transition-all active:scale-95 disabled:opacity-50"
          >
            {runningBenchmark ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Microscope className="w-3.5 h-3.5" />}
            <span>Run Accuracy Benchmark</span>
          </button>
        </div>
      </div>

      {/* Health Check Alert if run */}
      {testResult && (
        <div
          className={`p-4 rounded-xl border text-xs sm:text-sm flex items-start gap-3 ${
            testResult.success
              ? 'bg-emerald-950/40 border-emerald-700/60 text-emerald-200'
              : 'bg-rose-950/40 border-rose-700/60 text-rose-200'
          }`}
        >
          {testResult.success ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
          ) : (
            <AlertTriangle className="w-5 h-5 text-rose-400 flex-shrink-0 mt-0.5" />
          )}
          <div className="flex-1">
            <p className="font-semibold">{testResult.success ? 'Success' : 'Check Failed'}</p>
            <p className="mt-0.5">{testResult.message}</p>
          </div>
          <button
            type="button"
            onClick={() => setTestResult(null)}
            className="text-stone-400 hover:text-stone-200"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* TIMBER ACCURACY BENCHMARK EVALUATION RESULTS CARD */}
      {benchmarkResult && (
        <div className="bg-stone-900 border border-amber-500/40 rounded-2xl p-6 space-y-4 shadow-xl animate-fade-in">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-stone-800 gap-2">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400 bg-amber-500/10 border border-amber-500/30 px-2.5 py-0.5 rounded-full">
                Isolated Timber Accuracy Benchmark Results
              </span>
              <h3 className="text-lg font-bold text-stone-100 font-serif mt-1">
                Measured Botanical Accuracy: {benchmarkResult.accuracyRate}%
              </h3>
            </div>
            <span className="text-xs text-stone-400">
              Evaluated at: {new Date(benchmarkResult.evaluatedAt).toLocaleTimeString()}
            </span>
          </div>

          {/* Metric Stats Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
            <div className="p-3 rounded-xl bg-stone-950 border border-stone-800">
              <span className="text-[10px] text-stone-400 uppercase font-semibold block">Total Tests</span>
              <span className="text-xl font-bold font-mono text-stone-100">{benchmarkResult.totalTests}</span>
            </div>
            <div className="p-3 rounded-xl bg-stone-950 border border-emerald-800/40">
              <span className="text-[10px] text-emerald-400 uppercase font-semibold block">Correct Predictions</span>
              <span className="text-xl font-bold font-mono text-emerald-400">{benchmarkResult.correctIdentifications}</span>
            </div>
            <div className="p-3 rounded-xl bg-stone-950 border border-stone-800">
              <span className="text-[10px] text-stone-400 uppercase font-semibold block">Sagwan vs Sal Confusion</span>
              <span className={`text-xl font-bold font-mono ${benchmarkResult.sagwanSalConfusionCount === 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                {benchmarkResult.sagwanSalConfusionCount} (Must be 0)
              </span>
            </div>
            <div className="p-3 rounded-xl bg-stone-950 border border-stone-800">
              <span className="text-[10px] text-stone-400 uppercase font-semibold block">Honest Refusal Rate</span>
              <span className="text-xl font-bold font-mono text-amber-400">{benchmarkResult.honestRefusalCount}</span>
            </div>
          </div>

          {/* Specimen Breakdown Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-stone-950 text-stone-400 uppercase tracking-wider font-semibold border-b border-stone-800">
                <tr>
                  <th className="px-3 py-2">Status</th>
                  <th className="px-3 py-2">Specimen</th>
                  <th className="px-3 py-2">Expected Species</th>
                  <th className="px-3 py-2">Model Prediction</th>
                  <th className="px-3 py-2">Confidence</th>
                  <th className="px-3 py-2">Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-800/80 font-mono">
                {benchmarkResult.details.map(d => (
                  <tr key={d.sampleId} className="hover:bg-stone-800/30">
                    <td className="px-3 py-2">
                      {d.passed ? (
                        <span className="text-emerald-400 font-bold flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" /> PASS
                        </span>
                      ) : (
                        <span className="text-rose-400 font-bold flex items-center gap-1">
                          <AlertTriangle className="w-3.5 h-3.5" /> FAIL
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-2 text-stone-200">{d.sampleId}</td>
                    <td className="px-3 py-2 font-semibold text-amber-300">{d.expectedSpecies}</td>
                    <td className="px-3 py-2 text-stone-100">{d.predictedSpecies}</td>
                    <td className="px-3 py-2 text-stone-300">{d.confidence}</td>
                    <td className="px-3 py-2 text-stone-400 text-[11px] truncate max-w-xs">{d.notes}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* METRICS ROW */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Scans */}
        <div className="bg-stone-900 border border-stone-800 rounded-2xl p-4 sm:p-5 flex items-center justify-between shadow-sm">
          <div>
            <span className="text-[11px] text-stone-400 font-semibold uppercase tracking-wider block">
              Total Customer Scans
            </span>
            <span className="text-2xl sm:text-3xl font-extrabold text-stone-100 font-mono mt-1 block">
              {stats?.totalScans ?? 0}
            </span>
            <span className="text-[11px] text-stone-500 mt-1 block">Lifetime analyses</span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center">
            <Sparkles className="w-5 h-5" />
          </div>
        </div>

        {/* Today's Scans */}
        <div className="bg-stone-900 border border-stone-800 rounded-2xl p-4 sm:p-5 flex items-center justify-between shadow-sm">
          <div>
            <span className="text-[11px] text-stone-400 font-semibold uppercase tracking-wider block">
              Today's Scans
            </span>
            <span className="text-2xl sm:text-3xl font-extrabold text-amber-400 font-mono mt-1 block">
              {stats?.todayScans ?? 0}
            </span>
            <span className="text-[11px] text-stone-500 mt-1 block">
              Quota: {maxDailyScans}/day
            </span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center">
            <Clock className="w-5 h-5" />
          </div>
        </div>

        {/* Successful Identifications */}
        <div className="bg-stone-900 border border-stone-800 rounded-2xl p-4 sm:p-5 flex items-center justify-between shadow-sm">
          <div>
            <span className="text-[11px] text-stone-400 font-semibold uppercase tracking-wider block">
              Successful Scans
            </span>
            <span className="text-2xl sm:text-3xl font-extrabold text-emerald-400 font-mono mt-1 block">
              {stats?.successfulScans ?? 0}
            </span>
            <span className="text-[11px] text-stone-500 mt-1 block">Verified outputs</span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-stone-800 text-stone-300 flex items-center justify-center">
            <CheckCircle2 className="w-5 h-5 text-emerald-400" />
          </div>
        </div>

        {/* Verified Reference Count */}
        <div className="bg-stone-900 border border-stone-800 rounded-2xl p-4 sm:p-5 flex items-center justify-between shadow-sm">
          <div>
            <span className="text-[11px] text-stone-400 font-semibold uppercase tracking-wider block">
              Verified References
            </span>
            <span className="text-2xl sm:text-3xl font-extrabold text-amber-300 font-mono mt-1 block">
              {references.filter(r => r.isVerified).length} / {references.length}
            </span>
            <span className="text-[11px] text-stone-500 mt-1 block">Grounded samples</span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center">
            <Award className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* VERIFIED WOOD REFERENCE LIBRARY MANAGEMENT */}
      <div className="bg-stone-900 border border-stone-800 rounded-2xl p-5 sm:p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-stone-800 gap-3">
          <div>
            <h3 className="text-base font-bold text-stone-100 flex items-center gap-2">
              <BookmarkCheck className="w-4 h-4 text-amber-400" />
              <span>Verified Wood Reference Library (Pramanit Lakdi Sangrah)</span>
            </h3>
            <p className="text-xs text-stone-400 mt-0.5">
              Authorized administrator can add verified reference photos with wood type, confirmed label, source and anatomical notes.
            </p>
          </div>

          <button
            type="button"
            onClick={() => setShowAddModal(true)}
            className="px-3.5 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-stone-950 font-bold text-xs flex items-center gap-1.5 shadow transition-all active:scale-95 self-start sm:self-auto"
          >
            <Plus className="w-4 h-4" />
            <span>Add Reference Sample</span>
          </button>
        </div>

        {/* Filter bar */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
          <span className="text-stone-400 font-semibold flex-shrink-0">Filter Species:</span>
          {['all', 'Sagwan', 'Sal', 'Sheesham', 'Jungle Wood', 'Plywood', 'Veneer'].map(sp => (
            <button
              key={sp}
              type="button"
              onClick={() => setSelectedFilterSpecies(sp)}
              className={`px-2.5 py-1 rounded-lg transition-colors flex-shrink-0 ${
                selectedFilterSpecies === sp
                  ? 'bg-amber-500 text-stone-950 font-bold'
                  : 'bg-stone-800 text-stone-300 hover:bg-stone-700'
              }`}
            >
              {sp === 'all' ? 'All Samples' : sp}
            </button>
          ))}
        </div>

        {/* Reference Samples Grid */}
        {filteredReferences.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 pt-2">
            {filteredReferences.map(ref => (
              <div
                key={ref.id}
                className="bg-stone-950 border border-stone-800 rounded-2xl overflow-hidden flex flex-col justify-between group hover:border-amber-500/40 transition-all"
              >
                <div>
                  <div className="relative aspect-video bg-stone-900 overflow-hidden">
                    <img
                      src={ref.imageUrl}
                      alt={ref.verifiedLabel}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                    />
                    <span
                      className={`absolute top-2 left-2 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                        ref.isVerified
                          ? 'bg-emerald-500/90 text-stone-950 shadow'
                          : 'bg-stone-800 text-stone-300'
                      }`}
                    >
                      {ref.isVerified ? 'Verified Specimen' : 'Pending Verification'}
                    </span>
                  </div>

                  <div className="p-4 space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <h4 className="font-bold text-sm text-stone-100 leading-snug">
                        {ref.verifiedLabel}
                      </h4>
                    </div>

                    <span className="inline-block px-2 py-0.5 rounded bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs font-semibold">
                      {ref.woodType}
                    </span>

                    <p className="text-xs text-stone-400">
                      <strong>Source:</strong> {ref.source}
                    </p>

                    {ref.notes && (
                      <p className="text-xs text-stone-300 italic line-clamp-2">
                        "{ref.notes}"
                      </p>
                    )}
                  </div>
                </div>

                <div className="p-3 bg-stone-900/60 border-t border-stone-800 flex items-center justify-between gap-2 text-xs">
                  <button
                    type="button"
                    onClick={() => handleToggleVerify(ref.id)}
                    className={`px-2.5 py-1 rounded-lg font-semibold flex items-center gap-1 transition-colors ${
                      ref.isVerified
                        ? 'bg-stone-800 hover:bg-stone-700 text-stone-300'
                        : 'bg-emerald-600/30 hover:bg-emerald-600/40 text-emerald-300 border border-emerald-500/40'
                    }`}
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>{ref.isVerified ? 'Mark Unverified' : 'Verify Sample'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleDeleteRef(ref.id)}
                    className="p-1.5 rounded-lg text-stone-400 hover:text-rose-400 transition-colors"
                    title="Delete sample"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="py-8 text-center text-stone-400 text-xs border border-dashed border-stone-800 rounded-2xl">
            <p className="font-semibold text-stone-300">Koi verified reference sample nahi mila.</p>
            <p className="text-stone-500 mt-1 max-w-md mx-auto">
              Workshop ke authentic Sagwan, Saal aur Sheesham lakdiyon ke samples upload karke "Verified" mark karein taaki AI comparison aur behtar ho sake.
            </p>
          </div>
        )}
      </div>

      {/* ADD REFERENCE SAMPLE MODAL */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-stone-900 border border-amber-500/30 rounded-3xl p-6 sm:p-8 max-w-lg w-full space-y-4 shadow-2xl animate-fade-in">
            <div className="flex items-center justify-between pb-3 border-b border-stone-800">
              <h3 className="font-serif text-lg sm:text-xl font-bold text-stone-100 flex items-center gap-2">
                <Plus className="w-5 h-5 text-amber-400" />
                <span>Add Verified Reference Sample</span>
              </h3>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="text-stone-400 hover:text-stone-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddReference} className="space-y-4 text-xs sm:text-sm">
              <div>
                <label className="block font-semibold text-stone-300 mb-1">Wood Species Category</label>
                <select
                  value={refSpecies}
                  onChange={e => setRefSpecies(e.target.value as WoodSpeciesCategory)}
                  className="w-full px-3 py-2 rounded-xl bg-stone-950 border border-stone-700 text-stone-100 focus:outline-none focus:border-amber-500"
                >
                  {SUPPORTED_SPECIES.map(sp => (
                    <option key={sp} value={sp}>
                      {sp}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-stone-300 mb-1">Verified Sample Label</label>
                <input
                  type="text"
                  placeholder="e.g. CP Teak Grade A Quarter-Sawn Heartwood"
                  value={refLabel}
                  onChange={e => setRefLabel(e.target.value)}
                  required
                  className="w-full px-3 py-2 rounded-xl bg-stone-950 border border-stone-700 text-stone-100 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-stone-300 mb-1">Sample Photo URL or Path</label>
                <input
                  type="text"
                  placeholder="/uploads/... or https://..."
                  value={refImageUrl}
                  onChange={e => setRefImageUrl(e.target.value)}
                  required
                  className="w-full px-3 py-2 rounded-xl bg-stone-950 border border-stone-700 text-stone-100 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-stone-300 mb-1">Source / Timber Origin</label>
                <input
                  type="text"
                  placeholder="e.g. Jai Hanuman Door Sawmill Certified Batch #104"
                  value={refSource}
                  onChange={e => setRefSource(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-stone-950 border border-stone-700 text-stone-100 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-stone-300 mb-1">Anatomical Notes &amp; Pores</label>
                <textarea
                  rows={2}
                  placeholder="e.g. Earlywood pores clearly ring-porous, unpolished radial grain with dark longitudinal veins."
                  value={refNotes}
                  onChange={e => setRefNotes(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-stone-950 border border-stone-700 text-stone-100 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  id="mark-verified"
                  type="checkbox"
                  checked={refVerified}
                  onChange={e => setRefVerified(e.target.checked)}
                  className="w-4 h-4 rounded text-amber-500 focus:ring-amber-500 border-stone-700 bg-stone-950"
                />
                <label htmlFor="mark-verified" className="text-xs text-stone-300 cursor-pointer font-semibold">
                  Mark immediately as "Verified by Administrator"
                </label>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-stone-800">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-300 text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingRef}
                  className="px-5 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-stone-950 font-bold text-xs flex items-center gap-1.5 shadow"
                >
                  {savingRef && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Save Reference</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* SETTINGS FORM */}
      <div className="bg-stone-900 border border-stone-800 rounded-2xl p-5 sm:p-6 space-y-5">
        <div className="flex items-center justify-between pb-3 border-b border-stone-800">
          <div>
            <h3 className="text-base font-bold text-stone-100 flex items-center gap-2">
              <Sliders className="w-4 h-4 text-amber-400" />
              <span>Feature Configuration &amp; Controls</span>
            </h3>
            <p className="text-xs text-stone-400 mt-0.5">
              Enable or disable AI Wood Detector, or customize public notices.
            </p>
          </div>
        </div>

        <form onSubmit={handleSaveSettings} className="space-y-4">
          
          {/* Enable / Disable Switch */}
          <div className="flex items-center justify-between p-4 rounded-xl bg-stone-950/60 border border-stone-800">
            <div>
              <label className="text-xs sm:text-sm font-bold text-stone-200 block cursor-pointer">
                AI Wood Detector Enable / Disable
              </label>
              <p className="text-xs text-stone-400 mt-0.5">
                Band karne par website visitors ko feature temporarily disabled dikhega.
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={enabled}
                onChange={e => setEnabled(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-stone-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-600"></div>
            </label>
          </div>

          {/* Max daily scans quota guide */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-stone-300 mb-1">
                Daily Max Scan Capacity
              </label>
              <input
                type="number"
                min="10"
                max="1000"
                value={maxDailyScans}
                onChange={e => setMaxDailyScans(Number(e.target.value))}
                className="w-full px-3 py-2 rounded-xl bg-stone-950 border border-stone-700 text-stone-100 text-xs sm:text-sm focus:outline-none focus:border-amber-500"
              />
              <span className="text-[11px] text-stone-500 mt-1 block">Default: 150 scans/day</span>
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-300 mb-1">
                Custom Notice (Optional)
              </label>
              <input
                type="text"
                placeholder="e.g. Workshop festive season - Instant quotes available"
                value={customNotice}
                onChange={e => setCustomNotice(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-stone-950 border border-stone-700 text-stone-100 text-xs sm:text-sm focus:outline-none focus:border-amber-500"
              />
              <span className="text-[11px] text-stone-500 mt-1 block">Will appear at top of detector page if set</span>
            </div>
          </div>

          {/* Save Status & Button */}
          <div className="flex items-center justify-between pt-3">
            <div>
              {saveSuccess && (
                <span className="text-xs text-emerald-400 font-semibold flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4" />
                  Settings successfully saved!
                </span>
              )}
              {errorMessage && (
                <span className="text-xs text-rose-400 font-semibold flex items-center gap-1.5">
                  <AlertCircle className="w-4 h-4" />
                  {errorMessage}
                </span>
              )}
            </div>

            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-stone-950 font-bold text-xs sm:text-sm flex items-center gap-2 shadow-md transition-all active:scale-95"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
              <span>Save AI Settings</span>
            </button>
          </div>

        </form>
      </div>

      {/* RECENT ACTIVITY & MONITORING LOG TABLE */}
      <div className="bg-stone-900 border border-stone-800 rounded-2xl p-5 sm:p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-stone-100 flex items-center gap-2">
              <Activity className="w-4 h-4 text-amber-400" />
              <span>Recent Scan Activity &amp; Error Monitoring</span>
            </h3>
            <p className="text-xs text-stone-400 mt-0.5">
              Privacy-Protected: Only technical metadata &amp; detected species names are recorded. No customer images saved.
            </p>
          </div>
          <span className="text-xs font-mono text-stone-400">
            {stats?.recentLogs?.length ?? 0} records
          </span>
        </div>

        {stats?.recentLogs && stats.recentLogs.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-stone-950 text-stone-400 uppercase tracking-wider font-semibold border-b border-stone-800">
                <tr>
                  <th className="px-3 py-2.5">Time</th>
                  <th className="px-3 py-2.5">Detected Wood</th>
                  <th className="px-3 py-2.5">Confidence</th>
                  <th className="px-3 py-2.5">Status</th>
                  <th className="px-3 py-2.5">Latency</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-800/80">
                {stats.recentLogs.slice(0, 20).map(log => (
                  <tr key={log.id} className="hover:bg-stone-800/30 transition-colors">
                    <td className="px-3 py-2.5 text-stone-300 font-mono">
                      {new Date(log.timestamp).toLocaleString('en-IN', {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </td>
                    <td className="px-3 py-2.5 font-semibold text-stone-100">
                      {log.likelyWoodType || (log.errorMessage ? 'Scan Error' : 'Unknown')}
                    </td>
                    <td className="px-3 py-2.5">
                      {log.confidenceLevel ? (
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                            log.confidenceLevel === 'High'
                              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                              : log.confidenceLevel === 'Moderate'
                              ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40'
                              : 'bg-stone-800 text-stone-400'
                          }`}
                        >
                          {log.confidenceLevel}
                        </span>
                      ) : (
                        <span className="text-stone-500">—</span>
                      )}
                    </td>
                    <td className="px-3 py-2.5">
                      {log.success ? (
                        <span className="text-emerald-400 font-semibold flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Success
                        </span>
                      ) : (
                        <span
                          className="text-rose-400 font-semibold flex items-center gap-1"
                          title={log.errorMessage}
                        >
                          <AlertTriangle className="w-3.5 h-3.5" />
                          Failed
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-2.5 text-stone-400 font-mono">
                      {log.responseTimeMs ? `${log.responseTimeMs}ms` : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="py-8 text-center text-stone-500 text-xs">
            Abhi tak koi scan record nahi mila. Customer dwara photo upload karne par yahan live details dikhengi.
          </div>
        )}
      </div>

    </div>
  );
};
