// ========== نظام الرتب ==========

// 1. دالة حساب الرتبة
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
    { min: 50, title: "💰 التاجر", group: "الغرباء" },
    { min: 0, title: "🪦 المتشرّد", group: "الغرباء" },
  ];
  for (const rank of ranks) {
    if (points >= rank.min) return rank;
  }
  return { title: "غير مصنّف", group: "مجهول" };
}

// 2. دالة تحديث النقاط والرتبة
async function updatePointsAndRank(uid) {
  const userRef = db.collection("users").doc(uid);

  await db.runTransaction(async (tx) => {
    const userDoc = await tx.get(userRef);
    let data = userDoc.exists ? userDoc.data() : {};

    let points = data.points || 0;
    const now = Date.now();
    const lastActive = data.lastActive || now;
    const daysInactive = (now - lastActive) / (1000 * 60 * 60 * 24);

    // زيادة نقطة
    points += 1;

    // خصم نقاط إذا خامل
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
