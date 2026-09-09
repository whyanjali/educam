import React, { useState } from 'react';
import Navbar from './components/Navbar';
import Login from './components/Login';
import Dashboard from './components/Dashboard';
import StudentDashboard from './components/StudentDashboard';
import ParentDashboard from './components/ParentDashboard';
import ConnectingPortal from './components/ConnectingPortal';
import AcademicReportView from './components/AcademicReportView';
import AIAssistantModal from './components/AIAssistantModal';

function App() {
  // Check localStorage for saved session
  const [currentUser, setCurrentUser] = useState(() => {
    try {
      const saved = localStorage.getItem('educam_user');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });
  
  const [currentRole, setCurrentRole] = useState(() => {
    try {
      const saved = localStorage.getItem('educam_user');
      return saved ? JSON.parse(saved).role : 'student';
    } catch {
      return 'student';
    }
  });

  const [activeTab, setActiveTab] = useState('dashboard');
  const [isAIModalOpen, setIsAIModalOpen] = useState(false);

  const demoUsers = {
    teacher: {
      id: 1,
      username: 'teacher',
      role: 'teacher',
      name: 'Prof. Vikram Sharma',
      email: 'vikram.sharma@educam.edu'
    },
    student: {
      id: 2,
      username: 'student',
      role: 'student',
      student_id: 1,
      student_name: 'Rahul Sharma',
      roll_number: '101',
      name: 'Rahul Sharma',
      email: 'rahul.101@student.educam.edu'
    },
    parent: {
      id: 3,
      username: 'parent',
      role: 'parent',
      student_id: 1,
      student_name: 'Rahul Sharma',
      name: 'Mr. Rajesh Sharma',
      email: 'rajesh.sharma@parent.educam.com'
    }
  };

  const handleLoginSuccess = (user) => {
    setCurrentUser(user);
    setCurrentRole(user.role);
    localStorage.setItem('educam_user', JSON.stringify(user));
    setActiveTab('dashboard');
  };

  const handleLogout = () => {
    setCurrentUser(null);
    localStorage.removeItem('educam_user');
  };

  const handleQuickSwitch = (role) => {
    setCurrentRole(role);
    const u = demoUsers[role];
    setCurrentUser(u);
    localStorage.setItem('educam_user', JSON.stringify(u));
  };

  if (!currentUser) {
    return <Login onLoginSuccess={handleLoginSuccess} />;
  }

  return (
    <div className="app-container">
      {/* Top Navbar */}
      <Navbar 
        currentUser={currentUser}
        currentRole={currentRole}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onLogout={handleLogout}
        onQuickSwitch={handleQuickSwitch}
        openAIModal={() => setIsAIModalOpen(true)}
      />

      {/* Main Content Body */}
      <main className="main-content">
        {activeTab === 'dashboard' && (
          <>
            {currentRole === 'teacher' && <Dashboard openAIModal={() => setIsAIModalOpen(true)} />}
            {currentRole === 'student' && <StudentDashboard currentUser={currentUser} openAIModal={() => setIsAIModalOpen(true)} />}
            {currentRole === 'parent' && <ParentDashboard currentUser={currentUser} setActiveTab={setActiveTab} openAIModal={() => setIsAIModalOpen(true)} />}
          </>
        )}

        {activeTab === 'portal' && (
          <ConnectingPortal currentUser={currentUser} currentRole={currentRole} />
        )}

        {activeTab === 'academic' && (
          <AcademicReportView currentUser={currentUser} currentRole={currentRole} />
        )}
      </main>

      {/* Floating AI Counseling Modal */}
      <AIAssistantModal 
        isOpen={isAIModalOpen}
        onClose={() => setIsAIModalOpen(false)}
        currentRole={currentRole}
        currentUser={currentUser}
      />
    </div>
  );
}

export default App;
