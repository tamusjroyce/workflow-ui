import { fabric } from "./fabric";

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
        if (typeof(keyValueObject.getByValue) !== 'function') {
            this.getByValue = function(enumValue) {
                for (var item of Object.entries(this)) {
                    if (item.value === enumValue) {
                        return item.key;
                    }
                }
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
        this.obstructionsWeight = obstructionsWeight;
    }
    sum(location) {
        return new Location(this.x + location.x, this.y + location.y, this.obstructionsWeight + location.obstructedWeight);
    }
    difference(location) {
        return new Location(this.x - location.x, this.y - location.y, this.obstructionsWeight + location.obstructedWeight);
    }
    equals(location) {
        return location.x === this.x && location.y === this.y;
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
    getCollisionWeight(sourceLocation, destination) {
        const drawLine = new fabric.Line([sourceLocation.x, sourceLocation.y, destination.x, destination.y],
                                         {stroke: 'black'});
        let intersectionCount = 0;
        canvas.forEachObject(function(obj) {
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
        canvas.forEachObject(function(obj) {
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
    getMoveByAngleOneUnitLocation(angleDirection, sourceLocation = this._current) {
        const newLocation = new Location(location.x, location.y, location.obstructionsWeight);
        switch(this._availableAngles.getByValue(angleDirection)) {
            case 1: {
                newLocation.x = newLocation.x - 1;
            } break;
            case 2: {
                newLocation.x = newLocation.y - 1;
            } break;
            case 3: {
                newLocation.x = newLocation.x + 1;
            } break;
            case 4: {
                newLocation.x = newLocation.y + 1;
            } break;
        }
        newLocation.obstructionsWeight = newLocation.obstructionsWeight + getCollisionWeight(sourceLocation, newLocation);
        return newLocation;
    }

    getMinimumCostPath(destination, sourceLocation = this._current) {
        return mapCostMetadata.getMinimumCostPath(destination, sourceLocation);
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
  getMinimumCostPath(destination, sourceLocation = this._current) {
    return mapCostMetadata.getMinimumCostPath(destination, sourceLocation);
  }
}

class SearchProcessor {
    constructor(searchMap) {
    }
            
}
