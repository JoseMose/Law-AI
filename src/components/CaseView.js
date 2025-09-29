import React, { useEffect, useState } from 'react';
import PDFUpload from '../PDFUpload';
import ReviewPane from './ReviewPane';

const API_BASE = process.env.REACT_APP_API_URL || '';

export default function CaseView({ caseObj, onDeleted }) {
  const [cs, setCs] = useState(caseObj);
  const [downloading, setDownloading] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [previewingDoc, setPreviewingDoc] = useState(null);

  useEffect(() => {
    setCs(caseObj);
  }, [caseObj]);

  const refresh = async () => {
    console.log('Starting refresh for case:', cs.id, 'API_BASE:', API_BASE);
    const token = sessionStorage.getItem('accessToken');
    console.log('Using token:', token ? `${token.substring(0, 10)}...` : 'null/undefined');
    try {
      const url = `${API_BASE}/cases/${cs.id}`;
      console.log('Fetching refresh URL:', url);
      const res = await fetch(url, { headers: { 'Authorization': `Bearer ${token}` } });
      console.log('Refresh response status:', res.status, 'ok:', res.ok);
      if (res.ok) {
        console.log('Reading response text...');
        const text = await res.text();
        console.log('Response text length:', text.length, 'First 100 chars:', text.substring(0, 100));
        if (text.trim()) {
          try {
            console.log('Attempting to parse as JSON...');
            const data = JSON.parse(text);
            console.log('JSON parsing successful, data:', data);
            setCs(data.case || data); // Extract case from wrapper or use data directly
          } catch (parseError) {
            console.error('Failed to parse refresh response as JSON:', parseError);
            console.error('Full response text:', text);
            console.error('Response headers:', [...res.headers.entries()]);
          }
        } else {
          console.warn('Empty response from refresh endpoint');
        }
      } else {
        console.warn('Failed to refresh case data:', res.status, res.statusText);
      }
    } catch (error) {
      console.error('Error refreshing case data:', error);
    }
  };

  const handleDownload = async (doc) => {
    try {
      setDownloading(doc.id);
      // Use server download proxy to avoid presigned URL/CORS issues
      const res = await fetch(`${API_BASE}/s3/download?key=${encodeURIComponent(doc.key)}`, { headers: { 'Authorization': `Bearer ${sessionStorage.getItem('accessToken')}` } });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || `Failed to download (${res.status})`);
      }
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      window.open(url, '_blank', 'noopener');
      // Revoke the object URL after some time to free memory
      setTimeout(() => window.URL.revokeObjectURL(url), 60 * 1000);
    } catch (e) {
      console.error('Download error:', e);
      alert('Failed to download: ' + (e.message || e));
    } finally {
      setDownloading(null);
    }
  };

  const handlePreview = async (doc) => {
    try {
      // Request a short-lived presigned GET URL from the server
      const res = await fetch(`${API_BASE}/s3/presign-get?key=${encodeURIComponent(doc.key)}`, { headers: { 'Authorization': `Bearer ${sessionStorage.getItem('accessToken')}` } });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || `Failed to get preview URL (${res.status})`);
      }
      const data = await res.json();
      // Open preview in iframe and track which doc is being previewed
      setPreviewUrl(data.url);
      setPreviewingDoc(doc);
      // Switch to preview mode (not review mode)
      setReviewMode(false);
      setShowReviewPane(false);
      setCurrentReviewDoc(null);
    } catch (e) {
      console.error('Preview error:', e);
      alert('Failed to preview: ' + (e.message || e));
    }
  };

  const handleDelete = async (doc) => {
    if (!window.confirm(`Delete document '${doc.name}'? This cannot be undone.`)) return;
    try {
      const res = await fetch(`${API_BASE}/cases/${cs.id}/documents/${encodeURIComponent(doc.name)}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${sessionStorage.getItem('accessToken')}`
        }
      });

      // Treat 404 (object already missing) as success (idempotent delete)
      if (res.ok || res.status === 404) {
        if (res.status === 404) {
          // option: show a small notice that metadata was cleaned up
          console.info('Delete returned 404 (object not found) — metadata will be cleaned up if present');
        }
        console.log('Delete successful, calling refresh...', { status: res.status, ok: res.ok });
        try {
          await refresh();
          console.log('Refresh completed successfully');
        } catch (refreshError) {
          console.error('Error during refresh after delete:', refreshError);
          throw refreshError;
        }
        return;
      }

      let errorMessage = `Delete failed (${res.status})`;
      try {
        // Clone the response so we can try both json() and text()
        const responseClone = res.clone();
        try {
          const err = await res.json();
          errorMessage = err.error || errorMessage;
        } catch (jsonError) {
          console.warn('Failed to parse error response as JSON:', jsonError);
          const text = await responseClone.text();
          console.warn('Raw error response:', text);
          errorMessage = text || errorMessage;
        }
      } catch (error) {
        console.warn('Failed to read error response:', error);
      }
      throw new Error(errorMessage);
    } catch (e) {
      console.error('Delete error:', e);
      alert('Failed to delete: ' + (e.message || e));
    }
  };

  const [reviewing, setReviewing] = useState(null);
  const [issues, setIssues] = useState([]);
  const [fixedText, setFixedText] = useState(null);
  const [saveToS3, setSaveToS3] = useState(false);
  const [applyingIssue, setApplyingIssue] = useState(null);
  const [annotatedHtml, setAnnotatedHtml] = useState(null);
  const [originalText, setOriginalText] = useState(null);
  const [showReviewPane, setShowReviewPane] = useState(false);
  const [currentReviewDoc, setCurrentReviewDoc] = useState(null);
  const [reviewMode, setReviewMode] = useState(false); // true when showing review instead of preview

  const handleReview = async (doc) => {
    try {
      setReviewing(doc.id);
      setIssues([]);
      setFixedText(null);
      const res = await fetch(`${API_BASE}/contracts/review`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${sessionStorage.getItem('accessToken')}` },
        body: JSON.stringify({ key: doc.key })
      });
      if (!res.ok) throw new Error('Review failed');
      const data = await res.json();
      setIssues(data.issues || []);
      // store annotated HTML & original text for UI
      setAnnotatedHtml(data.annotatedHtml || null);
      setOriginalText(data.originalText || null);
      // Switch to review mode in the preview area
      setCurrentReviewDoc(doc);
      setPreviewingDoc(doc);
      setReviewMode(true);
      setPreviewUrl(null); // Clear iframe URL since we're showing review content
      setShowReviewPane(false); // Don't use modal
    } catch (e) {
      console.error('Review error:', e);
      alert('Failed to review: ' + (e.message || e));
    } finally {
      setReviewing(null);
    }
  };

  const handleApplyFix = async (doc, issueId) => {
    try {
      setFixedText(null);
      setApplyingIssue(issueId);
      const res = await fetch(`${API_BASE}/contracts/fix`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${sessionStorage.getItem('accessToken')}` },
        body: JSON.stringify({ key: doc.key, issueId, applyToS3: !!saveToS3 })
      });
      if (!res.ok) throw new Error('Fix failed');
      const data = await res.json();
      setFixedText(data.fixedText || null);
      // If saved to S3, optionally refresh case metadata
      if (data.saved) await refresh();
    } catch (e) {
      console.error('Fix error:', e);
      alert('Failed to apply fix: ' + (e.message || e));
    } finally {
      setApplyingIssue(null);
    }
  };

  return (
    <div>
      {/* Preview/Review area at the top */}
      {(previewUrl || reviewMode) && previewingDoc && (
        <div style={{ marginTop: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <h4 style={{ margin: 0 }}>
              {reviewMode ? 'AI Contract Review: ' : 'Document Preview: '}
              {previewingDoc?.filename || 'Document'}
            </h4>
            <button 
              onClick={() => { 
                setPreviewUrl(null); 
                setPreviewingDoc(null);
                setReviewMode(false);
                setCurrentReviewDoc(null);
              }} 
              style={{
                background: 'none',
                border: '1px solid #ccc',
                borderRadius: 4,
                padding: '4px 8px',
                cursor: 'pointer',
                fontSize: '0.875rem'
              }}
            >
              {reviewMode ? 'Close Review' : 'Close Preview'}
            </button>
          </div>
          <div style={{ height: '70vh', border: '1px solid rgba(15,23,42,0.06)', borderRadius: 8, overflow: 'hidden' }}>
            {reviewMode ? (
              // Show AI Review Content
              <div style={{ height: '100%', padding: '20px', overflow: 'auto', backgroundColor: '#fff' }}>
                {issues && issues.length > 0 ? (
                  <div>
                    <div style={{ marginBottom: 16, padding: 12, backgroundColor: '#f0f9ff', borderRadius: 8, border: '1px solid #0ea5e9' }}>
                      <strong>{issues.length} issue{issues.length !== 1 ? 's' : ''} found</strong>
                      <p style={{ margin: '4px 0 0', fontSize: '0.875rem', color: '#0369a1' }}>
                        Issues are highlighted in the contract text below. Hover over highlights for details.
                      </p>
                    </div>
                    
                    {/* Annotated contract text */}
                    {annotatedHtml && (
                      <div 
                        style={{ 
                          fontSize: '14px',
                          lineHeight: 1.6,
                          fontFamily: 'ui-monospace, SFMono-Regular, Monaco, Consolas, monospace',
                          marginBottom: 20,
                          padding: 16,
                          backgroundColor: '#fafafa',
                          borderRadius: 8,
                          border: '1px solid #e5e7eb'
                        }}
                        dangerouslySetInnerHTML={{ __html: annotatedHtml }}
                      />
                    )}

                    {/* Issues list */}
                    <div>
                      <h5 style={{ marginBottom: 12 }}>Issues Found:</h5>
                      {issues.map((issue, index) => (
                        <div key={issue.id || index} style={{ 
                          marginBottom: 16, 
                          padding: 12, 
                          border: '1px solid #e5e7eb', 
                          borderRadius: 8,
                          backgroundColor: '#fff'
                        }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                            <strong>{issue.type || 'Issue'}</strong>
                            {issue.severity && (
                              <span style={{
                                padding: '2px 6px',
                                fontSize: '0.75rem',
                                borderRadius: 4,
                                textTransform: 'uppercase',
                                fontWeight: '500',
                                backgroundColor: issue.severity === 'high' ? '#fecaca' : issue.severity === 'medium' ? '#fed7aa' : '#e9d5ff',
                                color: issue.severity === 'high' ? '#991b1b' : issue.severity === 'medium' ? '#9a3412' : '#6b21a8'
                              }}>
                                {issue.severity}
                              </span>
                            )}
                          </div>
                          <div style={{ marginBottom: 8, color: '#6b7280', fontSize: '0.875rem' }}>
                            "{issue.snippet}"
                          </div>
                          <div style={{ marginBottom: 12, color: '#374151' }}>
                            <strong>Suggestion:</strong> {issue.suggestion}
                          </div>
                          <button 
                            className="primaryBtn" 
                            onClick={() => handleApplyFix(previewingDoc, issue.id)}
                            disabled={applyingIssue === issue.id}
                          >
                            {applyingIssue === issue.id ? 'Applying...' : 'Apply Fix'}
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div style={{ textAlign: 'center', color: '#6b7280', padding: 40 }}>
                    <p>No issues found in this contract.</p>
                  </div>
                )}
              </div>
            ) : (
              // Show PDF Preview
              <iframe title="Document preview" src={previewUrl} style={{ width: '100%', height: '100%', border: 'none' }} />
            )}
          </div>
        </div>
      )}

  <div className="documentsPane">
        <h4 style={{ marginTop: 0 }}>Documents</h4>
        <div className="documentsList">
        {(cs.documents || []).map(d => (
          <div key={d.id} className="card docRow" style={{ cursor: 'default' }}>
            <div className="meta">
              <div 
                className="name" 
                onClick={() => handlePreview(d)} 
                style={{ cursor: 'pointer', color: 'var(--accent)', textDecoration: 'underline' }}
              >
                {d.filename}
              </div>
              <div className="time muted">{d.uploadedAt}</div>
            </div>
            <div className="docActions">
              <button className="primaryBtn" onClick={() => handleDownload(d)} disabled={downloading === d.id}>{downloading === d.id ? 'Preparing...' : 'Download'}</button>
              <button className="secondaryBtn" onClick={() => handleReview(d)} disabled={reviewing === d.id}>{reviewing === d.id ? 'Reviewing...' : 'Review'}</button>
              <button className="secondaryBtn" onClick={() => handleDelete(d)}>Delete</button>
            </div>
          </div>
        ))}
        </div>
      </div>



      <div className="upload-area" style={{ marginTop: 12 }}>
        <PDFUpload caseId={cs.id} onUploaded={refresh} />
      </div>


    </div>
  );
}
