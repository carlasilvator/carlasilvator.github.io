// ========== Firebase Init ==========
if (typeof firebase === "undefined") {
  console.error("Firebase غير محمّل.");
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

  // ========== حساب رتبة المستخدم ==========
  function calculateRank(commentCount) {
    if (commentCount >= 30) return "👑 متفاعل جداً (نخبة الأرواح)";
    if (commentCount >= 10) return "🥈 متفاعل عادي";
    if (commentCount > 0) return "🥀 غير متفاعل";
    return "🎉 عضو جديد";
  }

  async function updateUserRank(uid) {
    try {
      const commentsSnap = await db.collection("comments").where("userId", "==", uid).get();
      const commentCount = commentsSnap.size;
      const newRank = calculateRank(commentCount);
      await db.collection("users").doc(uid).set({ rank: newRank }, { merge: true });
      return newRank;
    } catch (e) {
      console.error("فشل تحديث الرتبة:", e);
      return null;
    }
  }

  // ========== نافذة اختيار الاسم المستعار ==========
  async function showAliasModal() {
    return new Promise((resolve) => {
      const modal = document.createElement("div");
      modal.style.cssText = "position: fixed; top:0; left:0; width:100%; height:100%; background: rgba(0,0,0,0.75); display:flex; justify-content:center; align-items:center; z-index: 9999;";
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

      submitBtn.onclick = () => {
  submitBtn.disabled = true;

  const val = input.value.trim();
  if (val.length < 2) {
    errorP.style.display = "block";
    errorP.textContent = "الاسم المستعار قصير جداً.";
    input.focus();
    submitBtn.disabled = false;
    return;
  }
  if (val.length > 30) {
    errorP.style.display = "block";
    errorP.textContent = "الاسم طويل جداً، اختصره قليلًا.";
    input.focus();
    submitBtn.disabled = false;
    return;
  }
        if (/<[^>]*>/g.test(val)) {
  errorP.textContent = "الرموز غير مسموحة.";
  return;
    }

  cleanUp();
  resolve(val);
};
      
    });
  }

  // ========== طلب إذن الإشعارات ==========
  async function requestNotificationPermission(user) {
  try {
    if (!messaging) return;

    // ✅ التنبيه لازم يكون هون:
    if (Notification.permission !== "granted") {
      alert("🔔 لم يتم تفعيل الإشعارات بعد.\nيرجى السماح من إعدادات المتصفح.");
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
    alert("⚠️ حدث خطأ أثناء محاولة تفعيل الإشعارات.");
  }
  }

  // ========== تحديث عدد المشتركين ==========
  async function updateSubscriberCount() {
    try {
      const snapshot = await db.collection("users").get();
      const countElem = document.getElementById("subscriberCount");
      if (countElem)
        countElem.textContent = `عدد الأرواح الشفقية: ${snapshot.size}`;
    } catch (e) {
      console.warn("فشل في جلب عدد المشتركين", e);
    }
  }

  // ========== الاستماع لتغيّر حالة الدخول ==========
  
     auth.onAuthStateChanged(async (user) => {
  currentUser = user;
  const btn = document.getElementById("subscribeBtn");
  const rankElem = document.getElementById("userRankDisplay");
  if (!btn) return;

  if (user) {
    try {
      const doc = await db.collection("users").doc(user.uid).get();
      let alias = doc.exists ? doc.data().alias : null;
      let rank = doc.exists ? doc.data().rank : null;

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
          rank: "🎉 عضو جديد"
        }, { merge: true });
      }

      // 🟡 تحديث الرتبة (يعتمد على عدد التعليقات)
      rank = await updateUserRank(user.uid);

      // 🟢 عرض الاسم والرتبة في مكان مخصص
      if (user && alias && rank) {
        const info = document.getElementById("userInfoDisplay");
        if (info) info.textContent = `👤 ${alias} – ${rank}`;
      }

      if (rankElem && rank) rankElem.textContent = rank;

      btn.textContent = "مشترك ✅";
      btn.disabled = true;

      updateSubscriberCount();
      requestNotificationPermission(user);

    } catch (e) {
      console.error("خطأ أثناء تحميل بيانات المستخدم:", e);
    }
  } else {
    btn.textContent = "اشتركي الآن";
    btn.disabled = false;
    updateSubscriberCount();
  }
});   
        
        

  // ========== حدث زر الاشتراك ==========
  const subscribeBtn = document.getElementById("subscribeBtn");
  if (subscribeBtn) {
    subscribeBtn.onclick = async () => {
      if (subscribeBtn.disabled) return;
      subscribeBtn.disabled = true;
      subscribeBtn.textContent = "... جاري الاشتراك";
      try {
        if (!currentUser) await auth.signInAnonymously();
      } catch (e) {
        alert("فشل تسجيل الدخول.");
        console.error(e);
        subscribeBtn.disabled = false;
        subscribeBtn.textContent = "اشتركي الآن";
      }
    };
  }

  // ========== تسجيل Service Worker ==========
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/firebase-messaging-sw.js')
      .then((registration) => {
        console.log('تم تسجيل Service Worker بنجاح:', registration);
      })
      .catch((err) => {
        console.error('فشل تسجيل Service Worker:', err);
      });
  }

  // ========== تشغيل أولي ==========
  updateSubscriberCount();
          }
