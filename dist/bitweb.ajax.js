(function (BitWeb) {
    "use strict";

    BitWeb.RequestDispatcher = (function () {
        var className = "RequestDispatcher";

        var url = "/webservice";

        function RequestDispatcher() {
            if (!(this instanceof RequestDispatcher)) {
                return new RequestDispatcher();
            }

            var self = this;

            // serviceProxy... 送信する要求メッセージと各種ハンドラ
            var serviceProxy = {};

            self._getProxy = function () {
                return bitlib.common.copy(serviceProxy);
            };

            self._setProxy = function (newService, message) {
                if (!newService || !message) {
                    return self;
                }

                serviceProxy = {
                    service: newService,
                    message: message
                };

                return self;
            };

            self._clearProxy = function () {
                serviceProxy = {};
                return self;
            };

            return self;
        }

        RequestDispatcher.prototype.set = function (service, message) {
            this._setProxy(service, message);
            return this;
        };

        RequestDispatcher.prototype.clear = function () {
            this._clearProxy();
            return this;
        };

        RequestDispatcher.prototype.sendOnline = function (options, disconnectHandler) {
            var self = this,
                defer = $.Deferred();

            var proxy = self._getProxy();
            if (bitlib.common.isNullOrUndefined(proxy.service)) {
                return defer.resolve().promise();
            }

            options = $.extend({
                cacheResult: false
            }, (options || {}));

            disconnectHandler = disconnectHandler || function () {
                bitlib.logger.warn("ネットワークアクセスに失敗しました. 接続をご確認ください.");
                return defer.resolve().promise();
            };

            var promise = null;

            if (!bitlib.browser.isOnline()) {
                promise = disconnectHandler();

                if (promise) {
                    promise
                        .done(function () {
                            defer.resolve();
                        })
                        .fail(function () {
                            defer.reject();
                        });
                } else {
                    defer.resolve();
                }

                return defer.promise();
            }

            promise = bitlib.ajax.send(url, {
                request: proxy.message
            });

            if (!promise) {
                return defer.reject().promise();
            }

            promise
                .done(function (data) {
                    var replyHandler = proxy.service.publishReplyHandler(proxy.message);
                    replyHandler(data);

                    if (options.cacheResult) {
                        var cacheHandler = proxy.service.publishCacheHandler(proxy.message);
                        cacheHandler(data);
                    }

                    defer.resolve();
                })
                .fail(function (XMLHttpRequest, textStatus, errorThrown) {
                    var errorHandler = proxy.service.publishErrorHandler(proxy.message);
                    errorHandler(XMLHttpRequest, textStatus, errorThrown);

                    defer.reject();
                });

            return defer.promise();
        };

        // alias
        RequestDispatcher.prototype.send = RequestDispatcher.prototype.sendOnline;

        RequestDispatcher.prototype.sendOffline = function (options) {
            var self = this,
                defer = $.Deferred();

            var proxy = self._getProxy();
            if (bitlib.common.isNullOrUndefined(proxy.service)) {
                return defer.resolve().promise();
            }

            options = $.extend({
                // none
            }, (options || {}));

            var offlineRequestHandler = proxy.service.publishOfflineRequestHandler();
            var response = offlineRequestHandler(proxy.message);

            var replyHandler = proxy.service.publishReplyHandler(proxy.message);
            replyHandler({
                response: response,
                request: proxy.message
            });

            return defer.resolve().promise();
        };

        RequestDispatcher.getClassName = function () {
            return className;
        };

        RequestDispatcher.setUrl = function (newUrl) {
            if (!newUrl && !bitlib.common.isString(newUrl)) {
                return false;
            }

            url = newUrl;

            return true;
        };

        return RequestDispatcher;
    }());

    BitWeb.RequestMessenger = (function () {
        var className = "RequestMessenger";

        var READY = "READY",
            SENDING = "SENDING",
            DONE = "DONE",
            TIMEOUT = "TIMEOUT";

        function RequestMessenger() {
            if (!(this instanceof RequestMessenger)) {
                return new RequestMessenger();
            }

            var self = this;

            var status = ko.observable(READY);

            self.isReady = ko.pureComputed(function () {
                return status() === READY;
            }, self);

            self.isBusy = ko.pureComputed(function () {
                return status() === SENDING;
            }, self);

            self.isCompleted = ko.pureComputed(function () {
                return status() === DONE;
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

            var dispatcherProxies = [];

            self._getAllDispatcherProxies = function () {
                return bitlib.common.copy(dispatcherProxies);
            };

            self._addDispatcherProxy = function (newDispatcher, options, disconnectHandler) {
                if (!newDispatcher) {
                    return self;
                }

                options = $.extend({
                    offline: false,
                    cacheResult: false
                }, (options || {}));

                dispatcherProxies.push({
                    dispatcher: newDispatcher,
                    options: options,
                    disconnectHandler: disconnectHandler
                });

                return self;
            };

            self._clearDisptcherProxies = function () {
                dispatcherProxies = [];
                return self;
            };

            return self;
        }

        RequestMessenger.prototype.hasDispatcher = function () {
            var proxies = this._getAllDispatcherProxies();
            return 0 < proxies.length;
        };

        RequestMessenger.prototype.add = function (newDispatcher, options, disconnectHandler) {
            this._addDispatcherProxy(newDispatcher, options, disconnectHandler);
            return this;
        };

        RequestMessenger.prototype.addOnline = function (newDispatcher, options, disconnectHandler) {
            options = $.extend((options || {}), {
                offline: false
            });

            this._addDispatcherProxy(newDispatcher, options, disconnectHandler);

            return this;
        };

        RequestMessenger.prototype.addOffline = function (newDispatcher, options) {
            options = $.extend((options || {}), {
                offline: true
            });

            this._addDispatcherProxy(newDispatcher, options, undefined);

            return this;
        };

        RequestMessenger.prototype.clear = function () {
            this._clearDisptcherProxies();
            return this;
        };

        RequestMessenger.prototype.complete = function () {
            this._setStatus(DONE);
            return this;
        };

        RequestMessenger.prototype.send = function (options) {
            var self = this,
                defer = $.Deferred();

            if (self.isBusy()) {
                // 再入禁止
                return defer.resolve().promise();
            }

            options = $.extend({
                // none
            }, (options || {}));

            self._setStatus(SENDING);

            var proxies = self._getAllDispatcherProxies();
            if (proxies.length === 0) {
                return defer.resolve().promise();
            }

            var promises = [];
            for (var i = 0, len = proxies.length; i < len; i++) {
                if (!bitlib.common.toBoolean(proxies[i].options.offline)) {
                    promises.push(proxies[i].dispatcher.sendOnline(proxies[i].options, proxies[i].disconnectHandler));
                } else {
                    promises.push(proxies[i].dispatcher.sendOffline(proxies[i].options));
                }
            }

            $.when.apply($, promises)
                .done(function () {
                    defer.resolve();
                })
                .fail(function () {
                    defer.reject();
                });

            return defer.promise();
        };

        RequestMessenger.getClassName = function () {
            return className;
        };

        return RequestMessenger;
    }());

    BitWeb.ServiceBase = (function () {
        var className = "ServiceBase";

        function ServiceBase(serviceName) {
            var self = this;

            self.serviceName = serviceName || "";

            return self;
        }

        ServiceBase.prototype.createMessage = function (action, params) {
            action = action || "";
            params = params || {};

            return {
                service_name: this.serviceName,
                keys: {
                    action: action,
                    params: params
                }
            };
        };

        ServiceBase.prototype.publishReplyHandler = function (request) {
            var self = this;

            return function (reply) {
                return self.replyHandler(reply.request, reply.response);
            };
        };

        ServiceBase.prototype.replyHandler = function (request, response) {
            var message = "[WARN] " + this.serviceName + "は" +
                "応答メッセージの受信処理 replyHandler を実装しなければなりません。";

            bitlib.logger.warn(message);
        };

        ServiceBase.prototype.publishCacheHandler = function (request) {
            var self = this;

            return function (reply) {
                return self.cacheHandler(reply.request, reply.response);
            }
        };

        ServiceBase.prototype.cacheHandler = function (request, response) {
            // none
        };

        ServiceBase.prototype.publishErrorHandler = function (request) {
            var self = this;

            return function (XMLHttpRequest, textStatus, errorThrown) {
                return self.errorHandler(XMLHttpRequest, textStatus, errorThrown);
            };
        };

        ServiceBase.prototype.errorHandler = function (XMLHttpRequest, textStatus, errorThrown) {
            bitlib.logger.error("[UNHENDLED ERROR] " + textStatus + errorThrown);
        };

        ServiceBase.prototype.publishOfflineRequestHandler = function () {
            var self = this;

            return function (request) {
                // 要求メッセージの keys/type の値からオフライン時の処理名を生成.
                //     例： "get" -> "getOffline"
                // ただし "load-by-date" など、ハイフンを含むとメソッド名として不適格.
                // 正規表現で loadByDate のようにハイフンを消して次の文字を大文字化する.
                // サービス具象クラスでは、この呼び出し規約に沿ってメソッド名を付ける.

                var serviceName = request.service_name,
                    type = request.keys.type;

                var handlerName = type.replace(/-+([^-])/g, function (matches, pattern) {
                    return pattern.toUpperCase();
                });

                var result = {},
                    offlineHandler = self[handlerName + "Offline"];

                if (bitlib.common.isFunction(offineHandler)) {
                    result = offlineHandler(request);
                } else {
                    bitlib.common.info(serviceName + " does not implement for " + type + " type request.");
                }

                // 応答を正常終了として返す
                return {
                    service_name: serviceName,
                    result_code: "200",
                    result: result
                };
            };
        };

        ServiceBase.getClassName = function () {
            return className;
        };

        ServiceBase.getServiceName = function () {
            var message = "[ERROR] " + className + "は" +
                "サービス名を取得するための getServiceName を実装しなければなりません。";

            bitlib.logger.error(message);

            return "";
        };

        return ServiceBase;
    }());

}(BitWeb || {}));