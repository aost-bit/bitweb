(function (BitWeb) {
  "use strict";

  BitWeb.DialogWidget = (function () {
    var className = "DialogWidget";

    function DialogWidget(params) {
      if (!(this instanceof DialogWidget)) {
        return new DialogWidget();
      }

      var self = this;

      self.params = params || {};

      self.id = "";
      self.options = {};

      self.dialog = undefined;

      self.owner = ko.observable();
      self.callback = function () { return true; };

      var isVisible = ko.observable(false);

      self.isVisible = ko.pureComputed(function () {
        return isVisible();
      }, self);

      self._visible = function () {
        if (!isVisible()) {
          isVisible(true);
        }
        return self;
      };

      self._invisible = function () {
        if (isVisible()) {
          isVisible(false);
        }
        return self;
      };

      self._open = function () {
        self._invisible();

        if (self.dialog) {
          self.dialog.customDialog("open");
        }

        self._visible();

        return self;
      };

      self._close = function () {
        if (self.dialog) {
          self.dialog.customDialog("close");
        }

        self._invisible();

        return self;
      };

      self = $.extend(self, self.params);
      return self;
    }

    DialogWidget.prototype.open = function (owner, closeHandler) {
      var self = this;

      if (!owner) {
        return self;
      }

      self.owner(owner);

      if (bitlib.common.isFunction(closeHandler)) {
        self.callback = closeHandler;
      }

      self._open();

      return self;
    };

    DialogWidget.prototype.ok = function () {
      var self = this;

      var closable = self.callback.apply(self, [self.owner()]);
      if (closable === true || closable === undefined) {
        self._close();
      }

      return self;
    };

    DialogWidget.prototype.cancel = function () {
      this._close();
      return this;
    };

    DialogWidget.getClassName = function () {
      return className;
    };

    return DialogWidget;
  }());

  BitWeb.DialogWidgetFactory = (function () {
    var className = "DialogWidgetFactory";

    function DialogWidgetWrapper() {
      if (!(this instanceof DialogWidgetWrapper)) {
        return new DialogWidgetWrapper();
      }

      var self = this;

      self.owner = undefined; // DialogWidget

      self.isVisible = ko.pureComputed(function () {
        return self.owner.isVisible();
      }, self);

      self.open = function (owner, closeHandler) {
        self.owner.open(owner, closeHandler);

        if (self.owner.options.alignCenter) {
          var windowHalfWidth = $(window).width() / 2.0;
          var windowHalfHeight = $(window).height() / 2.0;

          // コンテンツ要素を中心に配置する
          var $contents = $("#" + self.owner.id);

          var x = windowHalfWidth - ($contents.width() / 2.0);
          var y = windowHalfHeight - ($contents.height() / 2.0);

          // ウィンドウ位置をドキュメント座標に
          x += window.pageXOffset || document.documentElement.scrollLeft;
          y += window.pageYOffset || document.documentElement.scrollTop;

          y = (50 < y) ? (y - 50) : y; // 「閉じる」ボタン分だけちょっと下げる。

          $("#" + self.owner.id)
            .parent(".ui-dialog")
            .css({
              left: (x + "px"),
              top: (y + "px")
            });
        }
      };

      self.ok = function () {
        self.owner.ok();
      };

      self.cancel = function () {
        self.owner.cancel();
      };

      return self;
    }

    function DialogWidgetFactory() {
      if (!(this instanceof DialogWidgetFactory)) {
        return new DialogWidgetFactory();
      }

      // singleton
      if (DialogWidgetFactory.prototype._singletonInstance) {
        return DialogWidgetFactory.prototype._singletonInstance;
      }
      var self = this;
      DialogWidgetFactory.prototype._singletonInstance = self;

      return self;
    }

    DialogWidgetFactory.getClassName = function () {
      return className;
    };

    DialogWidgetFactory.create = function (widgetName, options) {
      if (!widgetName) {
        bitlib.logger.error("widget が指定されていません.");
        return null;
      }

      var self = this;

      if ($[widgetName]) {
        return $[widgetName];
      }

      options = $.extend({
        title: "",
        autoOpen: false,
        width: "auto",
        height: "auto",
        modal: true,
        resizable: false,
        buttons: {
          "ＯＫ": function () {
            $[widgetName].ok();
          },
          "ｷｬﾝｾﾙ": function () {
            $[widgetName].cancel();
          }
        },
        closeOnEscape: false,
        dialogClass: "",
        classes: {},
        dialogOptions: null,
        // callbacks
        open: null,
        close: null,
        overflow: true,
        alignCenter: true
      }, (options || {}));

      if (bitlib.common.isNullOrUndefined(options.open) && bitlib.common.isNullOrUndefined(options.close) && !bitlib.common.toBoolean(options.overflow)) {
        options.open = function () {
          $("body").css("overflow", "hidden");
        };

        options.close = function () {
          $("body").css("overflow", "visible");
        };
      }

      var dialogWidget,
        dialogId = widgetName.toLowerCase() + "-dialog",
        template = widgetName + "Template";

      $.widget("BitWeb." + widgetName, {
        _create: function () {
          if ($[widgetName].initialized === true) {
            // 生成済み
            return;
          }

          dialogWidget = new BitWeb.DialogWidget({
            id: dialogId,
            options: options
          });

          $[widgetName].owner = dialogWidget;

          var $screen = $("body").find("#" + dialogId),
            createNew = !$screen.length;

          if (createNew) {
            // jquery ui dialog 用の div 作成.
            $('<div class="bit-widget-dialog" id="' + dialogId + '" title="' + options.title + '" style="display: none;">' +
              '<div class="bit-widget-dialog-contents" data-bind="visible: isVisible">' +
              '<!-- ko template: { name: "' + template + '" } --> <!-- /ko -->' +
              '</div>' +
              '</div>').appendTo("body");
          }

          this.initDialog();
          $[widgetName].initialized = true;
        },
        _init: function () {
          // 初期化
        },
        _destroy: function () {
          // 破棄... singleton なので特に何もしない
        },
        initDialog: function () {
          var $divNode = $("#" + dialogId);

          ko.cleanNode($divNode[0]); // knockout 2.3.0 update 対応.[You cannot apply bindings multiple times to the same element]

          $divNode.customDialog(this.options);
          ko.applyBindings(dialogWidget, $divNode[0]);

          dialogWidget.dialog = $divNode;
        },
        open: function () {
          var owner = ko.dataFor(this.element[0]);
          $[widgetName].open(owner);
        },
        ok: function () {
          $[widgetName].ok();
        },
        cancel: function () {
          $[widgetName].cancel();
        },
        options: options
      });

      var newWidget = $[widgetName] = new DialogWidgetWrapper(); // singleton facade
      newWidget.initialized = false;

      return newWidget;
    };

    return DialogWidgetFactory;
  }());

  BitWeb.ViewboxWidget = (function () {
    var className = "ViewboxWidget";

    function ViewboxWidget(params) {
      if (!(this instanceof ViewboxWidget)) {
        return new ViewboxWidget();
      }

      var self = this;

      self.params = params || {};

      self.id = "";
      self.options = {};

      self.viewbox = undefined;

      self.owner = ko.observable();
      self.callback = function () { return true; };

      var isVisible = ko.observable(false);

      self.isVisible = ko.pureComputed(function () {
        return isVisible();
      }, self);

      self._visible = function () {
        if (!isVisible()) {
          isVisible(true);
        }
        return self;
      };

      self._invisible = function () {
        if (isVisible()) {
          isVisible(false);
        }
        return self;
      };

      self._open = function () {
        self._invisible();

        if (self.viewbox) {
          self.viewbox.customDialog("open");
        }

        self._visible();

        return self;
      };

      self._close = function () {
        if (self.viewbox) {
          self.viewbox.customDialog("close");
        }

        self._invisible();

        return self;
      };

      self = $.extend(self, self.params);
      return self;
    }

    ViewboxWidget.prototype.open = function (owner, closeHandler) {
      var self = this;

      if (!owner) {
        return self;
      }

      self.owner(owner);

      if (bitlib.common.isFunction(closeHandler)) {
        self.callback = closeHandler;
      }

      self._open();

      return self;
    };

    ViewboxWidget.prototype.ok = function () {
      var self = this;

      var closable = self.callback.apply(self, [self.owner()]);
      if (closable === true || closable === undefined) {
        self._close();
      }

      return self;
    };

    ViewboxWidget.prototype.close = function () {
      this._close();
      return this;
    };

    ViewboxWidget.getClassName = function () {
      return className;
    };

    return ViewboxWidget;
  }());

  BitWeb.ViewboxWidgetFactory = (function () {
    var className = "ViewboxWidgetFactory";

    function ViewboxWidgetWrapper() {
      if (!(this instanceof ViewboxWidgetWrapper)) {
        return new ViewboxWidgetWrapper();
      }

      var self = this;

      self.owner = undefined; // ViewboxWidget

      self.isVisible = ko.pureComputed(function () {
        return self.owner.isVisible();
      }, self);

      self.open = function (owner, closeHandler) {
        self.owner.open(owner, closeHandler);

        if (self.owner.options.alignCenter) {
          var windowHalfWidth = $(window).width() / 2.0;
          var windowHalfHeight = $(window).height() / 2.0;

          // コンテンツ要素を中心に配置する
          var $contents = $("#" + self.owner.id);

          var x = windowHalfWidth - ($contents.width() / 2.0);
          var y = windowHalfHeight - ($contents.height() / 2.0);

          // ウィンドウ位置をドキュメント座標に
          x += window.pageXOffset || document.documentElement.scrollLeft;
          y += window.pageYOffset || document.documentElement.scrollTop;

          y = (50 < y) ? (y - 50) : y; // 「閉じる」ボタン分だけちょっと下げる。

          $("#" + self.owner.id)
            .parent(".ui-dialog")
            .css({
              left: (x + "px"),
              top: (y + "px")
            });
        }
      };

      self.ok = function () {
        self.owner.ok();
      };

      self.close = function () {
        self.owner.close();
      };

      return self;
    }

    function ViewboxWidgetFactory() {
      if (!(this instanceof ViewboxWidgetFactory)) {
        return new ViewboxWidgetFactory();
      }

      // singleton
      if (ViewboxWidgetFactory.prototype._singletonInstance) {
        return ViewboxWidgetFactory.prototype._singletonInstance;
      }
      var self = this;
      ViewboxWidgetFactory.prototype._singletonInstance = self;

      return self;
    }

    ViewboxWidgetFactory.getClassName = function () {
      return className;
    };

    ViewboxWidgetFactory.create = function (widgetName, options) {
      if (!widgetName) {
        bitlib.logger.error("widget が指定されていません.");
        return null;
      }

      var self = this;

      if ($[widgetName]) {
        return $[widgetName];
      }

      options = $.extend({
        title: "",
        autoOpen: false,
        width: "auto",
        height: "auto",
        modal: true,
        resizable: false,
        buttons: {
          "閉じる": function () {
            $[widgetName].close();
          }
        },
        closeOnEscape: false,
        dialogClass: "",
        classes: {},
        dialogOptions: null,
        // callbacks
        open: null,
        close: null,
        overflow: true,
        alignCenter: true
      }, (options || {}));

      if (bitlib.common.isNullOrUndefined(options.open) && bitlib.common.isNullOrUndefined(options.close) && !bitlib.common.toBoolean(options.overflow)) {
        options.open = function () {
          $("body").css("overflow", "hidden");
        };

        options.close = function () {
          $("body").css("overflow", "visible");
        };
      }

      var viewboxWidget,
        viewboxId = widgetName.toLowerCase() + "-viewbox",
        template = widgetName + "Template";

      $.widget("BitWeb." + widgetName, {
        _create: function () {
          if ($[widgetName].initialized === true) {
            // 生成済み
            return;
          }

          viewboxWidget = new BitWeb.ViewboxWidget({
            id: viewboxId,
            options: options
          });

          $[widgetName].owner = viewboxWidget;

          var $screen = $("body").find("#" + viewboxId),
            createNew = !$screen.length;

          if (createNew) {
            // jquery ui viewbox 用の div 作成.
            $('<div class="bit-widget-viewbox" id="' + viewboxId + '" title="' + options.title + '" style="display: none;">' +
              '<div class="bit-widget-viewbox-contents" data-bind="visible: isVisible">' +
              '<!-- ko template: { name: "' + template + '" } --> <!-- /ko -->' +
              '</div>' +
              '</div>').appendTo("body");
          }

          this.initViewbox();
          $[widgetName].initialized = true;
        },
        _init: function () {
          // 初期化
        },
        _destroy: function () {
          // 破棄... singleton なので特に何もしない
        },
        initViewbox: function () {
          var $divNode = $("#" + viewboxId);

          ko.cleanNode($divNode[0]); // knockout 2.3.0 update 対応.[You cannot apply bindings multiple times to the same element]

          $divNode.customDialog(this.options);
          ko.applyBindings(viewboxWidget, $divNode[0]);

          viewboxWidget.viewbox = $divNode;
        },
        open: function () {
          var owner = ko.dataFor(this.element[0]);
          $[widgetName].open(owner);
        },
        ok: function () {
          $[widgetName].ok();
        },
        close: function () {
          $[widgetName].close();
        },
        options: options
      });

      var newWidget = $[widgetName] = new ViewboxWidgetWrapper(); // singleton facade
      newWidget.initialized = false;

      return newWidget;
    };

    return ViewboxWidgetFactory;
  }());

  BitWeb.OverlayWidget = (function () {
    var className = "OverlayWidget";

    function OverlayWidget(params) {
      if (!(this instanceof OverlayWidget)) {
        return new OverlayWidget();
      }

      var self = this;

      self.params = params || {};

      self.id = "";
      self.options = {};

      self.overlay = undefined;

      self.owner = ko.observable();
      self.callback = function () { return true; };

      var isVisible = ko.observable(false);

      self.isVisible = ko.pureComputed(function () {
        return isVisible();
      }, self);

      self._visible = function () {
        if (!isVisible()) {
          isVisible(true);
        }
        return self;
      };

      self._invisible = function () {
        if (isVisible()) {
          isVisible(false);
        }
        return self;
      };

      var timeIn = false; // 誤操作防止用フラグ

      self._open = function () {
        self._invisible();

        if (self.overlay) {
          timeIn = false;

          self.overlay.fadeIn("fast");

          setTimeout(function () {
            timeIn = true;
          }, 500);
        }

        self._visible();

        if (!bitlib.common.toBoolean(self.options.overflow)) {
          $("body").css("overflow", "hidden");
        }

        return self;
      };

      self._close = function () {
        if (!timeIn) {
          return self;
        }

        if (self.overlay) {
          self.overlay.fadeOut("fast");
        }

        self._invisible();

        if (!bitlib.common.toBoolean(self.options.overflow)) {
          $("body").css("overflow", "visible");
        }

        return self;
      };

      self = $.extend(self, self.params);
      return self;
    }

    OverlayWidget.prototype.open = function (owner, closeHandler) {
      var self = this;

      if (!owner) {
        return self;
      }

      self.owner(owner);

      if (bitlib.common.isFunction(closeHandler)) {
        self.callback = closeHandler;
      }

      self._open();

      return self;
    };

    OverlayWidget.prototype.ok = function () {
      var self = this;

      var closable = self.callback.apply(self, [self.owner()]);
      if (closable === true || closable === undefined) {
        self._close();
      }

      return self;
    };

    OverlayWidget.prototype.close = function () {
      this._close();
      return this;
    };

    OverlayWidget.getClassName = function () {
      return className;
    };

    return OverlayWidget;
  }());

  BitWeb.OverlayWidgetFactory = (function () {
    var className = "OverlayWidgetFactory";

    function OverlayWidgetWrapper() {
      if (!(this instanceof OverlayWidgetWrapper)) {
        return new OverlayWidgetWrapper();
      }

      var self = this;

      self.owner = undefined; // OverlayWidget

      self.isVisible = ko.pureComputed(function () {
        return self.owner.isVisible();
      }, self);

      self.open = function (owner, closeHandler) {
        var $document = $(document);

        $("#" + self.owner.id)
          .css({
            width: $document.width() + "px",
            height: $document.height() + "px"
          });

        self.owner.open(owner, closeHandler);

        var windowHalfWidth = $(window).width() / 2.0;
        var windowHalfHeight = $(window).height() / 2.0;

        // コンテンツ要素を中心に配置する
        var $contents = $("#" + self.owner.id + ">div");

        var x = windowHalfWidth - ($contents.width() / 2.0);
        var y = windowHalfHeight - ($contents.height() / 2.0);

        // ウィンドウ位置をドキュメント座標に
        x += window.pageXOffset || document.documentElement.scrollLeft;
        y += window.pageYOffset || document.documentElement.scrollTop;

        y = (50 < y) ? (y - 50) : y; // 「閉じる」ボタン分だけちょっと下げる。

        $contents
          .css({
            left: (x + "px"),
            top: (y + "px")
          });
      };

      self.ok = function () {
        self.owner.ok();
      };

      self.close = function () {
        self.owner.close();
      };

      return self;
    }

    function OverlayWidgetFactory() {
      if (!(this instanceof OverlayWidgetFactory)) {
        return new OverlayWidgetFactory();
      }

      // singleton
      if (OverlayWidgetFactory.prototype._singletonInstance) {
        return OverlayWidgetFactory.prototype._singletonInstance;
      }
      var self = this;
      OverlayWidgetFactory.prototype._singletonInstance = self;

      return self;
    }

    OverlayWidgetFactory.getClassName = function () {
      return className;
    };

    OverlayWidgetFactory.create = function (widgetName, options) {
      if (!widgetName) {
        bitlib.logger.error("widget が指定されていません.");
        return null;
      }

      var self = this;

      if ($[widgetName]) {
        return $[widgetName];
      }

      options = $.extend({
        title: "",
        overflow: true
      }, (options || {}));

      var overlayWidget,
        overlayId = widgetName.toLowerCase() + "-overlay",
        template = widgetName + "Template";

      $.widget("BitWeb." + widgetName, {
        _create: function () {
          if ($[widgetName].initialized === true) {
            // 生成済み
            return;
          }

          overlayWidget = new BitWeb.OverlayWidget({
            id: overlayId,
            options: options
          });

          $[widgetName].owner = overlayWidget;

          var $screen = $("body").find("#" + overlayId),
            createNew = !$screen.length;

          if (createNew) {
            // jquery ui overlay 用の div 作成.
            $('<div class="bit-widget-overlay" id="' + overlayId + '" title="' + options.title + '" data-bind="click: ok">' +
              '<div class="bit-widget-overlay-contents" data-bind="visible: isVisible">' +
              '<table data-bind="click: function () { return false; }, clickBubble: false">' +
              '<tbody>' +
              '<tr>' +
              '<td class="bit-widget-overlay-close">' +
              '<img src="/assets/icon/close.png" data-bind="click: close"/>' +
              '</td>' +
              '</tr>' +
              '<tr>' +
              '<td>' +
              '<!-- ko template: { name: "' + template + '" } --> <!-- /ko -->' +
              '</td>' +
              '</tr>' +
              '</tbody>' +
              '</table>' +
              '</div>' +
              '</div>').appendTo("body");
          }

          this.initOverlay();
          $[widgetName].initialized = true;
        },
        _init: function () {
          // 初期化
        },
        _destroy: function () {
          // 破棄... singleton なので特に何もしない
        },
        initOverlay: function () {
          var $divNode = $("#" + overlayId);

          ko.cleanNode($divNode[0]); // knockout 2.3.0 update 対応.[You cannot apply bindings multiple times to the same element]
          ko.applyBindings(overlayWidget, $divNode[0]);

          overlayWidget.overlay = $divNode;
        },
        open: function () {
          var owner = ko.dataFor(this.element[0]);
          $[widgetName].open(owner);
        },
        ok: function () {
          $[widgetName].ok();
        },
        close: function () {
          $[widgetName].close();
        },
        options: options
      });

      var newWidget = $[widgetName] = new OverlayWidgetWrapper(); // singleton facade
      newWidget.initialized = false;

      return newWidget;
    };

    return OverlayWidgetFactory;
  }());

  BitWeb.PopupWidget = (function () {
    var className = "PopupWidget";

    function PopupWidget(params) {
      if (!(this instanceof PopupWidget)) {
        return new PopupWidget();
      }

      var self = this;

      self.params = params || {};

      self.id = "";
      self.options = {};

      self.popup = undefined;

      self.owner = ko.observable();

      var isVisible = ko.observable(false);

      self.isVisible = ko.pureComputed(function () {
        return isVisible();
      }, self);

      self._visible = function () {
        if (!isVisible()) {
          isVisible(true);
        }
        return self;
      };

      self._invisible = function () {
        if (isVisible()) {
          isVisible(false);
        }
        return self;
      };

      self._open = function () {
        self._invisible();

        if (self.popup) {
          self.popup.show();
        }

        self._visible();

        return self;
      };

      self._close = function () {
        if (self.popup) {
          self.popup.hide();
        }

        self._invisible();

        return self;
      };

      self = $.extend(self, self.params);
      return self;
    }

    PopupWidget.prototype.open = function (owner) {
      var self = this;

      if (!owner) {
        return self;
      }

      self.owner(owner);

      self._open();

      return self;
    };

    PopupWidget.prototype.close = function () {
      this._close();
      return this;
    };

    PopupWidget.getClassName = function () {
      return className;
    };

    return PopupWidget;
  }());

  BitWeb.PopupWidgetFactory = (function () {
    var className = "PopupWidgetFactory";

    function PopupWidgetWrapper() {
      if (!(this instanceof PopupWidgetWrapper)) {
        return new PopupWidgetWrapper();
      }

      var self = this;

      self.owner = undefined; // PopupWidget

      self.isVisible = ko.pureComputed(function () {
        return self.owner.isVisible();
      }, self);

      self.open = function (owner) {
        var windowHalfWidth = $(window).width() / 2.0;
        var windowHalfHeight = $(window).height() / 2.0;

        var options = $.extend({
          span: 20
        }, self.owner.options);

        self.owner.open(owner);

        var clientX = windowHalfWidth,
          clientY = windowHalfHeight;

        // マウスポインタの位置をドキュメント座標に
        var x = clientX + (window.pageXOffset || document.documentElement.scrollLeft);
        var y = clientY + (window.pageYOffset || document.documentElement.scrollTop);

        // コンテンツ要素を中心に配置する
        var $popup = $('#' + self.owner.id),
          $contents = $("#" + self.owner.id + ">div");

        x += (clientX < windowHalfWidth) ? options.span : -($contents.width() + options.span);
        y += (clientY < windowHalfHeight) ? options.span : -($contents.height() + options.span);

        $popup
          .css({
            left: (x + "px"),
            top: (y + "px")
          });
      };

      self.close = function () {
        self.owner.close();
      };

      return self;
    }

    function PopupWidgetFactory() {
      if (!(this instanceof PopupWidgetFactory)) {
        return new PopupWidgetFactory();
      }

      // singleton
      if (PopupWidgetFactory.prototype._singletonInstance) {
        return PopupWidgetFactory.prototype._singletonInstance;
      }
      var self = this;
      PopupWidgetFactory.prototype._singletonInstance = self;

      return self;
    }

    PopupWidgetFactory.getClassName = function () {
      return className;
    };

    PopupWidgetFactory.create = function (widgetName, options) {
      if (!widgetName) {
        bitlib.logger.error("widget が指定されていません.");
        return null;
      }

      var self = this;

      if ($[widgetName]) {
        return $[widgetName];
      }

      options = $.extend({
        title: ""
      }, (options || {}));

      var popupWidget,
        popupId = widgetName.toLowerCase() + "-popup",
        template = widgetName + "Template";

      $.widget("BitWeb." + widgetName, {
        _create: function () {
          if ($[widgetName].initialized === true) {
            // 生成済み
            return;
          }

          popupWidget = new BitWeb.PopupWidget({
            id: popupId,
            options: options
          });

          $[widgetName].owner = popupWidget;

          var $screen = $("body").find("#" + popupId),
            createNew = !$screen.length;

          if (createNew) {
            // jquery ui popup 用の div 作成.
            $('<div class="bit-widget-popup" id="' + popupId + '" title="' + options.title + '">' +
              '<div class="bit-widget-popup-contents" data-bind="visible: isVisible">' +
              '<!-- ko template: { name: "' + template + '" } --> <!-- /ko -->' +
              '</div>' +
              '</div>').appendTo("body");
          }

          this.initPopup();
          $[widgetName].initialized = true;
        },
        _init: function () {
          // 初期化
        },
        _destroy: function () {
          // 破棄... singleton なので特に何もしない
        },
        initPopup: function () {
          var $divNode = $("#" + popupId);

          ko.cleanNode($divNode[0]); // knockout 2.3.0 update 対応.[You cannot apply bindings multiple times to the same element]
          ko.applyBindings(popupWidget, $divNode[0]);

          popupWidget.popup = $divNode;
        },
        open: function () {
          var owner = ko.dataFor(this.element[0]);
          $[widgetName].open(owner);
        },
        ok: function () {
          $[widgetName].ok();
        },
        close: function () {
          $[widgetName].close();
        },
        options: options
      });

      var newWidget = $[widgetName] = new PopupWidgetWrapper(); // singleton facade
      newWidget.initialized = false;

      return newWidget;
    };

    return PopupWidgetFactory;
  }());

}(BitWeb || {}));