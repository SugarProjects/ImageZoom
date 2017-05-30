(function (root, factory) {
    'use strict';
    if(typeof define === 'function' && define.amd) {
        define(['jquery'], function($){
            factory($);
        });
    } else if(typeof module === 'object' && module.exports) {
        module.exports = (root.spZoom = factory(require('jquery')));
    } else {
        root.spZoom = factory(root.jQuery);
    }
}(this, function ($) {

    'use strict';

    var dw, dh, rw, rh, lx, ly;

    var defaults = {

        // The text to display within the notice box while loading the zoom image.
        loadingNotice: 'Loading image',

        // The text to display within the notice box if an error occurs when loading the zoom image.
        errorNotice: 'The image could not be loaded',

        // The time (in milliseconds) to display the error notice.
        errorDuration: 2500,

        // Attribute to retrieve the zoom image URL from.
        linkAttribute: 'href',

        // Prevent clicks on the zoom image link.
        preventClicks: true,

        // Callback function to execute before the flyout is displayed.
        beforeShow: $.noop,

        // Callback function to execute before the flyout is removed.
        beforeHide: $.noop,

        // Callback function to execute when the flyout is displayed.
        onShow: $.noop,

        // Callback function to execute when the flyout is removed.
        onHide: $.noop,

        // Callback function to execute when the cursor is moved while over the image.
        onMove: $.noop

    };

    /**
     * spZoom
     * @constructor
     * @param {Object} target
     * @param {Object} options (Optional)
     */
    function spZoom(target, options) {
        this.$target = $(target);
        this.opts = $.extend({}, defaults, options, this.$target.data());

        this.isOpen === undefined && this._init();
    }

    /**
     * Init
     * @private
     */
    spZoom.prototype._init = function() {
        this.$link   = this.$target.find('a');
        this.$image  = this.$target.find('img');
        this.$container = $('<div class="spZoom spZoom--overlay"></div>');
        this.$target.append(this.$container);

        this.$flyout = $('<div class="spZoom-flyout" />');
        this.$notice = $('<div class="spZoom-notice" />');

        this.$container.on({
            'mousemove.spZoom touchmove.spZoom': $.proxy(this._onMove, this),
            'mouseleave.spZoom touchend.spZoom': $.proxy(this._onLeave, this),
            'mouseenter.spZoom touchstart.spZoom': $.proxy(this._onEnter, this)
        });

        this.opts.preventClicks && this.$container.on('click.spZoom', function(e) {
            e.preventDefault();
        });
    };

    /**
     * Show
     * @param {MouseEvent|TouchEvent} e
     * @param {Boolean} testMouseOver (Optional)
     */
    spZoom.prototype.show = function(e, testMouseOver) {
        var w1, h1, w2, h2;
        var self = this;

        if (this.opts.beforeShow.call(this) === false) return;

        if (!this.isReady) {
            if ($.isEmptyObject(this.$link)) {
                return this._loadImage(this.$link.attr(this.opts.linkAttribute), function() {
                    if (self.isMouseOver || !testMouseOver) {
                        self.show(e);
                    }
                });
            } else {
                return this._loadImage(this.$image.attr('src'), function() {
                    if (self.isMouseOver || !testMouseOver) {
                        self.show(e);
                    }
                });
            }
        }

        this.$container.append(this.$flyout);

        w1 = this.$container.width();
        h1 = this.$container.height();

        w2 = this.$flyout.width();
        h2 = this.$flyout.height();

        dw = this.$zoom.width() - w2;
        dh = this.$zoom.height() - h2;

        // For the case where the zoom image is actually smaller than
        // the flyout.
        if (dw < 0) dw = 0;
        if (dh < 0) dh = 0;

        rw = dw / w1;
        rh = dh / h1;

        this.isOpen = true;

        this.opts.onShow.call(this);

        e && this._move(e);
    };

    /**
     * On enter
     * @private
     * @param {Event} e
     */
    spZoom.prototype._onEnter = function(e) {
        var touches = e.originalEvent.touches;

        this.isMouseOver = true;

        if (!touches || touches.length == 1) {
            e.preventDefault();
            this.show(e, true);
        }
    };

    /**
     * On move
     * @private
     * @param {Event} e
     */
    spZoom.prototype._onMove = function(e) {
        if (!this.isOpen) return;

        e.preventDefault();
        this._move(e);
    };

    /**
     * On leave
     * @private
     */
    spZoom.prototype._onLeave = function() {
        this.isMouseOver = false;
        this.isOpen && this.hide();
    };

    /**
     * On load
     * @private
     * @param {Event} e
     */
    spZoom.prototype._onLoad = function(e) {
        // IE may fire a load event even on error so test the image dimensions
        if (!e.currentTarget.width) return;

        this.isReady = true;

        this.$notice.detach();
        this.$flyout.html(this.$zoom);
        this.$container.removeClass('is-loading').addClass('is-ready');

        e.data.call && e.data();
    };

    /**
     * On error
     * @private
     */
    spZoom.prototype._onError = function() {
        var self = this;

        this.$notice.text(this.opts.errorNotice);
        this.$container.removeClass('is-loading').addClass('is-error');

        this.detachNotice = setTimeout(function() {
            self.$notice.detach();
            self.detachNotice = null;
        }, this.opts.errorDuration);
    };

    /**
     * Load image
     * @private
     * @param {String} href
     * @param {Function} callback
     */
    spZoom.prototype._loadImage = function(href, callback) {
        var zoom = new Image;

        this.$container
            .addClass('is-loading')
            .append(this.$notice.text(this.opts.loadingNotice));

        this.$zoom = $(zoom)
            .on('error', $.proxy(this._onError, this))
            .on('load', callback, $.proxy(this._onLoad, this));

        zoom.style.position = 'absolute';
        zoom.src = href;
    };

    /**
     * Move
     * @private
     * @param {Event} e
     */
    spZoom.prototype._move = function(e) {

        if (e.type.indexOf('touch') === 0) {
            var touchlist = e.touches || e.originalEvent.touches;
            lx = touchlist[0].pageX;
            ly = touchlist[0].pageY;
        } else {
            lx = e.pageX || lx;
            ly = e.pageY || ly;
        }

        var offset  = this.$container.offset();
        var pt = ly - offset.top;
        var pl = lx - offset.left;
        var xt = Math.ceil(pt * rh);
        var xl = Math.ceil(pl * rw);

        // Close if outside
        if (xl < 0 || xt < 0 || xl > dw || xt > dh) {
            this.hide();
        } else {
            var top = xt * -1;
            var left = xl * -1;

            this.$zoom.css({
                top: top,
                left: left
            });

            this.opts.onMove.call(this, top, left);
        }

    };

    /**
     * Hide
     */
    spZoom.prototype.hide = function() {
        if (!this.isOpen) return;
        if (this.opts.beforeHide.call(this) === false) return;

        this.$flyout.detach();
        this.isOpen = false;

        this.opts.onHide.call(this);
    };

    /**
     * Swap
     * @param {String} standardSrc
     * @param {String} zoomHref
     * @param {String|Array} srcset (Optional)
     */
    spZoom.prototype.swap = function(standardSrc, zoomHref, srcset) {
        this.hide();
        this.isReady = false;

        this.detachNotice && clearTimeout(this.detachNotice);

        this.$notice.parent().length && this.$notice.detach();

        this.$container.removeClass('is-loading is-ready is-error');

        this.$image.attr({
            src: standardSrc,
            srcset: $.isArray(srcset) ? srcset.join() : srcset
        });

        this.$link.attr(this.opts.linkAttribute, zoomHref);
    };

    /**
     * Teardown
     */
    spZoom.prototype.teardown = function() {
        this.hide();

        this.$container
            .off('.spZoom')
            .removeClass('is-loading is-ready is-error');

        this.detachNotice && clearTimeout(this.detachNotice);

        delete this.$link;
        delete this.$zoom;
        delete this.$image;
        delete this.$notice;
        delete this.$flyout;
        delete this.$container;

        delete this.isOpen;
        delete this.isReady;
    };

    // jQuery plugin wrapper
    $.fn.spZoom = function(options) {
        return this.each(function() {
            var api = $.data(this, 'spZoom');

            if (!api) {
                $.data(this, 'spZoom', new spZoom(this, options));
            } else if (api.isOpen === undefined) {
                api._init();
            }
        });
    };
}));
