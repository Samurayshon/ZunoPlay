package com.zunoplay.app;

import android.Manifest;
import android.app.Activity;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.content.pm.PackageManager;
import android.graphics.Color;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.os.PowerManager;
import android.view.View;
import android.view.ViewGroup;
import android.view.Window;
import android.view.WindowInsetsController;
import android.view.WindowManager;
import android.webkit.PermissionRequest;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceError;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;

import java.util.HashMap;
import java.util.Map;

public class MainActivity extends Activity {
    private static final String START_URL = "https://samurayshon.github.io/ZunoPlay/";
    private static final String BUILD_ID = "android-v0-screenoff-v1";
    private static final String SW_RESET_KEY = "zuno_native_sw_reset_android_v0_screenoff_v1";
    private static final int PERMISSION_REQUEST = 7001;
    private static final long BOOT_TIMEOUT_MS = 12000L;

    private WebView webView;
    private final Handler bootHandler = new Handler(Looper.getMainLooper());
    private int bootRecoveryAttempts = 0;
    private boolean screenOff = false;
    private boolean activityResumed = false;
    private boolean screenStateReceiverRegistered = false;

    private final BroadcastReceiver screenStateReceiver = new BroadcastReceiver() {
        @Override
        public void onReceive(Context context, Intent intent) {
            String action = intent != null ? intent.getAction() : null;
            if (Intent.ACTION_SCREEN_OFF.equals(action)) {
                screenOff = true;
                keepWebViewRunningForScreenOff();
            } else if (Intent.ACTION_SCREEN_ON.equals(action)) {
                screenOff = false;
                if (!activityResumed) pauseWebViewForBackground();
            }
        }
    };

    private final Runnable bootWatchdog = new Runnable() {
        @Override
        public void run() {
            if (webView == null) return;
            webView.evaluateJavascript(
                    "(function(){var l=document.getElementById('loading');if(!l)return false;var s=getComputedStyle(l);return s.display!=='none'&&s.visibility!=='hidden';})()",
                    value -> {
                        if (webView == null) return;
                        if ("true".equals(value)) recoverFromStuckBoot();
                    }
            );
        }
    };

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        configureEdgeToEdge();
        registerScreenStateReceiver();

        webView = new WebView(this);
        webView.setBackgroundColor(Color.rgb(7, 8, 23));
        webView.setLayerType(View.LAYER_TYPE_HARDWARE, null);
        webView.setFitsSystemWindows(false);
        webView.setKeepScreenOn(false);
        webView.setLayoutParams(new ViewGroup.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT,
                ViewGroup.LayoutParams.MATCH_PARENT));
        setContentView(webView);

        WebSettings settings = webView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setDatabaseEnabled(true);
        settings.setMediaPlaybackRequiresUserGesture(false);
        settings.setAllowFileAccess(false);
        settings.setAllowContentAccess(false);
        settings.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
        settings.setCacheMode(WebSettings.LOAD_NO_CACHE);
        settings.setUseWideViewPort(true);
        settings.setLoadWithOverviewMode(true);
        settings.setSupportZoom(false);
        settings.setBuiltInZoomControls(false);
        settings.setDisplayZoomControls(false);
        settings.setUserAgentString(settings.getUserAgentString() + " ZunoPlayAndroid/0.0.1 " + BUILD_ID);

        webView.clearCache(true);

        webView.setWebViewClient(new WebViewClient() {
            @Override
            public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                Uri uri = request.getUrl();
                String host = uri.getHost();
                if (host != null && (host.equals("samurayshon.github.io") || host.endsWith("supabase.co") || host.equals("cdn.jsdelivr.net") || host.equals("unpkg.com"))) {
                    return false;
                }
                startActivity(new android.content.Intent(android.content.Intent.ACTION_VIEW, uri));
                return true;
            }

            @Override
            public void onPageStarted(WebView view, String url, android.graphics.Bitmap favicon) {
                super.onPageStarted(view, url, favicon);
                bootHandler.removeCallbacks(bootWatchdog);
            }

            @Override
            public void onPageFinished(WebView view, String url) {
                super.onPageFinished(view, url);
                if (url == null || !url.startsWith(START_URL)) return;
                bootHandler.removeCallbacks(bootWatchdog);
                purgeLegacyServiceWorkerOnce(view);
            }

            @Override
            public void onReceivedError(WebView view, WebResourceRequest request, WebResourceError error) {
                super.onReceivedError(view, request, error);
                if (request != null && request.isForMainFrame()) {
                    showNativeRecovery("Não foi possível carregar o ZunoPlay.");
                }
            }
        });

        webView.setWebChromeClient(new WebChromeClient() {
            @Override
            public void onPermissionRequest(PermissionRequest request) {
                Uri origin = request.getOrigin();
                if (origin != null && "samurayshon.github.io".equals(origin.getHost()) && hasMediaPermissions()) {
                    request.grant(request.getResources());
                } else {
                    request.deny();
                    requestMediaPermissions();
                }
            }
        });

        requestMediaPermissions();
        loadFreshHome();
    }

    private void registerScreenStateReceiver() {
        IntentFilter filter = new IntentFilter();
        filter.addAction(Intent.ACTION_SCREEN_OFF);
        filter.addAction(Intent.ACTION_SCREEN_ON);
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            registerReceiver(screenStateReceiver, filter, Context.RECEIVER_NOT_EXPORTED);
        } else {
            registerReceiver(screenStateReceiver, filter);
        }
        screenStateReceiverRegistered = true;
    }

    private boolean isScreenActuallyOff() {
        if (screenOff) return true;
        PowerManager powerManager = (PowerManager) getSystemService(Context.POWER_SERVICE);
        if (powerManager == null) return false;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.KITKAT_WATCH) {
            return !powerManager.isInteractive();
        }
        return !powerManager.isScreenOn();
    }

    private void keepWebViewRunningForScreenOff() {
        if (webView == null) return;
        webView.onResume();
        webView.resumeTimers();
    }

    private void pauseWebViewForBackground() {
        if (webView == null) return;
        webView.onPause();
        webView.pauseTimers();
    }

    private void purgeLegacyServiceWorkerOnce(WebView view) {
        String js = "(function(){try{" +
                "var k='" + SW_RESET_KEY + "';" +
                "if(localStorage.getItem(k)==='1')return 'ready';" +
                "localStorage.setItem(k,'1');" +
                "Promise.resolve().then(async function(){" +
                "try{if('serviceWorker' in navigator){var rs=await navigator.serviceWorker.getRegistrations();await Promise.all(rs.map(function(r){return r.unregister();}));}}catch(e){}" +
                "try{if(window.caches){var ks=await caches.keys();await Promise.all(ks.map(function(x){return caches.delete(x);}));}}catch(e){}" +
                "location.replace('" + START_URL + "?android_build=" + BUILD_ID + "&sw_reset=1&t='+Date.now());" +
                "});return 'resetting';" +
                "}catch(e){return 'error';}})()";

        view.evaluateJavascript(js, value -> {
            if (webView == null) return;
            if ("\"resetting\"".equals(value)) return;
            bootHandler.postDelayed(bootWatchdog, BOOT_TIMEOUT_MS);
        });
    }

    private void loadFreshHome() {
        if (webView == null) return;
        bootRecoveryAttempts = 0;
        loadFreshUrl("startup");
    }

    private void loadFreshUrl(String reason) {
        if (webView == null) return;
        Map<String, String> headers = new HashMap<>();
        headers.put("Cache-Control", "no-cache, no-store, max-age=0");
        headers.put("Pragma", "no-cache");
        String url = START_URL + "?android_build=" + BUILD_ID + "&reason=" + Uri.encode(reason) + "&t=" + System.currentTimeMillis();
        webView.loadUrl(url, headers);
    }

    private void recoverFromStuckBoot() {
        if (webView == null) return;
        bootHandler.removeCallbacks(bootWatchdog);
        if (bootRecoveryAttempts < 1) {
            bootRecoveryAttempts++;
            webView.stopLoading();
            webView.clearCache(true);
            loadFreshUrl("watchdog");
            return;
        }
        showNativeRecovery("O ZunoPlay demorou mais que o esperado para iniciar.");
    }

    private void showNativeRecovery(String message) {
        if (webView == null) return;
        bootHandler.removeCallbacks(bootWatchdog);
        String html = "<!doctype html><html><head><meta name='viewport' content='width=device-width,initial-scale=1'>" +
                "<style>html,body{margin:0;min-height:100%;background:#04040b;color:#fff;font-family:sans-serif}body{display:grid;place-items:center;padding:28px;box-sizing:border-box}.box{max-width:420px;text-align:center}h2{margin:0 0 10px}p{color:#a8acbf;line-height:1.5}button{margin-top:18px;border:0;border-radius:14px;padding:14px 22px;background:linear-gradient(135deg,#8b3dff,#31d3ff);color:#fff;font-weight:800;font-size:16px}</style></head>" +
                "<body><div class='box'><h2>Não conseguimos iniciar agora</h2><p>" + escapeHtml(message) + "</p><button onclick=\"location.href='" + START_URL + "?android_retry='+Date.now()\">Tentar novamente</button></div></body></html>";
        webView.loadDataWithBaseURL(START_URL, html, "text/html", "UTF-8", null);
    }

    private String escapeHtml(String value) {
        return value.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;").replace("\"", "&quot;");
    }

    private void configureEdgeToEdge() {
        Window window = getWindow();
        window.clearFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
        window.setStatusBarColor(Color.TRANSPARENT);
        window.setNavigationBarColor(Color.rgb(4, 5, 12));

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
            window.setDecorFitsSystemWindows(false);
            WindowInsetsController controller = window.getInsetsController();
            if (controller != null) {
                controller.setSystemBarsAppearance(0,
                        WindowInsetsController.APPEARANCE_LIGHT_STATUS_BARS |
                        WindowInsetsController.APPEARANCE_LIGHT_NAVIGATION_BARS);
            }
        } else {
            window.addFlags(WindowManager.LayoutParams.FLAG_DRAWS_SYSTEM_BAR_BACKGROUNDS);
            window.getDecorView().setSystemUiVisibility(
                    View.SYSTEM_UI_FLAG_LAYOUT_STABLE |
                    View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN |
                    View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION);
        }
    }

    private boolean hasMediaPermissions() {
        return checkSelfPermission(Manifest.permission.RECORD_AUDIO) == PackageManager.PERMISSION_GRANTED
                && checkSelfPermission(Manifest.permission.CAMERA) == PackageManager.PERMISSION_GRANTED;
    }

    private void requestMediaPermissions() {
        if (!hasMediaPermissions()) {
            requestPermissions(new String[]{Manifest.permission.RECORD_AUDIO, Manifest.permission.CAMERA}, PERMISSION_REQUEST);
        }
    }

    @Override
    protected void onSaveInstanceState(Bundle outState) {
        super.onSaveInstanceState(outState);
    }

    @Override
    protected void onPause() {
        activityResumed = false;
        if (!isScreenActuallyOff()) {
            pauseWebViewForBackground();
        }
        super.onPause();
    }

    @Override
    protected void onResume() {
        super.onResume();
        activityResumed = true;
        screenOff = false;
        if (webView != null) {
            webView.onResume();
            webView.resumeTimers();
        }
    }

    @Override
    public void onBackPressed() {
        if (webView != null && webView.canGoBack()) webView.goBack();
        else super.onBackPressed();
    }

    @Override
    protected void onDestroy() {
        bootHandler.removeCallbacksAndMessages(null);
        if (screenStateReceiverRegistered) {
            try {
                unregisterReceiver(screenStateReceiver);
            } catch (IllegalArgumentException ignored) {
            }
            screenStateReceiverRegistered = false;
        }
        if (webView != null) {
            webView.loadUrl("about:blank");
            webView.stopLoading();
            webView.clearHistory();
            webView.removeAllViews();
            webView.destroy();
            webView = null;
        }
        super.onDestroy();
    }
}
