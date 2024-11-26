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
        // Store original position in case we need to revert
        const originalPosition = {
            x: this._sofa.x,
            y: this._sofa.y,
            rotation: this._sofa.rotation,
        };

        // Update position based on mouse movement
        this._sofa.setPosition(
            mouseX - this._mouseOffset.x,
            mouseY - this._mouseOffset.y
        );

        // Find nearest wall
        const nearest = this._walls.findNearestWall(
            this._sofa.x + this._sofa.width / 2,
            this._sofa.y + this._sofa.height / 2
        );

        if (nearest.point && nearest.distance < this._magnetDistance) {
            const wallNormal = {
                x: Math.cos(nearest.angle + Math.PI / 2),
                y: Math.sin(nearest.angle + Math.PI / 2),
            };

            // Calculate new position aligned with wall
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

            // Temporarily set position and rotation
            this._sofa.setPosition(newPosition.x, newPosition.y);
            this._sofa.setRotation(nearest.angle);

            // Check if sofa collides with neighboring walls
            if (this.checkSofaWallCollision(nearest.wallIndex)) {
                // If collision detected, revert to original position
                this._sofa.setPosition(originalPosition.x, originalPosition.y);
                this._sofa.setRotation(originalPosition.rotation);
            }

            this.logState(`Sofa interaction with wall ${nearest.wallIndex}`);
        } else {
            // When not near a wall, keep original rotation
            this._sofa.setRotation(0);

            // Check collision with all walls when not snapped
            if (this.checkSofaWallCollision()) {
                // If collision detected, revert to original position
                this._sofa.setPosition(originalPosition.x, originalPosition.y);
                this._sofa.setRotation(originalPosition.rotation);
            }
        }
    }

    checkSofaWallCollision(currentWallIndex = -1) {
        const corners = this.getSofaCorners();
        const totalWalls = this._walls.points.length - 1;

        // If currentWallIndex is provided, only check neighboring walls
        if (currentWallIndex !== -1) {
            const wallsToCheck = new Set([
                (currentWallIndex - 1 + totalWalls) % totalWalls, // Previous wall
                currentWallIndex, // Current wall
                (currentWallIndex + 1) % totalWalls, // Next wall
            ]);

            // Check collision only with neighboring walls
            for (const wallIndex of wallsToCheck) {
                // Skip the wall that sofa is currently snapped to
                if (wallIndex === currentWallIndex) continue;

                const wallStart = this._walls.points[wallIndex];
                const wallEnd = this._walls.points[wallIndex + 1];

                // Check each sofa edge against wall
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
        } else {
            // When not snapped to any wall, check all walls
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

        if (denominator === 0) return false;

        const ua =
            ((p4.x - p3.x) * (p1.y - p3.y) - (p4.y - p3.y) * (p1.x - p3.x)) /
            denominator;
        const ub =
            ((p2.x - p1.x) * (p1.y - p3.y) - (p2.y - p1.y) * (p1.x - p3.x)) /
            denominator;

        return ua >= 0 && ua <= 1 && ub >= 0 && ub <= 1;
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
