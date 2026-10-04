'use client';

import * as React from 'react';
import { Avatar } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { uploadAvatarAction } from '@/lib/actions/profile';
import { Upload, AlertCircle, CheckCircle2 } from 'lucide-react';

interface AvatarUploaderProps {
  currentAvatarUrl: string | null;
  fullName: string;
}

export function AvatarUploader({ currentAvatarUrl, fullName }: AvatarUploaderProps) {
  const [avatarUrl, setAvatarUrl] = React.useState<string | null>(currentAvatarUrl);
  const [isUploading, setIsUploading] = React.useState(false);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);
  const [successMessage, setSuccessMessage] = React.useState<string | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setErrorMessage(null);
    setSuccessMessage(null);

    // Validate size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      setErrorMessage('Image must be smaller than 2MB.');
      return;
    }

    // Validate format
    const allowed = ['image/png', 'image/jpeg', 'image/webp'];
    if (!allowed.includes(file.type)) {
      setErrorMessage('Only PNG, JPEG, or WebP images are supported.');
      return;
    }

    setIsUploading(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const result = await uploadAvatarAction(formData);
      if (!result.success) {
        setErrorMessage(result.error.message);
      } else {
        setAvatarUrl(result.data.avatarUrl);
        setSuccessMessage('Avatar uploaded successfully!');
        setTimeout(() => setSuccessMessage(null), 3000);
      }
    } catch {
      setErrorMessage('Failed to upload image. Please try again.');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }

  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-4 py-2">
      <Avatar
        src={avatarUrl}
        alt={fullName}
        fallbackText={fullName}
        size="lg"
        className="ring-2 ring-border-subtle"
      />

      <div className="space-y-1.5">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp"
          className="hidden"
          onChange={handleFileChange}
          disabled={isUploading}
        />

        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            isLoading={isUploading}
            className="gap-1.5 text-xs"
          >
            <Upload className="h-3.5 w-3.5" />
            Upload Avatar
          </Button>
        </div>

        <p className="text-[11px] text-content-muted">
          PNG, JPEG, or WebP. Max 2MB. Square recommended.
        </p>

        {errorMessage && (
          <p className="flex items-center gap-1 text-xs text-status-danger">
            <AlertCircle className="h-3 w-3" />
            {errorMessage}
          </p>
        )}

        {successMessage && (
          <p className="flex items-center gap-1 text-xs text-status-success">
            <CheckCircle2 className="h-3 w-3" />
            {successMessage}
          </p>
        )}
      </div>
    </div>
  );
}
