(function (BitWeb) {
  "use strict";

  BitWeb.UIMapper = (function () {
    var className = "UIMapper";

    function UIMapper() {
      // singleton
      if (UIMapper.prototype._singletonInstance) {
        return UIMapper.prototype._singletonInstance;
      }
      var self = this;
      UIMapper.prototype._singletonInstance = self;

      var interfaces = ko.observableArray();

      self.interfaces = ko.pureComputed(function () {
        return interfaces();
      }, self);

      var interfacesMap = {};

      self._get = function (name) {
        if (!name || !bitlib.common.isString(name)) {
          return [];
        }

        if (interfacesMap[name]) {
          return interfacesMap[name]; // shallow copy
        }

        var results = [];
        bitlib.array.each(interfaces, function (i, itf) {
          results = results.concat(itf.getUIByName(name));
        });

        interfacesMap[name] = results;

        return results;
      };

      self._add = function (itfs) {
        itfs = itfs || [];
        itfs = bitlib.common.isArray(itfs) ? itfs : [itfs];

        itfs = bitlib.array.removeNullOrUndefined(itfs);

        if (itfs.length === 0) {
          return self;
        }

        var indicator = function (uivm) {
          if (!uivm.name) {
            return uivm;
          }

          if (!interfacesMap[uivm.name]) {
            interfacesMap[uivm.name] = [];
          }

          interfacesMap[uivm.name].push(uivm);

          return uivm;
        };

        bitlib.array.each(itfs, function (i, itf) {
          itf.command(indicator);
        });

        interfaces.push.apply(interfaces, itfs);

        return self;
      };

      var hiddenInterfaces = [];

      self._applyHideAll = function () {
        if (0 < hiddenInterfaces.length) {
          return self;
        }

        var indicator = function (uivm) {
          if (!uivm.isVisible()) {
            return uivm;
          }

          uivm.hide();
          hiddenInterfaces.push(uivm);

          return uivm;
        };

        bitlib.array.each(interfaces, function (i, itf) {
          itf.command(indicator);
        });

        return self;
      };

      self._applyShowAll = function () {
        if (hiddenInterfaces.length === 0) {
          return self;
        }

        bitlib.array.each(hiddenInterfaces, function (i, itf) {
          itf.show();
        });

        hiddenInterfaces = [];

        return self;
      };

      self._applyShowAllAsynchronously = function (interval) {
        var defer = $.Deferred();

        if (hiddenInterfaces.length === 0) {
          return defer.resolve().promise();
        }

        if (!bitlib.common.isNumber(interval) || interval < 100) {
          interval = 100;
        }

        var promise = bitlib.array.eachTimeout(hiddenInterfaces, function (i, itf) {
          itf.show();
        }, interval);

        promise
          .done(function () {
            hiddenInterfaces = [];

            defer.resolve();
          });

        return defer.promise();
      };

      return self;
    }

    UIMapper.prototype.get = function (name) {
      return this._get(name);
    };

    UIMapper.prototype.fget = function (name) {
      return this._get(name)[0] || {};
    };

    UIMapper.prototype.add = function (uivm) {
      this._add(uivm);
      return this;
    };

    UIMapper.prototype.resetAll = function () {
      var self = this;

      bitlib.array.each(self.interfaces, function (i, itf) {
        itf.reset();
      });

      return self;
    };

    UIMapper.prototype.clearAll = function () {
      var self = this;

      bitlib.array.each(self.interfaces, function (i, itf) {
        itf.clear();
      });

      return self;
    };

    UIMapper.prototype.hideAll = function () {
      this._applyHideAll();
      return this;
    };

    UIMapper.prototype.showAll = function () {
      this._applyShowAll();
      return this;
    };

    UIMapper.prototype.showAllAsynchronously = function (interval) {
      return this._applyShowAllAsynchronously(interval);
    };

    UIMapper.getClassName = function () {
      return className;
    };

    return UIMapper;
  }());

  BitWeb.UIValidator = (function () {
    var className = "UIValidator";

    function UIValidator() {
      if (!(this instanceof UIValidator)) {
        return new UIValidator();
      }

      // singleton
      if (UIValidator.prototype._singletonInstance) {
        return UIValidator.prototype._singletonInstance;
      }
      var self = this;
      UIValidator.prototype._singletonInstance = self;

      var policies = [];

      self._getAllPolicies = function () {
        return bitlib.common.copyDeep(policies);
      };

      self._addPolicy = function (newPolicies) {
        newPolicies = newPolicies || [];
        newPolicies = bitlib.common.isArray(newPolicies) ? newPolicies : [newPolicies];

        newPolicies = bitlib.array.removeNullOrUndefined(newPolicies);

        if (newPolicies.length === 0) {
          return self;
        }

        for (var i = 0, len = newPolicies.length; i < len; i++) {
          if (bitlib.common.isFunction(newPolicies[i])) {
            policies.push(newPolicies[i]);
          }
        }

        return self;
      };

      self._clearPolicies = function () {
        policies = [];
        return self;
      };

      return self;
    }

    UIValidator.prototype.addPolicy = function (policy) {
      this._addPolicy(policy);
      return this;
    };

    UIValidator.prototype.clear = function () {
      this._clearPolicies();
      return this;
    };

    UIValidator.prototype.validate = function () {
      var self = this;

      var policies = self._getAllPolicies();

      if (policies.length === 0) {
        return true;
      }

      try {
        for (var i = 0, len = policies.length; i < len; i++) {
          if (!policies[i].apply(self, arguments)) {
            return false;
          }
        }
      } catch (err) {
        bitlib.logger.error(err);
      }

      return true;
    };

    UIValidator.getClassName = function () {
      return className;
    };

    return UIValidator;
  }());

  BitWeb.UIDisplayer = (function () {
    var className = "UIDisplayer";

    function UIDisplayer() {
      if (!(this instanceof UIDisplayer)) {
        return new UIDisplayer();
      }

      // singleton
      if (UIDisplayer.prototype._singletonInstance) {
        var instance = UIDisplayer.prototype._singletonInstance;

        instance._reset();

        return UIDisplayer.prototype._singletonInstance;
      }
      var self = this;
      UIDisplayer.prototype._singletonInstance = self;

      var mapper = new BitWeb.UIMapper();

      var sources = [];


      self._getAllSources = function () {
        return bitlib.common.copyDeep(sources);
      };

      self._setSources = function (sourceId) {
        if (!sourceId || !bitlib.common.isString(sourceId)) {
          return self;
        }

        sources = mapper.get(sourceId);

        return self;
      };

      self._clearSources = function () {
        sources = [];
        return self;
      };

      var destinations = [];

      self._getAllDestinations = function () {
        return bitlib.common.copyDeep(destinations);
      };

      self._setDestinations = function (destinationId) {
        if (!destinationId || !bitlib.common.isString(destinationId)) {
          return self;
        }

        destinations = mapper.get(destinationId);

        return self;
      };

      self._clearDestinations = function () {
        destinations = [];
        return self;
      };

      self._reset = function () {
        sources = [], destinations = [];
        return self;
      };

      return self;
    }

    UIDisplayer.prototype.setSources = function (sourceId) {
      this._setSources(sourceId);
      return this;
    };

    // Alias
    UIDisplayer.prototype.from = UIDisplayer.prototype.setSources;

    UIDisplayer.prototype.setDestinations = function (destinationId) {
      this._setSources(destinationId);
      return this;
    };

    // Alias
    UIDisplayer.prototype.to = UIDisplayer.prototype.setDestinations;

    UIDisplayer.prototype.applyVisibility = function (policy) {
      var self = this;

      var sources = self._getAllSources(),
        destinations = self._getAllDestinations();

      if (sources.length === 0 || destinations.length === 0) {
        return self;
      }

      policy = policy || function (sval) {
        return !!sval;
      };

      var visibilityHandler = function (isVisible) {
        isVisible = !!isVisible;

        bitlib.array.each(destinations, function (index, destination) {
          if (isVisible) {
            destination.show();
          } else {
            if (!destination.isValid()) {
              destination.hide();
            }
          }
        });

        return true;
      };

      try {
        for (var i = 0, len = sources.length; i < len; i++) {
          sources[i].value.subscribe(function (newValue) {
            visibilityHandler(policy(newValue));
          });

          visibilityHandler(policy(sources[i].value()));
        }
      } catch (err) {
        bitlib.logger.error(err);
      }

      return self;
    };

    UIDisplayer.getClassName = function () {
      return className;
    };

    return UIDisplayer;
  }());

  BitWeb.UIValueCopier = (function () {
    var className = "UIValueCopier";

    var defaultDelimiter = "\n";

    function UIValueCopier() {
      if (!(this instanceof UIValueCopier)) {
        return new UIValueCopier();
      }

      // singleton
      if (UIValueCopier.prototype._singletonInstance) {
        var instance = UIValueCopier.prototype._singletonInstance;

        instance._reset();

        return UIValueCopier.prototype._singletonInstance;
      }
      var self = this;
      UIValueCopier.prototype._singletonInstance = self;

      var mapper = new BitWeb.UIMapper();

      var sources = [];

      self._getAllSources = function () {
        return bitlib.common.copyDeep(sources);
      };

      self._setSources = function (sourceId) {
        if (!sourceId || !bitlib.common.isString(sourceId)) {
          return self;
        }

        sources = mapper.get(sourceId);

        return self;
      };

      self._clearSources = function () {
        sources = [];
        return self;
      };

      var destinations = [];

      self._getAllDestinations = function () {
        return bitlib.common.copyDeep(destinations);
      };

      self._setDestinations = function (destinationId) {
        if (!destinationId || !bitlib.common.isString(destinationId)) {
          return self;
        }

        destinations = mapper.get(destinationId);

        return self;
      };

      self._clearDestinations = function () {
        destinations = [];
        return self;
      };

      var delimiter = defaultDelimiter;

      self._getDelimiter = function () {
        return delimiter;
      };

      self._setDelimiter = function (newDelimiter) {
        if (!bitlib.common.isString(newDelimiter)) {
          return self;
        }

        delimiter = newDelimiter;

        return self;
      };

      self._resetDelimiter = function () {
        delimiter = defaultDelimiter;
        return self;
      };

      self._reset = function () {
        sources = [], destinations = [];

        self._resetDelimiter();

        return self;
      };

      return self;
    }

    UIValueCopier.prototype.setSources = function (sourceId) {
      this._setSources(sourceId);
      return this;
    };

    // Alias
    UIValueCopier.prototype.from = UIValueCopier.prototype.setSources;

    UIValueCopier.prototype.setDestinations = function (destinationId) {
      this._setSources(destinationId);
      return this;
    };

    // Alias
    UIValueCopier.prototype.to = UIValueCopier.prototype.setDestinations;

    UIValueCopier.prototype.resetDelimiter = function () {
      this._resetDelimiter();
      return this;
    };

    UIValueCopier.prototype.copyValue = function (validator) {
      var self = this;

      var sources = self._getAllSources(),
        destinations = self._getAllDestinations();

      if (sources.length === 0 || destinations.length === 0) {
        return self;
      }

      var i = 0,
        len = 0;

      var valArr = [];
      for (i = 0, len = sources.length; i < len; i++) {
        if (sources[i].isValid()) {
          valArr.push(sources[i].value());
        }
      }

      if (valArr.length === 0) {
        return self;
      }

      var val = valArr.join(self._getDelimiter());

      validator = validator || function (destination, sval) {
        return true;
      };

      for (i = 0, len = destinations.length; i < len; i++) {
        if (destinations[i].isWritable() && !destinations[i].isValid()) {
          if (validator(destinations[i], val)) {
            destinations[i].value(val);
          }
        }
      }

      return self;
    };

    UIValueCopier.prototype.joinValue = function (validator) {
      var self = this;

      var sources = self._getAllSources(),
        destinations = self._getAllDestinations();

      if (sources.length === 0 || destinations.length === 0) {
        return self;
      }

      var i = 0,
        len = 0;

      var valArr = [];
      for (i = 0, len = sources.length; i < len; i++) {
        if (sources[i].isValid()) {
          valArr.push(sources[i].value());
        }
      }

      if (valArr.length === 0) {
        return self;
      }

      var val = valArr.join(self._getDelimiter());

      validator = validator || function (destination, sval) {
        return true;
      };

      for (i = 0, len = destinations.length; i < len; i++) {
        if (destinations[i].isWritable()) {
          if (validator(destinations[i], val)) {
            var dval = (destinations[i].isValid() ? (destinations[i].value() + self._getDelimiter()) : "") + val;
            destinations[i].value(dval);
          }
        }
      }

      return self;
    };

    UIValueCopier.prototype.overwriteValue = function (validator) {
      var self = this;

      var sources = self._getAllSources(),
        destinations = self._getAllDestinations();

      if (sources.length === 0 || destinations.length === 0) {
        return self;
      }

      var i = 0,
        len = 0;

      var valArr = [];
      for (i = 0, len = sources.length; i < len; i++) {
        if (sources[i].isValid()) {
          valArr.push(sources[i].value());
        }
      }

      if (valArr.length === 0) {
        return self;
      }

      var val = valArr.join(self._getDelimiter());

      validator = validator || function (destination, sval) {
        return true;
      };

      for (i = 0, len = destinations.length; i < len; i++) {
        if (destinations[i].isWritable()) {
          if (validator(destinations[i], val)) {
            destinations[i].value(val);
          }
        }
      }

      return self;
    };

    UIValueCopier.prototype.copyOutput = function (validator) {
      var self = this;

      var sources = self._getAllSources(),
        destinations = self._getAllDestinations();

      if (sources.length === 0 || destinations.length === 0) {
        return self;
      }

      var i = 0,
        len = 0;

      var valArr = [];
      for (i = 0, len = sources.length; i < len; i++) {
        if (sources[i].isValid()) {
          valArr.push(sources[i].output());
        }
      }

      if (valArr.length === 0) {
        return self;
      }

      var val = valArr.join(self._getDelimiter());

      validator = validator || function (destination, sval) {
        return true;
      };

      for (i = 0, len = destinations.length; i < len; i++) {
        if (destinations[i].isWritable() && !destinations[i].isValid()) {
          if (validator(destinations[i], val)) {
            destinations[i].value(val);
          }
        }
      }

      return self;
    };

    UIValueCopier.prototype.joinOutput = function (validator) {
      var self = this;

      var sources = self._getAllSources(),
        destinations = self._getAllDestinations();

      if (sources.length === 0 || destinations.length === 0) {
        return self;
      }

      var i = 0,
        len = 0;

      var valArr = [];
      for (i = 0, len = sources.length; i < len; i++) {
        if (sources[i].isValid()) {
          valArr.push(sources[i].output());
        }
      }

      if (valArr.length === 0) {
        return self;
      }

      var val = valArr.join(self._getDelimiter());

      validator = validator || function (destination, sval) {
        return true;
      };

      for (i = 0, len = destinations.length; i < len; i++) {
        if (destinations[i].isWritable()) {
          if (validator(destinations[i], val)) {
            var dval = (destinations[i].isValid() ? (destinations[i].value() + self._getDelimiter()) : "") + val;
            destinations[i].value(dval);
          }
        }
      }

      return self;
    };

    UIValueCopier.prototype.overwriteOutput = function (validator) {
      var self = this;

      var sources = self._getAllSources(),
        destinations = self._getAllDestinations();

      if (sources.length === 0 || destinations.length === 0) {
        return self;
      }

      var i = 0,
        len = 0;

      var valArr = [];
      for (i = 0, len = sources.length; i < len; i++) {
        if (sources[i].isValid()) {
          valArr.push(sources[i].output());
        }
      }

      if (valArr.length === 0) {
        return self;
      }

      var val = valArr.join(self._getDelimiter());

      validator = validator || function (destination, sval) {
        return true;
      };

      for (i = 0, len = destinations.length; i < len; i++) {
        if (destinations[i].isWritable()) {
          if (validator(destinations[i], val)) {
            destinations[i].value(val);
          }
        }
      }

      return self;
    };

    UIValueCopier.prototype.copyText = function (validator) {
      var self = this;

      var sources = self._getAllSources(),
        destinations = self._getAllDestinations();

      if (sources.length === 0 || destinations.length === 0) {
        return self;
      }

      var i = 0,
        len = 0;

      var valArr = [];
      for (i = 0, len = sources.length; i < len; i++) {
        if (sources[i].isValid()) {
          valArr.push(sources[i].toText());
        }
      }

      if (valArr.length === 0) {
        return self;
      }

      var val = valArr.join(self._getDelimiter());

      validator = validator || function (destination, sval) {
        return true;
      };

      for (i = 0, len = destinations.length; i < len; i++) {
        if (destinations[i].isWritable() && !destinations[i].isValid()) {
          if (validator(destinations[i], val)) {
            destinations[i].value(val);
          }
        }
      }

      return self;
    };

    UIValueCopier.prototype.joinText = function (validator) {
      var self = this;

      var sources = self._getAllSources(),
        destinations = self._getAllDestinations();

      if (sources.length === 0 || destinations.length === 0) {
        return self;
      }

      var i = 0,
        len = 0;

      var valArr = [];
      for (i = 0, len = sources.length; i < len; i++) {
        if (sources[i].isValid()) {
          valArr.push(sources[i].toText());
        }
      }

      if (valArr.length === 0) {
        return self;
      }

      var val = valArr.join(self._getDelimiter());

      validator = validator || function (destination, sval) {
        return true;
      };

      for (i = 0, len = destinations.length; i < len; i++) {
        if (destinations[i].isWritable()) {
          if (validator(destinations[i], val)) {
            var dval = (destinations[i].isValid() ? (destinations[i].value() + self._getDelimiter()) : "") + val;
            destinations[i].value(dval);
          }
        }
      }

      return self;
    };

    UIValueCopier.prototype.overwriteText = function (validator) {
      var self = this;

      var sources = self._getAllSources(),
        destinations = self._getAllDestinations();

      if (sources.length === 0 || destinations.length === 0) {
        return self;
      }

      var i = 0,
        len = 0;

      var valArr = [];
      for (i = 0, len = sources.length; i < len; i++) {
        if (sources[i].isValid()) {
          valArr.push(sources[i].toText());
        }
      }

      if (valArr.length === 0) {
        return self;
      }

      var val = valArr.join(self._getDelimiter());

      validator = validator || function (destination, sval) {
        return true;
      };

      for (i = 0, len = destinations.length; i < len; i++) {
        if (destinations[i].isWritable()) {
          if (validator(destinations[i], val)) {
            destinations[i].value(val);
          }
        }
      }

      return self;
    };

    UIValueCopier.getClassName = function () {
      return className;
    };

    return UIValueCopier;
  }());

  BitWeb.UIValueReflector = (function () {
    var className = "UIValueReflector";

    function UIValueReflector() {
      if (!(this instanceof UIValueReflector)) {
        return new UIValueReflector();
      }

      // singleton
      if (UIValueReflector.prototype._singletonInstance) {
        return UIValueReflector.prototype._singletonInstance;
      }
      var self = this;
      UIValueReflector.prototype._singletonInstance = self;

      var mapper = new BitWeb.UIMapper();

      var sources = [];

      self._getAllSources = function () {
        return bitlib.common.copyDeep(sources);
      };

      self._setSources = function (sourceId) {
        if (!sourceId || !bitlib.common.isString(sourceId)) {
          return self;
        }

        sources = mapper.get(sourceId);

        return self;
      };

      self._clearSources = function () {
        sources = [];
        return self;
      };

      var destinations = [];

      self._getAllDestinations = function () {
        return bitlib.common.copyDeep(destinations);
      };

      self._setDestinations = function (destinationId) {
        if (!destinationId || !bitlib.common.isString(destinationId)) {
          return self;
        }

        destinations = mapper.get(destinationId);

        return self;
      };

      self._clearDestinations = function () {
        destinations = [];
        return self;
      };

      self._reset = function () {
        sources = [], destinations = [];
        return self;
      };

      return self;
    }

    UIValueReflector.prototype.setSources = function (sourceId) {
      this._setSources(sourceId);
      return this;
    };

    // Alias
    UIValueReflector.prototype.from = UIValueReflector.prototype.setSources;

    UIValueReflector.prototype.setDestinations = function (destinationId) {
      this._setSources(destinationId);
      return this;
    };

    // Alias
    UIValueReflector.prototype.to = UIValueReflector.prototype.setDestinations;

    UIValueReflector.prototype.applyValueReflection = function (converter) {
      var self = this;

      var sources = self._getAllSources(),
        destinations = self._getAllDestinations();

      if (sources.length === 0 || destinations.length === 0) {
        return self;
      }

      converter = converter || function (sval) {
        return sval;
      };

      var reflectionHandler = function (val) {
        if (!bitlib.common.isString(val)) {
          return false;
        }

        bitlib.array.each(destinations, function (index, destination) {
          destination.value(val);
        });

        return true;
      };

      try {
        for (var i = 0, len = sources.length; i < len; i++) {
          sources[i].value.subscribe(function (newValue) {
            reflectionHandler(converter(newValue));
          });

          reflectionHandler(converter(sources[i].value()));
        }
      } catch (err) {
        bitlib.logger.error(err);
      }

      return self;
    };

    UIValueReflector.getClassName = function () {
      return className;
    };

    return UIValueReflector;
  }());

  BitWeb.UIValueTransmitter = (function () {
    var className = "UIValueTransmitter";

    function UIValueTransmitter() {
      if (!(this instanceof UIValueTransmitter)) {
        return new UIValueTransmitter();
      }

      // singleton
      if (UIValueTransmitter.prototype._singletonInstance) {
        return UIValueTransmitter.prototype._singletonInstance;
      }
      var self = this;
      UIValueTransmitter.prototype._singletonInstance = self;

      var mapper = new BitWeb.UIMapper();

      var sources = [];

      self._getAllSources = function () {
        return bitlib.common.copyDeep(sources);
      };

      self._setSources = function (sourceId) {
        if (!sourceId || !bitlib.common.isString(sourceId)) {
          return self;
        }

        sources = mapper.get(sourceId);

        return self;
      };

      self._clearSources = function () {
        sources = [];
        return self;
      };

      var destinations = [];

      self._getAllDestinations = function () {
        return bitlib.common.copyDeep(destinations);
      };

      self._setDestinations = function (destinationId) {
        if (!destinationId || !bitlib.common.isString(destinationId)) {
          return self;
        }

        destinations = mapper.get(destinationId);

        return self;
      };

      self._clearDestinations = function () {
        destinations = [];
        return self;
      };

      self._reset = function () {
        sources = [], destinations = [];
        return self;
      };

      return self;
    }

    UIValueTransmitter.prototype.setSources = function (sourceId) {
      this._setSources(sourceId);
      return this;
    };

    // Alias
    UIValueTransmitter.prototype.from = UIValueTransmitter.prototype.setSources;

    UIValueTransmitter.prototype.setDestinations = function (destinationId) {
      this._setSources(destinationId);
      return this;
    };

    // Alias
    UIValueTransmitter.prototype.to = UIValueTransmitter.prototype.setDestinations;

    UIValueTransmitter.prototype.applyValueTransmission = function (instruction) {
      var self = this;

      var sources = self._getAllSources(),
        destinations = self._getAllDestinations();

      if (sources.length === 0 || destinations.length === 0) {
        return self;
      }

      instruction = instruction || function (sval, dest) {
        // none
      };

      var transmissionHandler = function (val) {
        if (!bitlib.common.isString(val)) {
          return false;
        }

        bitlib.array.each(destinations, function (index, destination) {
          instruction(val, destination);
        });

        return true;
      };

      try {
        for (var i = 0, len = sources.length; i < len; i++) {
          sources[i].value.subscribe(function (newValue) {
            transmissionHandler(newValue);
          });

          transmissionHandler(sources[i].value());
        }
      } catch (err) {
        bitlib.logger.error(err);
      }

      return self;
    };

    UIValueTransmitter.getClassName = function () {
      return className;
    };

    return UIValueTransmitter;
  }());

  BitWeb.SelectUIOptionsFactory = (function () {
    var className = "SelectUIOptionsFactory";

    function SelectUIOptionsFactory() {
      var self = this;

      var options = ko.observableArray();

      self._returnOptions = function () {
        return options;
      };

      self._replaceOptions = function (newOptions) {
        if (bitlib.common.isObservableArray(newOptions)) {
          options = newOptions;
        }
        return self;
      };

      self._addOption = function (newOpts) {
        newOpts = newOpts || [];
        newOpts = bitlib.common.isArray(newOpts) ? newOpts : [newOpts];

        var opts = [];
        for (var i = 0, len = newOpts.length; i < len; i++) {
          if (bitlib.common.isObject(newOpts[i]) && !!newOpts[i].isSelectUIOptionViewModel) {
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

      return self;
    }

    SelectUIOptionsFactory.prototype.to = function (options) {
      this._replaceOptions(options);
      return this;
    };

    SelectUIOptionsFactory.prototype.publish = function (masterRep, buildOptionsFunc) {
      var self = this;

      if (!masterRep || !bitlib.common.isFunction(buildOptionsFunc)) {
        return self._returnOptions();
      }

      var promise = masterRep.load();
      promise
        .done(function () {
          var options = buildOptionsFunc(masterRep);
          if (bitlib.common.isArray(options)) {
            self
              ._clearOptions()
              ._addOption(options);
          }
        });

      return self._returnOptions();
    };

    SelectUIOptionsFactory.getClassName = function () {
      return className;
    };

    return SelectUIOptionsFactory;
  }());

}(BitWeb || {}));