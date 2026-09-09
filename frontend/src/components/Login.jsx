import React, { useState } from 'react';
import { Camera, Shield, GraduationCap, Users, LogIn, ArrowRight, Sparkles, CheckCircle } from 'lucide-react';

const Login = ({ onLoginSuccess }) => {
  const [selectedRole, setSelectedRole] = useState('teacher');
  const [username, setUsername] = useState('teacher');
  const [password, setPassword] = useState('teacher123');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const demoAccounts = {
    teacher: { username: 'teacher', password: 'teacher123', name: 'Prof. Vikram Sharma', desc: 'Manage camera attendance, real-time focus HUD, roster & grades' },
    student: { username: 'student', password: 'student123', name: 'Rahul Sharma (Roll: 101)', desc: 'View personal attendance streak, activeness graphs & AI study tips' },
    parent: { username: 'parent', password: 'parent123', name: 'Mr. Rajesh Sharma', desc: 'Monitor child\'s daily attendance, focus alerts & message teachers' }
  };

  const handleRoleTabClick = (role) => {
    setSelectedRole(role);
    setUsername(demoAccounts[role].username);
    setPassword(demoAccounts[role].password);
    setError('');
  };

  const handleQuickLogin = (role) => {
    setSelectedRole(role);
    const acc = demoAccounts[role];
    executeLogin(acc.username, acc.password);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    executeLogin(username, password);
  };

  const executeLogin = async (user, pass) => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('http://localhost:8000/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: user, password: pass })
      });
      if (!res.ok) {
        throw new Error('Invalid username or password');
      }
      const data = await res.json();
      onLoginSuccess(data);
    } catch (err) {
      setError(err.message || 'Login failed. Please check backend server.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'radial-gradient(circle at 50% 20%, #1e2942 0%, #0b0f19 70%)',
      padding: '2rem'
    }}>
      <div style={{
        maxWidth: '1050px',
        width: '100%',
        display: 'grid',
        gridTemplateColumns: '1.2fr 1fr',
        gap: '2.5rem',
        alignItems: 'center'
      }}>
        {/* Left Side: Product Showcase */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
            <div style={{
              width: '48px',
              height: '48px',
              borderRadius: '12px',
              background: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 0 20px rgba(59, 130, 246, 0.5)'
            }}>
              <Camera size={26} color="#fff" />
            </div>
            <h1 style={{
              fontFamily: 'var(--font-heading)',
              fontSize: '2.4rem',
              fontWeight: 800,
              background: 'linear-gradient(135deg, #60a5fa 0%, #c084fc 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent'
            }}>
              EduCam
            </h1>
          </div>

          <h2 style={{ fontSize: '1.8rem', fontWeight: 700, lineHeight: 1.3, marginBottom: '1rem' }}>
            AI Camera Attendance, Activeness Telemetry & 3-Way Classroom Portal
          </h2>

          <p style={{ color: 'var(--text-secondary)', fontSize: '1rem', lineHeight: 1.6, marginBottom: '2rem' }}>
            Transform traditional classrooms into intelligent learning environments. Seamless automated attendance via face recognition, live attentiveness and fatigue detection, academic reporting, and integrated AI counseling.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <CheckCircle size={20} color="var(--accent-emerald)" />
              <span style={{ fontSize: '0.95rem', color: 'var(--text-primary)' }}>AI Vision: Face Recognition Attendance + Drowsiness Alerts</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <CheckCircle size={20} color="var(--accent-blue)" />
              <span style={{ fontSize: '0.95rem', color: 'var(--text-primary)' }}>Personalized Portals for Teachers, Students & Parents</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <CheckCircle size={20} color="var(--accent-purple)" />
              <span style={{ fontSize: '0.95rem', color: 'var(--text-primary)' }}>AI Study Assistant, Engagement Metrics & Academic Gradebook</span>
            </div>
          </div>

          {/* Quick Demo Login Cards */}
          <div style={{ marginTop: '2.5rem' }}>
            <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <Sparkles size={14} color="#f59e0b" />
              <span>1-Click Quick Demo Logins</span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem' }}>
              <button 
                className="btn"
                onClick={() => handleQuickLogin('teacher')}
                style={{
                  background: 'rgba(139, 92, 246, 0.1)',
                  borderColor: 'rgba(139, 92, 246, 0.3)',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'flex-start',
                  padding: '0.75rem',
                  borderRadius: '12px',
                  textAlign: 'left'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--accent-purple)', fontWeight: 700, fontSize: '0.85rem' }}>
                  <Shield size={14} /> Teacher
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>Prof. Vikram</div>
              </button>

              <button 
                className="btn"
                onClick={() => handleQuickLogin('student')}
                style={{
                  background: 'rgba(59, 130, 246, 0.1)',
                  borderColor: 'rgba(59, 130, 246, 0.3)',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'flex-start',
                  padding: '0.75rem',
                  borderRadius: '12px',
                  textAlign: 'left'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--accent-blue)', fontWeight: 700, fontSize: '0.85rem' }}>
                  <GraduationCap size={14} /> Student
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>Rahul (Roll 101)</div>
              </button>

              <button 
                className="btn"
                onClick={() => handleQuickLogin('parent')}
                style={{
                  background: 'rgba(16, 185, 129, 0.1)',
                  borderColor: 'rgba(16, 185, 129, 0.3)',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'flex-start',
                  padding: '0.75rem',
                  borderRadius: '12px',
                  textAlign: 'left'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--accent-emerald)', fontWeight: 700, fontSize: '0.85rem' }}>
                  <Users size={14} /> Parent
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>Mr. Rajesh</div>
              </button>
            </div>
          </div>
        </div>

        {/* Right Side: Login Form Card */}
        <div className="glass-panel" style={{ padding: '2.5rem', borderRadius: '20px' }}>
          <h3 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.4rem', fontWeight: 700, marginBottom: '1.25rem' }}>
            Portal Sign In
          </h3>

          {/* Role selector tabs */}
          <div style={{ display: 'flex', background: 'var(--bg-tertiary)', borderRadius: '12px', padding: '4px', marginBottom: '1.5rem', border: '1px solid var(--glass-border)' }}>
            <button
              type="button"
              onClick={() => handleRoleTabClick('teacher')}
              style={{
                flex: 1,
                padding: '8px 0',
                border: 'none',
                borderRadius: '8px',
                background: selectedRole === 'teacher' ? 'var(--accent-purple)' : 'transparent',
                color: selectedRole === 'teacher' ? '#fff' : 'var(--text-secondary)',
                fontWeight: 600,
                fontSize: '0.85rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.35rem'
              }}
            >
              <Shield size={14} /> Teacher
            </button>

            <button
              type="button"
              onClick={() => handleRoleTabClick('student')}
              style={{
                flex: 1,
                padding: '8px 0',
                border: 'none',
                borderRadius: '8px',
                background: selectedRole === 'student' ? 'var(--accent-blue)' : 'transparent',
                color: selectedRole === 'student' ? '#fff' : 'var(--text-secondary)',
                fontWeight: 600,
                fontSize: '0.85rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.35rem'
              }}
            >
              <GraduationCap size={14} /> Student
            </button>

            <button
              type="button"
              onClick={() => handleRoleTabClick('parent')}
              style={{
                flex: 1,
                padding: '8px 0',
                border: 'none',
                borderRadius: '8px',
                background: selectedRole === 'parent' ? 'var(--accent-emerald)' : 'transparent',
                color: selectedRole === 'parent' ? '#fff' : 'var(--text-secondary)',
                fontWeight: 600,
                fontSize: '0.85rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.35rem'
              }}
            >
              <Users size={14} /> Parent
            </button>
          </div>

          <div style={{
            background: 'rgba(255, 255, 255, 0.02)',
            border: '1px solid var(--glass-border)',
            borderRadius: '10px',
            padding: '0.75rem',
            marginBottom: '1.5rem',
            fontSize: '0.8rem',
            color: 'var(--text-secondary)'
          }}>
            Signing in as: <strong style={{ color: 'var(--text-primary)' }}>{demoAccounts[selectedRole].name}</strong>
          </div>

          {error && (
            <div style={{
              background: 'rgba(244, 63, 94, 0.15)',
              border: '1px solid var(--accent-rose)',
              color: '#fca5a5',
              padding: '0.75rem',
              borderRadius: '8px',
              fontSize: '0.85rem',
              marginBottom: '1rem'
            }}>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label>Username</label>
              <input 
                type="text" 
                className="form-control" 
                value={username} 
                onChange={(e) => setUsername(e.target.value)}
                required 
              />
            </div>

            <div className="form-group">
              <label>Password</label>
              <input 
                type="password" 
                className="form-control" 
                value={password} 
                onChange={(e) => setPassword(e.target.value)}
                required 
              />
            </div>

            <button 
              type="submit" 
              className="btn btn-primary"
              disabled={loading}
              style={{ width: '100%', justifyContent: 'center', marginTop: '1.5rem', padding: '0.85rem' }}
            >
              {loading ? (
                'Authenticating...'
              ) : (
                <>
                  <LogIn size={18} /> Sign In to {selectedRole.charAt(0).toUpperCase() + selectedRole.slice(1)} Portal
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Login;
