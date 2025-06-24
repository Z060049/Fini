const admin = require('firebase-admin');

// TODO: Replace with your service account key path or credentials
const serviceAccount = require('./serviceAccountKey.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function cleanupGeneralProjectsForJoe() {
  const todosRef = db.collection('todos');
  // Only get General projects for user Joe
  const snapshot = await todosRef
    .where('isDefault', '==', true)
    .where('text', '==', 'General')
    .where('creator', '==', 'Joe')
    .get();

  // Group by status
  const byStatus = {};
  snapshot.forEach(doc => {
    const data = doc.data();
    if (!byStatus[data.status]) byStatus[data.status] = [];
    byStatus[data.status].push({ id: doc.id, ...data });
  });

  for (const status in byStatus) {
    const generals = byStatus[status];
    if (generals.length > 1) {
      // Keep the first, delete the rest
      const [keep, ...toDelete] = generals;
      console.log(`Keeping General for status "${status}":`, keep.id);
      for (const del of toDelete) {
        // Reassign subtasks
        const subtasks = await todosRef.where('parentId', '==', del.id).get();
        for (const subtaskDoc of subtasks.docs) {
          await subtaskDoc.ref.update({ parentId: keep.id });
          console.log(`Reassigned subtask ${subtaskDoc.id} to General ${keep.id}`);
        }
        // Delete duplicate General
        await todosRef.doc(del.id).delete();
        console.log(`Deleted duplicate General: ${del.id}`);
      }
    }
  }
  console.log('Cleanup complete!');
}

cleanupGeneralProjectsForJoe().catch(console.error); 