/*
Copyright (c) 2011 Taylor Clark.

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
*/

/**
* Represents a hoop that the player can fly through
* @param {?THREE.Vector3} pos The position of the hoop, defaults to (0,0,0)
* @param {?THREE.Vector3} forward The direction of the hoop's opening, defaults to (0,0,1)
* @constructor
*/
function Hoop( pos, forward )
{
    /**
    * The position of the hoop
    * @type {!THREE.Vector3}
    * @public
    */
    this.Position = pos ? pos : new THREE.Vector3();

    /**
    * The normalized direction of the hoop's opening
    * @type {!THREE.Vector3}
    * @public
    */
    this.Forward = forward ? forward : new THREE.Vector3( 0, 0, 1 );

    // The radius of the hoop
    this.BoundRadius = 100;
    this.BoundRadiusSq = this.BoundRadius * this.BoundRadius;

    this.Mesh = new THREE.Mesh( new THREE.TorusGeometry( this.BoundRadius, 20, 8, 32 ), Hoop.Material_Incomplete );

    var up = Util.GetRandomOrthVector( this.Forward );

    this.Mesh.position = this.Position;
    this.Mesh.rotation.setFromRotationMatrix( Util.MakeOrientationMatrix( up, this.Forward ) );
    //this.Mesh.rotation.setEulerFromRotationMatrix( Util.MakeOrientationMatrix( up, this.Forward ) );

    this.HasBeenPassedThrough = false;
}

/**
* The color for the next hoop the player must go through
* @type {!number}
* @const
*/
Hoop.Color_Next = 0x20F02A;
Hoop.Color_NextStr = "#20F02A";
Hoop.Material_Next = new THREE.MeshBasicMaterial( { color: 0x20F02A, ambient: 0x20F02A, wireframe: false } );

/**
* The color for a hoop that has not yet been activated or completed
* @type {!number}
* @const
*/
Hoop.Material_Incomplete = new THREE.MeshLambertMaterial( { color: 0x555555, ambient: 0x555555, wireframe: false } );

// The color for a hoop that the player has passed through
Hoop.Color_Complete = 0x1D89EE;
Hoop.Material_Complete = new THREE.MeshBasicMaterial( { color: 0x1D89EE, wireframe: false } );



Hoop.prototype =
{
    /**
    * Update the hoop's passed-through state based on a ship's old and new position to determine
    * if the ship passed through this hoop
    // @return {!boolean} True if the ship passed through this hoop at this update
    */
    UpdatePassedThrough: function( oldPos, newPos )
    {
        var toNew = newPos.clone().sub( this.Position );

        // If the ship is not close to the hoop then ignore it
        if( toNew.lengthSq() > this.BoundRadiusSq )
            return false;

        var toOld = oldPos.clone().sub( this.Position );

        // If the two dot products have opposite signs (Inidicated by a product less than zero) the
        // ship passed through
        if( toOld.dot( this.Forward ) * toNew.dot( this.Forward ) < 0 )
        {
            //this.Mesh.material.color = new THREE.Color( Hoop.Color_Complete );
            this.Mesh.material = Hoop.Material_Complete;

            this.HasBeenPassedThrough = true;

            return true;
        }

        return false;
    }
};


function HoopList()
{
    this.hoops = [];

    this.activeHoopIndex = 0;

    this.onComplete = null;
}


HoopList.prototype =
{
    initAlongSpline: function(spline, numHoops, onComplete)
    {
        var hoops = HoopList.makeHoopsAlongSpline( spline, numHoops );

        this.init( hoops, onComplete );
    },


    initAlongRay: function(start, dir, numHoops, onComplete)
    {
        var hoops = HoopList.makeHoopsAlongRay( start, dir, numHoops );

        this.init( hoops, onComplete );
    },


    init:function( hoops, onComplete )
    {
        this.hoops = hoops;

        this.onComplete = onComplete;

        // Add the hoop meshes to the scene
        var scene = XhtmlWingGame.MainGame._scene;
        for( var hoopIndex = 0; hoopIndex < this.hoops.length; ++hoopIndex )
            scene.add( this.hoops[hoopIndex].Mesh );

        // Make the first hoop the proper color
        this.activeHoopIndex = 0;

        //this.hoops[0].Mesh.material.color = new THREE.Color( Hoop.Color_Next );
        this.hoops[0].Mesh.material = Hoop.Material_Next;
    },


    updatePassThrough:function( prevPos, pos )
    {
        if( this.hoops.length === 0 || this.activeHoopIndex >= this.hoops.length )
            return;

        // If the player passed through the currently active hoop
        var curHoop = this.hoops[this.activeHoopIndex];
        if( curHoop.UpdatePassedThrough( prevPos, pos ) )
        {
            if( Main.CurPlayerInfo.Setting_PlaySounds && HoopList.hoopClearedSound )
                HoopList.hoopClearedSound.play();

            ++this.activeHoopIndex;

            // If the player cleared all of the hoops
            if( this.activeHoopIndex >= this.hoops.length )
            {
                if( this.onComplete )
                    this.onComplete();

                return;
            }
            else
            {
                //this.hoops[this.activeHoopIndex].Mesh.material.color = new THREE.Color( Hoop.Color_Next );
                this.hoops[this.activeHoopIndex].Mesh.material = Hoop.Material_Next;

                XhtmlWingGame.MainGame._cockpitUI.HoopForBlip = this.hoops[this.activeHoopIndex];
            }
        }
    },

    remove:function()
    {
        var scene = XhtmlWingGame.MainGame._scene;
        for( var hoopIndex = 0; hoopIndex < this.hoops.length; ++hoopIndex )
            scene.remove( this.hoops[hoopIndex].Mesh );

        this.hoops = [];
        this.activeHoopIndex = 0;
    }
};


HoopList.hoopClearedSound = null;

HoopList.makeHoopsAlongSpline = function( spline, numHoops )
{
    var timeStep = 0.95 / ( numHoops - 1 );

    var hoops = [];

    for( var curTime = 0; curTime < 1.0; curTime += timeStep )
    {
        // spline.getPoint does not return a valid Vector3 object so create one here
        var pos = spline.getPoint( curTime );
        pos = new THREE.Vector3( pos.x, pos.y, pos.z );

        // Forward is found by take a point further along the path and subtracting the start point
        var forward = new THREE.Vector3();
        forward.subVectors( spline.getPoint( curTime + 0.02 ), pos );
        forward.normalize();

        hoops.push( new Hoop( pos, forward ) );
    }

    return hoops;
};


HoopList.makeHoopsAlongRay = function( start, dir, numHoops )
{
    var timeStep = 0.95 / ( numHoops - 1 );

    var hoops = [];

    var forward = dir.clone();
    forward.normalize();

    for( var curTime = 0; curTime < 1.0; curTime += timeStep )
    {
        // Get a point along the ray
        var pos = dir.clone();
        pos.multiplyScalar( curTime );
        pos.add( start );
        
        hoops.push( new Hoop( pos, forward ) );
    }

    return hoops;
};