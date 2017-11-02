(function (BitWeb) {
  "use strict";

  BitWeb.GridMetricsBase = (function () {
    var className = "GridMetricsBase";

    function GridMetricsBase() {
      // singleton
      if (GridMetricsBase.prototype._singletonInstance) {
        return GridMetricsBase.prototype._singletonInstance;
      }
      var self = BitWeb.MetricsBase.apply(this, arguments);
      GridMetricsBase.prototype._singletonInstance = self;

      self.params = $.extend({
        // none
      }, self.params);

      return self;
    }

    var _super = BitWeb.MetricsBase;
    inherits(GridMetricsBase, _super);

    GridMetricsBase.getClassName = function () {
      return className;
    };

    return GridMetricsBase;
  }());

  BitWeb.GridDocumentBase = (function () {
    var className = "GridDocumentBase";

    function GridDocumentBase() {
      var self = BitWeb.DocumentBase.apply(this, arguments);

      var tables = ko.observableArray();

      self.hasTables = ko.pureComputed(function () {
        return 0 < tables().length;
      }, self);

      self.tables = ko.pureComputed(function () {
        return tables();
      }, self);

      self.availableTables = ko.pureComputed(function () {
        var results = [];

        bitlib.array.each(tables, function (i, tbl) {
          if (tbl.isAvailable()) {
            results.push(tbl);
          }
        });

        return results;
      }, self);

      self.validTables = ko.pureComputed(function () {
        var results = [];

        bitlib.array.each(tables, function (i, tbl) {
          if (tbl.isValid()) {
            results.push(tbl);
          }
        });

        return results;
      }, self);

      self.visibleTables = ko.pureComputed(function () {
        var results = [];

        bitlib.array.each(tables, function (i, tbl) {
          if (tbl.isVisible()) {
            results.push(tbl);
          }
        });

        return results;
      }, self);

      self._addTable = function (newTables) {
        newTables = newTables || [];
        newTables = bitlib.common.isArray(newTables) ? newTables : [newTables];

        var gridTables = [];
        for (var i = 0, len = newTables.length; i < len; i++) {
          if (!newTables[i] || !newTables[i].isGridTableViewModel) {
            continue;
          }

          gridTables.push(newTables[i]);
        }

        if (0 < gridTables.length) {
          tables.push.apply(tables, gridTables);
        }

        return self;
      };

      self._clearTables = function () {
        tables.removeAll();
        return self;
      };

      self = $.extend(self, self.params);
      return self;
    }

    var _super = BitWeb.DocumentBase;
    inherits(GridDocumentBase, _super);

    GridDocumentBase.getClassName = function () {
      return className;
    };

    return GridPageBase;
  }());

  BitWeb.GridTableBase = (function () {
    var className = "GridTableBase";

    function GridTableBase() {
      var self = BitWeb.ResourceBase.apply(this, arguments);

      self.isGridTableViewModel = true;

      var rows = ko.observableArray();

      self.hasRows = ko.pureComputed(function () {
        return 0 < rows().length;
      }, self);

      self.rows = ko.pureComputed(function () {
        return rows();
      }, self);

      self.availableRows = ko.pureComputed(function () {
        var results = [];

        bitlib.array.each(rows, function (i, row) {
          if (row.isAvailable()) {
            results.push(row);
          }
        });

        return results;
      }, self);

      self.validRows = ko.pureComputed(function () {
        var results = [];

        bitlib.array.each(rows, function (i, row) {
          if (row.isValid()) {
            results.push(row);
          }
        });

        return results;
      }, self);

      self.visibleRows = ko.pureComputed(function () {
        var results = [];

        bitlib.array.each(rows, function (i, row) {
          if (row.isVisible()) {
            results.push(row);
          }
        });

        return results;
      }, self);

      self._addRow = function (newRows) {
        newRows = newRows || [];
        newRows = bitlib.common.isArray(newRows) ? newRows : [newRows];

        var gridRows = [];
        for (var i = 0, len = newRows.length; i < len; i++) {
          if (!newRows[i] || !newRows[i].isGridRowViewModel) {
            continue;
          }

          gridRows.push(newRows[i]);
        }

        if (0 < gridRows.length) {
          rows.push.apply(rows, gridRows);
        }

        return self;
      };

      self._clearRows = function () {
        rows.removeAll();
        return self;
      };

      var columns = ko.observableArray();

      self.hasColumns = ko.pureComputed(function () {
        return 0 < columns().length;
      }, self);

      self.columns = ko.pureComputed(function () {
        return columns();
      }, self);

      self.availableColumns = ko.pureComputed(function () {
        var results = [];

        bitlib.array.each(columns, function (i, col) {
          if (col.isAvailable()) {
            results.push(col);
          }
        });

        return results;
      }, self);

      self.validColumns = ko.pureComputed(function () {
        var results = [];

        bitlib.array.each(columns, function (i, col) {
          if (col.isValid()) {
            results.push(col);
          }
        });

        return results;
      }, self);

      self.visibleColumns = ko.pureComputed(function () {
        var results = [];

        bitlib.array.each(columns, function (i, col) {
          if (col.isVisible()) {
            results.push(col);
          }
        });

        return results;
      }, self);

      self._addColumn = function (newCols) {
        newCols = newCols || [];
        newCols = bitlib.common.isArray(newCols) ? newCols : [newCols];

        var gridCols = [];
        for (var i = 0, len = newCols.length; i < len; i++) {
          if (!newCols[i] || !newCols[i].isGridColumnViewModel) {
            continue;
          }

          gridCols.push(newCols[i]);
        }

        if (0 < gridCols.length) {
          columns.push.apply(columns, gridCols);
        }

        return self;
      };

      self._clearColumns = function () {
        columns.removeAll();
        return self;
      };

      self.isValid = ko.pureComputed(function () {
        return self.hasRows() && self.hasColumns();
      }, self);

      self._validate = function () {
        return self;
      };

      self._invalidate = function () {
        return self;
      };

      var mapper = new BitWeb.GridCellMapperBase();

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

    var _super = BitWeb.ResourceBase;
    inherits(GridTableBase, _super);

    GridTableBase.prototype.convoluteRows = function (col) {
      if (!col || !col.isGridColumnViewModel) {
        return [];
      }

      var cells = [];
      bitlib.array.each(self.rows, function (i, row) {
        cells.push(self._getCell(row, col));
      });

      return cells;
    };

    GridTableBase.prototype.convoluteColumns = function (row) {
      if (!row || !row.isGridRowViewModel) {
        return [];
      }

      var cells = [];
      bitlib.array.each(self.columns, function (i, col) {
        cells.push(self._getCell(row, col));
      });

      return cells;
    };

    GridTableBase.getClassName = function () {
      return className;
    };

    return GridTableBase;
  }());

  BitWeb.GridRowBase = (function () {
    var className = "GridRowBase";

    function GridRowBase(id, params) {
      var self = BitWeb.ResourceBase.apply(this, [params]);

      self.id = id || "";

      self.isGridRowViewModel = true;

      self.type = className;

      self = $.extend(self, self.params);
      return self;
    }

    var _super = BitWeb.ResourceBase;
    inherits(GridRowBase, _super);

    GridRowBase.prototype.template = function (prefix, suffix) {
      return (prefix || "") + this.type + (suffix || "") + "Template";
    };

    GridRowBase.getClassName = function () {
      return className;
    };

    return GridRowBase;
  }());

  BitWeb.GridColumnBase = (function () {
    var className = "GridColumnBase";

    function GridColumnBase(id, params) {
      var self = BitWeb.ResourceBase.apply(this, [params]);

      self.id = id || "";

      self.isGridColumnViewModel = true;

      self.type = className;

      self = $.extend(self, self.params);
      return self;
    }

    var _super = BitWeb.ResourceBase;
    inherits(GridColumnBase, _super);

    GridColumnBase.prototype.template = function (prefix, suffix) {
      return (prefix || "") + this.type + (suffix || "") + "Template";
    };

    GridColumnBase.getClassName = function () {
      return className;
    };

    return GridColumnBase;
  }());

  BitWeb.GridCellMapperBase = (function () {
    var className = "GridCellMapperBase";

    function GridCellMapperBase() {
      var self = this;

      var cells = {};

      self._getAll = function () {
        return cells;
      };

      self._get = function (rowId, colId) {
        if (!rowId || !colId) {
          return undefined;
        }
        return cells[rowId + "-" + colId];
      };

      self._add = function (newCells) {
        newCells = newCells || [];
        newCells = bitlib.common.isArray(newCells) ? newCells : [newCells];

        for (var i = 0, len = newCells.length; i < len; i++) {
          var rowId = newCells[i].row.id,
            colId = newCells[i].column.id;

          if (!rowId || !colId) {
            continue;
          }

          cells[rowId + "-" + colId] = newCells[i];
        }

        return self;
      };

      self._clear = function () {
        cells = {};
        return self;
      };

      return self;
    }

    GridCellMapperBase.prototype.getCell = function (row, col) {
      var self = this;

      if (!row || !col) {
        return undefined;
      }

      return self._get(row.id, col.id);
    };

    GridCellMapperBase.prototype.getRowCells = function (row) {
      var self = this;

      if (!row || !row.id) {
        return [];
      }

      var results = [],
        cells = self._getAll();

      for (var key in cells) {
        if (bitlib.string.contains(key, (row.id + "-"))) {
          results.push(cells[key]);
        }
      }

      return results;
    };

    GridCellMapperBase.prototype.getColumnCells = function (col) {
      var self = this;

      if (!col || !col.id) {
        return [];
      }

      var results = [],
        cells = self._getAll();

      for (var key in cells) {
        if (bitlib.string.contains(key, ("-" + col.id))) {
          results.push(cells[key]);
        }
      }

      return results;
    };

    GridCellMapperBase.prototype.createCell = function (row, col) {
      var self = this;

      if (!row || !col) {
        return self;
      }

      self._add(new BitWeb.GridCellBase({
        row: row,
        column: col
      }));

      return self;
    };

    GridCellMapperBase.getClassName = function () {
      return className;
    };

    return GridCellMapperBase;
  }());

  BitWeb.GridCellBase = (function () {
    var className = "GridCellBase";

    function GridCellBase() {
      var self = BitWeb.ResourceBase.apply(this, arguments);

      self.type = className;

      if (!self.row) {
        throw "ArgumentException. GridCell クラス生成には GridRow が必要です.";
      }
      if (!self.column) {
        throw "ArgumentException. GridCell クラス生成には GridColumn が必要です.";
      }

      self.isAvailable = ko.pureComputed(function () {
        return self.row.isAvailable() && self.column.isAvailable();
      }, self);

      self._enable = function () {
        return self;
      };

      self._disable = function () {
        return self;
      };

      self.isValid = ko.pureComputed(function () {
        return self.row.isValid() && self.column.isValid();
      }, self);

      self._validate = function () {
        return self;
      };

      self._invalidate = function () {
        return self;
      };

      self.isVisible = ko.pureComputed(function () {
        return self.row.isVisible() && self.column.isVisible();
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

    var _super = BitWeb.ResourceBase;
    inherits(GridCellBase, _super);

    GridCellBase.prototype.template = function (prefix, suffix) {
      return (prefix || "") + this.type + (suffix || "") + "Template";
    };

    GridCellBase.getClassName = function () {
      return className;
    };

    return GridCellBase;
  }());

}(BitWeb || {}));