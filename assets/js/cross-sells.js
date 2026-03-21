jQuery(document).ready(function ($) {

    /* Analytics tracking */
    function trackCrossSellAdd(productId) {
        if (!productId) return;
        fetch(quantwpCrossSells.analyticsUrl, {
            method: 'POST',
            credentials: 'same-origin',
            headers: { 'Content-Type': 'application/json', 'X-WP-Nonce': quantwpCrossSells.analyticsNonce },
            body: JSON.stringify({ product_id: productId })
        }).catch(function () { });
    }

    var carousel = { currentIndex: 0, move: null };
    var variationCache = {};
    var addedToCartIds = []; // tracks IDs added this session — client-side source of truth

    // ─── Mark product as added ────────────────────────────────────────────────
    function markAdded(productId) {
        if (addedToCartIds.indexOf(productId) === -1) {
            addedToCartIds.push(productId);
        }
        delete variationCache[productId]; // clear variation cache for this product
        $('.quantwp-cross-sells-wrapper').data('loaded', 0);
    }

    // ─── Carousel init ────────────────────────────────────────────────────────
    function initCarousel() {
        var $carousel = $('.cross-sells-carousel');
        if (!$carousel.length) return;

        var $track = $carousel.find('.carousel-track');
        var $prev = $carousel.find('.carousel-prev');
        var $next = $carousel.find('.carousel-next');

        carousel.currentIndex = 0;
        carousel.move = function () {
            var $items = $track.find('.cross-sell-item');
            var total = Math.max(0, $items.length - 1);
            if (!$items.length) return;

            var itemWidth = $items.first().outerWidth(true);
            if (carousel.currentIndex > total) carousel.currentIndex = total;

            $track.css('transform', 'translateX(' + (-carousel.currentIndex * itemWidth) + 'px)');

            if (total === 0) {
                $prev.hide(); $next.hide();
            } else {
                $prev.show().prop('disabled', carousel.currentIndex === 0);
                $next.show().prop('disabled', carousel.currentIndex >= total);
            }
        };

        $next.off('click').on('click', function () {
            var total = Math.max(0, $track.find('.cross-sell-item').length - 1);
            if (carousel.currentIndex < total) { carousel.currentIndex++; carousel.move(); }
        });
        $prev.off('click').on('click', function () {
            if (carousel.currentIndex > 0) { carousel.currentIndex--; carousel.move(); }
        });

        $(window).off('resize.quantwp').on('resize.quantwp', function () { carousel.currentIndex = 0; carousel.move(); });
        setTimeout(function () { carousel.move(); }, 50);
    }

    // ─── Build card HTML ──────────────────────────────────────────────────────
    function buildCardHTML(product) {
        var galleryAttr = esc(JSON.stringify(product.gallery));
        var hasGallery = product.gallery && product.gallery.length > 1;

        var zoomIcon = hasGallery
            ? '<div class="product-image-zoom"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line><line x1="11" y1="8" x2="11" y2="14"></line><line x1="8" y1="11" x2="14" y2="11"></line></svg></div>'
            : '';

        var btn = product.is_variable
            ? '<button class="add-to-cart-btn" data-product-id="' + product.id + '" data-product-title="' + esc(product.name) + '" data-variable="1">ADD</button>'
            : '<button class="add-to-cart-btn" data-product-id="' + product.id + '">ADD</button>';

        return '<div class="cross-sell-item">'
            + '<div class="product-image-wrapper" data-gallery="' + galleryAttr + '">'
            + '<a href="' + product.permalink + '" class="product-image">'
            + '<img src="' + product.image + '" alt="' + esc(product.name) + '">'
            + '</a>'
            + zoomIcon
            + '</div>'
            + '<div class="product-details">'
            + '<a href="' + product.permalink + '" class="product-name">' + product.name + '</a>'
            + '<div class="product-price">' + product.price_html + '</div>'
            + btn
            + '</div>'
            + '</div>';
    }

    function esc(str) {
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/"/g, '&quot;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;');
    }

    // ─── Load cross-sell product cards ────────────────────────────────────────
    function loadCrossSells() {
        var $wrapper = $('.quantwp-cross-sells-wrapper');
        if (!$wrapper.length) { console.log('[QuantWP] loadCrossSells: no wrapper'); return; }

        if ($('.quantwp-empty-state').length > 0) { console.log('[QuantWP] loadCrossSells: empty state'); $wrapper.hide(); return; }

        console.log('[QuantWP] loadCrossSells: loaded state =', $wrapper.data('loaded'));
        if ($wrapper.data('loaded') === 1) { console.log('[QuantWP] loadCrossSells: skipped — already loaded'); $wrapper.show(); return; }

        $wrapper.data('loaded', 1);
        console.log('[QuantWP] loadCrossSells: fetching API...');

        fetch(quantwpCrossSells.crossSellsApiUrl, { credentials: 'same-origin' })
            .then(function (r) { return r.json(); })
            .then(function (data) {
                console.log('[QuantWP] loadCrossSells: API returned', data.products ? data.products.length : 0, 'products');

                if (!data.products || !data.products.length) {
                    $wrapper.html('').hide();
                    return;
                }

                var cartIds = window.quantwpCartProductIds || [];
                var cartPermalinks = window.quantwpCartPermalinks || [];

                console.log('[QuantWP] loadCrossSells: cartIds at filter time:', JSON.stringify(cartIds));
                console.log('[QuantWP] loadCrossSells: cartPermalinks at filter time:', JSON.stringify(cartPermalinks));

                var products = data.products.filter(function (p) {
                    var inAdded = addedToCartIds.indexOf(p.id) !== -1;
                    var inCart = cartIds.indexOf(p.id) !== -1;
                    var basePath = p.permalink ? p.permalink.split('?')[0].replace(/\/$/, '') : '';
                    var inPermalinks = basePath ? cartPermalinks.indexOf(basePath) !== -1 : false;
                    console.log('[QuantWP] product', p.id, p.name, '— inAdded:', inAdded, '| inCart:', inCart, '| inPermalinks:', inPermalinks, '| shown:', !inAdded && !inCart && !inPermalinks);
                    return !inAdded && !inCart && !inPermalinks;
                });

                console.log('[QuantWP] loadCrossSells: after filter,', products.length, 'products shown');

                if (!products.length) {
                    $wrapper.html('').hide();
                    return;
                }

                var html = '<div class="cross-sells-header"><h4>You may also like</h4></div>'
                    + '<div class="cross-sells-carousel">'
                    + '<button class="carousel-prev" aria-label="Previous">&#x2039;</button>'
                    + '<div class="carousel-track">';

                products.forEach(function (p) { html += buildCardHTML(p); });

                html += '</div><button class="carousel-next" aria-label="Next">&#x203a;</button></div>';

                $wrapper.html(html).fadeIn(200);
                initCarousel();
            })
            .catch(function (err) {
                console.warn('[QuantWP] loadCrossSells fetch failed:', err);
                $wrapper.data('loaded', 0);
            });
    }
    // ─── Lightbox close ───────────────────────────────────────────────────────
    function closeLightbox() {
        $('.quantwp-lightbox-overlay').removeClass('active');
        setTimeout(function () { $('.quantwp-lightbox-container').empty(); }, 300);
    }

    // ─── Open variation lightbox ──────────────────────────────────────────────
    function openVariationLightbox(productId, productTitle, data, cardImage) {
        var attrHTML = '';
        data.attributes.forEach(function (attr) {
            attrHTML += '<div class="quantwp-variation-options-group" data-attribute="' + attr.id + '">'
                + '<div class="quantwp-variation-label">' + attr.label + ':</div>'
                + '<div class="quantwp-variation-boxes">';
            attr.options.forEach(function (opt) {
                var allOutOfStock = data.variations.every(function (v) {
                    var matches = false;
                    for (var rk in v.raw_attrs) {
                        if (String(v.raw_attrs[rk]).toLowerCase() === String(opt.slug).toLowerCase()) {
                            matches = true; break;
                        }
                    }
                    return matches ? !v.in_stock : true;
                });
                var oosCls = allOutOfStock ? ' out-of-stock' : '';
                attrHTML += '<div class="quantwp-variation-box' + oosCls + '" data-value="' + opt.slug + '" data-out-of-stock="' + (allOutOfStock ? '1' : '0') + '">' + opt.label + '</div>';
            });
            attrHTML += '</div></div>';
        });

        var initialImage = cardImage || (data.variations.length ? data.variations[0].image : '');
        var modal = '<div class="quantwp-variation-modal">'
            + '<button class="quantwp-lightbox-close">&times;</button>'
            + '<div class="quantwp-variation-header">'
            + '<div class="quantwp-variation-img"><img src="' + initialImage + '" alt=""></div>'
            + '<div class="quantwp-variation-info">'
            + '<h3 class="quantwp-variation-title">' + productTitle + '</h3>'
            + '<div class="quantwp-variation-price"></div>'
            + '</div>'
            + '</div>'
            + '<div class="quantwp-variation-options">' + attrHTML + '</div>'
            + '<button class="quantwp-variation-add-btn" disabled>Add to cart</button>'
            + '</div>';

        $('.quantwp-lightbox-container').html(modal);
        $('.quantwp-lightbox-overlay').addClass('active');

        var selected = {};

        $('.quantwp-variation-box').on('click', function () {
            var $group = $(this).closest('.quantwp-variation-options-group');
            var attrKey = $group.attr('data-attribute');
            var val = $(this).attr('data-value');

            $group.find('.quantwp-variation-box').removeClass('selected');
            $(this).addClass('selected');
            selected[attrKey] = val;

            if (Object.keys(selected).length !== data.attributes.length) {
                $('.quantwp-variation-price').html('');
                $('.quantwp-variation-add-btn').prop('disabled', true).removeData('variation-id').removeData('attributes');
                return;
            }

            var match = data.variations.find(function (v) {
                for (var a in selected) {
                    var rawVal;
                    var aLower = a.toLowerCase();
                    var paKey = ('attribute_pa_' + a).toLowerCase();
                    var aKey = ('attribute_' + a).toLowerCase();
                    for (var rk in v.raw_attrs) {
                        var rkL = rk.toLowerCase();
                        if (rkL === aLower || rkL === paKey || rkL === aKey) {
                            rawVal = v.raw_attrs[rk]; break;
                        }
                    }
                    if (rawVal == null) return false;
                    if (rawVal !== '' && String(rawVal).toLowerCase() !== String(selected[a]).toLowerCase()) return false;
                }
                return true;
            });

            if (match) {
                $('.quantwp-variation-img img').attr('src', match.image);
                $('.quantwp-variation-price').html(match.price_html);
                if (match.in_stock) {
                    $('.quantwp-variation-add-btn').prop('disabled', false)
                        .text('Add to cart')
                        .data('variation-id', match.id)
                        .data('attributes', match.attributes);
                } else {
                    $('.quantwp-variation-add-btn').prop('disabled', true)
                        .text('Out of stock')
                        .removeData('variation-id')
                        .removeData('attributes');
                }
            } else {
                $('.quantwp-variation-price').html('');
                $('.quantwp-variation-add-btn').prop('disabled', true)
                    .text('Add to cart')
                    .removeData('variation-id')
                    .removeData('attributes');
            }
        });

        // Auto-select first option in each group
        $('.quantwp-variation-options-group').each(function () {
            $(this).find('.quantwp-variation-box').first().trigger('click');
        });

        // Add to cart
        $('.quantwp-variation-add-btn').on('click', function () {
            var variationId = $(this).data('variation-id');
            var attributes = $(this).data('attributes');
            if (!variationId) return;

            var $btn = $(this);
            $btn.prop('disabled', true).text('Adding...');

            trackCrossSellAdd(productId);

            fetch(quantwpCrossSells.storeApiUrl + '/cart/items', {
                method: 'POST',
                credentials: 'same-origin',
                headers: { 'Content-Type': 'application/json', 'Nonce': quantwpCrossSells.storeApiNonce },
                body: JSON.stringify({ id: productId, quantity: 1, variation: attributes })
            })
                .then(function (r) {
                    var nonce = r.headers.get('Nonce');
                    if (nonce) {
                        quantwpCrossSells.storeApiNonce = nonce;
                        if (typeof quantwpData !== 'undefined') quantwpData.storeApiNonce = nonce;
                    }
                    return r.json().then(function (d) { return r.ok ? d : Promise.reject(d); });
                })
                .then(function () {
                    closeLightbox();
                    markAdded(productId);
                    loadCrossSells();
                    $(document.body).trigger('quantwp_cross_sell_added');
                })
                .catch(function (err) {
                    console.warn('[QuantWP] Variation add-to-cart failed:', err);
                    $btn.prop('disabled', false).text('Try Again');
                });
        });
    }

    // ─── Variable product Add click ───────────────────────────────────────────
    $(document).on('click', '.add-to-cart-btn[data-variable]', function (e) {
        e.preventDefault();
        var $btn = $(this);
        var productId = parseInt($btn.data('product-id'), 10);
        var title = $btn.data('product-title');
        if (!productId) return;

        var cardImage = $btn.closest('.cross-sell-item').find('.product-image img').attr('src') || '';

        if (variationCache[productId]) {
            openVariationLightbox(productId, title, variationCache[productId], cardImage);
            return;
        }

        $btn.prop('disabled', true).text('Loading...');

        fetch(quantwpCrossSells.crossSellsApiUrl + '/variation/' + productId)
            .then(function (r) { return r.json(); })
            .then(function (data) {
                variationCache[productId] = data;
                $btn.prop('disabled', false).text('ADD');
                openVariationLightbox(productId, title, data, cardImage);
            })
            .catch(function (err) {
                console.warn('[QuantWP] Variation fetch failed:', err);
                $btn.prop('disabled', false).text('ADD');
            });
    });

    // ─── Simple product Add click ─────────────────────────────────────────────
    $(document).on('click', '.add-to-cart-btn:not([data-variable])', function (e) {
        e.preventDefault();
        var $btn = $(this);
        var productId = parseInt($btn.data('product-id'), 10);
        if (!productId) return;

        $btn.prop('disabled', true).text('Adding…');

        trackCrossSellAdd(productId);

        fetch(quantwpCrossSells.storeApiUrl + '/cart/items', {
            method: 'POST',
            credentials: 'same-origin',
            headers: { 'Content-Type': 'application/json', 'Nonce': quantwpCrossSells.storeApiNonce },
            body: JSON.stringify({ id: productId, quantity: 1 })
        })
            .then(function (r) {
                var nonce = r.headers.get('Nonce');
                if (nonce) {
                    quantwpCrossSells.storeApiNonce = nonce;
                    if (typeof quantwpData !== 'undefined') quantwpData.storeApiNonce = nonce;
                }
                return r.json().then(function (d) { return r.ok ? d : Promise.reject(d); });
            })
            .then(function () {
                $btn.text('Added!');
                markAdded(productId);
                $btn.closest('.cross-sell-item').fadeOut(300, function () {
                    $(this).remove();
                    loadCrossSells();
                });
                $(document.body).trigger('quantwp_cross_sell_added');
            })
            .catch(function (err) {
                console.warn('[QuantWP] Add-to-cart failed:', err);
                $btn.prop('disabled', false).text('ADD');
            });
    });

    // ─── Gallery lightbox ─────────────────────────────────────────────────────
    if ($('.quantwp-lightbox-overlay').length === 0) {
        $('body').append('<div class="quantwp-lightbox-overlay"><div class="quantwp-lightbox-container"></div></div>');
    }

    $(document).on('click', '.quantwp-lightbox-overlay', function (e) {
        if ($(e.target).hasClass('quantwp-lightbox-overlay') || $(e.target).hasClass('quantwp-lightbox-container')) {
            closeLightbox();
        }
    });
    $(document).on('click', '.quantwp-lightbox-close', function () { closeLightbox(); });

    $(document).on('click', '.product-image-wrapper', function (e) {
        e.preventDefault();
        var gallery = $(this).data('gallery');
        if (!gallery || gallery.length <= 1) return;

        var idx = 0;

        var imgsHtml = '';
        gallery.forEach(function (url, i) {
            imgsHtml += '<img src="' + url + '" class="quantwp-gallery-img" style="display:' + (i === 0 ? 'block' : 'none') + '">';
        });

        var html = '<div class="quantwp-gallery-content">'
            + '<button class="quantwp-lightbox-close">&times;</button>'
            + imgsHtml
            + '<button class="quantwp-gallery-nav quantwp-gallery-prev">&#x2039;</button>'
            + '<button class="quantwp-gallery-nav quantwp-gallery-next">&#x203a;</button>'
            + '</div>';

        $('.quantwp-lightbox-container').html(html);
        $('.quantwp-lightbox-overlay').addClass('active');

        $('.quantwp-gallery-prev').prop('disabled', true);
        $('.quantwp-gallery-next').prop('disabled', gallery.length <= 1);

        function showImage(newIdx) {
            $('.quantwp-gallery-img').hide().eq(newIdx).show();
            $('.quantwp-gallery-prev').prop('disabled', newIdx === 0);
            $('.quantwp-gallery-next').prop('disabled', newIdx === gallery.length - 1);
        }

        $('.quantwp-gallery-prev').off('click').on('click', function (e) {
            e.stopPropagation();
            if (idx > 0) { idx--; showImage(idx); }
        });
        $('.quantwp-gallery-next').off('click').on('click', function (e) {
            e.stopPropagation();
            if (idx < gallery.length - 1) { idx++; showImage(idx); }
        });

        var touchStartX = 0, touchEndX = 0;
        $('.quantwp-gallery-content')
            .on('touchstart', function (e) { touchStartX = e.changedTouches[0].screenX; })
            .on('touchend', function (e) {
                touchEndX = e.changedTouches[0].screenX;
                if (touchEndX < touchStartX - 50 && idx < gallery.length - 1) { idx++; showImage(idx); }
                if (touchEndX > touchStartX + 50 && idx > 0) { idx--; showImage(idx); }
            });
    });

    // ─── Observers & triggers ─────────────────────────────────────────────────

    // Directly listen to the trigger click — no MutationObserver needed.
    // side-cart.js toggles the sidecart on this same click, so by the time
    // our handler runs the sidecart is opening. No body class watching required.
    $(document).on('click', '.quantwp-sidecart-trigger', function () {
        loadCrossSells();
    });

    // Cart item removed — extractCartIds already updated by side-cart.js
    // before this event fires, so quantwpCartProductIds is accurate here.
    $(document.body).on('quantwp_cart_item_removed', function () {
        // Rebuild addedToCartIds to only keep products still in cart
        // so removed products can reappear in the carousel
        addedToCartIds = addedToCartIds.filter(function (id) {
            return window.quantwpCartProductIds.indexOf(id) !== -1;
        });
        $('.quantwp-cross-sells-wrapper').data('loaded', 0);
        loadCrossSells();
    });

    // External add to cart (product page, blocks) — reload carousel
    $(document.body).on('added_to_cart', function () {
        $('.quantwp-cross-sells-wrapper').data('loaded', 0);
        if ($('body').hasClass('quantwp-sidecart-open')) {
            loadCrossSells();
        }
    });

});