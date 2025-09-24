import React, { useState, useCallback } from 'react';
import { useFileDrop } from '../hooks/useDragAndDrop';
import { useToast } from './Toast';

interface ImageUploadProps {
  onUpload: (files: File[]) => void;
  accept?: string[];
  maxSize?: number; // in MB
  multiple?: boolean;
  preview?: boolean;
  className?: string;
}

export const ImageUpload: React.FC<ImageUploadProps> = ({
  onUpload,
  accept = ['image/*'],
  maxSize = 5,
  multiple = false,
  preview = true,
  className = ''
}) => {
  const [previews, setPreviews] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const { addToast } = useToast();

  const handleFilesSelected = useCallback((files: File[]) => {
    const validFiles: File[] = [];
    const newPreviews: string[] = [];

    files.forEach(file => {
      // Check file size
      if (file.size > maxSize * 1024 * 1024) {
        addToast({
          message: `File ${file.name} is too large. Maximum size is ${maxSize}MB.`,
          type: 'error'
        });
        return;
      }

      // Check file type
      const isValidType = accept.some(type => 
        type === 'image/*' || file.type === type || file.name.endsWith(type.replace('*', ''))
      );

      if (!isValidType) {
        addToast({
          message: `File ${file.name} is not a valid image type.`,
          type: 'error'
        });
        return;
      }

      validFiles.push(file);

      // Create preview
      if (preview) {
        const reader = new FileReader();
        reader.onload = (e) => {
          newPreviews.push(e.target?.result as string);
          setPreviews(prev => [...prev, ...newPreviews]);
        };
        reader.readAsDataURL(file);
      }
    });

    if (validFiles.length > 0) {
      onUpload(validFiles);
    }
  }, [accept, maxSize, preview, onUpload, addToast]);

  const { isDragActive, getDropProps } = useFileDrop({
    onDrop: handleFilesSelected
  }, accept);

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files ? Array.from(e.target.files) : [];
    handleFilesSelected(files);
  };

  const removePreview = (index: number) => {
    setPreviews(prev => prev.filter((_, i) => i !== index));
  };

  return (
    <div className={className}>
      <div
        {...getDropProps()}
        className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
          isDragActive
            ? 'border-rose-500 bg-rose-50'
            : 'border-gray-300 hover:border-gray-400'
        }`}
      >
        <div className="space-y-2">
          <svg
            className="mx-auto h-12 w-12 text-gray-400"
            stroke="currentColor"
            fill="none"
            viewBox="0 0 48 48"
          >
            <path
              d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          <div className="text-sm text-gray-600">
            <label htmlFor="file-upload" className="cursor-pointer text-rose-600 hover:text-rose-500">
              Click to upload
            </label>
            <span> or drag and drop</span>
          </div>
          <p className="text-xs text-gray-500">
            PNG, JPG, GIF up to {maxSize}MB
          </p>
        </div>
        <input
          id="file-upload"
          name="file-upload"
          type="file"
          className="sr-only"
          multiple={multiple}
          accept={accept.join(',')}
          onChange={handleFileInput}
        />
      </div>

      {preview && previews.length > 0 && (
        <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {previews.map((src, index) => (
            <div key={index} className="relative group">
              <img
                src={src}
                alt={`Preview ${index + 1}`}
                className="h-24 w-24 object-cover rounded-lg border border-gray-200"
              />
              <button
                onClick={() => removePreview(index)}
                className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};