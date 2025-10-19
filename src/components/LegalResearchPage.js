import React, { useState } from 'react';
import { Link } from 'react-router-dom';

const API_BASE = process.env.REACT_APP_API_URL;

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
            { id: 'statutes', label: 'Georgia Law Research', icon: '⚖️' },
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
  // recentSearches removed (unused) to satisfy ESLint

  const handleSearch = async (e) => {
    e.preventDefault();
    const queryText = searchMode === 'scenario' ? scenarioDescription : searchQuery;
    if (!queryText.trim()) return;

    setIsSearching(true);
    try {
      const response = await fetch(`${API_BASE}/case-law/search`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
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
      // recent searches history intentionally not persisted in this view

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
                      {Math.round(result.relevanceScore * 100)}% Match
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
  const [searchQuery, setSearchQuery] = useState('');
  const [practiceArea, setPracticeArea] = useState('all');
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState(null);

  const practiceAreas = [
    { value: 'all', label: 'All Practice Areas' },
    { value: 'criminal', label: 'Criminal Law' },
    { value: 'traffic', label: 'Traffic Law' },
    { value: 'contract', label: 'Contract Law' },
    { value: 'tort', label: 'Tort Law' },
    { value: 'employment', label: 'Employment Law' },
    { value: 'property', label: 'Property Law' },
    { value: 'family', label: 'Family Law' },
    { value: 'business', label: 'Business Law' },
    { value: 'civil_procedure', label: 'Civil Procedure' }
  ];

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    setIsSearching(true);
    setSearchResults([]);
    setAnalysis(null);

    try {
      console.log('Making request to:', `${API_BASE}/laws`);
      console.log('Request payload:', {
        query: searchQuery,
        practiceArea: practiceArea === 'all' ? null : practiceArea,
        limit: 5
      });
      
      const response = await fetch(`${API_BASE}/laws`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({
          query: searchQuery,
          practiceArea: practiceArea === 'all' ? null : practiceArea,
          limit: 5
        })
      });
      
      console.log('Response status:', response.status);
      console.log('Response headers:', [...response.headers.entries()]);

      if (!response.ok) {
        throw new Error(`Search failed: ${response.status}`);
      }

      const data = await response.json();
      // Handle Lambda proxy response format
      const responseBody = data.body ? JSON.parse(data.body) : data;
      setSearchResults(responseBody.results || []);
    } catch (error) {
      console.error('Search error:', error);
      alert('Search failed. Please try again.');
    } finally {
      setIsSearching(false);
    }
  };

  const handleAnalyze = async (statute) => {
    setIsAnalyzing(true);
    setAnalysis(null);

    try {
      const response = await fetch(`${API_BASE}/laws/summarize`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          statuteData: {
            title_number: statute.citation.split(' ')[1].split('-')[0],
            chapter_number: statute.citation.split(' ')[1].split('-')[1],
            section_number: statute.citation.split(' ')[1].split('-')[2],
            section_name: statute.title,
            full_text: statute.fullText,
            source_url: statute.sourceUrl,
            effective_date: statute.effectiveDate,
            practice_area: statute.practiceArea
          },
          userQuery: searchQuery
        })
      });

      if (!response.ok) {
        throw new Error(`Analysis failed: ${response.status}`);
      }

      const data = await response.json();
      // Handle Lambda proxy response format
      const responseBody = data.body ? JSON.parse(data.body) : data;
      setAnalysis(responseBody.analysis);
    } catch (error) {
      console.error('Analysis error:', error);
      alert('Analysis failed. Please try again.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Search Section */}
      <div className="card">
        <div className="card-header">
          <h3 className="card-title text-2xl">⚖️ Georgia Law Research</h3>
          <p className="text-gray-600">Search and analyze Georgia statutes using AI-powered semantic search</p>
        </div>
        <div className="card-body">
          <form onSubmit={handleSearch} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Search Query
              </label>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="e.g., 'punishment for aggravated assault' or 'contract breach remedies'"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-accent"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Practice Area
              </label>
              <select
                value={practiceArea}
                onChange={(e) => setPracticeArea(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-accent"
              >
                {practiceAreas.map(area => (
                  <option key={area.value} value={area.value}>
                    {area.label}
                  </option>
                ))}
              </select>
            </div>

            <button
              type="submit"
              disabled={isSearching}
              className="btn btn-primary w-full"
            >
              {isSearching ? '🔍 Searching...' : '🔍 Search Georgia Code'}
            </button>
          </form>
        </div>
      </div>

      {/* Results Section */}
      {searchResults.length > 0 && (
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">📋 Search Results</h3>
            <p className="text-gray-600">Found {searchResults.length} relevant statutes</p>
          </div>
          <div className="card-body">
            <div className="space-y-4">
              {searchResults.map((result, index) => (
                <div key={index} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h4 className="font-semibold text-lg">{result.citation}</h4>
                      <p className="text-gray-600">{result.title}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-sm bg-accent/10 text-accent px-2 py-1 rounded">
                          Relevance: {Math.round(result.relevanceScore * 100)}%
                        </span>
                        <span className="text-sm bg-gray-100 text-gray-600 px-2 py-1 rounded capitalize">
                          {result.practiceArea.replace('_', ' ')}
                        </span>
                      </div>
                    </div>
                    <button
                      onClick={() => handleAnalyze(result)}
                      disabled={isAnalyzing}
                      className="btn btn-secondary"
                    >
                      🤖 Analyze with AI
                    </button>
                  </div>

                  <p className="text-gray-700 mb-3">{result.summary}</p>

                  {result.keyProvisions && result.keyProvisions.length > 0 && (
                    <div className="mb-3">
                      <h5 className="font-medium text-sm text-gray-700 mb-1">Key Provisions:</h5>
                      <ul className="text-sm text-gray-600 space-y-1">
                        {result.keyProvisions.slice(0, 2).map((provision, idx) => (
                          <li key={idx}>• {provision}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  <details className="mt-3">
                    <summary className="cursor-pointer text-accent hover:text-accent-dark text-sm font-medium">
                      View Full Statute Text
                    </summary>
                    <div className="mt-2 p-3 bg-gray-50 rounded text-sm text-gray-700 max-h-60 overflow-y-auto">
                      {result.fullText}
                    </div>
                  </details>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* AI Analysis Section */}
      {analysis && (
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">🤖 AI Analysis: {analysis.citation}</h3>
            <p className="text-gray-600">AI-powered analysis of {analysis.title}</p>
          </div>
          <div className="card-body">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Summary */}
              <div>
                <h4 className="font-semibold text-lg mb-3">📝 Summary</h4>
                <p className="text-gray-700 mb-4">{analysis.summary}</p>

                <h4 className="font-semibold text-lg mb-3">⚖️ Key Points</h4>
                <ul className="space-y-2">
                  {analysis.keyPoints?.map((point, index) => (
                    <li key={index} className="flex items-start">
                      <span className="text-accent mr-2">•</span>
                      <span className="text-gray-700">{point}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Details */}
              <div>
                <h4 className="font-semibold text-lg mb-3">📜 Penalties & Requirements</h4>
                <div className="space-y-3">
                  {analysis.penalties && analysis.penalties.length > 0 && (
                    <div>
                      <h5 className="font-medium text-gray-800">Penalties:</h5>
                      <ul className="text-sm text-gray-600 space-y-1">
                        {analysis.penalties.map((penalty, index) => (
                          <li key={index}>• {penalty}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {analysis.definitions && analysis.definitions.length > 0 && (
                    <div>
                      <h5 className="font-medium text-gray-800">Definitions:</h5>
                      <ul className="text-sm text-gray-600 space-y-1">
                        {analysis.definitions.map((def, index) => (
                          <li key={index}>• {def}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {analysis.exceptions && analysis.exceptions.length > 0 && (
                    <div>
                      <h5 className="font-medium text-gray-800">Exceptions:</h5>
                      <ul className="text-sm text-gray-600 space-y-1">
                        {analysis.exceptions.map((exception, index) => (
                          <li key={index}>• {exception}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>

                {analysis.relatedStatutes && analysis.relatedStatutes.length > 0 && (
                  <div className="mt-4">
                    <h4 className="font-semibold text-lg mb-3">🔗 Related Statutes</h4>
                    <ul className="space-y-1">
                      {analysis.relatedStatutes.map((statute, index) => (
                        <li key={index} className="text-accent hover:text-accent-dark cursor-pointer">
                          {statute}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>

            {analysis.practicalNotes && (
              <div className="mt-6 p-4 bg-blue-50 rounded-lg">
                <h4 className="font-semibold text-lg mb-2">💡 Practical Notes</h4>
                <p className="text-gray-700">{analysis.practicalNotes}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Loading States */}
      {isSearching && (
        <div className="card">
          <div className="card-body text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent mx-auto mb-4"></div>
            <p className="text-gray-600">Searching Georgia statutes...</p>
          </div>
        </div>
      )}

      {isAnalyzing && (
        <div className="card">
          <div className="card-body text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent mx-auto mb-4"></div>
            <p className="text-gray-600">AI analyzing statute...</p>
          </div>
        </div>
      )}
    </div>
  );
}
