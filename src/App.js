import React, { useEffect, useState } from "react";
import { storage, db } from "./firebase";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import {
  collection,
  addDoc,
  query,
  orderBy,
  getDocs,
  serverTimestamp,
} from "firebase/firestore";

const DONATE_URL = "https://www.bitpay.co.il/app/me/73EF2B16-D8BC-B7F6-E6B3-3A940D92593CFCF";
const ACCENT_COLOR = "#84856d"; // צבע הכותרת

function timeAgo(date) {
  if (!date) return "-";
  const now = new Date();
  const diffMs = now - date; // ההפרש במילישניות
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays >= 1) {
    return `${diffDays} ימים`;
  } else {
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    return `${diffHours} שעות`;
  }
}


function normalizeCreatedAt(createdAt) {
  if (!createdAt) return null;
  if (typeof createdAt.toDate === "function") return createdAt.toDate();
  if (createdAt instanceof Date) return createdAt;
  const parsed = new Date(createdAt);
  return isNaN(parsed.getTime()) ? null : parsed;
}

export default function App() {
  const [updates, setUpdates] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);

  const [showUploadModal, setShowUploadModal] = useState(false);
  const [file, setFile] = useState(null);
  const [rating, setRating] = useState(5);
  const [comments, setComments] = useState("");
  const [uploading, setUploading] = useState(false);

  const [showLimitPopup, setShowLimitPopup] = useState(false);

  async function fetchUpdates() {
    setLoading(true);
    try {
      const q = query(collection(db, "updates"), orderBy("createdAt", "desc"));
      const snap = await getDocs(q);
      const arr = snap.docs.map((d) => {
        const data = d.data();
        const dateObj = normalizeCreatedAt(data.createdAt);
        return {
          id: d.id,
          imageUrl: data.imageUrl,
          rating: data.rating,
          comments: data.comments,
          createdAt: dateObj,
          ratingText: data.ratingText || "",
        };
      });
      setUpdates(arr);
      setCurrentIndex(0);
    } catch (err) {
      console.error("fetchUpdates error:", err);
      setUpdates([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchUpdates();
  }, []);

  const current = updates[currentIndex] || null;

  async function handleUploadSubmit(e) {
    e.preventDefault();
    if (!file) {
      alert("אנא בחר תמונה לפני השליחה.");
      return;
    }

    const last = updates[0];
    if (last && last.createdAt) {
      const hours = (Date.now() - last.createdAt.getTime()) / (1000 * 60 * 60);
      if (hours < 24) {
        setShowLimitPopup(true);
        return;
      }
    }

    setUploading(true);
    try {
      const filename = `images/${Date.now()}_${file.name}`;
      const imageRef = ref(storage, filename);
      await uploadBytes(imageRef, file);
      const url = await getDownloadURL(imageRef);

      const ratingTextMap = ["מלוכלך מאוד", "מלוכלך", "סביר", "נקי", "נקי מאוד"];
      await addDoc(collection(db, "updates"), {
        imageUrl: url,
        rating,
        ratingText: ratingTextMap[rating - 1],
        comments: comments || "",
        createdAt: serverTimestamp(),
      });

      setFile(null);
      setRating(5);
      setComments("");
      setShowUploadModal(false);
      await fetchUpdates();
    } catch (err) {
      console.error("upload error:", err);
      alert("שגיאה בהעלאה — בדוק קונסול.");
    } finally {
      setUploading(false);
    }
  }

  function showUpdateAt(index) {
    if (index >= 0 && index < updates.length) setCurrentIndex(index);
  }

  return (
    <div
      style={{
        fontFamily: "'Varela Round', sans-serif",
        background: "url('https://firebasestorage.googleapis.com/v0/b/habrecha-a69d3.firebasestorage.app/o/background_mobile_new.webp?alt=media&token=ecc773a6-b1b6-433d-8157-6bb41f736e5a') no-repeat center/cover",
        minHeight: "100vh",
        paddingBottom: 140,
        textAlign: "center"
      }}
    >
      {/* Header */}
      <header
        style={{
          padding: 18,
          textAlign: "center",
          borderBottom: "1px solid #eee",
          background: "#fff",
          position: "sticky",
          top: 0,
          zIndex: 20,
          fontFamily: "'Cardo', serif"
        }}
      >
        <div style={{ color: ACCENT_COLOR, fontWeight: 700, fontSize: 20, lineHeight: "1.2" }}>
           עדכון מצב המעיין בסנסנה
        </div>
      </header>

      <main style={{ maxWidth: 720, margin: "10px auto", padding: "0 14px" }}>
        {/* Main card */}
        {loading ? (
          <div
            style={{
              height: 260,
              borderRadius: 20,
              background: "#fafafa",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#999",
              marginBottom: 12
            }}
          >
            טוען...
          </div>
        ) : !current ? (
          <div
            style={{
              height: 260,
              borderRadius: 20,
              background: "#fafafa",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#999",
              marginBottom: 12
            }}
          >
            אין עדכונים להצגה — הוסף עדכון ראשון
          </div>
        ) : (
          <section
            style={{
              borderRadius: 20,
              boxShadow: "0 6px 18px rgba(0,0,0,0.06)",
              overflow: "hidden",
              background: "#fff",
              marginBottom: 12
            }}
          >
            <div style={{ position: "relative" }}>
              <div
                style={{
                  position: "absolute",
                  left: 12,
                  top: 12,
                  background: "rgba(255,255,255,0.9)",
                  color: ACCENT_COLOR,
                  padding: "6px 10px",
                  borderRadius: 20,
                  fontSize: 12,
                  boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
                  zIndex: 2
                }}
              >
                {current.createdAt ? current.createdAt.toLocaleDateString() : "-"}
              </div>

              <img
                src={current.imageUrl}
                alt="עדכון"
                style={{
                  display: "block",
                  width: "100%",
                  height: 260,
                  objectFit: "cover",
                }}
              />
            </div>

            <div style={{ padding: 12, textAlign: "right" }}>
              <div style={{ color: "#000", fontSize: 13,fontWeight: "700", marginBottom: 8 }}>
                עברו {current.createdAt ? timeAgo(current.createdAt) : "-"} מאז העדכון

              </div>

              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10, justifyContent: "flex-end", flexDirection: "row-reverse" }}>
  <div style={{ display: "flex", gap: 6 }}>
    {[1,2,3,4,5].map(n => (
      <div key={n} style={{
        width: 14, height: 14, borderRadius: 7,
        background: n <= (current.rating || 0) ? (n <= 2 ? "#ff6b6b" : n === 3 ? "#ffb74d" : "#66bb6a") : "#eee"
      }} />
    ))}
  </div>
  <div style={{ color: "#333", fontSize: 14, textAlign: "right" }}>
    דירוג ניקיון: {current.rating ?? "-"} {current.ratingText ? `• ${current.ratingText}` : ""}
  </div>
</div>


              <div style={{
                background: "#fff",
                borderRadius: 14,
                padding: "10px",
                boxShadow: "0 4px 10px rgba(0,0,0,0.03)",
                color: "#444",
                fontSize: 14,
                minHeight: 44,
                textAlign: "right"
              }}>
                {current.comments || "אין הערות"}
              </div>
            </div>
          </section>
        )}

        {/* About */}
        <section id="about" style={{ marginTop: 18, paddingBottom: 40, textAlign: "right", fontFamily: "'Cardo', serif" }}>
          <h3 style={{
  color: ACCENT_COLOR,
  marginBottom: 8,
  fontWeight: 700,   // מודגש
  fontSize: 20       // גודל גדול יותר
}}>
  מעיין לזכר נופלי מלחמת חרבות ברזל
</h3>

          <p style={{ color: "#444", lineHeight: 1.5 }}>
            המקום נבנה על ידי נוער סנסנה. הושקעו כספים ומאמץ רב כדי לבנות ולתחזק את הבריכה.
            נשמח אם תוכלו לקחת חלק בעשייה שלנו.
          </p>
        </section>
      </main>
{/* Horizontal gallery */}
{updates.length > 1 && (
  <div style={{ marginTop: 8 }}>
    <h3 style={{ 
  fontFamily: "'Cardo', serif",  // הפונט של הכותרת
  fontSize: 16,                  // גודל שאתה רוצה
  color: "#666", 
  marginBottom: 8, 
  textAlign: "right" 
}}>
  היסטוריית עדכונים
</h3>

    <div style={{
  display: "flex",
  gap: 12,
  overflowX: "auto",
  paddingBottom: 8,
  flexDirection: "row",
  direction: "rtl" 
}}>




      {updates.map((u, idx) => (
        <div
          key={u.id || idx}
          onClick={() => showUpdateAt(idx)}
          style={{
            minWidth: 120,
            cursor: "pointer",
            borderRadius: 14,
            overflow: "hidden",
            boxShadow: idx === currentIndex ? "0 8px 20px rgba(0,0,0,0.12)" : "0 6px 14px rgba(0,0,0,0.06)",
            transform: idx === currentIndex ? "translateY(-6px)" : "translateY(0)",
            transition: "all 220ms",
            background: "#fff"
          }}
        >
          <img src={u.imageUrl} alt="thumb" style={{ width: "100%", height: 80, objectFit: "cover" }} />
          <div style={{ padding: 8 }}>
            <div style={{ fontSize: 12, color: ACCENT_COLOR }}>{u.createdAt ? u.createdAt.toLocaleDateString() : "-"}</div>
            <div style={{ display: "flex", gap: 6, marginTop: 6 }}>
              {[1,2,3,4,5].map(n => (
                <div key={n} style={{
                  width: 8, height: 8, borderRadius: 4,
                  background: n <= (u.rating || 0) ? (n <= 2 ? "#ff6b6b" : n === 3 ? "#ffb74d" : "#66bb6a") : "#eee"
                }} />
              ))}
            </div>
          </div>
        </div>
      ))}
    </div>
  </div>
)}

      {/* Bottom nav */}
      <nav style={{
        position: "fixed",
        bottom: 10,
        left: "50%",
        transform: "translateX(-50%)",
        width: "100%",
        maxWidth: 600,
        background: ACCENT_COLOR,
        borderRadius: 999,
        padding: "2px 4px",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
		gap: "70px",
        boxShadow: "0 8px 24px rgba(0,0,0,0.12)",
        zIndex: 40
      }}>

        {/* אודות */}
        <div style={{ textAlign: "center", color: "#fff", cursor: "pointer" }} onClick={() => {
          const el = document.getElementById("about");
          if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
        }}>
          <img src="https://firebasestorage.googleapis.com/v0/b/habrecha-a69d3.firebasestorage.app/o/info%20(2).png?alt=media&token=0526caa6-3014-45d6-81d1-c00c6c6fdfc4" alt="אודות" style={{ width: 30, height: 30 }} />
          <div style={{ fontSize: 12, marginTop: 4 }}>אודות</div>
        </div>

        {/* הוסף עדכון */}
        <div style={{ textAlign: "center", transform: "translateY(-14px)" }}>
          <button
            onClick={() => setShowUploadModal(true)}
            style={{
              width: 60,
              height: 60,
              borderRadius: 36,
              background: "#fff",
              border: "none",
              color: ACCENT_COLOR,
              fontSize: 34,
              fontWeight: 700,
              cursor: "pointer",
              boxShadow: "0 10px 26px rgba(0,0,0,0.18)"
            }}
          >
            ＋
          </button>
          <div style={{ fontSize: 12, color: "#fff", marginTop: 4 }}>הוסף עדכון</div>
        </div>

        {/* השתתפו איתנו */}
        <div style={{ textAlign: "center", color: "#fff" }}>
          <a href={DONATE_URL} target="_blank" rel="noreferrer" style={{ color: "#fff", textDecoration: "none" }}>
            <img src="https://firebasestorage.googleapis.com/v0/b/habrecha-a69d3.firebasestorage.app/o/mercy%20(2).png?alt=media&token=374923e4-edd3-4ca3-931a-6e7b4897e5a7" alt="השתתפו איתנו" style={{ width: 30, height: 30 }} />
            <div style={{ fontSize: 12, marginTop: 4 }}>השתתפו איתנו</div>
          </a>
        </div>

      </nav>

      {/* Upload Modal */}
      {showUploadModal && (
        <div style={{
          position: "fixed", inset: 0,
          background: "rgba(0,0,0,0.45)",
          display: "flex", alignItems: "center", justifyContent: "center",
          zIndex: 80, padding: 16
        }}>
          <div style={{
            width: "100%", maxWidth: 420,
            background: "#fff", borderRadius: 16, padding: 18,
            boxShadow: "0 10px 30px rgba(0,0,0,0.25)"
          }}>
            <h2 style={{ marginTop: 0, color: ACCENT_COLOR, fontFamily: "'Cardo', serif" }}>הוסף עדכון</h2>

            <form onSubmit={handleUploadSubmit}>
              <label style={{
                display: "block",
                borderRadius: 12,
                border: "2px dashed #e6e6e6",
                padding: 18,
                textAlign: "center",
                cursor: "pointer",
                marginBottom: 14
              }}>
                📷 בחר תמונה
                <input type="file" accept="image/*" onChange={(e) => setFile(e.target.files[0])} required style={{ display: "none" }} />
              </label>

              <div style={{ marginBottom: 12 }}>
                <div style={{ marginBottom: 8, color: "#444" }}>דרוג ניקיון</div>
                <div style={{ display: "flex", gap: 8 }}>
                  {[1,2,3,4,5].map(n => (
                    <button key={n} type="button" onClick={() => setRating(n)} style={{
                      flex: "0 0 40px",
                      height: 40,
                      borderRadius: 20,
                      border: "1px solid #e0e0e0",
                      background: n <= rating ? ACCENT_COLOR : "#f3f3f3",
                      color: n <= rating ? "#fff" : "#666",
                      cursor: "pointer"
                    }}>{n}</button>
                  ))}
                </div>
              </div>

              <div style={{ marginBottom: 12 }}>
                <textarea value={comments} onChange={(e) => setComments(e.target.value)} rows={3}
                          placeholder="הערות (לא חובה)"
                          style={{ width: "100%", padding: 10, borderRadius: 10, border: "1px solid #e6e6e6" }} />
              </div>

              <div style={{ display: "flex", gap: 8 }}>
                <button type="submit" disabled={uploading} style={{
                  flex: 1, padding: 12, borderRadius: 12, border: "none",
                  background: ACCENT_COLOR, color: "#fff", fontWeight: 700
                }}>{uploading ? "מעלה..." : "שלח"}</button>

                <button type="button" onClick={() => setShowUploadModal(false)} style={{
                  flex: 1, padding: 12, borderRadius: 12, border: "1px solid #ddd", background: "#fff"
                }}>ביטול</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Limit popup */}
      {showLimitPopup && (
        <div style={{
          position: "fixed", inset: 0, display: "flex", alignItems: "center", justifyContent: "center",
          background: "rgba(0,0,0,0.4)", zIndex: 200
        }}>
          <div style={{ background: "#fff", padding: 18, borderRadius: 12, width: "90%", maxWidth: 320, textAlign: "center" }}>
            <div style={{ fontSize: 20, marginBottom: 8 }}>⚠️</div>
            <div style={{ marginBottom: 12 }}>אפשר להעלות רק פעם ביום</div>
            <button onClick={() => setShowLimitPopup(false)} style={{
              padding: "10px 18px", borderRadius: 10, border: "none", background: ACCENT_COLOR, color: "#fff"
            }}>הבנתי</button>
          </div>
        </div>
      )}
    </div>
  );
}
