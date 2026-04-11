jQuery(document).ready(function (e) {

    // Form submit — convert multi-select to comma-separated string
    e('form').on('submit', function () {
        var ids = e('#quantwp_sidecart_cross_sells_products').val() || [];
        e('<input>')
            .attr({
                type: 'hidden',
                name: 'quantwp_sidecart_cross_sells_products'
            })
            .val(ids.join(','))
            .appendTo(e(this));

        // Remove the array-named select from submission
        e('#quantwp_sidecart_cross_sells_products').removeAttr('name');
    });

    // ─── Cross-sell inline limit warning ──────────────────────────────────────
    var $productField = e('#quantwp_sidecart_cross_sells_products');

    function updateCrossSellError() {
        var count = ($productField.val() || []).length;
        var $existing = e('#quantwp-cs-limit-error');

        if (count > 5) {
            if ($existing.length === 0) {
                $productField.closest('td').find('p.description').before(
                    '<p id="quantwp-cs-limit-error" style="color:#d63638; font-weight:600; margin:6px 0;">⚠ Only 5 products are allowed. The last ' + (count - 5) + ' will be removed on save.</p>'
                );
            } else {
                $existing.html('⚠ Only 5 products are allowed. The last ' + (count - 5) + ' will be removed on save.');
            }
        } else {
            $existing.remove();
        }
    }

    // WooCommerce initializes wc-product-search on DOM ready so wait a tick
    setTimeout(function () {
        $productField.on('select2:select select2:unselect', function () {
            updateCrossSellError();
        });
    }, 300);


    // Shipping Threshold: Only numbers and dots
    e("#quantwp_sidecart_shipping_threshold").on("input", function () {
        var val = e(this).val();
        var cleaned = val.replace(/[^0-9.]/g, '');
        if ((cleaned.match(/\./g) || []).length > 1) {
            cleaned = cleaned.replace(/\.+$/, "");
        }
        e(this).val(cleaned);
    });

    e(".side-cart-option").click(function () {
        e(".side-cart-option").removeClass("selected");
        e(this).addClass("selected");
    });

    e(".quantwp-color-picker").wpColorPicker();

    // ─── Analytics Dashboard ───────────────────────────────────────────────
    if (e('#quantwp-analytics-wrap').length === 0) return;

    var reportUrl = quantwpAnalytics.reportUrl;
    var resetUrl = quantwpAnalytics.resetUrl;
    var nonce = quantwpAnalytics.nonce;
    var currency = quantwpAnalytics.currency;

    function fmt(num) {
        return currency + parseFloat(num).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    }

    function loadReport() {
        e('#quantwp-analytics-body').html('<tr><td colspan="3" class="quantwp-table-state">Loading…</td></tr>');
        e.ajax({
            url: reportUrl,
            method: 'GET',
            beforeSend: function (xhr) { xhr.setRequestHeader('X-WP-Nonce', nonce); },
            success: function (data) {
                e('#card-adds').text(data.totals.adds);
                e('#card-rev-est').text(fmt(data.totals.est_revenue));

                if (!data.products || data.products.length === 0) {
                    e('#quantwp-analytics-body').html('<tr><td colspan="3" class="quantwp-table-state">No cross-sell products configured yet. Add products in the Settings tab.</td></tr>');
                    return;
                }

                var rows = '';
                e.each(data.products, function (i, p) {
                    rows += '<tr class="' + (i % 2 === 0 ? 'quantwp-row-even' : 'quantwp-row-odd') + '">' +
                        '<td class="quantwp-td-product">' +
                        '<a href="' + p.permalink + '" target="_blank" class="quantwp-product-link">' + e('<div>').text(p.product_name).html() + '</a>' +
                        '<div class="quantwp-product-id">ID: ' + p.product_id + '</div>' +
                        '</td>' +
                        '<td class="quantwp-td-adds">' + p.adds + '</td>' +
                        '<td class="quantwp-td-revenue">' + fmt(p.est_revenue) + '</td>' +
                        '</tr>';
                });
                e('#quantwp-analytics-body').html(rows);
            },
            error: function () {
                e('#quantwp-analytics-body').html('<tr><td colspan="3" class="quantwp-table-state quantwp-table-error">Failed to load. Please refresh.</td></tr>');
            }
        });
    }

    e('#quantwp-reset-btn').on('click', function () {
        if (!confirm('Reset all cross-sell analytics data? This cannot be undone.')) return;
        var btn = e(this).prop('disabled', true).text('Resetting…');
        e.ajax({
            url: resetUrl,
            method: 'POST',
            beforeSend: function (xhr) { xhr.setRequestHeader('X-WP-Nonce', nonce); },
            success: function () { loadReport(); btn.prop('disabled', false).html('🗑 Reset Data'); },
            error: function () { alert('Reset failed.'); btn.prop('disabled', false).html('🗑 Reset Data'); }
        });
    });

    loadReport();

});