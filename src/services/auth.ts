/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Authentication + profile lifecycle on Firebase Auth + Firestore.
 * One email = one identity; the role is chosen at signup and lives in the
 * users/{uid} profile document. The Admin role is never self-registered —
 * it is provisioned server-side with a custom claim.
 */
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut as fbSignOut,
  onAuthStateChanged,
  User as FbUser,
} from 'firebase/auth';
import { doc, getDoc, onSnapshot, setDoc } from 'firebase/firestore';
import { auth, db } from '../firebase';
import { Role, User } from '../types';

export type SignUpInput = {
  role: Exclude<Role, 'Admin'>;
  email: string;
  password: string;
  fullName: string;
  phone: string;
  // Organizer fields
  businessName?: string;
  businessAddress?: string;
  instagram?: string;
  facebook?: string;
  website?: string;
  brandLogo?: string;
};

export class AuthError extends Error {
  code: string;
  constructor(code: string, message: string) {
    super(message);
    this.code = code;
  }
}

const FRIENDLY_ERRORS: Record<string, string> = {
  'auth/email-already-in-use': 'An account with this email already exists. Sign in instead.',
  'auth/invalid-email': 'That email address does not look valid.',
  'auth/weak-password': 'Your password is too weak — use at least 6 characters.',
  'auth/user-not-found': 'No account found with that email.',
  'auth/wrong-password': 'Incorrect email or password.',
  'auth/invalid-credential': 'Incorrect email or password.',
  'auth/too-many-requests': 'Too many attempts. Please wait a moment and try again.',
  'auth/network-request-failed': 'Network problem — check your connection and try again.',
};

function friendly(error: unknown): AuthError {
  const code = (error as { code?: string })?.code || 'auth/unknown';
  return new AuthError(code, FRIENDLY_ERRORS[code] || 'Something went wrong. Please try again.');
}

function profileFromDoc(uid: string, data: Record<string, unknown>, fallbackEmail: string): User {
  return {
    id: uid,
    role: (data.role as Role) || 'Buyer',
    email: (data.email as string) || fallbackEmail,
    fullName: (data.fullName as string) || '',
    phone: (data.phone as string) || '',
    savedEventIds: (data.savedEventIds as string[]) || [],
    businessName: data.businessName as string | undefined,
    brandLogo: data.brandLogo as string | undefined,
    businessAddress: data.businessAddress as string | undefined,
    instagram: data.instagram as string | undefined,
    facebook: data.facebook as string | undefined,
    website: data.website as string | undefined,
  };
}

/* Create the auth user and its profile document. The profile write uses the
   user's own credentials, so the security rules can validate it. */
export async function signUp(input: SignUpInput): Promise<void> {
  let credential;
  try {
    credential = await createUserWithEmailAndPassword(auth, input.email.trim(), input.password);
  } catch (error) {
    throw friendly(error);
  }
  const uid = credential.user.uid;
  const profile: Record<string, unknown> = {
    role: input.role,
    email: input.email.trim().toLowerCase(),
    fullName: input.fullName.trim(),
    phone: input.phone.trim(),
    createdAt: new Date().toISOString(),
    savedEventIds: [],
  };
  if (input.role === 'Organizer') {
    profile.businessName = (input.businessName || input.fullName).trim();
    profile.businessAddress = (input.businessAddress || 'Abuja, Nigeria').trim();
    profile.instagram = input.instagram || '';
    profile.facebook = input.facebook || '';
    profile.website = input.website || '';
    if (input.brandLogo) profile.brandLogo = input.brandLogo;
  }
  try {
    await setDoc(doc(db, 'users', uid), profile);
  } catch (error) {
    /* The auth user exists but has no profile — surface a precise error
       instead of leaving a ghost account the user cannot use. */
    await fbSignOut(auth).catch(() => {});
    throw friendly(error);
  }
}

export async function signIn(email: string, password: string): Promise<void> {
  try {
    await signInWithEmailAndPassword(auth, email.trim(), password);
  } catch (error) {
    throw friendly(error);
  }
}

export function signOut(): Promise<void> {
  return fbSignOut(auth);
}

/* Fetch the profile document once (null when missing). */
export async function fetchProfile(fbUser: FbUser): Promise<User | null> {
  const snap = await getDoc(doc(db, 'users', fbUser.uid));
  if (!snap.exists()) return null;
  return profileFromDoc(fbUser.uid, snap.data(), fbUser.email || '');
}

/* Live identity: auth state plus the profile document, merged into one User.
   A missing profile (rare: provisioned accounts before first login) yields
   the auth-level identity only. Admin status comes from the custom claim. */
export function onAuthUser(callback: (user: User | null) => void): () => void {
  let isAdmin = false;
  let latestFbUser: FbUser | null = null;
  let latestProfile: User | null = null;
  let unsubUserDoc: (() => void) | null = null;

  const emit = () => {
    if (!latestFbUser) {
      callback(null);
      return;
    }
    if (latestProfile) {
      callback(isAdmin ? { ...latestProfile, role: 'Admin' } : latestProfile);
    } else {
      callback({
        id: latestFbUser.uid,
        role: isAdmin ? 'Admin' : 'Buyer',
        email: latestFbUser.email || '',
        fullName: latestFbUser.displayName || 'Account',
        phone: latestFbUser.phoneNumber || '',
      });
    }
  };

  const unsubAuth = onAuthStateChanged(auth, (fbUser) => {
    unsubUserDoc?.();
    unsubUserDoc = null;
    latestProfile = null;
    latestFbUser = fbUser;
    if (!fbUser) {
      isAdmin = false;
      emit();
      return;
    }
    /* Claims can change server-side (provisioning); force-refresh once. */
    fbUser.getIdTokenResult(true).then((result) => {
      isAdmin = result.claims.admin === true;
      emit();
    }).catch(() => emit());
    unsubUserDoc = onSnapshot(
      doc(db, 'users', fbUser.uid),
      (snap) => {
        latestProfile = snap.exists() ? profileFromDoc(fbUser.uid, snap.data(), fbUser.email || '') : null;
        emit();
      },
      () => { latestProfile = null; emit(); }
    );
  });

  return () => {
    unsubAuth();
    unsubUserDoc?.();
  };
}
