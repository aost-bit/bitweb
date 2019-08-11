(function(BitWeb) {
    "use strict";

    BitWeb.ResourceBase = (function() {
        var className = "ResourceBase";

        function ResourceBase(params) {
            var self = this;

            self.params = params || {};

            self.id = "";
            self.name = "";
            self.caption = "";

            var isAvailable = ko.observable(true);

            self.isAvailable = ko.pureComputed(function() {
                return isAvailable();
            }, self);

            self._enable = function() {
                if (!isAvailable()) {
                    isAvailable(true);
                }
                return self;
            };

            self._disable = function() {
                if (isAvailable()) {
                    isAvailable(false);
                }
                return self;
            };

            var isValid = ko.observable(false);

            self.isValid = ko.pureComputed(function() {
                return isValid();
            }, self);

            self._validate = function() {
                if (!isValid()) {
                    isValid(true);
                }
                return self;
            };

            self._invalidate = function() {
                if (isValid()) {
                    isValid(false);
                }
                return self;
            };

            var isVisible = ko.observable(true);

            self.isVisible = ko.pureComputed(function() {
                return isVisible();
            }, self);

            self._visible = function() {
                if (!isVisible()) {
                    isVisible(true);
                }
                return self;
            };

            self._invisible = function() {
                if (isVisible()) {
                    isVisible(false);
                }
                return self;
            };

            self = $.extend(self, self.params);
            return self;
        }

        ResourceBase.prototype.enable = function() {
            this._enable();
            return this;
        };

        ResourceBase.prototype.disable = function() {
            this._disable();
            return this;
        };

        ResourceBase.prototype.validate = function() {
            this._validate();
            return this;
        };

        ResourceBase.prototype.invalidate = function() {
            this._invalidate();
            return this;
        };

        ResourceBase.prototype.show = function() {
            this._visible();
            return this;
        };

        ResourceBase.prototype.hide = function() {
            this._invisible();
            return this;
        };

        ResourceBase.getClassName = function() {
            return className;
        };

        return ResourceBase;
    }());

}(BitWeb || {}));