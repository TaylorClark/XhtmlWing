function BuildManager( centerPos )
{
    this.cells = null;

    this.moveVector = new THREE.Vector2();

    this.centerPos = centerPos;

    this.orbitRadius = BuildManager.InitialBuildRadius;

    this.zoomAmount = 0;

    this.MoveSpeed = 200;

    this.boxes = [];

    this.hilite_blockMesh = null;
}

BuildManager.InitialBuildRadius = 200;
BuildManager.BlockSize = 25;
BuildManager.BlockGeometry = new THREE.CubeGeometry( BuildManager.BlockSize, BuildManager.BlockSize, BuildManager.BlockSize );
BuildManager.BlockHalfExtent = new THREE.Vector3( BuildManager.BlockSize / 2, BuildManager.BlockSize / 2, BuildManager.BlockSize / 2 );
BuildManager.MetalBoxTexture = THREE.ImageUtils.loadTexture( "img/structure-cube-face.jpg" );

BuildManager.prototype = 
{
    update:function( frameTime )
    {
        // If the player is moving
        if( this.moveVector.lengthSq() > 0 || this.zoomAmount != 0 )
        {
            var playerShip = XhtmlWingGame.MainGame._playerShip;

            var moveVector = playerShip.Right.clone().multiplyScalar( this.moveVector.x * this.MoveSpeed * frameTime );
            moveVector.add( playerShip.Up.clone().multiplyScalar( this.moveVector.y *this.MoveSpeed * frameTime ) );

            var newPos = playerShip.Position.clone().add( moveVector );

            newPos.sub( this.centerPos );

            newPos.normalize();

            playerShip.Forward = newPos.clone().negate();

            this.orbitRadius += this.zoomAmount;
            this.zoomAmount = 0;

            newPos.multiplyScalar( this.orbitRadius );

            newPos.add( this.centerPos );

            playerShip.Position = newPos;
            
            playerShip.Up.crossVectors( playerShip.Right, playerShip.Forward );
            playerShip.Up.normalize();
            
            playerShip.Right.crossVectors( playerShip.Forward, playerShip.Up );
            playerShip.Right.normalize();
        }


        var mouseRay = this.getMouseRay( PageInput.MousePos );
        var intInfo = this.getIntersectBoxInfo( mouseRay );
        if( intInfo !== null )
        {
            if( this.hilite_blockMesh === null )
            {
                this.hilite_material = new THREE.MeshBasicMaterial( { color: 0x00FF00, ambient: 0x00FF00, emissive:0x00FF00, transparent: true, opacity: 0.125, wireframe: false } );
                this.hilite_blockMesh = new THREE.Mesh( BuildManager.BlockGeometry, this.hilite_material );
                XhtmlWingGame.MainGame._scene.add( this.hilite_blockMesh );
            }

            var newBox = this.getNeighborBox( intInfo.intBox, intInfo.intPos );

            this.hilite_blockMesh.position = newBox.center();            

            this.hilite_blockMesh.visible = true;
        }
        else if( this.hilite_blockMesh !== null )
            this.hilite_blockMesh.visible = false;
    },


    term:function()
    {
        if( this.hilite_blockMesh !== null )
            XhtmlWingGame.MainGame._scene.remove( this.hilite_blockMesh );
    },


    ///////////////////////////////////////////////////////////////////////////////////////////////
    // Get the box that would be generated if the user placed a block
    ///////////////////////////////////////////////////////////////////////////////////////////////
    getIntersectBoxInfo:function(mouseRay)
    {
         var minIntDistSq = Number.MAX_VALUE;
        var intBox = null;
        var minIntPos = -1;
        for( var i = 0; i < this.boxes.length; ++i )
        {
            var curBox = this.boxes[i];

            var intPos = mouseRay.intersectBox( curBox );
            if( intPos != null )
            {
                var intDistSq = intPos.clone().sub( mouseRay.origin ).lengthSq();

                if( intDistSq < minIntDistSq )
                {
                    minIntDistSq = intDistSq;
                    intBox = curBox;
                    minIntPos = intPos;
                }
            }
        }

        if( intBox === null )
            return null;

        return {
            intBox: intBox,
            intPos: minIntPos
        };
    },

    getNeighborBox:function( box, intPos )
    {
        var boxCenter = box.center();

        var normal = new THREE.Vector3().subVectors( intPos, box.center() );

        // If we're on the left or right
        if( Math.abs( normal.x ) > Math.abs( normal.y )
            && Math.abs( normal.x ) > Math.abs( normal.z ) )
        {
            if( normal.x < 0 )
                normal.set( -1, 0, 0 );
            else
                normal.set( 1, 0, 0 );
        }
        // Or if we're on the top or obttom
        else if( Math.abs( normal.y ) > Math.abs( normal.x )
            && Math.abs( normal.y ) > Math.abs( normal.z ) )
        {
            if( normal.y < 0 )
                normal.set( 0, -1, 0 );
            else
                normal.set( 0, 1, 0 );
        }
        // Or if we're on the front or back
        else if( Math.abs( normal.z ) > Math.abs( normal.x )
            && Math.abs( normal.z ) > Math.abs( normal.y ) )
        {
            if( normal.z < 0 )
                normal.set( 0, 0, -1 );
            else
                normal.set( 0, 0, 1 );
        }

        var min = box.min.clone();
        var max = box.max.clone();

        var moveAmount = normal.clone().multiplyScalar( BuildManager.BlockSize );
        min.add( moveAmount );
        max.add( moveAmount );
        return new THREE.Box3( min, max );
    },


    getMouseRay:function( mousePos )
    {
        var testPos = new THREE.Vector2();
        testPos.x = ( mousePos.X / window.innerWidth ) * 2 - 1;
        testPos.y = -( mousePos.Y / window.innerHeight ) * 2 + 1;

        var projector = new THREE.Projector();
        var mouseVector = new THREE.Vector3( testPos.x, testPos.y, 1 );
        mouseVector = projector.unprojectVector( mouseVector, XhtmlWingGame.MainGame._camera );
        mouseVector.sub( XhtmlWingGame.MainGame._camera.position );
        mouseVector.normalize();

        return new THREE.Ray( XhtmlWingGame.MainGame._camera.position, mouseVector );
    },


    ///////////////////////////////////////////////////////////////////////////////////////////////
    // Remove a box from the building
    ///////////////////////////////////////////////////////////////////////////////////////////////
    removeBox:function( box )
    {
        XhtmlWingGame.MainGame._scene.remove( box.mesh );

        var boxIndex = $.inArray( box, this.boxes );

        // Remove the box from the array
        if (boxIndex >= 0)
            this.boxes.splice(boxIndex, 1);
    },


    ///////////////////////////////////////////////////////////////////////////////////////////////
    // Occurs when the user presses a mouse button or touches the screen
    ///////////////////////////////////////////////////////////////////////////////////////////////
    onMouseDown: function( touchPos, isLeft )
    {
        var mouseRay = this.getMouseRay( touchPos );
        var intInfo = this.getIntersectBoxInfo( mouseRay );

        // If we didn't click on a box, but there are boxes then do nothing
        if( intInfo === null && this.boxes.length > 0 )
            return;

        // If the user right-clicked (left=true,right=false,touch or middle = null)
        if( isLeft === false )
        {
            this.removeBox( intInfo.intBox );
            return;
        }

        var material = new THREE.MeshBasicMaterial( { color: 0xAAAAAA, ambient: 0xAAAAAA, map: BuildManager.MetalBoxTexture, wireframe: false } );
        var newBlockMesh = new THREE.Mesh( BuildManager.BlockGeometry, material );
        var newBox = null;

        if( intInfo !== null )
        {
            newBox = this.getNeighborBox( intInfo.intBox, intInfo.intPos );            
        }
        // Otherwise place a new block
        else
        {
            var min = this.centerPos.clone().add( BuildManager.BlockHalfExtent.clone().negate() );
            var max = this.centerPos.clone().add( BuildManager.BlockHalfExtent );

            newBox = new THREE.Box3( min, max );            
        }

        this.boxes.push( newBox );

        newBox.mesh = newBlockMesh;
        newBlockMesh.position = newBox.center();            

        XhtmlWingGame.MainGame._scene.add( newBlockMesh );
    },

    onKeyDown:function( keyCode )
    {
        switch( keyCode )
        {
            case 27:    // escape
                XhtmlWingGame.MainGame.setBuildMode( false );
                break;

            case 'W'.charCodeAt( 0 ):
                this.moveVector.y = 1;
                break;

            case 'A'.charCodeAt( 0 ):
                this.moveVector.x = -1;
                break;

            case 'S'.charCodeAt( 0 ):
                this.moveVector.y = -1;                
                break;

            case 'D'.charCodeAt( 0 ):
                this.moveVector.x = 1;
                break;
        }
    },

    onKeyUp: function( keyCode )
    {
        switch( keyCode )
        {

            case 'W'.charCodeAt( 0 ):
            case 'S'.charCodeAt( 0 ):
                this.moveVector.y = 0;
                break;

            case 'A'.charCodeAt( 0 ):
            case 'D'.charCodeAt( 0 ):
                this.moveVector.x = 0;
                break;
        }
    },

    onMouseWheel: function( delta )
    {
        this.zoomAmount = 50 * ( delta < 0 ? 1 : -1 );        
    }
};