package vn.sags.trungkien;

import android.app.Activity;
import android.content.*;
import android.net.Uri;
import android.os.Build;
import android.os.Environment;
import android.provider.MediaStore;
import android.webkit.JavascriptInterface;
import android.widget.Toast;

import androidx.core.content.FileProvider;

import java.io.*;
import java.util.Base64;
import java.util.Locale;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

public final class NativeFilesBridge {
    private final Activity activity;
    private final ExecutorService io = Executors.newSingleThreadExecutor();

    NativeFilesBridge(Activity activity) { this.activity = activity; }

    @JavascriptInterface
    public void saveDataUrl(String fileName, String dataUrl) {
        io.execute(() -> {
            try {
                Payload p = decode(dataUrl);
                String name = safeName(fileName, p.mime);
                Uri uri = saveToDownloads(name, p.mime, p.bytes);
                activity.runOnUiThread(() ->
                        Toast.makeText(activity, "Đã lưu: " + name, Toast.LENGTH_SHORT).show());
            } catch (Exception e) {
                activity.runOnUiThread(() ->
                        Toast.makeText(activity, "Không lưu được file: " + clean(e), Toast.LENGTH_LONG).show());
            }
        });
    }

    @JavascriptInterface
    public void shareDataUrl(String fileName, String dataUrl, String mimeHint) {
        io.execute(() -> {
            try {
                Payload p = decode(dataUrl);
                String mime = (mimeHint != null && !mimeHint.trim().isEmpty()) ? mimeHint : p.mime;
                String name = safeName(fileName, mime);
                File dir = new File(activity.getCacheDir(), "shared");
                //noinspection ResultOfMethodCallIgnored
                dir.mkdirs();
                File f = new File(dir, name);
                try (FileOutputStream out = new FileOutputStream(f)) { out.write(p.bytes); }
                Uri uri = FileProvider.getUriForFile(activity, activity.getPackageName() + ".files", f);
                Intent send = new Intent(Intent.ACTION_SEND)
                        .setType(mime)
                        .putExtra(Intent.EXTRA_STREAM, uri)
                        .addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
                activity.runOnUiThread(() ->
                        activity.startActivity(Intent.createChooser(send, "Chia sẻ " + name)));
            } catch (Exception e) {
                activity.runOnUiThread(() ->
                        Toast.makeText(activity, "Không chia sẻ được file: " + clean(e), Toast.LENGTH_LONG).show());
            }
        });
    }

    private Uri saveToDownloads(String name, String mime, byte[] bytes) throws Exception {
        ContentResolver r = activity.getContentResolver();
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            ContentValues v = new ContentValues();
            v.put(MediaStore.Downloads.DISPLAY_NAME, name);
            v.put(MediaStore.Downloads.MIME_TYPE, mime);
            v.put(MediaStore.Downloads.RELATIVE_PATH, Environment.DIRECTORY_DOWNLOADS + "/TrungKien");
            v.put(MediaStore.Downloads.IS_PENDING, 1);
            Uri uri = r.insert(MediaStore.Downloads.EXTERNAL_CONTENT_URI, v);
            if (uri == null) throw new IOException("Không tạo được file Downloads");
            try (OutputStream out = r.openOutputStream(uri)) {
                if (out == null) throw new IOException("Không mở được file Downloads");
                out.write(bytes);
            }
            v.clear();
            v.put(MediaStore.Downloads.IS_PENDING, 0);
            r.update(uri, v, null, null);
            return uri;
        }

        File dir = activity.getExternalFilesDir(Environment.DIRECTORY_DOWNLOADS);
        if (dir == null) dir = activity.getFilesDir();
        //noinspection ResultOfMethodCallIgnored
        dir.mkdirs();
        File f = new File(dir, name);
        try (FileOutputStream out = new FileOutputStream(f)) { out.write(bytes); }
        return Uri.fromFile(f);
    }

    private Payload decode(String dataUrl) throws Exception {
        if (dataUrl == null) throw new IllegalArgumentException("Data URL trống");
        int comma = dataUrl.indexOf(',');
        if (!dataUrl.startsWith("data:") || comma < 0) throw new IllegalArgumentException("Data URL không hợp lệ");
        String meta = dataUrl.substring(5, comma);
        String mime = meta.split(";")[0];
        if (mime.isEmpty()) mime = "application/octet-stream";
        String b64 = dataUrl.substring(comma + 1);
        byte[] bytes = Base64.getDecoder().decode(b64);
        return new Payload(mime, bytes);
    }

    private String safeName(String raw, String mime) {
        String n = raw == null ? "" : raw.trim();
        n = n.replaceAll("[\\\\/:*?\"<>|\\p{Cntrl}]", "_");
        if (n.isEmpty()) n = "E-REPORT";
        if (!n.contains(".")) {
            if (mime.toLowerCase(Locale.ROOT).contains("pdf")) n += ".pdf";
            else if (mime.toLowerCase(Locale.ROOT).contains("png")) n += ".png";
        }
        if (n.length() > 160) n = n.substring(0, 160);
        return n;
    }

    private static String clean(Exception e) {
        String m = e.getMessage();
        return m == null || m.isEmpty() ? e.getClass().getSimpleName() : m;
    }

    private static final class Payload {
        final String mime; final byte[] bytes;
        Payload(String mime, byte[] bytes) { this.mime = mime; this.bytes = bytes; }
    }
}
