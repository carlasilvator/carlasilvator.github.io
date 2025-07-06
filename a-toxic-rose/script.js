// ================== Firebase تهيئة ================== const firebaseConfig = { apiKey: "AIzaSyBtTc7yWNfNkG0oVSbpq0V9A6DHTgZoGBM", authDomain: "works-rawan.firebaseapp.com", projectId: "works-rawan", storageBucket: "works-rawan.appspot.com", messagingSenderId: "986254083746", appId: "1:986254083746:web:17f7db0389c94473f0b9fb" };

firebase.initializeApp(firebaseConfig); const auth = firebase.auth(); const db = firebase.firestore();

// ========== عناصر الإشعارات ========== const notificationsDiv = document.getElementById('notifications'); const notificationsList = document.getElementById('notifications-list'); const showNotificationsBtn = document.getElementById('show-notifications'); const closeNotificationsBtn = document.getElementById('close-notifications'); let currentUser = null;

showNotificationsBtn.onclick = () => { notificationsDiv.style.display = 'block'; loadNotifications(); };

closeNotificationsBtn.onclick = () => { notificationsDiv.style.display = 'none'; };

function loadNotifications() { if (!currentUser) { notificationsList.innerHTML = '<li>يجب تسجيل الدخول لعرض الإشعارات.</li>'; return; }

notificationsList.innerHTML = '<li>جارٍ تحميل الإشعارات...</li>';

db.collection("notifications") .where("toUserId", "==", currentUser.uid) .orderBy("timestamp", "desc") .limit(20) .get() .then(snapshot => { if (snapshot.empty) { notificationsList.innerHTML = '<li>لا توجد إشعارات جديدة.</li>'; return; }

notificationsList.innerHTML = '';
  snapshot.forEach(doc => {
    const data = doc.data();
    const li = document.createElement('li');
    li.style.cssText = 'cursor:pointer; margin-bottom:8px; border-bottom:1px solid #334155; padding-bottom:6px;';
    li.textContent = `شخص ما رد على تعليقك: "${data.commentId}"`;
    li.onclick = () => {
      window.location.href = `${data.pageUrl}#reply-${data.replyId}`;
      db.collection("notifications").doc(doc.id).update({ read: true });
    };
    notificationsList.appendChild(li);
  });
})
.catch(e => {
  notificationsList.innerHTML = '<li>فشل تحميل الإشعارات.</li>';
  console.error(e);
});

}

// ========== تسجيل الدخول والخروج ========== const loginBtn = document.getElementById("loginBtn"); const logoutBtn = document.getElementById("logoutBtn"); const userInfo = document.getElementById("userInfo");

auth.onAuthStateChanged(user => { currentUser = user; if (user) { loginBtn.style.display = "none"; logoutBtn.style.display = "inline-block"; userInfo.textContent = مرحباً، ${user.displayName || user.email}; } else { loginBtn.style.display = "inline-block"; logoutBtn.style.display = "none"; userInfo.textContent = ""; } });

loginBtn.onclick = () => { const provider = new firebase.auth.GoogleAuthProvider(); auth.signInWithPopup(provider).catch(console.error); };

logoutBtn.onclick = () => auth.signOut();

// ========== أدوات ========== function sanitize(text) { const div = document.createElement('div'); div.textContent = text; return div.innerHTML; }

// ========== عرض الفقرات والتعليقات ========== function renderParagraphs(partId = 'toxic-part-1') { const rawContent = document.getElementById('raw-content').textContent.trim(); const paragraphs = rawContent.split(/\n\s*\n/); const container = document.getElementById('rendered-content'); container.innerHTML = '';

paragraphs.forEach((text, index) => { const paraId = ${partId}-p-${index + 1}; const paraDiv = document.createElement('div'); paraDiv.className = 'paragraph'; paraDiv.id = paraId;

const p = document.createElement('p');
p.innerHTML = sanitize(text.trim());
paraDiv.appendChild(p);

const commentBtn = document.createElement('button');
commentBtn.textContent = '💬';
commentBtn.style.cssText = 'margin-top:10px;background:transparent;border:none;color:#38bdf8;font-size:18px;cursor:pointer';
commentBtn.onclick = () => toggleCommentBox(paraId);
paraDiv.appendChild(commentBtn);

const commentBox = document.createElement('div');
commentBox.className = 'comment-box';
commentBox.id = `box-${paraId}`;
commentBox.style.display = 'none';
commentBox.innerHTML = `
  <div class="comments"></div>
  <textarea placeholder="اكتب تعليقك هنا..."></textarea>
  <button class="send-comment" disabled>أرسل</button>
`;

const sendBtn = commentBox.querySelector('button.send-comment');
const textarea = commentBox.querySelector('textarea');

textarea.addEventListener('input', () => {
  sendBtn.disabled = !textarea.value.trim() || !currentUser;
});

sendBtn.onclick = () => handleSend(textarea, sendBtn, paraId);

paraDiv.appendChild(commentBox);
container.appendChild(paraDiv);

}); }

function toggleCommentBox(paraId) { const box = document.getElementById(box-${paraId}); if (box.style.display === 'none') { box.style.display = 'block'; loadComments(paraId); } else { box.style.display = 'none'; } }

function handleSend(textarea, sendBtn, paraId, commentId = null) { const val = textarea.value.trim(); if (!val || !currentUser) return alert("يجب تسجيل الدخول وكتابة رد");

const payload = { text: val, userEmail: currentUser.email, userId: currentUser.uid, timestamp: firebase.firestore.FieldValue.serverTimestamp() };

if (commentId) { payload.commentId = commentId; db.collection("comments").add(payload).then(docRef => { textarea.value = ""; sendBtn.disabled = true; loadReplies(commentId);

db.collection("comments").doc(commentId).get().then(doc => {
    if (!doc.exists) return;
    const original = doc.data();
    const toUserId = original.userId;

    if (toUserId !== currentUser.uid) {
      db.collection("notifications").add({
        toUserId: toUserId,
        fromUserId: currentUser.uid,
        commentId: commentId,
        replyId: docRef.id,
        paragraphId: original.paragraphId,
        pageUrl: window.location.pathname,
        read: false,
        timestamp: firebase.firestore.FieldValue.serverTimestamp()
      });
    }
  });
}).catch(e => alert("فشل إرسال الرد: " + e.message));

} else { payload.paragraphId = paraId; db.collection("comments").add(payload).then(() => { textarea.value = ""; sendBtn.disabled = true; loadComments(paraId); }).catch(e => alert("فشل إرسال التعليق: " + e.message)); } }

// Scroll & highlight if hash exists window.addEventListener("DOMContentLoaded", () => { const hash = window.location.hash; if (hash.startsWith("#reply-")) { const el = document.querySelector(hash); if (el) { el.scrollIntoView({ behavior: "smooth", block: "center" }); el.style.background = "rgba(125, 211, 252, 0.1)"; el.style.border = "1px solid #7dd3fc"; el.style.transition = "all 0.5s ease-in-out"; } }

renderParagraphs("toxic-part-1"); });

