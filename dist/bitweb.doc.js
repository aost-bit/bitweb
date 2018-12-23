(function ($) {
  "use strict";

  // iPad等の初期処理.
  if (bitlib.browser.ua.isTablet) {
    bitlib.ui.onPreventDoubleTapZoom();
  }

})(jQuery);

(function (BitWeb) {
  "use strict";

  BitWeb.TemplateStyleBase = (function () {
    var className = "TemplateStyleBase";

    function TemplateStyleBase(params) {
      var self = this;

      self.params = $.extend({
        template: "",
        id: "" // スタイルを識別するためのID ... できれば
      }, (params || {}));

      self = $.extend(self, self.params);
      return self;
    }

    TemplateStyleBase.getClassName = function () {
      return className;
    };

    return TemplateStyleBase;
  }());

  BitWeb.TemplateStyleContainer = (function () {
    var className = "TemplateStyleContainer";

    function TemplateStyleContainer() {
      if (!(this instanceof TemplateStyleContainer)) {
        return new TemplateStyleContainer();
      }

      // singleton
      if (TemplateStyleContainer.prototype._singletonInstance) {
        return TemplateStyleContainer.prototype._singletonInstance;
      }
      var self = this;
      TemplateStyleContainer.prototype._singletonInstance = self;

      var container = {};

      self._get = function (styleCode) {
        if (styleCode) {
          if (container[styleCode]) {
            return bitlib.common.copy(container[styleCode]);
          }

          bitlib.logger.warn("TemplateStyleContainer に登録されていない styleCode[" + styleCode + "] を検索しました.");
        }

        return null;
      };

      self._set = function (styleCode, newStyle) {
        if (!styleCode || !newStyle) {
          return self;
        }

        if (container[styleCode]) {
          bitlib.logger.info("TemplateStyleContainer に登録されている styleCode[" + styleCode + "] を上書きしました.");
        }

        container[styleCode] = newStyle;

        return self;
      };

      self._clear = function () {
        container = {};
        return self;
      };

      return self;
    }

    TemplateStyleContainer.prototype.get = function (styleCode) {
      return this._get(styleCode);
    };

    TemplateStyleContainer.prototype.set = function (styleCode, style) {
      this._set(styleCode, style);
      return this;
    };

    TemplateStyleContainer.prototype.clear = function () {
      this._clear();
      return this;
    };

    TemplateStyleContainer.getClassName = function () {
      return className;
    };

    return TemplateStyleContainer;
  }());

  BitWeb.MetricsBase = (function () {
    var className = "MetricsBase";

    function MetricsBase(params) {
      // singleton
      if (MetricsBase.prototype._singletonInstance) {
        return MetricsBase.prototype._singletonInstance;
      }
      var self = this;
      MetricsBase.prototype._singletonInstance = self;

      if (params) {
        params = bitlib.common.copy(params);
      }

      self.params = $.extend(true, {
        testMode: bitlib.string.toBoolean(bitlib.params.page.get("TestMode")),
        templateStyleCode: "",
        autoReload: false,
        reloadInterval: (60 * 1000)
      }, (params || {}));

      var isValidTestMode = ko.observable(self.params.testMode);

      self.isValidTestMode = ko.pureComputed(function () {
        return isValidTestMode();
      }, self);

      self._validateTestMode = function () {
        if (!isValidTestMode()) {
          isValidTestMode(true);
        }
        return self;
      };

      self._invalidateTestMode = function () {
        if (isValidTestMode()) {
          isValidTestMode(false);
        }
        return self;
      };

      var templateStyleContainer = new BitWeb.TemplateStyleContainer();

      var templateStyleCode = ko.observable(self.params.templateStyleCode);

      self._setTemplateStyleCode = function (styleCode) {
        if (!styleCode || templateStyleCode() === styleCode) {
          return self;
        }

        templateStyleCode(styleCode);

        return self;
      };

      self.templateStyle = ko.pureComputed(function () {
        var styleCode = templateStyleCode();
        return templateStyleContainer.get(styleCode);
      }, self);

      var isAvailableAutoReload = ko.observable(true);

      self.isAvailableAutoReload = ko.pureComputed(function () {
        return isAvailableAutoReload();
      }, self);

      self._enableAutoReload = function () {
        if (!isAvailableAutoReload()) {
          isAvailableAutoReload(true);
        }
        return self;
      };

      self._disableAutoReload = function () {
        if (isAvailableAutoReload()) {
          isAvailableAutoReload(false);
        }
        return self;
      };

      var isValidAutoReload = ko.observable(self.params.autoReload);

      self.isValidAutoReload = ko.pureComputed(function () {
        return isValidAutoReload();
      }, self);

      self._validateAutoReload = function () {
        if (!isValidAutoReload()) {
          isValidAutoReload(true);
        }
        return self;
      };

      self._invalidateAutoReload = function () {
        if (isValidAutoReload()) {
          isValidAutoReload(false);
        }
        return self;
      };

      return self;
    }

    MetricsBase.prototype.onTestMode = function () {
      this._validateTestMode();
      return this;
    };

    MetricsBase.prototype.offTestMode = function () {
      this._invalidateTestMode();
      return this;
    };

    MetricsBase.prototype.switchTestMode = function () {
      var self = this;

      if (self.isValidTestMode()) {
        self._invalidateTestMode();
      } else {
        self._validateTestMode();
      }

      return self;
    };

    MetricsBase.prototype.enableAutoReload = function () {
      this._enableAutoReload();
      return this;
    };

    MetricsBase.prototype.disableAutoReload = function () {
      this._disableAutoReload();
      return this;
    };

    MetricsBase.prototype.onAutoReload = function () {
      this._validateAutoReload();
      return this;
    };

    MetricsBase.prototype.offAutoReload = function () {
      this._invalidateAutoReload();
      return this;
    };

    MetricsBase.prototype.switchAutoReload = function () {
      var self = this;

      if (self.isValidAutoReload()) {
        self._invalidateAutoReload();
      } else {
        self._validateAutoReload();
      }

      return self;
    };

    MetricsBase.getClassName = function () {
      return className;
    };

    return MetricsBase;
  }());

  BitWeb.TesterUtilityContainer = (function () {
    var className = "TesterUtilityContainer";

    function TesterUtilityContainer() {
      // singleton
      if (TesterUtilityContainer.prototype._singletonInstance) {
        return TesterUtilityContainer.prototype._singletonInstance;
      }
      var self = this;
      TesterUtilityContainer.prototype._singletonInstance = self;

      var container = ko.observableArray();

      self.utils = ko.pureComputed(function () {
        return container();
      }, self);

      self._get = function (index) {
        if (!bitlib.common.isNumber(index)) {
          return null;
        }
        return self.utils()[index];
      };

      self._add = function (caption, callback, owner) {
        if (!caption || !bitlib.common.isString(caption) || !bitlib.common.isFunction(callback)) {
          return self;
        }

        container.push({
          caption: caption,
          callback: function () {
            if ($.testerPicker.isVisible()) {
              $.testerPicker.close();
            }

            callback.call((owner || self));
          }
        });

        return self;
      };

      self
        ._add("キャッシュをクリアする", function () {
          bitlib.browser.clearLocalStorage();

          bitlib.ui.lockScreen("すべてのキャッシュをクリアしました.<br />ページを一旦閉じ、開き直してください.");
        });

      return self;
    }

    TesterUtilityContainer.prototype.add = function (caption, callback, owner) {
      this._add(caption, callback, owner);
      return this;
    };

    TesterUtilityContainer.prototype.openPicker = function () {
      var self = this;

      if ($.testerPicker) {
        $.testerPicker.open(self);
      }

      return self;
    };

    TesterUtilityContainer.getClassName = function () {
      return className;
    };

    return TesterUtilityContainer;
  }());

  bitlib.ko.addBindingHandler("bindHiddenKeys", {
    init: function (element, valueAccessor, allBindingsAccessor, viewModel, bindingContext) {
      var metrics = new BitWeb.MetricsBase();

      var i = 0,
        len = 0;

      var CHEET_COMMAND = [
        "UpArrow",
        "UpArrow",
        "DownArrow",
        "DownArrow",
        "LeftArrow",
        "RightArrow",
        "LeftArrow",
        "RightArrow",
        "B",
        "A"
      ];

      var cheetKeyCodes = [];
      for (i = 0, len = CHEET_COMMAND.length; i < len; i++) {
        var cheetCode = bitlib.browser.getKeyCode(CHEET_COMMAND[i]);
        if (0 < cheetCode) {
          cheetKeyCodes.push(cheetCode);
        }
      }

      var currentCheetKeyCodes = [];
      if (0 < cheetKeyCodes.length) {
        if (!bitlib.browser.ua.isTablet) {
          $(window)
            .on("keyup", function (event) {
              if (currentCheetKeyCodes.length === cheetKeyCodes.length) {
                currentCheetKeyCodes.shift();
              }

              currentCheetKeyCodes.push(event.keyCode);

              if (currentCheetKeyCodes.toString() === cheetKeyCodes.toString()) {
                metrics.switchTestMode();
              }
            });
        }
      }

      var tester = new BitWeb.TesterUtilityContainer();

      var TESTER_COMMAND = [
        "Q",
        "Q",
        "Q"
      ];

      var testerKeyCodes = [];
      for (i = 0, len = TESTER_COMMAND.length; i < len; i++) {
        var testerCode = bitlib.browser.getKeyCode(TESTER_COMMAND[i]);
        if (0 < testerCode) {
          testerKeyCodes.push(testerCode);
        }
      }

      var currentTesterKeyCodes = [];
      if (0 < testerKeyCodes.length) {
        if (!bitlib.browser.ua.isTablet) {
          $(window)
            .on("keyup", function (event) {
              if (!metrics.isValidTestMode()) {
                return true;
              }

              if (currentTesterKeyCodes.length === testerKeyCodes.length) {
                currentTesterKeyCodes.shift();
              }

              currentTesterKeyCodes.push(event.keyCode);

              if (currentTesterKeyCodes.toString() === testerKeyCodes.toString()) {
                tester.openPicker();
              }

              return true;
            });
        }
      }

      // initialize picker with some optional options
      var options = $.extend({
        title: "選択してください"
      }, (allBindingsAccessor().testerPickerOptions || {}));

      var widget = BitWeb.ViewboxWidgetFactory.create("testerPicker");

      $(element).testerPicker(options);

      // handle disposal (if KO removes by the template binding)
      ko.utils.domNodeDisposal.addDisposeCallback(element, function () {
        $(element).testerPicker("destroy");
      });
    }
  });

  BitWeb.DocumentBase = (function () {
    var className = "DocumentBase";

    var READY = "READY",
      LOADING = "LOADING",
      DONE = "DONE",
      TIMEOUT = "TIMEOUT",
      ERROR = "ERROR";

    var metrics;

    function DocumentBase() {
      var self = BitWeb.ResourceBase.apply(this, arguments);

      metrics = new BitWeb.MetricsBase();

      self.type = className;

      var status = ko.observable(READY);

      self.isReady = ko.pureComputed(function () {
        return status() === READY;
      }, self);

      self.isBusy = ko.pureComputed(function () {
        return status() === LOADING;
      }, self);

      self.isCompleted = ko.pureComputed(function () {
        return status() === DONE;
      }, self);

      self.isTimeout = ko.pureComputed(function () {
        return status() === TIMEOUT;
      }, self);

      self.isError = ko.pureComputed(function () {
        return status() === ERROR;
      }, self);

      self._setStatus = function (newStatus) {
        if (status() !== newStatus) {
          status(newStatus);
        }
        return self;
      };

      var tick = null;

      function autoReload() {
        if (metrics.isAvailableAutoReload()) {
          self.reload();
        }

        tick = setTimeout(autoReload, metrics.params.reloadInterval);

        return self;
      }

      self._startAutoReload = function () {
        if (!!tick || metrics.params.reloadInterval < 10000) {
          return self;
        }

        tick = setTimeout(autoReload, metrics.params.reloadInterval);

        return self;
      };

      self._stopAutoReload = function () {
        if (tick) {
          clearTimeout(tick);
          tick = null;
        }
        return self;
      };

      self = $.extend(self, self.params);

      self.isCompleted.subscribe(function (isCompleted) {
        if (isCompleted) {
          if (metrics.isValidAutoReload()) {
            self._startAutoReload();
          }

          metrics.isValidAutoReload.subscribe(function (isValid) {
            if (isValid) {
              self._startAutoReload();
            } else {
              self._stopAutoReload();
            }
          });
        }
      });

      return self;
    }

    var _super = BitWeb.ResourceBase;
    inherits(DocumentBase, _super);

    DocumentBase.prototype.template = function (prefix, suffix) {
      return (prefix || "") + this.type + (suffix || "") + "Template";
    };

    DocumentBase.prototype.ready = function () {
      var message = "DocumentBase の初期 binding 処理はオーバーライドして使用してください.\n" +
        "Promise オブジェクトを返すと、binding 初期化を非同期に処理することが可能です.";

      bitlib.logger.info(message);

      return $.Deferred().resolve().promise();
    };

    DocumentBase.prototype.init = function () {
      var message = "DocumentBase の初期化処理はオーバーライドして使用してください.\n" +
        "この初期化処理は applyBinding された後のビューモデルに対して行う処理になります.";

      bitlib.logger.info(message);
    };

    DocumentBase.prototype.load = function (params) {
      var self = this,
        defer = $.Deferred();

      if (!self.isReady()) {
        // 再入禁止
        return defer.resolve().promise();
      }

      var promise = self.ready();
      if (!promise) {
        return defer.resolve().promise();
      }

      params = $.extend({
        timeout: (15 * 1000),
        timeoutHandler: function () {
          bitlib.logger.warn("timeout.");
        }
      }, (params || {}));

      var tick = null;

      tick = setTimeout(function () {
        if (defer.state() === "pending") {
          self._setStatus(TIMEOUT);

          if (params.timeoutHandler) {
            params.timeoutHandler(self);
          }

          defer.reject(self);
        }
      }, params.timeout);

      promise
        .done(function () {
          self._setStatus(DONE);
          if (tick) {
            clearTimeout(tick);
          }
          defer.resolve(self);
        })
        .fail(function () {
          self._setStatus(ERROR);
          if (tick) {
            clearTimeout(tick);
          }
          defer.reject(self);
        });

      return defer.promise();
    };

    DocumentBase.prototype.reload = function () {
      bitlib.logger.info("再ロード処理はオーバーライドして使用してください.");
    };

    DocumentBase.getClassName = function () {
      return className;
    };

    return DocumentBase;
  }());

  bitlib.ko.addBindingHandler("bindHeader", {
    init: function (element, valueAccessor, allBindingsAccessor, viewModel, bindingContext) {
      var options = $.extend({
        fixed: false,
        toggle: false
      }, (allBindingsAccessor().headerOptions || {}));

      var $page = $(element).closest("#page");

      var tick = null,
        headerHeight = $(element).outerHeight();

      var loopFixPosition = function () {
        var height = $(element).outerHeight();
        if (height !== headerHeight) {
          $page
            .css({
              paddingTop: height + "px"
            });

          headerHeight = height;
        }

        tick = setTimeout(loopFixPosition, 100);
      };

      if (options.fixed) {
        $(element)
          .css({
            position: "fixed",
            left: 0,
            right: 0,
            top: "-1px",
            paddingTop: "1px",
            width: "100%",
            zIndex: 1000
          });

        if (0 < $page.length) {
          loopFixPosition();
        }
      } else {
        $(element)
          .css({
            display: "inline-block",
            width: "100%"
          });
      }
    }
  });

  bitlib.ko.addBindingHandler("bindFooter", {
    init: function (element, valueAccessor, allBindingsAccessor, viewModel, bindingContext) {
      var options = $.extend({
        fixed: false,
        toggle: false
      }, (allBindingsAccessor().footerOptions || {}));

      var $page = $(element).closest("#page");

      var tick = null,
        footerHeight = $(element).outerHeight();

      var loopFixPosition = function () {
        var height = $(element).outerHeight();
        if (height !== footerHeight) {
          $page
            .css({
              paddingBottom: height + "px"
            });

          footerHeight = height;
        }

        tick = setTimeout(loopFixPosition, 100);
      };

      if (options.fixed) {
        $(element)
          .css({
            position: "fixed",
            left: 0,
            right: 0,
            bottom: "-1px",
            paddingBottom: "1px",
            width: "100%",
            zIndex: 1000
          });

        if (0 < $page.length) {
          loopFixPosition();
        }
      } else {
        $(element)
          .css({
            display: "inline-block",
            width: "100%"
          });
      }
    }
  });

}(BitWeb || {}));