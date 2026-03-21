<?php

if (!defined('ABSPATH')) {
    exit;
}

class QuantWP_SideCart_Cross_Sells
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

    public function init_hooks()
    {
        add_action('wp_enqueue_scripts', array($this, 'enqueue_assets'));

        // Render empty wrapper into sidecart — content loaded lazily by JS
        add_action('quantwp_sidecart_after_cart_items', array($this, 'render_empty_wrapper'), 20);

        add_action('rest_api_init', array($this, 'register_rest_route'));
    }

    public function enqueue_assets()
    {
        $suffix = defined('SCRIPT_DEBUG') && SCRIPT_DEBUG ? '' : '.min';

        wp_enqueue_script(
            'quantwp-cross-sells',
            QUANTWP_URL . 'assets/js/cross-sells' . $suffix . '.js',
            array('jquery', 'quantwp-sidecart'),
            QUANTWP_VERSION,
            true
        );

        wp_localize_script('quantwp-cross-sells', 'quantwpCrossSells', array(
            'crossSellsApiUrl' => esc_url_raw(rest_url('quantwp/v1/cross-sells')),
            'storeApiUrl'      => esc_url_raw(rest_url('wc/store/v1')),
            'storeApiNonce'    => wp_create_nonce('wc_store_api'),
            'analyticsUrl'     => esc_url_raw(rest_url('quantwp/v1/analytics/add')),
            'analyticsNonce'   => wp_create_nonce('wp_rest'),
        ));
    }

    /**
     * Always render the wrapper div. Content injected by JS on first open.
     */
    public function render_empty_wrapper()
    {
        if (!get_option('quantwp_sidecart_cross_sells_enabled', 1)) {
            return;
        }

        $ids = $this->get_product_ids();
        if (empty($ids)) {
            return;
        }

        echo '<div class="quantwp-cross-sells-wrapper" data-loaded="0"></div>';
    }

    /**
     * Get the admin-selected product IDs (max 5, published + visible only).
     */
    public function get_product_ids()
    {
        $raw = get_option('quantwp_sidecart_cross_sells_products', '');
        if (empty($raw)) {
            return array();
        }

        $ids = array_filter(array_map('absint', explode(',', $raw)));
        return array_slice($ids, 0, 5);
    }

    /**
     * Register both REST routes:
     *   GET /quantwp/v1/cross-sells              — slim product cards (no variation data)
     *   GET /quantwp/v1/cross-sells/variation/{id} — variation data fetched on demand
     */
    public function register_rest_route()
    {
        register_rest_route('quantwp/v1', '/cross-sells', array(
            'methods'             => WP_REST_Server::READABLE,
            'callback'            => array($this, 'rest_get_cross_sells'),
            'permission_callback' => '__return_true',
        ));

        register_rest_route('quantwp/v1', '/cross-sells/variation/(?P<id>\d+)', array(
            'methods'             => WP_REST_Server::READABLE,
            'callback'            => array($this, 'rest_get_variation_data'),
            'permission_callback' => '__return_true',
            'args'                => array(
                'id' => array(
                    'validate_callback' => function ($param) {
                        return is_numeric($param) && $param > 0;
                    },
                ),
            ),
        ));
    }

    /**
     * REST: return slim product list — only what the sidecart cards need.
     * No variation data, no attributes, no bloat.
     * Called once on first sidecart open (and again after cart changes).
     */
    public function rest_get_cross_sells(WP_REST_Request $request)
    {
        if (!get_option('quantwp_sidecart_cross_sells_enabled', 1)) {
            return rest_ensure_response(array('products' => array()));
        }

        $ids = $this->get_product_ids();
        if (empty($ids)) {
            return rest_ensure_response(array('products' => array()));
        }

        $products = array();
        _prime_post_caches($ids, true, true);
        foreach ($ids as $id) {
            $product = wc_get_product($id);
            if (!$product || !$product->is_visible()) {
                continue;
            }

            // Card image: small (100x100) for display in the carousel.
            // Gallery images: full thumbnail (300x300) for the lightbox.
            $main_image_id     = $product->get_image_id();
            $gallery_image_ids = $product->get_gallery_image_ids();
            array_unshift($gallery_image_ids, $main_image_id);

            $card_urls    = array();
            $gallery_urls = array();
            foreach (array_unique($gallery_image_ids) as $img_id) {
                if ($img_id) {
                    $small = wp_get_attachment_image_url($img_id, 'woocommerce_gallery_thumbnail');
                    $large = wp_get_attachment_image_url($img_id, 'woocommerce_thumbnail');
                    if ($small) $card_urls[]    = $small;
                    if ($large) $gallery_urls[] = $large;
                }
            }

            $products[] = array(
                'id'          => $product->get_id(),
                'name'        => $product->get_name(),
                'price_html'  => $product->get_price_html(),
                'permalink'   => $product->get_permalink(),
                'image'       => $card_urls[0] ?? '',
                'gallery'     => $gallery_urls,
                'is_variable' => $product->is_type('variable'),
            );
        }

        return rest_ensure_response(array('products' => $products));
    }

    /**
     * REST: return variation data for a single variable product.
     * Called only when user clicks the Add button on a variable product.
     */
    public function rest_get_variation_data(WP_REST_Request $request)
    {
        $product_id = absint($request->get_param('id'));
        $product    = wc_get_product($product_id);

        if (!$product || !$product->is_type('variable') || !$product->is_visible()) {
            return new WP_Error('invalid_product', 'Product not found', array('status' => 404));
        }

        $main_image_id = $product->get_image_id();

        // Attributes — for rendering the option selector boxes
        $attr_data = array();
        foreach ($product->get_variation_attributes() as $attr_name => $options) {
            $clean_key         = str_replace('attribute_', '', $attr_name);
            $formatted_options = array();

            foreach ($options as $opt) {
                $term              = get_term_by('slug', $opt, $attr_name);
                $formatted_options[] = array(
                    'slug'  => $opt,
                    'label' => $term ? $term->name : $opt,
                );
            }

            $attr_data[] = array(
                'id'      => 'attribute_' . $clean_key,
                'label'   => wc_attribute_label($attr_name),
                'options' => $formatted_options,
            );
        }

// Variations — for matching selected options + updating price/image
$var_data = array();
_prime_post_caches($product->get_children(), true, true);
foreach ($product->get_children() as $var_id) {
    $variation = wc_get_product($var_id);
    if (!$variation || !$variation->is_purchasable()) {
        continue;
    }

    $attributes     = $variation->get_variation_attributes();
    $raw_attributes = array();
    $raw_attrs      = array();

    foreach ($attributes as $key => $val) {
        $raw_attributes[] = array(
            'attribute' => str_replace('attribute_', '', $key),
            'value'     => $val,
        );
        $raw_attrs[$key] = $val;
    }

    $image_id = $variation->get_image_id() ?: $main_image_id;

    $var_data[] = array(
        'id'         => $var_id,
        'price_html' => $variation->get_price_html(),
        'image'      => wp_get_attachment_image_url($image_id, 'woocommerce_thumbnail'),
        'attributes' => $raw_attributes,
        'raw_attrs'  => $raw_attrs,
        'in_stock'   => $variation->is_in_stock(),
    );
}

        return rest_ensure_response(array(
            'attributes' => $attr_data,
            'variations' => $var_data,
        ));
    }
}