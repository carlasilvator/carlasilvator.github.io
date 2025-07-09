document.addEventListener("DOMContentLoaded", () => {
  // ========== Firebase Init ==========
  if (typeof firebase === "undefined") {
    console.error("Firebase غير محمّل.");
    return;
  }

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
  let currentUser = null;

  if (firebase.messaging) {
    try {
      messaging = firebase.messaging();
    } catch (e) {
      console.warn("Firebase Messaging غير مفعل:", e);
    }
  } else {
    console.warn("firebase.messaging غير متوفرة. تأكدي من تحميل مكتبة firebase-messaging.");
  }

  // ========== عرض مودال الاسم المستعار ==========
  function showAliasModal() {
    return new Promise((resolve) => {
      const modal = document.createElement("div");
      modal.style.cssText = `
        position: fixed; top:0; left:0; width:100%; height:100%;
        background: rgba(0,0,0,0.75);
        display:flex; justify-content:center; align-items:center;
        z-index: 9999;
      `;
      modal.innerHTML = `
        <div style="background:#0f172a; padding:20px; border-radius:8px; max-width: 320px; width: 90%; color:#cfefff; font-family: sans-serif;">
          <h3 style="margin-top:0; margin-bottom:10px;">اختر اسمك المستعار</h3>
          <input type="text" id="aliasInput" placeholder="الاسم المستعار" style="width:100%; padding:8px; border-radius:4px; border:none; font-size:1rem;" />
          <div style="margin-top:10px; text-align:right;">
            <button id="aliasCancel" style="margin-right:8px; padding:6px 12px; border:none; border-radius:4px; background:#f87171; color:#fff; cursor:pointer;">إلغاء</button>
            <button id="aliasSubmit" style="padding:6px 12px; border:none; border-radius:4px; background:#38bdf8; color:#0f172a; cursor:pointer;">تأكيد</button>
          </div>
          <p id="aliasError" style="color:#f87171; margin-top:8px; display:none;"></p>
        </div>
      `;
      document.body.appendChild(modal);

      const input = modal.querySelector("#aliasInput");
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
        const valid = /^[\u0600-\u06FFa-zA-Z0-9 _-]{2,20}$/.test(val);
        if (!valid) {
          errorP.style.display = "block";
          errorP.textContent = "الاسم غير صالح. استخدم 2-20 حرفًا عربية أو إنجليزية أو أرقام.";
          input.focus();
          return;
        }
        cleanUp();
        resolve(val);
      };
    });
  }

  // ========== زر الاشتراك ==========
  const subscribeBtn = document.getElementById("subscribeBtn");
  const userInfo = document.getElementById("userInfoDisplay");

  if (!subscribeBtn) {
    console.error("زر الاشتراك 'subscribeBtn' غير موجود في الصفحة");
    return;
  }

  subscribeBtn.onclick = async () => {
    if (subscribeBtn.disabled) return;
    subscribeBtn.disabled = true;
    subscribeBtn.textContent = "...جاري الاشتراك";

    try {
      const provider = new firebase.auth.GoogleAuthProvider();
      const result = await auth.signInWithPopup(provider);
      const user = result.user;
      currentUser = user;

      let alias = null;
      const doc = await db.collection("users").doc(user.uid).get();

      if (doc.exists && doc.data().alias) {
        alias = doc.data().alias;
      } else {
        alias = await showAliasModal();
        if (!alias) {
          alert("الاسم المستعار مطلوب.");
          await auth.signOut();
          subscribeBtn.textContent = "اشتركي الآن";
          subscribeBtn.disabled = false;
          return;
        }

        const exists = await db.collection("users").where("alias", "==", alias).get();
        if (!exists.empty) {
          alert("هذا الاسم مستخدم من قبل.");
          await auth.signOut();
          subscribeBtn.textContent = "اشتركي الآن";
          subscribeBtn.disabled = false;
          return;
        }

        await db.collection("users").doc(user.uid).set({
          alias,
          createdAt: firebase.firestore.FieldValue.serverTimestamp(),
          points: 10
        }, { merge: true });
      }

      if (userInfo) userInfo.textContent = `👤 ${alias}`;

      subscribeBtn.textContent = "مشتركة ✅";
      subscribeBtn.disabled = true;

      await requestNotificationPermission(user);
      await updateSubscriberCount();
    } catch (e) {
      console.error("فشل الاشتراك:", e);
      subscribeBtn.textContent = "اشتركي الآن";
      subscribeBtn.disabled = false;
    }
  };

  // ========== تسجيل الخروج ==========
  const logoutBtn = document.getElementById("logoutBtn");
  if (logoutBtn) {
    logoutBtn.onclick = () => auth.signOut().then(() => {
      if (userInfo) userInfo.textContent = "👤 زائر";
      subscribeBtn.disabled = false;
      subscribeBtn.textContent = "اشتركي الآن";
    });
  }

  // ========== حساب الرتبة ==========
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
    if (points >= 210) return { rank: "📚 المستشار", title: "الفرسان" };
    if (points >= 200) return { rank: "🧭 الفارس", title: "الفرسان" };
    if (points >= 150) return { rank: "🚩 متدرب", title: "الغرباء" };
    if (points >= 100) return { rank: "🧍 المواطن", title: "الغرباء" };
    if (points >= 50)  return { rank: "💰 التاجر", title: "الغرباء" };
    return { rank: "🪦 المتشرد", title: "الغرباء" };
  }

  // ========== تحديث النقاط ==========
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

  // ========== إشعارات FCM ==========
  async function requestNotificationPermission(user) {
    try {
      if (!messaging) return;

      if (Notification.permission === "denied") {
        console.warn("تم رفض الإشعارات مسبقًا.");
        return;
      }

      if (Notification.permission === "default") {
        const permission = await Notification.requestPermission();
        if (permission !== "granted") return;
      }

      if (!navigator.serviceWorker?.controller) {
        console.warn("Service Worker لم يُفعّل بعد. لن يتم تسجيل FCM.");
        return;
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

  // ========== عدد المشتركين ==========
  async function updateSubscriberCount() {
    try {
      const snapshot = await db.collection("users")
        .where("alias", ">=", " ") // بديل آمن عن (!= "")
        .get();
      const countElem = document.getElementById("subscriberCount");
      if (countElem) countElem.textContent = `عدد الأرواح الشفقية: ${snapshot.size}`;
    } catch (e) {
      console.warn("فشل في جلب عدد المشتركين", e);
    }
  }

  // ========== Service Worker ==========
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/firebase-messaging-sw.js')
      .then((reg) => console.log("Service Worker مسجل:", reg))
      .catch((err) => console.error("فشل تسجيل Service Worker:", err));
  }

  // ========== تشغيل أولي ==========
  updateSubscriberCount();

  // ========== دوال خارجية ==========
  window.updateUserPoints = updateUserPoints;
  window.getCurrentUserId = () => currentUser?.uid || null;
});
