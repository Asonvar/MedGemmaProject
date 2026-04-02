import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { UploadCloud, Activity, LayoutDashboard, Search, Settings, LogOut, CheckCircle2, AlertCircle } from 'lucide-react';
import { Client } from '@gradio/client';

export default function Dashboard() {
  const navigate = useNavigate();
  const role = localStorage.getItem('userRole') || 'doctor';
  
  const [colabUrl, setColabUrl] = useState('');
  const [isConnecting, setIsConnecting] = useState(false);
  const [connected, setConnected] = useState(false);
  const [client, setClient] = useState(null);

  const [selectedImage, setSelectedImage] = useState(null);
  const [imageFile, setImageFile] = useState(null);
  const [prompt, setPrompt] = useState('');
  
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [resultText, setResultText] = useState('');
  const [resultImage, setResultImage] = useState(null);
  const [findings, setFindings] = useState([]);

  const fileInputRef = useRef(null);

  useEffect(() => {
    // Try to load saved Colab URL
    const saved = localStorage.getItem('colabUrl');
    if (saved) setColabUrl(saved);
  }, []);

  const handleConnect = async () => {
    if (!colabUrl) return;
    setIsConnecting(true);
    try {
      const c = await Client.connect(colabUrl);
      setClient(c);
      setConnected(true);
      localStorage.setItem('colabUrl', colabUrl);
    } catch (err) {
      console.error(err);
      alert('Could not connect to Colab Gradio API. Make sure the URL is correct and running.');
      setConnected(false);
    }
    setIsConnecting(false);
  };

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImageFile(file);
      const url = URL.createObjectURL(file);
      setSelectedImage(url);
      setResultImage(null);
      setResultText('');
      setFindings([]);
    }
  };

  const analyzeScan = async () => {
    if (!client || !imageFile) return;
    setIsAnalyzing(true);
    
    try {
      // The Gradio function analyze_medical_scan expects (image, text_prompt)
      // and based on our recent updates, it might return just text, or text + image.
      // We will assume the standard Stage 1 returns just Text for now, 
      // but we will parse it if it has bounding boxes or we can fetch both if updated.
      
      const result = await client.predict("/predict", { 
        image: imageFile, 		
        text_prompt: prompt || "What pathology is visible?", 
      });

      // Assuming result.data[0] is the text response
      const textResponse = result.data[0];
      setResultText(textResponse);
      
      // Mocking the visual grounding parsing if MedGemma returns coords
      // In a real scenario with the updated backend, result.data[0] might be the image and result.data[1] the text.
      if (Array.isArray(result.data) && result.data.length > 1) {
         // If we implemented the 2-output model returning Image + Text
         if (typeof result.data[0] === 'string' && result.data[0].startsWith('http')) {
           setResultImage(result.data[0]); // Gradio often returns URLs for parsed images
           setResultText(result.data[1]);
         }
      }

      // Simple mock parser: If text contains "pneumonia", highlight it.
      const mockFindings = [];
      if (textResponse.toLowerCase().includes('pneumonia') || textResponse.toLowerCase().includes('effusion')) {
        mockFindings.push('Abnormal Opacity Found');
      }
      setFindings(mockFindings);

    } catch (error) {
      console.error("Analysis Failed", error);
      setResultText("An error occurred while analyzing the scan. Check the Colab logs.");
    }
    setIsAnalyzing(false);
  };

  const logout = () => {
    localStorage.removeItem('userRole');
    navigate('/');
  };

  if (role === 'patient') {
    return (
      <div className="dashboard">
        <Sidebar role={role} logout={logout} />
        <div className="main-content">
          <div className="header">
            <h1 className="page-title">Patient Portal</h1>
            <div className="user-profile">
              <div className="avatar">P</div>
              <span>Jane Doe</span>
            </div>
          </div>
          <div className="glass-panel" style={{ padding: '40px', textAlign: 'center' }}>
            <Activity size={48} color="var(--primary)" style={{ margin: '0 auto 16px' }} />
            <h2>Your Medical Scans</h2>
            <p style={{ color: 'var(--text-muted)', marginTop: '8px' }}>
              Your recent scans are currently being reviewed by Dr. Smith. Check back later for your complete clinical report.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Doctor Dashboard
  return (
    <div className="dashboard">
      <Sidebar role={role} logout={logout} />
      
      <div className="main-content">
        <div className="header">
          <h1 className="page-title">Clinical Dashboard</h1>
          <div className="user-profile">
            <div className="avatar">Dr</div>
            <span>Dr. Provider</span>
          </div>
        </div>

        {/* Connection Setup */}
        <div className="glass-panel" style={{ padding: '20px', marginBottom: '32px', display: 'flex', gap: '16px', alignItems: 'center' }}>
          <div style={{ flex: 1 }}>
            <h3 style={{ fontSize: '15px', marginBottom: '4px' }}>AI Backend Connection</h3>
            <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Enter your active Google Colab Gradio Live URL to enable inference.</p>
          </div>
          <input 
            type="text" 
            className="input-field" 
            placeholder="https://xxxx.gradio.live" 
            value={colabUrl}
            onChange={(e) => setColabUrl(e.target.value)}
            style={{ width: '300px', marginBottom: 0 }}
          />
          <button className={`btn ${connected ? 'btn-secondary' : 'btn-primary'}`} onClick={handleConnect} disabled={isConnecting}>
            {isConnecting ? 'Connecting...' : connected ? 'Connected \u2713' : 'Connect'}
          </button>
        </div>

        {/* Main Interface */}
        <div className="glass-panel" style={{ padding: '32px' }}>
          
          <div className="input-group">
            <label className="input-label">Clinical Inquiry (Prompt)</label>
            <input 
               type="text" 
               className="input-field" 
               value={prompt}
               onChange={(e) => setPrompt(e.target.value)}
               placeholder="E.g., Are there any signs of pleural effusion?" 
            />
          </div>

          {!selectedImage ? (
            <div className="uploader" onClick={() => fileInputRef.current?.click()}>
              <input type="file" ref={fileInputRef} hidden accept="image/*" onChange={handleImageUpload} />
              <div className="upload-icon">
                <UploadCloud size={24} />
              </div>
              <div style={{ textAlign: 'center' }}>
                <h3 style={{ marginBottom: '4px' }}>Upload Medical Scan</h3>
                <p style={{ fontSize: '14px', color: 'var(--text-muted)' }}>Drag and drop or click to upload DICOM, JPG, PNG</p>
              </div>
            </div>
          ) : (
            <div className="analysis-grid">
              
              {/* Left Side: Image View */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                  <h3 className="input-label" style={{ margin: 0 }}>Scan Preview</h3>
                  <span style={{ fontSize: '13px', color: 'var(--primary)', cursor: 'pointer' }} onClick={() => setSelectedImage(null)}>
                    Replace Image
                  </span>
                </div>
                
                <div className="img-preview-container border" style={{ borderColor: 'var(--panel-border)', borderStyle: 'solid', borderWidth: '1px' }}>
                  <img src={resultImage || selectedImage} alt="Medical Scan" className="img-preview" />
                  {isAnalyzing && (
                    <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <div style={{ textAlign: 'center' }}>
                        <Activity className="animate-spin" size={32} color="var(--primary)" style={{ margin: '0 auto 12px', animation: 'spin 2s linear infinite' }} />
                        <p>MediGemma is analyzing...</p>
                      </div>
                    </div>
                  )}
                </div>

                <button 
                  className="btn btn-primary" 
                  style={{ width: '100%', marginTop: '16px', padding: '12px' }}
                  onClick={analyzeScan}
                  disabled={isAnalyzing || !connected}
                >
                  {isAnalyzing ? 'Processing AI Models...' : 'Run Multimodal Analysis'}
                </button>
              </div>

              {/* Right Side: Results */}
              <div className="glass-panel" style={{ background: 'rgba(0,0,0,0.2)' }}>
                <div className="report-title">
                  <Activity size={18} color="var(--primary)" />
                  MediGemma-X Structured Report
                </div>
                
                <div className="report-section">
                  {resultText ? (
                    <div className="animate-fade-in">
                      {findings.length > 0 && (
                         <div style={{ marginBottom: '20px' }}>
                           {findings.map((f, i) => (
                             <span key={i} className="finding-tag">{f}</span>
                           ))}
                         </div>
                      )}
                      
                      <div style={{ fontSize: '15px', lineHeight: '1.6', color: '#E2E8F0', whiteSpace: 'pre-wrap' }}>
                        {resultText}
                      </div>

                      <div style={{ marginTop: '24px', paddingTop: '16px', borderTop: '1px solid var(--panel-border)', display: 'flex', gap: '12px' }}>
                        <button className="btn btn-secondary" style={{ flex: 1 }}>Flag for Review</button>
                        <button className="btn btn-primary" style={{ flex: 1 }}>Export EHR (JSON)</button>
                      </div>
                    </div>
                  ) : (
                    <div style={{ textAlign: 'center', color: 'var(--text-muted)', marginTop: '40px' }}>
                      <AlertCircle size={32} style={{ margin: '0 auto 12px', opacity: 0.5 }} />
                      <p>Awaiting analysis. Upload a scan and click run.</p>
                      {!connected && <p style={{ fontSize: '12px', color: 'var(--danger)', marginTop: '8px' }}>Disconnected from AI Backend.</p>}
                    </div>
                  )}
                </div>

              </div>
            </div>
          )}

        </div>
      </div>
      <style>{`
        @keyframes spin { 100% { transform: rotate(360deg); } }
        .animate-spin { animation: spin 1s linear infinite; }
      `}</style>
    </div>
  );
}

// Reusable Sidebar Component
function Sidebar({ role, logout }) {
  return (
    <div className="sidebar">
      <div className="sidebar-brand">
        <Activity size={24} />
        MediGemma-X
      </div>

      <div className="sidebar-nav">
        <a href="#" className="nav-item active">
          <LayoutDashboard size={18} />
          Dashboard
        </a>
        <a href="#" className="nav-item">
          <Search size={18} />
          {role === 'doctor' ? 'Patient Search' : 'My Records'}
        </a>
      </div>

      <div style={{ marginTop: 'auto' }}>
        <a href="#" className="nav-item">
          <Settings size={18} />
          Settings
        </a>
        <a href="#" className="nav-item" onClick={(e) => { e.preventDefault(); logout(); }}>
          <LogOut size={18} color="var(--danger)" />
          <span style={{ color: 'var(--danger)' }}>Sign Out</span>
        </a>
      </div>
    </div>
  );
}
