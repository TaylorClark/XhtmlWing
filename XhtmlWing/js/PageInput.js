
/*
Copyright (c) 2011 Taylor Clark.

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
*/

/**
* Handles mouse and touch input and provides a simple interface to handle both
*/
var PageInput =
{
    IsTouchEnabled: false,

    // The page to which input is passed
    _pageObject: null,

    MousePos: null,

    /**
	* Hook up the object that will handle mouse and touch input
	*/
    Init: function( page )
    {
        PageInput._pageObject = page;

        PageInput.IsTouchEnabled = ( !!( 'ontouchstart' in window ) ? 1 : 0 );

        if( PageInput._pageObject.OnKeyDown )
            document.addEventListener( "keydown", PageInput.OnKeyDown, false );

        if( PageInput._pageObject.OnKeyUp )
            document.addEventListener( "keyup", PageInput.OnKeyUp, false );

        if( PageInput._pageObject.OnMouseWheel )
            document.addEventListener( "mousewheel", PageInput.OnMouseWheel, false );

        // Hook up our event listeners that are handled by the page object
        if( PageInput.IsTouchEnabled )
        {
            document.addEventListener( "touchmove", PageInput.OnTouchMove, false );

            if( PageInput._pageObject.OnTouchStart )
                document.addEventListener( "touchstart", PageInput.OnTouchStart, false );

            if( PageInput._pageObject.OnTouchEnd )
                document.addEventListener( "touchend", PageInput.OnTouchEnd, false );
        }
        //else
        {
            document.addEventListener( 'mousemove', PageInput.OnMouseMove, false );

            if( PageInput._pageObject.OnTouchStart )
                document.addEventListener( 'mousedown', PageInput.OnMouseDown, false );

            if( PageInput._pageObject.OnTouchEnd )
                document.addEventListener( 'mouseup', PageInput.OnMouseUp, false );
        }
    },

    /**
	* Get the mouse position from an event object
	*/
    GetMousePos: function( e )
    {
        var posx = 0;
        var posy = 0;
        if( !e )
            var e = window.event;

        if( e.pageX || e.pageY )
        {
            posx = e.pageX;
            posy = e.pageY;
        }
        else if( e.clientX || e.clientY )
        {
            posx = e.clientX + document.body.scrollLeft
				+ document.documentElement.scrollLeft;

            posy = e.clientY + document.body.scrollTop
				+ document.documentElement.scrollTop;
        }
        // posx and posy contain the mouse position relative to the document
        return new Vector2( posx, posy );
    },

    OnMouseMove: function( e )
    {
        PageInput.MousePos = PageInput.GetMousePos( e );

        if( PageInput._pageObject.OnTouchMove )
            PageInput._pageObject.OnTouchMove( [PageInput.MousePos] );
    },

    OnMouseDown: function( e )
    {
        // e.which == 1 for the left mouse button, 3 for right
        if( PageInput._pageObject.OnTouchStart )
            PageInput._pageObject.OnTouchStart( [PageInput.GetMousePos( e )], e.which == 1 );
    },

    OnMouseUp: function( e )
    {
        // e.which == 1 for the left mouse button
        PageInput._pageObject.OnTouchEnd( e.which == 1 );
    },

    OnTouchStart: function( e )
    {
        // Only deal with one finger
        if( e.touches.length == 1 )
        {
            var touchVectors = [new Vector2( e.touches[0].pageX, e.touches[0].pageY )];
            for( var touchIndex = 1; touchIndex < e.touches.length; ++touchIndex )
                touchVectors.push( new Vector2( e.touches[touchIndex].pageX, e.touches[touchIndex].pageY ) );

            if( PageInput._pageObject.OnTouchStart )
                PageInput._pageObject.OnTouchStart( touchVectors, null );
        }
    },

    OnKeyUp: function( e )
    {
        PageInput._pageObject.OnKeyUp( e.keyCode );

        if( e.keyCode === 9 )
            e.preventDefault();
    },

    OnKeyDown: function( e )
    {
        PageInput._pageObject.OnKeyDown( e.keyCode );

        if( e.keyCode === 9 )
            e.preventDefault();
    },

    OnMouseWheel: function( e )
    {
        PageInput._pageObject.OnMouseWheel( e.wheelDelta );
    },

    OnTouchMove: function( e )
    {
        e.preventDefault();

        PageInput.MousePos = new Vector2( e.touches[0].pageX, e.touches[0].pageY );
        var touchVectors = [PageInput.MousePos];
        for( var touchIndex = 1; touchIndex < e.touches.length; ++touchIndex )
            touchVectors.push( new Vector2( e.touches[touchIndex].pageX, e.touches[touchIndex].pageY ) );

        PageInput._pageObject.OnTouchMove( touchVectors );
    },

    OnTouchEnd: function( e )
    {
        PageInput._pageObject.OnTouchEnd( null );
    }
};