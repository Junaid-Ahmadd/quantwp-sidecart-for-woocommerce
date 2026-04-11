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
                        <?php
                        printf(
                            esc_html__('🎉 You qualify for %s', 'quantwp-sidecart-for-woocommerce'),
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
