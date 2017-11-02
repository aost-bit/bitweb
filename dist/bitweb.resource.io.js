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
        if (!newDateTime || !bitlib.common.isValidDate(newDateTime)) {
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
        if (!newDateTime || !bitlib.common.isValidDate(newDateTime)) {
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

    ImageFileResource.getClassName = function () {
      return className;
    };

    return ImageFileResource;
  }());

  BitWeb.ImageFileResourceFactory = (function () {
    var className = "ImageFileResourceFactory";

    var imgResource = undefined,
      scalingRatio = 100.0;

    function createImageResource(imgObj, imgType) {
      imgResource = null;

      if (!imgObj || !imgType) {
        return false;
      }

      var width = imgObj.naturalWidth,
        height = imgObj.naturalHeight;

      width = Math.round(width * scalingRatio / 100.0);
      height = Math.round(height * scalingRatio / 100.0);

      // imgResource = new BitWeb.ImageFileResource({
      //     ...
      // });

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
      newContext.translate(-(width / 2), -(height / 2));

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

      // imgResource = new BitWeb.ImageFileResource({
      //     ...
      // }); 

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

    function load(imgType, evtTarget) {
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
    }

    function ImageFileResourceFactory() {
      if (!(this instanceof ImageFileResourceFactory)) {
        return new ImageFileResourceFactory();
      }
      // singleton
      if (ImageFileResourceFactory.prototype._singletonInstance) {
        return ImageFileResourceFactory.prototype._singletonInstance;
      }
      var self = this;
      ImageFileResourceFactory.prototype._singletonInstance = self;

      self.observable = ko.observable(self); // 通知用の observable object

      self._setScalingRatio = function (newRatio) {
        newRatio = bitlib.comon.toNumber(newRatio || 0);

        if (isNaN(newRatio) || 100 < newRatio || newRatio < 1) {
          return self;
        }

        scalingRatio = newRatio;

        return self;
      };

      return self;
    }

    ImageFileResourceFactory.prototype.get = function () {
      return imgResource;
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
        load(fileObj.type, event.target);
        self.observable.notifySubscribers(self);
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