import React, { useState, useEffect } from 'react';
import { jsPDF } from 'jspdf'; 
import { UploadIcon, FileIcon, TrashIcon, DownloadIcon } from './components/icons';

// ─── Main Component ──────────────────────────────────────────────────────────
export default function App() {
  const [file, setFile] = useState(null);
  const [sessionId, setSessionId] = useState(null);
  const [status, setStatus] = useState('');
  const [summary, setSummary] = useState('');
  const [length, setLength] = useState('Medium');
  const [focusArea, setFocusArea] = useState('');
  const [history, setHistory] = useState([]);
  
  // Rate limiting & Cost tracking states
  const [rateLimit, setRateLimit] = useState(null);
  const [costDetails, setCostDetails] = useState(null);

  useEffect(() => {
    const savedHistory = localStorage.getItem('summa_history');
    if (savedHistory) {
      setHistory(JSON.parse(savedHistory));
    }
  }, []);

  // Fetch current rate limit status from the backend
  const fetchRateLimit = async (sid) => {
    if (!sid) return;
    try {
      const response = await fetch(`http://localhost:8000/api/rate-limit/${sid}`);
      if (response.ok) {
        const data = await response.json();
        console.log("Rate Limit Data received:", data);
        setRateLimit(data);
      }
    } catch (error) {
      console.error("Failed to fetch rate limit", error);
    }
  };

  const handleUpload = async (selectedFile) => {
    if (!selectedFile) return;

    setFile({ name: selectedFile.name, raw: selectedFile });
    setStatus("Uploading and extracting text...");
    setSummary(''); 
    setCostDetails(null); // Clear previous cost details

    const formData = new FormData();
    formData.append("file", selectedFile);

    try {
      const response = await fetch('http://localhost:8000/api/upload', {
        method: 'POST',
        body: formData
      });
      const data = await response.json();

      if (response.ok) {
        setSessionId(data.session_id);
        setStatus(""); 
        fetchRateLimit(data.session_id); // Fetch limit immediately upon starting a session
      } else {
        setFile(null);
        setStatus("❌ Error: " + data.detail);
      }
    } catch (error) {
      setFile(null);
      setStatus("❌ Network error.");
    }
  };

  const handleSummarize = async () => {
    if (!sessionId) return;
    setSummary('');
    setCostDetails(null); // Clear old cost details
    setStatus("Generating summary with AI...");

    const formData = new FormData();
    formData.append("session_id", sessionId);
    formData.append("length", length.toLowerCase());
    formData.append("focus_area", focusArea || "general");

    try {
      const response = await fetch('http://localhost:8000/api/summarize', {
        method: 'POST',
        body: formData
      });
      const data = await response.json();

      if (response.ok) {
        setSummary(data.summary);
        setCostDetails(data.cost_details); // Store the returned cost details
        setStatus("");
        fetchRateLimit(sessionId); // Refresh rate limit after consumption

        const newHistoryItem = {
          id: sessionId,
          fileName: file.name,
          summary: data.summary,
          length: length,
          focusArea: focusArea,
          date: new Date().toLocaleDateString()
        };

        setHistory(prev => {
          const filtered = prev.filter(item => item.id !== sessionId);
          const updatedHistory = [newHistoryItem, ...filtered];
          localStorage.setItem('summa_history', JSON.stringify(updatedHistory));
          return updatedHistory;
        });

      } else {
        setStatus("❌ Error: " + data.detail);
        if (response.status === 429) fetchRateLimit(sessionId); // Refresh limit if we hit 429
      }
    } catch (error) {
      setStatus("❌ Network error.");
    }
  };

  const handleRemoveFile = () => {
    setFile(null);
    setSessionId(null);
    setSummary('');
    setStatus('');
    setFocusArea('');
    setLength('Medium');
    setRateLimit(null);
    setCostDetails(null);
  };

  const loadHistoryItem = (item) => {
    setSessionId(item.id);
    setFile({ name: item.fileName, isHistorical: true }); 
    setSummary(item.summary);
    setLength(item.length);
    setFocusArea(item.focusArea);
    setStatus('');
    setCostDetails(null); // Previous session costs aren't saved in history right now
    fetchRateLimit(item.id); // Fetch rate limit for loaded session
  };

  const handleDownload = () => {
    if (!summary) return;
    
    const doc = new jsPDF();
    const baseName = file?.name ? file.name.split('.')[0] : 'document';
    const fileName = `${baseName}_summary.pdf`;

    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.text("Document Summary Report", 15, 20);
    
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100); 
    doc.text(`Original File: ${file?.name || 'Unknown'}`, 15, 28);
    doc.text(`Length: ${length}`, 15, 33);
    if (focusArea) {
      doc.text(`Focus Area: ${focusArea}`, 15, 38);
    }
    
    doc.setDrawColor(200, 200, 200);
    doc.line(15, 43, 195, 43);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(12);
    doc.setTextColor(30, 30, 30); 
    
    // Strip simple HTML tags before passing to jsPDF
    const cleanSummary = summary.replace(/<[^>]+>/g, '');
    const splitSummary = doc.splitTextToSize(cleanSummary, 180);
    
    doc.text(splitSummary, 15, 52);
    doc.save(fileName);
  };

  const handleClearHistory = () => {
    if (window.confirm("Are you sure you want to delete all recent summaries?")) {
      setHistory([]);
      localStorage.removeItem('summa_history');
      handleRemoveFile(); // Reset the current view as well
    }
  };

  const LengthButton = ({label, current, setter}) => (
    <button
      onClick={() => setter(label)}
      style={{
        background: current === label ? '#eeebf7' : '#ffffff',
        border: `1px solid ${current === label ? '#dcd7ec' : '#ccc'}`,
        color: current === label ? '#7e57c2' : '#8c8c8c',
        padding: '10px 20px',
        borderRadius: '20px',
        cursor: 'pointer',
        fontSize: '14px',
        fontWeight: '500',
        transition: 'all 0.2s',
        marginRight: '10px'
      }}
    >
      {label}
    </button>
  );

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#f7f8fa', fontFamily: 'sans-serif' }}>
      
      {/* ─── Left Sidebar ─── */}
      <div style={{ width: '280px', background: '#fff', borderRight: '1px solid #ebedf0', padding: '24px', display: 'flex', flexDirection: 'column' }}>
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: '4px', cursor: 'pointer' }} onClick={handleRemoveFile}>
          <div style={{ width: '32px', height: '32px', background: '#7e57c2', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '4px', marginRight: '10px', fontSize: '20px', fontWeight: 'bold' }}>Σ</div>
          <h1 style={{ fontSize: '20px', fontWeight: '700', color: '#262626', margin: 0 }}>Summa.AI</h1>
        </div>
        <p style={{ color: '#8c8c8c', fontSize: '12px', margin: '0 0 32px 42px' }}>DOCUMENT INTELLIGENCE</p>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h2 style={{ color: '#8c8c8c', fontSize: '13px', textTransform: 'uppercase', margin: 0, letterSpacing: '0.05em' }}>
            Recent Summaries
          </h2>
          {history.length > 0 && (
            <button 
              onClick={handleClearHistory}
              style={{ 
                background: 'none', 
                border: 'none', 
                color: '#d32f2f', 
                fontSize: '11px', 
                cursor: 'pointer',
                fontWeight: '600',
                padding: '4px 8px',
                borderRadius: '4px'
              }}
              onMouseOver={(e) => e.currentTarget.style.background = '#fff0f0'}
              onMouseOut={(e) => e.currentTarget.style.background = 'none'}
            >
              Clear All
            </button>
          )}
        </div>
        
        <div style={{ overflowY: 'auto', flex: 1 }}>
          {history.length > 0 ? (
            history.map((item) => (
              <div 
                key={item.id}
                onClick={() => loadHistoryItem(item)}
                style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  background: sessionId === item.id ? '#eeebf7' : '#ffffff', 
                  padding: '12px', 
                  borderRadius: '6px', 
                  marginBottom: '8px', 
                  cursor: 'pointer',
                  borderLeft: sessionId === item.id ? '3px solid #7e57c2' : '3px solid transparent',
                  transition: 'background 0.2s'
                }}
                onMouseOver={(e) => { if(sessionId !== item.id) e.currentTarget.style.background = '#f5f5f5' }}
                onMouseOut={(e) => { if(sessionId !== item.id) e.currentTarget.style.background = '#ffffff' }}
              >
                <FileIcon />
                <div style={{flex: 1, overflow: 'hidden'}}>
                    <div style={{color: '#262626', fontSize: '14px', fontWeight: '500', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'}}>{item.fileName}</div>
                    <div style={{color: '#8c8c8c', fontSize: '12px'}}>{item.date}</div>
                </div>
              </div>
            ))
          ) : (
            <div style={{ color: '#8c8c8c', fontSize: '14px', textAlign: 'center', marginTop: '40px' }}>
              No recent activity
            </div>
          )}
        </div>
      </div>

      {/* ─── Main Area ─── */}
      <div style={{ flex: 1, padding: '48px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        
        <div style={{ alignSelf: 'stretch', marginBottom: '32px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <h1 style={{ fontSize: '32px', fontWeight: '700', color: '#262626', margin: 0 }}>AI Lab</h1>
          </div>
          <p style={{ color: '#8c8c8c', fontSize: '16px', margin: 0 }}>Analyze, summarize, and chat with your documents.</p>
        </div>

        {/* ─── Input Configuration Panel ─── */}
        <div style={{ 
            width: '100%', 
            maxWidth: '800px', 
            background: '#ffffff', 
            padding: '32px', 
            borderRadius: '24px', 
            border: '2px dashed #ebedf0', 
            boxShadow: '0 4px 12px rgba(0,0,0,0.03)' 
          }}>
          
          {!file ? (
            /* STATE 1: No file uploaded */
            <div style={{display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '60px 0'}}>
                <div style={{width: '48px', height: '48px', background: '#eeebf7', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '16px'}}>
                    <UploadIcon />
                </div>
                <h3 style={{fontSize: '18px', color: '#262626', margin: '0 0 8px 0'}}>Drop document here</h3>
                <p style={{fontSize: '14px', color: '#8c8c8c', margin: '0 0 20px 0'}}>PDF • TXT • MAX 10MB</p>
                <input type="file" id="fileElem" accept=".txt,.pdf" onChange={(e) => handleUpload(e.target.files[0])} style={{display: 'none'}} />
                <button onClick={() => document.getElementById('fileElem').click()} style={{ background: '#ffffff', border: '1px solid #ccc', color: '#262626', padding: '10px 20px', borderRadius: '24px', cursor: 'pointer', boxShadow: '0 2px 5px rgba(0,0,0,0.05)', fontSize: '14px' }}>
                    Browse Local Files
                </button>
                {status && <p style={{marginTop: '15px', color: '#d32f2f', fontSize: '14px'}}>{status}</p>}
            </div>
          ) : (
            /* STATE 2: File is present */
            <>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #f0f0f0', paddingBottom: '24px', marginBottom: '32px' }}>
                    <div style={{ display: 'flex', alignItems: 'center' }}>
                      <div style={{ width: '42px', height: '56px', background: '#eeebf7', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '6px', color: '#7e57c2', marginRight: '16px' }}>
                          <FileIcon />
                      </div>
                      <div>
                          <div style={{ fontSize: '18px', fontWeight: '500', color: '#262626' }}>{file.name}</div>
                          <p style={{ fontSize: '14px', color: '#8c8c8c', margin: 0 }}>
                            {file.isHistorical ? 'Loaded from history.' : 'File ready for configuration.'}
                          </p>
                      </div>
                    </div>

                    <button 
                      onClick={handleRemoveFile}
                      style={{ background: '#fff0f0', color: '#d32f2f', border: '1px solid #ffd6d6', padding: '8px 16px', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', fontSize: '14px', fontWeight: '500', transition: 'all 0.2s' }}
                    >
                      <TrashIcon /> <span style={{marginLeft: '8px'}}>Remove</span>
                    </button>
                </div>

                <div style={{marginBottom: '24px'}}>
                    <label style={{ display: 'block', color: '#262626', fontSize: '16px', fontWeight: '500', marginBottom: '10px' }}>Focus Area (optional)</label>
                    <input 
                        type="text" 
                        placeholder="e.g., Financial metrics, market analysis, key risks..." 
                        value={focusArea}
                        onChange={(e) => setFocusArea(e.target.value)}
                        style={{ width: '100%', padding: '16px', borderRadius: '8px', border: '1px solid #f0f0f0', background: '#fff', boxSizing: 'border-box', fontSize: '14px', color: '#262626', outline: 'none' }}
                    />
                </div>

                <div style={{marginBottom: '32px'}}>
                    <label style={{ display: 'block', color: '#262626', fontSize: '16px', fontWeight: '500', marginBottom: '10px' }}>Length:</label>
                    <div style={{ display: 'flex' }}>
                        <LengthButton label="Short" current={length} setter={setLength} />
                        <LengthButton label="Medium" current={length} setter={setLength} />
                        <LengthButton label="Long" current={length} setter={setLength} />
                    </div>
                </div>

                {status && <p style={{color: '#7e57c2', fontSize: '14px', textAlign: 'center', marginBottom: '16px'}}>{status}</p>}

                {/* RATE LIMIT BANNER */}
                {sessionId && (
                  <div style={{ 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'center', 
                    marginBottom: '12px', 
                    padding: '10px 14px', 
                    background: rateLimit?.remaining === 0 ? '#fff0f0' : '#f8f9fa', 
                    border: `1px solid ${rateLimit?.remaining === 0 ? '#ffd6d6' : '#ebedf0'}`, 
                    borderRadius: '8px', 
                    fontSize: '13px' 
                  }}>
                    <span style={{ color: '#5c5c5c', fontWeight: '500' }}>
                      Session Quota {rateLimit ? `` : ''}
                    </span>
                    <span style={{ color: rateLimit?.remaining === 0 ? '#d32f2f' : '#262626', fontWeight: '600' }}>
                      {rateLimit 
                        ? `${rateLimit.remaining} / ${rateLimit.limit} requests left` 
                        : "Loading limits..."}
                    </span>
                  </div>
                )}

                <button 
                  onClick={handleSummarize}
                  disabled={!sessionId || (rateLimit && rateLimit.remaining === 0)}
                  style={{ width: '100%', background: (!sessionId || (rateLimit && rateLimit.remaining === 0)) ? '#b39ddb' : '#7e57c2', color: '#ffffff', border: 'none', padding: '18px', borderRadius: '12px', fontSize: '16px', fontWeight: '600', cursor: (!sessionId || (rateLimit && rateLimit.remaining === 0)) ? 'not-allowed' : 'pointer', transition: 'background 0.2s' }}>
                    {rateLimit && rateLimit.remaining === 0 ? 'Rate Limit Reached' : 'Generate Summary'}
                </button>
            </>
          )}
        </div>

        {/* ─── Output Section ─── */}
        {summary && (
          <div style={{ width: '100%', maxWidth: '800px', marginTop: '32px', padding: '24px', background: '#ffffff', borderRadius: '12px', border: '1px solid #ebedf0', boxShadow: '0 2px 8px rgba(0,0,0,0.02)' }}>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{fontSize: '18px', color: '#262626', margin: 0, display: 'flex', alignItems: 'center'}}>
                <span style={{color: '#7e57c2', marginRight: '8px'}}>✨</span> Summary Result
              </h3>
              
              <button 
                onClick={handleDownload}
                style={{ background: '#ffffff', border: '1px solid #ebedf0', color: '#262626', padding: '8px 16px', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', fontSize: '14px', fontWeight: '500', transition: 'all 0.2s', boxShadow: '0 1px 2px rgba(0,0,0,0.02)' }}
                onMouseOver={(e) => e.currentTarget.style.background = '#f5f5f5'}
                onMouseOut={(e) => e.currentTarget.style.background = '#ffffff'}
              >
                <DownloadIcon /> <span style={{marginLeft: '8px'}}>Download .pdf</span>
              </button>
            </div>

            <div dangerouslySetInnerHTML={{ __html: summary.replace(/\n/g, '<br/>') }} style={{fontSize: '15px', color: '#4a4a4a', lineHeight: '1.7'}} />

            {/* COST DETAILS */}
            {costDetails && (
              <div style={{ marginTop: '24px', paddingTop: '16px', borderTop: '1px dashed #ebedf0', display: 'flex', gap: '24px', fontSize: '12px', color: '#8c8c8c' }}>
                <div><strong>Input Tokens:</strong> {costDetails.input_tokens.toLocaleString()}</div>
                <div><strong>Output Tokens:</strong> {costDetails.output_tokens.toLocaleString()}</div>
                <div><strong>Est. Cost:</strong> ${costDetails.estimated_cost_usd.toFixed(6)}</div>
              </div>
            )}

          </div>
        )}
      </div>
    </div>
  );
}