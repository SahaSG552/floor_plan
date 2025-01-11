// Base Furniture class that will serve as parent for specific furniture types
class Furniture {
    constructor(x, y, width, height) {
        this._x = x;
        this._y = y;
        this._width = width;
        this._height = height;
        this._rotation = 0;
    }

    // Getters
    get x() {
        return this._x;
    }
    get y() {
        return this._y;
    }
    get width() {
        return this._width;
    }
    get height() {
        return this._height;
    }
    get rotation() {
        return this._rotation;
    }

    // Setters with validation
    set x(value) {
        if (typeof value === "number") {
            this._x = value;
        }
    }

    set y(value) {
        if (typeof value === "number") {
            this._y = value;
        }
    }

    set width(value) {
        if (typeof value === "number" && value > 0) {
            this._width = value;
        }
    }

    set height(value) {
        if (typeof value === "number" && value > 0) {
            this._height = value;
        }
    }

    set rotation(value) {
        if (typeof value === "number") {
            this._rotation = value;
        }
    }

    setPosition(x, y) {
        this.x = x;
        this.y = y;
        this.logState("Position updated");
    }

    setRotation(angle) {
        this.rotation = angle;
        this.logState("Rotation updated");
    }

    isPointInside(x, y) {
        return (
            x >= this.x &&
            x <= this.x + this.width &&
            y >= this.y &&
            y <= this.y + this.height
        );
    }

    logState(message = "") {
        console.log(`${this.constructor.name} State ${message}:`, {
            x: this.x,
            y: this.y,
            width: this.width,
            height: this.height,
            rotation: this.rotation,
        });
    }

    draw(ctx) {
        throw new Error("Draw method must be implemented");
    }
}

class Sofa extends Furniture {
    constructor(x, y, width, height) {
        super(x, y, width, height);
        this._image = new Image();
        this._image.src = "../assets/sofa.png";
    }

    get image() {
        return this._image;
    }

    draw(ctx) {
        ctx.save();
        ctx.translate(this.x + this.width / 2, this.y + this.height / 2);
        ctx.rotate(this.rotation);
        ctx.translate(-(this.x + this.width / 2), -(this.y + this.height / 2));
        ctx.drawImage(this.image, this.x, this.y, this.width, this.height);
        ctx.restore();
    }

    centerIn(bounds) {
        const centerX =
            (Math.min(...bounds.map((p) => p.x)) +
                Math.max(...bounds.map((p) => p.x))) /
            2;
        const centerY =
            (Math.min(...bounds.map((p) => p.y)) +
                Math.max(...bounds.map((p) => p.y))) /
            2;
        this.setPosition(centerX - this.width / 2, centerY - this.height / 2);
        this.logState("Centered in bounds");
    }

    logState(message = "") {
        super.logState(message);
        console.log("Image loaded:", this.image.complete);
    }
}

class Walls {
    constructor() {
        this._points = [];
        this._thickness = 20;
        this._isComplete = false;
        this._magnetDistance = 8;
        this._pattern = null;
        this._loadPattern();
        this._hoveredWallIndex = -1;
        this._isEditingThickness = false;
        this._selectedWallIndex = -1;
        this._dragStartPoint = null;
        this._originalThickness = null;
        this._originalWallPoints = null;
    }

    // Getters
    get points() {
        return [...this._points];
    }
    get thickness() {
        return this._thickness;
    }
    get isComplete() {
        return this._isComplete;
    }
    get magnetDistance() {
        return this._magnetDistance;
    }
    set thickness(value) {
        if (typeof value === "number" && value > 0) {
            this._thickness = value;
            this.logState("Thickness updated");
        }
    }
    set magnetDistance(value) {
        if (typeof value === "number" && value > 0) {
            this._magnetDistance = value;
            this.logState("Magnet distance updated");
        }
    }
    get selectedWallIndex() {
        return this._selectedWallIndex;
    }
    addPoint(x, y) {
        const magnetPoint = this.findMagnetPoint(x, y);

        if (
            this._points.length > 0 &&
            Math.abs(magnetPoint.x - this._points[0].x) < this.magnetDistance &&
            Math.abs(magnetPoint.y - this._points[0].y) < this.magnetDistance
        ) {
            this._points.push(this._points[0]);
            this._isComplete = true;
            this.logState("Wall completed");
            return true;
        }

        this._points.push(magnetPoint);
        this.logState("Point added");
        return false;
    }

    getWallLengths() {
        const lengths = [];
        for (let i = 0; i < this._points.length - 1; i++) {
            const start = this._points[i];
            const end = this._points[i + 1];
            const length = Math.sqrt(
                Math.pow(end.x - start.x, 2) + Math.pow(end.y - start.y, 2)
            );
            lengths.push({
                wallIndex: i,
                length: length,
                start: { ...start },
                end: { ...end },
            });
        }
        return lengths;
    }

    getDistance(point1, point2) {
        return Math.sqrt(
            Math.pow(point2.x - point1.x, 2) + Math.pow(point2.y - point1.y, 2)
        );
    }

    selectWall(index) {
        this._selectedWallIndex = index;
        this._dragStartPoint = null;
        this._originalWallPoints = this._points.slice();
        this.logState("Wall selected");
    }

    deselectWall() {
        this._selectedWallIndex = -1;
        this._dragStartPoint = null;
        this._originalWallPoints = null;
        this.logState("Wall deselected");
    }

    startDragging(point) {
        this._dragStartPoint = point;
        this.logState("Started dragging wall");
    }

    stopDragging() {
        this._dragStartPoint = null;
        this.logState("Stopped dragging wall");
    }

    updateWallPosition(x, y) {
        if (this._selectedWallIndex === -1 || !this._dragStartPoint) return;

        // Store original state for potential rollback
        const originalPoints = [...this._points];

        // Get selected wall
        const start = this._points[this._selectedWallIndex];
        const end =
            this._points[(this._selectedWallIndex + 1) % this._points.length];

        // Calculate movement vectors
        const dx = end.x - start.x;
        const dy = end.y - start.y;
        const length = Math.sqrt(dx * dx + dy * dy);
        const directionX = dx / length;
        const directionY = dy / length;
        const normalX = -directionY;
        const normalY = directionX;

        // Calculate new position
        const mouseVectorX = x - start.x;
        const mouseVectorY = y - start.y;
        const dotProduct = mouseVectorX * normalX + mouseVectorY * normalY;
        const newX = start.x + dotProduct * normalX;
        const newY = start.y + dotProduct * normalY;

        // Move selected wall
        this._points[this._selectedWallIndex].x = newX;
        this._points[this._selectedWallIndex].y = newY;
        this._points[(this._selectedWallIndex + 1) % this._points.length].x =
            newX + dx;
        this._points[(this._selectedWallIndex + 1) % this._points.length].y =
            newY + dy;

        // Update all connected walls
        const updatedWalls = new Set([this._selectedWallIndex]);
        let hasChanges = true;

        while (hasChanges) {
            hasChanges = false;

            // Check all walls for new intersections
            for (let i = 0; i < this._points.length - 1; i++) {
                if (updatedWalls.has(i)) continue;

                const wallStart = this._points[i];
                const wallEnd = this._points[i + 1];

                // Check intersections with updated walls
                for (const updatedWallIndex of updatedWalls) {
                    const updatedWallStart = this._points[updatedWallIndex];
                    const updatedWallEnd =
                        this._points[
                            (updatedWallIndex + 1) % this._points.length
                        ];

                    const intersection = this.lineIntersection(
                        wallStart,
                        wallEnd,
                        updatedWallStart,
                        updatedWallEnd
                    );

                    if (
                        intersection &&
                        intersection.onLine1 &&
                        intersection.onLine2
                    ) {
                        // Adjust wall endpoints to intersection point
                        if (intersection.param1 < 0.5) {
                            wallStart.x = intersection.x;
                            wallStart.y = intersection.y;
                        } else {
                            wallEnd.x = intersection.x;
                            wallEnd.y = intersection.y;
                        }

                        updatedWalls.add(i);
                        hasChanges = true;
                    }
                }
            }
        }

        // Update inner walls
        if (this._innerWalls) {
            this._innerWalls.forEach((wall) => {
                // Update start attachment
                if (
                    wall.attachments.start &&
                    wall.attachments.start.isOuter &&
                    wall.attachments.start.wallIndex !== undefined
                ) {
                    const startWallIndex = wall.attachments.start.wallIndex;
                    // Check if the original points exist at this index
                    if (
                        originalPoints[startWallIndex] &&
                        originalPoints[
                            (startWallIndex + 1) % this._points.length
                        ]
                    ) {
                        const param = this.getParametricPosition(
                            wall.start,
                            originalPoints[startWallIndex],
                            originalPoints[
                                (startWallIndex + 1) % this._points.length
                            ]
                        );

                        const startWall = {
                            start: this._points[startWallIndex],
                            end: this._points[
                                (startWallIndex + 1) % this._points.length
                            ],
                        };

                        wall.start = {
                            x:
                                startWall.start.x +
                                param * (startWall.end.x - startWall.start.x),
                            y:
                                startWall.start.y +
                                param * (startWall.end.y - startWall.start.y),
                        };
                    }
                }

                // Update end attachment
                if (
                    wall.attachments.end &&
                    wall.attachments.end.isOuter &&
                    wall.attachments.end.wallIndex !== undefined
                ) {
                    const endWallIndex = wall.attachments.end.wallIndex;
                    // Check if the original points exist at this index
                    if (
                        originalPoints[endWallIndex] &&
                        originalPoints[(endWallIndex + 1) % this._points.length]
                    ) {
                        const param = this.getParametricPosition(
                            wall.end,
                            originalPoints[endWallIndex],
                            originalPoints[
                                (endWallIndex + 1) % this._points.length
                            ]
                        );

                        const endWall = {
                            start: this._points[endWallIndex],
                            end: this._points[
                                (endWallIndex + 1) % this._points.length
                            ],
                        };

                        wall.end = {
                            x:
                                endWall.start.x +
                                param * (endWall.end.x - endWall.start.x),
                            y:
                                endWall.start.y +
                                param * (endWall.end.y - endWall.start.y),
                        };
                    }
                }

                // Update helper points
                if (wall.helpers && wall.helpers.length > 0) {
                    wall.helpers = this.recalculateHelperPoints(wall);
                }
            });
        }

        this.logState("Wall position updated");
        return true;
    }

    isPointOnWallSegment(point, wallStart, wallEnd) {
        const distance = this.pointToLineDistance(
            point.x,
            point.y,
            wallStart.x,
            wallStart.y,
            wallEnd.x,
            wallEnd.y
        );
        return (
            distance.distance < this._magnetDistance &&
            distance.param >= 0 &&
            distance.param <= 1
        );
    }

    getParametricPosition(point, wallStart, wallEnd) {
        const dx = wallEnd.x - wallStart.x;
        const dy = wallEnd.y - wallStart.y;
        const length = Math.sqrt(dx * dx + dy * dy);

        if (length === 0) return 0;

        return (
            ((point.x - wallStart.x) * dx + (point.y - wallStart.y) * dy) /
            (length * length)
        );
    }

    recalculateHelperPoints(wall) {
        return this.findAllIntersections(wall.start, wall.end).map(
            (intersection) => ({
                x: intersection.point.x,
                y: intersection.point.y,
                type: "intersection",
            })
        );
    }

    findTangentPoints(point, radius = 50) {
        const tangentPoints = [];

        // Find tangent points for each wall
        for (let i = 0; i < this._points.length - 1; i++) {
            const start = this._points[i];
            const end = this._points[i + 1];

            // Calculate wall vector
            const wallDx = end.x - start.x;
            const wallDy = end.y - start.y;
            const wallLength = Math.sqrt(wallDx * wallDx + wallDy * wallDy);

            if (wallLength === 0) continue;

            // Calculate normalized perpendicular vector
            const perpX = -wallDy / wallLength;
            const perpY = wallDx / wallLength;

            // Calculate potential tangent points
            const tangent1 = {
                x: point.x + perpX * radius,
                y: point.y + perpY * radius,
            };

            const tangent2 = {
                x: point.x - perpX * radius,
                y: point.y - perpY * radius,
            };

            // Check if points are within wall segment
            if (this.isPointOnWallSegment(tangent1, start, end)) {
                tangentPoints.push(tangent1);
            }
            if (this.isPointOnWallSegment(tangent2, start, end)) {
                tangentPoints.push(tangent2);
            }
        }

        return tangentPoints;
    }

    findMagnetPoint(x, y, useOrthoSnap = false) {
        let magnetPoint = { x, y };
        let minDistance = Infinity;
        let foundMagnet = false;

        // First, check for tangent points if enabled
        if (this._snapToTangent) {
            const tangentPoints = this.findTangentPoints({ x, y });
            for (const tangentPoint of tangentPoints) {
                const distance = this.getDistance({ x, y }, tangentPoint);
                // Use a larger snap range for initial detection
                if (distance < this._magnetDistance * 2) {
                    // Create sticky effect by using the tangent point directly
                    // when within the normal magnetic distance
                    if (distance < this._magnetDistance) {
                        return { ...tangentPoint }; // Return a copy to prevent modification
                    }
                    // Otherwise, if this is the closest point so far, store it
                    if (distance < minDistance) {
                        magnetPoint = { ...tangentPoint };
                        minDistance = distance;
                        foundMagnet = true;
                    }
                }
            }
        }

        // Only proceed with other snap points if we haven't found a tangent point within magnetic distance
        if (!foundMagnet) {
            // Find regular magnet points (endpoints and wall alignments)
            const regularMagnetPoint = this._findRegularMagnetPoint(x, y);
            if (regularMagnetPoint.found) {
                magnetPoint = { ...regularMagnetPoint.point };
                minDistance = regularMagnetPoint.distance;
                foundMagnet = true;
            }

            // Apply ortho snap if shift is pressed and no closer magnet point was found
            if (useOrthoSnap && this._points.length > 0) {
                const lastPoint = this._points[this._points.length - 1];
                const orthoPoint = this.calculateOrthoPoint(lastPoint, {
                    x,
                    y,
                });

                if (
                    !foundMagnet ||
                    this.getDistance(orthoPoint, { x, y }) < minDistance
                ) {
                    magnetPoint = { ...orthoPoint };
                    foundMagnet = true;
                }
            }
        }

        return foundMagnet ? magnetPoint : { x, y };
    }

    _findRegularMagnetPoint(x, y) {
        let magnetPoint = { x, y };
        let minDistance = Infinity;
        let foundMagnet = false;

        // Check endpoints of all walls
        for (let i = 0; i < this._points.length - 1; i++) {
            const start = this._points[i];
            const end = this._points[i + 1];

            // Check start point
            const startDist = this.getDistance({ x, y }, start);
            if (startDist < this._magnetDistance && startDist < minDistance) {
                magnetPoint = { ...start };
                minDistance = startDist;
                foundMagnet = true;
            }

            // Check end point
            const endDist = this.getDistance({ x, y }, end);
            if (endDist < this._magnetDistance && endDist < minDistance) {
                magnetPoint = { ...end };
                minDistance = endDist;
                foundMagnet = true;
            }

            // Check wall alignment
            const result = this.pointToLineDistance(
                x,
                y,
                start.x,
                start.y,
                end.x,
                end.y
            );
            if (
                result.distance < this._magnetDistance &&
                result.param >= 0 &&
                result.param <= 1 &&
                result.distance < minDistance
            ) {
                magnetPoint = result.closestPoint;
                minDistance = result.distance;
                foundMagnet = true;
            }
        }

        // Check inner walls if they exist
        if (this._innerWalls) {
            this._innerWalls.forEach((wall) => {
                // Check wall endpoints
                const startDist = this.getDistance({ x, y }, wall.start);
                if (
                    startDist < this._magnetDistance &&
                    startDist < minDistance
                ) {
                    magnetPoint = { ...wall.start };
                    minDistance = startDist;
                    foundMagnet = true;
                }

                const endDist = this.getDistance({ x, y }, wall.end);
                if (endDist < this._magnetDistance && endDist < minDistance) {
                    magnetPoint = { ...wall.end };
                    minDistance = endDist;
                    foundMagnet = true;
                }

                // Check wall alignment
                const result = this.pointToLineDistance(
                    x,
                    y,
                    wall.start.x,
                    wall.start.y,
                    wall.end.x,
                    wall.end.y
                );
                if (
                    result.distance < this._magnetDistance &&
                    result.param >= 0 &&
                    result.param <= 1 &&
                    result.distance < minDistance
                ) {
                    magnetPoint = result.closestPoint;
                    minDistance = result.distance;
                    foundMagnet = true;
                }
            });
        }

        return {
            point: magnetPoint,
            distance: minDistance,
            found: foundMagnet,
        };
    }

    calculateOrthoPoint(start, end, snapThreshold = 3) {
        const dx = end.x - start.x;
        const dy = end.y - start.y;
        const angle = (Math.atan2(dy, dx) * 180) / Math.PI;

        // Snap to horizontal or vertical
        if (
            Math.abs(angle) <= snapThreshold ||
            Math.abs(angle) >= 180 - snapThreshold ||
            Math.abs(Math.abs(angle) - 180) <= snapThreshold
        ) {
            return { x: end.x, y: start.y }; // Horizontal
        } else if (
            Math.abs(angle - 90) <= snapThreshold ||
            Math.abs(angle + 90) <= snapThreshold
        ) {
            return { x: start.x, y: end.y }; // Vertical
        }

        // Snap to 45-degree angles
        if (
            Math.abs(Math.abs(angle) - 45) <= snapThreshold ||
            Math.abs(Math.abs(angle) - 135) <= snapThreshold
        ) {
            const distance = Math.sqrt(dx * dx + dy * dy);
            const unit = distance / Math.sqrt(2);
            const sign = angle > 0 ? 1 : -1;

            if (Math.abs(angle) < 90) {
                return { x: start.x + unit, y: start.y + unit * sign };
            } else {
                return { x: start.x - unit, y: start.y + unit * sign };
            }
        }

        return end;
    }

    findNearestWall(x, y) {
        let minDistance = Infinity;
        let nearestWall = null;
        let nearestAngle = 0;
        let wallIndex = -1;

        for (let i = 0; i < this._points.length - 1; i++) {
            const start = this._points[i];
            const end = this._points[i + 1];
            const result = this.pointToLineDistance(
                x,
                y,
                start.x,
                start.y,
                end.x,
                end.y
            );

            if (result.distance < minDistance) {
                minDistance = result.distance;
                nearestWall = result.closestPoint;
                nearestAngle = Math.atan2(end.y - start.y, end.x - start.x);
                wallIndex = i;
            }
        }

        return {
            point: nearestWall,
            distance: minDistance,
            angle: nearestAngle,
            wallIndex: wallIndex,
        };
    }

    findWallIntersection(start, end) {
        let intersection = null;
        let minDistance = Infinity;
        let attachedWallIndex = -1;
        let intersectionParam = 0;
        let isInnerWall = false;

        // Function to check intersection with a wall segment
        const checkIntersection = (
            wallStart,
            wallEnd,
            index,
            isInner = false
        ) => {
            const result = this.lineIntersection(
                start,
                end,
                wallStart,
                wallEnd
            );
            if (result && result.onLine1 && result.onLine2) {
                const dist = Math.hypot(result.x - start.x, result.y - start.y);
                if (dist < minDistance) {
                    minDistance = dist;
                    intersection = { x: result.x, y: result.y };
                    attachedWallIndex = index;
                    intersectionParam = result.param2;
                    isInnerWall = isInner;
                }
            }
        };

        // Check outer walls
        for (let i = 0; i < this._points.length - 1; i++) {
            checkIntersection(this._points[i], this._points[i + 1], i);
        }

        // Check inner walls
        if (this._innerWalls) {
            this._innerWalls.forEach((wall, index) => {
                checkIntersection(wall.start, wall.end, index, true);
            });
        }

        return intersection
            ? {
                  point: intersection,
                  wallIndex: attachedWallIndex,
                  param: intersectionParam,
                  isInnerWall: isInnerWall,
              }
            : null;
    }

    lineIntersection(p1, p2, p3, p4) {
        const denominator =
            (p4.y - p3.y) * (p2.x - p1.x) - (p4.x - p3.x) * (p2.y - p1.y);

        if (Math.abs(denominator) < 1e-10) return null;

        const ua =
            ((p4.x - p3.x) * (p1.y - p3.y) - (p4.y - p3.y) * (p1.x - p3.x)) /
            denominator;
        const ub =
            ((p2.x - p1.x) * (p1.y - p3.y) - (p2.y - p1.y) * (p1.x - p3.x)) /
            denominator;

        return {
            x: p1.x + ua * (p2.x - p1.x),
            y: p1.y + ua * (p2.y - p1.y),
            onLine1: ua >= 0 && ua <= 1,
            onLine2: ub >= 0 && ub <= 1,
            param1: ua,
            param2: ub,
        };
    }

    pointToLineDistance(px, py, x1, y1, x2, y2) {
        const A = px - x1;
        const B = py - y1;
        const C = x2 - x1;
        const D = y2 - y1;

        const dot = A * C + B * D;
        const lenSq = C * C + D * D;
        const param = lenSq !== 0 ? dot / lenSq : -1;

        let xx, yy;

        if (param < 0) {
            xx = x1;
            yy = y1;
        } else if (param > 1) {
            xx = x2;
            yy = y2;
        } else {
            xx = x1 + param * C;
            yy = y1 + param * D;
        }

        const dx = px - xx;
        const dy = py - yy;
        return {
            distance: Math.sqrt(dx * dx + dy * dy),
            closestPoint: { x: xx, y: yy },
            param: param, // Add parameter value to determine position along line
        };
    }

    _loadPattern() {
        const img = new Image();
        img.src = "assets/shtrih.png";
        img.onload = () => {
            // Create temporary canvas
            const patternCanvas = document.createElement("canvas");
            const patternContext = patternCanvas.getContext("2d");

            // Set the scaled dimensions
            const scale = 0.1; // 10% scale
            patternCanvas.width = img.width * scale;
            patternCanvas.height = img.height * scale;

            // Draw scaled image
            patternContext.drawImage(
                img,
                0,
                0,
                img.width,
                img.height,
                0,
                0,
                patternCanvas.width,
                patternCanvas.height
            );

            // Create pattern from scaled canvas
            this._pattern = patternContext.createPattern(
                patternCanvas,
                "repeat"
            );
        };
    }

    // Calculate offset points for a line segment
    _getOffsetPoints(start, end, thickness, alignment = "left") {
        const dx = end.x - start.x;
        const dy = end.y - start.y;
        const length = Math.sqrt(dx * dx + dy * dy);

        if (length === 0) return null;

        const unitX = dx / length;
        const unitY = dy / length;

        // Calculate normal vector
        const normalX = unitY;
        const normalY = -unitX;

        // Adjust direction based on alignment
        const multiplier = alignment === "right" ? -1 : 1;

        // Calculate offset points
        return {
            start: {
                x: start.x + normalX * thickness * multiplier,
                y: start.y + normalY * thickness * multiplier,
            },
            end: {
                x: end.x + normalX * thickness * multiplier,
                y: end.y + normalY * thickness * multiplier,
            },
        };
    }

    // Calculate intersection point of two lines
    _findIntersection(line1Start, line1End, line2Start, line2End) {
        const a1 = line1End.y - line1Start.y;
        const b1 = line1Start.x - line1End.x;
        const c1 = a1 * line1Start.x + b1 * line1Start.y;

        const a2 = line2End.y - line2Start.y;
        const b2 = line2Start.x - line2End.x;
        const c2 = a2 * line2Start.x + b2 * line2Start.y;

        const determinant = a1 * b2 - a2 * b1;

        if (Math.abs(determinant) < 1e-10) {
            // Lines are parallel or coincident
            // Return the midpoint of the closest endpoints as a fallback
            return {
                x: (line1End.x + line2Start.x) / 2,
                y: (line1End.y + line2Start.y) / 2,
            };
        }

        const x = (b2 * c1 - b1 * c2) / determinant;
        const y = (a1 * c2 - a2 * c1) / determinant;

        return { x, y };
    }

    // Generate thick wall segments
    _generateThickWalls(points) {
        if (points.length < 2) return { segments: [], isComplete: false };

        const walls = [];
        const numPoints = points.length;
        const isComplete = this._isComplete && points === this._points;

        // Determine the winding order (clockwise or counterclockwise)
        const area = this._calculatePolygonArea(points);
        const isClockwise = area > 0;

        // Generate offset points for each wall segment
        const wallSegments = [];
        for (let i = 0; i < numPoints - 1; i++) {
            const start = points[i];
            const end = points[i + 1];

            const offsetPoints = this._getOffsetPoints(
                start,
                end,
                this._thickness * (isClockwise ? 1 : -1)
            );
            if (!offsetPoints) continue;

            wallSegments.push({
                start: start,
                end: end,
                offsetStart: offsetPoints.start,
                offsetEnd: offsetPoints.end,
                index: i,
            });
        }

        // Create wall segments with intersecting offset lines
        for (let i = 0; i < wallSegments.length; i++) {
            const curr = wallSegments[i];
            const next = wallSegments[(i + 1) % wallSegments.length];

            let wallPath = new Path2D();

            // Start from inner line start point
            wallPath.moveTo(curr.start.x, curr.start.y);

            // Draw inner line to end point
            wallPath.lineTo(curr.end.x, curr.end.y);

            // If this is the last segment and walls are complete,
            // or if there's a next segment, calculate intersection
            let intersectionPoint;
            if (isComplete || i < wallSegments.length - 1) {
                intersectionPoint = this._findIntersection(
                    curr.offsetStart,
                    curr.offsetEnd,
                    next.offsetStart,
                    next.offsetEnd
                );
            } else {
                // For incomplete walls, use the offset end point directly
                intersectionPoint = curr.offsetEnd;
            }

            // Draw to intersection point (or offset end point for incomplete walls)
            wallPath.lineTo(intersectionPoint.x, intersectionPoint.y);
            curr.offsetEnd = intersectionPoint;

            // If this is not the first segment, connect to previous wall's offseted line
            if (i > 0) {
                const prev = wallSegments[i - 1];
                const prevIntersectionPoint = this._findIntersection(
                    prev.offsetStart,
                    prev.offsetEnd,
                    curr.offsetStart,
                    curr.offsetEnd
                );
                wallPath.lineTo(
                    prevIntersectionPoint.x,
                    prevIntersectionPoint.y
                );
                curr.offsetStart = prevIntersectionPoint;
            } else if (isComplete) {
                // If this is the first segment and the polygon is closed,
                // connect to the last wall's offseted line
                const lastWall = wallSegments[wallSegments.length - 1];
                const lastIntersectionPoint = this._findIntersection(
                    lastWall.offsetStart,
                    lastWall.offsetEnd,
                    curr.offsetStart,
                    curr.offsetEnd
                );
                wallPath.lineTo(
                    lastIntersectionPoint.x,
                    lastIntersectionPoint.y
                );
                curr.offsetStart = lastIntersectionPoint;
            } else {
                // If this is the first segment and the polygon is not closed,
                // just draw back to offset start point
                wallPath.lineTo(curr.offsetStart.x, curr.offsetStart.y);
            }

            // Close the path
            wallPath.closePath();

            walls.push({
                fillPath: wallPath,
                innerLine: { start: curr.start, end: curr.end },
                outerLine: {
                    start: curr.offsetStart,
                    end: curr.offsetEnd,
                },
            });
        }

        return {
            segments: walls,
            isComplete: isComplete,
        };
    }

    _calculatePolygonArea(points) {
        let area = 0;
        for (let i = 0; i < points.length - 1; i++) {
            area +=
                points[i].x * points[i + 1].y - points[i + 1].x * points[i].y;
        }
        // Close the polygon
        area +=
            points[points.length - 1].x * points[0].y -
            points[0].x * points[points.length - 1].y;
        return area / 2;
    }

    updateThickness(newThickness) {
        const thickness = parseInt(newThickness);
        if (!isNaN(thickness) && thickness > 0 && thickness <= 100) {
            this._thickness = thickness;
            return true;
        }
        return false;
    }

    // Add this method to the Walls class
    isPointOnInnerWall(point) {
        if (!this._innerWalls) return null;

        for (let i = 0; i < this._innerWalls.length; i++) {
            const wall = this._innerWalls[i];
            const result = this.pointToLineDistance(
                point.x,
                point.y,
                wall.start.x,
                wall.start.y,
                wall.end.x,
                wall.end.y
            );

            if (
                result.distance < 0.1 &&
                result.param >= 0 &&
                result.param <= 1
            ) {
                return {
                    wallIndex: i,
                    param: result.param,
                    point: result.closestPoint,
                };
            }
        }
        return null;
    }

    addInnerWall(startPoint, endPoint, alignment) {
        // Initialize innerWalls array if it doesn't exist
        if (!this._innerWalls) {
            this._innerWalls = [];
        }

        // Check if either point lies on an existing inner wall
        const startOnInnerWall = this.isPointOnInnerWall(startPoint);
        const endOnInnerWall = this.isPointOnInnerWall(endPoint);

        // If start point is on an inner wall, split that wall
        if (startOnInnerWall) {
            const newWalls = this.splitInnerWallAtPoint(
                startOnInnerWall.wallIndex,
                startOnInnerWall.point
            );
            if (newWalls) {
                startPoint = startOnInnerWall.point;
            }
        }

        // If end point is on an inner wall, split that wall
        if (endOnInnerWall) {
            const newWalls = this.splitInnerWallAtPoint(
                endOnInnerWall.wallIndex,
                endOnInnerWall.point
            );
            if (newWalls) {
                endPoint = endOnInnerWall.point;
            }
        }

        // Find all intersections with outer and inner walls
        const intersections = this.findAllIntersections(startPoint, endPoint);

        // Sort intersections by distance from start point
        intersections.sort((a, b) => {
            const distA = this.getDistance(startPoint, a.point);
            const distB = this.getDistance(startPoint, b.point);
            return distA - distB;
        });

        // Check if start point is on a polygon wall
        const startOnPolygon = this.isPointOnPolygonWall(startPoint);
        const endOnPolygon = this.isPointOnPolygonWall(endPoint);

        // Create wall segments
        let currentPoint = { ...startPoint };
        let segments = [];

        // Add first segment
        let firstSegment = {
            start: { ...startPoint },
            end:
                intersections.length > 0
                    ? { ...intersections[0].point }
                    : { ...endPoint },
            isInner: true,
            alignment: alignment,
            attachments: {
                start: startOnPolygon
                    ? {
                          point: { ...startPoint },
                          wallIndex: startOnPolygon.wallIndex,
                          isOuter: true,
                      }
                    : null,
                end:
                    intersections.length > 0
                        ? {
                              point: { ...intersections[0].point },
                              wallIndex: intersections[0].wallIndex,
                              isOuter: intersections[0].isOuter,
                          }
                        : endOnPolygon
                        ? {
                              point: { ...endPoint },
                              wallIndex: endOnPolygon.wallIndex,
                              isOuter: true,
                          }
                        : null,
            },
            helpers: [],
        };
        segments.push(firstSegment);

        // Add intermediate segments
        for (let i = 0; i < intersections.length - 1; i++) {
            let segment = {
                start: { ...intersections[i].point },
                end: { ...intersections[i + 1].point },
                isInner: true,
                alignment: alignment,
                attachments: {
                    start: {
                        point: { ...intersections[i].point },
                        wallIndex: intersections[i].wallIndex,
                        isOuter: intersections[i].isOuter,
                    },
                    end: {
                        point: { ...intersections[i + 1].point },
                        wallIndex: intersections[i + 1].wallIndex,
                        isOuter: intersections[i + 1].isOuter,
                    },
                },
                helpers: [],
            };
            segments.push(segment);
        }

        // Add final segment if there are intersections
        if (intersections.length > 0) {
            let lastSegment = {
                start: { ...intersections[intersections.length - 1].point },
                end: { ...endPoint },
                isInner: true,
                alignment: alignment,
                attachments: {
                    start: {
                        point: {
                            ...intersections[intersections.length - 1].point,
                        },
                        wallIndex:
                            intersections[intersections.length - 1].wallIndex,
                        isOuter:
                            intersections[intersections.length - 1].isOuter,
                    },
                    end: endOnPolygon
                        ? {
                              point: { ...endPoint },
                              wallIndex: endOnPolygon.wallIndex,
                              isOuter: true,
                          }
                        : null,
                },
                helpers: [],
            };
            segments.push(lastSegment);
        }

        // Add all segments to inner walls
        this._innerWalls.push(...segments);
    }

    // Add this new method to the Walls class
    splitInnerWallAtPoint(wallIndex, point) {
        const wall = this._innerWalls[wallIndex];
        const MIN_SEGMENT_LENGTH = 3;

        // Calculate distances
        const distToStart = this.getDistance(point, wall.start);
        const distToEnd = this.getDistance(point, wall.end);
        const totalLength = this.getDistance(wall.start, wall.end);

        // Don't split if the point is too close to either end
        if (
            distToStart < MIN_SEGMENT_LENGTH ||
            distToEnd < MIN_SEGMENT_LENGTH
        ) {
            return null;
        }

        // Create two new wall segments
        const segment1 = {
            start: { ...wall.start },
            end: { ...point },
            isInner: true,
            alignment: wall.alignment,
            attachments: {
                start: { ...wall.attachments.start },
                end: {
                    point: { ...point },
                    isIntersection: true,
                },
            },
            helpers: wall.helpers
                ? wall.helpers.filter(
                      (h) =>
                          this.getDistance(h, wall.start) <
                          this.getDistance(point, wall.start)
                  )
                : [],
        };

        const segment2 = {
            start: { ...point },
            end: { ...wall.end },
            isInner: true,
            alignment: wall.alignment,
            attachments: {
                start: {
                    point: { ...point },
                    isIntersection: true,
                },
                end: { ...wall.attachments.end },
            },
            helpers: wall.helpers
                ? wall.helpers.filter(
                      (h) =>
                          this.getDistance(h, wall.end) <
                          this.getDistance(point, wall.end)
                  )
                : [],
        };

        // Replace the original wall with the two new segments
        this._innerWalls.splice(wallIndex, 1, segment1, segment2);

        return [segment1, segment2];
    }

    // Add this helper method to check if a point is on a polygon wall
    isPointOnPolygonWall(point) {
        for (let i = 0; i < this._points.length - 1; i++) {
            const start = this._points[i];
            const end = this._points[i + 1];
            const result = this.pointToLineDistance(
                point.x,
                point.y,
                start.x,
                start.y,
                end.x,
                end.y
            );

            if (
                result.distance < 0.1 &&
                result.param >= 0 &&
                result.param <= 1
            ) {
                return {
                    wallIndex: i,
                    param: result.param,
                };
            }
        }
        return null;
    }

    // Add this helper method to check if a wall crosses the polygon
    wallCrossesPolygon(start, end) {
        const numPoints = this._points.length - 1;
        let crossings = 0;

        for (let i = 0; i < numPoints; i++) {
            const wallStart = this._points[i];
            const wallEnd = this._points[i + 1];

            const intersection = this.lineIntersection(
                start,
                end,
                wallStart,
                wallEnd
            );

            if (intersection && intersection.onLine1 && intersection.onLine2) {
                // Don't count intersections at the endpoints
                const isEndpoint =
                    (Math.abs(intersection.x - start.x) < 0.001 &&
                        Math.abs(intersection.y - start.y) < 0.001) ||
                    (Math.abs(intersection.x - end.x) < 0.001 &&
                        Math.abs(intersection.y - end.y) < 0.001);

                if (!isEndpoint) {
                    crossings++;
                }
            }
        }

        return crossings > 0;
    }

    splitInnerWallAtIntersection(wallIndex, intersectionPoint) {
        const wall = this._innerWalls[wallIndex];
        const MIN_SEGMENT_LENGTH = 3; // Minimum length in pixels for a wall segment

        // Calculate distances from intersection to endpoints
        const distToStart = this.getDistance(intersectionPoint, wall.start);
        const distToEnd = this.getDistance(intersectionPoint, wall.end);
        const totalLength = this.getDistance(wall.start, wall.end);

        // If either segment would be too short, don't split
        if (
            distToStart < MIN_SEGMENT_LENGTH ||
            distToEnd < MIN_SEGMENT_LENGTH
        ) {
            return;
        }

        // Create two new wall segments
        const segment1 = {
            start: { ...wall.start },
            end: { ...intersectionPoint },
            isInner: true,
            alignment: wall.alignment,
            attachments: {
                start: wall.attachments.start,
                end: {
                    point: { ...intersectionPoint },
                    isIntersection: true,
                },
            },
            helpers: wall.helpers.filter(
                (h) =>
                    this.getDistance(h, wall.start) <
                    this.getDistance(intersectionPoint, wall.start)
            ),
        };

        const segment2 = {
            start: { ...intersectionPoint },
            end: { ...wall.end },
            isInner: true,
            alignment: wall.alignment,
            attachments: {
                start: {
                    point: { ...intersectionPoint },
                    isIntersection: true,
                },
                end: wall.attachments.end,
            },
            helpers: wall.helpers.filter(
                (h) =>
                    this.getDistance(h, wall.end) <
                    this.getDistance(intersectionPoint, wall.end)
            ),
        };

        // Only replace the original wall if both segments are long enough
        if (
            distToStart >= MIN_SEGMENT_LENGTH &&
            distToEnd >= MIN_SEGMENT_LENGTH
        ) {
            this._innerWalls.splice(wallIndex, 1, segment1, segment2);
            console.log(`Split ${this._innerWalls} wall at intersection`);
        }
    }

    findAllIntersections(start, end) {
        const intersections = [];
        const MIN_SEGMENT_LENGTH = 3; // Minimum length for wall segments

        // Function to check if a point is too close to start or end
        const isTooClose = (point) => {
            const distToStart = Math.hypot(
                point.x - start.x,
                point.y - start.y
            );
            const distToEnd = Math.hypot(point.x - end.x, point.y - end.y);
            return (
                distToStart < MIN_SEGMENT_LENGTH ||
                distToEnd < MIN_SEGMENT_LENGTH
            );
        };

        // Check intersections with outer walls
        for (let i = 0; i < this._points.length - 1; i++) {
            const result = this.lineIntersection(
                start,
                end,
                this._points[i],
                this._points[i + 1]
            );

            if (result && result.onLine1 && result.onLine2) {
                const intersectionPoint = { x: result.x, y: result.y };

                // Only add intersection if it's not too close to start or end points
                if (!isTooClose(intersectionPoint)) {
                    intersections.push({
                        point: intersectionPoint,
                        wallIndex: i,
                        isOuter: true,
                    });
                }
            }
        }

        // Check intersections with other inner walls
        if (this._innerWalls) {
            this._innerWalls.forEach((wall, index) => {
                const result = this.lineIntersection(
                    start,
                    end,
                    wall.start,
                    wall.end
                );

                if (result && result.onLine1 && result.onLine2) {
                    const intersectionPoint = { x: result.x, y: result.y };

                    // Only add intersection if it's not too close to start or end points
                    if (!isTooClose(intersectionPoint)) {
                        intersections.push({
                            point: intersectionPoint,
                            wallIndex: index,
                            isOuter: false,
                        });
                    }
                }
            });
        }

        return intersections;
    }

    updateAttachedInnerWalls() {
        if (!this._innerWalls) return;

        this._innerWalls.forEach((wall) => {
            if (wall.attachments.start) {
                const startWallIndex = wall.attachments.start.wallIndex;
                const startParam = wall.attachments.start.param;
                const startWallStart = this._points[startWallIndex];
                const startWallEnd =
                    this._points[(startWallIndex + 1) % this._points.length];

                wall.start = {
                    x:
                        startWallStart.x +
                        startParam * (startWallEnd.x - startWallStart.x),
                    y:
                        startWallStart.y +
                        startParam * (startWallEnd.y - startWallStart.y),
                };
            }

            if (wall.attachments.end) {
                const endWallIndex = wall.attachments.end.wallIndex;
                const endParam = wall.attachments.end.param;
                const endWallStart = this._points[endWallIndex];
                const endWallEnd =
                    this._points[(endWallIndex + 1) % this._points.length];

                wall.end = {
                    x:
                        endWallStart.x +
                        endParam * (endWallEnd.x - endWallStart.x),
                    y:
                        endWallStart.y +
                        endParam * (endWallEnd.y - endWallStart.y),
                };
            }
        });
    }

    draw(ctx) {
        ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
        this._drawWalls(ctx, this._points);
        // Draw inner walls
        if (this._innerWalls) {
            this._innerWalls.forEach((wall) => {
                const offsetPoints = this._getOffsetPoints(
                    wall.start,
                    wall.end,
                    this._thickness,
                    wall.alignment
                );
                if (!offsetPoints) return;

                const wallPath = new Path2D();

                if (wall.alignment === "left" || wall.alignment === "right") {
                    // Draw the full wall segment without cropping
                    wallPath.moveTo(wall.start.x, wall.start.y);
                    wallPath.lineTo(wall.end.x, wall.end.y);
                    wallPath.lineTo(offsetPoints.end.x, offsetPoints.end.y);
                    wallPath.lineTo(offsetPoints.start.x, offsetPoints.start.y);
                } else {
                    // center alignment
                    wallPath.moveTo(
                        wall.start.x -
                            (offsetPoints.start.x - wall.start.x) / 2,
                        wall.start.y - (offsetPoints.start.y - wall.start.y) / 2
                    );
                    wallPath.lineTo(
                        wall.end.x - (offsetPoints.end.x - wall.end.x) / 2,
                        wall.end.y - (offsetPoints.end.y - wall.end.y) / 2
                    );
                    wallPath.lineTo(
                        wall.end.x + (offsetPoints.end.x - wall.end.x) / 2,
                        wall.end.y + (offsetPoints.end.y - wall.end.y) / 2
                    );
                    wallPath.lineTo(
                        wall.start.x +
                            (offsetPoints.start.x - wall.start.x) / 2,
                        wall.start.y + (offsetPoints.start.y - wall.start.y) / 2
                    );
                }

                wallPath.closePath();

                // Fill with pattern
                if (this._pattern) {
                    ctx.fillStyle = this._pattern;
                    ctx.fill(wallPath);
                }

                // Draw borders
                ctx.strokeStyle = "black";
                ctx.lineWidth = 1;
                ctx.stroke(wallPath);

                // Draw alignment line
                ctx.beginPath();
                ctx.moveTo(wall.start.x, wall.start.y);
                ctx.lineTo(wall.end.x, wall.end.y);
                ctx.strokeStyle =
                    wall.alignment === "center"
                        ? "orange"
                        : wall.alignment === "left"
                        ? "green"
                        : "rgb(100, 0, 40)";
                ctx.lineWidth = 2;
                ctx.stroke();

                // Draw helper points at intersections
                if (wall.helpers && wall.helpers.length > 0) {
                    wall.helpers.forEach((helper) => {
                        ctx.beginPath();
                        ctx.arc(helper.x, helper.y, 4, 0, Math.PI * 2);
                        ctx.fillStyle = "red";
                        ctx.fill();
                        ctx.strokeStyle = "white";
                        ctx.lineWidth = 1;
                        ctx.stroke();
                    });
                }
            });
        }
    }

    drawWithTemporaryPoints(ctx, tempPoints) {
        ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
        this._drawWalls(ctx, tempPoints);
    }

    // Check if point is near wall segment
    isPointNearWallSegment(x, y, wallSegment) {
        const distance = this.pointToLineDistance(
            x,
            y,
            wallSegment.outerLine.start.x,
            wallSegment.outerLine.start.y,
            wallSegment.outerLine.end.x,
            wallSegment.outerLine.end.y
        ).distance;

        return distance <= this._thickness;
    }

    // Update hovered wall
    updateHoveredWall(x, y) {
        if (this._isInnerWallMode) {
            this._hoveredWallIndex = -1;
            return -1;
        }

        const wallData = this._generateThickWalls(this._points);
        let found = false;

        for (let i = 0; i < wallData.segments.length; i++) {
            if (this.isPointNearWallSegment(x, y, wallData.segments[i])) {
                this._hoveredWallIndex = i;
                found = true;
                break;
            }
        }

        if (!found) {
            this._hoveredWallIndex = -1;
        }

        return this._hoveredWallIndex;
    }

    _drawWalls(ctx, points) {
        const wallData = this._generateThickWalls(points);

        if (wallData.segments.length === 0) return;

        // Draw wall fills
        wallData.segments.forEach((wall, index) => {
            if (this._pattern) {
                ctx.fillStyle = this._pattern;
            } else {
                ctx.fillStyle = "#cccccc";
            }

            // If this is the hovered wall, draw highlight
            if (index === this._hoveredWallIndex) {
                ctx.save();
                ctx.fillStyle = this._pattern;
                ctx.fill(wall.fillPath);

                ctx.fillStyle = "rgba(0, 160, 255, 0.1)"; // Blue with 10% opacity
                ctx.fill(wall.fillPath);

                // Draw thicker blue stroke
                ctx.strokeStyle = "rgba(0, 160, 255)";
                ctx.lineWidth = 2; // Original + 1px
                ctx.stroke(wall.fillPath);
                ctx.restore();
                console.log(`Hovered wall index is ${index}`);
            } else {
                ctx.fill(wall.fillPath);
            }

            // Draw selected wall differently
            if (this._selectedWallIndex !== -1) {
                const selectedWall = wallData.segments[this._selectedWallIndex];
                ctx.save();
                ctx.fillStyle = "rgba(0, 160, 255, 0.1)"; // Blue with 10% opacity
                ctx.fill(selectedWall.fillPath);

                ctx.strokeStyle = "rgba(0, 160, 255)";
                ctx.lineWidth = 4; // Thicker stroke for selected wall
                ctx.stroke(selectedWall.fillPath);
                ctx.restore();
            }
        });

        // Draw inner and outer contours (only for non-highlighted walls)
        wallData.segments.forEach((wall, index) => {
            if (index !== this._hoveredWallIndex) {
                ctx.strokeStyle = "green";
                ctx.lineWidth = 2;
                // Draw inner contour
                ctx.beginPath();
                ctx.moveTo(wall.innerLine.start.x, wall.innerLine.start.y);
                ctx.lineTo(wall.innerLine.end.x, wall.innerLine.end.y);
                ctx.stroke();

                if (this._isEditingThickness) {
                    ctx.strokeStyle = "red";
                    ctx.lineWidth = 2;
                } else {
                    ctx.strokeStyle = "black";
                    ctx.lineWidth = 1;
                }
                // Draw outer contour
                ctx.beginPath();
                ctx.moveTo(wall.outerLine.start.x, wall.outerLine.start.y);
                ctx.lineTo(wall.outerLine.end.x, wall.outerLine.end.y);
                ctx.stroke();

                // Draw control points
                this._drawControlPoint(ctx, wall.innerLine.start, "red");
                this._drawControlPoint(ctx, wall.innerLine.end, "red");
                this._drawControlPoint(ctx, wall.outerLine.start, "magenta");
                this._drawControlPoint(ctx, wall.outerLine.end, "cyan");
            }
        });
    }

    _drawControlPoint(ctx, point, color) {
        ctx.beginPath();
        ctx.arc(point.x, point.y, 3, 0, Math.PI * 2);
        ctx.fillStyle = color;
        ctx.fill();
    }

    reset() {
        this._points = [];
        this._isComplete = false;
        this._innerWalls = [];
        this.logState("Walls reset");
    }

    logState(message = "") {
        console.log(`Walls State ${message}:`, {
            points: this.points,
            thickness: this.thickness,
            isComplete: this.isComplete,
            magnetDistance: this.magnetDistance,
            wallLengths: this.getWallLengths(),
        });
    }
}

class RoomPlanner {
    constructor(canvasId, startButtonId, editButtonId) {
        this._canvas = document.getElementById(canvasId);
        this._ctx = this._canvas.getContext("2d");
        this._startButton = document.getElementById(startButtonId);
        this._editButton = document.getElementById(editButtonId);
        this._isEditButtonActive = false;
        this._editButton = editButtonId
            ? document.getElementById(editButtonId)
            : null;

        this._walls = new Walls();
        this._sofa = null;
        this._isDrawing = false;
        this._isDraggingSofa = false;
        // Add sofa button
        this._addSofaBtn = document.getElementById("addSofaBtn");
        this._addSofaBtn.addEventListener("click", () => this.addSofa());

        // Initialize button state
        this.updateAddSofaButtonState();

        this._mouseX = 0;
        this._mouseY = 0;
        this._mouseOffset = { x: 0, y: 0 };
        this._magnetDistance = 30;
        this._isShiftPressed = false;
        this._snapToTangent = true; // Enable tangent snapping by default

        this._thicknessInput = document.getElementById("thicknessInput");
        this._acceptThicknessButton = document.getElementById(
            "acceptThicknessInput"
        );
        // Initialize thickness input with current value
        this._thicknessInput.value = this._walls.thickness;

        // Add thickness control listeners
        this.initializeThicknessControls();
        this._canvas.addEventListener("mousedown", (e) =>
            this.handleMouseDown(e)
        );
        this._canvas.addEventListener("mousemove", (e) =>
            this.handleMouseMove(e)
        );
        this._canvas.addEventListener("mouseup", () => this.handleMouseUp());
        this.initializeEventListeners();
        this.logState("RoomPlanner initialized");

        this._isInnerWallMode = false;
        this._innerWallStartPoint = null;
        this._innerWallBtn = document.getElementById("innerWallBtn");
        this._alignLeft = document.getElementById("innerWallAlignmentLeft");
        this._alignCenter = document.getElementById("innerWallAlignmentCenter");
        this._alignRight = document.getElementById("innerWallAlignmentRight");

        // Initialize Inner wall controls
        this.initializeInnerWallControls();

        this._currentAlignment = "center"; // Default alignment
        this._alignmentColors = {
            left: "green",
            center: "orange",
            right: "rgb(100, 0, 40)",
        };

        // Keyboard event listener
        document.addEventListener("keydown", (e) => this.handleKeyDown(e));
        document.addEventListener("keyup", (e) => this.handleKeyUp(e));
    }

    // Getters
    get canvas() {
        return this._canvas;
    }
    get ctx() {
        return this._ctx;
    }
    get walls() {
        return this._walls;
    }
    get sofa() {
        return this._sofa;
    }
    get isDrawing() {
        return this._isDrawing;
    }
    get isDraggingSofa() {
        return this._isDraggingSofa;
    }
    get magnetDistance() {
        return this._magnetDistance;
    }

    initializeInnerWallControls() {
        this._innerWallBtn.addEventListener("click", () => {
            this._isInnerWallMode = !this._isInnerWallMode;
            this._innerWallBtn.classList.toggle(
                "active",
                this._isInnerWallMode
            );
            this._canvas.style.cursor = this._isInnerWallMode
                ? "crosshair"
                : "default";
        });

        // Add alignment button listeners
        this._alignCenter.addEventListener("click", () => {
            this._currentAlignment = "center";
            this.updateAlignmentButtonsState();
        });
        this._alignLeft.addEventListener("click", () => {
            this._currentAlignment = "left";
            this.updateAlignmentButtonsState();
        });
        this._alignRight.addEventListener("click", () => {
            this._currentAlignment = "right";
            this.updateAlignmentButtonsState();
        });
    }

    updateAlignmentButtonsState() {
        this._alignLeft.style.fontWeight =
            this._currentAlignment === "left" ? "bold" : "normal";
        this._alignCenter.style.fontWeight =
            this._currentAlignment === "center" ? "bold" : "normal";
        this._alignRight.style.fontWeight =
            this._currentAlignment === "right" ? "bold" : "normal";
    }

    initializeEventListeners() {
        this._startButton.addEventListener("click", () => this.start());

        this._canvas.addEventListener("mousemove", (e) =>
            this.handleMouseMove(e)
        );
        this._canvas.addEventListener("mousedown", (e) =>
            this.handleMouseDown(e)
        );
        this._canvas.addEventListener("mouseup", () => this.handleMouseUp());
        this._canvas.addEventListener("click", (e) => this.handleClick(e));
    }

    initializeThicknessControls() {
        // Add event listener for the Accept button
        this._acceptThicknessButton.addEventListener("click", () => {
            this.handleThicknessChange();
        });

        // Add event listener for Enter key in input field
        this._thicknessInput.addEventListener("keypress", (e) => {
            if (e.key === "Enter") {
                this.handleThicknessChange();
            }
        });
    }

    handleThicknessChange() {
        const newThickness = this._thicknessInput.value;
        if (this._walls.updateThickness(newThickness)) {
            // Redraw the walls with new thickness
            this.draw();
            console.log(`Wall thickness updated to ${newThickness}`);
        } else {
            // Reset input to current thickness if invalid value
            this._thicknessInput.value = this._walls.thickness;
            console.log("Invalid thickness value");
            alert("Please enter a valid thickness value between 1 and 100");
        }
    }

    updateEditButtonState(active = false) {
        this._isEditButtonActive = active || this._walls.isComplete;
        if (this._editButton) {
            this._editButton.disabled = !this._isEditButtonActive;
            this._editButton.classList.toggle(
                "active",
                this._isEditButtonActive
            );
        }

        // Enable/disable inner wall and alignment buttons
        this._innerWallBtn.disabled = !this._isEditButtonActive;
        this._alignCenter.disabled = !this._isEditButtonActive;
        this._alignLeft.disabled = !this._isEditButtonActive;
        this._alignRight.disabled = !this._isEditButtonActive;

        console.log("Edit button state:", this._isEditButtonActive);
    }

    start() {
        this._ctx.clearRect(0, 0, this._canvas.width, this._canvas.height);
        this._walls.reset();
        this._sofa = null;
        this._isDrawing = true;

        // Clear inner wall mode
        if (this._isInnerWallMode) {
            this._isInnerWallMode = false;
            this._innerWallBtn.classList.remove("active");
            this._innerWallStartPoint = null;
            this._canvas.style.cursor = "default";
        }

        this.updateEditButtonState();
        this.updateAddSofaButtonState();
        this.draw();
        this.logState("Room planning started");
    }

    applyOrthoAlignment(startPoint, endPoint, snapThreshold = 3) {
        const dx = endPoint.x - startPoint.x;
        const dy = endPoint.y - startPoint.y;
        const angle = (Math.atan2(dy, dx) * 180) / Math.PI;

        if (
            Math.abs(angle) <= snapThreshold ||
            Math.abs(angle) >= 180 - snapThreshold ||
            Math.abs(Math.abs(angle) - 180) <= snapThreshold
        ) {
            // Horizontal alignment
            return {
                x: endPoint.x,
                y: startPoint.y,
            };
        } else if (
            Math.abs(angle - 90) <= snapThreshold ||
            Math.abs(angle + 90) <= snapThreshold
        ) {
            // Vertical alignment
            return {
                x: startPoint.x,
                y: endPoint.y,
            };
        }
        return endPoint;
    }

    handleMouseMove(e) {
        this._mouseX = e.offsetX;
        this._mouseY = e.offsetY;

        if (this._isDrawing && this._walls.points.length > 0) {
            const lastPoint = this._walls.points[this._walls.points.length - 1];
            const mousePoint = { x: e.offsetX, y: e.offsetY };

            // Use ortho snap only when shift is pressed
            const magnetPoint = this._walls.findMagnetPoint(
                mousePoint.x,
                mousePoint.y,
                this._isShiftPressed
            );

            const tempPoints = [...this._walls.points, magnetPoint];
            this.draw(tempPoints);
            return;
        }

        if (this._isInnerWallMode && this._innerWallStartPoint) {
            // Calculate delta and angle from start point
            const dx = e.offsetX - this._innerWallStartPoint.x;
            const dy = e.offsetY - this._innerWallStartPoint.y;
            const angle = (Math.atan2(dy, dx) * 180) / Math.PI;

            // Define ortho snap threshold (in degrees)
            const snapThreshold = 3;

            let endPoint;

            // Check if angle is close to horizontal or vertical
            if (
                Math.abs(angle) <= snapThreshold ||
                Math.abs(angle) >= 180 - snapThreshold ||
                Math.abs(Math.abs(angle) - 180) <= snapThreshold
            ) {
                // Horizontal alignment
                endPoint = {
                    x: e.offsetX,
                    y: this._innerWallStartPoint.y,
                };
            } else if (
                Math.abs(angle - 90) <= snapThreshold ||
                Math.abs(angle + 90) <= snapThreshold
            ) {
                // Vertical alignment
                endPoint = {
                    x: this._innerWallStartPoint.x,
                    y: e.offsetY,
                };
            } else {
                // Free movement
                endPoint = {
                    x: e.offsetX,
                    y: e.offsetY,
                };
            }

            // Find magnet point for end point
            endPoint = this._walls.findMagnetPoint(endPoint.x, endPoint.y);

            this.draw();

            const startPoint = this._innerWallStartPoint;
            const offsetPoints = this._walls._getOffsetPoints(
                startPoint,
                endPoint,
                this._walls.thickness,
                this._currentAlignment
            );

            if (offsetPoints) {
                // Draw preview wall
                const wallPath = new Path2D();

                if (
                    this._currentAlignment === "left" ||
                    this._currentAlignment === "right"
                ) {
                    wallPath.moveTo(startPoint.x, startPoint.y);
                    wallPath.lineTo(endPoint.x, endPoint.y);
                    wallPath.lineTo(offsetPoints.end.x, offsetPoints.end.y);
                    wallPath.lineTo(offsetPoints.start.x, offsetPoints.start.y);
                } else {
                    // center alignment
                    wallPath.moveTo(
                        startPoint.x -
                            (offsetPoints.start.x - startPoint.x) / 2,
                        startPoint.y - (offsetPoints.start.y - startPoint.y) / 2
                    );
                    wallPath.lineTo(
                        endPoint.x - (offsetPoints.end.x - endPoint.x) / 2,
                        endPoint.y - (offsetPoints.end.y - endPoint.y) / 2
                    );
                    wallPath.lineTo(
                        endPoint.x + (offsetPoints.end.x - endPoint.x) / 2,
                        endPoint.y + (offsetPoints.end.y - endPoint.y) / 2
                    );
                    wallPath.lineTo(
                        startPoint.x +
                            (offsetPoints.start.x - startPoint.x) / 2,
                        startPoint.y + (offsetPoints.start.y - startPoint.y) / 2
                    );
                }

                wallPath.closePath();

                // Fill with pattern
                if (this._walls._pattern) {
                    this._ctx.fillStyle = this._walls._pattern;
                    this._ctx.fill(wallPath);
                }

                // Draw borders
                this._ctx.strokeStyle = "black";
                this._ctx.lineWidth = 1;
                this._ctx.stroke(wallPath);

                // Draw alignment line with appropriate color
                this._ctx.beginPath();
                this._ctx.moveTo(startPoint.x, startPoint.y);
                this._ctx.lineTo(endPoint.x, endPoint.y);
                this._ctx.strokeStyle =
                    this._alignmentColors[this._currentAlignment];
                this._ctx.lineWidth = 2;
                this._ctx.stroke();
            }
            return;
        }

        if (
            this._walls.selectedWallIndex !== -1 &&
            this._walls._dragStartPoint
        ) {
            this._walls.updateWallPosition(e.offsetX, e.offsetY);
            this.draw();
        } else if (this._isDraggingSofa && this._sofa) {
            this.moveSofa(this._mouseX, this._mouseY);
            this.draw();
            return;
        }

        if (this._isDrawing) {
            const tempPoints = [
                ...this._walls.points,
                this._walls.findMagnetPoint(this._mouseX, this._mouseY),
            ];
            this.draw(tempPoints);
        } else {
            // Update hovered wall when not drawing or editing thickness
            const previousHovered = this._walls._hoveredWallIndex;
            const currentHovered = this._walls.updateHoveredWall(
                this._mouseX,
                this._mouseY
            );

            // Only redraw if the hovered wall changed
            if (previousHovered !== currentHovered) {
                this.draw();
            }
        }
    }

    handleMouseDown(e) {
        if (this._isInnerWallMode) {
            return; // Disable wall selection in inner wall mode
        }

        if (this._sofa && this._sofa.isPointInside(e.offsetX, e.offsetY)) {
            this._isDraggingSofa = true;
            this._mouseOffset = {
                x: e.offsetX - this._sofa.x,
                y: e.offsetY - this._sofa.y,
            };
            this.logState("Started dragging sofa");
        }

        if (this._walls.isComplete) {
            const wallIndex = this._walls.updateHoveredWall(
                e.offsetX,
                e.offsetY
            );
            if (wallIndex !== -1) {
                this._walls.selectWall(wallIndex);
                this._walls.startDragging({ x: e.offsetX, y: e.offsetY });
            }
        }
    }

    handleMouseUp() {
        if (this._walls.selectedWallIndex !== -1) {
            this._walls.stopDragging();
            this._walls.deselectWall();
            this.draw();
        } else if (this._isDraggingSofa) {
            this._isDraggingSofa = false;
            this.logState("Stopped dragging sofa");
        }
    }

    handleClick(e) {
        if (this._isInnerWallMode) {
            if (!this._innerWallStartPoint) {
                // Set start point for inner wall
                this._innerWallStartPoint = this._walls.findMagnetPoint(
                    e.offsetX,
                    e.offsetY
                );
                return;
            }

            // Get end point with ortho alignment
            const mousePoint = { x: e.offsetX, y: e.offsetY };
            const alignedPoint = this.applyOrthoAlignment(
                this._innerWallStartPoint,
                mousePoint
            );
            const endPoint = this._walls.findMagnetPoint(
                alignedPoint.x,
                alignedPoint.y
            );

            // Add the inner wall
            this._walls.addInnerWall(
                this._innerWallStartPoint,
                endPoint,
                this._currentAlignment
            );

            // Reset start point for next inner wall
            this._innerWallStartPoint = null;
            this.draw();
            return;
        }

        if (!this._isDrawing) return;

        let clickPoint = { x: e.offsetX, y: e.offsetY };

        if (this._walls.points.length > 0) {
            const lastPoint = this._walls.points[this._walls.points.length - 1];
            clickPoint = this.applyOrthoAlignment(lastPoint, clickPoint);
        }

        // Find magnet point
        clickPoint = this._walls.findMagnetPoint(clickPoint.x, clickPoint.y);

        const isComplete = this._walls.addPoint(clickPoint.x, clickPoint.y);

        if (isComplete) {
            this._isDrawing = false;
            this.updateEditButtonState(true);
            this.updateAddSofaButtonState();
            this.logState("Room completed");
        }

        this.draw();
    }

    handleKeyDown(e) {
        if (e.key === "Escape") {
            // Cancel inner wall drawing
            if (this._isInnerWallMode) {
                this._isInnerWallMode = false;
                this._innerWallBtn.classList.remove("active");
                this._innerWallStartPoint = null;
                this._canvas.style.cursor = "default";
            }

            // Cancel wall selection if any
            if (this._walls.selectedWallIndex !== -1) {
                this._walls.deselectWall();
            }

            // Cancel sofa dragging if active
            if (this._isDraggingSofa) {
                this._isDraggingSofa = false;
            }

            this.draw();
        }
        if (e.key === "Shift") {
            this._isShiftPressed = true;
            // Redraw with updated snap if currently drawing
            if (this._isDrawing || this._isInnerWallMode) {
                this.handleMouseMove({
                    offsetX: this._mouseX,
                    offsetY: this._mouseY,
                });
            }
        }
    }

    handleKeyUp(e) {
        if (e.key === "Shift") {
            this._isShiftPressed = false;
            // Redraw with updated snap if currently drawing
            if (this._isDrawing || this._isInnerWallMode) {
                this.handleMouseMove({
                    offsetX: this._mouseX,
                    offsetY: this._mouseY,
                });
            }
        }
    }

    moveSofa(mouseX, mouseY) {
        const originalPosition = {
            x: this._sofa.x,
            y: this._sofa.y,
            rotation: this._sofa.rotation,
        };

        this._sofa.setPosition(
            mouseX - this._mouseOffset.x,
            mouseY - this._mouseOffset.y
        );

        const nearest = this._walls.findNearestWall(
            this._sofa.x + this._sofa.width / 2,
            this._sofa.y + this._sofa.height / 2
        );

        if (nearest.point && nearest.distance < this._magnetDistance) {
            const wallStart = this._walls.points[nearest.wallIndex];
            const wallEnd =
                this._walls.points[
                    (nearest.wallIndex + 1) % this._walls.points.length
                ];

            // Calculate wall vector and normal
            const wallVectorX = wallEnd.x - wallStart.x;
            const wallVectorY = wallEnd.y - wallStart.y;

            // Calculate both possible normals
            const normal1 = { x: -wallVectorY, y: wallVectorX };
            const normal2 = { x: wallVectorY, y: -wallVectorX };

            // Normalize both normals
            const length1 = Math.sqrt(
                normal1.x * normal1.x + normal1.y * normal1.y
            );
            normal1.x /= length1;
            normal1.y /= length1;

            const length2 = Math.sqrt(
                normal2.x * normal2.x + normal2.y * normal2.y
            );
            normal2.x /= length2;
            normal2.y /= length2;

            // Test points along both normals
            const testDistance = 10; // Small distance to test
            const testPoint1 = {
                x: nearest.point.x + normal1.x * testDistance,
                y: nearest.point.y + normal1.y * testDistance,
            };
            const testPoint2 = {
                x: nearest.point.x + normal2.x * testDistance,
                y: nearest.point.y + normal2.y * testDistance,
            };

            // Use the normal that points inside the polygon
            const wallNormal = this.isPointInPolygon(testPoint1)
                ? normal1
                : normal2;

            // Calculate new position
            const newPosition = {
                x:
                    nearest.point.x -
                    this._sofa.width / 2 +
                    (wallNormal.x * this._sofa.height) / 2,
                y:
                    nearest.point.y -
                    this._sofa.height / 2 +
                    (wallNormal.y * this._sofa.height) / 2,
            };

            // Calculate rotation angle
            const rotation =
                Math.atan2(wallNormal.y, wallNormal.x) - Math.PI / 2;

            let normalizedRotation = rotation;

            // Normalize the rotation to be between 0 and 2π
            while (normalizedRotation < 0) {
                normalizedRotation += Math.PI * 2;
            }
            while (normalizedRotation >= Math.PI * 2) {
                normalizedRotation -= Math.PI * 2;
            }

            this._sofa.setPosition(newPosition.x, newPosition.y);
            this._sofa.setRotation(normalizedRotation);

            // Check for collisions only with the current wall and its neighbors
            if (this.checkSofaWallCollision(nearest.wallIndex)) {
                this._sofa.setPosition(originalPosition.x, originalPosition.y);
                this._sofa.setRotation(originalPosition.rotation);
            }
        } else {
            this._sofa.setRotation(0);
            if (this.checkSofaWallCollision()) {
                this._sofa.setPosition(originalPosition.x, originalPosition.y);
                this._sofa.setRotation(originalPosition.rotation);
            }
        }
    }

    updateAddSofaButtonState() {
        if (this._addSofaBtn) {
            this._addSofaBtn.disabled = !this._walls.isComplete;
        }
    }

    addSofa() {
        if (this._walls.isComplete) {
            this._sofa = new Sofa(0, 0, 100, 50);
            this._sofa.centerIn(this._walls.points);
            this.draw();
        }
    }
    //*TODO Debug mode for visual collision detection
    checkSofaWallCollision() {
        const corners = this.getSofaCorners();
        const totalWalls = this._walls.points.length - 1;

        for (let i = 0; i < totalWalls; i++) {
            const wallStart = this._walls.points[i];
            const wallEnd = this._walls.points[i + 1];

            for (let j = 0; j < corners.length; j++) {
                const nextJ = (j + 1) % corners.length;
                if (
                    this.lineIntersectsLine(
                        corners[j],
                        corners[nextJ],
                        wallStart,
                        wallEnd
                    )
                ) {
                    return true; // Collision detected
                }
            }
        }
        return false;
    }

    // Helper method to get sofa corners considering rotation
    getSofaCorners() {
        const centerX = this._sofa.x + this._sofa.width / 2;
        const centerY = this._sofa.y + this._sofa.height / 2;
        const corners = [
            { x: -this._sofa.width / 2, y: -this._sofa.height / 2 },
            { x: this._sofa.width / 2, y: -this._sofa.height / 2 },
            { x: this._sofa.width / 2, y: this._sofa.height / 2 },
            { x: -this._sofa.width / 2, y: this._sofa.height / 2 },
        ];

        // Apply rotation and translation
        return corners.map((corner) => {
            const rotatedX =
                corner.x * Math.cos(this._sofa.rotation) -
                corner.y * Math.sin(this._sofa.rotation);
            const rotatedY =
                corner.x * Math.sin(this._sofa.rotation) +
                corner.y * Math.cos(this._sofa.rotation);
            return {
                x: rotatedX + centerX,
                y: rotatedY + centerY,
            };
        });
    }

    // Helper method to check if two line segments intersect
    lineIntersectsLine(p1, p2, p3, p4) {
        const denominator =
            (p4.y - p3.y) * (p2.x - p1.x) - (p4.x - p3.x) * (p2.y - p1.y);
        const EPSILON = 0.001; // Small tolerance value

        if (Math.abs(denominator) < EPSILON) return false;

        const ua =
            ((p4.x - p3.x) * (p1.y - p3.y) - (p4.y - p3.y) * (p1.x - p3.x)) /
            denominator;
        const ub =
            ((p2.x - p1.x) * (p1.y - p3.y) - (p2.y - p1.y) * (p1.x - p3.x)) /
            denominator;

        return (
            ua > EPSILON && ua < 1 - EPSILON && ub > EPSILON && ub < 1 - EPSILON
        );
    }
    // Check if a point is inside the polygon
    isPointInPolygon(point) {
        const polygon = this._walls.points;
        let inside = false;

        for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
            const xi = polygon[i].x;
            const yi = polygon[i].y;
            const xj = polygon[j].x;
            const yj = polygon[j].y;

            const intersect =
                yi > point.y !== yj > point.y &&
                point.x < ((xj - xi) * (point.y - yi)) / (yj - yi) + xi;

            if (intersect) inside = !inside;
        }

        return inside;
    }

    draw(tempPoints = null) {
        if (tempPoints) {
            // Drawing temporary points during wall creation
            this._walls.drawWithTemporaryPoints(this._ctx, tempPoints);
        } else {
            // Normal drawing
            this._walls.draw(this._ctx);
            if (this._sofa) {
                this._sofa.draw(this._ctx);
            }
        }
    }

    logState(message = "") {
        console.log(`RoomPlanner State ${message}:`, {
            isDrawing: this._isDrawing,
            isDraggingSofa: this._isDraggingSofa,
            mouseOffset: this._mouseOffset,
            magnetDistance: this._magnetDistance,
            canvasWidth: this._canvas.width,
            canvasHeight: this._canvas.height,
        });
    }

    // Debug method to get complete state
    getState() {
        return {
            walls: {
                points: this._walls.points,
                isComplete: this._walls.isComplete,
                wallLengths: this._walls.getWallLengths(),
            },
            sofa: this._sofa
                ? {
                      x: this._sofa.x,
                      y: this._sofa.y,
                      width: this._sofa.width,
                      height: this._sofa.height,
                      rotation: this._sofa.rotation,
                  }
                : null,
            canvas: {
                width: this._canvas.width,
                height: this._canvas.height,
            },
            state: {
                isDrawing: this._isDrawing,
                isDraggingSofa: this._isDraggingSofa,
            },
        };
    }
}

// Initialize the application
const roomPlanner = new RoomPlanner(
    "roomCanvas",
    "start",
    "acceptThicknessInput"
);
