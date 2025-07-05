  
<script>  
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
    const paraId = `${partId}-p-${index + 1}`;  
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
        return;  
      }  
  
      snapshot.docs.forEach(doc => {  
        const data = doc.data();  
        const commentId = doc.id;  
  
        const div = document.createElement('div');  
        div.className = 'comment-item';  
        div.style.cssText = "margin-bottom:12px; border-bottom:1px solid #334155; padding-bottom:8px; word-break: break-word;";  
  
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
  
        updateRepliesCount(commentId);  
        div.querySelector('.reply-btn').onclick = () => toggleReplyForm(commentId);  
        div.querySelector('.replies-toggle').onclick = () => toggleReplies(commentId);  
      });  
    })  
    .catch(e => {  
      commentList.innerHTML = 'فشل تحميل التعليقات.';  
      console.error(e);  
    });  
}  
  
function updateRepliesCount(commentId) {  
  db.collection("comments")  
    .where("commentId", "==", commentId)  
    .get()  
    .then(snapshot => {  
      const count = snapshot.size;  
      const toggle = document.querySelector(`.replies-toggle[data-commentid="${commentId}"]`);  
      if (toggle) toggle.textContent = `الردود (${count})`;  
    });  
}  
  
function toggleReplyForm(commentId) {  
  const form = document.getElementById(`reply-form-${commentId}`);  
  if (!form) return;  
  form.style.display = (form.style.display === 'none') ? 'block' : 'none';  
  
  const textarea = form.querySelector('textarea');  
  const sendBtn = form.querySelector('button');  
  
  textarea.oninput = () => {  
    sendBtn.disabled = !textarea.value.trim() || !currentUser;  
  };  
  
  sendBtn.onclick = () => {  
    const val = textarea.value.trim();  
    if (!val || !currentUser) return alert("يجب تسجيل الدخول وكتابة رد");  
  
    db.collection("comments").add({  
      commentId,  
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
}  
  
function toggleReplies(commentId) {  
  const container = document.getElementById(`replies-${commentId}`);  
  if (!container) return;  
  container.style.display = (container.style.display === 'none') ? 'block' : 'none';  
  if (container.style.display === 'block') loadReplies(commentId);  
}  
  
function loadReplies(commentId) {  
  const container = document.getElementById(`replies-${commentId}`);  
  container.innerHTML = 'تحميل الردود...';  
  
  db.collection("comments")  
    .where("commentId", "==", commentId)  
    .orderBy("timestamp", "asc")  
    .get()  
    .then(snapshot => {  
      if (snapshot.empty) {  
        container.innerHTML = '<i>لا توجد ردود بعد.</i>';  
        return;  
      }  
  
      container.innerHTML = '';  
      const replies = snapshot.docs;  
      const maxVisible = 4;  
  
      replies.forEach((doc, index) => {  
        const data = doc.data();  
        const div = document.createElement('div');  
        div.className = 'reply-item';  
        div.style.cssText = "margin:8px 0 8px 15px; padding:6px; background:rgba(15,23,42,0.9); border-radius:8px; color:#a0cfff; word-break: break-word;";  
        div.innerHTML = `  
          <b style="color:#7dd3fc">${sanitize(data.userEmail)}</b><br>  
          ${sanitize(data.text)}  
          <br>  
          <span class="reply-on-reply" style="font-size:0.8rem; color:#38bdf8; cursor:pointer; user-select:none;">↪ رد</span>  
          <div class="nested-reply-form" style="display:none; margin-top:8px;">  
            <textarea placeholder="اكتب ردك هنا..." style="width:100%; border-radius:8px; background:#0a101d; color:#cfefff; padding:6px;" rows="2"></textarea>  
            <button disabled style="margin-top:4px; padding:5px 8px; border-radius:6px; background:#0f172a; color:#7dd3fc; border:none; cursor:pointer;">أرسل</button>  
          </div>  
        `;  
  
        const replyBtn = div.querySelector('.reply-on-reply');  
        const form = div.querySelector('.nested-reply-form');  
        const textarea = form.querySelector('textarea');  
        const sendBtn = form.querySelector('button');  
  
        replyBtn.onclick = () => {  
          form.style.display = (form.style.display === 'none') ? 'block' : 'none';  
        };  
  
        textarea.oninput = () => {  
          sendBtn.disabled = !textarea.value.trim() || !currentUser;  
        };  
  
        sendBtn.onclick = () => {  
          const val = textarea.value.trim();  
          if (!val || !currentUser) return alert("يجب تسجيل الدخول وكتابة رد");  
  
          db.collection("comments").add({  
            commentId,  
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
  
        container.appendChild(div);  
      });  
  
      if (replies.length > maxVisible) {  
        const showMoreBtn = document.createElement('button');  
        showMoreBtn.textContent = 'عرض المزيد';  
        showMoreBtn.style.cssText = 'margin-top:6px; background:none; border:none; color:#38bdf8; cursor:pointer; font-size:0.9rem';  
        showMoreBtn.onclick = () => {  
          const hidden = container.querySelectorAll('.reply-item');  
          hidden.forEach(el => el.style.display = 'block');  
          showMoreBtn.remove();  
        };  
        container.appendChild(showMoreBtn);  
      }  
    })  
    .catch(e => {  
      container.innerHTML = 'فشل تحميل الردود.';  
      console.error(e);  
    });  
}  
  
document.addEventListener("DOMContentLoaded", () => {  
  renderParagraphs("toxic-part-1");  
  document.getElementById("prevBtn").href = "#";  
  document.getElementById("nextBtn").href = "#";  
});  
</script>
