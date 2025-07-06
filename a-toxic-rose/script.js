
// ========== Firebase Init ==========  
const firebaseConfig = {  
  apiKey: "AIzaSyBtTc7yWNfNkG0oVSbpq0V9A6DHTgZoGBM",  
  authDomain: "works-rawan.firebaseapp.com",  
  projectId: "works-rawan",  
  storageBucket: "works-rawan.appspot.com",  
  messagingSenderId: "986254083746",  
  appId: "1:986254083746:web:17f7db0389c94473f0b9fb"  
};  
firebase.initializeApp(firebaseConfig);  
const auth = firebase.auth();  
const db = firebase.firestore();  
  
let currentUser = null;  
  
// ========== تسجيل الدخول ==========  
const loginBtn = document.getElementById("loginBtn");  
const logoutBtn = document.getElementById("logoutBtn");  
const userInfo = document.getElementById("userInfo");  
  
auth.onAuthStateChanged(user => {
  currentUser = user;
  if (loginBtn && logoutBtn && userInfo) {
    if (user) {
      loginBtn.style.display = "none";
      logoutBtn.style.display = "inline-block";
      userInfo.textContent = `مرحباً، ${user.displayName || user.email}`;
    } else {
      loginBtn.style.display = "inline-block";
      logoutBtn.style.display = "none";
      userInfo.textContent = "";
    }
  }
});
  
loginBtn.onclick = () => {  
  const provider = new firebase.auth.GoogleAuthProvider();  
  auth.signInWithPopup(provider).catch(console.error);  
};  
logoutBtn.onclick = () => auth.signOut();  
  
// ========== أدوات ==========  
function sanitize(text) {  
  const div = document.createElement("div");  
  div.textContent = text;  
  return div.innerHTML.replace(/\n/g, "<br>");  
}  
  
// ========== إرسال التعليق أو الرد ==========  
function handleSend(textarea, sendBtn, paraId = null, parentId = null) {  
  const val = textarea.value.trim();  
  if (!val || !currentUser) return alert("يجب تسجيل الدخول وكتابة رد");  
  
  const payload = {  
    text: val,  
    userEmail: currentUser.email,  
    userId: currentUser.uid,  
    timestamp: firebase.firestore.FieldValue.serverTimestamp(),  
    parentId: parentId || null,  
    depth: parentId ? 1 : 0,  
    paragraphId: paraId || null  
  };  
  
  db.collection("comments").add(payload).then(docRef => {  
    textarea.value = "";  
    sendBtn.disabled = true;  
  
    if (parentId) {  
      loadReplies(parentId);  
  
      // إشعار  
      db.collection("comments").doc(parentId).get().then(doc => {  
        if (!doc.exists) return;  
        const original = doc.data();  
        const toUserId = original.userId;  
        if (toUserId !== currentUser.uid) {  
          db.collection("notifications").add({  
            toUserId: toUserId,  
            fromUserId: currentUser.uid,  
            commentId: parentId,  
            replyId: docRef.id,  
            paragraphId: original.paragraphId,  
            pageUrl: window.location.pathname,  
            read: false,  
            timestamp: firebase.firestore.FieldValue.serverTimestamp()  
          });  
        }  
      });  
  
    } else {  
      loadComments(paraId);  
    }  
  }).catch(e => alert("فشل الإرسال: " + e.message));  
}  
  
// ========== تحميل الفقرات والتعليقات ==========  
function renderParagraphs(partId = "toxic-part-1") {  
  const rawContent = document.getElementById("raw-content").textContent.trim();  
  const paragraphs = rawContent.split(/\n\s*\n/);  
  const container = document.getElementById("rendered-content");  
  container.innerHTML = "";  
  
  paragraphs.forEach((text, index) => {  
    const paraId = `${partId}-p-${index + 1}`;  
    const paraDiv = document.createElement("div");  
    paraDiv.className = "paragraph";  
    paraDiv.id = paraId;  
  
    const p = document.createElement("p");  
    p.innerHTML = sanitize(text.trim());  
    paraDiv.appendChild(p);  
  
    const commentBtn = document.createElement("button");  
    commentBtn.textContent = "💬";  
    commentBtn.style.cssText = "margin-top:10px;background:transparent;border:none;color:#38bdf8;font-size:18px;cursor:pointer";  
    commentBtn.onclick = () => toggleCommentBox(paraId);  
    paraDiv.appendChild(commentBtn);  
  
    const commentBox = document.createElement("div");  
    commentBox.className = "comment-box";  
    commentBox.id = `box-${paraId}`;  
    commentBox.style.display = "none";  
    commentBox.innerHTML = `  
      <div class="comments"></div>  
      <textarea placeholder="اكتب تعليقك هنا..."></textarea>  
      <button class="send-comment" disabled>أرسل</button>  
    `;  
  
    const textarea = commentBox.querySelector("textarea");  
    const sendBtn = commentBox.querySelector("button");  
  
    textarea.oninput = () => {  
      sendBtn.disabled = !textarea.value.trim() || !currentUser;  
    };  
  
    sendBtn.onclick = () => handleSend(textarea, sendBtn, paraId);  
  
    paraDiv.appendChild(commentBox);  
    container.appendChild(paraDiv);  
  });  
}  
  
function toggleCommentBox(paraId) {  
  const box = document.getElementById(`box-${paraId}`);  
  if (box.style.display === "none") {  
    box.style.display = "block";  
    loadComments(paraId);  
  } else {  
    box.style.display = "none";  
  }  
}  
  
// ========== تحميل التعليقات ==========  
// دالة تحميل التعليقات الأساسية (depth=0)
function loadComments(paraId) {
  const container = document.getElementById(`box-${paraId}`).querySelector(".comments");
  container.innerHTML = "تحميل...";

  db.collection("comments")
    .where("paragraphId", "==", paraId)
    .where("depth", "==", 0)
    .orderBy("timestamp", "asc")
    .get()
    .then(snapshot => {
      container.innerHTML = "";
      if (snapshot.empty) {
        container.innerHTML = "<i>لا توجد تعليقات بعد.</i>";
        return;
      }

      snapshot.forEach(doc => {
        const data = doc.data();
        const commentId = doc.id;
        const commentDiv = createCommentDiv(data, commentId);
        container.appendChild(commentDiv);

        // تحميل الردود المتداخلة داخل هذا التعليق
        loadReplies(commentId, commentDiv, 1);
      });
    });
}

// دالة إنشاء div التعليق مع زر الرد
function createCommentDiv(data, commentId) {
  const div = document.createElement("div");
  div.className = "comment-item";
  div.id = `comment-${commentId}`;
  div.style = "margin-bottom:12px; border-bottom:1px solid #334155; padding-bottom:8px;";

  div.innerHTML = `
    <b>${sanitize(data.userEmail)}</b><br>
    ${sanitize(data.text)}<br>
    <button class="reply-btn" data-id="${commentId}" style="background:transparent; border:none; color:#38bdf8; cursor:pointer; margin-top:5px;">رد</button>
    <div class="reply-form" id="reply-form-${commentId}" style="display:none; margin-top:6px;">
      <textarea placeholder="اكتب ردك..." rows="2" style="width: 100%; background:#0a101d; color:#cfefff; border-radius:6px; padding:6px;"></textarea>
      <button disabled style="margin-top:4px; padding:6px 10px; border-radius:6px; background:#0f172a; color:#7dd3fc; border:none;">أرسل</button>
    </div>
    <div class="replies-container" id="replies-container-${commentId}" style="margin-left: 20px; margin-top: 10px;"></div>
  `;

  // تفعيل زر الرد وعناصر الرد
  const replyBtn = div.querySelector(".reply-btn");
  const replyForm = div.querySelector(`#reply-form-${commentId}`);
  const replyTextarea = replyForm.querySelector("textarea");
  const replySendBtn = replyForm.querySelector("button");

  replyBtn.onclick = () => {
    replyForm.style.display = replyForm.style.display === "none" ? "block" : "none";
    if (replyForm.style.display === "block") {
      replyTextarea.focus();
    }
  };

  replyTextarea.oninput = () => {
    replySendBtn.disabled = !replyTextarea.value.trim() || !currentUser;
  };

  replySendBtn.onclick = () => {
    handleSend(replyTextarea, replySendBtn, null, commentId);
  };

  return div;
}

// دالة تحميل الردود المتداخلة (recursion)
function loadReplies(parentId, parentDiv, depth) {
  const container = parentDiv.querySelector(`#replies-container-${parentId}`);
  if (!container) return; // حماية

  // تحميل الردود
  db.collection("comments")
    .where("parentId", "==", parentId)
    .orderBy("timestamp", "asc")
    .get()
    .then(snapshot => {
      if (snapshot.empty) return; // ما في ردود تحت

      snapshot.forEach(doc => {
        const data = doc.data();
        const replyId = doc.id;
        // إنشاء div الرد
        const replyDiv = document.createElement("div");
        replyDiv.className = "comment-reply-item";
        replyDiv.style = `margin-bottom:8px; border-left: 2px solid #38bdf8; padding-left: 8px; margin-left: ${depth * 20}px;`;

        replyDiv.id = `comment-${replyId}`;
        replyDiv.innerHTML = `
          <b>${sanitize(data.userEmail)}</b><br>
          ${sanitize(data.text)}<br>
          <button class="reply-btn" data-id="${replyId}" style="background:transparent; border:none; color:#38bdf8; cursor:pointer; margin-top:5px;">رد</button>
          <div class="reply-form" id="reply-form-${replyId}" style="display:none; margin-top:6px;">
            <textarea placeholder="اكتب ردك..." rows="2" style="width: 100%; background:#0a101d; color:#cfefff; border-radius:6px; padding:6px;"></textarea>
            <button disabled style="margin-top:4px; padding:6px 10px; border-radius:6px; background:#0f172a; color:#7dd3fc; border:none;">أرسل</button>
          </div>
          <div class="replies-container" id="replies-container-${replyId}" style="margin-top:10px;"></div>
        `;

        container.appendChild(replyDiv);

        // تفعيل أزرار الرد
        const replyBtn = replyDiv.querySelector(".reply-btn");
        const replyForm = replyDiv.querySelector(`#reply-form-${replyId}`);
        const replyTextarea = replyForm.querySelector("textarea");
        const replySendBtn = replyForm.querySelector("button");

        replyBtn.onclick = () => {
          replyForm.style.display = replyForm.style.display === "none" ? "block" : "none";
          if (replyForm.style.display === "block") {
            replyTextarea.focus();
          }
        };

        replyTextarea.oninput = () => {
          replySendBtn.disabled = !replyTextarea.value.trim() || !currentUser;
        };

        replySendBtn.onclick = () => {
          handleSend(replyTextarea, replySendBtn, null, replyId);
        };

        // تكرار التحميل للردود العميقة
        loadReplies(replyId, replyDiv, depth + 1);
      });
    });
}
// ========== عند التحميل ==========  
window.addEventListener("DOMContentLoaded", () => {
  renderParagraphs("toxic-part-1");

  const hash = window.location.hash;
  if (hash.startsWith("#reply-")) {
    const el = document.querySelector(hash);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      el.style.background = "rgba(125, 211, 252, 0.1)";
      el.style.border = "1px solid #7dd3fc";
    }
  }
});
