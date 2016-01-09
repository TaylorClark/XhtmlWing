
/*
Copyright (c) 2011 Taylor Clark.

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
*/

/**
* Provides a few helper methods
*/
var Util =
{
    ///////////////////////////////////////////////////////////////////////////////////////////////
    // Remove all children from an element
    ///////////////////////////////////////////////////////////////////////////////////////////////
    RemoveAllChildren:function(element)
    {
        while (element.childNodes.length > 0)
            element.removeChild(element.firstChild);
    },
    
    
    GetQueryStringParameter: function (parameterName)
    {
        var fullQueryString = window.location.search.substring(1);
        var params = fullQueryString.split("&");

        var parameterValue = false;
        for (var paramIndex = 0; paramIndex < params.length; ++paramIndex)
        {
            var curParameterName = params[paramIndex].substring(0, params[paramIndex].indexOf('='));

            if (curParameterName == parameterName)
                parameterValue = params[paramIndex].substring(params[paramIndex].indexOf('=') + 1);
        }

        return parameterValue;
    },


    ///////////////////////////////////////////////////////////////////////////////////////////////
    // Get a random vector that is orthogonal to the input point
    ///////////////////////////////////////////////////////////////////////////////////////////////
    GetRandomOrthVector:function( normalVector )
    {
        // Found formula online for orthogonal vector
        var retVector = new THREE.Vector3( normalVector.y - normalVector.z, normalVector.z - normalVector.x, normalVector.x - normalVector.y );

        // If the return vector is zero, but the input isn't then that means the X, Y, Z components
        // are equal. Negating one component will give us an orthogonal vector.
        if( retVector.lengthSq() === 0 )
        {
            var randVect = new THREE.Vector3( 1, 2, 3 );

            // Cross the random vector with this vector
            retVector.crossVectors( normalVector, randVect );

            // Ensure it is orthogonal
            var dotVal = retVector.dot( normalVector );
            if( ( Math.abs(dotVal) > 0.0001 ) || retVector.isZero() )
            {
                // Try crossing with another vector
                randVect.set( -normalVector.x, -normalVector.y, normalVector.z );
                retVector.crossVectors( normalVector, randVect );
                dotVal = normalVector.dot( retVector );

                if( ( Math.abs(dotVal) > 0.0001 ) || retVector.isZero() )
                {
                    // Try crossing with another vector
                    randVect.set( normalVector.X, normalVector.Y, -normalVector.Z );
                    retVector.crossVectors( normalVector, randVect );
                    // Just use the vector at this point
                }
            }
        }

        return retVector;
    },
    
    
    ///////////////////////////////////////////////////////////////////////////////////////////////
    // Reflect the toReflect vector about the plane defined by the normal vector
    ///////////////////////////////////////////////////////////////////////////////////////////////
    ReflectAcross:function( normal, toReflect )
    {
        var reflected = normal.clone();
        reflected.multiplyScalar( 2 * toReflect.dot(normal) );
        reflected.subVectors( toReflect, reflected );
        
        return reflected;
    },

    
    ///////////////////////////////////////////////////////////////////////////////////////////////
    // Create a matrix that represents orientation
    ///////////////////////////////////////////////////////////////////////////////////////////////
    MakeOrientationMatrix:function( up, forward, right )
    {
        // If the right vector wasn't passed in then calculate it
        if( !right )
        {
            right = new THREE.Vector3();
            right.crossVectors( forward, up );
            right.normalize();
        }

        var retMatrix = new THREE.Matrix4();

        // The vectors make up the columns of the matrix
        retMatrix.elements[0] = right.x; retMatrix.elements[1] = right.y; retMatrix.elements[2] = right.z;
        retMatrix.elements[4] = up.x; retMatrix.elements[5] = up.y; retMatrix.elements[6] = up.z;
        retMatrix.elements[8] = forward.x; retMatrix.elements[9] = forward.y; retMatrix.elements[10] = forward.z;
        
        return retMatrix;
    },
    
    
    ///////////////////////////////////////////////////////////////////////////////////////////////
    // Get a random position within a sphere
    ///////////////////////////////////////////////////////////////////////////////////////////////
    GetRandomPointInSphere:function( radius )
    {
        // Get a random point in the sphere
        var retPoint = new THREE.Vector3( Math.random() * 2 - 1, Math.random() * 2 - 1, Math.random() * 2 - 1 );
        retPoint.normalize();
        
        retPoint.multiplyScalar( Math.random() * radius );
        
        return retPoint;
    },
    
    
    ///////////////////////////////////////////////////////////////////////////////////////////////
    // Get the time at which a ray intersects a sphere
    ///////////////////////////////////////////////////////////////////////////////////////////////
    GetRayIntSphereTime:function( ray, spherePos, sphereRadius )
    {
        var rayPosInSphereSpace = new THREE.Vector3();
        rayPosInSphereSpace.subVectors( ray.origin, spherePos );
        
        var A = ray.direction.dot(ray.direction);
        var B = 2 * rayPosInSphereSpace.dot(ray.direction);
        var C = rayPosInSphereSpace.dot(rayPosInSphereSpace) - sphereRadius * sphereRadius;
        var D = (B * B) - (4 * A * C);
        
        if( D <= 0.0 )
            return null;
            
        return (-B - Math.sqrt(D))/(2*A);
    },
    
    
    ///////////////////////////////////////////////////////////////////////////////////////////////
    // Project a vector onto a plane, defined by its normal. Modifies the input vector.
    ///////////////////////////////////////////////////////////////////////////////////////////////
    ProjectVectorOntoPlane:function(vector, planeNormal)
    {
        var projScalar = vector.dot(planeNormal) / planeNormal.lengthSq();
        
        vector.sub( planeNormal.clone().multiplyScalar(projScalar) );
    }
};