package com.doorstudio.ai;

import android.content.Context;
import android.content.SharedPreferences;
import android.os.Bundle;
import android.webkit.WebView;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    private static final String ASSET_CACHE_PREFS = "windowcut_pro_asset_cache";
    private static final String KEY_LAST_CACHE_CLEARED_VERSION = "last_cleared_version_code";

    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(PlayBillingPlugin.class);
        super.onCreate(savedInstanceState);
        clearStaleWebViewHttpCacheOnUpgrade();
    }

    /**
     * Clears only the Android WebView HTTP/static asset cache once per app versionCode upgrade
     * so updated WindowCut Pro logos and web assets load immediately without affecting cookies,
     * localStorage, login sessions, or saved calculations.
     */
    private void clearStaleWebViewHttpCacheOnUpgrade() {
        try {
            SharedPreferences prefs = getSharedPreferences(ASSET_CACHE_PREFS, Context.MODE_PRIVATE);
            int lastClearedVersion = prefs.getInt(KEY_LAST_CACHE_CLEARED_VERSION, -1);
            int currentVersion = BuildConfig.VERSION_CODE;

            if (lastClearedVersion < currentVersion) {
                WebView webView = getBridge() != null ? getBridge().getWebView() : null;
                if (webView != null) {
                    webView.clearCache(true);
                }
                prefs.edit().putInt(KEY_LAST_CACHE_CLEARED_VERSION, currentVersion).apply();
            }
        } catch (Exception ignored) {
            // Never block app startup if cache cleanup fails on restricted devices
        }
    }
}
