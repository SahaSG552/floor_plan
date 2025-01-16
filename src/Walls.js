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
        this._selectedInnerWallIndex = -1;
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
    selectInnerWall(index) {
        this._selectedInnerWallIndex = index;
        this._selectedWallIndex = -1; // Deselect outer wall if any
        this._dragStartPoint = null;
        this._originalInnerWallPoints = this._innerWalls[index]
            ? {
                  start: { ...this._innerWalls[index].start },
                  end: { ...this._innerWalls[index].end },
              }
            : null;
        this.logState("Inner wall selected");
    }

    deselectInnerWall() {
        this._selectedInnerWallIndex = -1;
        this._dragStartPoint = null;
        this._originalInnerWallPoints = null;
        this.logState("Inner wall deselected");
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
                    if (wall.attachments.start.isPoint) {
                        // Direct connection to polygon point
                        // Find the nearest polygon point
                        const nearestPoint = this.findNearestPolygonPoint(
                            wall.start
                        );

                        if (nearestPoint) {
                            wall.start = {
                                x: nearestPoint.x,
                                y: nearestPoint.y,
                            };
                            wall.attachments.start.wallIndex =
                                nearestPoint.index;
                        }
                    } else {
                        // Connection to wall line using parametric position
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
                                    param *
                                        (startWall.end.x - startWall.start.x),
                                y:
                                    startWall.start.y +
                                    param *
                                        (startWall.end.y - startWall.start.y),
                            };
                        }
                    }
                }

                // Update end attachment
                if (wall.attachments.end && wall.attachments.end.isOuter) {
                    const endWallIndex = wall.attachments.end.wallIndex;

                    if (wall.attachments.end.isPoint) {
                        // Direct connection to polygon point
                        // Find the nearest polygon point
                        const nearestPoint = this.findNearestPolygonPoint(
                            wall.end
                        );

                        if (nearestPoint) {
                            wall.end = {
                                x: nearestPoint.x,
                                y: nearestPoint.y,
                            };
                            wall.attachments.end.wallIndex = nearestPoint.index;
                        }
                    } else {
                        // Connection to wall line using parametric position
                        if (
                            originalPoints[endWallIndex] &&
                            originalPoints[
                                (endWallIndex + 1) % this._points.length
                            ]
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
    updateInnerWallPosition(x, y) {
        if (this._selectedInnerWallIndex === -1 || !this._dragStartPoint)
            return;

        const wall = this._innerWalls[this._selectedInnerWallIndex];
        if (!wall) return;

        // Calculate original wall vector and direction
        const originalDx =
            this._originalInnerWallPoints.end.x -
            this._originalInnerWallPoints.start.x;
        const originalDy =
            this._originalInnerWallPoints.end.y -
            this._originalInnerWallPoints.start.y;
        const originalLength = Math.sqrt(
            originalDx * originalDx + originalDy * originalDy
        );

        if (originalLength === 0) return;

        // Calculate normalized direction and normal vectors
        const directionX = originalDx / originalLength;
        const directionY = originalDy / originalLength;
        const normalX = -directionY;
        const normalY = directionX;

        // Calculate movement relative to drag start point
        const dragDX = x - this._dragStartPoint.x;
        const dragDY = y - this._dragStartPoint.y;

        // Project movement onto normal vector (perpendicular movement only)
        const dotProduct = dragDX * normalX + dragDY * normalY;
        const moveX = dotProduct * normalX;
        const moveY = dotProduct * normalY;

        // Calculate new wall position maintaining original direction
        const newStart = {
            x: this._originalInnerWallPoints.start.x + moveX,
            y: this._originalInnerWallPoints.start.y + moveY,
        };
        const newEnd = {
            x: this._originalInnerWallPoints.end.x + moveX,
            y: this._originalInnerWallPoints.end.y + moveY,
        };

        // Extend wall in both directions to find intersections
        const extendedStart = {
            x: newStart.x - directionX * 1000,
            y: newStart.y - directionY * 1000,
        };
        const extendedEnd = {
            x: newEnd.x + directionX * 1000,
            y: newEnd.y + directionY * 1000,
        };

        // Find all intersections with both outer and inner walls
        const intersections = [];

        // Check outer walls
        for (let i = 0; i < this._points.length - 1; i++) {
            const intersection = this.lineIntersection(
                extendedStart,
                extendedEnd,
                this._points[i],
                this._points[i + 1]
            );

            if (intersection && intersection.onLine2) {
                intersections.push({
                    point: { x: intersection.x, y: intersection.y },
                    wallIndex: i,
                    isOuter: true,
                    param: intersection.param2,
                });
            }
        }

        // Check inner walls
        this._innerWalls.forEach((otherWall, index) => {
            if (index !== this._selectedInnerWallIndex) {
                const intersection = this.lineIntersection(
                    extendedStart,
                    extendedEnd,
                    otherWall.start,
                    otherWall.end
                );

                if (intersection && intersection.onLine2) {
                    intersections.push({
                        point: { x: intersection.x, y: intersection.y },
                        wallIndex: index,
                        isOuter: false,
                        param: intersection.param2,
                    });
                }
            }
        });

        // Sort intersections by distance from newStart
        intersections.sort((a, b) => {
            const distA = this.getDistance(newStart, a.point);
            const distB = this.getDistance(newStart, b.point);
            return distA - distB;
        });

        // Update wall position using closest intersections
        if (intersections.length >= 2) {
            wall.start = { ...intersections[0].point };
            wall.end = { ...intersections[1].point };

            // Update attachments
            wall.attachments.start = {
                point: { ...intersections[0].point },
                wallIndex: intersections[0].wallIndex,
                isOuter: intersections[0].isOuter,
            };
            wall.attachments.end = {
                point: { ...intersections[1].point },
                wallIndex: intersections[1].wallIndex,
                isOuter: intersections[1].isOuter,
            };

            // Update connected walls
            this._innerWalls.forEach((otherWall, index) => {
                if (index !== this._selectedInnerWallIndex) {
                    // Check if walls share start or end points
                    if (
                        this.arePointsEqual(
                            otherWall.start,
                            this._originalInnerWallPoints.start
                        ) ||
                        this.arePointsEqual(
                            otherWall.start,
                            this._originalInnerWallPoints.end
                        )
                    ) {
                        const sharedPoint = this.arePointsEqual(
                            otherWall.start,
                            this._originalInnerWallPoints.start
                        )
                            ? wall.start
                            : wall.end;
                        otherWall.start = { ...sharedPoint };
                    }
                    if (
                        this.arePointsEqual(
                            otherWall.end,
                            this._originalInnerWallPoints.start
                        ) ||
                        this.arePointsEqual(
                            otherWall.end,
                            this._originalInnerWallPoints.end
                        )
                    ) {
                        const sharedPoint = this.arePointsEqual(
                            otherWall.end,
                            this._originalInnerWallPoints.start
                        )
                            ? wall.start
                            : wall.end;
                        otherWall.end = { ...sharedPoint };
                    }
                }
            });
        }

        // Update drag start point for next frame
        this._dragStartPoint = { x, y };

        // Update helper points
        wall.helpers = this.recalculateHelperPoints(wall);

        return true;
    }

    findNearestWallPoint(point) {
        let minDistance = Infinity;
        let nearestPoint = null;
        let nearestWallIndex = -1;

        // Check all outer wall segments
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
                result.distance < this._magnetDistance &&
                result.distance < minDistance
            ) {
                minDistance = result.distance;
                nearestPoint = result.closestPoint;
                nearestWallIndex = i;
            }
        }

        return nearestPoint
            ? {
                  point: nearestPoint,
                  wallIndex: nearestWallIndex,
              }
            : null;
    }

    findNearestPolygonPoint(point) {
        let nearestPoint = null;
        let minDistance = Infinity;
        let nearestIndex = -1;

        this._points.forEach((polygonPoint, index) => {
            const distance = this.getDistance(point, polygonPoint);
            if (distance < minDistance) {
                minDistance = distance;
                nearestPoint = polygonPoint;
                nearestIndex = index;
            }
        });

        return nearestPoint
            ? {
                  x: nearestPoint.x,
                  y: nearestPoint.y,
                  index: nearestIndex,
              }
            : null;
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
        const ENDPOINT_PRIORITY_MULTIPLIER = 0.5; // Makes endpoints more "magnetic"

        // First check all endpoints (both outer and inner walls)
        // Check outer wall endpoints
        for (let i = 0; i < this._points.length - 1; i++) {
            const start = this._points[i];
            const end = this._points[i + 1];

            // Check start point
            const startDist = this.getDistance({ x, y }, start);
            if (
                startDist < this._magnetDistance * 2 &&
                startDist * ENDPOINT_PRIORITY_MULTIPLIER < minDistance
            ) {
                magnetPoint = { ...start };
                minDistance = startDist * ENDPOINT_PRIORITY_MULTIPLIER;
                foundMagnet = true;
            }

            // Check end point
            const endDist = this.getDistance({ x, y }, end);
            if (
                endDist < this._magnetDistance * 2 &&
                endDist * ENDPOINT_PRIORITY_MULTIPLIER < minDistance
            ) {
                magnetPoint = { ...end };
                minDistance = endDist * ENDPOINT_PRIORITY_MULTIPLIER;
                foundMagnet = true;
            }
        }

        // Check inner wall endpoints if they exist
        if (this._innerWalls) {
            this._innerWalls.forEach((wall) => {
                // Check start point
                const startDist = this.getDistance({ x, y }, wall.start);
                if (
                    startDist < this._magnetDistance * 2 &&
                    startDist * ENDPOINT_PRIORITY_MULTIPLIER < minDistance
                ) {
                    magnetPoint = { ...wall.start };
                    minDistance = startDist * ENDPOINT_PRIORITY_MULTIPLIER;
                    foundMagnet = true;
                }

                // Check end point
                const endDist = this.getDistance({ x, y }, wall.end);
                if (
                    endDist < this._magnetDistance * 2 &&
                    endDist * ENDPOINT_PRIORITY_MULTIPLIER < minDistance
                ) {
                    magnetPoint = { ...wall.end };
                    minDistance = endDist * ENDPOINT_PRIORITY_MULTIPLIER;
                    foundMagnet = true;
                }
            });
        }

        // If no endpoint was found within magnetic range, check wall alignments
        if (!foundMagnet) {
            // Check outer wall alignments
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
                if (
                    result.distance < this._magnetDistance &&
                    result.param >= 0 &&
                    result.param <= 1
                ) {
                    if (result.distance < minDistance) {
                        magnetPoint = result.closestPoint;
                        minDistance = result.distance;
                        foundMagnet = true;
                    }
                }
            }

            // Check inner wall alignments
            if (this._innerWalls) {
                this._innerWalls.forEach((wall) => {
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
                        result.param <= 1
                    ) {
                        if (result.distance < minDistance) {
                            magnetPoint = result.closestPoint;
                            minDistance = result.distance;
                            foundMagnet = true;
                        }
                    }
                });
            }
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

        // First, find all intersections with existing inner walls
        const existingInnerWallIntersections = [];
        this._innerWalls.forEach((wall, index) => {
            const intersection = this.lineIntersection(
                startPoint,
                endPoint,
                wall.start,
                wall.end
            );
            if (intersection && intersection.onLine1 && intersection.onLine2) {
                existingInnerWallIntersections.push({
                    point: { x: intersection.x, y: intersection.y },
                    wallIndex: index,
                });
            }
        });

        // Split existing inner walls at intersection points
        existingInnerWallIntersections.forEach((intersection) => {
            this.splitInnerWallAtPoint(
                intersection.wallIndex,
                intersection.point
            );
        });

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
                          isPoint:
                              startOnPolygon.param < 0.1 ||
                              startOnPolygon.param > 0.9, // Check if near endpoint
                      }
                    : null,
                end:
                    intersections.length > 0
                        ? {
                              point: { ...intersections[0].point },
                              wallIndex: intersections[0].wallIndex,
                              isOuter: intersections[0].isOuter,
                              isPoint: false, // Line intersection
                          }
                        : endOnPolygon
                        ? {
                              point: { ...endPoint },
                              wallIndex: endOnPolygon.wallIndex,
                              isOuter: true,
                              isPoint:
                                  endOnPolygon.param < 0.1 ||
                                  endOnPolygon.param > 0.9, // Check if near endpoint
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
                        isPoint: false, // Line intersections are not points
                    },
                    end: {
                        point: { ...intersections[i + 1].point },
                        wallIndex: intersections[i + 1].wallIndex,
                        isOuter: intersections[i + 1].isOuter,
                        isPoint: false, // Line intersections are not points
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
                        isPoint: false, // Line intersection
                    },
                    end: endOnPolygon
                        ? {
                              point: { ...endPoint },
                              wallIndex: endOnPolygon.wallIndex,
                              isOuter: true,
                              isPoint:
                                  endOnPolygon.param < 0.1 ||
                                  endOnPolygon.param > 0.9, // Check if near endpoint
                          }
                        : null,
                },
                helpers: [],
            };
            segments.push(lastSegment);
        }

        // Calculate helper points for each segment
        segments.forEach((segment) => {
            segment.helpers = this.recalculateHelperPoints(segment);
        });

        // Add all segments to inner walls
        this._innerWalls.push(...segments);

        // Update all inner walls to handle any new intersections
        this._innerWalls = this._innerWalls.map((wall) => {
            wall.helpers = this.recalculateHelperPoints(wall);
            return wall;
        });
    }

    isWallMoving(wall) {
        // If there's no selected wall or no drag operation in progress, no wall is moving
        if (this._selectedWallIndex === -1 || !this._dragStartPoint) {
            return false;
        }

        // Get the selected wall's start and end points
        const selectedWallStart = this._points[this._selectedWallIndex];
        const selectedWallEnd =
            this._points[(this._selectedWallIndex + 1) % this._points.length];

        // Check if the provided wall shares points with the selected wall
        const isStartShared =
            (Math.abs(wall.start.x - selectedWallStart.x) < 0.001 &&
                Math.abs(wall.start.y - selectedWallStart.y) < 0.001) ||
            (Math.abs(wall.start.x - selectedWallEnd.x) < 0.001 &&
                Math.abs(wall.start.y - selectedWallEnd.y) < 0.001);

        const isEndShared =
            (Math.abs(wall.end.x - selectedWallStart.x) < 0.001 &&
                Math.abs(wall.end.y - selectedWallStart.y) < 0.001) ||
            (Math.abs(wall.end.x - selectedWallEnd.x) < 0.001 &&
                Math.abs(wall.end.y - selectedWallEnd.y) < 0.001);

        // Compare with original points to detect movement
        if (this._originalWallPoints) {
            const originalStart =
                this._originalWallPoints[this._selectedWallIndex];
            const originalEnd =
                this._originalWallPoints[
                    (this._selectedWallIndex + 1) %
                        this._originalWallPoints.length
                ];

            const hasMoved =
                Math.abs(selectedWallStart.x - originalStart.x) > 0.001 ||
                Math.abs(selectedWallStart.y - originalStart.y) > 0.001 ||
                Math.abs(selectedWallEnd.x - originalEnd.x) > 0.001 ||
                Math.abs(selectedWallEnd.y - originalEnd.y) > 0.001;

            return (isStartShared || isEndShared) && hasMoved;
        }

        return false;
    }

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
                    isPoint: true, // This is a point intersection
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
                    isPoint: true, // This is a point intersection
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

    // Helper method to check if a point is on a polygon wall
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
                    isEndpoint: result.param < 0.1 || result.param > 0.9,
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
        const MIN_SEGMENT_LENGTH = 3;
        const EPSILON = 0.0001; // Small value for floating-point comparisons

        // Helper function to check if a point already exists in intersections
        const pointExists = (point) => {
            return intersections.some(
                (existing) =>
                    Math.abs(existing.point.x - point.x) < EPSILON &&
                    Math.abs(existing.point.y - point.y) < EPSILON
            );
        };

        // Helper function to check if a point is too close to endpoints
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
                if (
                    !isTooClose(intersectionPoint) &&
                    !pointExists(intersectionPoint)
                ) {
                    intersections.push({
                        point: intersectionPoint,
                        wallIndex: i,
                        isOuter: true,
                        param: result.param1,
                    });
                }
            }
        }

        // Check intersections with inner walls
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
                    if (
                        !isTooClose(intersectionPoint) &&
                        !pointExists(intersectionPoint)
                    ) {
                        intersections.push({
                            point: intersectionPoint,
                            wallIndex: index,
                            isOuter: false,
                            param: result.param1,
                        });
                    }
                }
            });
        }

        // Sort intersections by distance from start point
        intersections.sort((a, b) => {
            const distA = Math.hypot(a.point.x - start.x, a.point.y - start.y);
            const distB = Math.hypot(b.point.x - start.x, b.point.y - start.y);
            return distA - distB;
        });

        // Remove duplicate intersections that are very close to each other
        const filteredIntersections = intersections.filter(
            (intersection, index) => {
                if (index === 0) return true;
                const prevPoint = intersections[index - 1].point;
                const currentPoint = intersection.point;
                const distance = Math.hypot(
                    currentPoint.x - prevPoint.x,
                    currentPoint.y - prevPoint.y
                );
                return distance >= MIN_SEGMENT_LENGTH;
            }
        );

        return filteredIntersections;
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
            this._innerWalls.forEach((wall, index) => {
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

                // Check if this is the selected inner wall
                if (index === this._selectedInnerWallIndex) {
                    // Draw highlighted selected inner wall
                    ctx.save();
                    if (this._pattern) {
                        ctx.fillStyle = this._pattern;
                        ctx.fill(wallPath);
                    }
                    ctx.fillStyle = "rgba(0, 160, 255, 0.1)"; // Blue with 10% opacity
                    ctx.fill(wallPath);
                    ctx.strokeStyle = "rgba(0, 160, 255)";
                    ctx.lineWidth = 4; // Thicker stroke for selected wall
                    ctx.stroke(wallPath);
                    ctx.restore();
                } else {
                    // Draw normal inner wall
                    if (this._pattern) {
                        ctx.fillStyle = this._pattern;
                        ctx.fill(wallPath);
                    }
                    ctx.strokeStyle = "black";
                    ctx.lineWidth = 1;
                    ctx.stroke(wallPath);
                }

                // Rest of the drawing code...
                // (alignment lines, helper points, etc.)
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

export default Walls;
