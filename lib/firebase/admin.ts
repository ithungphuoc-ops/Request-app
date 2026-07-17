import "server-only";
import { cert, getApps, initializeApp, type App } from "firebase-admin/app";
import { getFirestore, type Firestore } from "firebase-admin/firestore";

/**
 * App Admin SDK MẶC ĐỊNH của base-request-app (Firestore nghiệp vụ: groups,
 * categories, requests) — TÁCH RIÊNG khỏi app "hpcore" dùng để xác minh SSO
 * (xem lib/hpcore.ts), project Firebase khác nhau. Khởi tạo lười (proxy) để
 * `next build` không crash khi chưa có credential thật trong .env.local.
 */

let app: App | undefined;

function getAdminApp(): App {
  if (app) return app;
  const existing = getApps().find((a) => a.name === "[DEFAULT]");
  if (existing) {
    app = existing;
    return app;
  }

  const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, "\n");

  app = initializeApp({ credential: cert({ projectId, clientEmail, privateKey }) });
  return app;
}

function lazyProxy<T extends object>(resolve: () => T): T {
  return new Proxy({} as T, {
    get(_target, prop) {
      const real = resolve();
      const value = Reflect.get(real as object, prop);
      return typeof value === "function" ? value.bind(real) : value;
    },
  });
}

let firestoreInstance: Firestore | undefined;

function getAdminFirestore(): Firestore {
  if (!firestoreInstance) {
    firestoreInstance = getFirestore(getAdminApp());
    firestoreInstance.settings({ ignoreUndefinedProperties: true });
  }
  return firestoreInstance;
}

export const adminDb: Firestore = lazyProxy(getAdminFirestore);
