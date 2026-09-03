package vn.sags.trungkien;

import android.content.Context;
import android.content.SharedPreferences;
import android.net.Uri;
import android.os.Handler;
import android.os.Looper;

import org.json.JSONArray;
import org.json.JSONObject;

import java.io.*;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.*;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

public final class BundleUpdateManager {
    public static final String APP_URL = "https://sagsdieuhanh-gif.github.io/E-REPORT-SAGS/";
    private static final String VERSION_URL = APP_URL + "version.json";
    private static final String TREE_URL = "https://api.github.com/repos/sagsdieuhanh-gif/E-REPORT-SAGS/git/trees/main?recursive=1";
    private static final String RAW_BASE = "https://raw.githubusercontent.com/sagsdieuhanh-gif/E-REPORT-SAGS/main/";
    private static final String PREFS = "trungkien_v1_update";
    private static final String K_ACTIVE = "active_build";
    private static final String K_PREVIOUS = "previous_build";
    private static final String K_PENDING = "pending_build";
    private static final String K_AWAITING = "awaiting_healthy";

    public interface Listener {
        void onUpdateAvailable(VersionInfo info);
        void onProgress(int percent, String message);
        void onInstalled(String build);
        void onError(String message);
        void onBootstrapReady(String build);
    }

    public static final class VersionInfo {
        public final String version, build, notes;
        VersionInfo(String version, String build, String notes) {
            this.version = version == null ? "" : version;
            this.build = build == null ? "" : build;
            this.notes = notes == null ? "" : notes;
        }
    }

    private static final class TreeItem {
        final String path, sha;
        final long size;
        TreeItem(String path, String sha, long size) {
            this.path = path; this.sha = sha; this.size = size;
        }
    }

    private final Context context;
    private final SharedPreferences prefs;
    private final ExecutorService io = Executors.newSingleThreadExecutor();
    private final Handler main = new Handler(Looper.getMainLooper());
    private final File bundlesRoot;
    private volatile Listener listener;
    private volatile VersionInfo lastRemote;

    public BundleUpdateManager(Context context) {
        this.context = context.getApplicationContext();
        this.prefs = this.context.getSharedPreferences(PREFS, Context.MODE_PRIVATE);
        this.bundlesRoot = new File(this.context.getFilesDir(), "web-bundles");
        //noinspection ResultOfMethodCallIgnored
        bundlesRoot.mkdirs();
        recoverInterruptedActivation();
        promotePendingFromPreviousRun();
        cleanupBundles();
    }

    public void setListener(Listener l) { this.listener = l; }

    public String getActiveBuild() { return prefs.getString(K_ACTIVE, ""); }

    public File getActiveDir() {
        String b = getActiveBuild();
        if (b.isEmpty()) return null;
        File d = dirForBuild(b);
        return new File(d, "index.html").isFile() ? d : null;
    }

    public boolean hasActiveBundle() { return getActiveDir() != null; }

    public File resolveActiveFile(String relativePath) {
        File base = getActiveDir();
        if (base == null) return null;
        try {
            String rel = relativePath == null || relativePath.isEmpty() ? "index.html" : relativePath;
            rel = Uri.decode(rel);
            if (rel.startsWith("/")) rel = rel.substring(1);
            File f = new File(base, rel);
            String basePath = base.getCanonicalPath() + File.separator;
            String filePath = f.getCanonicalPath();
            if (!filePath.startsWith(basePath) && !filePath.equals(base.getCanonicalPath())) return null;
            return f.isFile() ? f : null;
        } catch (Exception e) {
            return null;
        }
    }

    public void checkForUpdateAsync() {
        io.execute(() -> {
            try {
                VersionInfo remote = fetchVersion();
                lastRemote = remote;
                String active = getActiveBuild();
                if (active.isEmpty()) {
                    stageLatestForNextLaunch(remote);
                    return;
                }
                if (!remote.build.isEmpty() && !remote.build.equals(active)) {
                    post(() -> { if (listener != null) listener.onUpdateAvailable(remote); });
                }
            } catch (Exception e) {
                // Silent check: online errors must not disturb current work.
            }
        });
    }

    public void installLatestAsync() {
        io.execute(() -> {
            try {
                VersionInfo remote = fetchVersion();
                lastRemote = remote;
                if (remote.build.isEmpty()) throw new IOException("version.json thiếu build");
                File installed = downloadBundle(remote, true);
                activate(remote.build, installed);
                post(() -> {
                    if (listener != null) {
                        listener.onProgress(100, "Đã tải xong");
                        listener.onInstalled(remote.build);
                    }
                });
            } catch (Exception e) {
                post(() -> { if (listener != null) listener.onError(cleanMessage(e)); });
            }
        });
    }

    public void markHealthy(String build) {
        String active = getActiveBuild();
        if (!active.isEmpty() && (build == null || build.isEmpty() || active.equals(build))) {
            prefs.edit().putBoolean(K_AWAITING, false).apply();
            cleanupBundles();
        }
    }

    public VersionInfo getLastRemote() { return lastRemote; }

    private void stageLatestForNextLaunch(VersionInfo remote) throws Exception {
        if (remote.build.isEmpty()) return;
        File target = dirForBuild(remote.build);
        if (new File(target, "index.html").isFile()) {
            prefs.edit().putString(K_PENDING, remote.build).apply();
            post(() -> { if (listener != null) listener.onBootstrapReady(remote.build); });
            return;
        }
        File installed = downloadBundle(remote, false);
        if (installed != null) {
            prefs.edit().putString(K_PENDING, remote.build).apply();
            post(() -> { if (listener != null) listener.onBootstrapReady(remote.build); });
        }
    }

    private void promotePendingFromPreviousRun() {
        String pending = prefs.getString(K_PENDING, "");
        if (pending.isEmpty()) return;
        File d = dirForBuild(pending);
        if (!new File(d, "index.html").isFile()) {
            prefs.edit().remove(K_PENDING).apply();
            return;
        }
        String active = getActiveBuild();
        SharedPreferences.Editor ed = prefs.edit()
                .putString(K_ACTIVE, pending)
                .remove(K_PENDING)
                .putBoolean(K_AWAITING, false);
        if (!active.isEmpty() && !active.equals(pending)) ed.putString(K_PREVIOUS, active);
        ed.apply();
    }

    private void recoverInterruptedActivation() {
        boolean awaiting = prefs.getBoolean(K_AWAITING, false);
        if (!awaiting) return;
        String previous = prefs.getString(K_PREVIOUS, "");
        if (!previous.isEmpty() && new File(dirForBuild(previous), "index.html").isFile()) {
            prefs.edit().putString(K_ACTIVE, previous).putBoolean(K_AWAITING, false).apply();
        } else {
            prefs.edit().putBoolean(K_AWAITING, false).apply();
        }
    }

    private void activate(String build, File installed) throws IOException {
        if (installed == null || !new File(installed, "index.html").isFile()) {
            throw new IOException("Gói cập nhật thiếu index.html");
        }
        String old = getActiveBuild();
        SharedPreferences.Editor ed = prefs.edit()
                .putString(K_ACTIVE, build)
                .putBoolean(K_AWAITING, true);
        if (!old.isEmpty() && !old.equals(build)) ed.putString(K_PREVIOUS, old);
        ed.apply();
    }

    private File downloadBundle(VersionInfo remote, boolean explicit) throws Exception {
        if (explicit) progress(2, "Đang đọc danh sách tệp…");
        List<TreeItem> files = fetchTree();
        if (files.isEmpty()) throw new IOException("Không tìm thấy tài nguyên web");

        File finalDir = dirForBuild(remote.build);
        if (new File(finalDir, "index.html").isFile()) return finalDir;

        File stage = new File(bundlesRoot, ".stage-" + System.currentTimeMillis());
        deleteRecursive(stage);
        //noinspection ResultOfMethodCallIgnored
        stage.mkdirs();

        long totalBytes = 0L;
        for (TreeItem i : files) totalBytes += Math.max(i.size, 1L);
        long doneBytes = 0L;
        int doneFiles = 0;

        try {
            for (TreeItem item : files) {
                byte[] data = downloadBytes(RAW_BASE + encodePath(item.path));
                String actual = gitBlobSha1(data);
                if (!item.sha.isEmpty() && !actual.equalsIgnoreCase(item.sha)) {
                    throw new IOException("Sai checksum: " + item.path);
                }
                File dest = new File(stage, item.path);
                File parent = dest.getParentFile();
                if (parent != null) //noinspection ResultOfMethodCallIgnored
                    parent.mkdirs();
                try (FileOutputStream fos = new FileOutputStream(dest)) {
                    fos.write(data);
                }
                doneBytes += Math.max(item.size, data.length);
                doneFiles++;
                if (explicit) {
                    int pct = 5 + (int)Math.min(88, (doneBytes * 88L) / Math.max(totalBytes, 1L));
                    progress(pct, "Đang tải " + doneFiles + "/" + files.size());
                }
            }

            File vf = new File(stage, "version.json");
            File idx = new File(stage, "index.html");
            if (!vf.isFile() || !idx.isFile() || !new File(stage, "app.js").isFile()) {
                throw new IOException("Gói web thiếu tệp lõi");
            }
            JSONObject vj = new JSONObject(readText(vf));
            if (!remote.build.equals(vj.optString("build", ""))) {
                throw new IOException("Build tải về không khớp version.json");
            }

            injectNativeBootstrap(stage);

            if (explicit) progress(95, "Đang kiểm tra và chuyển gói…");
            deleteRecursive(finalDir);
            if (!stage.renameTo(finalDir)) {
                copyDirectory(stage, finalDir);
                deleteRecursive(stage);
            }
            return finalDir;
        } catch (Exception e) {
            deleteRecursive(stage);
            throw e;
        }
    }

    private List<TreeItem> fetchTree() throws Exception {
        JSONObject root = new JSONObject(new String(downloadBytes(TREE_URL), StandardCharsets.UTF_8));
        JSONArray tree = root.optJSONArray("tree");
        if (tree == null) return Collections.emptyList();
        List<TreeItem> out = new ArrayList<>();
        for (int i = 0; i < tree.length(); i++) {
            JSONObject x = tree.getJSONObject(i);
            if (!"blob".equals(x.optString("type"))) continue;
            String path = x.optString("path", "");
            if (!includeWebAsset(path)) continue;
            out.add(new TreeItem(path, x.optString("sha", ""), x.optLong("size", 0L)));
        }
        out.sort(Comparator.comparing(a -> a.path));
        return out;
    }

    private boolean includeWebAsset(String path) {
        if (path == null || path.isEmpty()) return false;
        String p = path.replace('\\', '/');
        String l = p.toLowerCase(Locale.ROOT);
        String[] excluded = {
                ".github/", "android-trungkien-v1/", "functions/", "firebase-functions/",
                "tools/", "rollback/", "manual/", "private-signing/", ".git/"
        };
        for (String e : excluded) if (l.startsWith(e)) return false;
        if (l.endsWith(".md") || l.endsWith(".txt") || l.endsWith(".ps1") || l.endsWith(".sh")) return false;
        if (l.equals(".firebaserc") || l.equals(".gitignore") || l.equals("firebase.json")
                || l.equals("firestore.rules") || l.equals("database.rules.json")) return false;
        if (l.matches("v\\d+(?:\\.\\d+)?-manifest\\.json")) return false;

        String[] ext = {
                ".html",".js",".css",".json",".webmanifest",
                ".png",".jpg",".jpeg",".webp",".gif",".svg",".ico",
                ".mp3",".wav",".ogg",".m4a",
                ".pdf",".bin",".dat"
        };
        for (String e : ext) if (l.endsWith(e)) return true;
        return false;
    }

    private void injectNativeBootstrap(File stage) throws Exception {
        File source = new File(stage, "index.html");
        String html = readText(source);
        String tag = "<script src=\"./trungkien-native.js?v=1\"></script>";
        if (!html.contains("trungkien-native.js")) {
            int head = html.toLowerCase(Locale.ROOT).indexOf("<head");
            int close = head >= 0 ? html.indexOf('>', head) : -1;
            if (close >= 0) html = html.substring(0, close + 1) + "\n" + tag + html.substring(close + 1);
            else html = tag + "\n" + html;
            writeText(source, html);
        }
        try (InputStream in = context.getAssets().open("trungkien-native.js");
             FileOutputStream out = new FileOutputStream(new File(stage, "trungkien-native.js"))) {
            byte[] buf = new byte[8192];
            int n;
            while ((n = in.read(buf)) > 0) out.write(buf, 0, n);
        }
    }

    private VersionInfo fetchVersion() throws Exception {
        String url = VERSION_URL + "?tk=" + System.currentTimeMillis();
        JSONObject o = new JSONObject(new String(downloadBytes(url), StandardCharsets.UTF_8));
        return new VersionInfo(
                o.optString("displayVersion", o.optString("version", "")),
                o.optString("build", ""),
                o.optString("notes", "")
        );
    }

    private byte[] downloadBytes(String urlString) throws Exception {
        HttpURLConnection c = (HttpURLConnection) new URL(urlString).openConnection();
        c.setConnectTimeout(15000);
        c.setReadTimeout(45000);
        c.setInstanceFollowRedirects(true);
        c.setRequestProperty("User-Agent", "TrungKien-V1-Android");
        c.setRequestProperty("Cache-Control", "no-cache");
        int code = c.getResponseCode();
        if (code < 200 || code >= 300) {
            c.disconnect();
            throw new IOException("HTTP " + code);
        }
        try (InputStream in = new BufferedInputStream(c.getInputStream());
             ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            byte[] buf = new byte[16384];
            int n;
            while ((n = in.read(buf)) > 0) out.write(buf, 0, n);
            return out.toByteArray();
        } finally {
            c.disconnect();
        }
    }

    private String gitBlobSha1(byte[] data) throws Exception {
        MessageDigest md = MessageDigest.getInstance("SHA-1");
        md.update(("blob " + data.length + "\0").getBytes(StandardCharsets.UTF_8));
        md.update(data);
        return hex(md.digest());
    }

    private static String hex(byte[] bytes) {
        StringBuilder s = new StringBuilder(bytes.length * 2);
        for (byte b : bytes) s.append(String.format(Locale.ROOT, "%02x", b & 0xff));
        return s.toString();
    }

    private String encodePath(String path) {
        StringBuilder out = new StringBuilder();
        String[] parts = path.split("/");
        for (int i = 0; i < parts.length; i++) {
            if (i > 0) out.append('/');
            out.append(Uri.encode(parts[i]));
        }
        return out.toString();
    }

    private File dirForBuild(String build) {
        String safe = build == null ? "" : build.replaceAll("[^A-Za-z0-9._-]", "_");
        return new File(bundlesRoot, safe);
    }

    private void cleanupBundles() {
        String active = prefs.getString(K_ACTIVE, "");
        String previous = prefs.getString(K_PREVIOUS, "");
        String pending = prefs.getString(K_PENDING, "");
        File[] dirs = bundlesRoot.listFiles();
        if (dirs == null) return;
        for (File d : dirs) {
            if (!d.isDirectory() || d.getName().startsWith(".stage-")) {
                if (d.getName().startsWith(".stage-")) deleteRecursive(d);
                continue;
            }
            String n = d.getName();
            if (n.equals(safeName(active)) || n.equals(safeName(previous)) || n.equals(safeName(pending))) continue;
            deleteRecursive(d);
        }
    }

    private String safeName(String build) {
        return build == null ? "" : build.replaceAll("[^A-Za-z0-9._-]", "_");
    }

    private static void deleteRecursive(File f) {
        if (f == null || !f.exists()) return;
        if (f.isDirectory()) {
            File[] xs = f.listFiles();
            if (xs != null) for (File x : xs) deleteRecursive(x);
        }
        //noinspection ResultOfMethodCallIgnored
        f.delete();
    }

    private static void copyDirectory(File src, File dst) throws IOException {
        if (src.isDirectory()) {
            if (!dst.exists() && !dst.mkdirs()) throw new IOException("Không tạo được " + dst);
            File[] xs = src.listFiles();
            if (xs != null) for (File x : xs) copyDirectory(x, new File(dst, x.getName()));
        } else {
            File parent = dst.getParentFile();
            if (parent != null) //noinspection ResultOfMethodCallIgnored
                parent.mkdirs();
            try (InputStream in = new FileInputStream(src); OutputStream out = new FileOutputStream(dst)) {
                byte[] b = new byte[16384]; int n;
                while ((n = in.read(b)) > 0) out.write(b,0,n);
            }
        }
    }

    private static String readText(File f) throws IOException {
        try (InputStream in = new FileInputStream(f); ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            byte[] b = new byte[8192]; int n;
            while ((n = in.read(b)) > 0) out.write(b,0,n);
            return out.toString(StandardCharsets.UTF_8.name());
        }
    }

    private static void writeText(File f, String s) throws IOException {
        try (OutputStream out = new FileOutputStream(f)) {
            out.write(s.getBytes(StandardCharsets.UTF_8));
        }
    }

    private void progress(int p, String m) {
        post(() -> { if (listener != null) listener.onProgress(p, m); });
    }

    private void post(Runnable r) { main.post(r); }

    private static String cleanMessage(Throwable e) {
        String m = e == null ? "" : e.getMessage();
        if (m == null || m.trim().isEmpty()) return e == null ? "Lỗi không xác định" : e.getClass().getSimpleName();
        return m;
    }
}
