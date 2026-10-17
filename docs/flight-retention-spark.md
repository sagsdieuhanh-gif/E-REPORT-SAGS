> Cập nhật V2.5.12 (18/10/2026): thời hạn hiện hành là **24 giờ kể từ Door Close**, thay cho 48 giờ trong tài liệu gốc bên dưới. Tên trường `retention48h` và tên workflow được giữ để tương thích dữ liệu cũ. Firebase chỉ hoạt động sau khi kết nối xác thực và kiểm tra bước `--apply` thực sự chạy.

# Firebase Spark: scheduled 48h retention through GitHub Actions

No Firebase Functions deployment, Cloud Scheduler, billing-account link or plan upgrade is required for the service-account mode. The public repository uses standard GitHub-hosted runners. Firebase API reads/writes/deletions/downloads still consume the project's Spark quotas. GitHub cron is best-effort and can be delayed or disabled after 60 days without repository activity; this is not an exact 48h deletion guarantee.

## What runs

`.github/workflows/flight-retention-48h.yml` runs at minutes 7, 22, 37 and 52 every hour. A push of the worker/workflow to main performs a dry run. Manual runs default to dry run. Scheduled runs apply the already-authorized 48h policy only when credentials exist. Missing credentials produces an explicit **NOT ACTIVE** summary and reads/deletes nothing.

The standalone worker polls changed handovers instead of requiring Firestore triggers. It records completion receipts, cancels reopened flights, processes due jobs and retries interrupted Firestore/RTDB deletion. An incremental cursor plus overlap/backlog tracking prevents repeated full historical scans. Each run scans at most 100 records per timestamp stream and examines at most 25 records per queue state. Initial backfill can require multiple runs; unknown historical completion dates are never invented. User data/flight identities/secrets are not logged publicly.

The existing protected receipt collection `sags_flight_retention_v1` must be readable by active application accounts (see `firebase/firestore.rules`). `sags_retention_control_v1` is Admin-only and has no client rule. Existing rules/settings remain unchanged by the workflow. The worker uses the existing single-field Firestore indexes; `updatedAtMs`, `submittedAtMs` and `status` must not be exempted. RTDB mailbox query performance requires the existing `eventAtMs` index plus `package/parentDocId` under `sags_live_v470/cross_mail/$user/events`.

## One-time trusted connection

A connected Firebase administrator must configure a dedicated service account in project `e-report-sags`, with Firestore data and Realtime Database administration permissions (`roles/datastore.user` and `roles/firebasedatabase.admin`). It does not need Owner, billing, Functions or Hosting permissions.

For the no-billing Spark path, store that account's JSON credential only in the repository's Actions secret named `FIREBASE_SERVICE_ACCOUNT_JSON`. Do not put it in source, a browser bundle, an issue, an artifact or chat. The authentication action creates a temporary ignored credentials file and removes it after the job. Only the main branch workflow may use it; the workflow is not triggered by pull requests. Rotate/revoke the account key through the administrator's process.

Settings URL: https://github.com/sagsdieuhanh-gif/E-REPORT-SAGS/settings/secrets/actions

A workload-identity configuration already provisioned elsewhere can instead use `FIREBASE_WIF_PROVIDER` as a repository variable and `sags-retention@e-report-sags.iam.gserviceaccount.com`. Do not enable/link billing merely to set up federation: that would defeat the Spark-only requirement. Without the account connection, publishing the workflow alone is NOT activation.

## Validate activation

1. Connect the Firebase administrator and configure the service account/Actions secret and protected receipt read rule. No credential is needed from the application users.
2. Run **Flight retention 48h (Firebase Spark)** manually in dry-run mode. Verify its summary reports scan counts without authentication/permission/index/quota errors. It must not say NOT ACTIVE.
3. Run manually with `dry_run=false` to record verified archive lifecycle receipts and execute only already-expired, confirmed closed flights. Inspect due-flight identity and related payload coverage before enabling unattended runs with new legacy datasets. Scheduled runs automatically use apply mode once authenticated.
4. Check `lastRunAtMs` and aggregate counts in Admin-only `sags_retention_control_v1/github-actions`. A local client cleans an inactive flight only after a `purged` receipt confirms both Firebase stages completed. Active editors/other tabs/unsynced values remain protected.
5. Monitor Actions failures and Firebase quota usage. Do not claim activation from a green skipped run; the summary must contain a real authenticated worker result.

The former Functions code remains available but is not required or deployed for this path. All earlier per-flight/local-data guards and exact-match deletion rules still apply.
