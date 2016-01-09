/**
* Represents a 2D geometric vector
* @constructor
*/
function Vector2(x, y)
{
	this.X = x || 0;
	this.Y = y || 0;
}

Vector2.prototype =
{
	/**
	* Add a vector to this vector
	* @param {!Vector2} rhs The vector that will be added to this vector
	*/
	Add: function (rhs)
	{
		this.X += rhs.X;
		this.Y += rhs.Y;
	},

	/**
	* Get the result of adding this vector to another vector without modifying this vector
	* @param {!Vector2} rhs The vector that will be added to this vector
	*/
	GetAddition: function (rhs)
	{
		return new Vector2(this.X + rhs.X, this.Y + rhs.Y);
	},

	/**
	* Subtract a vector from this vector
	* @param {!Vector2} rhs The vector that will be subtracted from this vector
	*/
	Subtract: function (rhs)
	{
		this.X -= rhs.X;
		this.Y -= rhs.Y;
	},

	/**
	* Get the result of subtracting a vector from this vector without modifying this vector
	* @param {!Vector2} rhs The vector that will be subtracted from this vector
	*/
	GetSubtraction: function (rhs)
	{
		return new Vector2(this.X - rhs.X, this.Y - rhs.Y);
	},

	/**
	* Scale this vector
	* @param {!number} scalar The amount to scale this vector
	*/
	Scale: function (scalar)
	{
		this.X *= scalar;
		this.Y *= scalar;
	},

	/**
	* Scale this vector
	* @param {!number} scalar The amount to scale this vector
	*/
	GetScaled: function (scalar)
	{
		return new Vector2(this.X * scalar, this.Y * scalar);
	},

	/**
	* Get the length, or magnitude, of this vector. Be aware that this includes a call to Math.sqrt.
	*/
	GetLength: function ()
	{
		return Math.sqrt(this.X * this.X + this.Y * this.Y);
	},

	/**
	* Get the squared length, or magnitude, of this vector
	*/
	GetLengthSq: function ()
	{
		return this.X * this.X + this.Y * this.Y;
	},

	/**
	* If non-zero, make the magnitude of this vector equal 1, but still preserve the directional
	* value.
	*/
	Normalize: function ()
	{
		var len = this.GetLength();
		if (len == 0.0)
			return;

		this.X /= len;
		this.Y /= len;
	},

	/**
	* Get a normalized (Length of 1) copy of this vector
	*/
	GetNormalized: function ()
	{
		var len = this.GetLength();
		if (len == 0.0)
			return null;

		return new Vector2(this.X / len, this.Y / len);
	},

	/**
	* Floor the X and Y components of this vector
	*/
	Floor: function ()
	{
		this.X = Math.floor(this.X);
		this.Y = Math.floor(this.Y);
	},

	/**
	* Get a copy of this vector with the floored values of the X and Y components
	*/
	GetFloor: function ()
	{
		var retVector = this.Clone();
		retVector.Floor();
		return retVector;
	},

	/**
	* Convert this vector to a descriptive string
	*/
	toString: function (rhs)
	{
		return "Vector2(" + this.X + "," + this.Y + ")";
	},

	/**
	* Make a copy of this vector
	*/
	Clone: function ()
	{
		return new Vector2(this.X, this.Y);
	},

	/**
	* Test if both components equal 0
	*/
	IsZero: function ()
	{
		return this.X == 0 && this.Y == 0;
	},

	/**
	* Get the angle, in radians, formed between this vector and (1,0)
	*/
	ToAngle: function ()
	{
		var retAngle = Math.acos(this.X / this.GetLength());
		if (this.Y < 0)
			retAngle = (Math.PI * 2.0) - retAngle;

		return retAngle;
	},

	/**
	* Get the dot product of two vectors
	*/
	Dot: function (rhs)
	{
		return this.X * rhs.X + this.Y * rhs.Y;
	},

	/**
	* Get the scalar that can be applied to the destination vector that would provide where the
	* source vector's "shadow" would end.
	*/
	GetProjectionScalar: function (projectDest)
	{
		return this.Dot(projectDest) / projectDest.GetLengthSq();
	},

	/**
	* Reflect this vector across another vector
	*/
	ReflectAcross: function (normal)
	{
		var dotVal = this.Dot(normal);

		var reflected = normal.Clone();
		reflected.Scale(2 * dotVal);

		reflected.Subtract(this);

		this.X = reflected.X;
		this.Y = reflected.Y;
	},

	/**
	* Get the vector that represents the result of reflecting this vector across another
	*/
	GetReflection: function (normal)
	{
		var retVector = this.Clone();
		retVector.ReflectAcross(normal);
		return retVector;
	},

	/**
	* Rotate the vector by a specfied number of radians
	*/
	Rotate: function (radians)
	{
		// Store the first value in a temporary variable since we need the original X for Y's calculation
		var tempX = this.X * Math.cos(radians) - this.Y * Math.sin(radians);
		this.Y = this.Y * Math.cos(radians) + this.X * Math.sin(radians);
		this.X = tempX;
	},

	/**
	* Get the vector that represents rotating this vector by a specfied number of radians
	*/
	GetRotated: function (radians)
	{
		var retVector = this.Clone();
		retVector.Rotate(radians);
		return retVector;
	}
};

/**
* Parse a string like "2.3,5.75"
*/
Vector2.FromSimpleString = function (pairString)
{
	// If we are parsing a string created from Vector2.toString then remove the Vector2 prefix
	var v2Prefix = "Vector2(";
	if (pairString.indexOf(v2Prefix) == 0)
		pairString = pairString.substr(0, v2Prefix.length);

	// Split the X and Y compenent strings
	pairString = pairString.split(",");

	// Parse the values. parseFloat() will ignore trailing characters, for example '1.23xwer' will
	// return a value of 1.23.
	return new Vector2(parseFloat(pairString[0]), parseFloat(pairString[1]));
}