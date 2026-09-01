package com.zunoplay.app;

import android.Manifest;
import android.app.Activity;
import android.content.ActivityNotFoundException;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.graphics.Color;
import android.net.Uri;
import android.os.Bundle;
import android.view.Window;
import android.view.WindowManager;
import android.webkit.PermissionRequest;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;

public class MainActivity extends Activity {
    private static final String START_URL = "https://samurayshon.github.io/ZunoPlay/";
    private static final int PERMISSION_REQUEST = 7001;
    private WebView webView;
    private PermissionRequest pendingPermissionRequest;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        Window window = getWindow();
        window.clearFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
        window.setStatusBarColor(Color.rgb(2, 4, 13));
        window.setNavigationBarColor(Color.rgb(2, 4, 13));

        webView = new WebView(this);
        webView.setBackgroundColor(Color.rgb(2, 4, 13));

        WebSettings settings = webView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setDatabaseEnabled(true);
        settings.setMediaPlaybackRequiresUserGesture(false);
        settings.setAllowFileAccess(false);
        settings.setAllowContentAccess(false);
        settings.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
        settings.setCacheMode(WebSettings.LOAD_DEFAULT);
        settings.setUseWideViewPort(true);
        settings.setLoadWithOverviewMode(false);
        settings.setSupportZoom(false);
        settings.setBuiltInZoomControls(false);
        settings.setDisplayZoomControls(false);
        settings.setUserAgentString(settings.getUserAgentString() + " ZunoPlayAndroid/0.0.1");

        webView.setWebViewClient(new WebViewClient() {
            @Override
            public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                Uri uri = request == null ? null : request.getUrl();
                if (uri == null) return true;
                if ("https".equalsIgnoreCase(uri.getScheme()) && isAllowedWebHost(uri.getHost())) return false;
                if ("http".equalsIgnoreCase(uri.getScheme()) || "https".equalsIgnoreCase(uri.getScheme())) {
                    try { startActivity(new Intent(Intent.ACTION_VIEW, uri)); }
                    catch (ActivityNotFoundException | SecurityException ignored) { }
                }
                return true;
            }
        });

        webView.setWebChromeClient(new WebChromeClient() {
            @Override
            public void onPermissionRequest(PermissionRequest request) {
                if (request == null || !isTrustedOrigin(request.getOrigin())) {
                    if (request != null) request.deny();
                    return;
                }
                if (hasMediaPermissions()) {
                    request.grant(request.getResources());
                } else {
                    pendingPermissionRequest = request;
                    requestPermissions(new String[]{Manifest.permission.RECORD_AUDIO, Manifest.permission.CAMERA}, PERMISSION_REQUEST);
                }
            }

            @Override
            public void onPermissionRequestCanceled(PermissionRequest request) {
                if (pendingPermissionRequest == request) pendingPermissionRequest = null;
            }
        });

        setContentView(webView);
        webView.loadUrl(START_URL);
    }

    private boolean isAllowedWebHost(String host) {
        if (host == null) return false;
        String h = host.toLowerCase();
        return h.equals("samurayshon.github.io") || h.equals("cdn.jsdelivr.net") ||
                h.equals("unpkg.com") || h.endsWith(".supabase.co");
    }

    private boolean isTrustedOrigin(Uri origin) {
        return origin != null && "https".equalsIgnoreCase(origin.getScheme()) &&
                "samurayshon.github.io".equalsIgnoreCase(origin.getHost());
    }

    private boolean hasMediaPermissions() {
        return checkSelfPermission(Manifest.permission.RECORD_AUDIO) == PackageManager.PERMISSION_GRANTED &&
                checkSelfPermission(Manifest.permission.CAMERA) == PackageManager.PERMISSION_GRANTED;
    }

    @Override
    public void onRequestPermissionsResult(int requestCode, String[] permissions, int[] grantResults) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults);
        if (requestCode != PERMISSION_REQUEST || pendingPermissionRequest == null) return;
        PermissionRequest request = pendingPermissionRequest;
        pendingPermissionRequest = null;
        if (hasMediaPermissions()) request.grant(request.getResources()); else request.deny();
    }

    @Override
    protected void onDestroy() {
        if (pendingPermissionRequest != null) {
            pendingPermissionRequest.deny();
            pendingPermissionRequest = null;
        }
        if (webView != null) {
            webView.stopLoading();
            webView.destroy();
            webView = null;
        }
        super.onDestroy();
    }
}
