
import * as _admin from 'firebase-admin';

const getAdmin = () => {
    if (!_admin.apps.length) {
        try {
            _admin.initializeApp({
                credential: _admin.credential.cert({
                    privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
                    clientEmail: 'firebase-adminsdk-or2e0@in2view.iam.gserviceaccount.com', //process.env.FIREBASE_CLIENT_EMAIL,
                    projectId: 'in2view',
                }),
                databaseURL: "https://in2view-default-rtdb.europe-west1.firebasedatabase.app"

            });
        } catch (error) {
            console.log('Firebase admin initialization error', error.stack);
        }
    }
    return _admin;
}

const admin = getAdmin();


export {
    admin
}