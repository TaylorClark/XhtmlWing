function AreaDescriptor()
{
    this.asteroidModelFiles = [];

    this.asteroidModels = [];

    this.asteroidFields = [];

    //this.asteroidFields.push( new AsteroidField( this ) );

    this.skyboxImage_Prefix = "space_skybox/moreblue/space_skybox_";
    this.skyboxImage_Extension = ".jpg";
};


AreaDescriptor.prototype =
{
    load: function( onLoaded )
    {
        // If there are no asteroids
        if( this.asteroidModelFiles === null || this.asteroidModelFiles.length === 0 )
        {
            onLoaded();
        }
        else
        {
            var loader = new THREE.JSONLoader();

            var currentArea = this;

            var numAsteroidsLoaded = 0;

            var onAsteroidLoaded = function( geom, materials )
            {
                currentArea.asteroidModels.push(
                    {
                        geometry: geom,
                        material: materials[0]
                    } );

                ++numAsteroidsLoaded;

                if( numAsteroidsLoaded >= currentArea.asteroidModelFiles.length )
                    onLoaded();
            };

            for( var i = 0; i < this.asteroidModelFiles.length; ++i )
                loader.load( this.asteroidModelFiles[i], onAsteroidLoaded );
        }
    }
};


AreaDescriptor.Area1 = new AreaDescriptor();
AreaDescriptor.Area1.skyboxImage_Prefix = "space_skybox/moreblue/space_skybox_";
AreaDescriptor.Area1.skyboxImage_Extension = ".jpg";

AreaDescriptor.Area2 = new AreaDescriptor();
AreaDescriptor.Area2.skyboxImage_Prefix = "space_skybox/green/green_";
AreaDescriptor.Area2.skyboxImage_Extension = ".jpg";

AreaDescriptor.Area3 = new AreaDescriptor();
var asteroidPath = "models/Asteroids/red/asteroid";
AreaDescriptor.Area3.asteroidModelFiles = [asteroidPath + "1.js",
                            asteroidPath + "2.js",
                            asteroidPath + "3.js",
                            asteroidPath + "4.js",
                            asteroidPath + "5.js",
                            asteroidPath + "6.js",
                            asteroidPath + "7.js"];
AreaDescriptor.Area3.asteroidFields.push( new AsteroidField( AreaDescriptor.Area3 ) );
AreaDescriptor.Area3.skyboxImage_Prefix = "space_skybox/orange/orange_";
AreaDescriptor.Area3.skyboxImage_Extension = ".jpg";

AreaDescriptor.Areas = [AreaDescriptor.Area1, AreaDescriptor.Area2, AreaDescriptor.Area3];