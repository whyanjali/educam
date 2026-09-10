import cv2
import threading
import time
from database import log_attendance, log_activeness
from analyzer import ClassroomAnalyzer
from face_recognizer import FaceRecognizer

class CameraManager:
    _instance = None
    _lock = threading.Lock()

    def __new__(cls, *args, **kwargs):
        with cls._lock:
            if cls._instance is None:
                cls._instance = super(CameraManager, cls).__new__(cls)
                cls._instance._initialized = False
            return cls._instance

    def __init__(self):
        with self._lock:
            if self._initialized:
                return
            self.cap = None
            self.running = False
            self.thread = None
            self.latest_frame = None
            self.annotated_frame = None
            self.latest_metrics = []
            
            # Sub-modules
            self.analyzer = ClassroomAnalyzer()
            self.recognizer = FaceRecognizer()
            
            # Logging throttle
            # key: student_id, value: timestamp of last database log
            self.last_log_times = {}
            self.log_interval = 5.0 # log activeness stats every 5 seconds
            
            # Attendance cache to minimize redundant updates
            self.logged_attendance_today = set()
            
            self._initialized = True

    def start_camera(self, camera_index=0):
        if self.running:
            return True
            
        self.cap = cv2.VideoCapture(camera_index)
        if not self.cap.isOpened():
            print(f"Error: Could not open webcam index {camera_index}")
            return False
            
        self.running = True
        self.thread = threading.Thread(target=self._capture_loop, daemon=True)
        self.thread.start()
        print("Camera capture thread started.")
        return True

    def stop_camera(self):
        self.running = False
        if self.thread:
            self.thread.join(timeout=2.0)
            self.thread = None
        if self.cap:
            self.cap.release()
            self.cap = None
        print("Camera capture thread stopped.")

    def _capture_loop(self):
        consecutive_failures = 0
        while self.running:
            try:
                if self.cap is None or not self.cap.isOpened():
                    time.sleep(0.5)
                    continue

                ret, frame = self.cap.read()
                if not ret or frame is None:
                    consecutive_failures += 1
                    time.sleep(0.05)
                    if consecutive_failures > 60:
                        try:
                            self.cap.release()
                            self.cap = cv2.VideoCapture(0)
                        except Exception:
                            pass
                        consecutive_failures = 0
                    continue

                consecutive_failures = 0
                # Flip horizontally for natural mirror effect
                frame = cv2.flip(frame, 1)
                
                # Process the frame
                annotated, metrics = self.process_frame(frame)
                
                # Update cache
                with self._lock:
                    self.latest_frame = frame
                    self.annotated_frame = annotated
                    self.latest_metrics = metrics
                    
                # Sleep briefly to control frame rate (approx 15-20 FPS)
                time.sleep(0.05)
            except Exception as err:
                time.sleep(0.1)

    def process_frame(self, frame):
        """
        Runs face recognition and engagement analysis on a frame.
        Performs real-time logging to database for attendance and activeness.
        """
        # 1. Analyze landmarks (Gaze, Drowsiness, Hand Raise, Emotion)
        annotated_frame, analytics_list = self.analyzer.analyze_frame(frame)
        
        # 2. Match faces
        now = time.time()
        for idx, student_data in enumerate(analytics_list):
            face_box = student_data["face_box"]
            
            # Try to recognize this student
            match = self.recognizer.recognize(frame, face_box)
            if match:
                student_id = match["student_id"]
                student_name = match["name"]
                
                # Update analytics label with student name
                student_data["student_id"] = student_id
                student_data["name"] = student_name
                
                # Visual overlay update
                cv2.putText(
                    annotated_frame, f"{student_name} ({match['confidence']})", 
                    (face_box[0], face_box[1] - 30),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 255, 0), 2
                )
                
                # Perform database logging
                # a) Attendance Logging
                if student_id not in self.logged_attendance_today:
                    success = log_attendance(student_id)
                    if success:
                        print(f"Attendance logged for {student_name} today!")
                    self.logged_attendance_today.add(student_id)
                    
                # b) Activeness Logging (Throttled)
                last_logged = self.last_log_times.get(student_id, 0)
                if now - last_logged >= self.log_interval:
                    log_activeness(
                        student_id=student_id,
                        attention_score=student_data["attention_score"],
                        is_drowsy=student_data["is_drowsy"],
                        hand_raised=student_data["hand_raised"],
                        emotion=student_data["emotion"]
                    )
                    self.last_log_times[student_id] = now
            else:
                student_data["student_id"] = None
                student_data["name"] = "Unknown"
                
        return annotated_frame, analytics_list

    def get_latest_frame_bytes(self):
        with self._lock:
            if self.annotated_frame is None:
                return None
            ret, jpeg = cv2.imencode('.jpg', self.annotated_frame)
            if ret:
                return jpeg.tobytes()
            return None

    def get_telemetry(self):
        with self._lock:
            return self.latest_metrics

    def register_new_student_face(self, student_id, frame=None, face_box=None):
        """
        Registers student face embedding from either live camera or custom uploaded frame.
        """
        # If frame/box aren't provided, use the latest live frame
        if frame is None or face_box is None:
            with self._lock:
                if self.latest_frame is None or len(self.latest_metrics) == 0:
                    return False
                frame = self.latest_frame.copy()
                # Use first face detected in the live frame
                face_box = self.latest_metrics[0]["face_box"]
                
        # Register and retrain
        success = self.recognizer.register_student(student_id, frame, face_box)
        return success
