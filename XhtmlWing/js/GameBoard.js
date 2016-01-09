/// <reference path="jquery.d.ts" />
/// <reference path="jqueryui.d.ts" />
/// <reference path="Core.ts" />
/// <reference path="GameConfig.ts" />
var TestPAD;
(function (TestPAD) {
    // The states the game can be in while processing tiles
    (function (FluxState) {
        FluxState[FluxState["None"] = 0] = "None";
        FluxState[FluxState["RemovingMatches"] = 1] = "RemovingMatches";
        FluxState[FluxState["FillingGaps"] = 2] = "FillingGaps";
    })(TestPAD.FluxState || (TestPAD.FluxState = {}));
    var FluxState = TestPAD.FluxState;

    // A descriptor for a type of tile on the game board
    var GameBoardTileType = (function () {
        function GameBoardTileType() {
        }
        return GameBoardTileType;
    })();
    TestPAD.GameBoardTileType = GameBoardTileType;

    // A tile on the game board
    var GameBoardTile = (function () {
        function GameBoardTile() {
            this.GridPos = new TestPAD.Vector2();
        }
        ///////////////////////////////////////////////////////////////////////////////////////////
        // Update the tile type
        ///////////////////////////////////////////////////////////////////////////////////////////
        GameBoardTile.prototype.SetType = function (tileType) {
            this.Type = tileType.Id;

            if (this.DomElement.children().length == 0) {
                this.DomElement.append("<div class='GameBoardTileContent'></div>");
            }

            this.DomElement.children().css("background-image", "url(" + tileType.ImagePath + ")");
            //this.DomElement.css( "background-image", "url(" + tileType.ImagePath + ")" );
        };

        ///////////////////////////////////////////////////////////////////////////////////////////
        // Get the JQuery element in which this tile sits
        ///////////////////////////////////////////////////////////////////////////////////////////
        GameBoardTile.prototype.GetTileSlot = function () {
            var tileSlotId = GameBoard.GameBoardTileSlotPrefix + this.GridPos.Y + "_" + this.GridPos.X;

            return $("#" + tileSlotId);
        };
        return GameBoardTile;
    })();
    TestPAD.GameBoardTile = GameBoardTile;

    // Represents a group of tiles whose type matched and were cleared from the game board
    var TileMatch = (function () {
        ///////////////////////////////////////////////////////////////////////////////////////////
        // The default constructor
        ///////////////////////////////////////////////////////////////////////////////////////////
        function TileMatch(size, type, depth) {
            // How deep into the combos this match was when it was cleared. For example, the first
            // match has a depth of 0, the next has 1, and so on.
            this.ComboDepth = 0;
            this.Size = size;
            this.Type = type;
            this.ComboDepth = depth;
        }
        return TileMatch;
    })();
    TestPAD.TileMatch = TileMatch;

    // The board of tiles
    var GameBoard = (function () {
        function GameBoard() {
            this._tiles = [];
            this._allTileTypes = [];
            this._nextTileId = 1;
            this._draggingTile = null;
            // Indicates we're playing, removing matches, or filling gaps
            this._fluxState = FluxState.None;
            // The number of animations currently playing to show blocks being removed
            this._numBlockClearAnimations = 0;
            this._numTilesOnBoard = 0;
            // While tiles are being settled, this stores what tiles were cleared
            this._clearedMatches = [];
            // The game logic to which this game board belongs
            this._owningGame = null;
        }
        ///////////////////////////////////////////////////////////////////////////////////////////
        // Register a tile that gets generated
        ///////////////////////////////////////////////////////////////////////////////////////////
        GameBoard.prototype.RegisterTileType = function (type, imagePath) {
            var newType = new GameBoardTileType();
            newType.Id = type;
            newType.ImagePath = imagePath;

            this._allTileTypes.push(newType);
        };

        ///////////////////////////////////////////////////////////////////////////////////////////
        // Generate the board
        ///////////////////////////////////////////////////////////////////////////////////////////
        GameBoard.prototype.Init = function (boardTableId, owner) {
            // Store our instantiation
            GameBoard.Instance = this;

            // Get the board element
            this._boardElem = $("#" + boardTableId);

            // Store our owning logic
            this._owningGame = owner;

            var tableMarkup = "";

            var cellWidthNum = Math.floor(100 / TestPAD.GameConfig.NumTilesHorizontal);
            var cellWidthString = cellWidthNum.toString() + "%";

            var cellHeightNum = Math.floor(100 / TestPAD.GameConfig.NumTilesVertical);
            var cellHeightString = cellHeightNum.toString() + "%";

            for (var rowIndex = 0; rowIndex < TestPAD.GameConfig.NumTilesVertical; ++rowIndex) {
                var top = (cellHeightNum * rowIndex).toString() + "%";

                var cellStyleString = "top:" + top + "; width:" + cellWidthString + "; height:" + cellHeightString;

                for (var colIndex = 0; colIndex < TestPAD.GameConfig.NumTilesHorizontal; ++colIndex) {
                    var left = (cellWidthNum * colIndex).toString() + "%";

                    tableMarkup += "<div id='" + GameBoard.GameBoardTileSlotPrefix + rowIndex + "_" + colIndex + "' style='position:absolute;";
                    tableMarkup += cellStyleString;
                    tableMarkup += "; left: ";
                    tableMarkup += left;
                    tableMarkup += "'></div>";
                }
            }

            $('#' + boardTableId).html(tableMarkup);

            // Generate the tile objects for the structure
            this._boardTiles = new Array(TestPAD.GameConfig.NumTilesVertical);
            for (var rowIndex = 0; rowIndex < TestPAD.GameConfig.NumTilesVertical; ++rowIndex) {
                this._boardTiles[rowIndex] = [];

                for (var columnIndex = 0; columnIndex < TestPAD.GameConfig.NumTilesHorizontal; ++columnIndex)
                    this.AddNewTile(rowIndex, columnIndex);
            }
        };

        GameBoard.OnTileDragStart = ///////////////////////////////////////////////////////////////////////////////////////////
        // Occurs when the player starts dragging a tile. Return false to cancel the drag.
        ///////////////////////////////////////////////////////////////////////////////////////////
        function (event, ui) {
            if (GameBoard.Instance._fluxState != FluxState.None)
                return false;

            var draggedTile = GameBoard.Instance.GetTileFromDomElem(event.target);
            if (!draggedTile)
                return false;

            // Store the which tile we're dragging
            GameBoard.Instance._draggingTile = draggedTile;
            draggedTile.DomElement.css("opacity", "0.5");
        };

        GameBoard.OnTileDragging = ///////////////////////////////////////////////////////////////////////////////////////////
        // Occurs while the player drags a tile. Return false to cancel the drag.
        ///////////////////////////////////////////////////////////////////////////////////////////
        function (event, ui) {
            var elem = event.target;

            //document.title = "pos: (" + ui.position.left + "," + ui.position.top + ") offset: (" + ui.offset.left + "," + ui.offset.top + ")";
            //document.title = "pos: " + testPosition.toString();
            //document.title = "grid pos: " + GameBoard.Instance.GetGridPosFromOffsetPos( ui.offset.left, ui.offset.top ).toString();
            //return;
            var dragTile = GameBoard.Instance._draggingTile;
            if (!dragTile)
                return;

            // Get the position the signifies the "pivot" center of the tile. To make it easier to
            // drag, the game uses a Y higher than the middle to know when to swap
            var testPosition = new TestPAD.Vector2();
            testPosition.X = ui.offset.left + (elem.offsetWidth / 2);
            testPosition.Y = ui.offset.top + (elem.offsetHeight / 2);

            // Swap if we've moved
            var tileAtPos = GameBoard.Instance.GetTileFromOffsetPos(testPosition.X, testPosition.Y);
            if (tileAtPos !== null && tileAtPos.Id !== dragTile.Id)
                GameBoard.Instance.SwapTiles(dragTile, tileAtPos);
        };

        GameBoard.OnTileDragStop = ///////////////////////////////////////////////////////////////////////////////////////////
        // Occurs when the player stops dragging a tile
        ///////////////////////////////////////////////////////////////////////////////////////////
        function (event, ui) {
            GameBoard.Instance._draggingTile.DomElement.css("opacity", "1.0");

            // We're no longer dragging a tile
            var draggedTile = GameBoard.Instance._draggingTile;
            GameBoard.Instance._draggingTile = null;

            // Let's see if the player made something good happen
            GameBoard.Instance.OnTilesSettled(draggedTile);
        };

        ///////////////////////////////////////////////////////////////////////////////////////////
        // Get the grid position from a specified point on the page. Returns null if the point is
        // outside the game board.
        ///////////////////////////////////////////////////////////////////////////////////////////
        GameBoard.prototype.GetGridPosFromOffsetPos = function (offsetX, offsetY) {
            var itemSize = new TestPAD.Vector2(this._boardElem.width() / TestPAD.GameConfig.NumTilesHorizontal, this._boardElem.height() / TestPAD.GameConfig.NumTilesVertical);

            offsetX -= this._boardElem.offset().left;
            offsetY -= this._boardElem.offset().top;

            var gridPos = new TestPAD.Vector2(Math.floor(offsetX / itemSize.X), Math.floor(offsetY / itemSize.Y));

            if (gridPos.X < 0 || gridPos.X >= TestPAD.GameConfig.NumTilesHorizontal || gridPos.Y < 0 || gridPos.Y >= TestPAD.GameConfig.NumTilesVertical)
                return null;

            return gridPos;
        };

        ///////////////////////////////////////////////////////////////////////////////////////////
        // Get the tile that is at a specific spot on the grid
        ///////////////////////////////////////////////////////////////////////////////////////////
        GameBoard.prototype.GetTileFromOffsetPos = function (offsetX, offsetY) {
            var gridPos = this.GetGridPosFromOffsetPos(offsetX, offsetY);

            if (!gridPos)
                return null;

            return this._boardTiles[gridPos.Y][gridPos.X];
        };

        ///////////////////////////////////////////////////////////////////////////////////////////
        // Get the tile that is at a specific spot on the grid
        ///////////////////////////////////////////////////////////////////////////////////////////
        GameBoard.prototype.GetTileAtGridPos = function (rowIndex, colIndex) {
            return this._boardTiles[rowIndex][colIndex];
        };

        ///////////////////////////////////////////////////////////////////////////////////////////
        // Get the tile that is at a specific spot on the grid
        ///////////////////////////////////////////////////////////////////////////////////////////
        GameBoard.prototype.GetTileAtGridPos2 = function (pos) {
            return this._boardTiles[pos.Y][pos.X];
        };

        ///////////////////////////////////////////////////////////////////////////////////////////
        // Get the rectangle, in offset pixel coordinates, for the tile slot at the passed in grid
        // position
        ///////////////////////////////////////////////////////////////////////////////////////////
        GameBoard.prototype.GetTileSlotOffsetRect = function (rowColPos) {
            var slotRect = new TestPAD.Rect2();

            var slotElem = $("#" + GameBoard.GameBoardTileSlotPrefix + rowColPos.Y + "_" + rowColPos.X);

            slotRect.TopLeft.X = slotElem.offset().left;
            slotRect.TopLeft.Y = slotElem.offset().top;

            slotRect.Size.X = slotElem.width();
            slotRect.Size.Y = slotElem.height();

            return slotRect;
        };

        ///////////////////////////////////////////////////////////////////////////////////////////
        // Get the tile from DOM element that represents a tile
        ///////////////////////////////////////////////////////////////////////////////////////////
        GameBoard.prototype.GetTileFromDomElem = function (domElem) {
            if (domElem.id.indexOf(GameBoard.GameBoardTilePrefix) == -1)
                return null;

            var tileId = parseInt(domElem.id.substring(GameBoard.GameBoardTilePrefix.length));

            return GameBoard.Instance._tiles[tileId];
        };

        ///////////////////////////////////////////////////////////////////////////////////////////
        // Swap two tiles on the board
        ///////////////////////////////////////////////////////////////////////////////////////////
        GameBoard.prototype.SwapTiles = function (tile1, tile2) {
            var tile1Slot = tile1.GetTileSlot();
            var tile2Slot = tile2.GetTileSlot();

            // Swap the elements
            tile1.DomElement.detach();
            tile2Slot.append(tile1.DomElement);

            tile2.DomElement.detach();
            tile1Slot.append(tile2.DomElement);

            // Swap the array positions
            this._boardTiles[tile1.GridPos.Y][tile1.GridPos.X] = tile2;
            this._boardTiles[tile2.GridPos.Y][tile2.GridPos.X] = tile1;

            // Swap the grid positions
            var tile1Pos = tile1.GridPos.Clone();
            tile1.GridPos = tile2.GridPos;
            tile2.GridPos = tile1Pos;
        };

        ///////////////////////////////////////////////////////////////////////////////////////////
        // Occurs when the board has come to a rest after the player finishes moving a tile or the
        // tiles have stopped moving
        ///////////////////////////////////////////////////////////////////////////////////////////
        GameBoard.prototype.OnTilesSettled = function (startingTile) {
            this._fluxState = FluxState.RemovingMatches;

            if (startingTile)
                this.CheckForMatchFromSpecificGridPos(startingTile);

            for (var rowIndex = 0; rowIndex < TestPAD.GameConfig.NumTilesVertical; ++rowIndex) {
                for (var colIndex = 0; colIndex < TestPAD.GameConfig.NumTilesHorizontal; ++colIndex) {
                    var curTile = this._boardTiles[rowIndex][colIndex];
                    if (!curTile)
                        continue;

                    this.CheckForMatchFromSpecificGridPos(curTile);
                }
            }

            if (this._numTilesOnBoard === TestPAD.GameConfig.NumTilesHorizontal * TestPAD.GameConfig.NumTilesVertical) {
                // Tell the game that we end a move
                if( this._owningGame && this._owningGame.OnPlayerMoveEnd )
                    this._owningGame.OnPlayerMoveEnd(this._clearedMatches);

                this._fluxState = FluxState.None;
                this._clearedMatches = [];
            }
        };

        ///////////////////////////////////////////////////////////////////////////////////////////
        // Remove a match for a specific tile, if it has one
        ///////////////////////////////////////////////////////////////////////////////////////////
        GameBoard.prototype.CheckForMatchFromSpecificGridPos = function (startTile) {
            var matchedBlocks = this.FindMatchFromSpecificGridPos(startTile);
            if (matchedBlocks === null)
                return;

            this.RemoveTileMatchBlock(matchedBlocks);
        };

        ///////////////////////////////////////////////////////////////////////////////////////////
        // Look for a matches from a specific tile
        ///////////////////////////////////////////////////////////////////////////////////////////
        GameBoard.prototype.FindMatchFromSpecificGridPos = function (startTile) {
            var MinMatch = 3;
            var minMatchLess1 = MinMatch - 1;

            var xMatchedTiles = [];

            // Let's go left
            var curColumnIndex = startTile.GridPos.X - 1;
            while (curColumnIndex >= 0) {
                var testTile = this.GetTileAtGridPos(startTile.GridPos.Y, curColumnIndex);

                if (testTile === null || testTile.Type !== startTile.Type)
                    break;

                xMatchedTiles.push(testTile);
                this._boardTiles[startTile.GridPos.Y][curColumnIndex] = null;

                --curColumnIndex;
            }

            // Then right
            curColumnIndex = startTile.GridPos.X + 1;
            while (curColumnIndex < TestPAD.GameConfig.NumTilesHorizontal) {
                var testTile = this.GetTileAtGridPos(startTile.GridPos.Y, curColumnIndex);

                if (testTile === null || testTile.Type !== startTile.Type)
                    break;

                xMatchedTiles.push(testTile);
                this._boardTiles[startTile.GridPos.Y][curColumnIndex] = null;

                ++curColumnIndex;
            }

            if (xMatchedTiles.length < minMatchLess1) {
                for (var tileIndex = 0; tileIndex < xMatchedTiles.length; ++tileIndex)
                    this._boardTiles[xMatchedTiles[tileIndex].GridPos.Y][xMatchedTiles[tileIndex].GridPos.X] = xMatchedTiles[tileIndex];
                xMatchedTiles = [];
            }

            var yMatchedTiles = [];

            // Then up
            var curRowIndex = startTile.GridPos.Y - 1;
            while (curRowIndex >= 0) {
                var testTile = this.GetTileAtGridPos(curRowIndex, startTile.GridPos.X);

                if (testTile === null || testTile.Type !== startTile.Type)
                    break;

                yMatchedTiles.push(testTile);
                this._boardTiles[curRowIndex][startTile.GridPos.X] = null;

                --curRowIndex;
            }

            // Then down
            curRowIndex = startTile.GridPos.Y + 1;
            while (curRowIndex < TestPAD.GameConfig.NumTilesVertical) {
                var testTile = this.GetTileAtGridPos(curRowIndex, startTile.GridPos.X);

                if (testTile === null || testTile.Type !== startTile.Type)
                    break;

                yMatchedTiles.push(testTile);
                this._boardTiles[curRowIndex][startTile.GridPos.X] = null;

                ++curRowIndex;
            }

            if (yMatchedTiles.length < minMatchLess1) {
                for (var tileIndex = 0; tileIndex < yMatchedTiles.length; ++tileIndex)
                    this._boardTiles[yMatchedTiles[tileIndex].GridPos.Y][yMatchedTiles[tileIndex].GridPos.X] = yMatchedTiles[tileIndex];
                yMatchedTiles = [];
            }

            if (xMatchedTiles.length >= minMatchLess1 || yMatchedTiles.length >= minMatchLess1) {
                // Merge the lists
                xMatchedTiles = xMatchedTiles.concat(yMatchedTiles);
                yMatchedTiles = [];

                // Add the start tile to the match list and remove it from the board
                xMatchedTiles.push(startTile);
                this._boardTiles[startTile.GridPos.Y][startTile.GridPos.X] = null;

                return xMatchedTiles;
            }

            return null;
        };

        GameBoard.OnAnimationEnded = ///////////////////////////////////////////////////////////////////////////////////////////
        // Called when any sort of block removal animation has been played
        ///////////////////////////////////////////////////////////////////////////////////////////
        function () {
            var board = GameBoard.Instance;

            --board._numBlockClearAnimations;

            if (board._numBlockClearAnimations <= 0) {
                board._numBlockClearAnimations = 0;

                if (board._fluxState === FluxState.RemovingMatches) {
                    board._fluxState = FluxState.FillingGaps;
                    board.FillGaps();
                } else if (board._fluxState === FluxState.FillingGaps)
                    board.OnTilesSettled();
            }
        };

        // Add blocks to columns that need it
        GameBoard.prototype.FillGaps = function () {
            for (var columnIndex = 0; columnIndex < TestPAD.GameConfig.NumTilesHorizontal; ++columnIndex) {
                var numBlocksToAdd = 0;

                for (var rowIndex = TestPAD.GameConfig.NumTilesVertical - 1; rowIndex >= 0; --rowIndex) {
                    var curBlock = this._boardTiles[rowIndex][columnIndex];

                    if (curBlock === null)
                        ++numBlocksToAdd;
else
                        this.SendBlockDown(curBlock, numBlocksToAdd);
                }

                this.AddBlocksToColumn(columnIndex, numBlocksToAdd);
            }
        };

        ///////////////////////////////////////////////////////////////////////////////////////////
        // Add a new random tile to the game board
        ///////////////////////////////////////////////////////////////////////////////////////////
        GameBoard.prototype.AddNewTile = function (rowIndex, columnIndex) {
            // Initialize the new tile
            var newTile = new GameBoardTile();
            newTile.Id = ++this._nextTileId;
            newTile.GridPos.Y = rowIndex;
            newTile.GridPos.X = columnIndex;

            this._tiles[newTile.Id] = newTile;

            // Create the DIV for this tile
            $("#" + GameBoard.GameBoardTileSlotPrefix + rowIndex + "_" + columnIndex).append("<div id='" + GameBoard.GameBoardTilePrefix + newTile.Id + "' class='GameBoardTile'></div>");
            newTile.DomElement = $("#" + GameBoard.GameBoardTilePrefix + newTile.Id);
            newTile.SetType(this.GetRandomTileType());

            this._boardTiles[rowIndex][columnIndex] = newTile;

            // Allow tiles to drag
            newTile.DomElement.draggable({
                distance: 5,
                helper: "clone",
                start: GameBoard.OnTileDragStart,
                stop: GameBoard.OnTileDragStop,
                drag: GameBoard.OnTileDragging,
                zIndex: 20
            });

            ++this._numTilesOnBoard;
            $("#NumTilesLabel").text(this._numTilesOnBoard.toString());

            return newTile;
        };

        ///////////////////////////////////////////////////////////////////////////////////////////
        // Add blocks to a column
        ///////////////////////////////////////////////////////////////////////////////////////////
        GameBoard.prototype.AddBlocksToColumn = function (columnIndex, numBlocks) {
            for (var rowIndex = 0; rowIndex < numBlocks; ++rowIndex) {
                var newTile = this.AddNewTile(rowIndex, columnIndex);

                var yToFall = newTile.DomElement.height() * numBlocks;
                newTile.DomElement.css("top", (-yToFall).toString() + "px");
                newTile.DomElement.animate({ "top": "0px" }, TestPAD.GameConfig.AnimationDuration, GameBoard.OnAnimationEnded);
                ++this._numBlockClearAnimations;
            }
        };

        ///////////////////////////////////////////////////////////////////////////////////////////
        // Let a block fall down
        ///////////////////////////////////////////////////////////////////////////////////////////
        GameBoard.prototype.SendBlockDown = function (tile, numSpots) {
            this._boardTiles[tile.GridPos.Y][tile.GridPos.X] = null;

            tile.GridPos.Y += numSpots;

            this._boardTiles[tile.GridPos.Y][tile.GridPos.X] = tile;

            tile.DomElement.detach();
            tile.GetTileSlot().append(tile.DomElement);

            // Animate the fall
            var yToFall = tile.DomElement.height() * numSpots;
            tile.DomElement.css("top", (-yToFall).toString() + "px");
            tile.DomElement.animate({ "top": "0px" }, TestPAD.GameConfig.AnimationDuration, GameBoard.OnAnimationEnded);
            ++this._numBlockClearAnimations;
        };

        ///////////////////////////////////////////////////////////////////////////////////////////
        // Remove tiles from the game board
        ///////////////////////////////////////////////////////////////////////////////////////////
        GameBoard.prototype.RemoveTileMatchBlock = function (tiles) {
            // Store the match
            this._clearedMatches.push(new TileMatch(tiles.length, tiles[0].Type, this._clearedMatches.length));

            var startPos = new TestPAD.Vector2(tiles[0].DomElement.offset().left - $("#Container").offset().left, tiles[0].DomElement.offset().top - $("#Container").offset().top);

            //this._owningGame.SendOrbToHeart( startPos );
            // The function that gets called at the end of the fade out
            var OnBlockFadeOutComplete = function () {
                // 'this' is the DOM element being removed
                $(this).remove();

                GameBoard.OnAnimationEnded();
            };

            for (var tileIndex = 0; tileIndex < tiles.length; ++tileIndex) {
                var curTile = tiles[tileIndex];

                ++this._numBlockClearAnimations;

                // Erase the block's existance
                curTile.DomElement.fadeOut(500, OnBlockFadeOutComplete);

                this._boardTiles[curTile.GridPos.Y][curTile.GridPos.X] = null;
                this._tiles[curTile.Id] = null;
                curTile.Id = -1;
                curTile.GridPos.Set(-1, -1);
                --this._numTilesOnBoard;
                $("#NumTilesLabel").text(this._numTilesOnBoard.toString());
            }
        };

        ///////////////////////////////////////////////////////////////////////////////////////////
        // Get a random tile type
        ///////////////////////////////////////////////////////////////////////////////////////////
        GameBoard.prototype.GetRandomTileType = function () {
            var randomValue = Math.floor(Math.random() * this._allTileTypes.length);

            return this._allTileTypes[randomValue];
        };

        ///////////////////////////////////////////////////////////////////////////////////////////
        // Populate the game board with a random selection of tiles
        ///////////////////////////////////////////////////////////////////////////////////////////
        GameBoard.prototype.FillWithRandom = function () {
            for (var rowIndex = 0; rowIndex < TestPAD.GameConfig.NumTilesVertical; ++rowIndex) {
                for (var colIndex = 0; colIndex < TestPAD.GameConfig.NumTilesHorizontal; ++colIndex) {
                    this._boardTiles[rowIndex][colIndex].SetType(this.GetRandomTileType());
                }
            }
        };
        GameBoard.GameBoardTilePrefix = "GameBoardTile_";
        GameBoard.GameBoardTileSlotPrefix = "GameBoardTileSlot_";
        return GameBoard;
    })();
    TestPAD.GameBoard = GameBoard;
})(TestPAD || (TestPAD = {}));
//# sourceMappingURL=GameBoard.js.map
