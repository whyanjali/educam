import React, { useState, useEffect } from 'react';
import { BookOpen, Plus, Award, CheckCircle, FileText, BarChart3, X } from 'lucide-react';

const AcademicReportView = ({ currentUser, currentRole }) => {
  const [selectedStudentId, setSelectedStudentId] = useState(currentUser?.student_id || 1);
  const [students, setStudents] = useState([]);
  const [reportData, setReportData] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [subject, setSubject] = useState('');
  const [marks, setMarks] = useState('');
  const [maxMarks, setMaxMarks] = useState('100');
  const [grade, setGrade] = useState('A');
  const [examType, setExamType] = useState('Midterm');
  const [remarks, setRemarks] = useState('');
  const [actionNotice, setActionNotice] = useState('');

  useEffect(() => {
    if (currentRole === 'teacher') {
      fetchStudents();
    }
  }, [currentRole]);

  useEffect(() => {
    fetchAcademicReport(selectedStudentId);
  }, [selectedStudentId]);

  const fetchStudents = async () => {
    try {
      const res = await fetch('http://localhost:8000/api/students');
      if (res.ok) {
        const data = await res.json();
        setStudents(data);
        if (data.length > 0 && !selectedStudentId) {
          setSelectedStudentId(data[0].id);
        }
      }
    } catch (err) {
      console.error('Error fetching students:', err);
    }
  };

  const fetchAcademicReport = async (sId) => {
    try {
      const res = await fetch(`http://localhost:8000/api/academic/${sId}`);
      if (res.ok) {
        const data = await res.json();
        setReportData(data);
      }
    } catch (err) {
      console.error('Error fetching report:', err);
    }
  };

  const handleAddGrade = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch('http://localhost:8000/api/academic', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          student_id: selectedStudentId,
          subject,
          marks: parseFloat(marks),
          max_marks: parseFloat(maxMarks),
          grade,
          exam_type: examType,
          remarks
        })
      });
      if (res.ok) {
        setSubject('');
        setMarks('');
        setRemarks('');
        setShowAddModal(false);
        fetchAcademicReport(selectedStudentId);
        setActionNotice('Grade recorded successfully!');
        setTimeout(() => setActionNotice(''), 3000);
      }
    } catch (err) {
      console.error('Error saving grade:', err);
    }
  };

  return (
    <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
      {/* Header Banner */}
      <div className="glass-panel" style={{
        marginBottom: '1.5rem',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '1.5rem 2rem'
      }}>
        <div>
          <h1 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.6rem', fontWeight: 800 }}>
            Academic Performance & Gradebook
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginTop: '0.25rem' }}>
            Comprehensive term records, subject mastery scores, and behavioral remarks.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          {/* Student Selector for Teachers */}
          {currentRole === 'teacher' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Select Student:</span>
              <select 
                value={selectedStudentId} 
                onChange={(e) => setSelectedStudentId(Number(e.target.value))}
                className="form-control"
                style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem', width: 'auto' }}
              >
                {students.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} (#{s.roll_number})
                  </option>
                ))}
              </select>
            </div>
          )}

          {currentRole === 'teacher' && (
            <button 
              className="btn btn-primary"
              onClick={() => setShowAddModal(true)}
              style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.5rem 1rem', fontSize: '0.85rem' }}
            >
              <Plus size={16} /> Add Grade
            </button>
          )}
        </div>
      </div>

      {actionNotice && (
        <div style={{
          background: 'rgba(16, 185, 129, 0.2)',
          border: '1px solid var(--accent-emerald)',
          color: '#6ee7b7',
          padding: '0.75rem 1.5rem',
          borderRadius: '10px',
          marginBottom: '1.5rem',
          fontWeight: 600
        }}>
          {actionNotice}
        </div>
      )}

      {/* Grade Card Summary */}
      <div className="glass-panel" style={{ marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <div>
            <span style={{ fontSize: '0.8rem', color: 'var(--accent-amber)', fontWeight: 700, textTransform: 'uppercase' }}>
              Term Progress Card
            </span>
            <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.3rem', color: 'var(--text-primary)' }}>
              Subject Performance Overview
            </h2>
          </div>

          <div style={{
            background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.15) 0%, rgba(249, 115, 22, 0.15) 100%)',
            border: '1px solid rgba(245, 158, 11, 0.4)',
            padding: '0.75rem 1.5rem',
            borderRadius: '12px',
            textAlign: 'right'
          }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Overall Average</div>
            <div style={{ fontFamily: 'var(--font-heading)', fontSize: '1.6rem', fontWeight: 800, color: 'var(--text-primary)' }}>
              {reportData?.overall_percentage || 0}%
            </div>
          </div>
        </div>

        {/* Subjects Table */}
        <div className="table-container">
          <table className="custom-table">
            <thead>
              <tr>
                <th>Subject</th>
                <th>Score</th>
                <th>Progress</th>
                <th>Grade</th>
                <th>Instructor Remarks</th>
              </tr>
            </thead>
            <tbody>
              {reportData?.subjects?.map((sub, idx) => {
                const pct = Math.round((sub.marks / sub.max_marks) * 100);
                return (
                  <tr key={idx}>
                    <td style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{sub.subject}</td>
                    <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{sub.marks} / {sub.max_marks}</td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <div style={{ flex: 1, height: '6px', background: 'var(--bg-tertiary)', borderRadius: '3px', width: '70px' }}>
                          <div style={{ width: `${pct}%`, height: '100%', background: 'var(--accent-amber)', borderRadius: '3px' }}></div>
                        </div>
                        <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{pct}%</span>
                      </div>
                    </td>
                    <td>
                      <span style={{
                        background: sub.grade.startsWith('A') ? 'rgba(16, 185, 129, 0.15)' : 'rgba(245, 158, 11, 0.15)',
                        color: sub.grade.startsWith('A') ? 'var(--accent-emerald)' : 'var(--accent-amber)',
                        padding: '4px 8px',
                        borderRadius: '6px',
                        fontWeight: 700,
                        fontSize: '0.8rem'
                      }}>
                        {sub.grade}
                      </span>
                    </td>
                    <td style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>{sub.remarks || '-'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Grade Modal */}
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
          <div className="glass-panel" style={{ maxWidth: '480px', width: '100%', padding: '2rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h3 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.3rem' }}>Record Academic Grade</h3>
              <button onClick={() => setShowAddModal(false)} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleAddGrade}>
              <div className="form-group">
                <label>Subject</label>
                <input 
                  type="text" 
                  className="form-control" 
                  placeholder="e.g. Physics, Chemistry, Calculus" 
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  required 
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="form-group">
                  <label>Marks Scored</label>
                  <input 
                    type="number" 
                    className="form-control" 
                    placeholder="e.g. 88" 
                    value={marks}
                    onChange={(e) => setMarks(e.target.value)}
                    required 
                  />
                </div>

                <div className="form-group">
                  <label>Max Marks</label>
                  <input 
                    type="number" 
                    className="form-control" 
                    value={maxMarks}
                    onChange={(e) => setMaxMarks(e.target.value)}
                    required 
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="form-group">
                  <label>Letter Grade</label>
                  <select 
                    className="form-control"
                    value={grade}
                    onChange={(e) => setGrade(e.target.value)}
                  >
                    <option value="A+">A+ (Outstanding)</option>
                    <option value="A">A (Excellent)</option>
                    <option value="B+">B+ (Very Good)</option>
                    <option value="B">B (Good)</option>
                    <option value="C">C (Satisfactory)</option>
                  </select>
                </div>

                <div className="form-group">
                  <label>Exam Type</label>
                  <select 
                    className="form-control"
                    value={examType}
                    onChange={(e) => setExamType(e.target.value)}
                  >
                    <option value="Midterm">Midterm Examination</option>
                    <option value="Final">Final Examination</option>
                    <option value="Unit Test">Unit Assessment</option>
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label>Teacher Remarks</label>
                <input 
                  type="text" 
                  className="form-control" 
                  placeholder="e.g. Excellent conceptual clarity" 
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                />
              </div>

              <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end', marginTop: '1.5rem' }}>
                <button type="button" className="btn" onClick={() => setShowAddModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Save Grade
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AcademicReportView;
