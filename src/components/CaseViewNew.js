import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import PDFUpload from '../PDFUpload';
import ReviewPane from './ReviewPane';

const API_BASE = 'https://phd54f79fk.execute-api.us-east-1.amazonaws.com/dev';

// Helper to check for authentication errors and redirect if necessary
function handleAuthError(response, errorData) {
  if (response.status === 401 || 
      (errorData && typeof errorData === 'object' && errorData.error && 
       (errorData.error.includes('token') || errorData.error.includes('expired') || errorData.error.includes('Invalid')))) {
    sessionStorage.removeItem('accessToken');
    window.location.href = '/dashboard';
    return true;
  }
  return false;
}

// Helper to extract an array from various backend response shapes
function extractArrayFromResponse(data) {
  if (!data) return [];
  if (Array.isArray(data)) return data;
  if (Array.isArray(data.versions)) return data.versions;
  if (Array.isArray(data.data)) return data.data;
  if (typeof data === 'object') {
    const arr = Object.values(data).find(v => Array.isArray(v));
    if (Array.isArray(arr)) return arr;
  }
  return [];
}

// Component for displaying a document with modern styling
const DocumentItem = ({ document, onPreview, onShowVersions, onReview, reviewing, previewLoading }) => {
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
                Last updated: {document.lastReviewedAt ? new Date(document.lastReviewedAt).toLocaleDateString() : 
                               document.uploadedAt ? new Date(document.uploadedAt).toLocaleDateString() : 
                               'Not reviewed yet'}
              </div>
            </div>
          </div>
          <div className="flex gap-2">
            <button 
              className="btn btn-primary btn-sm" 
              onClick={() => onPreview(document)}
              disabled={previewLoading}
            >
              {previewLoading ? '⏳ Loading...' : '👁️ Preview'}
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

// ... folders removed - we no longer use folder API

export default function CaseView() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [cs, setCs] = useState(null);
  const [loading, setLoading] = useState(true);
  
  // Folder functionality state
  const [documents, setDocuments] = useState([]);
  
  // Document preview state
  const [previewUrl, setPreviewUrl] = useState(null);
  const [previewingDoc, setPreviewingDoc] = useState(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [showingVersionsFor, setShowingVersionsFor] = useState(null);
  
  // Review state
  const [reviewing, setReviewing] = useState(null);
  const [reviewResults, setReviewResults] = useState(null);
  const [showReviewMode, setShowReviewMode] = useState(false);
  const [editableContent, setEditableContent] = useState('');
  const [originalContent, setOriginalContent] = useState(''); // Store original content for preview mode
  const [isPreviewMode, setIsPreviewMode] = useState(false); // Track if we're previewing a version
  const [previewingVersion, setPreviewingVersion] = useState(null); // Track which version we're previewing
  const [selectedIssue, setSelectedIssue] = useState(null);
  const [completedIssues, setCompletedIssues] = useState(new Set()); // Track manually completed issues

  // Ref for editable div
  const editableDivRef = useRef(null);

  // Versions cache (docId -> versions array)
  const [versionsCache, setVersionsCache] = useState({});

  // Client state
  const [clients, setClients] = useState([]);
  const [selectedClientId, setSelectedClientId] = useState('');
  const [clientsLoading, setClientsLoading] = useState(false);

  const fetchVersionsFor = useCallback(async (docId) => {
    try {
      const token = sessionStorage.getItem('accessToken');
      const res = await fetch(`${API_BASE}/documents/${docId}/versions`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      if (res.ok) {
        const data = await res.json().catch(() => null);
        console.debug('Fetched versions for', docId, 'raw:', data);
        const arr = extractArrayFromResponse(data);
        console.debug('Extracted versions arr length', arr.length);
        setVersionsCache(prev => ({ ...prev, [docId]: arr }));
        return arr;
      }
    } catch (e) {
      // ignore
    }
    setVersionsCache(prev => ({ ...prev, [docId]: [] }));
    return [];
  }, []);

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
        setSelectedClientId(data.case?.client_id || data.case?.client || data.client_id || data.client || '');
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

  // Load documents for the case
  const loadDocuments = useCallback(async () => {
    try {
      const url = `${API_BASE}/case-folders/${id}`;
      const token = sessionStorage.getItem('accessToken');
      console.log('Loading documents - URL:', url, 'token present:', !!token);
      const res = await fetch(url, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        }
      });
      console.log('Documents GET status:', res.status, 'ok:', res.ok);
      if (res.ok) {
        const data = await res.json();
        setDocuments(data.documents || []);
      }
      else {
        const text = await res.text().catch(() => '');
        console.error('Failed to load documents. Status:', res.status, 'Body:', text);
      }
    } catch (error) {
      console.error('Error loading documents:', error);
    }
  }, [id]);

  // Load clients for the dropdown
  const loadClients = useCallback(async () => {
    try {
      setClientsLoading(true);
      const token = sessionStorage.getItem('accessToken');
      const response = await fetch(`${API_BASE}/clients`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setClients(data.clients || []);
      } else {
        console.error('Failed to fetch clients');
      }
    } catch (error) {
      console.error('Error fetching clients:', error);
    } finally {
      setClientsLoading(false);
    }
  }, []);

  // Handle client selection
  const handleClientChange = async (clientId) => {
    try {
      setSelectedClientId(clientId);
      
      const requestBody = {
        id: cs.id,
        title: cs.title,
        description: cs.description || '',
        status: cs.status || 'active',
        priority: cs.priority || 'medium',
        type: cs.type || 'General',
        client: clientId || '',
        createdAt: cs.createdAt,
        updatedAt: new Date().toISOString().split('T')[0]
      };
      
      const token = sessionStorage.getItem('accessToken');
      const response = await fetch(`${API_BASE}/cases/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(requestBody)
      });

      const data = await response.json();
      
      // Backend returns HTTP 400 but with success=true - handle this quirk
      if (data && data.success === true) {
        // Backend succeeded, use returned case data but ensure client field is correct
        const updatedCase = data.updatedCase || data.case;
        if (updatedCase) {
          // Ensure the client field matches what we're saving (backend sometimes clears it)
          updatedCase.client = clientId;
          setCs(updatedCase);
        }
        setSelectedClientId(clientId);
        setSaveStatus({ type: 'success', message: 'Client association updated successfully' });
      } else {
        // True error case - keep selection but show error
        setSaveStatus({ type: 'error', message: `Failed to update client association: ${data.error || 'Unknown error'}` });
      }
    } catch (error) {
      console.error('Error updating client:', error);
      // Don't reset the dropdown on network error - keep the selection
      setSaveStatus({ type: 'error', message: 'Error updating client association' });
    }
    
    // Clear status after 3 seconds
    setTimeout(() => setSaveStatus(null), 3000);
  };

  // Handle document preview
  const handlePreview = async (doc) => {
    try {
      console.log('=== PREVIEW DEBUG ===');
      console.log('Document:', doc);
      console.log('Document key:', doc.key);
      
      if (!doc.key) {
        console.error('No document key found!');
        alert('Cannot preview document: missing key');
        return;
      }

      // Check if file is a PDF before attempting preview
      if (!doc.filename.toLowerCase().endsWith('.pdf')) {
        alert(`Cannot preview ${doc.filename}. Only PDF files can be previewed. Please download the file to view it.`);
        return;
      }

      setPreviewLoading(true);

      // Test the preview URL first to check for auth issues
      const token = sessionStorage.getItem('accessToken');
      const previewUrl = `${API_BASE}/s3/download?key=${encodeURIComponent(doc.key)}&t=${token}`;
      
      console.log('Preview URL:', previewUrl);
      console.log('Document key used:', doc.key);
      
      // Test the URL with a HEAD request to check if it's accessible
      try {
        const testResponse = await fetch(previewUrl, { method: 'HEAD' });
        
        if (!testResponse.ok) {
          const errorText = await testResponse.text();
          let errorData;
          try {
            errorData = JSON.parse(errorText);
          } catch (e) {
            errorData = { error: errorText };
          }
          
          // Handle authentication errors
          if (handleAuthError(testResponse, errorData)) {
            return;
          }
          
          throw new Error(`Preview failed: ${testResponse.status} ${testResponse.statusText}`);
        }
        
        setPreviewUrl(previewUrl);
        setPreviewingDoc(doc);
        setShowReviewMode(false); // Show iframe preview, not review mode
        
      } catch (networkError) {
        // If HEAD request fails, try a different approach - use the download endpoint with proper auth header
        console.warn('HEAD request failed, trying alternative approach:', networkError);
        
        const downloadResponse = await fetch(`${API_BASE}/s3/download?key=${encodeURIComponent(doc.key)}`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        
        if (!downloadResponse.ok) {
          const errorText = await downloadResponse.text();
          let errorData;
          try {
            errorData = JSON.parse(errorText);
          } catch (e) {
            errorData = { error: errorText };
          }
          
          // Handle authentication errors
          if (handleAuthError(downloadResponse, errorData)) {
            return;
          }
          
          throw new Error(`Preview failed: ${downloadResponse.status} - ${errorData.error || downloadResponse.statusText}`);
        }
        
        // If the download endpoint works, use the original URL for iframe
        setPreviewUrl(previewUrl);
        setPreviewingDoc(doc);
        setShowReviewMode(false);
      }
      
    } catch (error) {
      console.error('Preview error:', error);
      alert('Failed to preview document: ' + error.message);
    } finally {
      setPreviewLoading(false);
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
      setCompletedIssues(new Set()); // Reset completed issues for new review
      
      const res = await fetch(`${API_BASE}/contracts/review`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json', 
          'Authorization': `Bearer ${sessionStorage.getItem('accessToken')}` 
        },
        body: JSON.stringify({ key: doc.key || `cases/${id}/documents/${doc.id}/document.pdf` })
      });

      if (!res.ok) {
        const errorText = await res.text();
        let errorData;
        try {
          errorData = JSON.parse(errorText);
        } catch (e) {
          errorData = { error: errorText };
        }
        
        // Handle authentication errors
        if (handleAuthError(res, errorData)) {
          return;
        }
        
        throw new Error(errorData.error || `Review failed: ${res.status}`);
      }

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
  };  // Close preview
  const closePreview = () => {
    setPreviewUrl(null);
    setPreviewingDoc(null);
    setPreviewLoading(false);
    setShowReviewMode(false);
    setReviewResults(null);
    setEditableContent('');
    setSelectedIssue(null);
    setCompletedIssues(new Set()); // Reset completed issues
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

  // Mark an issue as manually completed
  const markIssueComplete = (issue) => {
    setCompletedIssues(prev => new Set([...prev, issue.id]));
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
      loadDocuments();
      loadClients();
    }
  }, [id, loadCase, loadDocuments, loadClients]);

  const [versionsRefreshKey, setVersionsRefreshKey] = useState(0);
  const [saveStatus, setSaveStatus] = useState(null); // { type: 'success'|'error', message }

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
          {cs.description && (
            <p className="page-description">{cs.description}</p>
          )}
          
          {/* Client Selection and Info */}
          <div className="mt-6">
            <div className="card">
              <div className="card-body">
                <h3 className="card-title">Client Information</h3>
                
                <div className="grid grid-cols-1 gap-6">
                  {/* Client Selection Dropdown */}
                  <div className="form-group">
                    <label className="form-label">Associated Client</label>
                    <select
                      value={selectedClientId}
                      onChange={(e) => handleClientChange(e.target.value)}
                      className="form-select"
                      disabled={clientsLoading}
                    >
                      <option value="">
                        {clientsLoading ? 'Loading clients...' : 'Select a client'}
                      </option>
                      {clients.map(client => (
                        <option key={client.id} value={client.id}>
                          {client.first_name} {client.last_name} {client.company_name ? `(${client.company_name})` : ''}
                        </option>
                      ))}
                    </select>
                  </div>
                  
                  {/* Client Details Display */}
                  {selectedClientId && (() => {
                    const selectedClient = clients.find(c => c.id === selectedClientId);
                    return selectedClient ? (
                      <div className="grid grid-cols-2 gap-6">
                        <div>
                          <h4 className="text-lg font-medium mb-3">Contact Details</h4>
                          <div className="space-y-2">
                            <p><span className="font-medium">Name:</span> {selectedClient.first_name} {selectedClient.last_name}</p>
                            {selectedClient.company_name && (
                              <p><span className="font-medium">Company:</span> {selectedClient.company_name}</p>
                            )}
                            <p><span className="font-medium">Email:</span> {selectedClient.email}</p>
                            {selectedClient.phone && (
                              <p><span className="font-medium">Phone:</span> {selectedClient.phone}</p>
                            )}
                          </div>
                        </div>
                        
                        {selectedClient.address && (
                          <div>
                            <h4 className="text-lg font-medium mb-3">Address</h4>
                            <div className="space-y-1">
                              <p>{selectedClient.address.street}</p>
                              <p>{selectedClient.address.city}, {selectedClient.address.state} {selectedClient.address.zip}</p>
                              {selectedClient.address.country && (
                                <p>{selectedClient.address.country}</p>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    ) : null;
                  })()}
                </div>
              </div>
            </div>
          </div>
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
                onError={(e) => {
                  console.error('Iframe failed to load:', e);
                  alert('Failed to load document preview. Please try again or download the document.');
                  closePreview();
                }}
                onLoad={(e) => {
                  console.log('Iframe loaded successfully');
                }}
              />
            </div>
          </div>
        )}

        {/* Document Review Interface */}
        {showReviewMode && previewingDoc && reviewResults && (
          <ReviewPane
            reviewResults={reviewResults}
            previewingDoc={previewingDoc}
            isPreviewMode={isPreviewMode}
            previewingVersion={previewingVersion}
            editableContent={editableContent}
            setEditableContent={setEditableContent}
            completedIssues={completedIssues}
            selectedIssue={selectedIssue}
            saveStatus={saveStatus}
            setSaveStatus={setSaveStatus}
            setIsPreviewMode={setIsPreviewMode}
            setOriginalContent={setOriginalContent}
            setPreviewingVersion={setPreviewingVersion}
            originalContent={originalContent}
            getHighlightedHtml={getHighlightedHtml}
            handleSidebarIssueClick={handleSidebarIssueClick}
            applyFix={applyFix}
            markIssueComplete={markIssueComplete}
            editableDivRef={editableDivRef}
            onClose={() => setShowReviewMode(false)}
            onSaveVersion={async () => {
              try {
                const token = sessionStorage.getItem('accessToken');
                const res = await fetch(`${API_BASE}/contracts/save-version`, {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                  },
                  body: JSON.stringify({
                    caseId: id,
                    documentId: previewingDoc.id,
                    contractText: editableContent,
                    versionType: 'fixed',
                    fixedIssues: completedIssues ? Array.from(completedIssues) : [],
                  }),
                });
                
                const textOrJson = await res.text();
                let data = null;
                try { data = JSON.parse(textOrJson); } catch(e){ data = textOrJson; }
                console.debug('Save version response raw:', textOrJson, 'parsed:', data);
                
                if (res.ok) {
                  console.debug('Save succeeded, fetching versions for', previewingDoc.id);
                  let createdProvided = false;
                  // If backend returned the created version, merge it into cache
                  if (data && typeof data === 'object') {
                    // attempt to find versions array or single version
                    if (Array.isArray(data)) {
                      setVersionsCache(prev => ({ ...prev, [previewingDoc.id]: data }));
                      createdProvided = true;
                    } else if (data.version) {
                      setVersionsCache(prev => {
                        const prevArr = prev[previewingDoc.id] || [];
                        return { ...prev, [previewingDoc.id]: [data.version, ...prevArr] };
                      });
                      createdProvided = true;
                    } else if (Array.isArray(data.versions)) {
                      setVersionsCache(prev => ({ ...prev, [previewingDoc.id]: data.versions }));
                      createdProvided = true;
                    }
                  }

                  // If server didn't return the created version, create a local synthetic version
                  if (!createdProvided) {
                    const now = new Date().toISOString();
                    setVersionsCache(prev => {
                      const prevArr = prev[previewingDoc.id] || [];
                      const synthetic = {
                        id: `local-${Date.now()}`,
                        versionNumber: (prevArr.length ? (Math.max(...prevArr.map(v => v.versionNumber || 0)) + 1) : 1),
                        createdAt: now,
                        content: editableContent,
                        note: 'Local (pending server)'
                      };
                      return { ...prev, [previewingDoc.id]: [synthetic, ...prevArr] };
                    });
                  }

                  // Retry fetching versions a few times to handle eventual consistency or small delays
                  let latest = [];
                  const maxAttempts = 3;
                  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
                    try {
                      latest = await fetchVersionsFor(previewingDoc.id);
                      console.debug(`Attempt ${attempt} fetched ${latest.length} versions`);
                      if (latest && latest.length > 0) break;
                    } catch (e) {
                      console.error('Error fetching versions attempt', attempt, e);
                    }
                    // small backoff
                    await new Promise(r => setTimeout(r, 500 * attempt));
                  }

                  if (!latest || latest.length === 0) {
                    console.error('Save returned OK but no versions found after retries for', previewingDoc.id);
                    setSaveStatus({ type: 'error', message: 'Saved but not indexed yet; try refreshing' });
                  } else {
                    setVersionsCache(prev => ({ ...prev, [previewingDoc.id]: latest }));
                    setVersionsRefreshKey(k => k + 1);
                    setSaveStatus({ type: 'success', message: 'Version saved' });
                  }
                } else {
                  // Handle authentication errors
                  if (handleAuthError(res, data)) {
                    return;
                  }
                  
                  setSaveStatus({ type: 'error', message: `Failed to save version: ${res.status}` });
                }
              } catch (err) {
                setSaveStatus({ type: 'error', message: 'Error saving version' });
              }

              // clear status after short timeout
              setTimeout(() => setSaveStatus(null), 4000);
            }}
          />
        )}

        {/* Main Content */}
        <div className="flex gap-6">
          {/* Documents Section */}
          <div className="flex-1">
            <div className="card">
              <div className="card-header">
                <div className="flex items-center justify-between">
                  <h3 className="card-title flex items-center gap-2">📄 Documents</h3>
                </div>
              </div>

              <div className="card-body">
                {/* Documents List */}
                {documents.map(doc => (
                  <DocumentItem 
                    key={doc.id || doc.name} 
                    document={doc}
                    onPreview={handlePreview}
                    onShowVersions={handleShowVersions}
                    onReview={handleReview}
                    reviewing={reviewing}
                  />
                ))}

                {/* Legacy case documents if no documents loaded */}
                {documents.length === 0 && (cs.documents || []).length > 0 && (cs.documents || []).map(d => (
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
                {documents.length === 0 && (!cs.documents || cs.documents.length === 0) && (
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
                onUploaded={() => {
                  loadCase();
                  loadDocuments();
                }} 
              />
            </div>
          </div>

          {/* Versions Sidebar */}
          {showingVersionsFor && (
            <VersionsSidebar 
              doc={showingVersionsFor} 
              onClose={closeVersions} 
              refreshKey={versionsRefreshKey} 
              initialVersions={versionsCache[showingVersionsFor.id] || null}
              onPreviewVersion={(version) => {
                // Save current content and switch to preview mode
                setOriginalContent(editableContent);
                setEditableContent(version.content);
                setIsPreviewMode(true);
                setPreviewingVersion(version);
              }}
            />
          )}
        </div>

        {/* Delete Case Button at the very bottom */}
        <div className="flex justify-end mt-8">
          <button
            className="btn btn-danger"
            onClick={async () => {
              if (window.confirm('Delete this case? This action cannot be undone.')) {
                try {
                  const token = sessionStorage.getItem('accessToken');
                  const res = await fetch(`https://phd54f79fk.execute-api.us-east-1.amazonaws.com/dev/cases/${id}`, {
                    method: 'DELETE',
                    headers: {
                      'Content-Type': 'application/json',
                      'Authorization': `Bearer ${token}`,
                    },
                  });
                  if (res.ok) {
                    navigate('/cases');
                  } else {
                    const text = await res.text();
                    alert('Failed to delete case: ' + res.status + '\n' + text);
                  }
                } catch (e) {
                  alert('Error deleting case');
                }
              }
            }}
          >
            Delete Case
          </button>
        </div>

      </div>
    </div>
  );
}

// Add VersionsSidebar component at the bottom of the file:
function VersionsSidebar({ doc, onClose, refreshKey, initialVersions, onPreviewVersion }) {
  const [versions, setVersions] = React.useState(initialVersions || []);
  const [loading, setLoading] = React.useState(true);
  const [actionStatus, setActionStatus] = React.useState(null); // { type: 'success'|'error', message }

  const fetchVersions = React.useCallback(async () => {
    setLoading(true);
    try {
      const token = sessionStorage.getItem('accessToken');
      const res = await fetch(`${API_BASE}/documents/${doc.id}/versions`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      if (res.ok) {
        const data = await res.json().catch(() => null);
        const arr = extractArrayFromResponse(data);
        setVersions(arr);
      } else {
        setVersions([]);
      }
    } finally {
      setLoading(false);
    }
  }, [doc.id]);

  React.useEffect(() => {
    // Use initial versions if provided immediately
    if (initialVersions && initialVersions.length > 0) {
      setVersions(initialVersions);
      setLoading(false);
    }
    // Then fetch fresh versions
    fetchVersions();
  }, [fetchVersions, refreshKey, initialVersions]);

  return (
    <div className="card" style={{ maxWidth: '600px', width: '100%' }}>
      <div className="card-header">
        <div className="flex items-center justify-between">
          <h3 className="card-title">Document Versions</h3>
          <button 
            onClick={onClose}
            className="btn btn-secondary btn-sm"
          >
            Close
          </button>
        </div>
      </div>
      <div className="card-body p-4">
        {actionStatus && (
          <div style={{
            padding: '8px 12px',
            marginBottom: '12px',
            borderRadius: '4px',
            backgroundColor: actionStatus.type === 'success' ? '#d4edda' : '#f8d7da',
            color: actionStatus.type === 'success' ? '#155724' : '#721c24',
            border: `1px solid ${actionStatus.type === 'success' ? '#c3e6cb' : '#f5c6cb'}`
          }}>
            {actionStatus.message}
          </div>
        )}

        {loading && (
          <div className="flex items-center justify-center" style={{ minHeight: '200px' }}>
            <div className="loading-spinner"></div>
          </div>
        )}

        {!loading && versions.length === 0 && (
          <div className="text-center text-gray-500 py-4">
            No versions found for this document.
          </div>
        )}

        {versions.map((version, idx) => (
          <div key={version.id || version.versionNumber || idx} className="version-item" style={{
             padding: '12px',
             borderBottom: '1px solid #e5e7eb',
             display: 'flex',
             flexDirection: 'column',
             gap: '4px'
           }}>
            <div className="flex justify-between items-center">
              <div className="text-sm" style={{ color: '#374151' }}>
                Version {version.versionNumber}
              </div>
              {version.createdAt && !isNaN(new Date(version.createdAt).getTime()) && (
                <div className="text-xs" style={{ color: '#6b7280' }}>
                  {new Date(version.createdAt).toLocaleString()}
                </div>
              )}
            </div>
            <div className="flex gap-2">
              <button
                className="btn btn-primary btn-sm flex-1"
                onClick={async () => {
                  try {
                    setActionStatus({ type: 'success', message: 'Downloading...' });
                    const token = sessionStorage.getItem('accessToken');
                    const res = await fetch(`${API_BASE}/documents/${doc.id}/versions/${version.versionNumber}/download`, {
                      headers: {
                        'Authorization': `Bearer ${token}`,
                      },
                    });
                    if (res.ok) {
                      const url = await res.text();
                      window.open(url, '_blank');
                      setActionStatus({ type: 'success', message: 'Download started successfully!' });
                    } else {
                      setActionStatus({ type: 'error', message: `Failed to download version: ${res.status}` });
                    }
                  } catch (err) {
                    setActionStatus({ type: 'error', message: 'Error downloading version' });
                  }
                  // Clear status after 3 seconds
                  setTimeout(() => setActionStatus(null), 3000);
                }}
              >
                📥 Download
              </button>
              <button
                className="btn btn-accent btn-sm"
                onClick={async () => {
                  try {
                    setActionStatus({ type: 'success', message: 'Loading preview...' });
                    const token = sessionStorage.getItem('accessToken');
                    // Download the version content from S3
                    const res = await fetch(`${API_BASE}/s3/download?key=${encodeURIComponent(version.s3Key)}`, {
                      headers: {
                        'Authorization': `Bearer ${token}`,
                      },
                    });
                    if (res.ok) {
                      const versionContent = await res.text();
                      // Create version object with content for preview
                      const versionWithContent = { ...version, content: versionContent };
                      onPreviewVersion(versionWithContent);
                      setActionStatus({ type: 'success', message: `Previewing version ${version.versionNumber}` });
                      // Close the sidebar after preview
                      setTimeout(() => onClose(), 1000);
                    } else {
                      setActionStatus({ type: 'error', message: `Failed to load preview: ${res.status}` });
                    }
                  } catch (err) {
                    setActionStatus({ type: 'error', message: 'Error loading preview' });
                  }
                  // Clear status after 3 seconds
                  setTimeout(() => setActionStatus(null), 3000);
                }}
              >
                👁️ Preview
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}