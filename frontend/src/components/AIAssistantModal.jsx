import React, { useState } from 'react';
import { Sparkles, X, Send, Bot, User, Brain, Heart, Lightbulb } from 'lucide-react';

const AIAssistantModal = ({ isOpen, onClose, currentRole, currentUser }) => {
  if (!isOpen) return null;

  const [inputMsg, setInputMsg] = useState('');
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState([
    {
      sender: 'ai',
      text: currentRole === 'student'
        ? `Hello ${currentUser?.student_name || currentUser?.name || 'Student'}! I'm your EduCam AI Study Companion. How can I assist you with your focus, study strategy, or exam prep today?`
        : currentRole === 'parent'
        ? `Hello ${currentUser?.name || 'Parent'}! I'm the EduCam Family Counseling Assistant. I can help you analyze Rahul's attention logs, optimize his sleep routine, and guide his academic habits.`
        : `Prof. Vikram Sharma, welcome! EduCam AI Classroom Advisor is here to assist with engagement strategies, student fatigue alerts, and lesson plan pacing.`
    }
  ]);

  const quickPrompts = {
    student: [
      "How do I improve my attention during lectures?",
      "I feel drowsy around 11:30 AM, what should I do?",
      "Tips for dealing with midterm exam stress",
      "Suggest a 2-hour evening study routine"
    ],
    parent: [
      "Why is my child drowsy in class and how can I help?",
      "How can I support my child in Mathematics?",
      "Best bedtime routine for a Grade 10 student",
      "Draft a message to the class teacher"
    ],
    teacher: [
      "Suggest 3 ways to re-engage distracted students",
      "How to reduce afternoon drowsiness in class?",
      "Draft an announcement for parents regarding upcoming tests"
    ]
  };

  const handleSend = async (textToSend) => {
    const text = textToSend || inputMsg;
    if (!text.trim()) return;

    const userMessage = { sender: 'user', text };
    setMessages(prev => [...prev, userMessage]);
    setInputMsg('');
    setLoading(true);

    try {
      const res = await fetch('http://localhost:8000/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text,
          role: currentRole,
          student_id: currentUser?.student_id || 1,
          student_name: currentUser?.student_name || currentUser?.name || 'Student'
        })
      });

      if (res.ok) {
        const data = await res.json();
        setMessages(prev => [...prev, { sender: 'ai', text: data.reply }]);
      } else {
        throw new Error('AI Service unreachable');
      }
    } catch (err) {
      setMessages(prev => [...prev, {
        sender: 'ai',
        text: "I'm currently having trouble connecting to the analytics server, but remember: regular hydration and 25-minute focused bursts with active note-taking work wonders!"
      }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      width: '100%',
      height: '100%',
      background: 'rgba(3, 7, 18, 0.85)',
      backdropFilter: 'blur(10px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 2000,
      padding: '1.5rem'
    }}>
      <div className="glass-panel" style={{
        maxWidth: '750px',
        width: '100%',
        height: '80vh',
        display: 'flex',
        flexDirection: 'column',
        padding: '1.5rem',
        borderRadius: '20px',
        boxShadow: '0 20px 60px rgba(0, 0, 0, 0.6)'
      }}>
        {/* Modal Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '1rem', borderBottom: '1px solid var(--glass-border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{
              width: '38px',
              height: '38px',
              borderRadius: '10px',
              background: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <Sparkles size={20} color="#fff" />
            </div>
            <div>
              <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.25rem', fontWeight: 800 }}>
                EduCam AI Assistant & Counseling
              </h2>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                Powered by Real-Time Classroom Attention Telemetry
              </span>
            </div>
          </div>

          <button 
            onClick={onClose}
            style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '4px' }}
          >
            <X size={22} />
          </button>
        </div>

        {/* Quick Suggestion Chips */}
        <div style={{ display: 'flex', gap: '0.5rem', overflowX: 'auto', padding: '0.75rem 0', borderBottom: '1px solid rgba(255, 255, 255, 0.03)' }}>
          {quickPrompts[currentRole]?.map((prompt, i) => (
            <button
              key={i}
              onClick={() => handleSend(prompt)}
              style={{
                background: 'rgba(255, 255, 255, 0.03)',
                border: '1px solid var(--glass-border)',
                color: 'var(--text-secondary)',
                fontSize: '0.75rem',
                padding: '4px 10px',
                borderRadius: '16px',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                transition: 'all 0.2s'
              }}
              onMouseEnter={(e) => { e.target.style.borderColor = 'var(--accent-blue)'; e.target.style.color = '#fff'; }}
              onMouseLeave={(e) => { e.target.style.borderColor = 'var(--glass-border)'; e.target.style.color = 'var(--text-secondary)'; }}
            >
              {prompt}
            </button>
          ))}
        </div>

        {/* Chat Message Thread */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '1rem 0', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {messages.map((m, idx) => (
            <div
              key={idx}
              style={{
                display: 'flex',
                gap: '0.75rem',
                alignSelf: m.sender === 'user' ? 'flex-end' : 'flex-start',
                maxWidth: '85%'
              }}
            >
              {m.sender === 'ai' && (
                <div style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  background: 'rgba(139, 92, 246, 0.2)',
                  border: '1px solid var(--accent-purple)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0
                }}>
                  <Bot size={18} color="var(--accent-purple)" />
                </div>
              )}

              <div style={{
                background: m.sender === 'user' 
                  ? 'linear-gradient(135deg, rgba(59, 130, 246, 0.3) 0%, rgba(139, 92, 246, 0.3) 100%)' 
                  : 'rgba(255, 255, 255, 0.03)',
                border: `1px solid ${m.sender === 'user' ? 'rgba(59, 130, 246, 0.5)' : 'var(--glass-border)'}`,
                padding: '0.85rem 1.15rem',
                borderRadius: '14px',
                fontSize: '0.9rem',
                lineHeight: 1.5,
                color: 'var(--text-primary)',
                whiteSpace: 'pre-wrap'
              }}>
                {m.text}
              </div>
            </div>
          ))}

          {loading && (
            <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
              <Bot size={18} color="var(--accent-purple)" />
              <span>Analyzing telemetry and formulating counsel...</span>
            </div>
          )}
        </div>

        {/* Input Bar */}
        <form 
          onSubmit={(e) => { e.preventDefault(); handleSend(); }} 
          style={{ display: 'flex', gap: '0.75rem', paddingTop: '1rem', borderTop: '1px solid var(--glass-border)' }}
        >
          <input 
            type="text" 
            className="form-control" 
            placeholder={
              currentRole === 'student' 
                ? "Ask about your focus, fatigue, or exam doubts..." 
                : currentRole === 'parent' 
                  ? "Ask for child sleep, diet, or focus counseling..." 
                  : "Ask for teaching engagement ideas or parent drafts..."
            }
            value={inputMsg}
            onChange={(e) => setInputMsg(e.target.value)}
            style={{ flex: 1 }}
          />

          <button 
            type="submit" 
            className="btn btn-primary"
            disabled={loading}
            style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0 1.25rem' }}
          >
            <Send size={16} />
            <span>Send</span>
          </button>
        </form>
      </div>
    </div>
  );
};

export default AIAssistantModal;
