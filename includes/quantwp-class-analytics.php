<?php

if (!defined('ABSPATH')) {
    exit;
}

class QuantWP_SideCart_Analytics
{
    protected static $instance = null;
    private static $db_version = '1.0';

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

    // -------------------------------------------------------------------------
    // Setup
    // -------------------------------------------------------------------------

    public static function install()
    {
        global $wpdb;
        $table   = $wpdb->prefix . 'quantwp_analytics';
        $charset = $wpdb->get_charset_collate();

        $sql = "CREATE TABLE IF NOT EXISTS {$table} (
            id          BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
            product_id  BIGINT UNSIGNED NOT NULL,
            event       VARCHAR(30)     NOT NULL,
            order_id    BIGINT UNSIGNED DEFAULT NULL,
            revenue     DECIMAL(15,4)   DEFAULT NULL,
            recorded_at DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (id),
            KEY product_event (product_id, event),
            KEY order_id     (order_id)
        ) {$charset};";

        require_once ABSPATH . 'wp-admin/includes/upgrade.php';
        dbDelta($sql);

        update_option('quantwp_analytics_db_version', self::$db_version);
    }

    private function init_hooks()
    {
        add_action('rest_api_init', array($this, 'register_rest_routes'));
    }

    // -------------------------------------------------------------------------
    // REST routes
    // -------------------------------------------------------------------------

    public function register_rest_routes()
    {
        // JS calls this when a cross-sell product is added to cart
        register_rest_route('quantwp/v1', '/analytics/add', array(
            'methods'             => WP_REST_Server::CREATABLE,
            'callback'            => array($this, 'rest_track_add'),
            'permission_callback' => array($this, 'verify_nonce'),
            'args'                => array(
                'product_id' => array(
                    'required'          => true,
                    'validate_callback' => function ($p) { return is_numeric($p) && $p > 0; },
                    'sanitize_callback' => 'absint',
                ),
            ),
        ));

        // Dashboard data — admin only
        register_rest_route('quantwp/v1', '/analytics/report', array(
            'methods'             => WP_REST_Server::READABLE,
            'callback'            => array($this, 'rest_get_report'),
            'permission_callback' => function () { return current_user_can('manage_options'); },
        ));

        // Clear all analytics data — admin only
        register_rest_route('quantwp/v1', '/analytics/reset', array(
            'methods'             => WP_REST_Server::CREATABLE,
            'callback'            => array($this, 'rest_reset_data'),
            'permission_callback' => function () { return current_user_can('manage_options'); },
        ));
    }

    /**
 * Verify the WP REST nonce sent by JS via X-WP-Nonce header.
 * WordPress sets current_user on REST requests based on this nonce —
 * if the nonce is invalid the request is rejected before our callback runs.
 * For logged-out users, wp_create_nonce() still generates a valid nonce
 * tied to user 0, so this works for guests too.
 */
    public function verify_nonce()
    {
        // WordPress REST API already authenticates the nonce from the
        // X-WP-Nonce header before permission_callback runs.
        // If we reach here with a valid nonce, current_user is set correctly.
        // We just need to confirm the nonce was actually present and valid.
        $nonce = isset($_SERVER['HTTP_X_WP_NONCE']) ? $_SERVER['HTTP_X_WP_NONCE'] : '';
        if (empty($nonce)) {
        return new WP_Error('rest_forbidden', 'Nonce missing', array('status' => 403));
        }

        $result = wp_verify_nonce($nonce, 'wp_rest');
        if (!$result) {
        return new WP_Error('rest_forbidden', 'Invalid nonce', array('status' => 403));
        }

        return true;
    }
    // -------------------------------------------------------------------------
    // Event recording helpers
    // -------------------------------------------------------------------------

    private function record(int $product_id, string $event)
{
    global $wpdb;
    $wpdb->insert(
        $wpdb->prefix . 'quantwp_analytics',
        array(
            'product_id'  => $product_id,
            'event'       => $event,
            'recorded_at' => current_time('mysql'),
        ),
        array('%d', '%s', '%s')
    );
}

    private function get_cross_sell_ids(): array
    {
        $raw = get_option('quantwp_sidecart_cross_sells_products', '');
        if (empty($raw)) return array();
        return array_values(array_filter(array_map('absint', explode(',', $raw))));
    }

    // -------------------------------------------------------------------------
    // REST callbacks
    // -------------------------------------------------------------------------

    public function rest_track_add(WP_REST_Request $request)
    {

        $product_id = $request->get_param('product_id');

        // Only track products that are actually in our cross-sell list
        if (!in_array($product_id, $this->get_cross_sell_ids(), true)) {
            return rest_ensure_response(array('success' => false, 'reason' => 'not_a_cross_sell'));
        }

        $this->record($product_id, 'added_to_cart');
        return rest_ensure_response(array('success' => true));
    }

public function rest_get_report()
{
    global $wpdb;
    $table  = $wpdb->prefix . 'quantwp_analytics';
    $cs_ids = $this->get_cross_sell_ids();

    if (empty($cs_ids)) {
        return rest_ensure_response(array(
            'products'        => array(),
            'totals'          => array('adds' => 0, 'est_revenue' => 0),
            'currency_symbol' => get_woocommerce_currency_symbol(),
        ));
    }

    // Single query for all products at once instead of one query per product
    $placeholders = implode(',', array_fill(0, count($cs_ids), '%d'));
    $results = $wpdb->get_results(
        $wpdb->prepare(
            "SELECT product_id, COUNT(*) as total
             FROM {$table}
             WHERE product_id IN ({$placeholders}) AND event = 'added_to_cart'
             GROUP BY product_id",
            ...$cs_ids
        ),
        ARRAY_A
    );

    // Index by product_id for O(1) lookup
    $adds_map = array();
    foreach ($results as $row) {
        $adds_map[(int) $row['product_id']] = (int) $row['total'];
    }

    // Prime WC product cache — loads all products in one DB query
    _prime_post_caches($cs_ids, true, true);

    $rows = array();
    foreach ($cs_ids as $pid) {
        $product = wc_get_product($pid);
        if (!$product) continue;

        $adds        = $adds_map[$pid] ?? 0;
        $price       = (float) $product->get_price();
        $est_revenue = round($adds * $price, 2);

        $rows[] = array(
            'product_id'   => $pid,
            'product_name' => $product->get_name(),
            'permalink'    => $product->get_permalink(),
            'adds'         => $adds,
            'price'        => $price,
            'est_revenue'  => $est_revenue,
        );
    }

    return rest_ensure_response(array(
        'products'        => $rows,
        'totals'          => array(
            'adds'        => array_sum(array_column($rows, 'adds')),
            'est_revenue' => round(array_sum(array_column($rows, 'est_revenue')), 2),
        ),
        'currency_symbol' => get_woocommerce_currency_symbol(),
    ));
}

    public function rest_reset_data()
    {
        global $wpdb;
        $wpdb->query("TRUNCATE TABLE {$wpdb->prefix}quantwp_analytics");
        return rest_ensure_response(array('success' => true));
    }

}