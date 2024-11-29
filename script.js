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

        // Always create offset points in a consistent direction
        // Use the right-hand rule: rotate 90 degrees to the right of the line direction
        const normalX = unitY; // Rotated 90 degrees right
        const normalY = -unitX; // Rotated 90 degrees right

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

        this._mouseX = 0;
        this._mouseY = 0;
        this._mouseOffset = { x: 0, y: 0 };
        this._magnetDistance = 30;

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

    start() {
        this._walls.reset();
        this._sofa = null;
        this._isDrawing = true;
        this.updateEditButtonState();
        this.draw();
        this.logState("Room planning started");
    }

    handleMouseMove(e) {
        this._mouseX = e.offsetX;
        this._mouseY = e.offsetY;

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
        if (this._sofa && this._sofa.isPointInside(e.offsetX, e.offsetY)) {
            this._isDraggingSofa = true;
            this._mouseOffset = {
                x: e.offsetX - this._sofa.x,
                y: e.offsetY - this._sofa.y,
            };
            this.logState("Started dragging sofa");
        }
        if (this._walls.isComplete) {
            // Check if user clicked on a wall
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
        if (!this._isDrawing) return;

        const isComplete = this._walls.addPoint(e.offsetX, e.offsetY);

        if (isComplete) {
            this._isDrawing = false;
            this.updateEditButtonState(true);
            this._sofa = new Sofa(0, 0, 100, 50);
            this._sofa.centerIn(this._walls.points);
            this.logState("Room completed, sofa added");
        }

        this.draw();
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
        console.log("Edit button state:", this._isEditButtonActive);
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
