
/*
Copyright (c) 2011 Taylor Clark.

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
*/

/**
* Represents a joystick-control-like element that can be controlled by touch or mouse input
* @constructor
*/
function Joypad()
{
	this.NormDirection = new Vector2(0, 0);

	// The current position of the joypad, in joypad coordinates (0,0) being center
	this.CurTouchPos = new Vector2(0, 0);

	this.Radius = 150;
	this.PosRadius = 50;

	// The center of the joypad in screen coordinates
	this.CenterPos = new Vector2( 0, 0 );

	// The DIV that represents the joypad
	this._joypadElem = null;

	// The DIV that represents the joypad's position
	this._joypadPosElem = null;
	
	// A flag to indicate if this joypad can have a variable range in a position or true to make it
	// always have a magnitude of 1. Setting this to true can be helpful for mobile apps where
	// touch input is inaccurate
	this.ForceToExtreme = false;
}

// The ID of the joypad's DOM element
Joypad.ElementId = "Joypad_23kl4j23k";
Joypad.PosElementId = "Joypad_Pos_23kl4j23k";

Joypad.prototype =
{
	Init: function ()
	{
		// The joypad sits in the bottom right
		this.CenterPos = new Vector2(this.Radius, window.innerHeight - this.Radius);

/*
		// See if we are reinitializing
		this._joypadElem = document.getElementById( Joypad.ElementId );
		if( !this._joypadElem )
		{
			// Put the joypad in the bottom right
			this._joypadElem = document.createElement("div");
			this._joypadElem.className = "Joypad";
			this._joypadElem.id = Joypad.ElementId;
			
			this._joypadPosElem = document.createElement("div");
			this._joypadPosElem.className = "JoypadPos";
			this._joypadPosElem.id = Joypad.PosElementId;
			this._joypadElem.appendChild(this._joypadPosElem);

			// Center the joypad position by default
			this._joypadPosElem.style.left = (this.Radius - this.PosRadius) + "px";
			this._joypadPosElem.style.top = (this.Radius - this.PosRadius) + "px";

			// After the joypad element is added to the DOM it's dimension properties will be populated
			document.body.appendChild(this._joypadElem);
		}
		else
			this._joypadPosElem = document.getElementById( Joypad.PosElementId );
		*/
		this.Center();
	},

	HandleTouchInput: function (touchPos)
	{
		var padCenterToPt = touchPos.GetSubtraction(this.CenterPos);

		if (padCenterToPt.GetLengthSq() > (this.Radius * this.Radius))
			return;

		// Determine the new joypad position
		this.CurTouchPos = touchPos.GetSubtraction(this.CenterPos);

		if (this.CurTouchPos.IsZero())
			this.NormDirection = new Vector2(0, 0);
		else if( this.ForceToExtreme )
			this.NormDirection = this.CurTouchPos.GetNormalized();
		else
			this.NormDirection = this.CurTouchPos.GetScaled(1 / this.Radius);

		this.Set( this.NormDirection.X, this.NormDirection.Y );
	},

	UpdateJoypadPos:function()
	{
		this.Set_V2( this.NormDirection );
	},
	
	Set_V2:function( normDir )
	{
		this.Set( normDir.X, normDir.Y );
	},
	
	Set:function( normDirX, normDirY )
	{
		this.NormDirection = new Vector2( normDirX, normDirY );
		
		var posElemPos = this.NormDirection.GetScaled(this.Radius - this.PosRadius);

		// Move the joypad position to the touch position
		if( this._joypadElem )
		{
			this._joypadPosElem.style.left = (posElemPos.X + this.Radius - this.PosRadius) + "px";
			this._joypadPosElem.style.top = (posElemPos.Y + this.Radius - this.PosRadius) + "px";
		}
	},
	
	Center: function ()
	{
		this.CurTouchPos = new Vector2(0, 0);
		this.NormDirection = new Vector2(0, 0);

		// Center the joypad position by default
		if( this._joypadElem )
		{
			this._joypadPosElem.style.left = (this.Radius - this.PosRadius) + "px";
			this._joypadPosElem.style.top = (this.Radius - this.PosRadius) + "px";
		}
	},
	
	// Determine if a point, in client coordinates, is inside the joypad
	ContainsClientPoint:function( clientPt )
	{
		var padCenterToPt = clientPt.GetSubtraction(this.CenterPos);

		return padCenterToPt.GetLengthSq() < (this.Radius * this.Radius);
	}
};