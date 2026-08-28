package tr.tcdd.bodenmobil;

import android.app.Activity;
import android.os.Bundle;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.view.Window;

public class MainActivity extends Activity {
    private static final String APP_URL = "https://raw.githubusercontent.com/emreismettoyran-code/boden-mobil/main/index.html";
    @Override public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        requestWindowFeature(Window.FEATURE_NO_TITLE);
        WebView web = new WebView(this);
        setContentView(web);
        WebSettings s = web.getSettings();
        s.setJavaScriptEnabled(true);
        s.setDomStorageEnabled(true);
        s.setDatabaseEnabled(true);
        s.setAllowFileAccess(true);
        s.setAllowContentAccess(true);
        s.setBuiltInZoomControls(false);
        s.setDisplayZoomControls(false);
        s.setLoadWithOverviewMode(false);
        s.setUseWideViewPort(false);
        web.setWebViewClient(new WebViewClient());
        web.loadUrl(APP_URL);
    }
    @Override public void onBackPressed() {
        WebView w=(WebView)findViewById(android.R.id.content).findViewById(0);
        super.onBackPressed();
    }
}
