import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import PDFUpload from '../PDFUpload';

const API_BASE = 'https://phd54f79fk.execute-api.us-east-1.amazonaws.com/dev';

// Component for displaying a document with modern styling
const DocumentItem = ({ document, onPreview, onShowVersions, onReview, reviewing }) => {
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
                {document.filename || document.name}
              </div>
              <div className="text-sm text-gray-500">
                {document.uploadedAt || new Date(document.createdAt).toLocaleDateString()}
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
                backgroundColor: reviewing === document.id ? '#6c757d' : '#28a745',
                color: 'white',
                padding: '6px 12px',
                border: 'none',
                borderRadius: '4px',
                fontSize: '14px',
                cursor: reviewing === document.id ? 'not-allowed' : 'pointer'
              }}
              onClick={() => {
                if (onReview && reviewing !== document.id) onReview(document);
              }}
              disabled={reviewing === document.id}
            >
              {reviewing === document.id ? '⏳ Reviewing...' : '🔍 Review'}
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

// Folder item component
const FolderItem = ({ folder, onClick }) => {
  return (
    <div className="card cursor-pointer mb-2" onClick={onClick}>
      <div className="card-body p-4">
        <div className="flex items-center">
          <div className="file-icon bg-blue-100" style={{ color: '#3b82f6' }}>
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
  );
};

export default function CaseView() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [cs, setCs] = useState(null);
  const [loading, setLoading] = useState(true);
  
  // Folder functionality state
  const [folders, setFolders] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [currentFolder, setCurrentFolder] = useState(null);
  const [showCreateFolder, setShowCreateFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  
  // Document preview state
  const [previewUrl, setPreviewUrl] = useState(null);
  const [previewingDoc, setPreviewingDoc] = useState(null);
  const [showingVersionsFor, setShowingVersionsFor] = useState(null);
  
  // Review state
  const [reviewing, setReviewing] = useState(null);
  const [reviewResults, setReviewResults] = useState(null);
  const [showReviewMode, setShowReviewMode] = useState(false);
  const [editableContent, setEditableContent] = useState('');
  const [selectedIssue, setSelectedIssue] = useState(null);

  // Ref for editable div
  const editableDivRef = useRef(null);

  const handleSidebarIssueClick = (issue) => {
    setSelectedIssue(issue);
    setTimeout(() => {
      const el = document.getElementById(`issue-${issue.id}`);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        // Select the text inside the span
        const range = document.createRange();
        range.selectNodeContents(el);
        const sel = window.getSelection();
        sel.removeAllRanges();
        sel.addRange(range);
      }
    }, 100);
  };

  // Load case details
  const loadCase = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE}/cases/${id}`);
      if (response.ok) {
        const data = await response.json();
        setCs(data.case || data);
      } else if (response.status === 404) {
        navigate('/cases');
      }
    } catch (error) {
      console.error('Error loading case:', error);
      navigate('/cases');
    } finally {
      setLoading(false);
    }
  }, [id, navigate]);

  // Load folders and documents
  const loadFoldersAndDocuments = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/cases/${id}/folders`);
      if (res.ok) {
        const data = await res.json();
        setFolders(data.folders || []);
        setDocuments(data.documents || []);
      }
    } catch (error) {
      console.error('Error loading folders:', error);
    }
  }, [id]);

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
        },
        body: JSON.stringify({
          caseId: id,
          folderName: newFolderName.trim(),
          parentPath: currentFolder?.path || ''
        })
      });

      if (res.ok) {
        setNewFolderName('');
        setShowCreateFolder(false);
        loadFoldersAndDocuments();
      } else {
        const error = await res.json().catch(() => ({}));
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
    setCurrentFolder(null);
  };

  // Handle document preview
  const handlePreview = async (doc) => {
    try {
      if (!doc.filename && !doc.name) {
        alert('Cannot preview document: filename not available');
        return;
      }

      const filename = doc.filename || doc.name;
      if (!filename.toLowerCase().endsWith('.pdf')) {
        alert(`Cannot preview ${filename}. Only PDF files can be previewed.`);
        return;
      }

      const previewUrl = `${API_BASE}/s3/download?key=${encodeURIComponent(doc.key)}&t=${sessionStorage.getItem('accessToken')}`;
      setPreviewUrl(previewUrl);
      setPreviewingDoc(doc);
    } catch (error) {
      console.error('Preview error:', error);
      alert('Failed to preview document');
    }
  };

  // Handle show versions
  const handleShowVersions = (doc) => {
    setShowingVersionsFor(doc);
  };

  const handleReview = async (doc) => {
    try {
      setReviewing(doc.id);
      setReviewResults(null);
      
      const res = await fetch(`${API_BASE}/contracts/review`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json', 
          'Authorization': `Bearer ${sessionStorage.getItem('accessToken')}` 
        },
        body: JSON.stringify({ key: doc.key || `cases/${id}/documents/${doc.id}/document.pdf` })
      });
      
      if (!res.ok) throw new Error('Review failed');
      
      const data = await res.json();
      
      setReviewResults({
        document: doc,
        ...data
      });
      
      // Set the editable content from the original text
      setEditableContent(data.originalText || '');
      
      // Set preview mode but with review data
      setPreviewingDoc(doc);
      setPreviewUrl(null); // Clear regular preview
      setShowReviewMode(true); // New state for review mode
      
    } catch (error) {
      console.error('Review error:', error);
      alert('Failed to review document: ' + error.message);
    } finally {
      setReviewing(null);
    }
  };

  // Close preview
  const closePreview = () => {
    setPreviewUrl(null);
    setPreviewingDoc(null);
    setShowReviewMode(false);
    setReviewResults(null);
    setEditableContent('');
    setSelectedIssue(null);
  };

  // Apply a suggested fix to the editable content
  const applyFix = (issue) => {
    if (!issue.suggestedText || !issue.originalText) {
      alert('No suggested text available for this issue');
      return;
    }

    const updatedContent = editableContent.replace(issue.originalText, issue.suggestedText);
    setEditableContent(updatedContent);
    
    // Remove this issue from the list since it's been fixed
    if (reviewResults) {
      const updatedIssues = reviewResults.issues.filter(i => i.id !== issue.id);
      setReviewResults({
        ...reviewResults,
        issues: updatedIssues
      });
    }
    
    alert('Fix applied successfully!');
  };

  // Close versions
  const closeVersions = () => {
    setShowingVersionsFor(null);
  };

  // Utility to highlight all issues in the contract text
  function getHighlightedHtml(content, issues, selectedIssueId) {
    if (!issues || issues.length === 0) return content.replace(/\n/g, '<br/>');
    let html = content;
    // Sort issues by originalText length descending to avoid nested replacements
    const sorted = [...issues].sort((a, b) => (b.originalText?.length || 0) - (a.originalText?.length || 0));
    sorted.forEach(issue => {
      if (!issue.originalText) return;
      // Escape regex special chars in originalText
      const escaped = issue.originalText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      // Only replace the first occurrence for each issue
      html = html.replace(
        new RegExp(escaped, 'm'),
        `<span id="issue-${issue.id}" class="issue-highlight ${issue.type} ${selectedIssueId===issue.id?'selected':''}" style="background:${issue.type==='error'?'#ffeaea':issue.type==='warning'?'#fffbe6':'#e6f7ff'};color:#111;font-weight:600;border:2px solid ${issue.type==='error'?'#dc3545':issue.type==='warning'?'#ffc107':'#17a2b8'};border-radius:4px;padding:2px 4px;box-shadow:0 1px 4px rgba(0,0,0,0.04);cursor:pointer;">${issue.originalText}</span>`
      );
    });
    return html.replace(/\n/g, '<br/>');
  }

  useEffect(() => {
    if (id) {
      loadCase();
      loadFoldersAndDocuments();
    }
  }, [id, loadCase, loadFoldersAndDocuments]);

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
          {cs.description && (
            <p className="page-description">{cs.description}</p>
          )}
        </div>

        {/* Document Preview */}
        {previewUrl && previewingDoc && !showReviewMode && (
          <div className="card mb-6">
            <div className="card-header">
              <div className="flex items-center justify-between">
                <h3 className="card-title">
                  Document Preview: {previewingDoc.filename || previewingDoc.name}
                </h3>
                <button 
                  onClick={closePreview}
                  className="btn btn-secondary btn-sm"
                >
                  Close Preview
                </button>
              </div>
            </div>
            <div className="card-body p-0">
              <iframe
                src={previewUrl}
                style={{ width: '100%', height: '70vh', border: 'none' }}
                title="Document Preview"
              />
            </div>
          </div>
        )}

        {/* Document Review Interface */}
        {showReviewMode && previewingDoc && reviewResults && (
          <div className="card mb-6">
            <div className="card-header">
              <div className="flex items-center justify-between">
                <h3 className="card-title">
                  Contract Review: {previewingDoc.filename || previewingDoc.name}
                </h3>
                <div className="flex gap-2">
                  <span style={{
                    padding: '4px 8px',
                    borderRadius: '4px',
                    fontSize: '12px',
                    backgroundColor: reviewResults.overallRisk === 'High' ? '#dc3545' : 
                                   reviewResults.overallRisk === 'Medium' ? '#ffc107' : '#28a745',
                    color: 'white'
                  }}>
                    Risk: {reviewResults.overallRisk}
                  </span>
                  <button 
                    onClick={closePreview}
                    className="btn btn-secondary btn-sm"
                  >
                    Close Review
                  </button>
                </div>
              </div>
            </div>
            <div className="card-body p-0" style={{ display: 'flex', height: '70vh' }}>
              {/* Editable Content Area */}
              <div style={{ 
                flex: '1', 
                borderRight: '1px solid #e5e7eb',
                overflow: 'auto'
              }}>
                <div
                  ref={editableDivRef}
                  contentEditable
                  suppressContentEditableWarning
                  style={{
                    width: '100%',
                    height: '100%',
                    border: '1px solid #d1d5db',
                    borderRadius: '8px',
                    background: '#fff',
                    color: '#222',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
                    padding: '28px',
                    fontFamily: 'Menlo, Monaco, Consolas, monospace',
                    fontSize: '16px',
                    lineHeight: '1.8',
                    outline: 'none',
                    overflow: 'auto',
                    whiteSpace: 'pre-wrap',
                    margin: '18px',
                  }}
                  dangerouslySetInnerHTML={{
                    __html: getHighlightedHtml(editableContent, reviewResults.issues, selectedIssue?.id)
                  }}
                  onInput={e => setEditableContent(e.currentTarget.innerText)}
                />
              </div>

              {/* Issues Sidebar */}
              <div style={{ 
                width: '370px', 
                backgroundColor: '#f9fafb',
                color: '#1a1a1a',
                fontSize: '15px',
                fontWeight: 500,
                borderLeft: '2px solid #e5e7eb',
                boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
                padding: '28px',
                overflow: 'auto',
              }}>
                <h4 style={{ margin: '0 0 15px 0', fontSize: '16px' }}>
                  Issues Found ({reviewResults.issues?.length || 0})
                </h4>
                
                {reviewResults.summary && (
                  <div style={{
                    backgroundColor: 'white',
                    padding: '12px',
                    borderRadius: '6px',
                    marginBottom: '15px',
                    border: '1px solid #e5e7eb'
                  }}>
                    <strong>Summary:</strong> {reviewResults.summary}
                  </div>
                )}

                {reviewResults.issues?.map((issue, index) => (
                  <div 
                    key={issue.id || index} 
                    style={{
                      backgroundColor: 'white',
                      border: '2px solid #e5e7eb',
                      borderLeft: `6px solid ${
                        issue.type === 'error' ? '#dc3545' : 
                        issue.type === 'warning' ? '#ffc107' : '#17a2b8'
                      }`,
                      borderRadius: '8px',
                      padding: '18px',
                      marginBottom: '18px',
                      cursor: 'pointer',
                      boxShadow: '0 1px 6px rgba(0,0,0,0.04)'
                    }}
                    onClick={() => handleSidebarIssueClick(issue)}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', marginBottom: '8px' }}>
                      <span style={{ marginRight: '8px' }}>
                        {issue.type === 'error' ? '🔴' : issue.type === 'warning' ? '🟡' : '🔵'}
                      </span>
                      <strong style={{ fontSize: '14px' }}>{issue.title}</strong>
                    </div>
                    
                    <p style={{ 
                      margin: '8px 0', 
                      fontSize: '13px',
                      color: '#374151'
                    }}>
                      {issue.description}
                    </p>
                    
                    {issue.suggestion && (
                      <div style={{
                        backgroundColor: '#f1f5f9',
                        padding: '8px',
                        borderRadius: '4px',
                        marginBottom: '8px',
                        fontSize: '13px'
                      }}>
                        <strong>Suggestion:</strong> {issue.suggestion}
                      </div>
                    )}
                    
                    {issue.originalText && issue.suggestedText && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          applyFix(issue);
                        }}
                        style={{
                          backgroundColor: '#28a745',
                          color: 'white',
                          border: 'none',
                          borderRadius: '4px',
                          padding: '6px 12px',
                          fontSize: '12px',
                          cursor: 'pointer',
                          width: '100%'
                        }}
                      >
                        Apply Fix
                      </button>
                    )}
                    
                    {issue.section && (
                      <div style={{ 
                        fontSize: '11px', 
                        color: '#6b7280', 
                        marginTop: '8px'
                      }}>
                        {issue.section}
                        {issue.line && ` • Line ${issue.line}`}
                      </div>
                    )}
                  </div>
                ))}

                {(!reviewResults.issues || reviewResults.issues.length === 0) && (
                  <div style={{
                    textAlign: 'center',
                    padding: '40px 20px',
                    color: '#6b7280'
                  }}>
                    <div style={{ fontSize: '24px', marginBottom: '10px' }}>✅</div>
                    <div>All issues resolved!</div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Main Content */}
        <div className="flex gap-6">
          {/* Documents Section */}
          <div className="flex-1">
            <div className="card">
              <div className="card-header">
                <div className="flex items-center justify-between">
                  <h3 className="card-title flex items-center gap-2">
                    {currentFolder ? (
                      <>📁 {currentFolder.name}</>
                    ) : (
                      <>📄 Documents</>
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

              <div className="card-body">
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

                {/* Folders List */}
                {folders
                  .filter(folder => !currentFolder || folder.path.startsWith(currentFolder.path + '/'))
                  .map(folder => (
                    <FolderItem 
                      key={folder.path} 
                      folder={folder} 
                      onClick={() => handleEnterFolder(folder)}
                    />
                  ))
                }

                {/* Documents List */}
                {documents
                  .filter(doc => {
                    if (!currentFolder) {
                      return !doc.folderPath;
                    }
                    return doc.folderPath === currentFolder.path;
                  })
                  .map(doc => (
                    <DocumentItem 
                      key={doc.id || doc.name} 
                      document={doc}
                      onPreview={handlePreview}
                      onShowVersions={handleShowVersions}
                      onReview={handleReview}
                      reviewing={reviewing}
                    />
                  ))
                }

                {/* Legacy case documents if no folders/documents */}
                {(!folders.length && !documents.length) && (cs.documents || []).map(d => (
                  <DocumentItem 
                    key={d.id} 
                    document={d}
                    onPreview={handlePreview}
                    onShowVersions={handleShowVersions}
                    onReview={handleReview}
                    reviewing={reviewing}
                  />
                ))}

                {/* Empty state */}
                {folders.length === 0 && documents.length === 0 && (!cs.documents || cs.documents.length === 0) && (
                  <div className="empty-state">
                    <div className="empty-state-icon">📄</div>
                    <h3>No documents yet</h3>
                    <p>Upload your first document to get started.</p>
                  </div>
                )}
              </div>
            </div>

            {/* Upload Section */}
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

          {/* Versions Sidebar */}
          {showingVersionsFor && (
            <div className="card" style={{ width: '400px' }}>
              <div className="card-header">
                <div className="flex items-center justify-between">
                  <h3 className="card-title">Document Versions</h3>
                  <button 
                    onClick={closeVersions}
                    className="btn btn-ghost btn-sm"
                  >
                    ×
                  </button>
                </div>
              </div>
              <div className="card-body">
                <div className="empty-state">
                  <div className="empty-state-icon">📄</div>
                  <h4>No versions available yet</h4>
                  <p className="text-sm">Document versions will appear here after processing.</p>
                </div>
              </div>
            </div>
          )}
        </div>


      </div>
    </div>
  );
}