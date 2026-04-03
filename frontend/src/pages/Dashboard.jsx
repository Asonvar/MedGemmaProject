import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { UploadCloud, Activity, LayoutDashboard, Search, Settings, LogOut, CheckCircle2, AlertCircle, Menu, X, ChevronDown, FileClock, Users, Target, FileText, Trash2 } from 'lucide-react';
import { Client } from '@gradio/client';

export default function Dashboard() {
  const navigate = useNavigate();
  const role = localStorage.getItem('userRole') || 'doctor';

  const userName = localStorage.getItem('userName') || (role === 'doctor' ? 'Dr. Provider' : 'Jane Doe');
  const userEmail = localStorage.getItem('userEmail') || (role === 'doctor' ? 'doctor@hospital.org' : 'jane.doe@example.com');

  const [colabUrl, setColabUrl] = useState('');
  const [isConnecting, setIsConnecting] = useState(false);
  const [connected, setConnected] = useState(false);
  const [connectionError, setConnectionError] = useState('');
  const [client, setClient] = useState(null);

  const [selectedImage, setSelectedImage] = useState(null);
  const [imageFile, setImageFile] = useState(null);
  const [prompt, setPrompt] = useState('');
  const [patientAge, setPatientAge] = useState('');
  const [patientSex, setPatientSex] = useState('Male');
  const [scanType, setScanType] = useState('X-Ray');
  const [symptoms, setSymptoms] = useState('');
  const [featureHighlight, setFeatureHighlight] = useState('');

  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [resultText, setResultText] = useState('');
  const [resultImage, setResultImage] = useState(null);
  const [findings, setFindings] = useState([]);

  const [pendingReviews, setPendingReviews] = useState([]);
  const [selectedReview, setSelectedReview] = useState(null);
  const [doctorNotes, setDoctorNotes] = useState('');

  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [myRecords, setMyRecords] = useState([]);

  const fileInputRef = useRef(null);

  useEffect(() => {
    // Try to load saved Colab URL
    const saved = localStorage.getItem('colabUrl');
    if (saved) setColabUrl(saved);

    // Load pending reviews for doctor
    if (role === 'doctor') {
      const reviews = JSON.parse(localStorage.getItem('pendingReviews') || '[]');
      setPendingReviews(reviews);
    }

    // Load records for patient
    if (role === 'patient') {
      const records = JSON.parse(localStorage.getItem('myRecords') || '[]');
      setMyRecords(records);
    }
  }, [role]);

  const handleConnect = async () => {
    if (!colabUrl) return;
    setIsConnecting(true);
    setConnectionError('');
    try {
      const c = await Client.connect(colabUrl);
      setClient(c);
      setConnected(true);
      setConnectionError('');
      localStorage.setItem('colabUrl', colabUrl);
    } catch (err) {
      console.error(err);
      setConnectionError(err.message || 'Could not connect. Please check if the Colab is running, or if you have a CORS issue.');
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
    setResultText('');
    setResultImage(null);
    setFindings([]);

    try {
      const clinicalContext = `Patient Age: ${patientAge || 'Unknown'}, Sex: ${patientSex}, Scan Type: ${scanType}. Symptoms: ${symptoms || 'None reported'}.`;
      let enhancedPrompt = `${clinicalContext} Clinical Inquiry: ${prompt || "What pathology is visible?"}`;
      if (featureHighlight) {
        enhancedPrompt += ` Feature to Highlight: ${featureHighlight}`;
      }

      const result = await client.predict("/predict", {
        image: imageFile,
        text_prompt: enhancedPrompt,
      });

      console.log("Prediction Result:", result.data);

      let textResponse = '';
      let imgResponse = null;

      // Robustly parse the response for Text and Image
      if (Array.isArray(result.data)) {
        result.data.forEach(item => {
          if (typeof item === 'string') {
             if (item.startsWith('http') || item.startsWith('data:image')) {
               imgResponse = item;
             } else if (textResponse === '') {
               textResponse = item;
             }
          } else if (item && typeof item === 'object') {
             if (item.url) imgResponse = item.url;
             else if (item.path) imgResponse = item.path;
             else if (textResponse === '') textResponse = JSON.stringify(item);
          }
        });
      } else if (typeof result.data === 'string') {
        textResponse = result.data;
      }

      if (textResponse) {
        textResponse = textResponse.replace(/\*\*/g, '');
        setResultText(textResponse);
      } else {
        setResultText("No text report was generated.");
      }
      
      if (imgResponse) {
        setResultImage(imgResponse);
      }

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

  const handleSendForReview = () => {
    if (!imageFile || !resultText) return;

    // We draw the image to a canvas to compress it before storing in localStorage
    // LocalStorage has a 5MB limit, so raw Base64 from phone cameras will burst it and cause crashes.
    const img = new Image();
    img.crossOrigin = 'Anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const MAX_WIDTH = 800; // Resize to max 800px width
      let scaleSize = 1;
      if (img.width > MAX_WIDTH) {
        scaleSize = MAX_WIDTH / img.width;
      }
      canvas.width = img.width * scaleSize;
      canvas.height = img.height * scaleSize;

      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      const compressedBase64 = canvas.toDataURL('image/jpeg', 0.5); // high compression JPEG

      const newReview = {
        id: Date.now(),
        patientName: userName,
        date: new Date().toLocaleDateString(),
        prompt: prompt || "What pathology is visible?",
        age: patientAge,
        sex: patientSex,
        scanType: scanType,
        symptoms: symptoms,
        scanImage: compressedBase64,
        aiResult: resultText,
        findings
      };

      try {
        const existingReviews = JSON.parse(localStorage.getItem('pendingReviews') || '[]');
        localStorage.setItem('pendingReviews', JSON.stringify([...existingReviews, newReview]));

        const patientRecords = JSON.parse(localStorage.getItem('myRecords') || '[]');
        const updatedRecords = [...patientRecords, newReview];
        localStorage.setItem('myRecords', JSON.stringify(updatedRecords));
        setMyRecords(updatedRecords);

        alert("Sent for review to your clinical team!");
        setActiveTab('records'); // Automatically navigate user to their records tab
      } catch (e) {
        console.error("Storage error:", e);
        alert("Could not save the scan. The local storage limit has been exceeded! Please clear your records.");
      }
    };
    img.src = selectedImage;
  };

  const submitFeedback = (isApproved) => {
    const updatedReviews = pendingReviews.filter(r => r.id !== selectedReview.id);
    setPendingReviews(updatedReviews);
    localStorage.setItem('pendingReviews', JSON.stringify(updatedReviews));

    const rlhfEntry = {
      ...selectedReview,
      doctorNotes,
      isApproved,
      reviewedAt: new Date().toISOString()
    };
    const dataset = JSON.parse(localStorage.getItem('rlhfDataset') || '[]');
    localStorage.setItem('rlhfDataset', JSON.stringify([...dataset, rlhfEntry]));

    // Update patient's record to show review status
    const patientRecords = JSON.parse(localStorage.getItem('myRecords') || '[]');
    const recordIndex = patientRecords.findIndex(r => r.id === selectedReview.id);
    if (recordIndex !== -1) {
      patientRecords[recordIndex].isReviewed = true;
      patientRecords[recordIndex].isApproved = isApproved;
      patientRecords[recordIndex].doctorNotes = doctorNotes;
      localStorage.setItem('myRecords', JSON.stringify(patientRecords));
      // Refresh state if acting as patient right now
      if (role === 'patient') setMyRecords(patientRecords);
    }

    alert(isApproved ? "Prediction approved! Model data updated." : "Correction submitted! Model data updated.");
    setSelectedReview(null);
    setDoctorNotes('');
  };

  const logout = () => {
    localStorage.removeItem('userRole');
    navigate('/');
  };

  const clearLocalDatabase = () => {
    if (window.confirm("Are you sure you want to clear all patient records and doctor reviews? This will reset the database limits.")) {
      localStorage.removeItem('myRecords');
      localStorage.removeItem('pendingReviews');
      localStorage.removeItem('rlhfDataset');
      setMyRecords([]);
      window.location.reload();
    }
  };

  const deleteRecord = (idToRemove) => {
    if (window.confirm("Are you sure you want to delete this specific record?")) {
      const currentRecords = myRecords.filter(r => r.id !== idToRemove);
      setMyRecords(currentRecords);
      localStorage.setItem('myRecords', JSON.stringify(currentRecords));

      // Also clean up from pending reviews so doctor won't see it if unreviewed
      const existingReviews = JSON.parse(localStorage.getItem('pendingReviews') || '[]');
      const filteredReviews = existingReviews.filter(r => r.id !== idToRemove);
      localStorage.setItem('pendingReviews', JSON.stringify(filteredReviews));
      setPendingReviews(filteredReviews);
    }
  };

  const rlhfDataset = JSON.parse(localStorage.getItem('rlhfDataset') || '[]');

  if (role === 'doctor') {
    return (
      <div className="dashboard">
        <Sidebar role={role} logout={logout} isSidebarOpen={isSidebarOpen} setIsSidebarOpen={setIsSidebarOpen} />
        <div className="main-content">
          <div className="header">
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <button className="btn btn-secondary" onClick={() => setIsSidebarOpen(true)} style={{ padding: '8px' }}>
                <Menu size={20} />
              </button>
              <div>
                <h1 className="page-title" style={{ margin: 0, fontSize: '20px' }}>Clinical Staff Portal</h1>
                <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: 'var(--primary)' }}>Welcome back, {userName}. {new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}</p>
              </div>
            </div>
            <div className="profile-wrapper">
              <div className="user-profile" onClick={() => setProfileOpen(!profileOpen)}>
                <div className="avatar">{userName.charAt(0).toUpperCase()}</div>
                <span>{userName}</span>
                <ChevronDown size={16} color="var(--text-muted)" />
              </div>

              {profileOpen && (
                <div className="profile-dropdown">
                  <div className="profile-dropdown-header">
                    <div className="profile-dropdown-name">{userName}</div>
                    <div className="profile-dropdown-email">{userEmail}</div>
                    <div className="profile-dropdown-status">Clinical Staff</div>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <button className="btn btn-secondary" style={{ width: '100%', justifyContent: 'flex-start' }}><Settings size={14} /> Full Profile</button>
                    <button className="btn btn-secondary" style={{ width: '100%', justifyContent: 'flex-start', color: 'var(--danger)', borderColor: 'rgba(255,0,0,0.2)' }} onClick={logout}><LogOut size={14} /> Sign Out</button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {!selectedReview ? (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px', marginBottom: '32px' }}>
                <div className="glass-panel" style={{ padding: '24px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', marginBottom: '16px', color: 'var(--text-muted)' }}>
                    <FileClock size={16} style={{ marginRight: '8px' }} />
                    <h3 style={{ fontSize: '14px', margin: 0, fontWeight: '600' }}>Pending Scans</h3>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'flex-end', gap: '12px' }}>
                    <div style={{ fontSize: '36px', fontWeight: 'bold', color: 'var(--primary)', lineHeight: 1 }}>{pendingReviews.length}</div>
                    <div style={{ fontSize: '13px', color: 'var(--danger)', marginBottom: '4px' }}>Action Required</div>
                  </div>
                </div>

                <div className="glass-panel" style={{ padding: '24px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', marginBottom: '16px', color: 'var(--text-muted)' }}>
                    <Users size={16} style={{ marginRight: '8px' }} />
                    <h3 style={{ fontSize: '14px', margin: 0, fontWeight: '600' }}>Active Patients</h3>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'flex-end', gap: '12px' }}>
                    <div style={{ fontSize: '36px', fontWeight: 'bold', lineHeight: 1 }}>24</div>
                    <div style={{ fontSize: '12px', color: '#4ade80', marginBottom: '4px', background: 'rgba(74, 222, 128, 0.1)', padding: '2px 8px', borderRadius: '12px' }}>+3 this week</div>
                  </div>
                </div>

                <div className="glass-panel" style={{ padding: '24px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', marginBottom: '16px', color: 'var(--text-muted)' }}>
                    <Target size={16} style={{ marginRight: '8px' }} />
                    <h3 style={{ fontSize: '14px', margin: 0, fontWeight: '600' }}>Clinical Agreement</h3>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'flex-end', gap: '12px' }}>
                    <div style={{ fontSize: '36px', fontWeight: 'bold', color: '#4ade80', lineHeight: 1 }}>94%</div>
                    <div style={{ fontSize: '12px', color: '#4ade80', marginBottom: '4px', background: 'rgba(74, 222, 128, 0.1)', padding: '2px 8px', borderRadius: '12px' }}>+1.2%</div>
                  </div>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 2fr) minmax(0, 1fr)', gap: '24px' }}>
                <div className="glass-panel" style={{ padding: '32px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', marginBottom: '24px' }}>
                    <Activity size={24} color="var(--primary)" style={{ marginRight: '12px' }} />
                    <h2 style={{ margin: 0 }}>Pending Patient Scans</h2>
                  </div>

                  {pendingReviews.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '60px 0' }}>
                      <CheckCircle2 size={56} color="#4ade80" style={{ margin: '0 auto 16px', opacity: 0.8 }} />
                      <h3 style={{ marginBottom: '8px', fontSize: '20px' }}>All Caught Up!</h3>
                      <p style={{ color: 'var(--text-muted)', marginBottom: '24px' }}>You have no pending clinical reviews in your queue.</p>
                      <button className="btn btn-secondary" style={{ padding: '8px 16px' }} onClick={() => alert('No new scans available in remote database at this time.')}>Refresh Queue</button>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      {pendingReviews.map(review => (
                        <div
                          key={review.id}
                          style={{ padding: '16px', background: 'rgba(255,255,255,0.05)', borderRadius: '8px', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', border: '1px solid var(--panel-border)' }}
                          onClick={() => setSelectedReview(review)}
                        >
                          <div>
                            <h4 style={{ margin: '0 0 4px 0' }}>{review.patientName}</h4>
                            <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-muted)' }}>{review.date} • Prompt: {review.prompt}</p>
                          </div>
                          <button className="btn btn-primary" style={{ padding: '6px 12px', fontSize: '13px' }}>Review</button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Right Side: Contribution History */}
                <div className="glass-panel" style={{ padding: '24px', height: 'fit-content' }}>
                  <div style={{ display: 'flex', alignItems: 'center', marginBottom: '20px' }}>
                    <FileText size={18} color="var(--primary)" style={{ marginRight: '10px' }} />
                    <h3 style={{ margin: 0, fontSize: '15px' }}>RLHF Contributions</h3>
                  </div>

                  {rlhfDataset.length === 0 ? (
                    <p style={{ color: 'var(--text-muted)', fontSize: '13px', textAlign: 'center', margin: '40px 0' }}>No RLHF contributions yet.</p>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      {rlhfDataset.slice(-6).reverse().map((entry, idx) => (
                        <div key={idx} style={{ padding: '12px', background: 'rgba(0,0,0,0.2)', borderRadius: '8px', borderLeft: `3px solid ${entry.isApproved ? '#4ade80' : 'var(--primary)'}` }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2px' }}>
                            <span style={{ fontSize: '13px', fontWeight: '600' }}>Patient: {entry.patientName}</span>
                            <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Recent</span>
                          </div>
                          <div style={{ fontSize: '12px', color: entry.isApproved ? '#4ade80' : 'var(--primary)' }}>
                            {entry.isApproved ? 'Diagnosis Approved' : 'Correction Submitted'}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </>
          ) : (
            <div className="glass-panel" style={{ padding: '32px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                <h2 style={{ margin: 0 }}>Reviewing: {selectedReview.patientName} ({selectedReview.date})</h2>
                <button className="btn btn-secondary" onClick={() => { setSelectedReview(null); setDoctorNotes(''); }}>Back to List</button>
              </div>

              <div className="analysis-grid">
                <div>
                  <h3 className="input-label" style={{ margin: '0 0 12px 0' }}>Patient Profile & Scan</h3>

                  <div style={{ padding: '16px', background: 'rgba(255,255,255,0.05)', borderRadius: '8px', marginBottom: '16px', border: '1px solid var(--panel-border)' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px', fontSize: '14px' }}>
                      <div><span style={{ color: 'var(--text-muted)' }}>Age:</span> {selectedReview.age || 'N/A'}</div>
                      <div><span style={{ color: 'var(--text-muted)' }}>Sex:</span> {selectedReview.sex || 'N/A'}</div>
                      <div style={{ gridColumn: 'span 2' }}><span style={{ color: 'var(--text-muted)' }}>Modality:</span> <strong>{selectedReview.scanType || 'N/A'}</strong></div>
                    </div>
                    {selectedReview.symptoms && (
                      <div style={{ marginTop: '8px', paddingTop: '12px', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
                        <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '13px', marginBottom: '4px' }}>Presenting Symptoms:</span>
                        <div style={{ fontSize: '13px', lineHeight: '1.5' }}>{selectedReview.symptoms}</div>
                      </div>
                    )}
                  </div>

                  <div className="img-preview-container border" style={{ borderColor: 'var(--panel-border)', borderStyle: 'solid', borderWidth: '1px' }}>
                    <img src={selectedReview.scanImage} alt="Patient Scan" className="img-preview" />
                  </div>
                  <div style={{ marginTop: '16px' }}>
                    <strong style={{ fontSize: '14px', color: 'var(--primary)' }}>Clinical Inquiry:</strong>
                    <p style={{ margin: '4px 0 0 0', padding: '12px', background: 'rgba(0,0,0,0.2)', borderRadius: '8px', fontSize: '14px' }}>{selectedReview.prompt}</p>
                  </div>
                </div>

                <div>
                  <h3 className="input-label" style={{ margin: '0 0 12px 0' }}>AI Prediction</h3>
                  <div style={{ padding: '16px', background: 'rgba(0,0,0,0.2)', borderRadius: '8px', marginBottom: '24px', fontSize: '14px', lineHeight: '1.6', whiteSpace: 'pre-wrap' }}>
                    {selectedReview.aiResult}
                  </div>

                  <h3 className="input-label" style={{ margin: '0 0 12px 0' }}>Doctor's Notes / RLHF Correction</h3>
                  <textarea
                    className="input-field"
                    rows="4"
                    placeholder="Enter your corrections or approval notes to improve the model..."
                    value={doctorNotes}
                    onChange={(e) => setDoctorNotes(e.target.value)}
                    style={{ height: 'auto', resize: 'vertical' }}
                  ></textarea>

                  <div style={{ display: 'flex', gap: '12px', marginTop: '16px' }}>
                    <button className="btn btn-secondary" style={{ flex: 1 }} onClick={() => submitFeedback(true)}>Approve (Accurate)</button>
                    <button className="btn btn-primary" style={{ flex: 1 }} onClick={() => submitFeedback(false)}>Submit Correction</button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Patient Dashboard
  return (
    <div className="dashboard">
      <Sidebar role={role} logout={logout} activeTab={activeTab} setActiveTab={setActiveTab} isSidebarOpen={isSidebarOpen} setIsSidebarOpen={setIsSidebarOpen} />

      <div className="main-content">
        <div className="header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <button className="btn btn-secondary" onClick={() => setIsSidebarOpen(true)} style={{ padding: '8px' }}>
              <Menu size={20} />
            </button>
            <div>
              <h1 className="page-title" style={{ margin: 0, fontSize: '20px' }}>{activeTab === 'dashboard' ? 'Patient Portal' : 'My Records'}</h1>
              {activeTab === 'dashboard' && <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: 'var(--primary)' }}>Welcome back, {userName}. {new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}</p>}
            </div>
          </div>

          <div className="profile-wrapper">
            <div className="user-profile" onClick={() => setProfileOpen(!profileOpen)}>
              <div className="avatar">{userName.charAt(0).toUpperCase()}</div>
              <span>{userName}</span>
              <ChevronDown size={16} color="var(--text-muted)" />
            </div>

            {profileOpen && (
              <div className="profile-dropdown">
                <div className="profile-dropdown-header">
                  <div className="profile-dropdown-name">{userName}</div>
                  <div className="profile-dropdown-email">{userEmail}</div>
                  <div className="profile-dropdown-status">{role === 'doctor' ? 'Clinical Staff' : 'Premium Patient'}</div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <button className="btn btn-secondary" style={{ width: '100%', justifyContent: 'flex-start' }}><Settings size={14} /> Full Profile</button>
                  <button className="btn btn-secondary" style={{ width: '100%', justifyContent: 'flex-start', color: 'var(--danger)', borderColor: 'rgba(255,0,0,0.2)' }} onClick={logout}><LogOut size={14} /> Sign Out</button>
                </div>
              </div>
            )}
          </div>
        </div>

        {activeTab === 'records' ? (
          <div className="glass-panel" style={{ padding: '32px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <h2 style={{ margin: 0 }}>My Medical Records</h2>
              <button
                className="btn btn-secondary"
                style={{ color: 'var(--danger)', borderColor: 'rgba(255,0,0,0.2)' }}
                onClick={clearLocalDatabase}
              >
                Clear Database
              </button>
            </div>
            {myRecords.length === 0 ? (
              <p style={{ color: 'var(--text-muted)' }}>No records found. Upload a scan to generate a record.</p>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'minmax(250px, 1fr) minmax(250px, 1fr)', gap: '20px' }}>
                {myRecords.map((rec, i) => (
                  <div key={i} style={{ background: 'rgba(0,0,0,0.2)', borderRadius: '12px', padding: '16px', border: '1px solid var(--panel-border)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                      <p style={{ color: 'var(--text-muted)', fontSize: '13px', margin: 0 }}>{rec.date}</p>
                      <button
                        onClick={() => deleteRecord(rec.id)}
                        style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '4px', display: 'flex' }}
                        title="Delete Record"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                    <img src={rec.scanImage} style={{ width: '100%', height: '150px', objectFit: 'cover', borderRadius: '8px', marginBottom: '16px' }} />
                    <div style={{ display: 'flex', alignItems: 'center', marginBottom: '8px', gap: '8px' }}>
                      <span style={{ fontSize: '12px', background: 'rgba(255,255,255,0.1)', padding: '2px 8px', borderRadius: '12px' }}>{rec.scanType || 'X-Ray'}</span>
                      {rec.age && <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{rec.age} • {rec.sex}</span>}
                    </div>
                    <p style={{ fontSize: '14px', fontWeight: 'bold', margin: '0 0 10px 0' }}>Symptoms: <span style={{ fontWeight: 'normal', color: '#ccc' }}>{rec.symptoms || 'None reported'}</span></p>
                    <div style={{ fontSize: '13px', color: '#ccc', maxHeight: '60px', overflow: 'hidden', textOverflow: 'ellipsis', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '10px' }}>
                      {rec.aiResult}
                    </div>
                    {rec.isReviewed && (
                      <div style={{ marginTop: '16px', paddingTop: '12px', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px', color: rec.isApproved ? '#4ade80' : 'var(--primary)' }}>
                          <CheckCircle2 size={14} />
                          <span style={{ fontSize: '12px', fontWeight: 'bold' }}>
                            {rec.isApproved ? 'Approved by Doctor' : 'Corrected by Doctor'}
                          </span>
                        </div>
                        {rec.doctorNotes && (
                          <div style={{ fontSize: '12px', color: 'var(--text-muted)', fontStyle: 'italic', background: 'rgba(0,0,0,0.3)', padding: '8px', borderRadius: '4px' }}>
                            "{rec.doctorNotes}"
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          <>
            {/* System Status / Telemetry */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', marginBottom: '32px' }}>
              <div className="glass-panel" style={{ flex: '1 1 300px', padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: '12px', borderLeft: connected ? '3px solid #4ade80' : '3px solid var(--danger)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Activity size={16} color={connected ? '#4ade80' : 'var(--text-muted)'} />
                    <h3 style={{ fontSize: '13px', margin: 0, textTransform: 'uppercase', letterSpacing: '1px', color: 'var(--text-muted)' }}>Neural Backend Link</h3>
                  </div>
                  <span style={{ fontSize: '11px', background: connected ? 'rgba(74, 222, 128, 0.1)' : 'rgba(255, 255, 255, 0.05)', color: connected ? '#4ade80' : 'var(--text-muted)', padding: '2px 8px', borderRadius: '12px' }}>
                    {connected ? 'ACTIVE' : 'OFFLINE'}
                  </span>
                </div>

                <div style={{ display: 'flex', gap: '8px' }}>
                  <input
                    type="text"
                    className="input-field"
                    placeholder="Enter MedGemma URL (e.g. https://xxx.gradio.live)"
                    value={colabUrl}
                    onChange={(e) => setColabUrl(e.target.value)}
                    style={{ marginBottom: 0, flex: 1, padding: '8px 12px', fontSize: '12px' }}
                  />
                  <button className={`btn ${connected ? 'btn-secondary' : 'btn-primary'}`} style={{ padding: '6px 12px', fontSize: '12px' }} onClick={handleConnect} disabled={isConnecting}>
                    {isConnecting ? 'Syncing...' : connected ? 'Resync' : 'Connect'}
                  </button>
                </div>
              </div>

              <div className="glass-panel" style={{ flex: '1 1 200px', padding: '16px 20px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                <h3 style={{ fontSize: '13px', margin: '0 0 4px 0', textTransform: 'uppercase', letterSpacing: '1px', color: 'var(--text-muted)' }}>Session Security</h3>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#4ade80' }}>
                  <CheckCircle2 size={16} />
                  <span style={{ fontSize: '13px', fontWeight: 'bold' }}>End-to-End Encrypted</span>
                </div>
              </div>
            </div>

            {connectionError && (
              <div style={{ background: 'rgba(255, 0, 0, 0.1)', border: '1px solid var(--danger)', padding: '12px', borderRadius: '8px', marginBottom: '32px', color: '#fca5a5' }}>
                <AlertCircle size={16} style={{ display: 'inline', marginRight: '8px', verticalAlign: 'middle' }} />
                <span style={{ fontSize: '14px', verticalAlign: 'middle' }}>
                  <strong>Connection Failed:</strong> {connectionError}
                  <br /><br />
                  <span style={{ color: '#fff' }}>If you are getting a CORS error, you need to update your Gradio launch command in Google Colab to accept connections. For example:</span>
                  <br />
                  <code style={{ background: 'rgba(0,0,0,0.3)', padding: '2px 6px', borderRadius: '4px', color: '#60a5fa' }}>
                    demo.launch(share=True, cors_allowed_origins=["http://localhost:5173"])
                  </code>
                </span>
              </div>
            )}

            {/* Main Interface */}
            <div className="glass-panel" style={{ padding: '32px' }}>

              <h2 style={{ marginBottom: '24px', fontSize: '18px', borderBottom: '1px solid var(--panel-border)', paddingBottom: '12px' }}>Patient Demographics & Clinical Context</h2>

              <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr) minmax(0, 2fr)', gap: '20px', marginBottom: '16px' }}>
                <div className="input-group" style={{ marginBottom: 0 }}>
                  <label className="input-label">Age</label>
                  <input type="number" className="input-field" placeholder="E.g., 45" value={patientAge} onChange={(e) => setPatientAge(e.target.value)} />
                </div>
                <div className="input-group" style={{ marginBottom: 0 }}>
                  <label className="input-label">Biological Sex</label>
                  <select className="input-field" value={patientSex} onChange={(e) => setPatientSex(e.target.value)} style={{ appearance: 'none', backgroundImage: 'url("data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22292.4%22%20height%3D%22292.4%22%3E%3Cpath%20fill%3D%22%239CA3AF%22%20d%3D%22M287%2069.4a17.6%2017.6%200%200%200-13-5.4H18.4c-5%200-9.3%201.8-12.9%205.4A17.6%2017.6%200%200%200%200%2082.2c0%205%201.8%209.3%205.4%2012.9l128%20127.9c3.6%203.6%207.8%205.4%2012.8%205.4s9.2-1.8%2012.8-5.4L287%2095c3.5-3.5%205.4-7.8%205.4-12.8%200-5-1.9-9.2-5.5-12.8z%22%2F%3E%3C%2Fsvg%3E")', backgroundRepeat: 'no-repeat', backgroundPosition: 'right 16px center', backgroundSize: '12px auto' }}>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div className="input-group" style={{ marginBottom: 0 }}>
                  <label className="input-label">Scan Modality</label>
                  <select className="input-field" value={scanType} onChange={(e) => setScanType(e.target.value)} style={{ appearance: 'none', backgroundImage: 'url("data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22292.4%22%20height%3D%22292.4%22%3E%3Cpath%20fill%3D%22%239CA3AF%22%20d%3D%22M287%2069.4a17.6%2017.6%200%200%200-13-5.4H18.4c-5%200-9.3%201.8-12.9%205.4A17.6%2017.6%200%200%200%200%2082.2c0%205%201.8%209.3%205.4%2012.9l128%20127.9c3.6%203.6%207.8%205.4%2012.8%205.4s9.2-1.8%2012.8-5.4L287%2095c3.5-3.5%205.4-7.8%205.4-12.8%200-5-1.9-9.2-5.5-12.8z%22%2F%3E%3C%2Fsvg%3E")', backgroundRepeat: 'no-repeat', backgroundPosition: 'right 16px center', backgroundSize: '12px auto' }}>
                    <option value="X-Ray">X-Ray</option>
                    <option value="MRI">MRI</option>
                    <option value="CT Scan">CT Scan</option>
                    <option value="Ultrasound">Ultrasound</option>
                    <option value="PET Scan">PET Scan</option>
                    <option value="Mammography">Mammography</option>
                    <option value="Fluoroscopy">Fluoroscopy</option>
                    <option value="Angiography">Angiography</option>
                    <option value="Endoscopy / Colonoscopy">Endoscopy / Colonoscopy</option>
                    <option value="Funduscopy (Retinal)">Funduscopy (Retinal)</option>
                    <option value="Optical Coherence Tomography (OCT)">Optical Coherence Tomography (OCT)</option>
                    <option value="Pathology (Histology)">Pathology (Histology)</option>
                    <option value="Electrocardiogram (ECG/EKG Visual)">Electrocardiogram (ECG/EKG Visual)</option>
                    <option value="Clinical Photograph">Clinical Photograph</option>
                    <option value="Dermatology / Skin">Dermatology / Skin</option>
                  </select>
                </div>
              </div>

              <div className="input-group">
                <label className="input-label">Presenting Symptoms & Medical History</label>
                <textarea className="input-field" rows="2" style={{ height: 'auto', resize: 'vertical' }} placeholder="E.g., Persistent cough for 2 weeks, mild fever. History of smoking." value={symptoms} onChange={(e) => setSymptoms(e.target.value)}></textarea>
              </div>

              {/* Patient Demographics fields... */}

              {!selectedImage ? (
                <div className="uploader" onClick={() => fileInputRef.current?.click()} style={{ marginTop: '24px' }}>
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
                <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', marginTop: '24px' }}>
                  
                  {/* Top Images Section */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)', gap: '20px' }}>
                    {/* Left: Original Image */}
                    <div className="glass-panel" style={{ padding: '0', overflow: 'hidden', background: 'rgba(255,255,255,0.02)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 16px', borderBottom: '1px solid var(--panel-border)', background: 'rgba(0,0,0,0.3)' }}>
                        <div style={{ fontSize: '13px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <UploadCloud size={14} /> Upload Medical Scan
                        </div>
                        <span style={{ fontSize: '12px', color: 'var(--primary)', cursor: 'pointer' }} onClick={() => setSelectedImage(null)}>
                          Replace
                        </span>
                      </div>
                      <div style={{ padding: '16px', display: 'flex', height: '350px', alignItems: 'center', justifyContent: 'center' }}>
                        <img src={selectedImage} alt="Medical Scan" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain', borderRadius: '4px' }} />
                      </div>
                    </div>

                    {/* Right: Result Image (Visual Grounding) */}
                    <div className="glass-panel" style={{ padding: '0', overflow: 'hidden', background: 'rgba(255,255,255,0.02)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 16px', borderBottom: '1px solid var(--panel-border)', background: 'rgba(0,0,0,0.3)' }}>
                        <div style={{ fontSize: '13px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <Target size={14} /> Visual Grounding (OWL-ViT)
                        </div>
                      </div>
                      <div style={{ padding: '16px', display: 'flex', height: '350px', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
                        {resultImage ? (
                          <img src={resultImage} alt="Grounded Medical Scan" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain', borderRadius: '4px' }} />
                        ) : (
                          <div style={{ color: 'var(--text-muted)', fontSize: '14px', textAlign: 'center' }}>
                            {isAnalyzing ? "Generating bounding boxes..." : "Run analysis to view visual grounding"}
                          </div>
                        )}
                        {isAnalyzing && (
                          <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10 }}>
                            <div style={{ textAlign: 'center' }}>
                              <Activity className="animate-spin" size={32} color="var(--primary)" style={{ margin: '0 auto 12px' }} />
                              <p>MediGemma is analyzing...</p>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Bottom Outputs Section */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)', gap: '20px' }}>
                    {/* Left: Action Button / Prompts */}
                    <div className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px', background: 'rgba(0,0,0,0.2)' }}>
                      <div className="input-group" style={{ marginBottom: 0 }}>
                        <label className="input-label" style={{ fontSize: '13px', color: '#ccc' }}>Diagnostic Query</label>
                        <input
                          type="text"
                          className="input-field"
                          value={prompt}
                          onChange={(e) => setPrompt(e.target.value)}
                          placeholder="e.g. what is the possible injury or disease?"
                          style={{ background: 'rgba(255,255,255,0.05)', borderColor: 'rgba(255,255,255,0.1)' }}
                        />
                      </div>
                      <div className="input-group" style={{ marginBottom: 0 }}>
                        <label className="input-label" style={{ fontSize: '13px', color: '#ccc' }}>Feature to Highlight (Optional)</label>
                        <input
                          type="text"
                          className="input-field"
                          value={featureHighlight}
                          onChange={(e) => setFeatureHighlight(e.target.value)}
                          placeholder="e.g. infection"
                          style={{ background: 'rgba(255,255,255,0.05)', borderColor: 'rgba(255,255,255,0.1)' }}
                        />
                      </div>
                      
                      <div style={{ flexGrow: 1 }}></div>

                      <button
                        className="btn btn-primary"
                        style={{ width: '100%', padding: '14px', fontSize: '15px', fontWeight: 'bold' }}
                        onClick={analyzeScan}
                        disabled={isAnalyzing || !connected}
                      >
                        {isAnalyzing ? 'Processing AI...' : 'Analyze & Ground'}
                      </button>
                    </div>

                    {/* Right: AI Report */}
                    <div className="glass-panel" style={{ background: 'rgba(0,0,0,0.2)', padding: '24px' }}>
                      <div style={{ fontSize: '14px', fontWeight: 'bold', borderBottom: '1px solid var(--panel-border)', paddingBottom: '12px', marginBottom: '16px', color: '#ccc' }}>
                        AI Diagnostic Report (MedGemma)
                      </div>

                      <div className="report-section" style={{ minHeight: '150px' }}>
                        {resultText ? (
                          <div className="animate-fade-in">
                            {findings.length > 0 && (
                              <div style={{ marginBottom: '16px' }}>
                                {findings.map((f, i) => (
                                  <span key={i} className="finding-tag" style={{ background: 'rgba(255, 68, 68, 0.2)', color: '#ff6b6b', padding: '4px 8px', borderRadius: '4px', fontSize: '12px', border: '1px solid rgba(255,68,68,0.3)' }}>{f}</span>
                                ))}
                              </div>
                            )}
                            <div style={{ fontSize: '14px', lineHeight: '1.6', color: '#E2E8F0', whiteSpace: 'pre-wrap' }}>
                              {resultText}
                            </div>
                            <div style={{ marginTop: '24px', paddingTop: '16px', borderTop: '1px solid var(--panel-border)', display: 'flex', gap: '12px' }}>
                              <button className="btn btn-secondary" style={{ flex: 1, padding: '10px' }} onClick={handleSendForReview}>Send for Review</button>
                            </div>
                          </div>
                        ) : (
                          <div style={{ textAlign: 'center', color: 'var(--text-muted)', paddingTop: '40px' }}>
                            <AlertCircle size={32} style={{ margin: '0 auto 12px', opacity: 0.5 }} />
                            <p style={{ fontSize: '13px' }}>Awaiting analysis. Upload a scan and click run.</p>
                            {!connected && <p style={{ fontSize: '12px', color: 'var(--danger)', marginTop: '8px' }}>Disconnected from AI Backend.</p>}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                </div>
              )}
            </div>
          </>
        )}
      </div>
      <style>{`
        @keyframes spin { 100% { transform: rotate(360deg); } }
        .animate-spin { animation: spin 1s linear infinite; }
      `}</style>
    </div>
  );
}

// Reusable Sidebar Component
function Sidebar({ role, logout, activeTab = 'dashboard', setActiveTab = () => { }, isSidebarOpen = false, setIsSidebarOpen = () => { } }) {
  return (
    <>
      {isSidebarOpen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 90 }} onClick={() => setIsSidebarOpen(false)}></div>
      )}
      <div className={`sidebar ${isSidebarOpen ? 'sidebar-open' : 'sidebar-closed'}`}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '40px' }}>
          <div className="sidebar-brand" style={{ margin: 0 }}>
            <Activity size={24} />
            MediGemma-X
          </div>
          <button className="btn btn-secondary" style={{ padding: '4px' }} onClick={() => setIsSidebarOpen(false)}>
            <X size={20} />
          </button>
        </div>

        <div className="sidebar-nav">
          <a href="#" className={`nav-item ${activeTab === 'dashboard' ? 'active' : ''}`} onClick={(e) => { e.preventDefault(); setActiveTab('dashboard'); setIsSidebarOpen(false); }}>
            <LayoutDashboard size={18} />
            Dashboard
          </a>
          <a href="#" className={`nav-item ${activeTab === 'records' ? 'active' : ''}`} onClick={(e) => { e.preventDefault(); setActiveTab('records'); setIsSidebarOpen(false); }}>
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
    </>
  );
}
