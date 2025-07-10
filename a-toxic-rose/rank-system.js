// ========== نظام الرتب ==========

// 1. دالة حساب الرتبة بناءً على عدد النقاط
function calculateRank(points) {
  const ranks = [
    { min: 500, title: "👑 الملك/الملكة", group: "النبلاء" },
    { min: 400, title: "👘 الأمير/الأميرة", group: "النبلاء" },
    { min: 350, title: "💼 الوزير/الوزيرة", group: "النبلاء" },
    { min: 300, title: "🎩 اللورد/اللوردة", group: "النبلاء" },
    { min: 270, title: "🛡️ قائد الفرسان", group: "الفرسان" },
    { min: 240, title: "⚔️ الحارس الملكي", group: "الفرسان" },
    { min: 210, title: "📚 المستشار", group: "الفرسان" },
    { min: 200, title: "🧭 الفارس", group: "الفرسان" },
    { min: 150, title: "🚩 متدرّب", group: "الغرباء" },
    { min: 100, title: "🧍 المواطن", group: "الغرباء" },
    { min: 50,  title: "💰 التاجر", group: "الغرباء" },
    { min: 0,   title: "🪦 المتشرّد", group: "الغرباء" }
  ];
  for (const rank of ranks) {
    if (points >= rank.min) return rank;
  }
  return { title: "غير مصنّف", group: "مجهول" };
}

// 2. دالة إضافة عدد معين من النقاط وتحديث الرتبة
async function addPoints(uid, amount = 1) {
  const userRef = db.collection("users").doc(uid);

  await db.runTransaction(async (tx) => {
    const userDoc = await tx.get(userRef);
    let data = userDoc.exists ? userDoc.data() : {};

    let points = (data.points || 0) + amount;
    const now = Date.now();

    const rank = calculateRank(points);

    tx.set(userRef, {
      points,
      lastActive: now,
      lastPoints: (data.lastPoints || 0) + amount,
      rank: rank.title,
      rankGroup: rank.group,
    }, { merge: true });
  });
}

// 3. دالة تحديث النقاط اليومية (مثلاً عند تسجيل الدخول أو النشاط العام)
async function updatePointsAndRank(uid) {
  const userRef = db.collection("users").doc(uid);

  await db.runTransaction(async (tx) => {
    const userDoc = await tx.get(userRef);
    let data = userDoc.exists ? userDoc.data() : {};

    let points = data.points || 0;
    const now = Date.now();
    const lastActive = data.lastActive || now;
    const daysInactive = (now - lastActive) / (1000 * 60 * 60 * 24);

    // إضافة نقطة نشاط عادية
    points += 1;

    // خصم نقاط للخاملين إذا لم يتجاوزوا عدد معين
    if (daysInactive >= 7 && (data.lastPoints || 0) < 20) {
      points = Math.max(0, points - 10);
    }

    const rank = calculateRank(points);

    tx.set(userRef, {
      points,
      lastActive: now,
      lastPoints: (data.lastPoints || 0) + 1,
      rank: rank.title,
      rankGroup: rank.group,
    }, { merge: true });
  });
}

// 4. دالة إحضار الرتبة الحالية لأي مستخدم
async function getUserRank(uid) {
  const doc = await db.collection("users").doc(uid).get();
  if (!doc.exists) return null;

  return {
    rank: doc.data().rank,
    group: doc.data().rankGroup,
    points: doc.data().points || 0
  };
                          }
