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
import "./App.css";

const DONATE_URL = "https://www.bitpay.co.il/app/me/73EF2B16-D8BC-B7F6-E6B3-3A940D92593CFCF2";
const ACCENT_COLOR = "#84856d"; // צבע הכותרת וגם עכשיו של התפריט

function daysAgo(date) {
  if (!date) return "-";
  const now = new Date();
  const diff = now - date;
  return Math.floor(diff / (1000 * 60 * 60 * 24));
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
    <div className="app-container" style={{ backgroundImage: "url('https://firebasestorage.googleapis.com/v0/b/habrecha-a69d3.firebasestorage.app/o/background_mobile_new.webp?alt=media&token=ecc773a6-b1b6-433d-8157-6bb41f736e5a')", backgroundSize: "cover", backgroundPosition: "center" }}>
      <header className="app-header">
        <div style={{ color: ACCENT_COLOR, fontWeight: 700, fontSize: 18, lineHeight: "1.15" }}>
          בריכה לזכר נופלי
          <div style={{ fontSize: 14, fontWeight: 600 }}>מלחמת חרבות ברזל</div>
        </div>
      </header>

      <main className="app-main">
        {loading ? (
          <div className="card-placeholder">טוען...</div>
        ) : !current ? (
          <div className="card-placeholder">אין עדכונים להצגה — הוסף עדכון ראשון</div>
        ) : (
          <section className="update-card">
            <div className="image-wrapper">
              <div className="date-pill">{current.createdAt ? current.createdAt.toLocaleDateString() : "-"}</div>
              <img className="update-image" src={current.imageUrl} alt="עדכון" />
            </div>
            <div className="card-info">
              <div className="days-ago">עברו {current.createdAt ? daysAgo(current.createdAt) : "-"} ימים מאז העדכון</div>
              <div className="rating-row">
                <div className="rating-dots">
                  {[1,2,3,4,5].map(n => (
                    <div key={n} className={`dot ${n <= (current.rating || 0) ? (n <=2 ? "low" : n ===3 ? "mid":"high") : ""}`} />
                  ))}
                </div>
                <div className="rating-text">
                  דירוג ניקיון: {current.rating ?? "-"} {current.ratingText ? `• ${current.ratingText}` : ""}
                </div>
              </div>
              <div className="comments-box">{current.comments || "אין הערות"}</div>
            </div>
          </section>
        )}

        {updates.length > 1 && (
          <div className="history-gallery">
            <div className="gallery-label">היסטוריית עדכונים</div>
            <div className="gallery-wrapper">
              {updates.map((u, idx) => (
                <div key={u.id || idx} className={`gallery-thumb ${idx===currentIndex?"active":""}`} onClick={()=>showUpdateAt(idx)}>
                  <img src={u.imageUrl} alt="thumb"/>
                  <div className="thumb-info">
                    <div className="thumb-date">{u.createdAt ? u.createdAt.toLocaleDateString() : "-"}</div>
                    <div className="thumb-dots">
                      {[1,2,3,4,5].map(n => (
                        <div key={n} className={`dot ${n <= (u.rating || 0) ? (n<=2?"low":n===3?"mid":"high"):""}`}/>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <section id="about" className="about-section">
          <h3 style={{ color: ACCENT_COLOR, marginBottom: 8 }}>אודות הבריכה</h3>
          <p>
            המקום נבנה על ידי נוער סנסנה. הושקעו כספים ומאמץ רב כדי לבנות ולתחזק את הבריכה.
            נשמח אם תוכלו לקחת חלק בעשייה שלנו.
          </p>
        </section>
      </main>

      <nav className="bottom-nav" style={{ background: ACCENT_COLOR }}>
        <div className="nav-item" onClick={()=>{
          const el=document.getElementById("about"); if(el) el.scrollIntoView({behavior:"smooth",block:"start"});
        }}>
          <div style={{ fontSize: 18 }}>ℹ️</div>
          <div style={{ fontSize: 11, marginTop:4 }}>אודות</div>
        </div>

        <div className="nav-item-center">
          <button className="add-button" onClick={()=>setShowUploadModal(true)}>＋</button>
          <div className="add-label">הוסף עדכון</div>
        </div>

        <div className="nav-item">
          <a href={DONATE_URL} target="_blank" rel="noreferrer" style={{ color:"#fff", textDecoration:"none" }}>
            <div style={{ fontSize: 18 }}>🎁</div>
            <div style={{ fontSize: 11, marginTop:4 }}>תרומה</div>
          </a>
        </div>
      </nav>

      {showUploadModal && (
        <div className="upload-modal">
          <div className="upload-box">
            <h2 style={{ marginTop:0, color:ACCENT_COLOR }}>הוסף עדכון</h2>
            <form onSubmit={handleUploadSubmit}>
              <label className="file-label">
                📷 בחר תמונה
                <input type="file" accept="image/*" onChange={(e)=>setFile(e.target.files[0])} required/>
              </label>
              <div className="rating-select">
                <div style={{ marginBottom:8, color:"#444" }}>דרוג ניקיון</div>
                <div className="rating-buttons">
                  {[1,2,3,4,5].map(n=>(
                    <button key={n} type="button" className={n<=rating?"selected":""} onClick={()=>setRating(n)}>{n}</button>
                  ))}
                </div>
              </div>
              <textarea rows={3} value={comments} onChange={e=>setComments(e.target.value)} placeholder="הערות (לא חובה)"/>
              <div className="upload-actions">
                <button type="submit" disabled={uploading}>{uploading?"מעלה...":"שלח"}</button>
                <button type="button" onClick={()=>setShowUploadModal(false)}>ביטול</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showLimitPopup && (
        <div className="limit-popup">
          <div>
            <div style={{ fontSize:20, marginBottom:8 }}>⚠️</div>
            <div style={{ marginBottom:12 }}>אפשר להעלות רק פעם ביום</div>
            <button onClick={()=>setShowLimitPopup(false)}>הבנתי</button>
          </div>
        </div>
      )}
    </div>
  );
}
