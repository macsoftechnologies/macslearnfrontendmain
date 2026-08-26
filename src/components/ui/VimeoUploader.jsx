import { useState, useRef, useEffect } from 'react';
import * as tus from 'tus-js-client';
import { Upload, CheckCircle, AlertCircle, Loader } from 'lucide-react';
import Button from './Button';
import client from '../../api/client';

export default function VimeoUploader({ 
  onUploaded, 
  onUploadStateChange, 
  onProgressUpdate,
  label = 'Upload Video', 
  videoName = 'Untitled Video', 
  autoUploadFile = null, 
  triggerUploadCount = 0 
}) {
  const [file, setFile] = useState(autoUploadFile || null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [bytesInfo, setBytesInfo] = useState({ uploaded: 0, total: 0 });
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const uploadRef = useRef(null);
  const fileInputRef = useRef(null);
  const prevTriggerRef = useRef(triggerUploadCount);

  // Notify parent whenever uploading state changes
  useEffect(() => {
    if (onUploadStateChange) {
      onUploadStateChange(uploading);
    }
  }, [uploading, onUploadStateChange]);

  // Trigger batch upload when parent clicks "Upload All" button
  useEffect(() => {
    if (triggerUploadCount > 0 && triggerUploadCount !== prevTriggerRef.current) {
      prevTriggerRef.current = triggerUploadCount;
      if (file && !uploading && !success) {
        performUpload(file);
      }
    }
  }, [triggerUploadCount, file, uploading, success]);

  // Handle auto-passed file
  useEffect(() => {
    if (autoUploadFile) {
      setFile(autoUploadFile);
    }
  }, [autoUploadFile]);

  const handleFileChange = (e) => {
    const selected = e.target.files[0];
    if (selected) {
      if (!selected.type.startsWith('video/') && !selected.name.match(/\.(mp4|mov|mkv|avi|webm|m4v)$/i)) {
        setError('Please select a valid video file (.mp4, .mov, .mkv, .webm).');
        return;
      }
      setFile(selected);
      setError(null);
      setSuccess(false);
      setProgress(0);
      onProgressUpdate?.({
        progress: 0,
        uploadedBytes: 0,
        totalBytes: selected.size,
        status: 'idle',
        fileName: selected.name
      });
    }
  };

  const performUpload = async (fileToUpload) => {
    const targetFile = fileToUpload || file;
    if (!targetFile) return;

    setUploading(true);
    setError(null);
    onProgressUpdate?.({
      progress: 0,
      uploadedBytes: 0,
      totalBytes: targetFile.size,
      status: 'uploading',
      fileName: targetFile.name
    });

    try {
      // 1. Get ticket from our backend
      const res = await client.post('/vimeo/upload-ticket', {
        fileSize: targetFile.size,
        videoName: videoName || targetFile.name,
      });

      const { uploadLink, link } = res.data.data || res.data;

      // 2. Start tus upload directly to Vimeo
      const upload = new tus.Upload(targetFile, {
        uploadUrl: uploadLink,
        onError: (err) => {
          setError('Failed to upload video: ' + err.message);
          setUploading(false);
          onProgressUpdate?.({
            progress: 0,
            uploadedBytes: 0,
            totalBytes: targetFile.size,
            status: 'error',
            error: err.message,
            fileName: targetFile.name
          });
        },
        onProgress: (bytesUploaded, bytesTotal) => {
          const percentage = ((bytesUploaded / bytesTotal) * 100).toFixed(1);
          setProgress(Number(percentage));
          setBytesInfo({ uploaded: bytesUploaded, total: bytesTotal });
          onProgressUpdate?.({
            progress: Number(percentage),
            uploadedBytes: bytesUploaded,
            totalBytes: bytesTotal,
            status: 'uploading',
            fileName: targetFile.name
          });
        },
        onSuccess: () => {
          setSuccess(true);
          setUploading(false);
          onProgressUpdate?.({
            progress: 100,
            uploadedBytes: targetFile.size,
            totalBytes: targetFile.size,
            status: 'success',
            link,
            fileName: targetFile.name
          });
          onUploaded(link);
        },
      });

      uploadRef.current = upload;
      upload.start();
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Failed to initialize upload';
      setError(msg);
      setUploading(false);
      onProgressUpdate?.({
        progress: 0,
        uploadedBytes: 0,
        totalBytes: targetFile.size,
        status: 'error',
        error: msg,
        fileName: targetFile.name
      });
    }
  };

  const startUpload = () => performUpload(file);

  const cancelUpload = () => {
    if (uploadRef.current && uploading) {
      uploadRef.current.abort();
      setUploading(false);
      setProgress(0);
      setFile(null);
    }
  };

  if (success) {
    return (
      <div className="row" style={{ alignItems: 'center', gap: 8, padding: '10px 14px', background: 'var(--color-sage-50, #f0fdf4)', color: 'var(--color-sage-700, #15803d)', borderRadius: 8, fontSize: 'var(--fs-sm)', fontWeight: 600 }}>
        <CheckCircle size={16} />
        Video uploaded to Vimeo!
      </div>
    );
  }

  return (
    <div className="stack" style={{ gap: 10, width: '100%' }}>
      {!uploading && (
        <div className="row" style={{ alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <input
            type="file"
            accept="video/*,.mp4,.mov,.mkv,.avi,.webm"
            ref={fileInputRef}
            style={{ display: 'none' }}
            onChange={handleFileChange}
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            icon={Upload}
            onClick={() => fileInputRef.current && fileInputRef.current.click()}
          >
            {file ? 'Change Video' : label}
          </Button>

          {file && (
            <span style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-secondary)', maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {file.name} ({(file.size / (1024 * 1024)).toFixed(1)} MB)
            </span>
          )}

          {file && !success && (
            <Button
              type="button"
              variant="primary"
              size="sm"
              onClick={startUpload}
            >
              Upload to Vimeo
            </Button>
          )}
        </div>
      )}

      {uploading && (
        <div className="stack" style={{ gap: 6, background: 'var(--bg-app)', padding: '10px 14px', borderRadius: 8, border: '1px solid var(--border-subtle)' }}>
          <div className="row" style={{ justifyContent: 'space-between', fontSize: 'var(--fs-xs)' }}>
            <span style={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}>
              <Loader className="spinner" size={14} color="var(--primary)" />
              Uploading to Vimeo...
            </span>
            <span style={{ color: 'var(--text-secondary)' }}>
              {(bytesInfo.uploaded / (1024 * 1024)).toFixed(1)} / {(bytesInfo.total / (1024 * 1024)).toFixed(1)} MB ({progress}%)
            </span>
          </div>

          <div style={{ width: '100%', height: 6, background: 'var(--border-subtle)', borderRadius: 3, overflow: 'hidden' }}>
            <div
              style={{
                width: `${progress}%`,
                height: '100%',
                background: 'var(--primary)',
                transition: 'width 0.2s',
              }}
            />
          </div>

          <div className="row" style={{ justifyContent: 'flex-end' }}>
            <Button
              type="button"
              variant="ghost"
              size="xs"
              onClick={cancelUpload}
              style={{ color: 'var(--danger)' }}
            >
              Cancel
            </Button>
          </div>
        </div>
      )}

      {error && (
        <div className="row" style={{ alignItems: 'flex-start', gap: 6, color: 'var(--danger)', fontSize: 'var(--fs-xs)', background: 'var(--color-rose-050, #fff1f2)', padding: '8px 12px', borderRadius: 6, border: '1px solid var(--color-rose-200, #fecdd3)' }}>
          <AlertCircle size={14} style={{ flexShrink: 0, marginTop: 2 }} />
          <span>
            {error}{' '}
            {error.toLowerCase().includes('settings') && (
              <a
                href="/admin/settings"
                target="_blank"
                rel="noreferrer"
                style={{ color: 'var(--primary)', fontWeight: 600, textDecoration: 'underline', marginLeft: 4 }}
              >
                Go to Settings →
              </a>
            )}
          </span>
        </div>
      )}
    </div>
  );
}
