(function (BitWeb) {
  "use strict";

  BitWeb.DateTimeCorrector = (function () {
    var className = "DateTimeCorrector";

    var ID = "time-lag";

    function fixDateTime(date, diff) {
      if (!date || !diff) {
        return null;
      }
      return moment(date).add(diff, "ms").toDate();
    }

    function DateTimeCorrector() {
      if (!(this instanceof DateTimeCorrector)) {
        return new DateTimeCorrector();
      }

      // singleton
      if (DateTimeCorrector.prototype._singletonInstance) {
        return DateTimeCorrector.prototype._singletonInstance;
      }
      var self = this;
      DateTimeCorrector.prototype._singletonInstance = self;

      var timeLag = 0;

      self._getTimeLag = function () {
        return timeLag;
      };

      self._setTimeLag = function (val) {
        if (!bitlib.common.isNumber(val)) {
          val = bitlib.common.toNumber(val);
          if (isNaN(val)) {
            val = 0;
          }
        }

        timeLag = val;

        return self;
      };

      self._setTimeLag(bitlib.params.local.get(ID));

      return self;
    }

    DateTimeCorrector.prototype.fix = function (date) {
      if (!date || !bitlib.common.isDate(date)) {
        return null;
      }

      var diff = this._getTimeLag();
      if (!diff) {
        return date;
      }

      return fixDateTime(date, diff);
    };

    DateTimeCorrector.prototype.getNow = function () {
      return this.fix(new Date());
    };

    DateTimeCorrector.prototype.setTimeLag = function (val) {
      this._setTimeLag(val);

      bitlib.params.local
        .set(ID, val)
        .save();

      return this;
    };

    DateTimeCorrector.prototype.updateTimeLag = function () {
      var message = "DateTimeCorrector の補正値更新処理はオーバーライドして使用してください.\n" +
        "Promise オブジェクトを返すと、更新処理を非同期に処理することが可能です.";

      bitlib.logger.info(message);

      return $.Deferred().resolve().promise();
    };

    DateTimeCorrector.getClassName = function () {
      return className;
    };

    return DateTimeCorrector;
  }());

  BitWeb.LogCollector = (function () {
    var className = "LogCollector";

    var MIN_INTERVAL = 30 * 1000;

    function LogCollector() {
      if (!(this instanceof LogCollector)) {
        return new LogCollector();
      }

      // singleton
      if (LogCollector.prototype._singletonInstance) {
        return LogCollector.prototype._singletonInstance;
      }
      var self = this;
      LogCollector.prototype._singletonInstance = self;

      var isRunning = ko.observable(false);

      self.isRunning = ko.pureComputed(function () {
        return isRunning();
      }, self);

      self._start = function () {
        if (!isRunning()) {
          isRunning(true);
        }
        return self;
      };

      self._stop = function () {
        if (isRunning()) {
          isRunning(false);
        }
        return self;
      };

      var interval = 60 * 1000; // millisec

      self._getInterval = function () {
        return interval;
      };

      self._setInterval = function (newInterval) {
        if (bitlib.common.isNumber(newInterval)) {
          if (newInterval < MIN_INTERVAL) {
            newInterval = MIN_INTERVAL;
          }
          interval = newInterval;
        }
        return self;
      };

      var tick = null;

      function autoCollect() {
        self.sendLogs();

        if (isRunning()) {
          tick = setTimeout(autoCollect, interval);
        }

        return self;
      }

      isRunning.subscribe(function (running) {
        if (running) {
          tick = setTimeout(autoCollect, interval);
        } else {
          if (tick) {
            clearTimeout(tick);
            tick = null;
          }
        }
      });

      return self;
    }

    LogCollector.prototype.sendLogs = function () {
      var message = "LogCollector のログ送信処理はオーバーライドして使用してください.\n" +
        "Promise オブジェクトを返すと、送信処理を非同期に処理することが可能です.";

      bitlib.logger.info(message);

      return $.Deferred().resolve().promise();
    };

    LogCollector.prototype.start = function () {
      this._start();
      return this;
    };

    LogCollector.prototype.stop = function () {
      this._stop();
      return this;
    };

    LogCollector.getClassName = function () {
      return className;
    };

    return LogCollector;
  }());

  BitWeb.UrlDispatcher = (function () {
    var className = "UrlDispatcher";

    var windowOptions = {
      // left: 0,            // 左端からの距離をピクセル単位で指定
      // top: 0,             // 上端からの距離をピクセル単位で指定
      // height: 760,        // ウィンドウの高さをピクセル単位で指定
      // width: 1024,        // ウィンドウの幅をピクセル単位で指定
      // status: 'no',       // ステータスバーを表示するかどうか
      // toolbar: 'yes',     // ツールバーを表示するかどうか
      // location: 'yes',    // アドレスバーを表示するかどうか
      // scrollbars: 'yes',  // スクロールバーを表示するかどうか
      // menubar: 'yes',     // メニューバーを表示するかどうか
      // resizable: 'yes',   // リサイズ可能かどうか
      // directories: 'yes'  // ユーザツールバーを表示するかどうか
    };

    function concatQueries(url, queryParams) {
      if (!url) {
        return "";
      }

      queryParams = queryParams || {};

      var queryString = "";
      for (var name in queryParams) {
        if (queryParams.hasOwnProperty(name)) {
          var query = name + "=" + queryParams[name];
          queryString += !queryString ? query : ("&" + query);
        }
      }

      if (!queryString) {
        return url;
      }

      var fullUrl = bitlib.string.rtrim(url, ["\\s", "\\t", "?"]);

      if (bitlib.string.contains(fullUrl, "?")) {
        fullUrl += ("&" + queryString);
      } else {
        fullUrl += ("?" + queryString);
      }

      return fullUrl;
    }

    function UrlDispatcher() {
      if (!(this instanceof UrlDispatcher)) {
        return new UrlDispatcher();
      }

      // singeton
      if (UrlDispatcher.prototype._singletonInstance) {
        return UrlDispatcher.prototype._singletonInstance;
      }
      var self = this;
      UrlDispatcher.prototype._singletonInstance = self;

      var paramDictionary = bitlib.params.createDictionary();

      self._cloneParams = function () {
        return paramDictionary.clone();
      };

      self._setParam = function (name, val) {
        if (!name || bitlib.common.isNullOrUndefined(val)) {
          return self;
        }

        paramDictionary.set(name, val);

        return self;
      };

      self._setParamIfNotFound = function (name, val) {
        if (!name || bitlib.common.isNullOrUndefined(val)) {
          return self;
        }

        paramDictionary.setIfNotFound(name, val);

        return self;
      };

      self._clearParams = function () {
        paramDictionary.clear();
        return self;
      };

      var queryDictionary = bitlib.params.createDictionary();

      self._cloneQueries = function () {
        return queryDictionary.clone();
      };

      self._setQuery = function (name, val) {
        if (!name || bitlib.common.isNullOrUndefined(val)) {
          return self;
        }

        queryDictionary.set(name, val);

        return self;
      };

      self._setQueryIfNotFound = function (name, val) {
        if (!name || bitlib.common.isNullOrUndefined(val)) {
          return self;
        }

        queryDictionary.setIfNotFound(name, val);

        return self;
      };

      self._clearQueries = function () {
        queryDictionary.clear();
        return self;
      };

      var queryParamDictionary = bitlib.params.createDictionary();

      self._cloneQueryParams = function () {
        return queryParamDictionary.clone();
      };

      self._setQueryParam = function (name, val) {
        if (!name || bitlib.common.isNullOrUndefined(val)) {
          return self;
        }

        queryParamDictionary.set(name, val);

        return self;
      };

      self._setQueryParamIfNotFound = function (name, val) {
        if (!name || bitlib.common.isNullOrUndefined(val)) {
          return self;
        }

        queryParamDictionary.setIfNotFound(name, val);

        return self;
      };

      self._clearQueryParams = function () {
        queryParamDictionary.clear();
        return self;
      };

      var windowIndex = 0,
        windowObjects = {};

      self._publishWindowName = function () {
        var index = windowIndex,
          millisec = new Date().getTime();

        windowIndex += 1;

        return "window_" + bitlib.string.zeroPadding(index, 5) + "_" + millisec.toString();
      };

      self._hasAliveWindowObject = function (windowName) {
        if (windowName) {
          if (windowObjects[windowName]) {
            return !!(windowObjects[windowName]).closed;
          }
        } else {
          for (var name in windowObjects) {
            if (windowObjects.hasOwnProperty(name)) {
              if (!windowObjects[name].closed) {
                return true;
              }
            }
          }
        }

        return false;
      };

      self._registWindowObject = function (windowName, windowObj) {
        if (!windowName || !windowObj) {
          return self;
        }

        windowObjects[windowName] = windowObj;

        return self;
      };

      self._removeWindowObject = function (windowName) {
        if (!windowName) {
          return self;
        }

        if (windowObjects[windowName]) {
          delete windowObjects[windowName];
        }

        return self;
      };

      self._closeWindowObject = function (windowName) {
        if (!windowName) {
          return self;
        }

        if (windowObjects[windowName]) {
          (windowObjects[windowName]).close();
        }

        return self;
      };

      self._closeAllWindowObjects = function () {
        for (var name in windowObjects) {
          if (windowObjects.hasOwnProperty(name)) {
            (windowObjects[name]).close();
          }
        }

        return self;
      };

      return self;
    }

    UrlDispatcher.prototype.setParam = function (name, val) {
      this._setParam(name, val);
      return this;
    };

    UrlDispatcher.prototype.setParams = function (newParams) {
      newParams = newParams || {};

      for (var name in newParams) {
        if (newParams.hasOwnProperty(name)) {
          this._setParam(name, newParams[name]);
        }
      }

      return this;
    };

    UrlDispatcher.prototype.setParamIfNotFound = function (name, val) {
      this._setParamIfNotFound(name, val);
      return this;
    };

    UrlDispatcher.prototype.clearParams = function () {
      this._clearParams();
      return this;
    };

    UrlDispatcher.prototype.setQuery = function (name, val) {
      this._setQuery(name, val);
      return this;
    };

    UrlDispatcher.prototype.setQueries = function (newParams) {
      newParams = newParams || {};

      for (var name in newParams) {
        if (newParams.hasOwnProperty(name)) {
          this._setQuery(name, newParams[name]);
        }
      }

      return this;
    };

    UrlDispatcher.prototype.setQueryIfNotFound = function (name, val) {
      this._setQueryIfNotFound(name, val);
      return this;
    };

    UrlDispatcher.prototype.clearQueries = function () {
      this._clearQueries();
      return this;
    };

    UrlDispatcher.prototype.setQueryParam = function (name, val) {
      this._setQueryParam(name, val);
      return this;
    };

    UrlDispatcher.prototype.setQueryParams = function (newParams) {
      newParams = newParams || {};

      for (var name in newParams) {
        if (newParams.hasOwnProperty(name)) {
          this._setQueryParam(name, newParams[name]);
        }
      }

      return this;
    };

    UrlDispatcher.prototype.setQueryParamIfNotFound = function (name, val) {
      this._setQueryParamIfNotFound(name, val);
      return this;
    };

    UrlDispatcher.prototype.clearQueryParams = function () {
      this._clearQueryParams();
      return this;
    };

    UrlDispatcher.prototype.jump = function (url) {
      BitWeb.LogCollector.sendout();

      var self = this;

      if (!url) {
        return self;
      }

      var name = "",
        params = self._cloneParams();

      for (name in params) {
        if (params.hasOwnProperty(name)) {
          bitlib.params.session.set(name, params[name]);
        }
      }

      bitlib.params.session.save();

      var queryParams = self._cloneQueryParams();
      for (name in queryParams) {
        if (queryParams.hasOwnProperty(name)) {
          bitlib.params.page.setSessionQuery(name, queryParams[name]);
        }
      }

      bitlib.params.page.saveSessionQuery();

      var fullUrl = concatQueries(url, self._cloneQueries());
      if (fullUrl) {
        window.location = fullUrl;
      }

      return self;
    };

    UrlDispatcher.prototype.open = function (url, options) {
      BitWeb.LogCollector.sendout();

      if (!url) {
        return "";
      }

      var self = this;

      var name = "",
        params = self._cloneParams();

      for (name in params) {
        if (params.hasOwnProperty(name)) {
          bitlib.params.session.set(name, params[name]);
        }
      }

      bitlib.params.session.save();

      var queryParams = self._cloneQueryParams();
      for (name in queryParams) {
        if (queryParams.hasOwnProperty(name)) {
          bitlib.params.page.setSessionQuery(name, queryParams[name]);
        }
      }

      bitlib.params.page.saveSessionQuery();

      var windowName = self._publishWindowName();
      options = $.extend(bitlib.common.copyDeep(windowOptions), (options || {}));

      var fullUrl = concatQueries(url, self._cloneQueries());
      if (fullUrl) {
        var windowObj = window.open(fullUrl, windowName, bitlib.string.toPropertyText(options));
        self._registWindowObject(windowName, windowObj);
      }

      // QueryParamsを揮発
      bitlib.params.page
        .clearSessionQueries()
        .saveSessionQuery();

      return windowName;
    };

    UrlDispatcher.prototype.hasWindow = function (windowName) {
      return this._hasAliveWindowObject(windowName);
    };

    UrlDispatcher.prototype.unmonitor = function (windowName) {
      if (windowName) {
        this._removeWindowObject(windowName);
      }
      return this;
    };

    UrlDispatcher.prototype.closeWindow = function (windowName) {
      if (windowName) {
        this._closeWindowObject(windowName);
      }
      return this;
    };

    UrlDispatcher.prototype.closeAllWindows = function () {
      this._closeAllWindowObjects();
      return this;
    };

    UrlDispatcher.prototype.closeSelf = function () {
      BitWeb.LogCollector.sendout();

      var self = this;

      if (self._hasAliveWindowObject()) {
        self._closeAllWindowObjects();
      }

      if (!bitlib.browser.ua.isChrome) {
        bitlib.browser.close();
      } else {
        bitlib.ui.lockScreen('<h3>ウィンドウのタブを閉じてください.</h3>');
      }

      return self;
    };

    UrlDispatcher.getClassName = function () {
      return className;
    };

    return UrlDispatcher;
  }());

  BitWeb.SessionKeeper = (function () {
    var className = "SessionKeeper";

    var MIN_INTERVAL = 60 * 1000;

    function dispatchRequest() {

    }

    function SessionKeeper() {
      if (!(this instanceof SessionKeeper)) {
        return new SessionKeeper();
      }

      // singleton
      if (SessionKeeper.prototype._singletonInstance) {
        return SessionKeeper.prototype._singletonInstance;
      }
      var self = this;
      SessionKeeper.prototype._singletonInstance = self;

      var isRunning = ko.observable(false);

      self.isRunning = ko.pureComputed(function () {
        return isRunning();
      }, self);

      self._start = function () {
        if (!isRunning()) {
          isRunning(true);
        }
        return self;
      };

      self._stop = function () {
        if (isRunning()) {
          isRunning(false);
        }
        return self;
      };

      var interval = 5 * 60 * 1000; // millisec

      self._getInterval = function () {
        return interval;
      };

      self._setInterval = function (newInterval) {
        if (bitlib.common.isNumber(newInterval)) {
          if (newInterval < MIN_INTERVAL) {
            newInterval = MIN_INTERVAL;
          }
          interval = newInterval;
        }
        return self;
      };

      var tick = null;

      function keepSession() {
        dispatchRequest();

        if (isRunning()) {
          tick = setTimeout(keepSession, interval);
        }

        return self;
      }

      isRunning.subscribe(function (running) {
        if (running) {
          tick = setTimeout(autoCollect, interval);
        } else {
          if (tick) {
            clearTimeout(tick);
            tick = null;
          }
        }
      });

      return self;
    }

    SessionKeeper.prototype.start = function () {
      this._start();
      return this;
    };

    SessionKeeper.prototype.stop = function () {
      this._stop();
      return this;
    };

    SessionKeeper.getClassName = function () {
      return className;
    };

    return SessionKeeper;
  }());

}(BitWeb || {}));