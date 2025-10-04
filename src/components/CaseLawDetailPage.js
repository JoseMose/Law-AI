import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link, useLocation } from 'react-router-dom';

const API_BASE = 'https://phd54f79fk.execute-api.us-east-1.amazonaws.com/dev';

export default function CaseLawDetailPage() {
  const { caseId } = useParams();
  const location = useLocation();
  const [caseData, setCaseData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('summary');
  const [notes, setNotes] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  
  // Research tab state
  const [researchQuery, setResearchQuery] = useState('');
  const [researchResults, setResearchResults] = useState([]);
  const [isResearching, setIsResearching] = useState(false);
  const [researchNotes, setResearchNotes] = useState('');

  const loadCaseData = useCallback(async () => {
    try {
      setLoading(true);
      const token = sessionStorage.getItem('authToken');
      const response = await fetch(`${API_BASE}/case-law/${caseId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to load case data');
      }

      const data = await response.json();
      setCaseData(data.case);
      setNotes(data.case.notes || '');
    } catch (error) {
      console.error('Error loading case data:', error);
      // Show error instead of fallback mock data
      alert('Failed to load case details. This case may not be available in our database.');
      setCaseData(null);
    } finally {
      setLoading(false);
    }
  }, [caseId]);

  useEffect(() => {
    // Check if case data was passed via navigation state
    if (location.state?.caseData) {
      setCaseData(location.state.caseData);
      setNotes(location.state.caseData.notes || '');
      setLoading(false);
    } else {
      // Fallback to API call if no state data
      loadCaseData();
    }
  }, [caseId, location.state, loadCaseData]);

  const generateAISummary = async () => {
    setIsGenerating(true);
    try {
      const token = sessionStorage.getItem('authToken');
      const response = await fetch(`${API_BASE}/case-law/analyze`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          caseId: caseData.id,
          analysisType: 'summary'
        })
      });

      if (!response.ok) {
        throw new Error('Failed to generate summary');
      }

      const data = await response.json();
      // Update case data with new summary
      setCaseData(prev => ({
        ...prev,
        summary: data.analysis.summary
      }));
    } catch (error) {
      console.error('Error generating summary:', error);
      alert('Failed to generate AI summary. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  const generateKeyHoldings = async () => {
    setIsGenerating(true);
    try {
      const token = sessionStorage.getItem('authToken');
      const response = await fetch(`${API_BASE}/case-law/analyze`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          caseId: caseData.id,
          analysisType: 'key-holdings'
        })
      });

      if (!response.ok) {
        throw new Error('Failed to generate key holdings');
      }

      const data = await response.json();
      // Update case data with new holdings
      setCaseData(prev => ({
        ...prev,
        keyHoldings: data.analysis.keyHoldings
      }));
    } catch (error) {
      console.error('Error generating key holdings:', error);
      alert('Failed to generate AI key holdings. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  const saveNotes = async () => {
    try {
      // TODO: Save notes to DynamoDB
      console.log('Saving notes:', notes);
    } catch (error) {
      console.error('Error saving notes:', error);
    }
  };

  const performResearch = async () => {
    if (!researchQuery.trim()) return;

    setIsResearching(true);
    try {
      const token = sessionStorage.getItem('authToken');
      const response = await fetch(`${API_BASE}/case-law/search`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          query: `Related to case "${caseData.caseName}": ${researchQuery}`,
          searchMode: 'keyword',
          jurisdiction: caseData.jurisdiction,
          dateRange: 'last-10-years',
          caseType: 'all'
        })
      });

      if (!response.ok) {
        throw new Error('Failed to perform research');
      }

      const data = await response.json();
      setResearchResults(data.cases || []);
    } catch (error) {
      console.error('Error performing research:', error);
      alert('Failed to perform research. Please try again.');
    } finally {
      setIsResearching(false);
    }
  };

  const addToResearchNotes = (caseInfo) => {
    const newNote = `\n\n--- Research Finding ---\nCase: ${caseInfo.caseName}\nCitation: ${caseInfo.citation}\nRelevance: ${caseInfo.relevanceScore}/100\nSummary: ${caseInfo.summary}`;
    setResearchNotes(prev => prev + newNote);
  };

  const saveResearchNotes = async () => {
    try {
      // Append research notes to case notes
      const updatedNotes = notes + '\n\n=== LEGAL RESEARCH ===\n' + researchNotes;
      setNotes(updatedNotes);
      setResearchNotes('');
      alert('Research notes added to case notes successfully!');
    } catch (error) {
      console.error('Error saving research notes:', error);
      alert('Failed to save research notes.');
    }
  };

  const saveToCase = async () => {
    try {
      // TODO: Get the actual case ID from user selection
      const caseId = prompt('Enter the Case ID to save this case law to:');
      if (!caseId) return;

      const token = sessionStorage.getItem('authToken');
      const response = await fetch(`${API_BASE}/case-law/save-to-case`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          caseId: caseId,
          caseLawId: caseData.id
        })
      });

      if (!response.ok) {
        throw new Error('Failed to save to case');
      }

      alert('Case law saved to case successfully!');
    } catch (error) {
      console.error('Error saving to case:', error);
      alert('Failed to save case law to case. Please try again.');
    }
  };

  const downloadPDF = async () => {
    try {
      // TODO: Generate or fetch PDF from S3
      console.log('Downloading PDF');
    } catch (error) {
      console.error('Error downloading PDF:', error);
    }
  };

  if (loading) {
    return (
      <div className="container">
        <div className="flex justify-center items-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading case details...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!caseData) {
    return (
      <div className="container">
        <div className="text-center py-12">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Case Not Found</h2>
          <p className="text-gray-600 mb-6">The requested case could not be found.</p>
          <Link to="/legal-research" className="btn btn-primary">
            ← Back to Research
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="container">
      <div className="main-content">
        {/* Header */}
        <div className="page-header mb-6">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="page-title">{caseData.caseName}</h1>
              <p className="page-description">{caseData.citation}</p>
              <div className="flex items-center gap-4 mt-2">
                <span className="text-sm text-gray-600">{caseData.court}</span>
                <span className="text-sm text-gray-600">{caseData.jurisdiction}</span>
                <span className="text-sm text-gray-600">{caseData.year}</span>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={saveToCase}
                className="btn btn-primary"
              >
                💾 Save to Case
              </button>
              <button
                onClick={downloadPDF}
                className="btn btn-outline"
              >
                📄 Download PDF
              </button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-3">
            {/* Tabs */}
            <div className="tabs mb-6">
              {[
                { id: 'summary', label: 'Summary', icon: '📝' },
                { id: 'holdings', label: 'Key Holdings', icon: '🎯' },
                { id: 'statutes', label: 'Relevant Statutes', icon: '⚖️' },
                { id: 'precedents', label: 'Precedent Chain', icon: '🔗' },
                { id: 'research', label: 'Legal Research', icon: '🔍' },
                { id: 'notes', label: 'Notes', icon: '📋' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`tab ${activeTab === tab.id ? 'active' : ''}`}
                >
                  <span className="mr-2">{tab.icon}</span>
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Tab Content */}
            <div className="card">
              <div className="card-body">
                {activeTab === 'summary' && (
                  <div>
                    <div className="flex justify-between items-center mb-4">
                      <h3 className="text-lg font-semibold">Case Summary</h3>
                      <button
                        onClick={generateAISummary}
                        disabled={isGenerating}
                        className="btn btn-sm btn-outline"
                      >
                        {isGenerating ? '🤖 Generating...' : '🤖 Regenerate'}
                      </button>
                    </div>
                    <p className="text-gray-700 leading-relaxed">{caseData.summary}</p>
                  </div>
                )}

                {activeTab === 'holdings' && (
                  <div>
                    <div className="flex justify-between items-center mb-4">
                      <h3 className="text-lg font-semibold">Key Legal Holdings</h3>
                      <button
                        onClick={generateKeyHoldings}
                        disabled={isGenerating}
                        className="btn btn-sm btn-outline"
                      >
                        {isGenerating ? '🤖 Generating...' : '🤖 Regenerate'}
                      </button>
                    </div>
                    <ul className="space-y-3">
                      {caseData.keyHoldings.map((holding, index) => (
                        <li key={index} className="flex items-start gap-3">
                          <span className="text-blue-600 font-semibold mt-1">•</span>
                          <span className="text-gray-700">{holding}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {activeTab === 'statutes' && (
                  <div>
                    <h3 className="text-lg font-semibold mb-4">Relevant Statutes Cited</h3>
                    <div className="space-y-3">
                      {caseData.relevantStatutes.map((statute, index) => (
                        <div key={index} className="p-3 bg-gray-50 rounded-lg">
                          <code className="text-blue-600 font-mono">{statute}</code>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {activeTab === 'precedents' && (
                  <div>
                    <h3 className="text-lg font-semibold mb-4">Precedent Chain</h3>
                    <div className="space-y-3">
                      {caseData.precedents && caseData.precedents.length > 0 ? (
                        caseData.precedents.map((precedent) => (
                          <div key={precedent.id} className="flex items-center justify-between p-3 border rounded-lg">
                            <span className="font-medium">{precedent.name}</span>
                            <Link
                              to={`/legal-research/case/${precedent.id}`}
                              className="btn btn-sm btn-outline"
                            >
                              View Case
                            </Link>
                          </div>
                        ))
                      ) : (
                        <div className="text-center py-8 text-gray-500">
                          <p>No precedent information available for this case.</p>
                          <p className="text-sm mt-2">Try using the AI Research Assistant to analyze precedents.</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {activeTab === 'research' && (
                  <div>
                    <h3 className="text-lg font-semibold mb-4">Legal Research for This Case</h3>
                    
                    {/* Research Query Section */}
                    <div className="mb-6">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Research Query
                      </label>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={researchQuery}
                          onChange={(e) => setResearchQuery(e.target.value)}
                          placeholder="Enter research topic related to this case..."
                          className="form-input flex-1"
                          onKeyPress={(e) => e.key === 'Enter' && performResearch()}
                        />
                        <button
                          onClick={performResearch}
                          disabled={isResearching || !researchQuery.trim()}
                          className="btn btn-primary"
                        >
                          {isResearching ? '🔍 Searching...' : '🔍 Research'}
                        </button>
                      </div>
                      <p className="text-sm text-gray-500 mt-1">
                        Search for related cases, statutes, or legal analysis for "{caseData.caseName}"
                      </p>
                    </div>

                    {/* Research Results */}
                    {researchResults.length > 0 && (
                      <div className="mb-6">
                        <h4 className="text-md font-semibold mb-3">Research Results ({researchResults.length})</h4>
                        <div className="space-y-3 max-h-96 overflow-y-auto">
                          {researchResults.map((result) => (
                            <div key={result.id} className="border rounded-lg p-4 bg-gray-50">
                              <div className="flex justify-between items-start mb-2">
                                <h5 className="font-medium text-blue-600">{result.caseName}</h5>
                                <button
                                  onClick={() => addToResearchNotes(result)}
                                  className="btn btn-sm btn-outline"
                                >
                                  ➕ Add to Notes
                                </button>
                              </div>
                              <p className="text-sm text-gray-600 mb-2">{result.citation}</p>
                              <p className="text-sm text-gray-700 mb-2">{result.summary}</p>
                              <div className="flex justify-between items-center text-xs text-gray-500">
                                <span>Relevance: {result.relevanceScore}/100</span>
                                <Link
                                  to={`/legal-research/case/${result.id}`}
                                  state={{ caseData: result }}
                                  className="text-blue-600 hover:underline"
                                >
                                  View Full Case →
                                </Link>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Research Notes Section */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Research Notes
                      </label>
                      <textarea
                        value={researchNotes}
                        onChange={(e) => setResearchNotes(e.target.value)}
                        placeholder="Add your research findings, analysis, or notes here..."
                        className="form-input w-full h-32 resize-none"
                      />
                      <div className="mt-3 flex justify-end">
                        <button
                          onClick={saveResearchNotes}
                          disabled={!researchNotes.trim()}
                          className="btn btn-primary"
                        >
                          💾 Add to Case Notes
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === 'notes' && (
                  <div>
                    <h3 className="text-lg font-semibold mb-4">Research Notes</h3>
                    <textarea
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="Add your research notes, analysis, or thoughts about this case..."
                      className="form-input w-full h-64 resize-none"
                    />
                    <div className="mt-4 flex justify-end">
                      <button
                        onClick={saveNotes}
                        className="btn btn-primary"
                      >
                        💾 Save Notes
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* AI Research Assistant Sidebar */}
          <div className="lg:col-span-1">
            <ResearchAssistant caseData={caseData} />
          </div>
        </div>

        {/* Back Button */}
        <div className="mt-8">
          <Link to="/legal-research" className="btn btn-outline">
            ← Back to Research
          </Link>
        </div>
      </div>
    </div>
  );
}

// AI Research Assistant Component
function ResearchAssistant({ caseData }) {
  const [messages, setMessages] = useState([
    {
      id: 1,
      type: 'ai',
      content: 'Hello! I\'m your AI legal research assistant. I can help you find similar cases, analyze legal principles, or answer questions about this case. What would you like to know?',
      timestamp: new Date()
    }
  ]);
  const [inputMessage, setInputMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);

  const handleSendMessage = async () => {
    if (!inputMessage.trim()) return;

    const userMessage = {
      id: Date.now(),
      type: 'user',
      content: inputMessage,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setIsTyping(true);

    try {
      // TODO: Implement AI chat with Bedrock
      await new Promise(resolve => setTimeout(resolve, 2000)); // Simulate response

      const aiResponse = {
        id: Date.now() + 1,
        type: 'ai',
        content: `Based on the case "${caseData.caseName}", I can help you with that query. This would involve analyzing similar cases in ${caseData.jurisdiction} jurisdiction and providing relevant legal precedents.`,
        timestamp: new Date()
      };

      setMessages(prev => [...prev, aiResponse]);
    } catch (error) {
      console.error('Error sending message:', error);
    } finally {
      setIsTyping(false);
    }
  };

  const suggestedQueries = [
    'Find similar cases in Georgia family law',
    'What are the key employment law precedents since 2020?',
    'Analyze the statute of limitations for this type of claim',
    'Find cases with similar fact patterns'
  ];

  return (
    <div className="bg-gradient-to-br from-slate-50 to-blue-50 rounded-2xl shadow-xl border border-slate-200 overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-700 px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
            <span className="text-2xl">🤖</span>
          </div>
          <div>
            <h3 className="text-white font-bold text-lg">AI Research Assistant</h3>
            <p className="text-blue-100 text-sm">Legal analysis & research support</p>
          </div>
        </div>
      </div>

      {/* Chat Container */}
      <div className="p-6">
        {/* Chat Messages */}
        <div className="space-y-4 mb-6 max-h-96 overflow-y-auto scrollbar-thin scrollbar-thumb-slate-300 scrollbar-track-slate-100">
          {messages.map((message) => (
            <div key={message.id} className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-xs lg:max-w-sm px-4 py-3 rounded-2xl shadow-sm ${
                message.type === 'user'
                  ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-br-md'
                  : 'bg-white text-gray-800 border border-slate-200 rounded-bl-md'
              }`}>
                <p className="text-sm leading-relaxed">{message.content}</p>
                <p className={`text-xs mt-2 ${
                  message.type === 'user' ? 'text-blue-100' : 'text-gray-500'
                }`}>
                  {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
            </div>
          ))}
          {isTyping && (
            <div className="flex justify-start">
              <div className="bg-white border border-slate-200 px-4 py-3 rounded-2xl rounded-bl-md shadow-sm">
                <div className="flex space-x-1">
                  <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce"></div>
                  <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                  <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Suggested Queries */}
        <div className="mb-6">
          <h4 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
            <span className="w-1 h-1 bg-blue-500 rounded-full"></span>
            Quick Research Queries
          </h4>
          <div className="grid gap-2">
            {suggestedQueries.map((query, index) => (
              <button
                key={index}
                onClick={() => setInputMessage(query)}
                className="text-left text-sm text-slate-600 hover:text-blue-700 hover:bg-blue-50 px-3 py-2 rounded-lg border border-slate-200 hover:border-blue-300 transition-all duration-200 hover:shadow-sm"
              >
                {query}
              </button>
            ))}
          </div>
        </div>

        {/* Input Area */}
        <div className="flex gap-3">
          <div className="flex-1 relative">
            <input
              type="text"
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
              placeholder="Ask about legal research, precedents, or analysis..."
              className="w-full px-4 py-3 pr-12 rounded-xl border border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 focus:outline-none transition-all duration-200 text-sm bg-white shadow-sm"
            />
            {inputMessage && (
              <button
                onClick={() => setInputMessage('')}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
              >
                ✕
              </button>
            )}
          </div>
          <button
            onClick={handleSendMessage}
            disabled={!inputMessage.trim() || isTyping}
            className={`px-4 py-3 rounded-xl font-medium transition-all duration-200 shadow-sm ${
              !inputMessage.trim() || isTyping
                ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                : 'bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white shadow-md hover:shadow-lg transform hover:scale-105'
            }`}
          >
            {isTyping ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            ) : (
              <span className="text-lg">📤</span>
            )}
          </button>
        </div>

        {/* Status Indicator */}
        <div className="mt-4 flex items-center justify-center gap-2 text-xs text-slate-500">
          <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
          <span>AI Assistant Online</span>
        </div>
      </div>
    </div>
  );
}