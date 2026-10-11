/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * One image field: upload a file to the blob store (token-verified) or paste
 * an external URL. Shows a live preview and surfaces upload errors inline.
 */
import React, { useRef, useState } from 'react';
import { Image as ImageIcon, Loader2 } from 'lucide-react';
import { uploadMedia, MediaError, UploadKind } from '../services/media';

interface ImageUploadFieldProps {
  label: string;
  value: string;
  onChange: (url: string) => void;
  uid: string;
  kind: UploadKind;
  hint?: string;
  compact?: boolean;
}

export default function ImageUploadField({ label, value, onChange, uid, kind, hint, compact }: ImageUploadFieldProps) {
  const fileInput = useRef<HTMLInputElement>(null);
  const [isBusy, setIsBusy] = useState(false);
  const [error, setError] = useState('');

  const handleFile = async (file: File | undefined) => {
    if (!file) return;
    setError('');
    setIsBusy(true);
    try {
      const url = await uploadMedia(file, uid, kind);
      onChange(url);
    } catch (err) {
      setError(err instanceof MediaError ? err.message : 'The upload failed. Please try again.');
    } finally {
      setIsBusy(false);
      if (fileInput.current) fileInput.current.value = '';
    }
  };

  return (
    <div>
      <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-2">
        {label}
      </label>
      <div className={`flex gap-2 items-stretch ${compact ? 'flex-col sm:flex-row' : 'flex-col sm:flex-row'}`}>
        <button
          type="button"
          onClick={() => fileInput.current?.click()}
          disabled={isBusy}
          className="inline-flex items-center justify-center gap-2 bg-amber-50 hover:bg-amber-100/80 border border-amber-200 text-amber-800 font-bold rounded-xl px-4 py-3 text-xs transition-all disabled:opacity-60 whitespace-nowrap cursor-pointer"
        >
          {isBusy ? <Loader2 size={14} className="animate-spin" /> : <ImageIcon size={14} />}
          {isBusy ? 'Uploading…' : 'Upload image'}
        </button>
        <input
          ref={fileInput}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={(e) => handleFile(e.target.files?.[0])}
        />
        <input
          type="url"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="…or paste an image URL"
          className="flex-1 bg-gray-50 border border-gray-200 focus:border-amber-500 focus:bg-white rounded-xl px-4 py-3 text-sm outline-hidden text-gray-900"
        />
      </div>
      {hint && !error && <p className="text-[10px] text-gray-400 mt-1.5">{hint}</p>}
      {error && <p className="text-[10px] text-red-600 mt-1.5 font-semibold">{error}</p>}
      {value && (
        <img
          src={value}
          alt={`${label} preview`}
          referrerPolicy="no-referrer"
          className="mt-2 h-28 rounded-xl border object-cover bg-gray-100"
        />
      )}
    </div>
  );
}
