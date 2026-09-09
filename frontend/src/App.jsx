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
  // Default to logged-in teacher for instant frictionless testing
  const [currentUser, setCurrentUser] = useState({
    id: 1,
    username: 'teacher',
    role: 'teacher',
    name: 'Prof. Vikram Sharma',
    email: 'vikram.sharma@educam.edu'
  });
  
  const [currentRole, setCurrentRole] = useState('teacher');
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
    setActiveTab('dashboard');
  };

  const handleLogout = () => {
    setCurrentUser(null);
  };

  const handleQuickSwitch = (role) => {
    setCurrentRole(role);
    setCurrentUser(demoUsers[role]);
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
