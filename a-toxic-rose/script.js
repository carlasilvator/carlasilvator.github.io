
  // ============ Firebase التهيئة ============
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

  // ============ إدارة المستخدم ============
  let currentUser = null;
  const loginBtn = document.getElementById("loginBtn");
  const logoutBtn = document.getElementById("logoutBtn");
  const userInfo = document.getElementById("userInfo");

  auth.onAuthStateChanged(async user => {
    currentUser = user;
    if (user) {
      if (!user.displayName) {
        let displayName = prompt("اختر اسمك المستعار:");
        if (displayName) {
          displayName = displayName.trim();
          if (displayName) {
            await user.updateProfile({ displayName });
            await db.collection("users").doc(user.uid).set({
              displayName,
              email: user.email
            });
          }
        }
      }
      loginBtn.style.display = "none";
      logoutBtn.style.display = "inline-block";
      userInfo.textContent = `مرحباً، ${user.displayName}`;

      // تفعيل الأزرار بعد تسجيل الدخول
      document.querySelectorAll("textarea").forEach(t => {
        t.dispatchEvent(new Event("input"));
      });

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

  // ============ أدوات مساعدة ============
  function sanitize(text) {
    const div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
  }

  // ============ حذف ============
  function deleteComment(commentId, container, isReply = false, parentId = null) {
    if (!confirm("هل أنت متأكد من الحذف؟")) return;
    const ref = isReply
      ? db.collection("comments").doc(parentId).collection("replies").doc(commentId)
      : db.collection("comments").doc(commentId);

    ref.delete().then(() => container.remove());
  }

  // ============ تعديل ============
  function editComment(commentId, container, isReply = false, parentId = null) {
    const textEl = container.querySelector(".comment-text");
    const originalText = textEl.textContent;

    const textarea = document.createElement("textarea");
    textarea.style = "width:100%; border-radius:8px; background:#0a101d; color:#cfefff; padding:6px; margin-top:8px;";
    textarea.value = originalText;

    const saveBtn = document.createElement("button");
    saveBtn.textContent = "حفظ";
    saveBtn.style = "margin-right:6px; padding:5px 10px; background:#0f172a; color:#7dd3fc; border:none; border-radius:6px;";

    const cancelBtn = document.createElement("button");
    cancelBtn.textContent = "إلغاء";
    cancelBtn.style = "padding:5px 10px; background:#1e293b; color:#fff; border:none; border-radius:6px;";

    const controls = document.createElement("div");
    controls.style.marginTop = "8px";
    controls.appendChild(saveBtn);
    controls.appendChild(cancelBtn);

    textEl.style.display = "none";
    container.appendChild(textarea);
    container.appendChild(controls);

    saveBtn.onclick = () => {
      const newText = textarea.value.trim();
      if (!newText) return alert("النص فارغ");

      const ref = isReply
        ? db.collection("comments").doc(parentId).collection("replies").doc(commentId)
        : db.collection("comments").doc(commentId);

      ref.update({ text: newText }).then(() => {
        textEl.textContent = sanitize(newText);
        textEl.style.display = "block";
        textarea.remove();
        controls.remove();
      });
    };

    cancelBtn.onclick = () => {
      textEl.style.display = "block";
      textarea.remove();
      controls.remove();
    };
  }

  // ============ تحميل التعليقات ============
  function loadComments(paraId) {
    const box = document.getElementById(`box-${paraId}`);
    const commentList = box.querySelector(".comments");
    commentList.innerHTML = "تحميل...";

    db.collection("comments")
      .where("paragraphId", "==", paraId)
      .orderBy("timestamp", "asc")
      .get()
      .then(snapshot => {
        commentList.innerHTML = "";
        if (snapshot.empty) {
          commentList.innerHTML = "<i>لا توجد تعليقات بعد.</i>";
          return;
        }

        snapshot.docs.forEach(doc => {
          const data = doc.data();
          const commentId = doc.id;

          const div = document.createElement("div");
          div.className = "comment-item";
          div.style.cssText = "margin-bottom:12px; border-bottom:1px solid #334155; padding-bottom:8px; word-break: break-word; position:relative;";

          const displayName = data.userId === (currentUser && currentUser.uid) ? currentUser.displayName || data.userEmail : data.userEmail;

          div.innerHTML = `
            <b style="color:#7dd3fc">${sanitize(displayName)}</b><br>
            <span class="comment-text">${sanitize(data.text)}</span><br>
            <span class="reply-controls" style="font-size:0.9rem; color:#38bdf8; cursor:pointer;">
              <span class="reply-btn" data-id="${commentId}">رد</span> |
              <span class="replies-toggle" data-id="${commentId}">الردود</span>
            </span>
            <div class="replies" id="replies-${commentId}" style="display:none; margin-top:10px;"></div>
            <div class="reply-form" id="reply-form-${commentId}" style="display:none; margin-top:8px;">
              <textarea style="width:100%; border-radius:8px; background:#020611; color:#cfefff; padding:6px;" rows="3" placeholder="اكتب ردك..."></textarea>
              <button disabled style="margin-top:6px; padding:6px 12px; border-radius:8px; background:#0f172a; color:#7dd3fc; border:none;">أرسل</button>
            </div>
          `;

          // أزرار لصاحب التعليق فقط
          if (currentUser && currentUser.uid === data.userId) {
            div.innerHTML += `
              <button class="edit-btn" style="position:absolute; top:4px; right:60px; background:none; border:none; color:#38bdf8;">تعديل</button>
              <button class="delete-btn" style="position:absolute; top:4px; right:10px; background:none; border:none; color:#f87171;">حذف</button>
            `;
          }

          commentList.appendChild(div);

          // ربط أزرار الرد
          const replyBtn = div.querySelector(".reply-btn");
          const toggleBtn = div.querySelector(".replies-toggle");
          const form = div.querySelector(".reply-form");
          const textarea = form.querySelector("textarea");
          const sendBtn = form.querySelector("button");

          replyBtn.onclick = () => form.style.display = form.style.display === "none" ? "block" : "none";
          toggleBtn.onclick = () => toggleReplies(commentId);
          textarea.oninput = () => sendBtn.disabled = !textarea.value.trim() || !currentUser;

          sendBtn.onclick = () => {
            const val = textarea.value.trim();
            if (!val || !currentUser) return alert("سجّل دخول أولاً");

            db.collection("comments")
              .doc(commentId)
              .collection("replies")
              .add({
                text: val,
                userId: currentUser.uid,
                userEmail: currentUser.email,
                timestamp: firebase.firestore.FieldValue.serverTimestamp()
              }).then(() => {
                textarea.value = "";
                sendBtn.disabled = true;
                loadReplies(commentId);
              });
          };

          if (currentUser && currentUser.uid === data.userId) {
            const editBtn = div.querySelector(".edit-btn");
            const deleteBtn = div.querySelector(".delete-btn");
            if (editBtn) editBtn.onclick = () => editComment(commentId, div, false);
            if (deleteBtn) deleteBtn.onclick = () => deleteComment(commentId, div, false);
          }
        });
      });
  }

  // ============ تحميل الردود ============
  function loadReplies(commentId) {
    const container = document.getElementById(`replies-${commentId}`);
    container.innerHTML = "تحميل...";

    db.collection("comments").doc(commentId).collection("replies")
      .orderBy("timestamp", "asc")
      .get()
      .then(snapshot => {
        container.innerHTML = "";
        snapshot.forEach(doc => {
          const data = doc.data();
          const replyId = doc.id;

          const div = document.createElement("div");
          div.className = "reply-item";
          div.style.cssText = "margin-bottom:8px; padding:6px; background:rgba(15,23,42,0.9); border-radius:8px; color:#a0cfff; word-break: break-word; position:relative;";

          const displayName = data.userId === (currentUser && currentUser.uid) ? currentUser.displayName || data.userEmail : data.userEmail;

          div.innerHTML = `
            <b style="color:#7dd3fc">${sanitize(displayName)}</b><br>
            <span class="comment-text">${sanitize(data.text)}</span>
          `;

          if (currentUser && currentUser.uid === data.userId) {
            div.innerHTML += `
              <button class="edit-btn" style="position:absolute; top:4px; right:60px; background:none; border:none; color:#38bdf8;">تعديل</button>
              <button class="delete-btn" style="position:absolute; top:4px; right:10px; background:none; border:none; color:#f87171;">حذف</button>
            `;
          }

          container.appendChild(div);

          if (currentUser && currentUser.uid === data.userId) {
            const editBtn = div.querySelector(".edit-btn");
            const deleteBtn = div.querySelector(".delete-btn");
            if (editBtn) editBtn.onclick = () => editComment(replyId, div, true, commentId);
            if (deleteBtn) deleteBtn.onclick = () => deleteComment(replyId, div, true, commentId);
          }
        });
      });
  }

  // ============ عرض الفقرات ============
  function renderParagraphs(partId = "toxic-rose-1") {
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
      commentBtn.className = "comment-btn";
      commentBtn.style.cssText = "margin-top:10px; background:transparent; border:none; color:#38bdf8; font-size:18px; cursor:pointer";
      commentBtn.onclick = () => toggleCommentBox(paraId);
      paraDiv.appendChild(commentBtn);

      const commentBox = document.createElement("div");
      commentBox.className = "comment-box";
      commentBox.id = `box-${paraId}`;
      commentBox.style.display = "none";
      commentBox.innerHTML = `
        <div class="comments"></div>
        <textarea placeholder="اكتب تعليقك هنا..." style="width:100%; margin-top:8px; border-radius:8px; background:#0a101d; color:#cfefff; padding:6px;" rows="3"></textarea>
        <button class="send-comment" disabled style="margin-top:6px; padding:6px 12px; border-radius:8px; background:#0f172a; color:#7dd3fc; border:none;">أرسل</button>
      `;

      const sendBtn = commentBox.querySelector(".send-comment");
      const textarea = commentBox.querySelector("textarea");

      textarea.addEventListener("input", () => {
        sendBtn.disabled = !textarea.value.trim() || !currentUser;
      });

      sendBtn.onclick = () => {
        const val = textarea.value.trim();
        if (!val || !currentUser) return alert("سجّل دخول أولاً");

        db.collection("comments").add({
          paragraphId: paraId,
          text: val,
          userId: currentUser.uid,
          userEmail: currentUser.email,
          timestamp: firebase.firestore.FieldValue.serverTimestamp()
        }).then(() => {
          textarea.value = "";
          sendBtn.disabled = true;
          loadComments(paraId);
        });
      };

      paraDiv.appendChild(commentBox);
      container.appendChild(paraDiv);
    });
  }

  function toggleCommentBox(paraId) {
    const box = document.getElementById(`box-${paraId}`);
    box.style.display = box.style.display === "none" ? "block" : "none";
    if (box.style.display === "block") loadComments(paraId);
  }

  // ============ تحميل الصفحة ============
  document.addEventListener("DOMContentLoaded", () => {
    renderParagraphs("toxic-rose-1");
  });
