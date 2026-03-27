jQuery(document).ready(function ($) {

  var isUpdating = false;

  // Shared cart product IDs — read by cross-sells.js to exclude cart items
  window.quantwpCartProductIds = [];

  function extractCartIds(cart) {
    var ids = [];
    var permalinks = [];
    if (cart.items && cart.items.length) {
      cart.items.forEach(function (item) {
        if (item.id && ids.indexOf(item.id) === -1) {
          ids.push(item.id);
        }
        // Store base permalink path (strip query string) for variation matching
        if (item.permalink) {
          var basePath = item.permalink.split('?')[0].replace(/\/$/, '');
          if (permalinks.indexOf(basePath) === -1) {
            permalinks.push(basePath);
          }
        }
      });
    }
    window.quantwpCartProductIds = ids;
    window.quantwpCartPermalinks = permalinks;
  }

  var TRASH_SVG = '<svg viewBox="0 0 50 50" fill="currentColor"><path d="M10.289 14.211h3.102l1.444 25.439c0.029 0.529 0.468 0.943 0.998 0.943h18.933c0.53 0 0.969-0.415 0.998-0.944l1.421-25.438h3.104c0.553 0 1-0.448 1-1s-0.447-1-1-1h-3.741c-0.055 0-0.103 0.023-0.156 0.031c-0.052-0.008-0.1-0.031-0.153-0.031h-5.246V9.594c0-0.552-0.447-1-1-1h-9.409c-0.553 0-1 0.448-1 1v2.617h-5.248c-0.046 0-0.087 0.021-0.132 0.027c-0.046-0.007-0.087-0.027-0.135-0.027h-3.779c-0.553 0-1 0.448-1 1S9.736 14.211 10.289 14.211zM21.584 10.594h7.409v1.617h-7.409V10.594zM35.182 14.211L33.82 38.594H16.778l-1.384-24.383H35.182z"/><path d="M20.337 36.719c0.02 0 0.038 0 0.058-0.001c0.552-0.031 0.973-0.504 0.941-1.055l-1.052-18.535c-0.031-0.552-0.517-0.967-1.055-0.942c-0.552 0.031-0.973 0.504-0.941 1.055l1.052 18.535C19.37 36.308 19.811 36.719 20.337 36.719z"/><path d="M30.147 36.718c0.02 0.001 0.038 0.001 0.058 0.001c0.526 0 0.967-0.411 0.997-0.943l1.052-18.535c0.031-0.551-0.39-1.024-0.941-1.055c-0.543-0.023-1.023 0.39-1.055 0.942l-1.052 18.535C29.175 36.214 29.596 36.687 30.147 36.718z"/><path d="M25.289 36.719c0.553 0 1-0.448 1-1V17.184c0-0.552-0.447-1-1-1s-1 0.448-1 1v18.535C24.289 36.271 24.736 36.719 25.289 36.719z"/></svg>';

  function storeApiFetch(endpoint, method, body) {
    return fetch(quantwpData.storeApiUrl + endpoint, {
      method: method || 'GET',
      credentials: 'same-origin',
      headers: {
        'Content-Type': 'application/json',
        'Nonce': quantwpData.storeApiNonce,
      },
      body: body ? JSON.stringify(body) : undefined,
    }).then(function (response) {
      var freshNonce = response.headers.get('Nonce');
      if (freshNonce) quantwpData.storeApiNonce = freshNonce;
      return response.text().then(function (text) {
        var data = text ? JSON.parse(text) : null;
        if (!response.ok) {
          if (data) data._httpStatus = response.status;
          return Promise.reject(data || { _httpStatus: response.status });
        }
        return data;
      });
    });
  }

  function makeFormatter(currencyInfo) {
    var minorUnit = (currencyInfo.currency_minor_unit !== undefined && currencyInfo.currency_minor_unit !== null)
      ? parseInt(currencyInfo.currency_minor_unit, 10)
      : 2;
    var divisor = Math.pow(10, minorUnit);
    var prefix = currencyInfo.currency_prefix || '';
    var suffix = currencyInfo.currency_suffix || '';
    var decSep = currencyInfo.currency_decimal_separator || '.';
    var thousandSep = currencyInfo.currency_thousand_separator || ',';
    return function (rawAmount) {
      var display = (parseInt(rawAmount || 0, 10) / divisor).toFixed(minorUnit);
      var parts = display.split('.');
      parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, thousandSep);
      return prefix + (minorUnit > 0 ? parts.join(decSep) : parts[0]) + suffix;
    };
  }

  function buildItemHTML(item) {
    var fmtPrice = makeFormatter(item.prices);
    var fmtTotal = makeFormatter(item.totals);

    var imgSrc = (item.images && item.images.length > 0)
      ? item.images[0].thumbnail
      : quantwpData.placeholderImg;
    var imgHtml = '<img src="' + imgSrc + '" alt="' + $('<div>').text(item.name).html() + '">';

    var variationHtml = '';

    // Only focus on standard WooCommerce variations, ignoring custom item_data fields
    if (item.variation && item.variation.length > 0) {
      variationHtml += '<dl class="variation">';
      item.variation.forEach(function (v) {
        // v.attribute is the taxonomy/custom name, v.value is the chosen term
        var displayKey = $('<div>').text(v.attribute + ':').html();
        var displayVal = $('<div>').text(v.value).html();

        variationHtml += '<dt class="variation-' + v.attribute + '">' + displayKey + '</dt>';
        // Output <dd> without <p> tags to ensure CSS flexbox and comma separation work flawlessly
        variationHtml += '<dd class="variation-' + v.attribute + '">' + displayVal + '</dd>';
      });
      variationHtml += '</dl>';
    }

    var regularPrice = parseInt(item.prices.regular_price || 0, 10);
    var salePrice = parseInt(item.prices.sale_price || 0, 10);
    var isOnSale = salePrice > 0 && salePrice < regularPrice;
    var priceHtml;
    if (isOnSale) {
      priceHtml = '<ins class="sale-price" style="text-decoration:none;margin-left:5px;">' + fmtTotal(item.totals.line_subtotal) + '</ins>' +
        '<del class="original-price">' + fmtPrice(regularPrice * item.quantity) + '</del>';
    } else {
      priceHtml = fmtTotal(item.totals.line_subtotal);
    }

    return '<div class="quantwp-sidecart-item">' +
      '<div class="quantwp-sidecart-item-image">' + imgHtml + '</div>' +
      '<div class="quantwp-sidecart-item-details">' +
      '<a href="' + item.permalink + '" class="product-name">' + $('<div>').text(item.name).html() + '</a>' +
      variationHtml +
      '<div class="quantwp-sidecart-item-details-inner">' +
      '<div class="quantity-controls" data-cart-key="' + item.key + '">' +
      '<button class="qty-btn minus" data-qty-change="-1">-</button>' +
      '<input type="number" class="qty-input" value="' + item.quantity + '" readonly>' +
      '<button class="qty-btn plus" data-qty-change="1">+</button>' +
      '</div>' +
      '<button class="remove-item" data-cart-key="' + item.key + '">' + TRASH_SVG + '</button>' +
      '</div>' +
      '</div>' +
      '<div class="quantwp-sidecart-item-price">' + priceHtml + '</div>' +
      '</div>';
  }

  function updateCartDOM(cart) {
    var itemCount = cart.items_count || 0;
    var cartTotals = cart.totals || {};

    if (itemCount > 0) {
      if ($('.cart-count-badge').length === 0) {
        $('.quantwp-sidecart-trigger').append('<span class="cart-count-badge">' + itemCount + '</span>');
      } else {
        $('.cart-count-badge').text(itemCount).show();
      }
    } else {
      $('.cart-count-badge').hide();
    }

    $('.quantwp-sidecart-title').text('Cart (' + itemCount + ')');

    if (cart.items && cart.items.length > 0) {

      var allInDOM = cart.items.every(function (item) {
        return $('.quantity-controls[data-cart-key="' + item.key + '"]').length > 0;
      });

      if (allInDOM) {
        cart.items.forEach(function (item) {
          var $controls = $('.quantity-controls[data-cart-key="' + item.key + '"]');
          var $itemEl = $controls.closest('.quantwp-sidecart-item');
          var fmtPrice = makeFormatter(item.prices);
          var fmtTotal = makeFormatter(item.totals);
          var $priceEl = $itemEl.find('.quantwp-sidecart-item-price');

          $controls.find('.qty-input').val(item.quantity);

          var regularPrice = parseInt(item.prices.regular_price || 0, 10);
          var salePrice = parseInt(item.prices.sale_price || 0, 10);
          var isOnSale = salePrice > 0 && salePrice < regularPrice;

          if (isOnSale) {
            $priceEl.html(
              '<ins class="sale-price" style="text-decoration:none;margin-left:5px;">' + fmtTotal(item.totals.line_subtotal) + '</ins>' +
              '<del class="original-price">' + fmtPrice(regularPrice * item.quantity) + '</del>'
            );
          } else {
            $priceEl.html(fmtTotal(item.totals.line_subtotal));
          }
        });
      } else {
        var html = '';
        cart.items.forEach(function (item) { html += buildItemHTML(item); });
        $('.quantwp-cart-items-list').html(html);
      }

      var fmtCartTotal = makeFormatter(cartTotals);
      var subtotalFormatted = fmtCartTotal(cartTotals.total_items);

      var $footer = $('.quantwp-sidecart-footer');
      if ($footer.find('.cart-subtotal').length === 0) {
        $footer.html(
          '<div class="cart-subtotal"><span>Subtotal:</span><span>' + subtotalFormatted + '</span></div>' +
          '<a href="' + quantwpData.checkoutUrl + '" class="checkout-button">Checkout</a>'
        );
      } else {
        $('.cart-subtotal span:last-child').text(subtotalFormatted);
      }
      $footer.show();

    } else {
      $('.quantwp-cart-items-list').html(
        '<div class="quantwp-empty-state">' +
        '<p class="empty-cart-message">Your cart is empty</p>' +
        '<a href="' + quantwpData.shopUrl + '" class="quantwp-shop-button">Checkout Our Best Sellers</a>' +
        '</div>'
      );
      $('.quantwp-sidecart-footer').hide();
    }
  }

  function updateShippingBar(cart) {
    if (typeof quantwpShippingBar === 'undefined' || !quantwpShippingBar.enabled) return;

    var threshold = parseFloat(quantwpShippingBar.threshold);
    if (threshold <= 0) return;

    var cur = quantwpShippingBar.currency;
    var decimals = parseInt(cur.decimals, 10) || 0;
    var prefix = cur.prefix || '';
    var suffix = cur.suffix || '';
    var decSep = cur.decimal_separator || '.';
    var thousandSep = cur.thousand_separator || ',';

    function fmtCurrency(val) {
      var fixed = val.toFixed(decimals);
      var parts = fixed.split('.');
      parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, thousandSep);
      return prefix + (decimals > 0 ? parts.join(decSep) : parts[0]) + suffix;
    }

    var cartTotals = cart.totals || {};
    var minorUnit = (cartTotals.currency_minor_unit !== undefined && cartTotals.currency_minor_unit !== null)
      ? parseInt(cartTotals.currency_minor_unit, 10) : 2;
    var cartTotal = parseInt(cartTotals.total_items || 0, 10) / Math.pow(10, minorUnit);

    var $wrapper = $('.quantwp-shipping-bar-wrapper');

    if (cart.items_count === 0) {
      $wrapper.hide();
      return;
    }

    $wrapper.show();

    var percentage = Math.min((cartTotal / threshold) * 100, 100);
    var remaining = Math.max(threshold - cartTotal, 0);
    var qualified = cartTotal >= threshold;

    $('.progress-bar-fill').css('width', percentage.toFixed(2) + '%');

    if (qualified) {
      $('.quantwp-shipping-bar-message').html(
        '<span class="success-message">🎉 You qualify for <strong>Free Shipping</strong></span>'
      );
    } else {
      $('.quantwp-shipping-bar-message').html(
        '<span class="progress-message">Add <strong>' + fmtCurrency(remaining) + '</strong> more to get <strong>FREE Shipping</strong></span>'
      );
    }
  }

  function fetchCart() {
    return storeApiFetch('/cart', 'GET')
      .then(function (cart) {
        updateCartDOM(cart);
        updateShippingBar(cart);
        extractCartIds(cart);
        return cart;
      })
      .catch(function (err) {
        return null;
      });
  }

  function updateItem(cartKey, newQty) {
    if (isUpdating) return;
    isUpdating = true;
    $('.quantity-controls[data-cart-key="' + cartKey + '"] .qty-input').val(newQty);
    storeApiFetch('/cart/update-item', 'POST', { key: cartKey, quantity: newQty })
      .then(function (cart) {
        updateCartDOM(cart);
        updateShippingBar(cart);
      })
      .catch(function (err) { fetchCart(); })
      .finally(function () { isUpdating = false; });
  }

  function removeItem(cartKey) {
    if (isUpdating) return;
    isUpdating = true;
    $('.quantity-controls[data-cart-key="' + cartKey + '"]').closest('.quantwp-sidecart-item').fadeOut(200, function () { $(this).remove(); });
    storeApiFetch('/cart/remove-item', 'POST', { key: cartKey })
      .then(function (cart) {
        updateCartDOM(cart);
        updateShippingBar(cart);
        extractCartIds(cart);
        $(document.body).trigger('quantwp_cart_item_removed');
      })
      .catch(function (err) { fetchCart(); })
      .finally(function () { isUpdating = false; });
  }

  $(document).on('click', '.quantwp-sidecart-trigger', function (e) {
    e.preventDefault();
    $('body').toggleClass('quantwp-sidecart-open');
  });

  $(document).on('click', '.quantwp-close-button, .quantwp-sidecart-overlay', function (e) {
    e.preventDefault();
    $('body').removeClass('quantwp-sidecart-open');
  });

  $(document.body).on('added_to_cart', function () {
    if (quantwpData.autoOpen) $('body').addClass('quantwp-sidecart-open');
    fetchCart().then(function (cart) {
      if (cart) $(document.body).trigger('quantwp_cart_synced');
    });
  });

  // Cross-sell adds trigger this instead of added_to_cart to avoid
  // double cross-sell requests — cart still updates, sidecart stays open.
  $(document.body).on('quantwp_cross_sell_added', function () {
    fetchCart();
  });

  document.addEventListener('wc-blocks_added_to_cart', function () {
    if (quantwpData.autoOpen) $('body').addClass('quantwp-sidecart-open');
    fetchCart().then(function (cart) {
      if (cart) $(document.body).trigger('quantwp_cart_synced');
    });
  });

  let debounceTimer;
  let pendingUpdates = {}; // Tracks quantities locally before sending to server

  $(document).on('click', '.qty-btn', function (e) {
    e.preventDefault();

    var $wrap = $(this).closest('.quantity-controls');
    var cartKey = $wrap.data('cart-key');
    var $input = $wrap.find('.qty-input');

    // 1. Calculate the change
    var currentQty = pendingUpdates[cartKey] !== undefined
      ? pendingUpdates[cartKey]
      : parseInt($input.val(), 10);

    var change = parseInt($(this).data('qty-change'), 10);
    var newQty = Math.max(0, currentQty + change);

    // 2. Update UI Immediately (Instant Feedback)
    $input.val(newQty);
    pendingUpdates[cartKey] = newQty;

    // 3. Clear the previous "Cooling-off" timer
    clearTimeout(debounceTimer);

    // 4. Start a new timer (e.g., 500ms)
    debounceTimer = setTimeout(function () {
      if (isUpdating) return;

      var finalQty = pendingUpdates[cartKey];
      delete pendingUpdates[cartKey]; // Clear tracking

      if (finalQty === 0) {
        removeItem(cartKey);
      } else {
        updateItem(cartKey, finalQty);
      }
    }, 500);
  });

  $(document).on('click', '.remove-item', function (e) {
    e.preventDefault();
    if (isUpdating) return;
    removeItem($(this).data('cart-key'));
  });

  // Handle standard page reload add-to-cart (sessionStorage flag)
  var FLAG = 'quantwp_should_open_sidecart';
  var savedPath = sessionStorage.getItem(FLAG);
  var autoOpenOnLoad = false;

  if (savedPath) {
    sessionStorage.removeItem(FLAG); // always consume immediately
    if (quantwpData.autoOpen && savedPath === window.location.pathname) {
      autoOpenOnLoad = true;
      $('body').addClass('quantwp-sidecart-open');
    }
  }

  // Set flag on form submit BEFORE the page reloads
  $(document).on('submit', 'form.cart', function () {
    if (quantwpData.autoOpen) {
      sessionStorage.setItem(FLAG, window.location.pathname);
    }
  });

  fetchCart().then(function (cart) {
    if (autoOpenOnLoad && cart) {
      $(document.body).trigger('quantwp_cart_synced');
    }
  });

});