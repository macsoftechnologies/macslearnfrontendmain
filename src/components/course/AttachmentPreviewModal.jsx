import React from 'react';
import Modal from '../ui/Modal';
import DocumentViewer from './DocumentViewer';

export default function AttachmentPreviewModal({
  previewContentUrl,
  setPreviewContentUrl,
  previewTitle,
}) {
  if (!previewContentUrl) return null;

  return (
    <Modal 
      open={!!previewContentUrl} 
      onClose={() => setPreviewContentUrl(null)} 
      title={previewTitle || "Document Preview"} 
      width={1200}
    >
      <div style={{ minHeight: '75vh', width: '100%' }}>
        <DocumentViewer 
          url={previewContentUrl} 
          title={previewTitle || "Attachment"} 
          height="75vh" 
        />
      </div>
    </Modal>
  );
}
