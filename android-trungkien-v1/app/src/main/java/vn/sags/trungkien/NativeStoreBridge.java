package vn.sags.trungkien;

import android.content.Context;
import android.webkit.JavascriptInterface;

import java.io.*;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.Locale;

/**
 * Native file-backed key/value storage prepared for later migration of large web
 * payloads. V1 exposes it but does not monkey-patch existing E-REPORT storage.
 */
public final class NativeStoreBridge {
    private final File root;

    NativeStoreBridge(Context context) {
        root = new File(context.getFilesDir(), "native-store");
        //noinspection ResultOfMethodCallIgnored
        root.mkdirs();
    }

    @JavascriptInterface
    public synchronized boolean put(String key, String value) {
        try {
            File f = fileFor(key);
            try (OutputStream out = new FileOutputStream(f)) {
                out.write((value == null ? "" : value).getBytes(StandardCharsets.UTF_8));
            }
            return true;
        } catch (Exception e) { return false; }
    }

    @JavascriptInterface
    public synchronized String get(String key) {
        try {
            File f = fileFor(key);
            if (!f.isFile()) return null;
            try (InputStream in = new FileInputStream(f); ByteArrayOutputStream out = new ByteArrayOutputStream()) {
                byte[] b = new byte[8192]; int n;
                while ((n = in.read(b)) > 0) out.write(b,0,n);
                return out.toString(StandardCharsets.UTF_8.name());
            }
        } catch (Exception e) { return null; }
    }

    @JavascriptInterface
    public synchronized boolean remove(String key) {
        try { File f = fileFor(key); return !f.exists() || f.delete(); }
        catch (Exception e) { return false; }
    }

    private File fileFor(String key) throws Exception {
        MessageDigest md = MessageDigest.getInstance("SHA-256");
        byte[] d = md.digest((key == null ? "" : key).getBytes(StandardCharsets.UTF_8));
        StringBuilder h = new StringBuilder();
        for (byte b : d) h.append(String.format(Locale.ROOT,"%02x",b & 0xff));
        return new File(root, h + ".txt");
    }
}
