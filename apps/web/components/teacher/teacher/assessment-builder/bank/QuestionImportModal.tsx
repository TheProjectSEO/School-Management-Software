'use client';

import { useState, useRef } from 'react';
import {
  QuestionType,
  DifficultyLevel,
  QuestionImportRow,
  ImportResult,
  QUESTION_TYPE_CONFIG,
} from '@/lib/types/assessment-builder';

interface QuestionImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (questions: QuestionImportRow[]) => Promise<ImportResult>;
  bankName: string;
}

export function QuestionImportModal({
  isOpen,
  onClose,
  onImport,
  bankName,
}: QuestionImportModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [parsedData, setParsedData] = useState<QuestionImportRow[]>([]);
  const [parseErrors, setParseErrors] = useState<string[]>([]);
  const [isImporting, setIsImporting] = useState(false);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [step, setStep] = useState<'upload' | 'preview' | 'result'>('upload');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    setFile(selectedFile);
    parseFile(selectedFile);
  };

  const parseFile = async (file: File) => {
    const text = await file.text();
    const errors: string[] = [];
    const rows: QuestionImportRow[] = [];

    try {
      if (file.name.endsWith('.json')) {
        // Parse JSON
        const data = JSON.parse(text);
        if (!Array.isArray(data)) {
          errors.push('JSON file must contain an array of questions');
        } else {
          data.forEach((item, index) => {
            const row = validateRow(item, index + 1, errors);
            if (row) rows.push(row);
          });
        }
      } else if (file.name.endsWith('.csv')) {
        // Parse CSV
        const lines = text.split('\n').filter((line) => line.trim());
        if (lines.length < 2) {
          errors.push('CSV file must have a header row and at least one data row');
        } else {
          const headers = parseCSVLine(lines[0]).map((h) => h.toLowerCase().trim());
          const requiredHeaders = ['type', 'prompt'];

          if (!requiredHeaders.every((h) => headers.includes(h))) {
            errors.push(`CSV must have these headers: ${requiredHeaders.join(', ')}`);
          } else {
            for (let i = 1; i < lines.length; i++) {
              const values = parseCSVLine(lines[i]);
              const item: Record<string, string> = {};
              headers.forEach((header, index) => {
                item[header] = values[index] || '';
              });

              const row = validateRow(item, i + 1, errors);
              if (row) rows.push(row);
            }
          }
        }
      } else {
        errors.push('Unsupported file format. Please use JSON or CSV.');
      }
    } catch (e) {
      errors.push(`Failed to parse file: ${e instanceof Error ? e.message : 'Unknown error'}`);
    }

    setParsedData(rows);
    setParseErrors(errors);
    if (rows.length > 0) {
      setStep('preview');
    }
  };

  const parseCSVLine = (line: string): string[] => {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];

      if (char === '"') {
        if (inQuotes && line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === ',' && !inQuotes) {
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    result.push(current.trim());

    return result;
  };

  const validateRow = (
    item: Record<string, unknown>,
    rowNum: number,
    errors: string[]
  ): QuestionImportRow | null => {
    const type = String(item.type || '').toLowerCase();
    const prompt = String(item.prompt || '').trim();

    // Validate type
    const validTypes: QuestionType[] = [
      'multiple_choice_single',
      'multiple_choice_multi',
      'true_false',
      'short_answer',
      'essay',
      'matching',
      'fill_in_blank',
    ];

    // Map common type names
    const typeMap: Record<string, QuestionType> = {
      'mcq': 'multiple_choice_single',
      'multiple_choice': 'multiple_choice_single',
      'multi_select': 'multiple_choice_multi',
      'tf': 'true_false',
      'truefalse': 'true_false',
      'short': 'short_answer',
      'text': 'short_answer',
      'long': 'essay',
      'match': 'matching',
      'fill': 'fill_in_blank',
      'blank': 'fill_in_blank',
      'fib': 'fill_in_blank',
    };

    const normalizedType = typeMap[type] || type as QuestionType;

    if (!validTypes.includes(normalizedType)) {
      errors.push(`Row ${rowNum}: Invalid question type "${type}"`);
      return null;
    }

    if (!prompt) {
      errors.push(`Row ${rowNum}: Missing question prompt`);
      return null;
    }

    // Validate difficulty
    const difficulty = String(item.difficulty || 'medium').toLowerCase();
    const validDifficulty: DifficultyLevel =
      difficulty === 'easy' ? 'easy' :
      difficulty === 'hard' ? 'hard' : 'medium';

    // Parse points
    const points = parseInt(String(item.points || '1'), 10);

    return {
      type: normalizedType,
      prompt,
      options: item.options ? String(item.options) : undefined,
      correctAnswer: item.correctAnswer || item.correct_answer || item.answer
        ? String(item.correctAnswer || item.correct_answer || item.answer)
        : undefined,
      explanation: item.explanation ? String(item.explanation) : undefined,
      points: isNaN(points) ? 1 : points,
      difficulty: validDifficulty,
      tags: item.tags ? String(item.tags) : undefined,
    };
  };

  const handleImport = async () => {
    setIsImporting(true);
    try {
      const result = await onImport(parsedData);
      setImportResult(result);
      setStep('result');
    } catch (error) {
      console.error('Import failed:', error);
      setImportResult({
        success: false,
        imported: 0,
        failed: parsedData.length,
        errors: [{ row: 0, error: 'Import failed' }],
      });
      setStep('result');
    } finally {
      setIsImporting(false);
    }
  };

  const handleClose = () => {
    setFile(null);
    setParsedData([]);
    setParseErrors([]);
    setImportResult(null);
    setStep('upload');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      <div className="absolute inset-0 bg-black/50" onClick={handleClose} />
      <div className="absolute inset-0 flex items-center justify-center p-4">
        <div className="w-full max-w-2xl rounded-2xl bg-white shadow-2xl max-h-[90vh] flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-msu-maroon/10">
                <span className="material-symbols-outlined text-msu-maroon">upload_file</span>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-slate-900">Import Questions</h3>
                <p className="text-sm text-slate-500">to {bankName}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={handleClose}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600"
            >
              <span className="material-symbols-outlined">close</span>
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6">
            {step === 'upload' && (
              <div className="space-y-6">
                {/* Upload Area */}
                <div
                  className="rounded-xl border-2 border-dashed border-slate-300 p-8 text-center hover:border-msu-maroon/50 transition-colors cursor-pointer"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".csv,.json"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                  <div className="flex h-16 w-16 items-center justify-center rounded-full bg-slate-100 mx-auto mb-4">
                    <span className="material-symbols-outlined text-3xl text-slate-400">
                      cloud_upload
                    </span>
                  </div>
                  <p className="text-sm font-medium text-slate-900 mb-1">
                    Click to upload or drag and drop
                  </p>
                  <p className="text-xs text-slate-500">CSV or JSON files</p>
                </div>

                {/* Format Instructions */}
                <div className="rounded-lg bg-slate-50 p-4">
                  <h4 className="font-medium text-slate-900 mb-3">File Format</h4>

                  <div className="space-y-4">
                    <div>
                      <p className="text-sm font-medium text-slate-700 mb-2">CSV Format:</p>
                      <pre className="text-xs bg-slate-100 p-3 rounded-lg overflow-x-auto">
{`type,prompt,options,correctAnswer,difficulty,points,tags
multiple_choice_single,"What is 2+2?","[""2"",""3"",""4"",""5""]","4",easy,1,"math,basics"
true_false,"The sky is blue.","","true",easy,1,"science"
short_answer,"What is the capital of France?","","Paris",medium,2,"geography"`}
                      </pre>
                    </div>

                    <div>
                      <p className="text-sm font-medium text-slate-700 mb-2">JSON Format:</p>
                      <pre className="text-xs bg-slate-100 p-3 rounded-lg overflow-x-auto">
{`[
  {
    "type": "multiple_choice_single",
    "prompt": "What is 2+2?",
    "options": ["2", "3", "4", "5"],
    "correctAnswer": "4",
    "difficulty": "easy"
  }
]`}
                      </pre>
                    </div>
                  </div>
                </div>

                {/* Parse Errors */}
                {parseErrors.length > 0 && (
                  <div className="rounded-lg bg-red-50 p-4">
                    <div className="flex items-center gap-2 text-red-700 mb-2">
                      <span className="material-symbols-outlined">error</span>
                      <span className="font-medium">Parsing Errors</span>
                    </div>
                    <ul className="space-y-1 text-sm text-red-600">
                      {parseErrors.slice(0, 5).map((error, i) => (
                        <li key={i}>{error}</li>
                      ))}
                      {parseErrors.length > 5 && (
                        <li>...and {parseErrors.length - 5} more errors</li>
                      )}
                    </ul>
                  </div>
                )}
              </div>
            )}

            {step === 'preview' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium text-slate-900">Preview</h4>
                    <p className="text-sm text-slate-500">
                      {parsedData.length} questions ready to import
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setStep('upload')}
                    className="text-sm text-msu-maroon hover:underline"
                  >
                    Choose different file
                  </button>
                </div>

                {parseErrors.length > 0 && (
                  <div className="rounded-lg bg-amber-50 p-3">
                    <div className="flex items-center gap-2 text-amber-700 text-sm">
                      <span className="material-symbols-outlined text-lg">warning</span>
                      {parseErrors.length} rows skipped due to errors
                    </div>
                  </div>
                )}

                <div className="rounded-lg border border-slate-200 overflow-hidden max-h-[300px] overflow-y-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-50 sticky top-0">
                      <tr>
                        <th className="text-left px-4 py-2 font-medium text-slate-700">#</th>
                        <th className="text-left px-4 py-2 font-medium text-slate-700">Type</th>
                        <th className="text-left px-4 py-2 font-medium text-slate-700">Prompt</th>
                        <th className="text-left px-4 py-2 font-medium text-slate-700">Difficulty</th>
                        <th className="text-left px-4 py-2 font-medium text-slate-700">Points</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {parsedData.map((row, index) => (
                        <tr key={index} className="hover:bg-slate-50">
                          <td className="px-4 py-2 text-slate-600">{index + 1}</td>
                          <td className="px-4 py-2">
                            <span className="inline-flex items-center gap-1 text-slate-700">
                              <span className="material-symbols-outlined text-sm text-slate-400">
                                {QUESTION_TYPE_CONFIG[row.type]?.icon || 'help'}
                              </span>
                              {QUESTION_TYPE_CONFIG[row.type]?.label || row.type}
                            </span>
                          </td>
                          <td className="px-4 py-2 text-slate-900 max-w-[200px] truncate">
                            {row.prompt}
                          </td>
                          <td className="px-4 py-2">
                            <span
                              className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                                row.difficulty === 'easy'
                                  ? 'bg-green-100 text-green-700'
                                  : row.difficulty === 'medium'
                                  ? 'bg-amber-100 text-amber-700'
                                  : 'bg-red-100 text-red-700'
                              }`}
                            >
                              {row.difficulty}
                            </span>
                          </td>
                          <td className="px-4 py-2 text-slate-600">{row.points}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {step === 'result' && importResult && (
              <div className="text-center py-6">
                <div
                  className={`flex h-20 w-20 items-center justify-center rounded-full mx-auto mb-4 ${
                    importResult.success ? 'bg-green-100' : 'bg-red-100'
                  }`}
                >
                  <span
                    className={`material-symbols-outlined text-4xl ${
                      importResult.success ? 'text-green-600' : 'text-red-600'
                    }`}
                  >
                    {importResult.success ? 'check_circle' : 'error'}
                  </span>
                </div>
                <h3 className="text-xl font-semibold text-slate-900 mb-2">
                  {importResult.success ? 'Import Complete' : 'Import Failed'}
                </h3>
                <p className="text-slate-600 mb-4">
                  {importResult.imported} questions imported successfully
                  {importResult.failed > 0 && `, ${importResult.failed} failed`}
                </p>

                {importResult.errors.length > 0 && (
                  <div className="rounded-lg bg-red-50 p-4 text-left mt-4">
                    <h4 className="font-medium text-red-700 mb-2">Errors:</h4>
                    <ul className="space-y-1 text-sm text-red-600">
                      {importResult.errors.slice(0, 5).map((err, i) => (
                        <li key={i}>Row {err.row}: {err.error}</li>
                      ))}
                      {importResult.errors.length > 5 && (
                        <li>...and {importResult.errors.length - 5} more errors</li>
                      )}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 border-t border-slate-200 px-6 py-4">
            <button
              type="button"
              onClick={handleClose}
              className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              {step === 'result' ? 'Done' : 'Cancel'}
            </button>
            {step === 'preview' && (
              <button
                type="button"
                onClick={handleImport}
                disabled={isImporting || parsedData.length === 0}
                className="flex items-center gap-2 rounded-lg bg-msu-maroon px-4 py-2 text-sm font-medium text-white hover:bg-msu-maroon/90 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isImporting ? (
                  <>
                    <span className="material-symbols-outlined animate-spin text-lg">
                      progress_activity
                    </span>
                    Importing...
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined text-lg">upload</span>
                    Import {parsedData.length} Questions
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
