import React, { useState, useEffect } from 'react';
import { MessageSquare, Send, Megaphone, User, Shield, GraduationCap, Users, Clock } from 'lucide-react';

const ConnectingPortal = ({ currentUser, currentRole }) => {
  const [messages, setMessages] = useState([]);
  const [newContent, setNewContent] = useState('');
  const [recipient, setRecipient] = useState(currentRole === 'teacher' ? 'all' : 'teacher');
  const [filterTab, setFilterTab] = useState('all'); // 'all', 'announcements', 'direct'
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchMessages();
  }, []);

  const fetchMessages = async () => {
    try {
      const res = await fetch(`http://localhost:8000/api/messages?role=${currentRole}`);
      if (res.ok) {
        const data = await res.json();
        setMessages(data);
      }
    } catch (err) {
      console.error('Failed to fetch messages:', err);
    }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newContent.trim()) return;

    const isAnnouncement = recipient === 'all' && currentRole === 'teacher' ? 1 : 0;
    
    let receiverId = null;
    let receiverName = 'All';
    let receiverRole = 'all';

    if (recipient === 'teacher') {
      receiverId = 1;
      receiverName = 'Prof. Vikram Sharma';
      receiverRole = 'teacher';
    } else if (recipient === 'parent') {
      receiverId = 3;
      receiverName = 'Mr. Rajesh Sharma (Parent)';
      receiverRole = 'parent';
    } else if (recipient === 'student') {
      receiverId = 2;
      receiverName = 'Rahul Sharma (Student)';
      receiverRole = 'student';
    }

    try {
      setLoading(true);
      const res = await fetch('http://localhost:8000/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sender_id: currentUser?.id || 1,
          sender_name: currentUser?.name || 'User',
          sender_role: currentRole,
          receiver_id: receiverId,
          receiver_name: receiverName,
          receiver_role: receiverRole,
          content: newContent,
          is_announcement: isAnnouncement
        })
      });

      if (res.ok) {
        setNewContent('');
        fetchMessages();
      }
    } catch (err) {
      console.error('Error sending message:', err);
    } finally {
      setLoading(false);
    }
  };

  const filteredMessages = messages.filter(msg => {
    if (filterTab === 'announcements') return msg.is_announcement === 1;
    if (filterTab === 'direct') return msg.is_announcement === 0;
    return true;
  });

  const getRoleIcon = (role) => {
    switch (role?.toLowerCase()) {
      case 'teacher':
        return <Shield size={14} color="var(--accent-purple)" />;
      case 'student':
        return <GraduationCap size={14} color="var(--accent-blue)" />;
      case 'parent':
        return <Users size={14} color="var(--accent-emerald)" />;
      default:
        return <User size={14} color="var(--text-muted)" />;
    }
  };

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
      {/* Header */}
      <div className="glass-panel" style={{
        marginBottom: '1.5rem',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '1.5rem 2rem'
      }}>
        <div>
          <h1 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.6rem', fontWeight: 800 }}>
            Teacher • Student • Parent Connecting Portal
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginTop: '0.25rem' }}>
            Unified communication hub for official announcements, queries, and student welfare collaboration.
          </p>
        </div>

        {/* Tab Filters */}
        <div style={{ display: 'flex', background: 'var(--bg-tertiary)', borderRadius: '10px', padding: '3px', border: '1px solid var(--glass-border)' }}>
          <button 
            onClick={() => setFilterTab('all')}
            style={{
              background: filterTab === 'all' ? 'var(--accent-blue)' : 'transparent',
              color: filterTab === 'all' ? '#fff' : 'var(--text-secondary)',
              border: 'none',
              padding: '6px 14px',
              borderRadius: '8px',
              fontSize: '0.8rem',
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            All Threads
          </button>
          <button 
            onClick={() => setFilterTab('announcements')}
            style={{
              background: filterTab === 'announcements' ? 'var(--accent-blue)' : 'transparent',
              color: filterTab === 'announcements' ? '#fff' : 'var(--text-secondary)',
              border: 'none',
              padding: '6px 14px',
              borderRadius: '8px',
              fontSize: '0.8rem',
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            Announcements
          </button>
          <button 
            onClick={() => setFilterTab('direct')}
            style={{
              background: filterTab === 'direct' ? 'var(--accent-blue)' : 'transparent',
              color: filterTab === 'direct' ? '#fff' : 'var(--text-secondary)',
              border: 'none',
              padding: '6px 14px',
              borderRadius: '8px',
              fontSize: '0.8rem',
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            Direct Messages
          </button>
        </div>
      </div>

      {/* Message Feed */}
      <div className="glass-panel" style={{ minHeight: '400px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: '1.5rem' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', overflowY: 'auto', maxHeight: '550px', paddingRight: '0.5rem' }}>
          {filteredMessages.map((msg) => {
            const isMe = msg.sender_name === currentUser?.name;
            const isBroadcast = msg.is_announcement === 1;

            return (
              <div 
                key={msg.id}
                style={{
                  alignSelf: isBroadcast ? 'center' : isMe ? 'flex-end' : 'flex-start',
                  maxWidth: isBroadcast ? '95%' : '80%',
                  width: isBroadcast ? '100%' : 'auto',
                  background: isBroadcast 
                    ? 'linear-gradient(135deg, rgba(245, 158, 11, 0.1) 0%, rgba(139, 92, 246, 0.1) 100%)' 
                    : isMe 
                      ? 'linear-gradient(135deg, rgba(59, 130, 246, 0.2) 0%, rgba(139, 92, 246, 0.15) 100%)' 
                      : 'rgba(255, 255, 255, 0.03)',
                  border: `1px solid ${isBroadcast ? 'rgba(245, 158, 11, 0.4)' : isMe ? 'rgba(59, 130, 246, 0.4)' : 'var(--glass-border)'}`,
                  borderRadius: '14px',
                  padding: '1.2rem',
                  boxShadow: '0 4px 20px rgba(0, 0, 0, 0.2)'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem', gap: '1rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    {getRoleIcon(msg.sender_role)}
                    <strong style={{ fontSize: '0.9rem', color: 'var(--text-primary)' }}>{msg.sender_name}</strong>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>({msg.sender_role})</span>
                    
                    {isBroadcast && (
                      <span style={{
                        background: 'rgba(245, 158, 11, 0.2)',
                        color: 'var(--accent-amber)',
                        padding: '2px 6px',
                        borderRadius: '4px',
                        fontSize: '0.7rem',
                        fontWeight: 700,
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.25rem'
                      }}>
                        <Megaphone size={12} /> Class Notice
                      </span>
                    )}
                  </div>

                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>

                <p style={{ fontSize: '0.92rem', color: 'var(--text-primary)', lineHeight: 1.5, margin: '0.25rem 0' }}>
                  {msg.content}
                </p>

                {!isBroadcast && (
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.5rem', textAlign: 'right' }}>
                    To: {msg.receiver_name}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Message Input Box */}
        <form onSubmit={handleSendMessage} style={{ marginTop: '1.5rem', borderTop: '1px solid var(--glass-border)', paddingTop: '1.25rem' }}>
          <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '0.75rem' }}>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', alignSelf: 'center' }}>Send To:</span>
            <select 
              value={recipient}
              onChange={(e) => setRecipient(e.target.value)}
              className="form-control"
              style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem', width: 'auto' }}
            >
              {currentRole === 'teacher' && <option value="all">📢 All (Class Broadcast Notice)</option>}
              {currentRole !== 'teacher' && <option value="teacher">Prof. Vikram Sharma (Teacher)</option>}
              {currentRole === 'teacher' && <option value="parent">Mr. Rajesh Sharma (Parent)</option>}
              {currentRole === 'teacher' && <option value="student">Rahul Sharma (Student)</option>}
            </select>
          </div>

          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <input 
              type="text" 
              className="form-control" 
              placeholder={currentRole === 'teacher' && recipient === 'all' ? "Type a classroom announcement..." : "Type your message to teacher, student or parent..."}
              value={newContent}
              onChange={(e) => setNewContent(e.target.value)}
              style={{ flex: 1 }}
              required 
            />

            <button 
              type="submit" 
              className="btn btn-primary"
              disabled={loading}
              style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0 1.5rem' }}
            >
              <Send size={16} />
              <span>Send</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ConnectingPortal;
