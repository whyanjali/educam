import React, { useState, useEffect, useRef } from 'react';
import { Camera, Shield, GraduationCap, Users, LogIn, UserPlus, ArrowRight, Sparkles, CheckCircle, Scan, Eye, EyeOff, UserCheck, AlertCircle, Mail, Lock, User, BookOpen } from 'lucide-react';

const Login = ({ onLoginSuccess }) => {
  // Main view: 'signin' or 'register' or 'biometric'
  const [authView, setAuthView] = useState('signin');
  
  // Sign In state
  const [loginEmail, setLoginEmail] = useState('teacher@educam.edu');
  const [loginPassword, setLoginPassword] = useState('teacher123');
  const [showPassword, setShowPassword] = useState(false);
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState('');

  // Registration state
  const [regRole, setRegRole] = useState('student');
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regConfirmPassword, setRegConfirmPassword] = useState('');
  const [regRollNumber, setRegRollNumber] = useState('');
  const [regGrade, setRegGrade] = useState('Class 10-A');
  const [regChildRoll, setRegChildRoll] = useState('101');
  const [regDepartment, setRegDepartment] = useState('Mathematics & Science');
  const [regLoading, setRegLoading] = useState(false);
  const [regError, setRegError] = useState('');

  // Biometric state
  const [scanStatus, setScanStatus] = useState('Align your face within the reticle to scan');
  const [scanSuccessUser, setScanSuccessUser] = useState(null);
  const [enrollNotice, setEnrollNotice] = useState('');
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const scanIntervalRef = useRef(null);
  const streamRef = useRef(null);

  const demoAccounts = {
    teacher: { email: 'teacher@educam.edu', password: 'teacher123', name: 'Prof. Vikram Sharma', desc: 'Classroom Vision Cockpit, attendance sheets & roster' },
    student: { email: 'student@educam.edu', password: 'student123', name: 'Rahul Sharma (Roll: 101)', desc: 'Personal attendance streak, focus graph & AI study tutor' },
    parent: { email: 'parent@educam.edu', password: 'parent123', name: 'Mr. Rajesh Sharma', desc: 'Child arrival verification, fatigue alerts & teacher chat' }
  };

  useEffect(() => {
    if (authView === 'biometric') {
      startWebcam();
    } else {
      stopWebcam();
    }
    return () => stopWebcam();
  }, [authView]);

  const startWebcam = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: 'user' }
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
        startAutoScanning();
      }
    } catch (err) {
      setScanStatus('Camera unavailable. Please switch to Email login.');
    }
  };

  const stopWebcam = () => {
    if (scanIntervalRef.current) {
      clearInterval(scanIntervalRef.current);
      scanIntervalRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
  };

  const startAutoScanning = () => {
    if (scanIntervalRef.current) clearInterval(scanIntervalRef.current);
    scanIntervalRef.current = setInterval(() => {
      captureAndVerifyFace();
    }, 1500);
  };

  const captureFrameBase64 = () => {
    if (!videoRef.current || !canvasRef.current) return null;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (video.videoWidth === 0 || video.videoHeight === 0) return null;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL('image/jpeg', 0.85);
  };

  const captureAndVerifyFace = async () => {
    if (scanSuccessUser) return;
    const base64 = captureFrameBase64();
    if (!base64) return;

    try {
      const res = await fetch('http://localhost:8000/api/auth/face-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image_base64: base64 })
      });

      if (!res.ok) return;
      const data = await res.json();

      if (data.authenticated && data.user) {
        setScanSuccessUser(data.user);
        setScanStatus(`Biometric Verified: ${data.user.name}`);
        stopWebcam();
        setTimeout(() => {
          onLoginSuccess(data.user);
        }, 1200);
      } else {
        if (data.reason === 'no_face_detected') {
          setScanStatus('Scanning... Center your face in the reticle');
        } else if (data.reason === 'unrecognized_face') {
          setScanStatus('Face detected. Unenrolled profile - click "Enroll My Face" below');
        }
      }
    } catch {
      // Retry
    }
  };

  const handleEnrollMyFace = async (roleToEnroll) => {
    const base64 = captureFrameBase64();
    if (!base64) {
      setEnrollNotice('Camera not ready to snap image.');
      return;
    }

    setEnrollNotice('Enrolling biometric signature in real-time...');
    const studentId = roleToEnroll === 'teacher' ? 999 : 1;

    try {
      const res = await fetch(`http://localhost:8000/api/auth/quick-enroll-face?student_id=${studentId}&role=${roleToEnroll}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image_base64: base64 })
      });

      const data = await res.json();
      if (res.ok) {
        setEnrollNotice(data.message);
        setTimeout(() => setEnrollNotice(''), 4000);
      } else {
        setEnrollNotice(data.detail || 'Enrollment failed.');
      }
    } catch {
      setEnrollNotice('Failed to enroll face.');
    }
  };

  const handleQuickLogin = (role) => {
    setAuthView('signin');
    const acc = demoAccounts[role];
    setLoginEmail(acc.email);
    setLoginPassword(acc.password);
    executeLogin(acc.email, acc.password);
  };

  const handleLoginSubmit = (e) => {
    e.preventDefault();
    executeLogin(loginEmail, loginPassword);
  };

  const executeLogin = async (email, pass) => {
    setLoginLoading(true);
    setLoginError('');
    try {
      const res = await fetch('http://localhost:8000/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), password: pass })
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.detail || 'Invalid email or password');
      }

      const user = await res.json();
      onLoginSuccess(user);
    } catch (err) {
      setLoginError(err.message || 'Login failed. Please check credentials.');
    } finally {
      setLoginLoading(false);
    }
  };

  const handleRegisterSubmit = async (e) => {
    e.preventDefault();
    setRegError('');

    if (regPassword !== regConfirmPassword) {
      setRegError('Passwords do not match. Please verify.');
      return;
    }

    if (regPassword.length < 6) {
      setRegError('Password must be at least 6 characters long.');
      return;
    }

    setRegLoading(true);
    try {
      const payload = {
        name: regName.trim(),
        email: regEmail.trim().toLowerCase(),
        password: regPassword,
        role: regRole,
        roll_number: regRole === 'student' ? regRollNumber.trim() : null,
        grade: regRole === 'student' ? regGrade : null,
        child_roll_number: regRole === 'parent' ? regChildRoll.trim() : null,
        department: regRole === 'teacher' ? regDepartment.trim() : null
      };

      const res = await fetch('http://localhost:8000/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.detail || 'Registration failed.');
      }

      const newUser = await res.json();
      onLoginSuccess(newUser);
    } catch (err) {
      setRegError(err.message || 'Registration failed. Please check form details.');
    } finally {
      setRegLoading(false);
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
      <canvas ref={canvasRef} style={{ display: 'none' }} />

      <div style={{
        maxWidth: '1120px',
        width: '100%',
        display: 'grid',
        gridTemplateColumns: '1.05fr 1.1fr',
        gap: '2.5rem',
        alignItems: 'center'
      }}>
        {/* Left Side: Product Showcase & Quick Profile Switcher */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.25rem' }}>
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

          <h2 style={{ fontSize: '1.65rem', fontWeight: 700, lineHeight: 1.3, marginBottom: '1rem' }}>
            Email Authentication & Classroom Vision Intelligence
          </h2>

          <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', lineHeight: 1.6, marginBottom: '2rem' }}>
            Sign in with your verified email to access dedicated dashboards for Teachers, Students, and Parents. Features camera attendance, real-time focus tracking, student record management, and AI counseling.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <CheckCircle size={20} color="var(--accent-emerald)" />
              <span style={{ fontSize: '0.95rem', color: 'var(--text-primary)' }}>Secure Email Authentication with Role Verification</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <CheckCircle size={20} color="var(--accent-blue)" />
              <span style={{ fontSize: '0.95rem', color: 'var(--text-primary)' }}>Teacher Cockpit: Full CRUD Student Management & Vision HUD</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <CheckCircle size={20} color="var(--accent-purple)" />
              <span style={{ fontSize: '0.95rem', color: 'var(--text-primary)' }}>Real-Time Face ID Biometric Camera Sign-In</span>
            </div>
          </div>

          {/* Quick Demo 1-Click Cards */}
          <div style={{ marginTop: '2.5rem' }}>
            <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <Sparkles size={14} color="#f59e0b" />
              <span>Instant 1-Click Demo Logins</span>
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
                <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>teacher@educam.edu</div>
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
                <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>student@educam.edu</div>
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
                <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>parent@educam.edu</div>
              </button>
            </div>
          </div>
        </div>

        {/* Right Side: Auth Card (Sign In / Register / Face ID) */}
        <div className="glass-panel" style={{ padding: '2rem', borderRadius: '20px' }}>
          {/* Main Mode Tabs */}
          <div style={{ display: 'flex', background: 'var(--bg-tertiary)', borderRadius: '12px', padding: '4px', marginBottom: '1.5rem', border: '1px solid var(--glass-border)' }}>
            <button
              type="button"
              onClick={() => { setAuthView('signin'); setLoginError(''); }}
              style={{
                flex: 1,
                padding: '9px 0',
                border: 'none',
                borderRadius: '8px',
                background: authView === 'signin' ? 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)' : 'transparent',
                color: authView === 'signin' ? '#fff' : 'var(--text-secondary)',
                fontWeight: 700,
                fontSize: '0.85rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.4rem'
              }}
            >
              <LogIn size={15} /> Sign In
            </button>

            <button
              type="button"
              onClick={() => { setAuthView('register'); setRegError(''); }}
              style={{
                flex: 1,
                padding: '9px 0',
                border: 'none',
                borderRadius: '8px',
                background: authView === 'register' ? 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)' : 'transparent',
                color: authView === 'register' ? '#fff' : 'var(--text-secondary)',
                fontWeight: 700,
                fontSize: '0.85rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.4rem'
              }}
            >
              <UserPlus size={15} /> Register
            </button>

            <button
              type="button"
              onClick={() => setAuthView('biometric')}
              style={{
                flex: 1,
                padding: '9px 0',
                border: 'none',
                borderRadius: '8px',
                background: authView === 'biometric' ? 'var(--bg-primary)' : 'transparent',
                color: authView === 'biometric' ? 'var(--accent-blue)' : 'var(--text-secondary)',
                fontWeight: 700,
                fontSize: '0.85rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.4rem'
              }}
            >
              <Scan size={15} /> Face ID
            </button>
          </div>

          {/* VIEW 1: EMAIL SIGN IN */}
          {authView === 'signin' && (
            <div>
              <div style={{ marginBottom: '1.25rem' }}>
                <h3 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.3rem', fontWeight: 800 }}>
                  Email Sign In
                </h3>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>
                  Enter your registered institutional or personal email address
                </p>
              </div>

              {loginError && (
                <div style={{
                  background: 'rgba(244, 63, 94, 0.15)',
                  border: '1px solid var(--accent-rose)',
                  color: '#fca5a5',
                  padding: '0.75rem',
                  borderRadius: '8px',
                  fontSize: '0.85rem',
                  marginBottom: '1rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem'
                }}>
                  <AlertCircle size={16} />
                  <span>{loginError}</span>
                </div>
              )}

              <form onSubmit={handleLoginSubmit}>
                <div className="form-group">
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <Mail size={14} color="var(--accent-blue)" /> Email Address
                  </label>
                  <input 
                    type="email" 
                    className="form-control" 
                    placeholder="e.g. teacher@educam.edu"
                    value={loginEmail} 
                    onChange={(e) => setLoginEmail(e.target.value)}
                    required 
                  />
                </div>

                <div className="form-group">
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <Lock size={14} color="var(--accent-blue)" /> Password
                  </label>
                  <div style={{ position: 'relative' }}>
                    <input 
                      type={showPassword ? 'text' : 'password'} 
                      className="form-control" 
                      placeholder="Enter your account password"
                      value={loginPassword} 
                      onChange={(e) => setLoginPassword(e.target.value)}
                      required 
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      style={{
                        position: 'absolute',
                        right: '12px',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        background: 'transparent',
                        border: 'none',
                        color: 'var(--text-muted)',
                        cursor: 'pointer'
                      }}
                    >
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                <button 
                  type="submit" 
                  className="btn btn-primary"
                  disabled={loginLoading}
                  style={{ width: '100%', justifyContent: 'center', marginTop: '1.25rem', padding: '0.85rem' }}
                >
                  {loginLoading ? (
                    'Authenticating...'
                  ) : (
                    <>
                      <LogIn size={18} /> Sign In to Portal
                    </>
                  )}
                </button>
              </form>

              <div style={{ marginTop: '1.25rem', textAlign: 'center', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                Don't have an account?{' '}
                <button
                  type="button"
                  onClick={() => setAuthView('register')}
                  style={{ background: 'transparent', border: 'none', color: 'var(--accent-blue)', fontWeight: 700, cursor: 'pointer' }}
                >
                  Register here
                </button>
              </div>
            </div>
          )}

          {/* VIEW 2: ROLE-BASED REGISTRATION */}
          {authView === 'register' && (
            <div>
              <div style={{ marginBottom: '1.25rem' }}>
                <h3 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.3rem', fontWeight: 800 }}>
                  Create Account
                </h3>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>
                  Register as Teacher, Student, or Parent to access your dedicated dashboard
                </p>
              </div>

              {/* Role Selection Tabs */}
              <div style={{ display: 'flex', background: 'var(--bg-tertiary)', borderRadius: '10px', padding: '4px', marginBottom: '1.25rem', border: '1px solid var(--glass-border)' }}>
                <button
                  type="button"
                  onClick={() => setRegRole('teacher')}
                  style={{
                    flex: 1,
                    padding: '6px 0',
                    border: 'none',
                    borderRadius: '6px',
                    background: regRole === 'teacher' ? 'var(--accent-purple)' : 'transparent',
                    color: regRole === 'teacher' ? '#fff' : 'var(--text-secondary)',
                    fontWeight: 600,
                    fontSize: '0.8rem',
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
                  onClick={() => setRegRole('student')}
                  style={{
                    flex: 1,
                    padding: '6px 0',
                    border: 'none',
                    borderRadius: '6px',
                    background: regRole === 'student' ? 'var(--accent-blue)' : 'transparent',
                    color: regRole === 'student' ? '#fff' : 'var(--text-secondary)',
                    fontWeight: 600,
                    fontSize: '0.8rem',
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
                  onClick={() => setRegRole('parent')}
                  style={{
                    flex: 1,
                    padding: '6px 0',
                    border: 'none',
                    borderRadius: '6px',
                    background: regRole === 'parent' ? 'var(--accent-emerald)' : 'transparent',
                    color: regRole === 'parent' ? '#fff' : 'var(--text-secondary)',
                    fontWeight: 600,
                    fontSize: '0.8rem',
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

              {regError && (
                <div style={{
                  background: 'rgba(244, 63, 94, 0.15)',
                  border: '1px solid var(--accent-rose)',
                  color: '#fca5a5',
                  padding: '0.75rem',
                  borderRadius: '8px',
                  fontSize: '0.85rem',
                  marginBottom: '1rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem'
                }}>
                  <AlertCircle size={16} />
                  <span>{regError}</span>
                </div>
              )}

              <form onSubmit={handleRegisterSubmit}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                  <div className="form-group">
                    <label>Full Name</label>
                    <input 
                      type="text" 
                      className="form-control" 
                      placeholder={regRole === 'teacher' ? "Prof. Name" : regRole === 'parent' ? "Mr./Mrs. Parent" : "Student Name"}
                      value={regName} 
                      onChange={(e) => setRegName(e.target.value)}
                      required 
                    />
                  </div>

                  <div className="form-group">
                    <label>Email Address</label>
                    <input 
                      type="email" 
                      className="form-control" 
                      placeholder="name@educam.edu"
                      value={regEmail} 
                      onChange={(e) => setRegEmail(e.target.value)}
                      required 
                    />
                  </div>
                </div>

                {/* Role-Specific Fields */}
                {regRole === 'student' && (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                    <div className="form-group">
                      <label>Roll Number / Student ID</label>
                      <input 
                        type="text" 
                        className="form-control" 
                        placeholder="e.g. 105"
                        value={regRollNumber} 
                        onChange={(e) => setRegRollNumber(e.target.value)}
                        required 
                      />
                    </div>

                    <div className="form-group">
                      <label>Grade / Section</label>
                      <input 
                        type="text" 
                        className="form-control" 
                        placeholder="e.g. Class 10-A"
                        value={regGrade} 
                        onChange={(e) => setRegGrade(e.target.value)}
                        required 
                      />
                    </div>
                  </div>
                )}

                {regRole === 'parent' && (
                  <div className="form-group">
                    <label>Child's Roll Number or Name</label>
                    <input 
                      type="text" 
                      className="form-control" 
                      placeholder="e.g. 101 or Rahul Sharma"
                      value={regChildRoll} 
                      onChange={(e) => setRegChildRoll(e.target.value)}
                      required 
                    />
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                      Automatically links to your child's attendance & focus records
                    </span>
                  </div>
                )}

                {regRole === 'teacher' && (
                  <div className="form-group">
                    <label>Department / Subject</label>
                    <input 
                      type="text" 
                      className="form-control" 
                      placeholder="e.g. Mathematics & Computer Science"
                      value={regDepartment} 
                      onChange={(e) => setRegDepartment(e.target.value)}
                    />
                  </div>
                )}

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                  <div className="form-group">
                    <label>Password</label>
                    <input 
                      type="password" 
                      className="form-control" 
                      placeholder="Min 6 chars"
                      value={regPassword} 
                      onChange={(e) => setRegPassword(e.target.value)}
                      required 
                    />
                  </div>

                  <div className="form-group">
                    <label>Confirm Password</label>
                    <input 
                      type="password" 
                      className="form-control" 
                      placeholder="Repeat password"
                      value={regConfirmPassword} 
                      onChange={(e) => setRegConfirmPassword(e.target.value)}
                      required 
                    />
                  </div>
                </div>

                <button 
                  type="submit" 
                  className="btn btn-primary"
                  disabled={regLoading}
                  style={{ width: '100%', justifyContent: 'center', marginTop: '1.25rem', padding: '0.85rem' }}
                >
                  {regLoading ? (
                    'Registering Profile...'
                  ) : (
                    <>
                      <UserPlus size={18} /> Register as {regRole.charAt(0).toUpperCase() + regRole.slice(1)}
                    </>
                  )}
                </button>
              </form>

              <div style={{ marginTop: '1.25rem', textAlign: 'center', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                Already registered?{' '}
                <button
                  type="button"
                  onClick={() => setAuthView('signin')}
                  style={{ background: 'transparent', border: 'none', color: 'var(--accent-blue)', fontWeight: 700, cursor: 'pointer' }}
                >
                  Sign In here
                </button>
              </div>
            </div>
          )}

          {/* VIEW 3: BIOMETRIC FACE ID */}
          {authView === 'biometric' && (
            <div>
              <div className="biometric-scanner-viewport">
                <video ref={videoRef} className="biometric-video" playsInline muted></video>
                <div className="biometric-laser-line"></div>
                <div className="biometric-reticle">
                  <div className="reticle-corner tl"></div>
                  <div className="reticle-corner tr"></div>
                  <div className="reticle-corner bl"></div>
                  <div className="reticle-corner br"></div>
                </div>

                <div className="biometric-badge">
                  <Scan size={14} color="#60a5fa" />
                  <span>{scanStatus}</span>
                </div>

                {scanSuccessUser && (
                  <div className="biometric-verified-overlay">
                    <UserCheck size={56} color="#fff" />
                    <div style={{ textAlign: 'center' }}>
                      <h3 style={{ fontSize: '1.3rem', fontWeight: 800, color: '#fff' }}>Access Granted</h3>
                      <p style={{ fontSize: '0.9rem', color: '#e6fffa', marginTop: '0.2rem' }}>
                        Welcome, {scanSuccessUser.name} ({scanSuccessUser.role})
                      </p>
                    </div>
                  </div>
                )}
              </div>

              <div style={{
                marginTop: '1.25rem',
                background: 'rgba(255, 255, 255, 0.02)',
                border: '1px solid var(--glass-border)',
                borderRadius: '12px',
                padding: '1rem'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                  <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--accent-blue)', textTransform: 'uppercase' }}>
                    First Time? Enroll Your Face Now
                  </span>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Takes 2 seconds</span>
                </div>

                <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.75rem' }}>
                  Look directly into the camera and click to register your facial signature:
                </p>

                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button 
                    className="btn"
                    onClick={() => handleEnrollMyFace('student')}
                    style={{ flex: 1, padding: '0.5rem', fontSize: '0.8rem', justifyContent: 'center' }}
                  >
                    Enroll as Rahul (Student)
                  </button>

                  <button 
                    className="btn"
                    onClick={() => handleEnrollMyFace('teacher')}
                    style={{ flex: 1, padding: '0.5rem', fontSize: '0.8rem', justifyContent: 'center' }}
                  >
                    Enroll as Prof. Vikram (Teacher)
                  </button>
                </div>

                {enrollNotice && (
                  <div style={{
                    marginTop: '0.75rem',
                    padding: '0.5rem',
                    borderRadius: '8px',
                    fontSize: '0.8rem',
                    background: 'rgba(16, 185, 129, 0.15)',
                    border: '1px solid var(--accent-emerald)',
                    color: '#6ee7b7',
                    textAlign: 'center'
                  }}>
                    {enrollNotice}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Login;
