(function (BitWeb) {
  "use strict";

  BitWeb.RepositoryBase = (function () {
    var className = "RepositoryBase";

    function RepositoryBase(params) {
      var self = this;

      self.params = params || {};

      self.observable = ko.observable(self); // 通知用の observable object

      var changedTimes = 0;

      self._getChangedTimes = function () {
        return changedTimes;
      };

      var source = [];

      self._getSourceLength = function () {
        return source.length;
      };

      self._getAllSources = function () {
        return bitlib.common.copy(source);
      };

      self._addSource = function (newSource) {
        newSource = newSource || [];
        newSource = bitlib.common.isArray(newSource) ? newSource : [newSource];

        newSource = bitlib.array.removeNullOrUndefined(newSource);

        if (newSource.length === 0) {
          return self;
        }

        source = source.concat(newSource);

        return self;
      };

      self._clearSources = function () {
        source = [];
        return self;
      };

      self = $.extend(self, self.params);

      self.observable.subscribe(function () {
        changedTimes++;
      });

      return self;
    }

    RepositoryBase.prototype.getChangedTimes = function () {
      return this._getChangedTimes();
    };

    RepositoryBase.prototype.getSourceLength = function () {
      return this._getSourceLength();
    };

    RepositoryBase.prototype.getSource = function (begin, end) {
      var source = this._getAllSources();

      begin = begin || 0;
      end = end || source.length;

      return source.slice(begin, end);
    };

    RepositoryBase.prototype.addSource = function (source) {
      this._addSource(source);
      return this;
    };

    RepositoryBase.getClassName = function () {
      return className;
    };

    return RepositoryBase;
  }());

  BitWeb.MasterRepositoryBase = (function () {
    var className = "MasterRepositoryBase";

    var READY = "READY",
      LOADING = "LOADING",
      LOADED = "LOADED",
      TIMEOUT = "TIMEOUT";

    function MasterRepositoryBase() {
      var self = BitWeb.RepositoryBase.apply(this, arguments);

      var status = ko.observable(READY);

      self.isReady = ko.pureComputed(function () {
        return status() === READY;
      }, self);

      self.isLoading = ko.pureComputed(function () {
        return status() === LOADING;
      }, self);

      self.isLoaded = ko.pureComputed(function () {
        return status() === LOADED;
      }, self);

      self.isTimeout = ko.pureComputed(function () {
        return status() === TIMEOUT;
      }, self);

      self._setStatus = function (newStatus) {
        if (status() !== newStatus) {
          status(newStatus);
        }
        return self;
      };

      var master = [];

      self._getMasterLength = function () {
        return master.length;
      };

      self._getAllMasters = function () {
        return bitlib.common.copy(master);
      };

      self._clearMasters = function () {
        master = [];
        return self;
      };

      var filterPolicies = [];

      self._addFilterPolicy = function (newPolicies) {
        newPolicies = newPolicies || [];
        newPolicies = bitlib.common.isArray(newPolicies) ? newPolicies : [newPolicies];

        newPolicies = bitlib.array.removeNullOrUndefined(newPolicies);

        if (newPolicies.length === 0) {
          return self;
        }

        for (var i = 0, len = newPolicies.length; i < len; i++) {
          if (bitlib.common.isFunction(newPolicies[i])) {
            filterPolicies.push(newPolicies[i]);
          }
        }

        return self;
      };

      self._clearFilterPolicies = function () {
        filterPolicies = [];
        return self;
      };

      function applyFilterPolicies(originalMaster) {
        originalMaster = originalMaster || [];

        if (originalMaster.length === 0 || filterPolicies.length === 0) {
          return originalMaster;
        }

        var cloneMaster = bitlib.common.copy(originalMaster);

        bitlib.array.each(filterPolicies, function (i, policy) {
          cloneMaster = policy(cloneMaster);
        });

        return cloneMaster;
      }

      var sortPolicy;

      self._setSortPolicy = function (newPolicy) {
        if (bitlib.common.isFunction(newPolicy)) {
          sortPolicy = newPolicy;
        }
        return self;
      };

      self._deleteSortPolicy = function () {
        sortPolicy = undefined;
        return self;
      };

      function applySortPolicy(originalMaster) {
        originalMaster = originalMaster || [];

        if (originalMaster.length < 2 || !sortPolicy) {
          return originalMaster;
        }

        var cloneMaster = bitlib.common.copy(originalMaster);
        cloneMaster.sort(sortPolicy);

        return cloneMaster;
      }

      self._applyPolicies = function () {
        var originalMaster = self._getAllSources();

        originalMaster = applyFilterPolicies(originalMaster);
        originalMaster = applySortPolicy(originalMaster);

        master = originalMaster;

        self.observable.notifySubscribers(self);

        return self;
      };

      self = $.extend(self, self.params);
      return self;
    }

    var _super = BitWeb.RepositoryBase;
    inherits(MasterRepositoryBase, _super);

    MasterRepositoryBase.prototype.loading = function () {
      this._setStatus(LOADING);
      return this;
    };

    MasterRepositoryBase.prototype.loaded = function () {
      this._setStatus(LOADED);
      return this;
    };

    MasterRepositoryBase.prototype.createNullObject = function () {
      return {};
    };

    MasterRepositoryBase.prototype.isNullObject = function (obj) {
      if (!obj || !bitlib.common.isObject(obj)) {
        return false;
      }

      var nullObj = this.createNullObject();
      if (bitlib.json.stringify(nullObj) === bitlib.json.stringify(obj)) {
        return true;
      }

      return false;
    };

    MasterRepositoryBase.prototype.getMasterLength = function () {
      return this._getMasterLength();
    };

    MasterRepositoryBase.prototype.getMaster = function (begin, end) {
      var master = this._getAllMasters();

      begin = begin || 0;
      end = end || master.length;

      return master.slice(begin, end);
    };

    MasterRepositoryBase.prototype.getFallbackMaster = function () {
      var self = this;

      if (0 < self._getMasterLength()) {
        return self._getAllMasters()[0];
      }

      return self.createNullObject();
    };

    // 指定した条件を満たすレコードを取得する.
    MasterRepositoryBase.prototype.select = function (pred) {
      var master = this._getAllMasters();

      if (!pred || !bitlib.common.isFunction(pred)) {
        return master;
      }

      var results = [];
      for (var i = 0, len = master.length; i < len; i++) {
        if (pred(master[i])) {
          results.push(master[i]);
        }
      }

      return results;
    };

    MasterRepositoryBase.prototype.clear = function () {
      this
        ._clearMasters()
        ._clearSources();

      return this;
    };

    MasterRepositoryBase.prototype.applyPolicies = function () {
      this._applyPolicies();
      return this;
    };

    MasterRepositoryBase.prototype.addFilterPolicy = function (policy) {
      this._addFilterPolicy(policy);
      return this;
    };

    MasterRepositoryBase.prototype.clearFilterPolicies = function () {
      this._clearFilterPolicies();
      return this;
    };

    MasterRepositoryBase.prototype.setSortPolicy = function (policy) {
      this._setSortPolicy(policy);
      return this;
    };

    MasterRepositoryBase.prototype.deleteSortPolicy = function () {
      this._deleteSortPolicy();
      return this;
    };

    MasterRepositoryBase.prototype.load = function (master) {
      var self = this,
        defer = $.Deferred();

      if (self.isLoaded()) {
        return defer.resolve().promise();
      }

      if (self.isLoading()) {
        self.isLoaded.subscribe(function () {
          defer.resolve();
        });

        return defer.promise();
      }

      master = master || [];
      master = bitlib.common.isArray(master) ? master : [master];

      self
        .clear()
        .addSource(master)
        .applyPolicies()
        .loaded();

      return defer.resolve().promise();
    };

    MasterRepositoryBase.getClassName = function () {
      return className;
    };

    return MasterRepositoryBase;
  }());

  BitWeb.DataRepositoryBase = (function () {
    var className = "DataRepositoryBase";

    function DataRepositoryBase() {
      var self = BitWeb.RepositoryBase.apply(this, arguments);

      var data = [];

      self._getDataLength = function () {
        return data.length;
      };

      self._getAllDatas = function () {
        return bitlib.common.copy(data);
      };

      self._clearDatas = function () {
        data = [];
        return self;
      };

      var filterPolicies = [];

      self._addFilterPolicy = function (newPolicies) {
        newPolicies = newPolicies || [];
        newPolicies = bitlib.common.isArray(newPolicies) ? newPolicies : [newPolicies];

        newPolicies = bitlib.array.removeNullOrUndefined(newPolicies);

        if (newPolicies.length === 0) {
          return self;
        }

        for (var i = 0, len = newPolicies.length; i < len; i++) {
          if (bitlib.common.isFunction(newPolicies[i])) {
            filterPolicies.push(newPolicies[i]);
          }
        }

        return self;
      };

      self._clearFilterPolicies = function () {
        filterPolicies = [];
        return self;
      };

      function applyFilterPolicies(originalData) {
        originalData = originalData || [];

        if (originalData.length === 0 || filterPolicies.length === 0) {
          return originalData;
        }

        var cloneData = bitlib.common.copy(originalData);

        bitlib.array.each(filterPolicies, function (i, policy) {
          cloneData = policy(cloneData);
        });

        return cloneData;
      }

      var sortPolicy;

      self._setSortPolicy = function (newPolicy) {
        if (bitlib.common.isFunction(newPolicy)) {
          sortPolicy = newPolicy;
        }
        return self;
      };

      self._deleteSortPolicy = function () {
        sortPolicy = undefined;
        return self;
      };

      function applySortPolicy(originalData) {
        originalData = originalData || [];

        if (originalData.length < 2 || !sortPolicy) {
          return originalData;
        }

        var cloneData = bitlib.common.copy(originalData);
        cloneData.sort(sortPolicy);

        return cloneData;
      }

      self._applyPolicies = function () {
        var originalData = self._getAllSources();

        originalData = applyFilterPolicies(originalData);
        originalData = applySortPolicy(originalData);

        data = originalData;

        self.observable.notifySubscribers(self);

        return self;
      };

      self = $.extend(self, self.params);
      return self;
    }

    var _super = BitWeb.RepositoryBase;
    inherits(DataRepositoryBase, _super);

    DataRepositoryBase.prototype.getDataLength = function () {
      return this._getDataLength();
    };

    DataRepositoryBase.prototype.getData = function (begin, end) {
      var data = this._getAllDatas();

      begin = begin || 0;
      end = end || data.length;

      return data.slice(begin, end);
    };

    DataRepositoryBase.prototype.clear = function () {
      this
        ._clearDatas()
        ._clearSources();

      return this;
    };

    DataRepositoryBase.prototype.applyPolicies = function () {
      this._applyPolicies();
      return this;
    };

    DataRepositoryBase.prototype.addFilterPolicy = function (policy) {
      this._addFilterPolicy(policy);
      return this;
    };

    DataRepositoryBase.prototype.clearFilterPolicies = function () {
      this._clearFilterPolicies();
      return this;
    };

    DataRepositoryBase.prototype.setSortPolicy = function (policy) {
      this._setSortPolicy(policy);
      return this;
    };

    DataRepositoryBase.prototype.deleteSortPolicy = function () {
      this._deleteSortPolicy();
      return this;
    };

    DataRepositoryBase.getClassName = function () {
      return className;
    };

    return DataRepositoryBase;
  }());

}(BitWeb || {}));