import React, { useState, useRef, useMemo } from "react";
import { 
  FileText, 
  Upload, 
  Copy, 
  Download, 
  CheckCircle, 
  AlertTriangle, 
  Loader2, 
  Shield, 
  Check, 
  Sparkles,
  Info,
  Layers,
  Settings,
  HelpCircle,
  TrendingDown,
  TrendingUp,
  RefreshCw,
  Plus,
  Trash2,
  X
} from "lucide-react";
import { Transaction, ExtractionStatus } from "./types";
import { SAMPLE_STATEMENTS, SampleStatement } from "./data/SampleStatements";
import TransactionTable from "./components/TransactionTable";
import AnalyticsPanel from "./components/AnalyticsPanel";

export default function App() {
  // Current active statement dataset - load from localStorage if present, otherwise empty default list
  const [transactions, setTransactions] = useState<Transaction[]>(() => {
    try {
      const saved = localStorage.getItem("banksnap_extracted_txs");
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      console.error("Could not parse saved transactions from localStorage due to error: ", e);
      return [];
    }
  });

  const [selectedSampleId, setSelectedSampleId] = useState<string>("custom");
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  // Custom multi-file upload states - load from localStorage if present
  interface UploadedFileState {
    id: string;
    name: string;
    size: string;
    type: string;
    base64: string;
  }

  const [uploadedFiles, setUploadedFiles] = useState<UploadedFileState[]>(() => {
    try {
      const saved = localStorage.getItem("banksnap_uploaded_files");
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      console.error("Could not parse saved uploaded files from localStorage due to error: ", e);
      return [];
    }
  });

  // Maintain computed active singular file / base64 for absolute backward state compatibility
  const uploadedFile = uploadedFiles.length > 0 ? uploadedFiles[0] : null;
  const fileBase64 = uploadedFile ? uploadedFile.base64 : "";

  const [extractionStatus, setExtractionStatus] = useState<ExtractionStatus>(() => {
    try {
      const saved = localStorage.getItem("banksnap_extracted_txs");
      return saved && JSON.parse(saved).length > 0 ? "success" : "idle";
    } catch {
      return "idle";
    }
  });
  const [extractionError, setExtractionError] = useState<string | null>(null);
  
  const [copiedCSV, setCopiedCSV] = useState(false);
  const [activeTab, setActiveTab] = useState<"extraction" | "analytics">("extraction");
  const [viewStyle, setViewStyle] = useState<"calculations" | "table">("calculations");
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sync state to local storage when changed
  React.useEffect(() => {
    try {
      localStorage.setItem("banksnap_extracted_txs", JSON.stringify(transactions));
    } catch (e) {
      console.error("Failed to write transactions to localStorage", e);
    }
  }, [transactions]);

  React.useEffect(() => {
    try {
      localStorage.setItem("banksnap_uploaded_files", JSON.stringify(uploadedFiles));
    } catch (e) {
      console.error("Failed to write uploadedFiles to localStorage", e);
    }
  }, [uploadedFiles]);

  // Load a sample statement for test/demo purposes if requested
  const handleSelectSample = (sampleId: string) => {
    setSelectedSampleId(sampleId);
    const sample = SAMPLE_STATEMENTS.find((s) => s.id === sampleId);
    if (sample) {
      const mappedTxs = sample.transactions.map(t => ({ ...t, isNew: false }));
      setTransactions(mappedTxs);
      setUploadedFiles([
        {
          id: `sample-${sampleId}-${Date.now()}`,
          name: `${sample.bankName.toLowerCase().replace(/\s+/g, "_")}_statement.pdf`,
          size: "2.1 MB",
          type: "application/pdf",
          base64: "sample"
        }
      ]);
      setExtractionStatus("success");
    }
  };

  // Clear memory and reset workspace
  const handleClearAll = () => {
    setTransactions([]);
    setUploadedFiles([]);
    setExtractionStatus("idle");
    setExtractionError(null);
    setSelectedSampleId("custom");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
    try {
      localStorage.removeItem("banksnap_extracted_txs");
      localStorage.removeItem("banksnap_uploaded_files");
    } catch (err) {
      console.error(err);
    }
  };

  // Clear files only
  const handleClearAllFilesOnly = () => {
    setUploadedFiles([]);
    setExtractionStatus("idle");
    setSelectedSampleId("custom");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  // Delete matching individual staged file
  const handleDeleteUploadedFile = (id: string) => {
    setUploadedFiles((prev) => {
      const filtered = prev.filter((f) => f.id !== id);
      if (filtered.length === 0) {
        setExtractionStatus("idle");
        setExtractionError(null);
      }
      return filtered;
    });
  };

  // Convert uploaded files to base64
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    processMultipleFiles(files);
  };

  const processMultipleFiles = async (filesList: FileList | File[]) => {
    const validFiles: File[] = [];
    let sizeError = false;

    for (let i = 0; i < filesList.length; i++) {
      const file = filesList[i];
      if (file.size > 15 * 1024 * 1024) {
        sizeError = true;
      } else {
        validFiles.push(file);
      }
    }

    if (sizeError) {
      setExtractionError("Some files were skipped because they exceed the 15MB size limit.");
    }

    if (validFiles.length === 0) {
      if (sizeError) setExtractionStatus("error");
      return;
    }

    // Reset playground sample / transactions state to start fresh extraction with custom files
    setTransactions([]);
    setSelectedSampleId("custom");
    setExtractionStatus("uploading");
    setExtractionError(null);

    try {
      const base64Promises = validFiles.map((file) => {
        return new Promise<UploadedFileState>((resolve, reject) => {
          const reader = new FileReader();
          reader.onloadend = () => {
            const base64String = (reader.result as string).split(",")[1];
            const sizeStr = (file.size / (1024 * 1024)).toFixed(2) + " MB";
            resolve({
              id: `${file.name}-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`,
              name: file.name,
              size: sizeStr,
              type: file.type,
              base64: base64String
            });
          };
          reader.onerror = () => reject(new Error(`Failed to read file ${file.name}`));
          reader.readAsDataURL(file);
        });
      });

      const parsedFiles = await Promise.all(base64Promises);
      setUploadedFiles((prev) => [...prev, ...parsedFiles]);
      setExtractionStatus("idle");
    } catch (err: any) {
      console.error(err);
      setExtractionError(err.message || "Failed to successfully parse local files. Please try again.");
      setExtractionStatus("error");
    }
  };

  // Trigger Gemini API OCR extraction over all staged files
  const handleTriggerExtract = async () => {
    if (uploadedFiles.length === 0) {
      setExtractionError("Please select or drop at least one valid statement document.");
      setExtractionStatus("error");
      return;
    }

    setExtractionStatus("processing");
    setExtractionError(null);

    try {
      const payloadFiles = uploadedFiles.map((f) => ({
        fileBase64: f.base64,
        mimeType: f.type
      }));

      const response = await fetch("/api/extract", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          files: payloadFiles,
          // Support backward compatibility
          fileBase64: uploadedFiles[0].base64,
          mimeType: uploadedFiles[0].type
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP error ${response.status}`);
      }

      const data = await response.json();
      if (data.transactions && Array.isArray(data.transactions)) {
        // Map dynamic response rows to local identifiers
        const formattedTxs: Transaction[] = data.transactions.map((t: any, index: number) => ({
          id: `extracted-${Date.now()}-${index}`,
          date: t.date || new Date().toISOString().split("T")[0],
          description: t.description || "Unidentified merchant row",
          amount: typeof t.amount === "number" ? t.amount : parseFloat(t.amount) || 0,
          category: (t.category || "other").toLowerCase(),
          notes: t.notes || "",
          isNew: true
        }));

        setTransactions(formattedTxs);
        setExtractionStatus("success");
      } else {
        throw new Error("Invalid structure returned from server extract pipeline.");
      }
    } catch (err: any) {
      console.error(err);
      setExtractionError(err.message || "Could not successfully complete Gemini OCR analysis.");
      setExtractionStatus("error");
    }
  };

  // Drag and drop events
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      processMultipleFiles(files);
    }
  };

  // Inline table state updates
  const handleUpdateTransaction = (id: string, updated: Partial<Transaction>) => {
    setTransactions((prev) =>
      prev.map((t) => (t.id === id ? { ...t, ...updated, isNew: false } : t))
    );
  };

  const handleDeleteTransaction = (id: string) => {
    setTransactions((prev) => prev.filter((t) => t.id !== id));
  };

  const handleAddTransaction = () => {
    const newTx: Transaction = {
      id: `manual-${Date.now()}`,
      date: new Date().toISOString().split("T")[0],
      description: "NEW TRANSACTION LINE",
      amount: -10.00,
      category: "other",
      notes: "Manually added row",
      isNew: true
    };
    setTransactions((prev) => [newTx, ...prev]);
  };

  const handleResetTransactions = () => {
    const sample = SAMPLE_STATEMENTS.find((s) => s.id === selectedSampleId);
    if (sample) {
      setTransactions(sample.transactions.map(t => ({ ...t, isNew: false })));
    } else {
      setTransactions([]);
    }
  };

  // Dynamic Real-time Calculations Overview
  const calculationSummary = useMemo(() => {
    let income = 0;
    let spending = 0;
    transactions.forEach((t) => {
      const amt = t.amount;
      if (amt > 0) {
        income += amt;
      } else if (amt < 0) {
        spending += Math.abs(amt);
      }
    });
    return {
      totalRecords: transactions.length,
      totalIncome: income,
      totalSpending: spending,
      netRemaining: income - spending,
    };
  }, [transactions]);

  // Generate robust, clean CSV rows
  const generatedCSV = useMemo(() => {
    const header = "Date,Description,Amount,Category,Notes\r\n";
    const body = transactions
      .map((t) => {
        // Safe check description & notes for commas
        const escDesc = t.description.includes(",") ? `"${t.description.replace(/"/g, '""')}"` : t.description;
        const escNotes = t.notes.includes(",") ? `"${t.notes.replace(/"/g, '""')}"` : t.notes;
        return `${t.date},${escDesc},${t.amount},${t.category},${escNotes}`;
      })
      .join("\r\n");
    return header + body;
  }, [transactions]);

  // Copy spreadsheet-compatible tabular columns (TSV) to clipboard (instantly splits cells on Paste)
  const handleCopyCSV = () => {
    const tsvHeader = "Date\tDescription\tAmount\tCategory\tNotes\r\n";
    const tsvBody = transactions
      .map((t) => {
        // Remove tabs and double quotes/newlines to ensure clean cell splitting
        const cleanDesc = t.description.replace(/\t/g, " ").replace(/\r?\n/g, " ");
        const cleanNotes = t.notes.replace(/\t/g, " ").replace(/\r?\n/g, " ");
        return `${t.date}\t${cleanDesc}\t${t.amount}\t${t.category}\t${cleanNotes}`;
      })
      .join("\r\n");
    navigator.clipboard.writeText(tsvHeader + tsvBody);
    setCopiedCSV(true);
    setTimeout(() => setCopiedCSV(false), 2500);
  };

  // Download raw spreadsheet file
  const handleDownloadCSV = () => {
    const blob = new Blob([generatedCSV], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    const name = uploadedFile 
      ? uploadedFile.name.replace(/\.[^/.]+$/, "") + "_extracted.csv" 
      : "extracted_bank_statement.csv";
    link.setAttribute("href", url);
    link.setAttribute("download", name);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };



  return (
    <div id="app-root" className="min-h-screen flex bg-slate-50 text-slate-900 font-sans antialiased overflow-x-hidden">
      
      {/* Hidden file input - ALWAYS mounted globally so any header/button clicks trigger of fileInputRef succeeds */}
      <input
        id="hidden-file-input"
        ref={fileInputRef}
        type="file"
        accept="application/pdf,image/*"
        multiple
        onChange={handleFileChange}
        className="hidden"
      />

      {/* 1. Brand Sidebar Navigation */}
      <aside className="w-64 bg-slate-900 text-slate-300 hidden md:flex flex-col border-r border-slate-800 flex-shrink-0">
        <div className="p-6 border-b border-slate-800 flex items-center gap-3">
          <div className="w-9 h-9 bg-indigo-600 rounded-lg flex items-center justify-center text-white font-black tracking-wider shadow-md">
            OCR
          </div>
          <div>
            <span className="font-extrabold text-white tracking-tight text-lg block">BankSnap OCR</span>
            <span className="text-[10px] text-indigo-400 tracking-wider font-semibold uppercase">Financial Parser</span>
          </div>
        </div>

        {/* Navigation Sidebar List */}
        <nav className="flex-grow p-4 space-y-2 overflow-y-auto">
          <div className="text-xs font-bold text-slate-500 uppercase px-3 mb-2 tracking-widest">Workspace</div>
          <button 
            id="nav-extract"
            onClick={() => setActiveTab("extraction")}
            className={`w-full px-4 py-2.5 rounded-lg flex items-center justify-between text-sm transition-all text-left ${
              activeTab === "extraction" 
                ? "bg-indigo-600 text-white font-bold shadow-md" 
                : "hover:bg-slate-800/80 text-slate-300 hover:text-white"
            }`}
          >
            <span className="flex items-center gap-2.5">
              <FileText className="w-4 h-4" />
              Extraction Pipeline
            </span>
            <span className="bg-slate-950/40 text-[10px] px-2 py-0.5 rounded-md font-mono">v3.5</span>
          </button>

          <button 
            id="nav-analytics"
            onClick={() => setActiveTab("analytics")}
            className={`w-full px-4 py-2.5 rounded-lg flex items-center justify-between text-sm transition-all text-left ${
              activeTab === "analytics" 
                ? "bg-indigo-600 text-white font-bold shadow-md" 
                : "hover:bg-slate-800/80 text-slate-300 hover:text-white"
            }`}
          >
            <span className="flex items-center gap-2.5">
              <Layers className="w-4 h-4" />
              Audits & Analytics
            </span>
            <span className="bg-slate-950/40 text-[10px] px-2 py-0.5 rounded-md font-mono">Live</span>
          </button>

          <div className="pt-6 text-xs font-bold text-slate-500 uppercase px-3 mb-2 tracking-widest">Active Statement</div>
          {uploadedFile ? (
            <div className="px-3 py-3 rounded-lg bg-slate-800/50 border border-slate-800 space-y-2.5">
              <div className="flex items-start gap-2 min-w-0">
                <FileText className="w-4 h-4 text-indigo-400 mt-0.5 flex-shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="text-xs text-white font-semibold truncate leading-tight select-all">
                    {uploadedFile.name}
                  </p>
                  <p className="text-[10px] text-slate-400 font-mono mt-0.5">
                    {uploadedFile.size}
                  </p>
                </div>
              </div>
              {showClearConfirm ? (
                <div className="space-y-1.5 pt-1">
                  <p className="text-[9px] text-red-300 font-bold text-center">Are you sure? This deletes active calculations.</p>
                  <div className="grid grid-cols-2 gap-1.5">
                    <button
                      onClick={() => {
                        handleClearAll();
                        setShowClearConfirm(false);
                      }}
                      className="text-center py-1 bg-red-600 hover:bg-red-700 active:bg-red-800 text-white text-[9px] font-bold rounded cursor-pointer"
                    >
                      Yes, Clear
                    </button>
                    <button
                      onClick={() => setShowClearConfirm(false)}
                      className="text-center py-1 bg-slate-700 hover:bg-slate-600 active:bg-slate-500 text-white text-[9px] font-bold rounded cursor-pointer"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => setShowClearConfirm(true)}
                  className="w-full text-center py-1.5 bg-red-950/40 hover:bg-red-900/50 border border-red-900/30 text-red-300 text-[10px] uppercase font-bold tracking-wider rounded-md transition-colors flex items-center justify-center gap-1 cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Clear Dataset
                </button>
              )}
            </div>
          ) : (
            <div className="px-3 py-4 text-center border border-dashed border-slate-800 rounded-lg text-slate-500 text-xs">
              Waiting for statement file upload...
            </div>
          )}

          <div className="pt-6 text-xs font-bold text-slate-500 uppercase px-3 mb-1 tracking-widest">Test Playground</div>
          <p className="text-[10px] text-slate-500 px-3 mb-2">No file ready? Pick a mock statement:</p>
          <div className="px-2 space-y-1">
            {SAMPLE_STATEMENTS.map((s) => (
              <button
                key={s.id}
                onClick={() => handleSelectSample(s.id)}
                className={`w-full px-2.5 py-1.5 rounded text-[11px] text-left transition-colors flex items-center gap-2 ${
                  selectedSampleId === s.id && !fileBase64
                    ? "bg-indigo-950 text-indigo-300 font-medium border-l-2 border-indigo-500"
                    : "text-slate-400 hover:bg-slate-800/40 hover:text-slate-200"
                }`}
              >
                <div className="w-1 h-1 rounded-full bg-indigo-500" />
                <span className="truncate">{s.bankName}</span>
              </button>
            ))}
          </div>
        </nav>

        {/* Sidebar Security Badge */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/40 text-slate-400">
          <div className="flex gap-2.5 items-start">
            <Shield className="w-4 h-4 text-emerald-400 mt-0.5 flex-shrink-0" />
            <div className="text-[11px] leading-relaxed">
              <p className="text-slate-200 font-semibold mb-0.5">Secure Sandbox Parsing</p>
              <p className="text-slate-400">All statements process in-memory. Transactions are parsed on a secure server and are never retained or logged.</p>
            </div>
          </div>
        </div>
      </aside>

      {/* 2. Main Content Dashboard */}
      <main className="flex-1 flex flex-col min-w-0">
        
        {/* Top Header */}
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-4 sm:px-8 shadow-2xs z-10 flex-shrink-0">
          <div className="flex items-center gap-4">
            <div className="md:hidden w-8 h-8 bg-indigo-600 rounded flex items-center justify-center text-white font-bold">
              B
            </div>
            <div>
              <h1 className="text-sm font-extrabold tracking-tight text-slate-800 uppercase">
                Smart Statement Auditor
              </h1>
              <p className="text-xs text-slate-500 hidden sm:block">
                Instantly extract, analyze, and audit structural transaction tables from financial statements
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              id="header-direct-upload-btn"
              onClick={() => fileInputRef.current?.click()}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-xs font-bold text-white rounded-lg shadow-sm hover:shadow-md transition-all cursor-pointer"
            >
              <Upload className="h-4 w-4" />
              Upload PDF
            </button>
          </div>
        </header>

        {/* Core Layout Stage */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto w-full">
          
          {!uploadedFile ? (
            /* Premium Empty State Workspace - No file preloaded */
            <div 
              onDragOver={handleDragOver}
              onDrop={handleDrop}
              className="max-w-xl mx-auto py-12 px-6 bg-white border border-slate-200 rounded-2xl shadow-sm text-center space-y-6"
            >
              <div className="w-16 h-16 bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center mx-auto shadow-xs border border-indigo-100">
                <Upload className="h-8 w-8 stroke-[1.5]" />
              </div>

              <div className="space-y-2">
                <h3 className="text-lg font-bold text-slate-800">No Statement Extracted</h3>
                <p className="text-sm text-slate-500 leading-relaxed max-w-md mx-auto">
                  Upload your bank or credit card statement as a PDF or image statement document. The secure parsing engine will automatically analyze the tabular files and isolate cash flows in real-time.
                </p>
              </div>

              {/* Upload Drop Zone Trigger Option */}
              <div 
                onClick={() => fileInputRef.current?.click()}
                onDragOver={handleDragOver}
                onDrop={handleDrop}
                className="p-8 border-2 border-dashed border-slate-300 hover:border-indigo-500 hover:bg-slate-50 rounded-xl cursor-pointer transition-all space-y-2"
              >
                <div id="inline-file-picker" className="p-2 py-1 bg-indigo-50 text-indigo-700 text-xs font-bold uppercase rounded-md w-fit mx-auto cursor-pointer">
                  Choose local file
                </div>
                <p className="text-xs text-slate-400">Supports PDF, PNG, or JPG up to 15MB</p>
              </div>

              <div className="pt-4 border-t border-slate-100 space-y-3">
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest">
                  Don't have a statement handy? Try a test run:
                </p>
                <div className="flex flex-wrap items-center justify-center gap-2">
                  {SAMPLE_STATEMENTS.map((s) => (
                    <button
                      key={s.id}
                      onClick={() => handleSelectSample(s.id)}
                      className="px-3 py-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-xs font-semibold text-slate-700 rounded-lg shadow-3xs cursor-pointer transition-all"
                    >
                      🚀 Inspect {s.bankName} Template
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            /* Active Statement Extraction Workspace */
            <div className="space-y-6">
              
              {/* Workspace Header Alert and Summary Ribbon */}
              <div className="bg-white border border-slate-200 rounded-xl p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-3xs">
                <div className="space-y-1">
                  <span className="text-[10px] bg-indigo-50 text-indigo-700 border border-indigo-100 px-2 py-0.5 rounded font-bold uppercase tracking-wider">
                    Extracted Statement Workspace
                  </span>
                  <h3 className="text-base font-extrabold text-slate-800 leading-tight">
                    {uploadedFile ? uploadedFile.name : "Active Extracted Statement"}
                  </h3>
                  <p className="text-xs text-slate-400">
                    Calculations automatically synchronize as you edit individual transaction dates, categories, or amounts below.
                  </p>
                </div>

                {/* View Style Switcher Toggle */}
                <div className="flex bg-slate-100 p-1 rounded-lg border border-slate-200 self-stretch sm:self-auto justify-center">
                  <button
                    onClick={() => setViewStyle("calculations")}
                    className={`flex-1 sm:flex-initial px-4 py-1.5 rounded-md text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                      viewStyle === "calculations"
                        ? "bg-white text-slate-900 shadow-3xs border border-slate-205"
                        : "text-slate-500 hover:text-slate-800"
                    }`}
                  >
                    📊 Calculations Summary
                  </button>
                  <button
                    onClick={() => setViewStyle("table")}
                    className={`flex-1 sm:flex-initial px-4 py-1.5 rounded-md text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                      viewStyle === "table"
                        ? "bg-white text-slate-900 shadow-3xs border border-slate-205"
                        : "text-slate-500 hover:text-slate-800"
                    }`}
                  >
                    🎛️ Spreadsheet Grid
                  </button>
                </div>
              </div>

              {/* Tab Selection Row */}
              <div className="border-b border-slate-200 flex justify-between items-center bg-white p-2 rounded-xl border">
                <div className="flex gap-1">
                  <button
                    id="tab-btn-extract"
                    onClick={() => setActiveTab("extraction")}
                    className={`px-4 py-2 rounded-lg text-xs font-bold tracking-wide uppercase transition-all cursor-pointer ${
                      activeTab === "extraction"
                        ? "bg-slate-900 text-white shadow-xs"
                        : "text-slate-500 hover:text-slate-800 hover:bg-slate-100"
                    }`}
                  >
                    📝 Statement Workspace
                  </button>
                  <button
                    id="tab-btn-analytics"
                    onClick={() => setActiveTab("analytics")}
                    className={`px-4 py-2 rounded-lg text-xs font-bold tracking-wide uppercase transition-all cursor-pointer ${
                      activeTab === "analytics"
                        ? "bg-slate-900 text-white shadow-xs"
                        : "text-slate-500 hover:text-slate-800 hover:bg-slate-100"
                    }`}
                  >
                    📊 Flow Metrics & Budgets
                  </button>
                </div>

                <div className="hidden lg:flex items-center gap-2.5 font-mono text-xs text-slate-400">
                  <span className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                    Memory Stored
                  </span>
                  <span>•</span>
                  <span>CSV Available</span>
                </div>
              </div>

              {/* Extraction Primary View Content */}
              {activeTab === "extraction" ? (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                  
                  {/* LEFT COLUMN: Input File & Pipeline controls */}
                  <div className="space-y-6 lg:col-span-1">
                    
                    {/* File Drop & Control Card */}
                    <div id="file-uploader-box" className="bg-white border border-slate-200 rounded-xl p-5 shadow-2xs">
                      <h3 className="text-sm font-bold text-slate-800 mb-3 flex items-center justify-between">
                        <span>Statement Input Document</span>
                        <span className="text-[10px] bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded font-bold font-mono">
                          PDF, PNG & JPG
                        </span>
                      </h3>

                      {/* Drag-and-drop Visual Area */}
                      <div
                        id="dropzone-area"
                        onDragOver={handleDragOver}
                        onDrop={handleDrop}
                        onClick={() => fileInputRef.current?.click()}
                        className={`aspect-[4/3] w-full border-2 border-dashed rounded-xl flex flex-col items-center justify-center p-4 text-center cursor-pointer transition-all ${
                          extractionStatus === "uploading"
                            ? "border-amber-400 bg-amber-50/20"
                            : uploadedFiles.length > 0
                            ? "border-emerald-500 bg-emerald-50/10"
                            : "border-slate-300 hover:border-indigo-500 hover:bg-slate-50/50 bg-slate-50/20"
                        }`}
                      >
                        {extractionStatus === "uploading" ? (
                          <div className="space-y-2 text-slate-500">
                            <Loader2 className="h-10 w-10 text-amber-500 animate-spin mx-auto" />
                            <p className="text-xs font-semibold">Reading statement file contents...</p>
                            <p className="text-[10px] text-slate-400">Please stand by</p>
                          </div>
                        ) : uploadedFiles.length > 0 ? (
                          <div className="space-y-2">
                            <span className="inline-block p-3 rounded-full bg-emerald-50 text-emerald-600 animate-pulse">
                              <Check className="h-6 w-6 stroke-[3]" />
                            </span>
                            <p className="text-xs font-bold text-slate-800">
                              {uploadedFiles.length} Statement{uploadedFiles.length > 1 ? "s" : ""} Loaded
                            </p>
                            <p className="text-[10px] text-slate-400 font-mono">
                              Staged in local workspace memory
                            </p>
                            <p className="text-[11px] text-emerald-700 font-semibold pt-1">
                              Ready for batch extraction!
                            </p>
                          </div>
                        ) : (
                          <div className="space-y-2 text-slate-500">
                            <Upload className="h-10 w-10 text-slate-400 mx-auto" />
                            <p className="text-xs font-bold text-slate-700 font-sans">Drag & drop statements here</p>
                            <p className="text-[11px] text-slate-400">or click to browse multiple files</p>
                            <p className="text-[9px] text-indigo-500 font-bold tracking-wide uppercase">PDFs, PNGs, and JPGs</p>
                          </div>
                        )}
                      </div>

                      {/* Staged files list with individual deletion options */}
                      {uploadedFiles.length > 0 && (
                        <div className="mt-4 space-y-2 border-t border-slate-100 pt-3">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                              <FileText className="h-4 w-4 text-indigo-500" />
                              Staged Documents ({uploadedFiles.length})
                            </span>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleClearAllFilesOnly();
                              }}
                              className="text-[10px] text-red-500 hover:text-red-700 font-bold hover:underline cursor-pointer"
                            >
                              Clear Files
                            </button>
                          </div>
                          <div className="max-h-36 overflow-y-auto space-y-1.5 pr-1">
                            {uploadedFiles.map((file) => (
                              <div
                                key={file.id}
                                className="flex items-center justify-between p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                              >
                                <div className="flex items-center gap-2 min-w-0 flex-1">
                                  <FileText className="h-4.5 w-4.5 text-indigo-500 flex-shrink-0" />
                                  <div className="min-w-0 flex-1">
                                    <p className="font-semibold text-slate-700 truncate" title={file.name}>
                                      {file.name}
                                    </p>
                                    <p className="text-[10px] text-slate-450 font-mono">{file.size}</p>
                                  </div>
                                </div>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDeleteUploadedFile(file.id);
                                  }}
                                  className="p-1 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-md transition-colors cursor-pointer"
                                  title="Remove file"
                                >
                                  <X className="h-4.5 w-4.5" />
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Extract OCR Trigger Button */}
                      <div className="mt-4 space-y-2">
                        <button
                          id="trigger-extract-ocr-btn"
                          onClick={handleTriggerExtract}
                          disabled={!fileBase64 || extractionStatus === "processing"}
                          className={`w-full py-2.5 px-4 rounded-lg text-xs font-extrabold uppercase tracking-widest transition-all ${
                            !fileBase64
                              ? "bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200"
                              : extractionStatus === "processing"
                              ? "bg-amber-500 text-white cursor-wait flex items-center justify-center gap-2"
                              : "bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white shadow-md hover:shadow-lg cursor-pointer"
                          }`}
                        >
                          {extractionStatus === "processing" ? (
                            <>
                              <Loader2 className="h-4 w-4 animate-spin" />
                              Extracting Transactions...
                            </>
                          ) : (
                            "🚀 Audit & Extract Transactions"
                          )}
                        </button>

                        {/* Extraction Progress Info Box */}
                        {extractionStatus === "processing" && (
                          <div className="p-3 bg-indigo-50 border border-indigo-100 rounded-lg text-[11px] text-indigo-700 flex gap-2">
                            <Info className="h-4 w-4 text-indigo-505 flex-shrink-0 mt-0.5 animate-pulse" />
                            <p className="leading-relaxed">
                              Parsing transaction data securely to filter out headers, consolidate credits, and auto-classify dates and merchants. Usually takes 5-10 seconds.
                            </p>
                          </div>
                        )}

                        {extractionError && (
                          <div className="p-3.5 bg-rose-50 border border-rose-100 rounded-xl text-xs text-rose-800 flex gap-2 items-start animate-fade-in shadow-2xs">
                            <AlertTriangle className="h-4.5 w-4.5 text-rose-500 flex-shrink-0 mt-0.5" />
                            <div className="space-y-1">
                              <p className="font-bold text-rose-900">Parsing Notice</p>
                              <p className="leading-relaxed text-rose-800/90">{extractionError}</p>
                              <p className="text-[10px] text-rose-600/80 mt-1.5 font-medium">
                                Tip: Busy times on Google API servers are usually temporary. Click the extract button to trigger a recovery retry.
                              </p>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Live Output Data Controller Panel */}
                    <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-2xs space-y-4">
                      <div className="flex justify-between items-center">
                        <h3 className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
                          Spreadsheet CSV Actions
                        </h3>
                        <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded font-mono font-bold">
                          {transactions.length} rows
                        </span>
                      </div>

                      <p className="text-xs text-slate-500 leading-relaxed">
                        Once transactions are ready, download the raw `.csv` file, or click <strong className="font-semibold text-indigo-650">Copy for Sheets/Excel</strong> to copy table columns optimized for flawless, direct pasting into Google Sheets, Excel, or Airtable.
                      </p>

                      <div className="grid grid-cols-2 gap-2">
                        <button
                          id="action-copy-csv"
                          onClick={handleCopyCSV}
                          disabled={transactions.length === 0}
                          className={`py-2 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                            copiedCSV
                              ? "bg-emerald-600 text-white animate-pulse"
                              : "bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs"
                          }`}
                        >
                          {copiedCSV ? <Check className="h-4 w-4 stroke-[3]" /> : <Copy className="h-4 w-4" />}
                          {copiedCSV ? "Copied! Ready to Paste" : "Copy to Sheets/Excel"}
                        </button>

                        <button
                          id="action-download-csv"
                          onClick={handleDownloadCSV}
                          disabled={transactions.length === 0}
                          className="py-2 px-3 rounded-lg text-xs font-bold bg-slate-900 hover:bg-slate-800 text-white transition-all flex items-center justify-center gap-1.5 shadow-xs cursor-pointer"
                        >
                          <Download className="h-4 w-4" />
                          Download .CSV File
                        </button>
                      </div>

                      {/* CSV Preview Accordion Container */}
                      <div className="border border-slate-100 rounded-lg p-3 bg-slate-55 relative">
                        <div className="flex justify-between items-center mb-1.5">
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block font-mono">
                            CSV String Stream
                          </span>
                          <span className="text-[9px] text-indigo-500 font-semibold font-mono">
                            Ready to Paste
                          </span>
                        </div>
                        <pre className="text-[9px] font-mono p-2.5 bg-slate-950 text-indigo-200 rounded max-h-[140px] overflow-y-auto whitespace-pre leading-relaxed select-all">
                          {generatedCSV}
                        </pre>
                      </div>
                    </div>

                  </div>

                  {/* RIGHT COLUMN: Calculations Section OR Traditional spreadsheet grid */}
                  <div className="lg:col-span-2 space-y-6">
                    
                    {transactions.length === 0 ? (
                      <div className="bg-white border border-slate-200 rounded-xl p-8 shadow-3xs text-center space-y-6 max-w-lg mx-auto my-12">
                        <div className="w-14 h-14 bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center mx-auto border border-indigo-100 animate-pulse">
                          <Sparkles className="h-7 w-7 animate-bounce" />
                        </div>
                        <div className="space-y-2">
                          <h4 className="text-base font-extrabold text-slate-800">Staged & Ready to Extract</h4>
                          <p className="text-xs text-slate-500 leading-relaxed">
                            {uploadedFiles.length > 1 ? (
                              <>
                                Your <strong className="text-indigo-600 font-bold">{uploadedFiles.length} statement documents</strong> are loaded and staged in memory successfully. Click the button below to securely parse and audit all transactions combined!
                              </>
                            ) : (
                              <>
                                Your statement file <strong className="text-slate-850 font-bold">{uploadedFile?.name}</strong> is loaded and staged in memory successfully. Click the button below to securely parse and audit all individual transactions!
                              </>
                            )}
                          </p>
                        </div>
                        <div className="pt-2">
                          <button
                            onClick={handleTriggerExtract}
                            disabled={!fileBase64 || extractionStatus === "processing"}
                            className={`px-6 py-2.5 rounded-lg text-xs font-bold transition-all shadow-sm flex items-center gap-2 mx-auto cursor-pointer ${
                              !fileBase64
                                ? "bg-slate-100 text-slate-400 cursor-not-allowed"
                                : extractionStatus === "processing"
                                ? "bg-amber-500 text-white cursor-wait"
                                : "bg-indigo-600 hover:bg-indigo-700 text-white"
                            }`}
                          >
                            {extractionStatus === "processing" ? (
                              <>
                                <Loader2 className="h-4 w-4 animate-spin" />
                                Extracting...
                              </>
                            ) : (
                              <>
                                <Sparkles className="h-4 w-4" />
                                Extract Transactions Now
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    ) : viewStyle === "calculations" ? (
                      /* HIGHEST-PRIORITY DEMAND: Dedicated Real-time Summary Calculations Section instead of a table */
                      <div className="space-y-6">
                        
                        {/* 1. Large mathematical KPI Overview grid */}
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                          
                          {/* KPI: Total Records */}
                          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-3xs hover:shadow-2xs transition-all relative overflow-hidden group">
                            <div className="absolute top-0 left-0 w-1.5 h-full bg-slate-500"></div>
                            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Records</p>
                            <div className="flex items-baseline gap-2 mt-2">
                              <span className="text-3xl font-black text-slate-800 select-all font-mono">
                                {calculationSummary.totalRecords}
                              </span>
                              <span className="text-xs font-semibold text-slate-400">extracted rows</span>
                            </div>
                            <p className="text-[11px] text-slate-500 mt-1">Verified transaction dataset metrics</p>
                          </div>

                          {/* KPI: Total Spending */}
                          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-3xs hover:shadow-2xs transition-all relative overflow-hidden group">
                            <div className="absolute top-0 left-0 w-1.5 h-full bg-rose-500"></div>
                            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center justify-between">
                              Total Spending
                              <span className="text-xs text-rose-600 font-bold bg-rose-50 px-1.5 py-0.5 rounded flex items-center gap-0.5">
                                <TrendingDown className="w-3 h-3" /> OUT
                              </span>
                            </p>
                            <div className="flex items-baseline gap-1 mt-2">
                              <span className="text-2xl font-black text-rose-700 select-all font-mono">
                                -${calculationSummary.totalSpending.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </span>
                            </div>
                            <p className="text-[11px] text-slate-500 mt-2">Sum of negative charges & bills</p>
                          </div>

                          {/* KPI: Total Income */}
                          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-3xs hover:shadow-2xs transition-all relative overflow-hidden group">
                            <div className="absolute top-0 left-0 w-1.5 h-full bg-emerald-500"></div>
                            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center justify-between">
                              Total Income
                              <span className="text-xs text-emerald-600 font-bold bg-emerald-50 px-1.5 py-0.5 rounded flex items-center gap-0.5">
                                <TrendingUp className="w-3 h-3" /> IN
                              </span>
                            </p>
                            <div className="flex items-baseline gap-1 mt-2">
                              <span className="text-2xl font-black text-emerald-700 select-all font-mono">
                                +${calculationSummary.totalIncome.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </span>
                            </div>
                            <p className="text-[11px] text-slate-500 mt-2">Sum of direct deposits & credits</p>
                          </div>

                        </div>

                        {/* 4th KPI banner: Net liquid statement balance */}
                        <div className={`p-4 rounded-xl border flex items-center justify-between bg-white shadow-3xs ${
                          calculationSummary.netRemaining >= 0 
                            ? "border-emerald-200 bg-emerald-50/10 text-emerald-950" 
                            : "border-amber-200 bg-amber-50/10 text-amber-950"
                        }`}>
                          <div className="flex items-center gap-2.5">
                            <span className={`p-2 rounded-lg flex items-center justify-center ${
                              calculationSummary.netRemaining >= 0 ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"
                            }`}>
                              {calculationSummary.netRemaining >= 0 ? "✓ Net Statement Surplus" : "⚠ Net Statement Deficit"}
                            </span>
                            <div>
                              <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider">Dynamic Liquid Account Balance</p>
                              <p className="text-xs text-slate-400 mt-0.5 font-sans">Derived inflow minus outflow calculations</p>
                            </div>
                          </div>
                          <span className={`text-xl font-extrabold font-mono ${
                            calculationSummary.netRemaining >= 0 ? "text-emerald-700" : "text-amber-700"
                          }`}>
                            {calculationSummary.netRemaining >= 0 ? "+" : ""}${calculationSummary.netRemaining.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </span>
                        </div>

                        {/* Interactive List Cards instead of a traditional tabular grid table */}
                        <div className="space-y-4">
                          <div className="flex items-center justify-between">
                            <h4 className="text-xs font-extrabold text-slate-500 uppercase tracking-widest">
                              Extracted Statements Line-Item Calculations
                            </h4>
                            <button
                              onClick={handleAddTransaction}
                              className="px-3 py-1 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-850 text-white rounded-lg text-xs font-bold transition-all shadow-3xs flex items-center gap-1 cursor-pointer"
                            >
                              <Plus className="w-3.5 h-3.5" />
                              Add Custom Transaction
                            </button>
                          </div>

                          <div className="space-y-3">
                            {transactions.map((tx) => (
                              <div 
                                key={tx.id} 
                                className={`bg-white border rounded-xl p-4 shadow-3xs hover:shadow-2xs transition-all space-y-3 relative group ${
                                  tx.isNew ? "border-indigo-200 ring-1 ring-indigo-50/50 bg-indigo-50/10" : "border-slate-200"
                                }`}
                              >
                                {/* Row Top Actions & Inputs (Date / Category / Delete) */}
                                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-2.5">
                                  <div className="flex items-center gap-2">
                                    {/* Date editor inline card */}
                                    <input 
                                      type="date"
                                      value={tx.date}
                                      onChange={(e) => handleUpdateTransaction(tx.id, { date: e.target.value })}
                                      className="bg-slate-50 hover:bg-slate-100/80 focus:bg-white text-xs font-mono text-slate-700 font-semibold px-2 py-1 rounded-md border-0 focus:ring-1 focus:ring-indigo-500 cursor-pointer transition-all"
                                    />
                                    
                                    {/* Category Select editor inline card */}
                                    <select
                                      value={tx.category.toLowerCase()}
                                      onChange={(e) => handleUpdateTransaction(tx.id, { category: e.target.value })}
                                      className="bg-slate-50 hover:bg-slate-100/80 focus:bg-white text-xs font-bold text-slate-600 px-2 py-1 rounded-md border-0 focus:ring-1 focus:ring-indigo-500 cursor-pointer transition-all"
                                    >
                                      {["salary", "groceries", "dining", "transport", "bills", "entertainment", "shopping", "health", "transfer", "fees", "other"].map((cat) => (
                                        <option key={cat} value={cat}>
                                          {cat.toUpperCase()}
                                        </option>
                                      ))}
                                    </select>
                                  </div>

                                  <button
                                    onClick={() => handleDeleteTransaction(tx.id)}
                                    className="p-1 px-1.5 text-slate-400 hover:text-red-700 rounded-lg bg-transparent hover:bg-red-50 transition-colors cursor-pointer"
                                    title="Delete line"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>

                                {/* Text & Numeric details segment */}
                                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 items-center">
                                  
                                  {/* Description Input Card */}
                                  <div className="sm:col-span-3">
                                    <input
                                      type="text"
                                      value={tx.description}
                                      placeholder="Merchant Description or Reference string..."
                                      onChange={(e) => handleUpdateTransaction(tx.id, { description: e.target.value })}
                                      className="w-full bg-slate-50 hover:bg-slate-100/50 focus:bg-white text-sm font-bold text-slate-800 px-2.5 py-1.5 rounded-lg border-0 focus:ring-1 focus:ring-indigo-500 transition-all font-sans"
                                    />
                                  </div>

                                  {/* Amount Numerical Input box */}
                                  <div className="sm:col-span-1 relative flex items-center bg-slate-50 rounded-lg px-2 border-0">
                                    <span className={`text-xs font-bold mr-1.5 ${tx.amount >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
                                      {tx.amount >= 0 ? "IN" : "OUT"}
                                    </span>
                                    <input
                                      type="number"
                                      step="0.01"
                                      value={tx.amount}
                                      onChange={(e) => handleUpdateTransaction(tx.id, { amount: parseFloat(e.target.value) || 0 })}
                                      className={`w-full bg-transparent text-sm font-mono font-bold border-0 p-1.5 focus:ring-0 ${
                                        tx.amount >= 0 ? "text-emerald-700" : "text-rose-700"
                                      }`}
                                    />
                                  </div>

                                </div>

                                {/* Monospace explanation notes input box */}
                                <div className="mt-1">
                                  <input
                                    type="text"
                                    value={tx.notes}
                                    placeholder="Add an explanatory bank audit annotation or notes rationale here..."
                                    onChange={(e) => handleUpdateTransaction(tx.id, { notes: e.target.value })}
                                    className="w-full bg-slate-50 hover:bg-slate-100/50 focus:bg-white text-[11px] text-slate-500 font-mono px-2.5 py-1 rounded-md border-0 focus:ring-1 focus:ring-indigo-500 transition-all"
                                  />
                                </div>

                              </div>
                            ))}
                          </div>

                        </div>

                      </div>
                    ) : (
                      /* Classic Wide tabular Spreadsheet style grid table */
                      <div className="space-y-6">
                        
                        {/* Active Statement extraction header badge bar */}
                        <div className="p-4 bg-white border border-slate-200 rounded-xl shadow-2xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                          <div>
                            <h3 className="text-sm font-bold text-slate-800">
                              Statement Extraction: <span className="text-indigo-600">{uploadedFile ? uploadedFile.name : "Active Extracted Statement"}</span>
                            </h3>
                            <p className="text-xs text-slate-400 mt-0.5">
                              Dates standard: <span className="font-mono">YYYY-MM-DD</span> • Expenses: <span className="font-mono text-slate-600 font-semibold">negative (-)</span> • Income: <span className="font-mono text-emerald-600 font-semibold">positive (+)</span>
                            </p>
                          </div>

                          {/* Dynamic Indicators */}
                          <div className="flex flex-wrap gap-2">
                            <span className="inline-flex items-center gap-1 text-[10px] bg-slate-100 border border-slate-200 text-slate-600 px-2 py-0.5 rounded font-bold">
                              <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse"></span>
                              Editable Row Model
                            </span>
                            <span className="inline-flex items-center gap-1 text-[10px] bg-emerald-50 border border-emerald-200 text-emerald-700 px-2 py-0.5 rounded font-bold">
                              <CheckCircle className="h-3 w-3 text-emerald-500" />
                              Headers Dropped
                            </span>
                          </div>
                        </div>

                        {/* Traditional Spreadsheet sheet grid */}
                        <TransactionTable
                          transactions={transactions}
                          onUpdateTransaction={handleUpdateTransaction}
                          onDeleteTransaction={handleDeleteTransaction}
                          onAddTransaction={handleAddTransaction}
                          onResetTransactions={handleResetTransactions}
                        />

                      </div>
                    )}

                  </div>

                </div>
              ) : (
            
            /* Analytics & Flow Metrics Secondary Tab */
            <div className="space-y-6">
              
              {/* Informative Header card */}
              <div id="analytics-info-banner" className="bg-white border border-slate-200 rounded-xl p-5 shadow-2xs">
                <h3 className="text-sm font-semibold text-slate-800 mb-2">
                  Statement Balance Reconciliation & Category Budgets
                </h3>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Analyze dynamic category classifications and flow totals automatically derived from the statement. All calculations (deposits, expenses, and transaction metrics) recalculate instantly in real-time as you edit transaction dates, values, and parameters in the table layout.
                </p>
              </div>

              {/* Dynamic Metrics grids and dashboards */}
              <AnalyticsPanel transactions={transactions} />

            </div>

          )}

            </div>
          )}

        </div>

      </main>



    </div>
  );
}
