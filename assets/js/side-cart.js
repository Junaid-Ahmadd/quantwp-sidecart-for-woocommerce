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
        $('#quantwp-sidecart-trigger').append('<span class="cart-count-badge">' + itemCount + '</span>');
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

      // Check for free shipping
      var threshold = (typeof quantwpShippingBar !== 'undefined' && quantwpShippingBar.enabled) ? parseFloat(quantwpShippingBar.threshold) : 0;
      var minorUnit = (cartTotals.currency_minor_unit !== undefined && cartTotals.currency_minor_unit !== null)
        ? parseInt(cartTotals.currency_minor_unit, 10) : 2;
      var cartTotalAmount = parseInt(cartTotals.total_items || 0, 10) / Math.pow(10, minorUnit);
      var isFreeShipping = threshold > 0 && cartTotalAmount >= threshold;

      var shippingHtml = isFreeShipping ? '<div class="cart-shipping-free"><span>Shipping</span><span>FREE</span></div>' : '';

      var $footer = $('.quantwp-sidecart-footer');
      $footer.html(
        '<div class="cart-subtotal"><span>Subtotal</span><span>' + subtotalFormatted + '</span></div>' +
        shippingHtml +
        '<a href="' + quantwpData.checkoutUrl + '" class="checkout-button">Checkout</a>'
      );
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
        '<span class="success-message"><svg width="18" height="18" viewBox="0 0 36 36" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" aria-hidden="true" role="img" class="quantwp-free-shipping-icon" preserveAspectRatio="xMidYMid meet" fill="#000000" style="vertical-align:middle;margin-right:4px;flex-shrink:0;"><g id="SVGRepo_bgCarrier" stroke-width="0"></g><g id="SVGRepo_tracerCarrier" stroke-linecap="round" stroke-linejoin="round"></g><g id="SVGRepo_iconCarrier"><path fill="#DD2E44" d="M11.626 7.488a1.413 1.413 0 0 0-.268.395l-.008-.008L.134 33.141l.011.011c-.208.403.14 1.223.853 1.937c.713.713 1.533 1.061 1.936.853l.01.01L28.21 24.735l-.008-.009c.147-.07.282-.155.395-.269c1.562-1.562-.971-6.627-5.656-11.313c-4.687-4.686-9.752-7.218-11.315-5.656z"></path><path fill="#EA596E" d="M13 12L.416 32.506l-.282.635l.011.011c-.208.403.14 1.223.853 1.937c.232.232.473.408.709.557L17 17l-4-5z"></path><path fill="#A0041E" d="M23.012 13.066c4.67 4.672 7.263 9.652 5.789 11.124c-1.473 1.474-6.453-1.118-11.126-5.788c-4.671-4.672-7.263-9.654-5.79-11.127c1.474-1.473 6.454 1.119 11.127 5.791z"></path><path fill="#AA8DD8" d="M18.59 13.609a.99.99 0 0 1-.734.215c-.868-.094-1.598-.396-2.109-.873c-.541-.505-.808-1.183-.735-1.862c.128-1.192 1.324-2.286 3.363-2.066c.793.085 1.147-.17 1.159-.292c.014-.121-.277-.446-1.07-.532c-.868-.094-1.598-.396-2.11-.873c-.541-.505-.809-1.183-.735-1.862c.13-1.192 1.325-2.286 3.362-2.065c.578.062.883-.057 1.012-.134c.103-.063.144-.123.148-.158c.012-.121-.275-.446-1.07-.532a.998.998 0 0 1-.886-1.102a.997.997 0 0 1 1.101-.886c2.037.219 2.973 1.542 2.844 2.735c-.13 1.194-1.325 2.286-3.364 2.067c-.578-.063-.88.057-1.01.134c-.103.062-.145.123-.149.157c-.013.122.276.446 1.071.532c2.037.22 2.973 1.542 2.844 2.735c-.129 1.192-1.324 2.286-3.362 2.065c-.578-.062-.882.058-1.012.134c-.104.064-.144.124-.148.158c-.013.121.276.446 1.07.532a1 1 0 0 1 .52 1.773z"></path><path fill="#77B255" d="M30.661 22.857c1.973-.557 3.334.323 3.658 1.478c.324 1.154-.378 2.615-2.35 3.17c-.77.216-1.001.584-.97.701c.034.118.425.312 1.193.095c1.972-.555 3.333.325 3.657 1.479c.326 1.155-.378 2.614-2.351 3.17c-.769.216-1.001.585-.967.702c.033.117.423.311 1.192.095a1 1 0 1 1 .54 1.925c-1.971.555-3.333-.323-3.659-1.479c-.324-1.154.379-2.613 2.353-3.169c.77-.217 1.001-.584.967-.702c-.032-.117-.422-.312-1.19-.096c-1.974.556-3.334-.322-3.659-1.479c-.325-1.154.378-2.613 2.351-3.17c.768-.215.999-.585.967-.701c-.034-.118-.423-.312-1.192-.096a1 1 0 1 1-.54-1.923z"></path><path fill="#AA8DD8" d="M23.001 20.16a1.001 1.001 0 0 1-.626-1.781c.218-.175 5.418-4.259 12.767-3.208a1 1 0 1 1-.283 1.979c-6.493-.922-11.187 2.754-11.233 2.791a.999.999 0 0 1-.625.219z"></path><path fill="#77B255" d="M5.754 16a1 1 0 0 1-.958-1.287c1.133-3.773 2.16-9.794.898-11.364c-.141-.178-.354-.353-.842-.316c-.938.072-.849 2.051-.848 2.071a1 1 0 1 1-1.994.149c-.103-1.379.326-4.035 2.692-4.214c1.056-.08 1.933.287 2.552 1.057c2.371 2.951-.036 11.506-.542 13.192a1 1 0 0 1-.958.712z"></path><circle fill="#5C913B" cx="25.5" cy="9.5" r="1.5"></circle><circle fill="#9266CC" cx="2" cy="18" r="2"></circle><circle fill="#5C913B" cx="32.5" cy="19.5" r="1.5"></circle><circle fill="#5C913B" cx="23.5" cy="31.5" r="1.5"></circle><circle fill="#FFCC4D" cx="28" cy="4" r="2"></circle><circle fill="#FFCC4D" cx="32.5" cy="8.5" r="1.5"></circle><circle fill="#FFCC4D" cx="29.5" cy="12.5" r="1.5"></circle><circle fill="#FFCC4D" cx="7.5" cy="23.5" r="1.5"></circle></g></svg> You qualify for <strong>Free Shipping</strong></span>'
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

  $(document).on('click', '#quantwp-sidecart-trigger', function (e) {
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