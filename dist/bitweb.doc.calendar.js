(function (BitWeb) {
    "use strict";

    BitWeb.CalendarStyleBase = (function () {
        var className = "CalendarStyleBase";

        function CalendarStyleBase(params) {
            var self = this;

            self.params = $.extend({
                numberOfUnits: 1,
                currentPos: 0, // 複数テーブルでフォーカス日付があるテーブルを何番目に置くか制御する
                id: "" // スタイルを識別するためのID ... できれば
            }, (params || {}));

            self = $.extend(self, self.params);
            return self;
        }

        CalendarStyleBase.prototype.getCalendarRange = function (date) {
            bitlib.logger.error("CalendarStyleBase 派生クラスで CalendarRange を生成してください.");
            return null;
        };

        CalendarStyleBase.prototype.applyCalendarRange = function (date, callback) {
            bitlib.logger.error("CalendarStyleBase 派生クラスで CalendarRange への適用処理を実装してください.");
            return this;
        };

        CalendarStyleBase.prototype.getPrevRange = function (date) {
            bitlib.logger.error("CalendarStyleBase 派生クラスで getPrevRange を実装してください.");
            return null;
        };

        CalendarStyleBase.prototype.getNextRange = function (date) {
            bitlib.logger.error("CalendarStyleBase 派生クラスで getNextRange を実装してください.");
            return null;
        };

        CalendarStyleBase.getClassName = function () {
            return className;
        };

        return CalendarStyleBase;
    }());

    BitWeb.CalendarMonthStyle = (function () {
        var className = "CalendarMonthStyle";

        function CalendarMonthStyle() {
            var self = BitWeb.CalendarStyleBase.apply(this, arguments);

            self.numberOfUnits = 1; // 今は１ヶ月固定

            return self;
        }

        var _super = BitWeb.CalendarStyleBase;
        inherits(CalendarMonthStyle, _super);

        CalendarMonthStyle.prototype.getCalendarRange = function (date) {
            if (!bitlib.common.isValidDate(date)) {
                return null;
            }

            return bitlib.datetime.createDateTimeRangeObj({
                begin: bitlib.datetime.startOfCalendar(date),
                end: bitlib.datetime.endOfCalendar(date)
            });
        };

        CalendarMonthStyle.prototype.applyCalendarRange = function (date, callback) {
            var self = this;

            if (!bitlib.common.isValidDate(date) || !bitlib.common.isFunction(callback)) {
                return self;
            }

            var range = self.getCalendarRange(date);

            var temp = moment(range.getBegin()),
                end = range.getEnd();

            for (; temp.toDate() < end; temp.add("weeks", 1)) {
                callback(bitlib.datetime.createDateTimeRangeObj({
                    begin: bitlib.datetime.startOfWeek(temp.clone().toDate()),
                    end: bitlib.datetime.endOfWeek(temp.clone().toDate())
                }));
            }

            return self;
        };

        CalendarMonthStyle.prototype.getPrevRange = function (date) {
            if (!bitlib.common.isValidDate(date)) {
                return null;
            }
            return moment(date).subtract("month", 1).toDate();
        };

        CalendarMonthStyle.prototype.getNextRange = function (date) {
            if (!bitlib.common.isValidDate(date)) {
                return null;
            }
            return moment(date).add("month", 1).toDate();
        };

        CalendarMonthStyle.getClassName = function () {
            return className;
        };

        return CalendarMonthStyle;
    }());

    BitWeb.CalendarWeekStyle = (function () {
        var className = "CalendarWeekStyle";

        function CalendarWeekStyle() {
            var self = BitWeb.CalendarStyleBase.apply(this, arguments);

            return self;
        }

        var _super = BitWeb.CalendarStyleBase;
        inherits(CalendarWeekStyle, _super);

        CalendarWeekStyle.prototype.getCalendarRange = function (date) {
            var self = this;

            if (!bitlib.common.isValidDate(date)) {
                return null;
            }

            return bitlib.datetime.createDateTimeRangeObj({
                begin: moment(date).subtract("weeks", self.currentPos).startOf("week").toDate(),
                end: moment(date).add("weeks", (self.numberOfUnits - 1 - self.currentPos)).endOf("week").toDate()
            });
        };

        CalendarWeekStyle.prototype.applyCalendarRange = function (date, callback) {
            var self = this;

            if (!bitlib.common.isValidDate(date) || !bitlib.common.isFunction(callback)) {
                return self;
            }

            var range = self.getCalendarRange(date);

            var temp = moment(range.getBegin()),
                end = range.getEnd();

            for (; temp.toDate() < end; temp.add("weeks", 1)) {
                callback(bitlib.datetime.createDateTimeRangeObj({
                    begin: bitlib.datetime.startOfWeek(temp.clone().toDate()),
                    end: bitlib.datetime.endOfWeek(temp.clone().toDate())
                }));
            }

            return self;
        };

        CalendarWeekStyle.prototype.getPrevRange = function (date) {
            var self = this;

            if (!bitlib.common.isValidDate(date)) {
                return null;
            }

            return moment(date).subtract("weeks", self.numberOfUnits || 1).toDate();
        };

        CalendarWeekStyle.prototype.getNextRange = function (date) {
            var self = this;

            if (!bitlib.common.isValidDate(date)) {
                return null;
            }

            return moment(date).add("weeks", self.numberOfUnits || 1).toDate();
        };

        CalendarWeekStyle.getClassName = function () {
            return className;
        };

        return CalendarWeekStyle;
    }());

    BitWeb.CalendarDayStyle = (function () {
        var className = "CalendarDayStyle";

        function CalendarDayStyle() {
            var self = BitWeb.CalendarStyleBase.apply(this, arguments);

            return self;
        }

        var _super = BitWeb.CalendarStyleBase;
        inherits(CalendarDayStyle, _super);

        CalendarDayStyle.prototype.getCalendarRange = function (date) {
            var self = this;

            if (!bitlib.common.isValidDate(date)) {
                return null;
            }

            return bitlib.datetime.createDateTimeRangeObj({
                begin: moment(date).subtract("days", self.currentPos).startOf("day").toDate(),
                end: moment(date).add("days", (self.numberOfUnits - 1 - self.currentPos)).endOf("day").toDate()
            });
        };

        CalendarDayStyle.prototype.applyCalendarRange = function (date, callback) {
            var self = this;

            if (!bitlib.common.isValidDate(date) || !bitlib.common.isFunction(callback)) {
                return self;
            }

            var range = self.getCalendarRange(date);

            var temp = moment(range.getBegin()),
                end = range.getEnd();

            for (; temp.toDate() < end; temp.add("days", 1)) {
                callback(bitlib.datetime.createDateTimeRangeObj({
                    begin: bitlib.datetime.startOfDay(temp.clone().toDate()),
                    end: bitlib.datetime.endOfDay(temp.clone().toDate())
                }));
            }

            return self;
        };

        CalendarDayStyle.prototype.getPrevRange = function (date) {
            var self = this;

            if (!bitlib.common.isValidDate(date)) {
                return null;
            }

            return moment(date).subtract("days", self.numberOfUnits || 1).toDate();
        };

        CalendarDayStyle.prototype.getNextRange = function (date) {
            var self = this;

            if (!bitlib.common.isValidDate(date)) {
                return null;
            }

            return moment(date).add("days", self.numberOfUnits || 1).toDate();
        };

        CalendarDayStyle.getClassName = function () {
            return className;
        };

        return CalendarDayStyle;
    }());

    BitWeb.CalendarStyleContainer = (function () {
        var className = "CalendarStyleContainer";

        function CalendarStyleContainer() {
            if (!(this instanceof CalendarStyleContainer)) {
                return new CalendarStyleContainer();
            }
            // singleton
            if (CalendarStyleContainer.prototype._singletonInstance) {
                return CalendarStyleContainer.prototype._singletonInstance;
            }
            var self = this;
            CalendarStyleContainer.prototype._singletonInstance = self;

            var container = {};

            self._get = function (styleCode) {
                if (styleCode) {
                    if (container[styleCode]) {
                        return bitlib.common.copy(container[styleCode]);
                    }

                    bitlib.logger.warn("CalendarStyleContainer に登録されていない styleCode[" + styleCode + "] を検索しました.");
                }

                return null;
            };

            self._set = function (styleCode, newStyle) {
                if (!styleCode || !newStyle) {
                    return self;
                }

                if (container[styleCode]) {
                    bitlib.logger.info("CalendarStyleContainer に登録されている styleCode[" + styleCode + "] を上書きしました.");
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

        CalendarStyleContainer.prototype.get = function (styleCode) {
            return this._get(styleCode);
        };

        CalendarStyleContainer.prototype.set = function (styleCode, style) {
            this._set(styleCode, style);
            return this;
        };

        CalendarStyleContainer.prototype.clear = function () {
            this._clear();
            return this;
        };

        CalendarStyleContainer.getClassName = function () {
            return className;
        };

        return CalendarStyleContainer;
    }());

    BitWeb.CalendarMetricsBase = (function () {
        var className = "CalendarMetricsBase";

        var dateTimeCorrector = new BitWeb.DateTimeCorrector();

        function CalendarMetricsBase() {
            // singleton
            if (CalendarMetricsBase.prototype._singletonInstance) {
                return CalendarMetricsBase.prototype._singletonInstance;
            }
            var self = BitWeb.GridMetricsBase.apply(this, arguments);
            CalendarMetricsBase.prototype._singletonInstance = self;

            self.params = $.extend(true, {
                calendarLang: "ja",
                initDate: dateTimeCorrector.getNow(),
                calendarStyleCode: "month",
                showEveryday: true,
                calendarTimeRange: [
                    // "09:00-17:00",
                    // "00:00-12:00",
                    // "12:00-24:00",
                    // "00:00-24:00"
                ],
                initTimeRangeIndex: 0,
                calendarStyle: {
                    month: {
                        headerSpan: "06:00",
                        span: "03:00",
                        useCurrentAxis: true
                    },
                    weeks: {
                        headerSpan: "06:00",
                        span: "03:00",
                        useCurrentAxis: true
                    },
                    week: {
                        headerSpan: "06:00",
                        span: "03:00",
                        useCurrentAxis: true
                    },
                    days: {
                        headerSpan: "01:00",
                        span: "00:30",
                        useCurrentAxis: true
                    },
                    day: {
                        headerSpan: "01:00",
                        span: "00:30",
                        useCurrentAxis: true
                    }
                },
                useTimesToolTip: true
            }, self.params);

            // moment.js 言語設定（グローバル設定）
            moment.lang(self.params.calendarLang);

            var showEveryday = ko.observable(self.params.showEveryday);

            self.showEveryday = ko.pureComputed(function () {
                return showEveryday();
            }, self);

            self._showEveryday = function () {
                if (!showEveryday()) {
                    showEveryday(true);
                }
                return self;
            };

            self._hideEveryday = function () {
                if (showEveryday()) {
                    showEveryday(false);
                }
                return self;
            };

            var focusedDate = ko.observable(self.params.initDate);

            self.focusedDate = ko.computed({
                read: function () {
                    return focusedDate();
                },
                write: function (newValue) {
                    var currentDate = moment(newValue);

                    if (!self.showEveryday()) {
                        var day = currentDate.day();

                        if (day === 0) {
                            // 日曜日なら月曜日に移動
                            currentDate.add("days", 1);
                        }
                        if (day === 6) {
                            // 土曜日なら金曜日に移動
                            currentDate.subtract("days", 1);
                        }
                    }

                    if (currentDate.toDate() !== focusedDate()) {
                        focusedDate(currentDate.toDate());
                    }
                },
                owner: self
            });

            var calendarStyleContainer = new BitWeb.CalendarStyleContainer();

            var calendarStyleCode = ko.observable(self.params.calendarStyleCode);

            self.calendarStyleCode = ko.pureComputed(function () {
                return calendarStyleCode();
            }, self);

            self._setCalendarStyleCode = function (styleCode) {
                if (!styleCode || calendarStyleCode() === styleCode) {
                    return self;
                }

                calendarStyleCode(styleCode);

                return self;
            };

            self.calendarStyle = ko.pureComputed(function () {
                return calendarStyleContainer.get(calendarStyleCode());
            }, self);

            self.calendarStyleParams = ko.pureComputed(function () {
                return self.params.calendarStyle[calendarStyleCode()];
            }, self);

            var calendarTimeRange = ko.observable(self.params.calendarTimeRange[self.params.initTimeRangeIndex]);

            self.calendarTimeRange = ko.pureComputed(function () {
                return calendarTimeRange();
            }, self);

            self._setCalendarTimeRange = function (timeRange) {
                if (!timeRange || calendarTimeRange() === timeRange) {
                    return self;
                }

                calendarTimeRange(timeRange);

                return self;
            };

            self.viewportTimeRange = ko.pureComputed(function () {
                var range = calendarTimeRange() || "00:00-24:00";

                var arr = range.split("-");

                var begin = (arr[0] || "00:00"),
                    end = (arr[1] || "24:00");

                return bitlib.datetime.createTimeRangeObj({
                    begin: moment.duration(begin).valueOf(),
                    end: moment.duration(end).valueOf()
                });
            }, self);

            self.timeHeaderDials = ko.pureComputed(function () {
                var params = self.calendarStyleParams(),
                    range = self.viewportTimeRange();

                var begin = range.getBegin(),
                    end = range.getEnd();

                var dials = [],
                    duration = moment.duration(params.headerSpan).valueOf();

                for (var temp = begin; temp < end; temp += duration) {
                    var dial = moment.duration(temp).format("H:mm");
                    dial = (dial === "0") ? "0:00" : dial;

                    dials.push(dial);
                }

                return dials;
            }, self);

            self.timeDials = ko.pureComputed(function () {
                var params = self.calendarStyleParams(),
                    range = self.viewportTimeRange();

                var begin = range.getBegin(),
                    end = range.getEnd();

                var dials = [],
                    duration = moment.duration(params.span).valueOf();

                for (var temp = begin; temp < end; temp += duration) {
                    var dial = moment.duration(temp).format("H:mm");
                    dial = (dial === "0") ? "0:00" : dial;

                    var nextDial = moment.duration(temp + duration).format("H:mm");
                    nextDial = (nextDial === "0") ? "0:00" : nextDial;

                    dials.push(dial + "～" + nextDial);
                }

                return dials;
            }, self);

            self.isValidCurrentAxis = ko.pureComputed(function () {
                return bitlib.common.toBoolean(self.calendarStyleParams().useCurrentAxis);
            }, self);

            return self;
        }

        var _super = BitWeb.GridMetricsBase;
        inherits(CalendarMetricsBase, _super);

        CalendarMetricsBase.prototype.getPrevRange = function (date) {
            var self = this;

            if (!bitlib.common.isValidDate(date)) {
                date = dateTimeCorrector.getNow();
            }

            return self.calendarStyle().getPrevRange(date);
        };

        CalendarMetricsBase.prototype.getNextRange = function (date) {
            var self = this;

            if (!bitlib.common.isValidDate(date)) {
                date = dateTimeCorrector.getNow();
            }

            return self.calendarStyle().getNextRange(date);
        };

        CalendarMetricsBase.prototype.isToday = function (date) {
            if (!bitlib.common.isValidDate(date)) {
                return false;
            }

            var now = dateTimeCorrector.getNow();

            return moment(now).format("YYYYMMDD") === moment(date).format("YYYYMMDD");
        };

        CalendarMetricsBase.prototype.hasCurrentAxis = function (date) {
            var self = this;

            if (!self.isToday(date)) {
                return false;
            }

            var range = self.viewportTimeRange(),
                now = dateTimeCorrector.getNow();

            var sDay = bitlib.datetime.startOfDay(now);

            var bRange = moment(sDay).add(range.getBegin(), "ms").toDate(),
                eRange = moment(sDay).add(range.getEnd(), "ms").toDate();

            return !(now < bRange || eRange < now);
        };

        CalendarMetricsBase.getClassName = function () {
            return className;
        };

        return CalendarMetricsBase;
    }());

    BitWeb.CalendarDocumentBase = (function () {
        var className = "CalendarDocumentBase";

        var metrics;

        function CalendarDocumentBase() {
            var self = BitWeb.GridDocumentBase.apply(this, arguments);

            metrics = new BitWeb.CalendarMetricsBase();

            self.type = className;

            self = $.extend(self, self.params);
            return self;
        }

        var _super = BitWeb.GridDocumentBase;
        inherits(CalendarDocumentBase, _super);

        CalendarDocumentBase.prototype.publishCalendar = function () {
            var self = this;

            self.clearTables();

            var tables = [];

            metrics
                .calendarStyle()
                .applyCalendarRange(metrics.focusedDate(), function (range) {
                    tables.push(new BitWeb.CalendarTable(range));
                });

            for (var i = 0, len = tables.length; i < len; i++) {
                tables[i].applyRange();
            }

            self.addTable(tables);

            return self;
        };

        CalendarDocumentBase.getClassName = function () {
            return className;
        };

        return CalendarDocumentBase;
    }());

    BitWeb.CalendarTable = (function () {
        var className = "CalendarTable";

        function CalendarTable(range, params) {
            var self = BitWeb.GridTableBase.apply(this, [params]);

            self.isCalendarTableViewModel = true;

            self.range = range;

            var mapper = new BitWeb.CalendarCellMapper();

            self._getCell = function (row, col) {
                if (!row || !col) {
                    return undefined;
                }

                var cell = mapper.getCell(row, col);
                if (!cell) {
                    cell = mapper
                        .createCell(row, col)
                        .getCell(row, col);
                }

                return cell;
            };

            self = $.extend(self, self.params);
            return self;
        }

        var _super = BitWeb.GridTableBase;
        inherits(CalendarTable, _super);

        CalendarTable.prototype.applyRange = function () {
            var self = this;

            self.clearColumns();

            if (!self.range) {
                return self;
            }

            var range = self.range.clone();

            var begin = range.getBegin(),
                end = range.getEnd();

            var cols = [];
            for (var temp = moment(begin); temp.toDate() < end; temp.add("days", 1)) {
                cols.push(new BitWeb.CalendarColumn(temp));
            }

            self.addColumn(cols);

            return self;
        };

        CalendarTable.prototype.getVisibleHeaderRows = function () {
            var self = this;

            var rows = [];
            bitlib.array.each(self.visibleRows, function (i, row) {
                if (row.isCalendarHeaderRowViewModel) {
                    rows.push(row);
                }
            });

            return rows;
        };

        CalendarTable.prototype.getVisibleDataRows = function () {
            var self = this;

            var rows = [];
            bitlib.array.each(self.visibleRows, function (i, row) {
                if (!row.isCalendarHeaderRowViewModel) {
                    rows.push(row);
                }
            });

            return rows;
        };

        CalendarTable.getClassName = function () {
            return className;
        };

        return CalendarTable;
    }());

    BitWeb.CalendarRowBase = (function () {
        var className = "CalendarRowBase";

        function CalendarRowBase() {
            var self = BitWeb.GridRowBase.apply(this, arguments);

            self.isCalendarRowViewModel = true;

            self.type = className;

            self = $.extend(self, self.params);
            return self;
        }

        var _super = BitWeb.GridRowBase;
        inherits(CalendarRowBase, _super);

        CalendarRowBase.getClassName = function () {
            return className;
        };

        return CalendarRowBase;
    }());

    BitWeb.CalendarColumn = (function () {
        var className = "CalendarColumn";

        function CalendarColumn(initDate, params) {
            if (!bitlib.common.isValidDate(initDate)) {
                initDate = null;
            }

            initDate = moment(initDate);

            var self = BitWeb.GridColumnBase.apply(this, [initDate.format("YYYYMMDD"), params]);

            self.isCalendarColumnViewModel = true;

            self.type = className;

            self.isValid = ko.pureComputed(function () {
                return true;
            }, self);

            self._validate = function () {
                return self;
            };

            self._invalidate = function () {
                return self;
            };

            self.date = initDate.clone().toDate();

            self = $.extend(self, self.params);
            return self;
        }

        var _super = BitWeb.GridColumnBase;
        inherits(CalendarColumn, _super);

        CalendarColumn.getClassName = function () {
            return className;
        };

        return CalendarColumn;
    }());

    BitWeb.CalendarCellMapper = (function () {
        var className = "CalendarCellMapper";

        function CalendarCellMapper() {
            var self = BitWeb.GridCellMapperBase.apply(this, arguments);

            return self;
        }

        var _super = BitWeb.GridCellMapperBase;
        inherits(CalendarCellMapper, _super);

        CalendarCellMapper.prototype.createCell = function (row, col) {
            var self = this;

            if (!row || !col) {
                return self;
            }

            if (row.isCalendarTimeHeaderRowViewModel) {
                self._add(new BitWeb.CalendarTimeHeaderCell({
                    row: row,
                    column: col
                }));

                return self;
            }

            if (row.isCalendarHeaderRowViewModel) {
                self._add(new BitWeb.CalendarHeaderCell({
                    row: row,
                    column: col
                }));

                return self;
            }

            self._add(new BitWeb.CalendarCellBase({
                row: row,
                column: col
            }));

            return self;
        };

        CalendarCellMapper.getClassName = function () {
            return className;
        };

        return CalendarCellMapper;
    }());

    BitWeb.CalendarCellBase = (function () {
        var className = "CalendarCellBase";

        function CalendarCellBase() {
            var self = BitWeb.GridCellBase.apply(this, arguments);

            self.type = className;

            self = $.extend(self, self.params);
            return self;
        }

        var _super = BitWeb.GridCellBase;
        inherits(CalendarCellBase, _super);

        CalendarCellBase.getClassName = function () {
            return className;
        };

        return CalendarCellBase;
    }());

    BitWeb.CalendarHeaderRowBase = (function () {
        var className = "CalendarHeaderRowBase";

        function CalendarHeaderRowBase() {
            var self = BitWeb.CalendarRowBase.apply(this, arguments);

            self.isCalendarHeaderRowViewModel = true;

            self.type = className;

            var dataRows = ko.observableArray();

            self._addDataRow = function (newRows) {
                newRows = newRows || [];
                newRows = bitlib.common.isArray(newRows) ? newRows : [newRows];

                var gridRows = [];
                for (var i = 0, len = newRows.length; i < len; i++) {
                    if (!newRows[i] || !newRows[i].isCalendarRowViewModel) {
                        continue;
                    }
                    gridRows.push(newRows[i]);
                }

                if (0 < gridRows.length) {
                    dataRows.push.apply(dataRows, gridRows);
                }

                return self;
            };

            self.isValid = ko.pureComputed(function () {
                var rows = dataRows();

                if (rows.length === 0) {
                    return false;
                }

                return bitlib.array.any(rows, function (i, row) {
                    return row.isValid();
                });
            }, self);

            self._validate = function () {
                return self;
            };

            self._invalidate = function () {
                return self;
            };

            self = $.extend(self, self.params);
            return self;
        }

        var _super = BitWeb.CalendarRowBase;
        inherits(CalendarHeaderRowBase, _super);

        CalendarHeaderRowBase.prototype.bindDataRows = function (rows) {
            this._addDataRow(rows);
            return this;
        };

        CalendarHeaderRowBase.getClassName = function () {
            return className;
        };

        return CalendarHeaderRowBase;
    }());

    BitWeb.CalendarHeaderRow = (function () {
        var className = "CalendarHeaderRow";

        function CalendarHeaderRow() {
            var self = BitWeb.CalendarHeaderRowBase.apply(this, arguments);

            self.type = className;

            self = $.extend(self, self.params);
            return self;
        }

        var _super = BitWeb.CalendarHeaderRowBase;
        inherits(CalendarHeaderRow, _super);

        CalendarHeaderRow.getClassName = function () {
            return className;
        };

        return CalendarHeaderRow;
    }());

    BitWeb.CalendarHeaderCell = (function () {
        var className = "CalendarHeaderCell";

        function CalendarHeaderCell() {
            var self = BitWeb.CalendarCellBase.apply(this, arguments);

            self.type = className;

            self = $.extend(self, self.params);

            if (bitlib.common.isValidDate(self.column.date)) {
                self.caption = moment(self.column.date).format("M/D (dd)");
            }

            return self;
        }

        var _super = BitWeb.CalendarCellBase;
        inherits(CalendarHeaderCell, _super);

        CalendarHeaderCell.getClassName = function () {
            return className;
        };

        return CalendarHeaderCell;
    }());

    bitlib.ko.addBindingHandler("bindCalendarHeaderCell", {
        init: function (element, valueAccessor, allBindingsAccessor, viewModel, bindingContext) {
            var metrics = new BitWeb.CalendarMetricsBase(),
                $element = $(element);

            // 曜日
            if (bitlib.common.isValidDate(viewModel.column.date)) {
                var day = moment(viewModel.column.date).lang("en").format("dddd");
                $element
                    .addClass(day.toLowerCase() + "-column");
            }

            // 本日
            if (bitlib.common.isValidDate(viewModel.column.date)) {
                if (metrics.isToday(viewModel.column.date)) {
                    $element
                        .addClass("today-column");
                }
            }

            // フォーカス日
            if (bitlib.common.isValidDate(viewModel.column.date)) {
                if (moment(metrics.focusedDate()).format("YYYYMMDD") === moment(viewModel.column.date).format("YYYYMMDD")) {
                    $element
                        .addClass("focused-column");
                }
            }
        }
    });

    BitWeb.CalendarTimeHeaderRow = (function () {
        var className = "CalendarTimeHeaderRow";

        function CalendarTimeHeaderRow() {
            var self = BitWeb.CalendarHeaderRowBase.apply(this, arguments);

            self.isCalendarTimeHeaderRowViewModel = true;

            self.type = className;

            self = $.extend(self, self.params);
            return self;
        }

        var _super = BitWeb.CalendarHeaderRowBase;
        inherits(CalendarTimeHeaderRow, _super);

        CalendarTimeHeaderRow.getClassName = function () {
            return className;
        };

        return CalendarTimeHeaderRow;
    }());

    BitWeb.CalendarTimeHeaderCell = (function () {
        var className = "CalendarTimeHeaderCell";

        function CalendarTimeHeaderCell() {
            var self = BitWeb.CalendarCellBase.apply(this, arguments);

            self.type = className;

            self = $.extend(self, self.params);
            return self;
        }

        var _super = BitWeb.CalendarCellBase;
        inherits(CalendarTimeHeaderCell, _super);

        CalendarTimeHeaderCell.getClassName = function () {
            return className;
        };

        return CalendarTimeHeaderCell;
    }());

    bitlib.ko.addBindingHandler("bindTimeHeaderDial", {
        init: function (element, valueAccessor, allBindingsAccessor, viewModel, bindingContext) {
            var metrics = new BitWeb.CalendarMetricsBase();

            var duration = metrics.viewportTimeRange().getDuration(),
                span = moment.duration(metrics.calendarStyleParams().headerSpan).valueOf();

            var width = (span / duration) * 100.0;

            $(element)
                .css({
                    width: (width + "%")
                });
        }
    });

    bitlib.ko.addBindingHandler("bindTimeDial", {
        init: function (element, valueAccessor, allBindingsAccessor, viewModel, bindingContext) {
            var $element = $(element),
                metrics = new BitWeb.CalendarMetricsBase();

            var duration = metrics.viewportTimeRange().getDuration(),
                span = moment.duration(metrics.calendarStyleParams().span).valueOf();

            var width = (span / duration) * 100.0;

            $element
                .css({
                    width: (width + "%")
                });

            // 時刻表示 ToolTip
            if (bitlib.common.toBoolean(metrics.params.useTimesToolTip)) {
                $element
                    .tipTip({
                        content: valueAccessor()
                    });
            }
        }
    });

    bitlib.ko.addBindingHandler("bindCurrentAxis", {
        init: function (element, valueAccessor, allBindingsAccessor, viewModel, bindingContext) {
            var $element = $(element),
                metrics = new BitWeb.CalendarMetricsBase();

            var range = metrics.viewportTimeRange(),
                now = new BitWeb.DateTimeCorrector().getNow();

            var sDay = bitlib.datetime.startOfDay(now);

            var bRange = moment(sDay).add(range.getBegin(), "ms").toDate(),
                eRange = moment(sDay).add(range.getEnd(), "ms").toDate();

            var width = 0;

            if (now < bRange) {
                width = 0;
            } else if (eRange < now) {
                width = 100;
            } else {
                var ratio = ((now - bRange) / range.getDuration()) * 100.0;
                width = Math.ceil(ratio * 10.0) / 10.0; // 少数点以下第二位で切り上げる
            }

            $element
                .css({
                    width: (width + "%")
                });

            if (bitlib.common.toBoolean(metrics.params.useTimesToolTip)) {
                var $timeAxis = $element.closest(".cell-canvas").find(".time-axis td");

                var pIndex = -1,
                    len = $timeAxis.length;

                if (0 < len) {
                    $element
                        .on("mousemove", function (event) {
                            event = event || window.event;

                            var index = bitlib.common.toInteger((len * event.offsetX) / (((100 * $(this).width()) / width) + 1));

                            if (index !== pIndex) {
                                $timeAxis.eq(pIndex).trigger("mouseleave");

                                pIndex = index;
                                $timeAxis.eq(pIndex).trigger("mouseenter");
                            }
                        })
                        .on("mouseleave", function () {
                            $timeAxis.eq(pIndex).trigger("mouseleave");

                            pIndex = -1;
                        });
                }
            }
        }
    });

}(BitWeb || {}));