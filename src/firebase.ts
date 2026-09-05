import { initializeApp, getApps, getApp } from "firebase/app";
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut as fbSignOut,
  onAuthStateChanged,
  User,
} from "firebase/auth";
import {
  getFirestore,
  collection,
  doc,
  setDoc,
  getDocs,
  getDoc,
  deleteDoc,
  query,
  orderBy,
  getDocFromServer,
  Firestore,
} from "firebase/firestore";
import firebaseAppletConfig from "../firebase-applet-config.json";

// Read configuration from provisioned firebase-applet-config.json with fallback to environment variables
const firebaseConfig = {
  apiKey: firebaseAppletConfig?.apiKey || import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyDummyKeyForStudioPreviewSafe123456",
  authDomain: firebaseAppletConfig?.authDomain || import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: firebaseAppletConfig?.projectId || import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: firebaseAppletConfig?.storageBucket || import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: firebaseAppletConfig?.messagingSenderId || import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: firebaseAppletConfig?.appId || import.meta.env.VITE_FIREBASE_APP_ID,
};

// Initialize Firebase App
const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

// Initialize Firebase Auth
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: "select_account" });

// Initialize Firestore with specific database ID if available
const databaseId = firebaseAppletConfig?.firestoreDatabaseId;
export const db: Firestore = databaseId && databaseId !== "(default)"
  ? getFirestore(app, databaseId)
  : getFirestore(app);

// Mandated error handler conforming to FirestoreErrorInfo
export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map((provider) => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || [],
    },
    operationType,
    path,
  };
  console.error("Firestore Error: ", JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Test Firestore connectivity
export async function testConnection(): Promise<boolean> {
  try {
    await getDocFromServer(doc(db, "test", "connection"));
    return true;
  } catch (error: any) {
    if (error instanceof Error && error.message.includes("the client is offline")) {
      console.warn("Firestore client is offline or awaiting configuration.");
    }
    return false;
  }
}

// Authentication helpers
export async function signInWithGoogle(): Promise<User> {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    return result.user;
  } catch (error: any) {
    console.error("Firebase signInWithPopup error:", error);
    throw error;
  }
}

export async function signOutUser(): Promise<void> {
  await fbSignOut(auth);
}

export {
  collection,
  doc,
  setDoc,
  getDocs,
  getDoc,
  deleteDoc,
  query,
  orderBy,
  onAuthStateChanged,
};
export type { User };
