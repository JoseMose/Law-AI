import React, { useState, useEffect, useRef } from 'react';

export default function ReviewPane({ 
  isOpen, 
  onClose, 
  document: docProp, 
  contractText, 
  issues = [],
  onApplyFix 
}) {
  const [hoveredIssue, setHoveredIssue] = useState(null);
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });
  const [applyingFix, setApplyingFix] = useState(null);
  const modalRef = useRef(null);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      window.document.addEventListener('keydown', handleKeyDown);
      return () => window.document.removeEventListener('keydown', handleKeyDown);
    }
  }, [isOpen, onClose]);

  // Attach hover events to dynamically created highlights
  useEffect(() => {
    if (!isOpen || !modalRef.current) return;

    const handleMouseEnterHighlight = (e) => {
      const issueId = e.target.getAttribute('data-issue-id');
      const issue = issues.find(i => i.id === issueId);
      if (issue) {
        handleMouseEnter(issue, e);
      }
    };

    const handleMouseLeaveHighlight = () => {
      handleMouseLeave();
    };

    // Add event listeners to all highlight elements
    const highlights = modalRef.current.querySelectorAll('.issue-highlight');
    highlights.forEach(highlight => {
      highlight.addEventListener('mouseenter', handleMouseEnterHighlight);
      highlight.addEventListener('mouseleave', handleMouseLeaveHighlight);
    });

    // Cleanup
    return () => {
      highlights.forEach(highlight => {
        highlight.removeEventListener('mouseenter', handleMouseEnterHighlight);
        highlight.removeEventListener('mouseleave', handleMouseLeaveHighlight);
      });
    };
  }, [isOpen, issues, contractText]); // Re-run when content changes

  // Close on backdrop click
  const handleBackdropClick = (e) => {
    if (modalRef.current && !modalRef.current.contains(e.target)) {
      onClose();
    }
  };

  const getSeverityColor = (issue) => {
    const severity = issue.severity || 'medium';
    switch (severity) {
      case 'high': return '#ffebee'; // Light red
      case 'medium': return '#fff3e0'; // Light orange  
      case 'low': return '#f3e5f5'; // Light purple
      default: return '#fff59d'; // Light yellow
    }
  };

  const getSeverityBorder = (issue) => {
    const severity = issue.severity || 'medium';
    switch (severity) {
      case 'high': return '#f44336'; // Red
      case 'medium': return '#ff9800'; // Orange
      case 'low': return '#9c27b0'; // Purple
      default: return '#fbc02d'; // Yellow
    }
  };

  const handleMouseEnter = (issue, event) => {
    setHoveredIssue(issue);
    const rect = event.target.getBoundingClientRect();
    setTooltipPosition({
      x: rect.left + rect.width / 2,
      y: rect.top - 10
    });
  };

  const handleMouseLeave = () => {
    setHoveredIssue(null);
  };

  const handleApplyFix = async (issue) => {
    if (!docProp || applyingFix === issue.id) return;
    
    try {
      setApplyingFix(issue.id);
      await onApplyFix(docProp, issue.id);
    } finally {
      setApplyingFix(null);
    }
  };

  // Build highlighted HTML from contract text and issues
  const buildHighlightedContent = () => {
    if (!contractText || !issues.length) {
      return contractText || 'No contract text available';
    }

    const escapeHtml = (str) => {
      return String(str).replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
    };

    // Sort issues by index to avoid overlap conflicts
    const sortedIssues = issues
      .filter(issue => typeof issue.index === 'number' && typeof issue.length === 'number')
      .sort((a, b) => a.index - b.index);

    let result = '';
    let lastIndex = 0;

    sortedIssues.forEach((issue) => {
      const start = Math.max(0, issue.index);
      const end = Math.min(contractText.length, issue.index + issue.length);

      // Add text before this issue
      if (start > lastIndex) {
        result += escapeHtml(contractText.slice(lastIndex, start));
      }

      // Add highlighted issue text
      const issueText = escapeHtml(contractText.slice(start, end));
      const backgroundColor = getSeverityColor(issue);
      const borderColor = getSeverityBorder(issue);
      
      result += `<mark 
        class="issue-highlight" 
        data-issue-id="${escapeHtml(issue.id || '')}"
        data-severity="${escapeHtml(issue.severity || 'medium')}"
        style="
          background-color: ${backgroundColor}; 
          border-left: 3px solid ${borderColor}; 
          padding: 2px 4px; 
          margin: 0 1px;
          border-radius: 3px;
          cursor: pointer;
          position: relative;
        "
        title="${escapeHtml(issue.type || '')}: ${escapeHtml(issue.suggestion || '')}"
      >${issueText}</mark>`;

      lastIndex = end;
    });

    // Add remaining text
    if (lastIndex < contractText.length) {
      result += escapeHtml(contractText.slice(lastIndex));
    }

    return result.replace(/\n/g, '<br/>');
  };

  if (!isOpen) return null;

  return (
    <div 
      className="review-pane-overlay" 
      onClick={handleBackdropClick}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        zIndex: 1000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}
    >
      <div 
        ref={modalRef}
        className="review-pane-modal"
        style={{
          backgroundColor: 'white',
          borderRadius: 12,
          width: '90vw',
          height: '85vh',
          maxWidth: 1200,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)'
        }}
      >
        {/* Header */}
        <div style={{
          padding: '20px 24px',
          borderBottom: '1px solid #e5e7eb',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          backgroundColor: '#f9fafb'
        }}>
          <div>
            <h2 style={{ margin: 0, fontSize: '1.5rem', fontWeight: '600' }}>
              Contract Review: {docProp?.filename || 'Document'}
            </h2>
            <p style={{ margin: '4px 0 0', color: '#6b7280', fontSize: '0.875rem' }}>
              {issues.length} issue{issues.length !== 1 ? 's' : ''} found
              {issues.length > 0 && (
                <span> • Hover over highlights for details and fixes</span>
              )}
            </p>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              fontSize: '1.5rem',
              cursor: 'pointer',
              padding: '4px 8px',
              borderRadius: '6px',
              color: '#6b7280'
            }}
            onMouseOver={(e) => e.target.style.backgroundColor = '#f3f4f6'}
            onMouseOut={(e) => e.target.style.backgroundColor = 'transparent'}
          >
            ×
          </button>
        </div>

        {/* Content */}
        <div style={{ 
          flex: 1, 
          padding: '24px', 
          overflow: 'auto',
          lineHeight: 1.6,
          fontSize: '14px',
          fontFamily: 'ui-monospace, SFMono-Regular, Monaco, Consolas, monospace'
        }}>
          <div dangerouslySetInnerHTML={{ __html: buildHighlightedContent() }} />
        </div>

        {/* Legend */}
        <div style={{
          padding: '16px 24px',
          borderTop: '1px solid #e5e7eb',
          backgroundColor: '#f9fafb',
          display: 'flex',
          gap: '20px',
          alignItems: 'center',
          fontSize: '0.875rem'
        }}>
          <span style={{ fontWeight: '500', color: '#374151' }}>Severity:</span>
          <div style={{ display: 'flex', gap: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <div style={{
                width: 12,
                height: 12,
                backgroundColor: getSeverityColor({ severity: 'high' }),
                border: `2px solid ${getSeverityBorder({ severity: 'high' })}`,
                borderRadius: 2
              }} />
              <span>High</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <div style={{
                width: 12,
                height: 12,
                backgroundColor: getSeverityColor({ severity: 'medium' }),
                border: `2px solid ${getSeverityBorder({ severity: 'medium' })}`,
                borderRadius: 2
              }} />
              <span>Medium</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <div style={{
                width: 12,
                height: 12,
                backgroundColor: getSeverityColor({ severity: 'low' }),
                border: `2px solid ${getSeverityBorder({ severity: 'low' })}`,
                borderRadius: 2
              }} />
              <span>Low</span>
            </div>
          </div>
        </div>
      </div>

      {/* Tooltip */}
      {hoveredIssue && (
        <div
          style={{
            position: 'fixed',
            left: tooltipPosition.x,
            top: tooltipPosition.y,
            transform: 'translate(-50%, -100%)',
            backgroundColor: '#1f2937',
            color: 'white',
            padding: '12px 16px',
            borderRadius: 8,
            fontSize: '0.875rem',
            maxWidth: 300,
            zIndex: 1001,
            boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
            pointerEvents: 'none'
          }}
        >
          <div style={{ fontWeight: '600', marginBottom: 4 }}>
            {hoveredIssue.type || 'Issue'}
            {hoveredIssue.severity && (
              <span style={{ 
                marginLeft: 8,
                padding: '2px 6px',
                backgroundColor: getSeverityBorder(hoveredIssue),
                borderRadius: 4,
                fontSize: '0.75rem',
                textTransform: 'uppercase',
                fontWeight: '500'
              }}>
                {hoveredIssue.severity}
              </span>
            )}
          </div>
          <div style={{ marginBottom: 8, color: '#d1d5db' }}>
            {hoveredIssue.suggestion || 'No suggestion available'}
          </div>
          <button
            onMouseDown={(e) => {
              e.stopPropagation();
              e.preventDefault();
              handleApplyFix(hoveredIssue);
            }}
            disabled={applyingFix === hoveredIssue.id}
            style={{
              backgroundColor: '#3b82f6',
              color: 'white',
              border: 'none',
              padding: '6px 12px',
              borderRadius: 4,
              fontSize: '0.75rem',
              fontWeight: '500',
              cursor: applyingFix === hoveredIssue.id ? 'not-allowed' : 'pointer',
              opacity: applyingFix === hoveredIssue.id ? 0.6 : 1,
              pointerEvents: 'auto'
            }}
            onMouseOver={(e) => {
              if (applyingFix !== hoveredIssue.id) {
                e.target.style.backgroundColor = '#2563eb';
              }
            }}
            onMouseOut={(e) => {
              if (applyingFix !== hoveredIssue.id) {
                e.target.style.backgroundColor = '#3b82f6';
              }
            }}
          >
            {applyingFix === hoveredIssue.id ? 'Applying...' : 'Apply Fix'}
          </button>
          
          {/* Tooltip arrow */}
          <div style={{
            position: 'absolute',
            top: '100%',
            left: '50%',
            transform: 'translateX(-50%)',
            width: 0,
            height: 0,
            borderLeft: '6px solid transparent',
            borderRight: '6px solid transparent',
            borderTop: '6px solid #1f2937'
          }} />
        </div>
      )}
    </div>
  );
}