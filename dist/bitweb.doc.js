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
            return bitlib.common.copyDeep(container[styleCode]);
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
        params = bitlib.common.copyDeep(params);
      }

      self.params = $.extend(true, {
        testMode: false,
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

  bitlib.ko.addBindingHandler("bindHiddenKeys", {
    init: function (element, valueAccessor, allBindingsAccessor, viewModel, bindingContext) {
      var metrics = new BitWeb.MetricsBase();

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
      for (var i = 0, len = CHEET_COMMAND.length; i < len; i++) {
        var keyCode = bitlib.browser.getKeyCode(CHEET_COMMAND[i]);
        if (0 < keyCode) {
          cheetKeyCodes.push(keyCode);
        }
      }

      var currentKeyCodes = [];
      if (0 < cheetKeyCodes.length) {
        if (!bitlib.browser.ua.isTablet) {
          $(window)
            .keyup(function (event) {
              if (currentKeyCodes.length === cheetKeyCodes.length) {
                currentKeyCodes.shift();
              }

              currentKeyCodes.push(event.keyCode);

              if (currentKeyCodes.toString() === currentKeyCodes.toString()) {
                metrics.switchTestMode();
              }
            });
        }
      }
    }
  });

  BitWeb.DocumentBase = (function () {
    var className = "DocumentBase";

    var metrics = undefined;

    var READY = "READY",
      LOADING = "LOADING",
      DONE = "DONE",
      TIMEOUT = "TIMEOUT",
      ERROR = "ERROR";

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

      self._onAutoReload = function () {
        if (!!tick || metrics.params.reloadInterval < 10000) {
          return self;
        }

        tick = setTimeout(autoReload, metrics.params.reloadInterval);

        return self;
      };

      self._offAutoReload = function () {
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
            self._onAutoReload();
          }

          metrics.isValidAutoReload.subscribe(function (isValid) {
            if (isValid) {
              self._onAutoReload();
            } else {
              self._offAutoReload();
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