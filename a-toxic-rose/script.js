// ========== تهيئة Firebase ==========
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

let currentUser = null;
const AUTHOR_UID = "YteRK2Jua3QlqKAHSLp5odRAVQK2"; // معرف روان الصحيح

const loginBtn = document.getElementById("loginBtn");
const logoutBtn = document.getElementById("logoutBtn");
const userInfo = document.getElementById("userInfo");

// ==== دالة لجلب الاسم المستعار ====
async function getAlias(uid) {
  try {
    const doc = await db.collection("users").doc(uid).get();
    return doc.exists ? doc.data().alias : null;
  } catch (e) {
    console.error("فشل في جلب الاسم المستعار", e);
    return null;
  }
}

// ==== دالة طلب الاسم المستعار باستخدام مودال HTML (بدلاً من prompt) ====
function showAliasModal() {
  return new Promise((resolve) => {
    const modal = document.createElement("div");
    modal.style.cssText = `
      position: fixed; top:0; left:0; width:100%; height:100%;
      background: rgba(0,0,0,0.75); display:flex; justify-content:center; align-items:center;
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

async function requestAlias(uid) {
  const alias = await showAliasModal();
  if (!alias) {
    alert("الاسم المستعار مطلوب لتسجيل الدخول. سيتم تسجيل الخروج.");
    await auth.signOut();
    return null;
  }
  await db.collection("users").doc(uid).set({
    alias,
    createdAt: firebase.firestore.FieldValue.serverTimestamp()
  });
  return alias;
}

// ==== مراقبة حالة تسجيل الدخول ====
auth.onAuthStateChanged(async user => {
  currentUser = user;

  if (user) {
    if (loginBtn) loginBtn.style.display = "none";
    if (logoutBtn) logoutBtn.style.display = "inline-block";

    let alias = await getAlias(user.uid);
    if (!alias) {
      alias = await requestAlias(user.uid);
      if (!alias) return; // تم تسجيل الخروج داخل requestAlias
    }

    if (userInfo) userInfo.textContent = `مرحباً، ${alias}`;

    // تحديث أزرار الإرسال في صناديق التعليق المفتوحة
    document.querySelectorAll('.comment-box').forEach(box => {
      const textarea = box.querySelector('textarea');
      const sendBtn = box.querySelector('button.send-comment');
      if (textarea && sendBtn) {
        sendBtn.disabled = !textarea.value.trim() || !currentUser;
      }
    });

  } else {
    if (loginBtn) loginBtn.style.display = "inline-block";
    if (logoutBtn) logoutBtn.style.display = "none";
    if (userInfo) userInfo.textContent = "";
  }
});

// ==== تسجيل الدخول ====
if (loginBtn) {
  loginBtn.onclick = () => {
    const provider = new firebase.auth.GoogleAuthProvider();
    auth.signInWithPopup(provider).catch(console.error);
  };
}

// ==== تسجيل الخروج ====
if (logoutBtn) {
  logoutBtn.onclick = () => auth.signOut();
}

// ==== تعقيم النصوص ====
function sanitize(text) {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

// ==== عرض الفقرات والتعليقات مع real-time listener عند فتح صندوق التعليقات فقط ====
function renderParagraphs(partId = 'toxic-part-1') {
  const rawContentElem = document.getElementById('raw-content');
  if (!rawContentElem) return console.error('عنصر raw-content غير موجود');

  const rawContent = rawContentElem.textContent.trim();
  const paragraphs = rawContent.split(/\n\s*\n/);
  const container = document.getElementById('rendered-content');
  if (!container) return console.error('عنصر rendered-content غير موجود');

  container.innerHTML = '';

  paragraphs.forEach((text, index) => {
    const paraId = `${partId}-p-${index + 1}`;
    const paraDiv = document.createElement('div');
    paraDiv.className = 'paragraph';
    paraDiv.id = paraId;

    const p = document.createElement('p');
    p.innerHTML = sanitize(text.trim());
    paraDiv.appendChild(p);

    const commentBtn = document.createElement('button');
    commentBtn.textContent = '💬';
    commentBtn.style.cssText = 'margin-left: 10px; cursor:pointer; font-size:18px; background:transparent; border:none; color:#38bdf8;';
    commentBtn.onclick = () => toggleCommentBox(paraId);
    paraDiv.appendChild(commentBtn);

    const counterSpan = document.createElement('span');
    counterSpan.id = `count-${paraId}`;
    counterSpan.style = 'margin-right:10px; color:#7dd3fc; font-size:0.9rem;';
    paraDiv.appendChild(counterSpan);

    const commentBox = document.createElement('div');
    commentBox.className = 'comment-box';
    commentBox.id = `box-${paraId}`;
    commentBox.style.display = 'none';
    commentBox.innerHTML = `
      <div class="comments">تحميل التعليقات...</div>
      <textarea placeholder="اكتب تعليقك هنا..." rows="3" style="width:100%; margin-top:8px; border-radius:6px; padding:8px; background:#0f172a; color:#cfefff;"></textarea>
      <button class="send-comment" disabled style="margin-top:6px; padding:8px 12px; border-radius:6px; background:#0f172a; border:none; color:#7dd3fc; cursor:pointer;">أرسل</button>
      <div class="error-message" style="color:#f87171; margin-top:6px; display:none;"></div>
    `;

    const sendBtn = commentBox.querySelector('button.send-comment');
    const textarea = commentBox.querySelector('textarea');
    const errorDiv = commentBox.querySelector('.error-message');

    textarea.oninput = () => {
      sendBtn.disabled = !textarea.value.trim() || !currentUser;
      errorDiv.style.display = 'none';
      errorDiv.textContent = '';
    };

    sendBtn.onclick = async () => {
      const val = textarea.value.trim();
      if (!val) {
        errorDiv.style.display = 'block';
        errorDiv.textContent = "لا يمكن إرسال تعليق فارغ.";
        return;
      }
      if (val.length > 1000) {
        errorDiv.style.display = 'block';
        errorDiv.textContent = "التعليق طويل جدًا (أقصى حد 1000 حرف).";
        return;
      }
      if (!currentUser) {
        errorDiv.style.display = 'block';
        errorDiv.textContent = "يجب تسجيل الدخول.";
        return;
      }

      try {
        const alias = await getAlias(currentUser.uid);
        if (!alias) throw new Error("فشل تحميل الاسم المستعار.");

        await db.collection("comments").add({
          paragraphId: paraId,
          text: val,
          alias,
          userId: currentUser.uid,
          timestamp: firebase.firestore.FieldValue.serverTimestamp(),
          parentCommentId: null // تعليق رئيسي
        });

        textarea.value = '';
        sendBtn.disabled = true;
        errorDiv.style.display = 'none';
      } catch (e) {
        console.error(e);
        errorDiv.style.display = 'block';
        errorDiv.textContent = 'فشل الإرسال: ' + e.message;
      }
    };

    paraDiv.appendChild(commentBox);
    container.appendChild(paraDiv);
  });
}

// ==== تخزين و إدارة listeners لكل بارت ====
const listeners = {}; // لتخزين unsubscribe لكل listener

function toggleCommentBox(paraId) {
  const box = document.getElementById(`box-${paraId}`);
  if (!box) return;

  if (box.style.display === 'none') {
    box.style.display = 'block';

    if (!listeners[paraId]) {
      const commentList = box.querySelector('.comments');
      const counterSpan = document.getElementById(`count-${paraId}`);
      if (!commentList || !counterSpan) return;

      listeners[paraId] = db.collection("comments")
        .where("paragraphId", "==", paraId)
        .orderBy("timestamp", "asc")
        .onSnapshot(snapshot => {
          if (snapshot.empty) {
            commentList.innerHTML = '<i>لا توجد تعليقات بعد.</i>';
            counterSpan.textContent = `💬 0 تعليق`;
            return;
          }

          counterSpan.textContent = `💬 ${snapshot.size} تعليق${snapshot.size !== 1 ? 'ات' : ''}`;

          commentList.innerHTML = '';

          // جمع تعليقات رئيسية مع الردود المسطحة (parentCommentId)
          // نظهرها بشكل متسلسل: التعليق الرئيسي ثم ردوده

          // ترتيب التعليقات حسب timestamp
          const comments = [];
          snapshot.forEach(doc => {
            const data = doc.data();
            comments.push({ id: doc.id, ...data });
          });

          // تجميع الردود حسب parentCommentId
          const mainComments = comments.filter(c => c.parentCommentId === null);
          const repliesMap = {};
comments.forEach(c => {
  const parentId = c.parentCommentId;
  if (parentId) {
    if (!repliesMap[parentId]) repliesMap[parentId] = [];
    repliesMap[parentId].push(c);
  }
});

          function renderComment(comment, isCurrentUser, isAuthor) {
            const div = document.createElement('div');
            div.className = 'comment-item';
            div.style.cssText = `
              margin-bottom:12px;
              border-bottom:1px solid #334155;
              padding:8px;
              word-break: break-word;
              background: ${isAuthor ? '#1e293b' : isCurrentUser ? '#0f172a' : 'transparent'};
              border-right: ${isAuthor ? '4px solid #f43f5e' : isCurrentUser ? '3px solid #38bdf8' : 'none'};
              position: relative;
            `;

            div.innerHTML = `
              <b style="color:${isAuthor ? '#f43f5e' : isCurrentUser ? '#7dd3fc' : '#a5b4fc'}">
                ${sanitize(comment.alias)}${isAuthor ? ' (الكاتبة)' : isCurrentUser ? ' (أنت)' : ''}
              </b><br>
              ${sanitize(comment.text)}
              <button class="reply-btn" style="position: absolute; top: 8px; left: 8px; background: transparent; border:none; color:#38bdf8; cursor:pointer; font-size: 0.9rem;">رد</button>
            `;

            // إضافة حدث زر الرد
            const replyBtn = div.querySelector('.reply-btn');
            replyBtn.onclick = () => {
              showReplyBox(comment.id, div, paraId);
            };

            // === زر حذف التعليق ===
if (isCurrentUser) {
  const deleteBtn = document.createElement('button');
  deleteBtn.textContent = '🗑️';
  deleteBtn.title = 'حذف التعليق';
  deleteBtn.style.cssText = `
    position: absolute;
    bottom: 8px;
    left: 36px;
    background: transparent;
    border: none;
    color: #f87171;
    cursor: pointer;
    font-size: 0.9rem;
  `;
  deleteBtn.onclick = async () => {
    if (confirm("هل أنت متأكد من حذف هذا التعليق؟ لا يمكن التراجع.")) {
      try {
        await db.collection("comments").doc(comment.id).delete();
      } catch (e) {
        alert("حدث خطأ أثناء الحذف");
        console.error(e);
      }
    }
  };
  div.appendChild(deleteBtn);
                      }

            return div;
          }

          function showReplyBox(parentCommentId, parentDiv, paraId) {
            // منع وجود أكثر من صندوق رد مفتوح في نفس الوقت
            const existingBox = document.querySelector('.reply-box');
            if (existingBox) existingBox.remove();

            const replyBox = document.createElement('div');
            replyBox.className = 'reply-box';
            replyBox.style.cssText = 'margin-top:8px;';

            replyBox.innerHTML = `
              <textarea rows="2" style="width:100%; padding:6px; border-radius:6px; background:#0f172a; color:#cfefff;" placeholder="اكتب ردك هنا..."></textarea>
              <button disabled style="margin-top:6px; padding:6px 10px; border-radius:6px; background:#0f172a; border:none; color:#7dd3fc; cursor:pointer;">أرسل الرد</button>
              <div class="error-message" style="color:#f87171; margin-top:6px; display:none;"></div>
            `;

            const textarea = replyBox.querySelector('textarea');
            const sendBtn = replyBox.querySelector('button');
            const errorDiv = replyBox.querySelector('.error-message');

            textarea.oninput = () => {
              sendBtn.disabled = !textarea.value.trim() || !currentUser;
              errorDiv.style.display = 'none';
              errorDiv.textContent = '';
            };

            sendBtn.onclick = async () => {
              const val = textarea.value.trim();
              if (!val) {
                errorDiv.style.display = 'block';
                errorDiv.textContent = "لا يمكن إرسال رد فارغ.";
                return;
              }
              if (val.length > 1000) {
                errorDiv.style.display = 'block';
                errorDiv.textContent = "الرد طويل جدًا (أقصى حد 1000 حرف).";
                return;
              }
              if (!currentUser) {
                errorDiv.style.display = 'block';
                errorDiv.textContent = "يجب تسجيل الدخول.";
                return;
              }

              try {
                const alias = await getAlias(currentUser.uid);
                if (!alias) throw new Error("فشل تحميل الاسم المستعار.");

                // إضافة الرد مع parentCommentId
                await db.collection("comments").add({
                  paragraphId: paraId,
                  text: val,
                  alias,
                  userId: currentUser.uid,
                  timestamp: firebase.firestore.FieldValue.serverTimestamp(),
                  parentCommentId: parentCommentId
                });

                // إرسال إشعارات لكل من شاركوا في هذه السلسلة (حتى صاحب التعليق)
                await notifyReplyRecipients(parentCommentId);

                replyBox.remove();
              } catch (e) {
                errorDiv.style.display = 'block';
                errorDiv.textContent = 'فشل الإرسال: ' + e.message;
                console.error(e);
              }
            };

            parentDiv.appendChild(replyBox);
            textarea.focus();
          }

          // دالة إشعارات الردود (توصل لكل من كتب تعليق أو رد في السلسلة، حتى صاحب التعليق)
          async function notifyReplyRecipients(parentCommentId) {
            try {
              // جلب كل التعليقات في نفس السلسلة: التعليق الرئيسي + الردود على نفس parentCommentId
              const mainCommentDoc = await db.collection("comments").doc(parentCommentId).get();
              if (!mainCommentDoc.exists) return;

              const mainComment = mainCommentDoc.data();

              // جمع كل userId في السلسلة (التعليق الرئيسي + الردود عليه)
              const recipients = new Set();
              recipients.add(mainComment.userId); // صاحب التعليق الرئيسي

              const repliesSnapshot = await db.collection("comments")
                .where("parentCommentId", "==", parentCommentId)
                .get();

              repliesSnapshot.forEach(doc => {
                const replyData = doc.data();
                recipients.add(replyData.userId);
              });

              // لا نرسل إشعار لصاحب الرد نفسه (currentUser)
              recipients.delete(currentUser.uid);

              // إعداد الإشعارات لكل مستلم
              for (const uid of recipients) {
                await db.collection("notifications").add({
                  userId: uid,
                  message: `يوجد رد جديد على تعليقك أو على السلسلة التي شاركت فيها.`,
                  timestamp: firebase.firestore.FieldValue.serverTimestamp(),
                  read: false
                });
              }

            } catch (e) {
              console.error("فشل في إرسال الإشعارات:", e);
            }
          }

          function renderWithReplies(comment, depth = 0) {
  const isCurrentUser = currentUser && comment.userId === currentUser.uid;
  const isAuthor = comment.userId === AUTHOR_UID;

  const commentDiv = renderComment(comment, isCurrentUser, isAuthor);
  commentDiv.style.marginLeft = `${depth * 20}px`;
  if (depth > 0) {
    commentDiv.style.background = '#18202e';
  }

  commentList.appendChild(commentDiv);

  const replies = repliesMap[comment.id] || [];

  if (replies.length > 0) {
    // زر لإظهار/إخفاء الردود
    const showRepliesBtn = document.createElement('button');
    showRepliesBtn.textContent = `الردود (${replies.length})`;
    showRepliesBtn.style.cssText = 'background: transparent; border:none; color:#38bdf8; cursor:pointer; margin-top:4px; font-size:0.9rem;';
    commentDiv.appendChild(showRepliesBtn);

    const repliesContainer = document.createElement('div');
    repliesContainer.style.display = 'none';
    repliesContainer.style.marginTop = '8px';
    commentDiv.appendChild(repliesContainer);

    const loadMoreBtn = document.createElement('button');
    loadMoreBtn.textContent = 'عرض المزيد';
    loadMoreBtn.style.cssText = 'background: transparent; border:none; color:#7dd3fc; cursor:pointer; margin-top:4px; display:none;';
    repliesContainer.appendChild(loadMoreBtn);

    let shownCount = 0;

    function loadMoreReplies() {
      const nextReplies = replies.slice(shownCount, shownCount + 5);
      nextReplies.forEach(reply => {
        const isCurrentUserReply = currentUser && reply.userId === currentUser.uid;
        const isAuthorReply = reply.userId === AUTHOR_UID;

        const replyDiv = renderComment(reply, isCurrentUserReply, isAuthorReply);
        replyDiv.style.marginLeft = `${(depth + 1) * 20}px`;
        replyDiv.style.background = '#18202e';
        replyDiv.style.borderRight = isAuthorReply ? '4px solid #f43f5e' : isCurrentUserReply ? '3px solid #38bdf8' : 'none';

        repliesContainer.insertBefore(replyDiv, loadMoreBtn);
      });

      shownCount += nextReplies.length;

      if (shownCount >= replies.length) {
        loadMoreBtn.style.display = 'none';
      } else {
        loadMoreBtn.style.display = 'block';
      }
    }

    loadMoreBtn.onclick = loadMoreReplies;

    showRepliesBtn.onclick = () => {
      if (repliesContainer.style.display === 'none') {
        repliesContainer.style.display = 'block';
        showRepliesBtn.textContent = 'إخفاء الردود';

        repliesContainer.innerHTML = '';
        repliesContainer.appendChild(loadMoreBtn);
        shownCount = 0;
        loadMoreReplies();
      } else {
        repliesContainer.style.display = 'none';
        showRepliesBtn.textContent = `الردود (${replies.length})`;
      } 
       };
  }
} // <-- إغلاق دالة
    
  
          

mainComments.forEach(comment => renderWithReplies(comment, 0));

          
        });
    }

  } else {
    box.style.display = 'none';

    if (listeners[paraId]) {
      listeners[paraId](); // إلغاء الاستماع
      delete listeners[paraId];
    }
  }
}

// ==== بدء العرض ====
document.addEventListener("DOMContentLoaded", () => {
  renderParagraphs("toxic-part-1");
});
