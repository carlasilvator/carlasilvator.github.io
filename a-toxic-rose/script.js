// ========== تهيئة Firebase ==========
const firebaseConfig = {
  apiKey: "AIzaSyBtTc7yWNfNkG0oVSbpq0V9A6DHTgZoGBM",
  authDomain: "works-rawan.firebaseapp.com",
  projectId: "works-rawan",
  storageBucket: "works-rawan.appspot.com",
  messagingSenderId: "986254083746",
  appId: "1:986254083746:web:17f7db0389c94473f0b9fb"
};

// تهيئة Firebase
if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}
const auth = firebase.auth();
const db = firebase.firestore();

// تحسين الأداء: تمكين التخزين المؤقت
db.enablePersistence({ synchronizeTabs: true })
  .catch(err => {
    console.error("فشل في تمكين التخزين المؤقت: ", err);
  });

// ========== إدارة الحالة العامة ==========
let currentUser = null;
const AUTHOR_UID = "YteRK2Jua3QlqKAHSLp5odRAVQK2"; // معرف الكاتبة
const listeners = {}; // لتخزين دوال إلغاء الاشتراك

// ========== عناصر واجهة المستخدم ==========
const elements = {
  loginBtn: document.getElementById("loginBtn"),
  logoutBtn: document.getElementById("logoutBtn"),
  userInfo: document.getElementById("userInfo"),
  rawContent: document.getElementById("raw-content"),
  renderedContent: document.getElementById("rendered-content")
};

// ========== خدمات مساعدة ==========
class Utils {
  // تعقيم النصوص لمنع XSS
  static sanitize(text) {
    const div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
  }

  // عرض رسائل التحميل
  static showLoading() {
    const loader = document.createElement("div");
    loader.id = "global-loader";
    loader.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0,0,0,0.7);
      display: flex;
      justify-content: center;
      align-items: center;
      z-index: 9999;
    `;
    loader.innerHTML = `
      <div style="color: white; font-size: 1.5rem;">
        جاري التحميل...
      </div>
    `;
    document.body.appendChild(loader);
  }

  static hideLoading() {
    const loader = document.getElementById("global-loader");
    if (loader) loader.remove();
  }

  // عرض رسائل للمستخدم
  static showToast(message, type = 'info') {
    const toast = document.createElement("div");
    toast.style.cssText = `
      position: fixed;
      bottom: 20px;
      right: 20px;
      padding: 12px 24px;
      background: ${type === 'error' ? '#ef4444' : type === 'success' ? '#10b981' : '#3b82f6'};
      color: white;
      border-radius: 4px;
      z-index: 1000;
      animation: fadeIn 0.3s;
    `;
    toast.textContent = message;
    document.body.appendChild(toast);

    setTimeout(() => {
      toast.style.animation = 'fadeOut 0.3s';
      setTimeout(() => toast.remove(), 300);
    }, 3000);
  }
}

// ========== إدارة المصادقة ==========
class AuthService {
  static async handleAuthStateChanged(user) {
    try {
      currentUser = user;

      if (user) {
        // تحديث واجهة المستخدم
        if (elements.loginBtn) elements.loginBtn.style.display = "none";
        if (elements.logoutBtn) elements.logoutBtn.style.display = "inline-block";

        // الحصول على الاسم المستعار أو طلبه
        let alias = await this.getAlias(user.uid);
        if (!alias) {
          alias = await this.requestAlias(user.uid);
          if (!alias) return; // تم تسجيل الخروج
        }

        if (elements.userInfo) {
          elements.userInfo.textContent = `مرحباً، ${alias}`;
          elements.userInfo.title = `البريد الإلكتروني: ${user.email || 'غير معروف'}`;
        }

      } else {
        // تحديث واجهة المستخدم عند تسجيل الخروج
        if (elements.loginBtn) elements.loginBtn.style.display = "inline-block";
        if (elements.logoutBtn) elements.logoutBtn.style.display = "none";
        if (elements.userInfo) elements.userInfo.textContent = "";
      }
    } catch (error) {
      console.error("خطأ في تغيير حالة المصادقة:", error);
      Utils.showToast("حدث خطأ في تحميل بيانات المستخدم", 'error');
    }
  }

  static async getAlias(uid) {
    try {
      const doc = await db.collection("users").doc(uid).get();
      return doc.exists ? doc.data().alias : null;
    } catch (error) {
      console.error("فشل في جلب الاسم المستعار", error);
      Utils.showToast("فشل في تحميل بيانات المستخدم", 'error');
      return null;
    }
  }

  static async requestAlias(uid) {
    try {
      const alias = await this.showAliasModal();
      if (!alias) {
        await auth.signOut();
        return null;
      }

      await db.collection("users").doc(uid).set({
        alias,
        email: currentUser.email,
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        lastLogin: firebase.firestore.FieldValue.serverTimestamp()
      }, { merge: true });

      return alias;
    } catch (error) {
      console.error("فشل في طلب الاسم المستعار", error);
      Utils.showToast("فشل في حفظ الاسم المستعار", 'error');
      return null;
    }
  }

  static showAliasModal() {
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
          errorP.textContent = "الاسم المستعار قصير جداً (يجب أن يكون على الأقل حرفين)";
          input.focus();
          return;
        }
        if (val.length > 20) {
          errorP.style.display = "block";
          errorP.textContent = "الاسم المستعار طويل جداً (الحد الأقصى 20 حرفاً)";
          input.focus();
          return;
        }
        cleanUp();
        resolve(val);
      };
    });
  }

  static initAuthHandlers() {
    // مراقبة حالة تسجيل الدخول
    auth.onAuthStateChanged(this.handleAuthStateChanged);

    // معالجة تسجيل الدخول
    if (elements.loginBtn) {
      elements.loginBtn.onclick = () => {
        const provider = new firebase.auth.GoogleAuthProvider();
        auth.signInWithPopup(provider)
          .catch(error => {
            console.error("فشل تسجيل الدخول:", error);
            Utils.showToast("فشل تسجيل الدخول", 'error');
          });
      };
    }

    // معالجة تسجيل الخروج
    if (elements.logoutBtn) {
      elements.logoutBtn.onclick = () => {
        auth.signOut()
          .catch(error => {
            console.error("فشل تسجيل الخروج:", error);
            Utils.showToast("فشل تسجيل الخروج", 'error');
          });
      };
    }
  }
}

// ========== إدارة التعليقات ==========
class CommentService {
  static async addComment(paraId, text, parentCommentId = null) {
    try {
      Utils.showLoading();
      
      if (!currentUser) throw new Error("يجب تسجيل الدخول أولاً");
      if (!text.trim()) throw new Error("لا يمكن إرسال تعليق فارغ");
      if (text.length > 1000) throw new Error("التعليق طويل جداً (الحد الأقصى 1000 حرف)");

      const alias = await AuthService.getAlias(currentUser.uid);
      if (!alias) throw new Error("فشل في تحميل الاسم المستعار");

      const commentData = {
        paragraphId: paraId,
        text: text.trim(),
        alias,
        userId: currentUser.uid,
        timestamp: firebase.firestore.FieldValue.serverTimestamp(),
        parentCommentId
      };

      await db.collection("comments").add(commentData);

      // إذا كان رداً على تعليق، أرسل إشعارات
      if (parentCommentId) {
        await this.notifyReplyRecipients(parentCommentId);
      }

      Utils.showToast("تم إرسال التعليق بنجاح", 'success');
      return true;
    } catch (error) {
      console.error("فشل في إضافة التعليق:", error);
      Utils.showToast(error.message, 'error');
      return false;
    } finally {
      Utils.hideLoading();
    }
  }

  static async notifyReplyRecipients(parentCommentId) {
    try {
      const recipients = new Set();

      // جلب التعليق الأصلي
      const parentDoc = await db.collection("comments").doc(parentCommentId).get();
      if (!parentDoc.exists) return;

      recipients.add(parentDoc.data().userId);

      // جلب كل من رد على هذا التعليق
      const repliesSnapshot = await db.collection("comments")
        .where("parentCommentId", "==", parentCommentId)
        .get();

      repliesSnapshot.forEach(doc => {
        recipients.add(doc.data().userId);
      });

      // لا نرسل إشعار للمستخدم الحالي
      recipients.delete(currentUser.uid);

      // إرسال الإشعارات
      const batch = db.batch();
      recipients.forEach(uid => {
        const notificationRef = db.collection("notifications").doc();
        batch.set(notificationRef, {
          userId: uid,
          message: `يوجد رد جديد على تعليقك في النص الأدبي`,
          timestamp: firebase.firestore.FieldValue.serverTimestamp(),
          read: false,
          type: "comment_reply"
        });
      });

      await batch.commit();
    } catch (error) {
      console.error("فشل في إرسال الإشعارات:", error);
    }
  }

  static async deleteComment(commentId) {
    try {
      Utils.showLoading();
      
      const commentDoc = await db.collection("comments").doc(commentId).get();
      if (!commentDoc.exists) throw new Error("التعليق غير موجود");

      const commentData = commentDoc.data();
      
      // التحقق من الصلاحية
      if (commentData.userId !== currentUser.uid && currentUser.uid !== AUTHOR_UID) {
        throw new Error("ليس لديك صلاحية حذف هذا التعليق");
      }

      await db.collection("comments").doc(commentId).delete();
      Utils.showToast("تم حذف التعليق بنجاح", 'success');
      return true;
    } catch (error) {
      console.error("فشل في حذف التعليق:", error);
      Utils.showToast(error.message, 'error');
      return false;
    } finally {
      Utils.hideLoading();
    }
  }

  static renderComment(comment, depth = 0) {
    const isCurrentUser = currentUser && comment.userId === currentUser.uid;
    const isAuthor = comment.userId === AUTHOR_UID;

    const commentDiv = document.createElement("div");
    commentDiv.className = 'comment-item';
    commentDiv.style.cssText = `
      margin-bottom: 12px;
      border-bottom: 1px solid #334155;
      padding: 12px;
      word-break: break-word;
      background: ${isAuthor ? '#1e293b' : isCurrentUser ? '#0f172a' : 'transparent'};
      border-right: ${isAuthor ? '4px solid #f43f5e' : isCurrentUser ? '3px solid #38bdf8' : 'none'};
      position: relative;
      margin-left: ${depth * 20}px;
    `;

    commentDiv.innerHTML = `
      <b style="color:${isAuthor ? '#f43f5e' : isCurrentUser ? '#7dd3fc' : '#a5b4fc'}">
        ${Utils.sanitize(comment.alias)}${isAuthor ? ' (الكاتبة)' : isCurrentUser ? ' (أنت)' : ''}
      </b>
      <span style="color:#64748b; font-size:0.8rem; margin-right:8px;">
        ${new Date(comment.timestamp?.toDate() || new Date()).toLocaleString()}
      </span>
      <br>
      <div style="margin-top:8px;">${Utils.sanitize(comment.text)}</div>
      <button class="reply-btn" style="position: absolute; top: 12px; left: 12px; background: transparent; border:none; color:#38bdf8; cursor:pointer; font-size: 0.9rem;">رد</button>
    `;

    // زر الرد
    const replyBtn = commentDiv.querySelector('.reply-btn');
    replyBtn.onclick = () => {
      this.showReplyBox(comment.id, commentDiv, comment.paragraphId);
    };

    // زر الحذف (للمستخدم الحالي أو الكاتبة)
    if (isCurrentUser || isAuthor) {
      const deleteBtn = document.createElement('button');
      deleteBtn.innerHTML = '🗑️';
      deleteBtn.title = 'حذف التعليق';
      deleteBtn.style.cssText = `
        position: absolute;
        top: 12px;
        left: 50px;
        background: transparent;
        border: none;
        color: #f87171;
        cursor: pointer;
        font-size: 0.9rem;
      `;
      
      deleteBtn.onclick = async () => {
        if (confirm("هل أنت متأكد من حذف هذا التعليق؟ لا يمكن التراجع.")) {
          const success = await this.deleteComment(comment.id);
          if (success) {
            commentDiv.remove();
          }
        }
      };
      commentDiv.appendChild(deleteBtn);
    }

    return commentDiv;
  }

  static showReplyBox(parentCommentId, parentDiv, paraId) {
    // إغلاق أي صناديق رد مفتوحة
    document.querySelectorAll('.reply-box').forEach(box => box.remove());

    const replyBox = document.createElement('div');
    replyBox.className = 'reply-box';
    replyBox.style.cssText = 'margin-top:12px; padding:8px; background:#1e293b; border-radius:4px;';

    replyBox.innerHTML = `
      <textarea placeholder="اكتب ردك هنا..." rows="2" style="width:100%; padding:8px; border-radius:4px; background:#0f172a; color:#cfefff; border:none;"></textarea>
      <div style="display:flex; justify-content:flex-end; margin-top:8px; gap:8px;">
        <button class="cancel-reply" style="padding:6px 12px; border-radius:4px; background:#64748b; border:none; color:white; cursor:pointer;">إلغاء</button>
        <button class="send-reply" disabled style="padding:6px 12px; border-radius:4px; background:#38bdf8; border:none; color:#0f172a; cursor:pointer;">إرسال</button>
      </div>
      <div class="error-message" style="color:#f87171; margin-top:8px; display:none;"></div>
    `;

    const textarea = replyBox.querySelector('textarea');
    const sendBtn = replyBox.querySelector('.send-reply');
    const cancelBtn = replyBox.querySelector('.cancel-reply');
    const errorDiv = replyBox.querySelector('.error-message');

    textarea.oninput = () => {
      sendBtn.disabled = !textarea.value.trim() || !currentUser;
      errorDiv.style.display = 'none';
    };

    cancelBtn.onclick = () => {
      replyBox.remove();
    };

    sendBtn.onclick = async () => {
      const val = textarea.value.trim();
      if (!val) {
        errorDiv.style.display = 'block';
        errorDiv.textContent = "لا يمكن إرسال رد فارغ";
        return;
      }
      if (val.length > 1000) {
        errorDiv.style.display = 'block';
        errorDiv.textContent = "الرد طويل جداً (الحد الأقصى 1000 حرف)";
        return;
      }

      const success = await this.addComment(paraId, val, parentCommentId);
      if (success) {
        replyBox.remove();
      }
    };

    parentDiv.appendChild(replyBox);
    textarea.focus();
  }
}

// ========== إدارة المحتوى ==========
class ContentService {
  static renderParagraphs(partId = 'toxic-part-1') {
    if (!elements.rawContent) {
      console.error('عنصر raw-content غير موجود');
      return;
    }

    const rawContent = elements.rawContent.textContent.trim();
    const paragraphs = rawContent.split(/\n\s*\n/);
    
    if (!elements.renderedContent) {
      console.error('عنصر rendered-content غير موجود');
      return;
    }

    elements.renderedContent.innerHTML = '';

    paragraphs.forEach((text, index) => {
      const paraId = `${partId}-p-${index + 1}`;
      const paraDiv = document.createElement('div');
      paraDiv.className = 'paragraph';
      paraDiv.id = paraId;
      paraDiv.style.cssText = 'margin-bottom:24px; padding-bottom:12px; border-bottom:1px solid #334155;';

      const p = document.createElement('p');
      p.innerHTML = Utils.sanitize(text.trim());
      paraDiv.appendChild(p);

      const controlsDiv = document.createElement('div');
      controlsDiv.style.cssText = 'display:flex; align-items:center; margin-top:8px;';

      const commentBtn = document.createElement('button');
      commentBtn.textContent = '💬 تعليق';
      commentBtn.style.cssText = 'margin-left:10px; cursor:pointer; padding:4px 8px; background:#1e293b; border:none; border-radius:4px; color:#7dd3fc;';
      commentBtn.onclick = () => this.toggleCommentBox(paraId);
      controlsDiv.appendChild(commentBtn);

      const counterSpan = document.createElement('span');
      counterSpan.id = `count-${paraId}`;
      counterSpan.style.cssText = 'margin-right:10px; color:#7dd3fc; font-size:0.9rem;';
      controlsDiv.appendChild(counterSpan);

      paraDiv.appendChild(controlsDiv);

      const commentBox = document.createElement('div');
      commentBox.className = 'comment-box';
      commentBox.id = `box-${paraId}`;
      commentBox.style.display = 'none';
      commentBox.innerHTML = `
        <div class="comments" style="max-height:400px; overflow-y:auto; margin-bottom:12px;"></div>
        <textarea placeholder="اكتب تعليقك هنا..." rows="3" style="width:100%; padding:8px; border-radius:4px; background:#0f172a; color:#cfefff; border:1px solid #334155;"></textarea>
        <button class="send-comment" disabled style="margin-top:8px; padding:8px 16px; border-radius:4px; background:#1e40af; border:none; color:white; cursor:pointer; float:right;">إرسال التعليق</button>
        <div class="error-message" style="color:#f87171; margin-top:8px; display:none;"></div>
        <div style="clear:both;"></div>
      `;

      const sendBtn = commentBox.querySelector('button.send-comment');
      const textarea = commentBox.querySelector('textarea');
      const errorDiv = commentBox.querySelector('.error-message');

      textarea.oninput = () => {
        sendBtn.disabled = !textarea.value.trim() || !currentUser;
        errorDiv.style.display = 'none';
      };

      sendBtn.onclick = async () => {
        const val = textarea.value.trim();
        if (!val) {
          errorDiv.style.display = 'block';
          errorDiv.textContent = "لا يمكن إرسال تعليق فارغ";
          return;
        }

        const success = await CommentService.addComment(paraId, val);
        if (success) {
          textarea.value = '';
          sendBtn.disabled = true;
        }
      };

      paraDiv.appendChild(commentBox);
      elements.renderedContent.appendChild(paraDiv);
    });
  }

  static toggleCommentBox(paraId) {
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
              commentList.innerHTML = '<div style="color:#64748b; text-align:center;">لا توجد تعليقات بعد.</div>';
              counterSpan.textContent = `0 تعليق`;
              return;
            }

            counterSpan.textContent = `${snapshot.size} تعليق${snapshot.size !== 1 ? 'ات' : ''}`;

            // تجميع التعليقات الرئيسية والردود
            const comments = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            const mainComments = comments.filter(c => c.parentCommentId === null);
            const repliesMap = comments.reduce((acc, comment) => {
              if (comment.parentCommentId) {
                if (!acc[comment.parentCommentId]) acc[comment.parentCommentId] = [];
                acc[comment.parentCommentId].push(comment);
              }
              return acc;
            }, {});

            commentList.innerHTML = '';

            // عرض التعليقات الرئيسية مع ردودها
            mainComments.forEach(comment => {
              this.renderCommentWithReplies(comment, repliesMap, commentList);
            });
          });
      }
    } else {
      box.style.display = 'none';

      if (listeners[paraId]) {
        listeners[paraId](); // إلغاء الاشتراك
        delete listeners[paraId];
      }
    }
  }

  static renderCommentWithReplies(comment, repliesMap, container, depth = 0) {
    const commentDiv = CommentService.renderComment(comment, depth);
    container.appendChild(commentDiv);

    const replies = repliesMap[comment.id] || [];
    if (replies.length > 0) {
      const repliesContainer = document.createElement('div');
      repliesContainer.style.marginLeft = '20px';
      repliesContainer.style.marginTop = '8px';
      commentDiv.appendChild(repliesContainer);

      replies.forEach(reply => {
        this.renderCommentWithReplies(reply, repliesMap, repliesContainer, depth + 1);
      });
    }
  }
}

// ========== تهيئة التطبيق ==========
document.addEventListener("DOMContentLoaded", () => {
  // تهيئة المصادقة
  AuthService.initAuthHandlers();

  // عرض المحتوى
  ContentService.renderParagraphs("toxic-part-1");

  // تنظيف الـ listeners عند إغلاق الصفحة
  window.addEventListener('beforeunload', () => {
    Object.values(listeners).forEach(unsubscribe => unsubscribe());
  });
});

// أنماط CSS الإضافية
const style = document.createElement('style');
style.textContent = `
  @keyframes fadeIn {
    from { opacity: 0; transform: translateY(10px); }
    to { opacity: 1; transform: translateY(0); }
  }
  @keyframes fadeOut {
    from { opacity: 1; transform: translateY(0); }
    to { opacity: 0; transform: translateY(10px); }
  }
  .comment-item {
    transition: all 0.3s ease;
  }
  .comment-item:hover {
    background: #1e293b !important;
  }
`;
document.head.appendChild(style);
