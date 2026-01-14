import { initializeApp, getApps, getApp, cert, ServiceAccount } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
import { getStorage } from "firebase-admin/storage";

const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT_KEY
    ? JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY as string)
    : {};

const formatBucketName = (name: string | undefined) => {
    if (!name) return undefined;
    return name.replace(/^gs:\/\//, '').trim();
};

const app = !getApps().length
    ? initializeApp({
        credential: cert(serviceAccount),
        storageBucket: formatBucketName(process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET),
    })
    : getApp();

const adminAuth = getAuth(app);
const adminDb = getFirestore(app);
const adminStorage = getStorage(app);

export { adminAuth, adminDb, adminStorage };
