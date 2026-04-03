import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Activity, User, Stethoscope } from 'lucide-react';

export default function Landing() {
  const navigate = useNavigate();
  const [role, setRole] = useState('doctor'); // 'doctor' or 'patient'
  const [isLogin, setIsLogin] = useState(true);
  
  // Form states
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    // Save to local storage for demo purposes
    localStorage.setItem('userRole', role);
    localStorage.setItem('userEmail', email);
    
    // Set a display name
    let displayName = name;
    if (!displayName) {
      // Derive from email if login
      displayName = email.split('@')[0];
      // Format derived name slightly
      displayName = displayName.charAt(0).toUpperCase() + displayName.slice(1);
    }
    localStorage.setItem('userName', displayName);
    
    navigate('/dashboard');
  };

  return (
    <div className="auth-container" style={{ position: 'relative', overflow: 'hidden' }}>
      {/* Animated Background Effects */}
      <div className="bg-orb orb-1"></div>
      <div className="bg-orb orb-2"></div>
      <div className="bg-orb orb-3"></div>

      <div className="auth-card glass-panel animate-fade-in" style={{ position: 'relative', zIndex: 10, backdropFilter: 'blur(20px)', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(255, 255, 255, 0.1)' }}>
        <div className="auth-header">
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '24px' }}>
            <div style={{ 
              background: 'linear-gradient(135deg, rgba(79, 140, 255, 0.2) 0%, rgba(79, 140, 255, 0) 100%)', 
              padding: '20px', 
              borderRadius: '24px',
              border: '1px solid rgba(79, 140, 255, 0.3)',
              boxShadow: '0 0 30px rgba(79, 140, 255, 0.2)'
            }}>
              <Activity size={42} color="#60a5fa" />
            </div>
          </div>
          <h1 className="auth-title" style={{ fontSize: '32px', letterSpacing: '-0.5px' }}>MediGemma-X</h1>
          <p className="auth-subtitle" style={{ fontSize: '15px' }}>Next-Gen Clinical Interpretability Network</p>
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
              <input 
                type="text" 
                className="input-field" 
                placeholder={role === 'doctor' ? "Dr. Jane Doe" : "Jane Doe"} 
                value={name}
                onChange={(e) => setName(e.target.value)}
                required 
              />
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
