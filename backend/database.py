import sqlite3
import json
import os
from datetime import datetime, timedelta

DB_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "educam.db")

def get_db_connection():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    conn = get_db_connection()
    cursor = conn.cursor()
    
    # 1. Students table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS students (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        roll_number TEXT UNIQUE NOT NULL,
        created_at TEXT NOT NULL
    )
    """)
    
    # 2. Users table (for Multi-Role Login)
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        role TEXT NOT NULL, -- 'teacher', 'student', 'parent'
        student_id INTEGER, -- linked student for student and parent roles
        name TEXT NOT NULL,
        email TEXT,
        created_at TEXT NOT NULL,
        FOREIGN KEY (student_id) REFERENCES students (id) ON DELETE SET NULL
    )
    """)
    
    # 3. Face signatures table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS face_signatures (
        student_id INTEGER PRIMARY KEY,
        embedding TEXT NOT NULL,
        FOREIGN KEY (student_id) REFERENCES students (id) ON DELETE CASCADE
    )
    """)
    
    # 4. Attendance table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS attendance (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        student_id INTEGER NOT NULL,
        date TEXT NOT NULL,
        timestamp TEXT NOT NULL,
        status TEXT DEFAULT 'Present',
        UNIQUE(student_id, date),
        FOREIGN KEY (student_id) REFERENCES students (id) ON DELETE CASCADE
    )
    """)
    
    # 5. Activeness logs table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS activeness_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        student_id INTEGER NOT NULL,
        timestamp TEXT NOT NULL,
        attention_score REAL NOT NULL,
        is_drowsy INTEGER NOT NULL,
        hand_raised INTEGER NOT NULL,
        emotion TEXT,
        FOREIGN KEY (student_id) REFERENCES students (id) ON DELETE CASCADE
    )
    """)
    
    # 6. Academic Reports table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS academic_reports (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        student_id INTEGER NOT NULL,
        subject TEXT NOT NULL,
        marks REAL NOT NULL,
        max_marks REAL NOT NULL,
        grade TEXT NOT NULL,
        exam_type TEXT NOT NULL, -- 'Midterm', 'Final', 'Unit Test'
        remarks TEXT,
        date TEXT NOT NULL,
        FOREIGN KEY (student_id) REFERENCES students (id) ON DELETE CASCADE
    )
    """)
    
    # 7. Connecting Portal / Messages table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS messages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        sender_id INTEGER NOT NULL,
        sender_name TEXT NOT NULL,
        sender_role TEXT NOT NULL,
        receiver_id INTEGER, -- NULL if broadcast announcement
        receiver_name TEXT,
        receiver_role TEXT,
        content TEXT NOT NULL,
        timestamp TEXT NOT NULL,
        is_announcement INTEGER DEFAULT 0
    )
    """)

    # 8. Counseling notes table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS counseling_notes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        student_id INTEGER NOT NULL,
        category TEXT NOT NULL, -- 'Attention', 'Drowsiness', 'Academic', 'Wellness'
        ai_advice TEXT NOT NULL,
        created_at TEXT NOT NULL,
        FOREIGN KEY (student_id) REFERENCES students (id) ON DELETE CASCADE
    )
    """)
    
    conn.commit()
    conn.close()
    
    seed_initial_data()

def seed_initial_data():
    conn = get_db_connection()
    cursor = conn.cursor()
    
    cursor.execute("SELECT count(*) as cnt FROM students")
    if cursor.fetchone()["cnt"] == 0:
        now_str = datetime.now().isoformat()
        today_date = datetime.now().strftime("%Y-%m-%d")
        
        students_data = [
            ("Rahul Sharma", "101"),
            ("Priya Patel", "102"),
            ("Aarav Gupta", "103"),
            ("Sneha Reddy", "104")
        ]
        
        for name, roll in students_data:
            cursor.execute("INSERT INTO students (name, roll_number, created_at) VALUES (?, ?, ?)", (name, roll, now_str))
        conn.commit()
        
        cursor.execute("""
        INSERT INTO users (username, password, role, student_id, name, email, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
        """, ("teacher", "teacher123", "teacher", None, "Prof. Vikram Sharma", "vikram.sharma@educam.edu", now_str))
        
        cursor.execute("""
        INSERT INTO users (username, password, role, student_id, name, email, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
        """, ("student", "student123", "student", 1, "Rahul Sharma", "rahul.101@student.educam.edu", now_str))
        
        cursor.execute("""
        INSERT INTO users (username, password, role, student_id, name, email, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
        """, ("parent", "parent123", "parent", 1, "Mr. Rajesh Sharma", "rajesh.sharma@parent.educam.com", now_str))
        
        for i in range(5):
            d = (datetime.now() - timedelta(days=i)).strftime("%Y-%m-%d")
            if i != 3:
                cursor.execute("INSERT OR IGNORE INTO attendance (student_id, date, timestamp, status) VALUES (1, ?, '09:02:15', 'Present')", (d,))
            cursor.execute("INSERT OR IGNORE INTO attendance (student_id, date, timestamp, status) VALUES (2, ?, '08:58:30', 'Present')", (d,))
            cursor.execute("INSERT OR IGNORE INTO attendance (student_id, date, timestamp, status) VALUES (3, ?, '09:05:11', 'Present')", (d,))
            cursor.execute("INSERT OR IGNORE INTO attendance (student_id, date, timestamp, status) VALUES (4, ?, '09:01:40', 'Present')", (d,))
            
        times = ["09:15:00", "09:30:00", "09:45:00", "10:00:00", "10:15:00", "10:30:00", "11:00:00", "11:15:00", "11:30:00"]
        scores = [92, 88, 85, 90, 78, 82, 65, 55, 80]
        drowsy = [0, 0, 0, 0, 0, 0, 0, 1, 0]
        hands =  [0, 1, 0, 1, 0, 0, 0, 0, 1]
        emotions = ["Focused", "Happy", "Focused", "Focused", "Neutral", "Focused", "Neutral", "Neutral", "Happy"]
        
        for t, s, dr, h, em in zip(times, scores, drowsy, hands, emotions):
            ts = f"{today_date}T{t}"
            cursor.execute("""
            INSERT INTO activeness_logs (student_id, timestamp, attention_score, is_drowsy, hand_raised, emotion)
            VALUES (?, ?, ?, ?, ?, ?)
            """, (1, ts, s, dr, h, em))
            
        academic_data = [
            (1, "Mathematics", 92, 100, "A+", "Midterm", "Excellent problem solving and calculus formulation.", today_date),
            (1, "Physics & Science", 88, 100, "A", "Midterm", "Very keen grasp of optics and kinematics experiments.", today_date),
            (1, "Computer Science", 96, 100, "A+", "Midterm", "Brilliant grasp of Python algorithms and logic.", today_date),
            (1, "English Literature", 84, 100, "A", "Midterm", "Strong essay expression, good textual analysis.", today_date),
            (1, "Social Studies", 79, 100, "B+", "Midterm", "Steady performance, recommended to review cartography.", today_date),
        ]
        
        for rec in academic_data:
            cursor.execute("""
            INSERT INTO academic_reports (student_id, subject, marks, max_marks, grade, exam_type, remarks, date)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """, rec)

        messages_data = [
            (1, "Prof. Vikram Sharma", "teacher", None, "All Students & Parents", "all",
             "📢 Announcement: The Class 10-A Science Project submission is due this Friday by 4:00 PM. Please ensure team abstracts are finalized.",
             (datetime.now() - timedelta(hours=8)).isoformat(), 1),
            
            (3, "Mr. Rajesh Sharma", "parent", 1, "Prof. Vikram Sharma", "teacher",
             "Hello Professor Sharma, thank you for the update on Rahul's attentiveness report. I noticed he had a slight dip in energy around 11:15 AM yesterday. We have adjusted his evening study schedule to ensure he gets 8 hours of sleep.",
             (datetime.now() - timedelta(hours=4)).isoformat(), 0),
            
            (1, "Prof. Vikram Sharma", "teacher", 3, "Mr. Rajesh Sharma", "parent",
             "Dear Mr. Sharma, thank you for following up! Rahul recovered his focus very well and actively participated in the math problem session with two brilliant hand-raises. Keep encouraging his curiosity!",
             (datetime.now() - timedelta(hours=2)).isoformat(), 0),
             
            (2, "Rahul Sharma", "student", 1, "Prof. Vikram Sharma", "teacher",
             "Good evening Sir, could you please clarify if the Computer Science test will include recursion diagrams?",
             (datetime.now() - timedelta(hours=1)).isoformat(), 0),
             
            (1, "Prof. Vikram Sharma", "teacher", 2, "Rahul Sharma", "student",
             "Hi Rahul, yes, recursion tree tracing will be part of Question 3. Review the lecture slides from Tuesday.",
             (datetime.now() - timedelta(minutes=30)).isoformat(), 0)
        ]
        
        for msg in messages_data:
            cursor.execute("""
            INSERT INTO messages (sender_id, sender_name, sender_role, receiver_id, receiver_name, receiver_role, content, timestamp, is_announcement)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, msg)

        conn.commit()
    conn.close()

def authenticate_user(username, password):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("""
        SELECT u.id, u.username, u.role, u.student_id, u.name, u.email, s.name as student_name, s.roll_number
        FROM users u
        LEFT JOIN students s ON u.student_id = s.id
        WHERE u.username = ? AND u.password = ?
    """, (username, password))
    user = cursor.fetchone()
    conn.close()
    return dict(user) if user else None

def register_user(username, password, role, name, email, student_id=None):
    conn = get_db_connection()
    cursor = conn.cursor()
    now_str = datetime.now().isoformat()
    cursor.execute("""
        INSERT INTO users (username, password, role, student_id, name, email, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    """, (username, password, role, student_id, name, email, now_str))
    user_id = cursor.lastrowid
    conn.commit()
    conn.close()
    return user_id

def add_student(name: str, roll_number: str):
    conn = get_db_connection()
    cursor = conn.cursor()
    created_at = datetime.now().isoformat()
    try:
        cursor.execute(
            "INSERT INTO students (name, roll_number, created_at) VALUES (?, ?, ?)",
            (name, roll_number, created_at)
        )
        student_id = cursor.lastrowid
        conn.commit()
        return student_id
    except sqlite3.IntegrityError:
        cursor.execute("SELECT id FROM students WHERE roll_number = ?", (roll_number,))
        row = cursor.fetchone()
        if row:
            return row["id"]
        raise
    finally:
        conn.close()

def log_attendance(student_id: int):
    conn = get_db_connection()
    cursor = conn.cursor()
    now = datetime.now()
    date_str = now.strftime("%Y-%m-%d")
    time_str = now.strftime("%H:%M:%S")
    try:
        cursor.execute(
            "INSERT INTO attendance (student_id, date, timestamp, status) VALUES (?, ?, ?, 'Present')",
            (student_id, date_str, time_str)
        )
        conn.commit()
        success = True
    except sqlite3.IntegrityError:
        success = False
    finally:
        conn.close()
    return success

def get_attendance_report(date_str: str = None):
    conn = get_db_connection()
    cursor = conn.cursor()
    if not date_str:
        date_str = datetime.now().strftime("%Y-%m-%d")
        
    cursor.execute("""
        SELECT s.id, s.name, s.roll_number, a.date, a.timestamp, COALESCE(a.status, 'Absent') as status
        FROM students s
        LEFT JOIN attendance a ON s.id = a.student_id AND a.date = ?
        ORDER BY s.roll_number ASC
    """, (date_str,))
    rows = cursor.fetchall()
    report = []
    for row in rows:
        report.append({
            "id": row["id"],
            "name": row["name"],
            "roll_number": row["roll_number"],
            "present": row["timestamp"] is not None,
            "timestamp": row["timestamp"] or "-",
            "status": row["status"]
        })
    conn.close()
    return report

def get_student_attendance_summary(student_id: int):
    conn = get_db_connection()
    cursor = conn.cursor()
    
    cursor.execute("SELECT count(DISTINCT date) as total_days FROM attendance")
    row = cursor.fetchone()
    total_school_days = max(row["total_days"] if row else 1, 1)
    
    cursor.execute("SELECT count(*) as attended FROM attendance WHERE student_id = ? AND status = 'Present'", (student_id,))
    attended_days = cursor.fetchone()["attended"]
    
    cursor.execute("""
        SELECT date, timestamp, status
        FROM attendance
        WHERE student_id = ?
        ORDER BY date DESC
        LIMIT 10
    """, (student_id,))
    history = [dict(r) for r in cursor.fetchall()]
    conn.close()
    
    pct = round((attended_days / total_school_days) * 100, 1)
    return {
        "student_id": student_id,
        "attended_days": attended_days,
        "total_days": total_school_days,
        "percentage": min(pct, 100.0),
        "history": history
    }

def log_activeness(student_id: int, attention_score: float, is_drowsy: bool, hand_raised: bool, emotion: str):
    conn = get_db_connection()
    cursor = conn.cursor()
    timestamp = datetime.now().isoformat()
    cursor.execute(
        """
        INSERT INTO activeness_logs (student_id, timestamp, attention_score, is_drowsy, hand_raised, emotion)
        VALUES (?, ?, ?, ?, ?, ?)
        """,
        (student_id, timestamp, attention_score, 1 if is_drowsy else 0, 1 if hand_raised else 0, emotion)
    )
    conn.commit()
    conn.close()

def get_student_activeness_summary(student_id: int, limit: int = 50):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("""
        SELECT timestamp, attention_score, is_drowsy, hand_raised, emotion
        FROM activeness_logs
        WHERE student_id = ?
        ORDER BY timestamp DESC
        LIMIT ?
    """, (student_id, limit))
    rows = cursor.fetchall()
    
    cursor.execute("""
        SELECT avg(attention_score) as avg_focus, sum(is_drowsy) as drowsy_cnt, sum(hand_raised) as hand_cnt
        FROM activeness_logs
        WHERE student_id = ?
    """, (student_id,))
    agg = dict(cursor.fetchone() or {})
    
    conn.close()
    return {
        "student_id": student_id,
        "average_focus": round(agg.get("avg_focus") or 82.5, 1),
        "drowsy_episodes": agg.get("drowsy_cnt") or 0,
        "hand_raises": agg.get("hand_cnt") or 0,
        "timeline": [dict(row) for row in reversed(rows)]
    }

def get_class_average_analytics():
    conn = get_db_connection()
    cursor = conn.cursor()
    
    cursor.execute("""
        SELECT strftime('%H:%M', timestamp) as time_bucket, avg(attention_score) as avg_attention, sum(hand_raised) as total_hand_raises
        FROM activeness_logs
        WHERE timestamp >= datetime('now', '-1 day')
        GROUP BY time_bucket
        ORDER BY time_bucket ASC
    """)
    attention_trend = [dict(row) for row in cursor.fetchall()]
    
    cursor.execute("""
        SELECT avg(attention_score) as avg_attention, 
               sum(is_drowsy) as total_drowsy_events,
               sum(hand_raised) as total_hand_raises,
               count(*) as total_samples
        FROM activeness_logs
        WHERE timestamp >= datetime('now', '-1 day')
    """)
    summary_row = cursor.fetchone()
    summary = {
        "avg_attention": round(summary_row["avg_attention"] or 84.0, 1),
        "total_drowsy_events": summary_row["total_drowsy_events"] or 0,
        "total_hand_raises": summary_row["total_hand_raises"] or 0,
        "total_samples": summary_row["total_samples"] or 0
    }
    
    cursor.execute("""
        SELECT emotion, count(*) as count
        FROM activeness_logs
        WHERE timestamp >= datetime('now', '-1 day') AND emotion IS NOT NULL
        GROUP BY emotion
    """)
    emotions = [dict(row) for row in cursor.fetchall()]
    
    conn.close()
    return {
        "summary": summary,
        "attention_trend": attention_trend,
        "emotions": emotions
    }

def get_student_academic_report(student_id: int):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("""
        SELECT id, subject, marks, max_marks, grade, exam_type, remarks, date
        FROM academic_reports
        WHERE student_id = ?
        ORDER BY subject ASC
    """, (student_id,))
    reports = [dict(r) for r in cursor.fetchall()]
    
    total_marks = sum(r["marks"] for r in reports)
    total_max = sum(r["max_marks"] for r in reports)
    overall_percentage = round((total_marks / total_max) * 100, 1) if total_max > 0 else 0
    
    conn.close()
    return {
        "student_id": student_id,
        "overall_percentage": overall_percentage,
        "subjects": reports
    }

def add_academic_report(student_id, subject, marks, max_marks, grade, exam_type, remarks):
    conn = get_db_connection()
    cursor = conn.cursor()
    today_str = datetime.now().strftime("%Y-%m-%d")
    cursor.execute("""
        INSERT INTO academic_reports (student_id, subject, marks, max_marks, grade, exam_type, remarks, date)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    """, (student_id, subject, marks, max_marks, grade, exam_type, remarks, today_str))
    rec_id = cursor.lastrowid
    conn.commit()
    conn.close()
    return rec_id

def get_messages(role: str, user_id: int = None, student_id: int = None):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("""
        SELECT id, sender_id, sender_name, sender_role, receiver_id, receiver_name, receiver_role, content, timestamp, is_announcement
        FROM messages
        ORDER BY id ASC
    """)
    rows = [dict(r) for r in cursor.fetchall()]
    conn.close()
    return rows

def create_message(sender_id, sender_name, sender_role, receiver_id, receiver_name, receiver_role, content, is_announcement=0):
    conn = get_db_connection()
    cursor = conn.cursor()
    ts = datetime.now().isoformat()
    cursor.execute("""
        INSERT INTO messages (sender_id, sender_name, sender_role, receiver_id, receiver_name, receiver_role, content, timestamp, is_announcement)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (sender_id, sender_name, sender_role, receiver_id, receiver_name, receiver_role, content, ts, is_announcement))
    msg_id = cursor.lastrowid
    conn.commit()
    conn.close()
    return msg_id

def generate_ai_counseling(student_id: int, role: str):
    conn = get_db_connection()
    cursor = conn.cursor()
    
    cursor.execute("SELECT name, roll_number FROM students WHERE id = ?", (student_id,))
    student = cursor.fetchone()
    if not student:
        conn.close()
        return {"error": "Student not found"}
        
    cursor.execute("""
        SELECT avg(attention_score) as avg_focus, sum(is_drowsy) as drowsy_cnt, sum(hand_raised) as hand_cnt
        FROM activeness_logs WHERE student_id = ?
    """, (student_id,))
    act = cursor.fetchone()
    
    cursor.execute("""
        SELECT avg(marks * 100.0 / max_marks) as avg_pct FROM academic_reports WHERE student_id = ?
    """, (student_id,))
    acad = cursor.fetchone()
    conn.close()
    
    avg_focus = round((act["avg_focus"] if act else None) or 85.0, 1)
    drowsy_cnt = (act["drowsy_cnt"] if act else 0) or 0
    hand_cnt = (act["hand_cnt"] if act else 0) or 0
    avg_pct = round((acad["avg_pct"] if acad else None) or 88.0, 1)
    
    advice_items = []
    
    if drowsy_cnt > 0:
        advice_items.append({
            "topic": "Circadian Rhythm & Rest Counseling",
            "observation": f"{student['name']} experienced {drowsy_cnt} fatigue episode(s) during lecture hours.",
            "recommendation": "Recommend establishing a rigid 10:00 PM sleep schedule and ensuring 15 minutes of sunlight exposure before morning class.",
            "type": "alert"
        })
    else:
        advice_items.append({
            "topic": "Alertness & Energy",
            "observation": f"{student['name']} maintained continuous alertness without drowsiness.",
            "recommendation": "Maintain the current morning nutrition and sleep routine.",
            "type": "positive"
        })
        
    if avg_focus < 75:
        advice_items.append({
            "topic": "Classroom Engagement & Focus Strategy",
            "observation": f"Average visual attention was measured at {avg_focus}%.",
            "recommendation": "Implement the 25/5 Pomodoro study method and consider front-row seating to minimize peripheral visual distractions.",
            "type": "improvement"
        })
    else:
        advice_items.append({
            "topic": "Deep Focus Performance",
            "observation": f"High attention retention of {avg_focus}% during lectures.",
            "recommendation": "Recommend advancing to peer-tutoring and challenging conceptual application questions.",
            "type": "positive"
        })
        
    advice_items.append({
        "topic": "Academic Correlation Insight",
        "observation": f"Academic score stands at {avg_pct}% with {hand_cnt} question interactions.",
        "recommendation": f"Consistent correlation between active participation and top-tier test grades. Keep asking probing questions during STEM classes.",
        "type": "academic"
    })
    
    return {
        "student_name": student["name"],
        "student_id": student_id,
        "avg_focus": avg_focus,
        "academic_percentage": avg_pct,
        "counseling_insights": advice_items,
        "wellness_score": min(100, int(avg_focus * 0.5 + avg_pct * 0.5))
    }

if __name__ == "__main__":
    init_db()
    print("Database initialized and seeded successfully.")
