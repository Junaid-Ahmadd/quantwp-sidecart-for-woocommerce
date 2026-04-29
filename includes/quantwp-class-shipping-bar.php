<?php

/**
 * Shipping Progress Bar Class
 */

if (!defined('ABSPATH')) {
    exit;
}

class QuantWP_SideCart_Shipping_Bar
{
    protected static $instance = null;

    public static function get_instance()
    {
        if (is_null(self::$instance)) {
            self::$instance = new self();
        }
        return self::$instance;
    }

    private function __construct()
    {
        $this->init_hooks();
    }

    private function init_hooks()
    {
        add_action('wp_enqueue_scripts', array($this, 'enqueue_assets'));
        add_action('quantwp_sidecart_after_header', array($this, 'render_shipping_bar'));
    }

    public function enqueue_assets()
    {
        $suffix = defined('SCRIPT_DEBUG') && SCRIPT_DEBUG ? '' : '.min';

        wp_enqueue_style(
            'quantwp-sidecart',
            QUANTWP_URL . 'assets/css/side-cart' . $suffix . '.css',
            array(),
            QUANTWP_VERSION
        );
    }

    public function get_threshold()
    {
        return floatval(get_option('quantwp_sidecart_shipping_threshold', ''));
    }

    public function get_cart_total()
    {
        return WC()->cart->get_subtotal();
    }

    public function calculate_progress()
    {
        $cart_total = $this->get_cart_total();
        $threshold = $this->get_threshold();

        if ($threshold <= 0) {
            return array(
                'percentage' => 0,
                'remaining' => 0,
                'qualified' => false
            );
        }

        $percentage = min(($cart_total / $threshold) * 100, 100);
        $remaining = max($threshold - $cart_total, 0);
        $qualified = $cart_total >= $threshold;

        return array(
            'percentage' => round($percentage, 2),
            'remaining' => $remaining,
            'qualified' => $qualified,
            'cart_total' => $cart_total,
            'threshold' => $threshold
        );
    }

    public function render_shipping_bar()
    {
        if (!get_option('quantwp_sidecart_shipping_bar_enabled', 0)) {
            return;
        }

        $progress = $this->calculate_progress();
        $threshold = $this->get_threshold();

        // Pass threshold and currency to JS so it can update the bar without PHP
        wp_localize_script('quantwp-sidecart', 'quantwpShippingBar', array(
            'enabled'   => true,
            'threshold' => $threshold,
            'currency'  => array(
                'prefix'             => get_woocommerce_currency_symbol(),
                'suffix'             => '',
                'decimals'           => wc_get_price_decimals(),
                'decimal_separator'  => wc_get_price_decimal_separator(),
                'thousand_separator' => wc_get_price_thousand_separator(),
            ),
        ));
    ?>
        <div class="quantwp-shipping-bar-wrapper">
            <?php $this->render_shipping_bar_inner($progress); ?>
        </div>
    <?php
    }

    public function render_shipping_bar_inner($progress)
    {
    ?>
            <div class="quantwp-shipping-bar-message">
                <?php if ($progress['qualified']) : ?>
                    <span class="success-message">
                        <svg width="18" height="18" viewBox="0 0 36 36" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" aria-hidden="true" role="img" class="quantwp-free-shipping-icon" preserveAspectRatio="xMidYMid meet" fill="#000000" style="vertical-align:middle;margin-right:4px;flex-shrink:0;"><g id="SVGRepo_bgCarrier" stroke-width="0"></g><g id="SVGRepo_tracerCarrier" stroke-linecap="round" stroke-linejoin="round"></g><g id="SVGRepo_iconCarrier"><path fill="#DD2E44" d="M11.626 7.488a1.413 1.413 0 0 0-.268.395l-.008-.008L.134 33.141l.011.011c-.208.403.14 1.223.853 1.937c.713.713 1.533 1.061 1.936.853l.01.01L28.21 24.735l-.008-.009c.147-.07.282-.155.395-.269c1.562-1.562-.971-6.627-5.656-11.313c-4.687-4.686-9.752-7.218-11.315-5.656z"></path><path fill="#EA596E" d="M13 12L.416 32.506l-.282.635l.011.011c-.208.403.14 1.223.853 1.937c.232.232.473.408.709.557L17 17l-4-5z"></path><path fill="#A0041E" d="M23.012 13.066c4.67 4.672 7.263 9.652 5.789 11.124c-1.473 1.474-6.453-1.118-11.126-5.788c-4.671-4.672-7.263-9.654-5.79-11.127c1.474-1.473 6.454 1.119 11.127 5.791z"></path><path fill="#AA8DD8" d="M18.59 13.609a.99.99 0 0 1-.734.215c-.868-.094-1.598-.396-2.109-.873c-.541-.505-.808-1.183-.735-1.862c.128-1.192 1.324-2.286 3.363-2.066c.793.085 1.147-.17 1.159-.292c.014-.121-.277-.446-1.07-.532c-.868-.094-1.598-.396-2.11-.873c-.541-.505-.809-1.183-.735-1.862c.13-1.192 1.325-2.286 3.362-2.065c.578.062.883-.057 1.012-.134c.103-.063.144-.123.148-.158c.012-.121-.275-.446-1.07-.532a.998.998 0 0 1-.886-1.102a.997.997 0 0 1 1.101-.886c2.037.219 2.973 1.542 2.844 2.735c-.13 1.194-1.325 2.286-3.364 2.067c-.578-.063-.88.057-1.01.134c-.103.062-.145.123-.149.157c-.013.122.276.446 1.071.532c2.037.22 2.973 1.542 2.844 2.735c-.129 1.192-1.324 2.286-3.362 2.065c-.578-.062-.882.058-1.012.134c-.104.064-.144.124-.148.158c-.013.121.276.446 1.07.532a1 1 0 0 1 .52 1.773z"></path><path fill="#77B255" d="M30.661 22.857c1.973-.557 3.334.323 3.658 1.478c.324 1.154-.378 2.615-2.35 3.17c-.77.216-1.001.584-.97.701c.034.118.425.312 1.193.095c1.972-.555 3.333.325 3.657 1.479c.326 1.155-.378 2.614-2.351 3.17c-.769.216-1.001.585-.967.702c.033.117.423.311 1.192.095a1 1 0 1 1 .54 1.925c-1.971.555-3.333-.323-3.659-1.479c-.324-1.154.379-2.613 2.353-3.169c.77-.217 1.001-.584.967-.702c-.032-.117-.422-.312-1.19-.096c-1.974.556-3.334-.322-3.659-1.479c-.325-1.154.378-2.613 2.351-3.17c.768-.215.999-.585.967-.701c-.034-.118-.423-.312-1.192-.096a1 1 0 1 1-.54-1.923z"></path><path fill="#AA8DD8" d="M23.001 20.16a1.001 1.001 0 0 1-.626-1.781c.218-.175 5.418-4.259 12.767-3.208a1 1 0 1 1-.283 1.979c-6.493-.922-11.187 2.754-11.233 2.791a.999.999 0 0 1-.625.219z"></path><path fill="#77B255" d="M5.754 16a1 1 0 0 1-.958-1.287c1.133-3.773 2.16-9.794.898-11.364c-.141-.178-.354-.353-.842-.316c-.938.072-.849 2.051-.848 2.071a1 1 0 1 1-1.994.149c-.103-1.379.326-4.035 2.692-4.214c1.056-.08 1.933.287 2.552 1.057c2.371 2.951-.036 11.506-.542 13.192a1 1 0 0 1-.958.712z"></path><circle fill="#5C913B" cx="25.5" cy="9.5" r="1.5"></circle><circle fill="#9266CC" cx="2" cy="18" r="2"></circle><circle fill="#5C913B" cx="32.5" cy="19.5" r="1.5"></circle><circle fill="#5C913B" cx="23.5" cy="31.5" r="1.5"></circle><circle fill="#FFCC4D" cx="28" cy="4" r="2"></circle><circle fill="#FFCC4D" cx="32.5" cy="8.5" r="1.5"></circle><circle fill="#FFCC4D" cx="29.5" cy="12.5" r="1.5"></circle><circle fill="#FFCC4D" cx="7.5" cy="23.5" r="1.5"></circle></g></svg>
                        <?php
                        printf(
                            esc_html__('You qualify for %s', 'quantwp-sidecart-for-woocommerce'),
                            '<strong>' . esc_html__('Free Shipping', 'quantwp-sidecart-for-woocommerce') . '</strong>'
                        );
                        ?>
                    </span>
                <?php else : ?>
                    <span class="progress-message">
                        <?php
                        printf(
                            esc_html__('Add %1$s more to get %2$sFREE Shipping%3$s', 'quantwp-sidecart-for-woocommerce'),
                            '<strong>' . wp_kses_post(wc_price($progress['remaining'])) . '</strong>',
                            '<strong>',
                            '</strong>'
                        );
                        ?>
                    </span>
                <?php endif; ?>
            </div>

            <div class="quantwp-shipping-bar-progress">
                <div class="progress-bar-bg">
                    <div class="progress-bar-fill" style="width: <?php echo esc_attr($progress['percentage']); ?>%;"></div>
                </div>
            </div>
    <?php
    }

}
