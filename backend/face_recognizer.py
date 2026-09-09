import cv2
import os
import numpy as np
from database import get_db_connection

FACES_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "faces")
MODEL_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "face_model.xml")

class FaceRecognizer:
    def __init__(self):
        os.makedirs(FACES_DIR, exist_ok=True)
        # Create LBPH Face Recognizer
        try:
            self.recognizer = cv2.face.LBPHFaceRecognizer_create()
        except AttributeError:
            print("Error: cv2.face is not available. Make sure you installed 'opencv-contrib-python'.")
            self.recognizer = None
            
        self.is_trained = False
        self.student_map = {} # maps database student_id (int) to recognizer label (int)
        self.label_to_student = {} # inverse mapping
        
        self.load_and_train()

    def load_and_train(self):
        """
        Loads all saved student face images from the faces/ directory and trains the model.
        """
        if self.recognizer is None:
            return False
            
        face_images = []
        labels = []
        
        # Get all students from database to build mappings
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT id, name FROM students")
        students = cursor.fetchall()
        conn.close()
        
        self.student_map = {row["id"]: row["id"] for row in students}
        self.label_to_student = {row["id"]: {"id": row["id"], "name": row["name"]} for row in students}
        
        # Scan faces directory
        if not os.path.exists(FACES_DIR):
            return False
            
        for filename in os.listdir(FACES_DIR):
            if filename.endswith(".jpg") or filename.endswith(".png"):
                # Format: student_{student_id}_{index}.jpg or student_{student_id}.jpg
                parts = filename.split("_")
                try:
                    student_id = int(parts[1].split(".")[0])
                    if student_id not in self.student_map:
                        continue # Student no longer in DB
                        
                    img_path = os.path.join(FACES_DIR, filename)
                    gray_face = cv2.imread(img_path, cv2.IMREAD_GRAYSCALE)
                    if gray_face is not None:
                        # Resize to standard size for consistency
                        gray_face = cv2.resize(gray_face, (150, 150))
                        face_images.append(gray_face)
                        labels.append(student_id)
                except (IndexError, ValueError) as e:
                    print(f"Skipping file {filename} due to naming convention error: {e}")
                    
        if len(face_images) > 0:
            try:
                self.recognizer.train(face_images, np.array(labels))
                self.recognizer.write(MODEL_PATH)
                self.is_trained = True
                print(f"Face Recognizer successfully trained with {len(face_images)} images.")
                return True
            except Exception as e:
                print(f"Training failed: {e}")
                self.is_trained = False
                return False
        else:
            print("No face images found. Recognizer is waiting for student registration.")
            self.is_trained = False
            return False

    def register_student(self, student_id: int, frame, face_box):
        """
        Extracts face from frame using face_box, saves it to disk, and retrains the recognizer.
        face_box: [x, y, w, h]
        """
        x, y, w, h = face_box
        height, width, _ = frame.shape
        
        # Add padding to crop
        pad_w = int(w * 0.1)
        pad_h = int(h * 0.1)
        x_start = max(0, x - pad_w)
        y_start = max(0, y - pad_h)
        x_end = min(width, x + w + pad_w)
        y_end = min(height, y + h + pad_h)
        
        face_crop = frame[y_start:y_end, x_start:x_end]
        if face_crop.size == 0:
            return False
            
        gray_face = cv2.cvtColor(face_crop, cv2.COLOR_BGR2GRAY)
        gray_face = cv2.resize(gray_face, (150, 150))
        
        # Save face image (we support multiple samples if we add indices, let's start with 1 sample)
        # Using a timestamp or random tag so we can register multiple samples later
        sample_path = os.path.join(FACES_DIR, f"student_{student_id}_{int(os.path.getmtime(FACES_DIR) if os.path.exists(FACES_DIR) else 0)}.jpg")
        cv2.imwrite(sample_path, gray_face)
        
        # Retrain model
        return self.load_and_train()

    def recognize(self, frame, face_box):
        """
        Recognizes the face in face_box.
        Returns: Dict containing student_id, name, and confidence, or None.
        """
        if not self.is_trained or self.recognizer is None:
            return None
            
        x, y, w, h = face_box
        height, width, _ = frame.shape
        
        # Crop face
        x_start = max(0, x)
        y_start = max(0, y)
        x_end = min(width, x + w)
        y_end = min(height, y + h)
        
        face_crop = frame[y_start:y_end, x_start:x_end]
        if face_crop.size == 0:
            return None
            
        gray_face = cv2.cvtColor(face_crop, cv2.COLOR_BGR2GRAY)
        gray_face = cv2.resize(gray_face, (150, 150))
        
        try:
            student_id, confidence = self.recognizer.predict(gray_face)
            
            # For LBPH, lower confidence score is better (distance metric).
            # Usually confidence < 75 is a very good match. Let's use 85 as cutoff.
            if confidence < 85.0:
                student_info = self.label_to_student.get(student_id)
                if student_info:
                    return {
                        "student_id": student_id,
                        "name": student_info["name"],
                        "confidence": round(confidence, 2)
                    }
        except Exception as e:
            print(f"Prediction failed: {e}")
            
        return None
