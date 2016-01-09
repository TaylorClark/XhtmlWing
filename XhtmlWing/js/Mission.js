
/*
Copyright (c) 2011 Taylor Clark.

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
*/

/**
* Represents a ship that's part of a mission
* @constructor
*/
function MissionShip( position, typeName, isGoodGuy )
{
    this.Position = position;
    this.ShipTypeName = typeName || "Normal";
    this.IsGoodGuy = isGoodGuy || false;
}

/**
* Represents a mission and its goals
* @constructor
*/
function Mission()
{
    this.Title = "";
    
    this.Description = "";
    
    /**
    * The location of ships that are part of the mission
    * @type Array.<MissionShip>
    */
    this.MissionShips = [];
    
    // The curve on which hoops are generated
    this.HoopSpline = null;
    
    // The number of hoops along the curved path
    this.NumHoops = 0;
}

/**
* Create a mission for the secret Star Wars mode
* @param {!number} numEnemies The number of enemies to generate in the skirmish
* @return {Mission} The generated skirmish mission
*/
Mission.MakeStarWars = function( numEnemies )
{
    var retMission = new Mission();

    retMission.Title = "XHTML-Wing vs. Tie Fighter";

    retMission.Description = "Battle Darth Vader and his escorts<br />Thanks to <a href='http://www.blendswap.com/blends/author/benjob/' target='_blank'>BenJob</a> for the models.";

    // Generate the enemy position
    var enemyZ = -500;
    retMission.MissionShips.push( new MissionShip( new THREE.Vector3( -100, 0, enemyZ - 100 ), "Tie" ) );
    retMission.MissionShips.push( new MissionShip( new THREE.Vector3( -50, 0, enemyZ - 50 ), "Tie" ) );
    retMission.MissionShips.push( new MissionShip( new THREE.Vector3( 0, 0, enemyZ ), "VadersTie" ) );
    retMission.MissionShips.push( new MissionShip( new THREE.Vector3( 50, 0, enemyZ - 50 ), "Tie" ) );
    retMission.MissionShips.push( new MissionShip( new THREE.Vector3( 100, 0, enemyZ - 100 ), "Tie" ) );

    retMission.MissionShips.push( new MissionShip( new THREE.Vector3( 50, 0, 50 ), "XWing", true ) );
    retMission.MissionShips.push( new MissionShip( new THREE.Vector3( 100, 0, 0 ), "XWing", true ) );

    return retMission;
}


/**
* Create a mission that is combat with multiple enemies
* @param {!number} numEnemies The number of enemies to generate in the skirmish
* @return {Mission} The generated skirmish mission
*/
Mission.MakeSkirmish = function( numEnemies )
{
    // We need at least one enemy
    if( numEnemies < 1 )
        numEnemies = 1;
        
    var retMission = new Mission();
    
    retMission.Title = "Combat Drone Skirmish";
    
    if( numEnemies == 1 )
        retMission.Description = "Destroy the combat drone.";
    else
        retMission.Description = "Destroy the " + numEnemies + " combat drones.";
        
    // Generate the enemy position
    for( var enemyIndex = 0; enemyIndex < numEnemies; ++enemyIndex )
        retMission.MissionShips.push( new MissionShip( Util.GetRandomPointInSphere( 2000 ) ) );
    
    return retMission;
}

Mission.MakeArena = function()
{
    return Mission.MakeSkirmish( 5 );
}

Mission.Missions = [];

Mission.Missions.push( new Mission() );
Mission.Missions.push( new Mission() );
Mission.Missions.push( new Mission() );

Mission.Missions[0].Title = "Basic Pilot Skills";
Mission.Missions[0].Description = "Fly through the hoops, in order. The green hoop indicates the next hoop to pass through and can be found on your radar as a green blip.";

var ZOffset = -	50;
var ZScale = -450;
Mission.Missions[0].HoopSpline = new THREE.Spline( [ new THREE.Vector3(0,0,ZOffset + 1 * ZScale),
                                                    new THREE.Vector3(0,0,ZOffset + 3 * ZScale),
                                                    new THREE.Vector3(-100,150,ZOffset + 4 * ZScale),
                                                    new THREE.Vector3(-150,250,ZOffset + 5 * ZScale),
                                                    new THREE.Vector3(200,0,ZOffset + 6 * ZScale),
                                                    new THREE.Vector3(400,-250,ZOffset + 7 * ZScale) ] );
Mission.Missions[0].NumHoops = 12;
                                        
Mission.Missions[1].Title = "Target Practice";
Mission.Missions[1].Description = "Destroy the non-combat drone. Enemies are marked on your radar with red blips.";
Mission.Missions[1].MissionShips = [new MissionShip( new THREE.Vector3( 0, 50, -500 ) )];
                                        
Mission.Missions[2].Title = "Combat";
Mission.Missions[2].Description = "Destroy the two combat drones.";
Mission.Missions[2].MissionShips = [new MissionShip( new THREE.Vector3( 150, 150, -500 ) ),
                                        new MissionShip( new THREE.Vector3(-150, -150, -500) ) ];