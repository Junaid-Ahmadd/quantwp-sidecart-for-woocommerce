<?php

if (!defined('ABSPATH')) {
    exit;
}

class QuantWP_SideCart_Settings
{

    protected static $instance = null;

    private $option_group = 'quantwp_sidecart_settings';
    private $page_slug = 'quantwp_sidecart_settings';

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
        add_action('admin_menu', array($this, 'add_settings_page'));
        add_action('admin_init', array($this, 'register_settings'));
        add_action('admin_enqueue_scripts', array($this, 'enqueue_admin_assets'));
        // Add settings link to plugins page
        add_filter('plugin_action_links_' . QUANTWP_BASENAME, array($this, 'add_action_links'));
    }

    // Function which adds the settings link to the plugins page
    public function add_action_links($links)
    {
        $settings_link = '<a href="' . admin_url('options-general.php?page=' . $this->page_slug) . '">' . __('Settings', 'quantwp-sidecart-for-woocommerce') . '</a>';
        array_unshift($links, $settings_link);
        return $links;
    }

    /**
     * Define the SVG Icon Library
     * Made 'public static' so the frontend class can access it safely.
     */
    public static function get_cart_icons()
    {
        return [
            // Standard Carts
            'cart-classic' => '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="21" r="1"></circle><circle cx="20" cy="21" r="1"></circle><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path></svg>',

            'cart-2' => '<svg viewBox="0 0 24 24" fill="none"><path fill-rule="evenodd" clip-rule="evenodd" d="M9.99976 2.25C9.30136 2.25 8.69851 2.65912 8.4178 3.25077C7.73426 3.25574 7.20152 3.28712 6.72597 3.47298C6.15778 3.69505 5.66357 4.07255 5.29985 4.5623C4.93292 5.05639 4.76067 5.68968 4.5236 6.56133L4.47721 6.73169L3.96448 9.69473C3.77895 9.82272 3.61781 9.97428 3.47767 10.1538C2.57684 11.3075 3.00581 13.0234 3.86376 16.4552C4.40943 18.6379 4.68227 19.7292 5.49605 20.3646C6.30983 21 7.43476 21 9.68462 21H14.3153C16.5652 21 17.6901 21 18.5039 20.3646C19.3176 19.7292 19.5905 18.6379 20.1362 16.4552C20.9941 13.0234 21.4231 11.3075 20.5222 10.1538C20.382 9.97414 20.2207 9.82247 20.035 9.69442L19.5223 6.73169L19.4759 6.56133C19.2388 5.68968 19.0666 5.05639 18.6997 4.5623C18.336 4.07255 17.8417 3.69505 17.2736 3.47298C16.798 3.28712 16.2653 3.25574 15.5817 3.25077C15.301 2.65912 14.6982 2.25 13.9998 2.25H9.99976ZM18.4177 9.14571L18.0564 7.05765C17.7726 6.01794 17.6696 5.69121 17.4954 5.45663C17.2996 5.19291 17.0335 4.98964 16.7275 4.87007C16.5077 4.78416 16.2421 4.75888 15.5803 4.75219C15.299 5.34225 14.697 5.75 13.9998 5.75H9.99976C9.30252 5.75 8.70052 5.34225 8.41921 4.75219C7.75738 4.75888 7.4918 4.78416 7.272 4.87007C6.96605 4.98964 6.69994 5.19291 6.50409 5.45662C6.32988 5.6912 6.22688 6.01794 5.9431 7.05765L5.58176 9.14577C6.57992 9 7.9096 9 9.68462 9H14.3153C16.0901 9 17.4196 9 18.4177 9.14571ZM8 12.25C8.41421 12.25 8.75 12.5858 8.75 13V17C8.75 17.4142 8.41421 17.75 8 17.75C7.58579 17.75 7.25 17.4142 7.25 17V13C7.25 12.5858 7.58579 12.25 8 12.25ZM16.75 13C16.75 12.5858 16.4142 12.25 16 12.25C15.5858 12.25 15.25 12.5858 15.25 13V17C15.25 17.4142 15.5858 17.75 16 17.75C16.4142 17.75 16.75 17.4142 16.75 17V13ZM12 12.25C12.4142 12.25 12.75 12.5858 12.75 13V17C12.75 17.4142 12.4142 17.75 12 17.75C11.5858 17.75 11.25 17.4142 11.25 17V13C11.25 12.5858 11.5858 12.25 12 12.25Z" fill="currentColor"/></svg>',

            'cart-3' => '<svg viewBox="0 0 24 24" fill="none"><g><path d="M2.23737 2.28845C1.84442 2.15746 1.41968 2.36983 1.28869 2.76279C1.15771 3.15575 1.37008 3.58049 1.76303 3.71147L2.02794 3.79978C2.70435 4.02524 3.15155 4.17551 3.481 4.32877C3.79296 4.47389 3.92784 4.59069 4.01426 4.71059C4.10068 4.83049 4.16883 4.99538 4.20785 5.33722C4.24907 5.69823 4.2502 6.17 4.2502 6.883L4.2502 9.55484C4.25018 10.9224 4.25017 12.0247 4.36673 12.8917C4.48774 13.7918 4.74664 14.5497 5.34855 15.1516C5.95047 15.7535 6.70834 16.0124 7.60845 16.1334C8.47542 16.25 9.57773 16.25 10.9453 16.25H18.0002C18.4144 16.25 18.7502 15.9142 18.7502 15.5C18.7502 15.0857 18.4144 14.75 18.0002 14.75H11.0002C9.56479 14.75 8.56367 14.7484 7.80832 14.6468C7.07455 14.5482 6.68598 14.3677 6.40921 14.091C6.17403 13.8558 6.00839 13.5398 5.9034 13H16.0222C16.9817 13 17.4614 13 17.8371 12.7522C18.2128 12.5045 18.4017 12.0636 18.7797 11.1817L19.2082 10.1817C20.0177 8.2929 20.4225 7.34849 19.9779 6.67422C19.5333 5.99996 18.5058 5.99996 16.4508 5.99996H5.74526C5.73936 5.69227 5.72644 5.41467 5.69817 5.16708C5.64282 4.68226 5.52222 4.2374 5.23112 3.83352C4.94002 3.42965 4.55613 3.17456 4.1137 2.96873C3.69746 2.7751 3.16814 2.59868 2.54176 2.38991L2.23737 2.28845Z" fill="currentColor"/><path d="M7.5 18C8.32843 18 9 18.6716 9 19.5C9 20.3284 8.32843 21 7.5 21C6.67157 21 6 20.3284 6 19.5C6 18.6716 6.67157 18 7.5 18Z" fill="currentColor"/><path d="M16.5 18.0001C17.3284 18.0001 18 18.6716 18 19.5001C18 20.3285 17.3284 21.0001 16.5 21.0001C15.6716 21.0001 15 20.3285 15 19.5001C15 18.6716 15.6716 18.0001 16.5 18.0001Z" fill="currentColor"/></g></svg>',
        ];
    }

    public function add_settings_page()
    {
        add_options_page(
            __('QuantWP SideCart Settings', 'quantwp-sidecart-for-woocommerce'),
            __('QuantWP SideCart', 'quantwp-sidecart-for-woocommerce'),
            'manage_options',
            $this->page_slug,
            array($this, 'render_settings_page')
        );
    }

    public function register_settings()
    {
        register_setting(
            $this->option_group,
            'quantwp_sidecart_auto_open',
            array(
                'type' => 'boolean',
                'default' => 1,
                'sanitize_callback' => 'rest_sanitize_boolean'
            )
        );

        // Shipping Bar Settings
        register_setting(
            $this->option_group,
            'quantwp_sidecart_shipping_bar_enabled',
            array(
                'type' => 'boolean',
                'default' => 1,
                'sanitize_callback' => 'rest_sanitize_boolean'
            )
        );

        register_setting(
            $this->option_group,
            'quantwp_sidecart_shipping_threshold',
            array(
                'type' => 'string',
                'default' => '50',
                'sanitize_callback' => array($this, 'sanitize_threshold_amount')
            )
        );

        // Cross-Sell Settings
        register_setting(
            $this->option_group,
            'quantwp_sidecart_cross_sells_enabled',
            array(
                'type' => 'boolean',
                'default' => 1,
                'sanitize_callback' => 'rest_sanitize_boolean'
            )
        );

        register_setting(
            $this->option_group,
            'quantwp_sidecart_cross_sells_products',
            array(
                'type'              => 'string',
                'default'           => '',
                'sanitize_callback' => array($this, 'sanitize_product_ids'),
            )
        );

        // Cart Icon
        register_setting(
            $this->option_group,
            'quantwp_sidecart_icon',
            array(
                'type' => 'string',
                'default' => 'cart-classic',
                'sanitize_callback' => 'sanitize_key' // Secure text input
            )
        );

        // Shpping Threshold Color
        register_setting(
            $this->option_group,
            'quantwp_sidecart_shipping_threshold_color',
            array('default' => '#92C1E9', 'sanitize_callback' => 'sanitize_hex_color')
        );


        // Checkout Button Style
        register_setting(
            $this->option_group,
            'quantwp_sidecart_checkout_btn_bg',
            array('default' => '#F87C56', 'sanitize_callback' => 'sanitize_hex_color')
        );

        // Icon Color
        register_setting(
            $this->option_group,
            'quantwp_sidecart_icon_color',
            array('default' => '#000000', 'sanitize_callback' => 'sanitize_hex_color')
        );
    }

    /**
     * Render the Visual Icon Selector for Admin
     */
    public function render_icon_selector()
    {
        $selected_icon = get_option('quantwp_sidecart_icon', 'cart-classic');
        // Fetch secure icons from this class using self::
        $icons = self::get_cart_icons();


        echo '<div class="side-cart-icon-grid">';
        foreach ($icons as $key => $svg) {
            $class = ($selected_icon === $key) ? 'selected' : '';
            echo '<label class="side-cart-option ' . esc_attr($class) . '">';
            echo '<input type="radio" name="quantwp_sidecart_icon" value="' . esc_attr($key) . '" ' . checked($selected_icon, $key, false) . '>';
            // Define allowed SVG tags for wp_kses
            $allowed_svg = array(
                'svg' => array(
                    'viewbox' => true,
                    'fill' => true,
                    'stroke' => true,
                    'stroke-width' => true,
                    'stroke-linecap' => true,
                    'stroke-linejoin' => true,
                    'version' => true,  // ADD THIS
                    'class' => true,
                    'width' => true,
                    'height' => true
                ),
                'path' => array(
                    'd' => true,
                    'fill' => true,
                    'stroke' => true,
                    'fill-rule' => true,      // ADD THIS
                    'clip-rule' => true       // ADD THIS
                ),
                'circle' => array(
                    'cx' => true,
                    'cy' => true,
                    'r' => true,
                    'stroke' => true,           // ADD THIS
                    'stroke-width' => true,     // ADD THIS
                    'stroke-linejoin' => true,  // ADD THIS
                    'fill' => true              // ADD THIS
                ),
                'g' => array(
                    'fill' => true,
                    'stroke' => true  // ADD THIS
                ),
                'rect' => array(
                    'x' => true,
                    'y' => true,
                    'width' => true,
                    'height' => true,
                    'rx' => true,
                    'fill' => true,    // ADD THIS
                    'stroke' => true   // ADD THIS
                ),
                'line' => array(
                    'x1' => true,
                    'y1' => true,
                    'x2' => true,
                    'y2' => true,
                    'stroke' => true,       // ADD THIS
                    'stroke-width' => true  // ADD THIS
                ),
                'polyline' => array(
                    'points' => true,
                    'stroke' => true,       // ADD THIS
                    'fill' => true          // ADD THIS
                ),
            );

            echo wp_kses($svg, $allowed_svg);
            echo '</label>';
        }
        echo '</div>';
    }


    /**
     * Render settings page
     */
    public function render_settings_page()
    {
        if (!current_user_can('manage_options')) {
            return;
        }

        $active_tab = isset($_GET['tab']) ? sanitize_key($_GET['tab']) : 'settings';
        settings_errors('quantwp_sidecart_messages');
?>

        <div class="wrap">
            <h1><?php echo esc_html(get_admin_page_title()); ?></h1>
            
                    <nav class="nav-tab-wrapper">
            <a href="?page=quantwp_sidecart_settings&tab=settings"
               class="nav-tab <?php echo $active_tab === 'settings' ? 'nav-tab-active' : ''; ?>">
                ⚙️ <?php esc_html_e('Settings', 'quantwp-sidecart-for-woocommerce'); ?>
            </a>
            <a href="?page=quantwp_sidecart_settings&tab=analytics"
               class="nav-tab <?php echo $active_tab === 'analytics' ? 'nav-tab-active' : ''; ?>">
                📊 <?php esc_html_e('Cross-Sell Analytics', 'quantwp-sidecart-for-woocommerce'); ?>
            </a>
        </nav>

        <?php if ($active_tab === 'analytics') : ?>
            <?php $this->render_analytics_tab(); ?>
        <?php else : ?>

            <form method="post" action="options.php">
                <?php settings_fields($this->option_group); ?>

                <!-- General Settings -->
                <h2><?php esc_html_e('General Settings', 'quantwp-sidecart-for-woocommerce'); ?></h2>
                <table class="form-table">

                    <tr>
                        <th scope="row">
                            <label for="quantwp_sidecart_auto_open">
                                <?php esc_html_e('Auto-Open Cart', 'quantwp-sidecart-for-woocommerce'); ?>
                            </label>
                        </th>
                        <td>
                            <input type="checkbox"
                                name="quantwp_sidecart_auto_open"
                                id="quantwp_sidecart_auto_open"
                                value="1"
                                <?php checked(get_option('quantwp_sidecart_auto_open', 1), 1); ?>>
                            <p class="description">
                                <?php esc_html_e('Automatically open side cart when item is added to cart.', 'quantwp-sidecart-for-woocommerce'); ?>
                            </p>
                        </td>
                    </tr>

                </table>

                <!-- Shipping Bar Settings -->
                <h2><?php esc_html_e('Shipping Progress Bar', 'quantwp-sidecart-for-woocommerce'); ?></h2>
                <table class="form-table">
                    <tr>
                        <th scope="row">
                            <label for="quantwp_sidecart_shipping_bar_enabled">
                                <?php esc_html_e('Enable Shipping Bar', 'quantwp-sidecart-for-woocommerce'); ?>
                            </label>
                        </th>
                        <td>
                            <input type="checkbox"
                                name="quantwp_sidecart_shipping_bar_enabled"
                                id="quantwp_sidecart_shipping_bar_enabled"
                                value="1"
                                <?php checked(get_option('quantwp_sidecart_shipping_bar_enabled', 1), 1); ?>>
                            <p class="description">
                                <?php esc_html_e('Show free shipping progress bar in side cart.', 'quantwp-sidecart-for-woocommerce'); ?>
                            </p>
                        </td>
                    </tr>

                    <tr>
                        <th scope="row">
                            <label for="quantwp_sidecart_shipping_threshold">
                                <?php esc_html_e('Free Shipping Threshold', 'quantwp-sidecart-for-woocommerce'); ?>
                            </label>
                        </th>
                        <td>
                            <input type="text"
                                name="quantwp_sidecart_shipping_threshold"
                                id="quantwp_sidecart_shipping_threshold"
                                value="<?php echo esc_attr(get_option('quantwp_sidecart_shipping_threshold', '50')); ?>"
                                class="regular-text">
                            <p class="description">
                                <?php
                                printf(
                                    /* translators: %s: Currency symbol (e.g. USD, EUR) */
                                    esc_html__('Minimum cart amount for free shipping. Enter amount in %s.', 'quantwp-sidecart-for-woocommerce'),
                                    esc_html(get_woocommerce_currency())
                                );
                                ?>
                            </p>
                        </td>
                    </tr>
                </table>

                <!-- Cross-Sell Settings -->
                <h2><?php esc_html_e('Cross-Sell Products', 'quantwp-sidecart-for-woocommerce'); ?></h2>
                <table class="form-table">
                    <tr>
                        <th scope="row">
                            <label for="quantwp_sidecart_cross_sells_enabled">
                                <?php esc_html_e('Enable Cross-Sells', 'quantwp-sidecart-for-woocommerce'); ?>
                            </label>
                        </th>
                        <td>
                            <input type="checkbox"
                                name="quantwp_sidecart_cross_sells_enabled"
                                id="quantwp_sidecart_cross_sells_enabled"
                                value="1"
                                <?php checked(get_option('quantwp_sidecart_cross_sells_enabled', 1), 1); ?>>
                            <p class="description">
                                <?php esc_html_e('Show cross-sell product list in side cart.', 'quantwp-sidecart-for-woocommerce'); ?>
                            </p>
                        </td>
                    </tr>

                    <tr>
    <th scope="row">
        <label for="quantwp_sidecart_cross_sells_products">
            <?php esc_html_e('Featured Products', 'quantwp-sidecart-for-woocommerce'); ?>
        </label>
    </th>
    <td>
        <?php
        $saved_ids = array_filter(array_map('absint', explode(',', get_option('quantwp_sidecart_cross_sells_products', ''))));
        ?>
        <select
            id="quantwp_sidecart_cross_sells_products"
            name="quantwp_sidecart_cross_sells_products"
            class="wc-product-search"
            multiple="multiple"
            style="width:400px;"
            data-placeholder="<?php esc_attr_e('Search for products…', 'quantwp-sidecart-for-woocommerce'); ?>"
            data-action="woocommerce_json_search_products">
            <?php foreach ($saved_ids as $pid) :
                $p = wc_get_product($pid);
                if ($p) : ?>
                    <option value="<?php echo esc_attr($pid); ?>" selected="selected">
                        <?php echo esc_html($p->get_formatted_name()); ?>
                    </option>
            <?php endif; endforeach; ?>
        </select>
        <p class="description">
            <?php esc_html_e('Select up to 5 products to show in the sidecart.', 'quantwp-sidecart-for-woocommerce'); ?>
        </p>
    </td>
</tr>
                </table>

                <h2><?php esc_html_e('Cart Icon', 'quantwp-sidecart-for-woocommerce'); ?></h2>
                <table class="form-table">
                    <tr>
                        <th scope="row"><?php esc_html_e('Choose Icon', 'quantwp-sidecart-for-woocommerce'); ?></th>
                        <td>
                            <?php $this->render_icon_selector(); ?>
                            <p class="description"><?php esc_html_e('Select the icon to display on your site trigger.', 'quantwp-sidecart-for-woocommerce'); ?></p>
                        </td>
                    </tr>
                    <tr>
                        <th scope="row"><?php esc_html_e('Icon Color', 'quantwp-sidecart-for-woocommerce'); ?></th>
                        <td>
                            <input type="text" name="quantwp_sidecart_icon_color"
                                class="quantwp-color-picker"
                                value="<?php echo esc_attr(get_option('quantwp_sidecart_icon_color', '#000000')); ?>">
                            <p class="description"><?php esc_html_e('Choose the color for your cart icon.', 'quantwp-sidecart-for-woocommerce'); ?></p>
                        </td>
                    </tr>
                </table>
                <!-- Appearance Settings -->
                <h2><?php esc_html_e('Appearance', 'quantwp-sidecart-for-woocommerce'); ?></h2>
                <table class="form-table">
                    <tr>
                        <th scope="row"><?php esc_html_e('Shipping Threshold Color', 'quantwp-sidecart-for-woocommerce'); ?></th>
                        <td>
                            <input type="text" name="quantwp_sidecart_shipping_threshold_color"
                                class="quantwp-color-picker"
                                value="<?php echo esc_attr(get_option('quantwp_sidecart_shipping_threshold_color', '#92C1E9')); ?>">
                            <p class="description"><?php esc_html_e('Shipping Threshold Color.', 'quantwp-sidecart-for-woocommerce'); ?></p>
                        </td>
                    </tr>
                    <tr>
                        <th scope="row"><?php esc_html_e('Checkout Button', 'quantwp-sidecart-for-woocommerce'); ?></th>
                        <td>
                            <input type="text" name="quantwp_sidecart_checkout_btn_bg"
                                class="quantwp-color-picker"
                                value="<?php echo esc_attr(get_option('quantwp_sidecart_checkout_btn_bg', '#F87C56')); ?>">
                            <p class="description"><?php esc_html_e('Checkout Button Color.', 'quantwp-sidecart-for-woocommerce'); ?></p>
                        </td>
                    </tr>
                </table>

                <?php submit_button(__('Save Settings', 'quantwp-sidecart-for-woocommerce')); ?>
            </form>
        <?php endif; ?>
        </div>

<?php
    }

 private function render_analytics_tab()
{

?>
    <div id="quantwp-analytics-wrap">

        <div id="quantwp-summary-cards">
            <div class="quantwp-summary-card" style="border-top:4px solid #2271b1;">
                <div class="quantwp-card-label">Total Add-to-Cart Clicks</div>
                <div class="quantwp-card-value" id="card-adds" style="color:#2271b1;">—</div>
            </div>
            <div class="quantwp-summary-card" style="border-top:4px solid #198038;">
                <div class="quantwp-card-label">Est. Revenue Influenced</div>
                <div class="quantwp-card-value" id="card-rev-est" style="color:#198038;">—</div>
            </div>
        </div>

        <div class="quantwp-table-wrap">
            <div class="quantwp-table-header">
                <h3><?php esc_html_e('Cross-Sell Product Performance', 'quantwp-sidecart-for-woocommerce'); ?></h3>
                <button id="quantwp-reset-btn">🗑 <?php esc_html_e('Reset Data', 'quantwp-sidecart-for-woocommerce'); ?></button>
            </div>
            <div class="quantwp-table-scroll">
                <table id="quantwp-analytics-table">
                    <thead>
                        <tr>
                            <th style="text-align:left;"><?php esc_html_e('Product', 'quantwp-sidecart-for-woocommerce'); ?></th>
                            <th><?php esc_html_e('Added to Cart', 'quantwp-sidecart-for-woocommerce'); ?></th>
                            <th><?php esc_html_e('Est. Revenue Influenced', 'quantwp-sidecart-for-woocommerce'); ?></th>
                        </tr>
                    </thead>
                    <tbody id="quantwp-analytics-body">
                        <tr><td colspan="3" class="quantwp-table-state"><?php esc_html_e('Loading…', 'quantwp-sidecart-for-woocommerce'); ?></td></tr>
                    </tbody>
                </table>
            </div>
            <p class="quantwp-table-note">
                ℹ️ <?php esc_html_e('Est. Revenue Influenced = times added to cart × current product price. This is an upper-bound estimate, not confirmed revenue.', 'quantwp-sidecart-for-woocommerce'); ?>
            </p>
        </div>
    </div>
<?php
}

    public function sanitize_threshold_amount($value)
    {
        // Remove everything except numbers and dots
        $value = preg_replace('/[^0-9.]/', '', $value);
        
        // Ensure only one dot exists (keep the first one)
        $parts = explode('.', $value);
        if (count($parts) > 2) {
            $value = $parts[0] . '.' . implode('', array_slice($parts, 1));
        }
        
        return $value;
    }

    public function sanitize_product_ids($value)
{
    $ids = array_filter(array_map('absint', explode(',', $value)));
    $clean_ids = array();

    foreach ($ids as $id) {
        $product = wc_get_product($id);
        if ($product && in_array($product->get_type(), array('simple', 'variable'))) {
            $clean_ids[] = $id;
        } else {
            $name = $product ? $product->get_name() : '#' . $id;
            add_settings_error(
                'quantwp_sidecart_messages',
                'invalid_product_type_' . $id,
                sprintf(
                    __('%s is not a simple or variable product. Only simple and variable products are allowed.', 'quantwp-sidecart-for-woocommerce'),
                    '<strong>' . esc_html($name) . '</strong>'
                ),
                'error'
            );
        }
    }

    $clean_ids = array_unique($clean_ids);

    // If more than 5 submitted, keep first 5 and show an error
    if (count($clean_ids) > 5) {
        $clean_ids = array_slice($clean_ids, 0, 5);
        add_settings_error(
            'quantwp_sidecart_messages',
            'too_many_products',
            __('You selected more than 5 cross-sell products. Only the first 5 have been saved. The rest were removed.', 'quantwp-sidecart-for-woocommerce'),
            'error'
        );
    }

    return implode(',', $clean_ids);
}

    public function enqueue_admin_assets($hook)
    {
        $my_settings_page = 'settings_page_quantwp_sidecart_settings';
        if ($hook !== $my_settings_page) {
            return;
        }

        $suffix = defined('SCRIPT_DEBUG') && SCRIPT_DEBUG ? '' : '.min';

        wp_enqueue_script('quantwp-sidecart-admin', QUANTWP_URL . 'assets/js/admin' . $suffix . '.js', array('jquery', 'wp-color-picker'), QUANTWP_VERSION, true);
        wp_enqueue_style('quantwp-sidecart-admin', QUANTWP_URL . 'assets/css/admin' . $suffix . '.css', array(), QUANTWP_VERSION);
        wp_enqueue_style('wp-color-picker');
        wp_enqueue_script('wp-color-picker');

        wp_enqueue_script('wc-enhanced-select');
        wp_enqueue_style('woocommerce_admin_styles');

        wp_localize_script('quantwp-sidecart-admin', 'quantwpAnalytics', array(
            'reportUrl' => esc_url_raw(rest_url('quantwp/v1/analytics/report')),
            'resetUrl'  => esc_url_raw(rest_url('quantwp/v1/analytics/reset')),
            'nonce'     => wp_create_nonce('wp_rest'),
            'currency'  => html_entity_decode(get_woocommerce_currency_symbol(), ENT_QUOTES, 'UTF-8'),
        ));
    }
}
