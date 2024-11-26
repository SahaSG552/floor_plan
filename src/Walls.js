class Walls {
    constructor() {
        this._points = [];
        this._thickness = 20; // Increased default thickness for better visibility
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

    // Setters with validation
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

    get selectedWallIndex() {
        return this._selectedWallIndex;
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
        if (this._selectedWallIndex !== -1 && this._dragStartPoint) {
            const start = this._points[this._selectedWallIndex];
            const end =
                this._points[
                    (this._selectedWallIndex + 1) % this._points.length
                ];

            // Calculate the wall's direction vector
            const dx = end.x - start.x;
            const dy = end.y - start.y;
            const length = Math.sqrt(dx * dx + dy * dy);
            const directionX = dx / length;
            const directionY = dy / length;

            // Calculate the wall's normal vector
            const normalX = -directionY;
            const normalY = directionX;

            // Calculate the vector from the start of the wall to the mouse position
            const mouseVectorX = x - start.x;
            const mouseVectorY = y - start.y;

            // Calculate the dot product of the mouse vector and the wall's normal vector
            const dotProduct = mouseVectorX * normalX + mouseVectorY * normalY;

            // Calculate the new position of the wall
            const newX = start.x + dotProduct * normalX;
            const newY = start.y + dotProduct * normalY;

            // Update the selected wall position
            this._points[this._selectedWallIndex].x = newX;
            this._points[this._selectedWallIndex].y = newY;

            // Update the next wall position
            const nextIndex =
                (this._selectedWallIndex + 1) % this._points.length;
            this._points[nextIndex].x = newX + dx;
            this._points[nextIndex].y = newY + dy;

            this.logState("Wall position updated");
        }
    }

    findMagnetPoint(x, y) {
        let magnetX = x;
        let magnetY = y;

        for (let point of this._points) {
            if (Math.abs(point.x - x) < this.magnetDistance) magnetX = point.x;
            if (Math.abs(point.y - y) < this.magnetDistance) magnetY = point.y;
        }

        return { x: magnetX, y: magnetY };
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
    _getOffsetPoints(start, end, thickness) {
        const dx = end.x - start.x;
        const dy = end.y - start.y;
        const length = Math.sqrt(dx * dx + dy * dy);

        if (length === 0) return null;

        const unitX = dx / length;
        const unitY = dy / length;

        // Calculate normal vector (perpendicular to the wall)
        const normalX = unitY;
        const normalY = -unitX;

        // Calculate offset points
        return {
            start: {
                x: start.x + normalX * thickness,
                y: start.y + normalY * thickness,
            },
            end: {
                x: end.x + normalX * thickness,
                y: end.y + normalY * thickness,
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

        // Generate offset points for each wall segment
        const wallSegments = [];
        for (let i = 0; i < numPoints - 1; i++) {
            const start = points[i];
            const end = points[i + 1];

            const offsetPoints = this._getOffsetPoints(
                start,
                end,
                this._thickness
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
            console.log();
        }

        return {
            segments: walls,
            isComplete: isComplete,
        };
    }

    updateThickness(newThickness) {
        const thickness = parseInt(newThickness);
        if (!isNaN(thickness) && thickness > 0 && thickness <= 100) {
            this._thickness = thickness;
            return true;
        }
        return false;
    }

    draw(ctx) {
        ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
        this._drawWalls(ctx, this._points);
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
