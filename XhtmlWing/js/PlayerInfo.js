
/*
Copyright (c) 2011 Taylor Clark.

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
*/

/**
* Represents a player's settings and accomplishments. The class can only auto-persist non-null integer, string, and boolean properties.
* @constructor
*/
function PlayerInfo()
{
	/**
	* The index of the last completed mission
	* @type {!number}
	*/
	this.MaxCompletedMissionNumber = -1;
	
	/**
	* The number of drones to generate for the next skirmish mission
	* @type {!number}
	*/
	this.NumDronesForSkirmish = 3;
	
	/**
	* If the player has completed the three training missions and earned the novice badge
	* @type {!boolean}
	*/
	this.HasAchievedNoviceBadge = false;
	
	/**
	* Indicates if mouse movement is used or if mouse position from center is used when calculation the ship's turning speed
	* @type {!boolean}
	*/
	this.TurnRelativeToWindowCenter = true;
	
	/**
	* The player's control scheme
	* @type {!number}
	*/
	this.Setting_ControlScheme = PlayerInfo.CONTROLSCHEME_Mouse_YawPitch
	
	/**
	* If mouse/touch movement moves the control stick or the ship directly
	* @type {!boolean}
	*/
	this.Setting_MouseMovesControlStick = true;
	
	/**
	* Indicates if the player wants to flip the Y-axis on the controls
	* @type {!boolean}
	*/
	this.Setting_InvertY = false;
	
	/**
	* Indicates if the player wants to hear sounds
	* @type {!boolean}
	*/
	this.Setting_PlaySounds = true;
}

/**
* The x-axis controls banking
* @type {!number}
* @const
*/
PlayerInfo.CONTROLSCHEME_Mouse_YawPitch = 0;

/**
* The X-axis controls rolling
* @type {!number}
* @const
*/
PlayerInfo.CONTROLSCHEME_Mouse_RollPitch = 1;


/**
* The prefix to add to items stored in the HTML5 local storage object
* @type {!string}
* @const
*/
PlayerInfo.LocalStorageItemPrefix = "PlayerInfo_";

PlayerInfo.prototype =
{
	/**
	* Save the player's info to the HTML5 local storage object
	*/
	SaveToLocalStorage:function()
	{
		for( var curMemberName in this )
		{
			// If this member isn't a property of the PlayerInfo class (for example, if it's inherited) then skip it
			if( !this.hasOwnProperty( curMemberName ) )
				continue;
				
			window.localStorage[PlayerInfo.LocalStorageItemPrefix + curMemberName] = this[ curMemberName ].toString();
		}
	},
	
	
	/**
	* Save the player's info to the HTML5 local storage object
	*/
	LoadFromLocalStorage:function()
	{
		for( var curMemberName in this )
		{
			// If this member isn't a property of the PlayerInfo class (for example, if it's inherited) then skip it
			if( !this.hasOwnProperty( curMemberName ) )
				continue;
		
			// Get the setting value and ignore nulls
			var localStorageValue = window.localStorage[PlayerInfo.LocalStorageItemPrefix + curMemberName];
			if( localStorageValue == null )
				continue;
				
			if( typeof(this[curMemberName]) == "number" )
				this[curMemberName] = parseInt( localStorageValue );
			else if( typeof(this[curMemberName]) == "string" )
				this[curMemberName] = localStorageValue;
			else if( typeof(this[curMemberName]) == "boolean" )
				this[curMemberName] = localStorageValue == "true";
		}
	}
};