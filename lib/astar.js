import { fabric } from "./lib/fabric";

class Enum {
    constructor(keyValueObject = undefined, freeze = true) {
        if (typeof(keyValueObject) === 'undefined') {
            keyValueObject = [];
            freeze = false;
        } else if (typeof(keyValueObject) !== 'object') {
            keyValueObject = [keyValueObject];
        }
        // If an array, flip key and value so value is an integer
        const valueIsArray = Array.isArray(keyValueObject);
        for (let key in keyValueObject) {
            const value = keyValueObject[key];
            if (valueIsArray) {
                this[value] = key;
            } else {
                this[key] = value;
            }
        }
        if (typeof(keyValueObject.getByKey) !== 'function') {
            // This returns a value when given a key. If the key happens to instead be a value in this enum, it returns that value.
            //   Otherwise, undefined is returned - signifying enumKey should be filtered out.
            this.getByKey = function(enumKey) {
                const value = this[enumKey];
                if (typeof(value) !== 'undefined') {
                    return value;
                }
                for (var item of Object.values(this)) {
                    if (item === enumKey) {
                        return enumKey;
                    }
                }
            };
        } else {
            this.getByKey = keyValueObject.getByKey;
        }
        if (typeof(keyValueObject.getByValue) !== 'function') {
            // This returns a key when given a value. If the value happens to instead be a key in this enum, it returns that key.
            //   Otherwise, undefined is returned - signifying enumValue should be filtered out.
            this.getByValue = function(enumValue) {
                let result = undefined;
                for (var item of Object.entries(this)) {
                    if (item.value === enumValue) {
                        return item.key;
                    } else if (item.key === enumValue) {
                        result = enumValue;
                    }
                }
                return result;
            };
        } else {
            this.getByValue = keyValueObject.getByValue;
        }
        if (freeze) {
            return Object.freeze(this);
        }
    }
}

// TODO: Maybe useful in future
class VariableAngles {
    constructor(angleRanges, angleUnmatched = undefined) {
        this.angleRanges = angleRanges;
        this.angleUnmatched = angleUnmatched;
    }
    getByValue(angle) {
        for (let angleRangeKey in this.angleRanges) {
            const angleRange = this.angleRanges[angleRangeKey];
            if (angleRange.radiusStart < angle && angle <= angleRange.radiusEnd) {
                return angleRangeKey;
            }
        }
        return this.angleUnmatched;
    }
}

class Location {
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
    ratioOfLine(location, nonimator, denominator = 100) {
        return new Location(this.x + (((location.x - this.x) * nonimator) / denominator),
                            this.y + (((location.y - this.y) * nominator) / denominator),
                            this.w + ((location.w * nominator) / denominator));
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
        } else {
            const newLocations = [];
            while(locations.length > 0) {
                const part = locations.unshift();
                newLocations.push(this._deserializeSingle(part));
            }
            return newLocations();
        }
    }
}

class MapCanvas {
    constructor(canvas) {
        this.canvas = canvas;
        this._availableAngles = new Enum({ left: 1, up: 2, right: 3, down: 4 });
    }

    // Angles are a combination of direction and path. Path does not have to be linear! It could be a curb or a nurb. And the possible angle movements could be 4 points of 2d locations.
    // TODO: Rename Angles to AnglePath?
    get availableAngles() {
        return this._availableAngles; 
    }

    collisionWeight(sourceLocation, destination) {
        const drawLine = new fabric.Line([sourceLocation.x, sourceLocation.y, destination.x, destination.y],
                                         {stroke: 'black'});
        let intersectionCount = 0;
        this.canvas.forEachObject(function(obj) {
            if (obj === options.target) {
                return;
            }
            if (drawLine.intersectsWithObject(obj)) {
                intersectionCount = intersectionCount + 1;
            }
        });
        return intersectionCount;
    }

    bendCost(sourceLocation, destination) {
        const drawLine = new fabric.Line([sourceLocation.x, sourceLocation.y, destination.x, destination.y],
            {stroke: 'black'});
        let intersectionCount = 0;
        this.canvas.forEachObject(function(obj) {
            if (obj === options.target) {
                return;
            }
            if (drawLine.intersectsWithObject(obj)) {
                const bounds = obj.getBoundingRect();
                intersectionCount = intersectionCount + ((bounds.width + bounds.height + 1) / 2);
            }
        });
        return intersectionCount;
    }

    static getMoveByAngleOneUnitLocation(sourceLocation, angleDirection) {
        const newLocation = new Location(location.x, location.y, location.obstructionsWeight);
        switch(this._availableAngles.getByValue(angleDirection)) {
            case 1: { // left
                newLocation.x = newLocation.x - 1;
            } break;
            case 2: { // up
                newLocation.x = newLocation.y - 1;
            } break;
            case 3: { // right
                newLocation.x = newLocation.x + 1;
            } break;
            case 4: { // down
                newLocation.x = newLocation.y + 1;
            } break;
        }
        newLocation.w = newLocation.w + collisionWeight(sourceLocation, newLocation);
        return newLocation;
    }
}

// Generic Map able to bend to the will of the arguments passed to the constructor. Very versitile.
class Map {
  constructor(mapCostMetadata, initialLocation, destination, angles = undefined, notFoundCost = (MAX_SAFE_INTEGER / 3)) {
    this.mapCostMetadata = mapCostMetadata; // Describes both how angles apply movement. And it determines the cost of moving between points.
                                            //   Sort of like a 2D array of pixels. But could be a Canvas holding an array of drawn svg-like graphics.
    this.initialLocation = initialLocation;
    this._current = initialLocation;
    this.destination = destination;
    this.notFoundCost = notFoundCost;
    // Object Keys are inherently a hashmap. We don't really care about the value.
    //   This effects the cost of moving through this location.
    this.blocksTried = {initialLocation: true};
    this.pathsTried = [];
    this.currentPath = [];
  }

  get currentLocation() {
      return this._current;
  }

  set currentLocation(location) {
      this._current = location;
  }

  getMoveByAngleOneUnitLocation(angleDirection, sourceLocation = this._current) {
      return mapCostMetadata.getMoveByAngleOneUnitLocation(angleDirection, sourceLocation);
  }

  getNaiveCost(destination, goal = this.destination, sourceLocation = this._current) {
    let sourceToDestinationCost;
    if (sourceLocation !== null) {
        sourceToDestinationCost = getNaiveCost(sourceLocation, destination, null);
    }
    if (typeof(destination) === 'undefined') {
        return (typeof(goal) === 'undefined' ? 0 : notFoundCost);
    } else if (typeof(goal) === 'undefined') {
        return notFoundCost;
    }
    if (typeof(goal.equals) !== 'undefined') {
        if (goal.equals(destination)) {
            return 0;
        }
    } else if (typeof(destination.equals) !== 'undefined') {
        if (destination.equals(sourcLocation)) {
            return 0;
        }
    } else if (goal == destination) {
        return 0;
    }
    let bendCost;
    if (typeof(this.mapCostMetadata) !== 'undefined' && typeof(this.mapCostMetadata.bendCost)) {
        bendCost = this.mapCostMetadata.bendCost(destination, goal);
    }
    let result = notFoundCost;
    if (typeof(destination.difference) === 'function') {
        result = destination.difference(goal);
    } else if (typeof(destination.valueOf) === 'function' && typeof(goal.valueOf)) {
        try {
            result = (destination.valueOf() - goal.valueOf()) + (!isNaN(bendCost) ? bendCost : 0);
        } catch (ex) {
            result = notFoundCost;
        }
    }
    if (!isNaN(bendCost) && !isNaN(result)) {
        try {
            result = result + bendCost;
        } catch (ex) {
            result = notFoundCost;
        }
    } else if (typeof(bendCost) !== 'undefined' && typeof(result.sum) === 'function') {
        result = result.sum(bendCost);
    }
    if (!isNaN(sourceToDestinationCost) && !isNaN(result)) {
        try {
            result = result + sourceToDestinationCost;
        } catch (ex) {
            result = notFoundCost;
        }
    } else if (typeof(sourceToDestinationCost) !== 'undefined' && typeof(result.sum) === 'function') {
        result = result.sum(sourceToDestinationCost);
    }
    return result;
  }

    static _splitLineIntoSegments(sourceLocation, destination, segments) {
        const lineSegments = [sourceLocation];
        for (let lineSegmentIndex = 1; lineSegmentIndex < segments - 1; lineSegmentIndex++) {
            lineSegments.push(sourceLocation.ratioOfLine(destination, lineSegmentIndex, segments));
        }
        lineSegments.push(destination);
        return lineSegments;
    }

    

    static getMinimumCostPath(sourceLocation, destination, availableAngles) {
        const distance = sourceLocation.distance(destination);
        const maxNumberOfPoints = distance - 1;
        for (let currentNumberOfPoints = 0; currentNumberOfPoints < maxNumberOfPoints; currentNumberOfPoints++) {
            const initialPoints = _splitLineIntoSegments(sourceLocation, destination, currentNumberOfPoints);
            for (let pointIndex = 1; pointIndex < initialPoints.length; pointIndex++) {
                const point = initialPoints[pointIndex];
                const cost = getNaiveCost(initialPoint, initialPoints[initialPoints.length - 1], initialPoints[0]);
                const
            }
        }


        const bucketLimit = 20;
        const paths = {}; // Prevent duplicates
        const buckets = [];
        const iterationLimit =  distance * distance * bucketLimit;

        let index = iterationLimit;
        while (index >= 0) {
            availableAngles
            index = index - 1;
        }

        return mapCostMetadata.getMinimumCostPath(destination, sourceLocation);
    }

  getMinimumCostPath(destination, sourceLocation = this._current) {
    return mapCostMetadata.getMinimumCostPath(destination, sourceLocation);
  }
}

class SearchProcessor {
    constructor(searchMap) {
    }
            
}
