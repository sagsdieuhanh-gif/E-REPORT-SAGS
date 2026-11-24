# E-REPORT-SAGS — One official URL and Firebase protection (24/11/2026)

## Canonical URL

**Allowed app entry:** https://sagsdieuhanh-gif.github.io/E-REPORT-SAGS/

The first inline script in `index.html` checks, before loading the Firebase SDK or any app code:
- HTTPS only, host exactly `sagsdieuhanh-gif.github.io`;
- path exactly `/E-REPORT-SAGS/` (legacy `/index.html` is redirected);
- not embedded in an iframe.

On a non-matching origin/path, it stops parsing, replaces the page with a notice, and redirects to the official URL. PWA `manifest.webmanifest` uses `start_url: "./"`, so standalone iOS/Android installations still use the canonical GitHub Pages origin. Query parameters and hash navigation remain supported.

**Important limitation:** This is a user-interface entry restriction, not a server-side security boundary. GitHub Pages is public static hosting; anyone can copy or remove client-side code. Rewrites and tools with direct Firebase SDK access can bypass this check. No code-only fix on GitHub Pages can categorically invalidate every modified copy.

## Production Firebase configuration required

Do **not** enable enforcement on live services until the legitimate client is configured and verified on both iOS Safari and Android browsers; otherwise all users could lose access. Never make Firebase Security Rules open to compensate.

1. **Firebase Authentication → Settings → Authorized domains:** Review domains and remove unused testing or duplicate hosts, particularly `localhost`, custom preview sites, and Vercel mirrors *if they are not needed*. Leave any Firebase-required authentication handler domains intact. Authorized Domains is **not** sufficient for all email/password or direct API operations; it is not a database access-control list.
2. **Firebase console → Security → App Check:** Register the actual production Web App with **reCAPTCHA Enterprise** or the supported web provider. Restrict the provider's **approved domains** to `sagsdieuhanh-gif.github.io`. Turn off wildcard / disabled domain verification. Note that reCAPTCHA domain restrictions are host-level, **not** GitHub Pages path-level. A dedicated custom hostname is preferable for stronger site isolation.
3. **Application SDK integration:** Initialize App Check on **every Firebase application instance** that uses Realtime Database, Cloud Firestore, or Cloud Storage. This app uses the Firebase compat SDK and may create additional named Firebase app instances (for example an RTDB instance); registration on only the default app is insufficient. Integrate the compatible App Check library after Firebase app SDK and before protected-service operations. Requires the actual Firebase Web App ID and the approved reCAPTCHA site key (site key is public; *do not* expose private secret keys). Test token refresh and standalone PWA behavior.
4. **Monitor first, then enforce:** Inspect App Check metrics for legitimate verified traffic; only then enable enforcement separately for Realtime Database / Cloud Firestore / Storage where used. Existing Firebase Authentication is not automatically protected by database App Check; Authentication App Check enforcement requires Identity Platform in the documented configurations. Roll out carefully and retain an emergency rollback procedure.
5. **Security Rules:** Continue enforcing Firebase Authentication and user/role/roster/assignment permissions on the backend. App Check is extra client attestation, not user authorization, not a replacement for Rules.
6. **External deployments:** Disable/retire any live mirror on Vercel, Firebase Hosting, or another GitHub Pages site, and direct users to the official URL. A copied site whose owner removes this script cannot be technically blocked by this frontend change alone.
7. **Verification:** Confirm official link and PWA can sign in, open roster, save, sign, and export PDF; verify any stale mirror redirects. Confirm App Check's verified/unverified request metrics before enabling enforcement. Monitor denial events immediately after rollout.

## Deployment status

The canonical entry redirect and PWA start URL are held in the GitHub repository. **Production Firebase App Check configuration, enforcement, and live Rules have not been changed by this code release**, because Firebase console access and the approved provider site key are not available from this repository connection.

## Further architectural recommendation

To enforce an absolute unique web **origin** rather than one GitHub Pages **path**, move the frontend to a dedicated custom domain (for example a company-controlled hostname) and apply App Check domain restrictions there. Even then, server-verified identity, roles, roster state and security policies—not origin alone—are what authorize sensitive actions.
