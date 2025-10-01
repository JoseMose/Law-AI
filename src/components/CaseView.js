import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import PDFUpload from '../PDFUpload';

const API_BASE = 'https://phd54f79fk.execute-api.us-east-1.amazonaws.com/dev';

// Component for displaying a document with simplified actions
const DocumentWithVersions = ({ document, onPreview, onShowVersions, onReview, reviewing }) => {
  return (
    <div className="card mb-2">
      <div className="card-body p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center flex-1">
            <div className="file-icon">
              📄
            </div>
            <div className="flex-1">
              <div className="font-medium text-gray-900">
                {document.filename}
              </div>
              <div className="text-sm text-gray-500">
                {document.uploadedAt}
              </div>
            </div>
          </div>
          <div className="flex gap-2">
            <button 
              className="btn btn-primary btn-sm" 
              onClick={() => onPreview(document)}
            >
              👁️ Preview
            </button>
            <button 
              style={{ 
                backgroundColor: 'red', 
                color: 'white',
                padding: '8px 16px',
                border: 'none',
                borderRadius: '4px',
                fontSize: '14px'
              }}
              onClick={() => {
                alert('Review button works!');
                console.log('Review button clicked!', document);
                if (onReview) onReview(document);
              }}
            >
              🔍 REVIEW TEST
            </button>
            <button 
              className="btn btn-secondary btn-sm" 
              onClick={() => onShowVersions(document)}
            >
              📋 Versions
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default function CaseView() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [cs, setCs] = useState(null);
  const [loading, setLoading] = useState(true);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [previewingDoc, setPreviewingDoc] = useState(null);
  
  // Folder functionality state
  const [folders, setFolders] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [currentFolder, setCurrentFolder] = useState(null); // null means root
  const [showCreateFolder, setShowCreateFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');

  useEffect(() => {
    if (id) {
      loadCase();
      loadFoldersAndDocuments();
    }
  }, [id]);

  // Load case details
  const loadCase = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE}/cases/${id}`);
      if (response.ok) {
        const data = await response.json();
        setCs(data.case);
      } else if (response.status === 404) {
        navigate('/cases');
      }
    } catch (error) {
      console.error('Error loading case:', error);
      navigate('/cases');
    } finally {
      setLoading(false);
    }
  };

  // Load folders and documents from backend
  const loadFoldersAndDocuments = async () => {
    try {
      const url = `${API_BASE}/case-folders/${id}`;
      const token = sessionStorage.getItem('accessToken');
      console.log('Loading folders - URL:', url, 'token present:', !!token);
      const res = await fetch(url, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        }
      });
      console.log('Folders GET status:', res.status, 'ok:', res.ok);
      if (res.ok) {
        const data = await res.json();
        setFolders(data.folders || []);
        setDocuments(data.documents || []);
      }
      else {
        const text = await res.text().catch(() => '');
        console.error('Failed to load folders. Status:', res.status, 'Body:', text);
      }
    } catch (error) {
      console.error('Error loading folders:', error);
    }
  };

  // Create new folder
  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) {
      alert('Please enter a folder name');
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/folders/create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
          , 'Authorization': `Bearer ${sessionStorage.getItem('accessToken')}`
        },
        body: JSON.stringify({
          caseId: id,
          folderName: newFolderName.trim(),
          parentPath: currentFolder?.path || ''
        })
      });

      if (res.ok) {
        const data = await res.json();
        console.log('Folder created:', data);
        setNewFolderName('');
        setShowCreateFolder(false);
        // Reload folders
        loadFoldersAndDocuments();
      } else {
        const error = await res.json();
        alert(`Failed to create folder: ${error.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error creating folder:', error);
      alert(`Failed to create folder: ${error.message}`);
    }
  };

  // Navigate to folder
  const handleEnterFolder = (folder) => {
    setCurrentFolder(folder);
  };

  // Go back to parent folder
  const handleBackToParent = () => {
    setCurrentFolder(null); // For now, just go to root
  };

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

  // eslint-disable-next-line no-unused-vars
  const handleDownload = async (doc) => {
    try {
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
    }
  };

  const handlePreview = async (doc) => {
    try {
      // Check if file is a PDF before attempting preview
      if (!doc.filename.toLowerCase().endsWith('.pdf')) {
        alert(`Cannot preview ${doc.filename}. Only PDF files can be previewed. Please download the file to view it.`);
        return;
      }

      // Use the download endpoint directly for iframe preview to avoid third-party context issues
      const previewUrl = `${API_BASE}/s3/download?key=${encodeURIComponent(doc.key)}&t=${sessionStorage.getItem('accessToken')}`;
      
      console.log('Preview URL:', previewUrl);
      console.log('Document key:', doc.key);
      console.log('Document info:', doc);
      
      // Open preview in iframe and track which doc is being previewed
      setPreviewUrl(previewUrl);
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

  // eslint-disable-next-line no-unused-vars
  const [reviewing, setReviewing] = useState(null);
  const [issues, setIssues] = useState([]);
  // eslint-disable-next-line no-unused-vars
  const [fixedText, setFixedText] = useState(null);
  // eslint-disable-next-line no-unused-vars
  const [saveToS3, setSaveToS3] = useState(false);
  const [applyingIssue, setApplyingIssue] = useState(null);
  const [annotatedHtml, setAnnotatedHtml] = useState(null);
  // eslint-disable-next-line no-unused-vars
  const [originalText, setOriginalText] = useState(null);
  // eslint-disable-next-line no-unused-vars
  const [showReviewPane, setShowReviewPane] = useState(false);
  // eslint-disable-next-line no-unused-vars
  const [currentReviewDoc, setCurrentReviewDoc] = useState(null);
  const [reviewMode, setReviewMode] = useState(false); // true when showing review instead of preview
  const [savingVersion, setSavingVersion] = useState(false);
  const [showingVersionsFor, setShowingVersionsFor] = useState(null); // document for which we're showing full versions view
  const [allVersions, setAllVersions] = useState([]);

  const handleShowVersionsView = async (doc) => {
    try {
      const res = await fetch(`${API_BASE}/documents/${doc.id}/versions`, {
        headers: { 'Authorization': `Bearer ${sessionStorage.getItem('accessToken')}` }
      });
      
      if (res.ok) {
        const data = await res.json();
        setAllVersions(data.versions || []);
        setShowingVersionsFor(doc);
      }
    } catch (e) {
      console.error('Failed to load versions:', e);
    }
  };

  const handleSaveVersion = async (doc, versionType = 'fixed') => {
    if (!annotatedHtml || !originalText) {
      alert('No contract content available to save');
      return;
    }

    try {
      setSavingVersion(true);
      const fixedIssuesInfo = issues.filter(issue => !issues.includes(issue)).map(issue => ({
        id: issue.id,
        title: issue.title,
        applied: true
      }));

      const res = await fetch(`${API_BASE}/contracts/save-version`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json', 
          'Authorization': `Bearer ${sessionStorage.getItem('accessToken')}` 
        },
        body: JSON.stringify({ 
          caseId: cs.id,
          documentId: doc.id,
          contractText: fixedText || originalText,
          versionType: versionType,
          fixedIssues: fixedIssuesInfo
        })
      });
      
      if (!res.ok) throw new Error('Failed to save version');
      const data = await res.json();
      
      alert(`✅ ${data.message}\n\nVersion ${data.version.versionNumber} saved as: ${data.version.fileName}`);
      
      // Version will be refreshed automatically by the DocumentWithVersions component
      
    } catch (e) {
      console.error('Save version error:', e);
      alert('Failed to save version: ' + (e.message || e));
    } finally {
      setSavingVersion(false);
    }
  };



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

  const scrollToIssue = (issueId) => {
    const element = document.querySelector(`[data-issue="${issueId}"]`);
    if (element) {
      // Scroll the contract content area
      const contractContent = document.getElementById('contract-content');
      if (contractContent) {
        element.scrollIntoView({ 
          behavior: 'smooth', 
          block: 'center',
          inline: 'nearest'
        });
        
        // Add temporary highlight animation
        const originalStyle = element.style.cssText;
        element.style.cssText += `
          animation: highlight-pulse 2s ease-in-out;
          box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.5) !important;
        `;
        
        // Add CSS animation if not already present
        if (!document.getElementById('highlight-animation-styles')) {
          const style = document.createElement('style');
          style.id = 'highlight-animation-styles';
          style.textContent = `
            @keyframes highlight-pulse {
              0%, 100% { 
                box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.5);
                transform: scale(1);
              }
              50% { 
                box-shadow: 0 0 0 6px rgba(59, 130, 246, 0.3);
                transform: scale(1.02);
              }
            }
          `;
          document.head.appendChild(style);
        }
        
        // Remove highlight after animation
        setTimeout(() => {
          element.style.cssText = originalStyle;
        }, 2000);
      }
    } else {
      console.warn(`Issue element with data-issue="${issueId}" not found`);
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
      
      if (data.success && data.fixed) {
        // Update the contract text with the fixed version
        setFixedText(data.fixedText);
        setOriginalText(data.fixedText);

        // Remove the fixed issue from the issues list
        const updatedIssues = issues.filter(issue => issue.id !== issueId);
        setIssues(updatedIssues);

        // Show success message
        const fixMessage = `✅ ${data.title}\n\n${data.explanation}`;
        alert(fixMessage);

        // Generate new annotated HTML with the fixed text and remaining issues
        const generateUpdatedAnnotatedHtml = (fixedText, remainingIssues) => {
          if (remainingIssues.length === 0) {
            // All issues fixed, show clean contract
            return `
              <div class="contract-editor">
                <div class="contract-header">
                  <h2>Employment Agreement - All Issues Resolved ✅</h2>
                  <div class="review-summary">
                    <span class="issue-count success">0 Issues Remaining</span>
                  </div>
                </div>
                <div class="contract-content" contenteditable="true" spellcheck="false">
                  <div style="white-space: pre-line; font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace; font-size: 14px; line-height: 1.8; padding: 20px;">
                    ${fixedText}
                  </div>
                </div>
                <style>
                  .contract-editor { 
                    font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace; 
                    font-size: 14px;
                    border: 1px solid #ddd; 
                    border-radius: 8px;
                    background: #fefefe;
                    overflow: hidden;
                  }
                  .contract-header { 
                    background: #d4edda; 
                    padding: 16px; 
                    border-bottom: 1px solid #c3e6cb;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                  }
                  .contract-header h2 { 
                    margin: 0; 
                    font-size: 18px; 
                    color: #155724; 
                  }
                  .issue-count.success { 
                    background: #d4edda; 
                    color: #155724;
                    padding: 4px 8px;
                    border-radius: 12px;
                    font-size: 12px;
                    font-weight: 600;
                    text-transform: uppercase;
                  }
                </style>
              </div>
            `;
          } else {
            // Still have remaining issues, highlight them in the fixed text
            // Add line numbers and highlighting for remaining issues
            const lines = fixedText.split('\n');
            const numberedLines = lines.map((line, index) => {
              const lineNumber = index + 1;
              let highlightedLine = line;
              
              // Check if any remaining issues should be highlighted on this line
              remainingIssues.forEach(issue => {
                if (issue.originalText && line.includes(issue.originalText)) {
                  const issueClass = issue.type === 'error' ? 'highlight-error' : 
                                   issue.type === 'warning' ? 'highlight-warning' : 'highlight-info';
                  highlightedLine = highlightedLine.replace(
                    issue.originalText,
                    `<span class="${issueClass}" data-issue="${issue.id}" title="Click to view suggestion">${issue.originalText}</span>`
                  );
                }
              });
              
              return `<div class="line-number">${lineNumber}</div>${highlightedLine}`;
            }).join('\n');

            const errorCount = remainingIssues.filter(i => i.type === 'error').length;
            const warningCount = remainingIssues.filter(i => i.type === 'warning').length;
            const infoCount = remainingIssues.filter(i => i.type === 'info').length;

            return `
              <div class="contract-editor">
                <div class="contract-header">
                  <h2>Employment Agreement - ${remainingIssues.length} Issue${remainingIssues.length !== 1 ? 's' : ''} Remaining</h2>
                  <div class="review-summary">
                    ${errorCount > 0 ? `<span class="issue-count error">${errorCount} Critical</span>` : ''}
                    ${warningCount > 0 ? `<span class="issue-count warning">${warningCount} Warning${warningCount !== 1 ? 's' : ''}</span>` : ''}
                    ${infoCount > 0 ? `<span class="issue-count info">${infoCount} Info</span>` : ''}
                  </div>
                </div>
                <div class="contract-content" contenteditable="true" spellcheck="false">
                  ${numberedLines}
                </div>
                <style>
                  .contract-editor { 
                    font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace; 
                    font-size: 14px;
                    border: 1px solid #ddd; 
                    border-radius: 8px;
                    background: #fefefe;
                    overflow: hidden;
                  }
                  .contract-header { 
                    background: #f8f9fa; 
                    padding: 16px; 
                    border-bottom: 1px solid #e9ecef;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                  }
                  .contract-header h2 { 
                    margin: 0; 
                    font-size: 18px; 
                    color: #212529; 
                  }
                  .review-summary {
                    display: flex;
                    gap: 12px;
                  }
                  .issue-count {
                    padding: 4px 8px;
                    border-radius: 12px;
                    font-size: 12px;
                    font-weight: 600;
                    text-transform: uppercase;
                  }
                  .issue-count.error { background: #f8d7da; color: #721c24; }
                  .issue-count.warning { background: #fff3cd; color: #856404; }
                  .issue-count.info { background: #d1ecf1; color: #0c5460; }
                  .issue-count.success { background: #d4edda; color: #155724; }
                  .contract-content { 
                    padding: 20px; 
                    line-height: 1.8; 
                    white-space: pre-wrap;
                    min-height: 500px;
                    position: relative;
                  }
                  .line-number {
                    display: inline-block;
                    width: 40px;
                    color: #6c757d;
                    font-size: 12px;
                    user-select: none;
                    margin-right: 10px;
                  }
                  .highlight-error { 
                    background-color: #f8d7da; 
                    padding: 2px 4px; 
                    border-radius: 3px; 
                    cursor: pointer;
                    border-left: 3px solid #dc3545;
                    transition: all 0.2s;
                  }
                  .highlight-warning { 
                    background-color: #fff3cd; 
                    padding: 2px 4px; 
                    border-radius: 3px; 
                    cursor: pointer;
                    border-left: 3px solid #ffc107;
                    transition: all 0.2s;
                  }
                  .highlight-info { 
                    background-color: #d1ecf1; 
                    padding: 2px 4px; 
                    border-radius: 3px; 
                    cursor: pointer;
                    border-left: 3px solid #17a2b8;
                    transition: all 0.2s;
                  }
                  .highlight-error:hover, .highlight-warning:hover, .highlight-info:hover {
                    transform: translateY(-1px);
                    box-shadow: 0 2px 4px rgba(0,0,0,0.1);
                  }
                </style>
              </div>
            `;
          }
        };

        // Update the annotated HTML with the fixed content
        const newAnnotatedHtml = generateUpdatedAnnotatedHtml(data.fixedText, updatedIssues);
        setAnnotatedHtml(newAnnotatedHtml);
        
        // If saved to S3, optionally refresh case metadata
        if (data.saved) await refresh();
      }
    } catch (e) {
      console.error('Fix error:', e);
      alert('Failed to apply fix: ' + (e.message || e));
    } finally {
      setApplyingIssue(null);
    }
  };

  if (loading) {
    return (
      <div className="container">
        <div className="main-content">
          <div className="flex items-center justify-center" style={{ minHeight: '400px' }}>
            <div className="loading-spinner"></div>
            <span className="ml-4 text-gray-600">Loading case...</span>
          </div>
        </div>
      </div>
    );
  }

  if (!cs) {
    return (
      <div className="container">
        <div className="main-content">
          <div className="empty-state">
            <div className="empty-state-icon">❌</div>
            <h3>Case not found</h3>
            <p>The case you're looking for doesn't exist or has been deleted.</p>
            <button 
              className="btn btn-primary mt-4"
              onClick={() => navigate('/cases')}
            >
              Back to Cases
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container">
      <div className="main-content">
      {/* Preview/Review area - always full width, unaffected by versions sidebar */}
      {(previewUrl || reviewMode) && previewingDoc && (
        <div style={{ marginTop: 0, marginBottom: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <h4 style={{ margin: 0 }}>
              {reviewMode ? 'AI Contract Review: ' : 'Document Preview: '}
              {previewingDoc?.filename || 'Document'}
            </h4>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              {reviewMode && (
                <button 
                  onClick={() => handleSaveVersion(previewingDoc, 'fixed')}
                  disabled={savingVersion || issues.length > 0}
                  style={{
                    background: issues.length === 0 ? '#28a745' : '#6c757d',
                    border: 'none',
                    color: 'white',
                    borderRadius: 4,
                    padding: '6px 12px',
                    cursor: issues.length === 0 ? 'pointer' : 'not-allowed',
                    fontSize: '0.875rem',
                    fontWeight: '600'
                  }}
                  title={issues.length > 0 ? 'Fix all issues before saving' : 'Save fixed version as PDF'}
                >
                  {savingVersion ? '💾 Saving...' : issues.length === 0 ? '💾 Save Fixed Version' : '⚠️ Fix Issues First'}
                </button>
              )}
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
          </div>

          <div style={{ height: '70vh', border: '1px solid rgba(15,23,42,0.06)', borderRadius: 8, overflow: 'hidden' }}>
            {reviewMode ? (
              // Show AI Review Content - Split Pane Layout
              <div style={{ height: '100%', display: 'flex', backgroundColor: '#fff' }}>
                {/* Left Side - Contract Editor */}
                <div style={{ 
                  flex: '1', 
                  padding: '0', 
                  overflow: 'auto',
                  borderRight: '1px solid #e5e7eb',
                  position: 'relative'
                }}>
                  {annotatedHtml && (
                    <div 
                      id="contract-content"
                      style={{ 
                        fontSize: '14px',
                        lineHeight: 1.6,
                        fontFamily: 'ui-monospace, SFMono-Regular, Monaco, Consolas, monospace',
                        height: '100%'
                      }}
                      dangerouslySetInnerHTML={{ __html: annotatedHtml }}
                    />
                  )}
                </div>

                {/* Right Side - Issues Panel */}
                <div style={{ 
                  width: '400px', 
                  padding: '20px',
                  overflow: 'auto',
                  backgroundColor: '#fafafa',
                  borderLeft: '1px solid #e5e7eb'
                }}>
                  <div style={{ marginBottom: 16, padding: 12, backgroundColor: '#f0f9ff', borderRadius: 8, border: '1px solid #0ea5e9' }}>
                    <strong>🔍 AI Analysis Complete</strong>
                    <p style={{ margin: '4px 0 0', fontSize: '0.875rem', color: '#0369a1' }}>
                      Found {issues.length} issue{issues.length !== 1 ? 's' : ''} requiring attention
                    </p>
                  </div>

                  {issues && issues.length > 0 ? (
                    <div>
                      <h4 style={{ marginBottom: 16, color: '#374151', fontSize: '16px' }}>Issues Found:</h4>
                      {issues.map((issue, index) => (
                        <div 
                          key={issue.id || index} 
                          style={{ 
                            marginBottom: 16, 
                            padding: 16, 
                            border: '1px solid #e5e7eb', 
                            borderRadius: 12,
                            backgroundColor: '#fff',
                            cursor: 'pointer',
                            transition: 'all 0.2s ease',
                            boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
                          }}
                          onClick={(e) => {
                            // Don't navigate if clicking the Apply Fix button
                            if (e.target.tagName === 'BUTTON') return;
                            scrollToIssue(issue.id);
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.transform = 'translateY(-2px)';
                            e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.transform = 'translateY(0)';
                            e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.1)';
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                            <span style={{
                              padding: '4px 8px',
                              fontSize: '0.75rem',
                              borderRadius: 6,
                              textTransform: 'uppercase',
                              fontWeight: '600',
                              backgroundColor: 
                                issue.type === 'error' ? '#fecaca' : 
                                issue.type === 'warning' ? '#fed7aa' : '#dbeafe',
                              color: 
                                issue.type === 'error' ? '#991b1b' : 
                                issue.type === 'warning' ? '#9a3412' : '#1e40af'
                            }}>
                              {issue.type === 'error' ? '🔴 Critical' : 
                               issue.type === 'warning' ? '🟡 Warning' : '🔵 Info'}
                            </span>
                            {issue.line && (
                              <span style={{ fontSize: '0.75rem', color: '#6b7280' }}>
                                Line {issue.line}
                              </span>
                            )}
                          </div>
                          
                          <h5 style={{ 
                            marginBottom: 8, 
                            color: '#111827',
                            fontSize: '14px',
                            fontWeight: '600'
                          }}>
                            {issue.title}
                          </h5>
                          
                          <p style={{ 
                            marginBottom: 10, 
                            color: '#6b7280', 
                            fontSize: '0.875rem',
                            lineHeight: 1.5
                          }}>
                            {issue.description}
                          </p>
                          
                          <div style={{ 
                            marginBottom: 12, 
                            padding: 8,
                            backgroundColor: '#f9fafb',
                            borderRadius: 6,
                            borderLeft: '3px solid #10b981'
                          }}>
                            <div style={{ fontSize: '0.75rem', color: '#10b981', fontWeight: '600', marginBottom: 4 }}>
                              💡 SUGGESTION
                            </div>
                            <div style={{ fontSize: '0.875rem', color: '#374151' }}>
                              {issue.suggestion}
                            </div>
                          </div>
                          
                          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                            <button 
                              className="primaryBtn" 
                              onClick={(e) => {
                                e.stopPropagation();
                                handleApplyFix(previewingDoc, issue.id);
                              }}
                              disabled={applyingIssue === issue.id}
                              style={{ fontSize: '0.875rem', padding: '6px 12px' }}
                            >
                              {applyingIssue === issue.id ? 'Applying...' : 'Apply Fix'}
                            </button>
                            <span style={{ fontSize: '0.75rem', color: '#9ca3af' }}>
                              Click anywhere to navigate →
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div style={{ textAlign: 'center', color: '#6b7280', padding: 40 }}>
                      <p>✅ No issues found in this contract.</p>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              // Show PDF Preview
              <iframe 
                title="Document preview" 
                src={previewUrl} 
                style={{ width: '100%', height: '100%', border: 'none' }}
                allow="same-origin"
                sandbox="allow-same-origin allow-scripts"
                onError={(e) => console.error('Iframe error:', e)}
                onLoad={() => console.log('Iframe loaded successfully')}
              />
            )}
          </div>
        </div>
      )}

        {/* Page Header */}
        <div className="page-header">
          <div className="breadcrumb">
            <button 
              className="breadcrumb-item cursor-pointer"
              onClick={() => navigate('/cases')}
            >
              Cases
            </button>
            <span className="breadcrumb-separator">/</span>
            <span className="breadcrumb-item active">{cs.title}</span>
          </div>
          <h1 className="page-title">{cs.title}</h1>
          <button 
            style={{
              backgroundColor: 'red',
              color: 'white',
              padding: '10px 20px',
              border: 'none',
              borderRadius: '5px',
              fontSize: '16px',
              margin: '10px 0'
            }}
            onClick={() => alert('TEST BUTTON WORKS - Changes are being applied!')}
          >
            🚨 TEST BUTTON - CHANGES WORKING? 🚨
          </button>
          {cs.description && (
            <p className="page-description">{cs.description}</p>
          )}
        </div>

        {/* Documents Section */}
        <div className="flex gap-6">
          {/* Documents List */}
          <div className="flex-1">
            <div className="card">
              <div className="card-header">
                <div className="flex items-center justify-between">
                  <h3 className="card-title flex items-center gap-2">
                    {currentFolder ? (
                      <>
                        📁 {currentFolder.name}
                      </>
                    ) : (
                      <>
                        📄 Documents
                      </>
                    )}
                  </h3>
                  <div className="flex gap-2">
                    {currentFolder && (
                      <button 
                        onClick={handleBackToParent}
                        className="btn btn-secondary btn-sm"
                      >
                        ← Back
                      </button>
                    )}
                    <button 
                      onClick={() => setShowCreateFolder(true)}
                      className="btn btn-primary btn-sm"
                    >
                      📁 New Folder
                    </button>
                  </div>
                </div>
              </div>

            {/* Create Folder Form */}
            {showCreateFolder && (
              <div className="card mb-4">
                <div className="card-body">
                  <h4 className="card-title">Create New Folder</h4>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={newFolderName}
                      onChange={(e) => setNewFolderName(e.target.value)}
                      placeholder="Folder name"
                      className="form-input flex-1"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          handleCreateFolder();
                        } else if (e.key === 'Escape') {
                          setShowCreateFolder(false);
                          setNewFolderName('');
                        }
                    }}
                  />
                    <button 
                      onClick={handleCreateFolder}
                      className="btn btn-primary btn-sm"
                    >
                      Create
                    </button>
                    <button 
                      onClick={() => {
                        setShowCreateFolder(false);
                        setNewFolderName('');
                      }}
                      className="btn btn-secondary btn-sm"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            )}

            <div className="card-body">
              {/* Show folders first */}
              {folders
                .filter(folder => !currentFolder || folder.path.startsWith(currentFolder.path + '/'))
                .map(folder => (
                <div key={folder.path} className="card cursor-pointer mb-2" onClick={() => handleEnterFolder(folder)}>
                  <div className="card-body p-4">
                    <div className="flex items-center">
                      <div className="file-icon bg-blue-100 text-blue-600">
                        📁
                      </div>
                      <div className="flex-1">
                        <div className="font-medium text-gray-900">
                          {folder.name}
                        </div>
                        <div className="text-sm text-gray-500">
                          Created {new Date(folder.createdAt).toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}

              {/* Show documents in current folder */}
              {documents
                .filter(doc => {
                  if (!currentFolder) {
                    return !doc.folderPath; // Show root documents when no folder selected
                  }
                  return doc.folderPath === currentFolder.path;
                })
                .map(doc => (
                <div key={doc.id} className="card mb-2">
                  <div className="card-body p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center flex-1">
                        <div className="file-icon">📄</div>
                        <div className="flex-1">
                          <div className="font-medium text-gray-900">{doc.filename}</div>
                          <div className="text-sm text-gray-500">{doc.uploadedAt}</div>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button 
                          className="btn btn-primary btn-sm" 
                          onClick={() => handlePreview(doc)}
                        >
                          👁️ Preview
                        </button>
                        <button 
                          style={{ 
                            backgroundColor: 'red', 
                            color: 'white',
                            padding: '8px 16px',
                            border: 'none',
                            borderRadius: '4px',
                            fontSize: '14px'
                          }}
                          onClick={() => {
                            alert('Review button clicked!');
                            handleReview(doc);
                          }}
                        >
                          🔍 REVIEW
                        </button>
                        <button 
                          className="btn btn-secondary btn-sm" 
                          onClick={() => handleShowVersionsView(doc)}
                        >
                          📋 Versions
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}

              {/* Show legacy case documents if no folders/documents from API */}
              {(!folders.length && !documents.length) && (cs.documents || []).map(d => (
                <div key={d.id} className="card mb-2">
                  <div className="card-body p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center flex-1">
                        <div className="file-icon">📄</div>
                        <div className="flex-1">
                          <div className="font-medium text-gray-900">{d.filename}</div>
                          <div className="text-sm text-gray-500">{d.uploadedAt}</div>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button 
                          className="btn btn-primary btn-sm" 
                          onClick={() => handlePreview(d)}
                        >
                          👁️ Preview
                        </button>
                        <button 
                          style={{ 
                            backgroundColor: 'red', 
                            color: 'white',
                            padding: '8px 16px',
                            border: 'none',
                            borderRadius: '4px',
                            fontSize: '14px'
                          }}
                          onClick={() => {
                            alert('Review button clicked!');
                            handleReview(d);
                          }}
                        >
                          🔍 REVIEW
                        </button>
                        <button 
                          className="btn btn-secondary btn-sm" 
                          onClick={() => handleShowVersionsView(d)}
                        >
                          📋 Versions
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-4">
              <PDFUpload 
                caseId={id} 
                folderPath={currentFolder?.path || ''} 
                onUploaded={() => {
                  loadCase();
                  loadFoldersAndDocuments();
                }} 
              />
            </div>
          </div>
        </div> {/* closing flex-1 case content area */}

          {/* Versions Sidebar - Only appears when versions are being shown */}
      {showingVersionsFor && (
        <div style={{
          width: '400px',
          backgroundColor: '#f8f9fa',
          border: '1px solid #e5e7eb',
          borderRadius: 8,
          overflow: 'hidden'
        }}>
          {/* Header */}
          <div style={{
            padding: '16px 20px',
            borderBottom: '1px solid #e5e7eb',
            backgroundColor: '#ffffff',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <h4 style={{ margin: 0, color: '#111827', fontSize: '16px' }}>
              📋 {showingVersionsFor.filename}
            </h4>
            <button
              onClick={() => setShowingVersionsFor(null)}
              style={{
                background: 'none',
                border: 'none',
                fontSize: '18px',
                cursor: 'pointer',
                color: '#6b7280',
                padding: '4px'
              }}
            >
              ×
            </button>
          </div>
          
          {/* Single Delete File Button */}
          <div style={{
            padding: '16px 20px',
            borderBottom: '1px solid #e5e7eb',
            backgroundColor: '#ffffff'
          }}>
            <button 
              onClick={() => {
                if (window.confirm(`Are you sure you want to delete ${showingVersionsFor.filename}?`)) {
                  handleDelete(showingVersionsFor);
                  setShowingVersionsFor(null);
                }
              }}
              style={{ 
                width: '100%',
                padding: '12px 20px',
                backgroundColor: '#dc3545', 
                color: 'white',
                border: 'none',
                borderRadius: 6,
                fontSize: '0.875rem',
                fontWeight: '500',
                cursor: 'pointer'
              }}
            >
              🗑️ Delete File
            </button>
          </div>

          {/* Versions List */}
          <div style={{ 
            padding: '16px 20px', 
            maxHeight: '60vh', 
            overflow: 'auto' 
          }}>
            <h5 style={{ margin: '0 0 16px 0', color: '#374151' }}>Version History</h5>
            {allVersions.length > 0 ? (
              <div style={{ display: 'grid', gap: 12 }}>
                {allVersions.map((version, index) => (
                  <div key={version.versionId} style={{
                    padding: 16,
                    backgroundColor: index === allVersions.length - 1 ? '#f0fdf4' : '#ffffff',
                    border: `1px solid ${index === allVersions.length - 1 ? '#10b981' : '#e5e7eb'}`,
                    borderRadius: 8,
                    fontSize: '0.875rem'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', marginBottom: 8 }}>
                      <span style={{ fontSize: '18px', marginRight: 8 }}>
                        {version.versionType === 'original' ? '📄' : 
                         version.versionType === 'reviewed' ? '🔍' : 
                         version.versionType === 'fixed' ? '✅' : '📝'}
                      </span>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: '600', color: '#111827' }}>
                          v{version.versionNumber} - {version.status}
                          {index === allVersions.length - 1 && (
                            <span style={{ 
                              marginLeft: 8, 
                              padding: '2px 6px', 
                              backgroundColor: '#10b981', 
                              color: 'white', 
                              borderRadius: 4, 
                              fontSize: '0.75rem',
                              fontWeight: '500'
                            }}>
                              CURRENT
                            </span>
                          )}
                        </div>
                        <div style={{ color: '#6b7280', fontSize: '0.75rem' }}>
                          {new Date(version.timestamp).toLocaleString()} • {version.size}
                        </div>
                      </div>
                    </div>
                    
                    {version.fixedIssues && version.fixedIssues.length > 0 && (
                      <div style={{ 
                        marginBottom: 8,
                        fontSize: '0.75rem', 
                        color: '#059669'
                      }}>
                        ✅ Fixed {version.fixedIssues.length} issue{version.fixedIssues.length !== 1 ? 's' : ''}
                      </div>
                    )}
                    
                    <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                      <button 
                        style={{
                          background: '#007bff',
                          border: 'none',
                          color: 'white',
                          borderRadius: 4,
                          padding: '4px 8px',
                          cursor: 'pointer',
                          fontSize: '0.7rem',
                          flex: '1 1 calc(50% - 2px)'
                        }}
                        onClick={() => {
                          // Create a mock document object for the version
                          const versionDoc = {
                            ...showingVersionsFor,
                            key: version.s3Key || `cases/${cs.id}/documents/${showingVersionsFor.id}/versions/${version.versionId}.pdf`
                          };
                          handleDownload(versionDoc);
                        }}
                      >
                        📥 Download
                      </button>
                      <button 
                        style={{
                          background: '#28a745',
                          border: 'none',
                          color: 'white',
                          borderRadius: 4,
                          padding: '4px 8px',
                          cursor: 'pointer',
                          fontSize: '0.7rem',
                          flex: '1 1 calc(50% - 2px)'
                        }}
                        onClick={() => {
                          // Create a mock document object for the version
                          const versionDoc = {
                            ...showingVersionsFor,
                            key: version.s3Key || `cases/${cs.id}/documents/${showingVersionsFor.id}/versions/${version.versionId}.pdf`,
                            filename: version.fileName
                          };
                          handlePreview(versionDoc);
                        }}
                      >
                        👁️ Preview
                      </button>
                      <button 
                        style={{
                          background: '#17a2b8',
                          border: 'none',
                          color: 'white',
                          borderRadius: 4,
                          padding: '4px 8px',
                          cursor: 'pointer',
                          fontSize: '0.7rem',
                          flex: '1 1 calc(50% - 2px)'
                        }}
                        onClick={() => {
                          // Create a mock document object for the version
                          const versionDoc = {
                            ...showingVersionsFor,
                            key: version.s3Key || `cases/${cs.id}/documents/${showingVersionsFor.id}/versions/${version.versionId}.pdf`,
                            filename: version.fileName
                          };
                          handleReview(versionDoc);
                        }}
                      >
                        🔍 Review
                      </button>
                      <button 
                        style={{
                          background: '#dc3545',
                          border: 'none',
                          color: 'white',
                          borderRadius: 4,
                          padding: '4px 8px',
                          cursor: 'pointer',
                          fontSize: '0.7rem',
                          flex: '1 1 calc(50% - 2px)'
                        }}
                        onClick={() => {
                          if (window.confirm(`Delete version ${version.versionNumber} (${version.fileName})?`)) {
                            // For now, just show an alert since we need to implement version deletion endpoint
                            alert(`Version deletion not yet implemented. Would delete: ${version.fileName}`);
                          }
                        }}
                      >
                        �️ Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ 
                textAlign: 'center', 
                color: '#6b7280', 
                padding: 40,
                fontSize: '14px'
              }}>
                <div style={{ fontSize: '32px', marginBottom: 12 }}>📄</div>
                <div>No versions available yet.</div>
                <div style={{ fontSize: '12px', marginTop: 4 }}>
                  Review and fix issues to create versions.
                </div>
              </div>
            )}
          </div>
        </div>
      )}
        </div> {/* closing flex gap-6 */}
      </div> {/* closing main-content */}
    </div> {/* closing container */}
  );
}
