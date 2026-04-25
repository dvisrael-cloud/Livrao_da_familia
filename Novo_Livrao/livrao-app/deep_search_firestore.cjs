const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccountKey.json'); // Might not exist, will try default
const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');

async function searchDeep() {
  try {
    // Attempt to initialize using local environment/ADC
    admin.initializeApp({
      projectId: 'album-familia-final'
    });
  } catch (e) {
    console.log("Initialization error (expected if no ADC):", e.message);
    return;
  }

  const db = getFirestore();
  const familyUids = [
    '1DyECP2wp9PJ3FjttzjlcQTIDc92', // David
    'ClUpAGJdTCNCjky5vJEq3vY6vmE2', // Marcia 1
    'HsaeMrGKclcSxlPBtyHeycSWWEC3'  // Marcia 2
  ];

  for (const uid of familyUids) {
    console.log(`--- Checking Family UID: ${uid} ---`);
    const membersRef = db.collection('familias').doc(uid).collection('membros');
    const snapshot = await membersRef.get();
    
    if (snapshot.empty) {
      console.log(`No documents in familias/${uid}/membros`);
    } else {
      console.log(`Found ${snapshot.size} members in familias/${uid}/membros:`);
      snapshot.forEach(doc => {
        console.log(` - ID: ${doc.id}, Name: ${doc.data().nomeCompleto || doc.data().fullName || 'No Name'}`);
      });
    }

    // Also check for sub-subcollections or others
    const subcollections = await db.collection('familias').doc(uid).listCollections();
    for (const sub of subcollections) {
      console.log(`Found subcollection: ${sub.id}`);
    }
  }

  // Global search for the name
  console.log("--- Global Search for 'Vidal David Israel' ---");
  const globalMembros = await db.collectionGroup('membros').where('nomeCompleto', '==', 'Vidal David Israel').get();
  if (globalMembros.empty) {
     const globalMembros2 = await db.collectionGroup('membros').where('fullName', '==', 'Vidal David Israel').get();
     console.log(`Global search (Collection Group 'membros'): Found ${globalMembros2.size} results`);
  } else {
     console.log(`Global search (Collection Group 'membros'): Found ${globalMembros.size} results`);
  }
}

searchDeep();
