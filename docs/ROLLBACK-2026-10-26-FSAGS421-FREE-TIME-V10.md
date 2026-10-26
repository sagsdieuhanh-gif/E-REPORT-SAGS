# Emergency full-app rollback to the V1.0 42.1 free-time release

- Date: 2026-10-26.
- User-directed complete application rollback from V1.9 to V1.0.
- Baseline source commit: `682342de6de5f3dcfd34fdc0320ee442ed50d3ea`.
- Baseline build: `V1.0-20261025-TVJ-VZ-421-FREE-TIME-09`.
- FSAGS 42.1 independent time entry is enabled; the 42.1 input no longer requires previous Start/Finish fields in order. Valid HH:MM checks stay enabled.
- TVJ-GOF-035 is limited to qualifying Vietjet (VZ/TVJ) flights.
- GitHub backup of the replaced release V1.9: `backup/before-full-rollback-v10-20261026`.
- This documentation-only commit intentionally triggers a fresh `main` deployment of the exact V1.0 application files. No application source, manifests, authentication rules, offline drafts, PDFs, or Firebase records are edited here.
- Important: deploying older application code does not revert Firebase data or recover data changed by newer clients; verify live behavior before declaring the rollback complete.
