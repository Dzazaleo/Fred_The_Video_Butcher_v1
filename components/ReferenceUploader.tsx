import React, { useRef } from 'react';
import { Image as ImageIcon, Upload, RefreshCw } from 'lucide-react';

interface ReferenceUploaderProps {
  imageSrc: string | null;
  onImageSelected: (file: File, url: string) => void;
}

export const ReferenceUploader: React.FC<ReferenceUploaderProps> = ({ 
  imageSrc, 
  onImageSelected 
}) => {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      onImageSelected(file, url);
    }
  };

  return (
    <div 
      onClick={() => inputRef.current?.click()}
      className={`
        relative group cursor-pointer overflow-hidden rounded-xl border-2 border-dashed transition-all duration-200 h-32 w-full flex flex-col items-center justify-center bg-slate-50
        ${imageSrc 
          ? 'border-blue-200' 
          : 'border-slate-300 hover:border-slate-400 hover:bg-slate-100'
        }
      `}
    >
      <input 
        type="file" 
        ref={inputRef} 
        className="hidden" 
        accept="image/png, image/jpeg, image/jpg" 
        onChange={handleFileChange}
      />

      {imageSrc ? (
        <>
          <img 
            src={imageSrc} 
            alt="Reference Trigger" 
            className="w-full h-full object-contain p-2" 
          />
          <div className="absolute inset-0 bg-slate-900/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-[1px]">
            <span className="text-white text-xs font-bold uppercase tracking-wider flex items-center gap-2 px-3 py-1.5 bg-white/10 rounded-full backdrop-blur-sm border border-white/20">
              <RefreshCw size={12} /> Change
            </span>
          </div>
        </>
      ) : (
        <div className="flex flex-col items-center gap-2 p-4 text-center">
          <div className="p-2 bg-white rounded-lg shadow-sm border border-slate-200 group-hover:border-slate-300 transition-colors">
            <Upload size={16} className="text-slate-400 group-hover:text-slate-600" />
          </div>
          <div>
            <span className="text-xs font-semibold text-slate-600 block">Ref. Image</span>
            <span className="text-[10px] text-slate-400">PNG / JPG</span>
          </div>
        </div>
      )}
    </div>
  );
};