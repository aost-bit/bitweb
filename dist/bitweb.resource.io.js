(function (BitWeb) {
  "use strict";

  BitWeb.FileResourceBase = (function () {
    var className = "FileResourceBase";

    function FileResourceBase() {
      var self = BitWeb.ResourceBase.apply(this, arguments);

      var exists = ko.observable(false);

      self.exists = ko.pureComputed(function () {
        return exists();
      }, self);

      self._found = function () {
        if (!exists()) {
          exists(true);
        }
        return self;
      };

      var creationDateTime = ko.observable(undefined);

      self.creationDateTime = ko.pureComputed(function () {
        return creationDateTime();
      }, self);

      self._setCreationDateTime = function (newDateTime) {
        if (!bitlib.common.isValidDate(newDateTime)) {
          return self;
        }

        creationDateTime(newDateTime);

        return self;
      };

      var updateDateTime = ko.observable(undefined);

      self.updateDateTime = ko.pureComputed(function () {
        return updateDateTime();
      }, self);

      self._setUpdateDateTime = function (newDateTime) {
        if (!bitlib.common.isValidDate(newDateTime)) {
          return self;
        }

        updateDateTime(newDateTime);

        return self;
      };

      var relativePath = ko.observable("");

      self.relativePath = ko.pureComputed(function () {
        return relativePath();
      }, self);

      self._setRelativePath = function (newPathStr) {
        if (!newPathStr || !bitlib.common.isString(newPathStr)) {
          return self;
        }

        relativePath(newPathStr);

        return self;
      };

      var fullPath = ko.observable("");

      self.fullPath = ko.pureComputed(function () {
        return fullPath();
      }, self);

      self._setFullPath = function (newPathStr) {
        if (!newPathStr || !bitlib.common.isString(newPathStr)) {
          return self;
        }

        fullPath(newPathStr);

        return self;
      };

      var urlString = ko.observable("");

      self.urlString = ko.pureComputed(function () {
        return urlString();
      }, self);

      self._setUrlString = function (newUrlStr) {
        if (!newUrlStr || !bitlib.common.isString(newUrlStr)) {
          return self;
        }

        urlString(newUrlStr);

        return self;
      };

      self = $.extend(self, self.params);
      return self;
    }

    var _super = BitWeb.ResourceBase;
    inherits(FileResourceBase, _super);

    FileResourceBase.prototype.found = function () {
      this._found();
      return this;
    };

    FileResourceBase.prototype.setCreationTime = function (dateTime) {
      this._setCreationTime(dateTime);
      return this;
    };

    FileResourceBase.prototype.setUpdateTime = function (dateTime) {
      this._setUpdateTime(dateTime);
      return this;
    };

    FileResourceBase.prototype.setRelativePath = function (path) {
      this._setRelativePath(path);
      return this;
    };

    FileResourceBase.prototype.setFullPath = function (path) {
      this._setFullPath(path);
      return this;
    };

    FileResourceBase.prototype.setUrl = function (url) {
      this._setUrlString(url);
      return this;
    };

    FileResourceBase.getClassName = function () {
      return className;
    };

    return FileResourceBase;
  }());

  BitWeb.ImageFileResource = (function () {
    var className = "ImageFileResource";

    function ImageFileResource() {
      var self = BitWeb.FileResourceBase.apply(this, arguments);

      self.imageType = "";

      var width = ko.observable(0);

      self.width = ko.pureComputed(function () {
        return width();
      }, self);

      self._setWidth = function (newWidth) {
        newWidth = bitlib.common.toNumber(newWidth || 0);

        if (isNaN(newWidth) || newWidth < 0) {
          return self;
        }

        width(newWidth);

        return self;
      };

      var height = ko.observable(0);

      self.height = ko.pureComputed(function () {
        return height();
      }, self);

      self._setHeight = function (newHeight) {
        newHeight = bitlib.common.toNumber(newHeight || 0);

        if (isNaN(newHeight) || newHeight < 0) {
          return self;
        }

        height(newHeight);

        return self;
      };

      self._openByViewer = function () {
        if ($.imageViewer) {
          $.imageViewer.open(self);
        }
        return self;
      };

      self = $.extend(self, self.params);
      return self;
    };

    var _super = BitWeb.FileResourceBase;
    inherits(ImageFileResource, _super);

    ImageFileResource.prototype.setWidth = function (val) {
      this._setWidth(val);
      return this;
    };

    ImageFileResource.prototype.setHeight = function (val) {
      this._setHeight(val);
      return this;
    };

    ImageFileResource.prototype.setSize = function (width, height) {
      this
        ._setWidth(width)
        ._setHeight(height);

      return this;
    };

    ImageFileResource.prototype.open = function () {
      var self = this;

      if (!self.isAvailable() || !self.isValid()) {
        bitlib.logger.info("このファイルは現在使用できません.");
        return self;
      }

      if (!self.exists()) {
        bitlib.logger.info("このファイルは存在しません.");
        return self;
      }

      self._openByViewer();

      return self;
    };

    ImageFileResource.getClassName = function () {
      return className;
    };

    return ImageFileResource;
  }());

  bitlib.ko.addBindingHandler("bindImageViewer", {
    init: function (element, valueAccessor, allBindingsAccessor, viewModel, bindingContext) {
      // initialize viewer with some optional options
      var options = $.extend({
        // none
      }, viewModel.viewerOptions, (allBindingsAccessor().imageViewerOptions || {}));

      var widget = BitWeb.OverlayWidgetFactory.create("imageViewer", options);

      $(element).imageViewer(options);

      // handle disposal (if KO removes by the template binding)
      ko.utils.domNodeDisposal.addDisposeCallback(element, function () {
        $(element).imageViewer("destroy");
      });
    }
  });

  bitlib.ko.addBindingHandler("bindImageViewerFrame", {
    init: function (element, valueAccessor, allBindingsAccessor, viewModel, bindingContext) {
      var $window = $(window),
        $element = $(element);

      var width = viewModel.width(),
        height = viewModel.height();

      var screenWidth = $window.width();
      var screenHeight = ($window.height() * 0.83);

      if (screenWidth < width || screenHeight < height) {
        var ratio1 = (width / screenWidth),
          ratio2 = (height / screenHeight);

        var ratio = (ratio2 < ratio1) ? ratio1 : ratio2;

        width = width / ratio;
        height = height / ratio;
      }

      $element
        .css({
          width: (width + "px"),
          height: (height + "px")
        });
    }
  });

  BitWeb.ImageFileResourceFactory = (function () {
    var className = "ImageFileResourceFactory";

    var dateTimeCorrector = new BitWeb.DateTimeCorrector();

    function ImageFileResourceFactory() {
      var self = this;

      self.observable = ko.observable(self); // 通知用の observable object

      var imgResource,
        scalingRatio = 100.0;

      self._get = function () {
        return imgResource;
      };

      self._setScalingRatio = function (newRatio) {
        newRatio = bitlib.common.toNumber(newRatio || 0);

        if (isNaN(newRatio) || newRatio < 10) {
          return self;
        }

        if (100 < newRatio) {
          newRatio = 100.0;
        }

        scalingRatio = newRatio;

        return self;
      };

      function createImageResource(imgObj, imgType) {
        imgResource = null;

        if (!imgObj || !imgType) {
          return false;
        }

        var width = imgObj.naturalWidth,
          height = imgObj.naturalHeight;

        width = Math.round(width * scalingRatio / 100.0);
        height = Math.round(height * scalingRatio / 100.0);

        var now = dateTimeCorrector.getNow();

        imgResource = new BitWeb.ImageFileResource({
          imageType: imgType.split("/")[1]
        });

        imgResource
          .setCreationTime(now)
          .setUpdateTime(now)
          .setUrl(imgObj.src)
          .setWidth(width)
          .setHeight(height)
          .validate();

        self.observable.notifySubscribers(self);

        return true;
      }

      function repositionPhotoImage(imgObj, exifInfo) {
        var newCanvas = document.createElement("canvas");
        var newContext = newCanvas.getContext("2d");

        var width = bitlib.image.getWidth(exifInfo),
          height = bitlib.image.getHeight(exifInfo);

        // canvas を初期化して一旦保存する.
        newCanvas.width = width;
        newCanvas.height = height;

        newContext.clearRect(0, 0, width, height);
        newContext.save();

        // 画像の縦横半分の位置へ.
        newContext.translate(width / 2, height / 2);

        // 回転.
        var rot = bitlib.image.getRotate(exifInfo);
        newContext.rotate(rot * Math.PI / 180.0);

        // +-90度回転した場合は、縦横を入れ換える.
        if (rot === 90 || rot === -90) {
          var temp = width;
          width = height;
          height = temp;
        }

        // translate した分戻して原点を 0,0 に.
        newContext.translate(-width / 2, -height / 2);

        // image を貼付けて canvas を元に戻す.
        newContext.drawImage(imgObj, 0, 0, width, height);
        newContext.restore();

        return newCanvas;
      }

      function createPhotoImageResource(canvsObj, imgType) {
        imgResource = null;

        if (!canvsObj || !imgType) {
          return false;
        }

        var width = canvsObj.width,
          height = canvsObj.height;

        var now = dateTimeCorrector.getNow();

        imgResource = new BitWeb.ImageFileResource({
          imageType: imgType.split("/")[1]
        });

        imgResource
          .setCreationTime(now)
          .setUpdateTime(now)
          .setUrl(canvsObj.toDataURL(imgType))
          .setWidth(width)
          .setHeight(height)
          .validate();

        self.observable.notifySubscribers(self);

        return true;
      }

      function loadPhotoImage(imgObj, imgType, exifInfo) {
        var newImage = new Image();

        newImage.onload = function () {
          var newCanvas = document.createElement("canvas");
          var newContext = newCanvas.getContext("2d");

          var width = bitlib.image.getWidth(exifInfo),
            height = bitlib.image.getHeight(exifInfo);

          width = Math.round(width * scalingRatio / 100.0);
          height = Math.round(height * scalingRatio / 100.0);

          newCanvas.width = width;
          newCanvas.height = height;

          newContext.clearRect(0, 0, width, height);

          newContext.drawImage(imgObj, 0, 0, width, height);

          createPhotoImageResource(newCanvas, imgType);
        };

        imgObj.src = repositionPhotoImage(imgObj, exifInfo).toDataURL(imgType);
      }

      self._loadImage = function (imgType, evtTarget) {
        var dataUrl = evtTarget.result,
          exifInfo = bitlib.image.getExif(dataUrl, imgType.split("/")[1]);

        var imageObj = new Image();

        imageObj.onload = function () {
          if (!!exifInfo && bitlib.browser.ua.isiOS) {
            loadPhotoImage(imageObj, imgType, exifInfo);
          } else {
            createImageResource(imageObj, imgType);
          }
        };

        imageObj.src = dataUrl;
      };

      return self;
    }

    ImageFileResourceFactory.prototype.get = function () {
      return this._get();
    };

    ImageFileResourceFactory.prototype.setScalingRatio = function (ratio) {
      this._setScalingRatio(ratio);
      return this;
    };

    ImageFileResourceFactory.prototype.create = function (fileObj) {
      if (!bitlib.browser.isSupportFileAPI()) {
        bitlib.logger.info("このブラウザでは、画像ファイルオブジェクトを生成できません.");
        return true;
      }

      if (!fileObj || !bitlib.image.isUsable(fileObj.type)) {
        bitlib.logger.info("この画像ファイルオブジェクトには、対応していません.");
        return true;
      }

      var self = this;

      var fileReader = new FileReader();

      fileReader.onload = function (event) {
        self._loadImage(fileObj.type, event.target);
      };

      fileReader.readAsDataURL(fileObj);

      return true;
    };

    ImageFileResourceFactory.getClassName = function () {
      return className;
    };

    return ImageFileResourceFactory;
  }());

}(BitWeb || {}));