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

      if (params) {
        params = bitlib.common.copyDeep(params);
      }

      var self = BitWeb.ResourceBase.apply(this, [params]);

      self.params = $.extend({
        readOnly: false,
        copyable: true
      }, self.params);

      self.caption = caption; // 見出し
      self.name = name; // 属性値

      self.type = className;

      self.prefix = "";
      self.suffix = "";

      self.cssClass = "";

      var isWritable = ko.observable(!self.params.readOnly);

      self.isWritable = ko.pureComputed(function () {
        return isWritable();
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

      var copyable = ko.observable(self.params.copyable);

      self.isCopyable = ko.pureComputed(function () {
        return copyable();
      }, self);

      self._permitCopy = function () {
        if (!copyable()) {
          return copyable(true);
        }
        return self;
      };

      self._forbidCopy = function () {
        if (copyable()) {
          copyable(false);
        }
        return self;
      };

      self._cachedValue = ko.observable("");

      self.value = ko.pureComputed({
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
        if (self.isValid()) {
          return self.value();
        }
        return "";
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

      if (self.isWritable() && self.isValid()) {
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

    UIBase.prototype.getUIByName = function (name) {
      if (!name) {
        return [];
      }

      var results = [];
      if (name === self.name) {
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

      if (!getter) {
        return self;
      }

      self = getter(self);

      return self;
    };

    UIBase.prototype.serialize = function (setter) {
      var self = this;

      if (!setter || !self.isWritable()) {
        return self;
      }

      self = setter(self);

      return self;
    };

    UIBase.prototype.command = function (indicator) {
      var self = this;

      if (!indicator || !bitlib.common.isFunction(indicator)) {
        return self;
      }

      self = indicator(self);

      return self;
    };

    UIBase.getClassName = function () {
      return className;
    };

    return UIBase;
  }());

  BitWeb.TextUIBase = (function () {
    var className = "TextUIBase";

    function TextUIBase() {
      var self = BitWeb.UIBase.apply(this, arguments);

      self.type = className;

      self.imeMode = "auto"; // auto,active,inactive,disabled
      self.valueUpdate = "afterkeydown"; // input,keyup,keypress,afterkeydown

      self.delimiter = "";

      self.output = ko.pureComputed(function () {
        if (self.isValid()) {
          return bitlib.string.trimOverlapLineFeedForLegacyIE(self.value());
        }
        return "";
      }, self);

      self.maxLength = -1; // -1:infinity

      self.overLength = ko.computed(function () {
        var maxLength = bitlib.common.toInteger(self.maxLength);

        if (isNaN(maxLength) || self.maxLength < 1) {
          return 0;
        }

        var val = self.value();

        return (maxLength < val.length) ? (val.length - maxLength) : 0;
      }, self);

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

  bitlib.ko.addBindingHandler("bindTextUI", {
    init: function (element, valueAccessor, allBindingsAccessor, viewModel, bindingContext) {
      $(element)
        .css({
          imeMode: viewModel.imeMode
        });

      var maxLength = bitlib.common.toInteger(viewModel.maxLength);
      if (!isNaN(maxLength) && 0 < maxLength) {
        $(element)
          .attr({
            maxlength: maxLength
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
        $(element)
          .keydown(function (event) {
            if (bitlib.array.contains(forbiddenKeyCodes, event.keyCode)) {
              return false;
            }
            return true;
          });
      }
    }
  });

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

  BitWeb.DateUI = (function () {
    var className = "DateUI";

    var dateTimeCorrector = new BitWeb.DateTimeCorrector();

    function DateUI() {
      var self = BitWeb.UIBase.apply(this, arguments);

      self.type = className;

      self.valueFormat = "YYYY/MM/DD";

      self.date = ko.pureComputed(function () {
        if (!self.isValid()) {
          return null;
        }
        return moment(self.value(), self.valueFormat).toDate();
      }, self);

      self.outputFormat = "YYYY/MM/DD";

      self.output = ko.pureComputed(function () {
        if (self.isValid()) {
          return moment(self.date()).format(self.outputFormat);
        }
        return "";
      }, self);

      self.pickerOptions = {
        beforeShowDay: function (date) {
          var cssClass = "u-datepicker-dayofweek" + moment(date).format("d");
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

    DateUI.prototype.setDate = function (newDate) {
      var self = this;

      if (bitlib.common.isDate(newDate)) {
        self.value(moment(newDate).format(self.valueFormat));
      }

      return self;
    };

    DateUI.prototype.setToday = function () {
      this.setDate(dateTimeCorrector.getNow());
      return this;
    };

    DateUI.prototype.toYearAt = function (newYear) {
      var self = this;

      if (!self.isValid()) {
        return self;
      }

      newYear = bitlib.common.toInteger(newYear);
      if (isNaN(newYear) || newYear < 1970 || 9999 < newYear) {
        return self;
      }

      var newDate = new Date(self.date());
      newDate.setFullYear(newYear);

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

    DateUI.prototype.toMonthAt = function (newMonth) {
      var self = this;

      if (!self.isValid()) {
        return self;
      }

      newMonth = bitlib.common.toInteger(newMonth);
      if (isNaN(newMonth)) {
        return self;
      }

      var newDate = new Date(self.date());
      newDate.setMonth(newMonth);

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

    DateUI.prototype.toDayAt = function (newDay) {
      var self = this;

      if (!self.isValid()) {
        return self;
      }

      newDay = bitlib.common.toInteger(newDay);
      if (isNaN(newDay)) {
        return self;
      }

      var newDate = new Date(self.date());
      newDate.setDate(newDay);

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

      if (self.name) {
        $("#" + self.name + "_id").datepicker("show");
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
        element.id = viewModel.type.toLowerCase() + '_' + bitlib.common.publishTemporaryUniqueName();
      }

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

      var pairID = "ui_" + bitlib.common.publishTemporaryUniqueName();

      self.beginUI = new BitWeb.DateUI({
        isBeginUI: true,
        pairId: pairID
      });

      self.endUI = new BitWeb.DateUI({
        isEndUI: true,
        pairId: pairID
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

          var beginVal = val.substring(0, 10),
            endVal = val.substring(11, 10);

          self.beginUI.value(beginVal);
          self.endUI.value(endVal);
        },
        owner: self
      });

      self.range = ko.pureComputed(function () {
        if (!self.isValid()) {
          return null;
        }

        var val = self.value();

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

    DateRangeUI.prototype.setDateRange = function (newRange) {
      var self = this;

      if (!bitlib.common.isObject(newRange) || !newRange.isDateRangeObj) {
        return self;
      }

      var beginVal = moment(newRange.getBegin()).format("YYYY/MM/DD"),
        endVal = moment(newRange.getEnd()).format("YYYY/MM/DD");

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
        element.id = viewModel.type.toLowerCase() + '_' + bitlib.common.publishTemporaryUniqueName();
      }

      if (viewModel.pairId) {
        $(element)
          .addClass(viewModel.pairId);
      }

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

      self.type = className;

      self.optionVal = optionVal;

      var checked = ko.observable(false);

      self.isChecked = ko.pureComputed({
        read: function () {
          return checked();
        },
        write: function (isChecked) {
          checked(isChecked);
        },
        owner: self
      });

      self._check = function () {
        if (!self.isChecked()) {
          self.isChecked(true);
        }
        return self;
      };

      self._uncheck = function () {
        if (self.isChecked()) {
          self.isChecked(false);
        }
        return self;
      };

      self.value = ko.pureComputed({
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

      if (!data[0]) {
        data[0] = self.value();
      }

      return data;
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

      self.options = ko.observableArray();

      if (self.params.hasOwnProperty("options")) {
        // options は ko.observableArray にしたい.
        // 派生クラスで jQuery.extend を実行しているので、ko.observable オブジェクトの付け替えが発生してしまう.
        // そうなると、値変化を検出できなくなるので、基底クラスで options を処理して
        // jQuery.extend による付け替えを回避する.
        var options = self.params.options;

        if (bitlib.common.isObservableArray(options)) {
          options = options();
        } else if (bitlib.common.isArray(options)) {
          options = options;
        } else {
          // JavaScript の object
          options = [options];
        }

        if (!self.isWritable()) {
          bitlib.array.each(options, function (i, option) {
            option.forbidWrite();
          });
        }

        if (!self.isCopyable()) {
          bitlib.array.each(options, function (i, option) {
            option.forbidCopy();
          });
        }

        self.options(options);

        self.params.optionsOriginal = bitlib.common.copyDeep(options);
        delete self.params.options;
      }

      self = $.extend(self, self.params);

      self.options.subscribe(function (newOptions) {
        if (!self.isWritable()) {
          bitlib.array.each(newOptions, function (i, option) {
            option.forbidWrite();
          });
        }
        if (!self.isCopyable()) {
          bitlib.array.each(newOptions, function (i, option) {
            option.forbidCopy();
          });
        }
      });

      self.isWritable.subscribe(function (writable) {
        bitlib.array.each(self.options, function (i, option) {
          if (writable) {
            option.permitWrite();
          } else {
            option.forbidWrite();
          }
        });
      });

      self.isCopyable.subscribe(function (copyable) {
        bitlib.array.each(self.options, function (i, option) {
          if (copyable) {
            option.permitCopy();
          } else {
            option.forbidCopy();
          }
        });
      });

      return self;
    }

    var _super = BitWeb.UIBase;
    inherits(SelectUIBase, _super);

    SelectUIBase.prototype.reset = function () {
      var self = this;

      bitlib.array.each(self.options, function (i, option) {
        option.reset();
      });

      _super.prototype.reset.call(self);

      return self;
    };

    SelectUIBase.prototype.clear = function () {
      var self = this;

      if (!self.isWritable()) {
        return self;
      }

      bitlib.array.each(self.options, function (i, option) {
        option.clear();
      });

      _super.prototype.clear.call(self);

      return self;
    };

    SelectUIBase.prototype.getUIByName = function (name) {
      if (!name) {
        return [];
      }

      var results = _super.prototype.getUIByName.call(this, name);

      bitlib.array.each(self.options, function (i, option) {
        results = results.concat(option.getUIByName(name));
      });

      return results;
    };

    SelectUIBase.prototype.deserialize = function (getter) {
      var self = this;

      if (!getter) {
        return self;
      }

      _super.prototype.deserialize.call(self, getter);

      bitlib.array.each(self.options, function (i, option) {
        option.deserialize(getter);
      });

      return self;
    };

    SelectUIBase.prototype.serialize = function (setter) {
      var self = this;

      if (!setter || !self.isWritable()) {
        return self;
      }

      _super.serialize.call(self, [setter]);

      bitlib.ko.each(self.options, function (i, option) {
        option.serialize(setter);
      });

      return self;
    };

    SelectUIBase.prototype.command = function (indicator) {
      var self = this;

      if (!indicator || !bitlib.common.isFunction(indicator)) {
        return self;
      }

      _super.prototype.command.call(self, indicator);

      bitlib.array.each(self.options, function (i, option) {
        option = option.command(indicator);
      });

      return self;
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
        bitlib.array.each(self.options, function (i, option) {
          if (option.optionVal === self.value()) {
            result = option.caption;
            return false;
          }
        });

        return result;
      }, self);

      self.pickerOptions = {};

      self = $.extend(self, self.params);
      return self;
    };

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

      self.delimiter = ", ";

      self.isValid = ko.pureComputed(function () {
        var options = self.options();
        for (var i = 0, len = options.length; i < len; i++) {
          if (options[i].isValid()) {
            return true;
          }
        }
        return false;
      }, self);

      self._validate = function () {
        return self;
      };

      self._invalidate = function () {
        return self;
      };

      self.value = ko.pureComputed({
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
        bitlib.array.each(self.options, function (i, option) {
          if (option.isChecked()) {
            checkedOptions.push(option.caption)
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

  BitWeb.CheckBoxUI = (function () {
    var className = "CheckBoxUI";

    function CheckBoxUI() {
      var self = BitWeb.CheckCollectionUIBase.apply(this, arguments);

      self.type = className;

      self.value = ko.pureComputed({
        read: function () {
          if (!self.isValid()) {
            return "";
          }

          var values = [];
          bitlib.array.each(self.options, function (i, option) {
            if (options.isValid()) {
              values.push(options.value());
            }
          });

          return values.join(self.delimiter);
        },
        write: function () {
          // none
        },
        owner: self
      });

      self = $.extend(self, self.params);
      return self;
    }

    var _super = BitWeb.CheckCollectionUIBase;
    inherits(CheckBoxUI, _super);

    CheckBoxUI.getClassName = function () {
      return className;
    };

    return CheckBoxUI;
  }());

  BitWeb.RadioButtonUI = (function () {
    var className = "RadioButtonUI";

    function RadioButtonUI() {
      var self = BitWeb.CheckCollectionUIBase.apply(this, arguments);

      self.type = className;

      self.value = ko.pureComputed({
        read: function () {
          if (!self.isValid()) {
            return "";
          }

          var options = self.options();
          for (var i = 0, len = options.length; i < len; i++) {
            if (options[i].isValid()) {
              return options.value();
            }
          }

          return "";
        },
        write: function (newValue) {
          newValue = newValue || "";

          bitlib.array.each(self.options, function (i, option) {
            if (option.optionVal === newValue) {
              option.value(newValue);
            } else {
              option.value("");
            }
          });
        },
        owner: self
      });

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

  BitWeb.ListUIElement = (function () {
    var className = "ListUIElement";

    function ListUIElement() {
      var self = BitWeb.UIBase.apply(this, arguments);

      self.type = className;

      self.isListUIElementViewModel = true;

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

        var listElems = [];
        for (var i = 0, len = newElems.length; i < len; i++) {
          if (!newElems[i] || !newElems[i].isListUIElementViewModel) {
            continue;
          }

          newElems[i].id = bitlib.common.publishTemporaryUniqueName() + "_" + i.toString();
          listElems.push(newElems[i]);
        }

        if (0 < listElems.length) {
          elements.push.apply(elements, listElems);
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

        if (!newId) {
          selectedElementId(newId);
          return self;
        }

        bitlib.array.each(self.visibleElements, function (i, elem) {
          if (elem.id === newId) {
            selectedElementId(newId);
            return false;
          }
        });

        return self;
      };

      self.selectedElement = ko.pureComputed(function () {
        var result = null;

        bitlib.array.each(self.visibleElements, function (i, elem) {
          if (elem.id === id) {
            result = elem;
            return false;
          }
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
            arr.push(elems.value());
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

      self.value = ko.pureComputed({
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
        if (self.isValid()) {
          return self.value();
        }
        return "";
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

        var selectedIndex = self.selectedElementIndex();

        self.value(arr.join(self.valueDelimiter));

        if (-1 < selectedIndex) {
          var i = selectedIndex,
            elems = self.elements();

          if (elems[i]) {
            self._setSelectedElementId(elems[i].id);
          }
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

        var selectedIndex = self.selectedElementIndex();

        self.value(arr.join(self.valueDelimiter));

        if (-1 < selectedIndex) {
          var i = selectedIndex + 1,
            elems = self.elements();

          if (elems[i]) {
            self._setSelectedElementId(elems[i].id);
          }
        }

        return self;
      };

      self._insertValue = function (id, val) {
        if (!id || !bitlib.common.isString(id) || !val || !bitlib.common.isString(val)) {
          return self;
        }

        val = val.replace(new RegExp(self.valueDelimiter, "g"), "");

        var arr = [];
        bitlib.array.each(self.elements, function (i, elem) {
          if (elem.id === id) {
            arr.push(val);
          }
          arr.push(elem.value());
        });

        var selectedIndex = self.selectedElementIndex();

        self.value(arr.join(self.valueDelimiter));

        if (-1 < selectedIndex) {
          var i = selectedIndex,
            elems = self.elements();

          i = (selectedIndex < index) ? i : (i + 1);

          if (elems[i]) {
            self._setSelectedElementId(elems[i].id);
          }
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
          var i = selectedIndex,
            elems = self.elements();

          if (elems[i]) {
            self._setSelectedElementId(elems[i].id);
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

        var selectedIndex = self.selectedElementIndex();

        self.value(arr.join(self.valueDelimiter));

        if (-1 < selectedIndex) {
          var i = selectedIndex,
            elems = self.elements();

          i = (selectedIndex < index) ? i : (i - 1);

          if (elems[i]) {
            self._setSelectedElementId(elems[i].id);
          }
        }

        return self;
      };

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
          var i = selectedIndex,
            elems = self.elements();

          if (elems[i]) {
            self._setSelectedElementId(elems[i].id);
          }
        }

        return self;
      };

      self = $.extend(self, self.params);

      elements.subscribe(function () {
        self._setSelectedElementId("");
      });

      selectedElementId.subscribe(function (newId) {
        bitlib.array.each(elements, function (i, elem) {
          elem.blur();
        });

        var selectedElem = self.selectedElement();
        if (selectedElem) {
          selectedElem.focus();
        }
      });

      return self;
    }

    var _super = BitWeb.UIBase;
    inherits(ListUIBase, _super);

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

}(BitWeb || {}));