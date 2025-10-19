// Helper Functions for Lambda Auth
// Extracted from lambda-auth.js to reduce main file size

const { crypto } = require('./aws-clients');

// In-memory storage for created clients (for demo purposes)
let createdClients = [];

// Helper function to create HMAC for Cognito secret hash
function getSecretHash(username, clientId, clientSecret) {
  return crypto
    .createHmac('sha256', clientSecret)
    .update(username + clientId)
    .digest('base64');
}

// Helper function to create response with cache-busting
function createResponse(statusCode, data, customHeaders = {}) {
  const timestamp = Date.now();
  const responseData = {
    ...data,
    _timestamp: timestamp,
    _requestId: Math.random().toString(36).substr(2, 9)
  };
  
  return {
    statusCode,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, Accept',
      'Cache-Control': 'no-cache, no-store, must-revalidate, private, max-age=0',
      'Pragma': 'no-cache',
      'Expires': '-1',
      'Last-Modified': new Date().toUTCString(),
      'ETag': `"${timestamp}-${Math.random().toString(36)}"`,
      'Vary': 'Accept-Encoding',
      ...customHeaders
    },
    body: JSON.stringify(responseData)
  };
}

// Helper function to analyze contract text and identify legal issues
function analyzeContractText(text) {
  const issues = [];
  const lines = text.split('\n');
  let issueId = 1;

  // Convert text to lowercase for case-insensitive matching
  const lowerText = text.toLowerCase();

  // Check for overly broad termination clauses
  if (lowerText.includes('terminated at any time') || lowerText.includes('at-will termination')) {
    const lineIndex = lines.findIndex(line => line.toLowerCase().includes('terminated at any time') || line.toLowerCase().includes('at-will termination'));
    issues.push({
      id: issueId++,
      type: "error",
      title: "Overly Broad Termination Clause",
      description: "At-will termination without notice periods may violate employment laws in certain jurisdictions.",
      suggestion: "Add reasonable notice periods and define specific grounds for immediate termination.",
      section: "Termination",
      line: lineIndex >= 0 ? lineIndex + 1 : null,
      originalText: lines[lineIndex] || "Employee may be terminated at any time...",
      suggestedText: "Employee may be terminated by Company with thirty (30) days written notice, except in cases of misconduct, breach of contract, or other just cause."
    });
  }

  // Check for missing IP assignment
  if (!lowerText.includes('intellectual property') && !lowerText.includes('invention')) {
    issues.push({
      id: issueId++,
      type: "warning",
      title: "Missing Intellectual Property Assignment",
      description: "No clear assignment of intellectual property rights to the Company.",
      suggestion: "Add comprehensive IP assignment clause to protect Company's interests.",
      section: "New Section Needed",
      line: null,
      originalText: null,
      suggestedText: "SECTION: INTELLECTUAL PROPERTY\nAll inventions, discoveries, improvements, and intellectual property created by Employee during employment shall be the sole and exclusive property of Company."
    });
  }

  // Check for vague non-compete terms
  if (lowerText.includes('non-compete') || lowerText.includes('compete')) {
    const lineIndex = lines.findIndex(line => line.toLowerCase().includes('non-compete') || line.toLowerCase().includes('compete'));
    if (lines[lineIndex] && (lines[lineIndex].includes('[TIME PERIOD]') || lines[lineIndex].includes('time period'))) {
      issues.push({
        id: issueId++,
        type: "warning",
        title: "Vague Non-Compete Terms",
        description: "Non-compete clause lacks specific geographic scope and duration.",
        suggestion: "Define specific geographic boundaries and scope of restricted activities.",
        section: "Non-Compete",
        line: lineIndex >= 0 ? lineIndex + 1 : null,
        originalText: lines[lineIndex],
        suggestedText: "Employee agrees not to directly or indirectly engage in competing business activities within [SPECIFIC GEOGRAPHIC AREA] for a period of twelve (12) months following termination, limited to [SPECIFIC BUSINESS ACTIVITIES]."
      });
    }
  }

  // Check for incomplete benefit details
  if (lowerText.includes('benefit') && (lowerText.includes('as may be available') || lowerText.includes('similar level'))) {
    const lineIndex = lines.findIndex(line => line.toLowerCase().includes('benefit') && (line.toLowerCase().includes('available') || line.toLowerCase().includes('similar level')));
    issues.push({
      id: issueId++,
      type: "info",
      title: "Incomplete Benefit Details",
      description: "Benefits section lacks specific details about available plans and eligibility.",
      suggestion: "Reference specific benefit plans or attach detailed benefits schedule.",
      section: "Compensation/Benefits",
      line: lineIndex >= 0 ? lineIndex + 1 : null,
      originalText: lines[lineIndex] || "Employee shall also be entitled to participate in Company's benefit plans as may be available...",
      suggestedText: "Employee shall be entitled to participate in Company's standard benefits package including health insurance, dental coverage, and retirement plan as detailed in Exhibit B, subject to plan terms and eligibility requirements."
    });
  }

  // Generate annotated HTML
  const annotatedHtml = generateAnnotatedHtml(text, issues);

  // Determine overall risk level
  let overallRisk = "Low";
  const errorCount = issues.filter(i => i.type === 'error').length;
  const warningCount = issues.filter(i => i.type === 'warning').length;

  if (errorCount >= 2 || (errorCount >= 1 && warningCount >= 2)) {
    overallRisk = "High";
  } else if (errorCount >= 1 || warningCount >= 2) {
    overallRisk = "Medium";
  }

  return {
    issues,
    overallRisk,
    annotatedHtml,
    statistics: {
      totalIssues: issues.length,
      errors: errorCount,
      warnings: issues.filter(i => i.type === 'warning').length,
      info: issues.filter(i => i.type === 'info').length
    }
  };
}

// Helper function to generate annotated HTML
function generateAnnotatedHtml(text, issues) {
  let html = text;
  
  // Apply annotations for each issue
  issues.forEach(issue => {
    if (issue.originalText && issue.line) {
      const className = `issue-${issue.type}`;
      const tooltip = `${issue.title}: ${issue.description}`;
      const wrappedText = `<span class="${className}" title="${tooltip}">${issue.originalText}</span>`;
      html = html.replace(issue.originalText, wrappedText);
    }
  });
  
  // Add CSS styles
  const css = `
    <style>
      .issue-error { background-color: #ffebee; border-bottom: 2px solid #f44336; }
      .issue-warning { background-color: #fff3e0; border-bottom: 2px solid #ff9800; }
      .issue-info { background-color: #e3f2fd; border-bottom: 2px solid #2196f3; }
    </style>
  `;
  
  return css + '<div>' + html.replace(/\n/g, '<br>') + '</div>';
}

// Helper function to determine version status
function getVersionStatus(versionType, fixedIssues) {
  if (versionType === 'original') return 'Original Upload';
  if (versionType === 'reviewed') return '4 Issues Identified';
  if (versionType === 'fixed') return 'All Issues Resolved';
  return 'Manual Version';
}

// Helper function to parse fixed issues from metadata
function parseFixedIssues(fixedIssuesStr) {
  if (!fixedIssuesStr) return [];
  try {
    return JSON.parse(fixedIssuesStr);
  } catch (error) {
    return [];
  }
}

module.exports = {
  createdClients,
  getSecretHash,
  createResponse,
  analyzeContractText,
  generateAnnotatedHtml,
  getVersionStatus,
  parseFixedIssues
};