import React, { useState, useEffect, useRef } from 'react';
import { Camera, Shield, GraduationCap, Users, LogIn, ArrowRight, Sparkles, CheckCircle, Scan, Eye, EyeOff, UserCheck, RefreshCw, AlertCircle } from 'lucide-react';

const Login = ({ onLoginSuccess }) => {
  // Modes: 'biometric' (Real-Time Face ID) or 'credentials' (Password / 1-Click Demo)
  const [authMode, setAuthMode] = useState('biometric');
  const [selectedRole, setSelectedRole] = useState('student');
  const [username, setUsername] = useState('student');
  const [password, setPassword] = useState('student123');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Biometric scanning state
  const [cameraActive, setCameraActive] = useState(false);
  const [scanStatus, setScanStatus] = useState('Align your face within the reticle to scan');
  const [scanSuccessUser, setScanSuccessUser] = useState(null);
  const [enrollingRole, setEnrollingRole] = useState('student');
  const [enrollNotice, setEnrollNotice] = useState('');

  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const scanIntervalRef = useRef(null);
  const streamRef = useRef(null);

  const demoAccounts = {
    teacher: { username: 'teacher', password: 'teacher123', name: 'Prof. Vikram Sharma', desc: 'Classroom Vision Cockpit, attendance sheets & roster' },
    student: { username: 'student', password: 'student123', name: 'Rahul Sharma (Roll: 101)', desc: 'Personal attendance streak, focus graph & AI study tutor' },
    parent: { username: 'parent', password: 'parent123', name: 'Mr. Rajesh Sharma', desc: 'Child arrival verification, fatigue alerts & teacher chat' }
  };

  // Start webcam when entering biometric mode
  useEffect(() => {
    if (authMode === 'biometric') {
      startWebcam();
    } else {
      stopWebcam();
    }

    return () => {
      stopWebcam();
    };
  }, [authMode]);

  const startWebcam = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: 'user' }
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
        setCameraActive(true);
        startAutoScanning();
      }
    } catch (err) {
      console.warn('Camera access denied or unavailable:', err);
      setScanStatus('Camera unavailable. You can switch to Credentials login.');
    }
  };

  const stopWebcam = () => {
    if (scanIntervalRef.current) {
      clearInterval(scanIntervalRef.current);
      scanIntervalRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setCameraActive(false);
  };

  // Auto scan frame every 1.5 seconds
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
    if (scanSuccessUser) return; // already authenticated
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
    } catch (err) {
      // Background retry silently
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
    } catch (err) {
      setEnrollNotice('Failed to enroll face.');
    }
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
      <canvas ref={canvasRef} style={{ display: 'none' }} />

      <div style={{
        maxWidth: '1100px',
        width: '100%',
        display: 'grid',
        gridTemplateColumns: '1.1fr 1fr',
        gap: '2.5rem',
        alignItems: 'center'
      }}>
        {/* Left Side: Product Showcase & Info */}
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

          <h2 style={{ fontSize: '1.7rem', fontWeight: 700, lineHeight: 1.3, marginBottom: '1rem' }}>
            Real-Time Face ID Biometric Authentication & Classroom Vision
          </h2>

          <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', lineHeight: 1.6, marginBottom: '2rem' }}>
            Experience touchless sign-in powered by real-time computer vision biometrics. Step in front of the lens for instant identification, automatic attendance logging, and engagement telemetry.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <CheckCircle size={20} color="var(--accent-emerald)" />
              <span style={{ fontSize: '0.95rem', color: 'var(--text-primary)' }}>Real-Time Face ID: Camera scan verifies your profile in milliseconds</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <CheckCircle size={20} color="var(--accent-blue)" />
              <span style={{ fontSize: '0.95rem', color: 'var(--text-primary)' }}>Automated Classroom Attendance + Real-Time Fatigue Tracking</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <CheckCircle size={20} color="var(--accent-purple)" />
              <span style={{ fontSize: '0.95rem', color: 'var(--text-primary)' }}>Dedicated Portals for Teacher, Student & Parent</span>
            </div>
          </div>

          {/* Quick Demo 1-Click Cards */}
          <div style={{ marginTop: '2.5rem' }}>
            <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <Sparkles size={14} color="#f59e0b" />
              <span>Instant 1-Click Demo Profiles</span>
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

        {/* Right Side: Authentication Panel */}
        <div className="glass-panel" style={{ padding: '2rem', borderRadius: '20px' }}>
          {/* Auth Mode Toggle */}
          <div style={{ display: 'flex', background: 'var(--bg-tertiary)', borderRadius: '12px', padding: '4px', marginBottom: '1.5rem', border: '1px solid var(--glass-border)' }}>
            <button
              type="button"
              onClick={() => setAuthMode('biometric')}
              style={{
                flex: 1,
                padding: '10px 0',
                border: 'none',
                borderRadius: '8px',
                background: authMode === 'biometric' ? 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)' : 'transparent',
                color: authMode === 'biometric' ? '#fff' : 'var(--text-secondary)',
                fontWeight: 700,
                fontSize: '0.85rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.4rem',
                transition: 'all 0.2s'
              }}
            >
              <Scan size={16} /> Real-Time Face ID
            </button>

            <button
              type="button"
              onClick={() => setAuthMode('credentials')}
              style={{
                flex: 1,
                padding: '10px 0',
                border: 'none',
                borderRadius: '8px',
                background: authMode === 'credentials' ? 'var(--bg-primary)' : 'transparent',
                color: authMode === 'credentials' ? '#fff' : 'var(--text-secondary)',
                fontWeight: 700,
                fontSize: '0.85rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.4rem',
                transition: 'all 0.2s'
              }}
            >
              <LogIn size={16} /> Credentials
            </button>
          </div>

          {/* MODE 1: Real-Time Face ID Biometric Camera Viewport */}
          {authMode === 'biometric' && (
            <div>
              <div className="biometric-scanner-viewport">
                <video ref={videoRef} className="biometric-video" playsInline muted></video>

                {/* Laser scan line animation */}
                <div className="biometric-laser-line"></div>

                {/* Reticle bounding box with corner markers */}
                <div className="biometric-reticle">
                  <div className="reticle-corner tl"></div>
                  <div className="reticle-corner tr"></div>
                  <div className="reticle-corner bl"></div>
                  <div className="reticle-corner br"></div>
                </div>

                {/* Real-time Status Badge */}
                <div className="biometric-badge">
                  <Scan size={14} color="#60a5fa" />
                  <span>{scanStatus}</span>
                </div>

                {/* Verified Animation Overlay */}
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

              {/* Instant Biometric Enrollment Widget */}
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

          {/* MODE 2: Standard Credentials Login */}
          {authMode === 'credentials' && (
            <div>
              {/* Role selector tabs */}
              <div style={{ display: 'flex', background: 'var(--bg-tertiary)', borderRadius: '10px', padding: '4px', marginBottom: '1.25rem', border: '1px solid var(--glass-border)' }}>
                <button
                  type="button"
                  onClick={() => handleRoleTabClick('teacher')}
                  style={{
                    flex: 1,
                    padding: '6px 0',
                    border: 'none',
                    borderRadius: '6px',
                    background: selectedRole === 'teacher' ? 'var(--accent-purple)' : 'transparent',
                    color: selectedRole === 'teacher' ? '#fff' : 'var(--text-secondary)',
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
                  onClick={() => handleRoleTabClick('student')}
                  style={{
                    flex: 1,
                    padding: '6px 0',
                    border: 'none',
                    borderRadius: '6px',
                    background: selectedRole === 'student' ? 'var(--accent-blue)' : 'transparent',
                    color: selectedRole === 'student' ? '#fff' : 'var(--text-secondary)',
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
                  onClick={() => handleRoleTabClick('parent')}
                  style={{
                    flex: 1,
                    padding: '6px 0',
                    border: 'none',
                    borderRadius: '6px',
                    background: selectedRole === 'parent' ? 'var(--accent-emerald)' : 'transparent',
                    color: selectedRole === 'parent' ? '#fff' : 'var(--text-secondary)',
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
                  <div style={{ position: 'relative' }}>
                    <input 
                      type={showPassword ? 'text' : 'password'} 
                      className="form-control" 
                      value={password} 
                      onChange={(e) => setPassword(e.target.value)}
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
                  disabled={loading}
                  style={{ width: '100%', justifyContent: 'center', marginTop: '1.25rem', padding: '0.85rem' }}
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
          )}
        </div>
      </div>
    </div>
  );
};

export default Login;
