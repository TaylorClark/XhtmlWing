
/*
Copyright (c) 2011 Taylor Clark.

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
*/

/**
* Represents an active game simulation and all that goes along with it
* @constructor
*/
function XhtmlWingGame( overrideSecret )
{
    // Set the global instance so we can access the active game from anywhere. Sort of cheating
    // and definitely a bad practice, but made life a lot easier in a few places.
    XhtmlWingGame.MainGame = this;

    this._renderer = null;
    this._camera = null;
    this._stats = null;
    this._skyboxScene = null;
    this._skyboxCamera = null;
    this._skyboxMesh = null;
    this._playerShip = null;
    this._isStarWarsGame = !overrideSecret && Util.GetQueryStringParameter( "secret" ) === "wars";

    this.isInBuildMode = false;
    this.buildManager = new BuildManager();

    this.isInArena = false;
    this.isTabDown = false;

    this.droneMesh = null;

    /**
    * Stores a list of models loaded from file
    */
    this._loadedGeometries = {};

    /**
    * The number of models that need to be loaded
    * @type {!number}
    */
    this._numGeometriesToLoad = this._isStarWarsGame ? 3 : 1;


    /**
    * Indicates if the game is active. This ignores the pause state.
    * @type {!boolean}
    */
    this.GameIsActive = false;

    /**
    * Indicates if the game is in multiplayer mode
    * @type {!boolean}
    */
    this.IsMultiplayer = false;

    /**
    * Indicates if the game is paused or active
    * @type {!boolean}
    */
    this.GameIsPaused = false;

    this.PrevMouseClientPos = null;
    this._joypad = new Joypad();

    // -1 to invert the joypad's Y axis; 1 to leave it alone
    this.InvertYAxis = 1;

    this.IsRightMouseDown = false;

    this._laserSound = null;
    this._playerHitSound = null;
    this._enemyHitSound = null;
    this._shipExplodeSound = null;
    this._cockpitUI = new CockpitUI();
    this._testSphere = null;
    this._elapsedGameTime = 0;
    this._portalPodMesh = null;
    this._portalPodDirection = new THREE.Vector3();
    this._portalPodTimeRemaining = 0;

    // Variables that need resetting each new area
    this._ships = [];
    this._explosions = [];
    this._hoopLists = [];
    this._lasers = [];
    this._aiControllers = [];
    this._targetNewAreaIndex = -1;
    this._spaceDustSpecs = [];
}


// The distance from the camera when space dust particles start to become visible
XhtmlWingGame.DustVisibleScalar = 200;
XhtmlWingGame.DustVisibleScalarSq = XhtmlWingGame.DustVisibleScalar * XhtmlWingGame.DustVisibleScalar;

// The size of the sphere in which new space dust particles are generated
XhtmlWingGame.SpaceDustRadius = 250;

// The number of space dust particles that are generated around the camera
XhtmlWingGame.NumSpaceDustParticles = 40;

XhtmlWingGame.AnimationDuration = 125;

XhtmlWingGame.prototype =
{
    /**
    * Initialize the game. This should be called only one time per page load.
    */
    Init: function()
    {
        this._ships = [];
        this._explosions = [];
        this._hoopLists = [];
        this._lasers = [];
        this._aiControllers = [];
        this._targetNewAreaIndex = -1;
        this._spaceDustSpecs = [];

        this._camera = new THREE.PerspectiveCamera( 60, window.innerWidth / window.innerHeight, 1, 10000 );
        this._skyboxCamera = new THREE.PerspectiveCamera( 60, window.innerWidth / window.innerHeight, 1, 10000 );

        window.addEventListener( 'resize', function() { XhtmlWingGame.MainGame.OnWindowResize(); }, false );
        //this._camera = new THREE.QuakeCamera( { fov: 60, aspect: window.innerWidth / window.innerHeight, near: 1, far: 20000,movementSpeed: 15, lookSpeed: 0.005, noFly: false, lookVertical: true } );

        /*
        this._camera.target.position.x = this._camera.position.x + 500;
        this._camera.target.position.y = this._camera.position.y;
        this._camera.target.position.z = this._camera.position.z;
        */
        this._scene = new THREE.Scene();

        var ambient = new THREE.AmbientLight( 0x808080 );
        this._scene.add( ambient )

        this._renderer = new THREE.WebGLRenderer(
        {
            canvas: document.getElementById( "GameViewCanvas" )
        } );
        this._renderer.setSize( window.innerWidth, window.innerHeight );
        this._renderer.autoClear = false;

        // Grab the engine output bar layout
        Spaceship.EngineBarTop = parseFloat( $( "#EngineBar" ).position().top / $( "#EngineBar" ).parent().height() * 100 );
        Spaceship.EngineBarHeight = parseFloat( $( "#EngineBar" ).height() / $( "#EngineBar" ).parent().height() * 100 );

        //viewElement.appendChild( this._renderer.domElement );

        //this._stats = new Stats();
        if( this._stats )
        {
            var viewElement = document.getElementById( "new-gui" );

            this._stats.domElement.style.position = 'absolute';
            this._stats.domElement.style.top = '0px';
            this._stats.domElement.style.zIndex = 100;
            viewElement.appendChild( this._stats.domElement );
        }

        if( this._isStarWarsGame )
            this.InitShipModels_StarWars();
        else
            this.InitShipModels();

        if( this._joypad )
            this._joypad.Init();

        // Hook up the sounds
        this._laserSound = document.getElementById( this._isStarWarsGame ? 'XWingLaserSound' : 'LaserSound' );
        this._laserSound2 = document.getElementById( this._isStarWarsGame ? 'XWingLaserSound2' : 'LaserSound2' );
        this._playerHitSound = document.getElementById( 'PlayerHitSound' );
        this._enemyHitSound = document.getElementById( 'EnemyHitSound' );
        this._shipExplodeSound = document.getElementById( 'ShipExplodeSound' );
        HoopList.hoopClearedSound = document.getElementById( 'HoopClearedSound' );

        this._portalPodMesh = new THREE.Mesh( new THREE.SphereGeometry( 20 ),
                                        new THREE.MeshLambertMaterial( { color: 0x555555, ambient: 0x555555, wireframe: false } ) );

        // Store this value so we don't have to access the player info
        this.InvertYAxis = Main.CurPlayerInfo.Setting_InvertY ? -1 : 1;

        // Create the player's ship. The player moves a little faster, has double the HP of other ships, turns faster, and shoots faster
        this._ships.push( new Spaceship( true, this._isStarWarsGame ? "XWing" : "Normal" ) );
        this._playerShip = this._ships[0];
        this._playerShip.Speed *= 1.15;
        //this._playerShip.HullMaxHP = this._playerShip.HullHP = this._playerShip.HullMaxHP * 2;
        this._playerShip.TurnSpeed *= 1.15;
        this._playerShip.RateOfFire *= 0.5;
        this._playerShip.IsGoodGuy = true;

        this._cockpitUI.InitFromDOM();

        this._cockpitUI.HookUpToShip( this._playerShip );

        var starMesh = new THREE.Mesh( new THREE.SphereGeometry( 200 ), new THREE.MeshLambertMaterial( { color: 0xffffff } ) );
        starMesh.position.set( 45200, 0, 0 );
        this._scene.add( starMesh );

        /*
        var lensFlareMesh = new THREE.Mesh( new THREE.SphereGeometry( 2 ), new THREE.MeshLambertMaterial( { color: 0x0000ff } ) );
        lensFlareMesh.visible = false;
        lensFlareMesh.position = new THREE.Vector3( 45001, 0, 0 );
        this._scene.add( lensFlareMesh );

        this._scene.add( lensFlareMesh );

        var lensFlare = new THREE.LensFlare( THREE.ImageUtils.loadTexture( "img/lensflare0.png" ), 128, 0.0, THREE.AdditiveBlending );
        lensFlare.add( THREE.ImageUtils.loadTexture( "img/lensflare1.png" ), 256, 0.33, THREE.AdditiveBlending );
        lensFlare.add( lensFlare.lensFlares[1].texture, 300, 0.66, THREE.AdditiveBlending );
        lensFlare.add( lensFlare.lensFlares[1].texture, 400, 1.0, THREE.AdditiveBlending );

        lensFlareMesh.add( lensFlare );
        */

        var sunLight = new THREE.PointLight( 0xffffFf, 2, 0 );
        sunLight.position = new THREE.Vector3( 45000, 0, 0 );
        this._scene.add( sunLight );

        this.InitSpaceDust();
    },


    loadArea: function( areaDescriptorIndex, onReady )
    {
        var areaDescriptor = AreaDescriptor.Areas[areaDescriptorIndex];
        this._areaDescriptor = areaDescriptor;

        var currentThis = this;
        this._areaDescriptor.load( function()
        {
            currentThis.InitSkybox( currentThis._areaDescriptor );

            currentThis.InitAsteroidFields( currentThis._areaDescriptor );

            // Render once so we have something to look at in the background
            currentThis.Render();

            window.localStorage["lastAreaIndex"] = areaDescriptorIndex;

            if( onReady )
                onReady();
        } );
    },


    goToNewArea: function( areaDescriptorIndex )
    {
        this._targetNewAreaIndex = areaDescriptorIndex;
    },


    /**
    * Initialize the models used for the space craft
    */
    InitShipModels: function()
    {
        var modelLoader = new THREE.JSONLoader( true );
        modelLoader.load( "models/SFighter2.js", function( loadedGeometry )
        {
            XhtmlWingGame.MainGame._loadedGeometries["Normal"] = loadedGeometry;

            loadedGeometry.applyMatrix( new THREE.Matrix4().makeScale( 0.0008, 0.0008, 0.0008 ) );

            XhtmlWingGame.MainGame.OnModelLoaded();

        }, null );

        modelLoader.load( "models/drone/quantum2.js", function( loadedGeometry, materials )
        {
            XhtmlWingGame.DroneMaterial = materials[0];
            XhtmlWingGame.DroneGeometry = loadedGeometry;

            var scale = 1.5;
            loadedGeometry.applyMatrix( new THREE.Matrix4().makeScale( scale, scale, scale ) );

        }, null );
    },

    /**
    * Initialize the models used for the space craft in the secret Star Wars mode
    */
    InitShipModels_StarWars: function()
    {
        var modelLoader = new THREE.JSONLoader( true );

        modelLoader.load( "models/VaderTie.js", function( loadedGeometry, materials )
        {
            XhtmlWingGame.MainGame._loadedGeometries["VadersTie"] = loadedGeometry;

            loadedGeometry.applyMatrix( new THREE.Matrix4().makeScale( 20, 20, 20 ) );

            // Fix up the materials
            var newMaterials = [];
            for( var i = 0; i < materials.length; i++ )
                newMaterials.push( new THREE.MeshBasicMaterial( { color: materials[i].color, wireframe: false, side: THREE.DoubleSide } ) );

            loadedGeometry.materials = newMaterials;

            XhtmlWingGame.MainGame.OnModelLoaded();

        }, null );

        modelLoader.load( "models/Tie_Low.js", function( loadedGeometry, materials )
        {
            XhtmlWingGame.MainGame._loadedGeometries["Tie"] = loadedGeometry;

            loadedGeometry.applyMatrix( new THREE.Matrix4().makeScale( 5, 5, 5 ) );

            // Fix up the materials
            var newMaterials = [];
            for( var i = 0; i < materials.length; i++ )
                newMaterials.push( new THREE.MeshBasicMaterial( { color: materials[i].color, wireframe: false, side: THREE.DoubleSide } ) );

            loadedGeometry.materials = newMaterials;

            XhtmlWingGame.MainGame.OnModelLoaded();

        }, null );

        modelLoader.load( "models/XWing_Low.js", function( loadedGeometry, materials )
        {
            XhtmlWingGame.MainGame._loadedGeometries["XWing"] = loadedGeometry;

            loadedGeometry.applyMatrix( new THREE.Matrix4().makeScale( 5.5, 5.5, 5.5 ) );

            // Fix up the materials
            var newMaterials = [];
            for( var i = 0; i < materials.length; i++ )
                newMaterials.push( new THREE.MeshBasicMaterial( { color: materials[i].color, wireframe: false, side: THREE.DoubleSide } ) );

            loadedGeometry.materials = newMaterials;

            XhtmlWingGame.MainGame.OnModelLoaded();

        }, null );
    },


    OnModelLoaded: function()
    {
        // If we're done loading
        if( Object.keys( this._loadedGeometries ).length >= this._numGeometriesToLoad )
        {
            // Update existing ships. Start at 1 because 0 is the player's ship and the player's
            // ship doesn't render
            for( var curShipIndex = 1; curShipIndex < XhtmlWingGame.MainGame._ships.length; ++curShipIndex )
                XhtmlWingGame.MainGame._ships[curShipIndex].UpdateFromGeometry();
        }
    },


    /**
    * Initialize the game for a specific mission
    */
    InitMission: function( mission )
    {
        // Create this mission's enemies
        for( var missionShipIndex = 0; missionShipIndex < mission.MissionShips.length; ++missionShipIndex )
        {
            var missionShip = mission.MissionShips[missionShipIndex];

            var newShip = new Spaceship( false, missionShip.ShipTypeName );
            newShip.Position = missionShip.Position;
            newShip.IsGoodGuy = missionShip.IsGoodGuy;

            if( !missionShip.IsGoodGuy )
                newShip.Forward = new THREE.Vector3( 0, 0, 1 );

            var newAIController = new AIShipController( newShip );

            this._ships.push( newShip );
            this._aiControllers.push( newAIController );

            // Here's a little cheat, if only one enemy is specified then don't give it a target.
            // That way it acts like a drone
            if( mission.MissionShips.length > 1 )
            {
                newAIController.Target = this.GetRandomShip( !missionShip.IsGoodGuy );

                newAIController.CurrentState = AIShipController.STATE_Engage;
            }
        }

        // Create this mission's hoops
        if( mission.HoopSpline != null && mission.NumHoops > 0 )
        {
            var hoopList = new HoopList();
            hoopList.initAlongSpline( mission.HoopSpline, mission.NumHoops, function()
            {
                XhtmlWingGame.MainGame.EndMission( true );
            } );

            this._cockpitUI.HoopForBlip = hoopList.hoops[0];

            this._hoopLists.push( hoopList );
        }
    },


    /**
    * Get a random good or bad ship. Used by the AI to pick targets
    */
    GetRandomShip: function( getGoodGuys )
    {
        var filteredShips = [];

        for( var shipIndex = 0; shipIndex < this._ships.length; ++shipIndex )
        {
            if( getGoodGuys === this._ships[shipIndex].IsGoodGuy )
                filteredShips.push( this._ships[shipIndex] );
        }

        if( filteredShips.length === 0 )
            return null;

        return filteredShips[Math.floor( Math.random() * filteredShips.length )];
    },


    ///////////////////////////////////////////////////////////////////////////////////////////////
    // Launch a portal pod
    ///////////////////////////////////////////////////////////////////////////////////////////////
    launchPortalPod: function( destinationAreaIndex )
    {
        $( "#PortalPanel" ).hide();

        this._portalPodMesh.position = this._playerShip.Position.clone();
        this._portalPodMesh.rotation = this._playerShip.GetOrientationEuler();

        this._scene.add( this._portalPodMesh );

        this._portalPodDirection = this._playerShip.Forward.clone();
        this._portalPodTimeRemaining = 1;
        this._destinationAreaIndex = destinationAreaIndex;
    },


    ///////////////////////////////////////////////////////////////////////////////////////////////
    // Create the particle systems that help the player visualize their movement
    ///////////////////////////////////////////////////////////////////////////////////////////////
    InitSpaceDust: function()
    {
        // Create the space dust particles
        for( var curParticleIndex = 0; curParticleIndex < XhtmlWingGame.NumSpaceDustParticles; ++curParticleIndex )
        {
            // Each spec needs its own material so we can adjust the opacicty based on the distance.
            // I'm sure there's some way do this with shaders.
            var material = new THREE.MeshBasicMaterial( { color: 0xFFFFFF, blending: THREE.NormalBlending } );
            this._spaceDustSpecs.push( new THREE.Mesh( XhtmlWingGame.SpaceDushGeometry, material ) );

            this._spaceDustSpecs[curParticleIndex].position = Util.GetRandomPointInSphere( XhtmlWingGame.SpaceDustRadius );

            this._scene.add( this._spaceDustSpecs[curParticleIndex] );
        }
    },


    InitAsteroidFields: function( areaDescriptor )
    {
        for( var fieldIndex = 0; fieldIndex < areaDescriptor.asteroidFields.length; ++fieldIndex )
        {
            var curField = areaDescriptor.asteroidFields[fieldIndex];

            curField.init( this._scene );
        }
    },


    ///////////////////////////////////////////////////////////////////////////////////////////////
    // Create the skybox that represents outer space
    ///////////////////////////////////////////////////////////////////////////////////////////////
    InitSkybox: function( areaDescriptor )
    {
        var path = areaDescriptor.skyboxImage_Prefix;
        var format = areaDescriptor.skyboxImage_Extension;

        /*
        var urls = [
                path + 'east' + format, path + 'west' + format,
                path + 'up' + format, path + 'down' + format,
                path + 'north' + format, path + 'south' + format
        ];*/
        var urls = [
                path + 'right1' + format, path + 'left2' + format,
                path + 'top3' + format, path + 'bottom4' + format,
                path + 'front5' + format, path + 'back6' + format
        ];
        var textureCube = THREE.ImageUtils.loadTextureCube( urls );

        var shader = THREE.ShaderLib["cube"];
        shader.uniforms["tCube"].value = textureCube;

        var material = new THREE.ShaderMaterial(
        {
            fragmentShader: shader.fragmentShader,
            vertexShader: shader.vertexShader,
            uniforms: shader.uniforms,
            depthWrite: false,
            side: THREE.BackSide
        } );

        if( !this._skyboxMesh )
            this._skyboxMesh = new THREE.Mesh( new THREE.CubeGeometry( 100, 100, 100 ), material );
        else
            this._skyboxMesh.material = material;

        //this._skyboxMesh.frustumCulled = false;

        if( !this._skyboxScene )
        {
            this._skyboxScene = new THREE.Scene();
            this._skyboxScene.add( this._skyboxMesh );
        }
    },


    ///////////////////////////////////////////////////////////////////////////////////////////////
    // Occurs when the browser window is resized
    ///////////////////////////////////////////////////////////////////////////////////////////////
    OnWindowResize: function()
    {
        this._camera.aspect = window.innerWidth / window.innerHeight;
        this._camera.updateProjectionMatrix();

        this._skyboxCamera.aspect = window.innerWidth / window.innerHeight;
        this._skyboxCamera.updateProjectionMatrix();

        this._renderer.setSize( window.innerWidth, window.innerHeight );
    },

    SceneToScreenPos: function( scenePos )
    {
        var projectMatrix = new THREE.Matrix4();
        projectMatrix.multiply( this._camera.projectionMatrix, this._camera.matrixWorldInverse );

        var screenPos = scenePos.clone();
        screenPos.applyMatrix4( projectMatrix );

        return new THREE.Vector2( screenPos.x, screenPos.y );
    },


    handlePlayerInput: function()
    {
        if( this.isInBuildMode )
        {
            var buildSphere;


        }
        else
        {
            var shouldRotate = true;

            if( $( ".Overlay" ).is( ":visible" ) )
                shouldRotate = false;
            else if( Main.shouldShowLogo )
                shouldRotate = false;

            if( shouldRotate )
            {
                var rollPitchAmount = new THREE.Vector2();
                if( this._joypad )
                    rollPitchAmount = new THREE.Vector2( this._joypad.NormDirection.X, this._joypad.NormDirection.Y );

                // Allow a dead zone
                if( rollPitchAmount.lengthSq() < 0.005 )
                    rollPitchAmount.set( 0, 0 );
                //rollPitchAmount.multiplyScalar( controlScalar );

                this._playerShip.PitchYawRollSpeed.set( 0, 0, 0 );

                // If the X-axis controls banking
                var shouldRoll = false;
                if( Main.CurPlayerInfo.Setting_ControlScheme == PlayerInfo.CONTROLSCHEME_Mouse_YawPitch )
                {
                    // If the right mouse button is held down then roll instead of yaw
                    if( this.IsRightMouseDown )
                        shouldRoll = true;
                }
                else
                {
                    if( !this.IsRightMouseDown )
                        shouldRoll = true;
                }

                // If the right mouse button is held down then roll instead of yaw
                if( shouldRoll )
                    this._playerShip.PitchYawRollSpeed.z = rollPitchAmount.x;
                else
                {
                    this._playerShip.PitchYawRollSpeed.y = -rollPitchAmount.x;
                    this._playerShip.PitchYawRollSpeed.z = -this._playerShip.PitchYawRollSpeed.y / 1.75;
                }

                this._playerShip.PitchYawRollSpeed.x = -rollPitchAmount.y * this.InvertYAxis;
            }
            else
                this._playerShip.PitchYawRollSpeed.set( 0, 0, 0 );
        }

        if( !Main.CurPlayerInfo.Setting_MouseMovesControlStick && this._joypad )
            this._joypad.Center();
    },


    ///////////////////////////////////////////////////////////////////////////////////////////////
    // Update the game
    ///////////////////////////////////////////////////////////////////////////////////////////////
    Update: function( frameTime )
    {
        // Track the game time
        this._elapsedGameTime += frameTime;

        this.handlePlayerInput();

        // If the pod is visible
        if( this._portalPodTimeRemaining > 0 )
        {
            this._portalPodTimeRemaining -= frameTime;

            this._portalPodMesh.position.add( this._portalPodDirection.clone().multiplyScalar( frameTime * 500 ) );

            // If it's time to pop
            if( this._portalPodTimeRemaining < 0 )
            {
                this._portal = new Portal( this._portalPodMesh.position,
                                            this._portalPodMesh.rotation,
                                            this._portalPodDirection,
                                            this._destinationAreaIndex );

                this._scene.remove( this._portalPodMesh );
            }
        }

        if( this._portal && this._portal.isActive )
            this._portal.update( frameTime );

        // Update AI
        for( var i = 0; i < this._aiControllers.length; i++ )
            this._aiControllers[i].Update( frameTime );

        // Update the spaceships
        for( var i = 0; i < this._ships.length; i++ )
        {
            var curShip = this._ships[i];
            if( this.isInBuildMode && curShip === this._playerShip )
            {
                this.buildManager.update( frameTime );
                continue;
            }

            curShip.Update( frameTime );
        }

        // Update explosions
        for( var i = 0; i < this._explosions.length; ++i )
        {
            var explosionMesh = this._explosions[i];

            explosionMesh.scale.add( new THREE.Vector3( frameTime, frameTime, frameTime ) );

            explosionMesh.material.opacity = 1 - ( explosionMesh.scale.x / 2 );

            // If the explosion is transparent enough then remove it
            if( explosionMesh.material.opacity < 0.1 )
            {
                explosionMesh.material.opacity = 0;
                this._scene.remove( explosionMesh );

                // Remove the explosion and update the index since the list is one shorter now
                this._explosions.splice( i--, 1 );
            }
        }

        // Update lasers
        var curLaser;
        var shouldRemoveCurLaser;
        for( var i = 0; i < this._lasers.length; i++ )
        {
            curLaser = this._lasers[i];
            shouldRemoveCurLaser = false;

            // If the laser is due to expire
            curLaser.RemainingLife -= frameTime;
            if( curLaser.RemainingLife < 0 )
                shouldRemoveCurLaser = true;
                // Otherwise update that mother
            else
            {
                var moveAmount = curLaser.Direction.clone();
                moveAmount.multiplyScalar( frameTime );

                curLaser.Mesh.position.add( moveAmount );

                var distBetween = new THREE.Vector3();
                for( var curShipIndex = 0; curShipIndex < this._ships.length; ++curShipIndex )
                {
                    var curShip = this._ships[curShipIndex];

                    // Ships can't hit themselves
                    if( curShip == curLaser.OwningShip )
                        continue;

                    distBetween.subVectors( curShip.Position, curLaser.Mesh.position );

                    if( distBetween.lengthSq() < curShip.BoundingRadiusSq )
                    {
                        shouldRemoveCurLaser = true;

                        curShip.HandleLaserHit( curLaser );

                        if( curShip.HullHP <= 0 )
                        {
                            if( curShip == this._playerShip )
                            {
                                this.EndMission( false );
                                return;
                            }

                            this.RemoveShip( curShip );

                            if( Main.CurPlayerInfo.Setting_PlaySounds )
                                this._shipExplodeSound.play();

                            // If the player destroyed the last ship
                            var remainingEvilShips = 0;
                            for( var aliveShipIndex = 0; aliveShipIndex < this._ships.length; ++aliveShipIndex )
                            {
                                if( !this._ships[aliveShipIndex].IsGoodGuy )
                                    ++remainingEvilShips;
                            }

                            if( remainingEvilShips === 0 )
                            {
                                this.EndMission( true );
                                return;
                            }

                            break;
                        }

                        // If the player was hit
                        if( Main.CurPlayerInfo.Setting_PlaySounds )
                        {
                            if( curShip == this._playerShip )
                                this._playerHitSound.play();
                            else
                                this._enemyHitSound.play();
                        }
                    }
                }
            }

            // If the laser expired or hit something, remove it from the scene
            if( shouldRemoveCurLaser )
            {
                this._scene.remove( this._lasers[i].Mesh );

                // Remove the laser and update the index since the list is one shorter now
                this._lasers.splice( i--, 1 );
            }
        }

        // If there are hoops        
        for( var i = 0; i < this._hoopLists.length; ++i )
        {
            var hoopList = this._hoopLists[i];
            hoopList.updatePassThrough( this._playerShip.PreviousPosition, this._playerShip.Position );
        }

        for( var fieldIndex = 0; fieldIndex < this._areaDescriptor.asteroidFields.length; ++fieldIndex )
        {
            var curField = this._areaDescriptor.asteroidFields[fieldIndex];

            curField.update( frameTime );
        }


        this._cockpitUI.Update();

        this._playerShip.SetCameraForShip( this._camera );

        // Update the space dust
        for( var i = 0; i < this._spaceDustSpecs.length; i++ )
        {
            var curDustSpec = this._spaceDustSpecs[i];

            // If this point is behind the camera
            var toCam = new THREE.Vector3();
            toCam.subVectors( curDustSpec.position, this._camera.position );
            if( toCam.dot( this._playerShip.Forward ) < 0 )
            {
                // Move this dust spec randomly in front of the camera
                curDustSpec.position = Util.GetRandomPointInSphere( XhtmlWingGame.SpaceDustRadius );

                // Make the random point in a hemishpere facing away from the ship
                if( this._playerShip.Forward.dot( curDustSpec.position ) < 0 )
                    curDustSpec.position = Util.ReflectAcross( this._playerShip.Forward, curDustSpec.position );

                // Move the spec to the end of the "far plane" of dust spec
                curDustSpec.position.add( this._playerShip.Position );
                curDustSpec.position.add( this._playerShip.Forward.clone().multiplyScalar( XhtmlWingGame.DustVisibleScalar ) );
            }

            var distToCam = this._spaceDustSpecs[i].position.clone();
            distToCam.sub( this._camera.position );

            var distAwaySq = distToCam.lengthSq();
            distAwaySq = XhtmlWingGame.DustVisibleScalarSq - distAwaySq;
            if( distAwaySq < 0 )
                distAwaySq = 0;
            distAwaySq /= XhtmlWingGame.DustVisibleScalarSq;

            // The further away a particle is the more transparent
            curDustSpec.material.opacity = distAwaySq;
        }

        this.Render();

        // If we're going to a new area
        if( this._targetNewAreaIndex !== -1 )
        {
            // Store this here because it gets reset in Init()
            var nextAreaIndex = this._targetNewAreaIndex;

            this.GameIsActive = false;
            $( "#loading-panel" ).show();

            this.Init();

            this.loadArea( nextAreaIndex, function()
            {
                var newPos = new THREE.Vector3( -4.414694735802865, -30.476577984154865, -520.0276006641733 );
                XhtmlWingGame.MainGame._playerShip.Position = newPos;

                $( "#loading-panel" ).hide();
                XhtmlWingGame.MainGame.GameIsActive = true;

                Main.startUpdating();
            } );
        }
    },


    ///////////////////////////////////////////////////////////////////////////////////////////////
    // Draw the scene
    ///////////////////////////////////////////////////////////////////////////////////////////////
    Render: function()
    {
        // Rotate the sky box with the camera
        if( this._skyboxCamera )
        {
            /*
            this._skyboxCamera.up = this._camera.up;

            this._skyboxCamera.target.position.x = this._camera.target.position.x - this._camera.position.x;
            this._skyboxCamera.target.position.y = this._camera.target.position.y - this._camera.position.y;
            this._skyboxCamera.target.position.z = this._camera.target.position.z - this._camera.position.z;
            */
            this._skyboxCamera.rotation.copy( this._camera.rotation );
        }

        if( this._stats )
            this._stats.update();

        //this._renderer.clear();
        this._renderer.render( this._skyboxScene, this._skyboxCamera );
        this._renderer.render( this._scene, this._camera );
    },


    ///////////////////////////////////////////////////////////////////////////////////////////////
    // Remove a ship from the active game simulation
    ///////////////////////////////////////////////////////////////////////////////////////////////
    RemoveShip: function( ship )
    {
        for( var shipIndex = 0; shipIndex < this._ships.length; ++shipIndex )
        {
            // If this is the ship to remove
            if( this._ships[shipIndex] == ship )
            {
                // Remove the ship from the list
                this._ships.splice( shipIndex, 1 );

                // Scene.RemoveObject doesn't always remove the entire mesh, so hide the model first
                //for( var materialIndex = 0; materialIndex < ship.Mesh.materials.length; ++materialIndex )
                //    ship.Mesh.materials[materialIndex].opacity = 0;
                if( ship.Mesh )
                {
                    ship.Mesh.material.opacity = 0;

                    // Remove the ship's model
                    this._scene.remove( ship.Mesh );
                }

                // If any AI was tracking this ship
                for( var aiIndex = 0; aiIndex < this._aiControllers.length; ++aiIndex )
                {
                    if( this._aiControllers[aiIndex].Target === ship )
                        this._aiControllers[aiIndex].Target = this.GetRandomShip( !this._aiControllers[aiIndex].Ship.IsGoodGuy );
                }

                // Remove the ship from radar
                this._cockpitUI.OnShipRemoveFromSim( ship.UniqueId );

                // Create an explosion
                var explosionMaterial = new THREE.MeshBasicMaterial( { color: 0xFF8000, blending: THREE.NormalBlending, opacity: 1 } );
                var explosionMesh = new THREE.Mesh( new THREE.SphereGeometry( ship.BoundingRadius * 0.75, 12, 12 ), explosionMaterial );
                explosionMesh.position = ship.Position.clone();

                this._scene.add( explosionMesh );
                this._explosions.push( explosionMesh );

                return;
            }
        }
    },


    /**
    * Get a ship by its unique identifier integer
    */
    GetShipById: function( uniqueId )
    {
        for( var shipIndex = 0; shipIndex < this._ships.length; ++shipIndex )
        {
            if( this._ships[shipIndex].UniqueId === uniqueId )
                return this._ships[shipIndex];
        }

        return null;
    },


    ///////////////////////////////////////////////////////////////////////////////////////////////
    // End the mission
    ///////////////////////////////////////////////////////////////////////////////////////////////
    EndMission: function( wasSuccessful )
    {
        // The game is over
        this.GameIsActive = false;

        document.getElementById( "MissionOverPanel" ).style.display = "block";

        var missionOverResultLabel = document.getElementById( "MissionOverResultLabel" );

        var missionOverButton = document.getElementById( "MissionOverButton" );

        var missionWasSuccessField = document.getElementById( "MissionWasSuccessField" );
        missionWasSuccessField.value = wasSuccessful ? "1" : "0";

        if( wasSuccessful )
        {
            missionOverResultLabel.innerHTML = "Mission Completed";
            missionOverButton.value = "Next Mission";
        }
            // Otherwise the player failed
        else
        {
            // Show the game over text
            missionOverResultLabel.innerHTML = "Game Over";
            missionOverButton.value = "Retry Mission";
        }

        missionOverButton.focus();
    },


    OnTouchMove: function( touchPosition )
    {
        if( this.PrevMouseClientPos === null )
            this.PrevMouseClientPos = new THREE.Vector2( touchPosition.X, touchPosition.Y );

        var clientPos = new THREE.Vector2( touchPosition.X, touchPosition.Y );
        var clientMouseMove = new THREE.Vector2();
        clientMouseMove.subVectors( clientPos, this.PrevMouseClientPos );

        if( this._joypad && this._joypad.ContainsClientPoint( touchPosition ) )
        {
            this._joypad.HandleTouchInput( touchPosition );
        }
        else
        {
            if( Main.CurPlayerInfo.Setting_MouseMovesControlStick )
            {
                if( Main.CurPlayerInfo.TurnRelativeToWindowCenter )
                {
                    var offset = touchPosition.Clone();
                    offset.Subtract( new Vector2( window.innerWidth / 2, window.innerHeight / 2 ) );

                    var controlRadius = Math.min( window.innerWidth, window.innerHeight ) * 0.5;

                    offset.Scale( 1.0 / controlRadius );

                    this._joypad.NormDirection = offset
                }
                else
                {
                    this._joypad.NormDirection.X += clientMouseMove.x * 0.025;
                    this._joypad.NormDirection.Y += clientMouseMove.y * 0.025;
                }

                if( this._joypad.NormDirection.GetLengthSq() > 1 )
                    this._joypad.NormDirection.Normalize();
            }
                // Otherwise cursor movement directly affects the ship
            else
            {
                this._joypad.NormDirection.X = clientMouseMove.x * 0.25;
                this._joypad.NormDirection.Y = clientMouseMove.y * 0.25;
            }

            this._joypad.UpdateJoypadPos();
        }

        this.PrevMouseClientPos = clientPos;
    },

    /**
    * An event handler invoked when the player pushes a mouse button down or touches the screen
    * @param {Vector2} touchPos The position of the mouse or finger in client coordinates
    * @param {boolean} isLeft True if the left mouse was pressed, false for the right button, and null for fingers
    */
    OnTouchStart: function( touchPos, isLeft )
    {
        if( this.isInBuildMode )
        {
            this.buildManager.onMouseDown( touchPos[0], isLeft );
        }
        else
        {
            if( isLeft == true )
                this._playerShip.IsTriggerPulled = true;
            else if( isLeft == false )
                this.IsRightMouseDown = true;
        }
    },

    OnTouchEnd: function( isLeft )
    {
        if( isLeft == true )
            this._playerShip.IsTriggerPulled = false;
        else if( isLeft == false )
            this.IsRightMouseDown = false;
            // Otherwise isLeft is null and the player is using touch
        else
            this._joypad.Center();
    },


    OnMouseWheel: function( delta )
    {
        if( this.isInBuildMode )
            this.buildManager.onMouseWheel( delta );
    },


    ///////////////////////////////////////////////////////////////////////////////////////////////
    // Enable or disable build mode
    ///////////////////////////////////////////////////////////////////////////////////////////////
    setBuildMode: function( inBuildMode )
    {
        this.isInBuildMode = inBuildMode;

        if( inBuildMode )
        {
            this.buildManager = new BuildManager();
            $( "#Crosshairs" ).hide();

            var newBuildCenter = this._playerShip.Position.clone();
            newBuildCenter.add( this._playerShip.Forward.clone().multiplyScalar( BuildManager.InitialBuildRadius ) );

            this.buildManager.centerPos = newBuildCenter;
        }
        else
        {
            this.buildManager.term();
            this.buildManager = null;
            $( "#Crosshairs" ).show();
        }
    },


    OnKeyUp: function( keyCode )
    {
        if( this.isInBuildMode )
        {
            this.buildManager.onKeyUp( keyCode );

            return;
        }

        switch( keyCode )
        {
            case 9:    // tab
                {
                    this.isTabDown = false;

                    if( this.isInArena )
                        $( "#arena-player-list" ).hide();
                }
                break;
        }
    },


    OnKeyDown: function( keyCode )
    {
        if( this.isInBuildMode )
        {
            this.buildManager.onKeyDown( keyCode );

            return;
        }

        switch( keyCode )
        {
            case 27:    // escape
                this.EndMission( false );
                break;

            case 9:    // tab
                this.isTabDown = true;

                if( this.isInArena )
                    $( "#arena-player-list" ).show();

                break;

            case 'E'.charCodeAt( 0 ):
            case 'L'.charCodeAt( 0 ):
            case 'S'.charCodeAt( 0 ):
                this._playerShip.AdjustEngineOutput( String.fromCharCode( keyCode ) );
                break;

            case 'T'.charCodeAt( 0 ):
                this._playerShip.AdjustThrottle();
                break;

            case 'F'.charCodeAt( 0 ):
            case 'R'.charCodeAt( 0 ):
            case 'M'.charCodeAt( 0 ):
                this._playerShip.AdjustShield( String.fromCharCode( keyCode ) );
                break;

            case 'P'.charCodeAt( 0 ):
                $( "#PortalPanel" ).toggle();
                break;

            case 'B'.charCodeAt( 0 ):
                this.setBuildMode( true );
                break;

            case 'N'.charCodeAt( 0 ):
                $( "#Container" ).toggle();
                break;

            case 'C'.charCodeAt( 0 ):
                if( this.droneMesh != null )
                    this._scene.remove( this.droneMesh );

                this.droneMesh = new THREE.Mesh( XhtmlWingGame.DroneGeometry, XhtmlWingGame.DroneMaterial );

                this.droneMesh.position = this._playerShip.Position.clone();
                this.droneMesh.position.add( this._playerShip.Forward.clone().multiplyScalar( 40 ) );

                this.droneMesh.rotation = this._playerShip.GetOrientationEuler();

                this._scene.add( this.droneMesh );

                break;
        }
    },

    // Release resources created in Init()
    Term: function()
    {
        this._cockpitUI.Term();
    }
};

XhtmlWingGame.SpaceDushGeometry = new THREE.SphereGeometry( 0.375, 5, 5 );