import asyncio
import base64
import numpy as np
import cv2
from main import (
    read_root, login, list_students, get_attendance,
    get_academic_report, list_messages, get_counseling_diagnosis,
    ai_assistant_chat, face_login, quick_enroll_face,
    LoginRequest, AIChatRequest, FaceRegisterRequest
)

def create_synthetic_face_base64():
    # Create an image with a drawn face circle, eyes, and mouth for testing
    img = np.zeros((300, 300, 3), dtype=np.uint8)
    cv2.circle(img, (150, 150), 80, (200, 200, 200), -1)
    cv2.circle(img, (120, 130), 12, (0, 0, 0), -1)
    cv2.circle(img, (180, 130), 12, (0, 0, 0), -1)
    cv2.ellipse(img, (150, 180), (35, 15), 0, 0, 180, (0, 0, 0), 4)
    _, buffer = cv2.imencode('.jpg', img)
    return "data:image/jpeg;base64," + base64.b64encode(buffer).decode('utf-8')

def test_all():
    print("Testing EduCam Direct Endpoint Functions...")
    
    # 1. Root
    root = read_root()
    assert root["status"] == "online"
    print("[PASS] Health check OK")

    # 2. Teacher Login
    teacher_user = login(LoginRequest(username="teacher", password="teacher123"))
    assert teacher_user["role"] == "teacher"
    print(f"[PASS] Teacher Login OK ({teacher_user['name']})")

    # 3. Student Login
    student_user = login(LoginRequest(username="student", password="student123"))
    assert student_user["role"] == "student"
    print(f"[PASS] Student Login OK ({student_user['name']})")

    # 4. Parent Login
    parent_user = login(LoginRequest(username="parent", password="parent123"))
    assert parent_user["role"] == "parent"
    print(f"[PASS] Parent Login OK ({parent_user['name']})")

    # 5. List Students
    students = list_students()
    assert len(students) >= 4
    print(f"[PASS] Student roster OK ({len(students)} students)")

    # 6. Attendance report
    attendance = get_attendance()
    assert len(attendance) >= 4
    print(f"[PASS] Attendance sheet OK ({len(attendance)} records)")

    # 7. Academic report
    academic = get_academic_report(1)
    assert academic["overall_percentage"] > 70
    assert len(academic["subjects"]) >= 4
    print(f"[PASS] Academic report OK (Rahul GPA: {academic['overall_percentage']}%)")

    # 8. Messages
    messages = list_messages(role="teacher")
    assert len(messages) >= 4
    print(f"[PASS] Connecting portal messages OK ({len(messages)} threads)")

    # 9. AI Counseling diagnosis
    counseling = get_counseling_diagnosis(student_id=1, role="parent")
    assert "counseling_insights" in counseling
    assert counseling["wellness_score"] > 50
    print(f"[PASS] AI Counseling generated OK (Wellness score: {counseling['wellness_score']})")

    # 10. AI Chat
    chat_resp = ai_assistant_chat(AIChatRequest(
        message="How to improve focus in class?",
        role="student",
        student_id=1,
        student_name="Rahul"
    ))
    assert "Pomodoro" in chat_resp["reply"]
    print("[PASS] AI Study Companion Chat OK")

    # 11. Biometric Real-Time Face Login (no face / blank frame rejection)
    blank_img = np.zeros((100, 100, 3), dtype=np.uint8)
    _, buf = cv2.imencode('.jpg', blank_img)
    blank_b64 = "data:image/jpeg;base64," + base64.b64encode(buf).decode('utf-8')
    
    face_resp = asyncio.run(face_login(FaceRegisterRequest(image_base64=blank_b64)))
    assert face_resp["authenticated"] is False
    assert face_resp["reason"] == "no_face_detected"
    print("[PASS] Real-time Biometric Rejection test OK (Correctly rejects non-face frames)")

    print("\nALL 11 EDUCAM API SUITE TESTS (INCLUDING BIOMETRICS) PASSED WITH 100% SUCCESS!")

if __name__ == "__main__":
    test_all()
