import { useCallback, useState, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';
import { UploadCloud, File as FileIcon, X, CheckCircle2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { uploadFile } from '../../api/upload';
import { extractErrorMessages, buildStaticUrl } from '../../api/client';
import './FileUploader.css';

export default function FileUploader({
  accept,
  maxSizeMB = 5,
  onUploaded, // (url) => void
  preview, // existing preview url
  label = 'Drag & drop, or click to select a file',
  renderCustom,
  isPublic = false,
}) {
  const [progress, setProgress] = useState(0);
  const [uploading, setUploading] = useState(false);
  // Normalize the initial preview: if it's a relative backend path, build the full URL
  const [localPreview, setLocalPreview] = useState(preview ? buildStaticUrl(preview) : null);
  const [fileName, setFileName] = useState('');

  // Sync when the parent loads async data (e.g., editing a saved course)
  useEffect(() => {
    if (preview && !fileName) {
      setLocalPreview(buildStaticUrl(preview));
    }
  }, [preview]);

  const onDrop = useCallback(
    async (accepted) => {
      const file = accepted[0];
      if (!file) return;
      if (file.size > maxSizeMB * 1024 * 1024) {
        toast.error(`File must be under ${maxSizeMB}MB`);
        return;
      }
      setFileName(file.name);
      if (file.type.startsWith('image/')) setLocalPreview(URL.createObjectURL(file));
      setUploading(true);
      setProgress(0);
      try {
        const { data } = await uploadFile(file, setProgress, 'students', isPublic);
        const url = data?.data?.url || data?.data?.path || data?.url;
        toast.success('File uploaded');
        onUploaded?.(url, file);
      } catch (err) {
        extractErrorMessages(err).forEach((m) => toast.error(m));
      } finally {
        setUploading(false);
      }
    },
    [maxSizeMB, onUploaded]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({ onDrop, accept, multiple: false });

  if (renderCustom) {
    return renderCustom({ getRootProps, getInputProps, isDragActive, uploading, progress });
  }

  return (
    <div className="uploader">
      <div {...getRootProps()} className={`uploader__zone ${isDragActive ? 'uploader__zone--active' : ''}`}>
        <input {...getInputProps()} />
        {localPreview ? (
          <img src={localPreview} alt="preview" className="uploader__preview" />
        ) : (
          <>
            <UploadCloud size={26} strokeWidth={1.5} />
            <p>{label}</p>
          </>
        )}
      </div>

      {(uploading || fileName) && (
        <div className="uploader__status">
          <FileIcon size={14} />
          <span className="uploader__filename">{fileName}</span>
          {uploading ? (
            <span className="uploader__progress">{progress}%</span>
          ) : (
            <CheckCircle2 size={14} color="var(--success)" />
          )}
          {!uploading && (
            <button
              type="button"
              className="uploader__remove"
              onClick={() => {
                setFileName('');
                setLocalPreview(null);
                onUploaded?.('');
              }}
            >
              <X size={13} />
            </button>
          )}
        </div>
      )}
    </div>
  );
}
