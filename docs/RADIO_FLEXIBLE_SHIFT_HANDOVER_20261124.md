# Radio custody: explicit intended shift / early handover (2026-11-24)

## Why the old calculation was incorrect
A member of the incoming night shift can receive a radio at 17:30–18:45 while the nominal morning shift continues to 19:00. The old implementation silently assigned the event to the shift of the sign-in timestamp and disabled the `radioShift` selector. It then used `heldSince` time to decide whether the device was overdue. Consequently, a valid early-PM receipt was misclassified as AM and reported as overdue at 19:01.

## Business rules
- **Scheduled duty shift:** AM 08:30–19:00; PM 19:01–08:29 following day (Vietnam local).
- **Actual signed receipt time:** immutable Firebase server timestamp; never modified to match the scheduled start.
- **Intended duty:** new ISSUE has a real AM/PM selector; within ambiguous handover window 16:00–19:00, the employee must choose rather than silently infer. Outside that window the clock shift is only a suggested default and can be changed for legitimate early receipt.
- A new **18:15 PM** receipt belongs to the **same calendar day's PM duty**, due for return **08:30 the following day**, not 19:01 that evening.
- A new **18:15 AM** receipt belongs to the AM duty, due **19:01 the same day**.
- RETURN and SWAP_OUT carry the duty of the held radio; they must not derive duty again from the return timestamp. SWAP_IN follows the same duty while exchanging devices.
- Firestore already stores `shift` (AM/PM) on the device and immutable event and allows those values in current Rules; this patch requires no new Firestore fields or Rules deployment.
- Time-based warning remains advisory only: custody/flight operations are not blocked solely by prior-shift overdue.
- Every live alert, PDF due computation, My Flight advisory and personal return reminder respects the selected duty. Shift-specific historical reports fetch a wider server interval, then classify by recorded duty while preserving the original timestamp.

## Existing history
Old signed events were written with a clock-derived AM/PM label, including possible misclassified 17:30–19:00 receipts. The original evidence and timestamp are immutable. The software must not silently rewrite historical data or claim to infer a past employee's intended duty. AD should compare roster/photographs when investigating older sessions; any retroactive correction needs an explicit audited correction workflow and matching production Rules.

## Manual validation
- 18:15 signed **PM**, check Firebase device.shift=PM and event.shift=PM and actual event.at=18:15.
- At 19:00/19:01, the live overdue banner, My Flight and reminders must **not** mark it overdue.
- 18:15 signed **AM**, at 19:01 it can be marked overdue if still OUT.
- At 08:30 the following morning, the PM holder may be flagged overdue if not returned.
- PM shift PDF must include the 18:15 signed PM event; AM report must exclude it. Weekly/monthly breakdown should put it under PM.
- RETURN and SWAP_OUT retain the original machine's shift; validate iOS/Android native photo draft resume retains the employee's choice.
- During 16:00–19:00 ambiguous handover, saving ISSUE without choosing AM or PM is blocked. At other hours, user may override the proposed duty.
