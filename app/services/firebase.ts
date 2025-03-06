import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  User,
  UserCredential,
  Auth,
} from 'firebase/auth';
import {
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  query,
  where,
  DocumentData,
  WhereFilterOp,
  Firestore,
} from 'firebase/firestore';
import firebase from '../config/firebase';

// Get typed instances of auth and db
const auth: Auth = firebase.auth;
const db: Firestore = firebase.db;

// Base interface for all document types
export interface BaseDocument extends DocumentData {
  id?: string;
}

// Authentication Services
export const signUp = async (email: string, password: string): Promise<UserCredential> => {
  return createUserWithEmailAndPassword(auth, email, password);
};

export const signIn = async (email: string, password: string): Promise<UserCredential> => {
  return signInWithEmailAndPassword(auth, email, password);
};

export const logOut = async (): Promise<void> => {
  return signOut(auth);
};

export const getCurrentUser = (): User | null => {
  return auth.currentUser;
};

// Firestore Services
export const createDocument = async <T extends BaseDocument>(
  collectionName: string,
  docId: string,
  data: T
): Promise<void> => {
  const { id, ...dataWithoutId } = data;
  const docRef = doc(db, collectionName, docId);
  await setDoc(docRef, dataWithoutId);
};

export const getDocument = async <T extends BaseDocument>(
  collectionName: string,
  docId: string
): Promise<T | null> => {
  const docRef = doc(db, collectionName, docId);
  const docSnap = await getDoc(docRef);
  if (!docSnap.exists()) return null;
  return { ...docSnap.data(), id: docSnap.id } as T;
};

export const queryDocuments = async <T extends BaseDocument>(
  collectionName: string,
  fieldPath: string,
  operator: WhereFilterOp,
  value: any
): Promise<T[]> => {
  const q = query(collection(db, collectionName), where(fieldPath, operator, value));
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as T));
};

// Error handling wrapper
export const handleFirebaseError = (error: any): string => {
  console.error('Firebase Error:', error);
  if (error.code) {
    switch (error.code) {
      case 'auth/email-already-in-use':
        return 'This email is already registered.';
      case 'auth/invalid-email':
        return 'Invalid email address.';
      case 'auth/operation-not-allowed':
        return 'Operation not allowed.';
      case 'auth/weak-password':
        return 'Password is too weak.';
      case 'auth/user-disabled':
        return 'This account has been disabled.';
      case 'auth/user-not-found':
        return 'User not found.';
      case 'auth/wrong-password':
        return 'Incorrect password.';
      default:
        return 'An error occurred. Please try again.';
    }
  }
  return error.message || 'An unexpected error occurred.';
}; 
export default firebase;