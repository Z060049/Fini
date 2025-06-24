const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccountKey.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function deleteAllTodos() {
  const todosRef = db.collection('todos');
  const snapshot = await todosRef.get();
  const batch = db.batch();

  snapshot.forEach(doc => {
    batch.delete(doc.ref);
  });

  await batch.commit();
  console.log('All todos deleted!');
}

deleteAllTodos().catch(console.error);
