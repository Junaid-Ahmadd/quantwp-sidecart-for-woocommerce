=== QuantWP – Side Cart for WooCommerce ===
Contributors: junaidahmadd
Tags: woocommerce, cart, side cart, ajax cart
Requires at least: 5.8
Tested up to: 6.9
Requires PHP: 7.4
Stable tag: 3.0.16
License: GPLv2 or later

A lightweight WooCommerce side cart with free shipping bar and cross-sells.

== Description ==
**QuantWP Side Cart** is a high-performance, lightweight drawer designed to improve user experience and increase Average Order Value (AOV). It provides a seamless shopping experience that integrates perfectly with any store.

**The entire plugin and all its features are 100% free.**

= Key Features =
* **Modern Store API Architecture:** Built on the latest WooCommerce Store API for efficient performance and high responsiveness.
* **Instant AJAX Quantity Updates:** Customers can update item quantities directly in the drawer with zero page refreshes.
* **Dynamic Free Shipping Threshold:** A real-time progress bar shows customers exactly how much more they need to spend to qualify for free shipping.
* **Manual Cross-Sell Control:** Take full control of your marketing by manually selecting up to 5 specific products to display in the cart carousel.
* **Interactive Product Display:** Features a gallery lightbox for products with multiple images and full support for variable products directly in the drawer.
* **Cross-Sell Performance Analytics:** A built-in dashboard tracks which manual recommendations are being added and their influence on total revenue.
* **Theme & Builder Independent:** Works with any theme or page builder via the simple [quantwp_cart_shortcode] shortcode.
* **Fully Customizable:** Easily adjust colors for the shipping bar, carousel, and buttons, and choose from a library of professional icons.
* **Fully Responsive:** Optimized for a perfect experience across all mobile and desktop devices.

== Installation ==

1. Install and activate the plugin through the **Plugins > Add New** menu in your WordPress dashboard.
2. Go to **Settings > QuantWP Side Cart** to configure your display options, colors, and free shipping threshold.
3. **Placement:** Add the shortcode `[quantwp_cart_shortcode]` to your site.
    * **Tip:** Look for a dedicated "Shortcode" widget in your theme or page builder (like Elementor or Divi). If one isn't available, try an "HTML" or "Text" widget. If you still face issues, please contact our support team.

== Frequently Asked Questions ==

= How do I sync the Shipping Bar with WooCommerce Free Shipping? =
Our shipping bar acts as a visual mirror. To ensure it matches your store settings:
1. Go to **WooCommerce > Settings > Shipping** and check your "Free Shipping" method.
2. Note the "Minimum order amount" you have set there.
3. Go to **Settings > QuantWP Side Cart** and enter that same value in the **Free Shipping Threshold** field.

= How do I set up the Cross-Sell Carousel? =
You have full manual control over which products appear in the cart:
1. Go to **Settings > QuantWP Side Cart**.
2. Use the **Cross-Sell Selection** field to manually pick up to 5 specific products ( simple and variable products are supported).

= Does this work with any theme? =
Yes. QuantWP is theme-independent. As long as you can place the `[quantwp_cart_shortcode]` shortcode in your header, footer, or page content, the side cart will function perfectly regardless of your theme or page builder.

= Is the plugin compatible with the WooCommerce Store API? =
Absolutely. The plugin is built specifically to leverage the modern WooCommerce Store API, ensuring high performance and fast AJAX updates even on high-traffic sites.

== Changelog ==

= 3.0.16 =
* Fix: Replaced 30sec cookie with session storage

= 3.0.15 =
* Removed Github Workflows.

= 3.0.11 =
* Fix: Fixed deploy yml file.

= 3.0.10 =

= 3.0.9 =
* Fix: Implemented debouncing on quantity update

= 3.0.8 =
* Fix: Updated deploy.js file

= 3.0.7 =
* Fix: Implemented auto deploy from beta branch to main branch to github.

= 3.0.6 =
* Fix: Removed unnessary render cart server request.
* Fix: Removed unnessary fragment refreshed request.

= 3.0.5 =
* Fix: Cross-sell products not appearing after first addtocart.
* Fix: Side cart height issue on mobile.

= 3.0.0 =
* **Major Refactor:** Migrated cross-sells to a modernized stateless REST API architecture.
* **Performance:** Implemented high-performance client-side filtering and smart product re-entry logic.
* **Architecture:** Decoupled analytics and admin logic into external assets.
* **Build System:** Integrated Bun-based build tools for optimized asset delivery.

= 2.0.0 =
* Fix: Fixed CPU spike on settings save with heavy fragments cache and transient api.

= 1.0.3 =
* Fix: Resolved issue where shipping threshold color was linked to carousel background.

= 1.0.2 =
* **New:** Added "Appearance" settings for easy color customization (Checkout Button, Carousel Background, Text).
* **New:** Added "Start Shopping" button when the cart is empty.
* **Enhancement:** Added helpful tooltips and info boxes to the settings page for better guidance.
* **Enhancement:** Implemented CSS variables for lightweight dynamic styling.

= 1.0.1 =
* **Fix:** Resolved issue with the "Settings" link on the plugins page.
* **Documentation:** Updated README with detailed instructions for the Shipping Bar and Cross-sell features.

= 1.0.0 =
* Initial release.
```


---
