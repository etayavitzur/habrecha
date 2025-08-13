import React, { useState, useEffect } from "react";
import { storage, db } from "./firebase";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { collection, addDoc, query, orderBy, limit, getDocs, serverTimestamp } from "firebase/firestore";

function App() {
  const [latestUpdate, setLatestUpdate] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [file, setFile] = useState(null);
  const [rating, setRating] = useState(1);
  const [comments, setComments] = useState("");
  const [uploading, setUploading] = useState(false);

  async function fetchLatestUpdate() {
    const q = query(collection(db, "updates"), orderBy("createdAt", "desc"), limit(1));
    const snapshot = await getDocs(q);
    if (!snapshot.empty) {
      const data = snapshot.docs[0].data();
      setLatestUpdate({
        imageUrl: data.imageUrl,
        rating: data.rating,
        comments: data.comments,
        createdAt: data.createdAt?.toDate?.() || new Date(),
      });
    } else {
      setLatestUpdate(null);
    }
  }

  useEffect(() => {
    fetchLatestUpdate();
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!file) {
      alert("אנא העלה תמונה.");
      return;
    }
    setUploading(true);
    try {
      const imageRef = ref(storage, `images/${Date.now()}_${file.name}`);
      await uploadBytes(imageRef, file);
      const imageUrl = await getDownloadURL(imageRef);

      await addDoc(collection(db, "updates"), {
        imageUrl,
        rating,
        comments,
        createdAt: serverTimestamp(),
      });

      setFile(null);
      setRating(1);
      setComments("");
      setShowModal(false);
      await fetchLatestUpdate(); // עדכון התמונה האחרונה
    } catch (error) {
      console.error("שגיאה בהעלאה:", error);
      alert("אירעה שגיאה בהעלאת העדכון.");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div style={{ fontFamily: "Arial, sans-serif", maxWidth: "600px", margin: "0 auto", padding: "20px" }}>
      {/* הכרטיס של התמונה האחרונה */}
      {latestUpdate && (
        <div style={{
          border: "1px solid #ccc",
          borderRadius: "8px",
          overflow: "hidden",
          marginBottom: "20px",
          boxShadow: "0 2px 8px rgba(0,0,0,0.1)"
        }}>
          <img
            src={latestUpdate.imageUrl}
            alt="Last update"
            style={{ width: "100%", maxHeight: "400px", objectFit: "cover" }}
          />
          <div style={{ padding: "10px" }}>
            <p style={{ margin: 0, color: "#555", fontSize: "14px" }}>
              {latestUpdate.createdAt.toLocaleString()}
            </p>
          </div>
        </div>
      )}

      {/* כפתור להוספת עדכון */}
      <button
        onClick={() => setShowModal(true)}
        style={{
          padding: "12px 24px",
          fontSize: "16px",
          backgroundColor: "#039be5",
          color: "white",
          border: "none",
          borderRadius: "4px",
          cursor: "pointer"
        }}
      >
        הוסף עדכון
      </button>

      {/* Modal לטופס */}
      {showModal && (
        <div style={{
          position: "fixed",
          top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: "rgba(0,0,0,0.5)",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          zIndex: 1000
        }}>
          <div style={{
            backgroundColor: "white",
            padding: "20px",
            borderRadius: "8px",
            width: "90%",
            maxWidth: "400px",
            boxShadow: "0 4px 12px rgba(0,0,0,0.2)"
          }}>
            <h2 style={{ marginTop: 0 }}>הוסף עדכון</h2>
            <form onSubmit={handleSubmit}>
              <div style={{ marginBottom: "10px" }}>
                <label>בחר תמונה:</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => setFile(e.target.files[0])}
                  required
                  style={{ display: "block", marginTop: "5px" }}
                />
              </div>
              <div style={{ marginBottom: "10px" }}>
                <label>דרוג ניקיון (1-5):</label>
                <select
                  value={rating}
                  onChange={(e) => setRating(Number(e.target.value))}
                  required
                  style={{ display: "block", marginTop: "5px" }}
                >
                  {[1, 2, 3, 4, 5].map(n => <option key={n} value={n}>{n}</option>)}
                </select>
              </div>
              <div style={{ marginBottom: "10px" }}>
                <label>הערות (לא חובה):</label>
                <textarea
                  value={comments}
                  onChange={(e) => setComments(e.target.value)}
                  rows={3}
                  style={{ width: "100%", marginTop: "5px" }}
                />
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <button type="submit" disabled={uploading} style={{
                  padding: "8px 16px",
                  backgroundColor: "#039be5",
                  color: "white",
                  border: "none",
                  borderRadius: "4px",
                  cursor: "pointer"
                }}>
                  {uploading ? "מעלה..." : "שלח"}
                </button>
                <button type="button" onClick={() => setShowModal(false)} disabled={uploading} style={{
                  padding: "8px 16px",
                  backgroundColor: "#ccc",
                  color: "#333",
                  border: "none",
                  borderRadius: "4px",
                  cursor: "pointer"
                }}>
                  ביטול
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
