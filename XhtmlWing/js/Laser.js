
/*
Copyright (c) 2011 Taylor Clark.

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
*/

/**
* Represents a bullet launched from a ship out to hit another
* @param {!Spaceship} owningShip The ship that fired the laser
* @constructor
*/
function Laser( owningShip )
{
	this.Direction = owningShip.Forward.clone();	
	this.Direction.multiplyScalar( Laser.LASER_SPEED );

	this.Mesh = new THREE.Mesh( Laser.CYLINDER, owningShip.IsGoodGuy ? Laser.MATERIAL_RED : Laser.MATERIAL_GREEN );
	this.Mesh.position = owningShip.Position.clone();
	this.Mesh.rotation = owningShip.Mesh ? owningShip.Mesh.rotation : owningShip.GetOrientationEuler();
	
	var muzzleOffset = owningShip.Weapons[owningShip.NextWeaponToUse].MuzzleOffset.clone();
	
	// Update the ship to use the next muzzle
	owningShip.NextWeaponToUse = (owningShip.NextWeaponToUse + 1) % owningShip.Weapons.length;
	
	var laserStartPos = owningShip.Position.clone();
	laserStartPos.add( owningShip.Right.clone().multiplyScalar(muzzleOffset.x) );
	laserStartPos.add( owningShip.Up.clone().multiplyScalar(muzzleOffset.y) );
	laserStartPos.add( owningShip.Forward.clone().multiplyScalar(muzzleOffset.z) );
	
	this.Mesh.position = laserStartPos;
	
	this.Damage = 20;
	
	XhtmlWingGame.MainGame._scene.add( this.Mesh );
	
	this.OwningShip = owningShip;
	
	// The amount, in seconds, that this laser will stay active
	this.RemainingLife = 3;
}

// These are set in XhtmlWingGame.Init
Laser.CYLINDER = null;
Laser.MATERIAL_GREEN = null;
Laser.MATERIAL_RED = null;

Laser.CYLINDER = new THREE.CylinderGeometry( 0.5, 0.5, 50, 7, 1, false );
Laser.CYLINDER.applyMatrix( new THREE.Matrix4().makeRotationX( Math.PI / 2 ) );
Laser.MATERIAL_GREEN = new THREE.MeshBasicMaterial( { color: 0x22FF33, wireframe: false } );
Laser.MATERIAL_RED = new THREE.MeshBasicMaterial( { color: 0xFF2233, wireframe: false } );

Laser.LASER_SPEED = 1250;