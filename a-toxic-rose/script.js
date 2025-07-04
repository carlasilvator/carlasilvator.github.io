// تهيئة Firebase
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
const notificationsDiv = document.getElementById('notifications');
const notificationsList = document.getElementById('notifications-list');
const showNotificationsBtn = document.getElementById('show-notifications');
const closeNotificationsBtn = document.getElementById('close-notifications');

// عرض / إخفاء صندوق الإشعارات
showNotificationsBtn.onclick = () => {
  notificationsDiv.style.display = 'block';
  loadNotifications();
};

closeNotificationsBtn.onclick = () => {
  notificationsDiv.style.display = 'none';
};

// تحميل إشعارات المستخدم الحالية
function loadNotifications() {
  if (!currentUser) {
    notificationsList.innerHTML = '<li>يجب تسجيل الدخول لعرض الإشعارات.</li>';
    return;
  }

  notificationsList.innerHTML = '<li>جارٍ تحميل الإشعارات...</li>';

  db.collection("notifications")
    .where("toUserId", "==", currentUser.uid)
    .orderBy("timestamp", "desc")
    .limit(20)
    .get()
    .then(snapshot => {
      if (snapshot.empty) {
        notificationsList.innerHTML = '<li>لا توجد إشعارات جديدة.</li>';
        return;
      }

      notificationsList.innerHTML = ''; // تنظيف القائمة

      snapshot.forEach(doc => {
        const data = doc.data();
        const li = document.createElement('li');
        li.style.cursor = 'pointer';
        li.style.marginBottom = '8px';
        li.style.borderBottom = '1px solid #334155';
        li.style.paddingBottom = '6px';

        // صياغة رسالة الإشعار
        li.textContent = `شخص ما رد على تعليقك: "${data.commentId}"`;  // ممكن تحسّن النص بعدين

        // عند الضغط على الإشعار، يفتح المستخدم البارت ويذهب مباشرة للرد
        li.onclick = () => {
          // علامة لتحديد مكان الانتقال (رابط يمكن تعديله حسب هيكل موقعك)
          window.location.href = `/path/to/part.html#reply-${data.replyId}`;

          // تمييز الإشعار كمقروء
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

const loginBtn = document.getElementById("loginBtn");
const logoutBtn = document.getElementById("logoutBtn");
const userInfo = document.getElementById("userInfo");
let currentUser = null;

// تتبع حالة تسجيل الدخول
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

// تسجيل الدخول عبر Google
loginBtn.onclick = () => {
  const provider = new firebase.auth.GoogleAuthProvider();
  auth.signInWithPopup(provider).catch(console.error);
};

// تسجيل الخروج
logoutBtn.onclick = () => auth.signOut();

// دالة تعقيم النصوص لمنع الثغرات XSS
function sanitize(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// عرض الفقرات مع أزرار التعليق
function renderParagraphs(partId = 'toxic-rose-1') {
  const rawContent = document.getElementById('raw-content').textContent.trim();
  const paragraphs = rawContent.split(/\n\s*\n/);
  const container = document.getElementById('rendered-content');
  container.innerHTML = '';

  paragraphs.forEach((text, index) => {
    const paraId = `${partId}-p-${index + 1}`;
    const paraDiv = document.createElement('div');
    paraDiv.className = 'paragraph';
    paraDiv.id = paraId;

    const p = document.createElement('p');
    p.innerHTML = sanitize(text.trim());
    paraDiv.appendChild(p);

    // زر التعليق
    const commentBtn = document.createElement('button');
    commentBtn.textContent = '💬';
    commentBtn.style.cssText = 'margin-top:10px;background:transparent;border:none;color:#38bdf8;font-size:18px;cursor:pointer';
    commentBtn.onclick = () => toggleCommentBox(paraId);
    paraDiv.appendChild(commentBtn);

    // صندوق التعليقات
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

    // تفعيل زر الإرسال عند وجود نص وتسجيل دخول
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

// إظهار أو إخفاء صندوق التعليقات
function toggleCommentBox(paraId) {
  const box = document.getElementById(`box-${paraId}`);
  if (box.style.display === 'none') {
    box.style.display = 'block';
    loadComments(paraId);
  } else {
    box.style.display = 'none';
  }
}
// دالة تحصي عدد الردود لتعليق معين
function countReplies(commentId) {
  return db.collection("comments")
    .where("commentId", "==", commentId)
    .get()
    .then(snapshot => snapshot.size);
}

// تحميل التعليقات للفقرة
function loadComments(paraId) {
  const box = document.getElementById(`box-${paraId}`);
  const commentList = box.querySelector('.comments');
  commentList.innerHTML = 'تحميل...';

  db.collection("comments")
    .where("paragraphId", "==", paraId)
    .orderBy("timestamp", "asc")
    .get()
    .then(snapshot => {
      commentList.innerHTML = '';
      if (snapshot.empty) {
        commentList.innerHTML = '<i>لا توجد تعليقات بعد.</i>';
      } else {
        snapshot.forEach(doc => {
          const data = doc.data();
          const commentId = doc.id;

          const div = document.createElement('div');
          div.className = "comment-item";
          div.style.cssText = "margin-bottom:12px;border-bottom:1px solid #334155;padding-bottom:8px;word-break: break-word;";
          div.innerHTML = `
            <b style="color:#7dd3fc">${sanitize(data.userEmail)}</b><br>
            ${sanitize(data.text)}
            <br>
            <span class="reply-controls" style="font-size:0.9rem; color:#38bdf8; cursor:pointer;">
              <span class="reply-btn" data-id="${commentId}">رد</span> |
              <span class="replies-toggle" data-id="${commentId}">الردود</span>
            </span>
            <div class="replies" id="replies-${commentId}" style="display:none; margin-top:8px;"></div>
            <div class="reply-form" id="reply-form-${commentId}" style="display:none; margin-top:6px;">
              <textarea placeholder="اكتب ردك..." rows="2" style="width:100%; border-radius:6px; background:#0a101d; color:#cfefff; padding:6px;"></textarea>
              <button disabled style="margin-top:4px; padding:6px 10px; border-radius:6px; background:#0f172a; color:#7dd3fc; border:none;">أرسل</button>
            </div>
          `;

          commentList.appendChild(div);

          // عدّ الردود وتحديث نص الزر + إضافة حدث النقر
          countReplies(commentId).then(count => {
            const repliesToggle = div.querySelector('.replies-toggle');
            repliesToggle.textContent = `الردود (${count})`;

            repliesToggle.onclick = () => {
              const repliesBox = document.getElementById(`replies-${commentId}`);
              if (repliesBox.style.display === "none") {
                repliesBox.style.display = "block";
                loadReplies(commentId);
              } else {
                repliesBox.style.display = "none";
              }
            };
          });

          

sendBtn.onclick = () => {
  const val = textarea.value.trim();
  if (!val || !currentUser) return alert("يجب تسجيل الدخول وكتابة رد");

  db.collection("comments")
    .doc(commentId)
    .collection("replies")
    .add({
      text: val,
      userEmail: currentUser.email,
      userId: currentUser.uid,
      timestamp: firebase.firestore.FieldValue.serverTimestamp()
    }).then(() => {
      textarea.value = "";
      sendBtn.disabled = true;
      loadReplies(commentId);
    }).catch(e => alert("فشل إرسال الرد: " + e.message));
};

          // باقي الأكواد للأزرار والنماذج:
          const replyBtn = div.querySelector(".reply-btn");
          const form = div.querySelector(".reply-form");
          const textarea = form.querySelector("textarea");
          const sendBtn = form.querySelector("button");

          replyBtn.onclick = () => {
            form.style.display = form.style.display === "none" ? "block" : "none";
          };

          textarea.oninput = () => {
            sendBtn.disabled = !textarea.value.trim() || !currentUser;
          };
          sendBtn.onclick = () => {
  const val = textarea.value.trim();
  if (!val || !currentUser) return alert("يجب تسجيل الدخول وكتابة رد");

  db.collection("comments")
    .add({
      commentId: commentId,
      text: val,
      userEmail: currentUser.email,
      userId: currentUser.uid,
      timestamp: firebase.firestore.FieldValue.serverTimestamp()
    })
    .then((docRef) => {
      textarea.value = "";
      sendBtn.disabled = true;
      loadReplies(commentId);

      // جلب بيانات صاحب التعليق الأصلي
      db.collection("comments").doc(commentId).get()
        .then(doc => {
          if (!doc.exists) return;

          const originalComment = doc.data();
          const toUserId = originalComment.userId;

          // إضافة إشعار للمستخدم صاحب التعليق الأصلي
          if (toUserId !== currentUser.uid) { // لا ترسل إشعار لنفس المستخدم
            db.collection("notifications").add({
              toUserId: toUserId,
              fromUserId: currentUser.uid,
              commentId: commentId,
              replyId: docRef.id,
              paragraphId: originalComment.paragraphId,
              read: false,
              timestamp: firebase.firestore.FieldValue.serverTimestamp()
            });
          }
        });
    })
    .catch(e => alert("فشل إرسال الرد: " + e.message));
};

          
        });
      }
    })
    .catch(e => {
      commentList.innerHTML = 'فشل تحميل التعليقات.';
      console.error(e);
    });
                         }

function loadReplies(commentId) {
  const container = document.getElementById(`replies-${commentId}`);
  container.innerHTML = "تحميل الردود...";

  db.collection("comments")
    .doc(commentId)
    .collection("replies")
    .orderBy("timestamp", "asc")
    .get()
    .then(snapshot => {
      container.innerHTML = "";
      if (snapshot.empty) {
        container.innerHTML = "<i>لا توجد ردود بعد.</i>";
        return;
      }

      snapshot.docs.forEach(doc => {
        const data = doc.data();
        const div = document.createElement("div");
        div.className = "reply-item";
        div.style = "margin:10px 0 10px 15px; padding:6px; background:rgba(15,23,42,0.9); border-radius:8px; color:#a0cfff; word-break: break-word;";
        div.innerHTML = `
          <b style="color:#7dd3fc">${sanitize(data.userEmail)}</b><br>
          ${sanitize(data.text)}
        `;

        container.appendChild(div);
      });
    }).catch(e => {
      container.innerHTML = 'فشل تحميل الردود.';
      console.error(e);
    });
    }
          
// عند تحميل الصفحة، شغل عرض الفقرات
document.addEventListener("DOMContentLoaded", () => {
  renderParagraphs("toxic-part-1");

  // روابط الأزرار (يمكن تعديلها حسب الحاجة)
  document.getElementById("prevBtn").href = "#";
  document.getElementById("nextBtn").href = "#";
});
