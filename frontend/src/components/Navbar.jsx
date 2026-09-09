import React from 'react';
import { Camera, LogOut, Sparkles, User, Shield, GraduationCap, Users, MessageSquare, BookOpen, LayoutDashboard } from 'lucide-react';

const Navbar = ({ currentUser, currentRole, activeTab, setActiveTab, onLogout, onQuickSwitch, openAIModal }) => {
  const getRoleBadge = (role) => {
    switch (role) {
      case 'teacher':
        return { label: 'Teacher Portal', color: '#f97316', icon: <Shield size={14} /> };
      case 'student':
        return { label: 'Student Portal', color: '#fbbf24', icon: <GraduationCap size={14} /> };
      case 'parent':
        return { label: 'Parent Portal', color: 'var(--accent-emerald)', icon: <Users size={14} /> };
      default:
        return { label: 'Portal', color: 'var(--text-muted)', icon: <User size={14} /> };
    }
  };

  const badge = getRoleBadge(currentRole);

  return (
    <header className="navbar">
      <div style={{ display: 'flex', alignItems: 'center', gap: '2rem' }}>
        <div className="logo" style={{ cursor: 'pointer' }} onClick={() => setActiveTab('dashboard')}>
          <Camera size={26} color="#fbbf24" />
          <span>EduCam</span>
        </div>

        <nav className="nav-links">
          <button 
            className={`nav-item ${activeTab === 'dashboard' ? 'active' : ''}`}
            onClick={() => setActiveTab('dashboard')}
          >
            <LayoutDashboard size={18} />
            <span>Dashboard</span>
          </button>

          <button 
            className={`nav-item ${activeTab === 'portal' ? 'active' : ''}`}
            onClick={() => setActiveTab('portal')}
          >
            <MessageSquare size={18} />
            <span>Connecting Portal</span>
          </button>

          <button 
            className={`nav-item ${activeTab === 'academic' ? 'active' : ''}`}
            onClick={() => setActiveTab('academic')}
          >
            <BookOpen size={18} />
            <span>Academic Reports</span>
          </button>
        </nav>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
        {/* AI Assistant Button */}
        <button 
          className="btn btn-primary"
          style={{ padding: '0.5rem 1rem', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.4rem', borderRadius: '20px' }}
          onClick={openAIModal}
        >
          <Sparkles size={16} />
          <span>AI Counseling & Help</span>
        </button>

        {/* Quick Role Switcher */}
        <div className="role-switcher" style={{ display: 'flex', background: 'var(--bg-tertiary)', borderRadius: '20px', padding: '2px', border: '1px solid var(--glass-border)' }}>
          <button 
            onClick={() => onQuickSwitch('teacher')}
            style={{
              background: currentRole === 'teacher' ? 'linear-gradient(135deg, #ea580c 0%, #c2410c 100%)' : 'transparent',
              color: currentRole === 'teacher' ? '#fff' : 'var(--text-secondary)',
              border: 'none',
              borderRadius: '18px',
              padding: '4px 10px',
              fontSize: '0.75rem',
              cursor: 'pointer',
              fontWeight: 600
            }}
          >
            Teacher
          </button>
          <button 
            onClick={() => onQuickSwitch('student')}
            style={{
              background: currentRole === 'student' ? 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)' : 'transparent',
              color: currentRole === 'student' ? '#170d01' : 'var(--text-secondary)',
              border: 'none',
              borderRadius: '18px',
              padding: '4px 10px',
              fontSize: '0.75rem',
              cursor: 'pointer',
              fontWeight: 600
            }}
          >
            Student
          </button>
          <button 
            onClick={() => onQuickSwitch('parent')}
            style={{
              background: currentRole === 'parent' ? 'var(--accent-emerald)' : 'transparent',
              color: currentRole === 'parent' ? '#fff' : 'var(--text-secondary)',
              border: 'none',
              borderRadius: '18px',
              padding: '4px 10px',
              fontSize: '0.75rem',
              cursor: 'pointer',
              fontWeight: 600
            }}
          >
            Parent
          </button>
        </div>

        {/* User Info & Role Tag */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', borderLeft: '1px solid var(--glass-border)', paddingLeft: '1rem' }}>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '0.85rem', fontWeight: 700 }}>{currentUser?.name || 'User'}</div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '4px', fontSize: '0.7rem', color: badge.color }}>
              {badge.icon}
              <span>{badge.label}</span>
            </div>
          </div>

          <button 
            onClick={onLogout} 
            title="Logout"
            style={{
              background: 'transparent',
              border: '1px solid var(--glass-border)',
              color: 'var(--text-muted)',
              cursor: 'pointer',
              padding: '6px',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center'
            }}
          >
            <LogOut size={16} />
          </button>
        </div>
      </div>
    </header>
  );
};

export default Navbar;
