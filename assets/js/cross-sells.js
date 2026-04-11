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

    // ─── Build card HTML ──────────────────────────────────────────────────────
    function buildCardHTML(product) {
        var galleryAttr = esc(JSON.stringify(product.gallery_html || []));
        var hasGallery = product.gallery_html && product.gallery_html.length > 1;

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
            + '<span class="product-name">' + product.name + '</span>'
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
        if (!$wrapper.length) return;

        if ($('.quantwp-empty-state').length > 0) { $wrapper.hide(); return; }

        if ($wrapper.data('loaded') === 1) { $wrapper.show(); return; }

        $wrapper.data('loaded', 1);

        fetch(quantwpCrossSells.crossSellsApiUrl, { credentials: 'same-origin' })
            .then(function (r) { return r.json(); })
            .then(function (data) {

                if (!data.products || !data.products.length) {
                    $wrapper.html('').hide();
                    return;
                }

                var cartIds = window.quantwpCartProductIds || [];
                var cartPermalinks = window.quantwpCartPermalinks || [];

                var products = data.products.filter(function (p) {
                    var inAdded = addedToCartIds.indexOf(p.id) !== -1;
                    var inCart = cartIds.indexOf(p.id) !== -1;
                    var basePath = p.permalink ? p.permalink.split('?')[0].replace(/\/$/, '') : '';
                    var inPermalinks = basePath ? cartPermalinks.indexOf(basePath) !== -1 : false;
                    return !inAdded && !inCart && !inPermalinks;
                });
                // Limit to 5 cross-sells
                products = products.slice(0, 5);

                if (!products.length) {
                    $wrapper.html('').hide();
                    return;
                }

                var html = '<div class="cross-sells-header"><h4>You May Also Like</h4></div>'
                    + '<div class="cross-sells-list">';

                products.forEach(function (p) { html += buildCardHTML(p); });

                html += '</div>';

                $wrapper.html(html).fadeIn(200);
            })
            .catch(function (err) {
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
            + '<button class="quantwp-variation-close"><svg viewBox="-0.5 0 25 25" fill="none" xmlns="http://www.w3.org/2000/svg"><g id="SVGRepo_bgCarrier" stroke-width="0"></g><g id="SVGRepo_tracerCarrier" stroke-linecap="round" stroke-linejoin="round"></g><g id="SVGRepo_iconCarrier"> <path d="M3 21.32L21 3.32001" stroke="#000000" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"></path> <path d="M3 3.32001L21 21.32" stroke="#000000" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"></path> </g></svg></button>'
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


        fetch(quantwpCrossSells.crossSellsApiUrl + '/variation/' + productId)
            .then(function (r) { return r.json(); })
            .then(function (data) {
                variationCache[productId] = data;
                openVariationLightbox(productId, title, data, cardImage);
            })
            .catch(function (err) {
            });
    });

    // ─── Simple product Add click ─────────────────────────────────────────────
    $(document).on('click', '.add-to-cart-btn:not([data-variable])', function (e) {
        e.preventDefault();
        var $btn = $(this);
        var productId = parseInt($btn.data('product-id'), 10);
        if (!productId) return;

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
                markAdded(productId);
                $btn.closest('.cross-sell-item').fadeOut(300, function () {
                    $(this).remove();
                    loadCrossSells();
                });
                $(document.body).trigger('quantwp_cross_sell_added');
            })
            .catch(function (err) {
            });
    });

    // ─── Gallery lightbox ─────────────────────────────────────────────────────
    if ($('.quantwp-lightbox-overlay').length === 0) {
        $('body').append('<div id="quantwp-lightbox-overlay" class="quantwp-lightbox-overlay"><button class="quantwp-lightbox-close"><svg viewBox="-0.5 0 25 25" fill="none" xmlns="http://www.w3.org/2000/svg"><g id="SVGRepo_bgCarrier" stroke-width="0"></g><g id="SVGRepo_tracerCarrier" stroke-linecap="round" stroke-linejoin="round"></g><g id="SVGRepo_iconCarrier"> <path d="M3 21.32L21 3.32001" stroke="#000000" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"></path> <path d="M3 3.32001L21 21.32" stroke="#000000" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"></path> </g></svg></button><div class="quantwp-lightbox-container"></div></div>');
    }

    $(document).on('click', '.quantwp-lightbox-overlay', function (e) {
        if ($(e.target).hasClass('quantwp-lightbox-overlay') || $(e.target).hasClass('quantwp-lightbox-container')) {
            closeLightbox();
        }
    });
    $(document).on('click', '.quantwp-lightbox-close, .quantwp-variation-close', function () { closeLightbox(); });

    $(document).on('click', '.product-image-wrapper', function (e) {
        e.preventDefault();
        var gallery = $(this).data('gallery');
        if (!gallery || gallery.length <= 1) return;

        var idx = 0;

        var imgsHtml = '';
        gallery.forEach(function (html, i) {
            var $img = $(html);
            $img.addClass('quantwp-gallery-img').css('display', (i === 0 ? 'block' : 'none'));
            imgsHtml += $img.prop('outerHTML');
        });

        var html = '<div class="quantwp-gallery-content">'
            + imgsHtml
            + '</div>'
            + '<button class="quantwp-gallery-nav quantwp-gallery-prev"><svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" stroke="#ffffff"><g id="SVGRepo_bgCarrier" stroke-width="0"></g><g id="SVGRepo_tracerCarrier" stroke-linecap="round" stroke-linejoin="round"></g><g id="SVGRepo_iconCarrier"> <path d="M14.2893 5.70708C13.8988 5.31655 13.2657 5.31655 12.8751 5.70708L7.98768 10.5993C7.20729 11.3805 7.2076 12.6463 7.98837 13.427L12.8787 18.3174C13.2693 18.7079 13.9024 18.7079 14.293 18.3174C14.6835 17.9269 14.6835 17.2937 14.293 16.9032L10.1073 12.7175C9.71678 12.327 9.71678 11.6939 10.1073 11.3033L14.2893 7.12129C14.6799 6.73077 14.6799 6.0976 14.2893 5.70708Z" fill="#ffffff"></path> </g></svg></button>'
            + '<button class="quantwp-gallery-nav quantwp-gallery-next"><svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" stroke="#ffffff"><g id="SVGRepo_bgCarrier" stroke-width="0"></g><g id="SVGRepo_tracerCarrier" stroke-linecap="round" stroke-linejoin="round"></g><g id="SVGRepo_iconCarrier"> <path d="M9.71069 18.2929C10.1012 18.6834 10.7344 18.6834 11.1249 18.2929L16.0123 13.4006C16.7927 12.6195 16.7924 11.3537 16.0117 10.5729L11.1213 5.68254C10.7308 5.29202 10.0976 5.29202 9.70708 5.68254C9.31655 6.07307 9.31655 6.70623 9.70708 7.09676L13.8927 11.2824C14.2833 11.6729 14.2833 12.3061 13.8927 12.6966L9.71069 16.8787C9.32016 17.2692 9.32016 17.9023 9.71069 18.2929Z" fill="#ffffff"></path> </g></svg></button>';

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
        $('#quantwp-lightbox-overlay')
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
    $(document.body).on('quantwp_cart_synced', function () {
        $('.quantwp-cross-sells-wrapper').data('loaded', 0);
        if ($('body').hasClass('quantwp-sidecart-open')) {
            loadCrossSells();
        }
    });

});