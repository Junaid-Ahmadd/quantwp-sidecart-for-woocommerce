<?php

/**
 * Side Cart Main Class
 */

if (!defined('ABSPATH')) {
    exit;
}

class QuantWP_SideCart_Main
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
        // Enqueue assets
        add_action('wp_enqueue_scripts', array($this, 'enqueue_assets'));

        // Output cart HTML
        add_action('wp_footer', array($this, 'quantwp_render_cart_html'));

        // Add shortcode for cart icon
        add_shortcode('quantwp_cart_shortcode', array($this, 'quantwp_icon_shortcode'));

        // Handle auto-open on standard form submission (page reload)
        add_action('woocommerce_add_to_cart', array($this, 'set_auto_open_cookie'));
    }

    public function set_auto_open_cookie()
    {
        if (get_option('quantwp_sidecart_auto_open', 1)) {
            wc_setcookie('quantwp_added_to_cart', '1', time() + 30);
        }
    }

    public function enqueue_assets()
    {
        $suffix = defined('SCRIPT_DEBUG') && SCRIPT_DEBUG ? '' : '.min';

        // CSS
        wp_enqueue_style(
            'quantwp-sidecart',
            QUANTWP_URL . 'assets/css/side-cart' . $suffix . '.css',
            array(),
            QUANTWP_VERSION
        );

        // JavaScript
        wp_enqueue_script(
            'quantwp-sidecart',
            QUANTWP_URL . 'assets/js/side-cart' . $suffix . '.js',
            array('jquery'),
            QUANTWP_VERSION,
            true
        );

        // Ensure session exists so Store API nonces are valid for all users
        if ( WC()->session && ! WC()->session->has_session() ) {
            WC()->session->set_customer_session_cookie( true );
        }

        wp_localize_script( 'quantwp-sidecart', 'quantwpData', array(
            'autoOpen'       => (bool) get_option( 'quantwp_sidecart_auto_open', 1 ),
            'storeApiNonce'  => wp_create_nonce( 'wc_store_api' ),
            'storeApiUrl'    => esc_url_raw( rest_url( 'wc/store/v1' ) ),
            'shopUrl'        => esc_url( wc_get_page_permalink( 'shop' ) ),
            'checkoutUrl'    => esc_url( wc_get_checkout_url() ),
            'placeholderImg' => esc_url( wc_placeholder_img_src( 'thumbnail' ) ),
        ) );

        // 1. Get sanitize colors from database
            $threshold_color = sanitize_hex_color(
            get_option('quantwp_sidecart_shipping_threshold_color', '#92C1E9')
        );
        $carousel_bg = sanitize_hex_color(
            get_option('quantwp_sidecart_carousel_background_color', '#E0F1FF')
        );
        $btn_bg = sanitize_hex_color(
            get_option('quantwp_sidecart_checkout_btn_bg', '#F87C56')
        );

        // 2. Fallback to defaults if sanitization fails
        $threshold_color = $threshold_color ?: '#92C1E9';
        $carousel_bg = $carousel_bg ?: '#E0F1FF';
        $btn_bg = $btn_bg ?: '#F87C56';

        // 3. Create CSS with sanitized values
        $custom_css = "
        :root {
        --quantwp-threshold-color: {$threshold_color};
        --quantwp-carousel-bg: {$carousel_bg};
        --quantwp-btn-bg: {$btn_bg};
         }
        ";

        // 5. Inject into page
        wp_add_inline_style('quantwp-sidecart', $custom_css);
    }

    public function quantwp_render_cart_html()
    {

?>

        <div class="quantwp-sidecart-overlay"></div>

        <div class="quantwp-sidecart-drawer">
            <div class="quantwp-sidecart-wrapper">
                <?php echo $this->get_cart_content_html(); ?>
            </div>
        </div>
    <?php
    }

    public function get_cart_content_html()
    {
        ob_start();
     ?>
        <header class="quantwp-sidecart-header">
            <h4 class="quantwp-sidecart-title">
                <?php printf(esc_html__('Cart (%d)', 'quantwp-sidecart-for-woocommerce'), absint(WC()->cart->get_cart_contents_count())); ?>
            </h4>
            <button class="quantwp-close-button" type="button">&times;</button>
        </header>

        <?php do_action('quantwp_sidecart_after_header'); ?>

        <div class="quantwp-sidecart-content">
            <div class="quantwp-cart-items-list">
            <!-- Populated by side-cart.js via Store API on page load -->
            </div>
        <?php do_action('quantwp_sidecart_after_cart_items'); ?>
        </div>

        <footer class="quantwp-sidecart-footer" style="display:none;">
            <!-- Populated by side-cart.js -->
        </footer>
     <?php
     return ob_get_clean();
    }


    /**
     * Shortcode for cart icon: [quantwp_cart_shortcode]
     */
    public function quantwp_icon_shortcode()
    {

        $cart_count = WC()->cart->get_cart_contents_count();
        $icon_key = get_option('quantwp_sidecart_icon', 'cart-classic');
        $icons = QuantWP_SideCart_Settings::get_cart_icons();
        $svg = isset($icons[$icon_key]) ? $icons[$icon_key] : $icons['cart-classic'];

        $allowed_svg = array(
            'svg' => array('viewbox' => true, 'fill' => true, 'stroke' => true, 'stroke-width' => true, 'stroke-linecap' => true, 'stroke-linejoin' => true, 'class' => true, 'width' => true, 'height' => true, 'version' => true),
            'path' => array('d' => true, 'fill' => true, 'stroke' => true, 'fill-rule' => true, 'clip-rule' => true),
            'circle' => array('cx' => true, 'cy' => true, 'r' => true, 'stroke' => true, 'fill' => true),
            'g' => array('fill' => true, 'stroke' => true),
        );

        ob_start();
    ?>
        <a href="#" class="quantwp-sidecart-trigger" aria-label="<?php esc_attr_e('View Cart', 'quantwp-sidecart-for-woocommerce'); ?>">
            <?php echo wp_kses($svg, $allowed_svg); ?>
            <?php if ($cart_count > 0) : ?>
                <span class="cart-count-badge"><?php echo esc_html($cart_count); ?></span>
            <?php endif; ?>
        </a>
<?php
        return ob_get_clean();
    }
}
