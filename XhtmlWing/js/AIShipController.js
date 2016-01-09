/*
Copyright (c) 2011 Taylor Clark.

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
*/

/**
* Represents an object that controls a ship
* @constructor
*/
function AIShipController(ship)
{
    /**
    * The ship this AI controller affects
    * @type {!Spaceship}
    * @public
    */
    this.Ship = ship;

    /**
    * The ship this AI wants to attack
    * @type {!Spaceship}
    * @public
    */
    this.Target = null;

    /**
    * The current state the AI is in.
    * @public
    */
    this.CurrentState = AIShipController.STATE_Random;

    /**
    * A time used by the AI to figure out what it should be doing depending on its state
    * @type {!number}
    * @private
    */
    this._elapsedTime = 0;

    /**
    * The time used in the evade state to indicate the ship should change directions
    * @type {!number}
    * @private
    */
    this._evadeRandomTime = 0;

    /**
    * The normalized skill of this AI. Affects evasion (Frequency the AI changes direction) and
    * accuracy (leading the target).
    * @type {!number}
    * @public
    */
    this.Skill = 0.25;

    /**
    * A helper to prevent creating a vector3 each time since it's needed every update.
    * @type {!THREE.Vector3}
    * @private
    */
    this._toTarget = new THREE.Vector3();
}

AIShipController.STATE_Engage = 0;
AIShipController.STATE_Evade = 1;
AIShipController.STATE_Random = 2;
AIShipController.STATE_Formation = 3;

// How close this AI will get to its target before flipping around and trying to evade
AIShipController.EngageMinDist = 120;
AIShipController.EngageMinDistSq = AIShipController.EngageMinDist * AIShipController.EngageMinDist;

// How far away this AI will travel to get away from its target before it turns around to engage
AIShipController.EvadeMaxDist = 450;
AIShipController.EvadeMaxDistSq = AIShipController.EvadeMaxDist * AIShipController.EvadeMaxDist;

/**
* Generate a random 3D vector with a magnitude of 1
* @return {!THREE.Vector3} The generated vector
*/
AIShipController.GetRandomNormalizedVector3 = function ()
{
    var retVector = new THREE.Vector3();
    
    retVector.x = (Math.random() * 2) - 1;
    retVector.y = (Math.random() * 2) - 1;
    retVector.z = (Math.random() * 2) - 1;
    
    if( retVector.lengthSq() == 0 )
        retVector.x = 1;
    else		
        retVector.normalize();
        
    return retVector;
}


AIShipController.prototype =
{
    /**
    * Update the AI logic
    * @param {!number} frameTime The amount of time elapsed, in seconds, since the last update
    */
    Update: function( frameTime )
    {
        this._elapsedTime += frameTime;

        if( this.Target != null )
            this._toTarget.subVectors( this.Target.Position, this.Ship.Position );

        switch( this.CurrentState )
        {
            case AIShipController.STATE_Engage:
                {
                    if( this.Target != null )
                    {
                        // If we are too close to our target then bail out
                        if( this._toTarget.lengthSq() < AIShipController.EngageMinDistSq )
                        {
                            this.CurrentState = AIShipController.STATE_Evade;
                            this.Ship.IsTriggerPulled = false;
                        }
                        else
                        {
                            // If we are pointed toward our target
                            this.Ship.IsTriggerPulled = this._toTarget.dot( this.Ship.Forward ) > 0.375;

                            // Let the skill determine how "on target" this AI is when shooting
                            var targetPos = this.Target.Position.clone();
                            targetPos.add( this.Target.Forward.clone().multiplyScalar( -this.Target.BoundingRadius + ( this.Skill * this.Target.BoundingRadius * 1.1 ) ) );

                            this._toTarget.subVectors( targetPos, this.Ship.Position );

                            this.Ship.TargetHeading = this._toTarget;
                        }
                    }
                }
                break;

            case AIShipController.STATE_Evade:

                if( this.Target != null )
                {
                    if( this._toTarget.lengthSq() > AIShipController.EvadeMaxDistSq )
                    {
                        this.CurrentState = AIShipController.STATE_Engage;
                    }
                    else
                    {
                        //if( this._elapsedTime > this._evadeRandomTime )
                        {
                            this._toTarget.multiplyScalar( -1 );
                            /*
                            this._toTarget.x *= Math.random() * 5;
                            this._toTarget.y *= Math.random() * 5;
                            this._toTarget.z *= Math.random() * 5;
                            */
                            this.Ship.TargetHeading = this._toTarget;

                            this._evadeRandomTime = Math.random() * 2;
                            this._elapsedTime = 0;
                        }
                    }
                }

                break;

            case AIShipController.STATE_Random:
                if( this._elapsedTime > 2.0 )
                {
                    this._elapsedTime = 0;

                    this.Ship.TargetHeading = AIShipController.GetRandomNormalizedVector3();
                }
                break;
        }
    }
}