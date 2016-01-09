var TestPAD;
(function (TestPAD) {
    // Stores global game config settings
    var GameConfig = (function () {
        function GameConfig() {
        }
        GameConfig.NumTilesHorizontal = 6;
        GameConfig.NumTilesVertical = 6;

        GameConfig.AnimationDuration = 250;

        GameConfig.NumClearsToRaiseFlag = 5;
        return GameConfig;
    })();
    TestPAD.GameConfig = GameConfig;
})(TestPAD || (TestPAD = {}));
//# sourceMappingURL=GameConfig.js.map
