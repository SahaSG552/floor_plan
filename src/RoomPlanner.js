import Walls from "./Walls.js";
import Sofa from "./Sofa.js";

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

export default RoomPlanner;
