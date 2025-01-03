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

    // Add this method to check if a point is inside the polygon
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

export default RoomPlanner;
