/// <reference path="jquery.d.ts" />
/// <reference path="phonegap.d.ts" />
var TestPAD;
(function (TestPAD) {
    // Represents a 2D point or game board grid position
    var Vector2 = (function () {
        ///////////////////////////////////////////////////////////////////////////////////////////
        // The default constructor
        ///////////////////////////////////////////////////////////////////////////////////////////
        function Vector2(x, y) {
            this.X = x || 0;
            this.Y = y || 0;
        }
        ///////////////////////////////////////////////////////////////////////////////////////////
        // Get a string that describes the point, looks like (1,2)
        ///////////////////////////////////////////////////////////////////////////////////////////
        Vector2.prototype.toString = function () {
            return "(" + this.X + "," + this.Y + ")";
        };

        ///////////////////////////////////////////////////////////////////////////////////////////
        // Create a copy of this point
        ///////////////////////////////////////////////////////////////////////////////////////////
        Vector2.prototype.Clone = function () {
            return new Vector2(this.X, this.Y);
        };

        ///////////////////////////////////////////////////////////////////////////////////////////
        // Set both components
        ///////////////////////////////////////////////////////////////////////////////////////////
        Vector2.prototype.Set = function (x, y) {
            this.X = x;
            this.Y = y;
        };
        return Vector2;
    })();
    TestPAD.Vector2 = Vector2;

    // Represents a 2D rectangle
    var Rect2 = (function () {
        function Rect2(topLeft, size) {
            this.TopLeft = new Vector2();
            this.Size = new Vector2();
            this.TopLeft = topLeft || new Vector2();
            this.Size = size || new Vector2();
        }
        Rect2.prototype.Right = function () {
            return this.TopLeft.X + this.Size.X;
        };

        Rect2.prototype.Bottom = function () {
            return this.TopLeft.Y + this.Size.Y;
        };

        Rect2.prototype.Contains = function (testPoint) {
            return testPoint.X >= this.TopLeft.X && testPoint.Y >= this.TopLeft.Y && testPoint.X < this.Right() && testPoint.Y < this.Bottom();
        };
        return Rect2;
    })();
    TestPAD.Rect2 = Rect2;

    var PortraitResize = (function () {
        function PortraitResize() {
        }
        PortraitResize.Init = function () {
            $(window).resize(PortraitResize.OnResize);

            PortraitResize.OnResize();
        };

        PortraitResize.OnResize = function () {
            // Make the game fill vertically
            var WidthToHeightRatio = 1;

            var windowSize = new Vector2($(window).width(), $(window).height());

            var targetWidth = windowSize.Y * WidthToHeightRatio;

            if (targetWidth > windowSize.X) {
                $("#Container").width(windowSize.X);
                $("#Container").height(windowSize.X / WidthToHeightRatio);
            } else {
                $("#Container").width(targetWidth);
                $("#Container").height("100%");
            }

            $( "#Container" ).css( "left", Math.floor( (windowSize.X - targetWidth) / 2 ) + "px" );
        };
        return PortraitResize;
    })();
    TestPAD.PortraitResize = PortraitResize;

    // Represents a sound or song that can play
    var AudioInstance = (function () {
        // The constructor
        function AudioInstance(audioPath) {
            if (typeof (audioPath) === "string" && audioPath.length > 0)
                this.Load(audioPath);
        }
        AudioInstance.prototype.Load = function (audioPath, autoPlay, shouldLoop) {
            var self = this;
            setTimeout(function () {
                self.Load_Internal(audioPath, autoPlay, shouldLoop);
            }, 750);
        };

        // Load the audio file
        AudioInstance.prototype.Load_Internal = function (audioPath, autoPlay, shouldLoop) {
            if (AudioInstance.s_IsPhoneGap === null) {
                AudioInstance.s_IsPhoneGap = true;

                var isAndroid = navigator.userAgent.toLowerCase().indexOf("android") != -1;

                if (isAndroid)
                    AudioInstance.s_AudioPath = "/android_asset/www/" + AudioInstance.s_AudioPath;
            }

            // Save a reference to ourselves for our callback functions
            var self = this;

            // Called after the audio object is successfully loaded from file
            var onLoaded = function () {
                console.info("Loaded " + audioPath);

                if (autoPlay === true)
                    self.Play();
            };

            // If shouldLoop is true, this is called after the audio data has finished playing
            var onDonePlaying = function () {
                if (!AudioInstance.s_IsPhoneGap)
                    self._mediaObject.currentTime = 0;

                self.Play();
            };

            try  {
                if (AudioInstance.s_IsPhoneGap) {
                    this._mediaObject = new Media(AudioInstance.s_AudioPath + audioPath, null, null);

                    if (autoPlay)
                        this.Play();
                } else {
                    this._mediaObject = new Audio();

                    this._mediaObject.src = AudioInstance.s_AudioPath + audioPath;

                    this._mediaObject.addEventListener("loadeddata", onLoaded, true);

                    if (shouldLoop)
                        this._mediaObject.addEventListener('ended', onDonePlaying, false);
                    //this._mediaObject.load();
                }
            } catch (exc) {
                this._mediaObject = null;
            }
        };

        ///////////////////////////////////////////////////////////////////////////////////////////
        // Play the audio
        ///////////////////////////////////////////////////////////////////////////////////////////
        AudioInstance.prototype.Play = function () {
            if (this._mediaObject)
                this._mediaObject.play();
        };

        ///////////////////////////////////////////////////////////////////////////////////////////
        // Stop the audio
        ///////////////////////////////////////////////////////////////////////////////////////////
        AudioInstance.prototype.Stop = function () {
            if (this._mediaObject) {
                if (AudioInstance.s_IsPhoneGap)
                    this._mediaObject.stop();
else
                    this._mediaObject.pause();
            }
        };
        AudioInstance.s_IsPhoneGap = null;
        AudioInstance.s_AudioPath = "audio/";
        return AudioInstance;
    })();
    TestPAD.AudioInstance = AudioInstance;

    var HtmlHelper = (function () {
        function HtmlHelper() {
        }
        HtmlHelper.MakeStringFitInParent = ///////////////////////////////////////////////////////////////////////////////////////////
        // Scales the text of an element to fit inside its parent
        ///////////////////////////////////////////////////////////////////////////////////////////
        function (elemId) {
            var textElem = document.getElementById(elemId);
            var boundsElem = textElem.parentElement;

            var startingFontSize = boundsElem.offsetHeight;

            // Get the bounds we need to fit within
            var testBounds = { width: boundsElem.clientWidth, height: boundsElem.clientHeight };

            if (window.getComputedStyle) {
                testBounds.width -= parseInt(window.getComputedStyle(boundsElem, null).getPropertyValue('padding-left'));
                testBounds.width -= parseInt(window.getComputedStyle(boundsElem, null).getPropertyValue('padding-right'));

                testBounds.height -= parseInt(window.getComputedStyle(boundsElem, null).getPropertyValue('padding-top'));
                testBounds.height -= parseInt(window.getComputedStyle(boundsElem, null).getPropertyValue('padding-bottom'));
            }

            // Add our own padding if wanted
            var buffer = 0.9;

            //testBounds.width *= buffer;
            testBounds.height *= buffer;

            var curFontSize = Math.floor(startingFontSize);

            // Make the size an even number
            curFontSize += (curFontSize % 2);

            var minSize = 0;
            var maxSize = curFontSize;
            textElem.style.fontSize = curFontSize + "px";
            while ((maxSize - minSize) > 3) {
                if (textElem.offsetWidth > testBounds.width || textElem.offsetHeight > testBounds.height) {
                    maxSize = curFontSize;
                    curFontSize = Math.floor((maxSize + minSize) / 2);
                } else {
                    minSize = curFontSize;
                    curFontSize = Math.floor((maxSize + curFontSize) / 2);
                }

                textElem.style.fontSize = curFontSize + "px";
            }

            textElem.style.fontSize = minSize + "px";
        };
        return HtmlHelper;
    })();
    TestPAD.HtmlHelper = HtmlHelper;
})(TestPAD || (TestPAD = {}));
//# sourceMappingURL=Core.js.map
