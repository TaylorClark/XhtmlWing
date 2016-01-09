/*
Copyright (c) 2011 Taylor Clark.

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
*/

/**
* Represents a spaceship that can be controlled by a player or AI
* @param {?boolean} isPlayersShip Indicates if this is the player's ship and, if so, doesn't add a mesh for the ship
* @constructor
*/
function Spaceship( isPlayersShip, shipTypeName )
{
    /**
    * The position of the ship
    * @type {!THREE.Vector3}
    * @public
    */
    this.Position = new THREE.Vector3();

    /**
    * WebGL, like OpenGL, uses a right-handed coordinate system so positive Z points towards the viewer
    * @type {!THREE.Vector3}
    * @public
    */
    this.Forward = new THREE.Vector3( 0, 0, -1 );

    /**
    * The up vector for the ship
    * @type {!THREE.Vector3}
    * @public
    */
    this.Up = new THREE.Vector3( 0, 1, 0 );

    /**
    * Right is always computed from the forward and up vectors
    * @type {!THREE.Vector3}
    * @public
    */
    this.Right = new THREE.Vector3();
    this.Right.crossVectors( this.Forward, this.Up );

    /**
    * The amount of time between shots, in seconds
    * @type {!number}
    * @public
    */
    this.RateOfFire = 0.4;

    /**
    * The amount of time the remaining before the weapons can shoot again
    * @type {!number}
    * @private
    */
    this._fireTimer = 0.0;

    // The bounding radius used for collision
    this.BoundingRadius = 25;
    this.BoundingRadiusSq = this.BoundingRadius * this.BoundingRadius;

    this.isPlayersShip = isPlayersShip;
    if ( !isPlayersShip )
    {
        //this.BoundingSphereMesh = new THREE.Mesh( new THREE.SphereGeometry( this.BoundingRadius ), new THREE.MeshBasicMaterial( { color: 0xFF4444, wireframe: true } ) );
        //XhtmlWingGame.MainGame._scene.add( this.BoundingSphereMesh );
    }

    this.HullMaxHP = 100;
    if( isPlayersShip )
        this.HullMaxHP = 200;

    this.HullHP = this.HullMaxHP;

    // Player info
    if( isPlayersShip )
    {
        this.FrontShieldHP = this.HullMaxHP;
        this.RearShieldHP = this.HullMaxHP;
        this.FrontArmorHP = this.HullMaxHP;
        this.RearArmorHP = this.HullMaxHP;

        $( ".front-shield-gauge" ).css( "height", "100%" );
        $( ".rear-shield-gauge" ).css( "height", "100%" );
        $( ".front-armor-gauge" ).css( "height", "100%" );
        $( ".rear-armor-gauge" ).css( "height", "100%" );
    }

    this.IsGoodGuy = false;

    // A flag indicating if the player wants to shoot
    this.IsTriggerPulled = false;

    // A flag to indicate if the ship is controlled by joystick-style input or simply by heading
    // towards a target direction
    this.TargetHeading = null;

    // The scalars the adjust the various outputs of the ship
    this.EnginePowerScalar = 0.5;
    this.EnginePowerNumerator = 4;
    this.LaserPowerScalar = 0.5;
    this.LaserPowerNumerator = 2;
    this.ShieldPowerScalar = 0.5;
    this.ShieldPowerNumerator = 2;

    // The max speed when engine output is 100% and max speed when engine output is 0%
    this.EngineSpeed_FullOutput = 150.0;
    this.EngineSpeed_ZeroOuput = 75.0;
    this.EngineSpeed_OutputScalar = this.EngineSpeed_FullOutput - this.EngineSpeed_ZeroOuput;

    this.Throttle = 1.0;
    this.TargetSpeed = 0;
    this.Speed = 0;
    this.AccelerationRate = 25;

    // Initialize the engine
    this.AdjustEngineOutput( '' );

    this.Speed = this.TargetSpeed;
    $( "#SpeedLabel" ).text( Math.round( this.Speed ) );

    this.TurnSpeed = 0.4 * Math.PI;


    this.ShipType = Spaceship.ShipTypes[shipTypeName] || Spaceship.ShipTypes.Normal;

    // Rotation speed about each axis: X=pitch, Y = Yaw, Z = Roll
    this.PitchYawRollSpeed = new THREE.Vector3();

    // Store the ship's position at the end of last frame so we can detect when a ship goes through a hoop
    this.PreviousPosition = this.Position.clone();

    this.Mesh = null;
    if ( !isPlayersShip && XhtmlWingGame.MainGame._loadedGeometries["Normal"] )
        this.UpdateFromGeometry( "Normal", XhtmlWingGame.MainGame._loadedGeometries["Normal"], false );

    /**
    * The array of where bullets are spawned relative to the ship's origin
    * @type Array.<ShipWeapon>
    */
    this.Weapons = [];

    if ( XhtmlWingGame.MainGame._isStarWarsGame && this.ShipType === Spaceship.ShipTypes.XWing )
    {
        var xOffset = 23;
        var yOffset = 5;

        this.Weapons.push( new ShipWeapon( this, new THREE.Vector3( -xOffset, -yOffset, 0 ) ) );
        this.Weapons.push( new ShipWeapon( this, new THREE.Vector3( xOffset, -yOffset, 0 ) ) );
        this.Weapons.push( new ShipWeapon( this, new THREE.Vector3( xOffset, yOffset, 0 ) ) );
        this.Weapons.push( new ShipWeapon( this, new THREE.Vector3( -xOffset, yOffset, 0 ) ) );
    }
    else
    {
        this.Weapons.push( new ShipWeapon( this, new THREE.Vector3( -5, -5, 0 ) ) );
        this.Weapons.push( new ShipWeapon( this, new THREE.Vector3( 5, -5, 0 ) ) );
    }

    // Store a unique ID for each ship so it can be accessed and referenced easily
    this.UniqueId = Spaceship.NextUniqueId++;

    // The index within Weapons that should be used to fire the next laser
    this.NextWeaponToUse = 0;
}

Spaceship.ShipTypes =
{
    Normal: { value: 0, name: "Normal" },
    XWing: { value: 1, name: "XWing" },
    Tie: { value: 2, name: "Tie" },
    VadersTie: { value: 3, name: "VadersTie" }
};

// The ID to assign to the next spaceship created
Spaceship.NextUniqueId = 1;

Spaceship.EngineBarTop = 18.5;
Spaceship.EngineBarHeight = 20.5;


Spaceship.prototype =
{
    /**
    * Update the ship's position and orientation
    * @param {!number} frameTime The amount of time elapsed, in seconds, since the last update
    */
    Update: function ( frameTime )
    {
        this.ClampPYRSpeedVector();

        // If this ship auto-navigates to a target position
        if ( this.TargetHeading )
        {
            var turnAxis = new THREE.Vector3();
            turnAxis.crossVectors( this.Forward, this.TargetHeading );

            // If the ship needs to flip around
            if ( turnAxis.lengthSq() < 0.001 )
            {
                // Then pull up
                turnAxis = this.Right;
            }
            else
                turnAxis.normalize();

            var turnMatrix = new THREE.Matrix4();
            turnMatrix.makeRotationAxis( turnAxis, this.TurnSpeed * frameTime );

            this.Up.applyMatrix4( turnMatrix );
            this.Forward.applyMatrix4( turnMatrix );
        }
        // Otherwise use the joystick input
        else
        {
            // Update the ship's orientation
            //var rotateAmount = this.PitchYawRollSpeed.clone();
            //rotateAmount.multiplyScalar( frameTime );

            var rollMatrix = new THREE.Matrix4();
            rollMatrix.makeRotationAxis( this.Forward, this.PitchYawRollSpeed.z * this.TurnSpeed * frameTime );

            var yawMatrix = new THREE.Matrix4();
            yawMatrix.makeRotationAxis( this.Up, this.PitchYawRollSpeed.y * this.TurnSpeed * frameTime );

            var transformMatrix = new THREE.Matrix4();
            transformMatrix.makeRotationAxis( this.Right, this.PitchYawRollSpeed.x * this.TurnSpeed * frameTime );
            transformMatrix.multiply( rollMatrix );
            transformMatrix.multiply( yawMatrix );

            //rotateMatrix.setRotationFromEuler( rotateAmount );
            this.Up.applyMatrix4( transformMatrix );
            this.Forward.applyMatrix4( transformMatrix );
        }

        // Recalculate right
        this.Right.crossVectors( this.Forward, this.Up );
        this.Right.normalize();

        // If we need to adjust our speed
        if ( this.Speed != this.TargetSpeed )
        {
            var diff = this.TargetSpeed - this.Speed;

            var accelerateAmount = this.AccelerationRate * frameTime;
            if ( accelerateAmount > Math.abs( diff ) )
                this.Speed = this.TargetSpeed;
            else
                this.Speed += accelerateAmount * ( diff < 0 ? -1 : 1 );

            if( this.isPlayersShip )
            {
                $( "#SpeedLabel" ).text( Math.round( this.Speed ) );
                $( ".speed" ).text( Math.round( this.Speed ) );
            }
        }

        // Recharge the lasers
        var MaxRechargeRate = 0.1;
        var rechargeRate = MaxRechargeRate * this.LaserPowerScalar * frameTime;
        for ( var weaponIndex = 0; weaponIndex < this.Weapons.length; ++weaponIndex )
        {
            var curWeapon = this.Weapons[weaponIndex];
            if ( curWeapon.EnergyLevel >= 1 )
                continue;

            curWeapon.EnergyLevel += rechargeRate;
            if ( curWeapon.EnergyLevel > 1 )
                curWeapon.EnergyLevel = 1;

            // If this is the player's ship
            if ( this === XhtmlWingGame.MainGame._playerShip )
            {
                if( weaponIndex == 0 )
                {
                    var laserBar = $( ".right-laser-gauge" );
                    
                    var newLeft = Math.floor( 100 * curWeapon.EnergyLevel );
                    laserBar.css( { width: newLeft + "%" } );
                }
                else
                {
                    var laserBar = $( ".left-laser-gauge" );

                    var newLeftPercent = Math.floor(( 1 - curWeapon.EnergyLevel ) * 100 );
                    laserBar.css( { left: newLeftPercent + "%" } );
                    laserBar.width(( 100 - newLeftPercent ) + "%" );
                }
            }
        }

        // Recharge the shields
        if( this.isPlayersShip )
        {
            var rechargeAmount = this.ShieldPowerScalar * 10 * frameTime;

            if( this.FrontShieldHP < this.HullMaxHP )
            {
                this.FrontShieldHP += rechargeAmount;
                if( this.FrontShieldHP > this.HullMaxHP )
                    this.FrontShieldHP = this.HullMaxHP;

                var percentRemaining = this.FrontShieldHP / this.HullMaxHP;
                $( ".front-shield-gauge" ).css( "height", Math.floor( percentRemaining * 100 ) + "%" );
            }

            if( this.RearShieldHP < this.HullMaxHP )
            {
                this.RearShieldHP += rechargeAmount;
                if( this.RearShieldHP > this.HullMaxHP )
                    this.RearShieldHP = this.HullMaxHP;

                var percentRemaining = this.RearShieldHP / this.HullMaxHP;
                $( ".rear-shield-gauge" ).css( "height", Math.floor( percentRemaining * 100 ) + "%" );
            }
        }

        // Update the ship's position
        var moveAmount = this.Forward.clone();
        moveAmount.multiplyScalar( this.Speed * frameTime );

        this.PreviousPosition = this.Position.clone();

        this.Position.add( moveAmount );

        if ( this.Mesh )
        {
            this.Mesh.position = this.Position;
            this.Mesh.rotation = this.GetOrientationEuler();

            //this.Mesh.useQuaternion = true;
            //this.Mesh.quaternion = this.GetOrientationQuat();

            //this.Mesh.matrixAutoUpdate = false;
            //this.Mesh.matrix = this.GetTransform();
        }

        if ( this.BoundingSphereMesh )
            this.BoundingSphereMesh.position = this.Position;

        this._fireTimer -= frameTime;

        // If the player is holding the trigger down to fire this ship's weapons
        if ( this.IsTriggerPulled )
        {
            // If enough cool down has passed then we can shoot again
            if ( this._fireTimer < 0 )
                this.FireNextWeapon();
        }
    },

    /**
    * Fire a laser
    */
    FireNextWeapon: function ()
    {
        var game = XhtmlWingGame.MainGame;

        var LaserShotCost = 0.125;
        var curWeapon = this.Weapons[this.NextWeaponToUse];

        if ( curWeapon.EnergyLevel < LaserShotCost )
            return;

        game._lasers.push( new Laser( this ) );

        if ( this === game._playerShip )
        {
            if ( Main.CurPlayerInfo.Setting_PlaySounds )
            {
                if ( curWeapon === this.Weapons[0] )
                {
                    game._laserSound.play();

                    curWeapon.EnergyLevel -= LaserShotCost;

                    var laserBar = $( ".right-laser-gauge" );
                    
                    var newLeft = Math.floor( 100 * curWeapon.EnergyLevel );
                    laserBar.css( { width: newLeft + "%" } );
                }
                else
                {
                    game._laserSound2.play();

                    curWeapon.EnergyLevel -= LaserShotCost;

                    var laserBar = $( ".left-laser-gauge" );

                    var newLeftPercent = Math.floor( (1 - curWeapon.EnergyLevel ) * 100 );
                    laserBar.css( { left: newLeftPercent + "%" } );
                    laserBar.width( (100 - newLeftPercent) + "%" );
                }
            }
        }

        this._fireTimer = this.RateOfFire;

    },


    /**
    * Called after all of the required models have been loaded for the game. This is the ship's
    * chance to instantiate its mesh object using the loaded geometries.
    */
    UpdateFromGeometry: function ()
    {
        // Do nothing if this ship already has a mesh
        var geometry = XhtmlWingGame.MainGame._loadedGeometries[this.ShipType.name];
        if ( this.Mesh || !geometry )
            return;

        // Each ship needs its own material so we can make them disappear
        var newMaterial;
        if ( XhtmlWingGame.MainGame._isStarWarsGame )
            newMaterial = new THREE.MeshFaceMaterial( geometry.materials );
        else
            newMaterial = new THREE.MeshLambertMaterial( { map: THREE.ImageUtils.loadTexture( 'models/Sfighter_03_CLR.png' ), wireframe: false } );

        this.Mesh = new THREE.Mesh( geometry, newMaterial );

        XhtmlWingGame.MainGame._scene.add( this.Mesh );
    },

    /**
    * Adjust the shield energy and charge focus
    */
    AdjustShield: function ( adjustType )
    {
        var shieldSwitch = $( "#ShieldSwitch" );

        switch ( adjustType )
        {
            case 'F':
                {
                    shieldSwitch.css( { top: "71.5%" } );
                }
                break;

            case 'M':
                {
                    shieldSwitch.css( { top: "76.7%" } );
                }
                break;

            case 'R':
                {
                    shieldSwitch.css( { top: "81.5%" } );
                }
                break;
        }
    },


    /**
    * Adjust the speed
    */
    AdjustThrottle: function ()
    {
        this.Throttle -= 0.25;

        if ( this.Throttle < 0 )
            this.Throttle = 1;

        if( this.isPlayersShip )
        {
            var FullHeightPercent = 22;
            $( "#ThrottleBar" ).width(( FullHeightPercent * this.Throttle ) + "%" );

            //$( ".throttle" ).height( Math.floor( this.Throttle * 100 ) + "%" );
            $( ".throttle" ).animate( { height: Math.floor( this.Throttle * 100 ) + "%" }, XhtmlWingGame.AnimationDuration );
        }

        this.UpdateTargetSpeed();
    },


    /**
    * Update this ship once it has been hit by a laser
    * @param {!Laser} laser The laser that hit the ship
    */
    AdjustEngineOutput: function ( outputAdjustType )
    {
        switch ( outputAdjustType )
        {
            // Adjust engine output
            case 'E':
                {
                    // If we're increasing engine output
                    if ( this.EnginePowerNumerator <= 6 )
                    {
                        this.EnginePowerNumerator += 2;

                        if ( this.LaserPowerNumerator > 0 && this.ShieldPowerNumerator > 0 )
                        {
                            --this.LaserPowerNumerator;
                            --this.ShieldPowerNumerator;
                        }
                        else if ( this.LaserPowerNumerator > 1 )
                        {
                            this.LaserPowerNumerator -= 2;
                        }
                        else //if ( this.ShieldPowerNumerator > 1 )
                        {
                            this.ShieldPowerNumerator -= 2;
                        }
                    }
                        // Set the engine output to 0
                    else
                    {
                        this.EnginePowerNumerator = 0;
                        this.LaserPowerNumerator = 4;
                        this.ShieldPowerNumerator = 4;
                    }
                }
                break;

            case 'L':
                {
                    if ( this.LaserPowerNumerator <= 3 )
                    {
                        ++this.LaserPowerNumerator;
                        --this.EnginePowerNumerator;
                    }
                    else
                    {
                        this.LaserPowerNumerator = 0;
                        this.EnginePowerNumerator += 4;
                    }
                }
                break;

            case 'S':
                {
                    if ( this.ShieldPowerNumerator <= 3 )
                    {
                        ++this.ShieldPowerNumerator;
                        --this.EnginePowerNumerator;
                    }
                    else
                    {
                        this.ShieldPowerNumerator = 0;
                        this.EnginePowerNumerator += 4;
                    }
                }
                break;
        }

        this.EnginePowerScalar = this.EnginePowerNumerator / 8;
        this.LaserPowerScalar = this.LaserPowerNumerator / 4;
        this.ShieldPowerScalar = this.ShieldPowerNumerator / 4;

        // The percent heights
        var engineHeight = Spaceship.EngineBarHeight * this.EnginePowerScalar;
        var laserHeight = Spaceship.EngineBarHeight * this.LaserPowerScalar;
        var shieldHeight = Spaceship.EngineBarHeight * this.ShieldPowerScalar;

        // Offset the top
        $( "#EngineBar" ).css( "top", ( Spaceship.EngineBarTop + Spaceship.EngineBarHeight - engineHeight ) + "%" );
        $( "#LaserBar" ).css( "top", ( Spaceship.EngineBarTop + Spaceship.EngineBarHeight - laserHeight ) + "%" );
        $( "#ShieldBar" ).css( "top", ( Spaceship.EngineBarTop + Spaceship.EngineBarHeight - shieldHeight ) + "%" );

        // Set the heights based on the scalar
        $( "#EngineBar" ).height( engineHeight + "%" );
        $( "#LaserBar" ).height( laserHeight + "%" );
        $( "#ShieldBar" ).height( shieldHeight + "%" );
        /*
        $( ".engine-output-full" ).height( Math.floor( this.EnginePowerScalar * 100 ) + "%" );
        $( ".laser-output-full" ).height( Math.floor( this.LaserPowerScalar * 100 ) + "%" );
        $( ".shield-output-full" ).height( Math.floor( this.ShieldPowerScalar * 100 ) + "%" );
        */

        $( ".engine-output-full" ).animate( { height: Math.floor( this.EnginePowerScalar * 100 ) + "%" }, XhtmlWingGame.AnimationDuration );
        $( ".laser-output-full" ).animate( { height: Math.floor( this.LaserPowerScalar * 100 ) + "%" }, XhtmlWingGame.AnimationDuration );
        $( ".shield-output-full" ).animate( { height: Math.floor( this.ShieldPowerScalar * 100 ) + "%" }, XhtmlWingGame.AnimationDuration );
        
        this.UpdateTargetSpeed();
    },


    /**
    * Recalculate the target speed based on throttle and engine power
    */
    UpdateTargetSpeed: function ()
    {
        this.TargetSpeed = this.Throttle * ( ( this.EngineSpeed_OutputScalar * this.EnginePowerScalar ) + this.EngineSpeed_ZeroOuput );
    },


    /**
    * Update this ship once it has been hit by a laser
    * @param {!Laser} laser The laser that hit the ship
    */
    HandleLaserHit: function ( laser )
    {
        if( this.isPlayersShip )
        {
            // Is the shield in front
            var toLaser = laser.Mesh.position.clone().sub( this.Position );
            var isInFront = toLaser.dot( this.Forward ) > 0;
        
            if( isInFront )
            {
                this.FrontShieldHP -= laser.Damage;

                if( this.FrontShieldHP < 0 )
                {
                    this.FrontArmorHP -= -this.FrontShieldHP;
                    this.FrontShieldHP = 0;

                    var percentRemaining = this.FrontArmorHP / this.HullMaxHP;
                    $( ".front-armor-gauge" ).css( "height", Math.floor( percentRemaining * 100 ) + "%" );

                    if( this.FrontArmorHP <= 0 )
                        this.HullHP = -1;
                }

                var percentRemaining = this.FrontShieldHP / this.HullMaxHP;
                $( ".front-shield-gauge" ).css( "height", Math.floor( percentRemaining * 100 ) + "%" );
            }
            else
            {
                this.RearShieldHP -= laser.Damage;

                if( this.RearShieldHP < 0 )
                {
                    this.RearArmorHP -= -this.RearShieldHP;
                    this.RearShieldHP = 0;

                    var percentRemaining = this.RearArmorHP / this.HullMaxHP;
                    $( ".rear-armor-gauge" ).css( "height", Math.floor( percentRemaining * 100 ) + "%" );

                    if( this.RearArmorHP <= 0 )
                        this.HullHP = -1;
                }

                var percentRemaining = this.RearShieldHP / this.HullMaxHP;
                $( ".rear-shield-gauge" ).css( "height", Math.floor( percentRemaining * 100 ) + "%" );
            }
        }
        else
            this.HullHP -= laser.Damage;
    },


    /**
    * Keep the roll, pitch, and yaw scalars at a reasonable amount
    */
    ClampPYRSpeedVector: function ()
    {
        if ( this.PitchYawRollSpeed.x < -1 )
            this.PitchYawRollSpeed.x = -1;
        else if ( this.PitchYawRollSpeed.x > 1 )
            this.PitchYawRollSpeed.x = 1;

        if ( this.PitchYawRollSpeed.y < -1 )
            this.PitchYawRollSpeed.y = -1;
        else if ( this.PitchYawRollSpeed.y > 1 )
            this.PitchYawRollSpeed.y = 1;

        if ( this.PitchYawRollSpeed.z < -1 )
            this.PitchYawRollSpeed.z = -1;
        else if ( this.PitchYawRollSpeed.z > 1 )
            this.PitchYawRollSpeed.z = 1;
    },


    GetTransform: function ()
    {
        var retMatrix = new THREE.Matrix4();

        // The vectors make up the columns of the matrix
        retMatrix.n11 = this.Right.x; retMatrix.n21 = this.Right.y; retMatrix.n31 = this.Right.z;
        retMatrix.n12 = this.Up.x; retMatrix.n22 = this.Up.y; retMatrix.n32 = this.Up.z;
        retMatrix.n13 = this.Forward.x; retMatrix.n23 = this.Forward.y; retMatrix.n33 = this.Forward.z;

        retMatrix.n14 = this.Position.x; retMatrix.n24 = this.Position.y; retMatrix.n34 = this.Position.z;

        // The vectors make up the columns of the matrix
        var scale = 0.0008;
        retMatrix.elements[0] = this.Right.x * scale; retMatrix.elements[1] = this.Right.y * scale; retMatrix.elements[2] = this.Right.z * scale;
        retMatrix.elements[4] = this.Up.x * scale; retMatrix.elements[5] = this.Up.y * scale; retMatrix.elements[6] = this.Up.z * scale;
        retMatrix.elements[8] = this.Forward.x * scale; retMatrix.elements[9] = this.Forward.y * scale; retMatrix.elements[10] = this.Forward.z * scale;

        retMatrix.elements[12] = this.Position.x; retMatrix.elements[13] = this.Position.y; retMatrix.elements[14] = this.Position.z;

        return retMatrix;
    },

    /**
    * Get the matrix that represents the orientation of the ship. This is primarily used to make
    * laser beams match the ship's orientation
    */
    GetOrientationMatrix: function ()
    {
        return Util.MakeOrientationMatrix( this.Up, this.Forward, this.Right );
        /*
        var retMatrix = new THREE.Matrix4();

        // The vectors make up the columns of the matrix
        retMatrix.elements[0] = this.Right.x; retMatrix.elements[1] = this.Right.y; retMatrix.elements[2] = this.Right.z;
        retMatrix.elements[4] = this.Up.x; retMatrix.elements[5] = this.Up.y; retMatrix.elements[6] = this.Up.z;
        retMatrix.elements[8] = this.Forward.x; retMatrix.elements[9] = this.Forward.y; retMatrix.elements[10] = this.Forward.z;

        return retMatrix;
        */
    },


    GetOrientationEuler: function ()
    {
        var orientationMatrix = this.GetOrientationMatrix();

        var rot = new THREE.Euler();
        rot.setFromRotationMatrix( orientationMatrix );

        return rot;
    },

    GetOrientationQuat: function ()
    {
        var orientationMatrix = this.GetOrientationMatrix();

        var rot = new THREE.Quaternion();
        orientationMatrix.decompose( null, rot, null );

        rot.setFromRotationMatrix( orientationMatrix );

        return rot;
    },


    /**
    * Move a camera to be looking from the ship
    * @param {!THREE.Camera} camera The camera that will look from the ship
    */
    SetCameraForShip: function ( inCamera )
    {
        inCamera.position = this.Position.clone();

        inCamera.lookAt( this.Position.clone().add( this.Forward ) );

        inCamera.up = this.Up.clone();
    }
};