function Asteroid( mesh, rotationSpeed, modelIndex )
{
    this.mesh = mesh;
    this.rotationSpeed = rotationSpeed || new THREE.Vector3( 1, 0, 0 );
    this.modelIndex = modelIndex || 0;
}


function AsteroidField( owningArea )
{
    this._areaDescriptor = owningArea;
    this._asteroids = [];
    this._modelPath = "models/Asteroids/";
}


function RangeRandom( range )
{
    var normValue = ( Math.random() * 2 ) - 1;
    return normValue * range;
}

AsteroidField.prototype =
{
    init: function ( scene, asteroidModels )
    {
        this.generate( scene, 0, asteroidModels );
    },

    update: function( frameTime )
    {
        var asteroidIndex = this._asteroids.length - 1;
        //for( var i = 0; i < this._asteroids.length; ++i )
        while( asteroidIndex-- > 0 )
        {
            var asteroid = this._asteroids[asteroidIndex];

            asteroid.mesh.rotation.x += asteroid.rotationSpeed.x * frameTime;
            asteroid.mesh.rotation.y += asteroid.rotationSpeed.y * frameTime;
            asteroid.mesh.rotation.z += asteroid.rotationSpeed.z * frameTime;
        }
    },


    ///////////////////////////////////////////////////////////////////////////////////////////////
    // Prepare the models needed to display the asteroid field
    ///////////////////////////////////////////////////////////////////////////////////////////////
    generate: function ( scene, areaId )
    {
        var numAsteroids = 1500;
        
        var Range = 2500;
        var MaxRotationSpeed = 1;

        for( var i = 0; i < numAsteroids; ++i )
        {
            var pos = new THREE.Vector3( RangeRandom( Range ), RangeRandom( Range ), RangeRandom( Range ) );

            
            var rotationSpeed = new THREE.Vector3( RangeRandom( MaxRotationSpeed ), RangeRandom( MaxRotationSpeed ), RangeRandom( MaxRotationSpeed ) );

            var modelIndex = Math.floor( Math.random() * this._areaDescriptor.asteroidModels.length );

            var asteroidModelInfo = this._areaDescriptor.asteroidModels[ modelIndex ];
            var asteroidMesh = new THREE.Mesh( asteroidModelInfo.geometry, asteroidModelInfo.material );

            asteroidMesh.position = pos;

            var scale = (0.5 + Math.random()) * 20;
            asteroidMesh.scale = new THREE.Vector3( scale, scale, scale );

            var newAsteroid = new Asteroid( asteroidMesh, rotationSpeed );

            this._asteroids.push( newAsteroid );

            scene.add( asteroidMesh );
        }
    }
};