import React, { useState } from 'react';
import { useAuth } from './contexts/AuthContext';

const API_BASE = process.env.REACT_APP_API_URL || '';

function PDFUpload({ caseId, onUploaded }) {
  const [file, setFile] = useState(null);
  const [message, setMessage] = useState('');
  const { user } = useAuth();

  const handleChange = (e) => {
    setFile(e.target.files[0]);
  };

  const handleUpload = async () => {
    if (!file) {
      setMessage('Please select a PDF file.');
      return;
    }
    if (file.type !== 'application/pdf') {
      setMessage('Only PDF files are allowed.');
      return;
    }

    try {
      const token = sessionStorage.getItem('accessToken');
      const formData = new FormData();
      formData.append('file', file, file.name);
      if (caseId) formData.append('caseId', caseId);

      const res = await fetch(`${API_BASE}/s3/upload`, {
        method: 'POST',
        headers: {
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: formData
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || `Upload failed with status ${res.status}`);
      }

      const data = await res.json();
      setMessage('Upload successful!');
      if (onUploaded) onUploaded();
      console.log('Upload response:', data);
    } catch (error) {
      console.error('Upload error:', error);
      setMessage('Upload failed: ' + (error.message || String(error)));
    }
  };

  return (
    <div className="card">
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <input type="file" accept="application/pdf" onChange={handleChange} />
        <button className="primaryBtn" onClick={handleUpload}>Upload</button>
      </div>
      {message && <div style={{ marginTop: 8 }} className="muted">{message}</div>}
    </div>
  );
}

export default PDFUpload;
