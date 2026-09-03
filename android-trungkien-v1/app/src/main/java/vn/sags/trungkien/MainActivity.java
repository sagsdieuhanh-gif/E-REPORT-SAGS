package vn.sags.trungkien;

import android.Manifest;
import android.app.*;
import android.content.*;
import android.content.pm.PackageManager;
import android.graphics.Color;
import android.net.Uri;
import android.os.*;
import android.provider.Settings;
import android.view.View;
import android.webkit.*;
import android.widget.Toast;

import java.io.*;
import java.nio.charset.StandardCharsets;
import java.util.*;
import java.util.concurrent.atomic.AtomicBoolean;

public final class MainActivity extends Activity implements BundleUpdateManager.Listener {
    private static final int REQ_FILE = 701;
    private static final int REQ_CAMERA = 702;
    private static final String APP_URL = BundleUpdateManager.APP_URL;

    private WebView webView;
    private BundleUpdateManager updater;
    private ValueCallback<Uri[]> fileCallback;
    private PermissionRequest pendingPermission;
    private String injectedJs = "";
    private final AtomicBoolean pageReady = new AtomicBoolean(false);
    private BundleUpdateManager.VersionInfo pendingUpdate;

    @Override
    protected void onCreate(Bundle state) {
        super.onCreate(state);

        getWindow().setStatusBarColor(Color.rgb(8,29,54));
        getWindow().setNavigationBarColor(Color.rgb(8,29,54));

        updater = new BundleUpdateManager(this);
        updater.setListener(this);
        injectedJs = readAssetText("trungkien-native.js");

        webView = new WebView(this);
        setContentView(webView);
        configureWebView();
        loadApp();
    }

    private void configureWebView() {
        WebSettings s = webView.getSettings();
        s.setJavaScriptEnabled(true);
        s.setDomStorageEnabled(true);
        s.setDatabaseEnabled(true);
        s.setAllowFileAccess(true);
        s.setAllowContentAccess(true);
        s.setMediaPlaybackRequiresUserGesture(false);
        s.setJavaScriptCanOpenWindowsAutomatically(true);
        s.setSupportMultipleWindows(false);
        s.setBuiltInZoomControls(false);
        s.setDisplayZoomControls(false);
        s.setLoadWithOverviewMode(false);
        s.setUseWideViewPort(true);
        s.setCacheMode(WebSettings.LOAD_DEFAULT);
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) s.setSafeBrowsingEnabled(true);

        CookieManager.getInstance().setAcceptCookie(true);
        CookieManager.getInstance().setAcceptThirdPartyCookies(webView, true);

        webView.addJavascriptInterface(new AndroidUpdaterBridge(), "AndroidUpdater");
        webView.addJavascriptInterface(new NativeFilesBridge(this), "AndroidFiles");
        webView.addJavascriptInterface(new NativeStoreBridge(this), "AndroidStore");

        webView.setWebViewClient(new AppClient());
        webView.setWebChromeClient(new AppChrome());
        webView.setDownloadListener((url, userAgent, contentDisposition, mimeType, contentLength) -> {
            if (url != null && url.startsWith("blob:")) return; // handled by native JS bridge
            try {
                Intent i = new Intent(Intent.ACTION_VIEW, Uri.parse(url));
                startActivity(i);
            } catch (Exception e) {
                Toast.makeText(this, "Không mở được file tải xuống", Toast.LENGTH_SHORT).show();
            }
        });
    }

    private void loadApp() {
        pageReady.set(false);
        if (hasNetwork()) {
            webView.loadUrl(APP_URL + "?tkShell=V1");
        } else if (updater.hasActiveBundle()) {
            // Same remote origin URL; AppClient serves it from the local bundle.
            webView.loadUrl(APP_URL + "?tkShell=V1&offline=1");
        } else {
            webView.loadUrl("file:///android_asset/offline.html");
        }
    }

    private boolean hasNetwork() {
        try {
            android.net.ConnectivityManager cm = (android.net.ConnectivityManager)getSystemService(CONNECTIVITY_SERVICE);
            android.net.Network n = cm.getActiveNetwork();
            if (n == null) return false;
            android.net.NetworkCapabilities c = cm.getNetworkCapabilities(n);
            return c != null && c.hasCapability(android.net.NetworkCapabilities.NET_CAPABILITY_INTERNET);
        } catch (Exception e) { return true; }
    }

    private final class AppClient extends WebViewClient {
        @Override
        public WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest request) {
            Uri u = request.getUrl();
            if (u == null) return null;
            if (!"https".equalsIgnoreCase(u.getScheme())) return null;
            if (!"sagsdieuhanh-gif.github.io".equalsIgnoreCase(u.getHost())) return null;
            String path = u.getPath();
            String prefix = "/E-REPORT-SAGS/";
            if (path == null || !path.startsWith(prefix)) return null;

            String rel = path.substring(prefix.length());
            if (rel.isEmpty()) rel = "index.html";

            // In the APK the native updater is authoritative. Existing web SW is disabled
            // by injected JS; if an old registration still requests this file, return noop.
            if ("service-worker.js".equals(rel)) {
                String js = "self.addEventListener('install',e=>self.skipWaiting());"
                        + "self.addEventListener('activate',e=>e.waitUntil(self.clients.claim()));";
                return response("application/javascript", js.getBytes(StandardCharsets.UTF_8), "no-store");
            }

            File f = updater.resolveActiveFile(rel);
            if (f == null) return null;
            try {
                return response(mime(rel), new FileInputStream(f), "no-store");
            } catch (Exception e) {
                return null;
            }
        }

        @Override
        public void onPageFinished(WebView view, String url) {
            super.onPageFinished(view, url);
            if (url != null && url.startsWith("file:///android_asset/offline.html")) return;
            // Remote first-run page does not yet contain the injected local script.
            if (!injectedJs.isEmpty()) view.evaluateJavascript(injectedJs, null);
            updater.checkForUpdateAsync();
        }

        @Override
        public void onReceivedError(WebView view, WebResourceRequest req, WebResourceError err) {
            if (req.isForMainFrame() && !updater.hasActiveBundle()) {
                view.loadUrl("file:///android_asset/offline.html");
            }
        }

        @Override
        public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
            Uri u = request.getUrl();
            if (u != null && "sagsdieuhanh-gif.github.io".equalsIgnoreCase(u.getHost())
                    && u.getPath() != null && u.getPath().startsWith("/E-REPORT-SAGS/")) {
                return false;
            }
            if (u != null && ("http".equalsIgnoreCase(u.getScheme()) || "https".equalsIgnoreCase(u.getScheme()))) {
                try { startActivity(new Intent(Intent.ACTION_VIEW, u)); } catch (Exception ignored) {}
                return true;
            }
            return false;
        }
    }

    private final class AppChrome extends WebChromeClient {
        @Override
        public boolean onShowFileChooser(WebView w, ValueCallback<Uri[]> callback, FileChooserParams params) {
            if (fileCallback != null) fileCallback.onReceiveValue(null);
            fileCallback = callback;
            try {
                Intent i = params.createIntent();
                i.addCategory(Intent.CATEGORY_OPENABLE);
                startActivityForResult(i, REQ_FILE);
                return true;
            } catch (Exception e) {
                fileCallback = null;
                return false;
            }
        }

        @Override
        public void onPermissionRequest(PermissionRequest request) {
            if (request == null) return;
            boolean camera = Arrays.asList(request.getResources()).contains(PermissionRequest.RESOURCE_VIDEO_CAPTURE);
            boolean audio = Arrays.asList(request.getResources()).contains(PermissionRequest.RESOURCE_AUDIO_CAPTURE);

            if (camera && checkSelfPermission(Manifest.permission.CAMERA) != PackageManager.PERMISSION_GRANTED) {
                pendingPermission = request;
                requestPermissions(new String[]{Manifest.permission.CAMERA}, REQ_CAMERA);
                return;
            }
            ArrayList<String> grant = new ArrayList<>();
            if (camera) grant.add(PermissionRequest.RESOURCE_VIDEO_CAPTURE);
            if (audio && checkSelfPermission(Manifest.permission.RECORD_AUDIO) == PackageManager.PERMISSION_GRANTED) {
                grant.add(PermissionRequest.RESOURCE_AUDIO_CAPTURE);
            }
            if (!grant.isEmpty()) request.grant(grant.toArray(new String[0]));
            else request.deny();
        }

        @Override
        public void onGeolocationPermissionsShowPrompt(String origin, GeolocationPermissions.Callback callback) {
            callback.invoke(origin, false, false);
        }
    }

    private final class AndroidUpdaterBridge {
        @JavascriptInterface
        public void ready(String build) {
            runOnUiThread(() -> {
                pageReady.set(true);
                updater.markHealthy(build);
                maybeShowPendingUpdate();
            });
        }

        @JavascriptInterface
        public void installUpdate() {
            runOnUiThread(() -> updater.installLatestAsync());
        }

        @JavascriptInterface
        public void reloadApp() {
            runOnUiThread(MainActivity.this::loadApp);
        }

        @JavascriptInterface
        public String shellVersion() { return "TrungKiên V1"; }
    }

    @Override
    public void onUpdateAvailable(BundleUpdateManager.VersionInfo info) {
        pendingUpdate = info;
        maybeShowPendingUpdate();
    }

    private void maybeShowPendingUpdate() {
        if (!pageReady.get() || pendingUpdate == null) return;
        BundleUpdateManager.VersionInfo x = pendingUpdate;
        pendingUpdate = null;
        eval("__tkShowUpdate(" + js(x.version) + "," + js(x.notes) + ")");
    }

    @Override
    public void onProgress(int percent, String message) {
        eval("__tkUpdateProgress(" + percent + "," + js(message) + ")");
    }

    @Override
    public void onInstalled(String build) {
        eval("__tkUpdateDone()");
        new Handler(Looper.getMainLooper()).postDelayed(this::loadApp, 500);
    }

    @Override
    public void onError(String message) {
        eval("__tkUpdateError(" + js(message) + ")");
    }

    @Override
    public void onBootstrapReady(String build) {
        // First install is staged silently and becomes active on next launch.
        // Never force a reload while the operator is working.
    }

    private void eval(String code) {
        if (webView == null) return;
        webView.post(() -> webView.evaluateJavascript(
                "(function(){try{" + code + ";}catch(e){}})()", null));
    }

    @Override
    public void onBackPressed() {
        if (webView == null) { super.onBackPressed(); return; }
        webView.evaluateJavascript("(function(){try{return !!window.__tkHandleBack&&window.__tkHandleBack();}catch(e){return false;}})()",
                value -> {
                    if ("true".equals(value)) return;
                    if (webView.canGoBack()) webView.goBack();
                    else super.onBackPressed();
                });
    }

    @Override
    protected void onResume() {
        super.onResume();
        if (updater != null) updater.checkForUpdateAsync();
    }

    @Override
    protected void onActivityResult(int requestCode, int resultCode, Intent data) {
        if (requestCode == REQ_FILE) {
            Uri[] result = null;
            if (resultCode == RESULT_OK && data != null) {
                if (data.getClipData() != null) {
                    int n = data.getClipData().getItemCount();
                    result = new Uri[n];
                    for (int i=0;i<n;i++) result[i]=data.getClipData().getItemAt(i).getUri();
                } else if (data.getData() != null) result = new Uri[]{data.getData()};
            }
            if (fileCallback != null) fileCallback.onReceiveValue(result);
            fileCallback = null;
            return;
        }
        super.onActivityResult(requestCode, resultCode, data);
    }

    @Override
    public void onRequestPermissionsResult(int requestCode, String[] permissions, int[] grants) {
        super.onRequestPermissionsResult(requestCode, permissions, grants);
        if (requestCode == REQ_CAMERA && pendingPermission != null) {
            PermissionRequest r = pendingPermission;
            pendingPermission = null;
            if (grants.length > 0 && grants[0] == PackageManager.PERMISSION_GRANTED) {
                r.grant(new String[]{PermissionRequest.RESOURCE_VIDEO_CAPTURE});
            } else r.deny();
        }
    }

    private WebResourceResponse response(String mime, byte[] data, String cache) {
        return response(mime, new ByteArrayInputStream(data), cache);
    }

    private WebResourceResponse response(String mime, InputStream in, String cache) {
        WebResourceResponse r = new WebResourceResponse(mime, "UTF-8", in);
        Map<String,String> h = new HashMap<>();
        h.put("Cache-Control", cache);
        h.put("Access-Control-Allow-Origin", "*");
        r.setResponseHeaders(h);
        return r;
    }

    private String mime(String path) {
        String p = path == null ? "" : path.toLowerCase(Locale.ROOT);
        if (p.endsWith(".html")) return "text/html";
        if (p.endsWith(".js")) return "application/javascript";
        if (p.endsWith(".css")) return "text/css";
        if (p.endsWith(".json") || p.endsWith(".webmanifest")) return "application/json";
        if (p.endsWith(".png")) return "image/png";
        if (p.endsWith(".jpg") || p.endsWith(".jpeg")) return "image/jpeg";
        if (p.endsWith(".webp")) return "image/webp";
        if (p.endsWith(".svg")) return "image/svg+xml";
        if (p.endsWith(".mp3")) return "audio/mpeg";
        if (p.endsWith(".wav")) return "audio/wav";
        if (p.endsWith(".pdf")) return "application/pdf";
        return "application/octet-stream";
    }

    private String readAssetText(String name) {
        try (InputStream in = getAssets().open(name); ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            byte[] b = new byte[8192]; int n;
            while ((n = in.read(b)) > 0) out.write(b,0,n);
            return out.toString(StandardCharsets.UTF_8.name());
        } catch (Exception e) { return ""; }
    }

    private static String js(String s) {
        if (s == null) return "\"\"";
        return "\"" + s.replace("\\","\\\\").replace("\"","\\\"")
                .replace("\r","\\r").replace("\n","\\n")
                .replace("\u2028","\\u2028").replace("\u2029","\\u2029") + "\"";
    }
}
