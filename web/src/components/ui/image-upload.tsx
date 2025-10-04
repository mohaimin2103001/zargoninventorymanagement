'use client';

import { useState, useRef } from 'react';
import Image from 'next/image';
import { Button } from './button';
import { Input } from './input';
import { Upload, X, Image as ImageIcon } from 'lucide-react';

interface ImageUploadProps {
  images: string[];
  onImagesChange: (images: string[]) => void;
  onUpload: (files: File[]) => Promise<string[]>;
  onRemove: (imageUrl: string) => Promise<void>;
  maxImages?: number;
  disabled?: boolean;
  componentId?: string;
}

export function ImageUpload({
  images,
  onImagesChange,
  onUpload,
  onRemove,
  maxImages = 5,
  disabled = false,
  componentId
}: ImageUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [removing, setRemoving] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    if (files.length === 0) return;

    // Check if adding these files would exceed the limit
    if (images.length + files.length > maxImages) {
      alert(`Maximum ${maxImages} images allowed`);
      return;
    }

    setUploading(true);
    try {
      const newImageUrls = await onUpload(files);
      onImagesChange([...images, ...newImageUrls]);
    } catch (error) {
      console.error('Upload failed:', error);
      alert('Failed to upload images');
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleRemove = async (imageUrl: string) => {
    setRemoving(imageUrl);
    try {
      await onRemove(imageUrl);
      onImagesChange(images.filter(url => url !== imageUrl));
    } catch (error) {
      console.error('Remove failed:', error);
      alert('Failed to remove image');
    } finally {
      setRemoving(null);
    }
  };

  const triggerFileSelect = () => {
    if (!disabled && fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium text-gray-700">
          Product Images ({images.length}/{maxImages})
        </label>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={triggerFileSelect}
          disabled={disabled || uploading || images.length >= maxImages}
          className="flex items-center gap-2"
        >
          <Upload className="w-4 h-4" />
          {uploading ? 'Uploading...' : 'Add Images'}
        </Button>
      </div>

      <Input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        onChange={handleFileSelect}
        className="hidden"
        data-component={componentId}
      />

      {images.length === 0 ? (
        <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
          <ImageIcon className="w-12 h-12 mx-auto text-gray-400 mb-4" />
          <p className="text-sm text-gray-500">No images uploaded yet</p>
          <p className="text-xs text-gray-400 mt-1">
            Click &quot;Add Images&quot; to upload product photos
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {images.map((imageUrl, index) => (
            <div key={index} className="relative group">
              <div className="relative aspect-square rounded-lg overflow-hidden border border-gray-200">
                <Image
                  src={imageUrl}
                  alt={`Product image ${index + 1}`}
                  fill
                  className="object-cover"
                  sizes="(max-width: 768px) 50vw, (max-width: 1024px) 33vw, 25vw"
                />
              </div>
              <button
                type="button"
                onClick={() => handleRemove(imageUrl)}
                disabled={disabled || removing === imageUrl}
                className="absolute -top-2 -right-2 p-1 bg-red-500 text-white rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-opacity disabled:opacity-50"
              >
                <X className="w-4 h-4" />
              </button>
              {removing === imageUrl && (
                <div className="absolute inset-0 bg-white bg-opacity-75 flex items-center justify-center rounded-lg">
                  <div className="text-sm text-gray-600">Removing...</div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <p className="text-xs text-gray-500">
        Supported formats: JPG, PNG, WebP. Max file size: 5MB per image.
      </p>
    </div>
  );
}
