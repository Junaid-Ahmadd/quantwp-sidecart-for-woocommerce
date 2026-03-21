jQuery(document).ready(function (e) {
    e(".side-cart-option").click(function () {
        e(".side-cart-option").removeClass("selected");
        e(this).addClass("selected");
    });

    e(".quantwp-color-picker").wpColorPicker();

    e("form").on("submit", function () {
        var ids = e("#quantwp_cs_display").val() || [];
        ids = ids.slice(0, 5);
        e("#quantwp_sidecart_cross_sells_products").val(ids.join(","));
    });

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