import React, { useState, useRef } from 'react';
import { Modal, Spinner } from '../ui';
import { FileSpreadsheet, Upload, Download, AlertCircle, CheckCircle2, X, FileText } from 'lucide-react';
import { toast } from 'react-hot-toast';

export interface BulkImportResult {
  totalRows?: number;
  importedCount?: number;
  skippedDuplicatesCount?: number;
  duplicates?: string[];
  errors?: string[];
  message?: string;
}

interface BulkExcelModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  templateFilename?: string;
  onDownloadTemplate: () => Promise<void>;
  onUpload: (file: File) => Promise<{ data?: BulkImportResult; message?: string }>;
  onSuccess: () => void;
  extraControls?: React.ReactNode;
}

export const BulkExcelModal: React.FC<BulkExcelModalProps> = ({
  open,
  onClose,
  title,
  subtitle = 'Quickly populate records in bulk by uploading a prepared spreadsheet.',
  templateFilename = 'template.xlsx',
  onDownloadTemplate,
  onUpload,
  onSuccess,
  extraControls,
}) => {
  const [file, setFile] = useState<File | null>(null);
  const [downloading, setDownloading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importErrors, setImportErrors] = useState<string[]>([]);
  const [duplicates, setDuplicates] = useState<string[]>([]);
  const [generalError, setGeneralError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const resetState = () => {
    setFile(null);
    setImportErrors([]);
    setDuplicates([]);
    setGeneralError(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleClose = () => {
    if (importing) return;
    resetState();
    onClose();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (selected) {
      setFile(selected);
      setImportErrors([]);
      setDuplicates([]);
      setGeneralError(null);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    const dropped = e.dataTransfer.files?.[0];
    if (dropped) {
      const ext = dropped.name.split('.').pop()?.toLowerCase();
      if (ext === 'xlsx' || ext === 'xls' || ext === 'csv') {
        setFile(dropped);
        setImportErrors([]);
        setDuplicates([]);
        setGeneralError(null);
      } else {
        toast.error('Please upload an Excel (.xlsx, .xls) or CSV (.csv) file');
      }
    }
  };

  const handleDownload = async () => {
    setDownloading(true);
    try {
      await onDownloadTemplate();
      toast.success('Template downloaded successfully');
    } catch {
      toast.error('Failed to download template');
    } finally {
      setDownloading(false);
    }
  };

  const handleSubmit = async () => {
    if (!file) {
      toast.error('Please select an Excel or CSV file first');
      return;
    }

    setImporting(true);
    setImportErrors([]);
    setDuplicates([]);
    setGeneralError(null);

    try {
      const res = await onUpload(file);
      const data = res?.data;
      const count = data?.importedCount ?? 0;
      const dupCount = data?.skippedDuplicatesCount ?? data?.duplicates?.length ?? 0;
      const errs = data?.errors || [];
      const dups = data?.duplicates || [];

      if (errs.length > 0) {
        setImportErrors(errs);
      }
      if (dups.length > 0) {
        setDuplicates(dups);
      }

      if (count > 0) {
        toast.success(
          `Successfully imported ${count} record${count === 1 ? '' : 's'}!${
            dupCount > 0 ? ` (${dupCount} duplicates skipped)` : ''
          }`
        );
        onSuccess();
        if (errs.length === 0) {
          handleClose();
        }
      } else if (errs.length === 0 && dupCount > 0) {
        toast('All rows were duplicates or already exist in the system.', { icon: 'ℹ️' });
      } else if (errs.length === 0) {
        toast.success(res?.message || 'Data imported successfully');
        onSuccess();
        handleClose();
      }
    } catch (err: any) {
      const msg = err.response?.data?.detail || err.response?.data?.message || err.message || 'Import failed';
      setGeneralError(msg);
      toast.error(msg);
    } finally {
      setImporting(false);
    }
  };

  return (
    <Modal open={open} onClose={handleClose} title={title} size="lg">
      <div className="space-y-4">
        {/* Template Download Card */}
        <div className="p-4 bg-slate-800/80 border border-slate-700/80 rounded-xl space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-white flex items-center gap-2">
                <FileSpreadsheet size={16} className="text-emerald-400" />
                Download Spreadsheet Template
              </p>
              <p className="text-xs text-slate-400 mt-0.5">
                {subtitle} Download our ready-to-use template with predefined columns and sample data.
              </p>
            </div>
            <button
              type="button"
              onClick={handleDownload}
              disabled={downloading}
              className="btn-primary text-xs py-1.5 px-3 flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 border-0 flex-shrink-0"
            >
              {downloading ? <Spinner size={13} /> : <Download size={14} />}
              <span>Download (.xlsx)</span>
            </button>
          </div>
          <div className="text-[11px] text-emerald-400/90 bg-emerald-500/10 px-2.5 py-1.5 rounded-lg border border-emerald-500/20">
            ✨ Multi-tab workbooks (with Regions, Constituencies, Polling Stations) are auto-detected and linked in proper hierarchy order!
          </div>
        </div>

        {/* Optional Extra Controls (e.g. Region or Constituency fallback selectors) */}
        {extraControls && (
          <div className="p-3.5 bg-slate-800/40 border border-slate-700/50 rounded-xl">
            {extraControls}
          </div>
        )}

        {/* File Dropzone / Selector */}
        <div>
          <label className="label">Select or Drag & Drop File (.xlsx, .xls, .csv) *</label>
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx, .xls, .csv"
            onChange={handleFileChange}
            className="hidden"
            id="bulk-excel-input"
          />

          {!file ? (
            <label
              htmlFor="bulk-excel-input"
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleDrop}
              className="border-2 border-dashed border-slate-700 hover:border-emerald-500/70 rounded-xl p-6 flex flex-col items-center justify-center cursor-pointer bg-slate-800/20 hover:bg-slate-800/40 transition-colors"
            >
              <div className="w-12 h-12 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-400 mb-2">
                <Upload size={22} />
              </div>
              <span className="text-sm font-medium text-slate-200">Click to browse or drop file here</span>
              <span className="text-xs text-slate-400 mt-1">Supports Microsoft Excel (.xlsx, .xls) and CSV (.csv)</span>
            </label>
          ) : (
            <div className="p-4 bg-slate-800/60 border border-emerald-500/30 rounded-xl flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-400 flex-shrink-0">
                  <FileText size={20} />
                </div>
                <div>
                  <p className="text-sm font-medium text-white">{file.name}</p>
                  <p className="text-xs text-slate-400">
                    {(file.size / 1024).toFixed(1)} KB • Ready to import
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <label
                  htmlFor="bulk-excel-input"
                  className="btn-ghost text-xs py-1 px-2.5 text-slate-300 hover:text-white cursor-pointer"
                >
                  Change
                </label>
                <button
                  type="button"
                  onClick={resetState}
                  className="p-1 text-slate-400 hover:text-red-400 transition-colors"
                  title="Remove file"
                >
                  <X size={16} />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* General Error Banner */}
        {generalError && (
          <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-xs flex items-start gap-2">
            <AlertCircle size={16} className="mt-0.5 flex-shrink-0" />
            <span>{generalError}</span>
          </div>
        )}

        {/* Skipped Duplicates */}
        {duplicates.length > 0 && (
          <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl space-y-1">
            <p className="text-xs font-semibold text-amber-300 flex items-center gap-1.5">
              <AlertCircle size={14} /> Skipped Duplicates ({duplicates.length})
            </p>
            <div className="max-h-24 overflow-y-auto space-y-0.5 text-[11px] text-amber-200/80">
              {duplicates.map((dup, i) => (
                <div key={i}>• {dup}</div>
              ))}
            </div>
          </div>
        )}

        {/* Validation Errors */}
        {importErrors.length > 0 && (
          <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl space-y-1">
            <p className="text-xs font-semibold text-red-300 flex items-center gap-1.5">
              <AlertCircle size={14} /> Row Errors ({importErrors.length})
            </p>
            <div className="max-h-28 overflow-y-auto space-y-0.5 text-[11px] text-red-200/80">
              {importErrors.map((err, i) => (
                <div key={i}>• {err}</div>
              ))}
            </div>
          </div>
        )}

        {/* Modal Actions */}
        <div className="flex justify-end gap-3 pt-3 border-t border-slate-700/60">
          <button
            type="button"
            onClick={handleClose}
            className="btn-secondary text-xs"
            disabled={importing}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!file || importing}
            className="btn-primary text-xs py-2 px-4 flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 border-0 disabled:opacity-50"
          >
            {importing ? (
              <>
                <Spinner size={14} />
                <span>Importing records...</span>
              </>
            ) : (
              <>
                <CheckCircle2 size={15} />
                <span>Import Data</span>
              </>
            )}
          </button>
        </div>
      </div>
    </Modal>
  );
};
