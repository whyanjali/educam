import cv2
import os
import time
import math
import numpy as np

MODELS_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "models")
FACE_CASCADE_PATH = os.path.join(MODELS_DIR, "haarcascade_frontalface_default.xml")
EYE_CASCADE_PATH = os.path.join(MODELS_DIR, "haarcascade_eye.xml")
SMILE_CASCADE_PATH = os.path.join(MODELS_DIR, "haarcascade_smile.xml")

class ClassroomAnalyzer:
    def __init__(self):
        self.face_cascade = cv2.CascadeClassifier(FACE_CASCADE_PATH)
        self.eye_cascade = cv2.CascadeClassifier(EYE_CASCADE_PATH)
        self.smile_cascade = cv2.CascadeClassifier(SMILE_CASCADE_PATH)
        
        # Track continuous eye closures for drowsiness (key: student_idx, val: [timestamps])
        self.drowsy_history = {}
        self.drowsy_threshold_sec = 1.5

    def analyze_frame(self, frame):
        if frame is None or frame.size == 0:
            return frame, []

        height, width, _ = frame.shape
        gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
        annotated_frame = frame.copy()
        
        # 1. Detect Hand Raises (detect significant contours in upper portion of frame outside face boxes)
        hsv = cv2.cvtColor(frame, cv2.COLOR_BGR2HSV)
        # Skin color detection in HSV
        lower_skin = np.array([0, 20, 70], dtype=np.uint8)
        upper_skin = np.array([20, 255, 255], dtype=np.uint8)
        mask = cv2.inRange(hsv, lower_skin, upper_skin)
        
        # 2. Detect Faces
        faces = self.face_cascade.detectMultiScale(
            gray, 
            scaleFactor=1.2, 
            minNeighbors=5, 
            minSize=(60, 60)
        )
        
        # Check for hand raises above lowest face y-coordinate
        hand_raised_global = False
        if len(faces) > 0:
            min_face_y = min(y for (x, y, w, h) in faces)
            if min_face_y > 40: # If there is headroom above the face
                upper_mask = mask[0:min_face_y, :]
                contours, _ = cv2.findContours(upper_mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
                for cnt in contours:
                    if cv2.contourArea(cnt) > 2500: # Sufficient hand/arm area
                        hand_raised_global = True
                        x_h, y_h, w_h, h_h = cv2.boundingRect(cnt)
                        cv2.rectangle(annotated_frame, (x_h, y_h), (x_h + w_h, y_h + h_h), (0, 255, 0), 2)
                        cv2.putText(
                            annotated_frame, "HAND RAISED / PARTICIPATING", (x_h, max(20, y_h - 10)),
                            cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 255, 0), 2
                        )
                        break

        students_analytics = []
        now = time.time()

        for idx, (x, y, w, h) in enumerate(faces):
            roi_gray = gray[y:y+h, x:x+w]
            roi_color = annotated_frame[y:y+h, x:x+w]
            
            # Detect eyes within the upper 65% of the face region
            eye_region_gray = roi_gray[0:int(h * 0.65), :]
            eyes = self.eye_cascade.detectMultiScale(
                eye_region_gray, 
                scaleFactor=1.15, 
                minNeighbors=4, 
                minSize=(20, 20)
            )
            
            # Detect smiles within the lower 50% of the face region
            smile_region_gray = roi_gray[int(h * 0.5):, :]
            smiles = self.smile_cascade.detectMultiScale(
                smile_region_gray, 
                scaleFactor=1.7, 
                minNeighbors=20, 
                minSize=(25, 25)
            )
            
            num_eyes = len(eyes)
            is_drowsy = False
            
            # Drowsiness detection logic: eyes closed or head tilted down
            if num_eyes == 0:
                if idx not in self.drowsy_history:
                    self.drowsy_history[idx] = now
                elif now - self.drowsy_history[idx] >= self.drowsy_threshold_sec:
                    is_drowsy = True
            else:
                self.drowsy_history[idx] = now
                
            # Gaze & Focus Estimation
            gaze_dir = "Center"
            attention_score = 90
            
            if num_eyes >= 2:
                # Compare horizontal eye centers
                eye_centers = sorted([ex + ew // 2 for (ex, ey, ew, eh) in eyes[:2]])
                midpoint = (eye_centers[0] + eye_centers[1]) / 2.0
                face_midpoint = w / 2.0
                diff = (midpoint - face_midpoint) / w
                
                if diff < -0.08:
                    gaze_dir = "Looking Left"
                    attention_score = 65
                elif diff > 0.08:
                    gaze_dir = "Looking Right"
                    attention_score = 65
                else:
                    gaze_dir = "Center"
                    attention_score = 95
            elif num_eyes == 1:
                gaze_dir = "Looking Away"
                attention_score = 50
            else:
                gaze_dir = "Head Down" if not is_drowsy else "Eyes Closed"
                attention_score = 25 if is_drowsy else 45

            if is_drowsy:
                attention_score = 15

            # Emotion estimation
            emotion = "Neutral"
            if len(smiles) > 0:
                emotion = "Happy"
            elif is_drowsy:
                emotion = "Fatigued"
            elif attention_score >= 85:
                emotion = "Focused"

            # Draw HUD visuals on annotated frame
            hud_color = (0, 0, 255) if is_drowsy else (0, 255, 0) if attention_score >= 80 else (0, 165, 255)
            
            # Bounding box with corner accents
            cv2.rectangle(annotated_frame, (x, y), (x + w, y + h), hud_color, 2)
            
            # Draw eyes
            for (ex, ey, ew, eh) in eyes:
                cv2.rectangle(roi_color, (ex, ey), (ex + ew, ey + eh), (255, 255, 0), 1)
                
            # Status Label
            status_text = f"FOCUS: {attention_score}% | {emotion.upper()}"
            if is_drowsy:
                status_text = "DROWSINESS / FATIGUE ALERT!"
                
            cv2.rectangle(annotated_frame, (x, max(0, y - 28)), (x + w, y), hud_color, -1)
            cv2.putText(
                annotated_frame, status_text, (x + 6, max(12, y - 8)),
                cv2.FONT_HERSHEY_SIMPLEX, 0.45, (0, 0, 0) if not is_drowsy else (255, 255, 255), 1, cv2.LINE_AA
            )
            
            students_analytics.append({
                "face_box": [int(x), int(y), int(w), int(h)],
                "attention_score": int(attention_score),
                "is_drowsy": bool(is_drowsy),
                "gaze_direction": gaze_dir,
                "hand_raised": bool(hand_raised_global),
                "emotion": emotion
            })

        return annotated_frame, students_analytics

    def release(self):
        pass

if __name__ == "__main__":
    analyzer = ClassroomAnalyzer()
    dummy = np.zeros((480, 640, 3), dtype=np.uint8)
    res_img, data = analyzer.analyze_frame(dummy)
    print("Analyzer verified. Output count:", len(data))
