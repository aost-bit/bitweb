(function (BitWeb) {
  "use strict";

  BitWeb.UIBase = (function () {
    var className = "UIBase";

    function UIBase() {
      var args = [];
      args.push.apply(args, arguments);

      var caption = "",
        name = "",
        params = {};

      var i = 0,
        len = 0;

      for (i = 0, len = args.length; i < len; i++) {
        if (bitlib.common.isObject(args[i])) {
          params = args[i];
          continue;
        }
        if (bitlib.common.isString(args[i])) {
          switch (i) {
            case 0:
              caption = args[i];
              break;
            case 1:
              name = args[i];
              break;
            default:
              // none
          }
        }
      }

      var self = BitWeb.ResourceBase.apply(this, [params]);

      self.isUIViewModel = true;

      self.params = $.extend({
        readOnly: false,
        copyable: true
      }, self.params);

      self.type = className;

      self.caption = caption; // 見出し
      self.name = name; // 属性値      

      self.prefix = "";
      self.suffix = "";

      self.cssClass = "";

      var isWritable = ko.observable(!bitlib.common.toBoolean(self.params.readOnly));

      self.isWritable = ko.pureComputed(function () {
        return isWritable();
      }, self);

      self.isReadOnly = ko.pureComputed(function () {
        return !isWritable();
      }, self);

      self._permitWrite = function () {
        if (!isWritable()) {
          isWritable(true);
        }
        return self;
      };

      self._forbidWrite = function () {
        if (isWritable()) {
          isWritable(false);
        }
        return self;
      };

      var isCopyable = ko.observable(bitlib.common.toBoolean(self.params.copyable));

      self.isCopyable = ko.pureComputed(function () {
        return isCopyable();
      }, self);

      self._permitCopy = function () {
        if (!isCopyable()) {
          return isCopyable(true);
        }
        return self;
      };

      self._forbidCopy = function () {
        if (isCopyable()) {
          isCopyable(false);
        }
        return self;
      };

      self._cachedValue = ko.observable("");

      self.value = ko.computed({
        read: function () {
          if (self.isValid()) {
            return self._cachedValue();
          }
          return "";
        },
        write: function (newValue) {
          newValue = newValue || "";

          self._cachedValue(newValue);

          if (bitlib.common.toBoolean(newValue)) {
            self._validate();
          } else {
            self._invalidate();
          }
        },
        owner: self
      });

      self.output = ko.pureComputed(function () {
        return self.value();
      }, self);

      var previousValue = ko.observable("");

      self.hasPreviousValue = ko.pureComputed(function () {
        return !!previousValue();
      }, self);

      self._commit = function () {
        previousValue(self.value());
        return self;
      };

      self._rollback = function () {
        self.value(previousValue());
        return self;
      };

      self = $.extend(self, self.params);
      return self;
    }

    UIBase.prototype.template = function (prefix, suffix) {
      return (prefix || "") + this.type + (suffix || "") + "Template";
    };

    UIBase.prototype.permitWrite = function () {
      this._permitWrite();
      return this;
    };

    UIBase.prototype.forbidWrite = function () {
      this._forbidWrite();
      return this;
    };

    UIBase.prototype.permitCopy = function () {
      this._permitCopy();
      return this;
    };

    UIBase.prototype.forbidCopy = function () {
      this._forbidCopy();
      return this;
    };

    UIBase.prototype.reset = function () {
      var self = this;

      if (self.isValid()) {
        self.value("");
      }

      return self;
    };

    UIBase.prototype.clear = function () {
      var self = this;

      if (self.isReadOnly()) {
        return self;
      }

      if (self.isValid()) {
        self.value("");
      }

      return self;
    };

    UIBase.prototype.toText = function () {
      var self = this;

      var caption = "";
      if (self.caption) {
        caption = self.caption + ":";
      }

      if (!self.isValid()) {
        return caption;
      }

      return caption + self.prefix + self.output() + self.suffix;
    };

    UIBase.prototype.getUIByName = function (names) {
      var self = this;

      names = names || [];
      names = bitlib.common.isArray(names) ? names : [names];

      if (names.length === 0) {
        return [];
      }

      var results = [];

      if (bitlib.array.contains(names, self.name)) {
        results.push(self);
      }

      return results;
    };

    UIBase.prototype.readData = function (data) {
      // data :: デシリアライズ時にレスポンスデータから読み込むオブジェクトで
      // 配列データがある.
      // [ "値SEQ000", "値SEQ001", ... ]

      var self = this;

      data = data || [];
      self.value(data[0] || "");

      // 前回値として記憶.
      self._commit();

      return self;
    };

    UIBase.prototype.writeData = function (data) {
      // itemData :: シリアライズ時にリクエストデータに書き出すオブジェクトで
      // 配列データを持たせる.
      // [ "値SEQ000", "値SEQ001", ... ]

      var self = this;

      data = data || [];
      data[0] = self.value();

      return data;
    };

    UIBase.prototype.importData = function (source) {
      // 受信するデータを、自身の name から探索して取り込む
      // 受信するデータフォーマット(source)
      // { NAME1: [ "値SEQ000", "値SEQ001", "値SEQ002", ... ], ... }

      var self = this;

      if (!self.name) {
        return self;
      }

      source = source || {};

      var data = source[self.name];
      if (data) {
        self.readData(bitlib.common.copyDeep(data));
      }

      return self;
    };

    UIBase.prototype.exportData = function (dest) {
      // 送信するデータを、自身のデータから生成して return する.
      // 送信するデータフォーマット(dest)
      // { NAME1: [ "値SEQ000", "値SEQ001", "値SEQ002", ... ], ... }

      var self = this;

      if (!self.name) {
        return self;
      }

      dest = dest || {};

      var data = dest[self.name] || [];
      dest[self.name] = self.writeData(data);
    };

    UIBase.prototype.deserialize = function (getter) {
      var self = this;

      if (!bitlib.common.isFunction(getter)) {
        return self;
      }

      getter(self);

      return self;
    };

    UIBase.prototype.serialize = function (setter) {
      var self = this;

      if (!bitlib.common.isFunction(setter) || self.isReadOnly()) {
        return self;
      }

      setter(self);

      return self;
    };

    UIBase.prototype.command = function (indicator) {
      var self = this;

      if (!bitlib.common.isFunction(indicator)) {
        return self;
      }

      indicator(self);

      return self;
    };

    UIBase.getClassName = function () {
      return className;
    };

    return UIBase;
  }());

  bitlib.ko.addBindingHandler("bindUI", {
    init: function (element, valueAccessor, allBindingsAccessor, viewModel, bindingContext) {
      var $element = $(element);

      if (viewModel.type) {
        $element
          .addClass("bit-ui-" + viewModel.type.toLowerCase());
      }

      if (viewModel.name) {
        $element
          .addClass("name-" + viewModel.name.toLowerCase());
      }

      if (viewModel.cssClass) {
        var arr = viewModel.cssClass
          .replace(/ /g, ",")
          .split(",");

        for (var i = 0, len = arr.length; i < len; i++) {
          if (arr[i]) {
            $element
              .addClass(arr[i]);
          }
        }
      }

      if (viewModel.isAvailable()) {
        $element
          .addClass("bit-ui-is-available");
      }

      viewModel.isAvailable.subscribe(function (isAvailable) {
        if (isAvailable) {
          $element
            .addClass("bit-ui-is-available");
        } else {
          $element
            .removeClass("bit-ui-is-available");
        }
      });

      if (viewModel.isValid()) {
        $element
          .addClass("bit-ui-is-valid");
      }

      viewModel.isValid.subscribe(function (isValid) {
        if (isValid) {
          $element
            .addClass("bit-ui-is-valid");
        } else {
          $element
            .removeClass("bit-ui-is-valid");
        }
      });
    }
  });

  BitWeb.VoidUI = (function () {
    var className = "VoidUI";

    function VoidUI() {
      var self = BitWeb.UIBase.apply(this, arguments);

      self.type = className;

      // 自身の visible は透過的な効果しか持たない.
      self.isVisible = ko.pureComputed(function () {
        return false;
      }, self);

      self._visible = function () {
        return self;
      };

      self._invisible = function () {
        return self;
      };

      self = $.extend(self, self.params);
      return self;
    }

    var _super = BitWeb.UIBase;
    inherits(VoidUI, _super);

    VoidUI.getClassName = function () {
      return className;
    };

    return VoidUI;
  }());

  BitWeb.TextUIBase = (function () {
    var className = "TextUIBase";

    function TextUIBase() {
      var self = BitWeb.UIBase.apply(this, arguments);

      self.type = className;

      // IMEモード(IEのみ対応) auto/active/inactive/disabled
      self.imeMode = "auto";
      // knockoutのvalueUpdateパラメータ input/keyup/keypress/afterkeydown
      self.valueUpdate = "afterkeydown";

      // Array.join に使用するデリミタ.
      self.delimiter = "";

      self.output = ko.pureComputed(function () {
        return bitlib.string.trimOverlapLineFeedForLegacyIE(self.value());
      }, self);

      self.maxLength = -1; // -1:infinity

      self.overMaxLength = ko.pureComputed(function () {
        var maxLength = bitlib.common.toInteger(self.maxLength);

        if (isNaN(maxLength) || self.maxLength < 1) {
          return 0;
        }

        var val = self.value();

        return (maxLength < val.length) ? (val.length - maxLength) : 0;
      }, self);

      self.placeHolder = "";

      self.forbiddenKeys = [];

      self = $.extend(self, self.params);
      return self;
    }

    var _super = BitWeb.UIBase;
    inherits(TextUIBase, _super);

    TextUIBase.prototype.readData = function (data) {
      var self = this;

      data = data || [];

      var txtArr = [];
      for (var i = 0, len = data.length; i < len; i++) {
        if (!data[i] || !bitlib.common.isString(data[i])) {
          continue;
        }
        txtArr.push(data[i]);
      }

      self.value(txtArr.join(self.delimiter));

      // 前回値として記憶.
      self._commit();

      return self;
    };

    TextUIBase.prototype.writeData = function (data) {
      var self = this;

      data = [];

      var val = self.value();
      do {
        data.push(val.substring(0, 1000));
        val = val.substring(1000);
      } while (0 < val.length);

      return data;
    };

    TextUIBase.getClassName = function () {
      return className;
    };

    return TextUIBase;
  }());

  BitWeb.LabelUI = (function () {
    var className = "LabelUI";

    function LabelUI() {
      var self = BitWeb.TextUIBase.apply(this, arguments);

      self.type = className;

      self = $.extend(self, self.params);

      if (self.params.readOnly !== false) {
        self.forbidWrite();
      }

      return self;
    }

    var _super = BitWeb.TextUIBase;
    inherits(LabelUI, _super);

    LabelUI.getClassName = function () {
      return className;
    };

    return LabelUI;
  }());

  BitWeb.TextUI = (function () {
    var className = "TextUI";

    function TextUI() {
      var self = BitWeb.TextUIBase.apply(this, arguments);

      self.type = className;

      self.imeMode = "inactive";

      self = $.extend(self, self.params);
      return self;
    }

    var _super = BitWeb.UIBase;
    inherits(TextUI, _super);

    TextUI.getClassName = function () {
      return className;
    };

    return TextUI;
  }());

  bitlib.ko.addBindingHandler("bindTextUI", {
    init: function (element, valueAccessor, allBindingsAccessor, viewModel, bindingContext) {
      var $element = $(element);

      $element
        .css({
          imeMode: viewModel.imeMode
        });

      var maxLength = bitlib.common.toInteger(viewModel.maxLength);
      if (!isNaN(maxLength) && 0 < maxLength) {
        $element
          .attr({
            maxlength: maxLength
          });
      }

      var placeHolder = viewModel.placeHolder;
      if (!!placeHolder && bitlib.common.isString(placeHolder) && !bitlib.browser.ua.isLegacyIE) {
        $element
          .attr({
            placeholder: placeHolder
          });
      }

      var forbiddenKeyCodes = [],
        forbiddenKeys = viewModel.forbiddenKeys;

      for (var i = 0, len = forbiddenKeys.length; i < len; i++) {
        var keyCode = bitlib.browser.getKeyCode(forbiddenKeys[i]);
        if (-1 < keyCode) {
          forbiddenKeyCodes.push(keyCode);
        } else {
          forbiddenKeyCodes.push(forbiddenKeys[i]);
        }
      }

      if (0 < forbiddenKeyCodes.length) {
        $element
          .on("keydown", function (event) {
            if (bitlib.array.contains(forbiddenKeyCodes, event.keyCode)) {
              return false;
            }
            return true;
          });
      }
    }
  });

  bitlib.ko.addBindingHandler("bindTextInputterDialog", {
    init: function (element, valueAccessor, allBindingsAccessor, viewModel, bindingContext) {
      // initialize inputter with some optional options
      var options = $.extend({
        title: "入力してください"
      }, viewModel.inputterDialogOptions, (allBindingsAccessor().textInputterDialogOptions || {}));

      var widget = BitWeb.DialogWidgetFactory.create("textInputterDialog", options);

      $(element).textInputterDialog(options);

      // handle disposal (if KO removes by the template binding)
      ko.utils.domNodeDisposal.addDisposeCallback(element, function () {
        $(element).textInputterDialog("destroy");
      });
    }
  });

  bitlib.ko.addBindingHandler("bindTextPromptDialog", {
    init: function (element, valueAccessor, allBindingsAccessor, viewModel, bindingContext) {
      // initialize prompt with some optional options
      var options = $.extend({
        title: "入力してください"
      }, viewModel.promptDialogOptions, (allBindingsAccessor().textPromptDialogOptions || {}));

      var widget = BitWeb.DialogWidgetFactory.create("textPromptDialog", options);

      $(element).textPromptDialog(options);

      // handle disposal (if KO removes by the template binding)
      ko.utils.domNodeDisposal.addDisposeCallback(element, function () {
        $(element).textPromptDialog("destroy");
      });
    }
  });

  BitWeb.TextBlockUI = (function () {
    var className = "TextBlockUI";

    function TextBlockUI() {
      var self = BitWeb.TextUIBase.apply(this, arguments);

      self.type = className;

      self = $.extend(self, self.params);

      if (self.params.readOnly !== false) {
        self.forbidWrite();
      }

      return self;
    }

    var _super = BitWeb.TextUIBase;
    inherits(TextBlockUI, _super);

    TextBlockUI.getClassName = function () {
      return className;
    };

    return TextBlockUI;
  }());

  BitWeb.TextAreaUI = (function () {
    var className = "TextAreaUI";

    function TextAreaUI() {
      var self = BitWeb.TextUIBase.apply(this, arguments);

      self.type = className;

      self.imeMode = "active";

      self.warnLength = -1; // -1:infinity

      self.overWarnLength = ko.computed(function () {
        var warnLength = bitlib.common.toInteger(self.warnLength);

        if (isNaN(warnLength) || self.warnLength < 1) {
          return 0;
        }

        var val = self.value();

        return (warnLength < val.length) ? (val.length - warnLength) : 0;
      }, self);

      self.autoAdjustHeight = true;

      self.syntax = "";

      self.includedKeywords = ko.pureComputed(function () {
        if (!self.syntax) {
          return [];
        }

        var syntax = bitlib.common.isString(self.syntax) ? new RegExp(self.syntax, "ig") : self.syntax;

        if (!bitlib.common.isRegExp(syntax)) {
          return [];
        }

        return self.value().match(syntax) || [];
      }, self);

      self.includedLength = ko.pureComputed(function () {
        return self.includedKeywords().length;
      }, self);

      self = $.extend(self, self.params);
      return self;
    }

    var _super = BitWeb.TextUIBase;
    inherits(TextAreaUI, _super);

    TextAreaUI.prototype.toTextKeywords = function () {
      var self = this;

      if (self.includedLength() === 0) {
        return "";
      }

      var keywords = [];
      bitlib.array.each(self.includedKeywords, function (i, keyword) {
        if (!bitlib.array.contains(keywords, keyword)) {
          keywords.push(keyword);
        }
      });

      return keywords
        .join(",")
        .replace(/(\r\n|\r|\n)/ig, "[改行]");
    };

    TextAreaUI.prototype.showHighlightKeywords = function () {
      var self = this;

      var keywords = [];
      bitlib.array.each(self.includedKeywords, function (i, keyword) {
        if (!bitlib.array.contains(keywords, keyword)) {
          keywords.push(keyword);
        }
      });

      var val = self.value();

      bitlib.array.each(keywords, function (i, keyword) {
        var regexp = new RegExp(keyword, "g");
        val = val.replace(regexp, '<span class="highlight-mark">' + keyword + '</span>');
      });

      var html = '<div class="bit-text-highlight">' + val.replace(/(\r\n|\r|\n)/ig, ' <br />') + '<div>';

      bitlib.ui.openDialog(html, {
        "OK": function () {
          // none
        }
      });

      return self;
    };

    TextAreaUI.getClassName = function () {
      return className;
    };

    return TextAreaUI;
  }());

  bitlib.ko.addBindingHandler("bindTextAreaUI", {
    init: function (element, valueAccessor, allBindingsAccessor, viewModel, bindingContext) {
      var $element = $(element);

      $element
        .css({
          imeMode: viewModel.imeMode
        });

      var maxLength = bitlib.common.toInteger(viewModel.maxLength);
      if (!isNaN(maxLength) && 0 < maxLength) {
        $element
          .attr({
            maxlength: maxLength
          });
      }

      var placeHolder = viewModel.placeHolder;
      if (!!placeHolder && bitlib.common.isString(placeHolder) && !bitlib.browser.ua.isLegacyIE) {
        $element
          .attr({
            placeholder: placeHolder
          });
      }

      var forbiddenKeyCodes = [],
        forbiddenKeys = viewModel.forbiddenKeys;

      for (var i = 0, len = forbiddenKeys.length; i < len; i++) {
        var keyCode = bitlib.browser.getKeyCode(forbiddenKeys[i]);
        if (-1 < keyCode) {
          forbiddenKeyCodes.push(keyCode);
        } else {
          forbiddenKeyCodes.push(forbiddenKeys[i]);
        }
      }

      if (0 < forbiddenKeyCodes.length) {
        $element
          .on("keydown", function (event) {
            if (bitlib.array.contains(forbiddenKeyCodes, event.keyCode)) {
              return false;
            }
            return true;
          });
      }

      if (0 < viewModel.overWarnLength()) {
        $element
          .addClass("over-warn-length")
      }

      viewModel.overWarnLength.subscribe(function (newLength) {
        if (0 < newLength) {
          $element
            .addClass("over-warn-length");
        } else {
          $element
            .removeClass("over-warn-length");
        }
      });

      if (bitlib.common.toBoolean(viewModel.autoAdjustHeight)) {
        element.style.overflow = "auto";

        if (element.offsetHeight < element.scrollHeight) {
          element.style.height = (element.scrollHeight + 5) + "px";
        }

        viewModel.value.subscribe(function () {
          if (element.offsetHeight < element.scrollHeight) {
            element.style.height = (element.scrollHeight + 5) + "px";
          }
        });
      } else {
        if (element.offsetHeight < element.scrollHeight) {
          $element
            .addClass("over-outer-height");
        }

        viewModel.value.subscribe(function () {
          if (element.offsetHeight < element.scrollHeight) {
            $element
              .addClass("over-outer-height");
          } else {
            $element
              .removeClass("over-outer-height");
          }
        });
      }

      if (0 < viewModel.includedLength()) {
        $element
          .addClass("has-keywords");
      }

      viewModel.includedLength.subscribe(function (newLength) {
        if (0 < newLength) {
          $element
            .addClass("has-keywords");
        } else {
          $element
            .removeClass("has-keywords");
        }
      });
    }
  });

  BitWeb.SelectTextUIBase = (function () {
    var className = "SelectTextUIBase";

    function SelectTextUIBase() {
      var self = BitWeb.TextUIBase.apply(this, arguments);

      self.type = className;

      var options = [];

      if (self.params.hasOwnProperty("options")) {
        // options は ko.observableArray にしたい.
        // 派生クラスで jQuery.extend を実行しているので、ko.observable オブジェクトの付け替えが発生してしまう.
        // そうなると、値変化を検出できなくなるので、基底クラスで options を処理して
        // jQuery.extend による付け替えを回避する.
        options = self.params.options;

        if (bitlib.common.isObservableArray(options)) {
          options = options();
        } else if (bitlib.common.isArray(options)) {
          options = options;
        } else {
          // JavaScript の object
          options = [options];
        }

        self.params.optionsOriginal = bitlib.common.copyDeep(options);
        delete self.params.options;
      }

      // observable化
      options = ko.observableArray(options);

      self.options = ko.pureComputed(function () {
        return options();
      }, self);

      self._addOption = function (newOpts) {
        newOpts = newOpts || [];
        newOpts = bitlib.common.isArray(newOpts) ? newOpts : [newOpts];

        var opts = [];
        bitlib.array.each(newOpts, function (j, opt) {
          if (opt.isSelectUIOptionViewModel) {
            opts.push(opt);
          }
        });

        if (0 < opts.length) {
          options.push.apply(options, opts);
        }

        return self;
      };

      self._clearOptions = function () {
        options.removeAll();
        return self;
      };

      self._outsourceOptions = function (masterRep, buildOptionsFunc) {
        var self = this;

        if (!masterRep || !bitlib.common.isFunction(buildOptionsFunc)) {
          return self;
        }

        var factory = new BitWeb.SelectUIOptionsFactory();

        factory
          .to(options)
          .publish(masterRep, buildOptionsFunc);

        return self;
      };

      self = $.extend(self, self.params);
      return self;
    }

    var _super = BitWeb.TextUIBase;
    inherits(SelectTextUIBase, _super);

    SelectTextUIBase.prototype.outsourceOptions = function (masterRep, buildOptionsFunc) {
      this._outsourceOptions(masterRep, buildOptionsFunc);
      return this;
    };

    SelectTextUIBase.getClassName = function () {
      return className;
    };

    return SelectTextUIBase;
  }());

  BitWeb.SelectableTextUI = (function () {
    var className = "SelectableTextUI";

    function SelectableTextUI() {
      var self = BitWeb.SelectTextUIBase.apply(this, arguments);

      // TextUI で override.
      self = BitWeb.TextUI.apply(self, [self.caption, self.name, self.params]);

      self.type = className;

      self = $.extend(self, self.params);
      return self;
    }

    var _super = BitWeb.SelectTextUIBase;
    inherits(SelectableTextUI, _super);

    var _tsuper = BitWeb.TextUI;
    inherits(SelectableTextUI, _tsuper);

    SelectableTextUI.prototype.openPicker = function () {
      var self = this;

      var uvm = new BitWeb.SelectBoxUI(self.caption, {
        options: bitlib.common.copyDeep(self.options())
      });

      var callback = function (rvm) {
        if (rvm.isValid()) {
          self.value(self.value() + rvm.value());
        }

        return true;
      };

      if ($.selectPickerDialog) {
        $.selectPickerDialog.open(uvm, callback);
      }

      return self;
    };

    SelectableTextUI.getClassName = function () {
      return className;
    };

    return SelectableTextUI;
  }());

  BitWeb.SelectableTextAreaUI = (function () {
    var className = "SelectableTextAreaUI";

    function SelectableTextAreaUI() {
      var self = BitWeb.SelectTextUIBase.apply(this, arguments);

      // TextAreaUI で override.
      self = BitWeb.TextAreaUI.apply(self, [self.caption, self.name, self.params]);

      self.type = className;

      self = $.extend(self, self.params);
      return self;
    }

    var _super = BitWeb.SelectTextUIBase;
    inherits(SelectableTextAreaUI, _super);

    var _tsuper = BitWeb.TextAreaUI;
    inherits(SelectableTextAreaUI, _tsuper);

    SelectableTextAreaUI.prototype.openPicker = function () {
      var self = this;

      var uvm = new BitWeb.SelectBoxUI(self.caption, {
        options: bitlib.common.copyDeep(self.options())
      });

      var callback = function (rvm) {
        if (rvm.isValid()) {
          self.value(self.value() + rvm.value());
        }

        return true;
      };

      if ($.selectPickerDialog) {
        $.selectPickerDialog.open(uvm, callback);
      }

      return self;
    };

    SelectableTextAreaUI.getClassName = function () {
      return className;
    };

    return SelectableTextAreaUI;
  }());

  BitWeb.MultiSelectableTextAreaUI = (function () {
    var className = "MultiSelectableTextAreaUI";

    var OptionCollector = function () {
      var self = BitWeb.CheckBoxUI.apply(this, arguments);

      self.orientation = "vertical";

      self.output = ko.pureComputed(function () {
        if (!self.isValid()) {
          return "";
        }

        var checkedOptions = [];
        bitlib.array.each(self.options, function (i, opt) {
          if (opt.isValid()) {
            checkedOptions.push(opt.optionVal);
          }
        });

        return checkedOptions.join(self.delimiter);
      }, self);

      self = jQuery.extend(self, self.params);

      bitlib.array.each(self.options, function (i, opt) {
        opt.name = opt.name || ("_opt_" + bitlib.common.publishTemporaryUniqueName());
      });

      return self;
    };

    function MultiSelectableTextAreaUI() {
      var self = BitWeb.SelectTextUIBase.apply(this, arguments);

      // TextAreaUI で override.
      self = BitWeb.TextAreaUI.apply(self, [self.caption, self.name, self.params]);

      self.type = className;

      self.optionDelimiter = ",";

      self = $.extend(self, self.params);
      return self;
    }

    var _super = BitWeb.SelectTextUIBase;
    inherits(MultiSelectableTextAreaUI, _super);

    var _tsuper = BitWeb.TextAreaUI;
    inherits(MultiSelectableTextAreaUI, _tsuper);

    MultiSelectableTextAreaUI.prototype.openCollector = function () {
      var self = this;

      var uvm = new OptionCollector(self.caption, {
        delimiter: self.optionDelimiter,
        options: bitlib.common.copyDeep(self.options())
      });

      var callback = function (rvm) {
        if (rvm.isValid()) {
          self.value(self.value() + rvm.output());
        }

        return true;
      };

      if ($.checkBoxPickerDialog) {
        $.checkBoxPickerDialog.open(uvm, callback);
      }

      return self;
    };

    MultiSelectableTextAreaUI.getClassName = function () {
      return className;
    };

    return MultiSelectableTextAreaUI;
  }());

  BitWeb.DateUI = (function () {
    var className = "DateUI";

    var dateTimeCorrector = new BitWeb.DateTimeCorrector();

    function DateUI() {
      var self = BitWeb.UIBase.apply(this, arguments);

      self.type = className;

      self.id = self.type.toLowerCase() + "_" + bitlib.common.publishTemporaryUniqueName();

      self.valueFormat = "YYYY/MM/DD";

      self.date = ko.pureComputed(function () {
        var val = self.value();

        if (!val) {
          return null;
        }

        var date = moment(val, self.valueFormat).toDate();
        if (!bitlib.common.isValidDate(date)) {
          return null;
        }

        return date;
      }, self);

      self.outputFormat = "YYYY/MM/DD";

      self.output = ko.pureComputed(function () {
        var date = self.date();

        if (bitlib.common.isNullOrUndefined(date)) {
          return "";
        }

        return moment(date).format(self.outputFormat);
      }, self);

      self.pickerOptions = {
        beforeShowDay: function (date) {
          var cssClass = "bit-ui-datepicker-dayofweek" + moment(date).format("d");
          var altText = moment(date).format("M/D(dd)");

          return [
            true,
            cssClass,
            altText
          ];
        },
      };

      self = $.extend(self, self.params);
      return self;
    }

    var _super = BitWeb.UIBase;
    inherits(DateUI, _super);

    DateUI.prototype.setDate = function (date) {
      var self = this;

      if (bitlib.common.isValidDate(date)) {
        self.value(moment(date).format(self.valueFormat));
      }

      return self;
    };

    DateUI.prototype.setToday = function () {
      this.setDate(dateTimeCorrector.getNow());
      return this;
    };

    DateUI.prototype.toYearAt = function (year) {
      var self = this;

      if (!self.isValid()) {
        return self;
      }

      year = bitlib.common.toInteger(year);
      if (isNaN(year) || year < 0 || 9999 < year) {
        return self;
      }

      var newDate = new Date(self.date());
      newDate.setFullYear(year);

      self.setDate(newDate);

      return self;
    };

    DateUI.prototype.toPrevYear = function () {
      var self = this;

      if (!self.isValid()) {
        return self;
      }

      var prevYear = self.date().getFullYear() - 1;
      self.toYearAt(prevYear);

      return self;
    };

    DateUI.prototype.toNextYear = function () {
      var self = this;

      if (!self.isValid()) {
        return self;
      }

      var nextYear = self.date().getFullYear() + 1;
      self.toYearAt(nextYear);

      return self;
    };

    DateUI.prototype.toMonthAt = function (month) {
      var self = this;

      if (!self.isValid()) {
        return self;
      }

      month = bitlib.common.toInteger(month);
      if (isNaN(month) || month < 1 || 12 < month) {
        return self;
      }

      var newDate = new Date(self.date());
      newDate.setMonth(month - 1);

      self.setDate(newDate);

      return self;
    };

    DateUI.prototype.toPrevMonth = function () {
      var self = this;

      if (!self.isValid()) {
        return self;
      }

      var prevMonth = self.date().getMonth() - 1;
      self.toMonthAt(prevMonth);

      return self;
    };

    DateUI.prototype.toNextMonth = function () {
      var self = this;

      if (!self.isValid()) {
        return self;
      }

      var nextMonth = self.date().getMonth() + 1;
      self.toMonthAt(nextMonth);

      return self;
    };

    DateUI.prototype.toDayAt = function (day) {
      var self = this;

      if (!self.isValid()) {
        return self;
      }

      day = bitlib.common.toInteger(day);
      if (isNaN(day) || day < 0 || 31 < day) {
        return self;
      }

      var newDate = new Date(self.date());
      newDate.setDate(day);

      self.setDate(newDate);

      return self;
    };

    DateUI.prototype.toPrevDay = function () {
      var self = this;

      if (!self.isValid()) {
        return self;
      }

      var prevDay = self.date().getDate() - 1;
      self.toDayAt(prevDay);

      return self;
    };

    DateUI.prototype.toNextDay = function () {
      var self = this;

      if (!self.isValid()) {
        return self;
      }

      var nextDay = self.date().getDate() + 1;
      self.toDayAt(nextDay);

      return self;
    };

    DateUI.prototype.openPicker = function () {
      var self = this;

      if (self.id) {
        $("#" + self.id).datepicker("show");
      }

      return self;
    };

    DateUI.getClassName = function () {
      return className;
    };

    return DateUI;
  }());

  bitlib.ko.addBindingHandler("bindDatePicker", {
    init: function (element, valueAccessor, allBindingsAccessor, viewModel, bindingContext) {
      // initialize datepicker with some optional options
      var options = $.extend({
        showAnim: "",
        showOn: "",
        // buttonText: "日付選択",
        // showButtonPanel: true,
        numberOfMonths: 2,
        showCurrentAtPos: 1,
        dateFormat: "yy/mm/dd",
        showOtherMonths: true,
        selectOtherMonths: true
      }, viewModel.pickerOptions, (allBindingsAccessor().datePickerOptions || {}));

      if (!element.id) {
        element.id = viewModel.id;
      }

      $.datepicker.setDefaults($.datepicker.regional["ja"]);
      $(element).datepicker(options);

      // handle the field changing
      ko.utils.registerEventHandler(element, "change", function () {
        // datepicker のコントロールが変更されたら、value の更新
        // value が変更されると、internalValue も更新される
        var selectedDate = $(element).datepicker("getDate");
        viewModel.value(moment(selectedDate).format(viewModel.valueFormat));
      });

      // handle disposal (if KO removes by the template binding)
      ko.utils.domNodeDisposal.addDisposeCallback(element, function () {
        $(element).datepicker("destroy");
      });
    },
    update: function (element, valueAccessor, allBindingsAccessor, viewModel, bindingContext) {
      // value, internalValue が更新されたら Datepicker の値を更新する
      var value = ko.utils.unwrapObservable(valueAccessor()),
        current = $(element).datepicker("getDate");

      if ((value - current) !== 0) {
        $(element).datepicker("setDate", value);
      }
    }
  });

  BitWeb.DateRangeUI = (function () {
    var className = "DateRangeUI";

    var dateTimeCorrector = new BitWeb.DateTimeCorrector();

    function DateRangeUI() {
      var self = BitWeb.UIBase.apply(this, arguments);

      self.type = className;

      self.id = self.type.toLowerCase() + "_" + bitlib.common.publishTemporaryUniqueName();

      var pairId = ("ui_" + bitlib.common.publishTemporaryUniqueName());

      self.beginUI = new BitWeb.DateUI({
        isBeginUI: true,
        pairId: pairId
      });

      self.endUI = new BitWeb.DateUI({
        isEndUI: true,
        pairId: pairId
      });

      self.isValid = ko.pureComputed(function () {
        return self.beginUI.isValid() && self.endUI.isValid();
      }, self);

      self._validate = function () {
        return self;
      };

      self._invalidate = function () {
        return self;
      };

      self.value = ko.pureComputed({
        read: function () {
          if (self.isValid()) {
            return self.beginUI.value() + "-" + self.endUI.value();
          }
          return "";
        },
        write: function (newValue) {
          newValue = newValue || "";

          var beginVal = newValue.substring(0, 10),
            endVal = newValue.substring(11, 10);

          self.beginUI.value(beginVal);
          self.endUI.value(endVal);
        },
        owner: self
      });

      self.range = ko.pureComputed(function () {
        var val = self.value();
        if (!val) {
          return null;
        }

        var beginVal = val.substring(0, 10),
          endVal = val.substring(11, 10);

        return bitlib.datetime.createDateRangeObj({
          begin: moment(beginVal, "YYYY/MM/DD").toDate(),
          end: moment(endVal, "YYYY/MM/DD").toDate()
        });
      }, self);

      self.output = ko.pureComputed(function () {
        if (self.isValid()) {
          return self.beginUI.output() + "-" + self.endUI.output();
        }
        return "";
      }, self);

      self = $.extend(self, self.params);
    }

    var _super = BitWeb.UIBase;
    inherits(DateRangeUI, _super);

    DateRangeUI.prototype.setDateRange = function (range) {
      var self = this;

      if (!bitlib.common.isObject(range) || !range.isDateRangeObj) {
        return self;
      }

      var beginVal = moment(range.getBegin()).format("YYYY/MM/DD"),
        endVal = moment(range.getEnd()).format("YYYY/MM/DD");

      self.value(beginVal + "-" + endVal);

      return self;
    };

    DateRangeUI.prototype.setTodayRange = function () {
      var self = this;

      var today = dateTimeCorrector.getNow();

      var range = bitlib.datetime.createDateRangeObj({
        begin: today,
        end: today
      });

      self.setDateRange(range);

      return self;
    };

    DateRangeUI.prototype.shiftForward = function (val) {
      var self = this;

      if (!self.isAvailable() || !self.isValid()) {
        return self;
      }

      var range = self.range().clone();
      range.shiftForward(val);

      if (!range.isEqual(self.range())) {
        self.setDateRange(range);
      }

      return self;
    };

    DateRangeUI.prototype.shiftBackward = function (val) {
      var self = this;

      if (!self.isAvailable() || !self.isValid()) {
        return self;
      }

      var range = self.range().clone();
      range.shiftBackward(val);

      if (!range.isEqual(self.range())) {
        self.setDateRange(range);
      }

      return self;
    };

    DateRangeUI.getClassName = function () {
      return className;
    };

    return DateRangeUI;
  }());

  bitlib.ko.addBindingHandler("bindDateRangePicker", {
    init: function (element, valueAccessor, allBindingsAccessor, viewModel, bindingContext) {
      // initialize datepicker with some optional options
      var options = $.extend({
        showAnim: "",
        showOn: "",
        // buttonText: "日付選択",
        // showButtonPanel: true,
        numberOfMonths: 2,
        showCurrentAtPos: 1,
        dateFormat: "yy/mm/dd",
        showOtherMonths: true,
        selectOtherMonths: true
      }, viewModel.pickerOptions, (allBindingsAccessor().dateRangePickerOptions || {}));

      if (!element.id) {
        element.id = viewModel.id;
      }

      if (viewModel.pairId) {
        $(element)
          .addClass(viewModel.pairId);
      }

      $.datepicker.setDefaults($.datepicker.regional["ja"]);
      $(element).datepicker(options);

      // handle the field changing
      ko.utils.registerEventHandler(element, "change", function () {
        // datepicker のコントロールが変更されたら、value の更新
        // value が変更されると、internalValue も更新される
        var selectedDate = $(element).datepicker("getDate");
        viewModel.value(moment(selectedDate).format(viewModel.valueFormat));
      });

      // handle disposal (if KO removes by the template binding)
      ko.utils.domNodeDisposal.addDisposeCallback(element, function () {
        $(element).datepicker("destroy");
      });
    },
    update: function (element, valueAccessor, allBindingsAccessor, viewModel, bindingContext) {
      // value, internalValue が更新されたら Datepicker の値を更新する
      var value = ko.utils.unwrapObservable(valueAccessor()),
        current = $(element).datepicker("getDate");

      if ((value - current) !== 0) {
        $(element).datepicker("setDate", value);
      }

      if (viewModel.pairId) {
        var $pair = $("." + viewModel.pairId);

        if ($pair.length === 2) {
          var beginDate = $pair.eq(0).datepicker("getDate"),
            endDate = $pair.eq(1).datepicker("getDate");

          if (endDate.getTime() < beginDate.getTime()) {
            if (viewModel.isBeginUI) {
              var evm = ko.dataFor($pair.eq(1).get(0));
              evm.setDate(beginDate);
            } else {
              var bvm = ko.dataFor($pair.eq(0).get(0));
              bvm.setDate(endDate);
            }
          }
        }
      }
    }
  });

  BitWeb.TimeUI = (function () {
    var className = "TimeUI";

    var dateTimeCorrector = new BitWeb.DateTimeCorrector();

    function TimeUI() {
      var self = BitWeb.UIBase.apply(this, arguments);

      self.type = className;

      self.valueFormat = "HH:mm";

      self.time = ko.pureComputed(function () {
        var val = self.value();
        if (!val) {
          return null;
        }

        var date = moment(val, self.valueFormat).toDate();
        if (!bitlib.common.isValidDate(date)) {
          return null;
        }

        return bitlib.datetime.createTimeObj(date);
      }, self);

      self.outputFormat = "HH:mm";

      self.output = ko.pureComputed(function () {
        if (!self.isValid()) {
          return "";
        }

        var date = moment(self.value(), self.valueFormat).toDate();
        if (!bitlib.common.isValidDate(date)) {
          return "";
        }

        return moment(date).format(self.outputFormat);
      }, self);

      self.hourSteps = 1;

      self.selectedHours = ko.observable("---");

      self.minuteSteps = 1;

      self.selectedMinutes = ko.observable("---");

      self = $.extend(self, self.params);

      self.hourOptions = function () {
        var options = ["---"];

        for (var h = 0; h < 24; h += self.hourSteps) {
          options.push(bitlib.string.zeroPadding(h, 2));
        }

        return options;
      }();

      self.minuteOptions = function () {
        var options = ["---"];

        for (var m = 0; m < 60; m += self.minuteSteps) {
          options.push(bitlib.string.zeroPadding(m, 2));
        }

        return options;
      }();

      self.selectedHours.subscribe(function (hours) {
        if (bitlib.common.isNullOrUndefined(hours)) {
          self.selectedMinutes("---");
          return this;
        }

        var minutes = self.selectedMinutes();

        if (bitlib.common.isNullOrUndefined(minutes) || minutes === "---") {
          self.selectedMinutes(self.minuteOptions[1]);
          return this;
        }

        if (hours !== "---") {
          var time = bitlib.datetime.createTimeObj();

          time
            .setHours(hours)
            .setMinutes(minutes);

          self.setTime(time);
        }

        return this;
      });

      self.selectedMinutes.subscribe(function (minutes) {
        minutes = bitlib.common.isNullOrUndefined(minutes) ? "---" : minutes;

        var hours = self.selectedHours();
        hours = bitlib.common.isNullOrUndefined(hours) ? "---" : hours;

        if (minutes === "---" && hours === "---") {
          self.value("");
          return this;
        }

        if (minutes !== "---" && hours !== "---") {
          var time = bitlib.datetime.createTimeObj();

          time
            .setHours(hours)
            .setMinutes(minutes);

          self.setTime(time);
        }

        return this;
      });

      self.time.subscribe(function (time) {
        if (bitlib.common.isNullOrUndefined(time)) {
          self
            .selectedHours("---")
            .selectedMinutes("---");

          return this;
        }

        var h = bitlib.string.zeroPadding(time.getHours(), 2),
          m = bitlib.string.zeroPadding(time.getMinutes(), 2);

        self
          .selectedHours(h)
          .selectedMinutes(m);

        return this;
      });

      return self;
    }

    var _super = BitWeb.UIBase;
    inherits(TimeUI, _super);

    TimeUI.prototype.setTime = function (time) {
      var self = this;

      if (!bitlib.common.isObject(time) || !time.isTimeObj) {
        return self;
      }

      var h = Math.round(time.getHours() / self.hourSteps) * self.hourSteps,
        m = Math.round(time.getMinutes() / self.minuteSteps) * self.minuteSteps;

      // minutesの結果が60分を示す時は0に戻し、時刻を1時間繰り上げる.
      if (59 < m) {
        m = 0;
        h = h + 1;
      }

      time
        .setHours(h)
        .setMinutes(m);

      self.value(moment(time.getTime()).format(self.valueFormat));

      return self;
    };

    TimeUI.prototype.setNow = function () {
      this.setTime(bitlib.datetime.createTimeObj(dateTimeCorrector.getNow()));
      return this;
    };

    TimeUI.prototype.toHourAt = function (hour) {
      var self = this;

      if (!self.isValid()) {
        return self;
      }

      hour = bitlib.common.toInteger(hour);
      if (isNaN(hour) || !isFinite(hour)) {
        return self;
      }

      var time = self.time();
      if (bitlib.common.isNullOrUndefined(time)) {
        return self;
      }

      var newTime = time.clone();
      newTime.setHours(hour);

      self.setTime(newTime);

      return self;
    };

    TimeUI.prototype.toPrevHour = function () {
      var self = this;

      if (!self.isValid()) {
        return self;
      }

      var time = self.time();
      if (bitlib.common.isNullOrUndefined(time)) {
        return self;
      }

      var prevHour = time.getHours() - 1;
      self.toHourAt(prevHour);

      return self;
    };

    TimeUI.prototype.toNextHour = function () {
      var self = this;

      if (!self.isValid()) {
        return self;
      }

      var time = self.time();
      if (bitlib.common.isNullOrUndefined(time)) {
        return self;
      }

      var nextHour = time.getHours() + 1;
      self.toHourAt(nextHour);

      return self;
    };

    TimeUI.prototype.toMinuteAt = function (minute) {
      var self = this;

      if (!self.isValid()) {
        return self;
      }

      minute = bitlib.common.toInteger(minute);
      if (isNaN(minute) || !isFinite(minute)) {
        return self;
      }

      var time = self.time();
      if (bitlib.common.isNullOrUndefined(time)) {
        return self;
      }

      var newTime = time.clone();
      newTime.setMinutes(minute);

      self.setTime(newTime);

      return self;
    };

    TimeUI.prototype.toPrevMinute = function () {
      var self = this;

      if (!self.isValid()) {
        return self;
      }

      var time = self.time();
      if (bitlib.common.isNullOrUndefined(time)) {
        return self;
      }

      var prevMinute = time.getMinutes() - 1;
      self.toMinuteAt(prevMinute);

      return self;
    };

    TimeUI.prototype.toNextMinute = function () {
      var self = this;

      if (!self.isValid()) {
        return self;
      }

      var time = self.time();
      if (bitlib.common.isNullOrUndefined(time)) {
        return self;
      }

      var nextMinute = time.getMinutes() + 1;
      self.toMinuteAt(nextMinute);

      return self;
    };

    TimeUI.prototype.toSecondAt = function (second) {
      var self = this;

      if (!self.isValid()) {
        return self;
      }

      second = bitlib.common.toInteger(second);
      if (isNaN(second) || !isFinite(second)) {
        return self;
      }

      var time = self.time();
      if (bitlib.common.isNullOrUndefined(time)) {
        return self;
      }

      var newTime = time.clone();
      newTime.setSeconds(second);

      self.setTime(newTime);

      return self;
    };

    TimeUI.prototype.toPrevSecond = function () {
      var self = this;

      if (!self.isValid()) {
        return self;
      }

      var time = self.time();
      if (bitlib.common.isNullOrUndefined(time)) {
        return self;
      }

      var prevSecond = time.getSeconds() - 1;
      self.toSecondAt(prevSecond);

      return self;
    };

    TimeUI.prototype.toNextSecond = function () {
      var self = this;

      if (!self.isValid()) {
        return self;
      }

      var time = self.time();
      if (bitlib.common.isNullOrUndefined(time)) {
        return self;
      }

      var nextSecond = time.getSeconds() + 1;
      self.toSecondAt(nextSecond);

      return self;
    };

    TimeUI.prototype.openPicker = function () {
      var self = this;

      if (!$.timePickerDialog) {
        return self;
      }

      var clone = new BitWeb.TimeUI(self.caption, self.params);
      clone.setTime(self.time());

      var callback = function (rvm) {
        self.value(rvm.value());
        return true;
      };

      $.timePickerDialog.open(clone, callback);

      return self;
    };

    TimeUI.getClassName = function () {
      return className;
    };

    return TimeUI;
  }());

  bitlib.ko.addBindingHandler("bindTimePickerDialog", {
    init: function (element, valueAccessor, allBindingsAccessor, viewModel, bindingContext) {
      // initialize picker with some optional options
      var options = $.extend({
        title: "選択してください"
      }, viewModel.pickerDialogOptions, (allBindingsAccessor().timePickerDialogOptions || {}));

      var widget = BitWeb.DialogWidgetFactory.create("timePickerDialog", options);

      $(element).timePickerDialog(options);

      // handle disposal (if KO removes by the template binding)
      ko.utils.domNodeDisposal.addDisposeCallback(element, function () {
        $(element).timePickerDialog("destroy");
      });
    }
  });

  BitWeb.TimeSelectBoxUI = (function () {
    var className = "TimeSelectBoxUI";

    function TimeSelectBoxUI() {
      var self = BitWeb.TimeUI.apply(this, arguments);

      self.type = className;

      self = $.extend(self, self.params);
      return self;
    }

    var _super = BitWeb.TimeUI;
    inherits(TimeSelectBoxUI, _super);

    TimeSelectBoxUI.getClassName = function () {
      return className;
    };

    return TimeSelectBoxUI;
  }());

  BitWeb.DateTimeUI = (function () {
    var className = "DateTimeUI";

    var dateTimeCorrector = new BitWeb.DateTimeCorrector();

    function DateTimeUI() {
      var self = BitWeb.UIBase.apply(this, arguments);

      self.type = className;

      self.valueFormat = "YYYY/MM/DD HH:mm";

      self.dttm = ko.pureComputed(function () {
        var val = self.value();
        if (!val) {
          return null;
        }

        var date = moment(val, self.valueFormat).toDate();
        if (!bitlib.common.isValidDate(date)) {
          return null;
        }

        return bitlib.datetime.createDateTimeObj(date);
      }, self);

      self.outputFormat = "YYYY/MM/DD HH:mm";

      self.output = ko.pureComputed(function () {
        if (!self.isValid()) {
          return "";
        }

        var date = moment(self.value(), self.valueFormat).toDate();
        if (!bitlib.common.isValidDate(date)) {
          return "";
        }

        return moment(date).format(self.outputFormat);
      }, self);

      self.dateUI = new BitWeb.DateUI($.extend(true, {
        // none
      }, self.dateUIParams));

      self.timeUI = new BitWeb.TimeUI($.extend(true, {
        // none
      }, self.timeUIParams));

      self = $.extend(self, self.params);

      self.dateUI.date.subscribe(function (date) {
        var time = self.timeUI.time();

        if (bitlib.common.isNullOrUndefined(date)) {
          self.timeUI.clear();
          return this;
        }

        if (bitlib.common.isNullOrUndefined(time)) {
          self.timeUI.setTime(bitlib.datetime.createTimeObj());
          return this;
        }

        var clone = moment(date)
          .hours(time.getHours())
          .minutes(time.getMinutes())
          .toDate();

        self.setDateTime(bitlib.datetime.createDateTimeObj(clone));

        return this;
      });

      self.timeUI.time.subscribe(function (time) {
        var date = self.dateUI.date();

        if (!bitlib.common.isNullOrUndefined(time)) {
          if (bitlib.common.isNullOrUndefined(date)) {
            date = dateTimeCorrector.getNow();
          }

          var clone = moment(date)
            .hours(time.getHours())
            .minutes(time.getMinutes())
            .toDate();

          self.setDateTime(bitlib.datetime.createDateTimeObj(clone));

          return this;
        }

        if (bitlib.common.isNullOrUndefined(time) && bitlib.common.isNullOrUndefined(date)) {
          self.clear();
        }

        return this;
      });

      self.dttm.subscribe(function (dttm) {
        if (bitlib.common.isNullOrUndefined(dttm)) {
          self.dateUI.clear();
          self.timeUI.clear();

          return this;
        }

        self.dateUI.setDate(dttm.toDate());
        self.timeUI.setTime(bitlib.datetime.createTimeObj(dttm.toDate()));

        return this;
      });

      return self;
    }

    var _super = BitWeb.UIBase;
    inherits(DateTimeUI, _super);

    DateTimeUI.prototype.setDateTime = function (dttm) {
      var self = this;

      if (!bitlib.common.isObject(dttm) || !dttm.isDateTimeObj) {
        return self;
      }

      self.value(moment(dttm.toDate()).format(self.valueFormat));

      return self;
    };

    DateTimeUI.prototype.setNow = function () {
      this.setDateTime(bitlib.datetime.createDateTimeObj(dateTimeCorrector.getNow()));
      return this;
    };

    DateTimeUI.prototype.toYearAt = function (year) {
      var self = this;

      if (!self.isValid()) {
        return self;
      }

      year = bitlib.common.toInteger(year);
      if (isNaN(year) || year < 0 || 9999 < year) {
        return self;
      }

      var newDate = new Date(self.date());
      newDate.setFullYear(year);

      self.setDateTime(bitlib.datetime.createDateTimeObj(newDate));

      return self;
    };

    DateTimeUI.prototype.toPrevYear = function () {
      var self = this;

      if (!self.isValid()) {
        return self;
      }

      var prevYear = self.dttm().toDate().getFullYear() - 1;
      self.toYearAt(prevYear);

      return self;
    };

    DateTimeUI.prototype.toNextYear = function () {
      var self = this;

      if (!self.isValid()) {
        return self;
      }

      var nextYear = self.dttm().toDate().getFullYear() + 1;
      self.toYearAt(nextYear);

      return self;
    };

    DateTimeUI.prototype.toMonthAt = function (month) {
      var self = this;

      if (!self.isValid()) {
        return self;
      }

      month = bitlib.common.toInteger(month);
      if (isNaN(month) || month < 1 || 12 < month) {
        return self;
      }

      var newDate = new Date(self.date());
      newDate.setMonth(month - 1);

      self.setDateTime(bitlib.datetime.createDateTimeObj(newDate));

      return self;
    };

    DateTimeUI.prototype.toPrevMonth = function () {
      var self = this;

      if (!self.isValid()) {
        return self;
      }

      var prevMonth = self.dttm().toDate().getMonth() - 1;
      self.toMonthAt(prevMonth);

      return self;
    };

    DateTimeUI.prototype.toNextMonth = function () {
      var self = this;

      if (!self.isValid()) {
        return self;
      }

      var nextMonth = self.dttm().toDate().getMonth() + 1;
      self.toMonthAt(nextMonth);

      return self;
    };

    DateTimeUI.prototype.toDayAt = function (day) {
      var self = this;

      if (!self.isValid()) {
        return self;
      }

      day = bitlib.common.toInteger(day);
      if (isNaN(day)) {
        return self;
      }

      var newDate = new Date(self.date());
      newDate.setDate(day);

      self.setDateTime(bitlib.datetime.createDateTimeObj(newDate));

      return self;
    };

    DateTimeUI.prototype.toPrevDay = function () {
      var self = this;

      if (!self.isValid()) {
        return self;
      }

      var prevDay = self.dttm().toDate().getDate() - 1;
      self.toDayAt(prevDay);

      return self;
    };

    DateTimeUI.prototype.toNextDay = function () {
      var self = this;

      if (!self.isValid()) {
        return self;
      }

      var nextDay = self.dttm().toDate().getDate() + 1;
      self.toDayAt(nextDay);

      return self;
    };

    DateTimeUI.prototype.toHourAt = function (hour) {
      var self = this;

      if (!self.isValid()) {
        return self;
      }

      hour = bitlib.common.toInteger(hour);
      if (isNaN(hour) || !isFinite(hour)) {
        return self;
      }

      var dttm = self.dttm();
      if (bitlib.common.isNullOrUndefined(dttm)) {
        return self;
      }

      var newDttm = dttm.clone();
      newDttm.setHours(hour);

      self.setDateTime(newDttm);

      return self;
    };

    DateTimeUI.prototype.toPrevHour = function () {
      var self = this;

      if (!self.isValid()) {
        return self;
      }

      var dttm = self.dttm();
      if (bitlib.common.isNullOrUndefined(dttm)) {
        return self;
      }

      var prevHour = dttm.getHours() - 1;
      self.toHourAt(prevHour);

      return self;
    };

    DateTimeUI.prototype.toNextHour = function () {
      var self = this;

      if (!self.isValid()) {
        return self;
      }

      var dttm = self.dttm();
      if (bitlib.common.isNullOrUndefined(dttm)) {
        return self;
      }

      var nextHour = dttm.getHours() + 1;
      self.toHourAt(nextHour);

      return self;
    };

    DateTimeUI.prototype.toMinuteAt = function (minute) {
      var self = this;

      if (!self.isValid()) {
        return self;
      }

      minute = bitlib.common.toInteger(minute);
      if (isNaN(minute) || !isFinite(minute)) {
        return self;
      }

      var dttm = self.dttm();
      if (bitlib.common.isNullOrUndefined(dttm)) {
        return self;
      }

      var newDttm = dttm.clone();
      newDttm.setMinutes(minute);

      self.setDateTime(newDttm);

      return self;
    };

    DateTimeUI.prototype.toPrevMinute = function () {
      var self = this;

      if (!self.isValid()) {
        return self;
      }

      var dttm = self.dttm();
      if (bitlib.common.isNullOrUndefined(dttm)) {
        return self;
      }

      var prevMinute = dttm.getMinutes() - 1;
      self.toMinuteAt(prevMinute);

      return self;
    };

    DateTimeUI.prototype.toNextMinute = function () {
      var self = this;

      if (!self.isValid()) {
        return self;
      }

      var dttm = self.dttm();
      if (bitlib.common.isNullOrUndefined(dttm)) {
        return self;
      }

      var nextMinute = dttm.getMinutes() + 1;
      self.toMinuteAt(nextMinute);

      return self;
    };

    DateTimeUI.prototype.toSecondAt = function (second) {
      var self = this;

      if (!self.isValid()) {
        return self;
      }

      second = bitlib.common.toInteger(second);
      if (isNaN(second) || !isFinite(second)) {
        return self;
      }

      var dttm = self.dttm();
      if (bitlib.common.isNullOrUndefined(dttm)) {
        return self;
      }

      var newDttm = dttm.clone();
      newDttm.setSeconds(second);

      self.setDateTime(newDttm);

      return self;
    };

    DateTimeUI.prototype.toPrevSecond = function () {
      var self = this;

      if (!self.isValid()) {
        return self;
      }

      var dttm = self.dttm();
      if (bitlib.common.isNullOrUndefined(dttm)) {
        return self;
      }

      var prevSecond = dttm.getSeconds() - 1;
      self.toSecondAt(prevSecond);

      return self;
    };

    DateTimeUI.prototype.toNextSecond = function () {
      var self = this;

      if (!self.isValid()) {
        return self;
      }

      var dttm = self.dttm();
      if (bitlib.common.isNullOrUndefined(dttm)) {
        return self;
      }

      var nextSecond = dttm.getSeconds() + 1;
      self.toSecondAt(nextSecond);

      return self;
    };

    DateTimeUI.getClassName = function () {
      return className;
    };

    return DateTimeUI;
  }());

  BitWeb.TimeSpanUI = (function () {
    var className = "TimeSpanUI";

    function TimeSpanUI() {
      var self = BitWeb.UIBase.apply(this, arguments);

      self.type = className;

      self.valueFormat = "HHH:mm";

      self._formatValue = function (timeSpan) {
        if (!bitlib.common.isObject(timeSpan) || !timeSpan.isTimeSpanObj) {
          return "";
        }

        var f = self.valueFormat;

        var val = f
          .replace(/HHH/i, bitlib.string.zeroPadding(timeSpan.getHours(), 3))
          .replace(/mm/i, bitlib.string.zeroPadding(timeSpan.getMinutes(), 2));

        if (f.match(/ss/i)) {
          val = val.replace(/ss/i, bitlib.string.zeroPadding(timeSpan.getSecounds(), 2));
        }

        return val;
      };

      self.timeSpan = ko.pureComputed(function () {
        var f = self.valueFormat,
          val = self.value();

        if (!val) {
          return null;
        }

        var str = val.substr(f.search(/HHH/i), 3) + val.substr(f.search(/mm/i), 2);

        if (f.match(/ss/i)) {
          str += val.substr(f.search(/ss/i), 2);
        }

        var times = bitlib.datetime.toTimesFromTimeSpanStr(str);
        if (isNaN(times)) {
          return null;
        }

        return bitlib.datetime.createTimeSpanObj(times);
      }, self);

      self.outputFormat = "HHH時間mm分";

      self.output = ko.pureComputed(function () {
        if (!self.isValid()) {
          return "";
        }

        var timeSpan = self.timeSpan();
        if (bitlib.common.isNullOrUndefined(timeSpan)) {
          return "";
        }

        var str = "",
          f = self.outputFormat;

        if (0 < timeSpan.getHours()) {
          str += timeSpan.getHours() + f.substring((f.search(/H[^H]+$/i) + 1), (f.search(/(.m|[^H]$)/i) + 1));
        }

        if ((!str && !f.match(/ss/i)) || 0 < timeSpan.getMinutes()) {
          str += timeSpan.getMinutes() + f.substring((f.search(/m[^m]+$/i) + 1), (f.search(/(.s|[^m]$)/i) + 1));
        }

        if (f.match(/ss/i) && (!str || 0 < timeSpan.getSecounds())) {
          str += timeSpan.getSecounds() + f.substring((f.search(/s[^s]+$/i) + 1), (f.search(/[^s]$/i) + 1));
        }

        return str;
      }, self);

      self.hoursUI = new BitWeb.NumericUI($.extend({
        max: 999,
        min: 0,
        maxLength: 3,
        forbiddenKeys: [
          "-",
          "."
        ]
      }, self.hoursUIParams));

      self.minutesUI = new BitWeb.NumericUI($.extend({
        max: 59,
        min: 0,
        maxLength: 2,
        forbiddenKeys: [
          "-",
          "."
        ]
      }, self.minutesUIParams));

      self = $.extend(self, self.params);

      self.hoursUI.value.subscribe(function (val) {
        var mVal = self.minutesUI.value();

        if (!val && !mVal) {
          self.value("");
          return this;
        }

        if (!mVal) {
          self.minutesUI.value("0");
          return this;
        }

        var times = (bitlib.common.toInteger(val) * 3600000) + (bitlib.common.toInteger(mVal) * 60000);
        self.setTimeSpan(bitlib.datetime.createTimeSpanObj(times));

        return this;
      });

      self.minutesUI.value.subscribe(function (val) {
        var hVal = self.hoursUI.value();

        if (!val && !hVal) {
          self.value("");
          return this;
        }

        if (!hVal) {
          self.hoursUI.value("0");
          return this;
        }

        var times = (bitlib.common.toInteger(hVal) * 3600000) + (bitlib.common.toInteger(val) * 60000);
        self.setTimeSpan(bitlib.datetime.createTimeSpanObj(times));

        return this;
      });

      self.timeSpan.subscribe(function (timeSpan) {
        if (bitlib.common.isNullOrUndefined(timeSpan)) {
          self.hoursUI.value("");
          self.minutesUI.value("");

          return this;
        }

        var hours = timeSpan.getHours();
        self.hoursUI.value(hours.toString());

        var minutes = timeSpan.getMinutes();
        self.minutesUI.value(minutes.toString());

        return this;
      });

      return self;
    }

    var _super = BitWeb.UIBase;
    inherits(TimeSpanUI, _super);

    TimeSpanUI.prototype.setTimeSpan = function (timeSpan) {
      var self = this;

      if (!bitlib.common.isObject(timeSpan) || !timeSpan.isTimeSpanObj) {
        return self;
      }

      self.value(self._formatValue(timeSpan));

      return self;
    };

    TimeSpanUI.getClassName = function () {
      return className;
    };

    return TimeSpanUI;
  }());

  BitWeb.SelectUIOption = (function () {
    var className = "SelectUIOption";

    function SelectUIOption() {
      var args = [];
      args.push.apply(args, arguments);

      var optionVal = "";

      var i = 0,
        len = 0;

      for (i = 0, len = args.length; i < len; i++) {
        if (bitlib.common.isString(args[i])) {
          switch (i) {
            case 2:
              optionVal = args[i];
              break;
            default:
              // none
          }
        }
      }

      var self = BitWeb.UIBase.apply(this, arguments);

      self.isSelectUIOptionViewModel = true;
      self.type = className;

      self.optionVal = optionVal;

      var checked = ko.observable(false);

      self.checked = ko.computed({
        read: function () {
          return checked();
        },
        write: function (newValue) {
          checked(bitlib.common.toBoolean(newValue));
        },
        owner: self
      });

      self.isChecked = ko.pureComputed(function () {
        return checked();
      }, self);

      self._check = function () {
        if (!checked()) {
          checked(true);
        }
        return self;
      };

      self._uncheck = function () {
        if (checked()) {
          checked(false);
        }
        return self;
      };

      self.value = ko.computed({
        read: function () {
          if (self.isValid()) {
            return self._cachedValue();
          }
          return "";
        },
        write: function (newValue) {
          newValue = newValue || "";

          if (newValue === self.optionVal) {
            self
              ._cachedValue(newValue)
              ._check()
              ._validate();
          } else {
            self
              ._cachedValue("")
              ._uncheck()
              ._invalidate();
          }
        },
        owner: self
      });

      self.output = ko.pureComputed(function () {
        if (self.isValid()) {
          return self.caption;
        }
        return "";
      }, self);

      self = $.extend(self, self.params);
      return self;
    }

    var _super = BitWeb.UIBase;
    inherits(SelectUIOption, _super);

    SelectUIOption.prototype.toText = function () {
      var self = this;

      if (!self.isValid()) {
        return self.caption;
      }

      return self.prefix + self.output() + self.suffix;
    };

    SelectUIOption.prototype.writeData = function (data) {
      var self = this;

      data = data || [];

      if (bitlib.common.isNullOrUndefined(data[0])) {
        data[0] = self.value();
      }

      return data;
    };

    SelectUIOption.prototype.check = function () {
      var self = this;

      if (!self.isValid()) {
        self.value(self.optionVal);
      }

      return self;
    };

    SelectUIOption.prototype.uncheck = function () {
      var self = this;

      if (self.isValid()) {
        self.clear();
      }

      return self;
    };

    SelectUIOption.prototype.switchTo = function () {
      var self = this;

      if (self.checked()) {
        self.uncheck();
      } else {
        self.check();
      }

      return self;
    };

    SelectUIOption.getClassName = function () {
      return className;
    };

    return SelectUIOption;
  }());

  BitWeb.SelectUIBase = (function () {
    var className = "SelectUIBase";

    function SelectUIBase() {
      var self = BitWeb.UIBase.apply(this, arguments);

      self.type = className;

      var options = [];

      if (self.params.hasOwnProperty("options")) {
        // options は ko.observableArray にしたい.
        // 派生クラスで jQuery.extend を実行しているので、ko.observable オブジェクトの付け替えが発生してしまう.
        // そうなると、値変化を検出できなくなるので、基底クラスで options を処理して
        // jQuery.extend による付け替えを回避する.
        options = self.params.options;

        if (bitlib.common.isObservableArray(options)) {
          options = options();
        } else if (bitlib.common.isArray(options)) {
          options = options;
        } else {
          // JavaScript の object
          options = [options];
        }

        if (self.isReadOnly()) {
          bitlib.array.each(options, function (i, opt) {
            opt.forbidWrite();
          });
        }

        if (!self.isCopyable()) {
          bitlib.array.each(options, function (i, opt) {
            opt.forbidCopy();
          });
        }

        self.params.optionsOriginal = bitlib.common.copyDeep(self.params.options);
        delete self.params.options;
      }

      // observable化
      options = ko.observableArray(options);

      self.options = ko.pureComputed(function () {
        return options();
      }, self);

      self.reverseOptions = ko.pureComputed(function () {
        return options.slice(0).reverse();
      }, self);

      self._addOption = function (newOpts) {
        newOpts = newOpts || [];
        newOpts = bitlib.common.isArray(newOpts) ? newOpts : [newOpts];

        var opts = [];
        for (var i = 0, len = newOpts.length; i < len; i++) {
          if (bitlib.common.isObject(newOpts[i]) && newOpts[i].isSelectUIOptionViewModel) {
            opts.push(newOpts[i]);
          }
        }

        if (0 < opts.length) {
          options.push.apply(options, opts);
        }

        return self;
      };

      self._clearOptions = function () {
        options.removeAll();
        return self;
      };

      self._outsourceOptions = function (masterRep, buildOptionsFunc) {
        var self = this;

        if (!masterRep || !bitlib.common.isFunction(buildOptionsFunc)) {
          return self;
        }

        var factory = new BitWeb.SelectUIOptionsFactory();

        factory
          .to(options)
          .publish(masterRep, buildOptionsFunc);

        return self;
      };

      self = $.extend(self, self.params);
      return self;
    }

    var _super = BitWeb.UIBase;
    inherits(SelectUIBase, _super);

    SelectUIBase.prototype.permitWrite = function () {
      var self = this;

      _super.prototype.permitWrite.call(self);

      bitlib.array.each(self.options, function (i, opt) {
        if (opt.isReadOnly()) {
          opt.permitWrite();
        }
      });

      return self;
    };

    SelectUIBase.prototype.forbidWrite = function () {
      var self = this;

      _super.prototype.forbidWrite.call(self);

      bitlib.array.each(self.options, function (i, opt) {
        if (opt.isWritable()) {
          opt.forbidWrite();
        }
      });

      return self;
    };

    SelectUIBase.prototype.permitCopy = function () {
      var self = this;

      _super.prototype.permitCopy.call(self);

      bitlib.array.each(self.options, function (i, opt) {
        if (!opt.isCopyable()) {
          opt.permitCopy();
        }
      });

      return self;
    };

    SelectUIBase.prototype.forbidCopy = function () {
      var self = this;

      _super.prototype.forbidCopy.call(self);

      bitlib.array.each(self.options, function (i, opt) {
        if (opt.isCopyable()) {
          opt.forbidCopy();
        }
      });

      return self;
    };

    SelectUIBase.prototype.reset = function () {
      var self = this;

      bitlib.array.each(self.options, function (i, opt) {
        opt.reset();
      });

      _super.prototype.reset.call(self);

      return self;
    };

    SelectUIBase.prototype.clear = function () {
      var self = this;

      if (self.isReadOnly()) {
        return self;
      }

      bitlib.array.each(self.options, function (i, opt) {
        opt.clear();
      });

      _super.prototype.clear.call(self);

      return self;
    };

    SelectUIBase.prototype.getUIByName = function (names) {
      var self = this;

      names = names || [];
      names = bitlib.common.isArray(names) ? names : [names];

      if (names.length === 0) {
        return [];
      }

      var results = _super.prototype.getUIByName.call(this, names);

      bitlib.array.each(self.options, function (i, opt) {
        results = results.concat(opt.getUIByName(names));
      });

      return results;
    };

    SelectUIBase.prototype.deserialize = function (getter) {
      var self = this;

      if (!bitlib.common.isFunction(getter)) {
        return self;
      }

      _super.prototype.deserialize.call(self, getter);

      bitlib.array.each(self.options, function (i, opt) {
        opt.deserialize(getter);
      });

      return self;
    };

    SelectUIBase.prototype.serialize = function (setter) {
      var self = this;

      if (!bitlib.common.isFunction(setter) || self.isReadOnly()) {
        return self;
      }

      _super.serialize.call(self, setter);

      bitlib.array.each(self.options, function (i, opt) {
        opt.serialize(setter);
      });

      return self;
    };

    SelectUIBase.prototype.command = function (indicator) {
      var self = this;

      if (!bitlib.common.isFunction(indicator)) {
        return self;
      }

      _super.prototype.command.call(self, indicator);

      bitlib.array.each(self.options, function (i, opt) {
        opt.command(indicator);
      });

      return self;
    };

    SelectUIBase.prototype.outsourceOptions = function (masterRep, buildOptionsFunc) {
      this._outsourceOptions(masterRep, buildOptionsFunc);
      return this;
    };

    SelectUIBase.getClassName = function () {
      return className;
    };

    return SelectUIBase;
  }());

  BitWeb.SelectBoxUI = (function () {
    var className = "SelectBoxUI";

    function SelectBoxUI() {
      var self = BitWeb.SelectUIBase.apply(this, arguments);

      self.type = className;

      self.output = ko.pureComputed(function () {
        if (!self.isValid()) {
          return "";
        }

        var result = "";
        bitlib.array.each(self.options, function (i, opt) {
          if (opt.optionVal === self.value()) {
            result = opt.caption;
            return false;
          }
          return true;
        });

        return result;
      }, self);

      self = $.extend(self, self.params);
      return self;
    }

    var _super = BitWeb.SelectUIBase;
    inherits(SelectBoxUI, _super);

    SelectBoxUI.getClassName = function () {
      return className;
    };

    return SelectBoxUI;
  }());

  bitlib.ko.addBindingHandler("bindSelectPickerDialog", {
    init: function (element, valueAccessor, allBindingsAccessor, viewModel, bindingContext) {
      var options = $.extend({
        title: "選択してください"
      }, viewModel.pickerDialogOptions, (allBindingsAccessor().selectPickerDialogOptions || {}));

      var widget = BitWeb.DialogWidgetFactory.create("selectPickerDialog", options);

      $(element).selectPickerDialog(options);

      // handle disposal (if KO removes by the template binding)
      ko.utils.domNodeDisposal.addDisposeCallback(element, function () {
        $(element).selectPickerDialog("destroy");
      });
    }
  });

  BitWeb.CheckCollectionUIBase = (function () {
    var className = "CheckCollectionUIBase";

    function CheckCollectionUIBase() {
      var self = BitWeb.SelectUIBase.apply(this, arguments);

      self.type = className;

      self.orientation = "horizontal"; // horizontal/vertical
      self.delimiter = ", ";

      self.isValid = ko.pureComputed(function () {
        var isValid = bitlib.array.any(self.options, function (i, opt) {
          return opt.isValid();
        });
        return isValid;
      }, self);

      self._validate = function () {
        return self;
      };

      self._invalidate = function () {
        return self;
      };

      self.value = ko.computed({
        read: function () {
          return "";
        },
        write: function () {
          // none
        },
        owner: self
      });

      self.output = ko.pureComputed(function () {
        if (!self.isValid()) {
          return "";
        }

        var checkedOptions = [];
        bitlib.array.each(self.options, function (i, opt) {
          if (opt.isValid()) {
            checkedOptions.push(opt.caption)
          }
        });

        return checkedOptions.join(self.delimiter);
      }, self);

      self = $.extend(self, self.params);
      return self;
    }

    var _super = BitWeb.SelectUIBase;
    inherits(CheckCollectionUIBase, _super);

    CheckCollectionUIBase.getClassName = function () {
      return className;
    };

    return CheckCollectionUIBase;
  }());

  bitlib.ko.addBindingHandler("bindCheckCollectionOptions", {
    init: function (element, valueAccessor, allBindingsAccessor, viewModel, bindingContext) {
      var orientation = viewModel.orientation;

      if (!!orientation && bitlib.common.isString(orientation)) {
        $(element)
          .addClass(orientation);
      }
    }
  });

  BitWeb.CheckBoxUI = (function () {
    var className = "CheckBoxUI";

    function CheckBoxUI() {
      var self = BitWeb.CheckCollectionUIBase.apply(this, arguments);

      self.type = className;

      self.value = ko.computed({
        read: function () {
          if (!self.isValid()) {
            return "";
          }

          var values = [];
          bitlib.array.each(self.options, function (i, opt) {
            if (opt.isValid()) {
              values.push(opt.value());
            }
          });

          return values.join(self.delimiter);
        },
        write: function () {
          // none
        },
        owner: self
      });

      self.maxChecked = -1; // -1: 無制限

      self.overLength = ko.pureComputed(function () {
        var maxLen = bitlib.common.toInteger(self.maxChecked),
          val = self.value().split(self.delimiter);

        if (isNaN(maxLen) || maxLen < 1 || !self.isValid()) {
          return 0;
        }

        return (maxLen < val.length) ? (val.length - maxLen) : 0;
      }, self);

      self.minChecked = -1; // -1: 無制限

      self.missLength = ko.pureComputed(function () {
        var minLen = bitlib.common.toInteger(self.minChecked),
          maxLen = bitlib.common.toInteger(self.maxChecked),
          val = self.value().split(self.delimiter);

        if (0 < maxLen && maxLen < minLen) {
          minLen = maxLen;
        }

        if (!self.isValid()) {
          return minLen;
        }

        return (val.length < minLen) ? (minLen - val.length) : 0;
      }, self);

      self = $.extend(self, self.params);
      return self;
    }

    var _super = BitWeb.CheckCollectionUIBase;
    inherits(CheckBoxUI, _super);

    CheckBoxUI.prototype.getUIByName = function (names) {
      var self = this;

      names = names || [];
      names = bitlib.common.isArray(names) ? names : [names];

      if (names.length === 0) {
        return [];
      }

      var options = self.options(),
        results = _super.prototype.getUIByName.call(this, names);

      bitlib.array.each(options, function (i, opt) {
        results = results.concat(opt.getUIByName(names));
      });

      if (!!self.name || options.length === 0) {
        return results;
      }

      // Alias名での指定を可能にする.
      var alias = (options[0].name + "-" + options[options.length - 1].name);

      bitlib.array.each(names, function (i, name) {
        if (name === alias) {
          results.push(self);
          return false;
        }
        return true;
      });

      return results;
    };

    CheckBoxUI.prototype.checkAll = function () {
      var self = this;

      if (self.isReadOnly()) {
        return self;
      }

      bitlib.array.each(self.options, function (i, opt) {
        if (!!opt.name && !opt.isValid()) {
          opt.value(opt.optionVal);
        }
      });

      return self;
    };

    CheckBoxUI.prototype.uncheckAll = function () {
      var self = this;

      if (self.isReadOnly()) {
        return self;
      }

      bitlib.array.each(self.options, function (i, opt) {
        if (!!opt.name && opt.isValid()) {
          opt.clear();
        }
      });

      return self;
    };

    CheckBoxUI.getClassName = function () {
      return className;
    };

    return CheckBoxUI;
  }());

  bitlib.ko.addBindingHandler("bindCheckBoxOption", {
    update: function (element, valueAccessor, allBindingsAccessor, viewModel, bindingContext) {
      var checked = valueAccessor();

      if (checked()) {
        if (!viewModel.isValid()) {
          viewModel.value(viewModel.optionVal);
        }
      } else {
        if (viewModel.isValid()) {
          viewModel.clear();
        }
      }
    }
  });

  BitWeb.CheckBoxDialogUI = (function () {
    var className = "CheckBoxDialogUI";

    function CheckBoxDialogUI() {
      var self = BitWeb.CheckBoxUI.apply(this, arguments);

      self.type = className;

      self.orientation = "vertical";

      self = $.extend(self, self.params);
      return self;
    }

    var _super = BitWeb.CheckBoxUI;
    inherits(CheckBoxDialogUI, _super);

    CheckBoxDialogUI.prototype.openPicker = function () {
      var self = this;

      if ($.checkBoxPicker) {
        $.checkBoxPicker.open(self);
      }

      return self;
    };

    CheckBoxDialogUI.getClassName = function () {
      return className;
    };

    return CheckBoxDialogUI;
  }());

  bitlib.ko.addBindingHandler("bindCheckBoxPicker", {
    init: function (element, valueAccessor, allBindingsAccessor, viewModel, bindingContext) {
      // initialize picker with some optional options
      var options = $.extend({
        title: "選択してください"
      }, viewModel.pickerOptions, (allBindingsAccessor().checkBoxPickerOptions || {}));

      var widget = BitWeb.ViewboxWidgetFactory.create("checkBoxPicker", options);

      $(element).checkBoxPicker(options);

      // handle disposal (if KO removes by the template binding)
      ko.utils.domNodeDisposal.addDisposeCallback(element, function () {
        $(element).checkBoxPicker("destroy");
      });
    }
  });

  bitlib.ko.addBindingHandler("bindCheckBoxPickerDialog", {
    init: function (element, valueAccessor, allBindingsAccessor, viewModel, bindingContext) {
      // initialize pickerDialog with some optional options
      var options = $.extend({
        title: "選択してください"
      }, viewModel.pickerDialogOptions, (allBindingsAccessor().checkBoxPickerDialogOptions || {}));

      var widget = BitWeb.DialogWidgetFactory.create("checkBoxPickerDialog", options);

      $(element).checkBoxPickerDialog(options);

      // handle disposal (if KO removes by the template binding)
      ko.utils.domNodeDisposal.addDisposeCallback(element, function () {
        $(element).checkBoxPickerDialog("destroy");
      });
    }
  });

  bitlib.ko.addBindingHandler("bindCheckBoxPickerContents", {
    init: function (element, valueAccessor, allBindingsAccessor, viewModel, bindingContext) {
      var maxHeight = (screen.availHeight * 0.5);

      $(element)
        .css({
          overflowY: "auto",
          maxHeight: (maxHeight + "px")
        });
    }
  });

  bitlib.ko.addBindingHandler("bindCheckBoxPickerOption", {
    init: function (element, valueAccessor, allBindingsAccessor, viewModel, bindingContext) {
      var checked = valueAccessor(),
        icons = $.extend({
          on: "fa-check-square",
          off: "fa-square-o"
        }, allBindingsAccessor().checkBoxIcons);

      if (checked()) {
        $(element)
          .addClass(icons.on);
      } else {
        $(element)
          .addClass(icons.off);
      }
    },
    update: function (element, valueAccessor, allBindingsAccessor, viewModel, bindingContext) {
      var checked = valueAccessor(),
        icons = $.extend({
          on: "fa-check-square",
          off: "fa-square-o"
        }, allBindingsAccessor().checkBoxIcons);

      if (checked()) {
        $(element)
          .removeClass(icons.off)
          .addClass(icons.on);
      } else {
        $(element)
          .removeClass(icons.on)
          .addClass(icons.off);
      }
    }
  });

  BitWeb.RadioButtonUI = (function () {
    var className = "RadioButtonUI";

    function RadioButtonUI() {
      var self = BitWeb.CheckCollectionUIBase.apply(this, arguments);

      self.type = className;

      self.value = ko.computed({
        read: function () {
          if (!self.isValid()) {
            return "";
          }

          var options = self.options();
          for (var i = 0, len = options.length; i < len; i++) {
            if (options[i].isValid()) {
              return options[i].value();
            }
          }

          return "";
        },
        write: function (newValue) {
          newValue = newValue || "";

          bitlib.array.each(self.options, function (i, opt) {
            if (opt.optionVal === newValue) {
              option.value(newValue);
            } else {
              option.value("");
            }
          });
        },
        owner: self
      });

      self.optname = ("_opt_" + bitlib.common.publishTemporaryUniqueName() + "_");

      self = $.extend(self, self.params);
      return self;
    }

    var _super = BitWeb.CheckCollectionUIBase;
    inherits(RadioButtonUI, _super);

    RadioButtonUI.getClassName = function () {
      return className;
    };

    return RadioButtonUI;
  }());

  bitlib.ko.addBindingHandler("bindRadioButtonOption", {
    init: function (element, valueAccessor, allBindingsAccessor, viewModel, bindingContext) {
      var parent = bindingContext.$parent,
        $element = $(element);

      if (viewModel.isValid()) {
        $element
          .on("click.radiobutton-option", function () {
            parent.clear();
          });
      }

      viewModel.isValid.subscribe(function (isValid) {
        if (isValid) {
          $element
            .on("click.radiobutton-option", function () {
              parent.clear();
            });
        } else {
          $element.off("click.radiobutton-option");
        }
      });
    },
    update: function (element, valueAccessor, allBindingsAccessor, viewModel, bindingContext) {
      var parent = bindingContext.$parent,
        checked = valueAccessor();

      if (checked()) {
        bitlib.array.each(parent.options, function (i, opt) {
          if ((viewModel.optionVal !== opt.optionVal) && opt.isValid()) {
            opt.clear();
          }
        });

        if (!viewModel.isValid()) {
          viewModel.value(viewModel.optionVal);
        }
      }
    }
  });

  BitWeb.RadioButtonDialogUI = (function () {
    var className = "RadioButtonDialogUI";

    function RadioButtonDialogUI() {
      var self = BitWeb.CheckBoxUI.apply(this, arguments);

      self.type = className;

      self.orientation = "vertical";

      self = $.extend(self, self.params);
      return self;
    }

    var _super = BitWeb.CheckBoxUI;
    inherits(RadioButtonDialogUI, _super);

    RadioButtonDialogUI.prototype.openPicker = function () {
      var self = this;

      if ($.radioButtonPicker) {
        $.radioButtonPicker.open(self);
      }

      return self;
    };

    RadioButtonDialogUI.getClassName = function () {
      return className;
    };

    return RadioButtonDialogUI;
  }());

  bitlib.ko.addBindingHandler("bindRadioButtonPicker", {
    init: function (element, valueAccessor, allBindingsAccessor, viewModel, bindingContext) {
      // initialize picker with some optional options
      var options = $.extend({
        title: "選択してください"
      }, viewModel.pickerOptions, (allBindingsAccessor().radioButtonPickerOptions || {}));

      var widget = BitWeb.ViewboxWidgetFactory.create("radioButtonPicker", options);

      $(element).radioButtonPicker(options);

      // handle disposal (if KO removes by the template binding)
      ko.utils.domNodeDisposal.addDisposeCallback(element, function () {
        $(element).radioButtonPicker("destroy");
      });
    }
  });

  bitlib.ko.addBindingHandler("bindRadioButtonPickerDialog", {
    init: function (element, valueAccessor, allBindingsAccessor, viewModel, bindingContext) {
      // initialize pickerDialog with some optional options
      var options = $.extend({
        title: "選択してください"
      }, viewModel.pickerDialogOptions, (allBindingsAccessor().radioButtonPickerDialogOptions || {}));

      var widget = BitWeb.DialogWidgetFactory.create("radioButtonPickerDialog", options);

      $(element).radioButtonPickerDialog(options);

      // handle disposal (if KO removes by the template binding)
      ko.utils.domNodeDisposal.addDisposeCallback(element, function () {
        $(element).radioButtonPickerDialog("destroy");
      });
    }
  });

  bitlib.ko.addBindingHandler("bindRadioButtonPickerContents", {
    init: function (element, valueAccessor, allBindingsAccessor, viewModel, bindingContext) {
      var maxHeight = (screen.availHeight * 0.5);

      $(element)
        .css({
          overflowY: "auto",
          maxHeight: (maxHeight + "px")
        });
    }
  });

  bitlib.ko.addBindingHandler("bindRadioButtonPickerOption", {
    init: function (element, valueAccessor, allBindingsAccessor, viewModel, bindingContext) {
      var checked = valueAccessor(),
        icons = $.extend({
          on: "fa-check-circle",
          off: "fa-circle-o"
        }, allBindingsAccessor().radioButtonIcons);

      if (checked()) {
        $(element)
          .addClass(icons.on);
      } else {
        $(element)
          .addClass(icons.off);
      }
    },
    update: function (element, valueAccessor, allBindingsAccessor, viewModel, bindingContext) {
      var parent = bindingContext.$parent,
        checked = valueAccessor(),
        icons = $.extend({
          on: "fa-check-circle",
          off: "fa-circle-o"
        }, allBindingsAccessor().radioButtonIcons);

      if (checked()) {
        $(element)
          .removeClass(icons.off)
          .addClass(icons.on);

        bitlib.array.each(parent.options, function (i, opt) {
          if ((viewModel.optionVal !== opt.optionVal) && opt.isValid()) {
            opt.clear();
          }
        });

        if (!viewModel.isValid()) {
          viewModel.value(viewModel.optionVal);
        }
      } else {
        $(element)
          .removeClass(icons.on)
          .addClass(icons.off);
      }
    }
  });

  BitWeb.ListUIElement = (function () {
    var className = "ListUIElement";

    function ListUIElement() {
      var self = BitWeb.UIBase.apply(this, arguments);

      self.isListUIElementViewModel = true;
      self.type = className;

      var isFocused = ko.observable(false);

      self.isFocused = ko.pureComputed(function () {
        return isFocused();
      }, self);

      self._focus = function () {
        if (!isFocused()) {
          isFocused(true);
        }
        return self;
      };

      self._blur = function () {
        if (isFocused()) {
          isFocused(false);
        }
        return self;
      };

      self = $.extend(self, self.params);
      return self;
    }

    var _super = BitWeb.UIBase;
    inherits(ListUIElement, _super);

    ListUIElement.prototype.focus = function () {
      this._focus();
      return this;
    };

    ListUIElement.prototype.blur = function () {
      this._blur();
      return this;
    };

    ListUIElement.getClassName = function () {
      return className;
    };

    return ListUIElement;
  }());

  BitWeb.ListUIBase = (function () {
    var className = "ListUIBase";

    function ListUIBase() {
      var self = BitWeb.UIBase.apply(this, arguments);

      self.type = className;

      var elements = ko.observableArray();

      self.hasElements = ko.pureComputed(function () {
        return 0 < elements().length;
      }, self);

      self.elements = ko.pureComputed(function () {
        return elements();
      }, self);

      self.availableElements = ko.pureComputed(function () {
        var results = [];

        bitlib.array.each(elements, function (i, elem) {
          if (elem.isAvailable()) {
            results.push(elem);
          }
        });

        return results;
      });

      self.validElements = ko.pureComputed(function () {
        var results = [];

        bitlib.array.each(elements, function (i, elem) {
          if (elem.isValid()) {
            results.push(elem);
          }
        });

        return results;
      });

      self.visibleElements = ko.pureComputed(function () {
        var results = [];

        bitlib.array.each(elements, function (i, elem) {
          if (elem.isVisible()) {
            results.push(elem);
          }
        });

        return results;
      });

      self._addElement = function (newElems) {
        newElems = newElems || [];
        newElems = bitlib.common.isArray(newElems) ? newElems : [newElems];

        var elems = [];
        for (var i = 0, len = newElems.length; i < len; i++) {
          if (!bitlib.common.isObject(newElems[i]) || !newElems[i].isListUIElementViewModel) {
            continue;
          }

          if (!newElems[i].id) {
            newElems[i].id = (bitlib.common.publishTemporaryUniqueName() + "_" + i.toString());
          }

          elems.push(newElems[i]);
        }

        if (0 < elems.length) {
          elements.push.apply(elements, elems);
        }

        return self;
      };

      self._clearElements = function () {
        elements.removeAll();
        return self;
      };

      self.maxElementIndex = ko.pureComputed(function () {
        var len = elements().length;
        return (len === 0) ? 0 : (len - 1);
      }, self);

      self.maxAvailableElementIndex = ko.pureComputed(function () {
        var len = self.availableElements().length;
        return (len === 0) ? 0 : (len - 1);
      }, self);

      self.maxValidElementIndex = ko.pureComputed(function () {
        var len = self.validElements().length;
        return (len === 0) ? 0 : (len - 1);
      }, self);

      self.maxVisibleElementIndex = ko.pureComputed(function () {
        var len = self.visibleElements().length;
        return (len === 0) ? 0 : (len - 1);
      }, self);

      var selectedElementId = ko.observable("");

      self._setSelectedElementId = function (newId) {
        newId = (newId || "").toString();

        if (!newId || !bitlib.common.isString(newId)) {
          selectedElementId("");
          return self;
        }

        bitlib.array.each(self.visibleElements, function (i, elem) {
          if (elem.id === newId) {
            selectedElementId(newId);
            return false;
          }
          return true;
        });

        return self;
      };

      self.selectedElement = ko.pureComputed(function () {
        var id = selectedElementId();
        if (!id) {
          return null;
        }

        var result = null;
        bitlib.array.each(self.visibleElements, function (i, elem) {
          if (elem.id === id) {
            result = elem;
            return false;
          }
          return true;
        });

        return result;
      }, self);

      self.selectedElementIndex = ko.pureComputed(function () {
        var id = selectedElementId();
        if (!id) {
          return -1;
        }

        var index = -1;
        bitlib.array.each(self.visibleElements, function (i, elem) {
          if (elem.id === id) {
            index = i;
            return false;
          }
          return true;
        });

        return index;
      }, self);

      self.existsPrevElement = ko.pureComputed(function () {
        return 0 < self.selectedElementIndex();
      }, self);

      self.existsNextElement = ko.pureComputed(function () {
        var maxIndex = self.maxVisibleElementIndex();
        if (maxIndex === 0) {
          return false;
        }
        return self.selectedElementIndex() < maxIndex;
      }, self);

      self.isValid = ko.pureComputed(function () {
        var isValid = bitlib.array.any(elements, function (i, elem) {
          return elem.isValid();
        });
        return isValid;
      }, self);

      self._validate = function () {
        return self;
      };

      self._invalidate = function () {
        return self;
      };

      self.valueDelimiter = ",";

      self._toValue = function (elems) {
        if (!bitlib.common.isArray(elems)) {
          return "";
        }

        var arr = [];
        for (var i = 0, len = elems.length; i < len; i++) {
          if (elems[i].isValid()) {
            arr.push(elems[i].value());
          }
        }

        return arr.join(self.valueDelimiter);
      };

      self._toElements = function (val) {
        if (!val || !bitlib.common.isString(val)) {
          return [];
        }

        var elems = [],
          arr = val.split(self.valueDelimiter);

        for (var i = 0, len = arr.length; i < len; i++) {
          if (arr[i]) {
            var elem = new BitWeb.ListUIElement();
            elem.value(arr[i]);

            elems.push(elem);
          }
        }

        return elems;
      };

      self.value = ko.computed({
        read: function () {
          if (!self.isValid()) {
            return "";
          }
          return self._toValue(self.elements());
        },
        write: function (newValue) {
          newValue = newValue || "";

          var newElems = self._toElements(newValue);

          self
            ._clearElements()
            ._addElement(newElems);
        },
        owner: self
      });

      self.output = ko.pureComputed(function () {
        return self.value();
      }, self);

      self._pushValue = function (val) {
        if (!val || !bitlib.common.isString(val)) {
          return self;
        }

        val = val.replace(new RegExp(self.valueDelimiter, "g"), "");

        var arr = [];
        if (self.isValid()) {
          arr = self.value().split(self.valueDelimiter);
        }

        arr.push(val);

        var selectedId = "",
          selectedElem = self.selectedElement();

        if (!bitlib.common.isNullOrUndefined(selectedElem)) {
          selectedId = selectedElem.id;
        }

        self.value(arr.join(self.valueDelimiter));

        if (!!selectedId) {
          self._setSelectedElementId(selectedId);
        }

        return self;
      };

      self._unshiftValue = function (val) {
        if (!val || !bitlib.common.isString(val)) {
          return self;
        }

        val = val.replace(new RegExp(self.valueDelimiter, "g"), "");

        var arr = [];
        if (self.isValid()) {
          arr = self.value().split(self.valueDelimiter);
        }

        arr.unshift(val);

        var selectedId = "",
          selectedElem = self.selectedElement();

        if (!bitlib.common.isNullOrUndefined(selectedElem)) {
          selectedId = selectedElem.id;
        }

        self.value(arr.join(self.valueDelimiter));

        if (!!selectedId) {
          self._setSelectedElementId(selectedId);
        }

        return self;
      };

      self._insertValue = function (id, val) {
        if (!id || !bitlib.common.isString(id) || !val || !bitlib.common.isString(val)) {
          return self;
        }

        val = val.replace(new RegExp(self.valueDelimiter, "g"), "");

        var arr = [],
          pIndex = -1;
        bitlib.array.each(self.elements, function (i, elem) {
          if (elem.id === id) {
            pIndex = i;

            arr.push(val);
          }
          arr.push(elem.value());
        });

        var selectedId = "",
          selectedElem = self.selectedElement();

        if (!bitlib.common.isNullOrUndefined(selectedElem)) {
          selectedId = selectedElem.id;
        }

        self.value(arr.join(self.valueDelimiter));

        if (!!selectedId) {
          self._setSelectedElementId(selectedId);
        }

        return self;
      };

      self._replaceValue = function (id, val) {
        if (!id || !bitlib.common.isString(id) || !val || !bitlib.common.isString(val)) {
          return self;
        }

        val = val.replace(new RegExp(self.valueDelimiter, "g"), "");

        if (!val || !self.isValid()) {
          return self;
        }

        var arr = [];
        bitlib.array.each(self.elements, function (i, elem) {
          arr.push((elem.id === id) ? val : elem.value());
        });

        var selectedIndex = self.selectedElementIndex();

        self.value(arr.join(self.valueDelimiter));

        if (-1 < selectedIndex) {
          var elems = self.elements();

          if (elems[selectedIndex]) {
            self._setSelectedElementId(elems[selectedIndex].id);
          }
        }

        return self;
      };

      self._removeValue = function (id) {
        if (!id || !bitlib.common.isString(id) || !self.isValid()) {
          return self;
        }

        var arr = [];
        bitlib.array.each(self.elements, function (i, elem) {
          if (elem.id !== id) {
            arr.push(elem.value());
          }
        });

        var selectedId = "",
          selectedElem = self.selectedElement();

        if (!bitlib.common.isNullOrUndefined(selectedElem)) {
          selectedId = selectedElem.id;
        }

        var selectedIndex = self.selectedElementIndex();

        self.value(arr.join(self.valueDelimiter));

        if (!!selectedId && selectedId !== id) {
          self._setSelectedElementId(selectedId);
          return self;
        }

        if (-1 < selectedIndex) {
          var elems = self.elements();

          selectedIndex = (selectedIndex < elems.length) ? selectedIndex : (selectedIndex - 1);

          if (elems[selectedIndex]) {
            self._setSelectedElementId(elems[selectedIndex].id);
          }
        }

        return self;
      };

      self.swapable = ko.pureComputed(function () {
        return (1 < self.elements().length && !!self.selectedElement());
      }, self);

      self._swapPositions = function (prevId, nextId) {
        if (!prevId || !nextId || prevId === nextId) {
          return self;
        }

        var prevElem, nextElem;
        bitlib.array.each(elements, function (i, elem) {
          if (elem.id === prevId) {
            prevElem = elem;
          }
          if (elem.id === nextId) {
            nextElem = elem;
          }
          return (!prevElem || !nextElem);
        });

        var newElems = [];
        bitlib.array.each(elements, function (i, elem) {
          if (elem.id === prevId) {
            newElems.push(nextElem);
          } else if (elem.id === nextId) {
            newElems.push(prevElem);
          } else {
            newElems.push(elem);
          }
        });

        // 更新後の選択位置を取得する.
        var selectedIndex = -1,
          focusedElem = self.selectedElement();

        var focusedId = "";
        if (focusedElem) {
          focusedId = focusedElem.id;
        }

        var arr = [];
        for (var i = 0, len = newElems.length; i < len; i++) {
          if (newElems[i].id === focusedId) {
            selectedIndex = i;
          }
          arr.push(newElems[i].value());
        }

        self.value(arr.join(self.valueDelimiter));

        if (-1 < selectedIndex) {
          var index = selectedIndex,
            elems = self.elements();

          if (elems[index]) {
            self._setSelectedElementId(elems[index].id);
          }
        }

        return self;
      };

      self = $.extend(self, self.params);

      self.elements.subscribe(function () {
        self._setSelectedElementId("");
      });

      self.selectedElement.subscribe(function (selectedElement) {
        bitlib.array.each(elements, function (i, elem) {
          elem.blur();
        });

        if (selectedElement) {
          selectedElement.focus();
        }
      });

      return self;
    }

    var _super = BitWeb.UIBase;
    inherits(ListUIBase, _super);

    ListUIBase.prototype.selectElement = function (id) {
      this._setSelectedElementId(id);
      return this;
    };

    ListUIBase.prototype.readData = function (data) {
      // data :: デシリアライズ時にレスポンスデータから読み込むオブジェクトで
      // 配列データがある.
      // [ "値SEQ000", "値SEQ001", ... ]

      var self = this;

      data = data || [];

      var arr = [];
      for (var i = 0, len = data.length; i < len; i++) {
        var val = data[i];
        val = val.replace(new RegExp(self.valueDelimiter, "g"), "");

        if (val) {
          arr.push(val);
        }
      }

      self.value(arr.join(self.valueDelimiter));

      // 前回値として記憶.
      self._commit();

      return self;
    };

    ListUIBase.prototype.writeData = function (data) {
      // itemData :: シリアライズ時にリクエストデータに書き出すオブジェクトで
      // 配列データを持たせる.
      // [ "値SEQ000", "値SEQ001", ... ]

      var self = this;

      data = data || [];

      var val = self.value();
      var arr = val.split(self.valueDelimiter);

      data = (arr.length === 0) ? [""] : arr;

      return data;
    };

    ListUIBase.prototype.push = function (val) {
      this._pushValue(val);
      return this;
    };

    ListUIBase.prototype.unshift = function (val) {
      this._unshiftValue(val);
      return this;
    };

    ListUIBase.prototype.insert = function (index, val) {
      var self = this;

      index = bitlib.common.toInteger(index);

      if (isNaN(index) || !val || !bitlib.common.isString(val)) {
        return self;
      }

      var elems = self.elements();
      if (elems[index]) {
        self._insertValue(elems[index].id, val);
      }

      return self;
    };

    ListUIBase.prototype.replace = function (index, val) {
      var self = this;

      index = bitlib.common.toInteger(index);

      if (isNaN(index) || !val || !bitlib.common.isString(val)) {
        return self;
      }

      var elems = self.elements();
      if (elems[index]) {
        self._replaceValue(elems[index].id, val);
      }

      return self;
    };

    ListUIBase.prototype.remove = function (index) {
      var self = this;

      index = bitlib.common.toInteger(index);

      if (isNaN(index)) {
        return self;
      }

      var elems = self.elements();
      if (elems[index]) {
        self._removeValue(elems[index].id);
      }

      return self;
    };

    ListUIBase.prototype.swapPrev = function () {
      var self = this;

      var focusedElem = self.selectedElement();
      if (!focusedElem) {
        return self;
      }

      var elems = self.visibleElements(),
        prevIndex = self.selectedElementIndex() - 1;

      if (elems[prevIndex]) {
        self._swapPositions(focusedElem.id, elems[prevIndex].id);
      }

      return self;
    };

    ListUIBase.prototype.swapNext = function () {
      var self = this;

      var focusedElem = self.selectedElement();
      if (!focusedElem) {
        return self;
      }

      var elems = self.visibleElements(),
        nextIndex = self.selectedElementIndex() + 1;

      if (elems[nextIndex]) {
        self._swapPositions(elems[nextIndex].id, focusedElem.id);
      }

      return self;
    };

    ListUIBase.getClassName = function () {
      return className;
    };

    return ListUIBase;
  }());

  bitlib.ko.addBindingHandler("bindListUIElement", {
    init: function (element, valueAccessor, allBindingsAccessor, viewModel, bindingContext) {
      var parent = bindingContext.$parent;
      var $element = $(element);

      $element
        .on("click", function () {
          if (!viewModel.isFocused()) {
            parent.selectElement(viewModel.id);
          } else {
            parent.selectElement("");
          }
        });

      if (viewModel.isFocused()) {
        $element
          .addClass("focused");
      }

      viewModel.isFocused.subscribe(function (isFocused) {
        if (isFocused) {
          $element
            .addClass("focused");
        } else {
          $element
            .removeClass("focused");
        }
      });
    }
  });

  BitWeb.TextListUIElement = (function () {
    var className = "TextListUIElement";

    function TextListUIElement() {
      var self = BitWeb.ListUIElement.apply(this, arguments);

      // TextUI で override.
      self = BitWeb.TextUI.apply(self, [self.params]);

      self.type = className;

      self.valueUpdate = "input";

      var isValidEditMode = ko.observable(true);

      self.isValidEditMode = ko.pureComputed(function () {
        return isValidEditMode();
      }, self);

      self._validEditMode = function () {
        if (!isValidEditMode()) {
          isValidEditMode(true);
        }
        return self;
      };

      self._invalidEditMode = function () {
        if (isValidEditMode()) {
          isValidEditMode(false);
        }
        return self;
      };

      self.isAvailableEditor = ko.pureComputed(function () {
        return self.isFocused() && self.isValidEditMode();
      }, self);

      self = $.extend(self, self.params);

      self.isFocused.subscribe(function (isFocused) {
        if (!isFocused) {
          self._invalidEditMode();
        }
      });

      return self;
    }

    var _super = BitWeb.ListUIElement;
    inherits(TextListUIElement, _super);

    var _tsuper = BitWeb.TextUI;
    inherits(TextListUIElement, _tsuper);

    TextListUIElement.prototype.onEditMode = function () {
      var self = this;

      if (self.isFocused()) {
        self._validEditMode();
      }

      return self;
    };

    TextListUIElement.prototype.offEditMode = function () {
      this._invalidEditMode();
      return this;
    };

    TextListUIElement.getClassName = function () {
      return className;
    };

    return TextListUIElement;
  }());

  BitWeb.TextListUI = (function () {
    var className = "TextListUI";

    function TextListUI() {
      var self = BitWeb.ListUIBase.apply(this, arguments);

      self.type = className;

      self.textUIParams = {};

      self._toElements = function (val) {
        if (!val || !bitlib.common.isString(val)) {
          return [];
        }

        var elems = [],
          arr = val.split(self.valueDelimiter);
        for (var i = 0, len = arr.length; i < len; i++) {
          if (arr[i]) {
            var params = $.extend(true, {
              forbiddenKeys: [self.valueDelimiter]
            }, bitlib.common.copyDeep(self.textUIParams));

            var elem = new BitWeb.TextListUIElement(params);
            elem.value(arr[i]);

            elems.push(elem);
          }
        }

        return elems;
      };

      self.defaultInitVal = "(項目未設定)";

      self = $.extend(self, self.params);
      return self;
    }

    var _super = BitWeb.ListUIBase;
    inherits(TextListUI, _super);

    TextListUI.prototype.addText = function () {
      var self = this;

      self.push(self.defaultInitVal);

      return self;
    };

    TextListUI.prototype.removeSelectedText = function () {
      var self = this;

      var index = self.selectedElementIndex();
      if (index === -1) {
        return self;
      }

      self.remove(index);

      return self;
    };

    TextListUI.getClassName = function () {
      return className;
    };

    return TextListUI;
  }());

  bitlib.ko.addBindingHandler("bindTextListUIElement", {
    init: function (element, valueAccessor, allBindingsAccessor, viewModel, bindingContext) {
      var parent = bindingContext.$parent;
      var $element = $(element);

      $element
        .on("click", function () {
          if (!viewModel.isFocused()) {
            parent.selectElement(viewModel.id);
          } else {
            if (!viewModel.isValidEditMode()) {
              viewModel.onEditMode();
            } else {
              parent.selectElement("");
            }
          }
        });

      if (viewModel.isFocused()) {
        $element
          .addClass("focused");
      }

      viewModel.isFocused.subscribe(function (isFocused) {
        if (isFocused) {
          $element
            .addClass("focused");
        } else {
          $element
            .removeClass("focused");
        }
      });
    }
  });

}(BitWeb || {}));