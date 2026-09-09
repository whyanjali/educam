import React, { useState, useEffect, useRef } from 'react';
import { Camera, Users, AlertTriangle, Hand, Play, Square, Signal, WifiOff, Check, X, UserPlus, Sparkles, RefreshCw } from 'lucide-react';

const Dashboard = ({ openAIModal }) => {
  const [cameraRunning, setCameraRunning] = useState(false);
  const [telemetry, setTelemetry] = useState({ students: [], camera_running: false });
  const [wsStatus, setWsStatus] = useState('disconnected');
  const [attendanceList, setAttendanceList] = useState([]);
  const [newStudentName, setNewStudentName] = useState('');
  const [newStudentRoll, setNewStudentRoll] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [actionMsg, setActionMsg] = useState('');
  const wsRef = useRef(null);

  const activeStudentsCount = telemetry.students.length;
  const averageAttention = activeStudentsCount > 0 
    ? Math.round(telemetry.students.reduce((acc, curr) => acc + curr.attention_score, 0) / activeStudentsCount)
    : 84;
  const handRaisedCount = telemetry.students.filter(s => s.hand_raised).length;
  const drowsyCount = telemetry.students.filter(s => s.is_drowsy).length;

  useEffect(() => {
    fetchCameraStatus();
    fetchAttendance();
    connectWebSocket();

    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, []);

  const fetchCameraStatus = () => {
    fetch('http://localhost:8000/api/camera/status')
      .then(res => res.json())
      .then(data => setCameraRunning(data.running))
      .catch(err => console.error('Error fetching camera status:', err));
  };

  const fetchAttendance = () => {
    fetch('http://localhost:8000/api/attendance')
      .then(res => res.json())
      .then(data => setAttendanceList(data))
      .catch(err => console.error('Error fetching attendance list:', err));
  };

  const connectWebSocket = () => {
    setWsStatus('connecting');
    const ws = new WebSocket('ws://localhost:8000/ws/live');
    wsRef.current = ws;

    ws.onopen = () => {
      setWsStatus('connected');
    };

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      setTelemetry(data);
      setCameraRunning(data.camera_running);
      // Auto refresh attendance if a student was newly recognized
      if (data.students && data.students.some(s => s.student_id)) {
        fetchAttendance();
      }
    };

    ws.onclose = () => {
      setWsStatus('disconnected');
      setTimeout(connectWebSocket, 3000);
    };

    ws.onerror = (err) => {
      console.error('WebSocket error:', err);
      ws.close();
    };
  };

  const toggleCamera = () => {
    const endpoint = cameraRunning ? 'stop' : 'start';
    fetch(`http://localhost:8000/api/camera/${endpoint}`)
      .then(res => res.json())
      .then(data => {
        if (data.status === 'success') {
          setCameraRunning(!cameraRunning);
        }
      })
      .catch(err => console.error('Error toggling camera:', err));
  };

  const toggleAttendanceStatus = async (studentId, currentStatus) => {
    const nextStatus = currentStatus === 'Present' ? 'Absent' : 'Present';
    try {
      const res = await fetch('http://localhost:8000/api/attendance/mark-manual', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ student_id: studentId, status: nextStatus })
      });
      if (res.ok) {
        fetchAttendance();
        showNotification(`Updated student status to ${nextStatus}`);
      }
    } catch (err) {
      console.error('Failed to toggle status:', err);
    }
  };

  const handleEnrollStudent = async (e) => {
    e.preventDefault();
    if (!newStudentName || !newStudentRoll) return;

    try {
      const res = await fetch('http://localhost:8000/api/students', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newStudentName, roll_number: newStudentRoll })
      });
      if (res.ok) {
        const student = await res.json();
        // Register face using live feed if camera is running
        if (cameraRunning) {
          await fetch(`http://localhost:8000/api/students/${student.id}/register-face`, { method: 'POST' });
        }
        setNewStudentName('');
        setNewStudentRoll('');
        setShowAddModal(false);
        fetchAttendance();
        showNotification(`Enrolled ${student.name} successfully!`);
      }
    } catch (err) {
      console.error('Error adding student:', err);
    }
  };

  const showNotification = (msg) => {
    setActionMsg(msg);
    setTimeout(() => setActionMsg(''), 3500);
  };

  return (
    <div>
      {/* Top Banner Notice */}
      {actionMsg && (
        <div style={{
          background: 'rgba(16, 185, 129, 0.2)',
          border: '1px solid var(--accent-emerald)',
          color: '#6ee7b7',
          padding: '0.75rem 1.5rem',
          borderRadius: '10px',
          marginBottom: '1.5rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          fontWeight: 600
        }}>
          <Check size={18} />
          <span>{actionMsg}</span>
        </div>
      )}

      {/* Metrics Row */}
      <div className="metrics-row">
        <div className="metric-card blue">
          <div className="metric-icon-wrapper">
            <Users size={24} />
          </div>
          <div className="metric-info">
            <h3>Class Attentiveness</h3>
            <div className="value">{averageAttention}%</div>
          </div>
        </div>

        <div className="metric-card purple">
          <div className="metric-icon-wrapper">
            <Camera size={24} />
          </div>
          <div className="metric-info">
            <h3>Active in Camera</h3>
            <div className="value">{activeStudentsCount} Student{activeStudentsCount !== 1 ? 's' : ''}</div>
          </div>
        </div>

        <div className="metric-card emerald">
          <div className="metric-icon-wrapper">
            <Hand size={24} />
          </div>
          <div className="metric-info">
            <h3>Participation</h3>
            <div className="value">{handRaisedCount} Hand Raised</div>
          </div>
        </div>

        <div className={`metric-card ${drowsyCount > 0 ? 'rose' : 'amber'}`}>
          <div className="metric-icon-wrapper">
            <AlertTriangle size={24} />
          </div>
          <div className="metric-info">
            <h3>Drowsy Alerts</h3>
            <div className="value">{drowsyCount} Alert{drowsyCount !== 1 ? 's' : ''}</div>
          </div>
        </div>
      </div>

      {/* Camera and Live Telemetry Cockpit */}
      <div className="dashboard-grid">
        {/* Left Column: Live Camera Video Stream */}
        <div className="glass-panel camera-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <div>
              <h2 style={{ fontFamily: 'var(--font-heading)' }}>AI Classroom Vision Feed</h2>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Automated Face Attendance & Real-Time Engagement HUD</p>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '0.85rem' }}>
              {wsStatus === 'connected' ? (
                <span style={{ color: 'var(--accent-emerald)', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                  <Signal size={16} /> Live AI Telemetry
                </span>
              ) : (
                <span style={{ color: 'var(--accent-rose)', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                  <WifiOff size={16} /> Reconnecting...
                </span>
              )}
            </div>
          </div>

          <div className="camera-container">
            {cameraRunning ? (
              <img 
                src="http://localhost:8000/api/camera/feed" 
                alt="Classroom Camera Feed" 
                className="camera-feed-img" 
                onError={(e) => {
                  setTimeout(() => {
                    e.target.src = "http://localhost:8000/api/camera/feed?t=" + new Date().getTime();
                  }, 2000);
                }}
              />
            ) : (
              <div className="camera-placeholder">
                <Camera size={64} />
                <div>
                  <p style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '1.1rem' }}>Webcam Standby</p>
                  <p style={{ fontSize: '0.85rem', marginTop: '0.25rem' }}>Click below to start live face recognition & student focus tracking.</p>
                </div>
              </div>
            )}
            
            <div className="camera-status-overlay">
              <div className={`status-dot ${cameraRunning ? 'active' : ''}`}></div>
              <span>{cameraRunning ? 'LIVE VISION ACTIVE' : 'CAMERA OFF'}</span>
            </div>
          </div>

          <div className="btn-group" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button 
                className={`btn ${cameraRunning ? 'btn-danger' : 'btn-primary'}`}
                onClick={toggleCamera}
              >
                {cameraRunning ? (
                  <>
                    <Square size={18} /> Stop Session
                  </>
                ) : (
                  <>
                    <Play size={18} /> Start Camera Session
                  </>
                )}
              </button>

              <button 
                className="btn"
                onClick={() => setShowAddModal(true)}
              >
                <UserPlus size={18} /> Enroll Student
              </button>
            </div>

            <button 
              className="btn"
              onClick={openAIModal}
              style={{ background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.2) 0%, rgba(59, 130, 246, 0.2) 100%)', borderColor: 'var(--accent-purple)' }}
            >
              <Sparkles size={16} color="#c084fc" />
              <span>AI Pedagogy Insights</span>
            </button>
          </div>
        </div>

        {/* Right Column: Real-time Telemetry Log */}
        <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
            <h2 style={{ fontFamily: 'var(--font-heading)' }}>Live Classroom Telemetry</h2>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Updated 4x/sec</span>
          </div>
          
          <div className="telemetry-sidebar">
            {activeStudentsCount === 0 ? (
              <div style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '3rem 1rem' }}>
                <Users size={36} style={{ marginBottom: '1rem', opacity: 0.5 }} />
                <p style={{ fontWeight: 500 }}>No students currently in view</p>
                <p style={{ fontSize: '0.8rem', marginTop: '0.25rem' }}>When students sit in front of the lens, face detection and focus tracking will stream here automatically.</p>
              </div>
            ) : (
              <div className="student-status-list">
                {telemetry.students.map((student, i) => (
                  <div key={i} className="student-status-item" style={{
                    borderColor: student.is_drowsy ? 'var(--accent-rose-glow)' : 'var(--glass-border)',
                    boxShadow: student.is_drowsy ? '0 0 10px rgba(244, 63, 94, 0.15)' : 'none'
                  }}>
                    <div className="student-meta">
                      <span className="student-name" style={{
                        color: student.name === 'Unknown' ? 'var(--text-muted)' : 'var(--text-primary)'
                      }}>
                        {student.name}
                      </span>
                      <span className="student-gaze">Gaze: {student.gaze_direction}</span>
                    </div>

                    <div className="student-badge-group">
                      {student.is_drowsy ? (
                        <span className="badge badge-drowsy">FATIGUE ALERT</span>
                      ) : (
                        <span className="badge badge-attention">
                          Focus: {student.attention_score}%
                        </span>
                      )}

                      {student.hand_raised && (
                        <span className="badge badge-hand" style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                          <Hand size={10} /> Hand Raised
                        </span>
                      )}
                      
                      <span style={{ fontSize: '0.75rem', background: 'var(--bg-tertiary)', padding: '0.25rem 0.5rem', borderRadius: '4px', color: 'var(--text-secondary)' }}>
                        {student.emotion}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Attendance Management Sheet */}
      <div className="glass-panel" style={{ marginTop: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <div>
            <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.3rem' }}>Today's Automated Attendance Sheet</h2>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Automatically marked upon camera face detection, with manual override option</p>
          </div>
          <button className="btn" onClick={fetchAttendance} style={{ padding: '0.5rem 0.8rem', fontSize: '0.85rem' }}>
            <RefreshCw size={14} /> Refresh
          </button>
        </div>

        <div className="table-container">
          <table className="custom-table">
            <thead>
              <tr>
                <th>Roll No</th>
                <th>Student Name</th>
                <th>Status</th>
                <th>Check-in Time</th>
                <th>Camera Face Match</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {attendanceList.map((st) => (
                <tr key={st.id}>
                  <td style={{ fontWeight: 700 }}>#{st.roll_number}</td>
                  <td style={{ fontWeight: 600 }}>{st.name}</td>
                  <td>
                    <span className={`badge ${st.status === 'Present' ? 'badge-present' : 'badge-absent'}`}>
                      {st.status}
                    </span>
                  </td>
                  <td style={{ color: 'var(--text-secondary)' }}>{st.timestamp}</td>
                  <td>
                    <span style={{ color: 'var(--accent-emerald)', fontSize: '0.85rem' }}>
                      ✓ Verified Biometric
                    </span>
                  </td>
                  <td>
                    <button 
                      onClick={() => toggleAttendanceStatus(st.id, st.status)}
                      style={{
                        background: 'transparent',
                        border: '1px solid var(--glass-border)',
                        color: 'var(--text-secondary)',
                        padding: '4px 10px',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        fontSize: '0.8rem'
                      }}
                    >
                      Toggle {st.status === 'Present' ? 'Absent' : 'Present'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Enroll Student Modal */}
      {showAddModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          background: 'rgba(3, 7, 18, 0.8)',
          backdropFilter: 'blur(8px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '1rem'
        }}>
          <div className="glass-panel" style={{ maxWidth: '450px', width: '100%', padding: '2rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h3 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.3rem' }}>Enroll New Student</h3>
              <button 
                onClick={() => setShowAddModal(false)}
                style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleEnrollStudent}>
              <div className="form-group">
                <label>Student Full Name</label>
                <input 
                  type="text" 
                  className="form-control" 
                  placeholder="e.g. Ananya Sen" 
                  value={newStudentName}
                  onChange={(e) => setNewStudentName(e.target.value)}
                  required 
                />
              </div>

              <div className="form-group">
                <label>Roll Number / ID</label>
                <input 
                  type="text" 
                  className="form-control" 
                  placeholder="e.g. 105" 
                  value={newStudentRoll}
                  onChange={(e) => setNewStudentRoll(e.target.value)}
                  required 
                />
              </div>

              <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
                Note: If camera session is active, the student's face will be captured and trained automatically.
              </p>

              <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
                <button 
                  type="button" 
                  className="btn" 
                  onClick={() => setShowAddModal(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Save & Register
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
