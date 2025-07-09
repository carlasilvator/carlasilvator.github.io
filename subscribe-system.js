
// ========== Firebase Init ==========    
if (typeof firebase === "undefined") {    
  console.error("Firebase غير محمّل.");    
  return;    
} else {    
  const firebaseConfig = {    
    apiKey: "AIzaSyBtTc7yWNfNkG0oVSbpq0V9A6DHTgZoGBM",    
    authDomain: "works-rawan.firebaseapp.com",    
    projectId: "works-rawan",    
    storageBucket: "works-rawan.appspot.com",    
    messagingSenderId: "986254083746",    
    appId: "1:986254083746:web:17f7db0389c94473f0b9fb"    
  };    
    
  if (!firebase.apps.length) firebase.initializeApp(firebaseConfig);    
  const auth = firebase.auth();    
  const db = firebase.firestore();    
  let messaging = null;    
    
  try {    
    messaging = firebase.messaging();    
  } catch (e) {    
    console.warn("Firebase Messaging غير مفعل:", e);    
  }    
    
  let currentUser = null;    
  
  // ========== تحديد الرتبة من خلال النقاط ==========    
  function calculateRank(points, createdAt) {    
    const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);    
    if (!createdAt || createdAt.toDate() > oneWeekAgo)    
      return { rank: "🌱 عضو جديد", title: "عضو جديد" };    
    
    if (points >= 500) return { rank: "👑 الملك/الملكة", title: "النبلاء" };    
    if (points >= 400) return { rank: "👘 الأمير/الأميرة", title: "النبلاء" };    
    if (points >= 350) return { rank: "💼 الوزير/الوزيرة", title: "النبلاء" };    
    if (points >= 300) return { rank: "🎩 اللورد/اللوردة", title: "النبلاء" };    
    
    if (points >= 270) return { rank: "🛡️ قائد الفرسان", title: "الفرسان" };    
    if (points >= 240) return { rank: "⚔️ الحارس الملكي", title: "الفرسان" };    
    if (points >= 210) return { rank:  "📚 المستشار", title: "الفرسان" };    
    if (points >= 200) return { rank: "🧭 الفارس", title: "الفرسان" };    
    
    if (points >= 150) return { rank: "🚩 متدرب", title: "الغرباء" };    
    if (points >= 100) return { rank: "🧍 المواطن", title: "الغرباء" };    
    if (points >= 50) return { rank: "💰 التاجر", title: "الغرباء" };    
    return { rank: "🪦 المتشرد", title: "الغرباء" };    
  }    
  
  

  // ========== تحديث النقاط والرتبة ==========
  async function updateUserPoints(uid, delta = 0) {
    const userRef = db.collection("users").doc(uid);
    try {
      let result = null;
      await db.runTransaction(async (tx) => {
        const doc = await tx.get(userRef);
        const data = doc.exists ? doc.data() : {};
        const currentPoints = data.points || 0;
        const now = Date.now();
        const createdAt = data.createdAt?.toDate?.() || new Date(now);
        const lastActive = data.lastActive?.toDate?.() || createdAt;
        const lastWeekPoints = data.lastWeekPoints ?? currentPoints;

        let newPoints = currentPoints + delta;
        let updatedLastActive = data.lastActive;

        const oneWeek = 7 * 24 * 60 * 60 * 1000;
        const timeSinceLastActive = now - lastActive.getTime();

        // إذا مرّ أسبوع من آخر نشاط
        if (timeSinceLastActive >= oneWeek) {
          const gained = newPoints - lastWeekPoints;
          if (gained < 20) {
            newPoints = Math.max(0, newPoints - 10);
          }

          tx.set(userRef, {
            lastActive: firebase.firestore.Timestamp.fromDate(new Date(now)),
            lastWeekPoints: newPoints
          }, { merge: true });

          updatedLastActive = firebase.firestore.Timestamp.fromDate(new Date(now));
        }

        const rankInfo = calculateRank(newPoints, createdAt);
        tx.set(userRef, {
          points: newPoints,
          rank: rankInfo.rank,
          rankGroup: rankInfo.title,
          createdAt: data.createdAt || firebase.firestore.Timestamp.fromDate(createdAt),
          lastActive: updatedLastActive
        }, { merge: true });

        result = {
          points: newPoints,
          rank: rankInfo.rank,
          rankGroup: rankInfo.title
        };
      });
      return result;
    } catch (e) {
      console.error("فشل تحديث النقاط:", e);
      return null;
    }
  }

  
    
  // ========== نافذة الاسم المستعار ==========    
  async function showAliasModal() {    
    return new Promise((resolve) => {    
      const modal = document.createElement("div");    
      modal.style.cssText = "position: fixed; top:0; left:0; width:100%; height:100%; background: rgba(0,0,0,0.75); display:flex; justify-content:center; align-items:center; z-index: 9999; transition: opacity 0.3s ease;";    
      modal.style.opacity = 0;    
      setTimeout(() => modal.style.opacity = 1, 10);    
    
      modal.innerHTML = `    
        <div style="background:#0f172a; padding:20px; border-radius:12px; max-width: 360px; width: 90%; color:#e2e8f0; font-family: 'Cairo', sans-serif; box-shadow: 0 0 15px rgba(0,0,0,0.5);">    
          <h3 style="margin-top:0; margin-bottom:10px; font-size: 1.2rem;">🌙 اختر اسمك المستعار</h3>    
          <input type="text" id="aliasInputModal" placeholder="مثل: ظلّ، أمون، نازك..." style="width:100%; padding:10px; border-radius:6px; border:none; font-size:1rem;" />    
          <div style="margin-top:12px; text-align:right;">    
            <button id="aliasCancel" style="margin-right:10px; padding:6px 14px; border:none; border-radius:4px; background:#ef4444; color:#fff; cursor:pointer;">إلغاء</button>    
            <button id="aliasSubmit" style="padding:6px 14px; border:none; border-radius:4px; background:#38bdf8; color:#0f172a; cursor:pointer;">تأكيد</button>    
          </div>    
          <p id="aliasError" style="color:#f87171; margin-top:10px; display:none;"></p>    
        </div>    
      `;    
      document.body.appendChild(modal);    
    
      const input = modal.querySelector("#aliasInputModal");    
      const submitBtn = modal.querySelector("#aliasSubmit");    
      const cancelBtn = modal.querySelector("#aliasCancel");    
      const errorP = modal.querySelector("#aliasError");    
    
      input.focus();    
    
      function cleanUp() {    
        modal.remove();    
        window.removeEventListener("keydown", onKeyDown);    
      }    
    
      function onKeyDown(e) {    
        if (e.key === "Escape") {    
          cleanUp();    
          resolve(null);    
        }    
      }    
    
      window.addEventListener("keydown", onKeyDown);    
    
      cancelBtn.onclick = () => {    
        cleanUp();    
        resolve(null);    
      };    
    
      submitBtn.onclick = async () => {    
        const val = input.value.trim();    
        if (val.length < 2) {    
          errorP.style.display = "block";    
          errorP.textContent = "الاسم المستعار قصير جداً.";    
          return;    
        }    
        if (val.length > 30) {    
          errorP.style.display = "block";    
          errorP.textContent = "الاسم طويل جداً.";    
          return;    
        }    
        if (/[^a-zA-Z0-9ء-ي\u0600-\u06FF\s\-_.]/.test(val)) {    
          errorP.textContent = "الاسم يحتوي على رموز غير مسموحة.";    
          return;    
        }    
    
        // تحقق من الاسم مكرر؟    
        const exists = await db.collection("users").where("alias", "==", val).get();    
        if (!exists.empty) {    
          errorP.textContent = "هذا الاسم مستخدم بالفعل.";    
          return;    
        }    
    
        cleanUp();    
        resolve(val);    
      };    
    });    
  }    
    
  // ========== إشعارات FCM ==========    
  async function requestNotificationPermission(user) {    
    try {    
      if (!messaging) return;    
      if (Notification.permission === "default") {    
        const permission = await Notification.requestPermission();    
        if (permission !== "granted") return;    
      }    
      const token = await messaging.getToken({    
        vapidKey: "BHuo9yozD49Ozy1EjzzQ7LoiqhQyt5ya_galZamcc5yeJxYPZ-eJ8kv05ANrL94mHcUlhXvkmxNMp6s-5CncQq8"    
      });    
      if (token && user) {    
        await db.collection("users").doc(user.uid).set({ fcmToken: token }, { merge: true });    
      }    
    } catch (e) {    
      console.warn("فشل تفعيل الإشعارات:", e);    
    }    
  }    
    
  // ========== عدد الأرواح ==========    
  async function updateSubscriberCount() {    
    try {    
      const snapshot = await db.collection("users").where("alias", "!=", null).get();    
      const countElem = document.getElementById("subscriberCount");    
      if (countElem) countElem.textContent = `عدد الأرواح الشفقية: ${snapshot.size}`;    
    } catch (e) {    
      console.warn("فشل في جلب عدد المشتركين", e);    
    }    
  }    
    
  // ========== auth listener ==========    
  auth.onAuthStateChanged(async (user) => {    
    currentUser = user;    
    const btn = document.getElementById("subscribeBtn");    
    if (!btn) return;    
    
    if (user) {    
      try {    
        const doc = await db.collection("users").doc(user.uid).get();    
        let data = doc.exists ? doc.data() : {};    
        let alias = data.alias || null;    
    
        if (!alias) {    
          alias = await showAliasModal();    
          if (!alias) {    
            alert("الاسم المستعار مطلوب للاشتراك.");    
            await auth.signOut();    
            btn.disabled = false;    
            btn.textContent = "اشتركي الآن";    
            return;    
          }    
    
          await db.collection("users").doc(user.uid).set({    
            alias,    
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),    
            points: 10    
          }, { merge: true });    
        }    
    
        const result = await updateUserPoints(user.uid);    
        if (!result) return;    
    
        const info = document.getElementById("userInfoDisplay");    
        if (info) info.textContent = `👤 ${alias} – ${result.rank} – ${result.points} نقطة`;    
    
        const rankElem = document.getElementById("userRankDisplay");    
        if (rankElem) rankElem.textContent = `${result.rank} – ${result.points} نقطة`;    
    
        btn.textContent = "مشترك ✅";    
        btn.disabled = true;    
        updateSubscriberCount();    
        requestNotificationPermission(user);    
    
      } catch (e) {    
        console.error("فشل تحميل بيانات المستخدم:", e);    
      }    
    } else {    
      btn.textContent = "اشتركي الآن";    
      btn.disabled = false;    
      updateSubscriberCount();    
    }    
  });    
    
  // ========== زر الاشتراك ==========    
  subscribeBtn.onclick = async () => {
  if (subscribeBtn.disabled || subscribeBtn.dataset.locked === "true") return;
  subscribeBtn.dataset.locked = "true";
  subscribeBtn.disabled = true;
  subscribeBtn.textContent = "...جاري الاشتراك";

  try {
    if (!currentUser) {
      await auth.signInAnonymously();
    }
  } catch (e) {
    alert("فشل تسجيل الدخول.");
    subscribeBtn.disabled = false;
    subscribeBtn.textContent = "اشتركي الآن";
    subscribeBtn.dataset.locked = "false";
  }
};
  }    
    
  // ========== Service Worker ==========    
  if ('serviceWorker' in navigator) {    
    navigator.serviceWorker.register('/firebase-messaging-sw.js')    
      .then((reg) => console.log("Service Worker مسجل:", reg))    
      .catch((err) => console.error("فشل تسجيل Service Worker:", err));    
  }    
    
  // ========== تشغيل أولي ==========
updateSubscriberCount();
}

// ========== تصدير الدوال العامة ==========
window.updateUserPoints = updateUserPoints;
window.getCurrentUserId = () => currentUser?.uid || null;
