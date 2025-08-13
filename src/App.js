import React, { useState, useEffect } from "react";
import { storage, db } from "./firebase";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import {
  collection,
  addDoc,
  query,
  orderBy,
  limit,
  getDocs,
  serverTimestamp,
} from "firebase/firestore";

const ratingColors = ["#ff4d4d", "#ff944d", "#ffe44d", "#b2ff4d", "#4dff88"]; // אדום → ירוק

const daysAgo = (timestamp) => {
  const now = new Date();
  const diff = now - new Date(timestamp);
  return Math.floor(diff / (1000 * 60 * 60 * 24));
};

function App() {
  const [latestUpdate, setLatestUpdate] = useState(null);
  const [updates, setUpdates] = useState([]);
  const [historyIndex, setHistoryIndex] = useState(0);
  const [showModal, setShowModal] = useState(false);
  const [file, setFile] = useState(null);
  const [rating, setRating] = useState(5);
  const [comments, setComments] = useState("");
  const [uploading, setUploading] = useState(false);
  const [showLimitAlert, setShowLimitAlert] = useState(false);
  const [view, setView] = useState("home"); // home, about, report

  // Fetch latest update and full history
  async function fetchUpdates() {
    const q = query(collection(db, "updates"), orderBy("createdAt", "desc"));
    const snapshot = await getDocs(q);
    const allUpdates = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate?.() || new Date(),
    }));
    setUpdates(allUpdates);
    setLatestUpdate(allUpdates[0] || null);
    setHistoryIndex(0);
  }

  useEffect(() => {
    fetchUpdates();
  }, []);

  // Handle upload
  async function handleSubmit(e) {
    e.preventDefault();
    if (!file) return alert("אנא העלה תמונה.");

    const lastUpdate = updates[0];
    if (lastUpdate) {
      const diffHours = (new Date() - new Date(lastUpdate.createdAt)) / (1000 * 60 * 60);
      if (diffHours < 24) {
        setShowLimitAlert(true);
        return;
      }
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
      setRating(5);
      setComments("");
      setShowModal(false);
      await fetchUpdates();
    } catch (err) {
      console.error(err);
      alert("שגיאה בהעלאה");
    } finally {
      setUploading(false);
    }
  }

  const currentUpdate = updates[historyIndex] || latestUpdate;

  return (
    <div style={{ fontFamily: "sans-serif", background: "#fff", minHeight: "100vh", paddingBottom: "80px" }}>
      {/* --- Limit Alert --- */}
      {showLimitAlert && (
        <div style={{
          position: "fixed", top: "50%", left: "50%", transform: "translate(-50%,-50%)",
          background: "#fff", padding: "20px", borderRadius: "20px", boxShadow: "0 4px 12px rgba(0,0,0,0.2)", zIndex: 2000,
          textAlign: "center", width: "80%", maxWidth: "300px"
        }}>
          <p style={{ margin: "0 0 10px" }}>אפשר להעלות רק פעם ביום</p>
          <button
            onClick={() => setShowLimitAlert(false)}
            style={{
              padding: "10px 20px",
              backgroundColor: "#039be5",
              color: "#fff",
              border: "none",
              borderRadius: "25px",
              cursor: "pointer"
            }}
          >
            הבנתי
          </button>
        </div>
      )}

      {/* --- Main Card --- */}
      {currentUpdate && (
        <div style={{
          margin: "20px",
          borderRadius: "25px",
          overflow: "hidden",
          boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
          position: "relative"
        }}>
          {/* Pill with date */}
          <div style={{
            position: "absolute", top: "10px", left: "10px",
            background: "#f0f0f0", padding: "5px 12px", borderRadius: "50px",
            fontSize: "12px", color: "#555"
          }}>
            {currentUpdate.createdAt.toLocaleDateString("he-IL")}
          </div>

          <img
            src={currentUpdate.imageUrl}
            alt="Latest"
            style={{ width: "100%", maxHeight: "60vh", objectFit: "cover" }}
          />

          {/* Info */}
          <div style={{ padding: "15px" }}>
            <p style={{ margin: "0 0 5px", color: "#888", fontSize: "14px" }}>
              עברו {daysAgo(currentUpdate.createdAt)} ימים מאז העדכון
            </p>
            <div style={{ display: "flex", gap: "5px", marginBottom: "10px" }}>
              {[1,2,3,4,5].map(n => (
                <div key={n} style={{
                  width: "20px", height: "20px", borderRadius: "50%",
                  background: n <= currentUpdate.rating ? ratingColors[n-1] : "#eee"
                }} />
              ))}
            </div>
            <div style={{
              background: "#f9f9f9", padding: "10px", borderRadius: "15px",
              boxShadow: "0 2px 6px rgba(0,0,0,0.05)"
            }}>
              {currentUpdate.comments || "-"}
            </div>
          </div>

          {/* History arrows */}
          <div style={{
            display: "flex", justifyContent: "space-between", padding: "0 15px 15px"
          }}>
            <button
              onClick={() => setHistoryIndex(Math.min(historyIndex + 1, updates.length - 1))}
              disabled={historyIndex >= updates.length - 1}
              style={{
                border: "none", background: "rgba(255,255,255,0.7)", borderRadius: "50%",
                width: "35px", height: "35px", cursor: "pointer", boxShadow: "0 2px 6px rgba(0,0,0,0.1)"
              }}
            >
              ←
            </button>
            <button
              onClick={() => setHistoryIndex(Math.max(historyIndex - 1,0))}
              disabled={historyIndex <= 0}
              style={{
                border: "none", background: "rgba(255,255,255,0.7)", borderRadius: "50%",
                width: "35px", height: "35px", cursor: "pointer", boxShadow: "0 2px 6px rgba(0,0,0,0.1)"
              }}
            >
              →
            </button>
          </div>
        </div>
      )}

      {/* --- Upload Button --- */}
      <button
        onClick={() => setShowModal(true)}
        style={{
          position: "fixed", bottom: "90px", right: "20px",
          width: "60px", height: "60px",
          borderRadius: "50%",
          backgroundColor: "#039be5",
          color: "#fff",
          border: "none",
          fontSize: "24px",
          cursor: "pointer",
          boxShadow: "0 4px 12px rgba(0,0,0,0.2)"
        }}
      >
        📤
      </button>

      {/* --- Bottom Navigation --- */}
      <div style={{
        position: "fixed", bottom: 0, left: 0, right: 0,
        display: "flex", justifyContent: "space-around", alignItems: "center",
        height: "60px", background: "#fff", boxShadow: "0 -2px 6px rgba(0,0,0,0.1)"
      }}>
        <button onClick={() => setView("home")} style={{ border: "none", background: "none", fontSize: "24px" }}>🏠</button>
        <button onClick={() => setView("about")} style={{ border: "none", background: "none", fontSize: "24px" }}>ℹ️</button>
        <button onClick={() => setView("report")} style={{ border: "none", background: "none", fontSize: "24px" }}>🚩</button>
        <a href="https://donate.example.com" target="_blank" rel="noreferrer"
           style={{ fontSize: "24px", color:"#039be5", textDecoration:"none" }}>🎁</a>
      </div>

      {/* --- Modal Upload --- */}
      {showModal && (
        <div style={{
          position: "fixed", top: 0,left:0,right:0,bottom:0,
          background:"rgba(0,0,0,0.5)", display:"flex", justifyContent:"center", alignItems:"center", zIndex:1000
        }}>
          <div style={{
            background:"#fff", borderRadius:"20px", padding:"20px", width:"90%", maxWidth:"400px", boxShadow:"0 8px 20px rgba(0,0,0,0.3)"
          }}>
            <h2 style={{marginTop:0}}>הוסף עדכון</h2>
            <form onSubmit={handleSubmit}>
              <div style={{marginBottom:"15px"}}>
                <label>בחר תמונה:</label>
                <div style={{
                  border:"2px dashed #ccc", borderRadius:"15px", padding:"20px", textAlign:"center", cursor:"pointer"
                }}>
                  <input type="file" accept="image/*" onChange={e=>setFile(e.target.files[0])} required style={{display:"block", margin:"0 auto"}} />
                  <p style={{margin:"10px 0 0"}}>📷 בחר תמונה</p>
                </div>
              </div>
              <div style={{marginBottom:"15px"}}>
                <label>דרוג ניקיון:</label>
                <div style={{display:"flex", gap:"10px", marginTop:"5px"}}>
                  {[1,2,3,4,5].map(n=>(
                    <button key={n} type="button" onClick={()=>setRating(n)} style={{
                      width:"40px", height:"40px", borderRadius:"50%",
                      border:"none", background: n<=rating ? ratingColors[n-1]:"#eee",
                      cursor:"pointer"
                    }}>{n}</button>
                  ))}
                </div>
              </div>
              <div style={{marginBottom:"15px"}}>
                <label>הערות:</label>
                <textarea value={comments} onChange={e=>setComments(e.target.value)} rows={3}
                          style={{width:"100%", padding:"10px", borderRadius:"15px", border:"1px solid #ccc", marginTop:"5px"}} />
              </div>
              <div style={{display:"flex", justifyContent:"space-between"}}>
                <button type="submit" disabled={uploading} style={{
                  padding:"10px 20px", borderRadius:"25px", border:"none",
                  backgroundColor:"#039be5", color:"#fff", cursor:"pointer"
                }}>{uploading ? "מעלה..." : "שלח"}</button>
                <button type="button" onClick={()=>setShowModal(false)} style={{
                  padding:"10px 20px", borderRadius:"25px", border:"none",
                  backgroundColor:"#ccc", color:"#333", cursor:"pointer"
                }}>ביטול</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- Views: About / Report --- */}
      {view==="about" && (
        <div style={{padding:"20px"}}>
          <img src="https://via.placeholder.com/600x200" alt="בריכה" style={{width:"100%", borderRadius:"20px", marginBottom:"15px"}} />
          <p style={{color:"#555", lineHeight:"1.5"}}>
            בריכת שחייה ציבורית, נקייה ומסודרת, זמינה לכל הגילאים. ניתן להגיע בקלות בתחבורה ציבורית וליהנות מהמתקנים.
          </p>
        </div>
      )}
      {view==="report" && (
        <div style={{padding:"20px"}}>
          <div style={{display:"flex", alignItems:"center", gap:"10px", marginBottom:"10px"}}>
            <span style={{fontSize:"24px"}}>🚩</span>
            <h3 style={{margin:0}}>דיווח בעיה</h3>
          </div>
          <textarea placeholder="כתוב כאן את הבעיה..." rows={5} style={{width:"100%", borderRadius:"15px", padding:"10px", border:"1px solid #ccc", marginBottom:"10px"}} />
          <button style={{
            padding:"10px 20px", borderRadius:"25px", border:"none",
            backgroundColor:"#039be5", color:"#fff", cursor:"pointer"
          }}>שלח</button>
        </div>
      )}

    </div>
  );
}

export default App;
