import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Activity, User, Stethoscope } from 'lucide-react';

export default function Landing() {
  const navigate = useNavigate();
  const [role, setRole] = useState('doctor'); // 'doctor' or 'patient'
  const [isLogin, setIsLogin] = useState(true);
  
  // Form states
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    // Mock authentication
    console.log(`Authenticating ${role} with email ${email}`);
    // Save to local storage for demo purposes
    localStorage.setItem('userRole', role);
    navigate('/dashboard');
  };

  return (
    <div className="auth-container">
      <div className="auth-card glass-panel animate-fade-in">
        <div className="auth-header">
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '16px' }}>
            <div style={{ background: 'rgba(79, 140, 255, 0.1)', padding: '16px', borderRadius: '50%' }}>
              <Activity size={36} color="var(--primary)" />
            </div>
          </div>
          <h1 className="auth-title">MediGemma-X</h1>
          <p className="auth-subtitle">AI-Powered Clinical Interpretability</p>
        </div>

        <div className="auth-switch">
          <div 
            className={`auth-tab ${role === 'doctor' ? 'active' : ''}`}
            onClick={() => setRole('doctor')}
          >
            <Stethoscope size={16} style={{ marginBottom: '-3px', marginRight: '6px' }} />
            Doctor
          </div>
          <div 
            className={`auth-tab ${role === 'patient' ? 'active' : ''}`}
            onClick={() => setRole('patient')}
          >
            <User size={16} style={{ marginBottom: '-3px', marginRight: '6px' }} />
            Patient
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          {!isLogin && (
            <div className="input-group">
              <label className="input-label">Full Name</label>
              <input type="text" className="input-field" placeholder="Dr. Jane Doe" required />
            </div>
          )}
          
          <div className="input-group">
            <label className="input-label">Email Address</label>
            <input 
              type="email" 
              className="input-field" 
              placeholder="jane.doe@hospital.org" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required 
            />
          </div>

          <div className="input-group">
            <label className="input-label">Password</label>
            <input 
              type="password" 
              className="input-field" 
              placeholder="••••••••" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required 
            />
          </div>

          <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '12px', padding: '14px' }}>
            {isLogin ? 'Sign In' : 'Create Account'}
          </button>
        </form>

        <div style={{ textAlign: 'center', marginTop: '24px', fontSize: '14px', color: 'var(--text-muted)' }}>
          {isLogin ? "Don't have an account? " : "Already have an account? "}
          <span 
            style={{ color: 'var(--primary)', cursor: 'pointer', fontWeight: '500' }}
            onClick={() => setIsLogin(!isLogin)}
          >
            {isLogin ? 'Sign up' : 'Log in'}
          </span>
        </div>
      </div>
    </div>
  );
}
