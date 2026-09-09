import React, { useState, useEffect } from 'react';
import { User, CheckCircle, AlertTriangle, MessageSquare, Sparkles, Brain, Award, Calendar, Clock, ArrowRight, HeartHandshake } from 'lucide-react';

const ParentDashboard = ({ currentUser, setActiveTab, openAIModal }) => {
  const studentId = currentUser?.student_id || 1;
  const [attendanceData, setAttendanceData] = useState(null);
  const [activenessData, setActivenessData] = useState(null);
  const [academicData, setAcademicData] = useState(null);
  const [counselingData, setCounselingData] = useState(null);

  useEffect(() => {
    fetchParentData();
  }, [studentId]);

  const fetchParentData = async () => {
    try {
      const [attRes, actRes, acadRes, counsRes] = await Promise.all([
        fetch(`http://localhost:8000/api/student/${studentId}/attendance-summary`),
        fetch(`http://localhost:8000/api/student/${studentId}/activeness-summary`),
        fetch(`http://localhost:8000/api/academic/${studentId}`),
        fetch(`http://localhost:8000/api/ai/counseling/${studentId}?role=parent`)
      ]);

      if (attRes.ok) setAttendanceData(await attRes.json());
      if (actRes.ok) setActivenessData(await actRes.json());
      if (acadRes.ok) setAcademicData(await acadRes.json());
      if (counsRes.ok) setCounselingData(await counsRes.json());
    } catch (err) {
      console.error('Error fetching parent data:', err);
    }
  };

  return (
    <div>
      {/* Parent Welcome Banner */}
      <div className="glass-panel" style={{
        marginBottom: '1.5rem',
        background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.15) 0%, rgba(59, 130, 246, 0.1) 100%)',
        border: '1px solid rgba(16, 185, 129, 0.3)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '1.5rem 2rem'
      }}>
        <div>
          <span style={{ fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--accent-emerald)', fontWeight: 700 }}>
            Parent Monitoring & Counseling Hub
          </span>
          <h1 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.8rem', fontWeight: 800, marginTop: '0.25rem' }}>
            {currentUser?.name || 'Mr. Rajesh Sharma'}
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '0.25rem' }}>
            Linked Child: <strong style={{ color: 'var(--text-primary)' }}>Rahul Sharma</strong> (Class 10-A, Roll #101)
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button 
            className="btn"
            onClick={() => setActiveTab('portal')}
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
          >
            <MessageSquare size={16} />
            <span>Message Teacher</span>
          </button>

          <button 
            className="btn btn-primary"
            onClick={openAIModal}
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
          >
            <Sparkles size={16} />
            <span>AI Parent Counselor</span>
          </button>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="metrics-row">
        {/* Child Attendance */}
        <div className="metric-card emerald">
          <div className="metric-icon-wrapper">
            <CheckCircle size={24} />
          </div>
          <div className="metric-info">
            <h3>Child Attendance</h3>
            <div className="value">{attendanceData?.percentage || 94.2}%</div>
            <span style={{ fontSize: '0.75rem', color: 'var(--accent-emerald)' }}>
              ✓ Verified In-Class Today
            </span>
          </div>
        </div>

        {/* Classroom Focus */}
        <div className="metric-card blue">
          <div className="metric-icon-wrapper">
            <Brain size={24} />
          </div>
          <div className="metric-info">
            <h3>Classroom Focus</h3>
            <div className="value">{activenessData?.average_focus || 86}%</div>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
              Camera Gaze & Posture Index
            </span>
          </div>
        </div>

        {/* Academic Marks */}
        <div className="metric-card purple">
          <div className="metric-icon-wrapper">
            <Award size={24} />
          </div>
          <div className="metric-info">
            <h3>Academic Grade</h3>
            <div className="value">{academicData?.overall_percentage || 89.8}%</div>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
              Midterm Grade A
            </span>
          </div>
        </div>

        {/* Fatigue Warning Alert */}
        <div className={`metric-card ${(activenessData?.drowsy_episodes || 0) > 0 ? 'rose' : 'emerald'}`}>
          <div className="metric-icon-wrapper">
            <AlertTriangle size={24} />
          </div>
          <div className="metric-info">
            <h3>Fatigue Detection</h3>
            <div className="value">
              {activenessData?.drowsy_episodes || 1} Alert
            </div>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
              11:15 AM Eye Closure Spike
            </span>
          </div>
        </div>
      </div>

      {/* Main Grid: AI Parental Insights & Academic Status */}
      <div className="dashboard-grid">
        {/* Left Column: AI Pediatric Counseling & Wellness Report */}
        <div className="glass-panel">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
            <div>
              <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.3rem' }}>AI Pediatric Guidance & Counseling</h2>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Synthesized from EduCam classroom camera telemetry and exam trends</p>
            </div>
            <span style={{ fontSize: '0.85rem', color: 'var(--accent-purple)', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <Sparkles size={16} /> Wellness Score: {counselingData?.wellness_score || 88}/100
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {counselingData?.counseling_insights ? (
              counselingData.counseling_insights.map((item, idx) => (
                <div 
                  key={idx} 
                  style={{
                    background: item.type === 'alert' ? 'rgba(244, 63, 94, 0.08)' : 'rgba(255, 255, 255, 0.02)',
                    border: `1px solid ${item.type === 'alert' ? 'rgba(244, 63, 94, 0.3)' : 'var(--glass-border)'}`,
                    borderRadius: '12px',
                    padding: '1.25rem'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                    <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: item.type === 'alert' ? 'var(--accent-rose)' : 'var(--text-primary)' }}>
                      {item.topic}
                    </h3>
                    <span style={{
                      fontSize: '0.7rem',
                      textTransform: 'uppercase',
                      fontWeight: 700,
                      padding: '2px 6px',
                      borderRadius: '4px',
                      background: item.type === 'alert' ? 'rgba(244, 63, 94, 0.2)' : 'rgba(59, 130, 246, 0.15)',
                      color: item.type === 'alert' ? 'var(--accent-rose)' : 'var(--accent-blue)'
                    }}>
                      {item.type}
                    </span>
                  </div>

                  <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.75rem' }}>
                    <strong>Observation:</strong> {item.observation}
                  </p>

                  <div style={{
                    background: 'rgba(0, 0, 0, 0.2)',
                    padding: '0.75rem',
                    borderRadius: '8px',
                    fontSize: '0.85rem',
                    color: 'var(--text-primary)',
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '0.5rem'
                  }}>
                    <HeartHandshake size={18} color="var(--accent-emerald)" style={{ flexShrink: 0, marginTop: '2px' }} />
                    <div>
                      <strong>Recommended Parental Action:</strong> {item.recommendation}
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <p style={{ color: 'var(--text-muted)' }}>Loading AI counseling report...</p>
            )}
          </div>
        </div>

        {/* Right Column: Attendance Verification & Teacher Communication */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* Real-Time Check-In Verification */}
          <div className="glass-panel">
            <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.2rem', marginBottom: '1rem' }}>Today's School Attendance</h2>
            
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '1rem',
              padding: '1.25rem',
              background: 'rgba(16, 185, 129, 0.1)',
              border: '1px solid rgba(16, 185, 129, 0.3)',
              borderRadius: '12px'
            }}>
              <CheckCircle size={36} color="var(--accent-emerald)" />
              <div>
                <div style={{ fontWeight: 700, fontSize: '1.05rem', color: 'var(--text-primary)' }}>Present in Classroom</div>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>
                  Camera verified arrival at <strong>09:02 AM</strong>
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--accent-emerald)', marginTop: '0.35rem' }}>
                  ✓ In seat during Morning Session
                </div>
              </div>
            </div>

            <div style={{ marginTop: '1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Attendance This Month:</span>
              <strong style={{ color: 'var(--text-primary)' }}>94.2% (19/20 Days)</strong>
            </div>
          </div>

          {/* Academic Snapshot */}
          <div className="glass-panel">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.2rem' }}>Rahul's Exam Report</h2>
              <button 
                onClick={() => setActiveTab('academic')}
                style={{ background: 'transparent', border: 'none', color: 'var(--accent-blue)', fontSize: '0.85rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.25rem' }}
              >
                <span>Full Card</span>
                <ArrowRight size={14} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
              {academicData?.subjects?.map((sub, idx) => (
                <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.85rem', padding: '0.35rem 0' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>{sub.subject}</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span style={{ fontWeight: 700 }}>{sub.marks}/{sub.max_marks}</span>
                    <span style={{
                      background: 'rgba(59, 130, 246, 0.15)',
                      color: 'var(--accent-blue)',
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

export default ParentDashboard;
