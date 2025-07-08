// ========== Firebase Init ==========
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
const messaging = firebase.messaging();

let currentUser = null;

// ========== رتب المستخدمين ==========
function calculateRank(commentCount) {
  if (commentCount === 0) return "🎉 عضو جديد";
  if (commentCount < 5) return "🥀 غير متفاعل";
  if (commentCount >= 30) return "👑 متفاعل جداً (نخبة الأرواح)";
  if (commentCount >= 10) return "🥈 متفاعل عادي";
  return "🥀 غير متفاعل"; // افتراضي إذا دخل هنا
}

async function updateUserRank(uid) {
  try {
    const commentsSnap = await db.collection("comments").where("userId", "==", uid).get();
    const commentCount = commentsSnap.size;
    const newRank = calculateRank(commentCount);
    await db.collection("users").doc(uid).set(
      { rank: newRank },
      { merge: true }
    );
    return newRank;
  } catch (e) {
    console.error("فشل تحديث الرتبة:", e);
    return null;
  }
}

// ========== الاسم المستعار ==========
async function showAliasModal() {
  return new Promise((resolve) => {
    const modal = document.createElement("div");
    modal.style.cssText = `
      position: fixed; top:0; left:0; width:100%; height:100%;
      background: rgba(0,0,0,0.75); display:flex; justify-content:center;
      align-items:center; z-index: 9999;
    `;
    modal.innerHTML = `
      <div style="background:#0f172a; padding:20px; border-radius:8px; max-width: 320px; width: 90%; color:#cfefff; font-family: sans-serif;">
        <h3 style="margin-top:0; margin-bottom:10px;">اختر اسمك المستعار</h3>
        <input type="text" id="aliasInputModal" placeholder="الاسم المستعار" style="width:100%; padding:8px; border-radius:4px; border:none; font-size:1rem;" />
        <div style="margin-top:10px; text-align:right;">
          <button id="aliasCancel" style="margin-right:8px; padding:6px 12px; border:none; border-radius:4px; background:#f87171; color:#fff; cursor:pointer;">إلغاء</button>
          <button id="aliasSubmit" style="padding:6px 12px; border:none; border-radius:4px; background:#38bdf8; color:#0f172a; cursor:pointer;">تأكيد</button>
        </div>
        <p id="aliasError" style="color:#f87171; margin-top:8px; display:none;"></p>
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
      const val = input.value.trim();
      if (val.length < 2) {
        errorP.style.display = "block";
        errorP.textContent = "الاسم المستعار قصير جداً، جرب مرة أخرى.";
        input.focus();
        return;
      }
      cleanUp();
      resolve(val);
    };
  });
}

// ========== إشعارات FCM ==========
async function requestNotificationPermission() {
  try {
    if (Notification.permission !== "granted") {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") return;
    }
    const token = await messaging.getToken({
      vapidKey: "BHuo9yozD49Ozy1EjzzQ7LoiqhQyt5ya_galZamcc5yeJxYPZ-eJ8kv05ANrL94mHcUlhXvkmxNMp6s-5CncQq8"
    });
    if (token && currentUser) {
      // استخدم set مع merge لأنه يمكن المستخدم لا يزال جديدًا
      await db.collection("users").doc(currentUser.uid).set(
        { fcmToken: token },
        { merge: true }
      );
    }
  } catch (e) {
    console.warn("لم يتم تفعيل الإشعارات:", e);
  }
}

// ========== عدد المشتركين ==========
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

// ========== بدء التشغيل ==========
auth.onAuthStateChanged(async (user) => {
  currentUser = user;
  const btn = document.getElementById("subscribeBtn");
  const rankElem = document.getElementById("userRankDisplay");
  if (!btn) return;

  if (user) {
    const doc = await db.collection("users").doc(user.uid).get();
    let alias = doc.exists ? doc.data().alias : null;
    let rank = doc.exists ? doc.data().rank : null;

    if (!alias) {
      alias = await showAliasModal();
      if (!alias) {
        alert("الاسم المستعار مطلوب للاشتراك.");
        await auth.signOut();
        return;
      }
      await db.collection("users").doc(user.uid).set({
        alias,
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        rank: "🎉 عضو جديد"
      }, { merge: true });
    }

    rank = await updateUserRank(user.uid);
    if (rankElem && rank) rankElem.textContent = rank;

    btn.textContent = "مشترك ✅";
    btn.disabled = true;
    updateSubscriberCount();
    requestNotificationPermission();
  } else {
    btn.textContent = "اشتركي الآن";
    btn.disabled = false;
    updateSubscriberCount();
  }
});

// ========== زر الاشتراك ==========
const subscribeBtn = document.getElementById("subscribeBtn");
if (subscribeBtn) {
  subscribeBtn.onclick = async () => {
    subscribeBtn.disabled = true;
    try {
      if (!currentUser) await auth.signInAnonymously();
    } catch (e) {
      alert("فشل تسجيل الدخول");
      console.error(e);
      subscribeBtn.disabled = false;
    }
  };
}

// ========== Service Worker ==========
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/firebase-messaging-sw.js')
    .then((registration) => {
      console.log('Service Worker مسجل بنجاح:', registration);
      messaging.useServiceWorker(registration);
    })
    .catch((err) => {
      console.error('فشل تسجيل Service Worker:', err);
    });
}

// ========== تشغيل مبدئي ==========
updateSubscriberCount();
