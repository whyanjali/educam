import asyncio
import base64
import time
from datetime import datetime
from fastapi import FastAPI, HTTPException, WebSocket, UploadFile, File, Form
from fastapi.responses import StreamingResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, List
import numpy as np
import cv2
import os

from database import (
    init_db, add_student, get_attendance_report, 
    get_class_average_analytics, get_db_connection, 
    get_student_activeness_summary, get_student_attendance_summary,
    authenticate_user, register_user, get_student_academic_report,
    add_academic_report, get_messages, create_message, generate_ai_counseling
)
from camera import CameraManager

app = FastAPI(title="Educam Attendance, Activeness & Counseling Platform")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

camera_manager = CameraManager()

# --- Request / Response Models ---
class LoginRequest(BaseModel):
    username: str
    password: str

class RegisterRequest(BaseModel):
    username: str
    password: str
    role: str
    name: str
    email: Optional[str] = None
    student_id: Optional[int] = None

class StudentCreate(BaseModel):
    name: str
    roll_number: str

class FaceRegisterRequest(BaseModel):
    image_base64: str

class AcademicCreateRequest(BaseModel):
    student_id: int
    subject: str
    marks: float
    max_marks: float
    grade: str
    exam_type: str
    remarks: Optional[str] = ""

class MessageCreateRequest(BaseModel):
    sender_id: int
    sender_name: str
    sender_role: str
    receiver_id: Optional[int] = None
    receiver_name: Optional[str] = "All"
    receiver_role: Optional[str] = "all"
    content: str
    is_announcement: Optional[int] = 0

class ManualAttendanceRequest(BaseModel):
    student_id: int
    status: str # 'Present' or 'Absent'

class AIChatRequest(BaseModel):
    message: str
    role: str # 'student', 'parent', 'teacher'
    student_id: Optional[int] = None
    student_name: Optional[str] = "Student"

def decode_base64_image(base64_str: str):
    if "," in base64_str:
        base64_str = base64_str.split(",")[1]
    img_data = base64.b64decode(base64_str)
    nparr = np.frombuffer(img_data, np.uint8)
    return cv2.imdecode(nparr, cv2.IMREAD_COLOR)

@app.on_event("startup")
async def startup_event():
    init_db()
    # Try starting camera
    success = camera_manager.start_camera(0)
    if success:
        print("Webcam initialized successfully.")
    else:
        print("No local webcam found; ready for browser stream / manual mode.")

@app.on_event("shutdown")
async def shutdown_event():
    camera_manager.stop_camera()

@app.get("/")
def read_root():
    return {"status": "online", "system": "Educam AI Classroom Portal"}

# --- Auth Endpoints ---
@app.post("/api/auth/login")
def login(req: LoginRequest):
    user = authenticate_user(req.username, req.password)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid username or password")
    return user

@app.post("/api/auth/face-login")
async def face_login(req: FaceRegisterRequest):
    try:
        frame = decode_base64_image(req.image_base64)
        if frame is None or frame.size == 0:
            return {"authenticated": False, "reason": "invalid_frame", "message": "Could not decode camera image."}

        gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
        faces = camera_manager.analyzer.face_cascade.detectMultiScale(
            gray, scaleFactor=1.2, minNeighbors=4, minSize=(60, 60)
        )

        if len(faces) == 0:
            return {
                "authenticated": False, 
                "reason": "no_face_detected", 
                "message": "No face detected in camera viewport. Please center your face."
            }

        # Take largest face
        largest_face = max(faces, key=lambda b: b[2] * b[3])
        match = camera_manager.recognizer.recognize(frame, largest_face)

        if match:
            student_id = match["student_id"]
            confidence = match["confidence"]
            
            conn = get_db_connection()
            cursor = conn.cursor()
            cursor.execute("""
                SELECT u.id, u.username, u.role, u.student_id, u.name, u.email, s.name as student_name, s.roll_number
                FROM users u
                LEFT JOIN students s ON u.student_id = s.id
                WHERE u.student_id = ? OR (u.id = ? AND u.role = 'teacher')
                LIMIT 1
            """, (student_id, student_id))
            user = cursor.fetchone()
            conn.close()

            if user:
                user_dict = dict(user)
                # Automatically log attendance for today
                from database import log_attendance
                log_attendance(student_id)

                return {
                    "authenticated": True,
                    "user": user_dict,
                    "confidence": confidence,
                    "message": f"Biometric Match Verified: {user_dict['name']} ({user_dict['role'].capitalize()})"
                }
            else:
                # Default to student Rahul if student 1
                return {
                    "authenticated": True,
                    "user": {
                        "id": student_id,
                        "username": "student",
                        "role": "student",
                        "student_id": student_id,
                        "name": match["name"],
                        "student_name": match["name"],
                        "roll_number": "101"
                    },
                    "confidence": confidence,
                    "message": f"Biometric Match Verified: {match['name']} (Student)"
                }

        return {
            "authenticated": False,
            "reason": "unrecognized_face",
            "message": "Face detected, but biometric profile not recognized. Click 'Enroll My Face' to register."
        }
    except Exception as e:
        return {"authenticated": False, "reason": "error", "message": f"Biometric processing error: {str(e)}"}

@app.post("/api/auth/quick-enroll-face")
async def quick_enroll_face(req: FaceRegisterRequest, student_id: int = 1, role: str = "student"):
    try:
        frame = decode_base64_image(req.image_base64)
        if frame is None or frame.size == 0:
            raise HTTPException(status_code=400, detail="Invalid image payload.")

        gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
        faces = camera_manager.analyzer.face_cascade.detectMultiScale(
            gray, scaleFactor=1.2, minNeighbors=4, minSize=(60, 60)
        )

        if len(faces) == 0:
            raise HTTPException(status_code=400, detail="No face detected to enroll. Please center your face.")

        largest_face = max(faces, key=lambda b: b[2] * b[3])
        success = camera_manager.recognizer.register_student(student_id, frame, largest_face)

        if success:
            conn = get_db_connection()
            cursor = conn.cursor()
            cursor.execute("SELECT name FROM students WHERE id = ?", (student_id,))
            st = cursor.fetchone()
            name = st["name"] if st else ("Prof. Vikram Sharma" if role == "teacher" else "Rahul Sharma")
            conn.close()

            return {
                "status": "success",
                "message": f"Biometric profile successfully registered for {name}! You can now login via Face ID."
            }
        else:
            raise HTTPException(status_code=500, detail="Failed to train recognizer with face image.")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/auth/register")
def register(req: RegisterRequest):
    try:
        user_id = register_user(req.username, req.password, req.role, req.name, req.email, req.student_id)
        return {"id": user_id, "username": req.username, "role": req.role, "name": req.name}
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Registration error: {str(e)}")

# --- Students & Attendance ---
@app.get("/api/students")
def list_students():
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT id, name, roll_number, created_at FROM students ORDER BY id ASC")
    students = [dict(row) for row in cursor.fetchall()]
    conn.close()
    
    faces_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), "faces")
    for s in students:
        s["has_face"] = False
        if os.path.exists(faces_dir):
            for file in os.listdir(faces_dir):
                if file.startswith(f"student_{s['id']}_") or file.startswith(f"student_{s['id']}."):
                    s["has_face"] = True
                    break
    return students

@app.post("/api/students")
def create_student(student: StudentCreate):
    try:
        student_id = add_student(student.name, student.roll_number)
        return {"id": student_id, "name": student.name, "roll_number": student.roll_number}
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to create student: {str(e)}")

@app.post("/api/students/{student_id}/register-face")
def register_face_live(student_id: int):
    success = camera_manager.register_new_student_face(student_id)
    if success:
        return {"status": "success", "message": "Face registered successfully using live feed."}
    else:
        raise HTTPException(status_code=400, detail="Failed to capture face from camera. Please ensure face is visible.")

@app.post("/api/students/{student_id}/register-face-upload")
async def register_face_upload(student_id: int, request: FaceRegisterRequest):
    try:
        frame = decode_base64_image(request.image_base64)
        if frame is None or frame.size == 0:
            raise HTTPException(status_code=400, detail="Invalid image payload.")
            
        height, width, _ = frame.shape
        rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        mesh_results = camera_manager.analyzer.face_mesh.process(rgb_frame)
        
        if not mesh_results.multi_face_landmarks:
            raise HTTPException(status_code=400, detail="No face detected in the photo.")
            
        face_landmarks = mesh_results.multi_face_landmarks[0]
        landmarks_px = [(int(lm.x * width), int(lm.y * height)) for lm in face_landmarks.landmark]
        x_coords = [p[0] for p in landmarks_px]
        y_coords = [p[1] for p in landmarks_px]
        
        x_min, x_max = min(x_coords), max(x_coords)
        y_min, y_max = min(y_coords), max(y_coords)
        
        face_box = [x_min, y_min, x_max - x_min, y_max - y_min]
        success = camera_manager.recognizer.register_student(student_id, frame, face_box)
        
        if success:
            return {"status": "success", "message": "Face registered successfully via snapshot."}
        else:
            raise HTTPException(status_code=500, detail="Failed to train recognizer model.")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Face registration failed: {str(e)}")

@app.get("/api/attendance")
def get_attendance(date: Optional[str] = None):
    return get_attendance_report(date)

@app.post("/api/attendance/mark-manual")
def mark_manual_attendance(req: ManualAttendanceRequest):
    conn = get_db_connection()
    cursor = conn.cursor()
    today_str = datetime.now().strftime("%Y-%m-%d")
    time_str = datetime.now().strftime("%H:%M:%S")
    cursor.execute("""
        INSERT INTO attendance (student_id, date, timestamp, status)
        VALUES (?, ?, ?, ?)
        ON CONFLICT(student_id, date) DO UPDATE SET status = excluded.status, timestamp = excluded.timestamp
    """, (req.student_id, today_str, time_str, req.status))
    conn.commit()
    conn.close()
    return {"status": "success", "message": f"Updated attendance for student {req.student_id} to {req.status}"}

@app.get("/api/student/{student_id}/attendance-summary")
def get_student_attendance(student_id: int):
    return get_student_attendance_summary(student_id)

@app.get("/api/student/{student_id}/activeness-summary")
def get_student_activeness(student_id: int):
    return get_student_activeness_summary(student_id)

@app.get("/api/analytics/summary")
def get_analytics_summary():
    return get_class_average_analytics()

# --- Academic Reports ---
@app.get("/api/academic/{student_id}")
def get_academic_report(student_id: int):
    return get_student_academic_report(student_id)

@app.post("/api/academic")
def create_academic_entry(req: AcademicCreateRequest):
    rec_id = add_academic_report(
        req.student_id, req.subject, req.marks, req.max_marks, 
        req.grade, req.exam_type, req.remarks
    )
    return {"status": "success", "id": rec_id}

# --- Connecting Portal / Messages ---
@app.get("/api/messages")
def list_messages(role: str = "teacher", user_id: Optional[int] = None, student_id: Optional[int] = None):
    return get_messages(role, user_id, student_id)

@app.post("/api/messages")
def send_message(req: MessageCreateRequest):
    msg_id = create_message(
        req.sender_id, req.sender_name, req.sender_role,
        req.receiver_id, req.receiver_name, req.receiver_role,
        req.content, req.is_announcement or 0
    )
    return {"status": "success", "id": msg_id}

# --- AI Assistant & Counseling ---
@app.get("/api/ai/counseling/{student_id}")
def get_counseling_diagnosis(student_id: int, role: str = "student"):
    return generate_ai_counseling(student_id, role)

@app.post("/api/ai/chat")
def ai_assistant_chat(req: AIChatRequest):
    msg = req.message.lower()
    role = req.role.lower()
    name = req.student_name or "Student"
    
    # Contextual counseling intelligence
    if role == "student":
        if "focus" in msg or "attention" in msg or "distract" in msg:
            response = (
                f"Hello {name}! To improve your attention during lectures: \n\n"
                "1. **Pomodoro Technique**: Focus intensely for 25 minutes, then take a 5-minute breather.\n"
                "2. **Active Note Taking**: Summarize the teacher's key ideas in your own words rather than copying word-for-word.\n"
                "3. **Ask 1 Question Per Class**: Active participation sends alertness signals to your prefrontal cortex!"
            )
        elif "sleep" in msg or "tired" in msg or "drowsy" in msg:
            response = (
                f"I noticed from the EduCam logs that sleepiness can affect afternoon retention! \n\n"
                "• Target 8 hours of uninterrupted sleep.\n"
                "• Avoid blue-light smartphone screens at least 45 minutes before bedtime.\n"
                "• Hydrate with cold water before the 4th period."
            )
        elif "exam" in msg or "stress" in msg or "grade" in msg:
            response = (
                f"Exam stress is completely natural, {name}. Your current academic score reflects strong conceptual capability! \n\n"
                "• Break your syllabus down into daily micro-goals.\n"
                "• Practice with past year questions under timed conditions.\n"
                "• Remember to take 10 deep belly breaths before stepping into the examination hall."
            )
        else:
            response = (
                f"Hi {name}! I'm your EduCam AI Study Companion. You can ask me how to improve your focus, "
                "get personalized study timetables, or analyze your classroom engagement trends anytime!"
            )
            
    elif role == "parent":
        if "sleep" in msg or "drowsy" in msg or "tired" in msg:
            response = (
                f"Dear Parent, EduCam's vision tracking helps detect fatigue early. \n\n"
                f"• If {name} feels drowsy in morning sessions, ensure a light, protein-rich breakfast rather than high-glycemic carbohydrates.\n"
                "• Encourage an electronics curfew at 9:45 PM.\n"
                "• A 15-minute morning walk in sunlight significantly resets the circadian rhythm."
            )
        elif "grade" in msg or "marks" in msg or "improve" in msg:
            response = (
                f"Regarding {name}'s academic growth: \n\n"
                "• Maintain positive reinforcement for effort rather than just end test scores.\n"
                "• Review the subject-wise breakdown in the Academic Report tab.\n"
                "• Feel free to message Prof. Vikram Sharma directly through the Connecting Portal to coordinate reinforcement topics."
            )
        else:
            response = (
                f"Welcome to the EduCam Parental Counseling Assistant. I am here to help you interpret {name}'s "
                "attendance habits, classroom focus metrics, and academic milestones with personalized recommendations."
            )
            
    else: # Teacher
        if "engage" in msg or "attention" in msg or "distract" in msg:
            response = (
                "Prof. Sharma, here are high-impact classroom engagement recommendations based on current telemetry: \n\n"
                "1. **Think-Pair-Share**: Break up 40-minute monologues every 15 minutes with a 90-second peer discussion.\n"
                "2. **Pop-Quiz Check-in**: Use rapid verbal questions to re-engage students whose gaze ratio is drifting.\n"
                "3. **Physical Micro-Break**: A quick 30-second stand-and-stretch eliminates mid-day drowsiness spikes."
            )
        elif "parent" in msg or "notice" in msg:
            response = (
                "Suggested announcement draft for parents: \n\n"
                "\"Dear Parents, we are entering our midterm revision cycle. Please support your child with a regular study "
                "and sleep schedule. Review their real-time engagement and attendance on EduCam.\""
            )
        else:
            response = (
                "Hello Prof. Vikram Sharma! EduCam AI Classroom Assistant is monitoring live engagement telemetry. "
                "Ask me for lesson engagement strategies, drowsiness pattern analysis, or parent communication drafts."
            )
            
    return {"reply": response, "timestamp": datetime.now().isoformat()}

# --- Camera Streaming Endpoints ---
@app.get("/api/camera/start")
def start_camera_feed():
    success = camera_manager.start_camera()
    if success:
        return {"status": "success", "message": "Camera started."}
    else:
        raise HTTPException(status_code=500, detail="Could not open camera hardware.")

@app.get("/api/camera/stop")
def stop_camera_feed():
    camera_manager.stop_camera()
    return {"status": "success", "message": "Camera stopped."}

@app.get("/api/camera/status")
def get_camera_status():
    return {"running": camera_manager.running}

def gen_frames():
    while True:
        frame_bytes = camera_manager.get_latest_frame_bytes()
        if frame_bytes:
            yield (b'--frame\r\n'
                   b'Content-Type: image/jpeg\r\n\r\n' + frame_bytes + b'\r\n')
        time.sleep(0.06)

@app.get("/api/camera/feed")
def video_feed():
    if not camera_manager.running:
        camera_manager.start_camera()
    return StreamingResponse(
        gen_frames(),
        media_type='multipart/x-mixed-replace; boundary=frame'
    )

@app.websocket("/ws/live")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    try:
        while True:
            telemetry = camera_manager.get_telemetry()
            student_telemetry = []
            for item in telemetry:
                student_telemetry.append({
                    "name": item.get("name", "Unknown"),
                    "student_id": item.get("student_id"),
                    "attention_score": item["attention_score"],
                    "is_drowsy": item["is_drowsy"],
                    "gaze_direction": item["gaze_direction"],
                    "hand_raised": item["hand_raised"],
                    "emotion": item["emotion"],
                    "face_box": item["face_box"]
                })
                
            await websocket.send_json({
                "camera_running": camera_manager.running,
                "students": student_telemetry,
                "timestamp": time.time()
            })
            await asyncio.sleep(0.25)
    except Exception:
        pass
    finally:
        try:
            await websocket.close()
        except:
            pass

if __name__ == "__main__":
    import uvicorn
    init_db()
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)
