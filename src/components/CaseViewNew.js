import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import PDFUpload from '../PDFUpload';

const API_BASE = 'https://phd54f79fk.execute-api.us-east-1.amazonaws.com/dev';

// Component for displaying a document with modern styling
const DocumentItem = ({ document, onPreview, onShowVersions }) => {
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

  // Close preview
  const closePreview = () => {
    setPreviewUrl(null);
    setPreviewingDoc(null);
  };

  // Close versions
  const closeVersions = () => {
    setShowingVersionsFor(null);
  };

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
        {previewUrl && previewingDoc && (
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