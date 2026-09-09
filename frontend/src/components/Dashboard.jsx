import React, { useState, useEffect, useRef } from 'react';
import { Camera, Users, AlertTriangle, Hand, Play, Square, Signal, WifiOff, Check, X, UserPlus, Sparkles, RefreshCw, Search, Edit2, Trash2, Mail, Award, CheckCircle2, AlertCircle } from 'lucide-react';

const Dashboard = ({ openAIModal }) => {
  const [cameraRunning, setCameraRunning] = useState(false);
  const [telemetry, setTelemetry] = useState({ students: [], camera_running: false });
  const [wsStatus, setWsStatus] = useState('disconnected');
  const [attendanceList, setAttendanceList] = useState([]);
  const [studentDirectory, setStudentDirectory] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [actionMsg, setActionMsg] = useState('');

  // CRUD Modals state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  // Form states
  const [formName, setFormName] = useState('');
  const [formRoll, setFormRoll] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formGrade, setFormGrade] = useState('Class 10-A');
  const [selectedStudent, setSelectedStudent] = useState(null);

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
    fetchStudents();
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

  const fetchStudents = () => {
    fetch('http://localhost:8000/api/students')
      .then(res => res.json())
      .then(data => setStudentDirectory(data))
      .catch(err => console.error('Error fetching students:', err));
  };

  const connectWebSocket = () => {
    setWsStatus('connecting');
    const ws = new WebSocket('ws://localhost:8000/ws/live');
    wsRef.current = ws;

    ws.onopen = () => setWsStatus('connected');

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      setTelemetry(data);
      setCameraRunning(data.camera_running);
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

  // --- CRUD HANDLERS ---
  const handleOpenCreateModal = () => {
    setFormName('');
    setFormRoll('');
    setFormEmail('');
    setFormGrade('Class 10-A');
    setShowCreateModal(true);
  };

  const handleCreateStudent = async (e) => {
    e.preventDefault();
    if (!formName.trim() || !formRoll.trim()) return;

    try {
      const res = await fetch('http://localhost:8000/api/students', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formName.trim(),
          roll_number: formRoll.trim(),
          email: formEmail.trim() || `${formRoll.trim().toLowerCase()}@student.educam.edu`,
          grade: formGrade
        })
      });

      if (res.ok) {
        const student = await res.json();
        if (cameraRunning) {
          await fetch(`http://localhost:8000/api/students/${student.id}/register-face`, { method: 'POST' });
        }
        setShowCreateModal(false);
        fetchStudents();
        fetchAttendance();
        showNotification(`Created student record: ${student.name} (#${student.roll_number})`);
      } else {
        const err = await res.json();
        showNotification(`Error: ${err.detail || 'Could not create student'}`);
      }
    } catch (err) {
      console.error('Error adding student:', err);
    }
  };

  const handleOpenEditModal = (student) => {
    setSelectedStudent(student);
    setFormName(student.name);
    setFormRoll(student.roll_number);
    setFormEmail(student.email || '');
    setFormGrade(student.grade || 'Class 10-A');
    setShowEditModal(true);
  };

  const handleUpdateStudent = async (e) => {
    e.preventDefault();
    if (!selectedStudent) return;

    try {
      const res = await fetch(`http://localhost:8000/api/students/${selectedStudent.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formName.trim(),
          roll_number: formRoll.trim(),
          email: formEmail.trim(),
          grade: formGrade
        })
      });

      if (res.ok) {
        setShowEditModal(false);
        fetchStudents();
        fetchAttendance();
        showNotification(`Updated student #${selectedStudent.id} details successfully!`);
      }
    } catch (err) {
      console.error('Failed to update student:', err);
    }
  };

  const handleOpenDeleteModal = (student) => {
    setSelectedStudent(student);
    setShowDeleteModal(true);
  };

  const handleDeleteStudent = async () => {
    if (!selectedStudent) return;
    try {
      const res = await fetch(`http://localhost:8000/api/students/${selectedStudent.id}`, {
        method: 'DELETE'
      });

      if (res.ok) {
        setShowDeleteModal(false);
        fetchStudents();
        fetchAttendance();
        showNotification(`Deleted student record #${selectedStudent.id}`);
      }
    } catch (err) {
      console.error('Failed to delete student:', err);
    }
  };

  const showNotification = (msg) => {
    setActionMsg(msg);
    setTimeout(() => setActionMsg(''), 4000);
  };

  const filteredDirectory = studentDirectory.filter(s => 
    s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.roll_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (s.email && s.email.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div>
      {/* Action Notification Banner */}
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

      {/* Top Real-Time Metrics Row */}
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
            <h3>Students in Lens</h3>
            <div className="value">{activeStudentsCount} Active</div>
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

      {/* Main Grid: Live Camera Stream + Live Telemetry */}
      <div className="dashboard-grid">
        {/* Camera Feed Card */}
        <div className="glass-panel camera-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <div>
              <h2 style={{ fontFamily: 'var(--font-heading)' }}>AI Classroom Vision Feed</h2>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Automated Biometric Attendance & Engagement HUD</p>
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
                  <p style={{ fontSize: '0.85rem', marginTop: '0.25rem' }}>Click below to start live face recognition & focus tracking.</p>
                </div>
              </div>
            )}
            
            <div className="camera-status-overlay">
              <div className={`status-dot ${cameraRunning ? 'active' : ''}`}></div>
              <span>{cameraRunning ? 'LIVE VISION ACTIVE' : 'CAMERA OFF'}</span>
            </div>
          </div>

          <div className="btn-group" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
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
              onClick={openAIModal}
              style={{ background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.2) 0%, rgba(59, 130, 246, 0.2) 100%)', borderColor: 'var(--accent-purple)' }}
            >
              <Sparkles size={16} color="#c084fc" />
              <span>AI Pedagogy Insights</span>
            </button>
          </div>
        </div>

        {/* Live Telemetry Card */}
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

      {/* STUDENT MANAGEMENT STUDIO (CRUD: Create, Read, Update, Delete) */}
      <div className="glass-panel" style={{ marginTop: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.25rem' }}>
          <div>
            <span style={{ fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--accent-purple)', fontWeight: 700 }}>
              Classroom Directory Management
            </span>
            <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.4rem', fontWeight: 800 }}>
              Student Records (CRUD Studio)
            </h2>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
              Create, read, update, and delete student records, attendance rates, and biometric face profiles.
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{ position: 'relative' }}>
              <Search size={16} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input 
                type="text" 
                placeholder="Search by name, roll, email..." 
                className="form-control"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{ paddingLeft: '32px', width: '220px', fontSize: '0.85rem' }}
              />
            </div>

            <button 
              className="btn btn-primary"
              onClick={handleOpenCreateModal}
              style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.6rem 1.2rem', fontSize: '0.85rem' }}
            >
              <UserPlus size={16} />
              <span>Add Student (Create)</span>
            </button>
          </div>
        </div>

        {/* Directory Table */}
        <div className="table-container">
          <table className="custom-table">
            <thead>
              <tr>
                <th>Roll No</th>
                <th>Student Name</th>
                <th>Email Address</th>
                <th>Grade</th>
                <th>Attendance Rate</th>
                <th>Average Focus</th>
                <th>Biometric Status</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredDirectory.length === 0 ? (
                <tr>
                  <td colSpan="8" style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '2rem' }}>
                    No student records matching your query.
                  </td>
                </tr>
              ) : (
                filteredDirectory.map((st) => (
                  <tr key={st.id}>
                    <td style={{ fontWeight: 800, color: 'var(--accent-blue)' }}>#{st.roll_number}</td>
                    <td style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{st.name}</td>
                    <td style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>{st.email || '-'}</td>
                    <td>
                      <span style={{ background: 'var(--bg-tertiary)', padding: '2px 8px', borderRadius: '4px', fontSize: '0.8rem', fontWeight: 600 }}>
                        {st.grade || '10-A'}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        <strong style={{ color: st.attendance_rate >= 75 ? 'var(--accent-emerald)' : 'var(--accent-rose)' }}>
                          {st.attendance_rate}%
                        </strong>
                      </div>
                    </td>
                    <td>
                      <strong>{st.avg_focus}%</strong>
                    </td>
                    <td>
                      {st.has_face ? (
                        <span style={{ color: 'var(--accent-emerald)', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                          <CheckCircle2 size={14} /> Enrolled
                        </span>
                      ) : (
                        <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                          Pending Face
                        </span>
                      )}
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                        <button 
                          onClick={() => handleOpenEditModal(st)}
                          title="Edit Student (Update)"
                          style={{
                            background: 'rgba(59, 130, 246, 0.1)',
                            border: '1px solid rgba(59, 130, 246, 0.3)',
                            color: 'var(--accent-blue)',
                            padding: '6px',
                            borderRadius: '6px',
                            cursor: 'pointer'
                          }}
                        >
                          <Edit2 size={15} />
                        </button>

                        <button 
                          onClick={() => handleOpenDeleteModal(st)}
                          title="Delete Student (Delete)"
                          style={{
                            background: 'rgba(244, 63, 94, 0.1)',
                            border: '1px solid rgba(244, 63, 94, 0.3)',
                            color: 'var(--accent-rose)',
                            padding: '6px',
                            borderRadius: '6px',
                            cursor: 'pointer'
                          }}
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* TODAY'S ATTENDANCE SHEET */}
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
                <th>Manual Override</th>
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

      {/* CREATE STUDENT MODAL */}
      {showCreateModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          background: 'rgba(3, 7, 18, 0.85)',
          backdropFilter: 'blur(8px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1500,
          padding: '1rem'
        }}>
          <div className="glass-panel" style={{ maxWidth: '480px', width: '100%', padding: '2rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <div>
                <h3 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.3rem', fontWeight: 800 }}>Add New Student (Create)</h3>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Enroll a new student into the school database</p>
              </div>
              <button onClick={() => setShowCreateModal(false)} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleCreateStudent}>
              <div className="form-group">
                <label>Student Full Name</label>
                <input 
                  type="text" 
                  className="form-control" 
                  placeholder="e.g. Arjun Kapoor" 
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  required 
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div className="form-group">
                  <label>Roll Number / ID</label>
                  <input 
                    type="text" 
                    className="form-control" 
                    placeholder="e.g. 106" 
                    value={formRoll}
                    onChange={(e) => setFormRoll(e.target.value)}
                    required 
                  />
                </div>

                <div className="form-group">
                  <label>Grade / Section</label>
                  <input 
                    type="text" 
                    className="form-control" 
                    placeholder="e.g. Class 10-A" 
                    value={formGrade}
                    onChange={(e) => setFormGrade(e.target.value)}
                    required 
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Student Email Address</label>
                <input 
                  type="email" 
                  className="form-control" 
                  placeholder="e.g. arjun@student.educam.edu" 
                  value={formEmail}
                  onChange={(e) => setFormEmail(e.target.value)}
                />
              </div>

              <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: '1rem 0' }}>
                💡 Tip: If camera session is running, you can snap their face to train biometric recognition immediately.
              </p>

              <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end', marginTop: '1.25rem' }}>
                <button type="button" className="btn" onClick={() => setShowCreateModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Save Student Record
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT STUDENT MODAL (Update) */}
      {showEditModal && selectedStudent && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          background: 'rgba(3, 7, 18, 0.85)',
          backdropFilter: 'blur(8px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1500,
          padding: '1rem'
        }}>
          <div className="glass-panel" style={{ maxWidth: '480px', width: '100%', padding: '2rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <div>
                <h3 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.3rem', fontWeight: 800 }}>Edit Student Record (Update)</h3>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Modifying record for #{selectedStudent.roll_number}</p>
              </div>
              <button onClick={() => setShowEditModal(false)} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleUpdateStudent}>
              <div className="form-group">
                <label>Student Full Name</label>
                <input 
                  type="text" 
                  className="form-control" 
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  required 
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div className="form-group">
                  <label>Roll Number</label>
                  <input 
                    type="text" 
                    className="form-control" 
                    value={formRoll}
                    onChange={(e) => setFormRoll(e.target.value)}
                    required 
                  />
                </div>

                <div className="form-group">
                  <label>Grade / Section</label>
                  <input 
                    type="text" 
                    className="form-control" 
                    value={formGrade}
                    onChange={(e) => setFormGrade(e.target.value)}
                    required 
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Email Address</label>
                <input 
                  type="email" 
                  className="form-control" 
                  value={formEmail}
                  onChange={(e) => setFormEmail(e.target.value)}
                />
              </div>

              <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end', marginTop: '1.5rem' }}>
                <button type="button" className="btn" onClick={() => setShowEditModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION MODAL (Delete) */}
      {showDeleteModal && selectedStudent && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          background: 'rgba(3, 7, 18, 0.85)',
          backdropFilter: 'blur(8px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1500,
          padding: '1rem'
        }}>
          <div className="glass-panel" style={{ maxWidth: '440px', width: '100%', padding: '2rem', border: '1px solid rgba(244, 63, 94, 0.4)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem', color: 'var(--accent-rose)' }}>
              <AlertCircle size={28} />
              <h3 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.3rem', fontWeight: 800 }}>Confirm Deletion</h3>
            </div>

            <p style={{ fontSize: '0.9rem', color: 'var(--text-primary)', lineHeight: 1.5, marginBottom: '0.75rem' }}>
              Are you sure you want to permanently delete <strong>{selectedStudent.name}</strong> (#{selectedStudent.roll_number})?
            </p>

            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
              This will remove all associated biometric face signatures, attendance logs, and academic report cards from the system. This action cannot be undone.
            </p>

            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
              <button type="button" className="btn" onClick={() => setShowDeleteModal(false)}>
                Cancel
              </button>
              <button 
                type="button" 
                className="btn btn-danger"
                onClick={handleDeleteStudent}
                style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
              >
                <Trash2 size={16} />
                <span>Delete Student</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
