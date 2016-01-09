
/*
Copyright (c) 2011 Taylor Clark.

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
*/

/**
* Represents the logic for the game page
*/
var Main =
{
    /**
    * The active game
    * @type {?XhtmlWingGame}
    */
    _gameMgrObj: null,

    /**
    * The system time, in seconds, at the end of the previous frame
    * @type {!number}
    */
    _prevFrameTime: new Date().getTime(),

    /**
    * The index of the active mission within Mission.Missions
    * @type {!number}
    */
    _missionIndex: 0,

    animFrameId: null,

    /**
    * Stores the player's accomplishments and settings
    * @type {!PlayerInfo}
    */
    CurPlayerInfo: new PlayerInfo(),


    /**
    * Invoked when the document is finished loading
    */
    OnLoad: function()
    {
        // Load the player's accomplishments and settings
        Main.CurPlayerInfo.LoadFromLocalStorage();

        Main._missionIndex = Main.CurPlayerInfo.MaxCompletedMissionNumber + 1;

        Main.PopulateMissionsList();

        // Hide the right-click menu so it doesn't get in the way when the player wants to roll their sh
        document.oncontextmenu = function() { return false }

        PageInput.Init( Main );

        Main.InitMission();

        $( ".galaxy-button" ).click( function()
        {
            var idString = this.id;
            idString = idString.substring( "galaxy-id-".length );
            var areaIndex = parseInt( idString );

            Main._gameMgrObj.launchPortalPod( areaIndex );
        } );

        $( ".portal-menu-button" ).click( function()
        {
            $( ".portal-menu-button" ).removeClass( "selected" );
            $( this ).addClass( "selected" );
        } );

        // Update the pings
        setInterval( function()
        {
            var pingRanges = [60, 43, 78, 94, 53];

            for( var playerIndex = 0; playerIndex < pingRanges.length; ++playerIndex )
            {
                var newPing = Math.floor( Math.random() * 16 ) - 8;
                newPing += pingRanges[playerIndex];

                $( "#ping-" + playerIndex ).text( newPing );
            }

        }, 1000 );

        Main.shouldShowLogo = Util.GetQueryStringParameter( "logo" ) === "1";
        if( Main.shouldShowLogo )
        {
            $( "#Logo" ).show();
            $( "#new-gui" ).hide();
            $( "#SettingsButton" ).hide();            
        }
    },


    /**
    * Update one step forward in the game simulation
    */
    Update: function()
    {
        // Get the time that has elapsed since the last call to Update
        var curFrameTime = new Date().getTime();
        var elapsedFrameSeconds = ( curFrameTime - Main._prevFrameTime ) / 1000.0;
        Main._prevFrameTime = curFrameTime;

        // Cap the lowest frame rate so we don't take huge time steps forward
        if( elapsedFrameSeconds > 0.125 )
            elapsedFrameSeconds = 0.125;

        // Update the game
        Main._gameMgrObj.Update( elapsedFrameSeconds );

        // Keep the game loop going if it's not paused
        Main.animFrameId = null;
        if( !Main._gameMgrObj.GameIsPaused && Main._gameMgrObj.GameIsActive )
            Main.startUpdating();
    },


    /**
    * Invoked when the player clicks the "Start Mission" button
    */
    OnStartMissionClick: function()
    {
        document.getElementById( "MissionInfoPanel" ).style.display = "none";

        Main._gameMgrObj._joypad.Center();

        // Indicate the game has begun
        Main._gameMgrObj.GameIsActive = true;

        Main.startUpdating();
    },


    /**
    * Invoked when the player clicks the "Next Mission" button
    */
    OnNextMissionClick: function()
    {
        document.getElementById( "MissionOverPanel" ).style.display = "none";

        // If the mission was a success then move on to the next mission
        var wasSuccessful = document.getElementById( "MissionWasSuccessField" ).value === "1";
        if( wasSuccessful )
        {
            // If the player completed a normal mission
            if( Main._missionIndex < Mission.Missions.length )
            {
                if( Main._missionIndex > Main.CurPlayerInfo.MaxCompletedMissionNumber )
                    Main.CurPlayerInfo.MaxCompletedMissionNumber = Main._missionIndex;

                ++Main._missionIndex;
            }
                // Otherwise the player completed a skirmish
            else
                ++Main.CurPlayerInfo.NumDronesForSkirmish;

            Main.PopulateMissionsList();

            // Save the player info as the mission or combat drone count increased
            Main.CurPlayerInfo.SaveToLocalStorage();
        }

        // Refresh the game
        Main.InitMission( wasSuccessful );
    },


    /**
    * Prepare the game for a specific mission
    */
    InitMission: function( overrideSecret )
    {
        // If a game was already initialized, then free it
        if( Main._gameMgrObj )
            Main._gameMgrObj.Term();

        Main._gameMgrObj = new XhtmlWingGame( overrideSecret );
        Main._gameMgrObj.Init();
        Main._gameMgrObj.loadArea( 0 );

        var titleLabel = document.getElementById( "MissionTitleLabel" );
        var descLabel = document.getElementById( "MissionDescLabel" );

        var curMission;
        if( XhtmlWingGame.MainGame._isStarWarsGame )
        {
            curMission = Mission.MakeStarWars();
            titleLabel.style.fontSize = "36px";
        }
        else if( Main._missionIndex < Mission.Missions.length )
            curMission = Mission.Missions[Main._missionIndex];
        else
            curMission = Mission.MakeSkirmish( Main.CurPlayerInfo.NumDronesForSkirmish );

        titleLabel.innerHTML = curMission.Title;
        descLabel.innerHTML = curMission.Description;

        Main._gameMgrObj.InitMission( curMission );

        document.getElementById( "MissionInfoPanel" ).style.display = "block";
    },


    /** ///////////////////////////////////////////////////////////////////////////////////////////
    * Called when the player releases a keyboard key
    * @param {!number} keyCode The key code of the pressed key
    */
    ////////////////////////////////////////////////////////////////////////////////////////////
    OnKeyUp: function( keyCode )
    {
        Main._gameMgrObj.OnKeyUp( keyCode );
    },


    /** ///////////////////////////////////////////////////////////////////////////////////////////
    * Called when the player presses a keyboard key
    * @param {!number} keyCode The key code of the pressed key
    */
    ////////////////////////////////////////////////////////////////////////////////////////////
    OnKeyDown: function( keyCode )
    {
        Main._gameMgrObj.OnKeyDown( keyCode );
    },


    /** ///////////////////////////////////////////////////////////////////////////////////////////
    * Called when the player rolls the mouse wheel
    * @param {!number} delta The direction the mouse wheel was rolled
    */
    ////////////////////////////////////////////////////////////////////////////////////////////
    OnMouseWheel: function( delta )
    {
        Main._gameMgrObj.OnMouseWheel( delta );
    },


    /** ///////////////////////////////////////////////////////////////////////////////////////////
    * Called when the player presses a mouse button or starts touching with their finger
    * @param {?boolean} isLeft True if the left mouse button was pressed, false for middle/right, and null for a finger touch
    */
    ////////////////////////////////////////////////////////////////////////////////////////////
    OnTouchStart: function( pos, isLeft )
    {
        Main._gameMgrObj.OnTouchStart( pos, isLeft );
    },


    /** ///////////////////////////////////////////////////////////////////////////////////////////
    * Called when the player releases a mouse button or finger touch
    * @param {?boolean} isLeft True if the left mouse button was release, false for middle/right, and null for a finger being released
    */
    ////////////////////////////////////////////////////////////////////////////////////////////
    OnTouchEnd: function( isLeft )
    {
        Main._gameMgrObj.OnTouchEnd( isLeft );
    },


    /**
    * Handle the player moving the mouse or their finger
    * @param Array.<Vector2> touchPositions The array of touch positions. The array will only have one entry of mouse input is being used
    */
    OnTouchMove: function( touchPositions )
    {
        Main._gameMgrObj.OnTouchMove( touchPositions[0] );
    },


    /** ///////////////////////////////////////////////////////////////////////////////////////////
    * Called when the player clicks on the button to open the settings
    */
    ////////////////////////////////////////////////////////////////////////////////////////////
    OnSettingsClicked: function()
    {
        document.getElementById( 'Setting_InvertYAxis' ).checked = Main.CurPlayerInfo.Setting_InvertY;
        document.getElementById( 'Setting_PlaySounds' ).checked = Main.CurPlayerInfo.Setting_PlaySounds;

        if( Main.CurPlayerInfo.Setting_ControlScheme == PlayerInfo.CONTROLSCHEME_Mouse_YawPitch )
            document.getElementById( 'Setting_Control_PitchBank' ).checked = true;
        else
            document.getElementById( 'Setting_Control_PitchRoll' ).checked = true;

        if( Main.CurPlayerInfo.Setting_MouseMovesControlStick )
            document.getElementById( 'Setting_Control_MoveControlStick' ).checked = true;
        else
            document.getElementById( 'Setting_Control_MoveShip' ).checked = true;

        document.getElementById( 'Setting_TurnRelativeToWindowCenter' ).checked = Main.CurPlayerInfo.TurnRelativeToWindowCenter;

        // Hide the settings window
        //document.getElementById( 'SettingsPanel' ).style.display = 'block';
        $( "#SettingsPanel" ).fadeIn( XhtmlWingGame.AnimationDuration * 3 );

        // If this is a single-player game and it's active then unpause the game
        if( !Main._gameMgrObj.IsMultiplayer && Main._gameMgrObj.GameIsActive )
            Main._gameMgrObj.GameIsPaused = true;
    },


    /** ///////////////////////////////////////////////////////////////////////////////////////////
    * Called when the player closes the settings dialog
    */
    ////////////////////////////////////////////////////////////////////////////////////////////
    OnSettingsClosed: function()
    {
        Main.CurPlayerInfo.Setting_InvertY = document.getElementById( 'Setting_InvertYAxis' ).checked != false;

        Main._gameMgrObj.InvertYAxis = Main.CurPlayerInfo.Setting_InvertY ? -1 : 1;

        Main.CurPlayerInfo.Setting_PlaySounds = document.getElementById( 'Setting_PlaySounds' ).checked != false;

        if( document.getElementById( 'Setting_Control_PitchBank' ).checked != false )
            Main.CurPlayerInfo.Setting_ControlScheme = PlayerInfo.CONTROLSCHEME_Mouse_YawPitch;
        else
            Main.CurPlayerInfo.Setting_ControlScheme = PlayerInfo.CONTROLSCHEME_Mouse_RollPitch;

        Main.CurPlayerInfo.Setting_MouseMovesControlStick = document.getElementById( 'Setting_Control_MoveControlStick' ).checked != false;

        Main.CurPlayerInfo.TurnRelativeToWindowCenter = document.getElementById( 'Setting_TurnRelativeToWindowCenter' ).checked != false;

        // Save the player's settings
        Main.CurPlayerInfo.SaveToLocalStorage();

        // Hide the settings window
        //document.getElementById( 'SettingsPanel' ).style.display = 'none';
        $( "#SettingsPanel" ).fadeOut( XhtmlWingGame.AnimationDuration * 3 );

        // If this is a single-player game and it's active then unpause the game
        if( !Main._gameMgrObj.IsMultiplayer && Main._gameMgrObj.GameIsActive )
        {
            Main._prevFrameTime = new Date().getTime();

            Main._gameMgrObj.GameIsPaused = false;

            // Start the game back up
            Main.Update();
        }
    },


    /** ///////////////////////////////////////////////////////////////////////////////////////////
    * Populate the list of available missions
    * @param {!number} missionIndex The index of the mission that was clicked
    */
    ////////////////////////////////////////////////////////////////////////////////////////////
    OnMissionClick: function( missionIndex )
    {
        Main._missionIndex = missionIndex;
        Main.InitMission( true );
    },


    onMMOClick:function()
    {
        if( Main._gameMgrObj )
            Main._gameMgrObj.Term();

        var areaIndex = window.localStorage["lastAreaIndex"];
        if( !areaIndex )
            areaIndex = 0;

        Main._gameMgrObj = new XhtmlWingGame();
        Main._gameMgrObj.Init();

        Main._gameMgrObj.loadArea( areaIndex, function()
        {
            $( "#MissionInfoPanel" ).hide();

            Main._gameMgrObj.GameIsActive = true;

            Main.startUpdating();
        } );
    },


    startUpdating:function()
    {
        if( Main.animFrameId === null )
            Main.animFrameId = requestAnimationFrame( Main.Update );
    },


    ///////////////////////////////////////////////////////////////////////////////////////////////
    // Occurs when the user wants to play in the arena
    ///////////////////////////////////////////////////////////////////////////////////////////////
    onArenaClick:function()
    {
        if( Main._gameMgrObj )
            Main._gameMgrObj.Term();

        Main._gameMgrObj = new XhtmlWingGame();
        Main._gameMgrObj.Init();

        Main._gameMgrObj.loadArea( 0, function()
        {
            $( "#MissionInfoPanel" ).hide();

            Main._gameMgrObj.InitMission( Mission.MakeArena() );

            Main._gameMgrObj.GameIsActive = true;

            Main._gameMgrObj.isInArena = true;

            Main.startUpdating();
        } );
    },


    ///////////////////////////////////////////////////////////////////////////////////////////////
    // Populate the list of available missions
    ///////////////////////////////////////////////////////////////////////////////////////////////
    PopulateMissionsList: function()
    {
        var missionsRow = document.getElementById( "CurrentMissionsRow" );

        // Clear the row in case this is an update
        Util.RemoveAllChildren( missionsRow );

        for( var curMissionIndex = 0; curMissionIndex < Mission.Missions.length; ++curMissionIndex )
        {
            var curMission = Mission.Missions[curMissionIndex];

            var canPlay = ( curMissionIndex - 1 ) <= Main.CurPlayerInfo.MaxCompletedMissionNumber;
            var divStart = canPlay ? ( "<div class='SimpleBordered button' onclick='Main.OnMissionClick(" + curMissionIndex + ");' style='cursor:pointer;'>" ) : "<div class='SimpleBordered'>";
            var title = "<span style='text-decoration:underline;'>Mission " + ( curMissionIndex + 1 ) + "</span>"
            var status = curMissionIndex <= Main.CurPlayerInfo.MaxCompletedMissionNumber ? "<span style='color:#4F4;'>Complete</span>" : "<span style='color:#F44;'>Incomplete</span>";

            var newTD = document.createElement( "td" );
            newTD.innerHTML = divStart + title + "<br />" + curMission.Title + "<br />" + status + "</div>";
            missionsRow.appendChild( newTD );
        }

        var canPlaySkirmish = Main.CurPlayerInfo.MaxCompletedMissionNumber >= Mission.Missions.length - 1;
        var divStart = canPlaySkirmish ? ( "<div class='SimpleBordered button' onclick='Main.OnMissionClick(" + Mission.Missions.length + ");'>" ) : "<div class='SimpleBordered'>";
        var title = "<span style='text-decoration:underline;'>Skirmish</span>"
        var status = canPlaySkirmish ? "<span style='color:#4F4;'>Available</span>" : "<span style='color:#F44;'>Locked</span>";

        var skirmishTD = document.createElement( "td" );
        skirmishTD.innerHTML = divStart + title + "<br />" + curMission.Title + "<br />" + status + "</div>";
        missionsRow.appendChild( skirmishTD );
    }
};