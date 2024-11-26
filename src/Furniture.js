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

export default Furniture;
