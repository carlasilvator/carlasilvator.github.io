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

const loginBtn = document.getElementById("loginBtn");
const logoutBtn = document.getElementById("logoutBtn");
const userInfo = document.getElementById("userInfo");
let currentUser = null;

auth.onAuthStateChanged(user => {
  currentUser = user;
  if (user) {
    loginBtn.style.display = "none";
    logoutBtn.style.display = "inline-block";
    userInfo.textContent = `مرحباً، ${user.displayName || user.email}`;
  } else {
    loginBtn.style.display = "inline-block";
    logoutBtn.style.display = "none";
    userInfo.textContent = "";
  }
});

loginBtn.onclick = () => {
  const provider = new firebase.auth.GoogleAuthProvider();
  auth.signInWithPopup(provider).catch(console.error);
};

logoutBtn.onclick = () => auth.signOut();

function sanitize(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function renderParagraphs(partId = 'toxic-rose-1') {
  const rawContent = document.getElementById('raw-content').textContent.trim();
  const paragraphs = rawContent.split(/\n\s*\n/);
  const container = document.getElementById('rendered-content');
  container.innerHTML = '';

  paragraphs.forEach((text, index) => {
    const paraId = `${partId}-p-${index+1}`;
    const paraDiv = document.createElement('div');
    paraDiv.className = 'paragraph';
    paraDiv.id = paraId;

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

    sendBtn.onclick = () => {
      const val = textarea.value.trim();
      if (!val || !currentUser) return alert("يجب تسجيل الدخول وكتابة تعليق");
      db.collection("comments").add({
        paragraphId: paraId,
        text: val,
        userEmail: currentUser.email,
        userId: currentUser.uid,
        timestamp: firebase.firestore.FieldValue.serverTimestamp()
      }).then(() => {
        textarea.value = '';
        sendBtn.disabled = true;
        loadComments(paraId);
      }).catch(e => alert('فشل الإرسال: ' + e.message));
    };

    paraDiv.appendChild(commentBox);
    container.appendChild(paraDiv);
  });
}

function toggleCommentBox(paraId) {
  const box = document.getElementById(`box-${paraId}`);
  if (box.style.display === 'none') {
    box.style.display = 'block';
    loadComments(paraId);
  } else {
    box.style.display = 'none';
  }
}
// دالة تحميل التعليقات مع عرض زر الرد وعدد الردود
function loadComments(paraId) {
  const box = document.getElementById(`box-${paraId}`);
  const commentList = box.querySelector('.comments');
  commentList.innerHTML = 'تحميل...';

  db.collection("comments")
    .where("paragraphId", "==", paraId)
    .orderBy("timestamp", "asc")
    .get()
    .then(async (snapshot) => {
      commentList.innerHTML = '';
      if (snapshot.empty) {
        commentList.innerHTML = '<i>لا توجد تعليقات بعد.</i>';
      } else {
        // لجلب الردود لجميع التعليقات في البارت دفعة واحدة
        const commentDocs = snapshot.docs;

        for (const doc of commentDocs) {
          const data = doc.data();
          const commentId = doc.id;

          // العنصر الأساسي للتعليق
          const div = document.createElement('div');
          div.className = "comment-item";
          div.style = "margin-bottom:12px; border-bottom:1px solid #334155; padding-bottom:8px; word-break: break-word;";

          // محتوى التعليق
          div.innerHTML = `
            <b style="color:#7dd3fc">${sanitize(data.userEmail)}</b><br>
            ${sanitize(data.text)}
            <br>
            <span class="reply-controls" style="font-size:0.9rem; color:#38bdf8; cursor:pointer; user-select:none;">
              <span class="reply-btn" data-commentid="${commentId}">رد</span> |
              <span class="replies-toggle" data-commentid="${commentId}">الردود (0)</span>
            </span>
            <div class="replies-container" id="replies-${commentId}" style="display:none; margin-top:10px; padding-left:15px; border-left:2px solid #38bdf8;"></div>
            <div class="reply-form-container" id="reply-form-${commentId}" style="display:none; margin-top:8px;">
              <textarea placeholder="اكتب ردك هنا..." style="width:100%; border-radius:8px; background:#020611; color:#cfefff; padding:6px;" rows="3"></textarea>
              <button disabled style="margin-top:4px; padding:6px 10px; border-radius:8px; background:#0f172a; color:#7dd3fc; border:none; cursor:pointer;">أرسل الرد</button>
            </div>
          `;

          commentList.appendChild(div);

          // جلب عدد الردود وتحديث زر "الردود (عدد)"
          updateRepliesCount(commentId);

          // ربط أحداث الزر "الرد"
          const replyBtn = div.querySelector('.reply-btn');
          replyBtn.onclick = () => toggleReplyForm(commentId);

          // ربط أحداث زر "الردود (عدد)"
          const repliesToggle = div.querySelector('.replies-toggle');
          repliesToggle.onclick = () => toggleReplies(commentId);
        }
      }
    }).catch(e => {
      commentList.innerHTML = 'فشل تحميل التعليقات.';
      console.error(e);
    });
}

// تحديث عدد الردود للزر الخاص بالتعليق
function updateRepliesCount(commentId) {
  db.collection("replies")
    .where("commentId", "==", commentId)
    .get()
    .then(snapshot => {
      const count = snapshot.size;
      const repliesToggle = document.querySelector(`.replies-toggle[data-commentid="${commentId}"]`);
      if (repliesToggle) {
        repliesToggle.textContent = `الردود (${count})`;
      }
    });
}

// إظهار/إخفاء صندوق الرد
function toggleReplyForm(commentId) {
  const form = document.getElementById(`reply-form-${commentId}`);
  if (form.style.display === 'none') {
    form.style.display = 'block';

    const textarea = form.querySelector('textarea');
    const sendBtn = form.querySelector('button');

    sendBtn.disabled = true;

    // تمكين زر الإرسال فقط إذا هناك نص و المستخدم مسجل دخول
    textarea.oninput = () => {
      sendBtn.disabled = !textarea.value.trim() || !currentUser;
    };

    sendBtn.onclick = () => {
      const val = textarea.value.trim();
      if (!val || !currentUser) return alert("يجب تسجيل الدخول وكتابة رد");

      db.collection("replies").add({
        commentId: commentId,
        text: val,
        userEmail: currentUser.email,
        userId: currentUser.uid,
        timestamp: firebase.firestore.FieldValue.serverTimestamp()
      }).then(() => {
        textarea.value = '';
        sendBtn.disabled = true;
        loadReplies(commentId);
        updateRepliesCount(commentId);
      }).catch(e => alert('فشل إرسال الرد: ' + e.message));
    };
  } else {
    form.style.display = 'none';
  }
}

// تحميل الردود وعرضها تحت التعليق
function loadReplies(commentId) {
  const container = document.getElementById(`replies-${commentId}`);
  container.innerHTML = 'تحميل الردود...';

  db.collection("replies")
    .where("commentId", "==", commentId)
    .orderBy("timestamp", "asc")
    .get()
    .then(snapshot => {
      if (snapshot.empty) {
        container.innerHTML = '<i>لا توجد ردود بعد.</i>';
      } else {
        container.innerHTML = '';
        snapshot.forEach(doc => {
          const data = doc.data();
          const div = document.createElement('div');
          div.style = "margin-bottom:8px; padding:6px; background:rgba(15,23,42,0.9); border-radius:8px; color:#a0cfff; word-break: break-word;";
          div.innerHTML = `<b style="color:#7dd3fc">${sanitize(data.userEmail)}</b><br>${sanitize(data.text)}`;
          container.appendChild(div);
        });
      }
    }).catch(e => {
      container.innerHTML = 'فشل تحميل الردود.';
      console.error(e);
    });
}

// إظهار/إخفاء الردود
function toggleReplies(commentId) {
  const container = document.getElementById(`replies-${commentId}`);
  if (container.style.display === 'none') {
    container.style.display = 'block';
    loadReplies(commentId);
  } else {
    container.style.display = 'none';
  }
      }

document.addEventListener("DOMContentLoaded", () => {
  renderParagraphs("toxic-part-1");

  document.getElementById("prevBtn").href = "#";
  document.getElementById("nextBtn").href = "#";
});
