function Portal( pos, rotation, forward, destinationAreaIndex )
{
    this.mesh = null;

    this.isActive = false;

    this.remaingingTime = 2;

    this.hoopList = null;

    if( Portal.Geometry === null )
    {
        this.temp_pos = pos;
        this.temp_forward = rotation;

        var thisPortal = this;
        var loader = new THREE.JSONLoader();

        loader.load( "models/Portal.js", function( geom, materials )
        {
            Portal.Geometry = geom;

            var material = materials[0];
            Portal.Material = new THREE.MeshBasicMaterial( { map: material.map } );

            thisPortal.init( pos, rotation, forward, destinationAreaIndex );
        }, { normalizeRGB: true } );
    }
    else
        this.init( pos, rotation, forward, destinationAreaIndex );
}


Portal.Geometry = null;
Portal.Material = null;
Portal.GrowTime = 0.625;
Portal.TimeAlive = 10;
Portal.FullScale = 4.25;
Portal.EntryHoopLength = 200;

var loader = new THREE.JSONLoader();

loader.load( "models/Portal.js", function ( geom, materials ) {
    Portal.Geometry = geom;

    var material = materials[0];
    Portal.Material = new THREE.MeshBasicMaterial( { map: material.map});					
} );


Portal.prototype =
{
    init:function(pos, rotation, forward, destinationAreaIndex)
    {
        this.isActive = true;
        this.remaingingTime = Portal.TimeAlive;

        this.mesh = new THREE.Mesh( Portal.Geometry, Portal.Material );

        var hoopRayDir = forward.clone().multiplyScalar( Portal.EntryHoopLength );

        this.mesh.position = pos.clone().add( hoopRayDir );
        this.mesh.rotation = rotation.clone();

		var s = 1;
		this.mesh.scale.set( s, s, s );
		XhtmlWingGame.MainGame._scene.add( this.mesh );

		this.hoopList = new HoopList();

		//this.destinationAreaIndex = destinationAreaIndex;
		//var thisPortal = this;
		this.hoopList.initAlongRay( pos, hoopRayDir, 3, function()
		{
		    XhtmlWingGame.MainGame.goToNewArea( destinationAreaIndex );
		} );

        XhtmlWingGame.MainGame._hoopLists.push( this.hoopList );
    },

    update:function( frameTime )
    {
        var prevGrowTime = Portal.GrowTime - ( Portal.TimeAlive - this.remaingingTime );

        this.remaingingTime -= frameTime;

        var growTime = Portal.GrowTime - (Portal.TimeAlive - this.remaingingTime);
        if( prevGrowTime > 0 )
        {
            var scale = Portal.FullScale;
            if( growTime > 0 )
                scale = ((Portal.GrowTime - growTime) / Portal.GrowTime) * Portal.FullScale;

            this.mesh.scale.set( scale, scale, scale );
        }

        if( this.remaingingTime < 0 )
        {
            this.isActive = false;
            XhtmlWingGame.MainGame._scene.remove( this.mesh );

            // Remove this list from the game
            var hoopListIndex = $.inArray( this.hoopList, XhtmlWingGame.MainGame._hoopLists );
            if (hoopListIndex >= 0)
                XhtmlWingGame.MainGame._hoopLists.splice(hoopListIndex, 1);

            //XhtmlWingGame.MainGame._hoopLists = $.grep( XhtmlWingGame.MainGame._hoopLists, function( hl ) { return hl == this; } );

            this.hoopList.remove();
        }

        this.mesh.rotation.z += 1 * frameTime;
    }
};