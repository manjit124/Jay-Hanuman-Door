package com.doorstudio.ai

import android.annotation.SuppressLint
import android.os.Bundle
import android.view.WindowManager
import android.webkit.JavascriptInterface
import android.webkit.WebSettings
import android.webkit.WebView
import android.webkit.WebViewClient
import androidx.appcompat.app.AppCompatActivity

/**
 * Production-Ready Android Native Wrapper for DoorStudio AI
 * Implements hardware-level FLAG_SECURE on customer-facing screens to prevent
 * screenshots, screen recordings, and task-switcher previews.
 */
class MainActivity : AppCompatActivity() {

    private lateinit var webView: WebView

    @SuppressLint("SetJavaScriptEnabled")
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_main)

        // 1. Enable Hardware-Level Screenshot & Screen-Recording Protection by default
        // FLAG_SECURE instructs the Android OS compositor (SurfaceFlinger) to blank out
        // the display in screen captures, recordings, and recent apps carousel.
        enableFlagSecure(true)

        webView = findViewById(R.id.webview)
        val settings: WebSettings = webView.settings
        settings.javaScriptEnabled = true
        settings.domStorageEnabled = true
        settings.databaseEnabled = true
        settings.mediaPlaybackRequiresUserGesture = false
        settings.allowFileAccess = false
        settings.cacheMode = WebSettings.LOAD_DEFAULT

        // 2. Register Javascript Bridge Interface for Dynamic Protection Controls
        webView.addJavascriptInterface(AndroidBridgeInterface(), "AndroidBridge")
        webView.addJavascriptInterface(AndroidBridgeInterface(), "AndroidInterface")

        webView.webViewClient = object : WebViewClient() {
            override fun onPageFinished(view: WebView?, url: String?) {
                super.onPageFinished(view, url)
                // Notify web frontend that native Android FLAG_SECURE is operational
                webView.evaluateJavascript("window.isNativeAndroidSecure = true;", null)
            }
        }

        val appUrl = getString(R.string.app_url)
        webView.loadUrl(appUrl)
    }

    /**
     * Toggles WindowManager.LayoutParams.FLAG_SECURE
     */
    fun enableFlagSecure(enabled: Boolean) {
        runOnUiThread {
            if (enabled) {
                window.setFlags(
                    WindowManager.LayoutParams.FLAG_SECURE,
                    WindowManager.LayoutParams.FLAG_SECURE
                )
            } else {
                window.clearFlags(WindowManager.LayoutParams.FLAG_SECURE)
            }
        }
    }

    /**
     * JavaScript interface exposed to DoorStudio AI Web frontend
     */
    inner class AndroidBridgeInterface {
        @JavascriptInterface
        fun setFlagSecure(enabled: Boolean) {
            enableFlagSecure(enabled)
        }

        @JavascriptInterface
        fun enableScreenshotProtection(enabled: Boolean) {
            enableFlagSecure(enabled)
        }

        @JavascriptInterface
        fun isNativeAndroid(): Boolean {
            return true
        }
    }

    override fun onBackPressed() {
        if (webView.canGoBack()) {
            webView.goBack()
        } else {
            super.onBackPressed()
        }
    }
}
