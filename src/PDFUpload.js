import React, { useState } from 'react';

const API_BASE = process.env.REACT_APP_API_URL || '';

function PDFUpload({ caseId, folderPath, onUploaded }) {
  const [file, setFile] = useState(null);
  const [message, setMessage] = useState('');

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
      
      // Build upload URL with caseId and folderPath parameters
      let uploadUrl = `${API_BASE}/s3/upload`;
      const params = new URLSearchParams();
      
      if (caseId) {
        params.append('caseId', caseId);
      }
      
      if (folderPath) {
        params.append('folderPath', folderPath);
      }
      
      if (params.toString()) {
        uploadUrl += '?' + params.toString();
      }

      const res = await fetch(uploadUrl, {
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
      <div className="card bg-white border rounded-lg shadow-md p-4" style={{ maxWidth: 420 }}>
        <div className="flex items-center gap-4">
          <label htmlFor="pdf-upload-input" className="btn btn-secondary" style={{ cursor: 'pointer', marginBottom: 0 }}>
            {file ? file.name : 'Choose PDF'}
            <input
              id="pdf-upload-input"
              type="file"
              accept="application/pdf"
              onChange={handleChange}
              style={{ display: 'none' }}
            />
          </label>
          <button className="btn btn-primary" onClick={handleUpload} disabled={!file} style={{ minWidth: 100 }}>
            Upload
          </button>
        </div>
        {message && <div className="text-sm text-gray-600 mt-2">{message}</div>}
      </div>
    );
}

export default PDFUpload;
