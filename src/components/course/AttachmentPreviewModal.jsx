import React from 'react';
import PageLoader from '../ui/PageLoader';
import Modal from '../ui/Modal';
import { buildStaticUrl } from '../../api/client';

export default function AttachmentPreviewModal({
  previewContentUrl,
  setPreviewContentUrl,
  iframeLoading,
  setIframeLoading,
}) {
  return (
    <Modal open={!!previewContentUrl} onClose={() => setPreviewContentUrl(null)} title="View Attachment" width={1200}>
      <div style={{ position: 'relative', height: '75vh', width: '100%', borderRadius: '8px', overflow: 'hidden', border: '1px solid var(--border-subtle)' }}>
        {previewContentUrl && (
          previewContentUrl.match(/\.(jpe?g|png|gif|svg)$/i) ? (
            <>
              {iframeLoading && <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><PageLoader /></div>}
              <img src={buildStaticUrl(previewContentUrl)} alt="Attachment" onLoad={() => setIframeLoading(false)} style={{ width: '100%', height: '100%', objectFit: 'contain', opacity: iframeLoading ? 0 : 1 }} />
            </>
          ) : (
            <>
              {iframeLoading && <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><PageLoader /></div>}
              <iframe
                src={buildStaticUrl(previewContentUrl)}
                title="Document Preview"
                onLoad={() => setIframeLoading(false)}
                style={{ width: '100%', height: '100%', border: 'none', background: '#f8fafc', opacity: iframeLoading ? 0 : 1 }}
              />
            </>
          )
        )}
      </div>
    </Modal>
  );
}
