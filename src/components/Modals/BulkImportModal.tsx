import { useState, useRef, useCallback } from 'react';
import { Upload, FileText, AlertCircle, CheckCircle2, X, ClipboardPaste, Trash2 } from 'lucide-react';
import Modal from '@/components/Common/Modal';
import Button from '@/components/Common/Button';
import { useAppStore } from '@/store/useAppStore';
import {
  parseHarvestRows,
  parseCostRows,
  countValidRows,
  readFileAsText,
  type ImportMode,
  type ParsedHarvestRow,
  type ParsedCostRow,
} from '@/utils/importUtils';
import { hasErrors, type ValidationErrors } from '@/utils/validationUtils';
import { cn } from '@/lib/utils';
import type { Harvest, Cost } from '@/types';
import { formatCurrency, formatWeight } from '@/utils/calculationUtils';

interface BulkImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  mode: ImportMode;
  onImported?: (count: number) => void;
}

type Row = ParsedHarvestRow | ParsedCostRow;

export default function BulkImportModal({
  isOpen,
  onClose,
  mode,
  onImported,
}: BulkImportModalProps) {
  const {
    seasons,
    fields,
    addHarvest,
    addCost,
  } = useAppStore();

  const [text, setText] = useState('');
  const [rows, setRows] = useState<Row[]>([]);
  const [parsed, setParsed] = useState(false);
  const [importing, setImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const title = mode === 'harvest' ? '批量导入收成' : '批量导入成本';

  const parseText = useCallback(
    (content: string) => {
      if (!content.trim()) {
        setRows([]);
        setParsed(false);
        return;
      }
      const parsedRows =
        mode === 'harvest'
          ? parseHarvestRows(content, seasons, fields)
          : parseCostRows(content, seasons, fields);
      setRows(parsedRows);
      setParsed(true);
    },
    [mode, seasons, fields]
  );

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const content = await readFileAsText(file);
      setText(content);
      parseText(content);
    } catch (err) {
      console.error('读取文件失败:', err);
      alert('读取文件失败');
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handlePaste = async () => {
    try {
      const content = await navigator.clipboard.readText();
      setText(content);
      parseText(content);
    } catch (err) {
      alert('无法读取剪贴板，请手动粘贴到文本框');
    }
  };

  const handleImport = async () => {
    if (importing) return;
    setImporting(true);
    try {
      let count = 0;
      for (const row of rows) {
        if (hasErrors(row.errors) || !row.data || !row.seasonId) continue;
        try {
          if (mode === 'harvest') {
            await addHarvest(row.data as Omit<Harvest, 'id' | 'createdAt'>);
          } else {
            await addCost(row.data as Omit<Cost, 'id' | 'createdAt'>);
          }
          count++;
        } catch (e) {
          console.warn('单行导入失败:', e);
        }
      }
      onImported?.(count);
      handleClose();
    } finally {
      setImporting(false);
    }
  };

  const handleClose = () => {
    setText('');
    setRows([]);
    setParsed(false);
    setImporting(false);
    onClose();
  };

  const validCount = countValidRows(rows);
  const invalidCount = rows.length - validCount;

  const exampleHint =
    mode === 'harvest'
      ? '示例表头（任选组合）：地块,作物,年份,采收日期,产量,单价,质量,备注'
      : '示例表头（任选组合）：地块,作物,年份,日期,分类,项目名称,金额,备注';

  const renderRowErrors = (errors: ValidationErrors) => {
    const entries = Object.entries(errors);
    if (entries.length === 0) return null;
    return (
      <div className="mt-1 flex flex-wrap gap-1">
        {entries.map(([k, v]) => (
          <span key={k} className="text-xs bg-red-50 text-red-700 px-2 py-0.5 rounded">
            {v}
          </span>
        ))}
      </div>
    );
  };

  const renderRowWarnings = (warnings: string[]) => {
    if (warnings.length === 0) return null;
    return (
      <div className="mt-1 flex flex-wrap gap-1">
        {warnings.map((w, i) => (
          <span key={i} className="text-xs bg-yellow-50 text-yellow-700 px-2 py-0.5 rounded">
            {w}
          </span>
        ))}
      </div>
    );
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      size="xl"
      title={title}
      footer={
        <>
          <Button variant="ghost" onClick={handleClose}>
            取消
          </Button>
          <Button
            variant="primary"
            onClick={handleImport}
            disabled={!parsed || validCount === 0 || importing}
            loading={importing}
          >
            确认导入 ({validCount} 条有效)
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 text-sm text-gray-600">
          <p className="font-medium text-gray-800 mb-1">支持两种导入方式：</p>
          <p>1. 上传 CSV / TSV 文件</p>
          <p>2. 粘贴 Excel 表格或 CSV 文本</p>
          <p className="mt-2 text-gray-500">{exampleHint}</p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            size="sm"
            leftIcon={<Upload className="w-4 h-4" />}
            onClick={() => fileInputRef.current?.click()}
          >
            选择文件
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,.tsv,.txt"
            className="hidden"
            onChange={handleFile}
          />
          <Button
            variant="outline"
            size="sm"
            leftIcon={<ClipboardPaste className="w-4 h-4" />}
            onClick={handlePaste}
          >
            从剪贴板粘贴
          </Button>
          {text && (
            <Button
              variant="ghost"
              size="sm"
              leftIcon={<Trash2 className="w-4 h-4" />}
              onClick={() => {
                setText('');
                setRows([]);
                setParsed(false);
              }}
            >
              清空
            </Button>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            粘贴或编辑数据
          </label>
          <textarea
            value={text}
            onChange={(e) => {
              setText(e.target.value);
              parseText(e.target.value);
            }}
            placeholder="在此粘贴表格内容或 CSV 文本..."
            className="w-full h-32 px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-farm-500"
          />
        </div>

        {parsed && rows.length > 0 && (
          <div className="flex items-center gap-4 text-sm">
            <div className="flex items-center gap-1.5">
              <FileText className="w-4 h-4 text-gray-500" />
              <span className="text-gray-700">共 {rows.length} 行</span>
            </div>
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-green-600" />
              <span className="text-green-700">{validCount} 条有效</span>
            </div>
            <div className="flex items-center gap-1.5">
              <AlertCircle className="w-4 h-4 text-red-600" />
              <span className="text-red-700">{invalidCount} 条异常</span>
            </div>
          </div>
        )}

        {parsed && rows.length > 0 && (
          <div className="border border-gray-200 rounded-lg max-h-80 overflow-y-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 sticky top-0">
                <tr>
                  <th className="px-3 py-2 text-left text-gray-600 w-12">行</th>
                  <th className="px-3 py-2 text-left text-gray-600">关键信息</th>
                  <th className="px-3 py-2 text-left text-gray-600">状态</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {rows.map((row, idx) => {
                  const ok = !hasErrors(row.errors);
                  const d = row.data as any;
                  let summary = '';
                  if (mode === 'harvest') {
                    summary = `${d?.harvestDate || '-'} · 产量 ${formatWeight(d?.actualYield || 0)} · 单价 ${formatCurrency(d?.unitPrice || 0)} · ${d?.quality || ''}`;
                  } else {
                    summary = `${d?.date || '-'} · ${d?.category || ''} · ${d?.name || ''} · ${formatCurrency(d?.amount || 0)}`;
                  }
                  return (
                    <tr
                      key={idx}
                      className={cn(ok ? 'bg-white' : 'bg-red-50/50')}
                    >
                      <td className="px-3 py-2 text-gray-500">{row.rowIndex}</td>
                      <td className="px-3 py-2 text-gray-800">
                        <div>
                          <span className="text-xs text-gray-500">
                            {row.raw['地块'] || row.raw['作物'] || row.raw['field'] || ''}
                          </span>
                          <div className="text-sm">{summary}</div>
                        </div>
                        {renderRowWarnings(row.warnings)}
                        {renderRowErrors(row.errors)}
                      </td>
                      <td className="px-3 py-2">
                        {ok ? (
                          <span className="inline-flex items-center gap-1 text-xs text-green-700">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            有效
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-xs text-red-700">
                            <X className="w-3.5 h-3.5" />
                            异常
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </Modal>
  );
}
