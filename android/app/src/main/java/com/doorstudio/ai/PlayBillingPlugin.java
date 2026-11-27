package com.doorstudio.ai;

import android.app.Activity;
import android.content.Intent;
import android.net.Uri;
import androidx.annotation.NonNull;
import androidx.annotation.Nullable;

import com.android.billingclient.api.BillingClient;
import com.android.billingclient.api.BillingClientStateListener;
import com.android.billingclient.api.BillingFlowParams;
import com.android.billingclient.api.BillingResult;
import com.android.billingclient.api.PendingPurchasesParams;
import com.android.billingclient.api.ProductDetails;
import com.android.billingclient.api.Purchase;
import com.android.billingclient.api.PurchasesUpdatedListener;
import com.android.billingclient.api.QueryProductDetailsParams;
import com.android.billingclient.api.QueryPurchasesParams;
import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.util.ArrayList;
import java.util.Collections;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * Native Google Play Billing Library (v7.1.1) Capacitor Plugin for Jai Hanuman Door.
 * Supports official Play Store subscriptions:
 *  - JHD_ADFREE_MONTHLY (₹49/month)
 *  - JHD_ADFREE_YEARLY  (₹399/year)
 *
 * Security: All returned purchase tokens MUST be verified on the backend via
 * Google Play Developer API before ad-free entitlement is granted.
 */
@CapacitorPlugin(name = "PlayBilling")
public class PlayBillingPlugin extends Plugin implements PurchasesUpdatedListener {

    private BillingClient billingClient;
    private boolean isConnected = false;
    private PluginCall pendingPurchaseCall = null;
    private String pendingProductId = null;
    private final Map<String, ProductDetails> cachedProducts = new HashMap<>();

    @Override
    public void load() {
        super.load();
        initBillingClient();
    }

    private void initBillingClient() {
        if (billingClient != null) return;
        PendingPurchasesParams pendingParams = PendingPurchasesParams.newBuilder()
                .enableOneTimeProducts()
                .enablePrepaidPlans()
                .build();

        billingClient = BillingClient.newBuilder(getContext())
                .setListener(this)
                .enablePendingPurchases(pendingParams)
                .build();
    }

    private void ensureConnected(Runnable onReady, java.util.function.Consumer<String> onError) {
        initBillingClient();
        if (isConnected && billingClient.isReady()) {
            onReady.run();
            return;
        }

        billingClient.startConnection(new BillingClientStateListener() {
            @Override
            public void onBillingSetupFinished(@NonNull BillingResult billingResult) {
                if (billingResult.getResponseCode() == BillingClient.BillingResponseCode.OK) {
                    isConnected = true;
                    onReady.run();
                } else {
                    isConnected = false;
                    onError.accept(
                        "Google Play Billing unavailable (" + billingResult.getResponseCode() + "): "
                        + billingResult.getDebugMessage()
                    );
                }
            }

            @Override
            public void onBillingServiceDisconnected() {
                isConnected = false;
            }
        });
    }

    @PluginMethod
    public void queryProducts(PluginCall call) {
        JSArray idsArray = call.getArray("productIds");
        List<String> productIds = new ArrayList<>();
        if (idsArray != null) {
            try {
                for (int i = 0; i < idsArray.length(); i++) {
                    String id = idsArray.getString(i);
                    if (id != null && !id.trim().isEmpty()) {
                        productIds.add(id.trim());
                    }
                }
            } catch (Exception ignored) {}
        }

        if (productIds.isEmpty()) {
            productIds.add("JHD_ADFREE_MONTHLY");
            productIds.add("JHD_ADFREE_YEARLY");
        }

        ensureConnected(() -> {
            List<QueryProductDetailsParams.Product> products = new ArrayList<>();
            for (String productId : productIds) {
                products.add(
                    QueryProductDetailsParams.Product.newBuilder()
                        .setProductId(productId)
                        .setProductType(BillingClient.ProductType.SUBS)
                        .build()
                );
            }

            QueryProductDetailsParams params = QueryProductDetailsParams.newBuilder()
                    .setProductList(products)
                    .build();

            billingClient.queryProductDetailsAsync(params, (billingResult, productDetailsList) -> {
                if (billingResult.getResponseCode() != BillingClient.BillingResponseCode.OK) {
                    call.reject("Failed to query Google Play products: " + billingResult.getDebugMessage());
                    return;
                }

                JSArray resultArr = new JSArray();
                if (productDetailsList != null) {
                    for (ProductDetails details : productDetailsList) {
                        cachedProducts.put(details.getProductId(), details);
                        JSObject item = new JSObject();
                        item.put("productId", details.getProductId());
                        item.put("title", details.getTitle());
                        item.put("description", details.getDescription());

                        List<ProductDetails.SubscriptionOfferDetails> offers = details.getSubscriptionOfferDetails();
                        if (offers != null && !offers.isEmpty()) {
                            ProductDetails.SubscriptionOfferDetails primaryOffer = offers.get(0);
                            item.put("offerToken", primaryOffer.getOfferToken());
                            item.put("basePlanId", primaryOffer.getBasePlanId());
                            List<ProductDetails.PricingPhase> phases = primaryOffer.getPricingPhases().getPricingPhaseList();
                            if (!phases.isEmpty()) {
                                ProductDetails.PricingPhase phase = phases.get(phases.size() - 1);
                                item.put("formattedPrice", phase.getFormattedPrice());
                                item.put("priceCurrencyCode", phase.getPriceCurrencyCode());
                                item.put("priceAmountMicros", phase.getPriceAmountMicros());
                                item.put("billingPeriod", phase.getBillingPeriod());
                            }
                        }
                        resultArr.put(item);
                    }
                }

                JSObject ret = new JSObject();
                ret.put("products", resultArr);
                call.resolve(ret);
            });
        }, call::reject);
    }

    @PluginMethod
    public void purchaseSubscription(PluginCall call) {
        String productId = call.getString("productId", "").trim();
        String obfuscatedAccountId = call.getString("obfuscatedAccountId", "").trim();

        if (!"JHD_ADFREE_MONTHLY".equals(productId) && !"JHD_ADFREE_YEARLY".equals(productId)) {
            call.reject("Invalid Google Play subscription product ID: " + productId);
            return;
        }

        if (pendingPurchaseCall != null) {
            call.reject("Another Google Play purchase is already in progress.");
            return;
        }

        ensureConnected(() -> {
            ProductDetails existing = cachedProducts.get(productId);
            if (existing != null) {
                launchBillingFlowForProduct(call, existing, obfuscatedAccountId);
                return;
            }

            List<QueryProductDetailsParams.Product> products = Collections.singletonList(
                QueryProductDetailsParams.Product.newBuilder()
                    .setProductId(productId)
                    .setProductType(BillingClient.ProductType.SUBS)
                    .build()
            );

            QueryProductDetailsParams params = QueryProductDetailsParams.newBuilder()
                    .setProductList(products)
                    .build();

            billingClient.queryProductDetailsAsync(params, (billingResult, productDetailsList) -> {
                if (billingResult.getResponseCode() != BillingClient.BillingResponseCode.OK
                        || productDetailsList == null
                        || productDetailsList.isEmpty()) {
                    call.reject(
                        "Subscription plan \"" + productId + "\" is not available on Google Play yet. "
                        + billingResult.getDebugMessage()
                    );
                    return;
                }
                ProductDetails details = productDetailsList.get(0);
                cachedProducts.put(details.getProductId(), details);
                launchBillingFlowForProduct(call, details, obfuscatedAccountId);
            });
        }, call::reject);
    }

    private void launchBillingFlowForProduct(
            PluginCall call,
            ProductDetails details,
            String obfuscatedAccountId
    ) {
        Activity activity = getActivity();
        if (activity == null) {
            call.reject("Android Activity unavailable to launch Google Play Billing.");
            return;
        }

        List<ProductDetails.SubscriptionOfferDetails> offers = details.getSubscriptionOfferDetails();
        if (offers == null || offers.isEmpty()) {
            call.reject("No active subscription offer found in Google Play Console for " + details.getProductId());
            return;
        }

        String offerToken = offers.get(0).getOfferToken();
        BillingFlowParams.ProductDetailsParams productDetailsParams =
            BillingFlowParams.ProductDetailsParams.newBuilder()
                .setProductDetails(details)
                .setOfferToken(offerToken)
                .build();

        BillingFlowParams.Builder flowBuilder = BillingFlowParams.newBuilder()
                .setProductDetailsParamsList(Collections.singletonList(productDetailsParams));

        if (obfuscatedAccountId != null && !obfuscatedAccountId.isEmpty()) {
            flowBuilder.setObfuscatedAccountId(obfuscatedAccountId);
        }

        pendingPurchaseCall = call;
        pendingProductId = details.getProductId();

        activity.runOnUiThread(() -> {
            BillingResult launchResult = billingClient.launchBillingFlow(activity, flowBuilder.build());
            if (launchResult.getResponseCode() != BillingClient.BillingResponseCode.OK) {
                PluginCall c = pendingPurchaseCall;
                pendingPurchaseCall = null;
                pendingProductId = null;
                if (c != null) {
                    c.reject("Could not open Google Play checkout: " + launchResult.getDebugMessage());
                }
            }
        });
    }

    @Override
    public void onPurchasesUpdated(
            @NonNull BillingResult billingResult,
            @Nullable List<Purchase> purchases
    ) {
        PluginCall activeCall = pendingPurchaseCall;
        String requestedProductId = pendingProductId;
        pendingPurchaseCall = null;
        pendingProductId = null;

        int code = billingResult.getResponseCode();

        if (code == BillingClient.BillingResponseCode.OK && purchases != null && !purchases.isEmpty()) {
            Purchase matched = purchases.get(0);
            for (Purchase p : purchases) {
                if (requestedProductId != null && p.getProducts().contains(requestedProductId)) {
                    matched = p;
                    break;
                }
            }

            JSObject payload = serializePurchase(matched);
            notifyListeners("purchaseUpdated", payload);
            if (activeCall != null) {
                activeCall.resolve(payload);
            }
            return;
        }

        if (code == BillingClient.BillingResponseCode.USER_CANCELED) {
            if (activeCall != null) {
                activeCall.reject("Purchase cancelled by user.", "USER_CANCELED");
            }
            return;
        }

        if (code == BillingClient.BillingResponseCode.ITEM_ALREADY_OWNED) {
            if (activeCall != null) {
                activeCall.reject(
                    "You already own this subscription on Google Play. Tap Restore Purchase to sync.",
                    "ITEM_ALREADY_OWNED"
                );
            }
            return;
        }

        if (activeCall != null) {
            activeCall.reject(
                "Google Play Billing error (" + code + "): " + billingResult.getDebugMessage(),
                "BILLING_ERROR_" + code
            );
        }
    }

    @PluginMethod
    public void restorePurchases(PluginCall call) {
        ensureConnected(() -> {
            QueryPurchasesParams params = QueryPurchasesParams.newBuilder()
                    .setProductType(BillingClient.ProductType.SUBS)
                    .build();

            billingClient.queryPurchasesAsync(params, (billingResult, purchasesList) -> {
                if (billingResult.getResponseCode() != BillingClient.BillingResponseCode.OK) {
                    call.reject("Could not query Google Play subscriptions: " + billingResult.getDebugMessage());
                    return;
                }

                JSArray arr = new JSArray();
                if (purchasesList != null) {
                    for (Purchase p : purchasesList) {
                        arr.put(serializePurchase(p));
                    }
                }

                JSObject ret = new JSObject();
                ret.put("purchases", arr);
                call.resolve(ret);
            });
        }, call::reject);
    }

    @PluginMethod
    public void openManageSubscriptions(PluginCall call) {
        String productId = call.getString("productId", "");
        String packageName = getContext().getPackageName();
        String url = (productId != null && !productId.trim().isEmpty())
                ? "https://play.google.com/store/account/subscriptions?sku=" + Uri.encode(productId.trim()) + "&package=" + Uri.encode(packageName)
                : "https://play.google.com/store/account/subscriptions?package=" + Uri.encode(packageName);

        Activity activity = getActivity();
        if (activity == null) {
            call.reject("Activity unavailable.");
            return;
        }

        try {
            Intent intent = new Intent(Intent.ACTION_VIEW, Uri.parse(url));
            activity.startActivity(intent);
            JSObject ret = new JSObject();
            ret.put("opened", true);
            ret.put("url", url);
            call.resolve(ret);
        } catch (Exception e) {
            call.reject("Could not open Google Play subscription settings: " + e.getMessage());
        }
    }

    private JSObject serializePurchase(Purchase p) {
        JSObject obj = new JSObject();
        List<String> products = p.getProducts();
        obj.put("productId", products.isEmpty() ? "" : products.get(0));
        obj.put("purchaseToken", p.getPurchaseToken());
        obj.put("orderId", p.getOrderId() != null ? p.getOrderId() : "");
        obj.put("packageName", p.getPackageName());
        obj.put("purchaseTime", p.getPurchaseTime());
        obj.put("autoRenewing", p.isAutoRenewing());
        obj.put("acknowledged", p.isAcknowledged());
        String state = "UNSPECIFIED";
        if (p.getPurchaseState() == Purchase.PurchaseState.PURCHASED) state = "PURCHASED";
        else if (p.getPurchaseState() == Purchase.PurchaseState.PENDING) state = "PENDING";
        obj.put("purchaseState", state);
        return obj;
    }

    @Override
    protected void handleOnDestroy() {
        super.handleOnDestroy();
        if (billingClient != null) {
            billingClient.endConnection();
            billingClient = null;
            isConnected = false;
        }
    }
}
