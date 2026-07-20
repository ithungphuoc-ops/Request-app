import { initializeApp, getApps, getApp, type FirebaseOptions } from "firebase/app";
import { getAuth, type Auth } from "firebase/auth";
import { getFirestore, type Firestore } from "firebase/firestore";

/**
 * Firebase Client SDK cho project riêng của base-request-app ("hpcons-request")
 * — dùng CHỈ để nghe real-time (`onSnapshot`) trên `requests/{id}`, không thay
 * thế đăng nhập SSO hiện có. Đăng nhập Firebase Auth phía trình duyệt là "ẩn"
 * (custom token từ /api/auth/firebase-token), không hiện màn hình đăng nhập
 * nào khác — xem design.md của change add-comment-mentions-realtime.
 */

const firebaseConfig: FirebaseOptions = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

let authInstance: Auth | undefined;
let dbInstance: Firestore | undefined;

function getFirebaseApp() {
  return getApps().length ? getApp() : initializeApp(firebaseConfig);
}

export function getFirebaseAuth(): Auth {
  authInstance ??= getAuth(getFirebaseApp());
  return authInstance;
}

export function getFirebaseFirestore(): Firestore {
  dbInstance ??= getFirestore(getFirebaseApp());
  return dbInstance;
}
