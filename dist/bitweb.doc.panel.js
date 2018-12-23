(function (BitWeb) {
  "use strict";

  BitWeb.PanelMetricsBase = (function () {
    var className = "PanelMetricsBase";

    function PanelMetricsBase() {
      // singleton
      if (PanelMetricsBase.prototype._singletonInstance) {
        return PanelMetricsBase.prototype._singletonInstance;
      }
      var self = BitWeb.MetricsBase.apply(this, arguments);
      PanelMetricsBase.prototype._singletonInstance = self;

      self.params = $.extend(true, {
        initPanelIndex: 0
      }, self.params);

      return self;
    }

    var _super = BitWeb.MetricsBase;
    inherits(PanelMetricsBase, _super);

    PanelMetricsBase.getClassName = function () {
      return className;
    };

    return PanelMetricsBase;
  }());

  BitWeb.PanelDocumentBase = (function () {
    var className = "PanelDocumentBase";

    var metrics;

    function PanelDocumentBase() {
      var self = BitWeb.DocumentBase.apply(this, arguments);

      metrics = new BitWeb.PanelMetricsBase();

      self.type = className;

      var panels = ko.observableArray();

      self.hasPanels = ko.pureComputed(function () {
        return 0 < panels().length;
      }, self);

      self.panels = ko.pureComputed(function () {
        return panels();
      }, self);

      self._addPanel = function (newPanels) {
        newPanels = newPanels || [];
        newPanels = bitlib.common.isArray(newPanels) ? newPanels : [newPanels];

        var docPanels = [];
        for (var i = 0, len = newPanels.length; i < len; i++) {
          if (!bitlib.common.isObject(newPanels[i])) {
            continue;
          }
          docPanels.push(newPanels[i]);
        }

        if (0 < docPanels.length) {
          panels.push.apply(panels, docPanels);
        }

        return self;
      };

      self.maxPanelIndex = ko.pureComputed(function () {
        var len = panels().length;
        return (len === 0) ? 0 : (len - 1);
      }, self);

      var selectedPanelIndex = ko.observable(metrics.params.initPanelIndex);

      self.selectedPanelIndex = ko.pureComputed(function () {
        return selectedPanelIndex();
      }, self);

      self._setSelectedPanelIndex = function (newIndex) {
        newIndex = bitlib.common.toInteger(newIndex);

        if (isNaN(newIndex) || newIndex < 0) {
          selectedPanelIndex(-1);
          return self;
        }

        var maxIndex = self.maxPanelIndex();
        if (maxIndex < newIndex) {
          newIndex = maxIndex;
        }

        var newPanel = panels()[newIndex];
        if (bitlib.common.isNullOrUndefined(newPanel)) {
          return self;
        }

        if (!newPanel.load || !newPanel.isReady()) {
          selectedPanelIndex(newIndex);
        } else {
          var promise = newPanel.load();
          promise
            .then(function (panel) {
              panel.init();
              selectedPanelIndex(newIndex);
            });
        }

        return self;
      };

      self.existsPrevPanel = ko.pureComputed(function () {
        return 0 < selectedPanelIndex();
      }, self);

      self.existsNextPanel = ko.pureComputed(function () {
        var maxIndex = self.maxPanelIndex();
        if (maxIndex === 0) {
          return false;
        }
        return selectedPanelIndex() < maxIndex;
      }, self);

      self.focusedPanel = ko.pureComputed(function () {
        return panels()[selectedPanelIndex()];
      }, self);

      self.isFocused = ko.pureComputed(function () {
        return !!self.focusedPanel();
      }, self);

      self.isUnfocused = ko.pureComputed(function () {
        return !self.focusedPanel();
      }, self);

      self = $.extend(self, self.params);
      return self;
    }

    var _super = BitWeb.DocumentBase;
    inherits(PanelDocumentBase, _super);

    PanelDocumentBase.prototype.ready = function () {
      var self = this;

      var defer = $.Deferred();

      var initPanel = self.focusedPanel();
      if (!initPanel || !initPanel.load) {
        return defer.resolve().promise();
      }

      var promise = initPanel.load();
      promise
        .then(function (panel) {
          defer.resolve();
          initPanel.init();
        });

      return defer.promise();
    };

    PanelDocumentBase.prototype.addPanel = function (panel) {
      this._addPanel(panel);
      return this;
    };

    PanelDocumentBase.prototype.focus = function (index) {
      var self = this;

      index = bitlib.common.toInteger(index);
      if (isNaN(index)) {
        return self;
      }

      self._setSelectedPanelIndex(index);

      return self;
    };

    PanelDocumentBase.prototype.blur = function () {
      this._setSelectedPanelIndex(-1);
      return this;
    };

    PanelDocumentBase.prototype.toPrevPanel = function () {
      var self = this;

      if (!self.existsPrevPanel()) {
        return self;
      }

      var index = self.selectedPanelIndex() - 1;
      if (index < 0) {
        return self;
      }

      self._setSelectedPanelIndex(index);

      return self;
    };

    PanelDocumentBase.prototype.toNextPanel = function () {
      var self = this;

      if (!self.existsNextPanel()) {
        return self;
      }

      var index = self.selectedPanelIndex() + 1;
      if (self.maxPanelIndex() < index) {
        return self;
      }

      self._setSelectedPanelIndex(index);

      return self;
    };

    PanelDocumentBase.getClassName = function () {
      return className;
    };

    return PanelDocumentBase;
  }());

}(BitWeb || {}));