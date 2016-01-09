
/*
Copyright (c) 2011 Taylor Clark.

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
*/

/**
* Wraps up the functionality needed to make the cockpit UI for a spaceship
* @constructor
*/
function CockpitUI()
{
    /**
    * The DOM element for the front radar
    * @type {?Element}
    * @private
    */
    this._frontRadarElem = null;
    
    /**
    * The DOM element for the rear radar
    * @type {?Element}
    * @private
    */
    this._rearRadarElem = null;
    
    /**
    * The Raphael paper object for the front radar
    * @private
    */
    this._frontRadarPaper = null;
    
    /**
    * The map of IDs to blip circles for the front radar
    * @type {Object.<string, Object>}
    * @private
    */
    this._frontBlipElemMap = new Object();
    
    /**
    * The Raphael paper object for the rear radar
    * @private
    */
    this._rearRadarPaper = null;
    
    /**
    * The map of IDs to blip circles for the rear radar
    * @type {Object.<string, Object>}
    * @private
    */
    this._rearBlipElemMap = new Object();
    
    /**
    * The hoop; if any; of the hoop to mark with a blip on radar
    * @type {?Hoop}
    */
    this.HoopForBlip = null;
    
    /**
    * The hitpoint bar border element
    * @type {?Element}
    * @private
    */
    this._hpBarBorder = null;
    
    /**
    * The hitpoint bar div element that shows the remaining HP
    * @type {?Element}
    * @private
    */
    this._hpBar = null;
    
    /**
    * The normalized HP amount remaining. Cached so we only need to update the HP bar when it changes/
    * @type {!number}
    * @private
    */
    this._hpRemaining = 1;
    
    /**
    * The ship for which the UI is being displayed
    * @type {?Spaceship}
    * @private
    */
    this._owningShip = null;


}

/**
* The radius of the radar view
* @type {!number}
* @const
*/
CockpitUI.FrontRadarRadius = 99;

/**
* The distance to which the radar can detect ships
* @type {!number}
* @const
*/
CockpitUI.RadarRange = 2000;
CockpitUI.RadarRangeSq = CockpitUI.RadarRange * CockpitUI.RadarRange;

CockpitUI.BlipElemNamePrefix = "RadarBlip_Ship";

/**
* The ID of the blip used for hoops
* @type {!string}
* @const
* @private
*/
CockpitUI.HoopBlipId = "HoopBlip";


CockpitUI.prototype =
{
    /**
    * Hook up the cockpit UI to the necessary DOM elements
    */
    InitFromDOM: function()
    {
        // Put the radars in the upper corers and add a label
        //this._frontRadarElem = document.getElementById( "FrontRadar" );

        this._frontRadarElem = $( ".front-radar" )[0];

        this._rearRadarElem = $( ".rear-radar" )[0];

        //this._frontRadarElem.style.left = "0px";
        //this._rearRadarElem.style.right = "0px";

        CockpitUI.FrontRadarRadius = this._frontRadarElem.clientWidth / 2;
        CockpitUI.RearRadarRadius = this._rearRadarElem.clientWidth / 2;

        this._frontRadarPaper = Raphael( this._frontRadarElem, this._frontRadarElem.clientWidth, this._frontRadarElem.clientHeight );
        this._rearRadarPaper = Raphael( this._rearRadarElem, this._rearRadarElem.clientWidth, this._rearRadarElem.clientHeight );

        /*
        var radarLabel = document.createElement( "div" );
        radarLabel.className = "UILabel";
        radarLabel.innerHTML = "Front";
        radarLabel.style.left = "2px";
        radarLabel.style.top = "0px";
        this._frontRadarElem.appendChild( radarLabel );
        */

        /*
        radarLabel = document.createElement( "div" );
        radarLabel.className = "UILabel";
        radarLabel.innerHTML = "Rear";
        radarLabel.style.right = "2px";
        radarLabel.style.top = "0px";
        this._rearRadarElem.appendChild( radarLabel );
        */

        // Hook up the HP bar
        this._hpBarBorder = document.getElementById( "HPBar" );
        this._hpBar = document.createElement( "div" );
        this._hpBar.className = "HPBar";
        this._hpBarBorder.appendChild( this._hpBar );

        var hpLabel = document.createElement( "div" );
        hpLabel.className = "UILabel";
        hpLabel.innerHTML = "Shields";
        hpLabel.style.bottom = "-22px";
        hpLabel.style.left = "-15px";
        this._hpBarBorder.appendChild( hpLabel );

        // Center the crosshairs
        //var crosshairsElem = document.getElementById( "Crosshairs" );
        //crosshairsElem.style.left = ( window.innerWidth - crosshairsElem.clientWidth ) / 2 + 'px';
        //crosshairsElem.style.top = ( window.innerHeight - crosshairsElem.clientHeight ) / 2 + 'px';
    },


    /**
    * Release resources created in Init()
    */
    Term: function()
    {
        var elementsToClear = [this._frontRadarElem,
                            this._rearRadarElem,
                            this._hpBarBorder];

        for( var elemIndex = 0; elemIndex < elementsToClear.length; ++elemIndex )
            Util.RemoveAllChildren( elementsToClear[elemIndex] );
    },


    /**
    * Hook up this UI to a ship so it shows that ship's status
    */
    HookUpToShip: function( ship )
    {
        this._owningShip = ship;
    },


    /**
    * Update the radar based on the current owning ship's position and orienation
    */
    Update: function()
    {
        // If the UI isn't attached to a ship then do nothing
        if( this._owningShip == null )
            return;

        if( this.HoopForBlip )
        {
            this.UpdateBlipRadarPosition( this.HoopForBlip.Position, CockpitUI.HoopBlipId )
        }

        // Go through the ship's in the game simulation
        var allShips = XhtmlWingGame.MainGame._ships;
        for( var curShipIndex = 0; curShipIndex < allShips.length; ++curShipIndex )
        {
            var curShip = allShips[curShipIndex];

            // Skip ourself
            if( curShip == this._owningShip )
                continue;

            this.UpdateBlipRadarPosition( curShip.Position, CockpitUI.BlipElemNamePrefix + curShip.UniqueId );
        }

        // If the HP changed
        if( ( this._owningShip.HullHP / this._owningShip.HullMaxHP ) != this._hpRemaining )
        {
            this._hpRemaining = ( this._owningShip.HullHP / this._owningShip.HullMaxHP );
            //var hpBarColor =
            this._hpBar.style.height = ( this._hpRemaining * 100 ) + "%";

            $("#front-shield-gauge").css("height", ( this._hpRemaining * 100 ) + "%");
        }
    },


    /**
    * Update a blip on the radar
    * @param {!THREE.Vector3} blipPos The position for the blip
    * @param {!string} blipId A string ID used to identify the blip. This way we can make sure a blip in only on the front or back, not both.
    */
    UpdateBlipRadarPosition: function( blipPos, blipId )
    {
        var ownerToShip = new THREE.Vector3();
        ownerToShip.subVectors( blipPos, this._owningShip.Position );

        // If this ship is out of range then hide it
        if( ownerToShip.lengthSq() > CockpitUI.RadarRangeSq )
        {
            this.HideBlip( blipId );
            return;
        }

        var isShipInFront = ownerToShip.dot( this._owningShip.Forward ) > 0;

        var blipCircle = this.GetOrCreateRadarBlip( blipId, isShipInFront );

        var blipRadius = ( CockpitUI.RadarRangeSq - ownerToShip.lengthSq() ) / CockpitUI.RadarRangeSq;
        blipRadius = ( blipRadius * 5 ) + 2;
        blipCircle.attr( 'r', blipRadius );

        ownerToShip.normalize();

        // Project the vector onto our forward plane
        Util.ProjectVectorOntoPlane( ownerToShip, this._owningShip.Forward );

        var radarPos = new THREE.Vector2( ownerToShip.dot( this._owningShip.Right ) / -this._owningShip.Right.lengthSq(),
                                            ownerToShip.dot( this._owningShip.Up ) / this._owningShip.Up.lengthSq() );

        //radarPos.multiplyScalar( 1 / CockpitUI.RadarRange );


        if( radarPos.lengthSq() > 1 )
            radarPos.normalize();

        if( isShipInFront )
        {
            radarPos.multiplyScalar( -CockpitUI.FrontRadarRadius );

            blipCircle.attr( 'cx', radarPos.x + ( this._frontRadarElem.clientWidth / 2 ) );
            blipCircle.attr( 'cy', radarPos.y + ( this._frontRadarElem.clientHeight / 2 ) );
        }
        else
        {
            radarPos.multiplyScalar( -CockpitUI.RearRadarRadius );

            blipCircle.attr( 'cx', radarPos.x + ( this._rearRadarElem.clientWidth / 2 ) );
            blipCircle.attr( 'cy', radarPos.y + ( this._rearRadarElem.clientHeight / 2 ) );
        }
    },


    /**
    * Invoked when a ship is removed from the active game simulation so its radar blip can be removed
    * @param {!string} shipId This ship's unique ID
    */
    OnShipRemoveFromSim: function( shipId )
    {
        var blipElemId = CockpitUI.BlipElemNamePrefix + shipId;

        // If a blip has been created for this ship
        if( this._frontBlipElemMap[blipElemId] != null )
        {
            this._frontBlipElemMap[blipElemId].hide();
            this._rearBlipElemMap[blipElemId].hide();
        }
    },


    /**
    * Remove a blip from radar
    * @param {!string} blipElemId The ID of the blip to remove from radar
    */
    HideBlip: function( blipElemId )
    {
        // We only need to check for existance in one of the maps since when a blip is created,
        // it's created in both maps
        if( this._frontBlipElemMap[blipElemId] != null )
        {
            this._frontBlipElemMap[blipElemId].remove();
            this._frontBlipElemMap[blipElemId] = null;

            this._rearBlipElemMap[blipElemId].remove();
            this._rearBlipElemMap[blipElemId] = null;
        }
    },


    /**
    * Get a blip object from its ID, or create it if it doesn't yet exist. The blip on the opposite radar will be hidden.
    * @param {!string} blipElemId The ID of the blip to retrieve
    * @param {!boolean} getFront True to retrieve the blip from the front radar, false for the rear radar
    */
    GetOrCreateRadarBlip: function( blipElemId, getFront )
    {
        // If the blip doesn't exist yet, then create it
        if( this._frontBlipElemMap[blipElemId] == null )
        {
            var blipColor;
            if( blipElemId == CockpitUI.HoopBlipId )
                blipColor = Hoop.Color_NextStr
            else
            {
                // If this blip is for a ship
                if( blipElemId.indexOf( CockpitUI.BlipElemNamePrefix ) === 0 )
                {
                    var shipId = parseInt( blipElemId.substr( CockpitUI.BlipElemNamePrefix.length ) );

                    var ship = XhtmlWingGame.MainGame.GetShipById( shipId );
                    if( ship && ship.IsGoodGuy )
                        blipColor = "#20F02A"
                }
            }

            this.CreateBlipElem( blipElemId, blipColor || "red" );
        }

        var frontBlipElem = this._frontBlipElemMap[blipElemId];
        var rearBlipElem = this._rearBlipElemMap[blipElemId];

        // Get the request blip and hide the opposite one
        var requestedBlipElem;
        if( getFront )
        {
            requestedBlipElem = frontBlipElem;
            rearBlipElem.hide();
        }
        else
        {
            requestedBlipElem = rearBlipElem;
            frontBlipElem.hide();
        }

        requestedBlipElem.show();

        return requestedBlipElem;
    },


    /**
    * Create a blip for the front and rear radars
    * @param {!string} blipElemId The ID of the blip to create
    * @param {!string} colorVal The color of the blip to create
    */
    CreateBlipElem: function( blipElemId, colorVal )
    {
        var blipElem = this._frontRadarPaper.circle( 0, 0, 5 );
        blipElem.attr( "fill", colorVal );

        this._frontBlipElemMap[blipElemId] = blipElem;

        blipElem = this._rearRadarPaper.circle( 0, 0, 5 );
        blipElem.attr( "fill", colorVal );

        this._rearBlipElemMap[blipElemId] = blipElem;
    }
};