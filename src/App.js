import React, { useState } from "react";
import { storage, db } from "./firebase"; // הייבוא שלך ל-Firebase
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";

function App() {
  const [showForm, setShowForm] = useState(false);
  const [file, setFile] = useState(null);
  const [rating, setRating] = useState(1);
  const [comments, setComments] = useState("");
  const [uploading, setUploading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();

    if (!file) {
      alert("אנא העלה תמונה.");
      return;
    }

    setUploading(true);

    try {
      // מיקום אחסון בתיקיית "images" עם שם ייחודי
      const imageRef = ref(storage, `images/${Date.now()}_${file.name}`);

      // מעלה את התמונה ל-Firebase Storage
      await uploadBytes(imageRef, file);

      // מקבל את ה-URL להורדה של התמונה
      const imageUrl = await getDownloadURL(imageRef);

      // שומר את הנתונים ב-Firestore
      await addDoc(collection(db, "updates"), {
        imageUrl,
        rating,
        comments,
        createdAt: serverTimestamp(),
      });

      alert("העדכון עלה בהצלחה!");
      setFile(null);
      setRating(1);
      setComments("");
      setShowForm(false);
    } catch (error) {
      console.error("שגיאה בהעלאה:", error);
      alert("אירעה שגיאה בהעלאת העדכון.");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div style={{ padding: "20px" }}>
      {!showForm && (
        <button onClick={() => setShowForm(true)}>הוסף עדכון לבריכה</button>
      )}

      {showForm && (
        <form onSubmit={handleSubmit} style={{ marginTop: "20px" }}>
          <div>
            <label>בחר תמונה: </label>
            <input
              type="file"
              accept="image/*"
              onChange={(e) => setFile(e.target.files[0])}
              required
            />
          </div>

          <div style={{ marginTop: "10px" }}>
            <label>דרוג ניקיון (1 מלוכלך - 5 נקי): </label>
            <select
              value={rating}
              onChange={(e) => setRating(Number(e.target.value))}
              required
            >
              {[1, 2, 3, 4, 5].map((num) => (
                <option key={num} value={num}>
                  {num}
                </option>
              ))}
            </select>
          </div>

          <div style={{ marginTop: "10px" }}>
            <label>הערות (לא חובה): </label>
            <textarea
              value={comments}
              onChange={(e) => setComments(e.target.value)}
              rows={3}
            />
          </div>

          <div style={{ marginTop: "10px" }}>
            <button type="submit" disabled={uploading}>
              {uploading ? "מעלה..." : "שלח עדכון"}
            </button>
            <button
              type="button"
              onClick={() => setShowForm(false)}
              disabled={uploading}
              style={{ marginLeft: "10px" }}
            >
              ביטול
            </button>
          </div>
        </form>
      )}
    </div>
  );
}

export default App;
