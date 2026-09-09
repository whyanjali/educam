import React, { useState, useEffect } from 'react';
import { CheckCircle2, Clock, Brain, Hand, BookOpen, AlertCircle, Sparkles, TrendingUp, Award, Calendar } from 'lucide-react';

const StudentDashboard = ({ currentUser, openAIModal }) => {
  const studentId = currentUser?.student_id || 1;
  const [attendanceData, setAttendanceData] = useState(null);
  const [activenessData, setActivenessData] = useState(null);
  const [academicData, setAcademicData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStudentData();
  }, [studentId]);

  const fetchStudentData = async () => {
    setLoading(true);
    try {
      const [attRes, actRes, acadRes] = await Promise.all([
        fetch(`http://localhost:8000/api/student/${studentId}/attendance-summary`),
        fetch(`http://localhost:8000/api/student/${studentId}/activeness-summary`),
        fetch(`http://localhost:8000/api/academic/${studentId}`)
      ]);

      if (attRes.ok) setAttendanceData(await attRes.json());
      if (actRes.ok) setActivenessData(await actRes.json());
      if (acadRes.ok) setAcademicData(await acadRes.json());
    } catch (err) {
      console.error('Error loading student dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      {/* Student Welcome Header */}
      <div className="glass-panel" style={{
        marginBottom: '1.5rem',
        background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.15) 0%, rgba(139, 92, 246, 0.1) 100%)',
        border: '1px solid rgba(59, 130, 246, 0.3)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '1.5rem 2rem'
      }}>
        <div>
          <span style={{ fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--accent-blue)', fontWeight: 700 }}>
            Student Learning Cockpit
          </span>
          <h1 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.8rem', fontWeight: 800, marginTop: '0.25rem' }}>
            Welcome back, {currentUser?.student_name || currentUser?.name || 'Rahul Sharma'}!
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '0.25rem' }}>
            Roll No: #{currentUser?.roll_number || '101'} • Grade 10-A • Verified Camera Biometric Profile
          </p>
        </div>

        <button 
          className="btn btn-primary"
          onClick={openAIModal}
          style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.75rem 1.25rem' }}
        >
          <Sparkles size={18} />
          <span>Ask AI Study Tutor</span>
        </button>
      </div>

      {/* Top Metrics Cards */}
      <div className="metrics-row">
        {/* Attendance Percentage */}
        <div className="metric-card emerald">
          <div className="metric-icon-wrapper">
            <Calendar size={24} />
          </div>
          <div className="metric-info">
            <h3>Attendance Rate</h3>
            <div className="value">{attendanceData?.percentage || 94.2}%</div>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
              {attendanceData?.attended_days || 4} of {attendanceData?.total_days || 5} days present
            </span>
          </div>
        </div>

        {/* Focus Score */}
        <div className="metric-card blue">
          <div className="metric-icon-wrapper">
            <Brain size={24} />
          </div>
          <div className="metric-info">
            <h3>Average Focus Index</h3>
            <div className="value">{activenessData?.average_focus || 86}%</div>
            <span style={{ fontSize: '0.75rem', color: 'var(--accent-emerald)' }}>
              ✓ High Classroom Engagement
            </span>
          </div>
        </div>

        {/* Academic GPA */}
        <div className="metric-card purple">
          <div className="metric-icon-wrapper">
            <Award size={24} />
          </div>
          <div className="metric-info">
            <h3>Academic Average</h3>
            <div className="value">{academicData?.overall_percentage || 89.8}%</div>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
              Grade A (Midterm Exams)
            </span>
          </div>
        </div>

        {/* Participation Hand Raises */}
        <div className="metric-card amber">
          <div className="metric-icon-wrapper">
            <Hand size={24} />
          </div>
          <div className="metric-info">
            <h3>Questions Asked</h3>
            <div className="value">{activenessData?.hand_raises || 3} Questions</div>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
              Hand raises recognized
            </span>
          </div>
        </div>
      </div>

      {/* Main Grid: Activeness Curve + Attendance Record */}
      <div className="dashboard-grid">
        {/* Left Column: Visual Activeness Timeline */}
        <div className="glass-panel">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
            <div>
              <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.3rem' }}>Classroom Focus & Activeness Timeline</h2>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Recorded by EduCam during today's lectures</p>
            </div>
            <span style={{ fontSize: '0.8rem', background: 'rgba(59, 130, 246, 0.1)', color: 'var(--accent-blue)', padding: '4px 8px', borderRadius: '6px' }}>
              Real-time Vision Analytics
            </span>
          </div>

          {/* Focus Curve Visualization */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {activenessData?.timeline && activenessData.timeline.length > 0 ? (
              activenessData.timeline.map((item, idx) => {
                const timeLabel = item.timestamp.split('T')[1]?.substring(0, 5) || '10:00';
                return (
                  <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '0.5rem 0' }}>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', width: '50px' }}>{timeLabel}</span>
                    
                    <div style={{ flex: 1, height: '10px', background: 'var(--bg-tertiary)', borderRadius: '5px', overflow: 'hidden' }}>
                      <div style={{
                        width: `${item.attention_score}%`,
                        height: '100%',
                        background: item.is_drowsy 
                          ? 'var(--accent-rose)' 
                          : item.attention_score > 80 
                            ? 'linear-gradient(90deg, #3b82f6, #10b981)' 
                            : 'var(--accent-amber)',
                        borderRadius: '5px'
                      }}></div>
                    </div>

                    <div style={{ width: '90px', textAlign: 'right', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '0.35rem' }}>
                      <span style={{ fontWeight: 700, fontSize: '0.85rem' }}>{item.attention_score}%</span>
                      {item.is_drowsy && (
                        <span style={{ fontSize: '0.65rem', background: 'rgba(244, 63, 94, 0.2)', color: 'var(--accent-rose)', padding: '2px 4px', borderRadius: '4px' }}>
                          Drowsy
                        </span>
                      )}
                      {item.hand_raised === 1 && (
                        <span title="Hand Raised">✋</span>
                      )}
                    </div>
                  </div>
                );
              })
            ) : (
              <p style={{ color: 'var(--text-muted)', padding: '2rem 0', textAlign: 'center' }}>No live focus telemetry logged yet today.</p>
            )}
          </div>

          <div style={{ marginTop: '1.5rem', background: 'rgba(255, 255, 255, 0.02)', padding: '1rem', borderRadius: '10px', display: 'flex', alignItems: 'center', gap: '0.75rem', border: '1px solid var(--glass-border)' }}>
            <Sparkles size={20} color="var(--accent-purple)" />
            <div style={{ fontSize: '0.85rem' }}>
              <strong>AI Focus Tip:</strong> Your attention was highest (92%) during morning problem-solving. Review lectures between 11:00-11:30 AM where attention was slightly lower.
            </div>
          </div>
        </div>

        {/* Right Column: Attendance History & Academic Snapshot */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* Today's Check-in Card */}
          <div className="glass-panel">
            <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.2rem', marginBottom: '1rem' }}>Today's Check-In Status</h2>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '1rem',
              padding: '1rem',
              background: 'rgba(16, 185, 129, 0.1)',
              border: '1px solid rgba(16, 185, 129, 0.3)',
              borderRadius: '12px'
            }}>
              <CheckCircle2 size={32} color="var(--accent-emerald)" />
              <div>
                <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>Present in Class</div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                  Marked via Classroom Camera Vision at 09:02:15 AM
                </div>
              </div>
            </div>

            <h3 style={{ fontSize: '0.9rem', fontWeight: 600, marginTop: '1.25rem', marginBottom: '0.75rem' }}>Recent Attendance Days</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {attendanceData?.history?.slice(0, 4).map((h, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', padding: '0.4rem 0', borderBottom: '1px solid rgba(255, 255, 255, 0.03)' }}>
                  <span>{h.date}</span>
                  <span style={{ color: h.status === 'Present' ? 'var(--accent-emerald)' : 'var(--accent-rose)', fontWeight: 600 }}>
                    {h.status}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Academic Snapshot Card */}
          <div className="glass-panel">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.2rem' }}>Academic Report</h2>
              <span style={{ fontSize: '0.85rem', color: 'var(--accent-blue)', fontWeight: 700 }}>
                GPA: {academicData?.overall_percentage}%
              </span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
              {academicData?.subjects?.map((sub, idx) => (
                <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.85rem', padding: '0.35rem 0' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>{sub.subject}</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span style={{ fontWeight: 700 }}>{sub.marks}/{sub.max_marks}</span>
                    <span style={{
                      background: sub.grade.startsWith('A') ? 'rgba(16, 185, 129, 0.15)' : 'rgba(59, 130, 246, 0.15)',
                      color: sub.grade.startsWith('A') ? 'var(--accent-emerald)' : 'var(--accent-blue)',
                      padding: '2px 6px',
                      borderRadius: '4px',
                      fontWeight: 700,
                      fontSize: '0.75rem'
                    }}>
                      {sub.grade}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StudentDashboard;
