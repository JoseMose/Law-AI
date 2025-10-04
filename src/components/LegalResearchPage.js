import React, { useState } from 'react';
import { Link } from 'react-router-dom';

const API_BASE = 'https://phd54f79fk.execute-api.us-east-1.amazonaws.com/dev';

export default function LegalResearchPage() {
  const [activeTab, setActiveTab] = useState('overview');

  return (
    <div className="container">
      <div className="main-content">
        <div className="page-header">
          <h1 className="page-title">Legal Research</h1>
          <p className="page-description">
            AI-powered legal research and analysis tools
          </p>
        </div>

        <div className="tabs mb-6">
          {[
            { id: 'overview', label: 'Overview', icon: '🏠' },
            { id: 'case-law', label: 'Case Law Research', icon: '📚' },
            { id: 'statutes', label: 'Statute Analysis', icon: '⚖️' },
            { id: 'documents', label: 'Document Analysis', icon: '🔍' },
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

        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="card">
              <div className="card-header">
                <h3 className="card-title">📚 Case Law Research</h3>
              </div>
              <div className="card-body">
                <p className="text-gray-600 mb-4">
                  Search and analyze relevant case law using AI-powered analysis.
                </p>
                <button 
                  onClick={() => setActiveTab('case-law')}
                  className="btn btn-primary w-full"
                >
                  Start Research
                </button>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'case-law' && <CaseLawResearch />}
        {activeTab === 'statutes' && <StatuteAnalysis />}
        {activeTab === 'documents' && <DocumentAnalysis />}
      </div>
    </div>
  );
}

function CaseLawResearch() {
  const [searchMode, setSearchMode] = useState('keyword');
  const [searchQuery, setSearchQuery] = useState('');
  const [scenarioDescription, setScenarioDescription] = useState('');
  const [jurisdiction, setJurisdiction] = useState('Georgia');
  const [dateRange, setDateRange] = useState('last-5-years');
  const [caseType, setCaseType] = useState('all');
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState([]);
  const [recentSearches, setRecentSearches] = useState([]);

  const handleSearch = async (e) => {
    e.preventDefault();
    const queryText = searchMode === 'scenario' ? scenarioDescription : searchQuery;
    if (!queryText.trim()) return;

    setIsSearching(true);
    try {
      const token = sessionStorage.getItem('authToken');
      const response = await fetch(`${API_BASE}/case-law/search`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          query: queryText,
          searchMode,
          jurisdiction,
          dateRange,
          caseType
        })
      });

      if (!response.ok) {
        throw new Error('Search failed');
      }

      const data = await response.json();
      setSearchResults(data.results || []);

      const newSearch = {
        id: Date.now().toString(),
        query: queryText,
        searchMode,
        jurisdiction,
        dateRange,
        caseType,
        timestamp: new Date().toISOString()
      };
      setRecentSearches(prev => [newSearch, ...prev.slice(0, 4)]);

    } catch (error) {
      console.error('Search error:', error);
      alert('Failed to search case law. Please try again.');
    } finally {
      setIsSearching(false);
    }
  };

  return (
    <div className="space-y-8">
      <div className="card shadow-lg" style={{ minHeight: '600px' }}>
        <div className="card-header">
          <h3 className="card-title text-2xl">📚 Case Law & Precedent Research</h3>
          <p className="text-gray-600 mt-2">Find relevant case precedents using keyword search or describe your legal scenario</p>
        </div>
        <div className="card-body">
          <form onSubmit={handleSearch} className="space-y-8">
            <div className="flex gap-4 border-b pb-6">
              <button
                type="button"
                onClick={() => setSearchMode('keyword')}
                className={`px-6 py-3 rounded-lg font-medium transition-all text-lg ${
                  searchMode === 'keyword' 
                    ? 'bg-blue-600 text-white shadow-lg' 
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                🔍 Keyword Search
              </button>
              <button
                type="button"
                onClick={() => setSearchMode('scenario')}
                className={`px-6 py-3 rounded-lg font-medium transition-all text-lg ${
                  searchMode === 'scenario' 
                    ? 'bg-green-600 text-white shadow-lg' 
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                💡 Scenario Analysis
              </button>
            </div>

            {searchMode === 'keyword' ? (
              <div className="space-y-4">
                <label className="form-label text-xl font-semibold">Search Terms & Keywords</label>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Enter keywords, statutes, case names, or legal citations..."
                  className="form-input w-full text-xl py-4 px-6"
                  style={{ fontSize: '18px', padding: '16px' }}
                  required
                />
                <div className="bg-blue-50 border-l-4 border-blue-400 p-4 rounded">
                  <p className="text-sm text-blue-700 font-medium">💡 Examples:</p>
                  <ul className="text-sm text-blue-600 mt-1">
                    <li>• "breach of contract", "negligence", "employment discrimination"</li>
                    <li>• "O.C.G.A. § 13-4-3", "42 U.S.C. § 1981"</li>
                    <li>• "Smith v. Jones", "Brown v. Board"</li>
                  </ul>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <label className="form-label text-xl font-semibold">Describe Your Legal Scenario</label>
                <textarea
                  value={scenarioDescription}
                  onChange={(e) => setScenarioDescription(e.target.value)}
                  placeholder="Describe the legal situation, facts, and issues you need precedents for. Be specific about circumstances, parties involved, legal questions, and the type of precedents you're seeking..."
                  className="form-input w-full text-lg py-4 px-6 resize-y"
                  style={{ minHeight: '200px', fontSize: '16px' }}
                  rows="8"
                  required
                />
                <div className="bg-green-50 border-l-4 border-green-400 p-4 rounded">
                  <p className="text-sm text-green-700 font-medium">�� Example:</p>
                  <p className="text-sm text-green-600 mt-1">
                    "My client was terminated after reporting safety violations to OSHA. The employer claims it was for performance issues, but timing suggests retaliation. Need Georgia cases on whistleblower protection and employment retaliation."
                  </p>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 bg-gray-50 p-6 rounded-lg">
              <div>
                <label className="form-label text-lg font-medium">Jurisdiction</label>
                <select
                  value={jurisdiction}
                  onChange={(e) => setJurisdiction(e.target.value)}
                  className="form-select text-lg py-3"
                >
                  <option value="Georgia">Georgia State Courts</option>
                  <option value="Federal">Federal Courts</option>
                  <option value="Alabama">Alabama</option>
                  <option value="Florida">Florida</option>
                  <option value="11th-Circuit">11th Circuit</option>
                  <option value="Supreme-Court">U.S. Supreme Court</option>
                </select>
              </div>

              <div>
                <label className="form-label text-lg font-medium">Time Period</label>
                <select
                  value={dateRange}
                  onChange={(e) => setDateRange(e.target.value)}
                  className="form-select text-lg py-3"
                >
                  <option value="last-2-years">Last 2 Years</option>
                  <option value="last-5-years">Last 5 Years</option>
                  <option value="last-10-years">Last 10 Years</option>
                  <option value="last-20-years">Last 20 Years</option>
                </select>
              </div>

              <div>
                <label className="form-label text-lg font-medium">Practice Area</label>
                <select
                  value={caseType}
                  onChange={(e) => setCaseType(e.target.value)}
                  className="form-select text-lg py-3"
                >
                  <option value="all">All Areas</option>
                  <option value="civil">Civil</option>
                  <option value="criminal">Criminal</option>
                  <option value="employment">Employment</option>
                  <option value="family">Family</option>
                  <option value="personal-injury">Personal Injury</option>
                </select>
              </div>
            </div>

            <button
              type="submit"
              disabled={isSearching}
              className="w-full py-4 px-8 text-xl font-semibold rounded-lg bg-blue-600 hover:bg-blue-700 text-white disabled:bg-gray-400"
              style={{ fontSize: '20px', padding: '16px 32px' }}
            >
              {isSearching ? 'Searching...' : searchMode === 'keyword' ? '🔍 Search Case Law' : '🧠 Analyze Scenario'}
            </button>
          </form>
        </div>
      </div>

      {searchResults.length > 0 && (
        <div className="card shadow-lg">
          <div className="card-header">
            <h3 className="card-title text-xl">📋 Case Precedents ({searchResults.length})</h3>
          </div>
          <div className="card-body">
            <div className="space-y-6">
              {searchResults.map((result, index) => (
                <div key={result.id} className="border-2 border-gray-200 rounded-xl p-6">
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex-1">
                      <h4 className="font-bold text-xl mb-2">{result.caseName}</h4>
                      <p className="text-lg font-medium mb-1">{result.citation}</p>
                      <p className="text-gray-600">{result.jurisdiction} • {result.year}</p>
                    </div>
                    <div className="text-lg font-bold text-green-600 bg-green-100 px-3 py-1 rounded">
                      {result.relevanceScore}% Match
                    </div>
                  </div>
                  <div className="bg-gray-50 p-4 rounded-lg mb-4">
                    <p className="text-gray-800">{result.summary}</p>
                  </div>
                  <div className="flex gap-3">
                                        <Link
                      to={`/legal-research/case/${result.id}`}
                      state={{ caseData: result }}
                      className="btn btn-primary"
                    >
                      View Details
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function StatuteAnalysis() {
  return (
    <div className="card">
      <div className="card-header">
        <h3 className="card-title">⚖️ Statute Analysis</h3>
      </div>
      <div className="card-body">
        <p className="text-gray-600">Coming soon...</p>
      </div>
    </div>
  );
}

function DocumentAnalysis() {
  return (
    <div className="card">
      <div className="card-header">
        <h3 className="card-title">🔍 Document Analysis</h3>
      </div>
      <div className="card-body">
        <p className="text-gray-600">Coming soon...</p>
      </div>
    </div>
  );
}
