# EduCam - AI Camera Attendance, Activeness & Multi-Role Classroom Platform

EduCam is an intelligent classroom management platform that automates attendance via camera face recognition, tracks student focus & drowsiness in real-time, provides dedicated portals for Teachers, Students, and Parents, manages academic grades, and features built-in AI counseling.

---

## 🌟 Key Features

1. **Automated Attendance via Camera Biometrics**:
   - High-speed face recognition logs student attendance with exact timestamps.
   - Manual override toggle for teachers (`Present` / `Absent`).
2. **Real-Time Activeness & Fatigue Telemetry**:
   - Gaze direction estimation (Center, Looking Left/Right, Looking Away).
   - Continuous drowsiness and fatigue alerts based on sustained eye closures.
   - Hand-raise detection for classroom participation tracking.
   - Live computer vision HUD with bounding boxes and emotional classification.
3. **Multi-Role Portals**:
   - **Teacher Portal**: Live camera cockpit, automated attendance sheet, student roster, gradebook, and class broadcasts.
   - **Student Portal**: Attendance streak, daily focus and energy timeline, midterm report cards, and AI study tutor.
   - **Parent Portal**: Real-time arrival verification, classroom fatigue alerts, academic marks overview, direct message line to teachers, and AI pediatric counseling.
4. **3-Way Teacher • Student • Parent Connecting Portal**:
   - Broadcast announcements and private 1-on-1 direct messaging between all parties.
5. **Academic Gradebook**:
   - Record and manage subject marks, percentages, exam terms, and qualitative behavioral remarks.
6. **AI Counseling & Help Assistant**:
   - Tailored counseling for students (study strategies, Pomodoro timers, exam stress), parents (sleep routines, screen time), and teachers (engagement pedagogy).

---

## 🚀 Quick Start

### 1. Backend Setup (FastAPI & OpenCV)
```bash
cd backend
python -m venv .venv

# On Windows:
.venv\Scripts\activate
# On macOS/Linux:
source .venv/bin/activate

pip install -r requirements.txt
python main.py
```
Backend runs on: `http://127.0.0.1:8000` (API Docs: `http://127.0.0.1:8000/docs`)

### 2. Frontend Setup (React & Vite)
```bash
cd frontend
npm install
npm run dev
```
Frontend runs on: `http://localhost:5173/`

---

## 🔑 Demo Credentials

| Role | Username | Password | Default Profile |
| :--- | :--- | :--- | :--- |
| **Teacher** | `teacher` | `teacher123` | Prof. Vikram Sharma |
| **Student** | `student` | `student123` | Rahul Sharma (Roll: 101) |
| **Parent** | `parent` | `parent123` | Mr. Rajesh Sharma |

---

## 🛠️ Tech Stack
- **Backend**: FastAPI, OpenCV, Uvicorn, SQLite3, NumPy
- **Frontend**: React, Vite, Lucide Icons, Glassmorphic CSS
- **AI/ML**: Haar Cascade Classifiers, Face Recognition, Geometric Gaze & Fatigue Estimation
