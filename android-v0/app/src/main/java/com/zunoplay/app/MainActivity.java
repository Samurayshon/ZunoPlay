package com.zunoplay.app;

import android.Manifest;
import android.annotation.TargetApi;
import android.app.Activity;
import android.content.ActivityNotFoundException;
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
import android.util.Log;
import android.view.Gravity;
import android.view.View;
import android.view.ViewGroup;
import android.view.Window;
import android.view.WindowInsets;
import android.view.WindowInsetsController;
import android.view.WindowManager;
import android.webkit.PermissionRequest;
import android.webkit.RenderProcessGoneDetail;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceError;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.Button;
import android.widget.FrameLayout;
import android.widget.LinearLayout;
import android.widget.TextView;

import java.util.HashMap;
import java.util.Map;

public class MainActivity extends Activity {
    private static final String TAG = "ZunoPlayAndroid";
    private static final String START_URL = "https://samurayshon.github.io/ZunoPlay/";
    private static final String BUILD_ID = "android-v0-safe-frame-v6";
    private static final String SW_RESET_KEY = "zuno_native_sw_reset_android_v0_safe_frame_v6";
    private static final int PERMISSION_REQUEST = 7001;
    private static final long BOOT_TIMEOUT_MS = 12000L;
    private static final int MAX_RENDERER_RECOVERIES = 2;

    private FrameLayout rootView;
    private WebView webView;
    private PermissionRequest pendingPermissionRequest;
    private final Handler bootHandler = new Handler(Looper.getMainLooper());
    private int bootRecoveryAttempts = 0;
    private int rendererRecoveryAttempts = 0;
    private int safeInsetLeft = 0;
    private int safeInsetTop = 0;
    private int safeInsetRight = 0;
    private int safeInsetBottom = 0;
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
            try {
                webView.evaluateJavascript(
                        "(function(){var l=document.getElementById('loading');if(!l)return false;var s=getComputedStyle(l);return s.display!=='none'&&s.visibility!=='hidden';})()",
                        value -> {
                            if (webView == null) return;
                            if ("true".equals(value)) recoverFromStuckBoot();
                        }
                );
            } catch (RuntimeException error) {
                Log.w(TAG, "Boot watchdog could not inspect WebView", error);
            }
        }
    };

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        rootView = new FrameLayout(this);
        rootView.setBackgroundColor(Color.rgb(2, 4, 13));
        setContentView(rootView);

        configureEdgeToEdgeSafely();
        registerScreenStateReceiverSafely();
        createWebViewAndLoad("startup");
    }

    private void createWebViewAndLoad(String reason) {
        if (rootView == null) return;
        destroyCurrentWebView(false);

        try {
            WebView newWebView = new WebView(this);
            webView = newWebView;
            newWebView.setBackgroundColor(Color.rgb(2, 4, 13));
            newWebView.setFitsSystemWindows(false);
            newWebView.setKeepScreenOn(false);

            WebSettings settings = newWebView.getSettings();
            settings.setJavaScriptEnabled(true);
            settings.setDomStorageEnabled(true);
            settings.setDatabaseEnabled(true);
            settings.setMediaPlaybackRequiresUserGesture(false);
            settings.setJavaScriptCanOpenWindowsAutomatically(false);
            settings.setSupportMultipleWindows(true);
            settings.setAllowFileAccess(false);
            settings.setAllowContentAccess(false);
            settings.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
            settings.setCacheMode(WebSettings.LOAD_DEFAULT);
            settings.setUseWideViewPort(true);
            settings.setLoadWithOverviewMode(false);
            settings.setSupportZoom(false);
            settings.setBuiltInZoomControls(false);
            settings.setDisplayZoomControls(false);
            settings.setUserAgentString(settings.getUserAgentString() + " ZunoPlayAndroid/0.0.4 " + BUILD_ID);

            newWebView.setWebViewClient(createStableWebViewClient());
            newWebView.setWebChromeClient(new WebChromeClient() {
                @Override
                public void onPermissionRequest(PermissionRequest request) {
                    if (request == null || !isTrustedOrigin(request.getOrigin())) {
                        if (request != null) request.deny();
                        return;
                    }

                    if (hasMediaPermissions()) {
                        try {
                            request.grant(request.getResources());
                        } catch (RuntimeException error) {
                            Log.w(TAG, "Unable to grant WebView media permission", error);
                        }
                        return;
                    }

                    pendingPermissionRequest = request;
                    requestMediaPermissions();
                }

                @Override
                public void onPermissionRequestCanceled(PermissionRequest request) {
                    if (pendingPermissionRequest == request) pendingPermissionRequest = null;
                }
            });

            rootView.removeAllViews();
            rootView.addView(newWebView, new FrameLayout.LayoutParams(
                    ViewGroup.LayoutParams.MATCH_PARENT,
                    ViewGroup.LayoutParams.MATCH_PARENT));

            bootRecoveryAttempts = 0;
            loadFreshUrl(reason);
        } catch (RuntimeException error) {
            Log.e(TAG, "WebView initialization failed", error);
            webView = null;
            showNativeRecovery("O componente de navegação do Android não conseguiu iniciar.");
        }
    }

    private WebViewClient createStableWebViewClient() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) return new Api26StableWebViewClient();
        return new StableWebViewClient();
    }

    private class StableWebViewClient extends WebViewClient {
        @Override
        public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
            Uri uri = request != null ? request.getUrl() : null;
            if (uri == null) return true;
            String host = uri.getHost();
            String scheme = uri.getScheme();
            if ("https".equalsIgnoreCase(scheme) && isAllowedWebHost(host)) return false;
            if ("http".equalsIgnoreCase(scheme) || "https".equalsIgnoreCase(scheme)) {
                try {
                    startActivity(new Intent(Intent.ACTION_VIEW, uri));
                } catch (ActivityNotFoundException | SecurityException error) {
                    Log.w(TAG, "No safe external handler for URL: " + uri, error);
                }
            }
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
            publishSafeAreaToWeb();
            purgeLegacyServiceWorkerOnce(view);
        }

        @Override
        public void onReceivedError(WebView view, WebResourceRequest request, WebResourceError error) {
            super.onReceivedError(view, request, error);
            if (request != null && request.isForMainFrame()) showNativeRecovery("Não foi possível carregar o ZunoPlay.");
        }
    }

    @TargetApi(Build.VERSION_CODES.O)
    private class Api26StableWebViewClient extends StableWebViewClient {
        @Override
        public boolean onRenderProcessGone(WebView view, RenderProcessGoneDetail detail) {
            boolean didCrash = detail != null && detail.didCrash();
            Log.e(TAG, "WebView renderer process ended. didCrash=" + didCrash);
            handleRendererGone(view, didCrash);
            return true;
        }
    }

    private void handleRendererGone(WebView deadView, boolean didCrash) {
        bootHandler.removeCallbacksAndMessages(null);
        if (deadView != webView) {
            destroySpecificWebView(deadView);
            return;
        }
        destroyCurrentWebView(false);
        rendererRecoveryAttempts++;
        if (rendererRecoveryAttempts <= MAX_RENDERER_RECOVERIES) {
            bootHandler.postDelayed(() -> createWebViewAndLoad(didCrash ? "renderer_crash" : "renderer_reclaimed"), 350L);
            return;
        }
        showNativeRecovery("O mecanismo de exibição do Android encerrou repetidamente. Atualize o Android System WebView/Chrome e tente novamente.");
    }

    private boolean isAllowedWebHost(String host) {
        if (host == null) return false;
        String normalized = host.toLowerCase();
        return normalized.equals("samurayshon.github.io") || normalized.equals("cdn.jsdelivr.net")
                || normalized.equals("unpkg.com") || normalized.endsWith(".supabase.co");
    }

    private boolean isTrustedOrigin(Uri origin) {
        return origin != null && "https".equalsIgnoreCase(origin.getScheme())
                && "samurayshon.github.io".equalsIgnoreCase(origin.getHost());
    }

    private void registerScreenStateReceiverSafely() {
        try {
            IntentFilter filter = new IntentFilter();
            filter.addAction(Intent.ACTION_SCREEN_OFF);
            filter.addAction(Intent.ACTION_SCREEN_ON);
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) registerReceiver(screenStateReceiver, filter, Context.RECEIVER_NOT_EXPORTED);
            else registerReceiver(screenStateReceiver, filter);
            screenStateReceiverRegistered = true;
        } catch (RuntimeException error) {
            screenStateReceiverRegistered = false;
            Log.w(TAG, "Screen state receiver unavailable; using lifecycle fallback", error);
        }
    }

    private boolean isScreenActuallyOff() {
        if (screenOff) return true;
        PowerManager powerManager = (PowerManager) getSystemService(Context.POWER_SERVICE);
        return powerManager != null && !powerManager.isInteractive();
    }

    private void keepWebViewRunningForScreenOff() {
        if (webView == null) return;
        try {
            webView.onResume();
            webView.resumeTimers();
        } catch (RuntimeException error) {
            Log.w(TAG, "Could not keep WebView active while screen is off", error);
        }
    }

    private void pauseWebViewForBackground() {
        if (webView == null) return;
        try {
            webView.onPause();
            webView.pauseTimers();
        } catch (RuntimeException error) {
            Log.w(TAG, "Could not pause WebView", error);
        }
    }

    private void purgeLegacyServiceWorkerOnce(WebView view) {
        if (view == null || view != webView) return;
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
        try {
            view.evaluateJavascript(js, value -> {
                if (webView == null || view != webView) return;
                if ("\"resetting\"".equals(value)) return;
                bootHandler.postDelayed(bootWatchdog, BOOT_TIMEOUT_MS);
            });
        } catch (RuntimeException error) {
            Log.w(TAG, "Service worker cleanup could not run", error);
            bootHandler.postDelayed(bootWatchdog, BOOT_TIMEOUT_MS);
        }
    }

    private void loadFreshUrl(String reason) {
        if (webView == null) return;
        Map<String, String> headers = new HashMap<>();
        headers.put("Cache-Control", "no-cache, no-store, max-age=0");
        headers.put("Pragma", "no-cache");
        String url = START_URL + "?android_build=" + BUILD_ID + "&reason=" + Uri.encode(reason) + "&t=" + System.currentTimeMillis();
        try {
            webView.loadUrl(url, headers);
        } catch (RuntimeException error) {
            Log.e(TAG, "Unable to load ZunoPlay URL", error);
            showNativeRecovery("Não foi possível abrir o ZunoPlay neste momento.");
        }
    }

    private void recoverFromStuckBoot() {
        if (webView == null) return;
        bootHandler.removeCallbacks(bootWatchdog);
        if (bootRecoveryAttempts < 1) {
            bootRecoveryAttempts++;
            try {
                webView.stopLoading();
                webView.clearCache(true);
            } catch (RuntimeException error) {
                Log.w(TAG, "Could not reset stuck WebView boot", error);
            }
            loadFreshUrl("watchdog");
            return;
        }
        showNativeRecovery("O ZunoPlay demorou mais que o esperado para iniciar.");
    }

    private void showNativeRecovery(String message) {
        bootHandler.removeCallbacks(bootWatchdog);
        if (rootView == null) return;
        rootView.removeAllViews();
        LinearLayout panel = new LinearLayout(this);
        panel.setOrientation(LinearLayout.VERTICAL);
        panel.setGravity(Gravity.CENTER);
        panel.setPadding(dp(28), dp(28), dp(28), dp(28));
        panel.setBackgroundColor(Color.rgb(2, 4, 13));
        TextView title = new TextView(this);
        title.setText("Não conseguimos iniciar agora");
        title.setTextColor(Color.WHITE);
        title.setTextSize(22f);
        title.setGravity(Gravity.CENTER);
        TextView body = new TextView(this);
        body.setText(message);
        body.setTextColor(Color.rgb(176, 180, 198));
        body.setTextSize(15f);
        body.setGravity(Gravity.CENTER);
        LinearLayout.LayoutParams bodyParams = new LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT);
        bodyParams.topMargin = dp(12);
        Button retry = new Button(this);
        retry.setText("Tentar novamente");
        retry.setAllCaps(false);
        retry.setOnClickListener(v -> {
            rendererRecoveryAttempts = 0;
            bootRecoveryAttempts = 0;
            createWebViewAndLoad("native_retry");
        });
        LinearLayout.LayoutParams buttonParams = new LinearLayout.LayoutParams(ViewGroup.LayoutParams.WRAP_CONTENT, ViewGroup.LayoutParams.WRAP_CONTENT);
        buttonParams.topMargin = dp(20);
        panel.addView(title);
        panel.addView(body, bodyParams);
        panel.addView(retry, buttonParams);
        rootView.addView(panel, new FrameLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.MATCH_PARENT));
    }

    private int dp(int value) {
        return Math.round(value * getResources().getDisplayMetrics().density);
    }

    private void configureEdgeToEdgeSafely() {
        try {
            Window window = getWindow();
            window.clearFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
            window.setStatusBarColor(Color.rgb(2, 4, 13));
            window.setNavigationBarColor(Color.rgb(2, 4, 13));
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
                WindowManager.LayoutParams attributes = window.getAttributes();
                attributes.layoutInDisplayCutoutMode = WindowManager.LayoutParams.LAYOUT_IN_DISPLAY_CUTOUT_MODE_SHORT_EDGES;
                window.setAttributes(attributes);
            }
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
                window.setDecorFitsSystemWindows(false);
                WindowInsetsController controller = window.getInsetsController();
                if (controller != null) {
                    controller.setSystemBarsAppearance(0, WindowInsetsController.APPEARANCE_LIGHT_STATUS_BARS |
                            WindowInsetsController.APPEARANCE_LIGHT_NAVIGATION_BARS);
                }
            } else {
                window.addFlags(WindowManager.LayoutParams.FLAG_DRAWS_SYSTEM_BAR_BACKGROUNDS);
                window.getDecorView().setSystemUiVisibility(View.SYSTEM_UI_FLAG_LAYOUT_STABLE |
                        View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN | View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION);
            }
            publishSafeAreaInsets();
        } catch (RuntimeException error) {
            Log.w(TAG, "Safe-area configuration failed; continuing with system defaults", error);
        }
    }

    private void publishSafeAreaInsets() {
        if (rootView == null) return;
        rootView.setOnApplyWindowInsetsListener((view, insets) -> {
            int left;
            int top;
            int right;
            int bottom;
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
                android.graphics.Insets safeInsets = insets.getInsets(WindowInsets.Type.systemBars() |
                        WindowInsets.Type.displayCutout() | WindowInsets.Type.mandatorySystemGestures());
                left = safeInsets.left;
                top = safeInsets.top;
                right = safeInsets.right;
                bottom = safeInsets.bottom;
            } else {
                left = insets.getSystemWindowInsetLeft();
                top = insets.getSystemWindowInsetTop();
                right = insets.getSystemWindowInsetRight();
                bottom = insets.getSystemWindowInsetBottom();
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P && insets.getDisplayCutout() != null) {
                    left = Math.max(left, insets.getDisplayCutout().getSafeInsetLeft());
                    top = Math.max(top, insets.getDisplayCutout().getSafeInsetTop());
                    right = Math.max(right, insets.getDisplayCutout().getSafeInsetRight());
                    bottom = Math.max(bottom, insets.getDisplayCutout().getSafeInsetBottom());
                }
            }
            safeInsetLeft = left;
            safeInsetTop = top;
            safeInsetRight = right;
            safeInsetBottom = bottom;
            view.setPadding(left, top, right, bottom);
            publishSafeAreaToWeb();
            Log.d(TAG, "Published web safe area: left=" + left + " top=" + top + " right=" + right + " bottom=" + bottom);
            return insets;
        });
        rootView.requestApplyInsets();
    }

    private void publishSafeAreaToWeb() {
        WebView view = webView;
        if (view == null) return;
        String js = "(function(){var r=document.documentElement;if(!r)return;"
                + "r.style.setProperty('--zuno-native-safe-left','0px');"
                + "r.style.setProperty('--zuno-native-safe-top','0px');"
                + "r.style.setProperty('--zuno-native-safe-right','0px');"
                + "r.style.setProperty('--zuno-native-safe-bottom','0px');"
                + "r.dataset.zunoNativeShell='android-safe-frame';})()";
        try {
            view.evaluateJavascript(js, null);
        } catch (RuntimeException error) {
            Log.w(TAG, "Could not publish safe area to web content", error);
        }
    }

    private boolean hasMediaPermissions() {
        return checkSelfPermission(Manifest.permission.RECORD_AUDIO) == PackageManager.PERMISSION_GRANTED
                && checkSelfPermission(Manifest.permission.CAMERA) == PackageManager.PERMISSION_GRANTED;
    }

    private void requestMediaPermissions() {
        if (hasMediaPermissions()) return;
        try {
            requestPermissions(new String[]{Manifest.permission.RECORD_AUDIO, Manifest.permission.CAMERA}, PERMISSION_REQUEST);
        } catch (RuntimeException error) {
            Log.w(TAG, "Android media permission request failed", error);
            denyPendingWebPermission();
        }
    }

    private void denyPendingWebPermission() {
        PermissionRequest request = pendingPermissionRequest;
        pendingPermissionRequest = null;
        if (request == null) return;
        try { request.deny(); } catch (RuntimeException ignored) {}
    }

    @Override
    public void onRequestPermissionsResult(int requestCode, String[] permissions, int[] grantResults) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults);
        if (requestCode != PERMISSION_REQUEST) return;
        PermissionRequest request = pendingPermissionRequest;
        pendingPermissionRequest = null;
        if (request == null) return;
        try {
            if (hasMediaPermissions() && isTrustedOrigin(request.getOrigin())) request.grant(request.getResources());
            else request.deny();
        } catch (RuntimeException error) {
            Log.w(TAG, "Could not finish WebView permission flow", error);
        }
    }

    @Override
    protected void onPause() {
        activityResumed = false;
        if (!isScreenActuallyOff()) pauseWebViewForBackground();
        super.onPause();
    }

    @Override
    protected void onResume() {
        super.onResume();
        activityResumed = true;
        screenOff = false;
        if (webView != null) {
            try {
                webView.onResume();
                webView.resumeTimers();
            } catch (RuntimeException error) {
                Log.w(TAG, "Could not resume WebView", error);
            }
        }
    }

    @Override
    public void onBackPressed() {
        if (webView != null && webView.canGoBack()) webView.goBack();
        else super.onBackPressed();
    }

    private void destroySpecificWebView(WebView view) {
        if (view == null) return;
        try {
            if (view.getParent() instanceof ViewGroup) ((ViewGroup) view.getParent()).removeView(view);
            view.stopLoading();
            view.removeAllViews();
            view.destroy();
        } catch (RuntimeException error) {
            Log.w(TAG, "Could not fully destroy detached WebView", error);
        }
    }

    private void destroyCurrentWebView(boolean loadBlankFirst) {
        WebView current = webView;
        webView = null;
        if (current == null) return;
        try {
            if (current.getParent() instanceof ViewGroup) ((ViewGroup) current.getParent()).removeView(current);
            if (loadBlankFirst) current.loadUrl("about:blank");
            current.stopLoading();
            current.clearHistory();
            current.removeAllViews();
            current.destroy();
        } catch (RuntimeException error) {
            Log.w(TAG, "Could not fully destroy current WebView", error);
        }
    }

    @Override
    protected void onDestroy() {
        bootHandler.removeCallbacksAndMessages(null);
        denyPendingWebPermission();
        if (screenStateReceiverRegistered) {
            try { unregisterReceiver(screenStateReceiver); } catch (IllegalArgumentException ignored) {}
            screenStateReceiverRegistered = false;
        }
        destroyCurrentWebView(true);
        rootView = null;
        super.onDestroy();
    }
}
