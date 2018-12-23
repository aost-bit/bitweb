(function (BitWeb) {
  "use strict";

  BitWeb.ListMetricsBase = (function () {
    var className = "ListMetricsBase";

    function ListMetricsBase() {
      // singleton
      if (ListMetricsBase.prototype._singletonInstance) {
        return ListMetricsBase.prototype._singletonInstance;
      }
      var self = BitWeb.MetricsBase.apply(this, arguments);
      ListMetricsBase.prototype._singletonInstance = self;

      self.params = $.extend(true, {
        totalElementsPerPage: 100,
        pageRanges: 2
      }, self.params);

      return self;
    }

    var _super = BitWeb.MetricsBase;
    inherits(ListMetricsBase, _super);

    ListMetricsBase.getClassName = function () {
      return className;
    };

    return ListMetricsBase;
  }());

  BitWeb.ListDocumentBase = (function () {
    var className = "ListDocumentBase";

    var metrics;

    function ListDocumentBase() {
      var self = BitWeb.DocumentBase.apply(this, arguments);

      metrics = new BitWeb.ListMetricsBase();

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
          if (!bitlib.common.isObject(newElems[i]) || !newElems[i].isListElementViewModel) {
            continue;
          }

          newElems[i].id = newElems[i].id.toString();
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
        var len = self.elements().length;
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

        bitlib.array.each(self.elements, function (i, elem) {
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
        bitlib.array.each(self.elements, function (i, elem) {
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
        bitlib.array.each(self.elements, function (i, elem) {
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

      var totalElementsPerPage = ko.observable(metrics.params.totalElementsPerPage);

      self.totalElementsPerPage = ko.pureComputed(function () {
        return totalElementsPerPage();
      }, self);

      self._setTotalElementsPerPage = function (num) {
        num = bitlib.common.toInteger(num);

        if (bitlib.common.isNumber(num) && !isNaN(num)) {
          totalElementsPerPage(num);
        }

        return self;
      };

      var selectedPageIndex = ko.observable(0);

      self.selectedPageIndex = ko.pureComputed(function () {
        return selectedPageIndex();
      }, self);

      self.firstElementIndexOnPage = ko.pureComputed(function () {
        return self.totalElementsPerPage() * self.selectedPageIndex();
      }, self);

      self.maxPageIndex = ko.pureComputed(function () {
        var length = totalElementsPerPage();

        if (!length || length < 1) {
          return 0;
        }

        var maxLength = self.visibleElements().length;
        if (maxLength === 0) {
          return 0;
        }

        return Math.ceil(maxLength / length) - 1;
      }, self);

      self._setSelectedPageIndex = function (newIndex) {
        newIndex = bitlib.common.toInteger(newIndex || 0);

        if (isNaN(newIndex) || newIndex < 0) {
          newIndex = 0;
        }

        var maxIndex = self.maxPageIndex();
        if (maxIndex < newIndex) {
          newIndex = maxIndex;
        }

        selectedPageIndex(newIndex);

        return self;
      };

      self.existsPrevPage = ko.pureComputed(function () {
        return 0 < selectedPageIndex();
      }, self);

      self.existsNextPage = ko.pureComputed(function () {
        var maxIndex = self.maxPageIndex();

        if (maxIndex === 0) {
          return false;
        }

        return selectedPageIndex() < maxIndex;
      }, self);

      self.elementsOnSelectedPage = ko.pureComputed(function () {
        var length = self.totalElementsPerPage(),
          elems = self.visibleElements();

        if (!length || length < 1) {
          return elems.slice(0);
        }

        var sIndex = length * self.selectedPageIndex();

        return elems.slice(sIndex, sIndex + length);
      }, self);

      var pageRanges = ko.observable(metrics.params.pageRanges);

      self.pageRanges = ko.pureComputed(function () {
        return pageRanges();
      }, self);

      self.backwardPageIndex = ko.pureComputed(function () {
        var movableIndex = self.pageRanges() + 1,
          selectedIndex = self.selectedPageIndex();

        if (selectedIndex < movableIndex) {
          return -1;
        }

        return selectedIndex - movableIndex;
      }, self);

      self.forwardPageIndex = ko.pureComputed(function () {
        var movableIndex = self.pageRanges() + 1,
          selectedIndex = self.selectedPageIndex();

        var maxIndex = self.maxPageIndex();
        if ((maxIndex - movableIndex) < selectedIndex) {
          return maxIndex + 1;
        }

        return selectedIndex + movableIndex;
      }, self);

      self._swapPositions = function (prevId, nextId) {
        if (!prevId || !nextId || prevId === nextId) {
          return self;
        }

        var prevElem, nextElem;
        bitlib.array.each(self.elements, function (i, elem) {
          if (elem.id === prevId) {
            prevElem = elem;
          }
          if (elem.id === nextId) {
            nextElem = elem;
          }

          return (!prevElem || !nextElem);
        });

        var newElems = [];
        bitlib.array.each(self.elements, function (i, elem) {
          if (elem.id === prevId) {
            newElems.push(nextElem);
          } else if (elem.id === nextId) {
            newElems.push(prevElem);
          } else {
            newElems.push(elem);
          }
        });

        var i = 0,
          len = 0;

        // 更新後の選択位置を取得する.
        var newIndex = -1,
          focusedElem = self.selectedElement();

        if (focusedElem) {
          for (i = 0, len = newElems.length; i < len; i++) {
            if (newElems[i].id === focusedElem.id) {
              newIndex = i + 1;
              break;
            }
          }
        }

        // 更新後のページ選択位置を取得する.
        var newPageIndex = -1,
          focusedPageIndex = self.selectedPageIndex();

        if (-1 < focusedPageIndex) {
          var elemLength = self.totalElementsPerPage();

          for (i = 0, len = self.maxPageIndex() + 1; i < len; i++) {
            if ((i * elemLength) < newIndex && newIndex <= ((i + 1) * elemLength)) {
              newPageIndex = i;
              break;
            }
          }
        }

        self
          ._clearElements()
          ._addElement(newElems)
          ._setSelectedPageIndex(newPageIndex)
          ._setSelectedElementId(focusedElem.id);

        return self;
      };

      self = $.extend(self, self.params);

      self.elements.subscribe(function () {
        self._setSelectedElementId("");
      });

      self.selectedElement.subscribe(function (selectedElem) {
        bitlib.array.each(self.elements, function (i, elem) {
          elem.blur();
        });

        if (selectedElem) {
          selectedElem.focus();
        }
      });

      self.maxPageIndex.subscribe(function (newVal) {
        if (newVal < self.selectedPageIndex()) {
          self._setSelectedPageIndex(0);
        }
      });

      return self;
    }

    var _super = BitWeb.DocumentBase;
    inherits(ListDocumentBase, _super);

    ListDocumentBase.prototype.addElement = function (elem) {
      this._addElement(elem);
      return this;
    };

    ListDocumentBase.prototype.clearElements = function () {
      this._clearElements();
      return this;
    };

    ListDocumentBase.prototype.toPrevElement = function () {
      var self = this;

      if (!self.existsPrevElement()) {
        return self;
      }

      var elems = self.visibleElements(),
        prevIndex = self.selectedElementIndex() - 1;

      if (elems[prevIndex]) {
        self._setSelectedElementId(elems[prevIndex].id);
      }

      return self;
    };

    ListDocumentBase.prototype.toNextElement = function () {
      var self = this;

      if (!self.existsNextElement()) {
        return self;
      }

      var elems = self.visibleElements(),
        nextIndex = self.selectedElementIndex() + 1;

      if (elems[nextIndex]) {
        self._setSelectedElementId(elems[nextIndex].id);
      }

      return self;
    };

    ListDocumentBase.prototype.toFirstElement = function () {
      var self = this;

      if (!self.existsPrevElement()) {
        return self;
      }

      var elems = self.visibleElements();
      if (elems[0]) {
        self._setSelectedElementId(elems[0].id);
      }

      return self;
    };

    ListDocumentBase.prototype.toLastElement = function () {
      var self = this;

      if (!self.existsNextElement()) {
        return self;
      }

      var elems = self.visibleElements();
      var lastIndex = elems.length - 1;

      if (elems[lastIndex]) {
        self._setSelectedElementId(elems[lastIndex].id);
      }

      return self;
    };

    ListDocumentBase.prototype.toPrevPage = function () {
      var self = this;

      if (!self.existsPrevPage()) {
        return self;
      }

      var newIndex = self.selectedPageIndex() - 1;
      if (newIndex < 0) {
        return self;
      }

      self._setSelectedPageIndex(newIndex);

      return self;
    };

    ListDocumentBase.prototype.toNextPage = function () {
      var self = this;

      if (!self.existsNextPage()) {
        return self;
      }

      var newIndex = self.selectedPageIndex() + 1;
      if (self.maxPageIndex() < newIndex) {
        return self;
      }

      self._setSelectedPageIndex(newIndex);

      return self;
    };

    ListDocumentBase.prototype.toFirstPage = function () {
      var self = this;

      if (!self.existsPrevPage()) {
        return self;
      }

      self._setSelectedElementId(0);

      return self;
    };

    ListDocumentBase.prototype.toLastPage = function () {
      var self = this;

      if (!self.existsNextPage()) {
        return self;
      }

      self._setSelectedElementId(self.maxPageIndex());

      return self;
    };

    ListDocumentBase.prototype.toPageAt = function (index) {
      var self = this;

      index = bitlib.common.toInteger(index);

      if (isNaN(index) || index < 0) {
        return self;
      }

      if (-1 < index && index < (self.maxPageIndex() + 1)) {
        self._setSelectedPageIndex(index);
      }

      return self;
    };

    ListDocumentBase.prototype.isMovablePageIndex = function (index) {
      var self = this;

      index = bitlib.common.toInteger(index);

      if (isNaN(index) || index < 0) {
        return false;
      }

      var selectedIndex = self.maxPageIndex(),
        maxIndex = self.maxPageIndex();

      if (index === 0 || index === selectedIndex || index === maxIndex) {
        return true;
      }

      var pageRanges = self.pageRanges(),
        rangeIndex = pageRanges + 1;

      if (selectedIndex < rangeIndex) {
        return index < (pageRanges * 2);
      }
      if ((maxIndex - rangeIndex) < selectedIndex) {
        return (maxIndex - (pageRanges * 2)) < index;
      }

      return (selectedIndex - rangeIndex) < index && index < (selectedIndex - rangeIndex);
    };

    ListDocumentBase.prototype.swapPrevElement = function () {
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

    ListDocumentBase.prototype.swapNextElement = function () {
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

    ListDocumentBase.getClassName = function () {
      return className;
    };

    return ListDocumentBase;
  }());

  bitlib.ko.addBindingHandler("bindScrollableY", {
    init: function (element, valueAccessor, allBindingsAccessor, viewModel, bindingContext) {
      var $container = $(element),
        $scrollable = $container.children(".bit-ui-scrollable-y").eq(0);

      var spanTotal = 0,
        colSpans = [];

      var tick = null,
        scrollableWidth = 0,
        headerHeight = 0;

      var loopAdjustColumns = function () {
        var width = $scrollable.get(0).clientWidth;

        if (width !== scrollableWidth) {
          $scrollable
            .find("table > thead > tr:first-child")
            .each(function (i) {
              $(this)
                .children("th")
                .each(function (j) {
                  var span = colSpans[j] || 1,
                    colWidth = (width * span / spanTotal);

                  $(this)
                    .css({
                      width: colWidth.toFixed(1) + "px"
                    });
                });

              var $scrollbarCol = $(this).find(".col-scrollbar"),
                createNew = !$scrollbarCol.length;

              if (createNew) {
                $scrollbarCol = $("<th class=\"col-scrollbar\"></th>");

                $(this)
                  .append($scrollbarCol);
              }

              var scrollbarWidth = $scrollable.width() - width;

              $scrollbarCol
                .css({
                  width: (scrollbarWidth + "px")
                });
            });
        }

        var $tbr = $scrollable.find("table > tbody > tr:first-child");
        if ($tbr.length === 1 && width !== scrollableWidth) {
          $tbr
            .children("td")
            .each(function (i) {
              var span = colSpans[i] || 1,
                colWidth = (width * span / spanTotal);

              $(this)
                .css({
                  width: (colWidth.toFixed(1) + "px")
                });
            });
        }

        scrollableWidth = width;

        var height = ($scrollable
            .find("table > thead > tr:first > th:first-child")
            .get(0) || document.createElement("div"))
          .offsetHeight;

        if (height !== headerHeight) {
          $container
            .css({
              paddingTop: (height.toFixed(1) + "px")
            });

          headerHeight = height;
        }

        tick = setTimeout(loopAdjustColumns, 100);
      };

      if ($scrollable) {
        $scrollable
          .find("table > thead > tr:first-child > th")
          .each(function (i) {
            var spanClass = ($(this)
                .attr("class") || "span-1x")
              .match(/span-[0-9d]+x/i);

            if (spanClass) {
              spanClass = spanClass[0]
                .replace(/[^0-9d]/ig, "")
                .replace(/d/ig, ".");

              colSpans[i] = bitlib.common.toNumber(spanClass);
            }

            if (!colSpans[i] || isNaN(colSpans[i]) || colSpans < 0) {
              colSpans[i] = 1;
            }

            spanTotal += colSpans[i];
          });

        loopAdjustColumns();
      }
    }
  });

  BitWeb.ListElementBase = (function () {
    var className = "ListElementBase";

    function ListElementBase(id, params) {
      var self = BitWeb.ResourceBase.apply(this, [params]);

      self.isListElementViewModel = true;

      self.id = bitlib.string.trim(id) || bitlib.common.publishTemporaryUniqueName();

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

    var _super = BitWeb.ResourceBase;
    inherits(ListElementBase, _super);

    ListElementBase.prototype.focus = function () {
      this._focus();
      return this;
    };

    ListElementBase.prototype.blur = function () {
      this._blur();
      return this;
    };

    ListElementBase.getClassName = function () {
      return className;
    };

    return ListElementBase;
  }());

}(BitWeb || {}));