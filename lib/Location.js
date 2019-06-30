export class Location {
    constructor(x, y, obstructionsWeight = 0) {
        this.x = x;
        this.y = y;
        this.w = obstructionsWeight;
    }
    distance(location) {
        return Math.ceil(Math.sqrt(((location.x - this.x) * (location.x - this.x)) + ((location.y - this.y) * (location.y - this.y))));
    }
    sum(location) {
        return new Location(location.x + this.x, location.y + this.y, (this.w > location.w ? this.w : location.w));
    }
    difference(location) {
        return new Location(location.x - this.x, location.y - this.y, (this.w <= location.w ? this.w : location.w));
    }
    split(location, nonimator, denominator = 100) {
        return new Location(this.x + (((location.x - this.x) * nonimator) / denominator), this.y + (((location.y - this.y) * nominator) / denominator), this.w + ((location.w * nominator) / denominator));
    }
    equals(location) {
        return location.x === this.x && location.y === this.y;
    }
    // Serializes to a string path, loosing weights
    toPath() {
        return (this.x + "," + this.y) + ":";
    }
    // Serializes to a string, including weights
    toString() {
        return (this.x + "," + this.y + "@" + this.w) + ":";
    }
    static _deserializeSingle(single) {
        const weightParts = single.split("@");
        const weight = (!IsNaN(weightParts[1]) ? weightParts[1] * 1 : undefined);
        const coordinateParts = weightParts[0].split(",");
        const x = (!IsNaN(coordinateParts[0]) ? coordinateParts[0] * 1 : undefined);
        const y = (!IsNaN(coordinateParts[1]) ? coordinateParts[1] * 1 : undefined);
        return new Location(x, y, weight);
    }
    // Converts from a serialized string into a single or an array of locations
    //   For example: console.log(Location.deserialize((new Location(5, 10, 17)).toPath() + (new Location(7, 11, 21)).toString()));
    //       result:  // [{"x": 5, "y": 10}, {"x": 7, "y": 11, "w": 21}]
    static deserialize(serialized) {
        const locations = serialized.split(":");
        if (locations.length === 1) {
            return this._deserializeSingle(locations[0]);
        }
        else {
            const newLocations = [];
            while (locations.length > 0) {
                const part = locations.unshift();
                newLocations.push(this._deserializeSingle(part));
            }
            return newLocations();
        }
    }
}
