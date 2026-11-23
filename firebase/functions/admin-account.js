'use strict';
/*
 * Firebase Auth password reset for E-REPORT AD.
 * Only a verified, active ADMIN may reset another active account.
 * Never store, return, or log the newly issued plaintext password.
 */
const MAX_UID_LENGTH = 128;
const isUid = value => typeof value === 'string' && value.length > 0 &&
  value.length <= MAX_UID_LENGTH && !/[\s/]/.test(value);
const strongPassword = value => typeof value === 'string' &&
  value.length >= 16 && value.length <= 128 &&
  /[A-Z]/.test(value) && /[a-z]/.test(value) &&
  /[0-9]/.test(value) && /[^A-Za-z0-9]/.test(value);

function createAdminResetAuthPassword({firestore, identity, HttpsError, now = Date.now}) {
  const fail = (code, message) => { throw new HttpsError(code, message); };
  return async request => {
    const callerUid = request?.auth?.uid;
    if (!isUid(callerUid)) fail('unauthenticated', 'Firebase Authentication required.');
    const data = request?.data;
    if (!data || typeof data !== 'object' || Array.isArray(data)) {
      fail('invalid-argument', 'Invalid reset request.');
    }
    const targetUid = data.targetUid;
    if (!isUid(targetUid) || (data.uid !== undefined && data.uid !== targetUid) ||
        (data.userId !== undefined && data.userId !== targetUid)) {
      fail('invalid-argument', 'Target UID mismatch.');
    }
    if (targetUid === callerUid) {
      fail('failed-precondition', 'Administrators must change their own password in account settings.');
    }
    const password = data.newPassword;
    if (!strongPassword(password) ||
        (data.password !== undefined && data.password !== password)) {
      fail('invalid-argument', 'One-time password does not meet security requirements.');
    }

    // Request claims and the browser UI cannot grant AD privileges.
    const actorAuth = await identity.getUser(callerUid);
    const actor = await firestore.collection('users').doc(callerUid).get();
    const actorProfile = actor.exists ? actor.data() || {} : {};
    if (actorAuth.disabled || actorProfile.active !== true ||
        actorProfile.deleted === true ||
        !['AD', 'ADMIN'].includes(String(actorProfile.role || '').toUpperCase())) {
      fail('permission-denied', 'Active ADMIN privileges are required.');
    }

    const targetRef = firestore.collection('users').doc(targetUid);
    const target = await targetRef.get();
    const profile = target.exists ? target.data() || {} : {};
    if (profile.active !== true || profile.deleted === true ||
        typeof profile.email !== 'string' || !profile.email.trim()) {
      fail('failed-precondition', 'The target account is not active or has no verified email.');
    }
    const account = await identity.getUser(targetUid);
    if (account.disabled || !account.email ||
        account.email.trim().toLowerCase() !== profile.email.trim().toLowerCase()) {
      fail('failed-precondition', 'Firebase Auth and Firestore account identity do not match.');
    }

    // Make the first-login password-change requirement durable BEFORE Auth changes.
    // Failure here leaves the existing Auth password untouched.
    await targetRef.update({mustChangePassword: true});
    await identity.updateUser(targetUid, {password});

    // A failed audit timestamp must not hide a successful Auth change from AD:
    // doing so would strand the user with a password the administrator never saw.
    const atMs = now();
    try {
      await targetRef.update({mustChangePassword: true, passwordResetAtMs: atMs, updatedAtMs: atMs});
    } catch (_error) {
      console.error('Auth password changed; Firestore timestamp update failed (password never logged).');
    }
    return {ok: true, uid: targetUid, mustChangePassword: true};
  };
}
module.exports = {strongPassword, createAdminResetAuthPassword};
