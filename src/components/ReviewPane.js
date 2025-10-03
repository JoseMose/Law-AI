import React from 'react';

export default function ReviewPane({ 
  reviewResults,
  previewingDoc,
  isPreviewMode,
  previewingVersion,
  editableContent,
  setEditableContent,
  completedIssues,
  selectedIssue,
  saveStatus,
  setSaveStatus,
  setIsPreviewMode,
  setOriginalContent,
  setPreviewingVersion,
  originalContent,
  getHighlightedHtml,
  handleSidebarIssueClick,
  applyFix,
  markIssueComplete,
  editableDivRef,
  onClose,
  onSaveVersion
}) {


  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'white',
      zIndex: 1000,
      display: 'flex',
      flexDirection: 'column'
    }}>
      {/* Header */}
      <div style={{
        backgroundColor: '#1f2937',
        color: 'white',
        padding: '16px 24px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button
            onClick={onClose}
            style={{
              backgroundColor: 'transparent',
              border: '1px solid #6b7280',
              color: 'white',
              borderRadius: '6px',
              padding: '8px 16px',
              fontSize: '0.875rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
          >
            ← Back
          </button>
          
          <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: '600' }}>
            Contract Review: {previewingDoc?.filename || previewingDoc?.name}
            {isPreviewMode && previewingVersion && (
              <span style={{ fontSize: '0.875rem', color: '#9ca3af', marginLeft: '8px' }}>
                (Previewing Version {previewingVersion.versionNumber})
              </span>
            )}
            {reviewResults?.isPreviewMode && (
              <span style={{ fontSize: '0.875rem', color: '#60a5fa', marginLeft: '8px' }}>
                (Latest Version Preview)
              </span>
            )}
          </h2>
        </div>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{
            padding: '4px 8px',
            borderRadius: '4px',
            fontSize: '12px',
            backgroundColor: reviewResults?.overallRisk === 'High' ? '#dc3545' : 
              reviewResults?.overallRisk === 'Medium' ? '#ffc107' : '#10b981',
            color: '#fff',
            fontWeight: '600'
          }}>
            {reviewResults?.overallRisk || 'Unknown'} Risk
          </span>
          
          {isPreviewMode && (
            <button
              onClick={() => {
                setEditableContent(originalContent);
                setIsPreviewMode(false);
                setOriginalContent('');
                setPreviewingVersion(null);
              }}
              style={{
                backgroundColor: 'transparent',
                border: '1px solid #6b7280',
                color: 'white',
                borderRadius: '6px',
                padding: '6px 12px',
                fontSize: '0.875rem',
                cursor: 'pointer'
              }}
            >
              ↩️ Back to Current
            </button>
          )}
          
          {!reviewResults?.isPreviewMode && (
            <button
              onClick={onSaveVersion}
              style={{
                backgroundColor: '#10b981',
                border: 'none',
                color: 'white',
                borderRadius: '6px',
                padding: '6px 12px',
                fontSize: '0.875rem',
                cursor: 'pointer'
              }}
            >
              💾 Save as Version
            </button>
          )}
        </div>
      </div>
      
      {saveStatus && (
        <div style={{
          padding: '8px 16px',
          backgroundColor: saveStatus.type === 'success' ? '#d4edda' : '#f8d7da',
          color: saveStatus.type === 'success' ? '#155724' : '#721c24',
          border: `1px solid ${saveStatus.type === 'success' ? '#c3e6cb' : '#f5c6cb'}`,
          fontSize: '14px'
        }}>
          {saveStatus.message}
        </div>
      )}

      {/* Main Content */}
      <div style={{ 
        flex: 1,
        display: 'flex',
        overflow: 'hidden'
      }}>
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
              __html: getHighlightedHtml(editableContent, reviewResults?.issues, selectedIssue?.id)
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
            Issues Found ({reviewResults?.issues?.length || 0})
            {completedIssues && completedIssues.size > 0 && (
              <span style={{ 
                fontSize: '12px', 
                color: '#10b981', 
                marginLeft: '8px',
                fontWeight: 'bold'
              }}>
                • {completedIssues.size} completed
              </span>
            )}
          </h4>
          
          {reviewResults?.summary && (
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

          {reviewResults?.issues?.map((issue, index) => {
            const isCompleted = completedIssues && completedIssues.has(issue.id);
            const hasAutoFix = issue.originalText && issue.suggestedText;
            
            return (
              <div 
                key={issue.id || index} 
                style={{
                  backgroundColor: isCompleted ? '#f0f9ff' : 'white',
                  border: `2px solid ${isCompleted ? '#10b981' : '#e5e7eb'}`,
                  borderLeft: `6px solid ${
                    isCompleted ? '#10b981' :
                    issue.type === 'error' ? '#dc3545' : 
                    issue.type === 'warning' ? '#ffc107' : '#17a2b8'
                  }`,
                  borderRadius: '8px',
                  padding: '18px',
                  marginBottom: '18px',
                  cursor: 'pointer',
                  boxShadow: '0 1px 6px rgba(0,0,0,0.04)',
                  opacity: isCompleted ? 0.8 : 1
                }}
                onClick={() => handleSidebarIssueClick && handleSidebarIssueClick(issue)}
              >
                <div style={{ display: 'flex', alignItems: 'center', marginBottom: '8px' }}>
                  <span style={{ marginRight: '8px' }}>
                    {isCompleted ? '✅' :
                     issue.type === 'error' ? '🔴' : 
                     issue.type === 'warning' ? '🟡' : '🔵'}
                  </span>
                  <strong style={{ 
                    fontSize: '14px',
                    textDecoration: isCompleted ? 'line-through' : 'none',
                    color: isCompleted ? '#6b7280' : '#111'
                  }}>
                    {issue.title}
                  </strong>
                  {isCompleted && (
                    <span style={{ 
                      marginLeft: 'auto', 
                      fontSize: '12px', 
                      color: '#10b981',
                      fontWeight: 'bold'
                    }}>
                      COMPLETED
                    </span>
                  )}
                </div>
                
                <p style={{ 
                  margin: '8px 0', 
                  fontSize: '13px',
                  color: isCompleted ? '#6b7280' : '#374151'
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
                
                {hasAutoFix && !isCompleted && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      applyFix && applyFix(issue);
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
                
                {!hasAutoFix && !isCompleted && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      markIssueComplete && markIssueComplete(issue);
                    }}
                    style={{
                      backgroundColor: '#17a2b8',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      padding: '6px 12px',
                      fontSize: '12px',
                      cursor: 'pointer',
                      width: '100%'
                    }}
                  >
                    ✓ Mark as Complete
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
            );
          })}

          {(!reviewResults?.issues || reviewResults.issues.length === 0) && (
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
  );
}