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
        this._image.src = "assets/sofa.png";
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
        this._thickness = 20; // Increased default thickness for better visibility
        this._isComplete = false;
        this._magnetDistance = 8;
        this._pattern = null;
        this._loadPattern();
        this._hoveredWallIndex = -1;
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
            const patternCanvas = document.createElement("canvas");
            const patternContext = patternCanvas.getContext("2d");
            patternCanvas.width = img.width;
            patternCanvas.height = img.height;
            patternContext.drawImage(img, 0, 0);
            this._pattern = patternContext.createPattern(img, "repeat");
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
        const halfThickness = thickness / 2;
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
            wallSegment.innerLine.start.x,
            wallSegment.innerLine.start.y,
            wallSegment.innerLine.end.x,
            wallSegment.innerLine.end.y
        ).distance;

        return distance <= this._thickness;
    }

    // Add method to update hovered wall
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
                ctx.fillStyle = "rgba(0, 0, 255, 0.14)"; // Blue with 14% opacity
                ctx.fill(wall.fillPath);

                // Draw thicker blue stroke
                ctx.strokeStyle = "blue";
                ctx.lineWidth = 2; // Original + 1px
                ctx.stroke(wall.fillPath);
                ctx.restore();
                console.log(`Hovered wall index is ${index}`);
            } else {
                ctx.fill(wall.fillPath);
            }
        });

        // Draw inner and outer contours (only for non-highlighted walls)
        wallData.segments.forEach((wall, index) => {
            if (index !== this._hoveredWallIndex) {
                ctx.strokeStyle = "black";
                ctx.lineWidth = 1;
                // Draw inner contour
                ctx.beginPath();
                ctx.moveTo(wall.innerLine.start.x, wall.innerLine.start.y);
                ctx.lineTo(wall.innerLine.end.x, wall.innerLine.end.y);
                ctx.stroke();

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

class RoomPlanner {
    constructor(canvasId, startButtonId) {
        this._canvas = document.getElementById(canvasId);
        this._ctx = this._canvas.getContext("2d");
        this._startButton = document.getElementById(startButtonId);

        this._walls = new Walls();
        this._sofa = null;
        this._isDrawing = false;
        this._isDraggingSofa = false;
        this._mouseOffset = { x: 0, y: 0 };
        this._magnetDistance = 30;

        this.initializeEventListeners();
        this.logState("RoomPlanner initialized");
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

    start() {
        this._walls.reset();
        this._sofa = null;
        this._isDrawing = true;
        this.draw();
        this.logState("Room planning started");
    }

    handleMouseMove(e) {
        const { offsetX, offsetY } = e;

        if (this._isDraggingSofa && this._sofa) {
            this.moveSofa(offsetX, offsetY);
            this.draw();
            return;
        }

        if (this._isDrawing) {
            const tempPoints = [
                ...this._walls.points,
                this._walls.findMagnetPoint(offsetX, offsetY),
            ];
            this.draw(tempPoints);
        } else {
            // Update hovered wall when not drawing
            const previousHovered = this._walls._hoveredWallIndex;
            const currentHovered = this._walls.updateHoveredWall(
                offsetX,
                offsetY
            );

            // Only redraw if the hovered wall changed
            if (previousHovered !== currentHovered) {
                this.draw();
            }
        }
    }

    handleMouseDown(e) {
        if (this._sofa && this._sofa.isPointInside(e.offsetX, e.offsetY)) {
            this._isDraggingSofa = true;
            this._mouseOffset = {
                x: e.offsetX - this._sofa.x,
                y: e.offsetY - this._sofa.y,
            };
            this.logState("Started dragging sofa");
        }
    }

    handleMouseUp() {
        if (this._isDraggingSofa) {
            this._isDraggingSofa = false;
            this.logState("Stopped dragging sofa");
        }
    }

    handleClick(e) {
        if (!this._isDrawing) return;

        const isComplete = this._walls.addPoint(e.offsetX, e.offsetY);

        if (isComplete) {
            this._isDrawing = false;
            this._sofa = new Sofa(0, 0, 100, 50);
            this._sofa.centerIn(this._walls.points);
            this.logState("Room completed, sofa added");
        }

        this.draw();
    }

    moveSofa(mouseX, mouseY) {
        this._sofa.setPosition(
            mouseX - this._mouseOffset.x,
            mouseY - this._mouseOffset.y
        );

        const nearest = this._walls.findNearestWall(
            this._sofa.x + this._sofa.width / 2,
            this._sofa.y
        );

        if (nearest.point && nearest.distance < this._magnetDistance) {
            const wallNormal = {
                x: Math.cos(nearest.angle + Math.PI / 2),
                y: Math.sin(nearest.angle + Math.PI / 2),
            };

            this._sofa.setPosition(
                nearest.point.x -
                    this._sofa.width / 2 +
                    (wallNormal.x * this._sofa.height) / 2,
                nearest.point.y -
                    this._sofa.height / 2 +
                    (wallNormal.y * this._sofa.height) / 2
            );
            this._sofa.setRotation(nearest.angle);

            this.logState(`Sofa snapped to wall ${nearest.wallIndex}`);
        } else {
            this._sofa.setRotation(0);
        }
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
const roomPlanner = new RoomPlanner("roomCanvas", "start");
