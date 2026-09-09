import asyncio
import base64
import numpy as np
import cv2
from main import (
    read_root, login, list_students, get_attendance,
    get_academic_report, list_messages, get_counseling_diagnosis,
    ai_assistant_chat, face_login, register,
    create_student_endpoint, update_student_endpoint, delete_student_endpoint,
    LoginRequest, RegisterRequest, StudentCreate, StudentUpdate, AIChatRequest, FaceRegisterRequest
)

def test_all():
    print("Testing EduCam Email Auth, Registration & Student CRUD...")
    
    # 1. Root
    root = read_root()
    assert root["status"] == "online"
    print("[PASS] Health check OK")

    # 2. Email Login as Teacher
    teacher_user = login(LoginRequest(email="teacher@educam.edu", password="teacher123"))
    assert teacher_user["role"] == "teacher"
    assert teacher_user["email"] == "teacher@educam.edu"
    print(f"[PASS] Teacher Email Login OK ({teacher_user['name']})")

    # 3. Email Login as Student
    student_user = login(LoginRequest(email="student@educam.edu", password="student123"))
    assert student_user["role"] == "student"
    print(f"[PASS] Student Email Login OK ({student_user['name']})")

    # 4. Email Login as Parent
    parent_user = login(LoginRequest(email="parent@educam.edu", password="parent123"))
    assert parent_user["role"] == "parent"
    print(f"[PASS] Parent Email Login OK ({parent_user['name']})")

    # 5. Student Registration with Roll & Grade
    import time
    ts = int(time.time())
    reg_student = register(RegisterRequest(
        name=f"Rohit Verma {ts}",
        email=f"rohit_{ts}@educam.edu",
        password="rohitpass123",
        role="student",
        roll_number=str(ts % 9000 + 1000),
        grade="Class 10-B"
    ))
    assert reg_student["role"] == "student"
    assert reg_student["student_id"] is not None
    print(f"[PASS] Student Registration OK ({reg_student['name']} - ID #{reg_student['student_id']})")

    # 6. Parent Registration linked to child roll 102
    reg_parent = register(RegisterRequest(
        name=f"Mrs. Kavita Patel {ts}",
        email=f"kavita_{ts}@parent.educam.com",
        password="patelpass123",
        role="parent",
        child_roll_number="102"
    ))
    assert reg_parent["role"] == "parent"
    assert reg_parent["student_id"] == 2 # Priya Patel is roll 102
    print(f"[PASS] Parent Registration & Child Linking OK ({reg_parent['name']} linked to Student #{reg_parent['student_id']})")

    # 7. Student CRUD: Create Student
    created_stu = create_student_endpoint(StudentCreate(
        name="Ananya Sen",
        roll_number=f"R{ts % 9000 + 1000}",
        email=f"ananya_{ts}@student.educam.edu",
        grade="Class 10-A"
    ))
    new_id = created_stu["id"]
    print(f"[PASS] Student CRUD [CREATE] OK (Ananya Sen, ID #{new_id})")

    # 8. Student CRUD: Read Students
    all_students = list_students()
    found = any(s["id"] == new_id for s in all_students)
    assert found is True
    print(f"[PASS] Student CRUD [READ] OK (Total {len(all_students)} student records)")

    # 9. Student CRUD: Update Student
    update_res = update_student_endpoint(new_id, StudentUpdate(
        name="Ananya Sen (Updated)",
        roll_number="109",
        email="ananya.updated@student.educam.edu",
        grade="Class 10-A+"
    ))
    assert update_res["status"] == "success"
    print(f"[PASS] Student CRUD [UPDATE] OK (#{new_id} updated)")

    # 10. Student CRUD: Delete Student
    del_res = delete_student_endpoint(new_id)
    assert del_res["status"] == "success"
    remaining_students = list_students()
    assert not any(s["id"] == new_id for s in remaining_students)
    print(f"[PASS] Student CRUD [DELETE] OK (#{new_id} cleanly removed)")

    # 11. Attendance Sheet
    attendance = get_attendance()
    assert len(attendance) >= 4
    print(f"[PASS] Attendance sheet OK ({len(attendance)} records)")

    # 12. Academic Report Card
    academic = get_academic_report(1)
    assert academic["overall_percentage"] > 70
    print(f"[PASS] Academic report OK (Rahul GPA: {academic['overall_percentage']}%)")

    # 13. Connecting Portal Messages
    messages = list_messages(role="teacher")
    assert len(messages) >= 4
    print(f"[PASS] Connecting portal messages OK ({len(messages)} threads)")

    # 14. AI Counseling Diagnosis
    counseling = get_counseling_diagnosis(student_id=1, role="parent")
    assert "counseling_insights" in counseling
    print(f"[PASS] AI Counseling generated OK (Wellness score: {counseling['wellness_score']})")

    # 15. Biometric Face Login Rejection
    blank_img = np.zeros((100, 100, 3), dtype=np.uint8)
    _, buf = cv2.imencode('.jpg', blank_img)
    blank_b64 = "data:image/jpeg;base64," + base64.b64encode(buf).decode('utf-8')
    face_resp = asyncio.run(face_login(FaceRegisterRequest(image_base64=blank_b64)))
    assert face_resp["authenticated"] is False
    print("[PASS] Biometric Security Check OK")

    print("\nALL 15 EDUCAM ENDPOINT & CRUD TESTS PASSED WITH 100% SUCCESS!")

if __name__ == "__main__":
    test_all()
